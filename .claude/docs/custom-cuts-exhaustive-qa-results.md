# Custom Cuts Exhaustive Qualification Results

## Release qualification

**Closure review remediation gates PASS — unreleased.**

Closure review identified two Important findings (disconnected-stock collision
and patterned-cut performance) plus one Minor malformed-offset finding. All
three were independently reproduced RED and fixed test-first at
`44033dda82398fd60f0e47883f5da6347706d27c`. The fresh complete desktop gate
passed **4,287 renderer tests, 213 main-process tests, and all 135 real-Electron
tests**. This round adds 110 renderer tests covering multi-component collision,
16/128-hole geometry performance with physical oracles, 128-counterbore
face/flip combinations, a nearly meeting end-plane case, malformed offsets,
and actual author/final-save controls. No requested finding is deferred.
Original R1–R15, scoped A–D, Q1–Q11 and round 3 regressions remain covered;
this remediation performed an adjacent self-audit, not another independent
review. See complete RED/GREEN, root-cause, timing, oracle reconciliation and
gate mapping in the
[round 4 remediation report](../../.superpowers/sdd/2026-09-04-custom-cuts-exhaustive-qualification/task-7-remediation-round-4-report.md).

P0 means any crash, lost/corrupted feature, wrong face or removal direction, false
valid/invalid geometry, copy/undo/save corruption, valid joinery blocked by
collision handling, or fabrication output that could cause a bad cut.

- Known open product P0: **0**.
- P0 fixes awaiting rerun: **0**.
- Known open P1: **0**.
- Deferred P1: **none**.
- Qualification blocker: **none**.

## Build stamp

| Field                           | Qualified/candidate value                                           |
| ------------------------------- | ------------------------------------------------------------------- |
| Qualification date              | 2026-09-09, America/New_York                                        |
| Starting Task 7 commit          | `6b9898897c14089d72291c3874211e97328f6b87`                          |
| Qualified code candidate        | `44033dda82398fd60f0e47883f5da6347706d27c`                          |
| Comparison base                 | `origin/develop` at `459b6a5177b9`; local `develop` was stale       |
| OS                              | macOS 26.6.2, build 25G83                                           |
| Architecture                    | arm64                                                               |
| Node / npm                      | v23.10.0 / 10.9.2                                                   |
| Desktop / Electron / Playwright | 1.3.0 / 41.1.1 / 1.59.1                                             |
| Electron viewport               | 1400 × 900                                                          |
| Candidate static verification   | desktop lint/typecheck/build exit 0; Prettier and diff checks clean |
| Candidate runtime verification  | 4,287 renderer + 213 main + 135 real-Electron tests passed          |

The requested `/tmp/carvd-manual-qa-matrix.md` was absent at Task 6 start and
again at review remediation time. The checked-in task briefs, master plan,
progress ledger, Task 1–6 reports, previous report, and review were used as the
binding matrix. Task 7 independently reviewed the complete branch diff and
re-ran every configured desktop gate.

## Task 7 final audit rulings

- The comparison base is the merge-base/current remote-tracking
  `origin/develop` commit `459b6a5177b9feb0904b73c7df18d5103cb8e3a6`;
  the local `develop` ref was stale and was not used.
- At Task 7 entry commit `6b9898897c14089d72291c3874211e97328f6b87`,
  `git diff --shortstat origin/develop...HEAD` reported 174 files, 38,491
  insertions, and 1,118 deletions across 151 commits. The qualification-only
  Tasks 1–6 range, `64907aac..6b989889`, reported 67 files, 10,585 insertions,
  and 613 deletions.
- The full branch and the qualification-only range were reviewed for scope,
  unexpected file modes, generated artifacts, focused/skipped tests, debug
  residue, sensitive filenames, and common secret signatures. No secret,
  generated-output, or unrelated Task 1–6 change was found. Historical Beads,
  `.codex`, dependency, website, and version changes all predated Task 1 and were
  not modified by Task 7.
- QAF-007 was the only finding at the initial Task 7 checkpoint. The later
  whole-branch review added R1–R14 Important and R15 Minor findings. All 15
  were subsequently reproduced and fixed test-first. The scoped re-review then
  found four residual Important issues; all four were fixed test-first at
  `db9dcd7`, including extended bore-envelope probes. No requested finding
  remains open or deferred. The follow-up explicitly self-audits all R1–R15 and
  A–D findings; no additional reviewer seat was used.
