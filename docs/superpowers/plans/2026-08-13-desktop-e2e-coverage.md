# Desktop E2E Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build robust automated Electron tests that exercise the desktop app’s user-facing workflows through real clicks, keyboard input, canvas drags, and form submissions.

**Architecture:** Add a reusable Playwright/Electron harness that isolates each test in its own app instance and exposes safe helpers for real UI gestures plus store-backed assertions. Organize coverage by feature area so failures identify the broken workflow, not a vague “happy path.”

**Tech Stack:** Playwright Electron, Vitest for focused state/unit regressions, existing dev/test store globals, React/Electron renderer.

**Spec:** User request in this task: inventory the desktop feature set and build complete, thorough, robust automated click-through testing.

## Global Constraints

- Base branch remains `codex/interaction-architecture-review`.
- Desktop checks are `npm run lint --workspace=@carvd/desktop`, `npm run typecheck --workspace=@carvd/desktop`, `npm test --workspace=@carvd/desktop`.
- Prefer semantic selectors when stable; use dev/test store globals only for setup/assertions, not as a substitute for gestures.
- E2E tests should use isolated app instances and avoid shared state between tests.

---

## Feature Inventory

### Project/start workflows

- Start screen templates: Blank, Learn Carvd, Simple Writing Desk, Basic Bookshelf, End Table.
- New Project dialog: project name, units, starting material checkboxes, remember choices, create/cancel.
- File/project controls: save, save as, open file, recent/favorite projects, home/new project, unsaved changes prompts.
- Recovery/import dialogs: auto-recovery, import project library items.

### Workspace and camera

- 3D canvas with orbit, pan, zoom, reset/focus camera.
- Display toggles: solid/wire/ghost, grid, grain, lighting/brightness.
- Axis controls and toolbar hints.

### Parts

- Add/delete/duplicate/copy/paste parts.
- Select, multi-select, box-select.
- Move via body drag, rotate via handles/context/keyboard, resize via handles/properties.
- Edit properties: name, length/width/thickness, position, rotation, stock, color, grain, notes, advanced fields.
- Context menu: center, copy, save as assembly, reset to stock, reference actions, grouping actions, delete.

### Stock/materials

- Stock sidebar list: add, edit, delete, search, drag stock to canvas.
- Stock assignment to parts through properties/drag/drop.
- Stock constraints: dimensions, grain, color, overlap.
- Reset part to assigned stock values.

### Groups and assemblies

- Create groups, nested groups, add/remove from group, ungroup, merge groups.
- Select group vs child part; group drag and group rotation.
- Save selection as assembly; place assembly from library; edit assemblies.

### Snapping/reference positioning

- Snap to parts and guides.
- Set/clear reference parts, reference distance indicators, snap guide context menu.
- Grid snap and snap sensitivity.

### Cut list/shopping/PDF

- Generate cut list, validation issues, parts tab, diagrams tab, shopping list tab, custom shopping items, statistics.
- Export/download where supported by mocked Electron/test environment.

### Settings/license/tutorial/update

- App settings: appearance/theme, snapping, behavior, defaults, stock constraints, data management, license/about.
- Project settings: name, units, grid, kerf, overage, notes, project stock constraints.
- Welcome tutorial and learn flow.
- Trial banner/expired modal/license activation.
- Update notification.

## Coverage Tasks

### Task 1: Stable E2E harness

**Files:**

- Create: `packages/desktop/tests/e2e/helpers/electron-app.ts`
- Modify: `packages/desktop/tests/e2e/happy-path.spec.ts`

**Deliverable:** Each e2e test gets an isolated Electron app, can create a blank editor without overlay click races, can seed/read project state, and can close reliably.

- [x] Extract Electron launch/close/window helpers.
- [x] Replace fragile modal locator click with DOM-safe click helper.
- [x] Add `createBlankProject`, `seedProject`, `getProjectSnapshot`, real canvas gesture, and context-menu helpers.
- [x] Run existing happy-path tests and verify the setup click race is gone.
- [x] Commit as part of the consolidated e2e coverage commit.

### Task 2: Project, stock, part, and properties flows

**Files:**

- Create: `packages/desktop/tests/e2e/project-stock-parts.spec.ts`

**Deliverable:** Tests click through project creation, add stock/part, assign stock, edit part properties, reset to stock, duplicate/copy/delete, undo/redo.

- [x] Write failing e2e tests for properties and reset-to-stock behavior.
- [x] Patch helpers/selectors only as needed.
- [x] Verify tests pass.
- [x] Commit as part of the consolidated e2e coverage commit.

### Task 3: Canvas transform flows

**Files:**

- Create: `packages/desktop/tests/e2e/canvas-transforms.spec.ts`

**Deliverable:** Tests select one part, drag-move it, rotate it, resize/edit dimensions, and verify store positions/rotations/dimensions changed.

- [x] Write move drag e2e test that performs real mouse drag on canvas and asserts position changed.
- [x] Write rotation e2e test using keyboard path with store assertion.
- [x] Write resize/properties e2e test with store assertion.
- [x] Verify tests pass.
- [x] Commit as part of the consolidated e2e coverage commit.

### Task 4: Group, assembly, context-menu flows

**Files:**

- Create: `packages/desktop/tests/e2e/group-camera-workflows.spec.ts`

**Deliverable:** Tests create group, preserve selected state through workspace controls, ungroup, add part by keyboard, and undo.

- [x] Write group creation and ungroup e2e tests.
- [ ] Save/place assembly remains covered by component tests; add e2e later if the assembly modal gets stable semantic selectors.
- [x] Verify tests pass.
- [x] Commit as part of the consolidated e2e coverage commit.

### Task 5: Cut list and settings flows

**Files:**

- Create: `packages/desktop/tests/e2e/cut-list-settings.spec.ts`

**Deliverable:** Tests generate cut list with assigned stock, switch tabs, add custom shopping item, edit project/app settings, and verify state.

- [x] Write cut list generation e2e test.
- [x] Write shopping custom item e2e test.
- [x] Write project/app settings e2e test.
- [x] Verify tests pass.
- [x] Commit as part of the consolidated e2e coverage commit.

### Task 6: Full validation and inventory handoff

**Files:**

- Modify: this plan if final coverage differs.
- Optionally modify: `CHANGELOG.md` under `[Unreleased]`.

**Deliverable:** All desktop checks pass or known unrelated failures are documented with exact evidence.

- [x] Run `npm run lint --workspace=@carvd/desktop`.
- [x] Run `npm run typecheck --workspace=@carvd/desktop`.
- [x] Run `npm test --workspace=@carvd/desktop`.
- [x] Report covered feature inventory and remaining gaps.
- [x] Commit as part of the consolidated e2e coverage commit.
