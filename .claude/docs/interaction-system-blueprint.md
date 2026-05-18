# Interaction System Blueprint

Status: Active target architecture  
Date: 2026-04-13  
Owner intent: establish the long-term interaction architecture for Carvd Studio desktop

See also:

- `reference-positioning-system.md` for the dedicated product and implementation spec for reference-driven move and resize

## Purpose

This document turns the findings in `interaction-architecture-redesign.md` into a concrete target architecture.

The goal is to define:

- the core interaction subsystems
- who owns what
- how data should flow
- which abstractions are stable enough to build on
- how to migrate there without stalling product work

## Current Milestones

This branch has already established a meaningful slice of the target architecture:

- shared interaction sessions for move, rotate, and resize
- shared move and resize preview solvers
- shared selection and reference entity resolution
- shared relation solving for move-relative and resize-relative rulers
- shared overlay consumption of active reference relations

That means this document is no longer purely aspirational. It is now the north star plus the record of which subsystems have working first implementations in the branch.

This is the architecture I would recommend we treat as the north star for workspace interaction, grouping, snapping, dimensions, overlap prevention, future reference positioning, and future part-cut behavior.

## Design Principles

### 1. Deterministic over magical

The workspace should feel smart, but never mysterious.

For any gesture, we should be able to answer:

- what entity was targeted
- what transform was attempted
- what snap won
- what constraint blocked or modified it

### 2. One conceptual engine, many tools

Move, resize, rotate, target-pick, cut-handle drag, and future measurement tools should all run through one interaction foundation.

Different tools can have different solvers, but they should share:

- target resolution
- gesture session state
- geometry query infrastructure
- constraint evaluation
- overlay output

Reference positioning is one of the clearest examples of why this matters:

- move and resize should use the same reference entity and relation model
- active rulers should come from session state
- direct numeric editing should solve transforms from relation semantics, not component-local heuristics

### 3. Geometry is a service, not the whole app

Geometry calculations should be isolated behind explicit query layers.

The UI should not directly own:

- face enumeration
- anchor generation
- collision proxies
- feature-derived dimensions

### 4. Blank-first, operations-second

The product is still woodworking-first:

- the blank matters
- fabrication operations matter
- arbitrary freeform modeling does not

The architecture must support custom cuts, but it should do so in a way that preserves the blank-plus-operations model.

### 5. Preview and commit must match

The result shown during interaction must be produced by the same transform-resolution pipeline used on commit.

No more:

- preview one thing
- commit a slightly different thing
- patch the difference with a post-hoc clamp

## Proposed Subsystems

## 1. Workspace Scene Graph

### Responsibility

Represent the authoritative structural hierarchy of interactable entities in the workspace.

### Why

Groups and parts currently behave like separate concepts with ad hoc expansion logic. That has to become a true node graph.

### Proposed model

```ts
type NodeId = string;

interface SceneNodeBase {
  id: NodeId;
  parentId: NodeId | null;
  childIds: NodeId[];
  localTransform: Transform3D;
}

interface GroupNode extends SceneNodeBase {
  kind: "group";
  name: string;
}

interface PartNode extends SceneNodeBase {
  kind: "part";
  partId: string;
}

interface Transform3D {
  position: Vec3;
  rotation: QuaternionLike;
  scale?: Vec3;
}
```

### Rules

- parts and groups are both nodes
- transforms are local-to-parent
- world transforms are derived by one resolver
- selection, snapping, and collision all refer to node ids first

### Compatibility

We do not need to rewrite persistence immediately.

Short term:

- build a derived scene graph from existing `groups`, `groupMembers`, and `parts`

Long term:

- move persisted group structure toward a true node model

## 2. Selection and Scope Resolver

### Responsibility

Turn raw user intent into a stable interaction target set.

### Input

- current scene graph
- editing scope / focus scope
- selected nodes
- hovered target
- active tool

### Output

```ts
interface ResolvedSelection {
  focusScopeId: NodeId | null;
  selectedNodeIds: NodeId[];
  primaryNodeId: NodeId | null;
  interactionNodeIds: NodeId[];
  resolvedPartIds: string[];
  transformFrame: "local" | "parent" | "world";
  pivot: {
    worldPosition: Vec3;
    strategy: "single-node-origin" | "bounds-center" | "custom";
  };
}
```

### Rules

- no component or hook should recursively expand groups on its own
- all callers must use the same resolver
- `selectedNodeIds` means what the user selected
- `interactionNodeIds` means what the tool will manipulate

### Notes

This resolver becomes the replacement for all the current repeated calls to:

- `getAllDescendantPartIds`
- `getContainingGroupId`
- tool-specific “if editing group then…” expansion branches

## 3. Interaction Session Controller

### Responsibility

Own the lifecycle of an active gesture from pointer-down through commit or cancel.

