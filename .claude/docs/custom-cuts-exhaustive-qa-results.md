# Custom Cuts Exhaustive Qualification Results

## Release qualification

**RUNTIME RECHECK REQUIRED — do not treat this candidate as a release PASS yet.**

Review-driven remediation is implemented at
`5e45484b84eeac43b69510b5c2596d35c1ce7d17`. Three fabrication-output P0s
found by Task 6 are fixed, and the expanded qualification now contains literal,
independent oracles for every operation. The final real-Electron run could not be
completed because the host was saturated by 748 unrelated long-lived `rg --files`
processes (1,522 processes total). Playwright eventually started but timed out in
`launchElectronApp` before any application assertion; Vitest could not start its
worker. No unrelated process was terminated.

The last fully green baseline was 133/133 Electron tests at `c472a729…`. Scoped
unit and Electron evidence exists for the first two production corrections, and a
worker-free RED/GREEN executable proved the third. The 134-test candidate suite,
including the new native per-operation round trips, hardened stress oracle, and
realistic cabinet-panel scenario, must run after host capacity recovers.

P0 means any crash, lost/corrupted feature, wrong face or removal direction, false
valid/invalid geometry, copy/undo/save corruption, valid joinery blocked by
collision handling, or fabrication output that could cause a bad cut.

- Known open product P0: **0**.
- P0 fixes awaiting the final candidate Electron rerun: **3**.
- Known open P1: **0**.
- Deferred P1: **none**.
- Qualification blocker: **final candidate runtime verification pending**.

## Build stamp

| Field                            | Qualified/candidate value                                            |
| -------------------------------- | -------------------------------------------------------------------- |
| Qualification date               | 2026-09-04, America/New_York                                         |
| Starting Task 6 commit           | `e33717b` (`fix: harden paired dowel lifecycle`)                     |
| Last fully green Task 6 baseline | `c472a72912a63ce3ead371602c4558f15ef53e7a`; 133/133 Electron tests   |
| Current candidate                | `5e45484b84eeac43b69510b5c2596d35c1ce7d17`                           |
| OS                               | macOS 26.6.2, build 25G83                                            |
| Architecture                     | arm64                                                                |
| Node / npm                       | v23.10.0 / 10.9.2                                                    |
| Desktop / Electron / Playwright  | 1.3.0 / 41.1.1 / 1.59.1                                              |
| Electron viewport                | 1400 × 900                                                           |
| Candidate static verification    | desktop `tsc --noEmit` exit 0; Prettier and `git diff --check` clean |
| Candidate runtime verification   | Pending host recovery; expected Electron count 134                   |

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
- Geometry signatures must not be null, `empty`, or `unbounded`; position/index
  counts must be positive, hash and all six bounds finite, and X/Y/Z extents
  nondegenerate.
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
exercise invalid/disabled save; save; disable/re-enable; edit all meaningful
controls; save the part; native-save the project; navigate Home; native-open it;
assert the exact preserved feature; open Cut List and assert that operation's
literal complete fabrication line; reopen Part Cuts; duplicate and prove equal
value/fresh ID; delete the duplicate; delete/undo/redo the source with matching
geometry signatures; and save the final empty part. The test is in
`packages/desktop/tests/e2e/part-cuts-lifecycle.spec.ts`.

