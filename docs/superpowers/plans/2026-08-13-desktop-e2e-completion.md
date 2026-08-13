# Desktop E2E Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Carvd Studio desktop click-through/Electron coverage from broad smoke coverage to comprehensive protection of project files, recovery, native menus, cut-list exports, validation, editing lifecycles, import prompts, canvas edge cases, licensing gates, and window/app behavior.

**Architecture:** Keep each E2E slice isolated in its own spec file with deterministic test-mode seams only where native OS dialogs, file system paths, updater/external-link calls, or crash/recovery state would otherwise be nondeterministic. Prefer real UI interactions for the action under test, with store seeding only for setup state. Commit after each independently passing slice.

**Tech Stack:** Electron, Playwright Electron E2E, Vitest, React/Zustand renderer stores, Electron IPC/preload, Node fs/temp directories, existing `packages/desktop/tests/e2e/helpers/electron-app.ts`.

**Spec:** User request in Codex task: “make a thorough plan for getting all that tested and then carry that plan out one at a time till it's all fully tested.” Coverage gaps were inventoried from the current Electron E2E suite and app surfaces.

## Global Constraints

- Branch: `codex/interaction-architecture-review`.
- Worktree: `/Users/michaelbaldwin/Carvd/carvd-studio-interaction-architecture`.
- Base branch policy: feature work targets `develop`; do not push directly to `develop` or `main`.
- Use TDD for each executable slice: write failing E2E first, run focused spec to observe the intended failure, implement minimal production/test seam, rerun focused spec, then run scoped gates.
- Keep test-mode seams gated by existing test mode (`NODE_ENV === 'test'` or `--test-mode`) and invisible to normal production behavior.
- Use `apply_patch` for tracked file edits.
- Run at least focused E2E for each task before committing.
- Run full desktop gates after every 2-3 slices or when shared helper/main/preload code changes:
  - `npm run lint --workspace=@carvd/desktop`
  - `npm run typecheck --workspace=@carvd/desktop`
  - `npm test --workspace=@carvd/desktop`
- Conventional commit prefix for this work: `test:`.

---

## File Map

- Modify: `packages/desktop/tests/e2e/helpers/electron-app.ts`
  - Shared Playwright helpers for test-mode dialog queues, project snapshots, native menu dispatch helpers, temp project paths, recovery file setup, console assertions.
- Modify: `packages/desktop/src/main/index.ts`
  - Only if needed for test-mode deterministic seams around native open/save dialogs, external links, updater, or crash/recovery. All seams must return production behavior outside test mode.
- Modify: `packages/desktop/src/preload/index.ts`
  - Expose test-mode IPC helpers already present or newly needed by E2E.
- Modify: `packages/desktop/src/renderer/src/hooks/useDevTools.ts`
  - Only for exposing renderer stores/utilities in test mode, following the existing devtools pattern.
- Create: `packages/desktop/tests/e2e/project-file-lifecycle.spec.ts`
  - Save, Save As, Open, Open Recent, Favorites, Close Project, Unsaved Changes branches.
- Create: `packages/desktop/tests/e2e/recovery-autosave-matrix.spec.ts`
  - Recovery file restore/discard and crash-style recovery prompt.
- Create: `packages/desktop/tests/e2e/native-menu-matrix.spec.ts`
  - Native app menu dispatch for About, Settings, templates, project commands, help/external links, updater check.
- Create: `packages/desktop/tests/e2e/cut-list-export-validation-matrix.spec.ts`
  - Cut-list tab exports, validation errors/bypass, free-mode optimizer/PDF gates.
- Create: `packages/desktop/tests/e2e/form-validation-matrix.spec.ts`
  - Stock, project/app settings, template, assembly, and license form validation.
- Create: `packages/desktop/tests/e2e/assembly-editing-lifecycle.spec.ts`
  - Create/edit/save/discard/cancel assembly editing and duplicate/delete library behavior.
- Create: `packages/desktop/tests/e2e/template-editing-lifecycle.spec.ts`
  - Edit/duplicate/save/discard template behavior and duplicate import handling.
- Create: `packages/desktop/tests/e2e/library-import-prompt.spec.ts`
  - ImportToLibraryDialog import/skip paths when opening a project with missing library entities.
- Create: `packages/desktop/tests/e2e/canvas-selection-edge-cases.spec.ts`
  - Box select, shift-click, nested group drill, background clearing, paste-here, export image, thumbnail capture, clear all guides.
- Create: `packages/desktop/tests/e2e/properties-panel-matrix.spec.ts`
  - Grain/color/stock/notes/multi-selection property editing.
