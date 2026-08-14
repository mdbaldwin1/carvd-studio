# ADR-008: Workspace scene graph is a derived adapter, not a persisted shape

Status: Accepted (Phase §1a — see "Scope" below)
Date: 2026-05-18
Phase: §1 Workspace Scene Graph

## Context

The workspace's hierarchy today is reconstructed ad hoc throughout the codebase:

- `getAllDescendantPartIds(groupId, groupMembers)` is called from 5+ sites in `projectStore`, plus `PartsRenderer`, `useGroupDrag`, selection helpers, etc.
- `getPartGroupContext(partId, groupMembers, editingGroupId)` walks ancestors per part-click in `Workspace`, `Part`, `InstancedParts`.
- `resolveMoveSelection` and `resolveMeasurementSelectionEntities` re-walk the group hierarchy in their own ways.
- World transforms are recomputed by every consumer that needs them (snap pipeline, hit-test fallback, rendering, undo replay).

Each consumer reads `projectStore.parts` (flat) + `projectStore.groups` (flat) + `projectStore.groupMembers` (relational) and re-derives the parent-child tree on demand. That's correct today (the data is the source of truth) but it has costs:

- **Custom cuts will introduce feature nodes** — operations that attach to a specific part-edge or part-face. A unified node ID scheme is the cleanest place to attach feature metadata. Without one, every consumer that wants to ask "what's attached to this edge" reinvents lookup.
- **The §11 hit-test service** returns `nodeId: string` in its `HitTarget`, but today `nodeId` is just `partId`. When groups become first-class hit targets (rotating a whole group via its bounding handles, say), the descriptor will need to express `group` vs `part` cleanly — node IDs are the answer.
- **The §3 session controller, §4 tool solvers, §5 geometry layer, §7 snap engine, §9 collision engine** all want to talk about "the things that move" and "the things that block." Today they each enumerate parts + descendants of selected groups + filters. A `NodeId`-based view collapses that to "every node in this set" + a single traversal helper.
- **Repeat-derivation cost.** With 500+ parts in stress fixtures (`tests/fixtures/index.ts` S3), every hover/drag tick re-runs ancestor walks across the project. A memoized derived layer pays once per project change.

The blueprint calls for a `sceneStore`. This ADR locks in the shape — but deliberately keeps it **derived**, not persisted. The project file format does not change. Domain truth still lives in `projectStore.parts / groups / groupMembers`. The scene graph is a memoized adapter on top of that truth.

## Decision

**Build a `WorkspaceSceneGraph` as a pure, memoized adapter over `projectStore`. Do not persist it. Do not store it. Consumers derive it via a single function.**

```ts
type NodeId = string; // same string space as `Part.id` and `Group.id` for now

interface PartNode {
  kind: "part";
  id: NodeId;
  parentId: NodeId | null;
  childIds: ReadonlyArray<NodeId>; // empty for parts
  partId: string; // same as id today; reserved for future
  partRef: Part; // resolved reference, for convenience
}

interface GroupNode {
  kind: "group";
  id: NodeId;
  parentId: NodeId | null;
  childIds: ReadonlyArray<NodeId>;
  name: string;
  groupRef: Group;
}

type SceneNode = PartNode | GroupNode;

interface WorkspaceSceneGraph {
  /** Every node keyed by id. O(1) lookup. */
  nodes: ReadonlyMap<NodeId, SceneNode>;
  /** Root nodes (parentId === null). Top-level parts + top-level groups. */
  rootIds: ReadonlyArray<NodeId>;
  /** Pure helpers operating on the graph (closure-bound). */
  descendantPartIds(id: NodeId): ReadonlyArray<string>;
  ancestorGroupIds(id: NodeId): ReadonlyArray<string>;
  findNode(id: NodeId): SceneNode | undefined;
}

function buildWorkspaceSceneGraph(input: {
  parts: ReadonlyArray<Part>;
  groups: ReadonlyArray<Group>;
  groupMembers: ReadonlyArray<GroupMember>;
}): WorkspaceSceneGraph;
```

### Why "derived" over "persisted"

The project file format is the user's data. We don't want a schema change for a refactor. Derive on read. If memoization becomes a bottleneck, the derivation runs at one site (`buildWorkspaceSceneGraph`); a future swap to persisted is a single-file change with no migration.

### Scope: §1a (this commit) vs §1b/§1c

**§1a — adapter + helpers + tests (this commit):**

- `interaction/sceneGraph.ts` with `WorkspaceSceneGraph`, `buildWorkspaceSceneGraph`, and the three traversal helpers (`descendantPartIds`, `ancestorGroupIds`, `findNode`).
- Engine tests cover: flat (no groups), single-level groups, nested groups (3+ levels), disjoint trees, malformed inputs (member references missing entity), and the S0–S5 fixtures.
- No consumer migration. The existing `getAllDescendantPartIds` / `getPartGroupContext` / etc. continue to work as today. The adapter is foundation.

**§1b — first consumers (follow-up):**

- Migrate `PartsRenderer` to read `descendantPartIds` from the adapter instead of calling `getAllDescendantPartIds`.
- Migrate `useGroupDrag` similarly.
- Each migration site keeps a one-line delegate call until §1c completes.

