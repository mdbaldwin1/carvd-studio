# SDD ledger — plan: docs/superpowers/plans/2026-09-04-custom-cuts-exhaustive-qualification.md

## Pre-flight review

| Tasks | Producer / consumer or self-consistency check                                     | Finding                                                                                                                  |
| ----- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1     | Scenario helpers and exact feature assertions must support Tasks 2 and 3          | Compatible; helpers must remain operation-aware rather than hiding scenario-specific controls.                           |
| 2     | Preview manipulation and boundary tests share lifecycle E2E with Task 1           | Compatible; Task 2 extends Task 1 helpers after Task 1 review.                                                           |
| 3     | Featured-part fixtures consume the operation creation helpers from Task 1         | Compatible; use representative feature kinds rather than repeating every authoring scenario.                             |
| 4     | Assembly suite consumes feature fixtures and touches drag/snap/overlap interfaces | Compatible; production fixes are isolated behind failing integration tests before Electron scenarios.                    |
| 5     | Assembly suite and drag/snap interfaces overlap Task 4                            | Sequential by design; Task 5 starts only after Task 4 review is clean.                                                   |
| 6     | Manual qualification consumes all prior test and production behavior              | Compatible; defect work is one TDD loop at a time and cannot bypass prior review gates.                                  |
| 7     | Verification consumes the complete branch                                         | Compatible; explicitly forbids release and records residual risks.                                                       |
| 1     | Tests specified versus code specified                                             | Consistent: UI/E2E first; production changes only for reproduced defects.                                                |
| 2     | Tests specified versus code specified                                             | Consistent: component/unit boundary coverage plus real-handle Electron paths.                                            |
| 3     | Tests specified versus code specified                                             | Consistent: store deep-copy tests support real UI copy/transform E2E.                                                    |
| 4     | Tests specified versus code specified                                             | Consistent: the known mate-host loss is treated as a hypothesis requiring a failing regression.                          |
| 5     | Tests specified versus code specified                                             | Consistent: existing paired dowel representation satisfies the physical-fit request without adding loose hardware scope. |
| 6     | Tests specified versus code specified                                             | Consistent: evidence doc and changelog are the only planned documentation writes.                                        |
| 7     | Tests specified versus code specified                                             | Consistent: full gates and independent review, with no merge/release/version change.                                     |

Ruling: “Fit a dowel into a matching hole” will be qualified through the existing paired Dowel Joint model and its derived dowel visualization, not by inventing a standalone loose-dowel part system — this proves diameter, axis, and embedment while respecting the approved product scope — if wrong, a separate loose-hardware feature would still be required later.

Ruling: operation lifecycle coverage will combine exhaustive per-operation state/UI assertions with representative direct canvas geometry gestures, because repeating identical pointer gestures for every operation would be slow and brittle without adding distinct behavioral proof — if wrong, a cut-specific canvas integration defect may require another E2E scenario.

## Progress

Task 1: fix round 1/5 (4 addressed, 1 new Important open — preview geometry signature disposed borrowed cached geometry; commits b9c7310..fba09a6)

Task 1: fix round 2/5 (1 addressed, 0 open — borrowed cache geometry is no longer disposed and ownership regression added; commits fba09a6..97dee22)

Task 1: complete (commits 64907aa..97dee22, review clean)

Task 2: fix round 1/5 (3 addressed, 2 partially open — rounded edge clamping and integrated action workflow; 1 new Important — rotated rounded handles; commits 3d497d4..5e3d99e)

Task 2: fix round 2/5 (0 fully closed, 3 open — rounded direct clamp proof, real sequential nested workflow, production rotated nudge controls; commits 5e3d99e..7a10146)

Task 2: fix round 3/5 (1 addressed, 2 open — nested independence/meaningful undo-redo and rotated real-control interaction coverage; commits 7a10146..1bedc0e)

Task 2: fix round 4/5 (2 addressed, 0 code-review findings open; commits 1bedc0e..29d5353)

Task 2: Ruling: proceed with the statically approved implementation while focused runtime verification remains deferred to the next healthy test process and Task 7 — four fresh Vitest attempts timed out before transform/import/test execution, while TypeScript and configured Prettier passed; no failed assertion or open Critical/Important review finding exists — if wrong, Task 2 may contain a runtime-only test failure that must be fixed before final qualification.

Task 2: complete (commits 97dee22..29d5353, static review clean; runtime verification deferred by recorded infrastructure ruling)

Task 3: fix round 1/5 (Critical fabrication label/detail loss fixed; real copy/paste and transform history addressed; resize/PDF/detail assertions refined; commits b613798..57c7222)

Task 3: fix round 2/5 (pattern orientation, exact blocked resize semantics, and rectangular nested independence addressed; commits 57c7222..6e4d652)