| Operation         | Exact authored input → exact edited input                                                                               | Exact edited fabrication detail                                                                          | Candidate       |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------- |
| Mitre end cut     | L, 31°, back → R, 37°, front                                                                                            | `Mitre 37° on Right End · Long point on Front`                                                           | Runtime pending |
| Bevel end cut     | L, 17°, top → R, 23°, top                                                                                               | `Bevel 23° bevel on Right End · High point on Top`                                                       | Runtime pending |
| Compound end cut  | L, 27° back / 13° top → R, 33° front / 19° top                                                                          | `Compound 33° / 19° bevel on Right End · Long point on Front · High point on Top`                        | Runtime pending |
| Edge bevel        | front 21°, flipped → back 28°, unflipped                                                                                | `Edge Bevel 28° on Back Edge · High point on Bottom`                                                     | Runtime pending |
| Tenon             | R, 2 × 4, 3/8 thick, shoulder 1 → L, 3 × 5, 1/2 thick, shoulder 2                                                       | `Tenon on Left End · 3" long × 5" wide × 1/2" thick`                                                     | Runtime pending |
| Half lap          | top 3 × 12 × 1/4 → bottom 4 × 12 × 1/2                                                                                  | `Dado on Bottom Face · 4" wide × 1/2" deep`                                                              | Runtime pending |
| Corner notch      | front-left 2 × 1 through → back-right 3 × 1 1/2 through                                                                 | `Corner Notch on Back-Right Corner · 3" × 1 1/2" · Through`                                              | Runtime pending |
| Edge notch        | top-front 2 × 1 at 3 → top-back 3 × 1 1/2 at 5                                                                          | `Edge Notch on Back Side · 3" × 1 1/2" · Through`                                                        | Runtime pending |
| Cutout            | top 3 × 2 × 1/4 at 2,3 → bottom 4 × 2 1/2 through at 4,4                                                                | `Cutout on Bottom Face · 4" × 2 1/2" · Through`                                                          | Runtime pending |
| Dado              | top 2 × 12 × 1/4 → bottom 3 × 12 × 1/2                                                                                  | `Dado on Bottom Face · 3" wide × 1/2" deep`                                                              | Runtime pending |
| Stopped dado      | top 5 × 12 × 1/4 at x=2 → bottom 6 × 12 × 1/2 at x=4                                                                    | `Stopped Dado on Bottom Face · 6" run × 1/2" deep`                                                       | Runtime pending |
| Rabbet            | top-front 24 × 1 × 1/4 → bottom-back 24 × 1 1/2 × 1/2                                                                   | `Rabbet on Bottom-Back Edge · 1 1/2" shoulder × 1/2" deep`                                               | Runtime pending |
| Groove            | top 24 × 1 × 1/4 → bottom 24 × 1 1/2 × 1/2                                                                              | `Groove on Bottom Face · 1 1/2" wide × 1/2" deep`                                                        | Runtime pending |
| Stopped groove    | top 6 × 1 × 1/4 at 2,3 → bottom 7 × 1 1/2 × 1/2 at 4,5                                                                  | `Stopped Groove on Bottom Face · 7" run × 1 1/2" wide × 1/2" deep`                                       | Runtime pending |
| Mortise           | top 4 × 2 × 1/4 at 3,4 → bottom 5 × 2 1/2 × 1/2 at 5,5                                                                  | `Mortise on Bottom Face · 5" × 2 1/2" × 1/2" deep`                                                       | Runtime pending |
| Round hole        | top Ø3/8 × 1/4 blind, 7°→30°, at 3,3, linear 3 @ 1 / 15° → bottom Ø1/2 through, 12°→45°, at 5,4, linear 4 @ 1 1/4 / 25° | exact 4-hole Linear Pattern line including target, diameter, spacing, direction, through, tilt           | Runtime pending |
| Countersink       | top Ø1/4 pilot × 3/8 blind, Ø3/4 / 82°, grid 2×3 → bottom Ø3/8 through, Ø7/8 / 90°, grid 3×2                            | exact 6-hole Grid Countersink line including pilot, major, angle, both spacings, rotation, through, tilt | Runtime pending |
| Counterbore       | top Ø1/4 × 1/4 blind, bore Ø3/4 × 1/8, circular 3 → bottom Ø3/8 through, bore Ø7/8 × 1/4, circular 4                    | exact 4-hole Circular Counterbore line including pilot, recess, radius, start, through, tilt             | Runtime pending |
| Rounded slot      | top 3 × 1 × 1/4 at 3,3, 10° → bottom 4 × 1 1/2 through at 5,4, 20°                                                      | `Rounded Slot on Bottom Face · 4" × 1 1/2" · Through`                                                    | Runtime pending |
| Rounded rectangle | top 3 × 2, radius 1/2, depth 1/4 at 3,3, 10° → bottom 4 × 2 1/2, radius 3/4, through at 5,4, 20°                        | exact target, size, radius, and through termination                                                      | Runtime pending |

