# Closure remediation round 7 — L1–L3

Status: all L1–L3 fixed; complete final desktop/static gates PASS; unreleased.
Starting candidate: `d704857f137a8e5f310c68affa50f8c07caa6e0e`.
Qualified code: `0785de1fe798ce483252e9181497eb47ad5058bd`
(`fix: guard cut editor file exits and precise PDF layouts`).
Environment: 2026-09-09, macOS arm64, Node 23.10.0, branch
`codex/custom-cuts-release`, worktree `.worktrees/custom-cuts-release`.
Desktop remains 1.3.0. No subagent or additional reviewer was used.

## Independent RED evidence

Raw commands, output, actual PDFs and rendered images are in
`/tmp/carvd-review-round7.OvmktT`.

- `file-red.log`: **6 failed / 1 passed / 93 excluded**. The clean-project
  inspector-only close check incorrectly confirms close; both valid and invalid
  close-dialog Save skip the cut callback; direct, focused Meta+Shift+S and
  focused Control+Shift+S each write without calling the callback, even when it
  rejects. The already-dirty close-prompt control passes.
- `native-red.log`: **1 failed / 31 excluded**. Native Save As never delegates
  to the guarded file route; it only displays the previous blocking message.
- `pdf-red.log`: **8 failed / 8 total** actual jsPDF tests. Both PDFs, both
  units, short and long names, and multiple grouped records demonstrate literal
  coordinate overlap. For example the metric Cut List identity header ends at
  172.864pt while Blank L begins at 97.552pt; the Project Report begins Blank L
  at 85.552pt while its identity header ends at 168.864pt. Assertions require
  an additional 4pt gap. Metric row IDs collide too.
- `electron-red.log`: **8 failed / 2 controls passed (44.6s)**. Six failures
  reach the product behavior: clean-project native close loses the editor,
  already-dirty close Save writes the old label, invalid close either skips
  the prompt or closes without validation, shortcut Save As writes the old
  label, and native Save As never writes. Two other cases are **not counted
  as defect proof**: a delayed first-run WelcomeTutorial overlay intercepted
  Edit Part Cuts during setup. Source tracing identified its transparent
  z-1100 overlay; the final existing-user fixture seeds the real saved
  `hasCompletedWelcome` preference before launch. Existing onboarding tests
  keep their original defaults and still run in the complete gate.

These reproductions preceded the respective production fixes. No geometry,
fabrication precision, file-write or save refusal assertion was relaxed.

## Finding-to-fix mapping

### L1 Important — actual native window close

Root cause: `onBeforeClose` only consulted project dirtiness. Active inspector
values and Save Cut-only session changes are not yet in the project. The close
dialog's Save handler called `saveProject` directly. Additionally, main-process
test mode skipped its production close listener, so previous tests could not
exercise this actual user path.

Fixes:

- `hooks/useFileOperations.tsx`: synchronously blur the focused measurement
  input, then compare the live Part Cuts session against the source features,
  including inspector dirtiness, before confirming window close.
- Its dialog Save handler commits/validates the active cut and part before
  writing the file. A rejected callback does not clear the pending action or
  confirm close. The exact error reported by the save callback is surfaced
  inside the modal; Cancel permits correction, and Don't Save permits close.
- `components/project/UnsavedChangesDialog.tsx`: optional accessible in-modal
  error text. An intermediate actual Electron run (**8 passed / 2 failed**)
  proved that an outside toast was aria-hidden behind the modal; those two
  tests pass after placing the exact error inside it.
- `src/main/index.ts`: remove the test-only bypass from the real close
  listener. `tests/e2e/helpers/electron-app.ts` destroys test windows explicitly
  during teardown instead; production window-close behavior is unchanged.

GREEN: initial four L1 hook cases **4/4**, then all file/menu cases **132/132**.
The final file suite adds an exact modal-error/reset regression. Actual Electron
tests invoke `BrowserWindow.close()` (not Close Project), exercise Save,
Don't Save and Cancel on both clean and already-dirty projects, invalid focused
20-inch input, exact error, unchanged file, Cancel/correct to .755 and retry.
Two adjacent controls cover Save Cut-only session dirtiness with no inspector
and unchanged clean sessions that close immediately.

### L2 Important — consistent Save As

Root cause: keyboard/direct `handleSaveAs` skipped the active-cut callback,
while native Save As used a separate blocking path. Focused shortcuts reached
the wrong handler successfully, so focus handling alone could not fix this.

Fix: `hooks/useFileOperations.tsx` calls the same active-cut commit/validation
before Save As; `hooks/useMenuCommands.ts` delegates the native command to that
guarded callback, connected in `App.tsx`. The no-callback fallback remains
non-writing. File I/O is never reached when the active cut rejects.

