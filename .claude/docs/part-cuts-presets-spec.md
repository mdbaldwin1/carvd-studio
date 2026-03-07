# Part Cuts Presets And Mirroring Spec

Workflow and policy source of truth: see `AGENTS.md`. This file is reference guidance for beads `carvd-studio-17` through `carvd-studio-19`.

See also:

- `part-cuts-workspace-spec.md` for the dedicated cuts-mode editing contract
- `part-feature-sequential-spec.md` for ordered operation behavior

## Purpose

Reduce authoring friction in the dedicated `Part Cuts` workspace by adding:

- woodworking-oriented quick presets
- deterministic mirror actions for supported operations

The goal is not to add a new geometry system. The goal is to let a woodworker create common repeated operations faster while preserving the current blank-plus-operations model.

## Product Decision

Presets and mirroring are convenience authoring tools.

They create or transform ordinary `PartFeature` entries. They do not introduce a new hidden constraint system, linked instances, or live symmetry relationship.

After creation, mirrored and preset-generated operations are ordinary authored operations that can be edited independently.

## Woodworker Mental Model

These flows should match how a woodworker thinks:

- `mitre both ends`
- `copy that cut to the other end`
- `put the same notch on the opposite side`

The user should not have to manually rebuild the same operation with slightly different targets and placement values.

## Presets In Scope

The POC should support these workspace presets.

### End-cut presets

- `Mitre Both Ends (45°)`
- `Bevel Both Ends (15°)`
- `Square Both Ends`

Each preset should create two ordered `end_cut` operations:

- one on `Left End`
- one on `Right End`

The generated pair should use the same angle/reference defaults unless the preset explicitly defines otherwise.

### Rectangular-removal presets

- `Top Cutout`
- `Bottom Cutout`
- `Top Front Edge Notch`
- `Top Back Edge Notch`
- `Top Front Left Corner Notch`
- `Top Front Right Corner Notch`

These are convenience starting points only. After creation, the user can edit target, size, placement, and depth normally.

## Mirror Actions

Mirror actions operate on one selected authored feature.

The workspace should support:

- `Mirror to Opposite End` for `end_cut`
- `Mirror Across Length` for supported `rect_cut`
- `Mirror Across Width` for supported `rect_cut`

Mirror actions should create a new operation immediately after the source operation.

They must not mutate the original feature in place.

## Canonical Mirror Rules

### End cuts

`Mirror to Opposite End` swaps:

- `left_end` <-> `right_end`

Everything else is copied:

- cut type
- length mode
- angles
- enabled state
- label is regenerated unless the original label is blank

If the mirrored result would create a duplicate enabled end cut on that end, the action is still allowed in draft mode and the existing conflict system will surface the blocking error.

### Rectangular removals

Rectangular mirroring reflects both target identity and placement.

#### Mirror Across Length

Reflect across the board centerline on the length axis.

Use:

- `placement.x = -placement.x`

Target remaps:

- `front_top_left_corner` <-> `front_top_right_corner`
- `front_bottom_left_corner` <-> `front_bottom_right_corner`
- `back_top_left_corner` <-> `back_top_right_corner`
- `back_bottom_left_corner` <-> `back_bottom_right_corner`
- `top_left_edge` <-> `top_right_edge`
- `bottom_left_edge` <-> `bottom_right_edge`
- `front_left_edge` <-> `front_right_edge`
- `back_left_edge` <-> `back_right_edge`

Unchanged targets:

- `top_face`
- `bottom_face`
- `top_front_edge`
- `top_back_edge`
- `bottom_front_edge`
- `bottom_back_edge`

#### Mirror Across Width

Reflect across the board centerline on the width axis.

Use:

- `placement.z = -placement.z`

Target remaps:

- `front_top_left_corner` <-> `back_top_left_corner`
- `front_top_right_corner` <-> `back_top_right_corner`
- `front_bottom_left_corner` <-> `back_bottom_left_corner`
- `front_bottom_right_corner` <-> `back_bottom_right_corner`
- `top_front_edge` <-> `top_back_edge`
- `bottom_front_edge` <-> `bottom_back_edge`
- `front_left_edge` <-> `back_left_edge`
- `front_right_edge` <-> `back_right_edge`

Unchanged targets:

- `top_face`
- `bottom_face`
- `top_left_edge`
- `top_right_edge`
- `bottom_left_edge`
- `bottom_right_edge`

### Unsupported mirroring

If a target has no deterministic mirrored meaning in the current POC, the action should not be shown.

The POC should not attempt:

- compound cross-axis mirroring in one click
- linked symmetry constraints
- automatic conflict resolution after mirroring

## Labeling And Copy

User-facing actions should be:

- `Add Preset`
- `Mirror to Opposite End`
- `Mirror Across Length`
- `Mirror Across Width`

Preset rows should explain intent in plain shop language, for example:

- `Adds matching 45° mitres to both ends`
- `Starts a full-width top cutout you can size and place`

## Ordering Rules

- preset-created operations are inserted as a contiguous group at the end of the stack
- mirrored operations are inserted immediately after the source operation
- newly created operations become selected so the user can adjust them immediately

## Validation Rules

Presets and mirroring must pass through the same validation pipeline as hand-authored operations.

No special-case bypasses are allowed for:

- duplicate end cuts
- overlapping rectangular removals
- invalid rectangular dimensions

## Non-Goals

Out of scope for this POC pass:

- symmetry lock mode
- auto-update mirrored partners after source edits
- configurable preset libraries
- user-saved presets
- mirroring to more than one destination in a single action
