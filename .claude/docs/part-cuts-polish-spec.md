# Part Cuts Workspace Polish Spec

Workflow and policy source of truth: see `AGENTS.md`. This file is reference guidance for beads `carvd-studio-25` through `carvd-studio-27`.

## Purpose

Polish the dedicated `Part Cuts` workspace so it reads faster and feels more intentional for woodworking use, without changing the current POC feature model.

## Scope

This polish pass should improve:

- scanability of the current cut stack
- clarity of save/conflict state
- clarity of which operation is selected and what target it affects
- lightweight workflow guidance for first-time use

This pass should not add:

- new modeling primitives
- new editing modes
- new persistence schema

## UX Decisions

### 1. Add a workspace status summary

The left rail should include a compact status block that surfaces:

- authored operation count
- enabled operation count
- whether blocking conflicts exist
- whether the session has unsaved changes

The user should be able to understand the draft state before reading the full stack.

### 2. Make selected operation state more obvious

The stack row for the selected operation should show:

- a `Selected` badge
- stronger visual contrast than the ordinary active border
- target text in the row, not just in the inspector

The preview column should repeat:

- selected operation summary
- selected target

This reduces eye travel between the left rail and inspector.

### 3. Add lightweight workflow guidance

Cuts mode should include a short workflow reminder near the top of the left rail:

1. add or pick an operation
2. pick the target in preview or inspector
3. set measurements
4. save the operation, then save the part

This should be brief and always visible, not a modal tutorial.

### 4. Clarify locked fields for constrained operations

For operations like `Dado` and `Rabbet`, the inspector should make locked dimensions read as derived values rather than disabled mystery fields.

The UI should use plain labels like:

- `Derived from blank width`
- `Runs full edge length in this POC`

### 5. Keep the action footer obvious

The workspace should keep the operation-level save action separate from the part-level save/exit action.

The action area should clearly distinguish:

- `Add Operation` / `Save Operation`
- `Save Part`
- `Back to Project`

## Non-Goals

Out of scope for this polish pass:

- animated walkthroughs
- full onboarding overlays
- viewport camera redesign
- multi-part cuts editing
