import * as THREE from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { GeometryCache } from '../../interaction/geometry/cache';
import { LightingMode } from '../../types';
import { getPartLocalBoundingBox } from '../../utils/partFeatureGeometry';

// Lighting presets for different viewing conditions
export const LIGHTING_PRESETS: Record<
  LightingMode,
  {
    ambient: number;
    mainLight: { position: [number, number, number]; intensity: number };
    fillLight: { position: [number, number, number]; intensity: number };
    description: string;
  }
> = {
  default: {
    ambient: 0.5,
    mainLight: { position: [10, 20, 10], intensity: 1 },
    fillLight: { position: [-10, 10, -10], intensity: 0.3 },
    description: 'Balanced lighting for general use'
  },
  bright: {
    ambient: 1.0,
    mainLight: { position: [10, 20, 10], intensity: 1.5 },
    fillLight: { position: [-10, 15, -10], intensity: 0.8 },
    description: 'Brighter lighting for dark materials'
  },
  studio: {
    ambient: 0.6,
    mainLight: { position: [15, 25, 15], intensity: 0.8 },
    fillLight: { position: [-15, 15, -15], intensity: 0.5 },
    description: 'Soft, even lighting like a photography studio'
  },
  dramatic: {
    ambient: 0.3,
    mainLight: { position: [5, 30, 5], intensity: 1.5 },
    fillLight: { position: [-8, 5, -8], intensity: 0.15 },
    description: 'High contrast lighting with strong shadows'
  }
};

// Type guard to check if controls is OrbitControls
export function isOrbitControls(controls: THREE.EventDispatcher<object> | null): controls is OrbitControlsImpl {
  return controls !== null && 'enabled' in controls;
}

export function pauseOrbitControls(controls: THREE.EventDispatcher<object> | null): void {
  if (isOrbitControls(controls)) {
    controls.enabled = false;
  }
}

export function resumeOrbitControls(controls: THREE.EventDispatcher<object> | null): void {
  if (isOrbitControls(controls)) {
    controls.enabled = true;
  }
}

type CursorTarget = { body: { style: { cursor: string } } };

export function setWorkspaceCursor(cursor: string, target: CursorTarget = document): void {
  target.body.style.cursor = cursor;
}

export function resetWorkspaceCursor(target: CursorTarget = document): void {
  setWorkspaceCursor('auto', target);
}

// ADR-002 + ADR-003: the right-click target globals
// (setRightClickTarget / getRightClickTarget / clearRightClickTarget) that
// used to live here are gone. The hit-test service resolves right-click
// targets via userData.hitTarget descriptors, and the session controller's
// onContextMenu handler reads them directly. The globals were the bridge
// between per-mesh R3F handlers and the workspace contextmenu listener;
// neither side needs the bridge anymore.

export function markPartPointerInteraction() {
  // Reserved hook for part-owned pointer interactions.
}

export interface WindowPointerSessionTarget {
  addEventListener(
    type: 'pointermove' | 'pointerup' | 'pointercancel' | 'blur',
    listener: unknown,
    options?: unknown
  ): void;
  removeEventListener(
    type: 'pointermove' | 'pointerup' | 'pointercancel' | 'blur',
    listener: unknown,
    options?: unknown
  ): void;
}

export function bindWindowPointerSession(
  target: WindowPointerSessionTarget,
  handlers: {
    onMove: (event: PointerEvent) => void;
    onEnd: (event?: unknown) => void;
    moveOptions?: unknown;
    endOptions?: unknown;
  }
): () => void {
  const moveListener = handlers.onMove;
  const endListener = handlers.onEnd;
  const addPointerListener = (
    type: 'pointermove' | 'pointerup' | 'pointercancel' | 'blur',
    listener: unknown,
    options: unknown
  ) => {
    if (options === undefined) {
      target.addEventListener(type, listener);
    } else {
      target.addEventListener(type, listener, options);
    }
  };
  const removePointerListener = (
    type: 'pointermove' | 'pointerup' | 'pointercancel' | 'blur',
    listener: unknown,
    options: unknown
  ) => {
    if (options === undefined) {
      target.removeEventListener(type, listener);
    } else {
      target.removeEventListener(type, listener, options);
    }
  };

  addPointerListener('pointermove', moveListener, handlers.moveOptions);
  addPointerListener('pointerup', endListener, handlers.endOptions);
  addPointerListener('pointercancel', endListener, handlers.endOptions);
  addPointerListener('blur', endListener, handlers.endOptions);

  return () => {
    removePointerListener('pointermove', moveListener, handlers.moveOptions);
    removePointerListener('pointerup', endListener, handlers.endOptions);
    removePointerListener('pointercancel', endListener, handlers.endOptions);
    removePointerListener('blur', endListener, handlers.endOptions);
  };
}

