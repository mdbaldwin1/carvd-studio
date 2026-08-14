# ADR-005: A single OverlayModel derives every workspace overlay

Status: Accepted (Phase §10a partial — see "Scope" below)
Date: 2026-05-18
Phase: §10 Overlay Engine

## Context

The workspace currently has four overlay components, each independently subscribing to two-to-four stores and deriving its own display data:

- `SnapAlignmentLines` (349 LOC) — reads `snapStore.activeSnapLines`, `snapStore.snapPulseAt`, `snapStore.snapLabelPosition`, `projectStore.units`, `cameraStore.displayMode`. Renders snap lines + labels during drag.
- `ReferenceDistanceIndicators` (363 LOC) — reads `snapStore.activeReferenceRulers`, `snapStore.activeReferenceDistances`, `interactionStore.activeSession`, `projectStore.units`, `projectStore.parts`, `projectStore.moveSelectedParts`, `projectStore.updatePart`, `cameraStore.displayMode`. Renders reference rulers + an editable input.
- `MultiSelectionDimensions` (331 LOC) — reads `selectionStore.selectedPartIds/selectedGroupIds`, `projectStore.parts`, `projectStore.groupMembers`, `interactionStore.activeSession`, `cameraStore.displayMode`. Renders multi-select bounding-box dimension labels.
- `DimensionLabel` (221 LOC) — already takes everything via props (good citizen).

Each component re-derives shape that other components also need:

- All three big overlays gate visibility on `activeSession` (via `shouldHideMeasurementOverlays` / `shouldHideReferenceDistanceIndicators` / `shouldHideGroupTransformHandles` in `interactionOverlay.ts`).
- All three read `units` and `displayMode`.
- Two of them subscribe to overlapping snap-store and interaction-store slices.

This duplication has three costs:

- **Re-render cascades.** When `snapStore.activeSnapLines` updates mid-drag, every overlay that subscribes to `snapStore` re-renders even if it only consumes a different slice.
- **Bugs hide in derivation.** If two components compute the "should we show this" predicate slightly differently (a known failure mode from the audit), the predicates can drift. The codex agent's `interactionOverlay.ts` helpers were a partial fix; this ADR completes the centralization.
- **No clean seam for new overlays.** Phase §6 (custom-cuts) will add overlay primitives (cut indicators, feature handles). Without a model, each new overlay reinvents the store-subscription pattern.

## Decision

**One pure function `computeOverlayModel(input)` derives every overlay's display data into a typed `OverlayModel` object. Overlay components consume slices of the model via props. They do not read from stores directly.**

```ts
interface OverlayModel {
  snap: SnapOverlayData | null;
  references: ReferenceOverlayData | null;
  dimensions: DimensionOverlayData | null;
  // ... future slots
}

interface SnapOverlayData {
  lines: SnapLine[];
  pulseAt: number;
  labelPosition: Vec3 | null;
}

// Each slot is null when the overlay should not render at all.
// Components stay simple: `if (!props.data) return null;`

function computeOverlayModel(input: {
  session: InteractionSession | null;
  snap: SnapState;
  selection: SelectionState;
  project: ProjectState;
  camera: CameraState;
}): OverlayModel;
```

The Workspace component (or a small dedicated hook) is the **only** place that subscribes to stores for overlay purposes. It calls `computeOverlayModel` and passes the result down via context or prop drilling. Overlay components are reduced to dumb renderers.

### Scope: §10a (this commit) vs §10b/§10c

**§10a — proof of concept (this commit):**

- Define `OverlayModel` type and `computeOverlayModel` function in `src/renderer/src/interaction/overlayModel.ts`.
- Implement the `snap` slot end-to-end: `SnapAlignmentLines` becomes a pure prop consumer.
- Engine tests verify the derivation.

**§10b — reference & dimension migrations (follow-up):**

- Migrate `ReferenceDistanceIndicators` to consume `model.references`. This is the biggest single component (363 LOC) and includes the inline measurement-editing UI. The migration extracts the input/edit handling into a separate piece so the renderer becomes pure.
- Migrate `MultiSelectionDimensions` to consume `model.dimensions`.

**§10c — derive-on-render to context (follow-up):**

- Replace prop drilling with a single `<OverlayModelProvider>` context above the canvas, so overlays inside subtrees can read without intermediate components knowing about every slot.

