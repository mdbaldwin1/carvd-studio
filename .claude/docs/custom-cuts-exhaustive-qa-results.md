# Custom Cuts Exhaustive Qualification Results

## Release qualification

**PASS** — the qualified build has no open Custom Cuts P0 or P1 findings.

The complete real-Electron suite passed **133/133** after a fresh build from
`c472a72912a63ce3ead371602c4558f15ef53e7a`. All 20 operation scenarios passed
their UI lifecycle, the metric/fractional and 20-feature stress scenarios passed,
and the realistic joinery scenarios passed. No production change was needed during
Task 6.

Per the plan, a P0 is any crash, lost or corrupted feature, wrong face/removal
direction, false valid/invalid geometry, copy/undo/save corruption, valid joinery
blocked by collision handling, or fabrication output that could cause a bad cut.
None remained after the rerun.

## Build stamp

| Field                           | Qualified value                                                           |
| ------------------------------- | ------------------------------------------------------------------------- |
| Qualification date              | 2026-09-04, America/New_York                                              |
| Final code under test           | `c472a72912a63ce3ead371602c4558f15ef53e7a`                                |
| Starting Task 6 commit          | `e33717b` (`fix: harden paired dowel lifecycle`)                          |
| OS                              | macOS 26.6.2, build 25G83                                                 |
| Architecture                    | arm64                                                                     |
| Node / npm                      | v23.10.0 / 10.9.2                                                         |
| Desktop / Electron / Playwright | 1.3.0 / 41.1.1 / 1.59.1                                                   |
| Electron viewport               | 1400 × 900, as configured by the desktop E2E launcher                     |
| Fresh build evidence            | 466 main, 2 preload, and 2,931 renderer modules transformed; build passed |
| Final Electron evidence         | 133 passed in 2.2 minutes                                                 |

The requested `/tmp/carvd-manual-qa-matrix.md` was not present at Task 6 start
or report time. The checked-in Task 6 brief, master plan, progress ledger, and Task
1–5 reports were present and were treated as the binding matrix. This report makes
that reconstructed matrix explicit so the missing temporary file does not hide a
coverage gap.

## Method and evidence standard

- Playwright drove the built Electron application, accessible controls, file
  dialogs, canvas pointer gestures, keyboard shortcuts, and Cut List UI.
- Real UI authored and edited all operation lifecycles. Store reads were limited to
  deterministic fixture setup or exact post-action inspection; they did not replace
  user actions under qualification.
- Geometry was checked through the deterministic signature of the same rendered
  geometry used by the Part Cuts preview. Main-canvas orbit, selection, move, and
  rotation scenarios used pointer or keyboard gestures against real rendered parts.
- Project persistence used native dialog-backed save/open flows and exact serialized
  feature comparisons. Fabrication evidence used the visible Cut List and existing
  CSV/PDF round-trip scenarios.
- Common canvas gestures were exercised on representative feature-bearing parts,
  while state and accessible-control assertions were exhaustive per operation. This
  follows the approved pre-flight ruling; repeating an identical pointer gesture for
  every operation would not add operation-specific evidence.

## Exhaustive operation lifecycle matrix

Every row passed this common UI lifecycle: choose the preset/target; author and
save; disable; save part and reopen; re-enable; edit every meaningful exposed
control; save and reopen; verify the exact persisted object and rendered geometry;
duplicate from the cut menu; prove all fields are identical except for a fresh ID;
delete the duplicate without changing the source; delete the source; undo and redo
the deletion with matching geometry signatures; and save the final empty part.

All measurements below are inches unless marked as degrees. `T/B/L/R/F/Bk` mean
top, bottom, left end, right end, front, and back.

