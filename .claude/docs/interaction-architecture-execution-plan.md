# Interaction Architecture: Execution Plan

Status: Active execution plan
Date: 2026-05-09
Companion docs:

- [`interaction-architecture-redesign.md`](./interaction-architecture-redesign.md) — audit findings
- [`interaction-system-blueprint.md`](./interaction-system-blueprint.md) — target architecture
- [`reference-positioning-system.md`](./reference-positioning-system.md) — reference-positioning spec

## Mission

Make the workspace interaction model architecturally solid before the custom-cuts work (`codex/poc-part-features-plan` in `~/Carvd/carvd-studio`) merges develop and ships. Custom cuts will add real complexity; the baseline must be ready.

**Owner intent:**

- App should be low-maintenance once running.
- Recurring regressions are a signal of poor architecture, not a coding habit. The architecture phases below remove the conditions that cause them.
- Each phase must keep every existing user-visible workflow working. Internal refactor, not feature change.

## Decisions locked

- All 8 blueprint phases are in scope.
- Selection changes are **not** undoable. zundo wraps `projectStore` only. ADR-001.
- Sequential execution, single engineer.
- Custom-cuts gate: Tier 0 + Tier 1 + §1 Scene Graph + §5 Geometry Query Layer must complete before `develop` merges into `codex/poc-part-features-plan`. §6 Part Shape Model is the merge.

## Sequencing

```
Week 1:      Land current branch (PR open / squash to develop)
Weeks 1-2:   P0 + §11 spec
Weeks 2-3:   §11 Hit-Test build
Weeks 3-6:   §3 Session Controller
Weeks 6-7:   §4 Tool Solvers
Weeks 7-8:   §10 Overlay Engine
Weeks 8-9:   §8 Constraint Engine
Week 9:      §12 Store cleanup
══════════════ ◇ Custom-cuts merge gate ══════════════
Weeks 10-11: §1 Scene Graph
Weeks 11-13: §5 Geometry Query Layer
Weeks 13-15: §6 Part Shape Model (merges with custom-cuts)
Weeks 15-17: §7 Snap Engine
Weeks 17-18: §9 Collision and Fit
```

~4.5 months end-to-end. Custom-cuts can ship in week ~14 with §6 baked in.

## Pre-work (P0) — before any phase work begins

### P0.1 — Land current branch

Squash-merge `codex/interaction-architecture-review` to `develop` per [AGENTS.md](../../AGENTS.md). This PR.

### P0.2 — ADR directory

Create `.claude/docs/adr/`. Each phase produces one ADR documenting decision, alternatives, consequences. Phases without ADRs do not merge.

Template:

```markdown
# ADR-NNN: <decision>

Status: Accepted | Superseded
Context: <why this decision was needed>
Decision: <what we chose>
Alternatives considered: <what we rejected and why>
Consequences: <what becomes easier; what becomes harder>
```

### P0.3 — Test strategy doc

`.claude/docs/interaction-test-strategy.md` defining:

- **Engine tests** (Vitest, no React): fast, exhaustive — selection resolver, snap arbitration, constraint solver, collision policy.
- **Session integration** (Vitest + `@testing-library/react`): click vs drag, multi-part commit parity, group gestures.
- **UI smoke** (Playwright): mode entry/exit, controls visible, overlay visibility.

Each phase below references which layers are required.

### P0.4 — Undo/redo ADR

ADR-001: Selection is not undoable. Document rationale. Update AGENTS.md.

### P0.5 — Performance baseline

Use `carvdDev.perfBaseline()` and existing `snapPerf` telemetry. Capture:

- Drag with 50 parts, 500 parts.
- Snap detection cost per frame.
- Re-render after selection change.

Each PR has a "no perf regression vs baseline" check.

### P0.6 — Test fixtures

Build `tests/fixtures/`:

