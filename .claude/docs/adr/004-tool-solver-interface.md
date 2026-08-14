# ADR-004: Tools implement one shared solver interface

Status: Accepted
Date: 2026-05-18
Phase: §4 Tool Solvers

## Context

The workspace currently has three independent transform engines for move, resize, and rotate:

- `usePartDrag` (903 LOC) — single-part move + multi-part move (when the dragged part belongs to a multi-selection). Calls `solvePartMoveSnapPreview` for preview, applies the last preview position at commit.
- `useGroupDrag` (515 LOC) — drag entire selected groups. Calls `solveGroupMoveSnapPreview` for preview.
- `usePartResize` (354 LOC) — resize a single part by dragging a handle. Calls `solveResizePreview`.
- RotationHandle (~650 LOC) — rotation, with viewport-projection math interleaved with rotation math.

Each engine reimplements the same begin/update/commit/cancel lifecycle in slightly different ways. Each has its own commit path that may or may not call the solver one last time at release. Each handles snap state, latched-face arbitration, undo bookkeeping, and pointer-event wiring inline.

Phase §3 (Session Controller) routes drag actions via `useCanvasPointerSession`. But the controller can only emit `dragstart` / `dragmove` / `dragcommit` — it has no contract for what the _receiver_ of those actions does. Today each component implements its own contract. The session controller can't compose with anything.

Phase §10 (Overlay Engine) wants to derive overlays from "the active session." But every session shape is different. The overlay model has to know about every tool's specific state.

Phase §6 (Part Shape Model) and the custom-cuts merge will add new tools (e.g., `drawCut`, `setEndCut`, `applyBevel`). Without a shared tool interface, every new tool reinvents the lifecycle.

Phase §8 (Constraint Engine) wants ordered constraints applied uniformly to every transform. Today each engine has its own constraint pipeline (`computeSafeDelta` in usePartDrag, ground constraint inline, stock constraint inline, snap as part of the solver). Without a tool interface, the constraint pipeline has nowhere to plug in.

## Decision

**Every transform tool implements one shared `ToolSolver<Input, State, Preview, Commit>` interface.** Hooks (and future session-controller routes) become thin shells that wire pointer events to a tool. The tool owns the math.

```ts
interface ToolSolver<Input, State, Preview, Commit> {
  /**
   * Begin a new tool session. Returns the initial state.
   * Called when a drag starts (e.g. via session controller's `dragstart`).
   */
  begin(input: Input): State;

  /**
   * Apply an update to the in-flight session and return a preview of the new
   * transform. State is threaded through so the tool can hold session-scoped
   * state like latched snap arbitration.
   */
  update(input: Input, state: State): { preview: Preview; state: State };

  /**
   * Convert the final preview into commit instructions. The host applies the
   * instructions to the project store via the usual store actions (preserving
   * undo/redo, etc.).
   *
   * Commit must produce the same transform as the final preview — preview and
   * commit are not allowed to diverge.
   */
  commit(state: State, preview: Preview): CommitInstruction[];

  /**
   * Discard the in-flight session. No state mutation, no commit, but the host
   * should clear any preview overlay.
   */
  cancel(state: State): void;
}

type CommitInstruction =
  | { kind: "updatePartPosition"; partId: string; position: Vec3 }
  | { kind: "updatePartRotation"; partId: string; rotation: Rotation3D }
  | {
      kind: "updatePartDimensions";
      partId: string;
      dimensions: PartDimensions;
      position: Vec3;
    }
  | {
      kind: "updateGroupPositions";
      updates: Array<{ partId: string; position: Vec3 }>;
    };
```

### Phase §4 scope (this commit)

- **Define the interface** in `src/renderer/src/interaction/tools/toolSolver.ts`.
- **Wrap the three existing pure solvers** (`solvePartMoveSnapPreview`, `solveGroupMoveSnapPreview`, `solveResizePreview`) in `ToolSolver` implementations: `moveTool`, `groupMoveTool`, `resizeTool`. The wrappers preserve current behavior exactly — same math, same snap, same constraints. They expose the shared lifecycle methods on top.
- **Tests** verify that each wrapper conforms to the interface contract (begin→update→commit chain produces consistent transforms; cancel is a no-op).
- **Hook migration is underway.** `usePartDrag`, `useGroupDrag`, and `usePartResize` now delegate their live preview solver work to `moveTool`, `groupMoveTool`, and `resizeTool`. Resize commit, group-drag release commit, and single-part drag release commit also flow through `ToolSolver.commit` plus `applyCommitInstructions`. The remaining work is deeper pointer-shell collapse, not solver ownership.

### Phase §4 follow-up (separate commit)

