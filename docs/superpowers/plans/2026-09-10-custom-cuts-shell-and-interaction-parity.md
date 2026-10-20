# Custom Cuts Shell and Interaction Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Custom Cuts editor a first-class mode of the application shell rather than a separate screen — same header controls, same sidebar/canvas/properties layout, same camera navigation, and the same keyboard shortcuts — so it stops feeling out of sync with the project, template, and assembly editors.

**Architecture:** Custom Cuts currently replaces the entire shell and rebuilds a bespoke two-panel screen inside it, opting out of the app's interaction model. Reunify it: render the standard `AppSidebar` / canvas / `PropertiesPanel` arrangement with cuts-specific content, move Undo/Redo/Exit/Save to the single header that already hosts them for other modes, and scope the shared shortcut and camera systems by mode instead of disabling them. No geometry, validation, or draft-state logic changes.

**Tech Stack:** Electron, React, TypeScript, Zustand, Three.js/React Three Fiber, Vitest, Playwright.

**Spec:** this document. Prior context: `.claude/docs/part-cuts-workspace-spec.md`, `.claude/docs/part-cuts-polish-spec.md`.

## Motivation

Four observations from using the editor, and what the code shows behind each:

1. **Undo/Redo differ from the header's.** `App.tsx` renders `{!isEditingPartCuts && <UndoRedoButtons />}` — the header pair is deliberately suppressed for this one mode, and `PartCutsWorkspace.tsx` rebuilds its own pair in the right panel.
2. **Exit and Save are duplicated.** The header already shows Exit (`handleExitEditMode`) and Save (`handlePrimarySave`) for part cuts, while the workspace _also_ renders "Back to Project" and "Save Part" at the bottom of its panel. Two locations for each action.
3. **The layout is structurally different.** `App.tsx` swaps `AppSidebar + CanvasWithDrop + PropertiesPanel` for a single `PartCutsWorkspace`, which builds a preview pane plus one fixed `w-[420px]` card that mode-switches between list, type picker, and inspector. Selecting a cut therefore _replaces_ the list, so the other cuts are no longer visible.
4. **It opted out of the interaction model.** `useKeyboardShortcuts.ts` early-returns on `isEditingPartCuts` before any handler, and the preview sets `enablePan={false}`. The mode inherits no Escape, no camera views, no arrow-key nudging, no copy/paste, and no delete; it hand-rolls Cmd+Z / Cmd+Shift+Z locally and nothing else.

The early return is well-motivated — the source part stays selected behind the workspace, so project-level shortcuts would silently edit it — but the remedy was amputation where the fix is routing.

## Global Constraints

- No change to cut geometry, validation, conflict detection, draft state, or file format. This is a shell and input-routing change.
- Undo/Redo must remain **separate stacks**. In cuts mode the header pair and Cmd+Z drive `partCutsEditingStore` draft history; they must never reach `projectStore.temporal` while the workspace is open.
- Project-level destructive shortcuts (rotate, duplicate, delete, paste) must never act on the source part while in cuts mode. Scoping replaces the early return; it does not weaken that guarantee.
- Exactly one Exit control and one Save control, both in the header.
- The cuts preview keeps framing the part on entry. Framing is the default camera placement, not a constraint on navigation.
- Preserve every existing behaviour asserted by the round 6–9 qualification specs; where a test drives a moved control, update the driver, never the assertion's intent.
- Target `codex/custom-cuts-release`. This work ships in PR #444 alongside the rest of Custom Cuts, not as a follow-up.

## Sequencing note

This ships in the same PR as the rest of Custom Cuts, so the beta presents one coherent editor rather than a screen that is reorganised a release later.

Order the tasks 1 → 5 regardless. Tasks 1–3 are small, independently verifiable, and leave the app working after each; doing them first means Task 4 is a pure layout move with the header, camera, and input behaviour already settled. Re-run the full desktop and Electron suites after every task rather than only at the end, so a regression is attributable to one change.

---

### Task 1: Single header for Undo, Redo, Exit, and Save

**Files:**

- Modify: `packages/desktop/src/renderer/src/components/layout/UndoRedoButtons.tsx`
- Modify: `packages/desktop/src/renderer/src/App.tsx`
- Modify: `packages/desktop/src/renderer/src/components/part-cuts/PartCutsWorkspace.tsx`
- Modify: `packages/desktop/src/renderer/src/components/layout/UndoRedoButtons.test.tsx` (create if absent)
- Modify: `packages/desktop/src/renderer/src/components/part-cuts/PartCutsWorkspace.test.tsx`

**Interfaces:**

- Consumes: `usePartCutsEditingStore` (`undoDraft`, `redoDraft`, `draftHistory`, `draftFuture`), `useProjectStore.temporal`.
- Produces: one header Undo/Redo pair that dispatches to whichever history the active mode owns.