- Create: `packages/desktop/tests/e2e/license-trial-lifecycle.spec.ts`
  - Trial expired modal, Continue Free, activation success/failure, deactivate, upgrade/external link.
- Create: `packages/desktop/tests/e2e/window-app-behavior.spec.ts`
  - Resize responsiveness, reload survival, second-instance/open-file handoff if feasible.

---

### Task 1: Project File Lifecycle E2E

**Files:**

- Create: `packages/desktop/tests/e2e/project-file-lifecycle.spec.ts`
- Modify if needed: `packages/desktop/tests/e2e/helpers/electron-app.ts`
- Modify if needed: `packages/desktop/src/main/index.ts`
- Modify if needed: `packages/desktop/src/preload/index.ts`

**Interfaces:**

- Consumes: existing `queueTestSaveDialogPath`, `queueTestOpenDialogPaths`, `createBlankProject`, `getProjectSnapshot`.
- Produces: helper functions `queueSavePath(page, filePath)`, `queueOpenPaths(page, filePaths)`, `saveProjectAs(page, filePath)`, `openProjectFile(page, filePath)` if they are useful across later tasks.

- [x] **Step 1: Write failing E2E**

Create `project-file-lifecycle.spec.ts` with tests for:

```ts
test("saves, opens, updates recents, and saves as a new project file", async () => {
  // Create a project, add a part, Save As to temp .carvd.
  // Assert file exists and contains project JSON/name/part.
  // Return home or reload, Open the file through queued open dialog.
  // Assert project name/parts restore.
  // Assert recent projects contains saved path.
  // Save As to a second temp path, assert recent project path updates.
});

test("close-project unsaved dialog covers cancel, dont-save, and save branches", async () => {
  // Dirty project.
  // Trigger Close Project.
  // Cancel keeps editor open.
  // Trigger again, Don't Save returns to start screen without writing file.
  // Reopen dirty project, Trigger again, Save writes queued path then returns home.
});

test("favorites can be added, shown, removed, and survive reload", async () => {
  // Save project to temp file.
  // Add to favorites via menu/header command.
  // Return start screen, Favorites tab contains project.
  // Remove favorite, reload, assert gone.
});
```

- [x] **Step 2: Run focused spec and verify RED**

Run:

```bash
npm run test:e2e --workspace=@carvd/desktop -- project-file-lifecycle.spec.ts
```

Expected: FAIL because helpers/seams/selectors for the full lifecycle are missing or incomplete.

- [x] **Step 3: Implement minimal test helpers/seams**

If native save/open handlers already respect queued dialog paths, use them. If not, route project-file dialog handlers through the existing test-mode dialog queue helpers. Do not alter production native dialog behavior.

- [x] **Step 4: Run focused spec and verify GREEN**

Run:

```bash
npm run test:e2e --workspace=@carvd/desktop -- project-file-lifecycle.spec.ts
```

Expected: PASS.

- [x] **Step 5: Run scoped gates**

Run:

```bash
npm run typecheck --workspace=@carvd/desktop
npm run lint --workspace=@carvd/desktop
```

- [x] **Step 6: Commit**

```bash
git add packages/desktop/tests/e2e/project-file-lifecycle.spec.ts packages/desktop/tests/e2e/helpers/electron-app.ts packages/desktop/src/main/index.ts packages/desktop/src/preload/index.ts
git commit -m "test: cover project file lifecycle e2e"
```

---

### Task 2: Recovery and Autosave E2E

**Files:**

- Create: `packages/desktop/tests/e2e/recovery-autosave-matrix.spec.ts`
- Modify if needed: `packages/desktop/tests/e2e/helpers/electron-app.ts`
- Modify if needed: `packages/desktop/src/main/index.ts`
- Modify if needed: `packages/desktop/src/preload/index.ts`

**Interfaces:**

- Consumes: `window.electronAPI.getRecoveryDir`, `saveRecoveryFile`, `readRecoveryFile`, `deleteRecoveryFile`, `listRecoveryFiles`.
- Produces: recovery setup helper `seedRecoveryFile(page, fileName, projectJson)` if reusable.

- [x] **Step 1: Write failing E2E**

Create tests for:

```ts
test("restores a valid recovery file into the editor and removes it after restore", async () => {});
test("discards a recovery file and starts clean", async () => {});
test("ignores malformed recovery files with visible safe fallback", async () => {});
```

- [x] **Step 2: Run focused spec and verify RED**

Run:

```bash
npm run test:e2e --workspace=@carvd/desktop -- recovery-autosave-matrix.spec.ts
```