The §10a → §10b → §10c sequencing is intentional: §10a proves the pattern works, §10b validates that the most complex component fits the contract, §10c reaps the ergonomic win for future overlays once the contract is locked.

## Alternatives considered

- **Per-component store reads stay; just extract shared predicates.** Rejected. The codex agent already did this partially in `interactionOverlay.ts`. The remaining duplication is in the data each component derives from its store slices, not in the predicates. Extracting more predicates doesn't address the re-render cascade or the seam for new overlays.
- **`OverlayModel` lives in a zustand store.** Considered. Rejected because the model is purely derived from other stores — putting it in its own store adds a synchronization layer (subscribe-and-recompute) that the derivation already implicitly does. A pure function recomputed via `useMemo` is simpler.
- **Each overlay subscribes to a per-overlay derived selector.** Rejected. That gives memoized derivation but spreads the "what does this overlay actually need" logic back into each component. The pure-function approach makes the contract explicit.
- **Defer §10 entirely; focus on §8 (Constraint Engine) or §4b (hook collapse).** Considered. Decided to land §10a now because it's the lowest-risk architectural step that pushes toward the §6 custom-cuts merge gate. §8 and §4b are higher risk and benefit from §10a's model being in place first.

## Consequences

- **Easier:** Adding a new overlay is "add a slot to OverlayModel, add a case to computeOverlayModel, write a pure renderer component." No store-subscription archeology.
- **Easier:** Re-renders are localized. `SnapAlignmentLines` re-renders when `model.snap` reference changes; no longer triggered by `snapStore` updates that affect other slots.
- **Easier:** Bug-class regression — a "wrong predicate" bug becomes a single-file fix in `computeOverlayModel`, not three components.
- **Harder:** The Workspace component (or its overlay hook) carries the burden of subscribing to every overlay-relevant store. This is by design — one component subscribes, the rest consume.
- **Migration cost (§10a):** ~80 LOC of new code (model + derivation + tests). `SnapAlignmentLines` loses ~10 LOC (its 5 store subscriptions become 1 prop). Workspace adds ~10 LOC to call `computeOverlayModel` and pass `model.snap` down.
- **Migration cost (§10b):** ~150 LOC of changes across `ReferenceDistanceIndicators` and `MultiSelectionDimensions`. The reference component's editable input has to be extracted so the renderer stays pure.
- **What we can no longer do:** Sneak in a new store subscription inside an overlay component. The lint rule (not yet codified) is: overlay files import types from stores but never call `useXxxStore` hooks.

## Open questions

- **Per-frame mutability vs immutable model.** The snap store updates `activeSnapLines` on every drag frame; the model recomputes accordingly. Profiling (via the §P0.5 baseline) confirms this is in the noise. Revisit if a measurable regression appears.
- **Overlay model ↔ session controller routing.** Phase §3 emits typed actions; phase §4 has tools; the overlay model reads tool state via `interactionStore.activeSession`. If a future tool wants to push transient overlay data that doesn't fit the existing session shape, it should extend `activeSession.referenceState` (or a parallel slot), not invent a new global. Document in superseding ADR if/when needed.

## References

- Blueprint: §10 Overlay Engine
- Existing partial helpers: [`packages/desktop/src/renderer/src/utils/interactionOverlay.ts`](../../packages/desktop/src/renderer/src/utils/interactionOverlay.ts)
- Components to migrate: [`SnapAlignmentLines.tsx`](../../packages/desktop/src/renderer/src/components/workspace/SnapAlignmentLines.tsx), [`ReferenceDistanceIndicators.tsx`](../../packages/desktop/src/renderer/src/components/workspace/ReferenceDistanceIndicators.tsx), [`MultiSelectionDimensions.tsx`](../../packages/desktop/src/renderer/src/components/workspace/MultiSelectionDimensions.tsx)
- Audit: [interaction-architecture-redesign.md](../interaction-architecture-redesign.md) — Finding 7 "Marker and measurement logic is downstream of ad hoc state"
- Execution plan: [interaction-architecture-execution-plan.md](../interaction-architecture-execution-plan.md) §10 Phase 10
- Related ADR: ADR-003 (session controller) — overlay model reads from session state. ADR-004 (tool solvers) — tools' Preview outputs feed the overlay model.
