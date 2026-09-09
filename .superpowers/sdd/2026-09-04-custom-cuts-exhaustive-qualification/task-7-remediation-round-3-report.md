# Post-fix review remediation: collision, pocket support, and empty solids

Status: PASS; all three Important findings and the Minor cache finding closed. Unreleased.
Starting candidate: `e1e86717d1adb17911b4e115df7b7de04eb7c5bc`.
Qualified code commit: `16e5827176c20242c1dfff88ceceda0be99d4486`.
Worktree: `.worktrees/custom-cuts-release`; branch: `codex/custom-cuts-release`.

The independent post-fix review closed Q1–Q11 and identified three Important
findings plus one Minor cache finding. All four were independently reproduced
before their production fixes. This report supersedes round 2's acceptance
checkpoint, without claiming another independent review or authorizing release.

## Finding map and failing-first evidence

All new regressions are in
`packages/desktop/src/renderer/src/utils/customCutsRound3.test.ts`. They use
real Three geometry, literal planes/volumes, actual overlap policy, real store
transactions, the final-save hook, and rendered Part Cuts controls. No product
test is skipped or focused in source.

Raw evidence directory: `/tmp/carvd-review-round3.PmTCyH`.
Initial independent reproduction: `initial-red.log`, **6 failed / 1 passed**:
A (one), B (two families), C (one), D (label and ID). The passing control was
cache invalidation; final invalidation controls explicitly change physical
dimensions/angle and a rounded-placement reference.

| Finding                                                                | Root cause                                                                                                                                                                                                          | Fix and files                                                                                                                                                                                                                                                                                                                                                                                                                   | RED / GREEN                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A Important: a removal created invisible collision beyond the bevel    | Collision contour warping adjusted only original end-boundary vertices. A newly introduced cut corner could remain beyond the rendered cut plane.                                                                   | `utils/partFeatureGeometry.ts`: mixed end/edge and other removals derive convex vertices from the already clipped render solid using Three QuickHull. A weak geometry-keyed cache reuses the result; existing convex overlap policy is preserved.                                                                                                                                                                               | Original RED proves `x-y > 4.5` vertices and false→true overlap for the literal .1-inch probe. `a-green.log`: 1/1. `a-expanded.log`: 65/65, with 64 end/edge/flip/boundary combinations checked in both orders, literal plane containment, non-increasing volume, and no introduced probe collision.                                                                                                    |
| B Important: unsupported rounded/rectangular pockets passed validation | Only circular cuts consumed remaining-stock support logic. Rounded and rectangular pocket validators checked blank bounds, and final save supplied persisted instead of complete draft features for those families. | New `utils/remainingStock.ts` shares existing exact support containment against end/edge planes and tenon shoulders. `roundCutUtils.ts` uses rotated rounded-profile support plus complete blind depth. `rectCutUtils.ts` validates the full Top/Bottom/Front/Back pocket prism. `partFeatureConflicts.ts` exposes family-independent material-support errors; `hooks/usePartCutsEditing.ts` passes the entire candidate stack. | Initial RED: two unsupported pockets. `b-expanded-red.log`: 10 failed / 5 controls. `b-green.log`: 15/15. Final suite expands to 31 utility cases plus two real author/final-save flows, including partial/fully removed/contained placements, both orders, Top/Bottom rotations, bevel/tenon stock and side-pocket floor breakout.                                                                     |
| C Important: no-material guard required a rectangular feature          | The final volume check was gated on `rect_cut`, although end/edge cuts plus a rounded through opening can consume all stock.                                                                                        | `partFeatureConflicts.ts`: all supported families enter the conservative removal bound and resulting-solid volume check. Individual validation prevents malformed numeric/unsupported inputs entering triangulation; material-support/entire-blank diagnoses may still be evaluated. Existing Save Cut, Save Part and Cut List consumers receive `no_material`.                                                                 | Original RED verifies stock volume 15 in³, then zero volume/positions, with no conflict. `c-expanded-red.log`: 2 failed / 3 controls; the added failing integration case proves actual Save Cut and Save Part enabled and the final-save transaction persisted the empty part. Final suite has three C cases including nearby retained wood and malformed width. Empty collision hull is also verified. |
| D Minor: identity/descriptive edits defeated geometry reuse            | The cache serialized complete feature objects, including labels, IDs and metadata.                                                                                                                                  | `partFeatureGeometry.ts`: explicit shape-field keys retain dimensions, target, parameters, references, placement, pattern and end-cut semantics while excluding identity/descriptive metadata. Dowel metadata affects separate hardware/relationship consumers, not the part mesh; actual hole dimensions remain in the key.                                                                                                    | Initial label/ID RED plus `d-red.log`: 3 failed / 1 control. `d-green.log`: 4/4. Final suite expands to 10 cases covering all four feature families, copied dowel metadata, changed hole diameter, part dimensions, cut angle and reference-driven placement.                                                                                                                                           |