| Operation         | Exact authored input → exact edited input                                                                                                                                                                              | Result |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Mitre end cut     | L, 31°, long point back → R, 37°, long point front                                                                                                                                                                     | PASS   |
| Bevel end cut     | L, 17°, high point top → R, 23°, high point top                                                                                                                                                                        | PASS   |
| Compound end cut  | L, mitre 27° back, bevel 13° top → R, mitre 33° front, bevel 19° top                                                                                                                                                   | PASS   |
| Edge bevel        | front edge, 21°, flipped → back edge, 28°, unflipped                                                                                                                                                                   | PASS   |
| Tenon             | R, 2 × 4, 3/8 thick, shoulder 1 → L, 3 × 5, 1/2 thick, shoulder 2                                                                                                                                                      | PASS   |
| Half lap          | T, run 3 × full width 12, depth 1/4 → B, run 4 × 12, depth 1/2                                                                                                                                                         | PASS   |
| Corner notch      | front-left, 2 × 1 through → back-right, 3 × 1 1/2 through                                                                                                                                                              | PASS   |
| Edge notch        | top-front, 2 × 1 through, offset 3 → top-back, 3 × 1 1/2 through, offset 5                                                                                                                                             | PASS   |
| Cutout            | T, 3 × 2 × 1/4 blind at 2,3 → B, 4 × 2 1/2 through at 4,4                                                                                                                                                              | PASS   |
| Dado              | T, run 2 × full width 12, depth 1/4 → B, run 3 × 12, depth 1/2                                                                                                                                                         | PASS   |
| Stopped dado      | T, 5 × 12 × 1/4 at x=2 → B, 6 × 12 × 1/2 at x=4                                                                                                                                                                        | PASS   |
| Rabbet            | top-front, 24 × 1 × 1/4 → bottom-back, 24 × 1 1/2 × 1/2                                                                                                                                                                | PASS   |
| Groove            | T, 24 × 1 × 1/4 → B, 24 × 1 1/2 × 1/2                                                                                                                                                                                  | PASS   |
| Stopped groove    | T, 6 × 1 × 1/4 at 2,3 → B, 7 × 1 1/2 × 1/2 at 4,5                                                                                                                                                                      | PASS   |
| Mortise           | T, 4 × 2 × 1/4 at 3,4 → B, 5 × 2 1/2 × 1/2 at 5,5                                                                                                                                                                      | PASS   |
| Round hole        | T, Ø3/8 × 1/4 blind, tilt 7° toward 30°, at 3,3, linear 3 @ 1 / 15° → B, Ø1/2 through, tilt 12° toward 45°, at 5,4, linear 4 @ 1 1/4 / 25°                                                                             | PASS   |
| Countersink       | T, pilot Ø1/4 × 3/8 blind, tilt 4° toward 20°, major Ø3/4 / 82°, at 3,3, grid 2×3 @ 1×1 1/4 → B, pilot Ø3/8 through, tilt 9° toward 35°, major Ø7/8 / 90°, at 5,2, grid 3×2 @ 1 1/4×1 1/2                              | PASS   |
| Counterbore       | T, pilot Ø1/4 × 1/4 blind, tilt 5° toward 25°, bore Ø3/4 × 1/8, at 4,4, circular 3 / radius 1 / start 15° → B, pilot Ø3/8 through, tilt 10° toward 40°, bore Ø7/8 × 1/4, at 6,4, circular 4 / radius 1 1/4 / start 30° | PASS   |
| Rounded slot      | T, 3 × 1, radius 1/2, depth 1/4, at 3,3, rotation 10° → B, 4 × 1 1/2, radius 3/4, through, at 5,4, rotation 20°                                                                                                        | PASS   |
| Rounded rectangle | T, 3 × 2, radius 1/2, depth 1/4, at 3,3, rotation 10° → B, 4 × 2 1/2, radius 3/4, through, at 5,4, rotation 20°                                                                                                        | PASS   |

Feature-bearing part copy, paste, move, resize, X/Y/Z rotation, pickability, and
undo/redo were additionally covered by the full-suite `canvas-transforms.spec.ts`
scenarios. Exact feature IDs were regenerated for duplicates/copies while nested
circular and rounded payloads remained independent. Saved-operation output and
enabled/disabled filtering were covered by `part-cuts-lifecycle.spec.ts` and the
hands-on scenarios below.

## Realistic woodworking matrix

