# Custom Cuts Exhaustive Qualification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove every Custom Cuts operation through its complete editing lifecycle and through realistic main-canvas woodworking assemblies, fixing every reproducible P0 defect before the feature is considered releasable.

**Architecture:** Keep the existing blank-plus-ordered-operations model and geometry-bundle boundary. Add a data-driven Electron qualification harness for operation authoring, targeted component/unit coverage for boundary-heavy parameter combinations, and full-canvas scenarios that exercise snapping and collision constraints together. Every production fix begins with a failing regression at the narrowest layer that reproduces the defect, followed by the real Electron workflow when practical.

**Tech Stack:** Electron, React, TypeScript, Zustand, Three.js/React Three Fiber, Vitest, Playwright Electron.

**Specs:** `docs/superpowers/specs/2026-09-03-round-cuts-dowels-and-paul-deck-design.md`, `.claude/docs/part-cuts-production-review.md`

## Global Constraints

- Do not release, merge, publish, or change version numbers while executing this plan.
- Cover all 18 UI presets: End Cut, Edge Bevel, Tenon, Half Lap, Corner Notch, Edge Notch, Cutout, Dado, Stopped Dado, Rabbet, Groove, Stopped Groove, Mortise, Round Hole, Countersink, Counterbore, Rounded Slot, and Rounded Rectangle. End Cut must cover mitre, bevel, and compound variants.
- Cover circular patterns `linear`, `grid`, and `circular`, including limits and out-of-bounds validation.
- Preserve feature-local geometry when a part is copied, duplicated, moved, rotated, saved, reopened, undone, or redone. Copies must have independent feature IDs and nested parameter objects.
- Exercise real accessible UI controls and real canvas pointer/keyboard interactions in Electron. Store injection is allowed only to create a deterministic fixture or inspect exact results, never as a substitute for the behavior under test.
- A P0 failure includes a crash, lost/corrupted feature, wrong face or removal direction, false valid/invalid geometry, copy/undo/save corruption, valid joinery blocked by collision handling, or fabrication output that could cause a bad cut. Do not proceed toward release with any P0 unresolved.
- Loose standalone CNC/G-code behavior remains out of scope. A dowel fit test may use the existing paired Dowel Joint visualization; do not invent a general-purpose loose-hardware modeling system solely for the test.
- Use semantic Playwright queries and deterministic numeric assertions. Avoid screenshot-only assertions for geometry or state correctness.
- Keep production changes minimal and test-driven. Update `CHANGELOG.md` under `[Unreleased]` only for user-visible fixes.

---

### Task 1: Build the complete operation author/edit/delete matrix

**Files:**

- Modify: `packages/desktop/tests/e2e/part-cuts-lifecycle.spec.ts`
- Modify only if the matrix becomes unwieldy: `packages/desktop/tests/e2e/helpers/part-cuts.ts`
- Modify as required by proven defects: `packages/desktop/src/renderer/src/components/part-cuts/PartCutsWorkspace.tsx`
- Test: `packages/desktop/src/renderer/src/components/part-cuts/PartCutsWorkspace.test.tsx`

**Interfaces:**

- Produces reusable Playwright helpers that add a preset, fill non-default values, save, reopen, edit, and inspect the persisted `PartFeature` without bypassing the UI.
- Produces an explicit per-operation parameter table rather than one generic assertion applied to incompatible shapes.

