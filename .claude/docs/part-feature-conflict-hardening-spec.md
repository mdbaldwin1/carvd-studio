## Part Feature Conflict Hardening Spec

Workflow and policy source of truth: see `AGENTS.md`. This file is reference guidance for `carvd-studio-44.1` through `carvd-studio-44.3`.

See also:

- `part-feature-sequential-spec.md` for the broader ordered-operation model
- `part-cuts-workspace-spec.md` for cuts-mode save and feedback behavior
- `part-cuts-hardening-spec.md` for the follow-on production hardening rules that extend conflict handling beyond the original POC surface model

## Purpose

Strengthen same-part conflict detection beyond:

- duplicate enabled end cuts on the same end
- generic rectangular overlap warnings

The goal is to catch the next class of misleading stacks:

- a later operation starts inside material already removed by an earlier operation
- a later edge or corner operation depends on anchor material that an earlier operation already removed

## Product Decision

The POC should keep a conservative conflict model.

If a same-part interaction is clearly supported and deterministic, allow it and warn when order matters.

If a later operation depends on material or an anchor surface that is already gone, raise an error instead of pretending the stack is still reliable.

This file captures the original POC hardening pass. The later production-hardening pass may extend these rules, especially for opposing-face blind intersections and user-visible operation numbering.

## New Conflict Classes

The shared conflict analyzer should support these codes:

- `duplicate_end_cut`
- `rect_overlap`
- `rect_consumed`
- `rect_anchor_removed`

### `duplicate_end_cut`

Severity:

- `error`

Meaning:

- more than one enabled end cut targets the same end

### `rect_overlap`

Severity:

- `warning`

Meaning:

- two enabled rectangular operations overlap in a way that is still deterministic in the current POC

Example:

- two top-face pockets partially overlap
- a stopped groove crosses a mortise on the same face

### `rect_consumed`

Severity:

- `error`

Meaning:

- the later operation’s working footprint is fully contained inside a prior removal on the same reachable surface

Example:

- a later cutout is placed entirely inside a prior through cutout
- a later mortise sits fully inside a prior mortise on the same face

Rationale:

- the later operation is no longer acting on intact stock in a way the current POC can describe clearly

### `rect_anchor_removed`

Severity:

- `error`

Meaning:

- the later operation is edge- or corner-anchored, and a prior removal already intersects the anchor-driven material on the same reachable surface

Applies to:

- `rabbet`
- `edge_notch`
- `corner_notch`

Example:

- a top-face cutout already removes the front edge material where a top-front rabbet would begin
- a prior notch already removes the corner stock that a later corner notch targets

## Surface Rules

Conflict analysis should reason about which surface a rectangular operation reaches from:

- `top`
- `bottom`
- `both`

Rules:

- top-face operations affect `top`
- bottom-face operations affect `bottom`
- through cutouts affect `both`
- top-edge and top-corner operations affect `top`
- bottom-edge and bottom-corner operations affect `bottom`

Two operations only qualify for `rect_consumed` or `rect_anchor_removed` if they overlap on a shared reachable surface.

## Sequential Interpretation

For each enabled rectangular operation in authored order:

1. compare it against prior enabled rectangular operations
2. ignore pairs with no footprint overlap
3. classify the strongest supported conflict

Classification order:

1. `rect_anchor_removed`
2. `rect_consumed`
3. `rect_overlap`

That means:

- if an overlap also destroys the later anchor, report the anchor error
- if an overlap fully consumes the later footprint, report the consumed-material error
- otherwise report a warning

## User-Facing Messages

Use plain woodworking language.

Preferred message styles:

- `Operation 4 starts inside material already removed by Operation 2.`
- `Operation 3 depends on the Top-Front Edge, but Operation 1 already removes that anchor material.`
- `Operation 5 overlaps Operation 4. The stack is still allowed, but order matters.`

Avoid:

- CAD/boolean terminology
- topology jargon

## Validation Contract

The same conflict analyzer should feed:

- cuts workspace feedback
- part summary warning/error copy
- save blocking in cuts mode
- store-level cut-list validation

If one surface shows an error while another still treats the same pair as a warning, the implementation is wrong.

## Deliberate Limits

This hardening pass still does not attempt:

- arbitrary boolean-solid validation
- compound 3D intersection analysis beyond the current top/bottom reachable POC targets
- “smart” healing of invalid stacks

When the POC cannot represent a later operation honestly, the correct behavior is to error early.