The common duplicate assertion proves value equality and fresh IDs. Deep nested
non-aliasing is intentionally scoped to the representative real main-canvas tests
`duplicates every feature family through the real main-canvas command` and
`copies and pastes all featured families through the real keyboard commands
without aliasing the source`; this report does not claim a nested-field edit for
every one of the 20 lifecycle rows.

## Realistic woodworking matrix

| Scenario                                                                            | Exact executable evidence                                                                                                                                                                                                                         | Status                    |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Picture-frame mitres, both flip directions, one 45°→30° edit                        | `custom-cuts-assembly.spec.ts` — `authors, rotates, and drags complementary mitres into exact corners for both flip directions`                                                                                                                   | Previously passed         |
| Compound/bevel slopes and flips                                                     | lifecycle test `qualifies end operations through real Part Cuts controls`; production geometry tests `slopes the end plane across thickness for bevel cuts`, `combines mitre and bevel shaping for compound cuts`, and right-end layered variants | Candidate runtime pending |
| Dado/divider: 12 × 6 × 3/4 host, 0.755 × 3/8 dado, nominal/clearance/oversize mates | `custom-cuts-assembly.spec.ts` — `seats nominal and clearance dado fits, rejects an oversized fit, and leaves the host independent`                                                                                                               | Previously passed         |
| Groove, stopped groove, rabbet on 12 × 6 × 3/4 hosts                                | `custom-cuts-assembly.spec.ts` — `seats groove, stopped-groove, and rabbet fits while respecting a stopped termination`                                                                                                                           | Previously passed         |
| Half lap: two 6 × 2 × 3/4 members with 2 × 2 × 3/8 laps and deliberate 1/4 mismatch | `custom-cuts-assembly.spec.ts` — `assembles complementary half laps and persists a user-edited depth mismatch`                                                                                                                                    | Previously passed         |
| Mortise/tenon: 12 × 6 × 1 host and 4 × 2 × 1 rail                                   | `custom-cuts-assembly.spec.ts` — `seats an authored tenon shoulder at the mortise surface`                                                                                                                                                        | Previously passed         |
| Paired dowels: two 10 × 4 × 1 boards; two Ø3/8 × 3/4 dowels; mismatch edit          | `custom-cuts-assembly.spec.ts` — `authors a paired 3/8 inch dowel joint, diagnoses movement, and rejects a 1/4 to 1/2 mismatch`                                                                                                                   | Previously passed         |
| Round holes, countersink/counterbore patterns, rounded openings                     | `part-cuts-lifecycle.spec.ts` — `persists round and rounded operations through save and reopen`, plus the common native lifecycle rows                                                                                                            | Candidate runtime pending |
| Stopped dado, edge notch, corner notch on a 36 × 12 × 3/4 cabinet panel             | `custom-cuts-hands-on-qa.spec.ts` — `qualifies a stopped shelf dado and edge and corner notches on a realistic cabinet panel`                                                                                                                     | New; runtime pending      |

The new cabinet-panel test uses a top stopped dado at x=6, run 8, depth 1/4;
rejects x=30 as out of bounds; moves it right and extends it through preview
handles to x=6 1/4 and run 8 1/4; creates a front edge notch at x=8, 4 ×
1 1/2 through, rejects x=33, then re-edits its width to 1 3/4; and creates a
back-right corner notch, rejects a 40-inch run, saves 2 1/2 × 2 through, then
re-edits it to 2 1/4 wide. It asserts exact canonical feature objects, native
save/Home/open preservation, finite rendered geometry, and all three ordered
fabrication lines.

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
the same exact normalized lines. This focused Electron scenario passed after the
right-end production correction; it remains part of the pending full candidate
rerun.

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