### Why

This is the missing heart of the architecture.

Today interaction state is scattered across:

- selection store
- snap store
- component-local refs
- workspace-level event listeners

We need one controller with one session object.

### Proposed model

```ts
type InteractionTool =
  | "select"
  | "move"
  | "resize"
  | "rotate"
  | "measure"
  | "pick-target"
  | "edit-feature";

interface InteractionSession {
  id: string;
  tool: InteractionTool;
  phase: "idle" | "armed" | "dragging" | "committing" | "cancelled";
  pointerId: number;
  resolvedSelection: ResolvedSelection;
  gestureFrame: GestureFrame;
  startSnapshot: TransformSnapshot;
  candidate: CandidateTransformState;
  resolved: ResolvedTransformState;
  referenceState: ReferenceInteractionState;
  overlays: OverlayModel;
}
```

### Responsibilities inside the controller

- pointer capture ownership
- drag threshold logic
- hit target stabilization
- gesture-frame computation
- calling the active tool solver
- exposing overlay state to rendering
- commit / cancel
- stabilizing active reference relations during transform sessions

### Important rule

Only this layer should decide whether a gesture became a click, a drag, a rotate, or a preview-handle edit.

That means the current mix of:

- native `Workspace` listeners
- `Part` handlers
- instanced drag handoff
- tool-specific pointer capture

should converge into one session owner.

## 4. Tool Solvers

### Responsibility

Convert raw pointer movement into candidate transforms for a specific tool.

### Tool set

- `MoveToolSolver`
- `ResizeToolSolver`
- `RotateToolSolver`
- `FeatureEditToolSolver`
- later: `MeasureToolSolver`, `AlignToolSolver`

### Shared contract

```ts
interface ToolSolver {
  begin(input: SolverBeginInput): SolverState;
  update(input: SolverUpdateInput): CandidateTransformState;
  commit(input: SolverCommitInput): CommitInstruction[];
}
```

### Key rule

Tool solvers are responsible for gesture semantics, not snapping, collision, or overlays directly.

They produce candidate transforms in a canonical space.

Then the shared resolution pipeline handles:

- snapping
- constraints
- overlays
- reference relation solving and active ruler state

## 5. Geometry Query Layer

### Responsibility

Provide all geometric data needed by interaction, snapping, measurement, and collision without leaking implementation details everywhere.

### Proposed query products

Each part should expose a cached `PartGeometryBundle`.

```ts
interface PartGeometryBundle {
  renderMesh: RenderMeshData;
  hitProxy: HitProxyData;
  snapGraph: SnapGraph;
  measureGraph: MeasureGraph;
  collisionProxy: CollisionProxy;
  bounds: {
    localAabb: Aabb;
    localObb: Obb;
  };
  versionKey: string;
}
```

### Why this matters

For a plain rectangular board, these may all be derived from the same base shape.

For a part with custom cuts, they will diverge:

- the render mesh becomes more exact
- the snap graph gains feature edges and corners
- the measure graph gains operation-aware dimensions and angle refs
- the collision proxy may stay simpler for performance

This explicit separation is how we stay both correct and fast.

## 6. Part Shape Model

### Responsibility

Represent the fabricated shape of a part in a woodworking-native way.

### Proposed model

```ts
interface PartDefinition {
  blank: {
    length: number;
    width: number;
    thickness: number;
  };
  fabricationOperations: FabricationOperation[];
  material: MaterialAssignment;
  metadata: PartMetadata;
}
```

### Operation families

- `end_cut`
- `rect_cut`
- future constrained families:
  - `edge_profile`
  - `drill_pattern`
  - `joinery_reference`

### Important rules

- operation order is authoritative
- geometry bundle generation is derived from ordered operations
- blank dimensions remain the basis for stock/cut-list logic

### Why this is the right boundary

This aligns with the existing custom-cut POC direction:

- blank-plus-operations
- ordered stack
- woodworking vocabulary

while also giving the workspace a stable shape source for snapping and collision.

## 7. Snap Engine

### Responsibility

Generate, score, arbitrate, and return snap constraints against the candidate transform.

### Input

- resolved selection
- candidate transform
- active geometry bundles
- app/project snap settings
- current snap latch state

### Output

```ts
interface SnapResolution {
  winners: SnapConstraint[];
  candidates: SnapConstraint[];
  latchState: SnapLatchState;
  adjustedTransform: CandidateTransformState;
  overlayPrimitives: OverlayPrimitive[];
}
```

### Architecture rules

- snap generation works from anchor graphs, not raw position mutations
- arbitration is deterministic and testable
- group drag and part drag use the same engine
- the engine should not know about React or stores

### Recommended internal phases

1. gather candidate target anchors
2. prune by broad spatial threshold
3. generate candidate relations
4. group by transform DOF
5. apply priority and hysteresis rules
6. emit resolved snap constraints
7. derive overlay primitives from the same result

