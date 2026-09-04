# Task 4 Report: Custom Cut Joinery Fits

## Status

Implemented and qualified the joinery-fit path for dados, grooves, stopped grooves, rabbets, complementary half laps, and mortise/tenon assemblies. Compatible mates now carry their host identity through preview, collision resolution, release, and store commit; the collision exemption is narrowly revalidated against the exact socket geometry.

## Root-cause findings

Both initial hypotheses were confirmed:

1. `detectFeatureMateSnaps` identified the compatible host, but `mateHostPartId` was discarded before Prevent Overlap. The exact seated transform was therefore tested as ordinary whole-solid overlap and clamped away.
2. Blind sockets are not subtracted from the host collision OBB. Valid insertion requires a narrow, geometry-revalidated mate-host exemption rather than treating all host overlap as safe.

Electron tracing found one additional interface edge: a holistic mortise mate can return cross-section axes to their drag-origin values. The generic anti-return guard rejected those axes, withheld the mate identity, and triggered a collision clamp. Mate completion now fills only axes with no competing winner, retains the ground guard, and leaves higher-priority guide/origin winners untouched.

## Implementation

- Added a typed mate result and preserved `mateHostPartId` across move preview, move-tool candidates, constraint context, release resolution, drag state, commit instructions, and the project-store overlap check.
- Reworked the overlap exception to accept one detected mate host and re-run feature-mate detection at the proposed exact position. Unrelated parts, forged host IDs, and plain solid hosts remain collision blockers.
- Added socket geometry for top/bottom edge rabbets, stopped-channel termination checks, authored tenon tongue geometry/depth matching, and complementary blind half-lap remaining-solid geometry.
- Added holistic mate completion for face-drag axes that are locked or whose exact socket center is the drag origin, without weakening ordinary snap precedence.
- Added Electron assembly qualification using real keyboard rotations and canvas pointer drags. Store access is limited to deterministic fixture setup and post-action inspection.

## Qualification evidence

- TDD RED proved an exact dado/mortise seat is clamped when the mate host identity is omitted.
- Unit/integration coverage proves valid mate seating, holistic cross-axis mortise centering, ordinary overlap rejection, stopped termination, rabbet sockets, half-lap depth matching, tenon depth matching, and store-commit identity propagation.
- Electron coverage proves:
  - `.755 in` dado with `.75 in` nominal and `.74 in` clearance dividers seats at the blind floor; `.80 in` is rejected.
  - Full groove, stopped groove, and rabbet seats; a mate beyond a stopped termination does not snap.
  - Complementary half laps rotate and seat flush; editing one blind depth persists and visibly reports the resulting overlap.
  - A tenon seats its shoulder at the matching mortise surface through Prevent Overlap.
  - Moving the cut host afterward preserves its feature data and does not weld or teleport the mating part.

## Verification

- Focused Vitest suites: 6 files, 296 tests passed.
- Desktop lint: passed with zero warnings.
- Desktop typecheck: passed.
- Desktop renderer tests: 173 files, 3,710 tests passed.
- Desktop main-process tests: 9 files, 213 tests passed.
- Fresh desktop production build: passed.
- `custom-cuts-assembly.spec.ts`: 4/4 passed from the fresh production build.
- Full Electron run: all 4 new assembly tests passed; overall 122/123 passed. The unrelated existing `part-cuts-lifecycle` circular-operations case timed out with the countersink `Save Cut` button disabled and reproduced when rerun alone.
- Prettier: passed for every changed file.
- `git diff --check`: passed.

## Concerns

No known Task 4 functional blocker. The socket exception intentionally remains detector-based because the ordinary collision model uses broad host OBBs rather than subtractive void solids; review-round material-cell validation now guards that narrow policy path. Future boolean collision geometry could replace the exception. The independently reproducible countersink lifecycle E2E failure above remains outside this joinery-fit change.

## Review round 1 — exhaustive mate safety

The first review identified five gaps in the initial narrow exemption. Each was reproduced before implementation and closed with a regression at the affected production boundary:

