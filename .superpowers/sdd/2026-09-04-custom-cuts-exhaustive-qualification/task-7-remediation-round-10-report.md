# Closure remediation round 10 — P1 queued Save As destination

Status: all requested fixes and final gates PASS; unreleased.
Starting candidate: `2974a20ad2fc834f2d5954633956117baef3d1c4`.
Qualified code: `50acf3b47eb6ff30827593dfd12fd019dac60c85`.
Environment: 2026-09-09, macOS 26.6.2 arm64, Node 23.10.0/npm 10.9.2,
desktop 1.3.0, Electron 41.1.1/Playwright 1.59.1.
Branch: `codex/custom-cuts-release`, worktree `.worktrees/custom-cuts-release`.
No additional agent or independent reviewer.

## Independent RED and root cause

Raw evidence directory: `/tmp/carvd-review-round10.teS4MK`.

`primary-red.log`: **3 failed / 3 total**, before the production fix. Two
production utility tests prove manual and automatic saves requested during a
held Save As write leave the copy with Older instead of LATEST. The third uses
the actual file hook, project store, serialization and rendered close dialog:
confirmation observes the original active path and Older in the copy. Only the
external Electron file/dialog boundary is replaced by an in-memory disk; the
save/close implementation is not mocked.

Root cause: round 9's FIFO correctly serialized the complete save and captured
each requested immutable content snapshot, but also captured its filePath.
Later ordinary saves thus ran after Save As but still wrote its predecessor's
path and retargeted the live document back to that path. Content-generation
checks alone cannot identify the correct destination within the same document.

Primary fix: `src/renderer/src/utils/fileOperations.ts` captures a shared,
generation-owned save context for queued requests. Each request keeps its own
content; its destination is resolved from the context only when it executes.
A successful preceding Save As advances the context. Failure/cancellation
leaves its last successful path intact. A new document gets a new context;
already queued old-document jobs keep their own context and cannot mutate the
replacement. Contexts are discarded when the queue drains. No schema, main
IPC, renderer test API or dependency change is required.

`primary-green.log`: **3 passed / 3**, before expanding the adjacent matrix.

`adjacent-red-direct.log`: **5 failed / 7 controls passed (12 total)**, after
the primary path fix but before the adjacent metadata fix. Two initial/existing
file saves queued before the chooser resolved wrote the stale project name.
Failed Save As and repeated Save As sequences also left a false pendingChanges
result. Save As changed the live filename-derived name before successful I/O,
while queued snapshots retained the previous name.

Adjacent fix: automatic name transitions belong to the same document context.
A queued snapshot replays only transitions since its request and only when its
name matches the preceding name, preserving an authored name change. Save As
commits the live automatic name only after a successful write and only if that
name has not since been edited. Cancellation or failed writes do not rename the
project. Existing live-revision and document-generation checks still determine
dirty state and destructive-action approval. No precision, content, ordering,
ownership, or pendingChanges assertion was weakened.

## Test and file mapping

`src/renderer/src/utils/customCutsRound10Transactions.test.ts` adds **16 tests**:

- Save As to held-write destination, then manual or autosave; original retains
  Older, copy receives LATEST, active destination is copy and project is clean.
- The actual hook/dialog close-save does not confirm until the copy contains
  LATEST; it confirms with that copy as the active path.
- Existing-file and first-ever saves queued while the chooser is pending;
  filename-derived metadata is correct, clean result is exact, one chooser.
- Save As cancellation/failure with queued manual and auto saves; last save
  succeeds at the original destination without spurious pendingChanges.
- A second explicit Save As succeeds, cancels or fails; only succeeding saves
  inherit the last successful destination. Intermediate snapshots remain exact.
- New/Open during the held Save As plus old and new queued saves; old results
  report documentChanged, original is unchanged, first copy and second file
  contain only their own latest requested edits, second remains active/clean.
- Authored name change during Save As remains in the later queued snapshot;
  the earlier result reports pendingChanges and cannot mark it clean early.
- Failed middle autosave between Save As and latest save; ordered attempts
  contain Older, Failed middle, LATEST, all targeting copy, queue recovers.
- Initial Save As failure/cancellation permits the next save to choose a valid
  path and save its latest content instead of inheriting an invalid destination.

`expanded-green.log`: **195/195** across the new initial 12 cases, round 9
transactions, existing file utilities and real hooks.
`focused-final.log`: **199/199** after all 16 new cases; four test files.

`tests/e2e/custom-cuts-round9.spec.ts` adds two explicitly labeled P1 native
tests using its established isolated runtime fixture. The actual Save As menu
chooses a new copy, real main-process Node writeFile is deterministically held,
notes change to LATEST, and the actual BrowserWindow close or app.quit is
requested. Dialog Save cannot complete before the held write is released.
The original physical file must remain byte-for-byte unchanged, while the copy
has LATEST, the copy-derived name, and the unchanged cut label. Quit additionally
asserts child process exitCode 0 and signalCode null. No production save logic
is replaced or bypassed.

