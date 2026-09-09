# Final contact, rotation, and hidden-offset remediation

Status: PASS, unreleased. Both Important findings H/I and Minor finding J closed.
Starting candidate: `d5578d5f7c471aae3da6d75963e94477d9f07258`.
Qualified code: `d984617785ab2c1d8974b51a3f599dcd5b0f4efb`
(`fix: align rotated cut collision and preserve invalid offsets`).
Environment: 2026-09-09, macOS arm64; worktree `.worktrees/custom-cuts-release`,
branch `codex/custom-cuts-release`; desktop remains 1.3.0.

The closure review confirmed the previous performance finding F closed, then
identified H/I/J. This report supersedes round 4's acceptance stamp, not its
historical measurements. No additional independent review or subagent was used.

## Independent RED and root-cause map

All new regressions are in
`packages/desktop/src/renderer/src/utils/customCutsRound5.test.ts`.
Raw evidence: `/tmp/carvd-review-round5.XkjzE8`.

The initial independent reproduction (`initial-red.log`) was **15 failed /
2 passed**: exact rotated contact, both composed-rotation fixtures, and all
twelve malformed hidden-offset combinations failed. The positive-gap and real
intrusion controls already passed. These were behavior/numeric failures, not
test startup errors or mocked geometry expectations.

| Finding                                                             | RED / root cause                                                                                                                                                                                                                                                                         | Production fix and files                                                                                                                                                                                                                                                                                                                                                                                                 | GREEN and adjacent evidence                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H Important: exact contact at Y=88.9° crashes                       | The literal .2-inch probe at board-local (5.1,0,0) throws `Unable to complete output ring`; +.00001-inch gap and -.0001-inch intrusion are controls. World-space polygon reconstruction receives numerically coincident rotated boundary segments. Expanded H RED: 1 failed / 19 passed. | `partFeatureGeometry.ts` triangulates each local remaining polygon with all interior rings, caches the triangles with a bounded geometry-affecting key, and uses strict triangle SAT after a pair-relative transform. Tolerance scales each axis by its length. No blanket exception handling or catch-return-false exists. `overlapPolicy.ts` documents the unchanged flat-material dispatch using triangle separation. | H **20/20**. The exact fixture is tested in both argument orders. Seventeen decimal angles span negative/full-turn/near-90° cases; each checks contact, gap and intrusion at 1e-8, 1e-6 and 1e-4-inch tolerances with nonzero translation, both orders. `h-green.log`.                                                                                                                                                 |
| I Important: multi-axis OBB/snap transforms disagree with rendering | Both XYZ(90,90,0) and XYZ(30,20,40) miss retained-material probes, even though volume is exactly 32 in³ and conflicts are empty. `eulerToAxes` claims XYZ but multiplies Rz*Ry*Rx. Expanded I RED: **5 failed**.                                                                         | `snapToPartsUtil.ts` now uses the allocation-free Rx*Ry*Rz columns equivalent to Three.js Euler('XYZ'). This corrects OBB axes, translated decomposition centers, and the shared local-to-world snap-vertex transform. Single-axis semantics remain unchanged.                                                                                                                                                           | I **5/5**, `i-green.log`. Both review rotations assert all three retained probes and both opening probes in both argument orders. Three composed rotations independently compare every OBB/sub-cell axis, every cell center, and every public snap vertex with actual Three quaternion transforms, including a translated negative/decimal rotation.                                                                   |
| J Minor: hidden invalid offsets silently become zero                | Corner-notch X/Z and dado/stopped-dado Z with NaN/±Infinity are preserved on open, but feature reconstruction rewrites them to zero and enables Save Cut. Adjacent normalization also clears them during unrelated edits. Expanded J RED: **36 failed / 3 canonical controls passed**.   | `partFeatureEditorState.ts` preserves non-finite raw coordinates through normalization (including the tenon early return) and through family-specific feature reconstruction. `PartCutsWorkspace.tsx` keeps Save Cut blocked and offers an accessible `Reset invalid offsets to zero` button inside the specific error. The action changes only invalid coordinates, not finite offsets or dimensions.                   | J **39/39** within the final focused run. All twelve original combinations assert raw/rebuilt/unrelated-edit validation, disabled Save Part/Save Cut, no save callback before correction, explicit reset, valid saved feature, and Cut List recovery. Twenty-four adjacent tenon/edge-notch/groove/rabbet coordinate cases preserve invalid data; three finite canonical family controls retain zero-offset semantics. |

