# Part Cuts Workflow Trim Review

Workflow and policy source of truth: see `AGENTS.md`. This file is reference guidance for beads `carvd-studio-37` through `carvd-studio-39`.

## Review Findings

### 1. Duplicate "Selected Operation" wording

The preview canvas already shows the selected operation. The surrounding preview column also repeats a second `Selected Operation` block.

This is readable, but it feels prototype-like and creates avoidable duplication.

Trim target:

- keep both pieces of information if useful
- rename one block so they read as complementary, not duplicated

### 2. Left-rail wording is still a little mechanical

`Add Operation` and `Quick Presets` are functional labels, but `Operation Types` and `Starter Presets` read more intentionally.

Trim target:

- make the left rail read like a toolset, not a debug panel

### 3. Draft status wording can be cleaner

`Saved draft` is slightly ambiguous because there is no separately persisted cuts draft outside the current part-edit session.

Trim target:

- prefer `No unsaved changes`

### 4. Main entry label can be clearer

`Edit Cuts` works, but `Open Cuts Workspace` makes the mode switch clearer from the Properties panel.

Trim target:

- update the summary-card entry copy without changing routing behavior

## Trim Scope

The trim pass should address the items above and avoid broad visual redesign.
