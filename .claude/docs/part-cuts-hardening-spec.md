# Part Cuts Hardening Spec

Workflow and policy source of truth: see `AGENTS.md`. This file is reference guidance for `carvd-studio-49.1` and the downstream hardening beads in `carvd-studio-49`.

See also:

- `part-cuts-workspace-spec.md` for the base dedicated-workspace contract
- `part-cuts-presets-spec.md` for the original presets and mirroring POC scope
- `part-feature-conflict-hardening-spec.md` for the prior same-surface conflict model
- `part-cuts-production-review.md` for the promotion review that identified this hardening pass

## Purpose

Harden the existing `Part Cuts` / custom cuts workflow so normal user actions do not create misleading, unsaveable, or silently mutated fabrication definitions.

This pass is not a feature-framework rewrite. It is a production-readiness pass over the current cuts workflow:

- cut-type transitions
- draft normalization
- mirror behavior
- end-cut round-trip editing
- conflict analysis
- constrained-field UX
- focused regression coverage

## Implemented POC Gaps This Spec Closes

The review that produced `carvd-studio-49` found these problems in the current branch:

- changing a cut from `through` to a blind-only family can leave the draft invalid with no editable escape path
- rectangular mirroring uses offset negation instead of true blank-aware reflection
- existing end cuts can be silently rewritten to `long_point` semantics when reopened and saved
- conflict numbering can drift from the visible operation list when disabled operations exist earlier in the stack
- opposing-face blind cuts can physically intersect without the conflict engine flagging them
- some workspace copy and constrained inputs still communicate implementation limitations instead of task guidance

The hardening beads must close those gaps without broadening the supported operation set.

## Product Decision

The cuts workspace remains the primary authoring surface for part operations.

The product direction stays the same:

- rectangular blank first
- ordered per-part operation stack
- woodworking target vocabulary
- constrained operation families where the model needs it

What changes in this hardening pass is reliability and clarity, not the overall editing model.

## Acceptance Bar

The custom cuts workflow is considered hardened when all of the following are true:

1. Every supported cut-type transition produces a valid editable draft immediately.
2. Mirror actions create valid geometry-aware results or explicitly refuse with clear feedback.
3. Editing an existing end cut is lossless unless an explicit migration has been defined.
4. Conflict messages reference the same operation numbers the user sees in the workspace.
5. Same-part validation catches both same-surface conflicts and opposing-face blind intersections that would remove the same interior material.
6. Derived or constrained fields are presented as intentional constraints, not broken controls.
7. Focused tests cover the new invariants.

## Canonical Hardening Rules

## 1. Draft Normalization Is Immediate

When the user changes operation type, target family, or another field that changes the legal shape of the draft, the workspace must normalize the draft immediately.

Validation is still required, but it is not the primary mechanism for keeping the draft coherent.

The user should never be trapped in a state where:

- `Save Cut` is disabled
- the visible controls no longer expose the incompatible value
- and the only escape is canceling the edit

### Required normalization behavior

Changing operation type must:

- force `depthMode = blind` for blind-only operations
- seed a valid positive default blind depth if the previous draft had no usable blind depth
- move the target to a valid default family if the old target family is no longer legal
- clamp offsets to the legal range for the new operation
- recompute any derived dimensions for constrained operations
- zero out ignored offsets so hidden stale values do not survive invisibly

### Source of truth requirement

There should be one canonical normalization/resolution layer for rectangular operations.

The following surfaces must consume the same rules rather than re-encoding them separately:

- editor state
- preview state
- validation
- summary text where derived dimensions are shown
- mirroring logic where placement depends on resolved dimensions

## 2. Mirror Means Reflection Across The Blank, Not Sign Flips

The prior POC mirroring contract used sign inversion for `placement.x` and `placement.z`.

That is no longer acceptable for the production-ready behavior because workspace placements are min-origin offsets and must remain directly meaningful after mirroring.

### Canonical mirror rule

Mirroring reflects the authored operation footprint across the part blank's centerline on the requested axis.

For a rectangular footprint with resolved run/width:

- across length: `x' = part.length - x - resolvedRun`
- across width: `z' = part.width - z - resolvedWidth`

The mirror implementation must use the resolved footprint for the operation family, not the raw authored fields alone.

### Target remapping rule

Target identity must be remapped together with placement.

That means:

- end cuts swap ends
- corner targets swap to the mirrored corner
- edge targets swap to the mirrored edge when the anchor changes
- face targets remain the same when the operation still acts on the same face

### Unsupported or degenerate cases

If a mirror action would be ambiguous, geometrically identical, or unsupported for a given operation family, the UI must define that explicitly:

- hide the action
- or no-op with clear user feedback

