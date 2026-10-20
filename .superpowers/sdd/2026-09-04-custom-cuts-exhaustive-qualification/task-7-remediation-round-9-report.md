# Closure remediation round 9 — N1–N4 and macOS test isolation

Status: all requested fixes and final gates PASS; unreleased.
Starting candidate: `1548fe6af7956c148da3e3c36708647ef480633a`.
Qualified code: `4724ed383228f2970958feb97c3971117cdafc25`.
Environment: 2026-09-09, macOS arm64, Node 23.10.0, branch
`codex/custom-cuts-release`, worktree `.worktrees/custom-cuts-release`.
Desktop remains 1.3.0. No additional subagent or independent reviewer.

## Independent RED

Raw logs: `/tmp/carvd-review-round9.7m217F`.

- `transactions-red2.log`: **6 failed / 6 total**, real project/session stores
  and production serialization. N1 ends with Older instead of NEWEST; N2
  retargets New and Open to the first file, and Save As renames/writes a
  replacement document; N3 applies both path/dialog delayed reads after a cut
  session starts. The initial `transactions-red.log` had four product failures
  and two test-API errors (`setInspectorDirty` does not exist); the corrected
  test uses the real `registerInspector` action. Only the rerun is counted as
  complete six-defect proof.
- `electron-red.log`: **5 failed / 1 control passed (33.5s)**. All failures reach
  production behavior using real main-process fs gates, real physical files and
  actual application/window close. N1 closes before the earlier write completes
  and the final file contains Older. N2 changes the second document's file path
  to the first file, then writes Second newest into that first file while the
  second file stays unchanged. N3 loses the unsaved inspector. N4 Save and
  Don't Save close the window but process exitCode remains null; Cancel is the
  passing control.
- `adjacent-red.log`: **4 failed / 4 total**. Clean window close, Don't Save
  close and Don't Save reload destroy the renderer before an already-requested
  manual write drains. A rejected cut validation also retains Quit intent,
  unexpectedly terminating after the later ordinary window discard.
- `main-order-red.log`: **1 failed / 1 total**. Two independent requests at the
  actual preload/main file-write boundary complete in reverse order; the
  physical file contains Older IPC instead of Newest IPC.
- `relocation-red.log`: **1 failed / 14 excluded**. The real file hook, stores
  and file utility lose the original replacement approval during the chooser.
  An edit made while choosing a relocated file is replaced by that file.

Each fix follows its corresponding RED reproduction. No file-content, identity,
process-exit, validation, or pending-write assertion was relaxed.

## N1 Important — order and drain every save transaction

Root cause: each manual/native/autosave/Save As/close call independently ran
thumbnail generation and file I/O. A later close-save could finish while an
earlier manual write remained suspended; revision-aware dirty checks did not
prevent that earlier write from subsequently overwriting the disk. Main's
write-file IPC also admitted independent concurrent writes.

Fix: `utils/fileOperations.ts` queues the **entire** save operation and captures
the requested document state before queueing. A slow thumbnail cannot move an
older write after a newer write; failed jobs settle and allow later jobs to run.
Save As participates in the same queue. `main/index.ts` serializes physical text
writes too, covering independent IPC callers and path aliases without relying
on per-renderer state. The renderer awaits the main write acknowledgement.

`hooks/useFileOperations.tsx` drains pending saves before clean close, close
after Don't Save, and reload. Close/reload dialogs remain busy while draining;
clean close rechecks live dirtiness after its wait. A later save does not
implicitly cancel an earlier explicit save. Newer edit/revision checks from
round 8 remain active and older writes cannot mark a newer revision clean.

Tests: `utils/customCutsRound9Transactions.test.ts` covers manual/auto/manual
ordering, delayed thumbnail and write stages, a failed middle job, multiple
queued jobs and Save As to a second destination. Both files must contain NEWEST.
`tests/e2e/custom-cuts-round9.spec.ts` holds real main Node file I/O, checks
actual window/reload timing, drains before destruction, and parses physical
files after the queued jobs finish. The independent main-boundary test proves
that ordering is not merely an assumption enforced by renderer mocks.

