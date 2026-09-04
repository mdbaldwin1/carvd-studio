## Part Cuts Keep/Discard Review

Workflow and policy source of truth: see `AGENTS.md`. This file is reference guidance for beads `carvd-studio-42.1` through `carvd-studio-42.3`.

## Review Scope

Review the accumulated cuts-workspace branch from both product and implementation perspectives and decide what should be:

- kept as the likely long-term direction
- deferred for later hardening
- discarded or trimmed because it feels too prototype-specific

## Keep

These decisions look correct and should remain the basis for future work:

- dedicated `Part Cuts` workspace instead of pushing full authoring into the Properties panel
- blank-plus-operations data model
- ordered operation stack on each part
- canonical face/edge/corner targeting vocabulary
- blank-first cut-list/reporting contract
- starter presets and mirror actions as accelerators, not replacements for direct editing
- direct preview targeting and supported preview handles for face pockets/stopped channels

## Defer

These are good future directions, but should not be treated as required keepers for the current branch:

- broader same-part conflict intelligence beyond the current overlap and duplicate-end rules
- exact feature-surface picking beyond canonical target zones
- preview handles for end cuts, rabbets, and notch families
- more advanced joinery families beyond the current constrained set
- any attempt to turn cuts mode into general CAD modeling

## Discard Or Trim

These details are not strong long-term product choices and should be trimmed:

- internal/product-rationale copy shown directly to the user
- prototype-heavy wording that explains the architecture instead of the task
- overly implementation-colored fallback copy like `inspector-only adjustments in the current preview-handles POC`

## Immediate Trim Targets

The following branch details should be cleaned up:

- `Inspector` panel description should focus on what the user does there, not on why the architecture changed
- unsupported-handle preview copy should explain the fallback plainly
- preview handle hint copy should describe the interaction directly without color-specific wording

## Recommendation

The branch is worth keeping as a fabrication-mode POC branch.

If any subset is ever promoted beyond POC, keep:

- the dedicated workspace
- the ordered feature model
- the blank-first reporting contract
- the direct targeting/handle approach for supported operations

Do not keep prototype rationale copy in the final user-facing experience.
