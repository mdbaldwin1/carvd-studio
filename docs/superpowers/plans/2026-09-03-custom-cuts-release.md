# Custom Cuts Production Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote the existing Part Cuts implementation onto current `develop`, harden its runtime and memory boundaries, prove its critical cross-system workflows, and prepare it for a user beta and public feature release.

**Architecture:** Preserve the existing blank-plus-ordered-operations model and dedicated Part Cuts workspace. Integrate current platform/analytics work first, then add bounded ownership for generated Three.js geometries and runtime validation for file-format-v2 feature payloads. Extend Electron tests at the system seams rather than duplicating the extensive geometry unit suite.

**Tech Stack:** Electron, React, TypeScript, Zustand, Three.js/React Three Fiber, Vitest, Playwright, Vite, GitHub Actions.

**Spec:** `.claude/docs/part-cuts-production-review.md`

## Global Constraints

- Preserve existing project files without cuts and continue saving them with the base file version.
- Projects containing cuts must use file format version 2 and older app builds must reject them clearly.
- Ordinary rectangular parts must remain on the instanced rendering path.
- Cut-list optimization remains blank-first; operations are fabrication instructions applied afterward.
- Do not broaden the operation catalog or introduce freeform CAD geometry in this release.
- Keep analytics privacy-safe: no dimensions, labels, project content, filenames, or free-form text.
- Target current `develop`; never push directly to `develop` or `main`.

---

### Task 1: Integrate current develop

**Files:**

- Modify: `CHANGELOG.md`
- Modify: `packages/desktop/src/renderer/src/components/stock/CutListModal.test.tsx`
- Verify merged overlap: `packages/desktop/src/renderer/src/App.tsx`
- Verify merged overlap: `packages/desktop/src/renderer/src/components/stock/CutListModal.tsx`
- Verify merged overlap: `packages/desktop/tests/e2e/helpers/electron-app.ts`

**Interfaces:**

- Consumes: current `origin/develop` platform, analytics, release, and version changes.
- Produces: one integrated Custom Cuts branch based on current `develop` with file-format and UI behavior preserved.

- [ ] Fetch `origin/develop` and merge it into `codex/custom-cuts-release` with a merge commit.
- [ ] Resolve `CHANGELOG.md` by retaining current release history and placing Custom Cuts under `[Unreleased]`.
- [ ] Resolve `CutListModal.test.tsx` by retaining both current analytics/export assertions and feature-aware cut-list assertions.
- [ ] Run `npm run typecheck --workspace=@carvd/desktop` and correct integration-only type errors.
- [ ] Run the focused tests for every file changed on both branches.
- [ ] Commit with `chore: integrate develop into custom cuts release` if conflict resolution is not contained in the merge commit.

### Task 2: Bound generated feature geometry

**Files:**

- Modify: `packages/desktop/src/renderer/src/utils/partFeatureGeometry.ts`
- Modify: `packages/desktop/src/renderer/src/utils/partFeatureGeometry.test.ts`

**Interfaces:**

- Consumes: `getPartRenderGeometry(part: Part): THREE.BufferGeometry`.
- Produces: bounded cache behavior and test-only cache observations without changing renderer callers.

- [ ] Add a failing test that generates more than the configured cache limit of distinct feature geometries and asserts that the cache never exceeds the limit.
- [ ] Add a failing test that spies on the oldest geometry's `dispose()` method and asserts it is called on eviction.
- [ ] Run the focused test and confirm both tests fail because the current `Map` is unbounded.
- [ ] Implement a small LRU policy: promote cache hits, evict and dispose the oldest entry before inserting beyond the fixed maximum.
- [ ] Export a test-only cache-size accessor named `getPartGeometryCacheSizeForTests()`; do not expose geometry objects.
- [ ] Run `npm exec vitest run --workspace=@carvd/desktop -- src/renderer/src/utils/partFeatureGeometry.test.ts` and confirm it passes.
- [ ] Commit with `fix: bound custom cut geometry cache`.

### Task 3: Validate file-format-v2 feature payloads

**Files:**

- Modify: `packages/desktop/src/renderer/src/utils/partFeatures.ts`
- Modify: `packages/desktop/src/renderer/src/utils/fileFormat.ts`
- Modify: `packages/desktop/src/renderer/src/utils/fileFormat.test.ts`
- Test: `packages/desktop/src/renderer/src/utils/partFeatures.test.ts`

**Interfaces:**

- Produces: `validateSerializedPartFeatures(value: unknown, path: string): string[]`.
- Consumes: the existing `PartFeature`, target, operation, and parameter enums.