Task 3: complete (commits 29d5353..6e4d652, review clean)

Task 4: fix round 1/5 (short socket containment and pure-position store guard addressed; off-center geometry, zero-delta live-grid axes, and group suppression remained; commits 5ea8fc9..0cbc8e8)

Task 4: fix round 2/5 (rendered local-Z and live-grid axes addressed; initial unselected group ownership remained; commits 0cbc8e8..82e9c2c)

Task 4: fix round 3/5 (normal first group ownership addressed; fallback exclusive takeover/evidence remained; commits 82e9c2c..c897a2b)

Task 4: fix round 4/5 (exclusive takeover and mate-boundary evidence addressed; stale displaced Part render remained; commits c897a2b..8f146b0)

Task 4: fix round 5/5 (stale local preview replaced by owner-matched session rendering; actual mesh full-vector preview/release evidence added; commits 8f146b0..5728032)

Task 4: complete (commits 6e4d652..5728032, review clean)

Task 5: Ruling: while a Part Cuts draft differs from persisted features, Create Dowel Joint is disabled with `Save or discard part changes first` rather than silently merging or auto-saving — this prevents data loss and split local/global undo history — if wrong, users may prefer an explicit transactional save-and-create flow later.

Task 5: fix round 1/5 (direct duplicate relationship semantics, dirty-draft guard, invalid-member diagnostics, and centralized removal reconciliation addressed; commits 83b61fd..e33717b)

Task 5: complete (commits 5728032..e33717b, review clean)

Task 6: Ruling: the known countersink Save Cut failure was a stale QA fixture, not a product defect — a 1/4-inch pilot, 3/4-inch major diameter, and 82-degree included angle require about 0.2876 inches of recess depth, so the prior 1/4-inch blind depth was correctly rejected; the fixture now uses 3/8 inch — if wrong, production validation would still reject a physically valid countersink, but the corrected case and full Electron suite pass.

Task 6: fix round 1/5 (the exhaustive matrix, native per-operation round trips, stress project, patterned recess evidence, and operation termination summaries were completed; commits 2e3f747..26c6703)

Task 6: fix round 2/5 (right-end long-point instruction and rendered-mesh semantics were aligned and covered; commits 26c6703..f757906)

Task 6: fix round 3/5 (layered compound end cuts now preserve vertical global bevels across mirrored contour space, with 24 exact coordinate cases and real Electron geometry fingerprints; commits f757906..6b98988)

Task 6: complete (commits e33717b..6b98988, review clean; renderer 3,788/3,788, main 213/213, Electron 135/135, P0 0, P1 0; exhaustive results in `.claude/docs/custom-cuts-exhaustive-qa-results.md`)

Task 7: fix round 1/5 (final Part Cuts save and Cut List validation now cover circular and rounded cuts; RED 3 failed / 149 passed / 152 total, GREEN 152/152; commit bd62e06)

Task 7: Ruling: use `origin/develop` at `459b6a5` as the whole-branch review base because the local `develop` ref is stale — if wrong, a future refreshed base could expose additional integration diff, but the current remote-tracking merge base and complete candidate history were audited.

Task 7: complete (commits 6b98988..1c23610; independent review clean after one test-first P0 fix; renderer 3,791/3,791, main 213/213, Electron 135/135, lint/typecheck/format/build/diff green, P0 0, P1 0; branch remains unreleased)

Task 7: whole-branch review supersedes the preceding completion checkpoint (14 Important findings and 1 Minor finding, all requiring remediation before acceptance).

Task 7: whole-branch remediation complete, pending independent re-review (commit 622bced74b871cb706d410bac89bab02afe22573; every R1–R15 finding reproduced RED then fixed; 72 net new renderer tests; fresh renderer 3,863/3,863, main 213/213, real Electron 135/135; lint/typecheck/configured format/production build/production analytics boundary/diff/scope/security checks pass; report `task-7-remediation-report.md`; zero requested findings deferred, no release/merge/push/version/distribution action).

Task 7: scoped re-review found four residual Important findings A–D. All independently reproduced RED and fixed test-first at db9dcd7e63b5e2776ade65db5f089b48387e53c8, with 28 new renderer regressions and explicit self-audit of original R1–R15 plus A–D. Focused 282/282; actual PDF 7/7 plus all four changed pages visually inspected. Fresh full configured gate passes renderer 3,891/3,891, main 213/213, Electron 135/135 in 2.3m; lint/typecheck/format/production build/analytics boundary/diff/security/scope pass. Initial slow-host attempt had six worker-startup timeouts and no assertion failures; unmodified rerun passed. No additional reviewer/subagent, no finding deferred, and no release/merge/push/version/distribution action.

