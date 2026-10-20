## Part Cuts Preview Handles Spec

Workflow and policy source of truth: see `AGENTS.md`. This file is reference guidance for beads `carvd-studio-41.1` through `carvd-studio-41.3`.

See also:

- `part-cuts-workspace-spec.md` for the dedicated cuts-mode contract
- `part-cuts-3d-targeting-spec.md` for direct target picking

## Purpose

Add direct manipulation handles in the cuts preview so supported operations can be adjusted spatially instead of only through inspector fields.

This is not a full CAD gizmo system.

The goal is to let a woodworker do the next most natural action after target selection:

- click the operation
- drag the run, width, or offset
- confirm the result visually

## Product Decision

Preview-handle editing is additive to the existing inspector.

The inspector remains:

- the source for exact numeric entry
- the fallback for unsupported operations
- the place where derived and constrained dimensions are explained

The preview becomes the fast-adjustment surface for supported operations.

## Initial Supported Operations

The first handle pass should support only face-based rectangular removals where the drag semantics are clear and stable:

- `cutout`
- `mortise`
- `stopped_dado`
- `stopped_groove`

Deferred from direct handles in this pass:

- end cuts
- corner notches
- edge notches
- rabbets
- full dado
- full groove

Reason:

- the first group has explicit rectangular extents and offset semantics
- the deferred group either has strong derived dimensions or needs custom affordances that are easy to get wrong in a POC

## Expanded Supported Operations

The next handle pass should add:

- `rabbet`
- `edge_notch`
- end-cut reference handles

These remain constrained operations, but they need more operation-specific handle semantics than face pockets and stopped channels.

## Handle Model

Each supported operation gets a rectangular overlay in preview space plus a small set of drag handles.

### Shared handle types

- move handle
- length handle
- width handle
- reference handle

### Stopped dado

Handles:

- move along blank length
- length resize along blank length

Derived:

- width remains full board width
- across-width offset remains `0`

### Stopped groove

Handles:

- move within top/bottom face plane
- length resize along blank length
- width resize across board width

### Cutout

Handles:

- move within top/bottom face plane
- length resize
- width resize

### Mortise

Handles:

- move within top/bottom face plane
- length resize
- width resize

### Rabbet

Handles:

- move along the supported edge run
- shoulder-width resize into the board

Depth remains inspector-only in this pass.

### Edge notch

Handles:

- move along the selected edge run
- run-length resize
- notch-width resize into the board

### End-cut reference

Handles:

- drag the controlling reference distance along the part length

Angles remain inspector-only in this pass. The handle edits the selected reference mode value, not the cut angle itself.

Stored model:

- end cuts should persist a `reference` object with:
  - `mode`
  - `value`
- `lengthMode` remains as a compatibility field for legacy features and exports
- blank sizing stays separate from end-cut reference editing
- preview handles and inspector fields both edit the stored reference value directly

## Drag Semantics

### Pointer mapping

Dragging should operate in the part-local face plane of the selected operation.

For the initial pass:

- only top/bottom face operations are supported
- drag math can project onto the local X/Z plane

### Commit model

Handle dragging should update the draft operation live in cuts mode.

It should not commit back to the project until the user saves the part, matching the existing draft-session contract.

### Clamping

All drag results must clamp through the same constraints used by inspector validation:

- no negative offsets
- no negative sizes
- no dimensions beyond the blank
- no depth edits from handles in this pass

## Selection Rules

- handles appear only for the selected operation
- non-selected operations do not show handles
- hovering a handle should make the active affordance obvious
- invalid drag directions should be prevented rather than allowed and then rejected later

## Visual Rules

- handles should be visible but secondary to the part geometry
- the selected operation footprint should be outlined
- move handles should feel distinct from resize handles
- preview copy should explain when an operation is form-only

## Fallback Rules

When an operation is unsupported for direct handles:

- do not show dead or disabled handles
- show a short note that this operation is adjusted in the inspector

## Non-Goals

Out of scope for this pass:

- arbitrary 3D gizmos
- rotation handles for cuts
- depth dragging
- simultaneous editing of multiple operations
- direct manipulation for end-cut angles