## Boundary semantics and adjacent self-audit

- Enclosed blind mortises, cutout pockets, stopped grooves and rounded pockets
  require their complete prism to fit remaining end/edge/tenon stock. Tests
  distinguish partial intersection from containment and check blind floors,
  not only entry centers. No authored dimension is clamped or rewritten.
- Open channels/notches and through-boundary openings intentionally intersect
  outer cut planes. Their behavior is preserved by explicit controls; a full
  removal still fails the family-neutral no-material gate. This is not a new
  free-form cutting mode or a change to approved channel semantics.
- Mixed collision hulls are derived from the clipped solid's convex envelope,
  not claimed as exact nonconvex collision decomposition. Existing socket-mate
  exceptions and concave contour paths are unchanged. Every expanded A case
  uses the same literal physical plane before/after adding a removal.
- The existing circular complete-cutter and between-caps tenon shoulder tests
  run unchanged after extracting shared support logic. Original R1–R15,
  follow-up A–D and Q1–Q11 tests remain in the broad/full gates.
- Geometry metadata was audited at its actual consumers: neither part-mesh
  rendering nor remaining-stock derivation reads `metadata.dowelJoint`. The
  dowel hardware remains separately derived and its relationship validation
  is not removed or cached away.
- Cache reuse retains geometric field changes and disabled-feature filtering;
  mixed hull caching is keyed by the actual cached geometry object. No cache
  ownership/disposal or production test-hook contract was expanded.
- File schema/parsing, app version, dependencies/lockfile, website, analytics,
  licensing/payment, update channels, and installer configuration are unchanged.
  No customer project data or credential was introduced.

## Verification

Focused new suite: **111/111** tests. Broad affected suite:
**785/785** tests across 12 files (`broad-initial.log`). There were no broad
assertion failures requiring legacy assertion or fixture changes this round.

The first full aggregate (`full-desktop.log`) passed 4,177 renderer and 213 main
tests but finished Electron at 134/135. The stress flow's temporary 2-inch blind
pocket at offset 76 reaches blank-relative x=78; its 84×30×1.5 stock with a
15°/5° Back-long compound end permits only
`84 - 25*tan(15°) - .25*tan(5°) = 77.27939802334046` at that pocket corner.
The new validator correctly rejects it. The fixture now asserts disabled Save
Cut and the remaining-material error at 76, moves to offset 74, and continues
the original duplicate/delete/history/save/reopen/output flow. Production
validation, geometry tolerances and existing assertions were not relaxed.
The corrected native stress flow passed **1/1 in 40.5 seconds** in
`stress-fixture-focused.log`, including rejection, correction, and all original
downstream actions, before the fresh complete rerun.

| Gate                                                         | Result                                                                                                                                            |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test --workspace=@carvd/desktop`                        | PASS: renderer 4,177/178 files, main 213/9 files, Electron 135/135 in 2.5 minutes; exit 0, `full-desktop-verified.log`.                           |
| Desktop lint                                                 | PASS, zero warnings; `lint-final.log`.                                                                                                            |
| Desktop typecheck                                            | PASS; `typecheck-final.log`.                                                                                                                      |
| Configured desktop formatting                                | PASS; `format-final.log`.                                                                                                                         |
| Production-only build and analytics boundary                 | PASS after Electron; `production-final.log`, exit 0; 465 main / 2 preload / 2,934 renderer modules; production excludes analytics E2E controls.   |
| Staged/complete-branch diff, scope and credential signatures | PASS; `scope-security.log`: zero secret signatures, focused/skipped tests or debugger statements in added lines; no sensitive/distribution paths. |

The full renderer suite includes actual PDF byte assertions and Electron
includes native save/reopen and real CSV/PDF exports. No PDF code, layout or
grouping changes were made in this round.

## Handoff

Code commit: `16e5827176c20242c1dfff88ceceda0be99d4486`
(`fix: align cut collision and remaining stock validation`). Evidence follows
in `docs: record custom cuts remaining stock qualification`. Canonical QA,
changelog, design wording, previous-report supersession and progress ledger
carry this final stamp. All requested findings are closed; known P0/P1 and
deferrals are zero. Qualification is local macOS arm64;
no new Windows/Linux/Intel installer or CI verification is implied.

No subagents were used. No release, push, merge, PR change, version bump,
packaging, signing, notarization, or distribution action was performed.
