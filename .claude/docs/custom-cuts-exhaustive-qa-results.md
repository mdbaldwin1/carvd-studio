# Custom Cuts Exhaustive Qualification Results

## Release qualification

**PASS — Task 6 qualification is complete for this candidate.**

Review-driven remediation is complete at
`753d7d9c675ff00f61ac5890e7de7d797023e6a6`. Four production P0s found or
confirmed by Task 6 are fixed: right-end long-point output, right-end long-point
geometry, patterned recess details, and cutout/notch termination details. The
expanded qualification contains literal independent oracles for every operation,
and the recovered host completed the full desktop gate: 3,766 renderer tests,
213 main-process tests, and 134 real-Electron tests all passed.

P0 means any crash, lost/corrupted feature, wrong face or removal direction, false
valid/invalid geometry, copy/undo/save corruption, valid joinery blocked by
collision handling, or fabrication output that could cause a bad cut.

- Known open product P0: **0**.
- P0 fixes awaiting rerun: **0**.
- Known open P1: **0**.
- Deferred P1: **none**.
- Qualification blocker: **none**.

## Build stamp

| Field                            | Qualified/candidate value                                           |
| -------------------------------- | ------------------------------------------------------------------- |
| Qualification date               | 2026-09-08, America/New_York                                        |
| Starting Task 6 commit           | `e33717b` (`fix: harden paired dowel lifecycle`)                    |
| Last fully green Task 6 baseline | `c472a72912a63ce3ead371602c4558f15ef53e7a`; 133/133 Electron tests  |
| Current candidate                | `753d7d9c675ff00f61ac5890e7de7d797023e6a6`                          |
| OS                               | macOS 26.6.2, build 25G83                                           |
| Architecture                     | arm64                                                               |
| Node / npm                       | v23.10.0 / 10.9.2                                                   |
| Desktop / Electron / Playwright  | 1.3.0 / 41.1.1 / 1.59.1                                             |
| Electron viewport                | 1400 × 900                                                          |
| Candidate static verification    | desktop lint/typecheck/build exit 0; Prettier and diff checks clean |
| Candidate runtime verification   | 3,766 renderer + 213 main + 134 real-Electron tests passed          |

The requested `/tmp/carvd-manual-qa-matrix.md` was absent at Task 6 start and
again at review remediation time. The checked-in Task 6 brief, master plan,
progress ledger, Task 1–5 reports, previous report, and review were used as the
binding matrix.

## Evidence standard

- Playwright drives the built Electron app, real accessible controls, native file
  dialogs, canvas pointer gestures, keyboard shortcuts, and visible Cut List UI.
- Deterministic setup may create stock and stress fixtures, but author/edit,
  validation, preview-handle movement, project save/Home/open, and output
  inspection occur through the application.
- Expected canonical values and fabrication strings are hand-derived literals;
  the tests do not derive expected output with production summary builders.
- Geometry signatures must not be null, `empty`, or `unbounded`; position count
  must be positive, the optional index count a finite nonnegative integer, hash
  and all six bounds finite, and X/Y/Z extents nondegenerate. Non-indexed
  `BufferGeometry` is valid and is qualified by its populated position buffer.
- Native persistence checks parse the written `.carvd` file, navigate Home, open
  through the native dialog, and compare the reopened feature object before the
  operation is finally deleted.

## Exhaustive operation lifecycle matrix

The four exact Electron tests are:

- `qualifies end operations through real Part Cuts controls`
- `qualifies rectangular operations through real Part Cuts controls`
- `qualifies circular operations through real Part Cuts controls`
- `qualifies rounded operations through real Part Cuts controls`

Each row now performs this common UI lifecycle: choose preset and target; author;
save; disable/re-enable; edit all meaningful controls; save the part; native-save
the project; navigate Home; native-open it; assert the exact preserved feature;
open Cut List and assert that operation's literal complete fabrication line;
reopen Part Cuts; duplicate and prove equal value/fresh ID; delete the duplicate;
delete/undo/redo the source with matching geometry signatures; and save the final
empty part. The test is in `packages/desktop/tests/e2e/part-cuts-lifecycle.spec.ts`.

