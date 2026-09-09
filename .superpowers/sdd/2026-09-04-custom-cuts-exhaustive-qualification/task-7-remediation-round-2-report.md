# Independent review pass 2 remediation

Status: PASS; all eleven Important findings and confirmed UX defects closed. Unreleased.
Starting code/evidence commit: `eaaddfe8b45eff97fa78c21c37408ebbcc558c6a`.
Qualified code commit: `28d81abc342466a7519676de29b5bcdb61d3a2b3`.
This report supersedes the preceding candidate's acceptance statement. The
eleven Important findings and confirmed accessibility/clarity defects below
were independently reproduced before production changes. No subagents were
used. No release, push, merge, PR, version, package, signing, or distribution
action is authorized or was taken.

## Finding-to-regression and implementation map

Paths below are relative to `packages/desktop/src/renderer/src` unless noted.
The main numeric/behavior regression file is
`utils/customCutsRound2.test.ts`. It uses real Three geometry, literal ray
intersections, signed tetrahedral volume, authored values, actual store
transactions, and production validators rather than geometry fingerprints as
the correctness oracle.

| Finding                                                       | Independently confirmed RED                                                                                                                                                                        | Root cause and fix                                                                                                                                                                                                                                                                                                                                                                                                       | Tests/files and GREEN evidence                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Q1: tenon erased opposite end cut                             | Four failures and two bevel controls in the combined Q1/Q2 run; both original feature orders exercised.                                                                                            | Tenon layers started from the rectangular blank and replaced the mitred contour. All removal layers now use authored blank coordinates and are intersected individually with the end-cut stock solid. Clipping a merged stack was rejected during development because coincident internal caps corrupted volume.                                                                                                         | `partFeatureGeometry.ts`; six Q1 cases cover both ends, both orders, mitre/bevel/compound, literal end rays and analytic wedge-minus-shoulder volumes. `q1-green.log`: 6/6.                                                                                                                                                                                                                                                                            |
| Q2: end/edge bevel combination warped the end plane           | Sixteen failures in `q1-q2-confirmed-red.log`; the combined run was 20 failed/2 passed.                                                                                                            | End X coordinates were computed at original blank Z, then edge bevels moved Z without recomputing the plane intersection. Direct stock corners now evaluate end insets at the beveled Z; layered solids clip against that stock; convex vertices use the same physical intersection. Removed obsolete vertex-warp functions.                                                                                             | `partFeatureGeometry.ts`; initial 16/16 GREEN, expanded to 96/96 in `q2-expanded.log`: both ends, Front/Back, high-point directions, mitre/bevel/compound, horizontal flips, direct/layered paths. Tests assert plane corners, rays, convex vertices, and exact integrated cross-section volume (not a loose visual tolerance).                                                                                                                        |
| Q3: resized tenon silently clamped width/offset               | `q3-red.log`: 2/2 failures.                                                                                                                                                                        | Resolver clamping hid invalid authored dimensions from validation and fabrication. Preserve raw tenon size, thickness, and offset; existing bounds checks now diagnose the problem without rewriting it.                                                                                                                                                                                                                 | `rectCutUtils.ts`, numeric review test, `hooks/usePartCutsEditing.test.ts`: real main-canvas store resize, preserved values, Cut List error, and final-save refusal. `q3-green.log`: 2/2. Legacy tests explicitly expecting the hidden clamp were replaced with preservation/error assertions.                                                                                                                                                         |
| Q4: untouched measurement field changed .755/.74              | `q4-confirmed-red.log`: 12/12 failures, 101 unselected tests. Initial syntax/inspector-fixture attempts are not counted as defect RED.                                                             | Rounded display text was always reparsed on blur/unmount. The shared input uses precision-preserving display, tracks whether text actually changed, and captures edit units and callback. Untouched blur/unmount never writes a value.                                                                                                                                                                                   | `components/common/FractionInput.tsx` and its tests; `PartCutsWorkspace.test.tsx`. Exact .755/.74 in both units on focus/blur, focused unmount, reopen and real Save Cut. `q4-green.log`: 12/12. Existing shared-input edit, invalid-input, selection/callback and unmount tests also pass in full gates.                                                                                                                                              |
| Q5: distinct round operations treated as duplicates           | `q5-red.log`: 3 failed/1 identical-member-set control passed.                                                                                                                                      | Comparing one coincident member and pilot geometry was insufficient. Duplicate classification now requires the entire expanded member set and active removal profile, including recess diameter/depth/angle. Overlap extents include the active major profile.                                                                                                                                                           | `partFeatureConflicts.ts`; perpendicular three-hole patterns sharing one member, distinct coaxial stepped counterbores, noncoaxial major-profile overlap, and reversed description of the same member set. `q5-green.log`: 4/4.                                                                                                                                                                                                                        |
| Q6: physically overlapping dowels accepted                    | `q6-confirmed-red.log`: 3 failed/2 tangent/separated controls; corrected fixture uses actually touching faces. Adjacent new-joint-over-existing-hardware probe: `q6-adjacent-red.log`, 1/1 failed. | Authoring checked individual holes but not hardware. Rows require spacing at least diameter. Parallel finite-cylinder overlap is analytic; nonparallel interference uses bounded 64-segment closed-cylinder intersection after analytic AABB separation. Creation checks new hardware against existing project joints before mutation. Relationship validation and visualization flag interference after matching edits. | `dowelJointUtils.ts`, `store/projectStore.ts`, `DowelJointDialog.tsx` and tests. Row authoring, wizard error/disabled Next, reciprocal edits, perpendicular overlap/tangency/separation, and atomic refusal of a second overlapping joint. Initial `q6-green.log`: 5/5 including wizard; adjacent utility group `q6-adjacent-green.log`: 5/5.                                                                                                          |
| Q7: valid rotated rounded profile rejected                    | `q7-expanded-red.log`: 5 failed/2 controls.                                                                                                                                                        | Validator used sharp rectangle corners. It now uses rounded-rectangle support: rotated inner rectangle plus radius disk; a slot uses half-width radius and rejects length shorter than width.                                                                                                                                                                                                                            | `roundCutUtils.ts`; 4×4 R1 at 45° in 5×5, exact tangency/outside, all mirror actions, separately sized capsule support and inverted slot. `q7-green.log`: 7/7. Preview movement/resizing calls this same validator.                                                                                                                                                                                                                                    |
| Q8: normal countersink had stepped walls/wrong entry diameter | `q8-red.log`: 6 failed/2 outside-rim controls.                                                                                                                                                     | Normal countersinks used eight midpoint-diameter layers. All countersinks now use the continuous conical cutter, with the original slope extended outside entry. Normal counterbores retain their real cylindrical depth interval. Solid subtraction operates on each closed layer.                                                                                                                                      | `partFeatureGeometry.ts`; literal Top/Bottom cone wall rays at radii .2, .36, .3749 and .3751 on a .25 pilot/.75 major/90° sink. `q8-green.log`: 8/8. Removed dead stepped-sink and tilted-layer code.                                                                                                                                                                                                                                                 |
| Q9: hole accepted in already-removed end stock                | `q9-q10-red.log`: Q9 had 7 failed/3 contained controls. Adjacent swept-bore test `q9-sweep-red.log`: 1 failed/1 valid control.                                                                     | Blank-only validation ignored the remaining stock; checking entry/end disks alone also missed a blind bore breaking through a tenon shoulder between its ends. Shared end/edge half spaces validate complete entry ellipses and swept finite cutters. For nonconvex tenon stock, support restricted to the end region checks shoulder interference using the one-constraint convex dual, not endpoint sampling.          | `endCutUtils.ts`, `roundCutUtils.ts`, `partFeatureConflicts.ts`, workspace/final-save hook. Fully removed, partial and contained mitre/bevel/tenon cases; blind bevel envelope; angled bore crossing a tenon shoulder; unsaved operation-set final save; actual Electron invalid Front-hole rejection followed by valid placement. `q9-q10-green.log`: 14/14 combined; `q9-sweep-green.log`: 200/200 across numeric review, round and dowel utilities. |
| Q10: full/cumulative cuts left no material                    | Q10 portion of `q9-q10-red.log`: 4/4 failed. Candidate Save Cut guard: one failure in `ux-red.log`.                                                                                                | No full-blank guard existed. Individual rectangular validation rejects complete through removal; cumulative conflict validation checks remaining solid volume, preceded by a conservative removal-volume upper bound to avoid unnecessary triangulation. Save Cut evaluates its candidate set, and Save Part/Cut List share the conflict gate. Empty invalid previews have finite zero bounds.                           | `rectCutUtils.ts`, `partFeatureConflicts.ts`, `partFeatureGeometry.ts`, workspace and final-save tests. Full cutout/edge/corner notch, two touching half-blank cutouts, retained .0001-inch web, empty preview plus countersink, unsaved-set final save. `q10-green.log`: 4/4; UI guard in 7/7 UX GREEN.                                                                                                                                               |
| Q11: .9995 blind cut rendered through                         | `q11-expanded-red.log`: 6 failed/2 controls.                                                                                                                                                       | Renderer snapped depth within .001 inch to thickness and skipped a nonzero thin layer. Removed depth snapping and skip only nonpositive layer thickness.                                                                                                                                                                                                                                                                 | `rectCutUtils.ts`, `partFeatureGeometry.ts`; Top/Bottom actual floor rays at .999, .9995, .9999 and .9999995 inches in 1-inch stock. `q11-green.log`: 8/8. Legacy snap expectation now asserts the preserved floor.                                                                                                                                                                                                                                    |