Initial focused N1 **1/1 GREEN**; expanded queue/ownership/open suite **14/14**
before the relocation addition. Original actual N1 is GREEN in the **6/6**
initial Electron rerun, drain controls in **10/10 (9.0s)**, and independent-main
ordering passes in the combined run described below.

## N2 Important — keep saves attached to their document

Root cause: save completion called the current store's setFilePath/markDirty
even when New/Open had replaced its document. Comparing dimensions/arrays is
not an ownership check; two distinct documents can contain the same data.
Save As also used whichever document was present when its chooser resolved.

Fix: `projectStore.ts` has a runtime `documentGeneration` that increments on
every New/load. It is excluded from temporal history and file serialization.
Each queued save retains its generation and immutable fields. After all I/O,
the save updates path/dirty state only if it still owns the current document;
otherwise it returns `documentChanged` without mutating that replacement.
Save As checks ownership before and after the chooser and retains its original
snapshot. A dialog save refuses destructive completion when ownership changed.

Tests cover New, load/Open, a pending Save As chooser, generation changes and
undo/file compatibility. The real Electron Open Recent test deliberately opens
a second physical project while the first write is held, releases that write,
then saves a newer edit. The first file retains Older; the second receives
Second newest; the active path and clean state belong to the second document.
Initial N1/N2 **4/4 GREEN**, then all six initial transaction cases pass.

## N3 Important — validate the complete replacement transaction

Root cause: shared file handlers checked editing state before awaiting native
dialogs or reads, then unconditionally loaded the result. Starting/editing cuts
during a held read could therefore leave an orphaned session. Relocation began
its Open transaction only after its chooser/recent-path update, losing the
original approval boundary.

Fix: the central file utility captures a replacement token containing request
order, document generation, file path, immutable document fields, and cut-session
generation. It validates before work and again after I/O, before parsing,
recovery or load side effects. Active cuts or any changed token component refuse
replacement with an actionable message that the current work was kept. Later
Open requests supersede older reads. `partCutsEditingStore.ts` increments a
runtime session generation on start/finish, so even an enter/exit cycle during
I/O invalidates the old approval. Relocation explicitly carries the same token
from before its chooser through `openProjectFromPath`.

Tests cover both Open/path entry points, newly active inspector, newer project,
ordinary data edit, session cycle, Save As during a read, reversed completion of
two Opens, and the actual hook's relocation chooser. Electron uses a real fs
read gate while the user enters Part Cuts and changes its label; after release
the inspector/value/source part remain present and linked. Initial N3 **2/2
GREEN** within the six-case suite; the later relocation case independently
fails before its fix and is included in final focused/full gates.

## N4 pre-existing Important — resume macOS Quit

Root cause: Electron cancels the original app.quit when the close listener
prevents a window close. Renderer confirmation subsequently called only
win.close. macOS intentionally keeps a windowless application alive, so Quit
never resumed even though Save/Don't Save succeeded.

Fix: `main/index.ts` retains Quit intent from before-quit. When the last tracked
window closes after renderer approval/draining, a deferred app.quit resumes
termination. Cancel or a failed save clears the intent through cancel-close;
rejected inspector validation now clears it as well. Ordinary macOS window
close remains window-only. Other platforms keep their existing last-window
termination behavior.

Tests invoke actual app.quit and assert the **child process exitCode**, not
merely window closure. Save verifies the physical file contains the inspector
label; Don't Save verifies it retains Original. Cancel preserves inspector and
process, and a subsequent ordinary window close does not quit on macOS.
Rejected validation then ordinary discard has its own RED-to-GREEN probe.
All original N4 flows pass in **6/6 (5.8s)**; validation-intent control passes
in the expanded **10/10** rerun. Existing failure/retry and first Save As/cancel
flows from rounds 7–8 remain in the full gate.

## Adjacent audit and verification

### User-reported macOS restoration warning