- Independent review pass 2 then added eleven Important findings. Their fixes
  at `28d81ab` preserve actual intersecting solids and authored measurements,
  validate complete bore/hardware envelopes, and surface actionable cut errors.
  All eleven plus confirmed UX findings are closed, with no P0/P1 deferred.
  The complete configured rerun passed 4,066 renderer, 213 main, and 135 Electron
  tests (Electron 3.2 minutes). Two earlier aggregate fixture failures are
  recorded explicitly in the round 2 report: an actually removed metric hole
  position, and an unfinished first-save library-import prompt. Neither was
  solved by relaxing production validation or bypassing a prompt/assertion.
- The application version remains 1.3.0. Task 7 did not bump a version, change
  release state, merge, push, open a PR, tag, package, publish, or release.
- The post-fix review closed Q1–Q11 and added three Important findings and one
  Minor finding. All four were reproduced RED and fixed at `16e5827`. Mixed
  collision hulls now follow the clipped solid; complete blind pocket support
  covers rounded and rectangular families; the no-material guard covers every
  supported removal family; copied/renamed cuts reuse geometry. The fresh full
  gate passed 4,177 renderer, 213 main and 135 Electron tests (2.5 minutes).
  The earlier 134/135 Electron run identified an actually unsupported stress
  pocket, not a validation regression: the fixture now verifies rejection at
  offset 76, then corrects to 74 and continues every original downstream action.
  The focused flow passed 1/1 before the fresh complete rerun. Full details and
  literal stock-plane arithmetic are retained in the round 3 report.
- Closure review added E/F Important and G Minor. All three and an adjacent
  near-meeting-plane performance defect were independently RED before their
  fixes at `44033dd`. The final gate passed 4,287 renderer, 213 main and all 135
  Electron tests (2.3m), followed by production-only build and analytics-boundary
  verification. Two legacy cap-extreme tests now sample the actual cap instead
  of a one-percent thickness band, retaining their literal end-X expectations.
  The preceding 4,286/213/135 snapshot is retained as historical evidence, not
  substituted for the final rerun after the adjacent correction.

## Evidence standard

The latest round adds 110 renderer tests: 27 disconnected-stock collision
cases, 19 physical/performance cases, and 64 malformed-coordinate cases. The
fixed 16-hole compound fixture took 4,423.8ms before the fix; the final focused
run measured 8.2ms for 16 holes and 42.5ms for 128 holes, plus 2.8/9.5ms for
downstream collision and validation. The near-meeting end-plane fixture took
3,645.3ms RED and 5.4ms GREEN. Literal solid volumes, end-plane and recess-floor
rays, all 128 hole axes and vertex containment protect geometry correctness.
Current raw logs are `/tmp/carvd-review-round4.wwm4Cd`; production-only build,
analytics boundary, formatting, diff/scope and added-line secret audits passed.

Round 3 added 111 renderer tests: 65 collision cases, including 64
end/edge/flip/boundary combinations in both orders; 33 rounded/rectangular
pocket support and actual save-flow cases; three empty-solid cases; and ten
cache reuse/invalidation cases. Original review defects were independently
RED before their fixes; broad affected coverage passed 785/785 across 12 files.
Historical raw logs are `/tmp/carvd-review-round3.PmTCyH`. After Electron, the
production-only build passed (465 main, 2 preload, 2,934 renderer modules) and
the analytics test-control boundary check passed. Added-line credential,
focused/skipped-test, debugger, scope and diff checks were clean.

Round 2 added 96 end/edge plane combinations with exact integrated
volume and literal rays, both-end tenon composition, continuous Top/Bottom
countersink walls, sub-thousandth blind floors, .755/.74-inch input preservation
in both units, rounded-profile support/tangency, complete pattern equivalence,
physical dowel interference, and a blind bore crossing a tenon shoulder between
two valid caps. Save Cut, Save Part, main-canvas resize, and Cut List gates are
covered. Unit announcements, toggle states, specific invalid-operation feedback,
and a direct Fix cut action are verified through semantic controls. Historical
raw logs are `/tmp/carvd-review-round2.4FPEbV`; production-only rebuild and
analytics E2E boundary checks passed after Electron. The following historical
evidence remains relevant and is retained rather than recharacterized as new.

