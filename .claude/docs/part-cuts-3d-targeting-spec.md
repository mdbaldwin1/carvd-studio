# Part Cuts 3D Targeting Spec

Workflow and policy source of truth: see `AGENTS.md`. This file is reference guidance for `carvd-studio-14.1` and downstream 3D targeting beads.

## Implemented POC Status

As of beads `14.2` and `14.3`, the current branch implements:

- a dedicated cuts preview canvas with canonical face/edge/corner target regions
- operation-aware filtering of valid targets
- direct hover and click retargeting in the preview
- selected-target persistence between the preview and inspector
- a fallback preview target control path in test and non-WebGL contexts

Still deferred:

- drag handles for cut dimensions beyond the current supported face-based rectangular operations
- exact triangulated picking for every feature surface
- richer in-canvas labels and dimension editing
- multi-part or project-level fabrication editing

## Purpose

Define how direct 3D target picking works inside the dedicated `Part Cuts` workspace.

The goal is to replace the current target-map-only workflow with true viewport interaction while keeping:

- the woodworking vocabulary from `part-features-poc-spec.md`
- the dedicated cuts-mode session model from `part-cuts-workspace-spec.md`
- the current POC feature scope

This is not a general modeling interaction system. It is a fabrication-oriented picking model for supported part operations.

## Product Decision

The preview becomes the primary target-selection surface in cuts mode.

Form controls remain available as:

- a fallback when picking is difficult
- a way to verify or adjust the selected target precisely
- the only path for unsupported targets during the POC

Users should usually think:

1. choose an operation
2. hover the board
3. click the correct end, face, edge, or corner
4. adjust dimensions or angles

Not:

1. open a dropdown
2. parse a long flat list of abstract targets

## Scope

### In scope

- direct hover and click targeting in the `Part Cuts` workspace
- supported canonical targets:
  - faces
  - edges
  - corners
- operation-aware filtering of valid targets
- selected-target visualization
- hover precedence when multiple targets overlap in screen space
- keyboard and form fallback

### Out of scope

- drag handles for cut dimensions
- arbitrary mesh-face picking outside canonical targets
- editing multiple parts at once
- direct manipulation of blank dimensions in cuts mode
- freeform sketching

## Canonical Picking Model

### Target identity

Viewport picking must resolve to the existing canonical target IDs, not to ad hoc render-only names.

The canonical result of a pick is one of:

- `face` target
- `edge` target
- `corner` target

Examples:

- `left_face`
- `top_face`
- `back_left_vertical_edge`
- `back_bottom_left_corner`

The 3D picking layer is only a selection mechanism. It does not define new geometry semantics.

### Pickable regions

Pickable regions are canonical interaction zones derived from the part's current displayed shape plus its stable blank-local orientation.

They should be treated as interaction surfaces, not necessarily identical to the visible triangulated mesh.

Reason:

- edges and corners need reliable hit areas
- very thin parts need usable picking
- small mitred faces can become difficult to click if the app relies only on raw triangles

### Region families

Each canonical target family has its own interaction zone:

- face region
- edge region
- corner region

Edge and corner zones should use enlarged invisible hit volumes so they remain practical to target.

## Operation-to-Target Rules

### End cuts

Supported targets:

- `Left End`
- `Right End`

Implementation rule:

- end cuts still resolve through face targets for the two end faces
- the UI may continue to display `Left End` and `Right End`

Valid picks:

- left end face region
- right end face region

Invalid picks:

- all other faces
- all edges
- all corners

### Corner notch

Supported targets:

- all canonical corners for through notches
- top/bottom reachable corners only for blind-notch preview cases already limited by the POC

Valid picks:

- corner regions only

Invalid picks:

- faces
- edges

### Edge notch

Supported targets:

- all canonical edges for through notches
- top/bottom reachable edges only for blind-notch preview cases already limited by the POC

Valid picks:

- edge regions only

Invalid picks:

- faces
- corners

### Rectangular cutout

Supported targets in the current POC:

- `Top Face`
- `Bottom Face`

Valid picks:

- top face region
- bottom face region

Invalid picks:

- all other faces
- all edges
- all corners

## Interaction States

### Idle

When no operation draft is active:

- do not show the full target overlay by default
- show a lightweight hint that the preview supports direct targeting once an operation is selected

### Operation active

