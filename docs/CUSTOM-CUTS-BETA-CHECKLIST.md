# Custom Cuts beta checklist

Use this checklist with at least one real project before promoting Custom Cuts from `develop` to a public release.

A ticked box below was verified by the automated suite on Apple Silicon macOS and names the spec that covers it, so
any claim here can be re-run. Boxes left unticked are the ones automation cannot honestly answer — legibility,
sustained interactive use, and the three platforms this machine is not. They still need a human before the beta ships.

## Core workflow

- [x] Open Custom Cuts from both Properties and the part context menu. — `part-cuts-lifecycle`, `context-menu-matrix`
- [x] Create and save a mitre or bevel, tenon, dado or groove, rabbet or notch, and mortise or cutout. — `part-cuts-lifecycle` ("qualifies end/rectangular operations"), `custom-cuts-hands-on-qa`
- [x] Create a through round hole, angled blind hole, countersink, counterbore, rounded opening, and each hole-pattern type. — `part-cuts-lifecycle` ("qualifies circular/rounded operations"), `custom-cuts-round9`
- [x] Create a paired dowel joint; verify both parts receive matching holes in one undo step and the dowel display can be toggled. — `part-cuts-lifecycle` ("creates and undoes both sides of a paired dowel joint atomically")
- [x] Move one dowel-joint part out of alignment and confirm the dowels show a non-destructive warning; undo and confirm alignment returns. — `part-cuts-lifecycle`, `projectStore` dowel-reconciliation unit tests
- [x] Reopen each saved operation and confirm its target, dimensions, and rendered shape. — `part-cuts-lifecycle` ("persists custom cuts through a project save and reload"), `custom-cuts-hands-on-qa`
- [x] Undo and redo edits inside the cuts workspace. — `part-cuts-lifecycle`, `partCutsEditingStore` unit tests
- [x] Copy cuts from one part and paste them onto multiple compatible parts. — `part-cuts-lifecycle` ("copies cuts to another part with independent feature ids")
- [x] Mirror a supported cut and confirm the expected opposite target. — `partFeatureActions` unit tests, `custom-cuts-assembly`
- [x] Exit with unsaved edits and exercise Keep Editing, Discard, and Save. — `part-cuts-lifecycle` ("prompts before discarding"), `custom-cuts-round6`, `custom-cuts-round7`

## Project and fabrication output

- [x] Save the project, quit Carvd Studio, reopen the file, and confirm every cut remains intact. — `project-file-lifecycle`, `part-cuts-lifecycle`
- [x] Generate a cut list and confirm blank dimensions are correct. — `cut-list-export-validation-matrix`, `cutListOptimizer` unit tests
- [x] Confirm the Ops count and numbered fabrication instructions match the authored order. — `part-cuts-lifecycle` ("shows saved operations in fabrication output"), `cutListInstructions` unit tests
- [ ] Export PDF and CSV output and verify the instructions are readable in the workshop. — files are produced and their content asserted by `cut-list-export-validation-matrix`; **legibility in print is a human judgement and is not ticked**
- [x] Open one older project without cuts and confirm it remains unchanged. — `fileFormat` migration unit tests, `project-file-lifecycle`
- [x] Confirm dowel fabrication output states quantity, diameter, dowel length, and drilling depth for each part. — `cutListInstructions` dowel unit tests

## Geometry and safety

- [x] Verify snapping into a dado, groove, or mortise socket with a matching part. — `custom-cuts-assembly` ("seats nominal and clearance dado fits", "seats groove, stopped-groove, and rabbet fits", "seats an authored tenon shoulder at the mortise surface")
- [x] Confirm selection, camera centering, ground placement, and overlap prevention follow the cut shape. — `canvas-selection-edge-cases`, `overlapPolicy` and `snapToPartsUtil` unit tests
- [x] Try invalid and intersecting cuts and confirm Carvd explains the conflict without losing edits. — `part-cuts-lifecycle` ("blocks conflicting duplicate end cuts and keeps the workspace open"), `partFeatureConflicts` unit tests
- [ ] Spend at least 20 minutes repeatedly adding, editing, previewing, and deleting cuts; confirm memory and interaction remain stable. — **not attempted; sustained interactive use needs a person at the app**

## Platforms and acceptance

- [x] Complete the workflow on Apple Silicon macOS. — full Playwright suite, 196 passed / 0 failed (9.9m), 2026-09-11
- [ ] Complete the workflow on Intel macOS or the Intel CI build. — covered by PR #444 CI, not by this machine
- [ ] Complete the workflow on Windows x64. — covered by PR #444 CI, not by this machine
- [ ] Complete the workflow on Linux x64. — covered by PR #444 CI, not by this machine
- [ ] Record tester, project type, app version, platform, blocking issues, and final go/no-go decision below.
- [x] Run the anonymized Paul deck alignment regression and record joist-corner and deck-board end-flush results below. — `snapToPartsUtil` ("recovers flush alignment for anonymized adjacent boards from Paul's deck")

## Beta record

- Tester: _(unsigned — automated pass only)_
- Project: synthetic single-part and cabinet-panel fixtures used by the suite; **no real project has been taken through the beta yet**, which the header of this checklist asks for
- Version / platform: desktop 1.3.0, Apple Silicon macOS (darwin 25.5.0), Node 22.23.2, Electron via `npm run test:e2e`
- Blocking issues: none found by the automated pass
- Non-blocking feedback:
  - Four specs failed a first full run with `did not quit gracefully within 30s` during teardown. All four passed in isolation and the whole suite passed on a quiet machine, so they are shutdown-timeout flakes under parallel load, not defects. The failing run also left eight `carvd-e2e-runtime-*` copies (~2 GB) behind, since cleanup does not run when the harness preserves a profile.
  - Holes on end and side faces still have neither drag handles nor a dimension overlay.
- Paul deck joist-corner result: PASS — face contact snaps on X to -6.000 (±0.001)
- Paul deck board end-flush result: PASS — end flush snaps on Z, landing at x -6.000, z 0.000 (±0.001)
- Decision: Go / No-go — **not decided.** The automated pass is clean, but the four unticked items above (print legibility, a 20-minute soak, and the three non-macOS platforms) plus a run against a real project are still outstanding.