export interface PointerRafTarget {
  requestAnimationFrame(callback: () => void): number;
  cancelAnimationFrame(frameId: number): void;
}

export function createPointerRafQueue(
  target: PointerRafTarget,
  onFrame: (event: PointerEvent) => void
): {
  schedule(event: PointerEvent): void;
  cancel(): void;
} {
  let frameId: number | null = null;
  let latestEvent: PointerEvent | null = null;

  return {
    schedule(event) {
      latestEvent = event;
      if (frameId !== null) return;

      frameId = target.requestAnimationFrame(() => {
        frameId = null;
        const eventForFrame = latestEvent;
        if (!eventForFrame) return;

        onFrame(eventForFrame);
      });
    },
    cancel() {
      if (frameId !== null) {
        target.cancelAnimationFrame(frameId);
        frameId = null;
      }
      latestEvent = null;
    }
  };
}

const _aabbEuler = new THREE.Euler();
const _aabbQuat = new THREE.Quaternion();
const _aabbCorners = Array.from({ length: 8 }, () => new THREE.Vector3());
const _aabbPosition = new THREE.Vector3();

// Helper to calculate axis-aligned bounding box for a part
export function getPartAABB(
  part: {
    id?: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    length: number;
    width: number;
    thickness: number;
    features?: import('../../types').PartFeature[];
  },
  geometryCache?: GeometryCache
) {
  _aabbEuler.set(
    (part.rotation.x * Math.PI) / 180,
    (part.rotation.y * Math.PI) / 180,
    (part.rotation.z * Math.PI) / 180,
    'XYZ'
  );
  _aabbQuat.setFromEuler(_aabbEuler);

  // Feature-bearing parts (custom cuts) have a tighter local box than their
  // raw dimensions; the geometry cache is not feature-aware, so use the exact
  // feature geometry for those.
  const localAabb =
    part.features && part.features.length > 0
      ? getPartLocalBoundingBox(part as Parameters<typeof getPartLocalBoundingBox>[0])
      : geometryCache && part.id
        ? geometryCache.get({
            ...part,
            id: part.id
          } as Parameters<GeometryCache['get']>[0]).bounds.localAabb
        : {
            min: { x: -part.length / 2, y: -part.thickness / 2, z: -part.width / 2 },
            max: { x: part.length / 2, y: part.thickness / 2, z: part.width / 2 }
          };

  _aabbCorners[0].set(localAabb.min.x, localAabb.min.y, localAabb.min.z);
  _aabbCorners[1].set(localAabb.min.x, localAabb.min.y, localAabb.max.z);
  _aabbCorners[2].set(localAabb.min.x, localAabb.max.y, localAabb.min.z);
  _aabbCorners[3].set(localAabb.min.x, localAabb.max.y, localAabb.max.z);
  _aabbCorners[4].set(localAabb.max.x, localAabb.min.y, localAabb.min.z);
  _aabbCorners[5].set(localAabb.max.x, localAabb.min.y, localAabb.max.z);
  _aabbCorners[6].set(localAabb.max.x, localAabb.max.y, localAabb.min.z);
  _aabbCorners[7].set(localAabb.max.x, localAabb.max.y, localAabb.max.z);

  _aabbPosition.set(part.position.x, part.position.y, part.position.z);

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;

  for (const corner of _aabbCorners) {
    corner.applyQuaternion(_aabbQuat);
    corner.add(_aabbPosition);
    minX = Math.min(minX, corner.x);
    maxX = Math.max(maxX, corner.x);
    minY = Math.min(minY, corner.y);
    maxY = Math.max(maxY, corner.y);
    minZ = Math.min(minZ, corner.z);
    maxZ = Math.max(maxZ, corner.z);
  }

  return { minX, maxX, minY, maxY, minZ, maxZ };
}