- **Finish collapsing hooks** around the tool calls. `usePartDrag`, `useGroupDrag`, and `usePartResize` still own pointer projection, selection orchestration, cleanup refs, and some batch/store semantics. The follow-up target is to shrink those hooks into thinner pointer-event shells now that solver preview and commit paths are tool-owned.
- **Rotation tool is extracted.** Part-handle rotation, keyboard single-part rotation, and store rotation paths use pure `rotationTool` math. Multi-part keyboard/store rotations still batch position+rotation writes directly because those paths preserve collective-center and single-history-entry semantics.
- **Wire session controller** to dispatch `dragstart` to the right tool based on the `HitTarget` kind:
  - `part-body` (with selection containing the part) → `moveTool` or `groupMoveTool`
  - `resize-handle` → `resizeTool`
  - `rotation-handle` → `rotateTool`

## Alternatives considered

- **Skip the interface; refactor each hook in place.** Rejected. The point of the interface is to make tool development a parameterized exercise (custom-cuts can implement `ToolSolver` without re-learning every plumbing detail). Refactoring each hook in place gives a cleaner hook but no compositional benefit.
- **Make `ToolSolver` a class hierarchy with a base class.** Rejected. Tools have varied shapes (their `Input` and `State` types differ); a base class forces sharing structure that doesn't actually share. Interface + structural typing is enough.
- **Use a single discriminated `ToolAction` enum that every tool consumes.** Rejected. Tools differ in what their `update` input looks like (move takes a delta, resize takes a handle + dimensions). Generic over the input/state types is cleaner than a one-size-fits-all action.
- **Include constraint pipeline plumbing inside `ToolSolver`.** Considered. Decided to defer to §8 — the interface should not commit to a constraint model before the constraint engine is designed. Tools currently apply constraints inline (where they always have); §8 will lift them into a pipeline that `ToolSolver.update` runs as a post-processing step.
- **Use Result/Option types for commit/cancel.** Rejected as premature. Plain return + early-return at the call site is fine for now.

## Consequences

- **Easier:** Adding a new tool means implementing one interface, then wiring the hook. No invention of lifecycle conventions.
- **Easier:** Session controller (§3) can dispatch `dragstart` to a tool selector. The selector returns a `ToolSolver`; the controller calls `update` on `dragmove` and `commit` on `dragcommit`. Drag-routing becomes a 30-LOC switch.
- **Easier:** Overlay engine (§10) can read tool state via the typed `Preview` slot. Today each overlay component reads from `useInteractionStore.activeSession` and case-splits on `kind` — the typing already exists; this ADR formalizes how new tools extend it.
- **Easier:** Constraint engine (§8) plugs in at one point: `ToolSolver.update` runs constraints after computing the raw preview.
- **Easier:** Custom-cuts adds tools, not lifecycle reinventions.
- **Harder:** Tools must keep their math pure. Anything that needs React state or three.js viewport projection lives in the hook shell, not in the tool. This is intentional — separating math from plumbing is the architectural value.
- **Migration cost (this commit):** ~250 LOC of new code (3 wrappers + interface + tests). No deletion yet — hooks unchanged.
- **Migration cost (follow-up):** ~1500 LOC of hook code shrinks to ~500 LOC across the three hooks. Plus rotation extraction (~300 LOC pure rotation math out of `RotationHandle`).

## Open questions

- **Multi-tool composition.** What happens when a user holds Cmd to constrain a move to an axis while dragging? That's a modifier-driven _variant_ of the move tool, not a different tool. Phase §4 doesn't formalize this — modifiers are passed through `Input` and tools interpret them. If a future tool needs to _compose_ with another (e.g. snap-while-rotating), revisit in a superseding ADR.
- **Per-tool undo policy.** Today, every commit produces a single `temporal` history slot via `updatePart` / `moveSelectedParts` etc. Tools that batch multiple commit instructions need batched-history semantics. Defer to §6 / §8 when custom-cuts introduces multi-op edits (a single "set end cut" might write multiple property fields).
- **Live-edit feedback during numeric ruler edits.** Reference rulers can be edited mid-drag. Today the ruler-edit path bypasses the solver and writes directly. Decision: ruler edits should go through `ToolSolver.update` with an `Input` variant indicating "typed value, not pointer delta." Implement when the move/resize hooks are refactored.

## References

- Blueprint: §4 Tool Solvers
- ADR-003: SessionController state machine (this ADR closes the loop from `dragstart` to tool dispatch)
- Audit: [interaction-architecture-redesign.md](../interaction-architecture-redesign.md) — Finding 3 "Single-part drag and group drag are two different engines"
- Execution plan: [interaction-architecture-execution-plan.md](../interaction-architecture-execution-plan.md) §4 Phase 4
- Existing solvers: `interactionMovePreview.ts`, `interactionResizePreview.ts`
- Existing hooks (partially refactored in §4b): `usePartDrag.ts`, `useGroupDrag.ts`, `usePartResize.ts`, `RotationHandle.tsx`
- Related ADR: ADR-006 (Constraint pipeline ordering) — will plug into `ToolSolver.update`