- Empty project.
- 5-part assembly.
- 50-part assembly with groups.
- 500-part complex scene.
- Nested-groups scene.
- Custom-rotation scene.

Used as test inputs throughout.

## Tier 0 — Foundation (~6–8 weeks compressed)

### Phase 11 — Hit-Testing Layer

Eliminates the bug class behind every issue we hit this session: instanced vs individual raycast paths, DOM overlay portals blocking events, fallback raycasts disagreeing.

**Deliverable:** `src/renderer/src/interaction/hitTest.ts`

```ts
type HitTarget =
  | {
      kind: "part-body";
      nodeId: string;
      ancestorGroupIds: string[];
      topLevelGroupId: string | null;
      worldPoint: Vec3;
    }
  | {
      kind: "resize-handle";
      nodeId: string;
      axis: "x" | "y" | "z";
      side: 1 | -1;
    }
  | {
      kind: "rotation-handle";
      nodeId: string;
      axis: "x" | "y" | "z";
      side: 1 | -1;
    }
  | { kind: "snap-guide"; guideId: string }
  | { kind: "ground"; worldPoint: Vec3 }
  | { kind: "sky"; worldPoint: Vec3 }
  | { kind: "overlay"; overlayId: string };

export function resolveHitTarget(
  screenPoint: { x: number; y: number },
  context: { camera; scene; parts; groupMembers; overlayRegistry },
): HitTarget | null;
```

**Overlay registry:** `Map<overlayId, BoundingRect>` populated by drei `<Html>` wrappers on mount/update. `resolveHitTarget` checks registry first (DOM-space), then 3D raycast. Makes overlays first-class hit targets.

**Migration:**

1. Build service + tests.
2. `Workspace.tsx::getHitPartId` and `hasInteractiveHitAt` delegate to service.
3. `Part.tsx` and `InstancedParts.tsx` per-mesh handlers no longer raycast independently.
4. Delete `shouldForceIndividualFallback` workaround.
5. Delete box-fallback raycast.

**Tests:**

- Engine: every `HitTarget` kind, overlapping parts, rotated parts, instanced positions, overlay above part.
- Session integration: click on body vs handle, click on overlay-covered part.
- UI smoke: happy-path passes.

**Completion criteria:**

- `resolveHitTarget` used by all click/drag-init paths.
- `getHitPartId` and `hasInteractiveHitAt` are thin wrappers or deleted.
- `shouldForceIndividualFallback` deleted.
- Box-fallback raycast deleted.
- All 4 bug-class regression tests from `interaction-architecture-redesign.md` pass.
- No perf regression vs P0.5 baseline.

**Bead structure:** 1 epic + 5 child beads (11.1 spec/ADR, 11.2 service+tests, 11.3 Workspace migration, 11.4 Part/InstancedParts migration, 11.5 cleanup).

### Phase 3 — Interaction Session Controller

Goal: one owner of pointer capture and gesture lifecycle. Eliminates the 5-source gesture fragmentation.

**Deliverable:** `src/renderer/src/interaction/SessionController.ts` + `useCanvasPointerSession` hook.

```ts
type Phase = "idle" | "armed" | "dragging" | "committing" | "cancelled";

interface PointerState {
  phase: Phase;
  pointerId: number;
  button: 0 | 2;
  downAt: { x: number; y: number; t: number; hit: HitTarget | null };
  modifiers: { shift: boolean; ctrl: boolean; meta: boolean; alt: boolean };
  currentPoint: { x: number; y: number };
}

function useCanvasPointerSession(handlers: {
  onClick(hit, modifiers, event): void;
  onDoubleClick(hit, modifiers, event): void;
  onContextMenu(hit, position, event): void;
  onDragStart(hit, modifiers, event): { tool: ToolKind; targets: NodeId[] };
  onDragUpdate(delta, position, event): void;
  onDragCommit(finalDelta, finalPosition, event): void;
  onDragCancel(event): void;
}): void;
```

**Removes / consolidates:**

