## Stopped Rect-Cut Operations Spec

Workflow and policy source of truth: see `AGENTS.md`. This file is reference guidance for beads `carvd-studio-40.1` through `carvd-studio-40.3`.

## Purpose

Add stopped groove and stopped dado variants without creating a new feature family.

These operations should stay inside the existing `rect_cut` framework:

- same target taxonomy
- same placement semantics
- same geometry pipeline
- same ordered feature contract

## Product Decision

This pass adds:

- `Stopped Dado`
- `Stopped Groove`

These are constrained `rect_cut` operations, not freeform sketch cuts.

## Stopped Dado

A stopped dado is a blind face channel that runs across the board width direction but only for a limited run along the board length.

POC constraints:

- target: `Top Face` or `Bottom Face`
- run direction: across board width
- user controls:
  - run length along the blank
  - offset along the blank
  - blind depth
- derived behavior:
  - channel width across the board is the full board width
  - across-width offset is fixed to `0`

Canonical storage:

- `kind: "rect_cut"`
- `cutType: "stopped_dado"`
- `target.type: "face"`
- `parameters.size.length`: user-entered run length
- `parameters.size.width`: derived to full part width
- `placement.x`: user-entered offset along blank
- `placement.z`: `0`
- `depthMode: blind`

## Stopped Groove

A stopped groove is a blind face channel that runs along the board length direction but only for a limited span.

POC constraints:

- target: `Top Face` or `Bottom Face`
- run direction: along board length
- user controls:
  - run length along the blank
  - offset along the blank
  - groove width across the board
  - offset across the board
  - blind depth

Canonical storage:

- `kind: "rect_cut"`
- `cutType: "stopped_groove"`
- `target.type: "face"`
- `parameters.size.length`: user-entered run length
- `parameters.size.width`: user-entered groove width
- `placement.x`: user-entered offset along blank
- `placement.z`: user-entered offset across board
- `depthMode: blind`

## UX Rules

The cuts workspace should treat these as constrained joinery operations:

- `Dado`: full board width run
- `Stopped Dado`: partial run across board width
- `Groove`: full board length run
- `Stopped Groove`: partial run along board length

The inspector should explain the difference in plain language instead of making the user infer it from disabled fields.

Starter presets may seed these later, but presets are not required for this pass.

## Summary Rules

- `Stopped Dado on Top Face - 3" run × 3/8" deep`
- `Stopped Groove on Bottom Face - 5" run × 1/4" wide × 3/8" deep`

Cut-list and export reporting should continue to treat the blank as primary and the stopped operations as secondary fabrication instructions.

## Validation Rules

### Shared rules

- target must be top or bottom face
- depth must be blind and less than part thickness
- run length must be greater than zero

### Stopped dado

- offset along length must be non-negative
- offset plus run length must stay within part length

### Stopped groove

- offset along length must be non-negative
- offset plus run length must stay within part length
- offset across width must be non-negative
- offset plus groove width must stay within part width

## Geometry Rules

- stopped dado geometry is a blind rectangular trench spanning full board width
- stopped groove geometry is a blind rectangular trench with bounded run length and bounded groove width
- both features must work in the ordered feature pipeline, not as special one-off geometry code

## Non-Goals

Out of scope for this pass:

- angled stopped grooves
- angled stopped dados
- stopped rabbets
- side-face stopped channels
- toolpath simulation
