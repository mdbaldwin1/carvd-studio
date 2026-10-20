# Closure remediation round 8 — M1–M3

Status: all M1–M3 fixed; complete final desktop/static gates PASS; unreleased.
Starting candidate: `397556d99004fc201a7a9ab3fde533e67cd6523c`.
Qualified code: `1c53cfabaffee1190b4759c9b6314a8d8df636c3`
(`fix: guard project replacement reload and pending saves`).
Environment: 2026-09-09, macOS arm64, Node 23.10.0, branch
`codex/custom-cuts-release`, worktree `.worktrees/custom-cuts-release`.
Desktop remains 1.3.0. No subagent or additional reviewer was used.

## Independent RED evidence

Raw commands/output are in `/tmp/carvd-review-round8.OSrUfn`.

- `renderer-red.log`: **12 failed / 145 excluded**. Ten M1 failures cover
  direct New/Open/recent/relocate/file-association/Home and Ctrl/Meta N/O from
  a focused button. Two M3 failures prove that the pending close dialog is
  dismissed/reentrant and an older write marks a newer real-store edit clean.
- `menu-red.log`: **2 failed / 2 total**. The actual native menu template
  exposes destructive Reload/Force Reload roles rather than requesting renderer
  approval. Both fail the no-role and explicit guarded-dispatch assertions.
- `electron-m23-red.log`: **3 failed / 3 total**. Actual application-menu Reload
  and Force Reload discard the active inspector without a dialog. The actual
  BrowserWindow-close test reaches the delayed real main-process write, then
  finds the dialog hidden and no disabled Saving control.
- `menu-busy-red.log`: **8 failed / 32 excluded**. During a pending close-save,
  native New, New from Template, Open, Recent, Save, Save As, Close Project and
  Reload still run. This adjacent bypass was reproduced before adding the
  shared busy guard to native command dispatch.

These reproductions precede their production fixes. Initial/intermediate
Electron runs also encountered test-harness errors: warning toasts were queried
as `role=alert`, Electron normalized `forceReload` role case, dynamic imports
were unavailable in the evaluator, `expect.soft.poll` is not a Playwright API,
and project notes were asserted at the wrong JSON level. These are **not counted
as product RED evidence**. They were corrected using exact visible warning
text, normalized role/ID lookup, `process.getBuiltinModule`, `expect.poll`, and
the actual `project.projectNotes` schema. No persistence, refusal, timing,
identity, validation, or file-content expectation was weakened.

## Finding-to-fix mapping

### M1 Important — New/Open bypass while editing cuts

Root cause: native menu dispatch protected focused editing modes, but the
renderer keyboard listener and direct file hooks called unguarded New/Open
handlers. Inspector-only edits leave the project clean, so the project-only
unsaved check allowed replacement and could leave an orphaned cut session.

Fix: `hooks/useFileOperations.tsx` checks both the current mode option and live
Part Cuts store at the shared replacement boundary. New, Open, recent/favorite
paths, missing-file relocation, OS file association and direct Home refuse
replacement with “Save or discard part cuts before changing projects.” Existing
logo/Exit flows retain their session-exit prompt. Native commands use the same
actionable copy. The file-association effect now returns its existing preload
unsubscribe function so changing the guard cannot accumulate stale listeners.

GREEN: initial **10/10** focused hook probes. Final actual Electron includes
**8/8** Control/Meta × New/Open × physical shortcut/renderer-dispatched key
events with Save Cut focused but not activated. Tests assert the original part
identity and unsaved label persist, and the explicit correction is visible.
Open uses a queued real replacement file with a different part identity, so a
successful replacement cannot falsely pass merely by retaining a part count.

Files: `hooks/useFileOperations.tsx`, `hooks/useMenuCommands.ts`, their colocated
tests, and `tests/e2e/custom-cuts-round8.spec.ts`.

### M2 Important — guarded native Reload and Force Reload

Root cause: Electron's menu roles directly reload web contents without consulting
renderer project, session or inspector state. Ordinary file-close guards cannot
intercept these roles.

Fix: `main/menu.ts` gives both actions explicit IDs/accelerators and dispatches
`request-reload` with the requested cache mode. `hooks/useMenuCommands.ts` routes
that request to `useFileOperations.handleReload`, connected in `App.tsx`.
It flushes the focused input, checks live project and cut dirtiness and offers
the existing unsaved dialog with reload-specific copy. Save commits/validates
the cut and part before writing; Don't Save executes the chosen reload; Cancel
preserves the inspector. The typed preload `reloadWindow` API invokes a narrowly
scoped main IPC handler that validates its boolean parameter and directly calls
the sender's `reload`/`reloadIgnoringCache`. It never recursively dispatches a
menu or close event. Template/assembly reload is explicitly blocked until that
session is saved or discarded.

GREEN: both actual native-menu construction tests **2/2**, clean-mode and
Save/Discard/Cancel hook controls, and **14 actual Electron cases**. Actual
`Menu.getApplicationMenu()` items are clicked, not a simulated renderer command:
both reload modes × clean/already-dirty project × three choices, plus focused
invalid-diameter cases for each mode. Tests inspect the real saved file, wait
for actual document reload, and require the exact validation error with an
unchanged file and editable input when Save is refused.