## UX and accessibility

`ux-red.log` independently confirms seven failures: six UX cases plus the Q10
candidate Save Cut case. `ux-green.log` passes all seven.

| Item                                                  | Root cause / change                                                                                                                                                                                                                                                                                                                                    | Verification                                                                                                                                                                                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Measurement units                                     | Shared measurement inputs had no unit announcement; dowel review hardcoded imperial. Inputs now expose unit descriptions/titles without changing their accessible names. Dowel measurement help and review use current units and exact fabrication formatting.                                                                                         | Two shared-input unit cases and a real metric wizard flow assert 9.525mm diameter/depth and 19.05mm dowel length.                                                                                                                       |
| Selected states                                       | Shared Button omitted `aria-pressed` for `active=false`. It now exposes both true and false while ordinary buttons retain no toggle state.                                                                                                                                                                                                             | Workspace target buttons are queried by role and checked before/after selection; no class-name oracle.                                                                                                                                  |
| Actionable final-save feedback                        | Only pair conflicts were surfaced, leaving invalid individual operations without their reason in the list. Each enabled operation now shows its validation issue, a visible Invalid cut badge, and an alert with a direct Fix cut action. Save Part is described by that alert.                                                                        | Oversized pocket test asserts disabled Save Part, named reason, and opening the actual operation via Fix cut 1. Save Cut failures also use an alert.                                                                                    |
| Stopped-dado terminology                              | Existing spec contradicted itself by saying partial across-width run while storage/geometry are full-width. Help and spec now explicitly retain full width and limited along-blank run; Mortise/Stopped Groove are identified for the other woodworking layouts.                                                                                       | Exact help-text regression; existing stopped-dado behavior and Electron lifecycle tests remain unchanged.                                                                                                                               |
| Pattern removal / reorder / delete / preview controls | The current workspace has no unlabeled icon versions of these controls: pattern removal is the labelled Repeating Pattern selector's Single hole option; reorder/Delete are text menu items behind Actions for cut N; preview fallback uses Move Left/Right, Extend/Widen/Enlarge Hole. Existing icon-only menu trigger already has its explicit name. | Source audit and retained production-control/menu/lifecycle tests. No invented redesign or unsupported accessibility claim for WebGL meshes; exact inspector fields and named HTML controls remain the keyboard-accessible alternative. |