The whole-branch remediation adds numeric solid-volume and real ray-hit
regressions (38 in³ for two exterior removals; 34 in³ for intersecting interior
removals; 39.75 in³ for the imported blind corner), all-six-face reflected grid
and bore-axis checks, assembly-local identity/legacy recovery, exact-size dowel
fit with explicit end clearance, and full precision/placement output. Expected
fabrication lines in the existing Electron lifecycle and hands-on tests now
include physical reference edges and coordinates. Both PDF variants are tested
with two separately identified 35-operation parts and their continuation pages
were rendered and visually inspected. The remediation report records each
original failure, file mapping, final gate, and the scope/security audit.

The scoped follow-up additionally checks literal reflected side-pocket/end-plane
coordinates, axial recess floor and cone-wall ray hits, complete pilot/cone entry
envelopes, physical dowel grouping without UUID dependence, and exact blind-notch
entry-face text. All four changed fabrication pages (Cut List page 1 and Project
Report page 2 for dowels/notches) were rendered and inspected: separate 3/8-inch
and 1/2-inch dowel instructions, distinct Top-Front/Bottom-Front blind notches,
readable complete text, and no clipping or overlap.

Follow-up focused gate: 282/282 tests across seven suites. The first aggregate
attempt during host slowdown passed 3,708 tests but had six worker-startup
timeouts; no assertion failed. The unchanged configured aggregate rerun on the
standard login runtime passed 3,891 renderer, 213 main, and all 135 Electron
tests (2.3 minutes). Desktop lint/typecheck/configured formatting and clean
production build/analytics-boundary verification pass. No timeout, skip, or
assertion was weakened to recover the run.

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

Candidate result: **passed in the final 135/135 Electron run**.

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

### QAF-006 — layered compound cuts lost their vertical bevel (P0, fixed)

- Reproduction: render a 24 × 4 × 1 board with a right-end 45° mitre / 45°
  bevel compound cut (`horizontalFlip=false`, `verticalFlip=false`) plus any
  enabled rectangular, circular, or rounded feature, which selects the layered
  geometry path.
- Expected: the rendered Front top/bottom endpoints are x=12/11 and the Back
  endpoints are x=8/7, exactly matching the compound snap/collision hull.
- Actual before the fix: the rendered Front endpoints were x=12/12 and Back
  endpoints were x=8/8. The horizontal mitre remained visible, but the vertical
  bevel was absent; editing `High Point On` in the real Electron preview left its
  geometry signature unchanged.
- Root cause: layer extrusion uses `rotateX(-π/2)`, which mirrors contour Z into
  rendered Z. `applyVerticalEndCuts` passed that rendered Z unchanged to
  `getEndCutInsetAt`, whose Front/Back interpolation contract is contour-space Z.
  With a nonzero mitre, its boundary match therefore looked at the opposite edge
  and did not displace the bevel vertices.
- Resolution: convert rendered Z back to contour Z once in
  `applyVerticalEndCuts` and use that coordinate for all left/right base-boundary
  and vertex-inset calculations.
- Regression location: 24 literal coordinate cases cover both ends, both
  horizontal directions, both vertical directions, and rectangular, circular,
  and rounded secondary families. Every case compares actual mesh top/bottom
  Front/Back endpoints to hand-derived literals and to the convex snap/collision
  plane. The real-Electron test
  `keeps both mitre and bevel changes visible for a compound end layered with a dado`
  authors both cuts, proves High Point and Long Point edits each change the
  nondegenerate preview geometry, then native-saves, closes, reopens, and verifies
  the exact retained controls and geometry.
- TDD evidence: before production changed, all 24 coordinate rows failed on the
  missing bevel displacement and the Electron preview retained the exact
  unchanged signature
  `72:0:4062615477:-12.0000,-0.5000,-2.0000,12.0000,0.5000,2.0000` after Top →
  Bottom. After the fix, 24/24 coordinate rows and the Electron scenario passed.
  Focused geometry/bundle/snap/overlap passed 324/324; the 20-feature stress and
  new scenario passed 2/2; full renderer, main, and Electron suites passed
  3,788/3,788, 213/213, and 135/135 respectively.
- Commit: `15c7034`.

### QAF-007 — final round-cut validation gap (P0, fixed)

- Reproduction: validate a 4 × 4 part after loading or resizing it with either a
  5-inch-diameter circular cut or a 5 × 2 rounded rectangle, then save Part Cuts
  or generate a Cut List.
