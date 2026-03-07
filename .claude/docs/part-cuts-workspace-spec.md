# Part Cuts Workspace Spec

Workflow and policy source of truth: see `AGENTS.md`. This file is reference guidance for `carvd-studio-13.1` and downstream dedicated-cuts-workspace beads.

## Implemented POC Status

As of beads `13.2` through `13.5`, the implemented POC behavior is:

- dedicated `Part Cuts` mode exists in the app shell
- entry points exist from the part Properties panel and part context menu
- a draft session clones part features and supports save/discard/exit handling
- operation-stack authoring now lives in the cuts workspace
- reordering, duplication, removal, and enable/disable all happen there
- the main Properties panel is reduced to a compact cuts summary plus `Edit Cuts`
- the preview currently uses a target-map workflow and conflict/status feedback instead of full 3D picking

Still deferred beyond the current implemented POC:

- true 3D target picking in the viewport
- richer geometry-linked preview interaction
- broader conflict rules beyond the current same-end / overlapping-rect-cut checks
- additional woodworking operations beyond the current POC feature set

See also:

- `part-cuts-3d-targeting-spec.md` for the direct viewport targeting contract that follows this workspace model

## Purpose

Define the dedicated `Part Cuts` workspace as the primary authoring surface for fabrication operations on a single part.

This workspace exists to solve a product and architecture problem:

- the Properties panel is the right place for scalar part edits
- cut authoring is spatial, ordered, and fabrication-oriented
- future support for multiple operations, reordering, conflict handling, and richer targeting will make the Properties panel too dense

The goal is to keep the main editor focused on layout and part metadata while giving part shaping a dedicated mode comparable to assembly editing and template editing.

## Product Decision

### Canonical editing model

Part cuts are edited in a dedicated workspace mode.

The main project editor remains the place for:

- positioning parts
- sizing blanks
- assigning stock and grain
- grouping and assemblies
- project-level cut list generation

The dedicated `Part Cuts` workspace becomes the place for:

- authoring part features
- viewing the selected part in isolation
- selecting valid targets in 3D
- ordering operations
- resolving conflicts and invalid combinations
- understanding the finished shaped part separate from project layout

### Rejected model

Do not continue scaling the Properties panel into the primary cut-authoring surface.

The Properties panel may keep:

- operation summary
- count of authored operations
- entry point button (`Edit Cuts`)
- possibly one future quick action for a common preset

It should not remain responsible for the full feature stack editor long term.

## Why This Fits Woodworking Better

The woodworker mental model is:

1. create or select a board blank
2. decide how the part fits in the project
3. switch context to shape that part
4. add fabrication operations in sequence
5. return to the project layout

That is closer to a shop workflow than keeping every shaping action embedded in a generic property inspector.

A woodworker thinks:

- `edit this board's cuts`
- `mitre both ends`
- `add a back-bottom-left notch`
- `check the finished shape`

They do not think:

- `open the property inspector and manage a growing list of geometric modifiers`

## Core UX Principles

### Blank first

The part's `length`, `width`, and `thickness` remain the blank definition.

### One part at a time

The workspace edits exactly one source part per session.

No multi-part feature editing in the POC.

### Operation stack, not flat fields

Cuts are represented as an ordered stack of operations on the part.

That stack is visible, reorderable, and becomes authoritative for future overlapping-feature behavior.

### Spatial targeting over abstract form editing

The workspace should favor direct selection of ends, faces, edges, and corners in the preview.

### Main editor remains uncluttered

The general project editor should not absorb target-selection UI, ordering UI, or complex validation affordances that are specific to cut authoring.

## Entry Points

### Required entry points

The app should support entering cuts mode from:

- single-part Properties panel via `Edit Cuts`
- single-part context menu via `Edit Cuts...`

### Entry requirements

Cuts mode can only open when:

- exactly one part is selected
- the app is not already in assembly editing mode
- the app is not already in template editing mode
- the app is not already in part cuts mode

### Deferred entry points

Out of scope for the initial workspace rollout:

- keyboard shortcut to open cuts mode
- double-clicking an `Ops` badge
- entry from cut-list reports
- launching cuts mode from multi-select

## Mode Semantics

### Editing mode identity

The app gains a third focused editing mode alongside:

- assembly editing
- template editing
- part cuts editing

Part cuts mode should reuse the same high-level application behavior pattern:

- focused mode chip in the header
- explicit exit action
- routing of save behavior while active
- dirty-state handling on exit
- restoration of the prior editor context on discard/cancel

### Editing scope

Part cuts mode edits:

- one source part in the current project
- only the `features` payload on that part during the initial rollout

The part's blank dimensions remain visible in cuts mode, but they are not the primary editing target of this workspace.