### Degrees of freedom

The snap engine should stop thinking only in `x`, `y`, `z`.

It should support:

- translation dof
- resize dof per editable dimension
- rotation dof later if needed

The current per-axis model is still useful for move, but the internal abstraction should be broader.

## 8. Constraint Engine

### Responsibility

Apply hard constraints after snapping and before commit.

### Constraint families

- ground contact
- stock assignment limits
- tool-specific semantic limits
- scene-scope limits
- collision / overlap / fit policy

### Output

```ts
interface ConstraintResolution {
  adjustedTransform: CandidateTransformState;
  blockers: ConstraintBlocker[];
  warnings: ConstraintWarning[];
}
```

### Critical design rule

Constraints should be ordered and composable, not ad hoc inside gesture hooks.

Recommended order:

1. tool semantic bounds
2. scene/frame normalization
3. snap result application
4. ground constraint
5. stock/material constraints
6. collision/fit constraint

If this order changes for a tool, it must be explicit.

## 9. Collision and Fit Engine

### Responsibility

Answer whether a candidate transform causes forbidden spatial conflict.

### This is not a physics engine

We do not need:

- mass
- velocity
- impulses
- simulation stepping

We do need:

- contact detection
- penetration prevention
- future fit-aware exceptions

### Proposed model

```ts
interface CollisionPolicy {
  pairMode:
    | "forbid_penetration"
    | "allow_touching"
    | "allow_penetration"
    | "allow_feature_fit";
}
```

### Recommended strategy

- broad phase: AABB / OBB / spatial hash
- narrow phase: proxy-vs-proxy contact test
- optional exact test later for complex feature stacks

### Near-term proxy strategy

Short term:

- rectangular boards and simple groups can use OBB-based proxies

Medium term:

- feature-bearing parts can use a conservative convex or composite proxy

Long term:

- exact or semi-exact narrow-phase checks for operation-aware fits where needed

### Why this is enough

The product needs “objects cannot wrongly occupy the same space” and “intentional fits can be modeled,” not rigid-body simulation.

## 10. Overlay Engine

### Responsibility

Render all interaction feedback from one resolved interaction state.

### Overlay families

- snap winner/candidate lines
- dimension markers
- passive and active reference rulers
- angle markers
- relative-position guides
- feature handle hints
- blocked/constraint badges

### Proposed model

```ts
interface OverlayModel {
  snap: SnapOverlayData[];
  dimensions: DimensionOverlayData[];
  angles: AngleOverlayData[];
  references: ReferenceRulerOverlayData[];
  hints: HintOverlayData[];
}
```

### Key rule

Overlays are derived from:

- resolved session state

not independently from:

- selected ids
- drag delta
- active snap lines
- whatever each component feels like reconstructing

This is the main path to making dimensions and snap markers feel coherent.

For references specifically:

- idle selection can show passive rulers
- move sessions should promote one active move ruler
- resize sessions may show both a size ruler and a gap ruler
- overlays should never have to guess whether a ruler edits position or size

## 11. Hit-Testing Layer

### Responsibility

Resolve hovered/pressed target consistently across instanced and individual rendering.

### Why

Rendering optimization should not alter interaction semantics.

### Rule

Instanced parts and individual parts must both report into one hit-target abstraction:

```ts
interface HitTarget {
  nodeId: NodeId;
  subTarget?:
    | { kind: "part-body" }
    | { kind: "resize-handle"; axis: "x" | "y" | "z"; side: 1 | -1 }
    | { kind: "rotation-handle"; axis: "x" | "y" | "z"; side: 1 | -1 }
    | { kind: "feature-handle"; featureId: string; handleKind: string }
    | { kind: "snap-guide"; guideId: string };
}
```

### Implementation note

This likely means introducing a shared hit-test service rather than relying on a mix of direct Three events plus native DOM listeners plus fallback box-ray checks.

## 12. Persistence and Store Ownership

### Recommendation

Do not put all of this into `projectStore`.

Break ownership out more clearly:

- `projectStore`
  - persistent project data only
- `sceneStore`
  - derived scene graph and cached node maps
- `selectionStore`
  - lightweight user intent only
- `interactionStore`
  - active tool + active session
- `geometryCacheStore` or service
  - geometry bundles keyed by part version
- `overlayStore`
  - optional derived overlay state, if not fully session-owned

Reference positioning should primarily live in:

- `selectionStore` for raw user intent
- `interactionStore` for active reference relations during sessions
- derived geometry/reference services for entity and relation solving

It should not remain primarily a `snapStore` overlay concern.

### Strong rule

Persistent domain state and transient interaction state should never be mixed again.

## Data Flow

## Gesture flow