- [ ] Add typed scenario definitions for all 18 presets and the mitre/bevel/compound End Cut variants, naming every meaningful control: target, placement, dimensions, angle/flip, depth mode/depth, radius, and secondary diameter/depth fields.
- [ ] For each scenario, add through the tile with valid non-default values, save the cut and part, reopen Part Cuts, and assert exact persisted kind, cut type, target, parameters, label, and enabled state.
- [ ] Re-edit every meaningful field to a second valid value and assert both live controls and persisted store data update without creating a second feature.
- [ ] Delete the edited cut through the feature-list action, save the part, and assert the feature and its visible geometry are gone; undo and redo must restore/remove the same feature in one logical step.
- [ ] Assert blind/through behavior for types supporting both; assert the required blind-only behavior for dado, stopped dado, rabbet, groove, stopped groove, and mortise.
- [ ] Run the new suite one scenario group at a time, then run the complete `part-cuts-lifecycle.spec.ts`.
- [ ] Fix each reproduced editor defect test-first and record P0/P1 severity in the execution ledger.
- [ ] Commit with `test: qualify every custom cut lifecycle` (or `fix:` when production behavior changes).

### Task 2: Prove direct manipulation, validation boundaries, patterns, and multi-feature behavior

**Files:**

- Modify: `packages/desktop/src/renderer/src/components/part-cuts/PartCutsPreviewCanvas.test.ts`
- Modify: `packages/desktop/src/renderer/src/components/part-cuts/PartCutsWorkspace.test.tsx`
- Modify: `packages/desktop/tests/e2e/part-cuts-lifecycle.spec.ts`
- Modify as required by proven defects: `packages/desktop/src/renderer/src/components/part-cuts/PartCutsPreviewCanvas.tsx`
- Modify as required by proven defects: `packages/desktop/src/renderer/src/components/part-features/partFeatureEditorState.ts`
- Modify as required by proven defects: `packages/desktop/src/renderer/src/utils/roundCutUtils.ts`

**Interfaces:**

- Consumes preview move/resize handles and numeric inspector inputs.
- Produces matching geometry/state from both manipulation paths and precise Save-disabled validation at physical boundaries.

- [ ] Exercise real preview handles for representative movable shapes: cutout, stopped dado, stopped groove, mortise, round hole/pattern origin, rounded slot, and rounded rectangle; assert the numeric controls and derived feature placement agree.
- [ ] Resize every handle-supported shape and verify clamping at the blank boundary, exact-edge acceptance, and over-edge rejection.
- [ ] Add table-driven boundary coverage for zero/negative values, depth equal to and beyond face thickness, 89° versus 90° tilt, invalid rounded radii, invalid countersink/counterbore relationships, and stopped-operation overruns.
- [ ] Add linear, grid, and circular hole patterns with non-default counts, spacing, rotation/direction, and start angle; verify derived member count and exact persistence after reopen.
- [ ] Verify pattern limits 1/128 accepted and 0/129 rejected, plus zero spacing and patterns extending beyond the blank.
- [ ] Combine intersecting dado, hole, and cutout operations; require deterministic geometry or an explicit actionable conflict instead of a corrupted/empty mesh.
- [ ] Verify duplicate, reorder, enable/disable, mirror where available, undo, and redo preserve independent nested parameters and expected fabrication order.
- [ ] Commit with `test: harden custom cut manipulation and boundaries` (or a defect-specific `fix:` commit).

### Task 3: Qualify featured-part copy, duplicate, persistence, transforms, and output

**Files:**

- Modify: `packages/desktop/tests/e2e/part-cuts-lifecycle.spec.ts`
- Modify: `packages/desktop/tests/e2e/canvas-transforms.spec.ts`
- Modify: `packages/desktop/src/renderer/src/store/clipboardStore.test.ts`
- Modify: `packages/desktop/src/renderer/src/store/projectStore.test.ts`
- Modify as required by proven defects: `packages/desktop/src/renderer/src/store/clipboardStore.ts`
- Modify as required by proven defects: `packages/desktop/src/renderer/src/store/projectStore.ts`

**Interfaces:**

- Consumes keyboard/context-menu copy, paste, duplicate, canvas move, and X/Y/Z rotation workflows.
- Produces deep-independent feature-bearing parts whose geometry stays rigid in part-local coordinates.

