# ADR-002: Hit-testing is a single service, not scattered raycasts

Status: Accepted
Date: 2026-05-18
Phase: §11 Hit-Testing Layer

## Context

The workspace currently does hit-testing in five different places, each with subtly different rules:

1. `Workspace.tsx::getHitPartId` (lines 217–289) — scene raycast → `userData.partId` lookup → manual rotated-box fallback over `parts`.
2. `Workspace.tsx::hasInteractiveHitAt` (lines 698–751) — same shape as `getHitPartId` but returns boolean and treats `blocksPartSelection` as "yes" instead of "skip."
3. `Part.tsx` per-mesh `onClick` / `onPointerDown` / `onDoubleClick` — R3F event system delivers a per-mesh hit without a unified target type.
4. `InstancedParts.tsx` per-mesh — same, with instance ID lookup via `partIdByInstance`.
5. `PartsRenderer.tsx::shouldForceIndividualFallback` (line 98) — a workaround that bypasses instanced rendering entirely for scenes ≤ 500 parts when nothing is selected, because instanced raycast was intermittently silent.

The audit identified four bug classes that all trace back to this fragmentation:

- **InstancedMesh raycast bounding sphere written on geometry** — fixed late in this branch by switching to `mesh.computeBoundingSphere()`. The bug existed because two of the five hit-test paths (`getHitPartId` and the R3F event system) each had their own opinion about what bounding data to use.
- **Right-click context menu unreliable** — the contextmenu listener lived on `gl.domElement`, but DOM portal overlays sat above it; the overlay-portal layer was invisible to every hit-test path.
- **`hasInteractiveHitAt` and `getHitPartId` disagree** — same raycast, different classification, easy to introduce a regression by editing one and not the other.
- **`shouldForceIndividualFallback` exists at all** — a render-time workaround that papers over a hit-test bug. It will mask future hit-test regressions.

Phase §3 (Session Controller) wants one place that owns pointer-state-machine input. That depends on having one place that answers "what did this click hit." Phase §10 (Overlay Engine) wants overlays to be addressable hit targets. Phase §7 (Snap Engine) wants snap guides to participate in hit-testing. None of those can happen if each component re-derives hit logic.

## Decision

**All hit-test resolution goes through one service: `src/renderer/src/interaction/hitTest.ts`.**

- The service exposes one function: `resolveHitTarget(screenPoint, context)`.
- It returns a typed `HitTarget` discriminated union covering every kind of thing a click can land on: `part-body`, `resize-handle`, `rotation-handle`, `snap-guide`, `ground`, `sky`, `overlay`, or `null`.
- All interactive objects in the workspace publish a `userData.hitTarget` descriptor on their mesh, populated when the component mounts. The service reads it instead of stringly-typed `userData.partId` / `userData.blocksPartSelection` / etc.
- The service is pure: no React, no Zustand reads, no side effects. Caller supplies `{ camera, scene, parts, groupMembers, overlayRegistry }`. This makes it engine-testable with stubbed Three.js objects.
- Manual rotated-box fallback over `parts` is a single private helper inside the service, called only when scene raycast misses. Not duplicated at call sites.
- An `OverlayRegistry` (a `Map<overlayId, DOMRect>`) lets DOM-space overlays (drei `<Html>`, native portals) be addressable hit targets. The registry is checked **before** the 3D raycast — DOM overlays win over scene geometry by definition since they paint on top. Empty in Phase §11; Phase §10 wires real overlays in.
- The R3F per-mesh event system (`onPointerOver` / `onPointerOut` for hover) stays — it's R3F's strength and hover doesn't need cross-mesh coordination. Phase §3 will replace the per-mesh `onClick` / `onPointerDown` / `onDoubleClick` paths with the session controller. Phase §11 is allowed to keep the R3F per-mesh click handlers wired for the moment; they will _call into_ the service (or be deleted in §3) but they don't get to invent their own hit-test logic.