Changing blank dimensions stays in the main project editor.

### Workspace presentation

Cuts mode should be a focused editor state layered into the existing app shell, not a separate route tree or a modal.

The user should still recognize the product as the same workspace, with:

- the normal app header
- focused mode chip (`Part Cuts`)
- a dedicated central layout for cut editing

## Session Contract

### Draft session model

Cuts mode should use a draft-edit session, not direct live mutation on every keystroke.

When entering cuts mode:

- capture the source part id
- clone the source part's current `features`
- store them as session draft state
- keep the source project part unchanged until save/commit

### Why draft mode is preferred

Draft mode matches the complexity of cut authoring better than direct live edits because it supports:

- cancel without polluting undo history
- temporary invalid states while authoring
- clear save/discard semantics
- future conflict resolution workflows
- future operation reordering without creating noisy project-level history entries

### Save behavior

On save:

- validate the draft feature stack
- write the finalized `features` array back to the source part in `projectStore`
- mark the project dirty through the normal store update path
- exit cuts mode
- preserve the selected part on return to the main editor

### Cancel behavior

On cancel/discard:

- discard session draft state
- leave the source part untouched
- exit cuts mode
- preserve the selected part on return to the main editor

### Dirty-state prompt

If the session draft differs from the source part state when the user exits:

- show a part-cuts discard confirmation dialog
- offer `Keep Editing`, `Discard`, and `Save`

This should mirror the existing assembly/template editing pattern rather than inventing a new confirmation style.

## State Model

### New state slice

Introduce dedicated part-cuts editing state rather than trying to overload `uiStore` or `selectionStore`.

Recommended shape:

```ts
interface PartCutsEditingState {
  isEditingPartCuts: boolean;
  sourcePartId: string | null;
  draftFeatures: PartFeature[];
  selectedFeatureId: string | null;
  hoveredTarget: PartFeatureTarget | null;
  pendingTarget: PartFeatureTarget | null;
  hasUnsavedDraftChanges: boolean;
}
```

### Responsibilities of the cuts editing store/hook

The part-cuts edit layer should own:

- entering cuts mode for a part
- draft feature cloning and normalization
- selecting the active operation row
- adding, duplicating, deleting, enabling, and reordering operations in the draft
- updating the selected operation
- tracking dirty state against the source part
- save/discard/exit actions

### Responsibilities that stay elsewhere

Keep these concerns in their existing stores:

- current project data: `projectStore`
- workspace selection outside cuts mode: `selectionStore`
- camera persistence: `cameraStore`
- generic dialogs and toast plumbing: `uiStore`

## Main Layout

The cuts workspace should use a three-region layout.

### Left rail

Operation stack and operation management.

Contents:

- `Add Operation`
- operation rows with numbering
- reorder controls
- duplicate
- enable/disable
- delete
- operation conflict badges
- common presets if added later

### Center canvas

Isolated preview of the active part.

Contents:

- large single-part 3D preview
- target highlighting
- selected-operation highlighting
- optional orthographic shortcuts later (`Top`, `Front`, `End`)
- blank and shaped result visual relationship

### Right rail

Inspector for the selected operation.

Contents:

- operation type
- target
- parameters
- measurement references
- derived dimensions such as long point / short point where relevant
- validation and conflict feedback in plain language

### Header behavior

The shared app header should show:

- mode chip: `Part Cuts`
- source part name
- blank size summary
- `Cancel`/`Exit`
- `Save`

This should visually align with the current template/assembly header treatment.

## Authoring Flow

### Recommended flow

1. enter cuts mode from a selected part
2. view existing operation stack for that part
3. choose `Add Operation`
4. pick operation family first
5. preview valid targets only
6. choose target in the viewport or target list
7. edit dimensions/angles in the inspector
8. repeat for additional operations
9. reorder if needed
10. save and return to the project

### Operation-first rule

The UI should ask what the user is trying to do before asking for a target.

Example:

- `Add Operation`
- choose `Mitre`, `Bevel`, `Compound Cut`, `Corner Notch`, `Edge Notch`, `Cutout`
- then show only valid targets for that operation type

This is more intuitive than showing the full face/edge/corner taxonomy as a first step.

## Operation Stack Behavior

### Ordered operations

The stack order should be visible and user-controlled.

For this workspace, that means:

- numbered rows
- move up / move down affordances
- order preserved in the saved `features` array

### Current semantics

For the workspace rollout, order is authoritative UI state and persistence state even if some geometry/validation paths are still conservative in the POC.

This avoids designing a UI that has to change later once overlap/conflict rules become fully order-aware.

### Row content

Each row should show:

- order number
- operation label
- target label
- key dimensions/angles
- enabled state
- warning/conflict badge when relevant

## Spatial Targeting Behavior

### Target taxonomy

Use the canonical target taxonomy from `part-features-poc-spec.md`:

- 6 faces
- 12 edges
- 8 corners

### Interaction rules

When an operation type is selected:

- highlight only valid targets for that operation
- de-emphasize or disable invalid targets
- allow target selection from viewport and inspector list

### Selected-operation emphasis

When an operation row is selected:

- emphasize its target in the preview
- show its effect on the part clearly
- distinguish `selected operation` from `hovered target`

## Validation and Conflict Feedback

### Validation location

Validation should appear in the cuts workspace while authoring, not only during cut-list generation.

### Messaging style

Use fabrication-language warnings.

Examples:

- `This notch extends past the blank width.`
- `This cut overlaps the existing top-face cutout.`
- `Only one enabled end cut can exist on the Left End in this POC.`

### Severity model

The workspace should distinguish:

- blocking errors
- non-blocking warnings

Blocking errors prevent save.
Warnings allow save but remain visible.

### Save gate

`Save` must be disabled or prevented with clear explanation when the draft contains blocking validation issues.

## Relationship to Main Editor

### What remains in Properties

After downstream workspace beads land, the Properties panel should retain only a compact part-cuts summary card.

That summary card should show:

- operation count
- first few operation summaries
- `Edit Cuts` button

### What leaves Properties

Remove from the Properties panel as the primary workflow:

- feature creation forms
- feature target selectors
- feature stack ordering UI
- detailed feature validation copy
- duplicate/remove operation controls

### Context menu behavior

The part context menu should gain:

- `Edit Cuts...`

This should appear only when exactly one part is selected.

## Interaction With Other Modes

### Assembly editing compatibility

Part cuts mode should be available while editing an assembly, but only within that focused assembly session.

That means:

- if the user is inside assembly editing mode, they may still open cuts mode for a single part in that assembly workspace
- saving cuts mode writes back to the temporary assembly-edit project state, not directly to the assembly library item
- leaving assembly editing still follows the current assembly save/discard workflow

### Template editing compatibility

Apply the same rule to template editing:

- cuts mode may open while editing a template
- saving cuts mode writes back to the temporary template-edit project state
- template save/discard remains the outer session contract

### Mode nesting rule

Only one focused sub-mode may be active at a time.

Examples:

- allowed: template editing -> part cuts mode
- allowed: assembly editing -> part cuts mode
- not allowed: part cuts mode for one part while another cuts session is already open

In implementation terms, part cuts mode is a focused sub-mode layered inside the current project-like editing surface, not a separate independent root mode.

## File and Undo Semantics

### File operations while in cuts mode

While cuts mode is active:

- `Save` routes to `save part cuts draft`, not to file save
- `Save As` should remain unavailable or explicitly redirected, matching current focused-mode conventions
- opening another project/template/start-screen transition should first resolve the cuts draft session

### Undo strategy

For the initial dedicated workspace rollout, keep undo local to the cuts draft session where practical.

Do not require full integration with the project-wide undo stack in the first pass.

The key requirement is:

- cancel/discard does not leave partial edits in project history

If local undo is not implemented immediately, simple explicit draft editing plus save/discard is sufficient for the POC.

## Implementation Guidance For Downstream Beads

### `carvd-studio-13.2`

Should implement:

- part-cuts editing store/hook
- app shell entry/exit wiring
- header mode chip / source part labeling
- Properties button entry point
- part context menu entry point
- save/cancel dialog plumbing

### `carvd-studio-13.3`

Should move:

- operation stack management
- add/edit/delete/duplicate/enable flows
- reorder controls
- selected-operation inspector

from `SinglePartFeaturesCard` into the dedicated workspace.

### `carvd-studio-13.4`

Should add:

- viewport-based targeting
- selected-operation highlighting
- hovered target feedback
- conflict and invalid-state messaging in workspace context

### `carvd-studio-13.5`

Should reduce Properties to:

- compact summary card
- `Edit Cuts` entry
- no detailed feature authoring UI

### `carvd-studio-13.6`

Should cover:

- entry/exit behavior
- save/discard flows
- nested use under assembly/template editing
- operation reorder persistence
- Properties/context-menu entry points
- docs alignment and changelog updates if user-visible workflow changes have landed

## Explicit POC Non-Goals For This Workspace

The dedicated cuts workspace does not imply:

- arbitrary CAD modeling
- freeform sketching
- simultaneous multi-part cut editing
- exact machining simulation
- exact shape nesting in cut-list optimization
- a second general-purpose editor independent of the main workspace

It is a focused fabrication editor for one part at a time.