- [ ] Create representative parts containing end, rectangular, circular/patterned, and rounded feature kinds; duplicate each part through the real main-canvas command and assert new part/feature IDs with equal but non-aliased parameters.
- [ ] Copy/paste featured parts and Copy/Paste Cuts across compatible parts; edit the copy and assert the source remains byte-for-byte unchanged.
- [ ] Move a featured part with a real canvas drag and rotate it around X, Y, and Z; assert features remain unchanged locally, render geometry remains pickable, and undo/redo restores transforms.
- [ ] Resize a copied part and verify source geometry/parameters remain independent and the copy receives clear validation when a cut no longer fits.
- [ ] Save, close, and reopen a project containing mixed features, patterns, labels, enabled states, order, and transforms; assert exact round-trip state.
- [ ] Generate the Cut List and inspect fabrication operations for all families; verify enabled ordering, target, dimensions, angle/pattern, and blind/through details. Exercise PDF/CSV export where the format supports those details.
- [ ] Commit with `test: cover featured part lifecycle on the canvas` (or a defect-specific `fix:` commit).

### Task 4: Fix and prove dado, groove, rabbet, half-lap, and mortise/tenon assembly fits

**Files:**

- Modify: `packages/desktop/src/renderer/src/utils/interactionSnapContext.ts`
- Modify: `packages/desktop/src/renderer/src/utils/interactionMovePreview.ts`
- Modify: `packages/desktop/src/renderer/src/components/workspace/usePartDrag.ts`
- Modify: `packages/desktop/src/renderer/src/utils/overlapPolicy.ts`
- Modify: `packages/desktop/src/renderer/src/utils/snapToPartsUtil.test.ts`
- Modify: `packages/desktop/src/renderer/src/utils/overlapPolicy.test.ts`
- Modify: `packages/desktop/src/renderer/src/utils/dragSnapFlow.integration.test.ts`
- Create: `packages/desktop/tests/e2e/custom-cuts-assembly.spec.ts`

**Interfaces:**

- Preserve `mateHostPartId` from feature-mate detection through move preview into collision resolution.
- Permit physically valid insertion into a compatible socket while continuing to reject unrelated solid overlap.

- [ ] First add a failing integration test proving the detected dado/mortise mate is clamped away when prevent-overlap runs without the mate host identity.
- [ ] Thread the mate host identity through the interaction result without weakening ordinary overlap prevention, then make the narrow regression pass.
- [ ] In Electron, create a `.755 in` dado and seat a `.75 in` divider using real rotate/drag/snap interactions; assert socket alignment, correct bottom depth, and no false overlap clamp. Verify `.74` clearance and `.80` no-fit behavior.
- [ ] Repeat physical-fit coverage for a full groove, stopped groove, and rabbet, including a stopped mate that must not snap beyond the termination.
- [ ] Create complementary half laps on crossing boards, rotate one 90°, and seat them flush; edit one depth and prove the mismatch is visible/stateful.
- [ ] Create a tenon and slightly oversized matching mortise on separate parts, rotate/translate to seat, and prove material/void semantics and collision behavior are correct.
- [ ] Move the host part after assembly and verify its cut stays local while the mating part remains an independent canvas object.
- [ ] Commit with `fix: allow valid custom cut joinery fits`.

### Task 5: Prove complementary mitres and paired dowel alignment

**Files:**

- Modify: `packages/desktop/tests/e2e/custom-cuts-assembly.spec.ts`
- Modify: `packages/desktop/src/renderer/src/utils/dowelJointUtils.test.ts`
- Modify: `packages/desktop/src/renderer/src/store/clipboardStore.test.ts`
- Modify as required by proven defects: `packages/desktop/src/renderer/src/utils/snapToPartsUtil.ts`
- Modify as required by proven defects: `packages/desktop/src/renderer/src/utils/dowelJointUtils.ts`
- Modify as required by proven defects: `packages/desktop/src/renderer/src/components/workspace/usePartDrag.ts`

**Interfaces:**

