## Part Cuts Production Review

Workflow and policy source of truth: see `AGENTS.md`. This file is reference guidance for `carvd-studio-45.1` through `carvd-studio-45.3`.

## Scope

Review the current cuts-workspace branch as if it were the basis for a future production track and separate:

- production-candidate direction
- useful but not yet promotable work
- work that should remain POC-only or be discarded

## Production-Candidate Direction

These decisions look correct and should remain the architectural basis for future work:

- dedicated `Part Cuts` workspace instead of full authoring in the Properties panel
- blank-plus-operations model for part shaping
- ordered operation stack per part
- canonical face/edge/corner targeting vocabulary
- blank-first reporting and cut-list contract
- shared conflict analysis used by cuts mode, summaries, and store validation
- direct target picking plus constrained preview handles for supported operations

## Useful But Not Yet Promotable

These are directionally right, but they still need hardening before they should be treated as production-ready:

- constrained joinery operation set beyond the original end-cut/notch/cutout scope
- preview-handle editing for every supported operation family
- deeper same-part sequential validation beyond the current conservative rules
- exact shape-aware interaction math outside the current feature bounds strategy
- export/report detail that explains complex multi-operation stacks for fabrication crews

## POC-Only Or Defer

These should stay isolated to the POC branch or be deliberately deferred:

- broad claims that every geometric combination is supported
- any move toward freeform CAD-style modeling
- operation families that require richer constraint editing before they can be explained cleanly
- user-facing copy that explains internal implementation tradeoffs instead of the woodworking task

## Current Technical Assessment

Strong:

- model, persistence, rendering split, and workspace routing now align around the same part-feature concept
- conflict detection is centralized instead of being reimplemented independently
- the branch now has enough regression coverage to extend safely

Needs future hardening:

- more exact sequential reasoning for complex intersecting blind operations
- broader direct-handle support with more operation-specific affordances
- a clearer promotion plan for which operations are “core” versus “experimental”

## Current UX Assessment

Strong:

- woodworker-facing operation vocabulary is much better than axis-driven editing
- dedicated mode reduces Properties-panel overload
- operation order is visible and understandable

Needs trimming:

- some inspector copy still sounds like implementation notes instead of task guidance
- some constrained-operation descriptions still overuse `POC` language

## Promotion Recommendation

If this branch ever feeds a real production track, the promotion order should be:

1. dedicated cuts workspace shell and routing
2. end cuts plus the simplest rectangular removals
3. ordered conflict detection and blank-first reporting
4. selected presets, mirroring, and direct-handle interactions

Everything else should be explicitly staged after that instead of merged as one large feature block.

## Actions Taken In This Review Pass

This review pass already applied the following trims:

- removed prototype-heavy `POC note` phrasing from the cuts inspector copy
- rewrote constrained-operation descriptions to explain the woodworking task directly
- kept the hard product constraints while making the wording less implementation-colored