- Expected: both final boundaries reject the out-of-bounds operation with the
  existing circular/rounded validation message and keep Part Cuts open.
- Actual before the fix: both boundaries validated enabled `rect_cut` features
  only, so the invalid circular or rounded feature was accepted.
- Root cause: `usePartCutsEditing.saveAndExit` and
  `validatePartsForCutList` explicitly skipped every feature kind except
  `rect_cut`, although the authoring workspace already dispatched all three
  feature families to their validators.
- Resolution: both final boundaries now dispatch enabled rectangular, circular,
  and rounded features to the existing family-specific validators.
- Regression location: `usePartCutsEditing.test.ts` proves an invalid circular
  draft cannot be saved; `projectStore.test.ts` proves oversized circular and
  rounded features block Cut List generation.
- TDD evidence: the new focused cases were RED at exactly 3 failed / 149 passed /
  152 total. After the production fix and one expected-message literal
  correction, the focused suite passed 152/152. The final full desktop gate
  passed 3,791/3,791 renderer, 213/213 main, and 135/135 Electron tests.
- Commit: `bd62e06`.

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
| round-2 `npm test --workspace=@carvd/desktop`                                                          | 3,766/3,766 renderer + 213/213 main + 134/134 Electron passed; exit 0  |
| QAF-006 layered compound coordinate table before production change                                     | RED: 24/24 failed on rendered bevel coordinates; hull literals passed  |
| QAF-006 real-Electron scenario before production change                                                | RED: High Point edit left the exact geometry signature unchanged       |
| QAF-006 layered compound coordinate table after production change                                      | GREEN: 24/24 passed                                                    |
| focused `endCutUtils` + geometry + box bundle + snap + overlap Vitest                                  | 324/324 passed                                                         |
| focused layered compound + 20-feature stress real Electron                                             | 2/2 passed in 5.1s                                                     |
| round-3 full renderer Vitest                                                                           | 3,788/3,788 passed                                                     |
| round-3 full main-process Vitest                                                                       | 213/213 passed                                                         |
| round-3 full real-Electron Playwright                                                                  | 135/135 passed in 2.3m                                                 |
| round-3 desktop lint / typecheck / build                                                               | all exited 0                                                           |
| direct Prettier on changed production/test/CHANGELOG files; pre-commit staged-file checks; diff checks | exit 0                                                                 |
| QAF-007 focused final-boundary regression before production change                                     | RED: 3 failed / 149 passed / 152 total                                 |
| QAF-007 focused final-boundary regression after production change                                      | GREEN: 152/152 passed                                                  |
| Task 7 `npm run lint --workspace=@carvd/desktop`                                                       | exit 0                                                                 |
| Task 7 `npm run typecheck --workspace=@carvd/desktop`                                                  | exit 0                                                                 |
| Task 7 `npm run format:check --workspace=@carvd/desktop`                                               | exit 0                                                                 |
| Task 7 `npm test --workspace=@carvd/desktop`                                                           | renderer 3,791/3,791; main 213/213; Electron 135/135; exit 0           |
| Task 7 `npm run build --workspace=@carvd/desktop`                                                      | 465 main + 2 preload + 2,931 renderer modules; exit 0                  |
| Task 7 working-tree and complete-branch `git diff --check`                                             | exit 0                                                                 |
| Task 7 changed-file secret, sensitive-filename, focused-test, and debug-marker scans                   | no secret/sensitive/focused-test findings; expected diagnostics only   |

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
| `15c7034` | Preserve both compound-cut mitre and bevel geometry on boards with other cuts                         |
| `bd62e06` | Revalidate circular and rounded cuts at final save and Cut List boundaries                            |

`CHANGELOG.md` records the historical production corrections and subsequent
review-remediation fixes under Unreleased.

## Residual ruling

- No known production P0 or P1 remains in the candidate code.
- P1 deferral count is zero.
- Final qualification is **PASS** for the tested candidate: unit, lint,
  typecheck, build, formatting/diff checks, and the full Electron suite are
  green.
- The missing temporary matrix and resolved host blocker remain disclosed.
- Qualification was performed on macOS arm64. Windows/Linux, packaged installer,
  signing, notarization, update-channel, and distribution checks were not in
  scope and were not run.
- This report is not authorization to merge, release, tag, or publish.