- Consumes exact shaped bounds/anchors for mitres and paired round-hole metadata for dowels.
- Produces assembly-level evidence that matching geometry aligns in world space and mismatches are not falsely accepted.

- [ ] Create two complementary 45° frame mitres, rotate and drag them into a gap-free corner, and assert intended faces meet with no solid overlap. Repeat opposite flip and edit one angle after assembly to prove shaped bounds/snaps refresh.
- [ ] Cover 22.5° and compound/bevel variants at the geometry/integration layer when a deterministic Electron gesture is impractical.
- [ ] Create a paired `.375 in` Dowel Joint between touching members and assert matching hole diameters, coaxial world centers, valid embedment, and derived dowel visualization.
- [ ] Move either member and verify the holes remain part-local and alignment diagnostics change; move it back and verify the aligned state returns.
- [ ] Exercise `.25`/`.5` mismatch validation so the UI never presents an invalid dowel-to-hole fit as valid.
- [ ] Copy one joint member and assert it becomes ordinary unpaired holes; copy both members and assert joint/feature IDs remap without corrupting the original pair.
- [ ] Delete one paired hole and verify the resulting state and fabrication output are understandable and non-corrupt; undo must restore the relationship atomically when applicable.
- [ ] Commit with `test: qualify mitre and dowel assemblies` (or a defect-specific `fix:` commit).

### Task 6: Run the hands-on woodworking qualification and close defects

**Files:**

- Create: `.claude/docs/custom-cuts-exhaustive-qa-results.md`
- Modify tests and production files only through one defect-specific TDD loop at a time.
- Modify: `CHANGELOG.md` for user-visible fixes.

**Interfaces:**

- Produces a build/commit/OS-stamped record with exact inputs and evidence for every P0 scenario.

- [ ] Build and launch the real Electron app, then execute the common lifecycle against every operation: add, move, edit dimensions/shape/angle, depth, duplicate, delete, undo/redo, save/reopen, copy part, move/rotate part, and inspect fabrication output.
- [ ] Execute realistic woodworking scenarios for picture-frame mitres, compound bevels, dado/divider, stopped dado, groove/back, stopped groove, rabbet, half lap, mortise/tenon, holes on multiple faces, dowel joint, countersink, counterbore, patterns, rounded slot, rounded rectangle, cutout, edge notch, and corner notch.
- [ ] Repeat representative mitre, dado, mortise, and hole workflows in metric and with fractional-inch input.
- [ ] Stress one part with 20 mixed features; orbit, select, edit, reorder, save, reopen, and generate fabrication output without stale picking or a corrupted mesh.
- [ ] For each failure, capture reproduction, expected/actual behavior, severity, and regression-test location before changing production code.
- [ ] Do not mark this task complete until every P0 is fixed and re-run in Electron. P1 findings may be deferred only with an explicit rationale in the execution ledger and QA results.
- [ ] Commit with `test: document exhaustive custom cuts qualification` plus defect-specific commits as needed.

### Task 7: Full verification and independent review without release

**Files:**

- Verify all files changed by Tasks 1–6.

**Interfaces:**

- Produces a reviewed, unreleased branch with a reproducible evidence package.

- [ ] Run `npm run lint --workspace=@carvd/desktop`.
- [ ] Run `npm run typecheck --workspace=@carvd/desktop`.
- [ ] Run `npm test --workspace=@carvd/desktop`.
- [ ] Run the full Electron E2E matrix, including `part-cuts-lifecycle.spec.ts`, `canvas-transforms.spec.ts`, and `custom-cuts-assembly.spec.ts`.
- [ ] Run the desktop production build and `git diff --check`.
- [ ] Request an independent whole-branch review; resolve every Critical/Important finding test-first and re-run affected suites.
- [ ] Record exact commands, counts, commit SHA, remaining P1 issues, and every execution ruling in `.claude/docs/custom-cuts-exhaustive-qa-results.md`.
- [ ] Stop with the branch unreleased and report readiness plus any residual risks to the user.
