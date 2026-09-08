# Task 7 Whole-Branch Review Remediation

## Scope and status

Date: 2026-09-08. Worktree: `.worktrees/custom-cuts-release`; branch:
`codex/custom-cuts-release`. This report supersedes the earlier Task 7 claim
that the initial review had found every Important issue. The subsequent
whole-branch review identified 14 Important findings and one Minor finding.
All were reproduced with failing-first regressions and root-cause fixes.
All final gates pass at code commit `622bced74b871cb706d410bac89bab02afe22573`.
Independent re-review remains the next checkpoint, not a release action.

No release, merge, push, PR modification, tag, version bump, packaging,
signing, notarization, or distribution action is authorized or performed.
Desktop version remains 1.3.0. No subagents were used for remediation.

## Finding-to-fix map

Paths below are relative to `packages/desktop/src/renderer/src` unless stated
otherwise. R1–R14 are Important; R15 is Minor. Geometry/fabrication failures
are treated as plan P0s, not deferred cosmetic work.

| Finding                                                     | Regression and independent expected behavior                                                                                                                                                                                                                                                                                          | Root-cause fix and implementation files                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1: sequential exterior cuts corrupt the contour            | `utils/customCutsReview.test.ts`: Front and Back 1×1 through notches on a 10×4×1 blank have volume **38 in³**, in either order; rays are empty at both notches and hit untouched stock. Also tests corner notch plus disjoint flush cutout in both orders.                                                                            | `utils/partFeatureGeometry.ts` replaces four-corner destructuring with polygon difference over the complete contour. Every active layer subtracts all removal regions before triangulation. Pinned `polygon-clipping` 0.15.7 in desktop package/lock; runtime dependency license notices included.                                                                                                                               |
| R2: overlapping interior removals double-subtract           | Same regression file: overlapping 2×2 cutouts at (2,1)/(3,1) have volume **34 in³**, not 33, in both orders; shared hole and retained material checked by rays.                                                                                                                                                                       | Same polygon difference handles interior, exterior, touching, and overlapping removals as one planar region; it no longer appends overlapping independent `THREE.Shape.holes`.                                                                                                                                                                                                                                                   |
| R3: circular Front/Back opposite to picker                  | Same regression file: actual blind-hole mesh rays from Front +Z and Back −Z hit recess floors at **+1.75/−1.75** on a width-4 blank.                                                                                                                                                                                                  | `utils/roundCutUtils.ts` uses Front origin +Z/inward −Z and Back origin −Z/inward +Z in the shared face frame. Existing circular-axis and geometry tests updated to physical convention.                                                                                                                                                                                                                                         |
| R4: Bottom rounded openings ignore reversed secondary axis  | Same regression file: Bottom secondary=1 gives a recess at **Z=−1**, floor Y=−0.25; Z=+1 remains stock at Y=−0.5; tested at 0°, 35°, 90°.                                                                                                                                                                                             | `utils/partFeatureGeometry.ts` maps rounded profiles through the same face primary/secondary vectors as placement/handles, before the contour/render Z conversion.                                                                                                                                                                                                                                                               |
| R5: oversized angles silently rescaled                      | Same regression file: 80° width-4 mitre retains numeric inset **22.6851272785**, while Cut List rejects the impossible length-10 blank. `hooks/usePartCutsEditing.test.ts` rejects final save; `components/part-cuts/PartCutsWorkspace.test.tsx` uses the real Mitre Angle input and disabled Save Cut.                               | `utils/endCutUtils.ts` removes end-inset and edge-bevel rescaling and adds `validateEndCutFeature`. It checks authored finite angles and actual opposing planes at all relevant stock corners. Workspace authoring, final Part Cuts save, and `store/projectStore.ts` Cut List validation invoke it. Old valid files still load; impossible cuts cannot be silently fabricated at substituted angles.                            |
| R6: tilted cutter envelope omitted                          | Same regression file: diameter-1 primary=4.4, tilt=60° entry ellipse is rejected; a diameter-1, depth-1.5 blind bore at 60° is rejected for radial far-face breakout.                                                                                                                                                                 | `utils/roundCutUtils.ts` checks projected entry ellipse support radii and complete blind/recess end-disk extents against all non-entry stock faces, in addition to axis depth.                                                                                                                                                                                                                                                   |
| R7: reversed dowel fit inequality                           | Same regression file: two touching 0.25-deep holes accept length **0.5** exactly and **0.375** with end clearance; reject length **1.5**. Editing an otherwise valid stored pair to 1.5 invalidates relationship and visualization.                                                                                                   | `utils/dowelJointUtils.ts` requires combined depth ≥ dowel length at creation and relationship validation. The derived dowel distributes insertion proportionally between hole depths. The design's contradictory inequality is corrected. Faces must touch; unsupported gaps are explicit, not silently included.                                                                                                               |
| R8: assembly identities not remapped                        | `store/projectStore.test.ts`: capture a full pair, place twice, validate all reciprocal mates, assert six distinct feature IDs/three independent joints, capture one member and verify detachment, edit-save-place the pair, and recover a legacy assembly without `localId`.                                                         | `types.ts`, `utils/partFeatures.ts`, `store/projectStore.ts`, `store/assemblyEditingStore.ts`, `hooks/useAssemblyEditing.ts`: persist optional assembly-local identities, precompute fresh part/feature/joint maps at placement and edit entry, detach excluded mates, and recover unambiguous reciprocal legacy references. Existing spread-based file normalization preserves optional fields and backward-compatible loading. |
| R9: mirrors use wrong target/axes and retain joint links    | `components/part-cuts/PartCutsWorkspace.test.tsx`: actual Actions menus for Front edge bevel, Right-end tenon, and 2×2 grid; single mirrored dowel detaches. `utils/partFeatureActions.test.ts`: 36 cases compare every reflected grid point and bore axis for all six faces × both axes × center/min/max references at 25° rotation. | `utils/partFeatureActions.ts`: operation-family target mapping; shared face-frame reflection; grid row-origin rebasing to retain positive spacings under reflection; reflected angle/direction/pattern; individual dowel metadata removed.                                                                                                                                                                                       |
| R10: Back/right rabbet sockets disagree with rendered stock | `utils/customCutsReview.test.ts`: all four edge sockets match literal centers (+/−1.75 in Z or +/−4.75 in X) and actual ray-hit recess floor Y=0.25.                                                                                                                                                                                  | `utils/rectCutUtils.ts` resolves canonical blank-coordinate removal bounds once. `utils/partFeatureGeometry.ts` and `utils/snapToPartsUtil.ts` use them for mesh, socket, material collision cells, and complementary-cut shapes; authored placement is not rewritten.                                                                                                                                                           |
| R11: fabrication precision rounded away                     | Same regression file: **0.755**, **0.74**, and exact **3/4** remain distinct in imperial, with exact corresponding metric dimensions. Existing 0.25-inch metric radius/depth expectations are corrected from 6.4 to 6.35 mm.                                                                                                          | `utils/fractions.ts` adds a fabrication-only formatter: exact sixteenths may use fractions; other values retain 12 significant decimal digits. `utils/partFeatureSummary.ts` and `utils/cutListInstructions.ts` use it; generic UI measurement formatting remains unchanged.                                                                                                                                                     |
| R12: placement and rounded/grid orientation omitted         | Same regression file: distinct rectangle offsets, rounded primary/rotation, and full 2-row/3-column grid details; anchored edge notches give only the meaningful along-edge offset. `utils/cutListInstructions.test.ts`: consolidated joint summary plus **every** hole's coordinate in both units.                                   | `utils/partFeatureSummary.ts` adds family-aware physical reference edges, centered directions, rotation, row/column count, and angle conventions. `utils/cutListInstructions.ts` includes these details and retains all individual hole descriptions after the one-per-joint summary.                                                                                                                                            |
| R13: PDF operation groups anonymous/incomplete              | `utils/pdfFabricationReview.test.ts`: actual jsPDF bytes, two named panels with 35 operations each, both Cut List and Project Report. Each full label must exist after Fabrication Operations, with both part identities. Electron mixed/fractional output tests compare complete hand-authored shop lines in UI, CSV, and PDF.       | `utils/pdfExport.ts` shares identified, untruncated, wrapped/paginated operation blocks between both exports. Continuation pages repeat part identity and preserve text style; no abbreviated table is used as the sole fabrication record. PDF extraction helpers join distinct drawing lines with spaces instead of erasing word boundaries.                                                                                   |
| R14: valid imported blind corner notch renders no removal   | `utils/customCutsReview.test.ts`: canonical 1×1×0.25 blind corner notch has volume **39.75 in³** and top recess floor Y=0.25, not unchanged volume 40.                                                                                                                                                                                | `utils/rectCutUtils.ts` explicitly defines canonical corner targets as top-entry for blind depth bands. Shared bounds/rendering implement that definition. Design and fabrication copy state Top Face; legacy shape remains accepted.                                                                                                                                                                                            |
| R15: nested end reference clone aliases source              | Same regression file: modifying clone `parameters.reference.mode` leaves source `long_point` unchanged.                                                                                                                                                                                                                               | `utils/partFeatures.ts` clones the nested end-cut reference object, including normal copies and assembly pathways.                                                                                                                                                                                                                                                                                                               |