- [ ] Add failing table-driven tests for missing targets/references, unknown kinds/cut types, non-finite values, invalid dimensions/depths, invalid target enums, and duplicate feature IDs.
- [ ] Add a failing file-format test showing a malformed v2 feature returns `valid: false` instead of throwing during migration.
- [ ] Run the two focused test files and verify failures occur at the missing validation boundary.
- [ ] Implement structural validation without mutating the input. Require finite numbers and the fields appropriate to `end_cut` versus `rect_cut`.
- [ ] Invoke validation from `validateCarvdFile` before `migrateFile` and prefix errors with the part or assembly path.
- [ ] Keep v1 files with no `features` valid and normalized to empty arrays.
- [ ] Run both focused suites and confirm they pass.
- [ ] Commit with `fix: validate custom cuts in project files`.

### Task 4: Expand critical Electron lifecycle coverage

**Files:**

- Modify: `packages/desktop/tests/e2e/part-cuts-lifecycle.spec.ts`
- Modify only if required: `packages/desktop/tests/e2e/helpers/electron-app.ts`

**Interfaces:**

- Consumes: accessible Part Cuts controls and existing Electron file helpers.
- Produces: system-level proof of persistence, operation-family editing, copy/paste, conflict blocking, and manufacturing output.

- [ ] Add a save/reopen test that authors a cut, saves the `.carvd` project, reloads it, and asserts the operation remains present.
- [ ] Run only that test and verify it fails before adding any missing helper behavior.
- [ ] Add the minimum helper support needed for the real save/reopen path and make the test pass.
- [ ] Add a mortise-and-tenon workflow test using real UI controls and verify both operations survive `Save Part`.
- [ ] Add a copy/paste-cuts test across two parts and assert the pasted feature IDs are independent.
- [ ] Add a blocking-conflict test and assert the workspace remains open with an actionable error.
- [ ] Add a cut-list assertion that saved operations appear in fabrication output.
- [ ] Run `npx playwright test tests/e2e/part-cuts-lifecycle.spec.ts` after every scenario.
- [ ] Commit with `test: cover custom cuts release workflows`.

### Task 5: Add privacy-safe adoption measurement

**Files:**

- Modify: `packages/desktop/src/shared/analytics.ts`
- Modify: `packages/desktop/src/shared/analytics.test.ts`
- Modify: `packages/desktop/src/renderer/src/hooks/usePartCutsEditing.ts`
- Modify or create: focused hook analytics tests.
- Modify: `docs/analytics/EVENT-CATALOG.md`

**Interfaces:**

- Produces events `part_cuts_opened` and `part_cuts_saved`.
- Permitted properties: `source` and coarse `operation_count_bucket`; no cut labels, types, dimensions, part IDs, or project data.

- [ ] Add failing analytics allowlist tests for the two events and rejection of prohibited properties.
- [ ] Add failing hook tests asserting open/save capture is fire-and-forget and functional behavior does not await analytics.
- [ ] Add the two events to the shared runtime allowlist and capture them at successful workflow boundaries.
- [ ] Update the event catalog with the exact privacy boundary.
- [ ] Run focused analytics and hook tests.
- [ ] Commit with `feat: measure privacy-safe custom cuts adoption`.

### Task 6: Documentation and beta readiness

**Files:**

- Modify: `CHANGELOG.md`
- Modify: `.claude/docs/features-roadmap.md`
- Modify: `packages/website/src/pages/FeaturesPage.tsx`
- Modify: `packages/website/src/pages/docs/JoineryPage.tsx`
- Modify relevant website tests.
- Create: `.claude/docs/custom-cuts-beta-checklist.md`

**Interfaces:**

- Produces: accurate public copy and a concrete Paul acceptance script.

- [ ] Update website tests first to require blank-plus-operations wording, supported operation families, and no promise of freeform CAD.
- [ ] Run focused website tests and verify the copy assertions fail.
- [ ] Implement concise Features and Joinery documentation with Part Cuts entry points and fabrication-output behavior.
- [ ] Add a beta checklist covering discoverability, face/end vocabulary, measurement references, real-project completion, save/reopen, and shop-output usefulness.
- [ ] Update `[Unreleased]` without changing version numbers manually.
- [ ] Run focused website tests, website typecheck, and website build.
- [ ] Commit with `docs: prepare custom cuts beta and launch copy`.

### Task 7: Full verification and PR

**Files:**

- Verify all files changed by Tasks 1–6.

**Interfaces:**

- Produces: reviewable PR targeting `develop`, with no direct protected-branch push.

- [ ] Run desktop lint, typecheck, format check, renderer/main tests, production build, and full Electron E2E matrix.
- [ ] Run website lint, typecheck, format check, unit tests, production build, and Chromium E2E tests.
- [ ] Run `git diff --check` and inspect the complete diff for unrelated changes or secrets.
- [ ] Request an independent code review and resolve every Important/Critical finding test-first.
- [ ] Push `codex/custom-cuts-release` and open a PR targeting `develop` with test evidence and the Paul beta checklist.
- [ ] Wait for CI and fix any reproducible failures before merge.