The React checklist was applied to shared input callbacks, state/units lifetime,
memoized operation diagnostics, toggle semantics, and accessible controls.
No network or analytics work was added to the editing path.

## Development gate reconciliation

- Initial broad run: 369 passed/49 failed. Root causes were old Three mocks
  missing newly exercised geometry, Q4 test-unit state leakage within the
  workspace test file, and three legacy assertions that explicitly demanded
  silent tenon clamping/depth snapping. Tests now use real Three for geometric
  behavior, reset unit state, and assert the new preservation contract.
- Reconciled broad gate: 418/418 in ten suites (`broad-2.log`).
- Initial full renderer/main: 3,980/3,980 and 213/213 before expanded self-audit.
- First aggregate after expansion: renderer 4,064, main 213, Electron 134 passed
  and 1 failed (`full-desktop.log`). The failing metric fixture put a Front
  hole at x=9 inches on a 24×10 board whose right 45° Back-long mitre leaves
  that face only through x=2. This was invalid stock, not a reason to relax the
  validator. The Electron test now asserts that x=9 is rejected, moves to x=1,
  and continues its original fractional edit, save/reopen, CSV and real PDF
  assertions. Its later fractional x=8.5 remains valid after changing the mitre.
- The between-caps tenon shoulder probe was then fixed test-first. The final
  suite contains 175 net new renderer tests over the starting candidate.