This common lifecycle does **not** claim an invalid-save attempt for every row.
Blocking validation remains covered by dedicated unit/workspace/Electron tests;
the realistic cabinet-panel scenario below also verifies one exact disabled-save
case and two immediate input-boundary constraints.

| Operation         | Exact authored input → exact edited input                                                                               | Exact edited fabrication detail                                                                          | Candidate |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------- |
| Mitre end cut     | L, 31°, back → R, 37°, front                                                                                            | `Mitre 37° on Right End · Long point on Front`                                                           | Passed    |
| Bevel end cut     | L, 17°, top → R, 23°, top                                                                                               | `Bevel 23° bevel on Right End · High point on Top`                                                       | Passed    |
| Compound end cut  | L, 27° back / 13° top → R, 33° front / 19° top                                                                          | `Compound 33° / 19° bevel on Right End · Long point on Front · High point on Top`                        | Passed    |
| Edge bevel        | front 21°, flipped → back 28°, unflipped                                                                                | `Edge Bevel 28° on Back Edge · High point on Bottom`                                                     | Passed    |
| Tenon             | R, 2 × 4, 3/8 thick, shoulder 1 → L, 3 × 5, 1/2 thick, shoulder 2                                                       | `Tenon on Left End · 3" long × 5" wide × 1/2" thick`                                                     | Passed    |
| Half lap          | top 3 × 12 × 1/4 → bottom 4 × 12 × 1/2                                                                                  | `Dado on Bottom Face · 4" wide × 1/2" deep`                                                              | Passed    |
| Corner notch      | front-left 2 × 1 through → back-right 3 × 1 1/2 through                                                                 | `Corner Notch on Back-Right Corner · 3" × 1 1/2" · Through`                                              | Passed    |
| Edge notch        | top-front 2 × 1 at 3 → top-back 3 × 1 1/2 at 5                                                                          | `Edge Notch on Back Side · 3" × 1 1/2" · Through`                                                        | Passed    |
| Cutout            | top 3 × 2 × 1/4 at 2,3 → bottom 4 × 2 1/2 through at 4,4                                                                | `Cutout on Bottom Face · 4" × 2 1/2" · Through`                                                          | Passed    |
| Dado              | top 2 × 12 × 1/4 → bottom 3 × 12 × 1/2                                                                                  | `Dado on Bottom Face · 3" wide × 1/2" deep`                                                              | Passed    |
| Stopped dado      | top 5 × 12 × 1/4 at x=2 → bottom 6 × 12 × 1/2 at x=4                                                                    | `Stopped Dado on Bottom Face · 6" run × 1/2" deep`                                                       | Passed    |
| Rabbet            | top-front 24 × 1 × 1/4 → bottom-back 24 × 1 1/2 × 1/2                                                                   | `Rabbet on Bottom-Back Edge · 1 1/2" shoulder × 1/2" deep`                                               | Passed    |
| Groove            | top 24 × 1 × 1/4 → bottom 24 × 1 1/2 × 1/2                                                                              | `Groove on Bottom Face · 1 1/2" wide × 1/2" deep`                                                        | Passed    |
| Stopped groove    | top 6 × 1 × 1/4 at 2,3 → bottom 7 × 1 1/2 × 1/2 at 4,5                                                                  | `Stopped Groove on Bottom Face · 7" run × 1 1/2" wide × 1/2" deep`                                       | Passed    |
| Mortise           | top 4 × 2 × 1/4 at 3,4 → bottom 5 × 2 1/2 × 1/2 at 5,5                                                                  | `Mortise on Bottom Face · 5" × 2 1/2" × 1/2" deep`                                                       | Passed    |
| Round hole        | top Ø3/8 × 1/4 blind, 7°→30°, at 3,3, linear 3 @ 1 / 15° → bottom Ø1/2 through, 12°→45°, at 5,4, linear 4 @ 1 1/4 / 25° | exact 4-hole Linear Pattern line including target, diameter, spacing, direction, through, tilt           | Passed    |
| Countersink       | top Ø1/4 pilot × 3/8 blind, Ø3/4 / 82°, grid 2×3 → bottom Ø3/8 through, Ø7/8 / 90°, grid 3×2                            | exact 6-hole Grid Countersink line including pilot, major, angle, both spacings, rotation, through, tilt | Passed    |
| Counterbore       | top Ø1/4 × 1/4 blind, bore Ø3/4 × 1/8, circular 3 → bottom Ø3/8 through, bore Ø7/8 × 1/4, circular 4                    | exact 4-hole Circular Counterbore line including pilot, recess, radius, start, through, tilt             | Passed    |
| Rounded slot      | top 3 × 1 × 1/4 at 3,3, 10° → bottom 4 × 1 1/2 through at 5,4, 20°                                                      | `Rounded Slot on Bottom Face · 4" × 1 1/2" · Through`                                                    | Passed    |
| Rounded rectangle | top 3 × 2, radius 1/2, depth 1/4 at 3,3, 10° → bottom 4 × 2 1/2, radius 3/4, through at 5,4, 20°                        | exact target, size, radius, and through termination                                                      | Passed    |

