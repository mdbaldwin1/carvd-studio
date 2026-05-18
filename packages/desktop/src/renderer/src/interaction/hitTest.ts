// ADR-002: Hit-testing is a single service, not scattered raycasts.
//
// `resolveHitTarget` is the only function in the workspace that answers the
// question "what did this click hit." Every gesture path delegates to it.
// Component code publishes `HitTargetDescriptor` on its mesh `userData`; the
// service reads that descriptor, never invents its own classification.

import * as THREE from 'three';
import type { Part } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Hit target types — the discriminated union covers every interactive thing a
// click can land on. Adding a new interactive kind means extending this union
// AND adding a case to `resolveHitTarget`. There is no escape hatch.
// ─────────────────────────────────────────────────────────────────────────────

export type Vec3 = { x: number; y: number; z: number };

export type AxisSign = -1 | 0 | 1;

export type HandleAxis = 'x' | 'y' | 'z';

export type HitTarget =
  | {
      kind: 'part-body';
      nodeId: string;
      partId: string;
      worldPoint: Vec3;
    }
  | {
      kind: 'resize-handle';
      nodeId: string;
      partId: string;
      handle: {
        x: AxisSign;
        y: AxisSign;
        z: AxisSign;
        type: 'corner' | 'edge-x' | 'edge-y' | 'edge-z';
      };
    }
  | {
      kind: 'rotation-handle';
      nodeId: string;
      partId: string | null;
      axis: HandleAxis;
      side: -1 | 1;
    }
  | {
      kind: 'snap-guide';
      guideId: string;
    }
  | {
      kind: 'ground';
      worldPoint: Vec3;
    }
  | {
      kind: 'sky';
      worldPoint: Vec3;
    }
  | {
      kind: 'overlay';
      overlayId: string;
    };

// ─────────────────────────────────────────────────────────────────────────────
// userData descriptor schema. Component code writes one of these to each
// interactive mesh's `userData.hitTarget`. The service reads it back.
//
// `nodeId` reserves space for the §1 Scene Graph migration. For now most callers
// pass the same value as `partId`.
// ─────────────────────────────────────────────────────────────────────────────

export type HitTargetDescriptor =
  | {
      kind: 'part-body';
      nodeId: string;
      partId: string;
    }
  | {
      kind: 'part-body-instanced';
      nodeId: string;
      // index of the instance -> partId. Stored on the InstancedMesh; service
      // uses `intersection.instanceId` to look up the part.
      partIdByInstance: ReadonlyArray<string>;
    }
  | {
      kind: 'resize-handle';
      nodeId: string;
      partId: string;
      handle: {
        x: AxisSign;
        y: AxisSign;
        z: AxisSign;
        type: 'corner' | 'edge-x' | 'edge-y' | 'edge-z';
      };
    }
  | {
      kind: 'rotation-handle';
      nodeId: string;
      partId: string | null;
      axis: HandleAxis;
      side: -1 | 1;
    }
  | {
      kind: 'snap-guide';
      guideId: string;
    }
  | {
      kind: 'ground';
    }
  | {
      kind: 'sky';
    };

const HIT_TARGET_KEY = 'hitTarget' as const;

/**
 * Read the hit-target descriptor from a Three.js object. Returns `null` if the
 * mesh was never tagged — callers should treat that as "not interactive."
 */
export function getHitTargetDescriptor(object: THREE.Object3D | undefined): HitTargetDescriptor | null {
  if (!object) return null;
  const descriptor = object.userData?.[HIT_TARGET_KEY] as HitTargetDescriptor | undefined;
  return descriptor ?? null;
}

/**
 * Write a hit-target descriptor to a Three.js object. Components call this when
 * they mount or when descriptor data changes.
 */