## Failing-first evidence

Focused runs were made before the corresponding production changes. Numeric
volume expectations are hand-derived from stock minus union area; real THREE
geometry is unmocked. Neither a geometry hash nor a production summary builder
is used as the expected numeric/fabrication answer.

| Test cluster                                       | Observed RED                                                                              | Observed GREEN after root fix                |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------- |
| Initial R3/R4/R6/R14/R15 mesh/frame/clone cases    | 9 failed / 9 selected                                                                     | 9 passed                                     |
| R1/R2 composition additions                        | 4 failed / 9 passed / 13 total                                                            | Included in 17/17 below                      |
| R10 four-edge sockets added to that geometry suite | 6 failed / 11 passed / 17 total (two new Back/right failures; Front/left already correct) | 17 passed                                    |
| R5 authoring/final-save/fabrication + R7 fit       | 6 failed / 6 selected                                                                     | 6 passed                                     |
| R8 assembly + R9 actual menu actions               | 4 failed / 4 selected; assembly uses soft assertions to expose all broken references      | 4 passed                                     |
| R11/R12 precision and placement                    | 4 failed / 4 selected                                                                     | 4 passed                                     |
| R13 real-PDF exports                               | 2 failed / 2 selected                                                                     | 2 passed                                     |
| R9 extended six-face/reference mirror matrix       | 12 failed / 24 passed / 36 selected                                                       | 36 passed                                    |
| R12 all dowel-hole coordinates                     | 1 failed / 1 selected                                                                     | Included in 59/59 mirror/fabrication/PDF run |
| R12 anchored edge offset wording                   | 1 failed / 1 selected                                                                     | Included in final full renderer gate         |