The common duplicate assertion proves value equality and fresh IDs. Deep nested
non-aliasing is intentionally scoped to the representative real main-canvas tests
`duplicates every feature family through the real main-canvas command` and
`copies and pastes all featured families through the real keyboard commands
without aliasing the source`; this report does not claim a nested-field edit for
every one of the 20 lifecycle rows.

## Realistic woodworking matrix

| Scenario                                                                            | Exact executable evidence                                                                                                                                                                                                                         | Status |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Picture-frame mitres, both flip directions, one 45°→30° edit                        | `custom-cuts-assembly.spec.ts` — `authors, rotates, and drags complementary mitres into exact corners for both flip directions`                                                                                                                   | Passed |
| Compound/bevel slopes and flips                                                     | lifecycle test `qualifies end operations through real Part Cuts controls`; production geometry tests `slopes the end plane across thickness for bevel cuts`, `combines mitre and bevel shaping for compound cuts`, and right-end layered variants | Passed |
| Dado/divider: 12 × 6 × 3/4 host, 0.755 × 3/8 dado, nominal/clearance/oversize mates | `custom-cuts-assembly.spec.ts` — `seats nominal and clearance dado fits, rejects an oversized fit, and leaves the host independent`                                                                                                               | Passed |
| Groove, stopped groove, rabbet on 12 × 6 × 3/4 hosts                                | `custom-cuts-assembly.spec.ts` — `seats groove, stopped-groove, and rabbet fits while respecting a stopped termination`                                                                                                                           | Passed |
| Half lap: two 6 × 2 × 3/4 members with 2 × 2 × 3/8 laps and deliberate 1/4 mismatch | `custom-cuts-assembly.spec.ts` — `assembles complementary half laps and persists a user-edited depth mismatch`                                                                                                                                    | Passed |
| Mortise/tenon: 12 × 6 × 1 host and 4 × 2 × 1 rail                                   | `custom-cuts-assembly.spec.ts` — `seats an authored tenon shoulder at the mortise surface`                                                                                                                                                        | Passed |
| Paired dowels: two 10 × 4 × 1 boards; two Ø3/8 × 3/4 dowels; mismatch edit          | `custom-cuts-assembly.spec.ts` — `authors a paired 3/8 inch dowel joint, diagnoses movement, and rejects a 1/4 to 1/2 mismatch`                                                                                                                   | Passed |
| Round holes, countersink/counterbore patterns, rounded openings                     | `part-cuts-lifecycle.spec.ts` — `persists round and rounded operations through save and reopen`, plus the common native lifecycle rows                                                                                                            | Passed |
| Stopped dado, edge notch, corner notch on a 36 × 12 × 3/4 cabinet panel             | `custom-cuts-hands-on-qa.spec.ts` — `qualifies a stopped shelf dado and edge and corner notches on a realistic cabinet panel`                                                                                                                     | Passed |