| Scenario and exact inputs                                                                                                                                                                                         | Observable acceptance evidence                                                                                                                                                             | Result |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| Picture-frame mitres: two 10 × 2 × 1 boards, right-end 45° cuts; front-long-point pair rotated +90° and assembled at 4,0.5,4; back-long-point pair rotated -90° and assembled at 4,0.5,-4; one saved edit 45°→30° | Real Cut UI authoring, keyboard rotation, real canvas selection/drag, complete live-preview/release transform agreement, no overlap, no collision warning                                  | PASS   |
| Compound/bevel planes: complementary 30° bevels and complementary 22.5° mitre + 15° bevel compound faces; lifecycle edit 27°/13°→33°/19°                                                                          | Real Electron controls/persistence plus deterministic production snap-plane tests proved exact X/Y/Z assembly positions and rendered slopes/flips                                          | PASS   |
| Dado/divider: 12 × 6 × 3/4 host, 0.755-wide × 3/8-deep full-width dado at x=5.6225; 3/4 nominal and 0.74 clearance dividers seated at y=2.375; 0.80 oversized divider rejected from that seat                     | Real rotation/drag; host ID present at preview, release, and commit collision boundaries; exact XYZ; no overlap warning; resizing host left mate and feature payload independent           | PASS   |
| Groove/back, stopped groove, rabbet: 12 × 6 × 3/4 hosts, 0.755-wide × 3/8-deep sockets; groove z=2.6225; stopped groove length 4 at x=4,z=2.6225; rabbet on top-front edge; 3/4 mates                             | Real X rotation and front-view drag seated valid mates at y=2.375; a mate beyond the stopped termination remained above y=2.74 and x>5                                                     | PASS   |
| Half lap: two 6 × 2 × 3/4 members, opposing 2 × 2 × 3/8 laps at x=2; mate rotated 90° and assembled at 4,0.375,4; edited one depth to 1/4                                                                         | Exact assembly passed; the mismatch persisted and the UI reported overlap with Half Lap Host                                                                                               | PASS   |
| Mortise/tenon: 12 × 6 × 1 host, 0.51 × 1.01 × 3/4 mortise at 5.745,2.495; 4 × 2 × 1 rail, 3/4 × 1 × 1/2 left-end tenon with 1/2 shoulder                                                                          | Real Z rotation/drag seated at 4,2.25,4; computed shoulder y=1 matched host surface; no overlap warning                                                                                    | PASS   |
| Multiple-face holes and patterns                                                                                                                                                                                  | Top→bottom round-hole lifecycle used linear 3→4; countersink used grid 2×3→3×2; counterbore used circular 3→4; the metric scenario also authored a front-face hole                         | PASS   |
| Paired dowels: two 10 × 4 × 1 boards at y=0 and y=1; four Ø3/8 × 3/8 blind holes; two 3/4 dowels with 3/8 embedment per side; centers x=-4,-2                                                                     | Real wizard, canvas move away/back, aligned visualization, exact diameter/axis/embedment, copy/delete/undo relationship lifecycle; deliberate Ø1/4↔Ø1/2 edit remained diagnosed as invalid | PASS   |
| Countersink/counterbore, rounded slot/rectangle, cutout, edge/corner notch                                                                                                                                        | Exact per-operation author/edit/duplicate/delete/persist/geometry lifecycle above; representative patterns and stress output below                                                         | PASS   |

## Metric and fractional-inch qualification

One stocked part was edited through the real Project Settings and Part Cuts UI.
The metric entries were saved, inspected in canonical inches, then re-edited using
fractional-inch text. The final project was saved through the native dialog, reopened
byte-for-byte at the feature JSON boundary, and inspected in the Cut List.

| Workflow        | Metric input and canonical value                                            | Fractional edit and canonical value                                         | Result |
| --------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------ |
| Mitre           | right end, 45°, long point back                                             | 22.5°, long point front                                                     | PASS   |
| Dado            | 19.05 mm wide = 0.75; 6.35 mm deep = 0.25                                   | 13/16 = 0.8125; 5/16 = 0.3125                                               | PASS   |
| Mortise         | 50.8 × 25.4 mm = 2 × 1; depth 9.525 mm = 0.375; offsets 152.4/50.8 mm = 6/2 | 2 3/8 × 1 1/8 = 2.375 × 1.125; depth 7/16 = 0.4375; offsets 6 1/4 and 2 1/4 | PASS   |
| Front-face hole | Ø6.35 mm = 0.25; depth 12.7 mm = 0.5; offsets 228.6/6.35 mm = 9/0.25        | Ø5/16 = 0.3125; depth 9/16 = 0.5625; offsets 8 1/2 and 3/8                  | PASS   |

The visible Cut List retained all four final labels and displayed the expected
`13/16" wide × 5/16" deep` and `5/16" diameter` operation text.

## Twenty-feature stress qualification

The fixture was one **84 × 30 × 1 1/2** stocked board at `0,0.75,0` with:

- Two end operations: left 12.5° mitre and right 15°/5° compound cut.
- Six top-face 2 × 2 × 1/4 blind cutouts at x=`5,17,29,41,53,65`, z=`2`.
- Six top-face round-family operations at primary=`-30,-18,-6,6,18,30`,
  secondary=`10`: repeating round hole/countersink/counterbore, Ø1/4 × 1/2
  blind, tilts=`0..5°`, directions=`0,15,30,45,60,75°`. Countersinks used
  Ø1/2 / 90°; counterbores used Ø1/2 × 1/8. Member 5 used a 3-hole linear
  pattern at spacing 1; member 6 used a 4-hole circular pattern at radius 1
  and start 30°.
- Six top-face alternating rounded slots/rectangles at the same primary values,
  secondary=`-5`, rotations=`0,5,10,15,20,25°`, length 4, width 1, depth 3/8;
  slots used radius 1/2 and rectangles radius 1/4.

The real canvas orbit changed camera vectors; a real click selected the rendered
part. The preview exposed a non-empty geometry signature and exactly 20 enabled
cuts. Feature 20 was edited from length 4→5 and relabeled, moved 20→19, undone,
and redone. Feature 3 was duplicated to feature 21, moved to offsets 76,5,
saved, then deleted back to 20. After native save/open, serialized features were
identical, the reopened geometry signature matched, the part remained canvas-
pickable, and fabrication output showed representative labels from every feature
family while excluding the temporary duplicate.