`Workspace.tsx::getHitPartId` and `hasInteractiveHitAt` become thin wrappers (or, ideally, are deleted in favor of direct service calls). `PartsRenderer.tsx::shouldForceIndividualFallback` is deleted — its existence implied a hit-test bug that the service eliminates.

## Alternatives considered

- **Push hit-testing into Three.js directly via custom `raycast()` methods on each mesh.** Rejected. Same bug — every mesh re-implements logic, no central audit point, no way to add a DOM-space overlay layer.
- **Keep two implementations (`getHitPartId` for click, `hasInteractiveHitAt` for hover-blocking).** Rejected. They drift apart; the present `blocksPartSelection` flag exists only to bridge their disagreement.
- **Build the service in §3 (Session Controller) instead of §11.** Rejected. The session controller needs hit-test answers; building both at once doubles the migration risk. §11 first lets us land hit-test reliability without touching pointer-state-machine wiring.
- **Skip the overlay registry until §10.** Considered. Decided to ship the registry interface in §11 (empty by default) so §10 has no breaking API to add. The cost is one type and one `Map` — trivial.

## Consequences

- **Easier:** Every future hit-related bug fix happens in one file. Bug-class regression tests live next to the service.
- **Easier:** The session controller (§3) has a clean input contract. The overlay engine (§10) has a clean output channel.
- **Easier:** Deleting `shouldForceIndividualFallback` means the `PartsRenderer` rendering split is no longer doing double duty as a hit-test workaround. Performance comes from the split correctly; correctness comes from the service correctly.
- **Harder:** `userData.hitTarget` schema is now load-bearing. Components that forget to set it will be invisible to hit-testing. Mitigated by: TypeScript types on the schema, an assertion in DEV builds that any user-interactive mesh has a `hitTarget`, and tests that mount each interactive component and confirm the descriptor.
- **Migration cost:** `Workspace.tsx::getHitPartId` (~70 LOC) and `hasInteractiveHitAt` (~55 LOC) shrink to ~5 LOC each (call service, classify result). The duplicated rotated-box block (~30 LOC × 2) collapses into the service. ResizeHandle, RotationHandle, Part, InstancedParts each get a 3-line `userData.hitTarget = ...` change. PartsRenderer loses 8 LOC and a defensive fallback.
- **What we can no longer do:** Add a new interactive object type by silently editing `userData` with a new flag. Anything new has to extend the `HitTarget` union and adds a case to the service. This is intentional — it forces the catalog of interactive things to stay knowable.

## Open questions

- **DOM overlay registration ergonomics.** drei `<Html>` re-mounts during portal swaps; the registry needs ref-counted entry handling so a transient unmount doesn't drop an overlay that's still on screen. Resolve in §10 implementation when the first real overlay registers.
- **Snap-guide hit-testing.** Phase §7 expects guides as hit targets. The `HitTarget` union already names them; the service falls back to "no snap guide hits" until §7 wires the snap store into the context. Acceptable.

## References

- Blueprint: §11 Hit-Testing Layer
- Audit: [interaction-architecture-redesign.md](../interaction-architecture-redesign.md) — "Bug Classes Resolved While Writing This Audit," especially InstancedMesh raycast + context-menu portal layering
- Execution plan: [interaction-architecture-execution-plan.md](../interaction-architecture-execution-plan.md) §11 Phase 11
- Code to be replaced: [`packages/desktop/src/renderer/src/components/workspace/Workspace.tsx`](../../../packages/desktop/src/renderer/src/components/workspace/Workspace.tsx) lines 217–289, 698–751
- Code to be deleted: [`packages/desktop/src/renderer/src/components/workspace/PartsRenderer.tsx`](../../../packages/desktop/src/renderer/src/components/workspace/PartsRenderer.tsx) lines 95–107 (`shouldForceIndividualFallback`)
- Related ADR: ADR-003 SessionController state machine (§3) — depends on this service