The final focused editor run (`j-final-green.log`) passes **102/102 across two
files**: all 64 new tests plus all 38 existing editor-state tests. Focused CLI
`-t` runs exclude unrelated cases; no source test uses `.only` or `.skip`.

## Fixture/oracle reconciliation

One existing editor normalization assertion required NaN placement to become
zero. That directly contradicted J's explicit-correction requirement. After
observing its failure, `partFeatureEditorState.test.ts` now requires NaN to
remain NaN while retaining the unchanged size-default and negative-finite-offset
assertions. No geometry or physical-fit assertion was weakened.

The first expanded save-output check omitted a stock fixture and consequently
reported `No stock assigned`; an intermediate correction omitted the required
stocks argument. The final test provides a real factory stock with sufficient
dimensions, explicitly requires the malformed-coordinate error before reset,
and requires zero Cut List issues afterward. These intermediate fixture errors
(`j-green.log`, `j-broad.log`) are not counted as product RED or final acceptance.
All initial H/I/J product failures had already been independently confirmed.

## Adjacent self-audit

- H keeps every contour component and hole from round 4; no legacy single-outline
  fallback enters flat collision. Cached local triangles are independent of
  position/rotation and are cleared with geometry. Shape edits invalidate the
  shared key; identity/label changes do not. World translation is removed before
  SAT dot products. There is no blanket error suppression or weakened intrusion
  classification.
- I tests the actual renderer's quaternion, not a duplicated analytical oracle.
  The three `eulerToAxes` consumers are OBB construction, material-subcell
  construction, and public snap-vertex transformation; all are covered directly.
- J keeps malformed values visible to authoring/final/Cut List validation even
  through unrelated normalization. Reset is an explicit named button, uses the
  existing primitive/error architecture, and does not normalize other authored
  fields. Finite canonical offsets remain backward compatible.
- `physical-broad.log` passes **475/475 across five files**: round 3 and round 4
  regressions, geometry, overlap policy, and snapping. This covers disconnected
  stock/order/flip cases, clipped hulls, actual volumes and planes, 16/128-hole
  performance, 128-counterbore combinations, near-meeting end planes, holes and
  ordinary single-axis joinery. The bounded stock-clipping performance fix is
  unchanged; no expensive work was relocated into collision or validation.
- The full gate retains original R1–R15, scoped A–D, Q1–Q11, later remaining-stock
  and no-material checks, physical mirror/recess behavior, dowel relationships,
  exact dimensions, assembly copying, and full fabrication/PDF assertions.
  No PDF generator or layout changed; existing actual PDF-byte tests and native
  export flows pass. No new visual PDF review is claimed.

## Final gates

| Gate / exact command                                                      | Result / evidence                                                                                                                                                                                      |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm test --workspace=@carvd/desktop`                                     | Exit 0. **4,351 renderer / 180 files**, **213 main / 9 files**, **135/135 Electron in 2.3m**. `full-desktop.log`. No failing aggregate run or Electron fixture change in this round.                   |
| `npm run lint --workspace=@carvd/desktop`                                 | Exit 0, `lint-final.log`.                                                                                                                                                                              |
| `npm run typecheck --workspace=@carvd/desktop`                            | Exit 0, `typecheck-final.log`.                                                                                                                                                                         |
| `npm run format:check --workspace=@carvd/desktop`                         | Exit 0, all configured files formatted; `format-final.log`. Changed docs also pass Prettier.                                                                                                           |
| `npm run verify:production-analytics-boundary --workspace=@carvd/desktop` | Exit 0, after Electron. Fresh production build: 465 main / 2 preload / 2,936 renderer modules; analytics E2E controls absent. `production-final.log`.                                                  |
| `git diff --check`, staged diff check, staged and whole-branch audit      | Clean. `scope-security.log`: zero secret signatures, focused/skipped source tests, debugger statements, or forbidden new scope paths. Code commit contains nine scoped code/test/changelog/spec files. |

There are **64 net new renderer tests**: H 20, I 5, J 39. Exact geometry, volume,
contact and transform expectations remain in the full suite. Documentation and
canonical QA are stamped to the tested code commit; evidence follows in a
separate conventional documentation commit.

No known requested Critical/Important/P0/P1 remains; no finding is deferred.
File schema/loading, app version, dependencies/lockfile, website, analytics,
licensing, payment, installer and distribution configuration are unchanged.
No customer data or credentials were introduced. Qualification is local macOS
arm64, not packaged Windows/Linux/Intel testing. No subagents, release, push,
merge, PR, version bump, packaging, signing, notarization or distribution action.
