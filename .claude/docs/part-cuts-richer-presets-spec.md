# Richer Cuts Presets Spec

Workflow and policy source of truth: see `AGENTS.md`. This file is reference guidance for beads `carvd-studio-29` through `carvd-studio-31`.

See also:

- `part-cuts-presets-spec.md` for the base presets and mirror contract

## Purpose

Broaden the preset set in `Part Cuts` so more common woodworking patterns can be seeded quickly without hand-building every operation.

## Product Decision

The richer preset pass extends the existing preset system with:

- additional paired end-cut presets
- constrained joinery starter presets
- paired corner-relief presets

These remain ordinary authored operations after insertion.

## Presets Added

### End-cut presets

- `Compound Both Ends (45° / 15°)`

Creates two ordered `end_cut` features:

- `Left End`
- `Right End`

Both use:

- `cutType: compound`
- `horizontalAngle: 45`
- `verticalAngle: 15`
- `lengthMode: long_point`

### Joinery starter presets

- `Centered Dado`
- `Top Front Rabbet`
- `Top Back Rabbet`

`Centered Dado` creates one `dado` feature:

- target: `Top Face`
- centered starter offset
- blind depth default

`Top Front Rabbet` creates one `rabbet` feature on:

- `Top-Front Edge`

`Top Back Rabbet` creates one `rabbet` feature on:

- `Top-Back Edge`

### Paired corner-relief presets

- `Top Front Corners`
- `Bottom Front Corners`

These insert two `corner_notch` features as a mirrored pair.

`Top Front Corners` inserts:

- `Front-Top-Left Corner`
- `Front-Top-Right Corner`

`Bottom Front Corners` inserts:

- `Front-Bottom-Left Corner`
- `Front-Bottom-Right Corner`

## Insertion Rules

- all richer presets insert at the end of the current stack
- multi-operation presets remain contiguous
- after insertion, the first inserted operation becomes selected

Reason:

- the user sees the first new operation immediately
- the rest of the inserted group remains adjacent and reorderable

## Non-Goals

Out of scope for this pass:

- user-saved presets
- collapsible preset categories with custom management
- linked “apply to both sides” live behavior