The cabinet-panel test uses a top stopped dado at x=6, run 8, depth 1/4; proves
that an x=30 entry is constrained to the valid x=28 boundary; then moves it right
and extends it through preview handles to x=6 1/4 and run 8 1/4. It creates a
front edge notch at the nonintersecting x=20 position, 4 × 1 1/2 through, after
proving that x=33 is constrained to the valid x=32 boundary, then re-edits its
width to 1 3/4. Finally it creates a back-right corner notch, rejects a 40-inch
run with the exact blocking validation and disabled Save Cut state, saves 2 1/2 ×
2 through, then re-edits it to 2 1/4 wide. It asserts exact canonical feature
objects, native save/Home/open preservation, finite rendered geometry, and all
three ordered fabrication lines.

## Metric and fractional-inch qualification

Exact test: `custom-cuts-hands-on-qa.spec.ts` — `authors representative
joinery in metric, then re-edits it with fractional-inch input`.

| Workflow        | Metric input → canonical inches                                   | Fractional edit → canonical inches                                          |
| --------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Mitre           | right end, 45°, back → exact target and `horizontalFlip=true`     | 22.5°, front → exact target and `horizontalFlip=false`                      |
| Dado            | 19.05 mm / 6.35 mm → 0.75 / 0.25                                  | 13/16 / 5/16 → 0.8125 / 0.3125                                              |
| Mortise         | 50.8 × 25.4 × 9.525 mm; offsets 152.4/50.8 → 2 × 1 × 0.375 at 6/2 | 2 3/8 × 1 1/8 × 7/16 at 6 1/4 / 2 1/4 → 2.375 × 1.125 × 0.4375 at 6.25/2.25 |
| Front-face hole | Ø6.35 mm × 12.7 mm; offsets 228.6/6.35 → Ø0.25 × 0.5 at 9/0.25    | Ø5/16 × 9/16; offsets 8 1/2 / 3/8 → Ø0.3125 × 0.5625 at 8.5/0.375           |

All target, flip, placement, size, and depth fields above have independent literal
assertions. The final visible Cut List asserts four complete lines, including
`Mitre 22.5° on Right End · Long point on Front`; CSV and PDF assertions verify
the same exact normalized lines. This focused Electron scenario and its full-suite
rerun passed after the right-end production correction.

## Twenty-feature stress qualification

Exact test: `custom-cuts-hands-on-qa.spec.ts` — `keeps a 20-feature part
pickable through orbit, edit, reorder, history, save, reopen, and output`.

The fixture is an 84 × 30 × 1 1/2 board with two end cuts; six 2 × 2 × 1/4
blind cutouts; six round-family operations (plain, countersink, counterbore,
including linear/circular patterns); and six alternating rounded slots and
rectangles. The test uses a real orbit and pick, edits feature 20 from length 4
to 5, moves it 20→19 with undo/redo, creates and deletes a temporary feature 21,
native-saves/reopens, and repicks the reopened part.

The strengthened oracle:

- explicitly rejects null, `empty`, `unbounded`, non-finite, empty-position, or
  degenerate X/Y/Z signatures before edit, after edit, before save, and after
  reopen, while accepting valid indexed and non-indexed geometry;
- asserts exactly 20 enabled cuts after reopen;
- asserts one literal ordered 20-line fabrication summary, including all six
  cutouts, all six round-family members, all six rounded members, patterned
  countersink/counterbore recess details, end-cut direction, blind depths, and
  the 19/20 reorder;
- excludes the temporary duplicate.

Candidate result: **passed in the final 134/134 Electron run**.

## Failure and disposition ledger

### QAF-001 — stale countersink lifecycle depth (test blocker, no product defect)

- Reproduction: `npx playwright test tests/e2e/part-cuts-lifecycle.spec.ts --grep 'qualifies circular operations' --reporter=line`.
- Expected: the valid fixture enables Save Cut.
- Actual: Save Cut was disabled with `Recess depth cannot exceed the blind-hole depth.`
- Root cause: Ø1/4 pilot, Ø3/4 major, 82° needs about 0.2876 inches of recess,
  greater than the old 1/4 blind depth.