Expected: FAIL until recovery setup/flow is deterministic.

- [x] **Step 3: Implement minimal deterministic setup**

Use existing recovery IPC where possible. Add only test-mode helper if the UI cannot discover seeded recovery files before boot.

- [x] **Step 4: Run focused spec and verify GREEN**

Run focused spec until PASS.

- [x] **Step 5: Commit**

```bash
git add packages/desktop/tests/e2e/recovery-autosave-matrix.spec.ts packages/desktop/tests/e2e/helpers/electron-app.ts packages/desktop/src/main/index.ts packages/desktop/src/preload/index.ts
git commit -m "test: cover recovery autosave e2e"
```

---

### Task 3: Native Menu and Help Command E2E

**Files:**

- Create: `packages/desktop/tests/e2e/native-menu-matrix.spec.ts`
- Modify if needed: `packages/desktop/src/main/index.ts`
- Modify if needed: `packages/desktop/src/preload/index.ts`
- Modify if needed: `packages/desktop/tests/e2e/helpers/electron-app.ts`

**Interfaces:**

- Produces if needed: `window.electronAPI.queueTestExternalOpen(urlPattern)` or a test-mode external-link capture IPC.
- Produces if needed: `window.electronAPI.dispatchTestMenuCommand(command, ...args)` to avoid OS menu automation flakiness while still using the app’s menu command channel.

- [x] **Step 1: Write failing E2E**

Tests:

```ts
test("native menu commands open About, Settings, shortcuts, and template browser", async () => {});
test("native File/Edit/View commands dispatch to project actions", async () => {});
test("Help external links and Check for Updates are observable without leaving Electron", async () => {});
```

- [x] **Step 2: Run focused spec and verify RED**

Run native menu focused spec. Expected failure: no deterministic menu/external-link seam.

- [x] **Step 3: Implement test-mode command/external-link seam**

Keep production `shell.openExternal` and updater behavior unchanged; capture calls only in test mode.

- [x] **Step 4: Run focused spec and verify GREEN**

Run focused spec until PASS.

- [x] **Step 5: Run full desktop gates**

Run `npm test --workspace=@carvd/desktop`.

- [x] **Step 6: Commit**

```bash
git commit -m "test: cover native menu commands e2e"
```

---

### Task 4: Cut List Export, Validation, and License Gates E2E

**Files:**

- Create: `packages/desktop/tests/e2e/cut-list-export-validation-matrix.spec.ts`
- Modify if needed: `packages/desktop/tests/e2e/helpers/electron-app.ts`

**Interfaces:**

- Consumes existing save-dialog queue for PDF/CSV download paths.

- [x] **Step 1: Write failing E2E**

Tests:

```ts
test("downloads PDF and CSV from cut-list parts, diagrams, and shopping-list tabs", async () => {});
test("surfaces validation for unassigned stock, oversize parts, and grain mismatch", async () => {});
test("allows bypassable warnings and blocks non-bypassable errors", async () => {});
test("free mode blocks optimizer and PDF export from the real cut-list modal", async () => {});
```

- [x] **Step 2: Run focused spec and verify RED**

Run focused spec.

- [x] **Step 3: Implement minimal helper setup**

Seed projects for stocked, unassigned, oversize, and grain-mismatch states. Do not bypass UI actions for Generate/Download.

- [x] **Step 4: Run focused spec and verify GREEN**

Run focused spec until PASS.

- [x] **Step 5: Commit**

```bash
git commit -m "test: cover cut list exports and validation e2e"
```

---

### Task 5: Form Validation Matrix E2E

**Files:**

- Create: `packages/desktop/tests/e2e/form-validation-matrix.spec.ts`

**Interfaces:**

- Consumes existing UI selectors and project/app settings helpers.

- [x] **Step 1: Write failing E2E**

Tests:

```ts
test("stock create/edit forms reject blank names and invalid dimensions/prices", async () => {});
test("project and app settings normalize or reject invalid numeric inputs", async () => {});
test("template setup/save forms enforce required name and valid data", async () => {});
test("assembly save/edit forms enforce required name and safe cancel behavior", async () => {});
test("license modal disables submit when empty and reports invalid key errors", async () => {});
```

- [x] **Step 2: Run focused spec and verify RED**
- [x] **Step 3: Implement minimal UI/test adjustments only if real accessibility selectors are missing**
- [x] **Step 4: Run focused spec and verify GREEN**
- [x] **Step 5: Commit**

```bash
git commit -m "test: cover desktop form validation e2e"
```

---

