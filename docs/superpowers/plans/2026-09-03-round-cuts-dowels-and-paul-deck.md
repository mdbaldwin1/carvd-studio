# Round Cuts, Dowel Joinery, and Paul Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add round and rounded Custom Cuts, paired dowel joinery, and verified flush-alignment behavior using Paul Knapp's real deck project.

**Architecture:** Add `circular_cut` and `rounded_cut` variants to the existing ordered `PartFeature` model, expand patterns only during derivation, and keep the geometry-bundle contract as the sole source for rendering and interaction. Represent dowel joints as paired circular features with validated relationship metadata and derived dowel visualization. Validate Paul's raw project read-only and commit only anonymized minimal regression fixtures.

**Tech Stack:** TypeScript, React 19, Zustand, Three.js, React Three Fiber, Vitest, Playwright Electron, Electron file format v2.

**Spec:** `docs/superpowers/specs/2026-09-03-round-cuts-dowels-and-paul-deck-design.md`

## Global Constraints

- Do not add arbitrary sketches, free-form curves, general boolean modeling, CNC/G-code, CAM, feeds, speeds, or machine profiles.
- Keep Paul's source file read-only and outside git; only anonymized minimal derived fixtures may be committed.
- Keep analytics coarse: never capture operation types, dimensions, patterns, joint IDs, part IDs, project names, or paths.
- Keep feature schema version `1`; feature-bearing project files remain file format version `2`.
- Cap patterns at 128 members, effective circular profiles at 512 per part, and circular tessellation at 64 segments.
- Use TDD for every production behavior and update `CHANGELOG.md` under `Unreleased`.

---

### Task 1: Round feature domain model and strict parsing

**Files:**

- Modify: `packages/desktop/src/renderer/src/types.ts`
- Modify: `packages/desktop/src/renderer/src/utils/partFeatures.ts`
- Test: `packages/desktop/src/renderer/src/utils/partFeatures.test.ts`
- Modify: `packages/desktop/src/renderer/src/utils/fileFormat.ts`
- Test: `packages/desktop/src/renderer/src/utils/fileFormat.test.ts`

**Interfaces:**

- Produces `CircularCutFeature`, `RoundedCutFeature`, `CircularPattern`, `DowelJointMetadata`, and expanded `PartFeature`.
- Produces strict non-throwing runtime validation for both new variants.

- [ ] Add failing type-driven fixture tests for valid round hole, countersink, counterbore, rounded slot, and rounded rectangle records.
- [ ] Add failing table tests rejecting NaN/infinite/non-positive dimensions, invalid faces, inconsistent termination payloads, malformed patterns, excessive counts, and malformed dowel metadata.
- [ ] Add failing file-format tests proving version-2 round features load and malformed round feature containers return validation errors without throwing.
- [ ] Implement the exact discriminated unions from the spec, using normalized finite-number guards and exhaustive field validation.
- [ ] Preserve deep clone semantics for nested pattern, countersink/counterbore, and dowel metadata structures.
- [ ] Run focused tests and commit `feat: add round cut feature model`.

### Task 2: Face-space mapping and pattern expansion

**Files:**

- Create: `packages/desktop/src/renderer/src/utils/roundCutUtils.ts`
- Create: `packages/desktop/src/renderer/src/utils/roundCutUtils.test.ts`

**Interfaces:**

- Produces `getFaceFrame(part, face): FaceFrame`.
- Produces `expandCircularCut(feature, part): ExpandedCircularCut[]`.
- Produces `validateCircularCut(feature, part): string | null` and `validateRoundedCut(feature, part): string | null`.

- [ ] Write failing tests mapping primary/secondary coordinates and inward normals for all six faces.
- [ ] Write failing tests for linear, grid, and circular pattern member centers, deterministic order, rotations, and the 128/512 limits.
- [ ] Write failing tests for straight/angled axis calculation, exit intersections, blind-depth containment, and out-of-bounds entry profiles.
- [ ] Write failing tests for countersink/counterbore physical constraints and rounded-profile radius constraints.
- [ ] Implement pure face-frame, vector, expansion, and validation functions with no React/store dependencies.
- [ ] Run focused tests and commit `feat: resolve round cut placement and patterns`.

### Task 3: Exact round and rounded geometry

**Files:**

- Modify: `packages/desktop/src/renderer/src/utils/partFeatureGeometry.ts`
- Test: `packages/desktop/src/renderer/src/utils/partFeatureGeometry.test.ts`
- Modify: `packages/desktop/src/renderer/src/interaction/geometry/featureBundle.ts`
- Test: `packages/desktop/src/renderer/src/interaction/geometry/featureBundle.test.ts`

**Interfaces:**

- Consumes expanded round members and validated rounded profiles from Task 2.
- Produces cached render geometry, actual contour bounds, hit proxy, snap anchors, measurement graph, and collision proxy through the existing `PartGeometryBundle`.