- Resolution: fixture depth 1/4→3/8; validation unchanged.
- Regression location: circular row in the common lifecycle matrix.
- Commit: `731daaa`.

### QAF-002 — right-end long-point output inversion (P0, fixed; geometry completed by QAF-005)

- Reproduction: `npx playwright test tests/e2e/custom-cuts-hands-on-qa.spec.ts --grep 'metric, then re-edits' --reporter=line` with a right-end mitre and `Long Point On=front`.
- Expected: inspector, rendered geometry, summary, Cut List, CSV, and PDF all say
  the front is the long point.
- Actual before `8c40a7c`: the inspector and preview annotation said Front, while
  summary/export said Back. The later coordinate audit in QAF-005 proved that the
  actual mesh and collision contours also left Back long; this report previously
  overclaimed that the rendered geometry followed the inspector.
- Root cause: output and two geometry paths used conflicting side-specific
  interpretations of the same `horizontalFlip` value.
- Resolution in `8c40a7c`: summary/output now map flip directly on both ends.
  QAF-005 completes the correction by making actual geometry follow that mapping.
- Regression location: `partFeatureSummary.test.ts`,
  `cutListInstructions.test.ts`, and the metric/fractional Electron scenario.
- TDD evidence: three literal summary/fabrication assertions failed RED; scoped
  units passed 37/37 GREEN; the focused Electron workflow passed 1/1 after build.
- Commit: `8c40a7c`.

### QAF-003 — patterned countersink/counterbore recess omitted (P0, fixed)

- Reproduction: unit fabrication summary for a patterned countersink or
  counterbore with a recess profile.
- Expected: pattern count/spacing plus pilot and complete recess details.
- Actual: pattern branch output only the pilot diameter.
- Root cause: the generic patterned-hole branch bypassed countersink/counterbore
  profile formatting.
- Resolution: patterned instructions retain the operation and recess profile.
- Regression location: `cutListInstructions.test.ts`; per-operation and stress
  Electron literal output oracles.
- TDD evidence: two RED failures; scoped summary/fabrication units passed 38/38
  GREEN.
- Commit: `36fc24f`.

### QAF-004 — cutout/notch termination omitted (P0, fixed)

- Reproduction: worker-free command
  `./node_modules/.bin/esbuild /tmp/carvd-cut-summary-red.ts --bundle --platform=node --format=esm --alias:@renderer=<renderer-src> --outfile=/tmp/carvd-cut-summary-red.mjs && node /tmp/carvd-cut-summary-red.mjs`.
- Expected: `Cutout on Top Face · 3" × 2" × 1/4" deep` (and `· Through`
  for through cutouts/notches).
- Actual: `Cutout on Top Face · 3" × 2"`; blind and through termination were
  indistinguishable.
- Root cause: the generic rectangular summary returned target and size only.
- Resolution: generic cutout/notch output appends exact blind depth or `Through`.
- Regression location: `partFeatureSummary.test.ts`, all-operation lifecycle,
  stress output, and the realistic cabinet-panel Electron scenario.
- TDD evidence: executable RED assertion showed the exact missing suffix; the
  same executable exited 0 GREEN. The complete unit and 134-test Electron gates
  subsequently passed.
- Commit: `92d0f04`.

### QAF-005 — right-end long-point geometry inversion (P0, fixed)

- Reproduction: coordinate oracle on a 24 × 4 blank for left/right ends,
  Front/Back selection, a 45° mitre, and a non-45° 30° compound cut.
- Expected at 45° on the right end: Front selection leaves front x=12 and back
  x=8; Back selection leaves front x=8 and back x=12. At 30°, the short endpoint
  is x=9.690598923. Left-end coordinates remain the established inverse-X cases.
- Actual before the fix: all four left-end cases passed; all four right-end cases
  were reversed. For example, right/Front/45° produced front x=8 and back x=12.
