# Part Feature Sequential Semantics Spec

Workflow and policy source of truth: see `AGENTS.md`. This file is reference guidance for `carvd-studio-15.1` and downstream ordered-feature beads.

## Implemented POC Status

### Qualification addendum — 2026-09-09

- Every accepted tenon is a subtractive shoulder operation. All same-end and opposing-end shoulder regions are unioned per depth band before subtraction. Overlapping cuts intersect retained tongues; they never restore stock. These are successive machining operations, not a union of independently added tongues.
- Circular/rounded collision uses the rendered remaining mesh on all supported faces and canonical XYZ transforms. Finite BVH surface/crossing queries establish strict common material; oriented ray crossings cancel internal layer caps. Collision never constructs a new Boolean solid. Contact tolerance is a linear distance, and real 0.0001-inch intrusion remains blocked.
- Circular and rounded editor drafts preserve both stored coordinate references. Legacy omitted secondary references remain omitted; newly authored drafts retain the existing center defaults. Rounded authoring remains Top/Bottom only; retaining legacy metadata does not silently enable unsupported faces.
- Global Save and Save As (direct, focused keyboard shortcut, and native menu) flush the active measurement field, validate and commit the inspector into session history, save the part as one project-history operation, then save the project file. Invalid input leaves the inspector open with its exact error and performs no file write. Exit/Home/Close Project and the actual application-window close consult inspector dirtiness as well as the committed session list. Window close flushes the focused input before the dirty check; its Save action commits and validates before writing or confirming close. A rejected close-save keeps the pending action and displays the exact correction inside the modal; Cancel returns to the editor, while Don't Save permits close. Explicit Save Cut remains a local undo step.
- Project replacement (New/Open, Ctrl/Meta shortcuts, recent/favorite paths, relocation and file associations) is refused while Part Cuts is active, with an instruction to save or discard part cuts first. This guard lives in shared file handlers, not only native menu dispatch, and cannot leave a cut session attached to a different project.
- Native Reload and Force Reload request renderer approval rather than using destructive Electron roles. The renderer flushes focused input and offers Save/Don't Save/Cancel for project or cut-session changes. Save uses the same inspector validation and part commit before writing, then invokes only the requested reload mode. Invalid input remains open with its exact in-modal error. Template/assembly sessions must be saved or discarded before reload.
- A destructive-action Save keeps its modal open and busy until file I/O and the approved action finish. Save/Discard/Cancel and concurrent file/menu replacement commands are blocked during that interval. Saving captures immutable serialized document fields before thumbnail/file/recent-project I/O; only that same live revision can be marked clean. Newer project or inspector/session changes prevent close/reload and require another Save. Write failures retain the action for retry; canceling the initial Save As cancels the close/reload. This does not add an undo step or change the file schema.
- Every project save uses one renderer transaction queue, including manual/native/header/autosave, Save As, and close-dialog saves. The snapshot is captured at request time; thumbnail/dialog delays cannot reverse write order. A failed transaction releases the queue. Main-process text writes are also serialized across independent callers. Clean close, Don't Save, and reload drain already-requested saves before destroying their renderer; Don't Save does not cancel a manual save already in flight.
- Runtime-only document generations advance on New/Open/load, never on ordinary edits or undo, and are absent from saved files. Save completion updates path/dirty state only for its original document generation. Save As validates its owner before and after the chooser. Open operations capture document generation, current file path, immutable fields, cut-session generation and request order before asynchronous work; they revalidate before replacement. A new edit, session, document or later Open cancels the older replacement with a correction, including relocation's chooser/recent-path delay. Existing files need no migration.
- Main retains an application Quit request after Electron's initial close is prevented. After the last window approves Save/Don't Save and finishes pending writes, Quit resumes and terminates the process. Cancel, validation failure or write failure clears that request. Closing an ordinary macOS window does not terminate the application.
- Fabrication validates paired-dowel relationships once at the project boundary and attributes each issue to involved parts. It does not print inconsistent hardware instructions merely because each hole independently fits its blank.
- Glue-up strips carry no panel features. Optional `CutList.postGlueUpInstructions` records contain the original panel identity, finished dimensions and machining features with `stage: post_glue_up`; they do not consume stock or increase blank counts. UI, CSV and both PDF reports identify these as after-glue-up operations, performed once per panel. Older cut lists without the optional field still load.
- Fabrication blank dimensions use exact authored decimal precision, with fractions only for exact fraction values. PDF column widths account for the full measurement text and reserve at least 100pt for the identity column. When full measurements cannot fit that layout, both reports use a second labeled dimension line below each part, with readable identity/stock/operation columns above. Measurements are never rounded or broken across lines to make the table fit.

As of beads `15.2` and `15.3`, the current branch now implements:

- list-order-driven preview geometry for supported part-feature stacks
- ordered end-cut precedence in the preview path instead of `max inset wins`
- shared same-part conflict analysis for duplicate end cuts, overlapping rectangular removals, consumed-material errors, and anchor-removal errors
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