- [ ] Add failing geometry tests for top/front/end-face through holes, blind holes, angled holes, countersinks, counterbores, rounded slots, and rounded rectangles.
- [ ] Assert holes remain open, blind floors occur at the requested depth, angled exit centers are correct, and rounded profiles preserve corner radii.
- [ ] Add failing bundle tests for hole-center anchors, round-edge anchors, cut-aware bounds, and cache disposal after eviction.
- [ ] Implement deterministic sampled profiles capped at 64 segments and layer interval construction for blind/through/angled operations.
- [ ] Expand patterns lazily during derivation and reject excessive effective profiles before allocating geometry.
- [ ] Run focused geometry/bundle tests and commit `feat: render round and rounded cuts`.

### Task 4: Conflict analysis and fabrication summaries

**Files:**

- Modify: `packages/desktop/src/renderer/src/utils/partFeatureConflicts.ts`
- Test: `packages/desktop/src/renderer/src/utils/partFeatureConflicts.test.ts`
- Modify: `packages/desktop/src/renderer/src/utils/partFeatureSummary.ts`
- Test: `packages/desktop/src/renderer/src/utils/partFeatureSummary.test.ts`
- Modify: `packages/desktop/src/renderer/src/utils/cutListInstructions.ts`
- Test: `packages/desktop/src/renderer/src/utils/cutListInstructions.test.ts`

**Interfaces:**

- Produces duplicate/overlap/anchor-consumption conflicts for round and rounded operations.
- Produces localized unit-aware summaries and fabrication lines.

- [ ] Add failing tests for duplicate coaxial holes, overlapping removals, patterns leaving the blank, and ordered conflicts with existing rectangular cuts.
- [ ] Add failing imperial/metric summary tests for every new operation and pattern.
- [ ] Add failing fabrication tests containing recognizable reference edges, diameter, depth, angle, pattern quantity/spacing, and countersink/counterbore details.
- [ ] Implement conflict volumes and wording without discarding drafts.
- [ ] Implement concise workshop instructions while leaving blank optimization dimensions unchanged.
- [ ] Run focused tests and commit `feat: validate and report round cuts`.

### Task 5: Part Cuts draft store and actions

**Files:**

- Modify: `packages/desktop/src/renderer/src/store/partCutsEditingStore.ts`
- Test: `packages/desktop/src/renderer/src/store/partCutsEditingStore.test.ts`
- Modify: `packages/desktop/src/renderer/src/utils/partFeatureActions.ts`
- Test: `packages/desktop/src/renderer/src/utils/partFeatureActions.test.ts`

**Interfaces:**

- Produces round/rounded draft creation, editing, undo/redo, mirror, copy/paste, and pattern editing.
- Produces relationship-safe ID remapping for copied dowel features.

- [ ] Add failing draft lifecycle tests for every new operation and nested parameter edit.
- [ ] Add failing mirror tests for all six faces and pattern orientations.
- [ ] Add failing copy tests proving a lone dowel member becomes an ordinary hole and paired copied parts receive new joint/part IDs.
- [ ] Implement immutable draft mutations and deep copies through existing store history boundaries.
- [ ] Run focused tests and commit `feat: edit round cut drafts`.

### Task 6: Round Cuts inspector and preview

**Files:**

- Modify: `packages/desktop/src/renderer/src/components/part-cuts/PartCutsWorkspace.tsx`
- Test: `packages/desktop/src/renderer/src/components/part-cuts/PartCutsWorkspace.test.tsx`
- Modify: `packages/desktop/src/renderer/src/components/part-cuts/PartCutsPreviewCanvas.tsx`
- Test: `packages/desktop/src/renderer/src/components/part-cuts/PartCutsPreviewCanvas.test.ts`

**Interfaces:**

- Consumes Task 5 draft actions and Task 2 validation.
- Produces accessible operation groups, inspector fields, target picking, preview outlines/axes/exits, and validation feedback.

- [ ] Add failing semantic UI tests for Round Cuts and Joinery grouping plus every required inspector field.
- [ ] Add failing interaction tests for through/blind mode, tilt/direction, countersink/counterbore controls, rounded profiles, and three pattern types.
- [ ] Add failing preview tests for entry circle, projected axis, exit marker, and all pattern members.
- [ ] Implement shadcn-based controls with woodworking labels and no raw-axis terminology.
- [ ] Keep invalid drafts editable and block only Save with a plain-language message.
- [ ] Run focused tests and commit `feat: add round cuts workspace controls`.

### Task 7: Paired dowel joint workflow

**Files:**