Task 7: independent review pass 2 supersedes the preceding acceptance checkpoint with 11 Important findings plus accessibility/clarity fixes. Remediation in progress; Q3 RED 2/2 -> GREEN 2/2, Q11 RED 6/8 -> GREEN 8/8. Full mapping and final gates go in `task-7-remediation-round-2-report.md`; branch remains unreleased.

Task 7: independent review pass 2 remediation complete at `28d81abc342466a7519676de29b5bcdb61d3a2b3`; all eleven Important findings independently reproduced RED then fixed, all confirmed UX/accessibility issues addressed. Expanded self-audit adds 96 physical plane/volume combinations, existing-dowel interference and complete blind-bore shoulder sweep coverage; 175 net new renderer tests. Fresh configured full gate: renderer 4,066/4,066 (177 files), main 213/213 (9 files), Electron 135/135 (3.2m). Lint/typecheck/configured and changed-file formatting/production build/analytics boundary/diff/security/scope pass. Earlier aggregate fixture failures (removed metric-hole location and unfinished first-save library prompt) were diagnosed and corrected without weakened validation/assertions. Complete RED/GREEN/root-cause/file mapping and prior-round self-audit: `task-7-remediation-round-2-report.md`. P0 0, P1 0, no requested finding deferred, no subagent/reviewer added, no release/push/merge/PR/version/package/distribution action.

Task 7: post-fix independent review closed Q1–Q11 and found three Important issues (collision hull, complete pocket support, family-neutral no-material gate) plus one Minor geometry-cache issue. All four independently reproduced RED and fixed test-first at `16e5827176c20242c1dfff88ceceda0be99d4486`. Initial RED 6 failed/1 control; expanded adjacent probes and actual Save Cut/Save Part/Cut List coverage total 111 new renderer tests; broad affected 785/785. Fresh complete configured gate passes renderer 4,177/4,177 (178 files), main 213/213 (9 files), all 135 Electron (2.5m). The earlier 134/135 stress fixture was physically unsupported; it now asserts rejection at offset 76, corrects to 74, and preserves all original downstream assertions. Focused native flow passed 1/1 (40.5s) before full rerun. Lint/typecheck/configured and changed-file format/production build/analytics boundary/diff/security/scope pass. Complete mapping and exact plane arithmetic: `task-7-remediation-round-3-report.md`; canonical QA updated. P0 0, P1 0, no finding deferred, no subagent/reviewer added, no release/push/merge/PR/version/package/distribution action.

Task 7: closure review E/F Important and G Minor fixed test-first at `44033dda82398fd60f0e47883f5da6347706d27c`. Initial confirmed RED 4/4; expanded E 25 failures and G 64 failures. Adjacent near-meeting end planes independently RED at 3,645.3ms, then GREEN at 5.4ms after replacing the envelope fallback with bounded six-halfspace construction. Cold 16/128-hole compound geometry measured 8.2/42.5ms (16-hole original RED 4,423.8ms), downstream collision/validation 2.8/9.5ms; exact volumes/planes/rays remain asserted. 110 new renderer tests: E 27, F 19, G 64. Final full gate after the adjacent correction passes renderer 4,287/4,287 (179 files), main 213/213 (9 files), all 135 Electron (2.3m). Lint/typecheck/configured and changed-file formatting/production build/analytics boundary/diff/security/scope pass. Two legacy cap-extreme oracles tightened to the actual cap; no geometry expectation relaxed. Complete report `task-7-remediation-round-4-report.md`, canonical QA/changelog/spec updated. P0 0, P1 0, no requested finding deferred, no subagent/reviewer added, no release/push/merge/PR/version/package/distribution action.

Task 7: final closure review confirmed F closed, then H/I Important and J Minor independently RED (15 failures / 2 controls). Fixed test-first at `d984617785ab2c1d8974b51a3f599dcd5b0f4efb`: strict local-triangle SAT for exact rotated contact; canonical Three XYZ axes for collision cells/snap vertices; non-finite hidden offsets preserved until explicit reset. Expanded RED H 1/20, I 5/5, J 36/39; final 64 new renderer tests (H 20, I 5, J 39). Focused editor 102/102; physical/snap/collision/performance 475/475. Fresh complete configured gate passes renderer 4,351/4,351 (180 files), main 213/213 (9 files), Electron 135/135 (2.3m), no aggregate failure or Electron fixture change. Lint/typecheck/configured format/changed-doc format/production build/analytics boundary/diff/security/scope pass. Report `task-7-remediation-round-5-report.md`, canonical QA/changelog/spec updated; previous checkpoint retained as historical. P0 0, P1 0, no requested finding deferred, no subagent/reviewer added, no release/push/merge/PR/version/package/distribution action.