- Second aggregate: renderer 4,066 and main 213 passed; Electron again finished
  134/135 (`full-desktop-final.log`), this time because the stocked mixed-part
  fixture raced the library-import prompt after its first save. The production
  hook checks a new file path after 100ms; the test tried Home without finishing
  that prompt. The fixture now explicitly completes Skip before Home and again
  on reopening. Its native persistence and actual CSV/PDF assertions all pass
  in the focused rerun (`electron-import-sequence-focused.log`: 1/1). No product
  behavior, timeout, assertion, or import prompt was bypassed.

## Final verification

Fresh complete aggregate and production-only rebuild pass. Raw logs:
`/tmp/carvd-review-round2.4FPEbV`. Every command below exited zero.

| Command                                                                   | Result                                                                                                                                 |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test --workspace=@carvd/desktop`                                     | 4,066/4,066 renderer (177 files), 213/213 main (9 files), 135/135 Electron (3.2m); `full-desktop-verified.log`.                        |
| `npm run lint --workspace=@carvd/desktop`                                 | ESLint zero warnings; `lint-final.log`.                                                                                                |
| `npm run typecheck --workspace=@carvd/desktop`                            | TypeScript passes; `typecheck-final.log`.                                                                                              |
| `npm run format:check --workspace=@carvd/desktop`                         | All configured source files pass; `format-final.log`. Changed E2E/spec/changelog files also pass in `extra-format.log`.                |
| `npm run verify:production-analytics-boundary --workspace=@carvd/desktop` | Fresh production main/preload/renderer build: 465/2/2,932 modules; no analytics E2E controls. `production-final.log`.                  |
| Complete branch / staged diff and secret/scope checks                     | All pass; `scope-security-audit.log`. 25 code/test/spec/changelog files, no version/dependency/website/environment/distribution edits. |

The actual PDF byte regressions remain part of the renderer gate, and the
corrected Electron metric/fractional flow still exports and verifies its real
PDF. This round changes no PDF layout or grouping code; prior identified,
untruncated operations and dowel-group distinctions remain covered.

## Self-audit of previous rounds and adjacent cases

The complete current suites retain original R1–R15 and follow-up A–D protection:

- R1/R2/R14: removal union, operation order, overlapping regions and imported
  blind-corner Top entry remain covered by numeric geometry tests.
- R3/R4 and A: shared Front/Back/Bottom face coordinates, physical side-pocket
  mirrors, end bevel/compound high points and grid reflection remain covered.
- R5/R6 and B: authored end angles are not substituted; tilted entry/recess
  envelopes and long axial recesses remain accepted/rejected geometrically.
- R7/R8/R9: embedment sufficiency, assembly-local relationship IDs, repeated
  placement, excluded mates, individual mirror detachment and copy independence
  remain covered. This round adds hardware interference at authoring and edits.
- R10: all rabbet socket sides still use resolved edge bounds.
- R11/R12/R13 and C/D: exact fabrication precision, placement/references, pattern
  dimensions/rotation, Top/Bottom blind-notch identity, identified full operation
  blocks, and UUID-independent dowel-length/group partition are retained in both
  PDF exports. No exporter changes were needed.
- R15: nested end-reference clone independence remains covered.
- Additional checks cover exact integrated end/edge volumes, existing-joint
  interference before store mutation, complete unsaved operation sets, empty
  preview bounds with a solid cutter, and a blind bore crossing a tenon shoulder
  between two valid caps. Geometry tolerances were not loosened to make tests pass.

Backward-compatible parsing/file schemas, app version 1.3.0, website copy,
dependencies, lockfile, updater, license/payment, analytics transport, and
distribution configuration are unchanged by this round. Historical broader
branch changes are not claimed as new work here. All work uses synthetic
fixtures; no customer project or credentials were added.

## Final handoff

Code commit: `28d81abc342466a7519676de29b5bcdb61d3a2b3`
(`fix: correct custom cut solids and authoring validation`). The separate
`docs: record second custom cuts review remediation` commit records this report,
canonical QA, historical-report supersession, and the progress ledger.
Staged and complete-branch diff checks and added-line credential/focused-test/debug
signature audits pass; no generated output, unexpected mode, or customer data
was added. No known open Critical/Important finding, P0, P1, or technical blocker
remains from the requested review and adjacent self-audit.

Branch remains `codex/custom-cuts-release`, unreleased. Qualification is local macOS arm64,
not new Windows/Linux/Intel installer or CI verification. No packaging,
signing/notarization, version, or release checks were run.