### Task 6: Assembly Editing Lifecycle E2E

**Files:**

- Create: `packages/desktop/tests/e2e/assembly-editing-lifecycle.spec.ts`

**Interfaces:**

- Consumes current assembly editing UI and `useAssemblyEditingStore` if exposed; add test-mode exposure only if necessary.

- [x] **Step 1: Write failing E2E**

Tests:

```ts
test("creates a new assembly in 3D editing mode and saves it to the library", async () => {});
test("edits an existing assembly in 3D and saves changes", async () => {});
test("assembly exit dialog supports cancel, discard, and save", async () => {});
test("app library duplicate and delete assembly actions update persisted library", async () => {});
```

- [x] **Step 2: Run focused spec and verify RED**
- [x] **Step 3: Implement minimal test helpers/seams if needed**
- [x] **Step 4: Run focused spec and verify GREEN**
- [x] **Step 5: Run full desktop gates**
- [x] **Step 6: Commit**

```bash
git commit -m "test: cover assembly editing lifecycle e2e"
```

---

### Task 7: Template Editing Lifecycle E2E

**Files:**

- Create: `packages/desktop/tests/e2e/template-editing-lifecycle.spec.ts`

**Interfaces:**

- Consumes existing template screen/editing hooks.

- [x] **Step 1: Write failing E2E**

Tests:

```ts
test("edits an existing custom template and saves project changes", async () => {});
test("template exit dialog supports cancel, discard, and save", async () => {});
test("duplicates built-in and custom templates into My Templates", async () => {});
test("template import duplicate path keeps existing or replaces based on option when available", async () => {});
```

- [x] **Step 2: Run focused spec and verify RED**
- [x] **Step 3: Implement minimal selectors/helpers if needed**
- [x] **Step 4: Run focused spec and verify GREEN**
- [x] **Step 5: Commit**

```bash
git commit -m "test: cover template editing lifecycle e2e"
```

---

### Task 8: Library Import Prompt E2E

**Files:**

- Create: `packages/desktop/tests/e2e/library-import-prompt.spec.ts`

**Interfaces:**

- Consumes project file lifecycle helpers from Task 1.

- [x] **Step 1: Write failing E2E**

Tests:

```ts
test("opening project with missing stock prompts to import stock into app library", async () => {});
test("opening project with missing assembly prompts to import assembly into app library", async () => {});
test("skip leaves app library unchanged but project still opens", async () => {});
```

- [x] **Step 2: Run focused spec and verify RED**
- [x] **Step 3: Implement helper to create project file with non-library stock/assembly**
- [x] **Step 4: Run focused spec and verify GREEN**
- [x] **Step 5: Commit**

```bash
git commit -m "test: cover library import prompts e2e"
```

---

### Task 9: Canvas Selection and Context Edge Cases E2E

**Files:**

- Create: `packages/desktop/tests/e2e/canvas-selection-edge-cases.spec.ts`
- Modify if needed: `packages/desktop/src/renderer/src/components/workspace/Workspace.tsx`

**Interfaces:**

- Consumes existing `__carvdE2E` part/handle coordinate helpers.
- Produces if needed: `getPartScreenPoint(partId)` already exists; add group/nested hit helpers only if current helpers cannot target the UI reliably.

- [x] **Step 1: Write failing E2E**

Tests:

```ts
test("box select selects multiple visible parts and shift-click toggles one part", async () => {});
test("double click/drill selects nested grouped part without corrupting group selection", async () => {});
test("background click clears selection, while modifier background click preserves selection", async () => {});
test("background context Paste Here places clipboard at clicked location", async () => {});
test("background context Export as Image and Capture Thumbnail produce observable artifacts", async () => {});
test("clear all guides works from background and guide context menus", async () => {});
```

- [x] **Step 2: Run focused spec and verify RED**
- [x] **Step 3: Add minimal automation hook if targeting is impossible through current helper**
- [x] **Step 4: Run focused spec and verify GREEN**
- [x] **Step 5: Run full desktop gates**
- [x] **Step 6: Commit**

```bash
git commit -m "test: cover canvas selection edge cases e2e"
```

---

### Task 10: Properties Panel Matrix E2E

**Files:**

- Create: `packages/desktop/tests/e2e/properties-panel-matrix.spec.ts`

**Interfaces:**

- Consumes seeded part/stock helpers.

- [ ] **Step 1: Write failing E2E**

Tests:

```ts
test("single part properties edit grain direction, color, assigned stock, and notes", async () => {});
test("custom colors can be added from color controls and reused", async () => {});
test("multi-selection properties apply shared editable fields to all selected parts", async () => {});
test("free mode hides or blocks grain controls", async () => {});
```