When an operation draft or editable operation is active:

- show valid targets for that operation
- dim invalid targets
- allow hover only on valid targets

### Hovered target

Hovered valid target should:

- brighten visibly above the rest of the part
- use a consistent accent treatment
- show a concise tooltip or inline label with woodworking-facing text

Example labels:

- `Left End`
- `Top Face`
- `Back-Left Edge`
- `Back-Bottom-Left Corner`

### Selected target

Selected target should remain visibly active after click.

The selected state must be stronger than hover:

- thicker outline or stronger fill
- persistent label in the inspector or preview header

### Selected operation

When a saved operation is selected from the stack:

- highlight its current target immediately in the preview
- if the operation is being retargeted, valid alternative targets stay visible

## Hover Precedence

Multiple target zones may overlap in screen space.

Examples:

- a corner overlaps adjacent edges and faces
- an edge overlaps two faces
- a narrow mitred end overlaps nearby edge zones

To keep picking deterministic, use this precedence:

1. corner
2. edge
3. face

Rationale:

- corners are the smallest and most specific targets
- edges are more specific than faces
- faces are the broad fallback

If two targets of the same family overlap:

- prefer the nearer hit in camera depth
- if depth is effectively tied, prefer the target whose center is closest to the cursor ray

## Visibility Rules

### Valid vs invalid targets

When an operation is active:

- valid targets should be clearly discoverable
- invalid targets should not compete visually

Recommended treatment:

- valid targets: accent outline or translucent fill
- invalid targets: no outline, or a muted non-interactive treatment

Do not show invalid targets as if they are clickable.

### Occlusion

Picking should be based on visible-facing interaction regions only.

Users should not be able to click a hidden back-face target through the part.

If a target is mostly occluded:

- it may remain unavailable until the user rotates the preview
- the inspector dropdown remains the fallback

## Fallback Behavior

The inspector must remain authoritative as a fallback and verification surface.

Users can still:

- read the selected target label
- change target with a control
- complete the operation without using the mouse in 3D

The fallback is required because:

- some targets will be hard to click at some camera angles
- accessibility and testability improve when a form path still exists
- the POC will not yet have every possible camera or picking affordance

## Workspace Behavior Contract

### Starting a new operation

When the user starts a new operation:

- the workspace enters target-selection-ready state
- valid targets appear immediately
- no target is committed until click or form selection

### Editing an existing operation

When the user selects an existing operation:

- its current target is highlighted
- the inspector shows its current values
- the user may keep the target or retarget it through the preview

### Retargeting

Retargeting should update only the target field for the draft operation.

It must not silently reset:

- dimensions
- offsets
- angles
- depth mode

If a retarget makes the existing dimensions invalid, validation should catch that and show a normal error state.

## Geometry Integration Rule

Picking is allowed to use simplified canonical hit regions rather than the exact final triangulated mesh, as long as:

- the chosen target is semantically correct
- visible feedback aligns with what the user thinks they clicked
- picking remains stable for feature-bearing parts

This is important because the POC needs reliable woodworking targeting more than exact CAD picking fidelity.

## Recommended Implementation Shape

### Data produced by the picking layer

The picking layer should expose a derived list of interaction targets for the current part and active operation.

Conceptually:

```ts
interface PickableTarget {
  target: PartFeatureTarget;
  label: string;
  family: "face" | "edge" | "corner";
  isValid: boolean;
  priority: number;
}
```

### Rendering split

The preview should render:

- base part geometry
- optional overlay geometry for valid targets
- stronger overlay for hovered target
- strongest overlay for selected target

The overlay system should be separate from the saved feature geometry itself.

## Testing Expectations

Downstream beads should cover:

- operation-aware valid target filtering
- hover precedence for overlapping corner/edge/face zones
- selected-operation target highlighting
- retargeting through click
- form fallback when a target is not picked in 3D
- unsupported target cases staying blocked or unavailable

## POC Constraints To Preserve

The 3D targeting beads must preserve these existing POC limits:

- cutouts still only target `Top Face` and `Bottom Face`
- blind rectangular removals remain limited to the current top/bottom reachable target subsets
- no freeform dragging of cut dimensions
- no promise of exact manufacturing-grade picking

The purpose of this work is to make targeting feel direct and intuitive, not to turn the cuts workspace into a general CAD editor.
