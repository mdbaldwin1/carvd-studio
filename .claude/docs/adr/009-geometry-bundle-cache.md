# ADR-009: Per-part geometry bundles, versioned cache, derived-from-part

Status: Accepted (Phase §5a — see "Scope" below)
Date: 2026-05-18
Phase: §5 Geometry Query Layer

## Context

Every interaction subsystem currently re-derives geometry from `Part` in its own way:

- **Snapping** computes face anchors, surface anchors, fractional-line anchors, and feature anchors from `part.length / width / thickness / rotation / position` inline (`snapToPartsUtil.ts` and friends). The same axis-aligned bounding box is recomputed dozens of times per drag frame across the active part set.
- **Hit-testing** (§11) walks the rotated-box fallback over the same data again. The new `resolveHitTarget` service relies on each `Part` being a unit cube scaled by dimensions — fine for boxes, but the assumption is baked into `rotatedBoxFallback`.
- **Measurement overlays** (§10) compute world-space corners and face midpoints from `Part` directly inside `getPartAABB` and `getBoundingBoxDimensionPlacements`.
- **Collision / overlap prevention** in `usePartDrag` walks `computeSafeDelta` against axis-aligned bounds derived again from `Part`.
- **Rendering** uses a unit-cube `BoxGeometry` shared across all parts via `partGeometry.ts`, with instance matrices encoding world transforms.

This works for box parts because the geometry IS the box. **Custom cuts will not be boxes.** End-cuts on a long board produce an angled face — the AABB is still the same, but the part's actual surface is no longer aligned with that AABB. Snap anchors that target a face will point at the wrong plane. Hit-testing that uses rotated-box bounds will register hits on phantom geometry. Collision will let parts intersect through bevels.

The blueprint calls for a `PartGeometryBundle`: one cached, versioned object per part that publishes _every_ geometric view that consumers need. Each subsystem reads the view it cares about — render mesh, hit proxy, snap anchor graph, measure graph, collision proxy, bounds. When part dimensions change, the bundle is invalidated; on next read it rebuilds.

Phase §5a (this commit) lands the types + cache + a derivation that works for the _current_ box parts. Phase §5b/§5c migrate the snap engine and collision engine to read from the bundle. Phase §6 (Part Shape Model) replaces the box-only derivation with one that understands custom cuts. After §6, the same consumer code keeps working — the bundle's interface is stable.

## Decision

**Per-part geometry is published as a versioned `PartGeometryBundle`. A `GeometryCache` produces bundles on demand and invalidates them when the part's `versionKey` changes. Consumers never call into Three.js or raw `Part` fields for geometric questions — they always go through the cache.**

```ts
type GeometryVersion = string; // opaque; derived from part fields that matter

interface PartGeometryBundle {
  partId: string;
  versionKey: GeometryVersion;

  /** Local-space bounding shapes. World transforms are applied by consumers. */
  bounds: {
    localAabb: Aabb; // axis-aligned in local space
    localObb: Obb; // oriented (== aabb for boxes, will differ for cuts)
  };

  /** Render mesh (used by InstancedParts / Part). */
  renderMesh: {
    geometryKey: "unit-box";
    scale: { length: number; width: number; thickness: number };
  };

  /** Hit-test proxy: what the §11 service tests against. */
  hitProxy: HitProxy;

  /** Snap anchor graph (faces, edges, fractions, corners, feature points). */
  snapGraph: SnapAnchorGraph;

  /** Measurement graph (edges + faces used by §10 overlay model). */
  measureGraph: MeasureGraph;

  /** Collision proxy: §9 overlap and fit policy reads against this. */
  collisionProxy: CollisionProxy;
}

interface GeometryCache {
  get(part: Part): PartGeometryBundle;
  invalidate(partId: string): void;
  clear(): void;
  /** For testing / metrics. */
  size(): number;
}
```

### Version keys

The `versionKey` is derived from the part fields that geometric views depend on:

- `length`, `width`, `thickness` (dimensions)
- `rotation.x`, `rotation.y`, `rotation.z` (rotation, even though most subsystems apply rotation after local-space lookup)
- Future fabrication operations (end-cuts, rect cuts, drill patterns) — added in §6

Position is NOT part of the version key. Position is a world-transform concern; bundles are local-space. Two parts at different positions but identical dimensions share the same bundle shape (and could literally share a bundle, though we don't deduplicate today — that's a §5b optimization).

### Invalidation

The cache is **read-through**: callers pass the part, the cache looks up by `partId`, compares `versionKey`, returns the cached bundle if fresh or rebuilds if stale. This means callers do not need to remember to invalidate when dimensions change — the cache notices automatically on the next read.

Manual `invalidate(partId)` is reserved for cases where the part's geometry depends on something other than the part itself (e.g., assembly-level overrides — not used today). Phase §6 may add it for custom-cut feature attachments.

The cache holds a strong reference to bundles. We deliberately do NOT use a weak map — bundles are cheap and consumers expect identity across renders. Memory: ~hundreds of bytes per part × hundreds of parts = trivially small. If a deleted part lingers in the cache, that's a `<10KB` leak that survives until a project switch; not worth weak-mapping today.

### Scope: §5a (this commit) vs §5b/§5c

**§5a — types + cache + box derivation + tests (this commit):**

