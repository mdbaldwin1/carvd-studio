# Additional Woodworking Operations Spec

Workflow and policy source of truth: see `AGENTS.md`. This file is reference guidance for beads `carvd-studio-21` through `carvd-studio-23`.

See also:

- `part-features-poc-spec.md` for the base blank-plus-operations model
- `part-feature-sequential-spec.md` for ordered operation behavior
- `part-feature-stopped-operations-spec.md` for the follow-on stopped channel variants

## Purpose

Extend the current part-feature POC with additional woodworking operations that:

- fit the existing blank-plus-operations model
- remain understandable to a woodworker
- do not require arbitrary freeform geometry

## Product Decision

The next operations added to the POC are:

- `Dado`
- `Rabbet`

These are intentionally chosen because they are common woodworking operations and can be represented cleanly as constrained rectangular removals.

## Canonical Modeling Rule

`Dado` and `Rabbet` remain `rect_cut` features under the hood.

They do not introduce a new feature family. They are specialized operation kinds with tighter target and sizing semantics than general `cutout` and `edge_notch`.

That keeps:

- persistence compatible with the current framework
- geometry on the current rectangular-removal path
- reporting consistent with other operations

## Operation Semantics

### Dado

A `Dado` is a face-based channel cut across the full board width.

POC constraints:

- target must be `Top Face` or `Bottom Face`
- removal runs full part width
- user controls:
  - channel width along the part length axis
  - channel position along the part length axis
  - depth mode (`blind` only in the initial pass)
  - depth

In practical terms, the user picks:

- which face
- how wide the dado is
- where it starts from the left/right reference
- how deep it is

The width-across-board dimension is derived from the blank and not user-editable in the POC.

### Rabbet

A `Rabbet` is an edge-based recess cut along the full length of the selected edge.

POC constraints:

- target must be one of the long top/bottom edges supported by the current preview path
- removal runs full span along the selected edge family
- user controls:
  - shoulder width into the board
  - depth
  - target edge

In practical terms, the user picks:

- which edge receives the rabbet
- how wide the shoulder is
- how deep the rabbet is

The run length along the edge is derived from the blank and not user-editable in the POC.

## Why These Fit The POC

Both operations are common shop language and can be described as constrained rectangular removals.

That means:

- the woodworker gets more familiar operation names
- the renderer can reuse the current recess / removal pipeline
- validation can stay deterministic

## Target Rules

### Dado targets

- `Top Face`
- `Bottom Face`

### Rabbet targets

- `Top-Front Edge`
- `Top-Back Edge`
- `Bottom-Front Edge`
- `Bottom-Back Edge`
- `Top-Left Edge`
- `Top-Right Edge`
- `Bottom-Left Edge`
- `Bottom-Right Edge`

The initial POC keeps rabbets on top/bottom edge targets only so blind depth direction stays unambiguous.

## Parameter Rules

### Dado

Canonical stored fields:

- `cutType: "dado"`
- `target.type: "face"`
- `parameters.size.length`: channel width along length axis
- `parameters.size.width`: always equals part width at authoring/save time
- `placement.x`: offset from the chosen reference side
- `placement.z`: always `0`
- `parameters.depthMode`: `blind`
- `parameters.depth`: required

### Rabbet

Canonical stored fields:

- `cutType: "rabbet"`
- `target.type: "edge"`
- `parameters.size.length`: full run length along the selected edge family, derived from the blank
- `parameters.size.width`: shoulder width into the board
- `placement.x` or `placement.z`: always `0`
- `parameters.depthMode`: `blind`
- `parameters.depth`: required

## UX Rules

The cuts workspace should expose:

- `Dado`
- `Rabbet`

as operation types in the same authoring flow as existing rectangular removals.

The inspector should hide locked dimensions and explain derived dimensions in plain language, for example:

- `Runs full board width`
- `Runs full edge length`

## Summary And Reporting Rules

Summaries should read like woodworking operations, not generic rectangular removals.

Examples:

- `Dado on Top Face · 3/4" wide × 3/8" deep`
- `Rabbet on Top-Front Edge · 1/2" shoulder × 3/8" deep`

Cut-list and export output should continue to report:

- blank size first
- operation instructions second

## Validation Rules

### Dado

- width along length axis must be greater than zero
- width along length axis must fit within part length at the chosen placement
- depth must be greater than zero and less than part thickness
- target must be `Top Face` or `Bottom Face`

### Rabbet

- shoulder width must be greater than zero
- shoulder width must be less than or equal to the perpendicular blank dimension
- depth must be greater than zero and less than part thickness
- target must be a supported top/bottom edge target

## Non-Goals

Out of scope for this pass:

- stopped dados
- angled dados
- multi-pass toolpath simulation
- rear-face or front-face blind pocket previews beyond the current top/bottom support model
- full joinery parameterization
