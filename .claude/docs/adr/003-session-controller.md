# ADR-003: A single pointer-session controller owns the canvas event surface

Status: Accepted
Date: 2026-05-18
Phase: §3 Interaction Session Controller

## Context

The workspace currently has five overlapping pointer-event sources on the canvas:

1. **Native `mousedown` listener** (canvas-attached, in `Workspace.tsx`) — sets `leftClickDownPos` / `rightClickDownPos`, eagerly applies non-additive selection on `button === 0`, sets the right-click target on `button === 2`.
2. **Native `mouseup` listener** (window-attached) — re-derives click vs drag via distance/time math, calls `selectFromPartHit` for simple left-clicks, opens the context menu via `getRightClickTarget`.
3. **Native `contextmenu` listener** (window-attached, gated by canvas rect) — duplicates the contextmenu-opening logic and adds a fallback raycast for clicks that landed on HTML overlay portals.
4. **Native `dblclick` listener** (canvas-attached) — drills into the group of the clicked part.
5. **R3F per-mesh `onClick` / `onPointerDown` / `onDoubleClick` handlers** on `Part`, `InstancedParts`, ground, sky — apply selection for additive clicks, set drag intent, set right-click target.

These five sources coordinate through 8+ refs and module-level globals:

- `pointerDownPos`, `leftClickDownPos`, `rightClickDownPos`
- `lastSelectionApplyAtRef`, `previousSelectionKeyRef`, `lastPartDrillAtRef`
- `globalRightClickTarget` (in `workspaceUtils`)
- `markPartPointerInteraction`, `justFinishedDragging` (in `workspaceUtils`)
- `selectionChangedDuringClick` snapshot (in `mouseup`)

The audit identified this fragmentation as the root cause of the additive-selection double-toggle bug (R3F handler toggles, then native `mouseup` calls `selectFromPartHit(additive=true)` which toggles a second time — netting zero) and as a contributing factor to the contextmenu reliability issue and the multi-part drag preview bug.

Phase §11 already centralized hit-testing. The next step is to centralize pointer event interpretation. Without it:

- **Phase §4 (Tool Solvers)** can't cleanly route a gesture to the right tool — there are five places where "is this a click or a drag" gets decided.
- **Phase §10 (Overlay Engine)** can't safely consume gestures because overlay-portal clicks already bypass the canvas listeners.
- **Custom-cuts** will add new tool entry points (e.g. "draw a cut"); without a controller they'll each invent their own click/drag math.

## Decision

**A single pointer-session controller owns the workspace canvas event surface.** It is a pure state machine plus a React hook.

### State machine (`src/renderer/src/interaction/sessionController.ts`)

Five phases, deterministic transitions:

```
        ┌───────┐  pointerdown(in-canvas)
        │ idle  │──────────────────────────────► armed
        └───────┘
            ▲                                      │
            │ commit / cancel                      │ pointermove > threshold
            │                                      ▼
        cancelled  ◄── cancel ──   committing ◄─ dragging
                                       ▲           │
                                       │           │ pointerup
                                       └───────────┘
```

- **`idle`** — no pending gesture.
- **`armed`** — pointer is down but the controller hasn't decided yet whether this is a click or a drag. Mode armed produces no semantic events; the host doesn't know about anything yet.
- **`dragging`** — pointer movement exceeded the click/drag threshold; the controller emits `onDragStart` then `onDragUpdate` per move and `onDragCommit` on release.
- **`committing`** — a transient state between `pointerup` and re-entry to `idle`, used so click-vs-drag classification can run without races.
- **`cancelled`** — pointer left the canvas, window blurred, or `Escape` pressed during armed/dragging. Emits `onDragCancel` if a drag was in progress.

A second piece of state — independent of the phase — tracks recent activity for double-click detection (last-up time + position) and modifier-key changes mid-gesture.

The controller has no side effects, no React, no Three.js. It exposes:

```ts
interface SessionController {
  state(): PointerState;
  feed(event: SessionEvent): SessionAction[];
}

type SessionEvent =
  | {
      kind: "pointerdown";
      pointerId;
      button;
      clientX;
      clientY;
      modifiers;
      timestamp;
    }
  | { kind: "pointermove"; pointerId; clientX; clientY; modifiers; timestamp }
  | {
      kind: "pointerup";
      pointerId;
      button;
      clientX;
      clientY;
      modifiers;
      timestamp;
    }
  | { kind: "pointercancel"; pointerId; timestamp }
  | { kind: "blur"; timestamp }
  | { kind: "escape"; timestamp };

type SessionAction =
  | {
      kind: "click";
      hit: HitTarget | null;
      button: 0 | 2;
      modifiers;
      clientX;
      clientY;
    }
  | { kind: "doubleclick"; hit: HitTarget | null; modifiers; clientX; clientY }
  | { kind: "contextmenu"; hit: HitTarget | null; clientX; clientY }
  | { kind: "dragstart"; hit: HitTarget | null; modifiers; clientX; clientY }
  | { kind: "dragmove"; deltaX; deltaY; clientX; clientY; modifiers }
  | { kind: "dragcommit"; deltaX; deltaY; clientX; clientY; modifiers }
  | { kind: "dragcancel" };
```

Hit-test resolution happens inside `feed` for `pointerdown` and `pointerup` only — `pointermove` events do not raycast, they just update the position.

### React hook (`src/renderer/src/interaction/useCanvasPointerSession.ts`)

```ts
function useCanvasPointerSession(handlers: {
  onClick(action): void;
  onDoubleClick(action): void;
  onContextMenu(action): void;
  onDragStart(action): { capture: boolean };
  onDragMove(action): void;
  onDragCommit(action): void;
  onDragCancel(): void;
}): void;
```