export function setHitTargetDescriptor(object: THREE.Object3D, descriptor: HitTargetDescriptor | null): void {
  if (descriptor === null) {
    delete object.userData[HIT_TARGET_KEY];
  } else {
    object.userData[HIT_TARGET_KEY] = descriptor;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Overlay registry — DOM-space overlays (drei <Html>, native portals) register
// their bounding rect. The service checks the registry before raycasting so
// overlays paint on top of the canvas semantically as well as visually.
//
// Phase §11 ships the registry empty; Phase §10 wires real overlays in.
// ─────────────────────────────────────────────────────────────────────────────

export interface OverlayRegistration {
  overlayId: string;
  rect: { left: number; top: number; right: number; bottom: number };
}

export interface OverlayRegistry {
  list(): ReadonlyArray<OverlayRegistration>;
}

export function createOverlayRegistry(): OverlayRegistry & {
  register(reg: OverlayRegistration): () => void;
  clear(): void;
} {
  const entries = new Map<string, OverlayRegistration>();
  return {
    register(reg) {
      entries.set(reg.overlayId, reg);
      return () => entries.delete(reg.overlayId);
    },
    list() {
      return Array.from(entries.values());
    },
    clear() {
      entries.clear();
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service input/output
// ─────────────────────────────────────────────────────────────────────────────

export interface ScreenPoint {
  /** Pointer X in client (CSS pixel) coordinates. */
  clientX: number;
  /** Pointer Y in client (CSS pixel) coordinates. */
  clientY: number;
}

export interface HitTestCanvasRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface HitTestContext {
  camera: THREE.Camera;
  scene: THREE.Object3D;
  /** Canvas DOM rect (typically `gl.domElement.getBoundingClientRect()`). */
  canvasRect: HitTestCanvasRect;
  /** Project parts — used only for the rotated-box fallback. */
  parts: ReadonlyArray<Part>;
  /** Optional overlay registry. If omitted, no DOM-space overlay checks run. */
  overlayRegistry?: OverlayRegistry;
}

// ─────────────────────────────────────────────────────────────────────────────
// Geometry helpers (pre-allocated to avoid per-frame GC churn)
// ─────────────────────────────────────────────────────────────────────────────

const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();
const _inverseMatrix = new THREE.Matrix4();
const _worldMatrix = new THREE.Matrix4();
const _localRay = new THREE.Ray();
const _intersectionLocal = new THREE.Vector3();
const _intersectionWorld = new THREE.Vector3();
const _unitScale = new THREE.Vector3(1, 1, 1);
const _partCenter = new THREE.Vector3();
const _localBounds = new THREE.Box3();

function screenPointToNdc(screen: ScreenPoint, rect: HitTestCanvasRect): THREE.Vector2 {
  const ndcX = ((screen.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((screen.clientY - rect.top) / rect.height) * 2 + 1;
  _ndc.set(ndcX, ndcY);
  return _ndc;
}

/**
 * Convert a scene-intersection into a typed `HitTarget`. Returns `null` if the
 * intersection does not correspond to a known interactive object.
 */
function classifyIntersection(intersection: THREE.Intersection): HitTarget | null {
  // Walk up the ancestor chain so a descriptor on a parent group still applies
  // (e.g. <group userData={{ hitTarget: {...} }}><mesh/></group>).
  let current: THREE.Object3D | null = intersection.object;
  while (current) {
    const descriptor = getHitTargetDescriptor(current);
    if (descriptor) {
      return classifyFromDescriptor(descriptor, intersection);
    }
    current = current.parent;
  }
  return null;
}

function classifyFromDescriptor(descriptor: HitTargetDescriptor, intersection: THREE.Intersection): HitTarget | null {
  const point: Vec3 = intersection.point
    ? { x: intersection.point.x, y: intersection.point.y, z: intersection.point.z }
    : { x: 0, y: 0, z: 0 };

  switch (descriptor.kind) {
    case 'part-body':
      return {
        kind: 'part-body',
        nodeId: descriptor.nodeId,
        partId: descriptor.partId,
        worldPoint: point
      };
    case 'part-body-instanced': {
      const instanceId = intersection.instanceId;
      if (instanceId === undefined) return null;
      const partId = descriptor.partIdByInstance[instanceId];
      if (!partId) return null;
      return {
        kind: 'part-body',
        nodeId: partId,
        partId,
        worldPoint: point
      };
    }
    case 'resize-handle':
      return {
        kind: 'resize-handle',
        nodeId: descriptor.nodeId,
        partId: descriptor.partId,
        handle: descriptor.handle
      };
    case 'rotation-handle':
      return {
        kind: 'rotation-handle',
        nodeId: descriptor.nodeId,
        partId: descriptor.partId,
        axis: descriptor.axis,
        side: descriptor.side
      };
    case 'snap-guide':
      return { kind: 'snap-guide', guideId: descriptor.guideId };
    case 'ground':
      return { kind: 'ground', worldPoint: point };
    case 'sky':
      return { kind: 'sky', worldPoint: point };
  }
}

/**
 * Manual ray-vs-rotated-box fallback. Runs only when the scene raycast misses
 * (e.g. an instanced mesh momentarily has a stale bounding sphere). Returns the
 * nearest part to the ray origin or `null`.
 */
function rotatedBoxFallback(parts: ReadonlyArray<Part>): { partId: string; worldPoint: Vec3 } | null {
  let bestPartId: string | null = null;
  let bestDistance = Infinity;
  let bestPoint: Vec3 | null = null;
  const ray = _raycaster.ray;

  for (const part of parts) {
    _euler.set(
      (part.rotation.x * Math.PI) / 180,
      (part.rotation.y * Math.PI) / 180,
      (part.rotation.z * Math.PI) / 180,
      'XYZ'
    );
    _quat.setFromEuler(_euler);
    _partCenter.set(part.position.x, part.position.y, part.position.z);
    _worldMatrix.compose(_partCenter, _quat, _unitScale);
    _inverseMatrix.copy(_worldMatrix).invert();
    _localRay.copy(ray).applyMatrix4(_inverseMatrix);

    _localBounds.min.set(-part.length / 2, -part.thickness / 2, -part.width / 2);
    _localBounds.max.set(part.length / 2, part.thickness / 2, part.width / 2);

    if (!_localRay.intersectBox(_localBounds, _intersectionLocal)) continue;

    _intersectionWorld.copy(_intersectionLocal).applyMatrix4(_worldMatrix);
    const distance = ray.origin.distanceTo(_intersectionWorld);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestPartId = part.id;
      bestPoint = {
        x: _intersectionWorld.x,
        y: _intersectionWorld.y,
        z: _intersectionWorld.z
      };
    }
  }

  if (bestPartId && bestPoint) {
    return { partId: bestPartId, worldPoint: bestPoint };
  }
  return null;
}

function pointInsideRect(point: ScreenPoint, rect: OverlayRegistration['rect']): boolean {
  return (
    point.clientX >= rect.left &&
    point.clientX <= rect.right &&
    point.clientY >= rect.top &&
    point.clientY <= rect.bottom
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve what was hit at the given screen point. Returns a typed `HitTarget`
 * or `null` if the click landed on truly empty space outside any registered
 * overlay or scene geometry.
 *
 * Resolution order (first wins):
 *   1. Registered DOM overlays containing the point.
 *   2. Scene raycast → first intersection with a `hitTarget` descriptor.
 *   3. Manual rotated-box fallback over `parts` (returns `part-body`).
 *   4. `null`.
 */
export function resolveHitTarget(screen: ScreenPoint, context: HitTestContext): HitTarget | null {
  // 1. DOM overlay layer wins (overlays paint on top of the canvas).
  if (context.overlayRegistry) {
    for (const reg of context.overlayRegistry.list()) {
      if (pointInsideRect(screen, reg.rect)) {
        return { kind: 'overlay', overlayId: reg.overlayId };
      }
    }
  }

  // 2. Scene raycast.
  const ndc = screenPointToNdc(screen, context.canvasRect);
  _raycaster.setFromCamera(ndc, context.camera);
  const intersections = _raycaster.intersectObject(context.scene, true);

  for (const intersection of intersections) {
    const target = classifyIntersection(intersection);
    if (target) return target;
  }

  // 3. Rotated-box fallback over parts. Catches the edge cases where an
  // InstancedMesh's bounding sphere is momentarily stale relative to its
  // instances — better than going silent.
  const fallback = rotatedBoxFallback(context.parts);
  if (fallback) {
    return {
      kind: 'part-body',
      nodeId: fallback.partId,
      partId: fallback.partId,
      worldPoint: fallback.worldPoint
    };
  }

  return null;
}

/**
 * Returns true if the screen point would land on anything interactive
 * (anything except `null`, `ground`, or `sky`).
 *
 * Convenience wrapper used by gesture entry points to decide whether to treat
 * a click as "deselect on empty space" vs "let the interactive hit handle it."
 */
export function hasInteractiveHitAt(screen: ScreenPoint, context: HitTestContext): boolean {
  const target = resolveHitTarget(screen, context);
  if (!target) return false;
  if (target.kind === 'ground') return false;
  if (target.kind === 'sky') return false;
  return true;
}
