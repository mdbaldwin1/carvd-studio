# Closure review remediation: disconnected stock and interactive patterns

Status: PASS; both Important findings and the Minor finding closed. Unreleased.
Starting candidate: `116893eb62954dd150e05a0dd7da5f40004ecb6e`.
Qualified code commit: `44033dda82398fd60f0e47883f5da6347706d27c`.
Worktree: `.worktrees/custom-cuts-release`; branch: `codex/custom-cuts-release`.

The closure review added two Important findings (E/F) and one Minor finding
(G). Each was independently reproduced before its production fix. This report
supersedes round 3's acceptance stamp. No further independent review is claimed.

## Failing-first evidence and finding map

New tests: `packages/desktop/src/renderer/src/utils/customCutsRound4.test.ts`.
Raw evidence: `/tmp/carvd-review-round4.wwm4Cd`.

The confirmed initial run (`confirmed-red.log`) has **4 failed / 0 passed**:
E, F, and both G coordinates. An earlier exploratory run had a malformed grid
fixture (`kind` instead of `type`) and is not counted as performance RED.
The corrected fixture validates successfully and independently checks physical
volume and an end-plane ray, not just elapsed time.

| Finding                                                                | RED and root cause                                                                                                                                                                                                                                                                                                                                    | Fix / files                                                                                                                                                                                                                                                                                                                                                                         | GREEN and adjacent coverage                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E Important: separating stock restored collision in an earlier opening | Literal original fixture: material volume falls 35.85640646 → 31.85640646 in³, while a .1-inch probe in the existing opening changes false → true overlap. `e-expanded-red.log`: 25 failed. The one-outline interface fell back to the original outline when polygon subtraction produced multiple components; flat mitres bypassed the 3D hull path. | `partFeatureGeometry.ts` retains the full polygon set for plan overlap, including interior rings; exact intersection checks remaining area. Rectangular sub-box decomposition retains all components and excludes holes. `overlapPolicy.ts` routes both flat material paths through this representation. Legacy single-outline bounds are not used for these collision tests.       | Initial E GREEN 25/25; final E group 27 cases. Both removal orders, no/Left/Right mitres, flips, Front/Back openings, translations/Y rotations, actual remaining-stock probes, interior holes, and tilted rectangular stock.                                                                                                                  |
| F Important: valid patterned compound geometry stalled synchronously   | `confirmed-red.log`: cold 16-hole geometry **4,423.8ms**, failing a 1,000ms ceiling while volume/ray checks pass. Coplanar stock/layer caps forced costly triangle splitting of already perforated faces during CSG intersection.                                                                                                                     | `partFeatureGeometry.ts` builds a clipping envelope from six half spaces: authored cutting planes remain exact; only irrelevant blank walls move outside the layer. At most twenty triple-plane candidates build its convex hull. This avoids coplanar cap splitting without changing the sampled hole outline, depth, or angle. No work is deferred into collision or validation.  | Final F group 19 cases: cold 16/128 grids, every hole axis open, exact polygonal removal volume, end-plane ray, retained top surface, cache reuse, downstream hull/conflict/Cut List timing; sixteen 128-counterbore cases cover both ends, both flips and Top/Bottom with every vertex inside its literal plane and exact recess-floor rays. |
| G Minor: non-finite rectangular coordinates reached triangulation      | `confirmed-red.log`: both NaN axes validate as null and conflicts throw degenerate-segment errors. `g-expanded-red.log`: 64 failures. Family resolvers may overwrite unused axes before validation; the inspector also sanitized malformed coordinates to zero.                                                                                       | `rectCutUtils.ts` validates both raw coordinates before resolution and exports the shared finite-placement predicate. `partFeatureGeometry.ts` excludes malformed rectangular coordinates from geometry derivation, not saved data. `partFeatureEditorState.ts` preserves non-finite existing coordinates when opening the inspector so active offsets require explicit correction. | `g-green-final.log`: 64/64. All ten rectangular families × both axes × NaN/±Infinity (60), two full-blank conflict/Cut List no-throw cases, and two real authoring/final-save transaction cases. Save Cut/Save Part reject malformed offsets; the preview no longer crashes.                                                                  |

## Performance self-audit and second failing-first correction