The user reported the native “last time you opened Electron” restoration warning.
Broad launches were paused immediately and the in-progress Playwright driver was
interrupted with SIGINT at a safe boundary. No generic Electron preferences,
saved-state directory, installed runtime, or global macOS default was edited.
That interrupted `full-desktop-final.log` run ended **161 passed / 5 failed /
4 interrupted / 22 not run**, exit 130. Its renderer/main stages had passed;
it is not counted as a complete Electron gate.

The warning's cross-test attribution came from the shared `com.github.Electron`
bundle identity: a fresh Chromium userData directory does not create a fresh
AppKit application identity. Both old harness cleanup paths raced normal quit
against five seconds and fell back to SIGKILL; normal teardown also called
BrowserWindow.destroy. Read-only macOS crash reports additionally identified
real earlier native SIGSEGVs during NSWindow activation. Those reports do not
prove that every crash was caused by teardown, so this report does not label
all previous startup failures as harmless environment flakiness.

`harness-red.log`: **2 failed / 2** without launching an app. The hardware-boundary
fake recorded destroy → quit → kill after five seconds; the launch used no
isolated executable. `harness-clone-red.log`: **1 failed / 4 excluded**, proving
that the first runtime-copy implementation rewrote relative framework symlinks
to absolute paths back into installed Electron. Its single smoke failed and
produced helper SIGTRAP reports; the test runner's later cleanup terminated the
stalled process without a signal command from this agent. No broad rerun was
attempted between the failed smoke and the corrected self-contained smoke.

Fix in `tests/e2e/helpers/electron-runtime.ts`: APFS copy-on-write creates a
temporary development runtime with a UUID-scoped bundle identity for the main
application and every helper. Relative framework symlinks remain relative and
resolve inside the copied bundle. Display names identify Carvd E2E; internal
executable/helper basenames stay compatible with Electron. The installed
runtime is untouched. The existing linker/ad-hoc signature does not bind its
Info.plist; no signing command, packaging tool, version, or dependency change
was used. Read-only `codesign --verify` reports the same pre-existing unsealed
resource limitation for installed and copied development runtimes, not a new
distribution-signature claim. Playwright's installed loader remains explicitly
injected when using executablePath.
`runtime-integrity.log` independently verifies byte-identical main executable,
framework binary and generic helper binary, **zero absolute symlinks**, and an
existing installed Playwright loader. This check creates no application process.

`helpers/electron-app.ts` approves only synthetic test-window close listeners
during teardown, calls normal Playwright/app.quit, and waits for actual process
exit before removing the profile/runtime. There is no owned destroy/SIGKILL
fallback. A 30-second failure preserves artifacts and reports that launches
must stop; Playwright itself still has emergency process cleanup outside this
helper, which is another reason every runtime needs its own native identity.
Failed-launch diagnostics retain both the original and cleanup errors plus
recent main stderr. Cleanup targets only the current UUID's test artifacts.

`harness-green-complete.log`: **5/5 main-harness tests** including six-second
graceful quit, stuck-quit preservation, already-exited cleanup, launch identity,
and framework/helper isolation. `harness-smoke-self-contained.log`: **1/1 real
Electron smoke (5.1s)**: rendered project, unique executable/identity, exitCode
0 with signalCode null, no fatal/helper-crash output or matching new crash report,
and byte-identical generic Electron preferences/installed plist. Only after
those four conditions passed did the complete isolated suite resume, with
`--max-failures=1` as a stop-on-first-failure safety bound.

The first full isolated run stopped at **106 passed / 1 teardown failure /
3 interrupted / 83 not run (3.1m)**. N4's Save behavior had correctly written
and terminated the process, but Playwright had disposed the application wrapper
before afterEach called `.process()`. `harness-disposed-red.log` independently
reproduces that failure (**1 failed / 5 excluded**). The launcher now retains
the original ChildProcess handle; teardown uses its authoritative exit status
even after Playwright channel disposal. `harness-disposed-green.log`: **6/6**.
The exact N4 Save case then passes **1/1 (5.5s)** with real process exit and file
contents, unchanged generic preferences hash, absent generic savedState both
before/after, and no new Electron crash report. Only then was one complete
fail-fast isolated matrix restarted. No product assertion was weakened.