- Shorter members now must remain laterally contained on both socket tangents. Tight dimensions are still centered, while loose dimensions can slide only between the stopped channel's exact ends (within the existing dimensional tolerance). Tests cover an interior position, exact contact at each end, and positions beyond both ends.
- A detected mate no longer exempts its whole host immediately. Rectangular blind/through cuts and tenon shoulders are decomposed into material OBB cells, and every mover cell is checked against every host cell before the identity is accepted. Blind-cut remaining-solid mates must also present the opposite opening face. Exact complementary half laps seat; wrong-face, partial-length, partial-width, offset, and depth-mismatched laps remain blocked. The partial and offset cases explicitly prove that the narrow synthetic shape still matches, so the whole-material check is the defense.
- Store fallback is now restricted to an actual position-only update. A combined move plus resize from `.75 in` to `.80 in` is rejected rather than validating stale `.75 in` geometry and committing the oversized part.
- Preview reports snapped axes from accepted arbitration winners, including holistic mate axes with no visual line. Pointer-up uses a tested release helper that preserves all accepted axes before applying Live Grid Snapping. An off-grid socket regression proves the exact three-axis mate survives release.
- Holistic socket mating is deliberately suppressed for multi-selection. This is the smallest safe behavior because group release and batch store updates do not carry one host identity; preview and commit therefore remain consistent while ordinary group snapping/collision protection stays active.

### Review-round verification

- Review-focused Vitest suites: 5 files, 301 tests passed.
- Full desktop renderer tests: 173 files, 3,716 tests passed.
- Full desktop main-process tests: 9 files, 213 tests passed.
- Desktop lint and typecheck: passed.
- Fresh production Electron build: passed.
- `custom-cuts-assembly.spec.ts`: 4/4 passed, including complementary half laps and the real mortise/tenon gesture.
- Full Electron run: all 4 assembly tests passed; overall 122/123 passed. The sole failure is the same unrelated countersink lifecycle case documented above (`Save Cut` disabled at `part-cuts-lifecycle.spec.ts:935`).
- Prettier and `git diff --check`: passed for all changed files.

The material-cell proof is intentionally conservative outside supported rectangular top/bottom operations and tenon shoulders: unsupported removed geometry is treated as solid, which may decline a future exotic mate but cannot create a collision bypass. There is no known Task 4 blocker.

## Review round 2 — rendered geometry and group-path consistency

The second review found that feature mating and collision material used authored contour Z directly even though the renderer maps contour Z to part-local Z with a sign inversion. It also found that axes already exactly aligned to a holistic mate were absent from the snapped-axis result, and that the group solver still exposed single-part mate detection.

- Added one rendered-local-Z interval conversion and applied it consistently to rectangular socket centers, host cut-volume material cells, tenon tongue material/mate shapes, and blind-cut remaining-solid mate shapes. Render-ray characterization and collision regressions cover off-center mortise, stopped-groove, and cutout voids: a member seats in the visible void, while the mirrored solid location cannot detect or claim a host exemption. An off-center tenon regression additionally proves both its visible tongue placement and exact moving-material validation.
- Mate candidates now carry the world axes constrained by their insertion normal and tight tangents. Those axes remain snapped even when their accepted delta is zero, so an exact off-grid tangent survives Live Grid release while only the insertion axis moves. Loose sliding tangents remain unconstrained.
- Removed mate detection from the group preview solver. A selected-group Electron RED then exposed a second ownership defect: the central canvas fallback launched a direct-part drag over the already-started group drag and restored the forbidden mate. The fallback now yields whenever the hit part belongs to a selected group. A real pointer gesture on a singleton group proves the live preview contains only ordinary face/surface winners, release commits the same non-penetrating transform, selection remains group-only, and ordinary collision protection remains active.
- Updated legacy mortise, half-lap, and rabbet qualification fixtures that intentionally targeted the former mirrored cross-width coordinate so they continue to describe the same visibly rendered geometry.

### Review-round-2 verification

- Review-focused Vitest suites: 5 files, 229 tests passed.
- Full desktop renderer tests: 173 files, 3,727 tests passed.
- Full desktop main-process tests: 9 files, 213 tests passed.
- Desktop lint and typecheck: passed.
- Fresh production Electron build: passed.
- `custom-cuts-assembly.spec.ts`: 5/5 passed, including the real selected singleton-group gesture.
- Full Electron run: all 5 assembly tests passed; overall 123/124 passed. The sole failure is the same unrelated countersink lifecycle case documented above (`Save Cut` disabled at `part-cuts-lifecycle.spec.ts:935`).
- Prettier and `git diff --check`: passed for all changed files.

There is no known Task 4 blocker. The selected-group fallback guard is deliberately narrow: it changes ownership only for a part already contained by the active selected group and leaves direct-part and ordinary multi-part fallback behavior unchanged.