The first broad renderer run found 17 stale expectations (3,807 passed):
opposite face literals, old silent-angle clamping, old incorrect dowel-length
fixtures, rounded metric dimensions, and abbreviated fabrication strings.
They were reconciled to independent corrected semantics, not weakened.
That run became 3,824/3,824 before the extra mirror/edge coverage.

First full Electron run: 129 passed / 6 failed, all at exact fabrication text
after successful author/edit/save/reopen. After literal updates: 133 passed /
2 failed, both at the PDF test text extractor joining separate line drawing
operators without whitespace. The extractor correction keeps complete ordered
literal assertions; no production output is omitted to satisfy tests.

## Final gates

| Exact command                                                                             | Exit | Result                                                                                                     |
| ----------------------------------------------------------------------------------------- | ---: | ---------------------------------------------------------------------------------------------------------- |
| `npm run lint --workspace=@carvd/desktop`                                                 |    0 | ESLint, zero warnings                                                                                      |
| `npm run typecheck --workspace=@carvd/desktop`                                            |    0 | TypeScript clean                                                                                           |
| `npm run format:check --workspace=@carvd/desktop`                                         |    0 | All configured desktop source files pass Prettier                                                          |
| `npm test --workspace=@carvd/desktop`                                                     |    0 | **3,863 renderer tests / 176 files; 213 main tests / 9 files; all 135 real-Electron tests in 2.2 minutes** |
| `npm run build --workspace=@carvd/desktop`                                                |    0 | Production build: 465 main, 2 preload, 2,932 renderer modules                                              |
| `node scripts/assert-no-analytics-e2e-controls.cjs` (desktop cwd, after production build) |    0 | Production output excludes analytics E2E controls                                                          |
| `git diff --check` and `git diff --check origin/develop...HEAD`                           |    0 | Working and committed branch whitespace clean                                                              |
| Pre-commit configured staged-file Prettier checks                                         |    0 | All 38 changed implementation files accepted                                                               |

