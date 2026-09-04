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