- Native `mousedown`/`mouseup`/`dblclick`/`contextmenu` listeners in Workspace.tsx.
- Per-mesh `onPointerDown`/`onClick`/`onDoubleClick` in Part.tsx, InstancedParts.tsx (for selection — drag init delegates).
- 8+ cross-handler refs (`pointerDownPos`, `leftClickDownPos`, `rightClickDownPos`, `lastSelectionApplyAtRef`, `previousSelectionKeyRef`, `lastPartDrillAtRef`, `globalRightClickTarget`, `markPartPointerInteraction`, `justFinishedDragging`, `selectionChangedDuringClick`).

Per-mesh `onPointerOver`/`onPointerOut` (hover) stay — R3F's strength.

**Migration:**

1. Build SessionController + useCanvasPointerSession + tests.
2. Feature flag (`window.__usePointerSession = true`).
3. Migrate gestures in batches: (move + rotate), (resize + click), (contextmenu + dblclick).
4. After all migrated, remove flag and delete old paths.

**Tests:**

- Engine: state machine transitions.
- Session integration: click vs drag, double-click vs single, modifiers mid-gesture, pointer leave/blur during drag.
- UI smoke: all happy-path gestures.

**Completion criteria:**

- `useCanvasPointerSession` is the only place canvas pointer listeners are added.
- All 8 cross-handler refs eliminated.
- 5 event sources collapsed to 1.
- Bug-class regression tests still pass.

**Bead structure:** 1 epic + 7 child beads.

## Tier 1 — System polish (~3–4 weeks compressed)

### Phase 4 — Tool Solvers (formalize)

Goal: each tool implements one shared interface.

```ts
interface ToolSolver<T extends ToolKind> {
  begin(input: SolverBeginInput): SolverState<T>;
  update(input: SolverUpdateInput<T>): CandidateTransformState<T>;
  commit(input: SolverCommitInput<T>): CommitInstruction[];
  cancel(state: SolverState<T>): void;
}
```

**Key invariant:** preview path and commit path call the same solver chain. Addresses blueprint invariant #2.

Tools: `moveTool`, `rotateTool`, `resizeTool`. Existing `solvePartMoveSnapPreview` / `solveResizePreview` become methods.

**Bead structure:** 4 beads (interface, move, rotate, resize). Collapse `usePartDrag` + `useGroupDrag` here.

### Phase 10 — Overlay Engine (complete)

All overlays read from a single `OverlayModel` derived from session state.

```ts
interface OverlayModel {
  snap: SnapOverlayData[];
  dimensions: DimensionOverlayData[];
  angles: AngleOverlayData[];
  references: ReferenceRulerOverlayData[];
  hints: HintOverlayData[];
}

function computeOverlayModel(
  session,
  snapResolution,
  constraints,
): OverlayModel;
```

Components are dumb consumers. No store reads inside overlay components.

**Bead structure:** 4 beads (model, snap migration, multi-selection-dimensions migration, reference-rulers tidy).

### Phase 8 — Constraint Engine

Ordered, composable pipeline. Same chain for preview and commit.

```ts
const movePipeline: Constraint[] = [
  toolSemanticBoundsConstraint,
  groundConstraint,
  snapConstraint,
  stockConstraint,
  collisionConstraint,
];

function applyConstraints(
  input,
  pipeline,
): { adjustedTransform; blockers; warnings };
```

**Bead structure:** 3 beads (interface, wrap existing checks, replace inline checks).

### Phase 12 — Store Ownership (complete)

- Move reference state fully out of `snapStore` into `interactionStore.referenceState`.
- Document store dependency graph in ADR.
- `sceneStore` deferred to §1.

**Bead structure:** 2 beads.

## Tier 1 ◇ Custom-cuts merge gate

After Tier 1 completes, `develop` is in a state where custom cuts can rebase onto it without re-fighting the bugs this branch addressed.