```text
Pointer event
  -> Hit-test service
  -> Selection/scope resolver
  -> Interaction session controller
  -> Tool solver produces candidate transform
  -> Snap engine adjusts candidate
  -> Constraint engine validates/adjusts
  -> Overlay engine derives feedback
  -> Session publishes resolved preview
  -> Commit writes domain changes
```

## Geometry flow

```text
Part blank + fabrication operations
  -> geometry bundle builder
  -> render mesh
  -> hit proxy
  -> snap graph
  -> measure graph
  -> collision proxy
```

## Tooling Consequences

### What gets simpler

- group expansion logic disappears from most components
- move/group move parity becomes automatic
- dimensions and markers stop guessing from stale state
- new operation types can plug into one geometry pipeline
- debugging gets much easier

### What gets stricter

- every feature needs stable geometry ids
- every tool must respect the shared session contract
- every preview-affecting rule needs tests at the engine layer

## Testing Strategy

The new architecture should be tested at three layers.

### 1. Pure engine tests

For:

- selection resolver
- scene graph transforms
- snap arbitration
- constraint engine
- collision policy

These should be the majority of interaction correctness tests.

### 2. Session integration tests

For:

- click vs drag resolution
- move/resize/rotate commit parity
- group/nested-group gestures
- feature-handle editing

### 3. UI smoke tests

For:

- mode entry/exit
- controls rendered for selection
- overlay visibility

## Migration Blueprint

This should be done as a sequence of controlled refactors, not a rewrite spike.

## Phase 1. Resolver foundation

Build:

- derived scene graph adapter
- shared selection/scope resolver
- tests for nested grouping semantics

Then replace all duplicated selection-expansion code.

## Phase 2. Interaction store

Build:

- `interactionStore`
- session object
- shared hit-target contract

Then migrate move gestures first.

## Phase 3. Shared move solver

Build:

- unified move tool solver
- shared snap/constraint ordering

Then delete the duplicated logic split across `usePartDrag` and `useGroupDrag`.

## Phase 4. Overlay unification

Build:

- session-derived overlay model

Then migrate:

- snap lines
- reference distances
- multi-selection dimensions

## Phase 4a. Reference positioning system

Build:

- reference entity resolver
- reference relation solver
- active ruler model

Then migrate:

- move-relative distance editing
- reference overlay rendering
- resize-relative gap editing

This phase should follow the dedicated behavior and terminology in `reference-positioning-system.md`.

## Phase 5. Rotate and resize migration

Move rotation and resize to the same session pipeline and shared constraint system.

Reference-driven resize behavior should be treated as part of this phase rather than as a disconnected UX enhancement.

## Phase 6. Geometry bundle layer

Build:

- part geometry bundle service
- bundle caching keyed by part shape version

Initially the bundle can still mostly describe simple box parts.

## Phase 7. Fabrication-shape integration

Move custom cuts and future part features onto the geometry bundle contract so snapping, dimensions, and collision use the same part definition.

Reference positioning will eventually need this phase for:

- feature-edge references
- cut-derived face gaps
- angle rulers for mitres and bevels

## Phase 8. Collision policy upgrade

Replace the current binary overlap logic with policy-driven fit/collision handling.

## Architectural Tradeoffs

### Why not a full ECS?

Because this app is not simulation-heavy enough to justify the cognitive overhead.

We need:

- clear node hierarchy
- clear interaction sessions
- clear geometry services

not a generalized entity-component-system overhaul.

### Why not a full physics engine?

Because the desired behavior is geometric constraint solving, not dynamic simulation.

Physics engines are great at moving bodies after impulses.

This product needs:

- deliberate placement
- exact snapping
- intelligible blocking
- woodworking-friendly behavior

### Why not keep groups as flat memberships?

Because nested transforms, pivots, and future feature-aware manipulation will keep forcing the same logic duplication if groups do not become real nodes.

## Non-Negotiable Invariants

These are the rules I would treat as architecture constraints going forward.

1. No tool recomputes descendant expansion ad hoc.
2. No preview path uses different ordering than commit.
3. Rendering strategy never changes interaction semantics.
4. Snap overlays are derived from resolved snap state, not hand-built separately.
5. A part’s fabrication shape is derived from blank plus ordered operations.
6. Collision policy is explicit per pair or per operation context.
7. Geometry logic lives behind a service layer, not inside UI components.

## Recommended Immediate Next Steps

1. Create a small derived `sceneGraph.ts` adapter from existing group data.
2. Create `resolveInteractionSelection.ts` and replace duplicated expansion logic first.
3. Introduce `interactionStore.ts` with an initial move-session model.
4. Refactor move gestures onto one shared solver before touching resize/rotate.
5. Keep custom cuts on their current POC path, but require future geometry work to target the bundle/query architecture above.

If we do just those five things, the codebase starts moving from “fragile behavior patches” to “real interaction architecture.”