GREEN: direct, Meta and Control focused shortcut tests validate exact
`cut -> file` ordering and `cut only` on rejection; native hook delegation
passes. Actual Electron shortcut and native-menu flows each save a label,
then an unblurred .74-inch value, inspect the real serialized files, and reject
20-inch input without creating the queued destination file. The original
Header/Cmd+S/native Save and local/global undo tests are unchanged and pass.

### L3 Important — precise PDF identity/dimension overlap

Root cause: measured numeric-column expansion subtracted all required width
from the identity column without a lower bound. Header text was not truncated,
and row truncation could not compensate for a nearly zero-width column.

Fix: `utils/pdfExport.ts` keeps at least 100pt for the identity column in the
compact layout. If exact measurements cannot fit, both reports switch to a
two-line row: quantity, identity, stock and operations above, and three fully
labeled precise dimensions below. Name space expands in this mode; row height
and page-break allowance account for the dimension line. No measurement is
rounded, split, or hidden to fit. Existing exact fraction/decimal formatting
and grouped-equivalence rules are unchanged.

GREEN: **8/8 actual-jsPDF coordinate tests** in
`utils/customCutsRound7Pdf.test.ts`: imperial/metric × Cut List/Project Report
× short/long names; three parts form two distinct grouped rows. The PDF's actual
font, font size and position are parsed, measured using jsPDF, and checked for
at least 4pt horizontal separation in every identity/header/dimension row and
containment within the page. Full strings for 10⅓, 11⅓, 2⅔ and ⅔ inches and
their metric conversions remain present. Page streams are separated so diagram
labels do not get mistaken for table identities. Existing round-6 actual-PDF
precision/glue-up tests also pass unchanged.

Eight actual artifacts (`round7-{cut-list,project-report}-{imperial,metric}-{short,long}.pdf`)
were generated and rendered with Poppler. All eight changed table pages were
visually inspected: Cut List page 1 and Project Report page 2. Identities,
dimensions, stock and operation columns do not overlap; grouped rows and
precise numeric lines remain readable. PNGs and PDFs remain temporary QA
evidence, not committed build artifacts.

## Adjacent self-audit and gates

- Dirty checks use live session state after input blur, avoiding stale closure
  values. Committing uses the existing inspector -> session -> part lifecycle;
  no duplicate project update or separate undo mechanism was introduced.
- Modal failure preserves the pending close; Cancel resets the error, leaving
  all edits available. A subsequent corrected Save closes only after file save.
  Existing file-failure/cancel handling and ordinary clean-project close remain
  covered. The error is inside the modal's accessibility tree.
- Native, direct and keyboard Save As share one validated file route; ordinary
  template/assembly save guards remain unchanged.
- Responsive PDF rows use the existing precision formatter. Ordinary compact
  dimensions still use measured columns; long precision uses a larger row.
  Existing CSV, fabrication grouping, dowel instructions and panel-stage tests
  remain included, with no output semantic changes outside layout.
- All previous R1–R15, scoped A–D, Q1–Q11, closure A–J and K1–K8 regressions
  remain in the complete gate. No test was deleted, skipped or weakened.
  This is a self-audit, not another independent review.

| Gate                                           | Evidence                                                                                                                                                                                                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Complete desktop before fixture hardening      | `full.log`: exit 0, **4,478 renderer / 185 files**, **213 main / 9 files**, **153/153 Electron (2.4m)**.                                                                                                                                                         |
| Final complete desktop after fixture hardening | `full-final.log`: exit 0, **4,478 renderer / 185 files**, **213 main / 9 files**, **153/153 Electron (2.4m)**.                                                                                                                                                   |
| Focused final file/lifecycle/PDF regressions   | `focused-final.log`: **161/161 across five files**, including previous round's actual inspector lifecycle and fabrication tests.                                                                                                                                 |
| Focused actual Electron                        | `electron-green2.log`: **10/10 (13.3s)** before two adjacent controls; all twelve new flows pass in the full gate.                                                                                                                                               |
| Actual PDFs                                    | **8/8** coordinate/precision cases, `pdf-artifacts.log`; all eight rendered table variants visually inspected.                                                                                                                                                   |
| Static                                         | `lint-final.log`, `typecheck-final.log`, `format-final.log`: exit 0 after final Electron suite; configured source formatting and explicit changed-doc/Electron-file checks pass.                                                                                 |
| Production analytics/build                     | `production-boundary-final.log`: fresh production build exit 0 after final Electron suite, no analytics E2E controls.                                                                                                                                            |
| Diff/security/scope                            | `scope-security.json`: zero common private-key/GitHub/Stripe/AWS/OpenAI secret signatures, no focused/skipped tests or debugger, no unexpected scope/deletion/mode/version/dependency/website/distribution changes. Final audit repeated after evidence updates. |

Net new regressions: **17 renderer and 12 real-Electron tests**.
Known open P0/P1: **0**; requested findings deferred: **none**.
No requested L1–L3 finding is deferred. No release, merge, push, PR, version
bump, dependency update, packaging, signing, notarization or distribution action
is authorized or performed.