- Create: `packages/desktop/src/renderer/src/utils/dowelJointUtils.ts`
- Create: `packages/desktop/src/renderer/src/utils/dowelJointUtils.test.ts`
- Create: `packages/desktop/src/renderer/src/components/part-cuts/DowelJointDialog.tsx`
- Create: `packages/desktop/src/renderer/src/components/part-cuts/DowelJointDialog.test.tsx`
- Modify: `packages/desktop/src/renderer/src/store/projectStore.ts`
- Test: `packages/desktop/src/renderer/src/store/projectStore.test.ts`
- Modify: `packages/desktop/src/renderer/src/components/workspace/PartsRenderer.tsx`

**Interfaces:**

- Produces `createDowelJoint(input): { firstFeatures; secondFeatures; jointId }` and alignment diagnostics.
- Produces derived, non-selectable dowel visualization controlled by `showDowels`.

- [ ] Add failing pure tests for opposing-face qualification, local coordinate projection, hole pairing, depth/length constraints, and misalignment diagnostics.
- [ ] Add failing dialog tests for the four-step workflow, retained selections after errors, and keyboard/accessibility behavior.
- [ ] Add failing project-store tests proving both parts update in one undoable transaction.
- [ ] Implement paired circular features with namespaced metadata and stable local placements.
- [ ] Render derived dowel cylinders without adding stock/cut-list parts or interaction targets.
- [ ] Add display preference tests and commit `feat: add paired dowel joints`.

### Task 8: Paul deck real-project snapping validation

**Files:**

- Read only: `/Users/michaelbaldwin/Carvd/carvd-studio-project-files/Paul_Knapp-Clay & Sarahs Deck.carvd`
- Modify as failures require: `packages/desktop/src/renderer/src/utils/snapToPartsUtil.ts`
- Test: `packages/desktop/src/renderer/src/utils/snapToPartsUtil.test.ts`
- Create if needed: `packages/desktop/tests/fixtures/paul-deck-snap-regression.json`
- Create: `packages/desktop/tests/e2e/paul-deck-alignment.spec.ts`

**Interfaces:**

- Produces verified face-flush plus tangential edge/corner alignment for representative deck joists and deck boards.
- Produces only anonymized minimal fixtures; never copies the raw project into git.

- [ ] Load the raw version-1 file and record representative part transforms/dimensions without modifying it.
- [ ] Exercise joist corner recovery and deck-board end-flush recovery in a disposable temporary copy.
- [ ] For each observed failure, first add a minimal failing unit or E2E regression using anonymized parts.
- [ ] Correct candidate ranking/latching/axis composition minimally, preserving face contact while tangential edge alignment wins.
- [ ] Re-run the actual-project workflow, save a disposable copy, reopen it, and compare final transforms.
- [ ] Commit `fix: validate flush alignment on real deck geometry`.

### Task 9: End-to-end lifecycle, documentation, and privacy

**Files:**

- Modify: `packages/desktop/tests/e2e/part-cuts-lifecycle.spec.ts`
- Modify: `docs/CUSTOM-CUTS-BETA-CHECKLIST.md`
- Modify: `.claude/docs/features-roadmap.md`
- Modify: `packages/website/src/pages/FeaturesPage.tsx`
- Modify: `packages/website/src/pages/docs/JoineryPage.tsx`
- Modify relevant website tests.
- Modify: `CHANGELOG.md`

**Interfaces:**

- Produces automated lifecycle coverage and accurate public documentation without expanding analytics payloads.

- [ ] Add failing E2E scenarios for a round through-hole, angled blind countersink, pattern edit, rounded profiles, paired dowel joint, invalid-pattern retention, copy/paste, and save/reopen.
- [ ] Implement any missing integration boundaries until all scenarios pass.
- [ ] Update beta checklist with round operations, dowel alignment, and Paul deck acceptance record fields.
- [ ] Update website tests first, then copy, roadmap, and changelog; explicitly exclude free-form CAD and CNC promises.
- [ ] Confirm analytics tests prove no new sensitive properties are emitted.
- [ ] Run focused desktop/website tests and commit `docs: document round cuts and dowel joinery`.

### Task 10: Full verification, review, and PR update

**Files:**

- Verify all files changed by Tasks 1-9.
- Update PR: `https://github.com/mdbaldwin1/carvd-studio/pull/444`

**Interfaces:**

- Produces a reviewed, green develop-targeted PR with Paul deck evidence.

- [ ] Run desktop lint, typecheck, format, renderer/main tests, production build, and complete Electron E2E suite.
- [ ] Run website lint, typecheck, format, unit tests, build, and Chromium E2E suite.
- [ ] Run `git diff --check`, inspect the complete diff for unrelated data/secrets, and prove Paul's raw project is untracked.
- [ ] Request independent code review and resolve all Important/Critical findings test-first.
- [ ] Push the branch, update PR #444 with test evidence and Paul deck results, and wait for CI.
- [ ] Do not merge or publicly release until the user explicitly requests it and beta acceptance is complete.
