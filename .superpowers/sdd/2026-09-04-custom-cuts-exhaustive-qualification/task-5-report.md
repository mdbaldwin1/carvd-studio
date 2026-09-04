# Task 5 Report: Complementary Mitres and Paired Dowels

## Status

Implemented and qualified complementary end-cut assembly and paired-dowel lifecycle behavior. Real Electron flows now author, rotate, move, edit, copy, delete, and undo the requested scenarios; deterministic geometry and store coverage fills the shallow-angle, compound/bevel, mismatch, fabrication, and atomic-history boundaries.

## Root-cause findings

The TDD RED pass exposed eight product defects:

1. End-cut snapping retained the rectangular end plane and approximated only vertical bevel faces. Horizontal mitres, flips, shallow angles, and full compound planes therefore had no exact authored snap surface.
2. Prevent Overlap evaluated flat mitres through broad rectangular/convex bounds, so removed corners could block exact complementary contact.
3. The world-contour Y-rotation convention disagreed with the rendered Three.js transform, mirroring angled material during collision checks.
4. Dowel diagnostics trusted relationship metadata without revalidating the actual hole diameters, blind depths, pattern/counter profiles, reciprocal mate identity, and embedment.
5. Deleting one paired feature left its mate carrying a dangling dowel relationship; the two-part state change was not expressed as one undoable store transaction.
6. Editing a paired hole rebuilt the feature without its metadata, silently dissolving the relationship instead of reporting an invalid edited pair.
7. Creating a joint from a zero-cut draft left the cuts workspace stale, so returning through the workspace could prompt for or save the old empty draft over the new joint.
8. Dowel visualization passed an unsupported DOM-style `data-aligned` property into React Three Fiber, which crashed when alignment state refreshed.

Electron debugging also found a qualification-only gesture race: re-clicking an already-selected board under a different camera could hit a rotation ring. The suite now deselects through the real Escape shortcut and chooses a pointer target from the actual rendered body triangles before starting a real canvas move.

## Implementation

- Replaced cut ends' rectangular snap candidates with planar faces derived from the same authored inset function used by rendering. The exact face updates immediately when angle, horizontal flip, vertical flip, or compound settings change.
- Routed flat horizontal end cuts through exact world-contour overlap while retaining convex collision for vertical and compound cases, and corrected the contour transform to the renderer's canonical rotation convention.
- Added one shared paired-dowel validity check for diagnostics and visualization. It verifies reciprocal IDs, metadata dimensions, actual hole dimensions, ordinary blind-hole form, embedment, world-center coaxiality, and opposing axes.
- Reconciled paired feature deletion inside `updatePart`: the surviving physical hole remains an ordinary named round-hole operation, both parts update in one temporal-store entry, fabrication output stays meaningful, and one undo restores the relationship.
- Preserved relationship metadata when editing an existing feature and synchronized a newly created joint back into the active cuts draft.
- Replaced the unsupported R3F attribute with `userData` and retained the visible aligned/misaligned material state.
- Added accessible labels to the dowel wizard's diameter, length, and embedment inputs.
- Added test-mode inspection for exact world projections, rendered body material points, derived dowel visuals, and overlap queries. Project mutations remain real UI/keyboard/pointer actions except deterministic fixture setup.

## Qualification evidence

- Complementary `45°` mitres are authored in the real cuts UI, rotated with the project shortcut, deselected/reselected through the canvas, and moved by a real pointer drag into exact gap-free, non-overlapping corners for both long-point directions. Editing one assembled angle to `30°` refreshes the preview signature and saved geometry.
- Deterministic snap/collision integration covers complementary `45°` flips, `22.5°`, compound/bevel planes, and a `45° → 30°` edit refresh.
- The real dowel wizard creates two `.375 in` members with four matching blind holes. Inspection proves matching diameters, coaxial world centers, `.375 in` embedment on each side, `.75 in` dowel length, and aligned derived visuals.
- Real canvas moves misalign and restore one member without changing its part-local features. Real cut edits create a `.25/.5 in` mismatch that remains visibly invalid.
- Real copy/paste shortcuts prove a one-member copy becomes ordinary holes and a two-member copy receives fresh feature/joint IDs with reciprocal remapped mate IDs.
- Real cuts-UI deletion leaves the survivor as an ordinary `3/8 in × 3/8 in` blind round hole; a real undo restores all four relationship records. Store coverage proves the deletion is one history entry and its fabrication line reads as an ordinary round-hole operation.