- `interaction/geometry/types.ts` with `PartGeometryBundle`, `HitProxy`, `SnapAnchorGraph`, `MeasureGraph`, `CollisionProxy`, `Aabb`, `Obb`.
- `interaction/geometry/boxBundle.ts` with `deriveBoxBundle(part)` — works today against the existing box-only `Part`.
- `interaction/geometry/cache.ts` with the read-through cache.
- Tests covering: version key derivation, invalidation on dimension change, invalidation on rotation change, cache hit identity, bundle field correctness, bounds math.
- No consumer migration. The bundle is foundation.

**§5b — snap engine reads from the bundle (follow-up):**

- Replace inline anchor enumeration in `snapToPartsUtil.ts` (and friends) with `bundle.snapGraph` lookups.
- Each snap-family detector (`face`, `surface-anchor`, `surface-fraction`, `feature`) consumes a typed slice.
- The snap engine's contract becomes "give me a set of bundle anchors, ranked by my arbitration policy" — no more re-deriving geometry per call.

**§5c — collision + hit-test + measurement read from the bundle (follow-up):**

- `rotatedBoxFallback` in §11's `hitTest.ts` reads `bundle.hitProxy` instead of `Part` directly.
- `computeSafeDelta` collision math reads `bundle.collisionProxy`.
- `getPartAABB` and `getBoundingBoxDimensionPlacements` read `bundle.measureGraph`.

The §5a → §5b → §5c sequencing matches §1a → §1b → §1c: prove the bundle works, migrate one subsystem to verify the contract, then lift the rest.

## Alternatives considered

- **Store geometry on `Part` itself (precomputed bounds, etc.).** Rejected. `Part` is persisted in the project file; precomputed geometry would balloon file sizes and require migration when the derivation logic changes. The cache approach keeps the file format unchanged.
- **One global geometry registry instead of a cache.** Rejected. The cache is effectively a registry, but as a typed module with explicit invalidation semantics. A "registry" with implicit mutation invites the same fragmentation §11 / §10 / §3 just consolidated.
- **WeakMap-based cache.** Considered. Rejected because consumer code captures bundle references in `useMemo` deps; a weak map would let the bundle be GC'd while still referenced by a `useMemo` closure, producing identity churn. Strong references are simpler and cheap.
- **Build bundles lazily inside Three.js scene graph (R3F primitives).** Rejected. We want the bundle for domain reasoning (snap, collision, measurement), not rendering. Domain != render.
- **Defer §5 entirely until custom-cuts merge actually needs it.** Considered. Rejected because the consumer migrations (§5b/§5c) take time and need to land before §6 can ship. Doing §5a now lets the snap-engine migration happen in parallel with §6 design work in `~/Carvd/carvd-studio`.

## Consequences

- **Easier:** Adding custom cuts means extending `deriveBoxBundle` to handle the new fabrication operations (or adding `deriveFeatureBundle` and a dispatcher). Every consumer keeps reading from `bundle.snapGraph` / `bundle.collisionProxy` / etc. without code change.
- **Easier:** Bug-class regression — a "snap-face misalignment" bug becomes a single-file fix in `boxBundle.ts`, not a dozen call sites.
- **Easier:** Performance instrumentation. The cache is the choke point; measuring "how many bundle builds per drag" pinpoints invalidation issues.
- **Harder:** Anyone tempted to inline a `length / 2` calculation against `Part` must explain why the bundle's bounds field isn't enough. This is the intended constraint.
- **Migration cost (§5a):** ~400 LOC of new code (types + box derivation + cache + tests). Zero consumer changes.
- **Migration cost (§5b/§5c):** Incremental, 50–150 LOC per subsystem.

## Open questions

- **Per-instance vs per-part bundles.** Today all parts of identical dimensions could share one bundle. We don't deduplicate. If a future stress fixture (S6 with 1000 identical parts) shows the cache is a hotspot, add interning. Defer until measured.
- **Rotation in version key.** Including rotation in the key means each unique orientation is a separate bundle. For typical scenes this is fine (few unique rotations). For pathological cases (every part rotated differently), the cache grows. Re-evaluate if this becomes a problem.
- **§6 part shape extensions.** When `Part` gets a `fabricationOperations` field, the version key must include it. The hash function lives in `boxBundle.ts` and will need updating — that's a §6 migration step. Document the seam in the §6 ADR (ADR-010).

## References

- Blueprint: §5 Geometry Query Layer
- ADR-008 (Scene Graph) — bundles are per-NODE in a future where nodes own geometry; per-Part today is a special case where NodeId === partId
- ADR-002 (Hit-Test Service) — `rotatedBoxFallback` is the first consumer to migrate in §5c
- ADR-010 (Part Definition Migration, not yet written) — extends `Part` with fabrication operations; bundle derivation grows accordingly
- Existing inline derivations to migrate:
  - `getPartAABB` in [`workspaceUtils.ts`](../../packages/desktop/src/renderer/src/components/workspace/workspaceUtils.ts)
  - `getPartBounds` / `getPartBoundsAtPosition` in [`snapToPartsUtil.ts`](../../packages/desktop/src/renderer/src/utils/snapToPartsUtil.ts)
  - `rotatedBoxFallback` in [`hitTest.ts`](../../packages/desktop/src/renderer/src/interaction/hitTest.ts)
- Execution plan: [interaction-architecture-execution-plan.md](../interaction-architecture-execution-plan.md) §5 Phase 5