The hook:

- Attaches one `pointerdown` listener to the canvas (capture phase so it sees events before drei portals).
- Attaches `pointermove` / `pointerup` / `pointercancel` to the window — gestures continue tracking when the pointer leaves the canvas.
- Attaches `blur` to the window and `keydown(Escape)` for cancellation.
- Attaches `contextmenu` to the window (gated by canvas rect) so HTML-portal right-clicks still route through the controller.
- Calls `resolveHitTarget` (Phase §11) before dispatching `pointerdown` and `pointerup` actions.
- Does **not** own active drags. When the host returns `{ capture: true }` from `onDragStart`, the host has acknowledged ownership of the gesture; the controller continues to emit `dragmove` / `dragcommit` events, but the host's per-tool drag handler is responsible for the actual transform work.

### What it replaces

- All four native listeners in `Workspace.tsx` (`mousedown`, `mouseup`, `dblclick`, `contextmenu`, plus the `blur` and capture-phase `pointerdown` reset).
- The 8+ cross-handler refs collapse into the controller's internal state.
- `getRightClickTarget` / `setRightClickTarget` / `clearRightClickTarget` in `workspaceUtils` are replaced by the hit-target on the controller's `contextmenu` action.
- `markPartPointerInteraction` / `justFinishedDragging` likewise — the controller knows what state it's in.

### What it does not replace (in this phase)

- **R3F per-mesh `onPointerOver` / `onPointerOut`** — hover is R3F's strength and doesn't need cross-mesh coordination.
- **`usePartDrag` / `useGroupDrag` / `usePartResize`** — these continue to own the active drag once the controller routes a `dragstart` event to them. Per-tool drag math stays where it is; the controller centralizes routing, not transformation. (Phase §4 will refactor the drag handlers themselves into `ToolSolver`s.)
- **R3F per-mesh `onClick` / `onPointerDown` / `onDoubleClick` paths** that exist solely to set drag intent or set the right-click target — these become routing inputs into the controller in a follow-up commit. For now, the controller is authoritative; the per-mesh handlers either no-op or feed redundant data the controller treats as advisory.

## Alternatives considered

- **Keep the five sources, add a coordination layer.** Rejected. The audit's recurring-regression pattern is exactly this — every "coordinate the existing pieces" attempt grows another ref. Hard reset to one source.
- **Build the controller in §4 (Tool Solvers) instead of §3.** Rejected. Tool solvers need a clean upstream input. Building both at once doubles the migration risk.
- **Make the per-mesh R3F handlers authoritative and demote the workspace-level listeners.** Considered. Rejected because R3F's event system doesn't see HTML-portal clicks (the contextmenu bug) and because per-mesh handlers can't coordinate global state like "did the user pan vs click."
- **Replace R3F's event system entirely with the controller.** Considered. Out of scope for §3 — hover/leave per-mesh is exactly the R3F sweet spot. The controller and R3F coexist: controller owns click/drag/menu, R3F owns hover.
- **Use a finite state library (XState, Robot).** Rejected. The state machine has 5 phases and ~10 transitions; a hand-rolled `feed` function is ~150 LOC and trivially testable. External deps are not justified.

## Consequences

- **Easier:** One file to change when click/drag rules evolve. Custom-cuts adds tools, not event listeners.
- **Easier:** Bug-class regression tests for click/drag bugs live next to the controller. The additive-selection double-toggle becomes a deterministic test, not a wait-for-the-bug-to-recur process.
- **Easier:** Phase §10 overlays can rely on `controller.feed({ kind: 'pointerdown', ... })` being the canonical entry point — no more "did the click reach the canvas listener too?"
- **Harder:** Anything that wants to react to "the user clicked something" must consume one of the controller's actions, not invent its own listener. This is the intended constraint.
- **Migration cost:** ~330 LOC of native listener code in `Workspace.tsx` shrinks to ~30 LOC of `useCanvasPointerSession({ ...handlers })`. `workspaceUtils` loses the right-click-target globals.
- **What we can no longer do:** Snake in a separate `useEffect` that listens to canvas `mousedown` directly. If a new feature wants pointer events, it routes through the controller (or builds a separate non-canvas surface).

## Open questions

- **Granularity of drag handoff.** Phase §3 keeps `usePartDrag` etc. owning the active drag. Phase §4 refactors them into `ToolSolver`s. Until §4 lands, the `onDragStart → { capture: true }` contract is the seam. Resolve in §4.
- **Box-selection (cmd+drag).** Currently lives in `Workspace.tsx` as a separate state machine (`isBoxSelecting`, `boxStartRef`, `boxEndRef`). For §3 it stays where it is; the controller can dispatch `dragstart` with `hit = ground/null` and the box-select code captures. Long-term it should also become a `ToolSolver`. Resolve in §4.
- **`partClickHandler` semantics.** The eager-selection-on-mousedown path serves the "click and immediately drag a part to move it" gesture — selection must happen before drag start. The controller preserves this by allowing `onDragStart` handlers to read fresh selection state. Verify in the migration commit.

## References

- Blueprint: §3 Interaction Session Controller
- ADR-002: Hit-Testing Service (this controller depends on it)
- Audit: [interaction-architecture-redesign.md](../interaction-architecture-redesign.md) — Finding 2 "Gesture ownership is fragmented"
- Execution plan: [interaction-architecture-execution-plan.md](../interaction-architecture-execution-plan.md) §3 Phase 3
- Code to be deleted in this phase: `Workspace.tsx` lines ~349–642 (the three native-listener `useEffect`s), plus `workspaceUtils.ts` right-click-target globals
- Related ADR: ADR-004 (Tool solver interface contract) — next phase, depends on this