## Tier 2 — Data model (~4–5 weeks compressed)

### Phase 1 — Workspace Scene Graph

Derived adapter approach, not new persisted shape.

```ts
type NodeId = string;
interface PartNode {
  kind: "part";
  id: NodeId;
  parentId: NodeId | null;
  childIds: NodeId[];
  partId: string;
  localTransform: Transform3D;
}
interface GroupNode {
  kind: "group";
  id: NodeId;
  parentId: NodeId | null;
  childIds: NodeId[];
  name: string;
}
```

`sceneStore` is computed from existing `projectStore.parts / groups / groupMembers` via memoized selector. World transforms derived through one resolver. Selection / snap / collision reference node IDs.

**Persisted change deferred** — derived only for now. Migration when needed.

**Bead structure:** 4 beads (types, derivation, world-transform resolver, replace ad-hoc traversals).

### Phase 5 — Geometry Query Layer

```ts
interface PartGeometryBundle {
  partId: string;
  versionKey: string;
  renderMesh: BufferGeometry;
  hitProxy: HitProxy;
  snapGraph: SnapAnchorGraph;
  measureGraph: MeasureGraph;
  collisionProxy: CollisionProxy;
  bounds: { localAabb: Aabb; localObb: Obb };
}

class GeometryCache {
  get(partId: string, version: string): PartGeometryBundle;
  invalidate(partId: string): void;
}
```

For box parts (current state): all views derive from the box.

**Bead structure:** 5 beads (types+cache, derivation, snap-anchor graph migration, hit-proxy migration, measure-graph migration).

### Phase 6 — Part Shape Model

Merges with custom-cuts. The custom-cuts branch already has end-cut / compound-cut / bevel logic; §6 is the canonical data model those operate against.

```ts
interface PartDefinition {
  blank: { length: number; width: number; thickness: number };
  fabricationOperations: FabricationOperation[];
  material: MaterialAssignment;
  metadata: PartMetadata;
}

type FabricationOperation =
  | { type: 'end_cut'; cut: 'mitre' | 'bevel' | 'compound'; ... }
  | { type: 'rect_cut'; ... }
  | { type: 'edge_profile'; ... }
  | { type: 'drill_pattern'; ... };
```

**Migration: dual-format.**

- Persist both legacy `{ length, width, thickness }` and new `definition: PartDefinition`.
- Read prefers definition; falls back to legacy.
- Write writes both during transition.
- Format-version ratchet eventually drops legacy.

**Bead structure:** ~10 beads. Done collaboratively with custom-cuts branch maintainer.

## Tier 3 — Built on Tier 2 (~3 weeks compressed)

### Phase 7 — Snap Engine

```ts
interface SnapResolution {
  winners: SnapConstraint[];
  candidates: SnapConstraint[];
  latchState: SnapLatchState;
  adjustedTransform: CandidateTransformState;
  overlayPrimitives: OverlayPrimitive[];
}

function resolveSnaps(candidate, context): SnapResolution;
```

Anchor graph from §5. Deterministic arbitration. Hysteresis to prevent flicker.

**Bead structure:** 4 beads.

### Phase 9 — Collision and Fit Engine

Per-pair `CollisionPolicy`: `forbid_penetration | allow_touching | allow_penetration | allow_feature_fit`. Existing binary `ignoreOverlap` removed.

**Bead structure:** 3 beads.

## Cross-cutting workstreams

### CC1 — Test infrastructure