If an already-existing generic Electron restoration warning is still visible,
choose **Don't Reopen** once. No Carvd project needs deletion or reset. New tests
do not reuse that generic identity. Primary behavior references:
[Electron app.quit](https://www.electronjs.org/docs/latest/api/app#appquit),
[Apple preference domains](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/UserDefaults/AboutPreferenceDomains/AboutPreferenceDomains.html).

### Product and broad gates

- The shared queue covers all consumers of saveProject/saveProjectAs, including
  auto-save; the main queue protects independent callers. There is no per-menu
  write implementation or new test-only production API.
- Generation ownership is separate from content equality and is not rewound by
  undo. Existing immutable snapshots still preserve authored cut precision.
- Read approval is rechecked immediately before synchronous load; delayed
  dialogs, relocation, file associations and recent/favorite paths use the
  shared utility. Current work is kept rather than silently dropping a session.
- Previous R1–R15, scoped A–D, Q1–Q11, closure A–J, K1–K8, L1–L3 and M1–M3
  regressions remain enabled. No geometry, PDF/CSV layout, dependency, version,
  packaging or distribution change. Actual-PDF precision/layout tests remain
  in the renderer suite; prior visual evidence is unchanged.
- `electron-focused-final.log`: **35 passed / 4 failed (2.0m)**. All eleven
  round-9 cases pass. Four round-8 cases fail before test setup: no application
  .app root appeared within the existing 90-second startup bound. No product
  assertion ran in those four; no timeout was extended or assertion relaxed.
- The first full run stops at **4,526 passed / 1 failed** renderer test: Vitest
  resets the new mocked replacement-token return. The real relocation test
  already passes; the legacy hook fixture now restores that return in beforeEach
  and continues asserting that the original token reaches the open boundary.

| Gate                                 | Final evidence                                                                                                                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Focused lifecycle/transactions       | `focused-final2.log`: **199/199**, five files; harness final **6/6**.                                                                                                                                                                |
| Complete renderer                    | `full-unit-final.log`: **4,527/4,527**, 187 files.                                                                                                                                                                                   |
| Complete main                        | Same final unit command: **221/221**, 11 files.                                                                                                                                                                                      |
| Complete Electron                    | `full-electron-isolated-final.log`: **193/193 (5.8m)**, exit 0; no failed, interrupted or skipped tests.                                                                                                                             |
| Lint/typecheck/configured formatting | `lint-final-complete.log`, `typecheck-final-complete.log`, `format-final-complete.log`: PASS; changed Electron/doc formatting separately checked.                                                                                    |
| Production build/analytics boundary  | `production-boundary-final.log`: production build PASS, E2E analytics controls absent. Executed only after Electron exited.                                                                                                          |
| Runtime/restoration                  | Binary hash and relative-link audit PASS; final generic preferences unchanged, generic savedState absent, no new Electron crash report after the corrected isolated smoke, no surviving test runtime process.                        |
| Diff/scope/security                  | `git diff --check` PASS; whole-branch and current-round added-line audit has zero secret signatures, focused/skipped tests, debugger statements, unexpected scope, dependency/version/distribution changes, deletes or mode changes. |

Total final passing tests: **4,941**. Known open product P0/P1: **0**; no
requested finding deferred. Previous PDF visual layouts are unchanged and their
actual-document regression tests remain in the complete renderer gate.

Final scope: **17 changed files** relative to the starting candidate, consisting
of 14 implementation/test/changelog/spec files and three qualification evidence
files. The code commit's pre-commit formatting checks pass; evidence formatting
and `git diff --check` pass. Common secret signature counts are all zero; there
are no focused/skipped tests, debugger statements, prohibited scope, deleted
files or mode changes. Production output was rebuilt without test controls.

Net new regressions: **15 renderer, 6 main-harness and 12 real-Electron tests**.
No requested N1–N4 finding is deferred. No release, push, merge, PR, version,
dependency, packaging, signing, notarization or distribution action performed.
