// ADR-003: React hook that wraps the session controller and attaches DOM
// listeners to the canvas + window. The hook is the only place that sees DOM
// pointer events. Consumers receive typed semantic actions (click, doubleclick,
// contextmenu, dragstart/move/commit/cancel) — never raw DOM events.

import { useEffect, useRef } from 'react';
import type { Camera, Object3D } from 'three';
import type { Part } from '../types';
import { type HitTarget, resolveHitTarget, type OverlayRegistry } from './hitTest';
import {
  createSessionController,
  type SessionAction,
  type SessionControllerConfig,
  type SessionModifiers
} from './sessionController';

export interface UseCanvasPointerSessionHandlers {
  onClick?: (action: Extract<SessionAction, { kind: 'click' }>) => void;
  onDoubleClick?: (action: Extract<SessionAction, { kind: 'doubleclick' }>) => void;
  onContextMenu?: (action: Extract<SessionAction, { kind: 'contextmenu' }>) => void;
  onDragStart?: (action: Extract<SessionAction, { kind: 'dragstart' }>) => void;
  onDragMove?: (action: Extract<SessionAction, { kind: 'dragmove' }>) => void;
  onDragCommit?: (action: Extract<SessionAction, { kind: 'dragcommit' }>) => void;
  onDragCancel?: () => void;
}

export interface UseCanvasPointerSessionParams {
  /** The canvas element. Usually `gl.domElement` from useThree(). */
  canvas: HTMLCanvasElement | null;
  /** Three.js camera, used by hit-testing. */
  camera: Camera | null;
  /** Root scene object, used by hit-testing. */
  scene: Object3D | null;
  /** Current project parts (for the rotated-box fallback in hit-testing). */
  parts: ReadonlyArray<Part>;
  /** Optional overlay registry (Phase §10 will register real overlays). */
  overlayRegistry?: OverlayRegistry;
  /** Handlers — semantic actions only. Stable references not required. */
  handlers: UseCanvasPointerSessionHandlers;
  /** Optional tuning overrides for the state machine. */
  config?: SessionControllerConfig;
  /** Disable the hook (e.g. while a modal owns input). Defaults to false. */
  disabled?: boolean;
}

function readModifiers(event: PointerEvent | MouseEvent | KeyboardEvent): SessionModifiers {
  return {
    shift: event.shiftKey,
    ctrl: event.ctrlKey,
    meta: event.metaKey,
    alt: event.altKey
  };
}

function pointerIsInCanvas(canvas: HTMLCanvasElement, clientX: number, clientY: number): boolean {
  const rect = canvas.getBoundingClientRect();
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

export function useCanvasPointerSession(params: UseCanvasPointerSessionParams): void {
  const { canvas, camera, scene, parts, overlayRegistry, handlers, config, disabled = false } = params;

  // Stable refs for the handlers so the effect doesn't need to re-attach
  // listeners every time the host re-renders with new callback identities.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const partsRef = useRef(parts);
  partsRef.current = parts;

  // The controller persists across renders for the lifetime of the hook.
  const controllerRef = useRef<ReturnType<typeof createSessionController> | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = createSessionController(config);
  }

  useEffect(() => {
    if (disabled) return;
    if (!canvas || !camera || !scene) return;
    const controller = controllerRef.current!;

    function hitAt(clientX: number, clientY: number): HitTarget | null {
      if (!canvas || !camera || !scene) return null;
      const rect = canvas.getBoundingClientRect();
      return resolveHitTarget(
        { clientX, clientY },
        {
          camera,
          scene,
          canvasRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
          parts: partsRef.current,
          overlayRegistry
        }
      );
    }

    function dispatch(actions: SessionAction[]) {
      const h = handlersRef.current;
      for (const action of actions) {
        switch (action.kind) {
          case 'click':
            h.onClick?.(action);
            break;
          case 'doubleclick':
            h.onDoubleClick?.(action);
            break;
          case 'contextmenu':
            h.onContextMenu?.(action);
            break;
          case 'dragstart':
            h.onDragStart?.(action);
            break;
          case 'dragmove':
            h.onDragMove?.(action);
            break;
          case 'dragcommit':
            h.onDragCommit?.(action);
            break;
          case 'dragcancel':
            h.onDragCancel?.();
            break;
        }
      }
    }

    const handlePointerDown = (e: PointerEvent) => {
      // Only buttons 0 (left) and 2 (right) participate in click/drag/menu.
      if (e.button !== 0 && e.button !== 2) return;
      dispatch(
        controller.feed({
          kind: 'pointerdown',
          pointerId: e.pointerId,
          button: e.button as 0 | 2,
          clientX: e.clientX,
          clientY: e.clientY,
          modifiers: readModifiers(e),
          timestamp: e.timeStamp,
          hit: hitAt(e.clientX, e.clientY)
        })
      );
    };

    const handlePointerMove = (e: PointerEvent) => {
      // Only forward moves to the controller if it's actively tracking a
      // gesture — otherwise we'd hit-test on every pixel of pointer motion.
      const phase = controller.state().phase;
      if (phase === 'idle') return;
      dispatch(
        controller.feed({
          kind: 'pointermove',
          pointerId: e.pointerId,
          clientX: e.clientX,
          clientY: e.clientY,
          modifiers: readModifiers(e),
          timestamp: e.timeStamp
        })
      );
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.button !== 0 && e.button !== 2) return;
      dispatch(
        controller.feed({
          kind: 'pointerup',
          pointerId: e.pointerId,
          button: e.button as 0 | 2,
          clientX: e.clientX,
          clientY: e.clientY,
          modifiers: readModifiers(e),
          timestamp: e.timeStamp,
          hit: hitAt(e.clientX, e.clientY)
        })
      );
    };

    const handlePointerCancel = (e: PointerEvent) => {
      dispatch(
        controller.feed({
          kind: 'pointercancel',
          pointerId: e.pointerId,
          timestamp: e.timeStamp
        })
      );
    };

    const handleBlur = (e: FocusEvent) => {
      dispatch(controller.feed({ kind: 'blur', timestamp: e.timeStamp }));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dispatch(controller.feed({ kind: 'escape', timestamp: e.timeStamp }));
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (!pointerIsInCanvas(canvas, e.clientX, e.clientY)) return;
      // Always prevent the native menu inside the workspace — the controller
      // emits a `contextmenu` action via the pointerup path, which is where
      // the host decides whether to open our menu. This native-menu suppression
      // here is independent of state machine actions.
      e.preventDefault();
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
      controller.reset();
    };
  }, [canvas, camera, scene, overlayRegistry, disabled]);
}