- CDP harness for Playwright on Electron 41 (current `happy-path.spec.ts` doesn't launch).
- Per-PR coverage delta gate.
- Per-PR perf delta gate vs P0.5 baseline.

### CC2 — Documentation

- ADR per significant decision.
- Update redesign + blueprint docs after each tier — mark what shipped, cross-link ADRs.
- Mermaid "current state" diagram in blueprint kept current.

### CC3 — Migration safety

- Project-file format version ratchet on every breaking change.
- Load path preserved for previous N versions.
- `tests/file-format-compatibility/` with saved file per version.

### CC4 — Release cadence

- Each TIER ships to develop as squash-merged PRs.
- Cut release at end of each tier.
- Never sit on develop for months between tiers.

## Bug-class regression test policy

Every bug fixed during phase work becomes a permanent engine test in CI. PR cannot merge without the test. This is non-negotiable — the recurring-regression pain the audit identified is solved at the test layer in addition to the architecture layer.

Specifically required up front:

- 4 regression tests from `interaction-architecture-redesign.md` § "Bug Classes Resolved While Writing This Audit".
- Each subsequent fix in P0 onward gets its own.

## Process

- One bead per child item. Each child bead is a PR.
- Target ≤500 lines diff per PR. Split if larger.
- `/ultrareview` on every phase epic before merge.
- Squash-merge to `develop` per AGENTS.md.
- Conventional commit prefixes (`feat`/`fix`/`perf`/`chore`/`docs`/`test`/`refactor`).
- No two phases in parallel.
- Tier-end release: develop → main merge commit, version bump, release notes link to ADRs.
- Spec doc / ADR per phase BEFORE code.

## Risk register

| Risk                                  | Probability    | Impact     | Mitigation                                                               |
| ------------------------------------- | -------------- | ---------- | ------------------------------------------------------------------------ |
| §3 migration breaks existing flows    | High           | High       | Feature flag, batched gesture migration, full e2e regression per batch   |
| §6 file-format migration loses data   | Medium         | Critical   | Dual-format persistence, never delete legacy fields, fixture per version |
| §11 R3F divergence                    | Medium         | Medium     | Keep R3F hover events; only replace click/drag-init                      |
| Bug-class regression during migration | Medium         | High       | Bug-class regression tests are merge gates                               |
| Performance regression                | Medium         | Medium     | P0.5 baseline + per-PR gate                                              |
| Custom-cuts schedule slips            | Possible       | Affects §6 | Tier 0 + Tier 1 + §1 + §5 ship independently                             |
| Develop sits unreleased               | If not careful | Medium     | Release at end of each tier                                              |

## Total scope estimate (compressed)

| Tier                      | Compressed          |
| ------------------------- | ------------------- |
| P0                        | 2–3 days            |
| Tier 0 (§11, §3)          | 3–4 weeks           |
| Tier 1 (§4, §10, §8, §12) | 3–4 weeks           |
| Tier 2 (§1, §5, §6)       | 4–6 weeks           |
| Tier 3 (§7, §9)           | 2–3 weeks           |
| **Total**                 | **~3.5–4.5 months** |

## ADR backlog (to be written as phases land)

- ADR-001: Selection is not undoable.
- ADR-002: Hit-testing service architecture (Phase §11).
- ADR-003: SessionController state machine (Phase §3).
- ADR-004: Tool solver interface contract (Phase §4).
- ADR-005: Overlay model derivation policy (Phase §10).
- ADR-006: Constraint pipeline ordering (Phase §8).
- ADR-007: Store ownership graph (Phase §12).
- ADR-008: Scene graph derivation vs persistence (Phase §1).
- ADR-009: Geometry bundle cache invalidation policy (Phase §5).
- ADR-010: Part definition dual-format migration (Phase §6).
- ADR-011: Snap anchor graph + arbitration (Phase §7).
- ADR-012: Collision policy state model (Phase §9).

## Definition of done — overall

The interaction architecture is "done" when:

1. All 8 blueprint phases shipped.
2. All 7 Non-Negotiable Invariants from `interaction-system-blueprint.md` enforced in code + tests.
3. Bug-class regression test suite present and required for merge.
4. ADRs 001–012 written and accepted.
5. Custom-cuts branch merged to `develop` on top of §6.
6. No recurring regression pattern in the workspace for two consecutive monthly releases.

That's the bar.