**§1c — replace ad-hoc traversals (follow-up):**

- Delete `getAllDescendantPartIds` from `selectionStore` / re-export from `projectStore`. The adapter is authoritative.
- Update `partClickHandler` to derive `PartGroupContext` from a `NodeId` walk.
- Coverage gate: any new traversal that hits `groupMembers.find` / `groupMembers.filter` must justify why the adapter isn't enough.

The §1a → §1b → §1c sequencing matches §10's: prove the adapter works, validate the contract on one consumer, lift the legacy traversals.

## World transform resolver

Out of scope for §1a. World transforms (the multiplication of nested local rotations + positions for groups containing groups) is a §5 (Geometry Query Layer) concern. The scene graph exposes hierarchy + local transforms via `part.position` / `part.rotation`; §5 will add a `resolveWorldTransform(nodeId, scene)` helper that walks the parent chain. Keeping it out of §1a keeps the adapter small.

## Alternatives considered

- **Persist the scene graph in the project file.** Rejected for now. The file format already encodes the same information (parts, groups, groupMembers). Persisting a derived structure introduces sync risk for no immediate gain.
- **Make `sceneStore` a Zustand store that auto-derives via subscribe.** Considered. Rejected for now because the derivation has no separate state — it's purely a function of `projectStore` slices. A `useMemo`-based hook at the call site is enough. If multiple components need to consume the same scene graph, a `useSceneGraph()` hook can wrap the memo (similar to `computeOverlayModel` in §10).
- **Treat parts and groups as the same kind of node (just `Node` with optional `partRef`).** Rejected. The discriminated union (`kind: 'part' | 'group'`) makes downstream consumer code easier to type and harder to misuse. The cost is one extra field per node.
- **Use Three.js's `Object3D` tree directly.** Rejected. We want the scene graph for domain reasoning (selection, hierarchy, custom-cuts attachment), not rendering. Three.js's tree is a rendering artifact controlled by R3F per render; the domain scene graph is independent.

## Consequences

- **Easier:** Adding feature-based custom-cuts attachment means extending `SceneNode` with a new variant (`kind: 'feature'` with a parent part edge/face), not inventing a parallel hierarchy.
- **Easier:** Hit-test `nodeId` becomes meaningful — the §11 service can resolve to either a part or a group node, and the session controller can route accordingly.
- **Easier:** Tools (§4) and the overlay model (§10) can carry `NodeId`s instead of always disambiguating `partId` vs `groupId`.
- **Easier:** `descendantPartIds(groupId)` runs against a precomputed `childIds` lookup, not a scan of `groupMembers` each call.
- **Harder:** Anyone tempted to call `groupMembers.find(...)` ad hoc must explain why the adapter isn't enough. This is the intended constraint.
- **Migration cost (§1a):** ~150 LOC of adapter + ~200 LOC of tests. Zero consumer changes.
- **Migration cost (§1b/§1c):** Incremental, ~20-50 LOC per consumer.

## Open questions

- **NodeId uniqueness when parts and groups have the same string id.** Today, part IDs and group IDs are both UUIDs; collisions are astronomically unlikely. The adapter assumes uniqueness across both spaces. If a project ever loads with a collision, the adapter throws (defensive — better than silent corruption). Document the invariant in the type comment.
- **Cycle detection.** A malformed `groupMembers` can in theory create a cycle (group A contains group B contains group A). The adapter logs a `console.warn` during build; runtime traversals (`descendantPartIds`, `ancestorGroupIds`) carry a visited set so they terminate without throwing. This matches the legacy `getAllDescendantPartIds` behavior of silently handling cyclic data — the UI must keep rendering even when the project file is malformed. Tests cover both build-time logging and runtime termination.
- **Feature nodes for custom-cuts (§6).** When custom cuts adds end-cuts / bevels / drill patterns, those become feature nodes parented to a part. Defer the type extension to ADR-010 (`Part definition dual-format migration`).

## References

- Blueprint: §1 Workspace Scene Graph
- Audit: [interaction-architecture-redesign.md](../interaction-architecture-redesign.md) — Finding 5 "Groups are not modeled as transform nodes"
- Existing traversals to be replaced in §1b/§1c:
  - `getAllDescendantPartIds` in [`selectionStore.ts`](../../packages/desktop/src/renderer/src/store/selectionStore.ts) (re-exported from `projectStore`)
  - `getPartGroupContext` in [`partClickHandler.ts`](../../packages/desktop/src/renderer/src/components/workspace/partClickHandler.ts)
  - `resolveMoveSelection` in [`interactionSelection.ts`](../../packages/desktop/src/renderer/src/utils/interactionSelection.ts)
  - `resolveMeasurementSelectionEntities` in [`interactionSelection.ts`](../../packages/desktop/src/renderer/src/utils/interactionSelection.ts)
- Execution plan: [interaction-architecture-execution-plan.md](../interaction-architecture-execution-plan.md) §1 Phase 1
- Related ADRs: ADR-009 (Geometry bundle cache, builds on scene graph for world transforms), ADR-010 (Part definition migration, extends `SceneNode` with feature variants)
