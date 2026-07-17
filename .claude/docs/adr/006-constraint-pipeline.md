# ADR-006: Constraints are an ordered, composable pipeline

Status: Accepted (Phase §8 foundation + initial geometry-backed constraints — see "Scope" below)
Date: 2026-05-18
Phase: §8 Constraint Engine

## Context

Every transform tool today applies the same handful of constraints inline, in slightly different orders:

- **`usePartDrag`** applies ground clamp (`if (newY < worldHalfHeight) newY = worldHalfHeight`), snap (via `solvePartMoveSnapPreview`), then collision (`computeSafeDelta`), then stock dimension caps (inline check via `validateStockConstraints`).
- **`useGroupDrag`** applies ground clamp differently (per-part inside the group), snap (via `solveGroupMoveSnapPreview`), and collision per moving part. No stock constraint (groups don't change stock).
- **`usePartResize`** applies stock dimension caps inline inside the resize solver, then a ground clamp on the resulting position. No collision check during resize.
- **Keyboard rotate** applies a ground clamp on the multi-part output (`useKeyboardShortcuts.ts`) but no snap or collision.
- **PropertiesPanel inline edits** apply stock caps via the resize solver, no ground clamp explicit, no collision.

This drift is the root of several real bugs:

- A part dragged with snap engaged can still end up below ground if the snap-adjusted Y is negative.
- A rotation that produces a colliding configuration is accepted silently because the rotate handler has no collision check.
- Stock dimension caps are inconsistent — some paths re-cap after snap, some don't, some only cap at commit.

The blueprint calls for one **constraint pipeline**: an ordered list of `Constraint`s that runs in the same order from every tool. Snap stays where it is (it's its own engine, with `bundle.snapGraph` from §5 as the input), but ground / stock / collision / future "no-fly-zone" constraints become first-class pipeline stages.

Phase §4 (Tool Solvers) parked this — the `ToolSolver.update` interface produces a `Preview` that today encodes the post-solver position. §8 lifts the inline constraints out of each solver and into a shared `applyConstraints(input, pipeline)` step that runs **after** the tool's raw transform and **before** preview is returned. Same chain for preview, same chain for commit.

## Decision

**Constraints implement one shared interface and run in a deterministic order from every tool.** Tools compute a raw candidate transform; the pipeline applies constraints; the constrained transform is the preview. Commit re-runs the same chain on the final input (preserving the §4 invariant that preview === commit math). Constraints that need geometric information read through the shared `GeometryCache` from ADR-009 rather than recomputing box assumptions locally.

```ts
interface ConstraintContext {
  /** The transform the tool wants to apply, before constraints. */
  candidate: CandidateTransform;
  /** All affected parts at their pre-gesture positions. */
  startingParts: ReadonlyArray<Part>;
  /** Project state visible to constraints: other parts, stocks, group members, settings. */
  project: ProjectStateSlice;
  /** Geometry bundle cache (§5) for constraints that need part bounds. */
  geometryCache: GeometryCache;
}

interface ConstraintResult {
  /** The constrained transform. Returns `candidate` unchanged when the constraint doesn't fire. */
  adjusted: CandidateTransform;
  /** Hard blockers: the gesture should still preview, but the constraint vetoed this candidate. */
  blockers: ConstraintBlocker[];
  /** Soft warnings: the gesture proceeds, but the host may surface a toast. */
  warnings: ConstraintWarning[];
}

interface Constraint {
  readonly name: string;
  apply(ctx: ConstraintContext): ConstraintResult;
}

function applyConstraints(
  ctx: ConstraintContext,
  pipeline: ReadonlyArray<Constraint>,
): {
  adjusted: CandidateTransform;
  blockers: ConstraintBlocker[];
  warnings: ConstraintWarning[];
};
```

The pipeline is **per-tool** — move uses one ordering, resize uses another, rotate uses a third. Each tool exports its pipeline; consumers (Phase §4b hooks, future tools) import and run it.

### Standard pipelines (target, locked in §8b)

```ts
const movePipeline: Constraint[] = [
  toolSemanticBoundsConstraint, // tool's own bounds, e.g. group can't shrink past min size
  snapConstraint, // §5b will wrap solvePartMoveSnapPreview here
  groundConstraint, // y >= worldHalfHeight per part
  stockDimensionConstraint, // no-op for move; here for symmetry / future
  collisionConstraint, // computeSafeDelta lifted out of usePartDrag
];

const resizePipeline: Constraint[] = [
  toolSemanticBoundsConstraint,
  stockDimensionConstraint, // dimensions clamped to assigned stock
  snapConstraint, // resize snaps to reference faces / dimensions
  groundConstraint,
  collisionConstraint, // currently absent in resize — §8b decision
];

const rotatePipeline: Constraint[] = [
  toolSemanticBoundsConstraint,
  groundConstraint, // post-rotation parts must still sit above ground
  collisionConstraint, // currently absent in keyboard rotate — §8b decision
];
```

Snap is intentionally a constraint here (rather than living inside the tool solver). This makes the pipeline the single source of truth for "what adjustments happen between candidate and committed." Tool solvers compute raw inputs; the pipeline does ALL the adjustments. §4 (Tool Solvers) ran snap inside the solver wrapper for §4a foundation; §8b lifts it out.

### Scope: §8a (this commit) vs §8b/§8c

**§8a — interface + the two simplest constraints + tests (this commit):**

- `interaction/constraints/types.ts` with `Constraint`, `ConstraintContext`, `ConstraintResult`, `ConstraintBlocker`, `ConstraintWarning`, `CandidateTransform`.
- `interaction/constraints/pipeline.ts` with `applyConstraints`.
- `interaction/constraints/groundConstraint.ts` — clamps each affected part's Y to its world half-height.
- `interaction/constraints/stockDimensionConstraint.ts` — clamps each affected part's resize dimensions to the assigned stock's caps.
- Tests cover: each constraint in isolation, pipeline composition order, blocker + warning propagation, multi-part adjustment.
- No consumer migration. The pipeline is foundation.

**§8b — wire the pipeline into the existing tool solvers (follow-up):**

- `moveTool`, `groupMoveTool`, `resizeTool` accept their pipeline in `begin` and run it in `update`.
- Snap is lifted from `solvePartMoveSnapPreview` into a `snapConstraint` that wraps the same solver function. Behavior unchanged; structure consolidated.
- Collision (`computeSafeDelta`) becomes `collisionConstraint`. Behavior unchanged.

**§8c — extend to rotate + keyboard paths (follow-up):**

- Keyboard rotate handler runs `rotatePipeline` instead of its inline ground clamp.
- `RotationHandle` does the same.
- PropertiesPanel inline edits run their own minimal pipeline.

The §8a → §8b → §8c sequencing matches §10 and §1: foundation first, then incremental consumer migration.

## Alternatives considered

- **One global ordered list of constraints; tools opt in via tags.** Rejected. The orderings differ between tools — move's ground clamp runs AFTER snap (so a snap-engaged but invalid position still gets ground-clamped), but resize's runs BEFORE snap. A per-tool pipeline encodes intent; a global list with skip-tags hides it.
- **Constraints are pure functions, not objects.** Considered. Rejected because each constraint wants a `name` for debug logging + a stable identity for future composition tooling. Plain functions are also fine technically; the `Constraint` interface is just `{ name, apply }`.
- **`apply` returns `null` to mean "no change."** Rejected. Returning the constrained transform unchanged (with empty blockers/warnings) is clearer and lets pipeline runners skip the identity check.
- **Run constraints inside `ToolSolver.update`.** Considered. Decided to keep them separate — tools compute raw transforms; the pipeline is run by the host (hook) AFTER `update`. This separation makes constraint testing easier (no tool needed) and lets the same pipeline run from non-tool paths like keyboard handlers.
- **Defer §8 until §6 (custom-cuts) so the constraint model can be shaped by real cut semantics.** Considered. Rejected because §4b (hook collapse) needs the pipeline to land first — without it, the hooks still own per-tool constraint glue and the collapse is not actually a collapse.

## Consequences

- **Easier:** Adding a new constraint (e.g. "no-fly zone around a load-bearing wall") means writing one file + adding one line to the pipeline. No tool code changes.
- **Easier:** A constraint regression has one fix site. The "snap-engaged position below ground" bug becomes a unit test against the pipeline, not a manual end-to-end repro.
- **Easier:** §4b's hook collapse becomes a real collapse. `usePartDrag` becomes pointer-event wiring + tool call + pipeline call + commit. No inline ground / stock / collision math.
- **Easier:** Custom-cuts (§6) gets the constraint engine for free. Cut-related operations plug into the same chain.
- **Harder:** Adding a new tool means picking the right pipeline (or composing one). This is the intended constraint.
- **Migration cost (§8a):** ~250 LOC interface + 2 simple constraints + tests. Zero consumer changes.
- **Migration cost (§8b):** ~300 LOC across the three tools. Hooks unchanged at this step.
- **Migration cost (§8c):** ~150 LOC across keyboard / rotate / properties paths.

## Open questions

- **Blocker vs warning semantics.** Today, "the part can't go here because it would collide" is a hard veto in `usePartDrag` (drag is allowed but commit reverts). The pipeline expresses this as a `blocker` — but a `blocker` doesn't actually stop the gesture; it surfaces in the result for the host to decide. §8b will pin down the exact semantics (does a blocker reset the preview to the last non-blocked state? does it just gate commit? does it produce a UI hint?). Defer to §8b.
- **Cross-part constraints.** Collision is naturally cross-part — moving part A affects part B's "would-overlap" status. Today the constraint sees `affectedPartIds` (the moving set); it reads other parts from `ctx.project.parts`. If a future constraint needs "all parts in the same group as the moving set," it can pull from `ctx.project.groupMembers` directly. Document the convention.
- **Constraints that depend on other constraints' output.** Today's pipeline is linear: each constraint takes the previous one's output as input. If a future constraint needs to see the original candidate (e.g. "did snap fire? then skip ground clamp"), we'd need a richer context. Defer until that case arises.

## References

- Blueprint: §8 Constraint Engine
- ADR-004 (Tool Solvers) — pipeline runs after `ToolSolver.update`'s raw output
- ADR-009 (Geometry Bundle) — constraints read part bounds from `bundle.collisionProxy.localAabb`
- Audit: [interaction-architecture-redesign.md](../interaction-architecture-redesign.md) — Finding 4 "Constraint order is inconsistent between preview and commit"
- Existing inline constraint logic to migrate in §8b:
  - Ground clamp: `if (newY < worldHalfHeight)` in `usePartDrag.ts`, `useGroupDrag.ts`, `usePartResize.ts`, `useKeyboardShortcuts.ts`
  - Stock dimension caps: `solveResizePreview.resolveDimensionCaps`, `validateStockConstraints` in `propertiesLogic.ts`
  - Collision: `computeSafeDelta` in `usePartDrag.ts` and `useGroupDrag.ts`
- Execution plan: [interaction-architecture-execution-plan.md](../interaction-architecture-execution-plan.md) §8 Phase 8