- Root cause: `getEndCutInsetAt` reversed the horizontal interpolation ratio only
  for the right side, while `buildOuterContour` separately reversed the right
  front/back insets. Both contradicted the authoritative editor mapping
  `horizontalFlip=false => Front`.
- Resolution: use one front/back interpolation for both ends and map the right
  outer contour so false leaves Front long. Existing right-end tests and assembly
  fixtures now select the semantic long-point side they intend.
- Regression location: one eight-case table checks literal endpoints in the
  rendered mesh, flat-overlap world contour, and convex snap/collision hull;
  shaped snap and overlap tests cover both 45° directions, 22.5°, edited 30°,
  compound faces, exact contact, and deliberate intrusion. Real Electron covers
  metric/fractional output, native end-operation persistence/output, and both
  picture-frame directions.
- TDD evidence: the new table was RED with 4/8 right-end failures and GREEN 8/8;
  focused geometry/end-cut/snap/overlap passed 260/260; summary/Cut List/preview
  passed 98/98; the final full desktop gate passed.
- Commit: `753d7d9`.

### QAH-001 — asynchronous import/generate controls (harness only)

- Reproduction: initial Task 6 hands-on run before locator waits, using
  `npx playwright test tests/e2e/custom-cuts-hands-on-qa.spec.ts --reporter=line`.
- Expected: automation waits for and clicks every native import and Cut List
  generation control.
- Actual: instantaneous visibility checks could skip a control before render.
- Resolution: required locator waits/direct clicks replaced conditional checks.
- Regression location: `saveProjectTo`, `reopenProject`, and `generateCutList` in
  `custom-cuts-hands-on-qa.spec.ts`.
- Classification: harness only; no application P0/P1 reproduced.

### QAH-002 — ambiguous Cancel locator (harness only)

- Reproduction: `npx playwright test tests/e2e/part-cuts-lifecycle.spec.ts --grep 'qualifies .* operations' --reporter=line` before scoping the duplicate cancel action.
- Expected: cancel only the duplicate editor.
- Actual: strict locator matched project-shell and Part Cuts Cancel buttons.
- Resolution: scope to the accessible `Part cuts for …` region.
- Regression location: `qualifyOperationLifecycle` in
  `part-cuts-lifecycle.spec.ts`.
- Classification: harness only; both controls were legitimate.

### QAH-003 — native-save observation race (harness only)

- Reproduction: the expanded per-operation test's second native save while the
  existing `.carvd` file was being replaced.
- Expected: read the complete newly written file containing the exact feature.
- Actual: an existence-only wait could read the file while truncated, producing
  `Unexpected end of JSON input`.
- Resolution: poll until JSON is parseable and its feature array equals the exact
  expected object.
- Regression location: `saveAndNativeReopen` in
  `part-cuts-lifecycle.spec.ts`.
- Classification: harness only; native application save completed normally.

### QAH-004 — indexed-only stress geometry assertion (harness only)

- Reproduction: first full 134-test Electron run after the host recovered.
- Expected: the 20-feature CSG preview has a populated position buffer, a finite
  deterministic signature, and finite nondegenerate bounds.
- Actual: those conditions held, but the helper failed solely because the valid
  non-indexed `BufferGeometry` reported index count zero.
- Resolution: require positive positions and a finite nonnegative integral
  optional index count; retain explicit rejection of null, `empty`, `unbounded`,
  non-finite, and degenerate geometry.
- Regression location: `expectFiniteNondegenerateGeometrySignature` in
  `custom-cuts-hands-on-qa.spec.ts`.
- Classification: harness only; focused stress rerun and final full run passed.

### QAH-005 — cabinet-panel boundary and conflict fixture assumptions (harness only)

- Reproduction: first recovered-host runs of the realistic cabinet-panel test.
- Expected: exercise credible boundary handling and save three compatible cuts.
- Actual: stopped-dado and edge-notch offsets are constrained immediately to 28
  and 32 rather than reaching invalid Save states. The original final edge-notch
  x=8 also intersected the stopped dado at x=6.25..14.5, so ordered-cut validation
  correctly disabled Save Part.