The initial non-coplanar envelope used eight corners and fell back when those
corners crossed at nearly meeting end planes. An adjacent valid fixture caught
that remaining slow path: two mitres with slope 1.24875, 16 holes in supported
front stock, and only .01-inch width at the back. `f-pinched-red.log` records
**3,645.3ms**, failing the same ceiling, while the exact volume remains
`20.02 - 16 * 8 * .05² * sin(π/8)` in³.

The final six-halfspace intersection removes that fallback. The last focused
physical run (`f-general-envelope.log`) passes **511/511 across five files**,
including previous round 2/3 physical probes, and records:

| Measured cache-cold geometry / downstream operation    | Time   |
| ------------------------------------------------------ | ------ |
| 16-hole compound grid                                  | 8.2ms  |
| 128-hole compound grid                                 | 42.5ms |
| 16-hole collision hull + conflict/Cut List validation  | 2.8ms  |
| 128-hole collision hull + conflict/Cut List validation | 9.5ms  |
| Nearly meeting end planes                              | 5.4ms  |

These fixed-input regression ceilings are 1,000ms for cold geometry and
downstream work and 50ms for identity/label-only cache reuse. Timings are local
macOS arm64 observations, not universal latency promises. The stock-envelope
construction is bounded independently of hole count; pattern/member and
tessellation limits remain unchanged. No worker, network dependency, hidden
deferred computation, or test-only production performance bypass was added.

## Legacy oracle reconciliation

The first broad run (`broad-initial.log`) was **759 passed / 2 failed** across
11 files. Two existing bevel cap-extreme tests selected every vertex within
one percent of the top/bottom thickness. The new triangulation adds legitimate
wall vertices inside that band; for example x=11.007318 at y=-.492682 lies on
the exact x-y=11.5 plane but is not the bottom cap's x=11 value.

`partFeatureGeometry.test.ts` now selects the actual y=±.5 cap (1e-6 coordinate
tolerance) and retains the unchanged literal end-X expectations. This tightens
the oracle rather than relaxing geometry. The subsequent expanded broad run
(`broad-expanded.log`) passed **777/777 across 11 files**; the later near-meeting
case and final envelope also pass in the 511-test physical rerun and full gate.

## Final verification and scope

The first aggregate snapshot passed **4,286 renderer / 213 main / 135 Electron**
(2.3m), but it preceded the near-meeting correction and is not the final stamp.
The final suite includes **110 new renderer tests**: E 27, F 19, G 64.

| Gate                                                  | Final result                                                                                                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Full configured desktop test command                  | PASS: 4,287 renderer / 179 files; 213 main / 9 files; all 135 Electron in 2.3m. Exit 0, `full-desktop-final.log`, after the adjacent correction. |
| Desktop lint / typecheck / configured formatting      | PASS, exit 0; `lint-final.log`, `typecheck-final.log`, `format-final.log`.                                                                       |
| Changed-file docs/test formatting                     | PASS.                                                                                                                                            |
| Production-only build and analytics E2E boundary      | PASS after Electron: 465 main / 2 preload / 2,934 renderer modules; production excludes analytics E2E controls. Exit 0, `production-final.log`.  |
| Staged/whole-branch diff, scope and secret signatures | PASS; `scope-security.log`, zero signatures, focused/skipped tests or debugger residue; no sensitive/distribution paths.                         |

Original R1–R15, scoped A–D, Q1–Q11 and round 3 regressions remain in the full
gate. Numeric geometry assertions are literal planes, ray intersections and
integrated volumes, not geometry fingerprints or mock call counts. Existing
actual PDF-byte assertions and native CSV/PDF export flows remain in full
tests; no PDF code/layout changed and no new visual PDF inspection is claimed.

File schema/loading, app version, dependency manifests/lockfile, website,
analytics, licensing/payment, update channels and installer configuration are
unchanged. No customer project or credential was introduced. Scope is local
macOS arm64, not packaged Windows/Linux/Intel validation.

Code commit: `44033dda82398fd60f0e47883f5da6347706d27c`
(`fix: preserve disconnected stock and responsive cut patterns`). Evidence
follows in `docs: record final custom cuts closure verification`. Canonical QA,
changelog, design wording, previous-report supersession and progress ledger are
updated. Known P0/P1 and requested-finding deferrals are zero.
No subagents, release, push, merge, PR changes, version bump, packaging,
signing, notarization or distribution actions were performed.
