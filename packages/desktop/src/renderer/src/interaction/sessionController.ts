// ADR-003: A single pointer-session controller owns the canvas event surface.
//
// This module is the pure state machine. It has no React, no Three.js, no DOM.
// The React hook `useCanvasPointerSession` (separate module) wraps it and
// attaches DOM listeners.
//
// The controller turns raw pointer events into typed semantic actions:
//   click / doubleclick / contextmenu / dragstart / dragmove / dragcommit / dragcancel
//
// State machine (see ADR-003 for the diagram):
//   idle ──pointerdown─► armed ──pointermove>thresh─► dragging ──pointerup─► committing ─► idle
//                          │                              │
//                          │ pointerup (no move)          │ cancel/blur/escape
//                          ▼                              ▼
//                       (emit click)                 (emit dragcancel)
//                          │                              │
//                          └─────► committing ────────────┘
//                                       │
//                                       ▼
//                                      idle

import type { HitTarget } from './hitTest';

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export type SessionPhase = 'idle' | 'armed' | 'dragging' | 'committing';

export interface SessionModifiers {
  shift: boolean;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
}

export const EMPTY_MODIFIERS: SessionModifiers = {
  shift: false,
  ctrl: false,
  meta: false,
  alt: false
};

export type SessionButton = 0 | 2;

export interface ArmedContext {
  pointerId: number;
  button: SessionButton;
  downAt: { clientX: number; clientY: number; timestamp: number };
  downHit: HitTarget | null;
  downModifiers: SessionModifiers;
}

export interface DraggingContext extends ArmedContext {
  lastClient: { clientX: number; clientY: number };
}

export interface PointerState {
  phase: SessionPhase;
  armed?: ArmedContext;
  dragging?: DraggingContext;
  /** Last completed pointerup (used for double-click detection). */
  lastUp?: { clientX: number; clientY: number; timestamp: number; button: SessionButton };
}

export type SessionEvent =
  | {
      kind: 'pointerdown';
      pointerId: number;
      button: SessionButton;
      clientX: number;
      clientY: number;
      modifiers: SessionModifiers;
      timestamp: number;
      hit: HitTarget | null;
    }
  | {
      kind: 'pointermove';
      pointerId: number;
      clientX: number;
      clientY: number;
      modifiers: SessionModifiers;
      timestamp: number;
    }
  | {
      kind: 'pointerup';
      pointerId: number;
      button: SessionButton;
      clientX: number;
      clientY: number;
      modifiers: SessionModifiers;
      timestamp: number;
      hit: HitTarget | null;
    }
  | {
      kind: 'pointercancel';
      pointerId: number;
      timestamp: number;
    }
  | {
      kind: 'blur';
      timestamp: number;
    }
  | {
      kind: 'escape';
      timestamp: number;
    };

export type SessionAction =
  | {
      kind: 'click';
      hit: HitTarget | null;
      button: SessionButton;
      modifiers: SessionModifiers;
      clientX: number;
      clientY: number;
    }
  | {
      kind: 'doubleclick';
      hit: HitTarget | null;
      modifiers: SessionModifiers;
      clientX: number;
      clientY: number;
    }
  | {
      kind: 'contextmenu';
      hit: HitTarget | null;
      modifiers: SessionModifiers;
      clientX: number;
      clientY: number;
    }
  | {
      kind: 'dragstart';
      hit: HitTarget | null;
      button: SessionButton;
      modifiers: SessionModifiers;
      clientX: number;
      clientY: number;
      downAt: { clientX: number; clientY: number };
    }
  | {
      kind: 'dragmove';
      modifiers: SessionModifiers;
      clientX: number;
      clientY: number;
      deltaX: number;
      deltaY: number;
    }
  | {
      kind: 'dragcommit';
      hit: HitTarget | null;
      modifiers: SessionModifiers;
      clientX: number;
      clientY: number;
      deltaX: number;
      deltaY: number;
    }
  | { kind: 'dragcancel' };