Files: `main/menu.ts`, `main/menu.test.ts`, `main/index.ts`, `preload/index.ts`,
`App.tsx`, `hooks/useMenuCommands.ts`, `hooks/useFileOperations.tsx`,
`components/project/UnsavedChangesDialog.tsx`, hook tests and round-8 Electron.

### M3 Important — asynchronous close-save race

Root cause: the dialog's pending action was cleared before awaiting the write,
unlocking the editor. `saveToPath` unconditionally marked the current document
clean, although it serialized an older snapshot. Completion then confirmed
close without checking newer project/inspector revisions.

Fixes:

- `useFileOperations` retains the modal through I/O and pending action execution.
  A synchronous ref prevents double-click/reentrancy before React can render;
  accessible busy state and disabled Save/Don't Save/Cancel keep the UI locked.
  Keyboard/direct file handlers and the native-command dispatch share that
  busy boundary. A repeated native close does not reset the pending action.
- `utils/fileOperations.ts` captures every serialized document field before
  thumbnail/write/recent-project I/O. Store updates are immutable; live field
  identity/value comparison after all awaited I/O distinguishes the saved
  revision from newer data. Only the identical revision becomes clean; newer
  data stays dirty and returns `pendingChanges: true`.
- Before executing close/reload, the dialog checks the save result, live project
  dirtiness, and live inspector/session changes again. Any newer edit retains
  the dialog with “New changes were made while saving. Save again to include
  them.” Failed writes likewise retain the pending action and exact error for
  retry. Canceling a first Save As cancels the pending destructive action.
  Existing inspector/session/project commit and undo semantics are unchanged.

GREEN: reentrant-dialog, newer-project/session and failure/retry hook checks;
all eight native busy-command cases; **3/3 real-serialization tests** injecting
edits during thumbnail, write and recent-project I/O. The latter inspect actual
serialized labels/diameters: first file retains its captured .25-inch cut,
newer .755-inch edit stays dirty, retry writes the newer edit and becomes clean.

**Six actual Electron delayed-close flows** pass: successful slow save, newer
project edit, newer cut session, write failure/retry, first Save As, and canceled
first Save As followed by retry. The test delays the real main-process Node
file-write boundary, without adding a production test API. It invokes actual
`BrowserWindow.close()`, verifies disabled modal controls and one write despite
native Save/New/Reload attempts, injects newer live store/session revisions,
then reads the physical `.carvd` file. The app closes only after the final
required revision is saved; failure/newer-data cases remain open for retry.

Files: `hooks/useFileOperations.tsx`, `hooks/useMenuCommands.ts`,
`components/project/UnsavedChangesDialog.tsx`, `utils/fileOperations.ts`,
their tests, `utils/customCutsRound8Save.test.ts`, and round-8 Electron.

## Adjacent self-audit and gates

- All original R1–R15, scoped A–D, Q1–Q11, closure A–J, K1–K8 and L1–L3
  regressions remain in the complete desktop gate. No test was removed or
  skipped. This is a self-audit, not another independent review.
- Live imperative reads protect event boundaries without broad new renderer
  subscriptions. The busy ref closes the pre-render double-click interval;
  modal state supplies accessible feedback. File-association subscriptions
  clean up on dependency changes. No new dependency or effect-driven save.
- The document snapshot includes notes, parts/features, stock, grouping,
  assemblies, guides, shopping items and cut list, as well as numeric settings.
  Camera/thumbnail presentation does not create a document edit or an undo step.
  Existing autosave uses the same revision-aware file utility and remains
  blocked while the cuts inspector is active.
- Reload's final IPC is typed, parameter-validated and bound to the requesting
  renderer. The actual application menu is the entry point tested. No menu-role
  or renderer-only approximation is used for the reload proof.
- No PDF/CSV formatting or geometry implementation changes in this round;
  existing actual-jsPDF layout/precision and woodworking numeric suites remain
  part of the renderer gate. Previous round's visual PDF evidence is unchanged.

| Gate                        | Evidence                                                                                                                                                                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused file/menu lifecycle | `focused-expanded.log`: **208/208** across three files; final `focused-final.log`: **211/211** across four, including real serialization.                                                                                                                                                   |
| Real serialization          | `serialization-green.log`: **3/3**.                                                                                                                                                                                                                                                         |
| Actual expanded Electron    | `electron-expanded-green.log`: **28/28 (20.0s)**.                                                                                                                                                                                                                                           |
| Full desktop                | `full-desktop.log`: exit 0, **4,512 renderer / 186 files**, **215 main / 10 files**, **181/181 Electron (2.7m)**. No aggregate test failures or test exclusions.                                                                                                                            |
| Static/build/analytics      | `lint-final.log`, `typecheck-final.log`, `format-final.log`, `changed-tests-format.log`: exit 0. `production-boundary-final.log`: fresh production build after all Electron tests, exit 0; analytics E2E controls excluded.                                                                 |
| Diff/security/scope         | `scope-security.json`: zero common private-key/GitHub/Stripe/AWS/OpenAI secret signatures; no new focused/skipped tests, debugger, unexpected scope, deletion/mode, version, dependency, website or distribution changes. `git diff --check` passes; audit repeated after evidence updates. |

Net new regressions: **34 renderer, 2 main-process and 28 real-Electron tests**.
Known open P0/P1: **0**; requested findings deferred: **none**.
No requested M1–M3 finding is deferred. No release, merge, push, PR, version
bump, dependency update, packaging, signing, notarization or distribution action
is authorized or performed.