- Resolution: assert the two exact constrained boundary values; retain the
  corner-notch 40-inch blocking validation and disabled Save Cut assertion; put
  the four-inch edge notch at the nonintersecting x=20 position.
- Regression location: the real-Electron test “qualifies a stopped shelf dado and
  edge and corner notches on a realistic cabinet panel.”
- Classification: harness only; the corrected realistic scenario and full suite
  passed.

### QAE-001 — host process starvation (environmental blocker, resolved)

- Reproduction: focused rounded lifecycle and unit commands on 2026-09-04 while
  `ps` reported 1,522 processes, including 748 unrelated `rg --files` processes.
- Expected: Vitest worker and Electron app start before assertions.
- Actual: Vitest reported `Failed to start forks worker` / `Timeout waiting for
worker to respond`; Playwright timed out in `beforeEach` at
  `launchElectronApp` without reaching an application assertion.
- Resolution: stopped only this task's orphan commands; no unrelated processes
  were changed. The host later recovered and the complete candidate gate passed
  on 2026-09-08.
- Regression location: none; this is not an application defect.

## Verification ledger

| Command                                                                                                | Result                                                                 |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| QAF-005 coordinate table before production change                                                      | RED: 4/8 failed; every right-end literal endpoint was reversed         |
| Same coordinate table after production change                                                          | GREEN: 8/8 passed                                                      |
| focused `endCutUtils` + geometry + snap + overlap Vitest                                               | 260/260 passed                                                         |
| focused summary + Cut List + preview Vitest                                                            | 98/98 passed                                                           |
| fresh desktop build                                                                                    | exit 0                                                                 |
| focused metric/fabrication/mitre real Electron                                                         | 4/4 passed in 19.3s                                                    |
| focused native end-operation lifecycle real Electron                                                   | 1/1 passed in 11.9s                                                    |
| first complete recovered-host run                                                                      | renderer 3,766/3,766; main 213/213; Electron 132/134, two harness REDs |
| corrected 20-feature stress scenario                                                                   | 1/1 passed                                                             |
| corrected realistic cabinet-panel scenario                                                             | 1/1 passed in 5.6s                                                     |
| `npm run lint --workspace=@carvd/desktop`                                                              | exit 0                                                                 |
| `npm run typecheck --workspace=@carvd/desktop`                                                         | exit 0                                                                 |
| final `npm test --workspace=@carvd/desktop`                                                            | 3,766/3,766 renderer + 213/213 main + 134/134 Electron passed; exit 0  |
| direct Prettier on changed production/test/CHANGELOG files; pre-commit staged-file checks; diff checks | exit 0                                                                 |

## Commits

| Commit    | Purpose                                                                                               |
| --------- | ----------------------------------------------------------------------------------------------------- |
| `731daaa` | Correct stale countersink lifecycle input                                                             |
| `cf5cf5f` | Add metric/fractional and 20-feature Electron qualification                                           |
| `c472a72` | Add per-operation duplicate value/identity coverage                                                   |
| `8c40a7c` | Align right-end long-point fabrication output with UI/rendering                                       |
| `36fc24f` | Retain patterned countersink/counterbore recess details                                               |
| `92d0f04` | Add cutout/notch through or blind-depth instructions                                                  |
| `5e45484` | Add native per-operation output/persistence, strict stress, and realistic cabinet-panel qualification |
| `753d7d9` | Align actual right-end long-point geometry and collision contours with editor/output semantics        |

`CHANGELOG.md` records all four user-visible production corrections.

## Residual ruling

- No known production P0 or P1 remains in the candidate code.
- P1 deferral count is zero.
- Release qualification is **PASS** for the tested candidate: unit, lint,
  typecheck, build, focused Electron, and the full Electron suite are green.
- The missing temporary matrix and resolved host blocker remain disclosed.
- This report is not authorization to merge, release, tag, or publish.