## Verification

- Focused Vitest suites: 6 files, 376 tests passed.
- Combined-rotation contour regression plus affected geometry/overlap/snap suites: 3 files, 224 tests passed.
- Desktop renderer tests: 174 files, 3,744 tests passed.
- Desktop main-process tests: 9 files, 213 tests passed.
- Desktop lint: passed with zero warnings.
- Desktop typecheck: passed.
- Fresh desktop production Electron build: passed.
- Serial tenon-then-mitre reproduction: 2/2 passed.
- `custom-cuts-assembly.spec.ts`: 10/10 passed from the fresh build, including all three Task 5 Electron scenarios.
- Full desktop Electron suite before the final combined-rotation formula hardening: 127/129 passed; every Task 5 scenario passed. The shopping-list test's missing-input timeout passed immediately in isolation. The unrelated existing countersink lifecycle case reproduced alone with `Save Cut` disabled at `part-cuts-lifecycle.spec.ts:935`, matching the failure documented by Task 4. The fresh 10/10 assembly run and affected geometry suites above were repeated after the hardening.
- Prettier and `git diff --check`: passed for changed sources at report time.

## Concerns

No known Task 5 functional blocker. Exact contour collision is deliberately limited to flat horizontal end cuts; vertical/compound cuts continue through the conservative convex-volume path. This preserves safety for 3D material while avoiding the proven 2D ghost-corner rejection. The paired-dowel validator intentionally rejects patterns, countersinks, and counterbores as joint members even if their centers happen to coincide, because those are no longer the authored ordinary dowel holes. The independently reproducible countersink lifecycle E2E failure above remains outside this change.

## Review round 1 hardening

The Task 5 review identified two Critical and two Important gaps. Each was reproduced with a failing regression before its product fix:

1. Direct one-member duplication retained the source relationship, while direct two-member duplication reused its joint and mate identities. Both `duplicatePart` and `duplicateSelectedParts` now use the same canonical feature-copy helper as clipboard paste: every feature receives a new ID, a relationship whose mate is outside the copy set is removed, and a copied pair receives one fresh joint ID with reciprocal remapped part IDs.
2. Dowel creation remained active over an unsaved Part Cuts draft. The approved safety ruling was to require the draft to be resolved rather than silently commit or replace user work. The action is disabled while dirty and displays `Save or discard part changes first`; no project transaction or draft-history divergence occurs.
3. Disabled holes and holes invalidated by current host dimensions were accepted as aligned. Shared relationship/visualization validity now requires both members to be enabled and each circular cut to pass validation against its current part. Metadata remains attached so disabled, out-of-bounds, and over-depth states stay diagnosable and render invalid rather than disappearing.
4. Mate cleanup applied only to a single-feature update path. A centralized previous-to-next reconciliation now covers `updatePart`, multi-part feature replacement, batch replacement/cut paste, direct/selected/confirmed part deletion, and recursive group deletion. It dissolves a relationship only when an existing member identity is removed; geometry-only edits remain attached for diagnostics. The surviving physical cut is renamed to an ordinary round hole within the same temporal-store transaction.

Real Electron coverage now performs the sidebar Duplicate action for one member and Shift+D for both members, proving fresh feature identities, one-member metadata removal, and paired joint/mate remapping. A separate real Part Cuts flow adds, edits, disables, reorders, and deletes draft operations, verifies the joint action is blocked, uses Cmd+Z to restore the draft-only deletion without consuming project history, then discards and proves persisted features are unchanged.

### Review round 1 verification

- Focused renderer suites: 4 files, 272 tests passed, including the direct cut-paste reconciliation path.
- Full desktop renderer suite: 174 files, 3,754 tests passed.
- Desktop main-process suite: 9 files, 213 tests passed.
- Desktop lint and typecheck: passed.
- Fresh production Electron build: passed.
- New Electron scenarios: 2/2 passed.
- Full `custom-cuts-assembly.spec.ts`: 12/12 passed from the fresh build.
- Full desktop Electron suite: 130/131 passed; every Task 5 and review-round scenario passed. The sole failure remains the independently reproducible pre-existing countersink `Save Cut` failure at `part-cuts-lifecycle.spec.ts:935` documented above.
