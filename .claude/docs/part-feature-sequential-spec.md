# Part Feature Sequential Semantics Spec

Workflow and policy source of truth: see `AGENTS.md`. This file is reference guidance for `carvd-studio-15.1` and downstream ordered-feature beads.

## Implemented POC Status

As of beads `15.2` and `15.3`, the current branch now implements:

- list-order-driven preview geometry for supported part-feature stacks
- ordered end-cut precedence in the preview path instead of `max inset wins`
- shared same-part conflict analysis for duplicate end cuts and overlapping rectangular removals
- blocking cuts-mode save behavior for error-level ordered conflicts
- cut-list validation that surfaces saved ordered conflicts
- numbered fabrication lines that preserve authored operation order in reporting

Still deferred:

- richer conflict classes beyond the current warning/error split
- deeper unsupported-intersection analysis for complex overlapping removals
- more advanced sequential machining features beyond the current POC set

## Purpose

Define how multiple operations on the same part behave when order matters.

The current branch already supports:

- multiple authored operations on one part
- explicit operation ordering in the cuts workspace
- basic same-part conflict surfacing

What is not yet fully defined or implemented is the semantic contract for:

- how operation order changes the resulting geometry
- which overlaps are warnings versus blocking errors
- how geometry, validation, and reporting stay consistent with one another

This spec is the contract for that work.

## Product Decision

The canonical model for multiple cuts on one board is:

- one rectangular blank
- one ordered stack of enabled operations
- applied in list order from top to bottom

That order is not cosmetic. It is part of the meaning of the part.

If two enabled operations would produce different results when swapped, the current list order is authoritative.

## Woodworker Mental Model

The intended reading is:

1. rough the blank
2. perform operation 1
3. perform operation 2
4. perform operation 3

Users should be able to think:

- `miter the left end`
- `then notch the back bottom left corner`
- `then add the top-face cutout`

Not:

- `combine a set of unordered modifiers and hope the final geometry is obvious`

## Canonical Order Rule

### Enabled operations only

Only enabled operations participate in sequential application.

Disabled operations:

- remain in the authored list
- remain reorderable and editable
- do not affect geometry
- do not affect blocking validation
- may still be shown in summaries as disabled

### Authoritative sequence

Enabled operations are applied in visible list order.

The same ordered list must drive:

- preview geometry
- same-part conflict classification
- store-level validation
- cut-list operation summaries
- PDF/CSV/report instruction order

If one of these surfaces diverges from the others, the implementation is wrong.

## Operation Families in the Sequential Model

### End cuts

End cuts modify one length-axis end of the blank.

For the current POC, only one enabled end cut per end is valid.

That means:

- one enabled operation may target `Left End`
- one enabled operation may target `Right End`
- two enabled end cuts on the same end are a blocking error

Rationale:

- the POC does not yet expose an explicit `cut the result of a previous end cut again on the same end` workflow
- multiple enabled end cuts on the same end are more likely to be accidental ambiguity than deliberate intent

### Rectangular removals

Rectangular removals may stack on the same board, including mixed families:

- corner notch
- edge notch
- cutout

These operations are allowed to coexist if the resulting stack remains supported and understandable.

## Conflict Classes

There are only two user-facing conflict classes in the POC:

- `warning`
- `error`

### Blocking errors

An error means the stack cannot be saved as a valid fabrication definition in the current POC.

Errors include:

- duplicate enabled end cuts on the same end
- a later operation that references material that a prior operation has already removed in a way the POC cannot represent correctly
- removal dimensions that exceed the remaining supported material bounds after prior enabled operations
- unsupported same-part intersections that the geometry pipeline cannot represent without misleading output

When an error exists:

- the workspace must surface it clearly
- save should be blocked
- cut-list generation should be blocked for saved invalid data

### Warnings

A warning means the stack is still allowed, but the user should understand the interaction.

Warnings include:

- overlapping rectangular removals that still yield a deterministic supported result
- aggressive combinations that materially reduce remaining stock but remain valid
- stacked operations whose result is valid yet easy to misread without order awareness

Warnings do not block save.

## Sequential Geometry Rule

Geometry must be derived by applying enabled operations one at a time to the current result.

Conceptually:

1. start from the blank
2. apply feature `1`
3. apply feature `2` to the result of `1`
4. apply feature `3` to the result of `2`

The renderer should not infer final shape from family-wide maxima or unordered grouped assumptions once this work is complete.

### Important current gap being replaced

The current branch still has grouped behavior such as:

- end-cut profiles taking a max inset per end
- rectangular removal conflicts using broad overlap checks
- contour/hole construction grouped by feature family

`15.2` and `15.3` are expected to replace those grouped assumptions where they conflict with explicit sequence semantics.

## Remaining POC Limits

The sequential model still preserves these deliberate constraints:

- only one enabled end cut per end
- cutouts still target `Top Face` and `Bottom Face` only
- blind rectangular removals remain limited to the current top/bottom-reachable target subsets
- unsupported intersections should error rather than pretending to work

The goal is deterministic woodworking behavior, not a full CAD boolean engine.

## Validation Contract

Validation should happen at three levels.

### 1. Per-operation validation

Each operation still validates its own dimensions and target support first.

Examples:

- depth must be positive
- cutout must stay within the blank
- blind notch target must be preview-supported in the POC

### 2. Sequential same-part validation

After per-operation validation passes, the enabled ordered stack must be walked in order.

For each operation:

- determine the supported remaining material state relevant to that operation
- classify the operation as valid, warning, or error
- update the remaining supported state if valid

### 3. Reporting validation

Cut-list/report generation must refuse invalid saved stacks and explain why.

## User-Facing Order Rules

### Operation list language

The cuts workspace should continue to show numbered operations.

Those numbers are execution order, not just row numbering.

### Explanation style

Use plain language:

- `Operation 3 overlaps material already removed by Operation 2.`
- `Another enabled end cut already uses Left End.`
- `Operation 4 starts inside a previous notch result and is not supported in this POC.`

Avoid CAD-oriented language like:

- `boolean operand invalid`
- `topology failure`

### Reporting order

Reports should preserve authored order in the operation instructions for a part.

Example:

- `1. 45° mitre on Left End`
- `2. Back-Bottom-Left corner notch 3/4 × 3/4`
- `3. Top-face cutout 2 × 1`

## Recommended Internal Model

Downstream beads should introduce a sequential analysis layer that can be reused by:

- geometry generation
- conflict detection
- store validation
- reporting

Conceptually:

```ts
interface FeatureSequenceStep {
  feature: PartFeature;
  index: number;
  result: "applied" | "warning" | "error";
  messages: string[];
}
```

The exact structure may differ, but the same ordered reasoning should not be reimplemented separately in multiple files.

## Acceptance Targets For Downstream Beads

`15.2` should deliver:

- sequential feature application in the preview geometry path
- removal of the most misleading grouped geometry assumptions

`15.3` should deliver:

- consistent warning/error classification in cuts mode, store validation, and reporting
- blocking saves and cut-list generation for invalid stacks

`15.4` should deliver:

- regression coverage for ordered outcomes
- docs that explain why operation order matters
