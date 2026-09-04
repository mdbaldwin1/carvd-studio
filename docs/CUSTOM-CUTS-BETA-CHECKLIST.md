# Custom Cuts beta checklist

Use this checklist with at least one real project before promoting Custom Cuts from `develop` to a public release.

## Core workflow

- [ ] Open Custom Cuts from both Properties and the part context menu.
- [ ] Create and save a mitre or bevel, tenon, dado or groove, rabbet or notch, and mortise or cutout.
- [ ] Create a through round hole, angled blind hole, countersink, counterbore, rounded opening, and each hole-pattern type.
- [ ] Create a paired dowel joint; verify both parts receive matching holes in one undo step and the dowel display can be toggled.
- [ ] Move one dowel-joint part out of alignment and confirm the dowels show a non-destructive warning; undo and confirm alignment returns.
- [ ] Reopen each saved operation and confirm its target, dimensions, and rendered shape.
- [ ] Undo and redo edits inside the cuts workspace.
- [ ] Copy cuts from one part and paste them onto multiple compatible parts.
- [ ] Mirror a supported cut and confirm the expected opposite target.
- [ ] Exit with unsaved edits and exercise Keep Editing, Discard, and Save.

## Project and fabrication output

- [ ] Save the project, quit Carvd Studio, reopen the file, and confirm every cut remains intact.
- [ ] Generate a cut list and confirm blank dimensions are correct.
- [ ] Confirm the Ops count and numbered fabrication instructions match the authored order.
- [ ] Export PDF and CSV output and verify the instructions are readable in the workshop.
- [ ] Open one older project without cuts and confirm it remains unchanged.
- [ ] Confirm dowel fabrication output states quantity, diameter, dowel length, and drilling depth for each part.

## Geometry and safety

- [ ] Verify snapping into a dado, groove, or mortise socket with a matching part.
- [ ] Confirm selection, camera centering, ground placement, and overlap prevention follow the cut shape.
- [ ] Try invalid and intersecting cuts and confirm Carvd explains the conflict without losing edits.
- [ ] Spend at least 20 minutes repeatedly adding, editing, previewing, and deleting cuts; confirm memory and interaction remain stable.

## Platforms and acceptance

- [ ] Complete the workflow on Apple Silicon macOS.
- [ ] Complete the workflow on Intel macOS or the Intel CI build.
- [ ] Complete the workflow on Windows x64.
- [ ] Complete the workflow on Linux x64.
- [ ] Record tester, project type, app version, platform, blocking issues, and final go/no-go decision below.
- [ ] Run the anonymized Paul deck alignment regression and record joist-corner and deck-board end-flush results below.

## Beta record

- Tester:
- Project:
- Version / platform:
- Blocking issues:
- Non-blocking feedback:
- Paul deck joist-corner result:
- Paul deck board end-flush result:
- Decision: Go / No-go