export interface SessionControllerConfig {
  /** Pixels of pointer movement required to switch from `armed` to `dragging`. */
  dragThresholdPx?: number;
  /** Max ms between two clicks for double-click detection. */
  doubleClickIntervalMs?: number;
  /** Max distance between two clicks for double-click detection. */
  doubleClickDistancePx?: number;
  /** Max ms / px for an "armed" gesture that produces no drag movement to still count as a click. */
  clickMaxDurationMs?: number;
  clickMaxDistancePx?: number;
}

const DEFAULTS: Required<SessionControllerConfig> = {
  dragThresholdPx: 4,
  doubleClickIntervalMs: 400,
  doubleClickDistancePx: 6,
  clickMaxDurationMs: 600,
  clickMaxDistancePx: 5
};

// ─────────────────────────────────────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionController {
  state(): PointerState;
  feed(event: SessionEvent): SessionAction[];
  /** Reset to idle. Used by hooks unmounting cleanly. */
  reset(): void;
}

export function createSessionController(config: SessionControllerConfig = {}): SessionController {
  const cfg: Required<SessionControllerConfig> = { ...DEFAULTS, ...config };

  let state: PointerState = { phase: 'idle' };

  function feed(event: SessionEvent): SessionAction[] {
    switch (event.kind) {
      case 'pointerdown':
        return handlePointerDown(event);
      case 'pointermove':
        return handlePointerMove(event);
      case 'pointerup':
        return handlePointerUp(event);
      case 'pointercancel':
        return cancelActive();
      case 'blur':
        return cancelActive();
      case 'escape':
        return cancelActive();
    }
  }

  function handlePointerDown(event: Extract<SessionEvent, { kind: 'pointerdown' }>): SessionAction[] {
    // If we're already armed or dragging on a different pointer/button, treat
    // the new down as a cancellation of the prior gesture. This prevents a
    // dropped pointerup from leaving the controller stuck in `armed` forever.
    const actions: SessionAction[] = [];
    if (state.phase === 'armed' || state.phase === 'dragging') {
      actions.push(...cancelActive());
    }

    if (event.button !== 0 && event.button !== 2) {
      // Ignore middle / other buttons for now.
      return actions;
    }

    state = {
      phase: 'armed',
      armed: {
        pointerId: event.pointerId,
        button: event.button,
        downAt: { clientX: event.clientX, clientY: event.clientY, timestamp: event.timestamp },
        downHit: event.hit,
        downModifiers: event.modifiers
      },
      lastUp: state.lastUp
    };

    return actions;
  }

  function handlePointerMove(event: Extract<SessionEvent, { kind: 'pointermove' }>): SessionAction[] {
    if (state.phase === 'armed' && state.armed && state.armed.pointerId === event.pointerId) {
      const dx = event.clientX - state.armed.downAt.clientX;
      const dy = event.clientY - state.armed.downAt.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= cfg.dragThresholdPx) {
        const armed = state.armed;
        const dragging: DraggingContext = {
          ...armed,
          lastClient: { clientX: event.clientX, clientY: event.clientY }
        };
        state = { phase: 'dragging', dragging, lastUp: state.lastUp };
        return [
          {
            kind: 'dragstart',
            hit: armed.downHit,
            button: armed.button,
            modifiers: event.modifiers,
            clientX: event.clientX,
            clientY: event.clientY,
            downAt: { clientX: armed.downAt.clientX, clientY: armed.downAt.clientY }
          },
          {
            kind: 'dragmove',
            modifiers: event.modifiers,
            clientX: event.clientX,
            clientY: event.clientY,
            deltaX: event.clientX - armed.downAt.clientX,
            deltaY: event.clientY - armed.downAt.clientY
          }
        ];
      }
      return [];
    }

    if (state.phase === 'dragging' && state.dragging && state.dragging.pointerId === event.pointerId) {
      const drag = state.dragging;
      drag.lastClient = { clientX: event.clientX, clientY: event.clientY };
      return [
        {
          kind: 'dragmove',
          modifiers: event.modifiers,
          clientX: event.clientX,
          clientY: event.clientY,
          deltaX: event.clientX - drag.downAt.clientX,
          deltaY: event.clientY - drag.downAt.clientY
        }
      ];
    }

    return [];
  }

  function handlePointerUp(event: Extract<SessionEvent, { kind: 'pointerup' }>): SessionAction[] {
    const actions: SessionAction[] = [];

    if (state.phase === 'armed' && state.armed && state.armed.pointerId === event.pointerId) {
      const armed = state.armed;
      const dx = event.clientX - armed.downAt.clientX;
      const dy = event.clientY - armed.downAt.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const elapsed = event.timestamp - armed.downAt.timestamp;

      const isClickByDistanceAndTime = dist <= cfg.clickMaxDistancePx && elapsed <= cfg.clickMaxDurationMs;

      if (isClickByDistanceAndTime && armed.button === 0) {
        // Left-click. Check for double-click.
        const isDouble =
          state.lastUp !== undefined &&
          state.lastUp.button === 0 &&
          event.timestamp - state.lastUp.timestamp <= cfg.doubleClickIntervalMs &&
          Math.hypot(event.clientX - state.lastUp.clientX, event.clientY - state.lastUp.clientY) <=
            cfg.doubleClickDistancePx;

        if (isDouble) {
          actions.push({
            kind: 'doubleclick',
            hit: event.hit,
            modifiers: event.modifiers,
            clientX: event.clientX,
            clientY: event.clientY
          });
          // Reset lastUp so a third click doesn't trigger another doubleclick.
          state = { phase: 'committing', lastUp: undefined };
        } else {
          actions.push({
            kind: 'click',
            hit: event.hit,
            button: 0,
            modifiers: event.modifiers,
            clientX: event.clientX,
            clientY: event.clientY
          });
          state = {
            phase: 'committing',
            lastUp: {
              clientX: event.clientX,
              clientY: event.clientY,
              timestamp: event.timestamp,
              button: 0
            }
          };
        }
      } else if (isClickByDistanceAndTime && armed.button === 2) {
        // Right-click → contextmenu. Double right-click is not a thing.
        actions.push({
          kind: 'contextmenu',
          hit: event.hit,
          modifiers: event.modifiers,
          clientX: event.clientX,
          clientY: event.clientY
        });
        state = {
          phase: 'committing',
          lastUp: {
            clientX: event.clientX,
            clientY: event.clientY,
            timestamp: event.timestamp,
            button: 2
          }
        };
      } else {
        // Pointerup with no movement but past the click time threshold — neither
        // click nor drag. Treat as a benign cancel.
        state = { phase: 'committing', lastUp: state.lastUp };
      }
    } else if (state.phase === 'dragging' && state.dragging && state.dragging.pointerId === event.pointerId) {
      const drag = state.dragging;
      actions.push({
        kind: 'dragcommit',
        hit: event.hit,
        modifiers: event.modifiers,
        clientX: event.clientX,
        clientY: event.clientY,
        deltaX: event.clientX - drag.downAt.clientX,
        deltaY: event.clientY - drag.downAt.clientY
      });
      // A drag-release is NOT a click for double-click purposes — clear lastUp.
      state = { phase: 'committing', lastUp: undefined };
    } else {
      // Pointerup without a matching down (e.g. focus changed mid-gesture).
      // Ignore.
      return actions;
    }

    // committing → idle on the same tick.
    state = { phase: 'idle', lastUp: state.lastUp };
    return actions;
  }

  function cancelActive(): SessionAction[] {
    if (state.phase === 'idle') return [];
    const actions: SessionAction[] = [];
    if (state.phase === 'dragging') {
      actions.push({ kind: 'dragcancel' });
    }
    state = { phase: 'idle', lastUp: state.lastUp };
    return actions;
  }

  return {
    state: () => state,
    feed,
    reset() {
      state = { phase: 'idle' };
    }
  };
}