`targeted-electron.log`: **2/2 (6.9s)**, after the fresh instrumented build
completed. No Electron launch was used during RED diagnosis. The committed
round 9 UUID runtime/graceful teardown was used unchanged. After this targeted
run, generic preferences retained SHA-256
`ff9059aacede04b18eef227701d378cd934b7420bd03f25719c9c31ffdc1a821`, generic
savedState remained absent and no new Electron crash report appeared. Only then
was the one full fail-fast isolated matrix started.

## Self-audit and full gates

The first full isolated run (`full-electron.log`) stopped fail-fast at **57
passed / 1 failed / 3 interrupted / 134 not run (2.1m)**. The existing K7 logo
test timed out before its first Edit Part Cuts action: the retained failure
accessibility snapshot identified the first-run Welcome Tutorial and the click
log showed its modal overlay intercepting input. Round 6 launched a fresh user
profile without seeding completed-welcome status, permitting asynchronous
onboarding to appear after the synthetic project was seeded. This is a fixture
precondition, not a save, navigation, or native crash failure.

`tests/e2e/custom-cuts-round6.spec.ts` now passes the existing
`hasCompletedWelcome: true` launch option, consistent with round 7's existing
user fixture. This seeds only the test profile before startup. No onboarding
production behavior, onboarding test coverage, click force, timeout, or product
assertion changed. `welcome-fixture-green.log`: exact failed case **1/1 (6.3s)**.
Generic preferences remained byte-identical, generic savedState absent, no new
native Electron crash reports and no surviving test app after the failed run
or focused rerun. Only then was the full fail-fast isolated matrix restarted.

- Native/header/keyboard saves and destructive-dialog saves use the shared
  utility; `hooks/useAutoSave.ts` calls saveProject('auto'). No route-specific
  alternate write or new production testing control was added.
- The preceding N1 main-process physical-write FIFO, N2 generation ownership,
  N3 replacement/session approval, N4 Quit lifecycle and M1–M3 dirty/revision
  guards are unchanged and remain in the full suites.
- All previous R1–R15, scoped A–D, Q1–Q11, closure A–J, K1–K8 and L1–L3
  geometry, collision/performance, precision, fabrication, PDF and inspector
  regressions are still in the complete renderer/Electron suites. No geometry,
  PDF layout or exported content formatter changed in this round, so no new
  PDF rendering/visual inspection is warranted; existing actual-PDF tests run.
- This is an adjacent self-audit, not an independent review or a claim of
  cross-platform installer/distribution qualification.

| Gate                                        | Evidence/result                                                                                    |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Full renderer                               | `full-unit.log`: **4,543/4,543**, 188 files, 15.49s                                                |
| Full main                                   | Same command: **221/221**, 11 files, 1.27s; includes all six harness tests                         |
| Full real Electron                          | `full-electron-final.log`: **195/195 (6.1m)**, isolated graceful runtime, fail-fast                |
| Lint                                        | `lint.log`: PASS, zero warnings                                                                    |
| Typecheck                                   | `typecheck.log`: PASS                                                                              |
| Configured format                           | `format.log`: PASS                                                                                 |
| Instrumented build                          | `instrumented-build.log`: PASS; completed before targeted/full Electron                            |
| Production/analytics boundary               | `production-boundary.log`: PASS; production build excludes E2E controls; run after Electron exited |
| Changed-file formatting/diff/scope/security | PASS; configured/source/E2E formatting, diff and added-line audits are clean                       |

Final total: **4,959 passing tests**, including **16 new renderer and two new
real-Electron regressions**. The failed aggregate is retained separately from
the complete final rerun. `runtime-audit.log` confirms byte-identical generic
Electron preferences, absent generic savedState, no new Electron crash reports
since this round began, and zero surviving test app processes. Production
output was rebuilt without analytics E2E controls. Build plugin-timing and
Playwright color-environment warnings were non-fatal; no test assertion was
relaxed to obtain a pass.

Final scope: nine files (six implementation/test/changelog/spec files and
three qualification evidence files). Current-round and whole-branch added-line
audits find no common secret signatures; current-round checks find no focused
or skipped tests, debugger statements, unexpected scope, version/dependency or
distribution changes, deleted files or changed modes. Known open P0/P1: **0**;
no requested finding deferred. Implementation commit `50acf3b47eb6ff30827593dfd12fd019dac60c85`
contains the six code/test/changelog/spec files; its staged formatting checks
pass. The three qualification evidence files follow in a separate docs commit.
No release, push, merge, PR, version, dependency, package, signing, notarization
or distribution action was performed.