The final aggregate log is `full-tests-verified.log` under the local evidence
directory; earlier failing attempts are preserved as `full-tests.log` and
`full-tests-final.log`. The final net renderer increase is **72 tests**, not a
claim that 72 distinct production defects existed. Offline analytics fixture
resource errors remain expected and their assertions pass.

Visual PDF QA: generated the two 35-operation-per-part regression exports,
then rendered Cut List page 2 and Project Report page 3 with Poppler. Both
continuation pages show the correct Right cabinet panel identity, full ordered
operation lines through operation 35, readable black body text, clear margins,
and footer watermark without clipping/overlap. Cut List has 2 pages; Project
Report has 4. Poppler required its bundled `FONTCONFIG_FILE` path; no product
configuration was altered.

Security/scope audit at the implementation commit: **38 changed files**, all
within desktop code/tests/license notices, its one dependency/lock addition,
Unreleased changelog, or the affected design. **0** out-of-scope paths, common
secret-signature matches, focused/skipped/todo tests, debugger statements, or
unexpected file modes. No build output, diagnostic PDF/PNG, node_modules,
credential file, or distribution artifact is tracked. The evidence-only
commit adds this report, updates canonical QA, marks the earlier Task 7 report
superseded, and updates the existing local ignored progress ledger.

Implementation commit: `622bced74b871cb706d410bac89bab02afe22573`
(`fix: remediate custom cuts whole-branch review findings`). It contains 38
files, 1,209 insertions, and 518 deletions. The exact evidence commit is reported
in the handoff after this report is committed; its own hash is intentionally
not self-embedded.

## Residual scope and compatibility

- No requested review finding is deferred. All behavior changes are scoped to
  custom cuts, physical joinery identities/fit, or their fabrication output.
- Existing project schema versions continue loading. Optional assembly-local
  identities do not require a file-version change. Blind canonical corners now
  have a documented top-entry interpretation rather than silently doing nothing.
- Planar boolean rendering preserves disconnected components. The existing
  single-outline/convex-hull APIs remain conservative for disconnected stock;
  this remediation does not claim general free-form solid decomposition.
- No CNC/G-code, loose-hardware model, remote service, telemetry, website, or
  licensing behavior is introduced.
- Initial dependency installation reported existing repository engine/audit
  warnings; no unrelated dependency upgrade or audit-fix was attempted.
- Temporary test logs and diagnostic PDFs are local under
  `/tmp/carvd-review-remediation.CZihMw`, not tracked or distributed.