It must not silently insert an invalid operation and rely on later validation to explain it.

## 3. End-Cut Editing Must Round-Trip Authored Semantics

The cuts workspace may simplify the visible end-cut UI, but it may not silently discard authored end-cut semantics that already exist in saved data.

### Preservation requirement

If an end cut currently stores:

- `lengthMode`
- or explicit reference metadata tied to that mode

then opening and saving that end cut without intentional migration must preserve those values.

### Allowed product choices

There are only two acceptable paths:

1. Preserve legacy/reference semantics fully in the draft and write them back unchanged.
2. Define an explicit migration to a simpler model and surface that change intentionally.

The hardening pass should assume option 1 unless the user later requests a product decision to retire the older semantics.

Silent conversion to `long_point` is not allowed.

## 4. Conflict Messaging Must Match Visible Operation Order

The workspace shows a numbered ordered list of authored operations.

Conflict feedback must use those same visible positions, even when:

- some operations are disabled
- validation internally filters the list
- only enabled operations participate in blocking rules

### Canonical numbering rule

Conflict messages should reference the operation's visible authored position in the stack, not its position in a filtered enabled-only array.

Examples:

- `Operation 4 overlaps Operation 2. Order still matters, but the stack is allowed.`
- `Operation 5 depends on the Top-Front Edge, but Operation 1 already removes that anchor material.`

## 5. Opposing-Face Blind Intersections Are Real Conflicts

The previous POC conflict model treated many top-face and bottom-face operations as independent because they do not share the same entry surface.

That is too weak for production-candidate behavior.

### New rule

If two blind operations:

- overlap in projected `x/z` footprint
- enter from opposite faces
- and their combined depth removes the same interior material

then the stack must be treated as conflicting.

This rule applies even when neither operation is a through cut.

### Implementation expectation

This does not require full CSG.

A simple deterministic model is sufficient:

- resolve each operation's footprint
- compute the depth interval each operation occupies from its entry face
- flag a conflict when the intervals overlap in thickness as well as in projected footprint

### Severity guidance

If the overlapping interior removal means the later operation cannot be described honestly as acting on intact stock, it should be a blocking error.

## 6. Constrained Fields Must Read As Intentional

The cuts workspace should not present derived or constrained values as if they are freely editable and then quietly ignore the user's input.

### Presentation rules

If a dimension is derived from the blank or target choice, prefer:

- read-only output
- helper text that explains the derivation

over:

- a disabled input whose meaning is unclear

If a target family is constrained by operation type or preview support, the UI should say why in woodworking language.

Examples:

- `Runs full board width for this operation.`
- `Blind edge recesses currently start from top or bottom edges so depth direction stays unambiguous.`

### Terminology rule

Use one coherent product term across the app for this feature set.

The hardening pass should align summary cards, context menus, workspace labels, and header copy around the chosen term instead of mixing:

- `Part Cuts`
- `Cuts Workspace`
- `Edit Cuts`
- `custom cuts`

One term may still be used for the mode and another for the action, but the relationship must be deliberate and consistent.

## 7. Preview Affordances Must Not Over-Promise

Preview handles and target-picking affordances should reflect what the workspace can actually edit reliably.

The preview should never suggest:

- that a handle can produce any valid value when later validation rejects common results
- that a mirror or target-pick path is broadly supported when only a constrained subset is stable

If an operation remains inspector-only for some edits, the preview should communicate that directly.

## Scope For Downstream Beads

### `49.2` Normalize cut-type transitions and draft canonicalization

Must produce the canonical rectangular-operation normalization layer and remove dead-end draft states.

### `49.3` Geometry-aware mirroring and safer preview constraints

Must replace sign-flip mirroring and bring preview behavior in line with the new resolved geometry rules.

### `49.4` Preserve end-cut semantics across edit/save

Must make end-cut edit/save round-trips lossless for stored semantics unless an explicit migration is introduced.

### `49.5` Conflict hardening

Must fix operation numbering drift and add opposing-face blind intersection detection.

### `49.6` UX and terminology refinement

Must update constrained-field presentation, mode naming, and leftover implementation-colored copy.

### `49.7` Tests and docs

Must add focused coverage for:

- cut-type switching normalization
- mirroring by operation family
- end-cut round-tripping
- conflict numbering
- opposing-face blind intersections

## Explicit Non-Goals For This Hardening Pass

This pass does not imply:

- new operation families
- freeform CAD-style modeling
- full exact-solid intersection analysis
- multi-part cuts editing
- linked symmetry constraints
- automatic synchronization between a source cut and its mirrored copy after creation

The goal is to make the existing custom cuts workflow trustworthy and intuitive, not to expand it into a different product surface.