- explicitly rejects null, `empty`, `unbounded`, non-finite, zero-count, or
  degenerate X/Y/Z signatures before edit, after edit, before save, and after
  reopen;
- asserts exactly 20 enabled cuts after reopen;
- asserts one literal ordered 20-line fabrication summary, including all six
  cutouts, all six round-family members, all six rounded members, patterned
  countersink/counterbore recess details, end-cut direction, blind depths, and
  the 19/20 reorder;
- excludes the temporary duplicate.

Candidate result: **runtime pending**.

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

### QAF-002 — right-end long-point output inversion (P0, fixed)

- Reproduction: `npx playwright test tests/e2e/custom-cuts-hands-on-qa.spec.ts --grep 'metric, then re-edits' --reporter=line` with a right-end mitre and `Long Point On=front`.
- Expected: inspector, rendered geometry, summary, Cut List, CSV, and PDF all say
  the front is the long point.
- Actual: inspector/render showed Front while summary/export said Back.
- Root cause: `getEndCutLongPointLabel` reversed right-end output even though both
  end renderers use `horizontalFlip=false` for the front long point.
- Resolution: summary now maps flip directly on both ends.
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

### QAF-004 — cutout/notch termination omitted (P0, fixed; Electron rerun pending)

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
  same executable exited 0 GREEN. Normal unit/Electron workers remain pending.
- Commit: `92d0f04`.

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

### QAE-001 — host process starvation (environmental blocker)

- Reproduction: focused rounded lifecycle and unit commands on 2026-09-04 while
  `ps` reported 1,522 processes, including 748 unrelated `rg --files` processes.
- Expected: Vitest worker and Electron app start before assertions.
- Actual: Vitest reported `Failed to start forks worker` / `Timeout waiting for
worker to respond`; Playwright timed out in `beforeEach` at
  `launchElectronApp` without reaching an application assertion.
- Resolution: stopped only this task's orphan commands; no unrelated processes
  were changed. Retry candidate runtime verification after host recovery.
- Regression location: none; this is not an application defect.

## Verification ledger

| Command                                                              | Result                                                                |
| -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| scoped summary/fabrication units after right-end fix                 | 37/37 passed                                                          |
| focused metric/fractional Electron workflow after fresh build        | 1/1 passed                                                            |
| scoped summary/fabrication units after patterned-recess fix          | 38/38 passed                                                          |
| worker-free QAF-004 executable, before production change             | RED: exact assertion failure, missing `× 1/4" deep`                   |
| same worker-free executable after production change                  | GREEN: exit 0                                                         |
| direct Prettier on production source/unit/CHANGELOG                  | exit 0, unchanged                                                     |
| direct Prettier on both changed E2E specs                            | exit 0                                                                |
| `./node_modules/.bin/tsc --noEmit -p packages/desktop/tsconfig.json` | exit 0                                                                |
| `git diff --check` before commits                                    | exit 0                                                                |
| focused rounded-operation Electron rerun                             | blocked before assertions: app launch timed out under host saturation |
| normal scoped Vitest rerun                                           | blocked before tests: worker startup timeout under host saturation    |
| candidate unit/lint/build/full 134 Electron suite                    | **pending host recovery**                                             |

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

`CHANGELOG.md` records all three user-visible fabrication-output corrections.

## Residual ruling

- No known production P0 or P1 remains in the candidate code.
- P1 deferral count is zero.
- Release qualification remains **pending**, not PASS, until the final candidate
  unit, lint, build, full Electron, and focused new Electron checks run cleanly.
- The missing temporary matrix and the host blocker are disclosed; neither is
  silently converted into a passing result.
- This report is not authorization to merge, release, tag, or publish.
