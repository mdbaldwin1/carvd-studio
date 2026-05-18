# Interaction Architecture Redesign

Status: Active architecture review and migration guide  
Date: 2026-04-13  
Scope: Desktop workspace interaction model (`packages/desktop`)

See also:

- `interaction-system-blueprint.md` for the concrete target subsystem design and migration blueprint
- `reference-positioning-system.md` for the dedicated reference-driven move/resize spec

## Why This Exists

The current workspace behavior is not failing because of one bad snap rule or one bad overlap check. It is failing because selection, grouping, drag/resize/rotate, snapping, overlap prevention, and measurement overlays do not share a single authoritative interaction model.

Today the app behaves like several partially overlapping systems:

- selection semantics live in `selectionStore.ts`, `Workspace.tsx`, `Part.tsx`, and `partClickHandler.ts`
- move/rotate group expansion logic is duplicated in `projectStore.ts`, `usePartDrag.ts`, `useGroupDrag.ts`, `GroupRotationHandles.tsx`, `snapStore.ts`, `MultiSelectionDimensions.tsx`, and context menu logic
- snapping is split across one very large geometry utility plus two separate drag hooks with separate orchestration
- preview-time constraints and commit-time constraints are not consistently applied in the same order
- groups are membership lists, not first-class transformable scene nodes
- parts are still treated as rectangular boxes even though the product direction is moving toward custom cuts and fabrication-aware geometry

That architecture is why fixes keep regressing other behaviors.

## Current Progress Since This Review

The branch has already addressed part of what this review called out:

- selection expansion semantics are shared instead of being reimplemented in many consumers
- move, rotate, and resize now have shared interaction-session state
- move and resize both publish session-driven reference rulers
- typed move and resize ruler edits now flow through shared relation semantics
- active reference targets now latch across near-equal candidates instead of flickering
- **Phase §11 Hit-Testing Layer is complete** ([ADR-002](./adr/002-hit-testing-service.md)): a single `resolveHitTarget` service replaces five scattered raycast paths; every interactive mesh publishes a typed `HitTarget` descriptor on its `userData.hitTarget`. The `shouldForceIndividualFallback` rendering workaround is deleted — instanced parts are now hittable correctly without it. Engine tests (22 cases) lock in the four bug classes below plus every `HitTarget` kind.

The remaining risks are still real, especially around deeper group geometry, richer feature-aware references, and eventual custom-cut support, but the interaction model is no longer in the same fragmented state that motivated this review.

## Bug Classes Resolved While Writing This Audit

These were live, user-visible bugs in the workspace that this review surfaced and that we then fixed inside the existing architecture. They are recorded here as concrete failure modes the proposed redesign should preclude — not as victories. Each one is a symptom of a structural problem this audit calls out elsewhere in the document.

### InstancedMesh `boundingSphere` corruption