- [ ] Teach `UndoRedoButtons` to select its target by mode: when `isEditingPartCuts`, read `draftHistory`/`draftFuture` and call `undoDraft`/`redoDraft`; otherwise keep the existing `projectStore.temporal` behaviour. Keep the same icons, titles, and disabled semantics.
- [ ] Remove the `!isEditingPartCuts` guard in `App.tsx` so the header pair renders in cuts mode.
- [ ] Delete the duplicate Undo/Redo buttons from the `PartCutsWorkspace` right-panel header.
- [ ] Delete the "Back to Project" and "Save Part" buttons from the bottom of the `PartCutsWorkspace` panel. Verify the header Exit and Save already cover both paths, including the unsaved-changes prompt and the disabled-when-invalid behaviour that "Save Part" enforced (`hasUnsavedChanges`, `hasBlockingFeatureConflicts`, `firstInvalidIndex`). Move that disabled logic to the header Save when in cuts mode rather than dropping it.
- [ ] Show the part being edited in the header while in cuts mode, so the screen identifies its subject.
- [ ] Update tests that drove the removed buttons to drive the header equivalents.
- [ ] Run: `npm run typecheck`, `npm run lint`, `npx vitest run` in `packages/desktop`.

---

### Task 2: Camera parity in the cuts preview

**Files:**

- Modify: `packages/desktop/src/renderer/src/components/part-cuts/PartCutsPreviewCanvas.tsx`
- Modify: `packages/desktop/src/renderer/src/components/part-cuts/PartCutsPreviewCanvas.test.ts`

**Interfaces:**

- Consumes: the same `OrbitControls` configuration the main workspace uses.
- Produces: a preview viewport navigable on the same terms as the main canvas.

Current divergence:

|               | Main canvas (`Workspace.tsx:1165`)      | Cuts preview (`PartCutsPreviewCanvas.tsx:998`) |
| ------------- | --------------------------------------- | ---------------------------------------------- |
| Pan           | enabled                                 | `enablePan={false}`                            |
| Damping       | `enableDamping`, `dampingFactor={0.05}` | none                                           |
| Zoom range    | `0.5` – `1500`                          | `maxDimension * 0.25` – `maxDimension * 6`     |
| Zoom speed    | `zoomSpeed={0.5}`                       | default                                        |
| `makeDefault` | yes                                     | no                                             |

- [ ] Enable panning, damping, and the matched zoom speed in the preview's `OrbitControls`.
- [ ] Widen the distance clamps so a large board can be inspected end to end and a small feature can be approached closely. Keep clamps generous rather than absent, so the camera cannot be lost.
- [ ] Keep `FrameCameraToPart` as the entry placement and re-frame only on part change, not on every camera interaction.
- [ ] Confirm handle dragging still suppresses orbiting for the duration of a drag (`controlsRef.current.enabled`), including the window-level release fallback added in `1fd3b29`.
- [ ] Add a "frame part" affordance so the user can return to the framed view after panning away.
- [ ] Run: `npx vitest run src/renderer/src/components/part-cuts/PartCutsPreviewCanvas.test.ts`.

---

### Task 3: Scope the shortcut system by mode instead of disabling it

**Files:**

- Modify: `packages/desktop/src/renderer/src/hooks/useKeyboardShortcuts.ts`
- Modify: `packages/desktop/src/renderer/src/hooks/useKeyboardShortcuts.test.ts`
- Modify: `packages/desktop/src/renderer/src/components/part-cuts/PartCutsWorkspace.tsx` (remove the local key handler)

**Interfaces:**

- Consumes: `usePartCutsEditingStore` selection and draft actions, `useCameraStore` view vectors.
- Produces: one shortcut system with a cuts-mode branch; the source part behind the workspace remains untouchable.

- [ ] Replace the `if (isEditingPartCuts) return;` early return at `useKeyboardShortcuts.ts:52` with a cuts-mode branch that handles its own keys and then returns, so no project-level handler can run.
- [ ] Map, in cuts mode:
  - Undo / Redo → draft history (removing the hand-rolled handler in `PartCutsWorkspace.tsx`).
  - Escape → step back one level: inspector → list → exit (honouring the unsaved-changes prompt).
  - Arrow keys → nudge the selected cut along the face, with the existing 0.25 step and a modifier for a fine step. This supersedes the Move Left/Right buttons.
  - Delete / Backspace → remove the selected cut.
  - Copy / Paste → cuts within a part and across compatible parts.
  - Camera view presets → the same keys the main canvas uses, driving the preview camera.
- [ ] Keep every project-level destructive shortcut unreachable in cuts mode, and add a regression test that asserts the source part is unchanged after rotate/duplicate/delete keys are pressed while the workspace is open.
- [ ] Run: `npx vitest run src/renderer/src/hooks/useKeyboardShortcuts.test.ts`.

---

### Task 4: Reunify the shell — cuts list on the left, cut details on the right

**Files:**

- Modify: `packages/desktop/src/renderer/src/App.tsx`
- Modify: `packages/desktop/src/renderer/src/components/layout/AppSidebar.tsx`
- Create: `packages/desktop/src/renderer/src/components/layout/sidebar/CutsSection.tsx`
- Create: `packages/desktop/src/renderer/src/components/part-cuts/AddCutDialog.tsx`
- Modify: `packages/desktop/src/renderer/src/components/properties/PropertiesPanel.tsx`
- Create: `packages/desktop/src/renderer/src/components/properties/CutProperties.tsx`
- Modify: `packages/desktop/src/renderer/src/components/part-cuts/PartCutsWorkspace.tsx` (reduce to the preview surface)