Result: **PASS** — no crash, stale selection, corrupt mesh, lost edit, order drift,
or fabrication omission was observed.

## Failure and disposition ledger

### QAF-001 — stale countersink lifecycle depth (qualification blocker, not product defect)

- Reproduction: fresh Electron build, then
  `npx playwright test tests/e2e/part-cuts-lifecycle.spec.ts --grep 'qualifies circular operations' --reporter=line`.
- Actual: Save Cut was disabled and the inspector displayed
  `Recess depth cannot exceed the blind-hole depth.` at the former lifecycle line 935.
- Expected: a valid countersink fixture should save so the circular lifecycle can
  continue.
- Root cause: pilot Ø1/4, major Ø3/4, included angle 82° creates a recess depth of
  `(0.75 - 0.25) / (2 × tan(41°)) ≈ 0.2876`, which correctly exceeds the old
  1/4 blind-hole depth. Validation added earlier was correct; the test input was
  stale.
- Fix: changed only that fixture's blind depth from 1/4 to 3/8. No production code
  or validation was weakened.
- TDD evidence: RED reproduced the disabled control and exact validation message;
  GREEN passed the focused circular test; the first full suite passed 131/131.
- Commit: `731daaaf029365298d36bf6dc43debe9f31266dd`
  (`test: use valid countersink lifecycle depth`).

### QAH-001 — late import/generate controls (test harness only)

- Early Task 6 automation used instantaneous visibility checks for dialogs/buttons
  that are rendered asynchronously, so it could skip an action before the control
  appeared.
- Required locator waits and direct clicks replaced conditional checks. The native
  save/open import prompt is now always completed through its Skip button.
- Classification: not a product P0/P1; no user-facing failure was reproduced.

### QAH-002 — ambiguous Cancel locator (test harness only)

- The first duplicate-lifecycle run reached the duplicate data assertions, then a
  strict locator matched both the project-shell and Part Cuts Cancel buttons.
- The locator was scoped to the accessible `Part cuts for …` region. The same four
  family tests then passed 4/4.
- Classification: not a product P0/P1; accessibility exposed two legitimate controls.

## Verification ledger

| Command                                                                                                                                             | Result                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `npx playwright test tests/e2e/part-cuts-lifecycle.spec.ts --grep 'qualifies circular operations' --reporter=line` after countersink correction     | 1/1 passed in 7.0s                                                     |
| `npm run test:e2e -- --reporter=line` after countersink correction                                                                                  | 131/131 passed in 2.1m                                                 |
| `npx playwright test tests/e2e/custom-cuts-hands-on-qa.spec.ts --reporter=line`                                                                     | 2/2 passed in 7.0s                                                     |
| `npx playwright test tests/e2e/part-cuts-lifecycle.spec.ts --grep 'qualifies .* operations' --reporter=line` after per-operation duplicate coverage | 4/4 passed in 16.3s                                                    |
| `npm run test:e2e -- --reporter=line` from `c472a729…` (includes a fresh Electron build)                                                            | 133/133 passed in 2.2m                                                 |
| `npm run lint --workspace=@carvd/desktop`                                                                                                           | exit 0                                                                 |
| `npm run typecheck --workspace=@carvd/desktop`                                                                                                      | exit 0                                                                 |
| `npm run test:unit --workspace=@carvd/desktop`                                                                                                      | renderer 174 files / 3,754 tests; main 9 files / 213 tests; all passed |
| `npm run build --workspace=@carvd/desktop`                                                                                                          | exit 0                                                                 |

The full Electron run emitted four existing `net::ERR_FILE_NOT_FOUND` console
lines in analytics/export scenarios. Those scenarios and the suite passed, no page
error was reported, and the same known export-time observation was recorded before
Task 6. It is not a Custom Cuts functional failure and is not classified as a P1
for this task.

## Commits and release notes

| Commit    | Purpose                                                             |
| --------- | ------------------------------------------------------------------- |
| `731daaa` | Correct the stale countersink lifecycle fixture                     |
| `cf5cf5f` | Add metric/fractional and 20-feature real-Electron qualification    |
| `c472a72` | Add explicit duplicate/deep-copy proof to every operation lifecycle |

`CHANGELOG.md` was intentionally not changed in Task 6. All three commits are test
and evidence corrections; there was no user-visible production fix to announce.

## Residuals and final ruling

- Open P0: **0**.
- Open P1: **0**.
- Deferred P1: **none**.
- No Custom Cuts production defect was found during Task 6.
- The temporary manual-matrix source was absent, but its required coverage is
  explicitly reconstructed and passed above.
- This is a qualification result, not authorization to merge, release, tag, or
  publish.