Clicks on any part rendered via the bulk `InstancedMesh` (i.e. anything not in `individualPartIdSet` — usually the unselected parts) silently passed through to the ground. Root cause: the bounding sphere was being written to `mesh.geometry.boundingSphere` (which three.js expects in _local_ space — for our unit-cube geometry that's centered at origin) populated with a world-space union of all instance bounds. three.js's per-instance `Mesh.raycast` then transformed that world-space sphere by each instance's matrix and missed the actual instance.

**Why this is structural:** Section 11 (Hit-Testing Layer) — rendering optimization (instanced vs individual) was leaking into interaction correctness. A consolidated hit-test service would not have this kind of "depends on which renderer drew the part" failure mode.

### `<Html occlude='blending'>` shader plane on Apple Metal

Large opaque black rectangles appeared in the workspace during drag wherever drei `<Html>` overlay labels were positioned (snap tokens, distance labels, reference rulers, "SNAP LOCK" indicator). The `occlude='blending'` mode renders an invisible shader plane sized to the HTML element for depth-based occlusion blending; the shader leaks black fragments visibly on Apple Metal/ANGLE drivers (Electron 41 on M-series macOS). Switching to raycast-based `occlude={true}` removed the plane entirely.

**Why this is structural:** Section 10 (Overlay Engine) — overlays are currently rendered ad-hoc with whatever drei primitives the implementing component reaches for, including driver-fragile features like shader-plane occlusion. A session-derived overlay model with a small set of vetted overlay primitives would have caught this once for all label types.

### Multi-handler additive-selection double-toggle

Shift / Cmd+click on a part appeared to do nothing. The R3F per-mesh `pointerdown` handler toggled selection (correct), then the native canvas `mouseup` fallback in `Workspace.tsx` called `selectFromPartHit(part, additive=true)` which toggled again — net zero change. The `selectionChangedDuringClick` guard meant to prevent this took its snapshot in the native `mousedown` handler, which runs _after_ R3F's `pointerdown` (W3C event order), so the snapshot already reflected the toggle.

**Why this is structural:** Section 3 (Interaction Session Controller) and Finding 2 (Gesture ownership is fragmented) — there are five overlapping event sources fighting over canvas gestures (R3F per-mesh handlers, R3F ground/sky handlers, native `mousedown`, native `mouseup`, native `contextmenu`) coordinating through 8+ refs. Shift+click is the simplest possible gesture and it took two paths to break. Single gesture-session ownership would prevent this whole class.

### Right-click context menu blocked by HTML overlay portals

Right-clicks on the workspace failed to open the context menu whenever the click landed on a drei `<Html>` overlay label sitting on top of the canvas. The label is portaled into `document.body`, so DOM `contextmenu` events fire on the label and bubble through `body` — _not_ through the canvas. The canvas-attached `contextmenu` listener never saw them. Moving the listener to `window` (gated by canvas bounding rect) restored coverage.

**Why this is structural:** Section 11 (Hit-Testing Layer) again — the canvas DOM is one input surface, `<Html>` portals are another, and the workspace was assuming everything reachable through interaction lived on the canvas. A consolidated input layer would treat "click within workspace viewport" as one event regardless of which DOM node the browser delivered it to.

### `useEffect` dep on object reference nuking move-session preview

When dragging a multi-selection, only the clicked part visually moved during drag; other selected parts stayed at their pre-drag positions and jumped on release. The window-listener `useEffect` in `usePartDrag` had the entire `liveDims` object in its dependency array. Every drag frame's `setLiveDims` produced a new object reference, the effect cleanup ran and called `clearMoveInteractionPreview()` (which ends the move session), the new effect re-attached listeners but didn't recreate the session — so the next frame's `updateMoveSessionDelta` no-op'd against a null `activeSession`. The dragged part still moved because _its_ preview uses local `liveDims`; everyone else depends on `activeSession.delta`.

**Why this is structural:** Section 3 (Interaction Session Controller) — session lifecycle is currently entangled with React effect lifecycle in the per-part hook. A session controller that owns lifecycle independently of any one component's render cycle would not exhibit this. The fix here used `liveDims.length/.width/.thickness` (primitives, only change on resize) instead of the object reference, which is correct for the existing architecture but is a workaround for the deeper problem.

## What These Have In Common

All five share the same shape: **interaction state lives in multiple places, each of which the architecture trusts independently, and a small mismatch between them produces silent failure**. None of these is a "missing feature" — they're all the same bug class viewed from different angles. That's what the proposed redesign is for.

## Audited Surfaces

Primary files reviewed:

- `packages/desktop/src/renderer/src/components/workspace/Workspace.tsx`
- `packages/desktop/src/renderer/src/components/workspace/Part.tsx`
- `packages/desktop/src/renderer/src/components/workspace/PartsRenderer.tsx`
- `packages/desktop/src/renderer/src/components/workspace/usePartDrag.ts`
- `packages/desktop/src/renderer/src/components/workspace/useGroupDrag.ts`
- `packages/desktop/src/renderer/src/components/workspace/usePartResize.ts`
- `packages/desktop/src/renderer/src/components/workspace/GroupRotationHandles.tsx`
- `packages/desktop/src/renderer/src/components/workspace/MultiSelectionDimensions.tsx`
- `packages/desktop/src/renderer/src/components/workspace/SnapAlignmentLines.tsx`
- `packages/desktop/src/renderer/src/components/workspace/partClickHandler.ts`
- `packages/desktop/src/renderer/src/store/projectStore.ts`
- `packages/desktop/src/renderer/src/store/selectionStore.ts`
- `packages/desktop/src/renderer/src/store/snapStore.ts`
- `packages/desktop/src/renderer/src/store/appSettingsStore.ts`
- `packages/desktop/src/renderer/src/utils/snapToPartsUtil.ts`
- `packages/desktop/src/renderer/src/utils/snapPriority.ts`
- `packages/desktop/src/renderer/src/utils/groupDragSnapArbitration.ts`
- `packages/desktop/src/renderer/src/utils/overlapPolicy.ts`
- `.claude/docs/snapping-taxonomy-priorities-indicator-spec.md`

## Core Findings

### 1. There is no single source of truth for "what is being manipulated"

The meaning of selection changes depending on the caller:

- sometimes we mean directly selected parts
- sometimes we mean selected groups expanded to descendants
- sometimes we mean selected parts plus containing groups
- sometimes editing a group changes the expansion rule

That expansion logic is duplicated in many places and is not guaranteed to stay in sync. The result is predictable: drag, rotate, dimensions, context menus, and reference measurements can disagree about what the active target actually is.

### 2. Gesture ownership is fragmented

Selection and interaction are split between:

- native canvas listeners in `Workspace.tsx`
- individual mesh handlers in `Part.tsx`
- instanced-mesh handoff through drag intent
- drag session logic inside `usePartDrag.ts`
- separate group drag session logic inside `useGroupDrag.ts`

This creates race conditions around:

- click vs drag
- double click vs drill into group
- background deselection vs part hit detection
- instanced vs individual render mode transitions
- right click targeting vs actual selected entity

The system currently relies on timing guards and fallback listeners because event ownership is not explicit.

### 3. Single-part drag and group drag are two different engines

`usePartDrag.ts` and `useGroupDrag.ts` both perform:

- drag-plane solving
- grid projection
- snap-stage orchestration
- guide/origin/face/surface/fraction/feature/axis arbitration
- overlap prevention
- ground constraint handling

But they do not do it through one shared pipeline. Group drag uses a box-shaped proxy and its own arbitration helper. Single-part drag has face latch logic and reference-distance logic that group drag partially mirrors. These paths will continue to drift.

### 4. Constraint order is inconsistent between preview and commit

Ground constraint, grid snap, snap-to-parts, overlap prevention, and final commit logic do not happen in one canonical order across:

- live part drag
- group drag
- single-part release
- multi-part release
- resize preview
- resize commit
- rotate commit
- `projectStore.moveSelectedParts`

This means the user can preview one result and commit another. That breaks trust immediately.

### 5. Groups are not modeled as transform nodes

Current groups are membership containers only. They do not own transforms or world/local coordinate relationships. As a result:

- every operation has to recursively gather descendants
- group pivots are recomputed ad hoc from bounds
- nested groups are selection concepts more than geometry concepts
- relative positioning within a group is not explicit in the data model

This is workable for simple grouping, but it is the wrong substrate for robust nested transforms, future assemblies, or physics-like fit behavior.

### 6. Snapping is geometry-heavy but interaction-light

`snapToPartsUtil.ts` contains a large amount of geometry logic, but the app still lacks:

- a canonical "candidate set" abstraction
- persistent interaction session state
- a shared preview transform object
- a feature/anchor graph derived from part geometry

The current setup computes snap deltas directly against raw part boxes and immediately mutates working positions. That makes arbitration and constraint composition harder than it should be.

### 7. Marker and measurement logic is downstream of ad hoc state

Dimension labels, reference distances, snap labels, and multi-selection bounds are not derived from a single resolved interaction result. They are reconstructed separately from:

- `activeSnapLines`
- `referencePartIds`
- `activeDragDelta`
- axis-aligned bounds assumptions

This is why visual feedback can feel disconnected from what the gesture is actually doing.

### 7a. Reference positioning is implemented as an overlay behavior, not as a transform model

The current reference system already has useful building blocks:

- explicit reference targets
- rendered reference-distance indicators
- direct numeric editing for some move-relative distances

But it is still architected like a side-effect of selection and overlay rendering rather than like a first-class interaction subsystem.

Current weaknesses:

- references are collapsed into combined bounds too early
- groups are not treated as coherent reference entities
- move-relative editing is line-vector driven instead of relation driven
- resize does not expose editable gap-to-reference behavior
- there is no canonical active reference relation shared by move, resize, and overlays

That means the user can still be left guessing:

- what reference target the app actually chose
- whether a ruler is merely informative or actively controlling the transform
- whether a typed value changes position or size

### 8. The current `Part` model is not ready for custom cuts

The current `Part` type is still basically:

- box dimensions
- world position
- Euler rotation
- stock assignment

That is not enough for:

- mitres
- bevels
- compound cuts
- cutouts/notches
- feature-aware anchors
- collision that understands voids or intentional fits
- dimension markers for feature-derived edges

If custom cuts are coming, the interaction system has to stop assuming "a part is a box" even if the first placement proxy remains box-like.

## What The Architecture Should Become

The workspace should behave like a lightweight deterministic CAD interaction engine, not like disconnected UI handlers.

Not a full rigid-body physics simulation.

But it should borrow the right ideas:

- one authoritative scene graph
- one authoritative interaction session
- explicit geometry proxies for render, snap, and collision
- deterministic candidate generation and constraint solving
- preview and commit using the same pipeline

## Recommended Target Model

## 1. Scene Graph

Introduce a first-class scene graph for workspace entities.

Suggested shape:

- `SceneNode`
  - `id`
  - `type: 'group' | 'part'`
  - `parentId: string | null`
  - `children: string[]`
  - `localTransform`
  - `worldTransform` derived, not persisted

- `PartEntity`
  - `blank`: base stock dimensions
  - `fabricationFeatures`: ordered subtractive/transform operations
  - `material/grain/notes`
  - `placementPolicy`

- `GroupEntity`
  - `name`
  - optional semantic metadata only

Important design choice:

- parts and groups should both be nodes in the same hierarchy
- transforms should be local to parent
- world transforms should be derived through one shared resolver

This eliminates repeated descendant expansion logic and makes nested groups real instead of conceptual.

## 2. Selection Model

Replace the current implicit meaning of selection with explicit layers:

- `focusScope`
  - top-level or currently entered group
- `selectionSet`
  - directly selected node ids
- `interactionSet`
  - resolved set of nodes affected by the current tool and scope rules
- `hoverTarget`
  - current hit target
- `primaryTarget`
  - canonical target for a gesture

Critical rule:

- `selectionSet` is intent
- `interactionSet` is computed
- no tool should recompute expansion rules ad hoc

Every tool asks the same resolver:

- "Given current scope, tool mode, and selection, what entities are manipulable?"

## 3. Interaction Session

Create a dedicated interaction store or controller for active gestures.

Suggested shape:

- `activeTool: 'select' | 'move' | 'resize' | 'rotate' | 'measure' | 'cut-edit'`
- `session`
  - `kind`
  - `targetNodeIds`
  - `anchor`
  - `startTransforms`
  - `dragPlane`
  - `candidateTransform`
  - `resolvedTransform`
  - `snapResult`
  - `constraintResult`
  - `overlayModel`

Only one path should own pointer capture and gesture lifecycle:

- pointer down resolves target
- interaction controller starts session
- frame updates run the same solver
- overlays render from session state
- pointer up commits exactly what was previewed

This removes the current split between workspace-native listeners, part-local listeners, and drag-intent handoff hacks.

## 4. Unified Transform Solver

All transforms should go through one shared pipeline:

1. Resolve interaction target and scope
2. Produce raw candidate transform from pointer movement
3. Apply tool-space rules
   - move plane
   - resize axis/handle semantics
   - rotate pivot and axis
4. Generate snap candidates from geometry anchors
5. Arbitrate winners deterministically
6. Apply hard constraints
   - ground
   - stock rules
   - collision / fit policy
   - edit-scope boundaries if any
7. Produce overlay model
8. Commit same resolved transform on release

Every tool can vary step 3, but steps 4-8 should be shared.

## 5. Geometry Pipeline

Each part should generate and cache several geometry views:

- `renderMesh`
- `selectionProxy`
- `snapAnchorGraph`
- `measurementGraph`
- `collisionProxy`

These should not all be the same object.

### Suggested meanings

- `renderMesh`
  - exact visible geometry, including custom cuts
- `selectionProxy`
  - interaction-friendly mesh or hull for hit testing
- `snapAnchorGraph`
  - faces, edges, vertices, feature anchors, fractional anchors, semantic anchors
- `measurementGraph`
  - dimensions, centerlines, angle markers, relative-position anchors
- `collisionProxy`
  - fast broad-phase hull plus optional narrow-phase solid

This is the piece that makes custom cuts and robust snapping compatible.

## 6. Collision and Fit Model

Do not jump straight to "full physics engine."

Instead use a CAD-style constraint system with broad-phase and narrow-phase contact solving:

- broad phase
  - AABB/OBB or cached BVH for candidate pairs
- narrow phase
  - exact or approximate solid intersection based on the part's collision proxy
- policy layer
  - allowed contact
  - forbidden penetration
  - intentional fit / ignore overlap exceptions

Recommended policy states per pair:

- `allow_separated`
- `allow_touching`
- `allow_interpenetration`
- `allow_feature_fit`
- `forbid_overlap`

This is much better than a single `ignoreOverlap` boolean as custom cuts mature.

For early implementation, the collision proxy can remain a box or convex proxy for most parts, but the architecture must allow feature-aware narrow-phase checks later.

## 7. Snap Engine Should Operate On Anchors, Not Direct Position Mutations

The next snap system should:

- derive anchors from geometry proxies
- produce candidate relations
- rank them once
- return a `SnapResolution`

Suggested result:

- winning constraints per axis or per transform DOF
- latched state
- candidate list for overlays
- overlay primitives

Then the transform solver applies that result. The snap system should not directly mutate working positions in multiple places.

## 8. Overlays Should Be Derived From The Session Result

Dimension markers, relative-position markers, angle markers, snap lines, and reference distances should all come from the interaction session's resolved model.

The overlay layer should consume:

- current interaction scope
- current resolved transform
- current snap winners and candidates
- current measurement graph

For reference positioning specifically, the session result should also include:

- resolved reference entities
- candidate reference relations
- one active reference relation
- ruler edit semantics for move vs resize

Not raw store fragments.

That gives us:

- angle markers that match the active rotate gesture
- dimension markers that match actual feature geometry
- relative-position markers derived from the same anchor graph used by snapping

## What This Means For Custom Cuts

Custom cuts are the forcing function that makes the redesign necessary.

The right part model is:

- start with a rectangular blank
- apply ordered fabrication operations
- derive geometry + anchors + collision from that operation list

Suggested operation families:

- `endCut`
  - mitre
  - bevel
  - compound cut
- `edgeCut`
  - bevel/chamfer/rabbet-like edge shaping if supported
- `faceCut`
  - pocket
  - rectangular cutout
  - notch
- `cornerCut`
  - corner notch / relief

Each operation should declare:

- target semantic surface/edge/corner
- dimensional inputs
- validation rules
- derived anchors it contributes

Then the interaction engine can support:

- snapping to blank edges
- snapping to feature edges
- feature-aware dimension markers
- future fit-aware collision exceptions

## Specific Architectural Recommendations

### A. Replace duplicated selection expansion with one resolver

Create a shared resolver module, something like:

- `resolveInteractionSelection(state, toolMode): ResolvedSelection`

This should be the only place that decides:

- whether selected parts imply containing groups
- how nested groups expand while editing
- what the pivot is
- what the measurement bounds are
- what should move/rotate/resize

### B. Replace `activeDragDelta` with an interaction session object

`activeDragDelta` is a useful symptom but not a good architecture primitive. It only works for one class of gesture and leaks into overlays.

Use a session object with:

- raw candidate
- resolved transform
- snap state
- overlays

### C. Collapse `usePartDrag` and `useGroupDrag` into a shared transform controller

Single-part drag and group drag should use the same core solver. The only difference should be the resolved interaction target and geometry proxy.

### D. Move snap arbitration out of component hooks

Component hooks should call a shared engine. They should not own snap priority orchestration themselves.

### D1. Move reference editing out of component-local ruler logic

Reference distance editing should not remain a local behavior inside ruler-rendering components.

The shared interaction pipeline should own:

- reference entity resolution
- active relation selection
- relation-to-transform solving
- ruler generation

The overlay should render the resolved result, not invent transform semantics on its own.

### E. Stop coupling render mode to interaction correctness

The current split between instanced and individual rendering leaks into hit testing and drag behavior. Rendering strategy should be a view optimization, not a source of selection semantics.

### F. Introduce stable geometry ids for anchors

Every snap candidate should refer to stable anchor ids:

- node id
- face id
- edge id
- vertex id
- feature id
- fractional anchor id

This is necessary for deterministic tie-breakers, latching, and tests.

## Suggested Migration Plan

Do this as staged beads, not one giant rewrite.

### Stage 1. Interaction audit foundation

- add resolver module for selection, scope, and resolved target set
- replace duplicated expansion logic in move/rotate/dimensions/reference-distance code
- add focused tests for nested group selection behavior

### Stage 2. Interaction session controller

- introduce a shared transform interaction session
- migrate move gestures first
- make preview and commit share the same resolution output

### Stage 3. Unified snap engine

- extract snap orchestration from drag hooks
- keep existing geometry detectors initially
- unify single-part and group drag against one solver contract

### Stage 4. Overlay engine

- move snap lines, dimension labels, angle markers, and reference distances behind a session-derived overlay model

### Stage 4a. Reference positioning system

- add a dedicated reference entity and reference relation model
- promote passive reference distances into active rulers during move and resize
- distinguish move-relative, resize-size, and resize-gap ruler semantics
- maintain a dedicated spec for reference positioning so downstream beads do not re-decide the UX ad hoc

### Stage 5. Scene graph / node hierarchy

- migrate groups from membership-only lists toward first-class nodes
- preserve import/export compatibility with old project files through migration helpers

### Stage 6. Feature-aware part geometry

- introduce `blank + fabricationFeatures` part model
- add geometry cache and anchor graph
- keep a compatibility layer for old plain-box parts

### Stage 7. Feature-aware collision and fit policy

- add broad-phase + narrow-phase collision proxy pipeline
- support touching, fitting, and intentional feature overlap semantics

## What Not To Do

- do not keep patching `usePartDrag.ts` and `useGroupDrag.ts` separately
- do not add more selection-expansion helpers in random components
- do not let overlays derive from independent store fragments
- do not tie future custom-cut logic directly into box-only snap code
- do not build a real-time rigid-body physics engine for this product

This app needs deterministic geometric interaction, not simulation chaos.

## Practical North Star

The user should be able to trust four things:

- what is selected
- what will move
- why it snapped
- why it stopped

And when custom cuts land, they should still be able to trust the same four things.

That only happens if the workspace becomes a coherent interaction system with:

- one scene graph
- one selection resolver
- one interaction session
- one transform pipeline
- one geometry-derived anchor model

Everything else is implementation detail.