**Interfaces:**

- Consumes: `SidebarProvider`, the existing `AppSidebar` section pattern (see `StockSection.tsx`, which already relabels itself by mode), `PropertiesPanel`'s empty-selection behaviour.
- Produces: `AppSidebar(Cuts) │ preview │ PropertiesPanel(cut details)` — the same arrangement as the project, template, and assembly editors.

Target layout, matching the main editor exactly:

```
header:  [Undo|Redo]  [part name]  [Exit]  [Save]
body:    AppSidebar(Cuts list)  │  cuts preview  │  PropertiesPanel(selected cut)
```

- [ ] Stop replacing the shell in `App.tsx`. Render `AppSidebar` + cuts preview + `PropertiesPanel` for cuts mode, as the non-cuts branch already does.
- [ ] Add a `CutsSection` to `AppSidebar`, following the existing section pattern: the ordered cut list, per-cut validity state, selection, reorder, enable/disable, delete, and an "Add Cut" action. The list stays visible while a cut is selected — the current single-panel design hides it.
- [ ] Extract the type picker into `AddCutDialog`, keeping the existing preset groups ("Ends & Edges", "Channels & Laps", …). On confirm, create the draft and select it so the right panel takes over.
- [ ] Extract the inspector into `CutProperties`, rendered by `PropertiesPanel` when a cut is selected, mirroring how part properties render for a selected part. Empty when nothing is selected.
- [ ] Reduce `PartCutsWorkspace` (2014 lines) to the preview surface plus its orchestration; the list, picker, and inspector move out.
- [ ] Make the cuts sidebar collapsible via the existing `SidebarProvider`, so the preview can use the full width when the list is not needed.
- [ ] Preserve every behaviour the current panel owns: validation messaging, the "Fix cut N" affordance, conflict summaries, draft dirty tracking, and the exit-with-unsaved-edits prompt.
- [ ] Run the full desktop suite plus the Electron specs.

---

### Task 5: Rework the test surface

**Files:**

- Modify: `packages/desktop/src/renderer/src/components/part-cuts/PartCutsWorkspace.test.tsx` (62 tests)
- Modify: `packages/desktop/src/renderer/src/components/part-cuts/PartCutsPreviewCanvas.test.ts` (48 tests)
- Modify: `packages/desktop/tests/e2e/part-cuts-lifecycle.spec.ts`
- Modify: `packages/desktop/tests/e2e/custom-cuts-round6.spec.ts` … `custom-cuts-round9.spec.ts`
- Modify: `packages/desktop/tests/e2e/custom-cuts-hands-on-qa.spec.ts`
- Modify: `packages/desktop/tests/e2e/custom-cuts-assembly.spec.ts`

**Interfaces:**

- Consumes: the relocated controls.
- Produces: the same qualification coverage, driving the new locations.

This is the main risk in the plan. 110 colocated tests and seven Electron specs drive this UI by role and label, and the round 6–9 specs are the qualification evidence for the beta.

- [ ] Before moving anything, inventory which tests select the controls that move: "Back to Project", "Save Part", the panel Undo/Redo, "Move Left"/"Move Right", and the list/inspector panel-mode transitions.
- [ ] Update drivers, never assertions. A test that proves a queued save drains on close must still prove exactly that, through the header Save.
- [ ] Keep the round 6–9 file-transaction specs semantically identical; they cover save/quit/reload races that this refactor must not disturb.
- [ ] Re-run the exhaustive qualification and record results alongside the existing reports in `.superpowers/sdd/`.
- [ ] Run: full renderer, main, and Electron suites on all three platforms via CI.

---

## Risks

- **Test rework dominates the effort.** The production change is largely relocation; the 110 colocated tests and seven Electron specs are the real cost. Budget accordingly.
- **Undo routing is the sharpest correctness risk.** If the header pair reaches `projectStore.temporal` while cuts are open, a user pressing Cmd+Z edits the project behind the workspace. The regression test in Task 3 is mandatory. Note that draft undo could until recently delete the cut being edited (fixed in `1fd3b29`); making undo more prominent exercises that path much harder.
- **Three columns narrow the preview.** Mitigated by the collapsible sidebar and by the right panel only appearing when a cut is selected. This is not a reason to keep the preview cramped — the main canvas carries a whole assembly in the same space.
- **`PartCutsWorkspace` is 2014 lines.** Splitting it invites accidental behaviour change. Move code rather than rewriting it, and land Tasks 1–3 first so Task 4 is a pure layout change.

## Out of scope

- Any change to cut geometry, validation, conflict rules, or file format.
- New cut types or new operations.
- The live resize preview for cut parts (`Part.tsx:314`), where geometry does not follow a resize drag until pointer-up. Fixing it naively re-runs CSG every frame; it needs its own throttling design.