- [ ] **Step 2: Run focused spec and verify RED**
- [ ] **Step 3: Implement only necessary selector/test accessibility fixes**
- [ ] **Step 4: Run focused spec and verify GREEN**
- [ ] **Step 5: Commit**

```bash
git commit -m "test: cover properties panel e2e"
```

---

### Task 11: Trial and License Lifecycle E2E

**Files:**

- Create: `packages/desktop/tests/e2e/license-trial-lifecycle.spec.ts`
- Modify if needed: `packages/desktop/src/main/license.ts`
- Modify if needed: `packages/desktop/src/main/index.ts`
- Modify if needed: `packages/desktop/src/preload/index.ts`

**Interfaces:**

- Produces if needed: test-mode mock license activation result IPC/env flag; must not affect production validation.

- [ ] **Step 1: Write failing E2E**

Tests:

```ts
test("trial expired modal Continue Free enters free mode and shows free limits", async () => {});
test("license activation success unlocks premium actions using test-mode valid key", async () => {});
test("license deactivation returns app to trial/free mode and premium gates apply again", async () => {});
test("upgrade button captures external pricing link without opening a real browser", async () => {});
```

- [ ] **Step 2: Run focused spec and verify RED**
- [ ] **Step 3: Implement minimal test-mode license/external-link seams**
- [ ] **Step 4: Run focused spec and verify GREEN**
- [ ] **Step 5: Commit**

```bash
git commit -m "test: cover trial license lifecycle e2e"
```

---

### Task 12: Window and App Behavior E2E

**Files:**

- Create: `packages/desktop/tests/e2e/window-app-behavior.spec.ts`

**Interfaces:**

- Consumes Playwright viewport/window APIs and existing Electron helpers.

- [ ] **Step 1: Write failing E2E**

Tests:

```ts
test("editor, start screen, and template screen remain usable across viewport sizes", async () => {});
test("reload preserves saved preferences and recovers app shell without console errors", async () => {});
test("second instance open-file handoff opens project in primary window when feasible", async () => {});
```

- [ ] **Step 2: Run focused spec and verify RED**
- [ ] **Step 3: Implement minimal helpers only if needed**
- [ ] **Step 4: Run focused spec and verify GREEN**
- [ ] **Step 5: Run full desktop gates**
- [ ] **Step 6: Commit**

```bash
git commit -m "test: cover window app behavior e2e"
```

---

### Task 13: Final Coverage Audit and Stabilization

**Files:**

- Modify: `docs/superpowers/plans/2026-08-13-desktop-e2e-completion.md`
- Modify if needed: flaky specs/helpers discovered during full suite.

**Interfaces:**

- Consumes all prior task deliverables.

- [ ] **Step 1: Run complete desktop quality gates**

```bash
npm run lint --workspace=@carvd/desktop
npm run typecheck --workspace=@carvd/desktop
npm test --workspace=@carvd/desktop
```

- [ ] **Step 2: Run a coverage inventory**

List all E2E specs and test names:

```bash
find packages/desktop/tests/e2e -maxdepth 1 -name '*.spec.ts' -print | sort
rg -n "test\\(" packages/desktop/tests/e2e -g '*.spec.ts'
```

- [ ] **Step 3: Update plan checkboxes and summarize residual non-automated surfaces**

If any surface remains untested because it is not feasible or would require unsafe OS-level automation, document it in this plan with reason and proposed manual verification.

- [ ] **Step 4: Commit final audit**

```bash
git add docs/superpowers/plans/2026-08-13-desktop-e2e-completion.md
git commit -m "docs: audit desktop e2e coverage"
```

---

## Self-Review

**Spec coverage:** The plan maps every previously inventoried gap into a task: project files, recovery, native menus/help, cut-list exports/validation, form validation, assembly lifecycle, template lifecycle, library import prompts, canvas edge cases, properties panel, trial/license lifecycle, and window/app behavior.

**Placeholder scan:** No task uses TBD/TODO/later placeholders. Each task has exact target files, example test behaviors, run commands, and commit messages.

**Type consistency:** Shared helper names are intentionally introduced in Task 1 (`queueSavePath`, `queueOpenPaths`, `saveProjectAs`, `openProjectFile`) and reused only as optional helper outputs. Existing helper/store names match current code: `createBlankProject`, `getProjectSnapshot`, `window.electronAPI`, `window.useProjectStore`, `window.useLicenseStore`, and `__carvdE2E`.
