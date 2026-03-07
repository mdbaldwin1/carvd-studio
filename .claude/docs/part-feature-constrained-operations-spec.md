# Next Constrained Operations Spec

Workflow and policy source of truth: see `AGENTS.md`. This file is reference guidance for beads `carvd-studio-33` through `carvd-studio-35`.

## Purpose

Add another small set of constrained woodworking operations that still fit the current blank-plus-operations model and geometry path.

## Product Decision

This pass adds:

- `Groove`
- `Mortise`

These remain `rect_cut` operations under the hood.

## Groove

A `Groove` is a face-based channel that runs the full board length.

POC constraints:

- target: `Top Face` or `Bottom Face`
- run length: full board length
- user controls:
  - channel width across board width
  - offset across board width
  - blind depth

Canonical storage:

- `cutType: "groove"`
- `target.type: "face"`
- `parameters.size.length`: full part length, derived
- `parameters.size.width`: user-entered groove width
- `placement.x`: `0`
- `placement.z`: user-entered offset
- `depthMode: blind`

## Mortise

A `Mortise` is a blind rectangular pocket on a face.

POC constraints:

- target: `Top Face` or `Bottom Face`
- user controls:
  - pocket length
  - pocket width
  - offset along length
  - offset across width
  - blind depth

Canonical storage:

- `cutType: "mortise"`
- otherwise behaves like a constrained blind face cutout

## Summary Rules

- `Groove on Top Face · 1/4" wide × 3/8" deep`
- `Mortise on Top Face · 2" × 3/4" × 3/8" deep`

## Validation Rules

### Groove

- target must be top/bottom face
- depth must be blind and less than part thickness
- groove width must fit within part width at the chosen offset

### Mortise

- target must be top/bottom face
- depth must be blind and less than part thickness
- length/width must fit within the blank at the chosen offsets

## Non-Goals

Out of scope for this pass:

- angled mortises
- stopped grooves with custom partial runs
- side-face mortises
