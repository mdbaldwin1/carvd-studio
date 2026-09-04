import * as THREE from 'three';
import { Part, RectCutFeature, ReferenceDistanceIndicator, SnapDistanceIndicator, SnapGuide, SnapLine } from '../types';
import { getPartEndCutProfiles } from './endCutUtils';
import {
  getPartContourSubBoxes,
  getPartLocalBoundingBox,
  getPartLocalConvexVertices,
  getPartWorldAABB,
  hasRenderablePartFeatures
} from './partFeatureGeometry';
import { getRectCutDepth, getResolvedRectCutFeature, isTopTarget } from './rectCutUtils';
import type { GeometryCache } from '../interaction/geometry/cache';

// Module-level reusable objects for getPartBounds calculations.
// Safe because JS is single-threaded and callers only see the returned plain PartBounds object.
const _boundsEuler = new THREE.Euler();
const _boundsQuat = new THREE.Quaternion();
const _boundsCorners = Array.from({ length: 8 }, () => new THREE.Vector3());
const _boundsPosition = new THREE.Vector3();

// Part bounding box in world space
export interface PartBounds {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  centerX: number;
  centerY: number;
  centerZ: number;
}

type Vec3 = { x: number; y: number; z: number };

export interface PartOBB {
  center: { x: number; y: number; z: number };
  // Local axes in world space: length(X), thickness(Y), width(Z)
  axes: [{ x: number; y: number; z: number }, { x: number; y: number; z: number }, { x: number; y: number; z: number }];
  halfExtents: [number, number, number];
}

// Snap suggestion for a single axis
interface AxisSnap {
  snapped: boolean;
  value: number; // The value to snap to
  delta: number; // How much to adjust the position
  type: 'edge' | 'center';
  targetPartId: string;
}

// Equal spacing snap suggestion
interface EqualSpacingSnap {
  snapped: boolean;
  axis: 'x' | 'y' | 'z';
  delta: number; // How much to adjust the position
  equalGap: number; // The resulting equal gap on each side
  part1Id: string; // First bookend part
  part2Id: string; // Second bookend part
  part1Bounds: PartBounds;
  part2Bounds: PartBounds;
}

// Result of snap detection
export interface SnapResult {
  // Position adjustments to apply
  adjustedPosition: { x: number; y: number; z: number };
  // Whether each axis was snapped
  snappedX: boolean;
  snappedY: boolean;
  snappedZ: boolean;
  // Alignment lines to display
  snapLines: SnapLine[];
  // Optional: nearest compatible candidate distance (used for snap hysteresis)
  closestDistance?: number;
}

function withSnapFamily(lines: SnapLine[], family: NonNullable<SnapLine['family']>, subtype?: string): SnapLine[] {
  return lines.map((line) => ({
    ...line,
    family,
    subtype: line.subtype ?? subtype,
    state: line.state ?? 'winner'
  }));
}

// Calculate axis-aligned bounding box for a part in world space.
//
// Feature-bearing parts (custom cuts) get their exact world AABB from the
// feature geometry. Otherwise, ADR-009 applies: when a `geometryCache` is
// provided, the part's 8 local-space corners come from
// `bundle.snapGraph.corners`; for box parts the corners are identical to the
// inline derivation, and the overload is opt-in so every existing caller
// keeps working unchanged.
export function getPartBounds(part: Part, geometryCache?: GeometryCache): PartBounds {
  if (part.features && part.features.length > 0) {
    const { minX, maxX, minY, maxY, minZ, maxZ } = getPartWorldAABB(part);
    return {
      id: part.id,
      minX,
      maxX,
      minY,
      maxY,
      minZ,
      maxZ,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      centerZ: (minZ + maxZ) / 2
    };
  }

  _boundsEuler.set(
    (part.rotation.x * Math.PI) / 180,
    (part.rotation.y * Math.PI) / 180,
    (part.rotation.z * Math.PI) / 180,
    'XYZ'
  );
  _boundsQuat.setFromEuler(_boundsEuler);

  if (geometryCache) {
    const bundle = geometryCache.get(part);
    // Bundle corners are local-space; write each into the pre-allocated
    // working buffer.
    const cornerCount = bundle.snapGraph.corners.length;
    if (cornerCount !== 8) {
      // Box parts have exactly 8 corners; if a custom-cut bundle introduces
      // a different count later, fall back to inline math to preserve box
      // semantics until the snap engine learns about non-box geometry.
      return getPartBoundsInline(part);
    }
    for (let i = 0; i < 8; i++) {
      const local = bundle.snapGraph.corners[i].point;
      _boundsCorners[i].set(local.x, local.y, local.z);
    }
  } else {
    const halfLength = part.length / 2;
    const halfThickness = part.thickness / 2;
    const halfWidth = part.width / 2;
    _boundsCorners[0].set(-halfLength, -halfThickness, -halfWidth);
    _boundsCorners[1].set(-halfLength, -halfThickness, halfWidth);
    _boundsCorners[2].set(-halfLength, halfThickness, -halfWidth);
    _boundsCorners[3].set(-halfLength, halfThickness, halfWidth);
    _boundsCorners[4].set(halfLength, -halfThickness, -halfWidth);
    _boundsCorners[5].set(halfLength, -halfThickness, halfWidth);
    _boundsCorners[6].set(halfLength, halfThickness, -halfWidth);
    _boundsCorners[7].set(halfLength, halfThickness, halfWidth);
  }

  _boundsPosition.set(part.position.x, part.position.y, part.position.z);

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;

  for (const corner of _boundsCorners) {
    corner.applyQuaternion(_boundsQuat);
    corner.add(_boundsPosition);
    minX = Math.min(minX, corner.x);
    maxX = Math.max(maxX, corner.x);
    minY = Math.min(minY, corner.y);
    maxY = Math.max(maxY, corner.y);
    minZ = Math.min(minZ, corner.z);
    maxZ = Math.max(maxZ, corner.z);
  }

  return {
    id: part.id,
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    centerZ: (minZ + maxZ) / 2
  };
}

// Inline-only path. Used by getPartBounds when a bundle is unexpectedly
// non-box (defensive fallback).
function getPartBoundsInline(part: Part): PartBounds {
  return getPartBounds(part);
}

/** Compute rotation matrix columns from Euler XYZ angles (degrees). */
function eulerToAxes(rotation: { x: number; y: number; z: number }): {
  ax0: number;
  ax1: number;
  ax2: number;
  ay0: number;
  ay1: number;
  ay2: number;
  az0: number;
  az1: number;
  az2: number;
} {
  const rx = (rotation.x * Math.PI) / 180;
  const ry = (rotation.y * Math.PI) / 180;
  const rz = (rotation.z * Math.PI) / 180;
  const c1 = Math.cos(rx),
    s1 = Math.sin(rx);
  const c2 = Math.cos(ry),
    s2 = Math.sin(ry);
  const c3 = Math.cos(rz),
    s3 = Math.sin(rz);
  // R = Rz(rz) * Ry(ry) * Rx(rx), columns = local axes in world space
  return {
    ax0: c2 * c3,
    ax1: c2 * s3,
    ax2: -s2,
    ay0: s1 * s2 * c3 - c1 * s3,
    ay1: s1 * s2 * s3 + c1 * c3,
    ay2: s1 * c2,
    az0: c1 * s2 * c3 + s1 * s3,
    az1: c1 * s2 * s3 - s1 * c3,
    az2: c1 * c2
  };
}

// Calculate bounds for a part at a hypothetical position (for live drag)
export function getPartBoundsAtPosition(
  part: Part,
  position: { x: number; y: number; z: number },
  geometryCache?: GeometryCache
): PartBounds {
  const tempPart = { ...part, position };
  return getPartBounds(tempPart, geometryCache);
}

export function getPartOBB(
  part: Part,
  position: { x: number; y: number; z: number } = part.position,
  geometryCache?: GeometryCache
): PartOBB {
  const { ax0, ax1, ax2, ay0, ay1, ay2, az0, az1, az2 } = eulerToAxes(part.rotation);

  // Feature-bearing parts use the feature-aware local bounding box so end
  // cuts, bevels, and through-cut notches shrink the OBB instead of leaving
  // ghost volume. Otherwise, ADR-009: half-extents come from the bundle when
  // a cache is provided (identical to the inline derivation for box parts).
  const hasFeatures = !!part.features && part.features.length > 0;
  let halfX: number;
  let halfY: number;
  let halfZ: number;
  // Local center offset (non-zero when features make the box asymmetric,
  // e.g. a bevel on only one end shifts the box center toward the other end)
  let lcx = 0;
  let lcy = 0;
  let lcz = 0;
  if (hasFeatures) {
    const localBox = getPartLocalBoundingBox(part);
    halfX = (localBox.max.x - localBox.min.x) / 2;
    halfY = (localBox.max.y - localBox.min.y) / 2;
    halfZ = (localBox.max.z - localBox.min.z) / 2;
    lcx = (localBox.min.x + localBox.max.x) / 2;
    lcy = (localBox.min.y + localBox.max.y) / 2;
    lcz = (localBox.min.z + localBox.max.z) / 2;
  } else if (geometryCache) {
    const bundle = geometryCache.get(part);
    halfX = bundle.bounds.localObb.halfExtents.x;
    halfY = bundle.bounds.localObb.halfExtents.y;
    halfZ = bundle.bounds.localObb.halfExtents.z;
  } else {
    halfX = part.length / 2;
    halfY = part.thickness / 2;
    halfZ = part.width / 2;
  }

  return {
    center: {
      x: position.x + ax0 * lcx + ay0 * lcy + az0 * lcz,
      y: position.y + ax1 * lcx + ay1 * lcy + az1 * lcz,
      z: position.z + ax2 * lcx + ay2 * lcy + az2 * lcz
    },
    axes: [
      { x: ax0, y: ax1, z: ax2 },
      { x: ay0, y: ay1, z: ay2 },
      { x: az0, y: az1, z: az2 }
    ],
    halfExtents: [halfX, halfY, halfZ]
  };
}

/**
 * Return one or more OBBs that tile the actual material of a part.
 * For simple boxes this returns a single OBB identical to getPartOBB().
 * For parts with through-depth corner/edge notches the L/U-shaped contour
 * is decomposed into axis-aligned sub-rectangles so the empty notch area
 * is excluded — preventing "ghost corner" overlap.
 */
export function getPartSubOBBs(part: Part, position: { x: number; y: number; z: number } = part.position): PartOBB[] {
  const subBoxes = getPartContourSubBoxes(part);

  if (subBoxes.length <= 1) {
    return [getPartOBB(part, position)];
  }

  const { ax0, ax1, ax2, ay0, ay1, ay2, az0, az1, az2 } = eulerToAxes(part.rotation);

  const halfThickness = part.thickness / 2;
  const axes: PartOBB['axes'] = [
    { x: ax0, y: ax1, z: ax2 },
    { x: ay0, y: ay1, z: ay2 },
    { x: az0, y: az1, z: az2 }
  ];

  // Negate contour Z to match the rotateX(-π/2) applied by the render geometry.
  return subBoxes.map((box) => ({
    center: {
      x: position.x + ax0 * box.centerX + az0 * -box.centerZ,
      y: position.y + ax1 * box.centerX + az1 * -box.centerZ,
      z: position.z + ax2 * box.centerX + az2 * -box.centerZ
    },
    axes,
    halfExtents: [box.halfX, halfThickness, box.halfZ] as [number, number, number]
  }));
}

export function obbsOverlap(
  a: PartOBB,
  b: PartOBB,
  epsilon = 1e-6,
  separationTolerance = 1e-8,
  touchingCountsAsOverlap = true
): boolean {
  const dot = (u: { x: number; y: number; z: number }, v: { x: number; y: number; z: number }) =>
    u.x * v.x + u.y * v.y + u.z * v.z;

  const R = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];
  // absRExact: no epsilon inflation — used for face axes where epsilon
  // would cause face-touching parts to falsely report overlap.
  const absRExact = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];
  // absR: epsilon-inflated — used only for cross-product axes to handle
  // near-parallel axis numerical instability.
  const absR = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];

  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      R[i][j] = dot(a.axes[i], b.axes[j]);
      absRExact[i][j] = Math.abs(R[i][j]);
      absR[i][j] = absRExact[i][j] + epsilon;
    }
  }

  const tWorld = {
    x: b.center.x - a.center.x,
    y: b.center.y - a.center.y,
    z: b.center.z - a.center.z
  };
  const t = [dot(tWorld, a.axes[0]), dot(tWorld, a.axes[1]), dot(tWorld, a.axes[2])];

  // Face axes of A — use exact absR (no epsilon inflation)
  for (let i = 0; i < 3; i += 1) {
    const ra = a.halfExtents[i];
    const rb =
      b.halfExtents[0] * absRExact[i][0] + b.halfExtents[1] * absRExact[i][1] + b.halfExtents[2] * absRExact[i][2];
    const proj = Math.abs(t[i]);
    const limit = ra + rb;
    if (touchingCountsAsOverlap) {
      if (proj > limit) return false;
    } else if (proj >= limit - separationTolerance) {
      return false;
    }
  }

  // Face axes of B — use exact absR (no epsilon inflation)
  for (let j = 0; j < 3; j += 1) {
    const ra =
      a.halfExtents[0] * absRExact[0][j] + a.halfExtents[1] * absRExact[1][j] + a.halfExtents[2] * absRExact[2][j];
    const rb = b.halfExtents[j];
    const proj = Math.abs(t[0] * R[0][j] + t[1] * R[1][j] + t[2] * R[2][j]);
    const limit = ra + rb;
    if (touchingCountsAsOverlap) {
      if (proj > limit) return false;
    } else if (proj >= limit - separationTolerance) {
      return false;
    }
  }

  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      const ra = a.halfExtents[(i + 1) % 3] * absR[(i + 2) % 3][j] + a.halfExtents[(i + 2) % 3] * absR[(i + 1) % 3][j];
      const rb = b.halfExtents[(j + 1) % 3] * absR[i][(j + 2) % 3] + b.halfExtents[(j + 2) % 3] * absR[i][(j + 1) % 3];
      const proj = Math.abs(t[(i + 2) % 3] * R[(i + 1) % 3][j] - t[(i + 1) % 3] * R[(i + 2) % 3][j]);
      const limit = ra + rb;
      if (touchingCountsAsOverlap) {
        if (proj > limit) return false;
      } else if (proj >= limit - separationTolerance) {
        return false;
      }
    }
  }

  return true;
}

export interface ConvexShape {
  /** World-space vertices of the convex hull. */
  vertices: Vec3[];
  /** Unique face normals in world space (used as SAT test axes). */
  normals: Vec3[];
}

/**
 * Build a world-space convex shape for a part.
 * The local convex vertices already account for end cuts (bevels etc.).
 */
export function getPartConvexShape(
  part: Part,
  position: { x: number; y: number; z: number } = part.position
): ConvexShape {
  _boundsEuler.set(
    (part.rotation.x * Math.PI) / 180,
    (part.rotation.y * Math.PI) / 180,
    (part.rotation.z * Math.PI) / 180,
    'XYZ'
  );
  _boundsQuat.setFromEuler(_boundsEuler);

  const qx = _boundsQuat.x;
  const qy = _boundsQuat.y;
  const qz = _boundsQuat.z;
  const qw = _boundsQuat.w;
  const xx = qx * qx;
  const yy = qy * qy;
  const zz = qz * qz;
  const xy = qx * qy;
  const xz = qx * qz;
  const yz = qy * qz;
  const wx = qw * qx;
  const wy = qw * qy;
  const wz = qw * qz;

  const r00 = 1 - 2 * (yy + zz);
  const r01 = 2 * (xy - wz);
  const r02 = 2 * (xz + wy);
  const r10 = 2 * (xy + wz);
  const r11 = 1 - 2 * (xx + zz);
  const r12 = 2 * (yz - wx);
  const r20 = 2 * (xz - wy);
  const r21 = 2 * (yz + wx);
  const r22 = 1 - 2 * (xx + yy);

  const localVerts = getPartLocalConvexVertices(part);

  // Transform vertices to world space
  const vertices: Vec3[] = localVerts.map((v) => ({
    x: position.x + r00 * v.x + r01 * v.y + r02 * v.z,
    y: position.y + r10 * v.x + r11 * v.y + r12 * v.z,
    z: position.z + r20 * v.x + r21 * v.y + r22 * v.z
  }));

  // Compute face normals from the convex hull faces.
  // For a beveled box the faces are: ±Y (top/bottom), ±Z (front/back),
  // the uncut end face, and 1-2 bevel faces. We derive normals from
  // the local box axes plus any bevel cut normals.
  const localNormals: Vec3[] = [
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 0, z: 1 }
  ];

  // Add bevel face normals by computing cross products of adjacent edge vectors
  // on the bevel face. For a left bevel the face lies on vertices where x is
  // adjusted by getEndCutInsetAt — the normal points in the -X direction with
  // a Y component. We compute it from the actual local vertices.
  addBevelNormals(localVerts, part, localNormals);

  // Rotate all normals into world space
  const normals: Vec3[] = localNormals.map((n) => ({
    x: r00 * n.x + r01 * n.y + r02 * n.z,
    y: r10 * n.x + r11 * n.y + r12 * n.z,
    z: r20 * n.x + r21 * n.y + r22 * n.z
  }));

  return { vertices, normals };
}

/** Detect bevel faces and add their normals to the list. */
function addBevelNormals(_localVerts: Vec3[], part: Part, normals: Vec3[]): void {
  const halfThickness = part.thickness / 2;
  const profiles = getPartEndCutProfiles(part);

  // For a left bevel: the face goes from (-halfLength, refY) to
  // (-halfLength + verticalInset, oppositeY). The face normal is
  // perpendicular to the bevel slope in the X-Y plane.
  if (profiles.left.verticalInset > 0) {
    // Bevel edge direction in local X-Y plane
    const dx = profiles.left.verticalInset; // inset along X
    const dy = 2 * halfThickness; // full thickness along Y
    // Normal is perpendicular: rotate 90° CW in X-Y → (dy, -dx) pointing outward (-X)
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 1e-9) {
      // The outward normal for the left end bevel points toward -X
      normals.push({ x: -dy / len, y: dx / len, z: 0 });
    }
  }

  if (profiles.right.verticalInset > 0) {
    const dx = profiles.right.verticalInset;
    const dy = 2 * halfThickness;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 1e-9) {
      // The outward normal for the right end bevel points toward +X
      normals.push({ x: dy / len, y: -dx / len, z: 0 });
    }
  }

  // For horizontal insets (mitres), the face normal has a Z component.
  // These are already handled by buildOuterContour adjusting the X-Z shape,
  // but we add explicit normals for the mitre faces for completeness.
  if (profiles.left.horizontalInset > 0) {
    const dx = profiles.left.horizontalInset;
    const dz = part.width;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 1e-9) {
      normals.push({ x: -dz / len, y: 0, z: dx / len });
    }
  }

  if (profiles.right.horizontalInset > 0) {
    const dx = profiles.right.horizontalInset;
    const dz = part.width;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 1e-9) {
      normals.push({ x: dz / len, y: 0, z: -dx / len });
    }
  }
}

/**
 * SAT overlap test for two convex polyhedra defined by their vertices and
 * face normals. Also tests cross-product axes from pairs of edge directions.
 *
 * Returns true when the shapes overlap (share interior volume).
 */
export function convexShapesOverlap(
  a: ConvexShape,
  b: ConvexShape,
  separationTolerance = 1e-8,
  touchingCountsAsOverlap = true
): boolean {
  // Collect all SAT test axes: face normals from both shapes
  // plus cross products of unique edge directions.
  const axes: Vec3[] = [...a.normals, ...b.normals];

  // Derive unique edge directions from each shape's vertices.
  const edgesA = convexEdgeDirections(a.vertices);
  const edgesB = convexEdgeDirections(b.vertices);

  // Cross-product axes
  for (const ea of edgesA) {
    for (const eb of edgesB) {
      const cx = ea.y * eb.z - ea.z * eb.y;
      const cy = ea.z * eb.x - ea.x * eb.z;
      const cz = ea.x * eb.y - ea.y * eb.x;
      const len2 = cx * cx + cy * cy + cz * cz;
      if (len2 > 1e-12) {
        const inv = 1 / Math.sqrt(len2);
        axes.push({ x: cx * inv, y: cy * inv, z: cz * inv });
      }
    }
  }

  for (const axis of axes) {
    let aMin = Infinity;
    let aMax = -Infinity;
    for (const v of a.vertices) {
      const d = v.x * axis.x + v.y * axis.y + v.z * axis.z;
      if (d < aMin) aMin = d;
      if (d > aMax) aMax = d;
    }

    let bMin = Infinity;
    let bMax = -Infinity;
    for (const v of b.vertices) {
      const d = v.x * axis.x + v.y * axis.y + v.z * axis.z;
      if (d < bMin) bMin = d;
      if (d > bMax) bMax = d;
    }

    const gap = Math.max(aMin - bMax, bMin - aMax);
    if (touchingCountsAsOverlap) {
      if (gap > 0) return false;
    } else {
      if (gap >= -separationTolerance) return false;
    }
  }

  return true;
}

/** Extract unique edge directions (normalized) from a convex vertex set. */
function convexEdgeDirections(vertices: Vec3[]): Vec3[] {
  const n = vertices.length;
  const dirs: Vec3[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      let dx = vertices[j].x - vertices[i].x;
      let dy = vertices[j].y - vertices[i].y;
      let dz = vertices[j].z - vertices[i].z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len < 1e-9) continue;
      dx /= len;
      dy /= len;
      dz /= len;
      // Canonical direction (ensure first non-zero component is positive)
      if (
        dx < -1e-9 ||
        (Math.abs(dx) < 1e-9 && dy < -1e-9) ||
        (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9 && dz < -1e-9)
      ) {
        dx = -dx;
        dy = -dy;
        dz = -dz;
      }
      const key = `${dx.toFixed(6)},${dy.toFixed(6)},${dz.toFixed(6)}`;
      if (!seen.has(key)) {
        seen.add(key);
        dirs.push({ x: dx, y: dy, z: dz });
      }
    }
  }

  return dirs;
}

// Calculate combined bounding box for multiple parts.
// ADR-009: opt-in bundle path threaded through `getPartBounds`.
export function getCombinedBounds(parts: Part[], geometryCache?: GeometryCache): PartBounds {
  if (parts.length === 0) {
    return {
      id: 'empty',
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      minZ: 0,
      maxZ: 0,
      centerX: 0,
      centerY: 0,
      centerZ: 0
    };
  }

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;

  for (const part of parts) {
    const bounds = getPartBounds(part, geometryCache);
    minX = Math.min(minX, bounds.minX);
    maxX = Math.max(maxX, bounds.maxX);
    minY = Math.min(minY, bounds.minY);
    maxY = Math.max(maxY, bounds.maxY);
    minZ = Math.min(minZ, bounds.minZ);
    maxZ = Math.max(maxZ, bounds.maxZ);
  }

  return {
    id: parts.length === 1 ? parts[0].id : 'group',
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    centerZ: (minZ + maxZ) / 2
  };
}

// Calculate combined bounding box for parts at adjusted positions
export function getCombinedBoundsAtPosition(
  parts: Part[],
  delta: { x: number; y: number; z: number },
  geometryCache?: GeometryCache
): PartBounds {
  if (parts.length === 0) {
    return {
      id: 'empty',
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      minZ: 0,
      maxZ: 0,
      centerX: 0,
      centerY: 0,
      centerZ: 0
    };
  }

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;

  for (const part of parts) {
    const adjustedPart = {
      ...part,
      position: {
        x: part.position.x + delta.x,
        y: part.position.y + delta.y,
        z: part.position.z + delta.z
      }
    };
    const bounds = getPartBounds(adjustedPart, geometryCache);
    minX = Math.min(minX, bounds.minX);
    maxX = Math.max(maxX, bounds.maxX);
    minY = Math.min(minY, bounds.minY);
    maxY = Math.max(maxY, bounds.maxY);
    minZ = Math.min(minZ, bounds.minZ);
    maxZ = Math.max(maxZ, bounds.maxZ);
  }

  return {
    id: parts.length === 1 ? parts[0].id : 'group',
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    centerZ: (minZ + maxZ) / 2
  };
}

// Helper to create an axis-aligned indicator line
// IMPORTANT: value1 is from the selected part, value2 is from the reference part.
// We preserve this order in start/end so movement direction can be calculated correctly.
function createAxisAlignedIndicator(
  id: string,
  axis: 'x' | 'y' | 'z',
  type: 'edge-to-edge' | 'edge-offset',
  fromPartId: string,
  toPartId: string,
  selectedValue: number, // Edge position of the selected part
  referenceValue: number, // Edge position of the reference part
  perpPos1: number, // Position on first perpendicular axis
  perpPos2: number, // Position on second perpendicular axis
  labelOffset: number = 0.5
): ReferenceDistanceIndicator {
  const distance = Math.abs(referenceValue - selectedValue);
  const midVal = (selectedValue + referenceValue) / 2;

  let start: { x: number; y: number; z: number };
  let end: { x: number; y: number; z: number };
  let labelPosition: { x: number; y: number; z: number };

  // start = selected part's edge, end = reference part's edge
  // This preserves the relationship for calculating movement direction
  switch (axis) {
    case 'x':
      start = { x: selectedValue, y: perpPos1, z: perpPos2 };
      end = { x: referenceValue, y: perpPos1, z: perpPos2 };
      labelPosition = { x: midVal, y: perpPos1 + labelOffset, z: perpPos2 };
      break;
    case 'y':
      start = { x: perpPos1, y: selectedValue, z: perpPos2 };
      end = { x: perpPos1, y: referenceValue, z: perpPos2 };
      labelPosition = { x: perpPos1 + labelOffset, y: midVal, z: perpPos2 };
      break;
    case 'z':
      start = { x: perpPos1, y: perpPos2, z: selectedValue };
      end = { x: perpPos1, y: perpPos2, z: referenceValue };
      labelPosition = { x: perpPos1, y: perpPos2 + labelOffset, z: midVal };
      break;
  }

  return {
    id,
    axis,
    type,
    fromPartId,
    toPartId,
    start,
    end,
    distance,
    labelPosition
  };
}

// Calculate clean distance indicators between selected parts and reference parts
// Shows only meaningful distances: gaps between closest edges and edge alignment offsets
export function calculateReferenceDistances(
  draggingPart: Part,
  draggingPosition: { x: number; y: number; z: number },
  referenceParts: Part[]
): ReferenceDistanceIndicator[] {
  const draggingBounds = getPartBoundsAtPosition(draggingPart, draggingPosition);
  return calculateDistancesFromBounds(draggingBounds, draggingPart.id, referenceParts);
}

// Core function to calculate distances from bounds to reference parts
export function calculateDistancesFromBounds(
  selectedBounds: PartBounds,
  fromPartId: string,
  referenceParts: Part[]
): ReferenceDistanceIndicator[] {
  const indicators: ReferenceDistanceIndicator[] = [];

  // Get combined bounds of all reference parts (treat as one unit)
  const refBounds = getCombinedBounds(referenceParts);
  const toPartId = referenceParts.length === 1 ? referenceParts[0].id : 'reference-group';

  // For each axis, determine the relationship and show appropriate indicators
  for (const axis of ['x', 'y', 'z'] as const) {
    const minKey = `min${axis.toUpperCase()}` as 'minX' | 'minY' | 'minZ';
    const maxKey = `max${axis.toUpperCase()}` as 'maxX' | 'maxY' | 'maxZ';

    // Get perpendicular axis positions for drawing the line
    // Use the average position on perpendicular axes where the parts are closest
    const perpAxes = (['x', 'y', 'z'] as const).filter((a) => a !== axis);
    const perp1Key = `center${perpAxes[0].toUpperCase()}` as 'centerX' | 'centerY' | 'centerZ';
    const perp2Key = `center${perpAxes[1].toUpperCase()}` as 'centerX' | 'centerY' | 'centerZ';
    const perpPos1 = (selectedBounds[perp1Key] + refBounds[perp1Key]) / 2;
    const perpPos2 = (selectedBounds[perp2Key] + refBounds[perp2Key]) / 2;

    // Check if parts are separated on this axis (gap exists)
    if (selectedBounds[maxKey] < refBounds[minKey]) {
      // Selected part is entirely before reference - show gap
      const gap = refBounds[minKey] - selectedBounds[maxKey];
      if (gap > 0.001) {
        indicators.push(
          createAxisAlignedIndicator(
            `gap-${axis}-${fromPartId}-${toPartId}`,
            axis,
            'edge-to-edge',
            fromPartId,
            toPartId,
            selectedBounds[maxKey],
            refBounds[minKey],
            perpPos1,
            perpPos2
          )
        );
      }
    } else if (selectedBounds[minKey] > refBounds[maxKey]) {
      // Selected part is entirely after reference - show gap
      const gap = selectedBounds[minKey] - refBounds[maxKey];
      if (gap > 0.001) {
        indicators.push(
          createAxisAlignedIndicator(
            `gap-${axis}-${fromPartId}-${toPartId}`,
            axis,
            'edge-to-edge',
            fromPartId,
            toPartId,
            selectedBounds[minKey],
            refBounds[maxKey],
            perpPos1,
            perpPos2
          )
        );
      }
    } else {
      // Parts overlap on this axis - show edge alignment offsets
      // Show offset between corresponding edges (min-to-min, max-to-max)

      // Min edge offset (e.g., left-to-left, bottom-to-bottom, back-to-back)
      const minOffset = Math.abs(selectedBounds[minKey] - refBounds[minKey]);
      if (minOffset > 0.001) {
        // Position the line at the outer edge of the parts
        const linePerp1 =
          axis === 'x'
            ? Math.min(selectedBounds.minY, refBounds.minY) - 1
            : axis === 'y'
              ? Math.max(selectedBounds.maxX, refBounds.maxX) + 1
              : Math.min(selectedBounds.minY, refBounds.minY) - 1;
        const linePerp2 =
          axis === 'x'
            ? Math.min(selectedBounds.minZ, refBounds.minZ) - 1
            : axis === 'y'
              ? (selectedBounds.centerZ + refBounds.centerZ) / 2
              : Math.min(selectedBounds.minX, refBounds.minX) - 1;

        indicators.push(
          createAxisAlignedIndicator(
            `offset-min-${axis}-${fromPartId}-${toPartId}`,
            axis,
            'edge-offset',
            fromPartId,
            toPartId,
            selectedBounds[minKey],
            refBounds[minKey],
            linePerp1,
            linePerp2
          )
        );
      }

      // Max edge offset (e.g., right-to-right, top-to-top, front-to-front)
      const maxOffset = Math.abs(selectedBounds[maxKey] - refBounds[maxKey]);
      if (maxOffset > 0.001) {
        // Position the line at the outer edge of the parts
        const linePerp1 =
          axis === 'x'
            ? Math.max(selectedBounds.maxY, refBounds.maxY) + 1
            : axis === 'y'
              ? Math.max(selectedBounds.maxX, refBounds.maxX) + 1
              : Math.max(selectedBounds.maxY, refBounds.maxY) + 1;
        const linePerp2 =
          axis === 'x'
            ? Math.max(selectedBounds.maxZ, refBounds.maxZ) + 1
            : axis === 'y'
              ? (selectedBounds.centerZ + refBounds.centerZ) / 2
              : Math.max(selectedBounds.maxX, refBounds.maxX) + 1;

        indicators.push(
          createAxisAlignedIndicator(
            `offset-max-${axis}-${fromPartId}-${toPartId}`,
            axis,
            'edge-offset',
            fromPartId,
            toPartId,
            selectedBounds[maxKey],
            refBounds[maxKey],
            linePerp1,
            linePerp2
          )
        );
      }
    }
  }

  return indicators;
}

// Calculate distance indicators from multiple dragging parts (as a group) to reference parts
export function calculateGroupReferenceDistances(
  draggingParts: Part[],
  dragDelta: { x: number; y: number; z: number },
  referenceParts: Part[]
): ReferenceDistanceIndicator[] {
  if (draggingParts.length === 0) return [];

  // Calculate combined bounds of all dragging parts with delta applied
  const selectedBounds = getCombinedBoundsAtPosition(draggingParts, dragDelta);
  const fromPartId = draggingParts.length === 1 ? draggingParts[0].id : 'selected-group';

  return calculateDistancesFromBounds(selectedBounds, fromPartId, referenceParts);
}

// For arbitrarily rotated contexts, show a single direction-aware vector distance between selected/reference centers.
export function calculateVectorReferenceDistance(
  selectedParts: Part[],
  referenceParts: Part[],
  fromPartId: string,
  toPartId: string
): ReferenceDistanceIndicator[] {
  if (selectedParts.length === 0 || referenceParts.length === 0) return [];
  const selectedBounds = getCombinedBounds(selectedParts);
  const referenceBounds = getCombinedBounds(referenceParts);
  const start = { x: selectedBounds.centerX, y: selectedBounds.centerY, z: selectedBounds.centerZ };
  const end = { x: referenceBounds.centerX, y: referenceBounds.centerY, z: referenceBounds.centerZ };
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (distance < 1e-6) return [];
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const az = Math.abs(dz);
  const axis: 'x' | 'y' | 'z' = ax >= ay && ax >= az ? 'x' : ay >= az ? 'y' : 'z';
  return [
    {
      id: `vector-${fromPartId}-${toPartId}`,
      axis,
      type: 'edge-to-edge',
      fromPartId,
      toPartId,
      start,
      end,
      distance,
      labelPosition: {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2 + 0.5,
        z: (start.z + end.z) / 2
      }
    }
  ];
}

// Find the N nearest parts to the dragging part
export function getNearestParts(
  draggingBounds: PartBounds,
  allParts: Part[],
  draggingPartIds: string[],
  maxParts: number = 10,
  geometryCache?: GeometryCache
): Part[] {
  // Filter out the parts being dragged
  const otherParts = allParts.filter((p) => !draggingPartIds.includes(p.id));

  // Calculate distances and sort.
  // Prefer true box-to-box gap over center distance so large pieces with nearby faces are not missed.
  const partsWithDistance = otherParts.map((part) => {
    const bounds = getPartBounds(part, geometryCache);
    const gapX =
      draggingBounds.maxX < bounds.minX
        ? bounds.minX - draggingBounds.maxX
        : bounds.maxX < draggingBounds.minX
          ? draggingBounds.minX - bounds.maxX
          : 0;
    const gapY =
      draggingBounds.maxY < bounds.minY
        ? bounds.minY - draggingBounds.maxY
        : bounds.maxY < draggingBounds.minY
          ? draggingBounds.minY - bounds.maxY
          : 0;
    const gapZ =
      draggingBounds.maxZ < bounds.minZ
        ? bounds.minZ - draggingBounds.maxZ
        : bounds.maxZ < draggingBounds.minZ
          ? draggingBounds.minZ - bounds.maxZ
          : 0;
    const distance = Math.sqrt(gapX * gapX + gapY * gapY + gapZ * gapZ);

    const centerDx = bounds.centerX - draggingBounds.centerX;
    const centerDy = bounds.centerY - draggingBounds.centerY;
    const centerDz = bounds.centerZ - draggingBounds.centerZ;
    const centerDistance = Math.sqrt(centerDx * centerDx + centerDy * centerDy + centerDz * centerDz);
    return { part, distance, centerDistance };
  });

  // Sort by box gap first, then center distance as a deterministic tie-breaker.
  partsWithDistance.sort((a, b) => a.distance - b.distance || a.centerDistance - b.centerDistance);
  return partsWithDistance.slice(0, maxParts).map((p) => p.part);
}

// Check for snaps on a single axis
function checkAxisSnaps(
  draggingMin: number,
  draggingMax: number,
  draggingCenter: number,
  targetBounds: PartBounds[],
  axis: 'x' | 'y' | 'z',
  threshold: number
): AxisSnap | null {
  const getAxisValues = (bounds: PartBounds) => {
    switch (axis) {
      case 'x':
        return { min: bounds.minX, max: bounds.maxX, center: bounds.centerX };
      case 'y':
        return { min: bounds.minY, max: bounds.maxY, center: bounds.centerY };
      case 'z':
        return { min: bounds.minZ, max: bounds.maxZ, center: bounds.centerZ };
    }
  };

  let bestSnap: AxisSnap | null = null;
  let bestDistance = threshold;

  for (const target of targetBounds) {
    const targetValues = getAxisValues(target);

    // Edge-to-edge snaps
    const edgeSnaps = [
      // Dragging min edge aligns with target min edge
      { delta: targetValues.min - draggingMin, value: targetValues.min, type: 'edge' as const },
      // Dragging min edge aligns with target max edge
      { delta: targetValues.max - draggingMin, value: targetValues.max, type: 'edge' as const },
      // Dragging max edge aligns with target min edge
      { delta: targetValues.min - draggingMax, value: targetValues.min, type: 'edge' as const },
      // Dragging max edge aligns with target max edge
      { delta: targetValues.max - draggingMax, value: targetValues.max, type: 'edge' as const }
    ];

    // Center-to-center snap
    const centerSnap = {
      delta: targetValues.center - draggingCenter,
      value: targetValues.center,
      type: 'center' as const
    };

    // Check all snaps
    for (const snap of [...edgeSnaps, centerSnap]) {
      const distance = Math.abs(snap.delta);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestSnap = {
          snapped: true,
          value: snap.value,
          delta: snap.delta,
          type: snap.type,
          targetPartId: target.id
        };
      }
    }
  }

  return bestSnap;
}

// Check for equal spacing snaps on a given axis
// Finds pairs of parts where the dragging part can be positioned with equal gaps on both sides
function checkEqualSpacingSnaps(
  draggingBounds: PartBounds,
  targetBounds: PartBounds[],
  axis: 'x' | 'y' | 'z',
  threshold: number
): EqualSpacingSnap | null {
  if (targetBounds.length < 2) return null;

  const getAxisValues = (bounds: PartBounds) => {
    switch (axis) {
      case 'x':
        return { min: bounds.minX, max: bounds.maxX, center: bounds.centerX, size: bounds.maxX - bounds.minX };
      case 'y':
        return { min: bounds.minY, max: bounds.maxY, center: bounds.centerY, size: bounds.maxY - bounds.minY };
      case 'z':
        return { min: bounds.minZ, max: bounds.maxZ, center: bounds.centerZ, size: bounds.maxZ - bounds.minZ };
    }
  };

  const draggingValues = getAxisValues(draggingBounds);
  const draggingSize = draggingValues.size;

  let bestSnap: EqualSpacingSnap | null = null;
  let bestDistance = threshold;

  // Check all pairs of target parts
  for (let i = 0; i < targetBounds.length; i++) {
    for (let j = i + 1; j < targetBounds.length; j++) {
      const bounds1 = targetBounds[i];
      const bounds2 = targetBounds[j];
      const values1 = getAxisValues(bounds1);
      const values2 = getAxisValues(bounds2);

      // Determine which part is "left" (lower coord) and which is "right" (higher coord)
      const [leftBounds, rightBounds, leftValues, rightValues] =
        values1.center < values2.center ? [bounds1, bounds2, values1, values2] : [bounds2, bounds1, values2, values1];

      // Calculate the gap between the two parts
      const totalGapSpace = rightValues.min - leftValues.max;

      // Skip if parts overlap or gap is too small for the dragging part
      if (totalGapSpace < draggingSize) continue;

      // Calculate where the dragging part center needs to be for equal spacing
      // equalGap = (totalGapSpace - draggingSize) / 2
      // dragging part min should be at: leftValues.max + equalGap
      // dragging part center should be at: leftValues.max + equalGap + (draggingSize / 2)
      const equalGap = (totalGapSpace - draggingSize) / 2;
      const targetCenter = leftValues.max + equalGap + draggingSize / 2;
      const delta = targetCenter - draggingValues.center;
      const distance = Math.abs(delta);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestSnap = {
          snapped: true,
          axis,
          delta,
          equalGap,
          part1Id: leftBounds.id,
          part2Id: rightBounds.id,
          part1Bounds: leftBounds,
          part2Bounds: rightBounds
        };
      }
    }
  }

  return bestSnap;
}

// Create distance indicators for a snap
// Shows distances from the dragging part to edges of the target part
function createDistanceIndicators(
  axis: 'x' | 'y' | 'z',
  type: 'edge' | 'center',
  draggingBounds: PartBounds,
  targetBounds: PartBounds
): SnapDistanceIndicator[] {
  const indicators: SnapDistanceIndicator[] = [];
  const LABEL_OFFSET = 0.5; // Offset for label visibility

  // For center snaps, show distance from dragging part to both edges of target
  if (type === 'center') {
    switch (axis) {
      case 'x': {
        // Distance from dragging part's min/max X to target's min/max X
        const distToMinEdge = draggingBounds.minX - targetBounds.minX;
        const distToMaxEdge = targetBounds.maxX - draggingBounds.maxX;
        const y = Math.max(draggingBounds.maxY, targetBounds.maxY) + LABEL_OFFSET;
        const z = (draggingBounds.centerZ + targetBounds.centerZ) / 2;

        if (distToMinEdge > 0.01) {
          indicators.push({
            start: { x: targetBounds.minX, y, z },
            end: { x: draggingBounds.minX, y, z },
            distance: distToMinEdge,
            labelPosition: { x: (targetBounds.minX + draggingBounds.minX) / 2, y: y + LABEL_OFFSET, z }
          });
        }
        if (distToMaxEdge > 0.01) {
          indicators.push({
            start: { x: draggingBounds.maxX, y, z },
            end: { x: targetBounds.maxX, y, z },
            distance: distToMaxEdge,
            labelPosition: { x: (draggingBounds.maxX + targetBounds.maxX) / 2, y: y + LABEL_OFFSET, z }
          });
        }
        break;
      }
      case 'y': {
        // Distance from dragging part's min/max Y to target's min/max Y
        const distToMinEdge = draggingBounds.minY - targetBounds.minY;
        const distToMaxEdge = targetBounds.maxY - draggingBounds.maxY;
        const x = Math.max(draggingBounds.maxX, targetBounds.maxX) + LABEL_OFFSET;
        const z = (draggingBounds.centerZ + targetBounds.centerZ) / 2;

        if (distToMinEdge > 0.01) {
          indicators.push({
            start: { x, y: targetBounds.minY, z },
            end: { x, y: draggingBounds.minY, z },
            distance: distToMinEdge,
            labelPosition: { x: x + LABEL_OFFSET, y: (targetBounds.minY + draggingBounds.minY) / 2, z }
          });
        }
        if (distToMaxEdge > 0.01) {
          indicators.push({
            start: { x, y: draggingBounds.maxY, z },
            end: { x, y: targetBounds.maxY, z },
            distance: distToMaxEdge,
            labelPosition: { x: x + LABEL_OFFSET, y: (draggingBounds.maxY + targetBounds.maxY) / 2, z }
          });
        }
        break;
      }
      case 'z': {
        // Distance from dragging part's min/max Z to target's min/max Z
        const distToMinEdge = draggingBounds.minZ - targetBounds.minZ;
        const distToMaxEdge = targetBounds.maxZ - draggingBounds.maxZ;
        const x = (draggingBounds.centerX + targetBounds.centerX) / 2;
        const y = Math.max(draggingBounds.maxY, targetBounds.maxY) + LABEL_OFFSET;

        if (distToMinEdge > 0.01) {
          indicators.push({
            start: { x, y, z: targetBounds.minZ },
            end: { x, y, z: draggingBounds.minZ },
            distance: distToMinEdge,
            labelPosition: { x, y: y + LABEL_OFFSET, z: (targetBounds.minZ + draggingBounds.minZ) / 2 }
          });
        }
        if (distToMaxEdge > 0.01) {
          indicators.push({
            start: { x, y, z: draggingBounds.maxZ },
            end: { x, y, z: targetBounds.maxZ },
            distance: distToMaxEdge,
            labelPosition: { x, y: y + LABEL_OFFSET, z: (draggingBounds.maxZ + targetBounds.maxZ) / 2 }
          });
        }
        break;
      }
    }
  } else {
    // For edge snaps, show the gap or overlap between parts on perpendicular axes
    // This helps show how far the dragged part extends beyond or falls short of the target
    switch (axis) {
      case 'x': {
        // When X edges are aligned, show Z distances (how far apart or overlapping in Z)
        const y = Math.max(draggingBounds.maxY, targetBounds.maxY) + LABEL_OFFSET;

        // Distance from dragging part's edge to target's near/far Z edges
        if (draggingBounds.maxZ < targetBounds.minZ || draggingBounds.minZ > targetBounds.maxZ) {
          // Parts don't overlap in Z - show the gap
          const gap =
            draggingBounds.maxZ < targetBounds.minZ
              ? targetBounds.minZ - draggingBounds.maxZ
              : draggingBounds.minZ - targetBounds.maxZ;
          const zStart = draggingBounds.maxZ < targetBounds.minZ ? draggingBounds.maxZ : targetBounds.maxZ;
          const zEnd = draggingBounds.maxZ < targetBounds.minZ ? targetBounds.minZ : draggingBounds.minZ;
          const x = (draggingBounds.centerX + targetBounds.centerX) / 2;

          if (gap > 0.01) {
            indicators.push({
              start: { x, y, z: zStart },
              end: { x, y, z: zEnd },
              distance: gap,
              labelPosition: { x, y: y + LABEL_OFFSET, z: (zStart + zEnd) / 2 }
            });
          }
        }
        break;
      }
      case 'z': {
        // When Z edges are aligned, show X distances
        const y = Math.max(draggingBounds.maxY, targetBounds.maxY) + LABEL_OFFSET;

        if (draggingBounds.maxX < targetBounds.minX || draggingBounds.minX > targetBounds.maxX) {
          // Parts don't overlap in X - show the gap
          const gap =
            draggingBounds.maxX < targetBounds.minX
              ? targetBounds.minX - draggingBounds.maxX
              : draggingBounds.minX - targetBounds.maxX;
          const xStart = draggingBounds.maxX < targetBounds.minX ? draggingBounds.maxX : targetBounds.maxX;
          const xEnd = draggingBounds.maxX < targetBounds.minX ? targetBounds.minX : draggingBounds.minX;
          const z = (draggingBounds.centerZ + targetBounds.centerZ) / 2;

          if (gap > 0.01) {
            indicators.push({
              start: { x: xStart, y, z },
              end: { x: xEnd, y, z },
              distance: gap,
              labelPosition: { x: (xStart + xEnd) / 2, y: y + LABEL_OFFSET, z }
            });
          }
        }
        break;
      }
      // Y edge snaps don't typically need distance indicators
    }
  }

  return indicators;
}

// Create alignment line for visualization
function createSnapLine(
  axis: 'x' | 'y' | 'z',
  snapValue: number,
  type: 'edge' | 'center',
  draggingBounds: PartBounds,
  targetBounds: PartBounds
): SnapLine {
  // Create a line that spans between the dragging part and target part
  // The line extends along the perpendicular axes

  const LINE_EXTENSION = 20; // How far to extend the line beyond the parts

  // Calculate distance indicators
  const distanceIndicators = createDistanceIndicators(axis, type, draggingBounds, targetBounds);

  switch (axis) {
    case 'x': {
      // Line along Y and Z at the snap X value
      const minZ = Math.min(draggingBounds.minZ, targetBounds.minZ) - LINE_EXTENSION;
      const maxZ = Math.max(draggingBounds.maxZ, targetBounds.maxZ) + LINE_EXTENSION;
      const avgY = (draggingBounds.centerY + targetBounds.centerY) / 2;
      return {
        axis: 'x',
        type,
        family: 'axis',
        state: 'winner',
        start: { x: snapValue, y: avgY, z: minZ },
        end: { x: snapValue, y: avgY, z: maxZ },
        snapValue,
        distanceIndicators: distanceIndicators.length > 0 ? distanceIndicators : undefined
      };
    }
    case 'y': {
      // Line along X at the snap Y value
      const minX = Math.min(draggingBounds.minX, targetBounds.minX) - LINE_EXTENSION;
      const maxX = Math.max(draggingBounds.maxX, targetBounds.maxX) + LINE_EXTENSION;
      const avgZ = (draggingBounds.centerZ + targetBounds.centerZ) / 2;
      return {
        axis: 'y',
        type,
        family: 'axis',
        state: 'winner',
        start: { x: minX, y: snapValue, z: avgZ },
        end: { x: maxX, y: snapValue, z: avgZ },
        snapValue,
        distanceIndicators: distanceIndicators.length > 0 ? distanceIndicators : undefined
      };
    }
    case 'z': {
      // Line along X at the snap Z value
      const minX = Math.min(draggingBounds.minX, targetBounds.minX) - LINE_EXTENSION;
      const maxX = Math.max(draggingBounds.maxX, targetBounds.maxX) + LINE_EXTENSION;
      const avgY = (draggingBounds.centerY + targetBounds.centerY) / 2;
      return {
        axis: 'z',
        type,
        family: 'axis',
        state: 'winner',
        start: { x: minX, y: avgY, z: snapValue },
        end: { x: maxX, y: avgY, z: snapValue },
        snapValue,
        distanceIndicators: distanceIndicators.length > 0 ? distanceIndicators : undefined
      };
    }
  }
}

// Create snap lines for equal spacing visualization
function createEqualSpacingSnapLines(
  axis: 'x' | 'y' | 'z',
  equalGap: number,
  draggingBounds: PartBounds,
  part1Bounds: PartBounds,
  part2Bounds: PartBounds
): SnapLine[] {
  const snapLines: SnapLine[] = [];
  const LABEL_OFFSET = 0.5;

  // Determine which part is left and which is right
  const getAxisCenter = (bounds: PartBounds) => {
    switch (axis) {
      case 'x':
        return bounds.centerX;
      case 'y':
        return bounds.centerY;
      case 'z':
        return bounds.centerZ;
    }
  };

  const [leftBounds, rightBounds] =
    getAxisCenter(part1Bounds) < getAxisCenter(part2Bounds) ? [part1Bounds, part2Bounds] : [part2Bounds, part1Bounds];

  // Create distance indicators for both gaps
  const indicators: SnapDistanceIndicator[] = [];

  switch (axis) {
    case 'x': {
      const y = Math.max(draggingBounds.maxY, leftBounds.maxY, rightBounds.maxY) + LABEL_OFFSET;
      const z = (draggingBounds.centerZ + leftBounds.centerZ + rightBounds.centerZ) / 3;

      // Left gap indicator (from left part's max to dragging part's min)
      indicators.push({
        start: { x: leftBounds.maxX, y, z },
        end: { x: draggingBounds.minX, y, z },
        distance: equalGap,
        labelPosition: { x: (leftBounds.maxX + draggingBounds.minX) / 2, y: y + LABEL_OFFSET, z }
      });

      // Right gap indicator (from dragging part's max to right part's min)
      indicators.push({
        start: { x: draggingBounds.maxX, y, z },
        end: { x: rightBounds.minX, y, z },
        distance: equalGap,
        labelPosition: { x: (draggingBounds.maxX + rightBounds.minX) / 2, y: y + LABEL_OFFSET, z }
      });

      // Create the snap line at the center of the dragging part
      const minZ = Math.min(draggingBounds.minZ, leftBounds.minZ, rightBounds.minZ) - 5;
      const maxZ = Math.max(draggingBounds.maxZ, leftBounds.maxZ, rightBounds.maxZ) + 5;
      snapLines.push({
        axis: 'x',
        type: 'equal-spacing',
        family: 'equal-spacing',
        state: 'winner',
        start: { x: draggingBounds.centerX, y, z: minZ },
        end: { x: draggingBounds.centerX, y, z: maxZ },
        snapValue: draggingBounds.centerX,
        distanceIndicators: indicators
      });
      break;
    }
    case 'y': {
      const x = Math.max(draggingBounds.maxX, leftBounds.maxX, rightBounds.maxX) + LABEL_OFFSET;
      const z = (draggingBounds.centerZ + leftBounds.centerZ + rightBounds.centerZ) / 3;

      // Bottom gap indicator
      indicators.push({
        start: { x, y: leftBounds.maxY, z },
        end: { x, y: draggingBounds.minY, z },
        distance: equalGap,
        labelPosition: { x: x + LABEL_OFFSET, y: (leftBounds.maxY + draggingBounds.minY) / 2, z }
      });

      // Top gap indicator
      indicators.push({
        start: { x, y: draggingBounds.maxY, z },
        end: { x, y: rightBounds.minY, z },
        distance: equalGap,
        labelPosition: { x: x + LABEL_OFFSET, y: (draggingBounds.maxY + rightBounds.minY) / 2, z }
      });

      // Create the snap line at the center of the dragging part
      const minX = Math.min(draggingBounds.minX, leftBounds.minX, rightBounds.minX) - 5;
      const maxX = Math.max(draggingBounds.maxX, leftBounds.maxX, rightBounds.maxX) + 5;
      snapLines.push({
        axis: 'y',
        type: 'equal-spacing',
        family: 'equal-spacing',
        state: 'winner',
        start: { x: minX, y: draggingBounds.centerY, z },
        end: { x: maxX, y: draggingBounds.centerY, z },
        snapValue: draggingBounds.centerY,
        distanceIndicators: indicators
      });
      break;
    }
    case 'z': {
      const x = (draggingBounds.centerX + leftBounds.centerX + rightBounds.centerX) / 3;
      const y = Math.max(draggingBounds.maxY, leftBounds.maxY, rightBounds.maxY) + LABEL_OFFSET;

      // Front gap indicator
      indicators.push({
        start: { x, y, z: leftBounds.maxZ },
        end: { x, y, z: draggingBounds.minZ },
        distance: equalGap,
        labelPosition: { x, y: y + LABEL_OFFSET, z: (leftBounds.maxZ + draggingBounds.minZ) / 2 }
      });

      // Back gap indicator
      indicators.push({
        start: { x, y, z: draggingBounds.maxZ },
        end: { x, y, z: rightBounds.minZ },
        distance: equalGap,
        labelPosition: { x, y: y + LABEL_OFFSET, z: (draggingBounds.maxZ + rightBounds.minZ) / 2 }
      });

      // Create the snap line at the center of the dragging part
      const minX = Math.min(draggingBounds.minX, leftBounds.minX, rightBounds.minX) - 5;
      const maxX = Math.max(draggingBounds.maxX, leftBounds.maxX, rightBounds.maxX) + 5;
      snapLines.push({
        axis: 'z',
        type: 'equal-spacing',
        family: 'equal-spacing',
        state: 'winner',
        start: { x: minX, y, z: draggingBounds.centerZ },
        end: { x: maxX, y, z: draggingBounds.centerZ },
        snapValue: draggingBounds.centerZ,
        distanceIndicators: indicators
      });
      break;
    }
  }

  return snapLines;
}

// Main snap detection function
export function detectSnaps(
  draggingPart: Part,
  currentPosition: { x: number; y: number; z: number },
  allParts: Part[],
  draggingPartIds: string[],
  snapThreshold: number = 0.5, // Default threshold in inches
  geometryCache?: GeometryCache
): SnapResult {
  // Get bounds of dragging part at current position
  const draggingBounds = getPartBoundsAtPosition(draggingPart, currentPosition, geometryCache);

  // Find nearest parts to check for snaps
  const nearestParts = getNearestParts(draggingBounds, allParts, draggingPartIds, 10, geometryCache);

  // Get bounds for all target parts
  const targetBounds = nearestParts.map((p) => getPartBounds(p, geometryCache));

  // Check for snaps on each axis
  const xSnap = checkAxisSnaps(
    draggingBounds.minX,
    draggingBounds.maxX,
    draggingBounds.centerX,
    targetBounds,
    'x',
    snapThreshold
  );
  const ySnap = checkAxisSnaps(
    draggingBounds.minY,
    draggingBounds.maxY,
    draggingBounds.centerY,
    targetBounds,
    'y',
    snapThreshold
  );
  const zSnap = checkAxisSnaps(
    draggingBounds.minZ,
    draggingBounds.maxZ,
    draggingBounds.centerZ,
    targetBounds,
    'z',
    snapThreshold
  );

  // Check for equal spacing snaps (with slightly larger threshold to catch them)
  const equalSpacingThreshold = snapThreshold * 1.5;
  const xEqualSnap = checkEqualSpacingSnaps(draggingBounds, targetBounds, 'x', equalSpacingThreshold);
  const yEqualSnap = checkEqualSpacingSnaps(draggingBounds, targetBounds, 'y', equalSpacingThreshold);
  const zEqualSnap = checkEqualSpacingSnaps(draggingBounds, targetBounds, 'z', equalSpacingThreshold);

  // Determine which snap to use for each axis
  // Edge/center snaps take priority if they're closer, but equal spacing can win if edge/center is not present
  const effectiveXDelta = xSnap
    ? xEqualSnap && Math.abs(xEqualSnap.delta) < Math.abs(xSnap.delta)
      ? xEqualSnap.delta
      : xSnap.delta
    : (xEqualSnap?.delta ?? 0);
  const effectiveYDelta = ySnap
    ? yEqualSnap && Math.abs(yEqualSnap.delta) < Math.abs(ySnap.delta)
      ? yEqualSnap.delta
      : ySnap.delta
    : (yEqualSnap?.delta ?? 0);
  const effectiveZDelta = zSnap
    ? zEqualSnap && Math.abs(zEqualSnap.delta) < Math.abs(zSnap.delta)
      ? zEqualSnap.delta
      : zSnap.delta
    : (zEqualSnap?.delta ?? 0);

  // Track which type of snap was used
  const useXEqualSnap =
    (!xSnap && xEqualSnap) || (xSnap && xEqualSnap && Math.abs(xEqualSnap.delta) < Math.abs(xSnap.delta));
  const useYEqualSnap =
    (!ySnap && yEqualSnap) || (ySnap && yEqualSnap && Math.abs(yEqualSnap.delta) < Math.abs(ySnap.delta));
  const useZEqualSnap =
    (!zSnap && zEqualSnap) || (zSnap && zEqualSnap && Math.abs(zEqualSnap.delta) < Math.abs(zSnap.delta));

  // Calculate adjusted position
  const adjustedPosition = {
    x: currentPosition.x + effectiveXDelta,
    y: currentPosition.y + effectiveYDelta,
    z: currentPosition.z + effectiveZDelta
  };

  // Create snap lines for visualization
  const snapLines: SnapLine[] = [];

  // Get updated bounds after snap adjustment
  const adjustedBounds = getPartBoundsAtPosition(draggingPart, adjustedPosition);

  // Create snap lines for X axis
  if (useXEqualSnap && xEqualSnap) {
    snapLines.push(
      ...createEqualSpacingSnapLines(
        'x',
        xEqualSnap.equalGap,
        adjustedBounds,
        xEqualSnap.part1Bounds,
        xEqualSnap.part2Bounds
      )
    );
  } else if (xSnap) {
    const targetPart = nearestParts.find((p) => p.id === xSnap.targetPartId);
    if (targetPart) {
      snapLines.push(createSnapLine('x', xSnap.value, xSnap.type, adjustedBounds, getPartBounds(targetPart)));
    }
  }

  // Create snap lines for Y axis
  if (useYEqualSnap && yEqualSnap) {
    snapLines.push(
      ...createEqualSpacingSnapLines(
        'y',
        yEqualSnap.equalGap,
        adjustedBounds,
        yEqualSnap.part1Bounds,
        yEqualSnap.part2Bounds
      )
    );
  } else if (ySnap) {
    const targetPart = nearestParts.find((p) => p.id === ySnap.targetPartId);
    if (targetPart) {
      snapLines.push(createSnapLine('y', ySnap.value, ySnap.type, adjustedBounds, getPartBounds(targetPart)));
    }
  }

  // Create snap lines for Z axis
  if (useZEqualSnap && zEqualSnap) {
    snapLines.push(
      ...createEqualSpacingSnapLines(
        'z',
        zEqualSnap.equalGap,
        adjustedBounds,
        zEqualSnap.part1Bounds,
        zEqualSnap.part2Bounds
      )
    );
  } else if (zSnap) {
    const targetPart = nearestParts.find((p) => p.id === zSnap.targetPartId);
    if (targetPart) {
      snapLines.push(createSnapLine('z', zSnap.value, zSnap.type, adjustedBounds, getPartBounds(targetPart)));
    }
  }

  return {
    adjustedPosition,
    snappedX: !!xSnap || !!useXEqualSnap,
    snappedY: !!ySnap || !!useYEqualSnap,
    snappedZ: !!zSnap || !!useZEqualSnap,
    snapLines
  };
}

// Sensitivity multipliers for snap threshold
const SENSITIVITY_MULTIPLIERS = {
  tight: 0.5, // Half the normal threshold (more precise)
  normal: 1.0, // Default threshold
  loose: 2.0 // Double the normal threshold (easier to snap)
};

// Calculate snap threshold based on camera distance (zoom level) and sensitivity setting
export function calculateSnapThreshold(
  cameraDistance: number,
  sensitivity: 'tight' | 'normal' | 'loose' = 'normal'
): number {
  // Base threshold at a "normal" viewing distance of ~50 units
  const BASE_THRESHOLD = 0.5; // 1/2 inch at normal zoom
  const BASE_DISTANCE = 50;
  const ZOOM_IN_CURVE_EXPONENT = 1.3; // > 1 tightens threshold when zoomed in

  // Scale threshold by camera distance.
  // Keep zoomed-out behavior linear, but tighten zoomed-in behavior with a curve
  // so close-up positioning feels more precise.
  const linearScale = Math.max(0, cameraDistance / BASE_DISTANCE);
  const scaleFactor = linearScale < 1 ? Math.pow(linearScale, ZOOM_IN_CURVE_EXPONENT) : linearScale;

  // Apply sensitivity multiplier
  const sensitivityMultiplier = SENSITIVITY_MULTIPLIERS[sensitivity] ?? 1.0;

  // Clamp between min and max thresholds (adjusted for sensitivity)
  const MIN_THRESHOLD = 0.0625 * sensitivityMultiplier; // 1/16 inch minimum (adjusted)
  const MAX_THRESHOLD = 2 * sensitivityMultiplier; // 2 inch maximum (adjusted)

  return Math.max(MIN_THRESHOLD, Math.min(MAX_THRESHOLD, BASE_THRESHOLD * scaleFactor * sensitivityMultiplier));
}

// Standard dimensions to snap to for length/width (in inches)
export const STANDARD_DIMENSIONS_IMPERIAL = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 30, 36, 42, 48, 60, 72, 84, 96];

// Standard dimensions for metric length/width (in inches, converted from mm)
export const STANDARD_DIMENSIONS_METRIC = [
  150 / 25.4,
  200 / 25.4,
  250 / 25.4,
  300 / 25.4,
  400 / 25.4,
  450 / 25.4,
  500 / 25.4,
  600 / 25.4,
  750 / 25.4,
  900 / 25.4,
  1000 / 25.4,
  1200 / 25.4,
  1500 / 25.4,
  1800 / 25.4,
  2000 / 25.4,
  2400 / 25.4
];

// Standard lumber/plywood thicknesses (in inches)
// Includes common nominal and actual sizes
export const STANDARD_THICKNESSES_IMPERIAL = [
  0.25, // 1/4" (plywood, hardboard)
  0.375, // 3/8" (plywood)
  0.5, // 1/2" (plywood)
  0.625, // 5/8" (plywood)
  0.75, // 3/4" (plywood, 1x lumber actual)
  1.0, // 1" (5/4 lumber actual ~1.0")
  1.125, // 1-1/8" (5/4 lumber actual)
  1.5, // 1-1/2" (2x lumber actual)
  1.75, // 1-3/4" (some hardwoods)
  2.0, // 2" (thick stock)
  2.5, // 2-1/2"
  3.0, // 3" (4x lumber actual ~3.5")
  3.5 // 3-1/2" (4x lumber actual)
];

// Standard thicknesses for metric (in inches, converted from mm)
export const STANDARD_THICKNESSES_METRIC = [
  6 / 25.4, // 6mm
  9 / 25.4, // 9mm
  12 / 25.4, // 12mm
  15 / 25.4, // 15mm
  18 / 25.4, // 18mm (common plywood)
  19 / 25.4, // 19mm
  22 / 25.4, // 22mm
  25 / 25.4, // 25mm
  30 / 25.4, // 30mm
  38 / 25.4, // 38mm
  40 / 25.4, // 40mm
  50 / 25.4 // 50mm
];

// Result of dimension snap detection during resize
export interface DimensionSnapResult {
  snapped: boolean;
  dimension: 'length' | 'width' | 'thickness'; // The dimension being resized
  targetValue: number;
  delta: number; // How much to adjust the dimension
  // For part-based snaps
  matchedPartId: string | null;
  matchedPartName: string | null;
  matchedPartBounds: PartBounds | null;
  matchedDimension: 'length' | 'width' | 'thickness' | null; // Which dimension of the target part matched
  // For standard dimension snaps
  isStandardDimension: boolean;
}

// Detect dimension matches during resize
// Returns snap suggestions for dimensions that match reference parts or standard dimensions
export function detectDimensionSnaps(
  currentDimensions: { length: number; width: number; thickness: number },
  resizingDimensions: { length: boolean; width: boolean; thickness: boolean },
  targetParts: Part[],
  resizingPartId: string,
  threshold: number,
  sameTypeOnly: boolean = false, // When true, only match same dimension types (length to length, etc.)
  units: 'imperial' | 'metric' = 'imperial', // For standard dimension selection
  enableStandardSnap: boolean = true // Whether to also snap to standard dimensions
): DimensionSnapResult[] {
  const results: DimensionSnapResult[] = [];

  // Get unique dimensions from target parts (excluding the resizing part)
  const otherParts = targetParts.filter((p) => p.id !== resizingPartId);

  // Get standard dimensions based on unit system and dimension type
  const getStandardDimensions = (dim: 'length' | 'width' | 'thickness') => {
    if (dim === 'thickness') {
      // Use lumber/plywood thickness standards
      return units === 'metric' ? STANDARD_THICKNESSES_METRIC : STANDARD_THICKNESSES_IMPERIAL;
    }
    // Use length/width standards for length and width
    return units === 'metric' ? STANDARD_DIMENSIONS_METRIC : STANDARD_DIMENSIONS_IMPERIAL;
  };

  // For each dimension being resized, check for matches
  const dimensionTypes: Array<'length' | 'width' | 'thickness'> = ['length', 'width', 'thickness'];

  for (const dim of dimensionTypes) {
    if (!resizingDimensions[dim]) continue;

    const currentValue = currentDimensions[dim];
    let bestMatch: DimensionSnapResult | null = null;
    let bestDistance = threshold;

    // Check part dimensions
    for (const part of otherParts) {
      // Determine which dimensions to check based on sameTypeOnly setting
      const dimensionsToCheck = sameTypeOnly ? [dim] : dimensionTypes;

      for (const targetDim of dimensionsToCheck) {
        const targetValue = part[targetDim];
        const distance = Math.abs(currentValue - targetValue);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = {
            snapped: true,
            dimension: dim,
            targetValue,
            delta: targetValue - currentValue,
            matchedPartId: part.id,
            matchedPartName: part.name,
            matchedPartBounds: getPartBounds(part),
            matchedDimension: targetDim,
            isStandardDimension: false
          };
        }
      }
    }

    // Check standard dimensions (if enabled) - use appropriate standards for this dimension type
    if (enableStandardSnap) {
      const standardDimensions = getStandardDimensions(dim);
      for (const standardValue of standardDimensions) {
        const distance = Math.abs(currentValue - standardValue);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = {
            snapped: true,
            dimension: dim,
            targetValue: standardValue,
            delta: standardValue - currentValue,
            matchedPartId: null,
            matchedPartName: null,
            matchedPartBounds: null,
            matchedDimension: null,
            isStandardDimension: true
          };
        }
      }
    }

    if (bestMatch) {
      results.push(bestMatch);
    }
  }

  return results;
}

// Extended snap line info for dimension matching (includes source info)
export interface DimensionSnapLineInfo {
  snapLine: SnapLine;
  // Additional metadata for enhanced display
  sourceInfo: {
    isStandard: boolean;
    partName: string | null;
    matchedDimension: 'length' | 'width' | 'thickness' | null;
  };
  // Optional connector line to matched part
  connectorLine?: {
    start: { x: number; y: number; z: number };
    end: { x: number; y: number; z: number };
  };
}

// Create visual feedback lines for dimension matching
// Uses actual part bounds (which account for rotation) instead of raw dimensions
export function createDimensionMatchSnapLine(snap: DimensionSnapResult, resizingPartBounds: PartBounds): SnapLine {
  const { matchedPartBounds, dimension, targetValue } = snap;

  // Create a line showing the matched dimension
  // Position it near the resizing part using actual bounds (rotation-aware)
  const OFFSET = 2; // Distance to offset the indicator line from the part
  const y = matchedPartBounds
    ? Math.max(resizingPartBounds.maxY, matchedPartBounds.maxY) + 1
    : resizingPartBounds.maxY + 1;

  // Create axis based on which dimension matched
  // The line should represent the dimension visually
  let axis: 'x' | 'y' | 'z';
  let start: { x: number; y: number; z: number };
  let end: { x: number; y: number; z: number };

  switch (dimension) {
    case 'length':
      axis = 'x';
      // Show a horizontal line representing the matched length, positioned above and in front of the part
      start = {
        x: resizingPartBounds.centerX - targetValue / 2,
        y,
        z: resizingPartBounds.minZ - OFFSET
      };
      end = {
        x: resizingPartBounds.centerX + targetValue / 2,
        y,
        z: resizingPartBounds.minZ - OFFSET
      };
      break;
    case 'width':
      axis = 'z';
      // Show a line representing the matched width, positioned above and to the side of the part
      start = {
        x: resizingPartBounds.maxX + OFFSET,
        y,
        z: resizingPartBounds.centerZ - targetValue / 2
      };
      end = {
        x: resizingPartBounds.maxX + OFFSET,
        y,
        z: resizingPartBounds.centerZ + targetValue / 2
      };
      break;
    case 'thickness':
    default:
      axis = 'y';
      // Show a vertical line representing the matched thickness, positioned to the side of the part
      start = {
        x: resizingPartBounds.maxX + OFFSET,
        y: resizingPartBounds.centerY - targetValue / 2,
        z: resizingPartBounds.minZ - OFFSET
      };
      end = {
        x: resizingPartBounds.maxX + OFFSET,
        y: resizingPartBounds.centerY + targetValue / 2,
        z: resizingPartBounds.minZ - OFFSET
      };
      break;
  }

  return {
    axis,
    type: 'dimension-match',
    start,
    end,
    snapValue: targetValue,
    distanceIndicators: [
      {
        start,
        end,
        distance: targetValue,
        labelPosition: {
          x: (start.x + end.x) / 2,
          y: (start.y + end.y) / 2 + 0.5,
          z: (start.z + end.z) / 2
        }
      }
    ]
  };
}

// Create enhanced dimension snap visualization with source info and connector line
export function createEnhancedDimensionSnapLine(
  snap: DimensionSnapResult,
  resizingPartBounds: PartBounds
): DimensionSnapLineInfo {
  const { matchedPartBounds, dimension, targetValue, matchedPartName, matchedDimension, isStandardDimension } = snap;

  const OFFSET = 2;
  const y = matchedPartBounds
    ? Math.max(resizingPartBounds.maxY, matchedPartBounds.maxY) + 1
    : resizingPartBounds.maxY + 1;

  let axis: 'x' | 'y' | 'z';
  let start: { x: number; y: number; z: number };
  let end: { x: number; y: number; z: number };

  switch (dimension) {
    case 'length':
      axis = 'x';
      start = {
        x: resizingPartBounds.centerX - targetValue / 2,
        y,
        z: resizingPartBounds.minZ - OFFSET
      };
      end = {
        x: resizingPartBounds.centerX + targetValue / 2,
        y,
        z: resizingPartBounds.minZ - OFFSET
      };
      break;
    case 'width':
      axis = 'z';
      start = {
        x: resizingPartBounds.maxX + OFFSET,
        y,
        z: resizingPartBounds.centerZ - targetValue / 2
      };
      end = {
        x: resizingPartBounds.maxX + OFFSET,
        y,
        z: resizingPartBounds.centerZ + targetValue / 2
      };
      break;
    case 'thickness':
    default:
      axis = 'y';
      start = {
        x: resizingPartBounds.maxX + OFFSET,
        y: resizingPartBounds.centerY - targetValue / 2,
        z: resizingPartBounds.minZ - OFFSET
      };
      end = {
        x: resizingPartBounds.maxX + OFFSET,
        y: resizingPartBounds.centerY + targetValue / 2,
        z: resizingPartBounds.minZ - OFFSET
      };
      break;
  }

  const result: DimensionSnapLineInfo = {
    snapLine: {
      axis,
      type: 'dimension-match',
      start,
      end,
      snapValue: targetValue,
      distanceIndicators: [
        {
          start,
          end,
          distance: targetValue,
          labelPosition: {
            x: (start.x + end.x) / 2,
            y: (start.y + end.y) / 2 + 0.5,
            z: (start.z + end.z) / 2
          }
        }
      ]
    },
    sourceInfo: {
      isStandard: isStandardDimension,
      partName: matchedPartName,
      matchedDimension: matchedDimension
    }
  };

  // Add connector line to matched part (if not a standard dimension)
  if (matchedPartBounds && !isStandardDimension) {
    const labelPos = result.snapLine.distanceIndicators![0].labelPosition;
    result.connectorLine = {
      start: labelPos,
      end: {
        x: matchedPartBounds.centerX,
        y: matchedPartBounds.maxY + 0.5,
        z: matchedPartBounds.centerZ
      }
    };
  }

  return result;
}

// Result of guide snap detection
export interface GuideSnapResult {
  axis: 'x' | 'y' | 'z';
  snapped: boolean;
  value: number;
  delta: number;
  guideId: string;
}

// Detect snaps to persistent guides
export function detectGuideSnaps(
  draggingBounds: PartBounds,
  guides: SnapGuide[],
  threshold: number
): { x: GuideSnapResult | null; y: GuideSnapResult | null; z: GuideSnapResult | null } {
  const result = {
    x: null as GuideSnapResult | null,
    y: null as GuideSnapResult | null,
    z: null as GuideSnapResult | null
  };

  for (const guide of guides) {
    const { axis, position, id } = guide;

    // Get the bounds values for this axis
    let min: number, max: number, center: number;
    switch (axis) {
      case 'x':
        min = draggingBounds.minX;
        max = draggingBounds.maxX;
        center = draggingBounds.centerX;
        break;
      case 'y':
        min = draggingBounds.minY;
        max = draggingBounds.maxY;
        center = draggingBounds.centerY;
        break;
      case 'z':
        min = draggingBounds.minZ;
        max = draggingBounds.maxZ;
        center = draggingBounds.centerZ;
        break;
    }

    // Check different snap points
    const snapPoints = [
      { delta: position - min, name: 'min' },
      { delta: position - max, name: 'max' },
      { delta: position - center, name: 'center' }
    ];

    for (const snap of snapPoints) {
      const distance = Math.abs(snap.delta);
      if (distance < threshold) {
        const currentBest = result[axis];
        if (!currentBest || distance < Math.abs(currentBest.delta)) {
          result[axis] = {
            axis,
            snapped: true,
            value: position,
            delta: snap.delta,
            guideId: id
          };
        }
      }
    }
  }

  return result;
}

// Create snap line for guide visualization
export function createGuideSnapLine(guide: SnapGuide, draggingBounds: PartBounds): SnapLine {
  const { axis, position } = guide;
  const LINE_EXTENSION = 30;

  switch (axis) {
    case 'x': {
      // Vertical plane at X = position
      const minZ = Math.min(draggingBounds.minZ, -LINE_EXTENSION);
      const maxZ = Math.max(draggingBounds.maxZ, LINE_EXTENSION);
      const avgY = draggingBounds.centerY;
      return {
        axis: 'x',
        type: 'face',
        family: 'guide',
        state: 'winner',
        start: { x: position, y: avgY, z: minZ },
        end: { x: position, y: avgY, z: maxZ },
        snapValue: position
      };
    }
    case 'y': {
      // Horizontal plane at Y = position
      const minX = Math.min(draggingBounds.minX, -LINE_EXTENSION);
      const maxX = Math.max(draggingBounds.maxX, LINE_EXTENSION);
      const avgZ = draggingBounds.centerZ;
      return {
        axis: 'y',
        type: 'face',
        family: 'guide',
        state: 'winner',
        start: { x: minX, y: position, z: avgZ },
        end: { x: maxX, y: position, z: avgZ },
        snapValue: position
      };
    }
    case 'z':
    default: {
      // Vertical plane at Z = position
      const minX = Math.min(draggingBounds.minX, -LINE_EXTENSION);
      const maxX = Math.max(draggingBounds.maxX, LINE_EXTENSION);
      const avgY = draggingBounds.centerY;
      return {
        axis: 'z',
        type: 'face',
        family: 'guide',
        state: 'winner',
        start: { x: minX, y: avgY, z: position },
        end: { x: maxX, y: avgY, z: position },
        snapValue: position
      };
    }
  }
}

// ============================================================
// ORIGIN SNAP DETECTION
// Snap parts to workspace origin planes (X=0, Y=0, Z=0)
// ============================================================

export interface OriginSnapResult {
  delta: number;
  snapType: 'min' | 'max' | 'center';
}

// Detect snaps to origin planes (X=0, Y=0, Z=0)
export function detectOriginSnaps(
  draggingBounds: PartBounds,
  threshold: number
): { x: OriginSnapResult | null; y: OriginSnapResult | null; z: OriginSnapResult | null } {
  const result = {
    x: null as OriginSnapResult | null,
    y: null as OriginSnapResult | null,
    z: null as OriginSnapResult | null
  };

  // Check X=0 plane
  const xSnapPoints = [
    { delta: -draggingBounds.minX, type: 'min' as const },
    { delta: -draggingBounds.maxX, type: 'max' as const },
    { delta: -draggingBounds.centerX, type: 'center' as const }
  ];
  for (const snap of xSnapPoints) {
    if (Math.abs(snap.delta) < threshold) {
      if (!result.x || Math.abs(snap.delta) < Math.abs(result.x.delta)) {
        result.x = { delta: snap.delta, snapType: snap.type };
      }
    }
  }

  // Check Y=0 plane (ground - usually only snap min edge to ground)
  const ySnapPoints = [
    { delta: -draggingBounds.minY, type: 'min' as const },
    { delta: -draggingBounds.centerY, type: 'center' as const }
  ];
  for (const snap of ySnapPoints) {
    if (Math.abs(snap.delta) < threshold) {
      if (!result.y || Math.abs(snap.delta) < Math.abs(result.y.delta)) {
        result.y = { delta: snap.delta, snapType: snap.type };
      }
    }
  }

  // Check Z=0 plane
  const zSnapPoints = [
    { delta: -draggingBounds.minZ, type: 'min' as const },
    { delta: -draggingBounds.maxZ, type: 'max' as const },
    { delta: -draggingBounds.centerZ, type: 'center' as const }
  ];
  for (const snap of zSnapPoints) {
    if (Math.abs(snap.delta) < threshold) {
      if (!result.z || Math.abs(snap.delta) < Math.abs(result.z.delta)) {
        result.z = { delta: snap.delta, snapType: snap.type };
      }
    }
  }

  return result;
}

// Create visual snap line for origin snap
export function createOriginSnapLine(
  axis: 'x' | 'y' | 'z',
  snapType: 'min' | 'max' | 'center',
  draggingBounds: PartBounds
): SnapLine {
  const LINE_EXTENSION = 30;

  switch (axis) {
    case 'x': {
      // Line along Z axis at X=0
      const minZ = Math.min(draggingBounds.minZ, -LINE_EXTENSION);
      const maxZ = Math.max(draggingBounds.maxZ, LINE_EXTENSION);
      const y = draggingBounds.centerY;
      return {
        axis: 'x',
        type: snapType === 'center' ? 'center' : 'edge',
        family: 'origin',
        state: 'winner',
        start: { x: 0, y, z: minZ },
        end: { x: 0, y, z: maxZ },
        snapValue: 0
      };
    }
    case 'y': {
      // Line along X axis at Y=0
      const minX = Math.min(draggingBounds.minX, -LINE_EXTENSION);
      const maxX = Math.max(draggingBounds.maxX, LINE_EXTENSION);
      const z = draggingBounds.centerZ;
      return {
        axis: 'y',
        type: snapType === 'center' ? 'center' : 'edge',
        family: 'origin',
        state: 'winner',
        start: { x: minX, y: 0, z },
        end: { x: maxX, y: 0, z },
        snapValue: 0
      };
    }
    case 'z':
    default: {
      // Line along X axis at Z=0
      const minX = Math.min(draggingBounds.minX, -LINE_EXTENSION);
      const maxX = Math.max(draggingBounds.maxX, LINE_EXTENSION);
      const y = draggingBounds.centerY;
      return {
        axis: 'z',
        type: snapType === 'center' ? 'center' : 'edge',
        family: 'origin',
        state: 'winner',
        start: { x: minX, y, z: 0 },
        end: { x: maxX, y, z: 0 },
        snapValue: 0
      };
    }
  }
}

// ============================================================
// FACE-TO-FACE (FLUSH) SNAP DETECTION
// Snap one part's face flush against another part's face
// ============================================================

// Detect face-to-face snaps (flush alignment)
// This positions parts so their faces are touching (e.g., top of A against bottom of B)
export function detectFaceSnaps(
  draggingPart: Part,
  currentPosition: { x: number; y: number; z: number },
  allParts: Part[],
  draggingPartIds: string[],
  snapThreshold: number
): SnapResult {
  const FACE_SNAP_CLEARANCE = 1e-4;
  const draggingBounds = getPartBoundsAtPosition(draggingPart, currentPosition);
  const nearestParts = getNearestParts(draggingBounds, allParts, draggingPartIds);
  const dragFaces = getPartFaces(draggingPart, currentPosition);

  let best:
    | {
        delta: Vec3;
        targetBounds: PartBounds;
        targetFace: OrientedFace;
      }
    | undefined;
  let bestDistance = snapThreshold;

  for (const targetPart of nearestParts) {
    const targetFaces = getPartFaces(targetPart, targetPart.position);
    for (const dragFace of dragFaces) {
      for (const targetFace of targetFaces) {
        if (!areFacesSnapCompatible(dragFace, targetFace, snapThreshold)) continue;

        const centerDelta = {
          x: targetFace.center.x - dragFace.center.x,
          y: targetFace.center.y - dragFace.center.y,
          z: targetFace.center.z - dragFace.center.z
        };
        const planeDistance = dotVec(centerDelta, targetFace.normal);
        const absDistance = Math.abs(planeDistance);
        if (absDistance >= bestDistance) continue;

        bestDistance = absDistance;
        const clearance = Math.min(FACE_SNAP_CLEARANCE, absDistance * 0.5);
        const correctedPlaneDistance = planeDistance - Math.sign(planeDistance || 1) * clearance;
        best = {
          delta: {
            x: targetFace.normal.x * correctedPlaneDistance,
            y: targetFace.normal.y * correctedPlaneDistance,
            z: targetFace.normal.z * correctedPlaneDistance
          },
          targetBounds: getPartBounds(targetPart),
          targetFace
        };
      }
    }
  }

  if (!best) {
    return {
      adjustedPosition: currentPosition,
      snappedX: false,
      snappedY: false,
      snappedZ: false,
      snapLines: [],
      closestDistance: undefined
    };
  }

  const adjustedPosition = {
    x: currentPosition.x + best.delta.x,
    y: currentPosition.y + best.delta.y,
    z: currentPosition.z + best.delta.z
  };
  const adjustedBounds = getPartBoundsAtPosition(draggingPart, adjustedPosition);

  const snappedX = Math.abs(best.delta.x) > 1e-5;
  const snappedY = Math.abs(best.delta.y) > 1e-5;
  const snappedZ = Math.abs(best.delta.z) > 1e-5;

  const ax = Math.abs(best.targetFace.normal.x);
  const ay = Math.abs(best.targetFace.normal.y);
  const az = Math.abs(best.targetFace.normal.z);
  const dominantAxis: 'x' | 'y' | 'z' = ax >= ay && ax >= az ? 'x' : ay >= az ? 'y' : 'z';
  const dominantSign =
    dominantAxis === 'x'
      ? best.targetFace.normal.x
      : dominantAxis === 'y'
        ? best.targetFace.normal.y
        : best.targetFace.normal.z;
  const position =
    dominantAxis === 'x'
      ? dominantSign >= 0
        ? best.targetBounds.maxX
        : best.targetBounds.minX
      : dominantAxis === 'y'
        ? dominantSign >= 0
          ? best.targetBounds.maxY
          : best.targetBounds.minY
        : dominantSign >= 0
          ? best.targetBounds.maxZ
          : best.targetBounds.minZ;

  return {
    adjustedPosition,
    snappedX,
    snappedY,
    snappedZ,
    snapLines: withSnapFamily([createFaceSnapLine(dominantAxis, position, adjustedBounds, best.targetBounds)], 'face'),
    closestDistance: bestDistance
  };
}

type OrientedFace = {
  normal: Vec3;
  center: Vec3;
  tangent1: Vec3;
  tangent2: Vec3;
  half1: number;
  half2: number;
};

function dotVec(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function addScaledVec(base: Vec3, dir: Vec3, scale: number): Vec3 {
  return {
    x: base.x + dir.x * scale,
    y: base.y + dir.y * scale,
    z: base.z + dir.z * scale
  };
}

function getPartFaces(part: Part, position: { x: number; y: number; z: number }): OrientedFace[] {
  // Use the OBB which already accounts for features (bevels, end cuts, notches)
  // so face snap positions match the actual bounding geometry.
  const obb = getPartOBB(part, position);
  const [axisX, axisY, axisZ] = obb.axes;
  const [halfLength, halfThickness, halfWidth] = obb.halfExtents;
  const partCenter = obb.center;

  const faces: OrientedFace[] = [
    {
      normal: axisX,
      center: addScaledVec(partCenter, axisX, halfLength),
      tangent1: axisY,
      tangent2: axisZ,
      half1: halfThickness,
      half2: halfWidth
    },
    {
      normal: { x: -axisX.x, y: -axisX.y, z: -axisX.z },
      center: addScaledVec(partCenter, axisX, -halfLength),
      tangent1: axisY,
      tangent2: axisZ,
      half1: halfThickness,
      half2: halfWidth
    },
    {
      normal: axisY,
      center: addScaledVec(partCenter, axisY, halfThickness),
      tangent1: axisX,
      tangent2: axisZ,
      half1: halfLength,
      half2: halfWidth
    },
    {
      normal: { x: -axisY.x, y: -axisY.y, z: -axisY.z },
      center: addScaledVec(partCenter, axisY, -halfThickness),
      tangent1: axisX,
      tangent2: axisZ,
      half1: halfLength,
      half2: halfWidth
    },
    {
      normal: axisZ,
      center: addScaledVec(partCenter, axisZ, halfWidth),
      tangent1: axisX,
      tangent2: axisY,
      half1: halfLength,
      half2: halfThickness
    },
    {
      normal: { x: -axisZ.x, y: -axisZ.y, z: -axisZ.z },
      center: addScaledVec(partCenter, axisZ, -halfWidth),
      tangent1: axisX,
      tangent2: axisY,
      half1: halfLength,
      half2: halfThickness
    }
  ];

  // Add bevel / compound end cut faces so the face snap can align the actual
  // angled surface rather than the bounding-box edge.
  addBevelSnapFaces(faces, part, partCenter, axisX, axisY, axisZ, halfLength, halfThickness, halfWidth);

  return faces;
}

/**
 * Append oriented-face entries for each bevel / compound end-cut face so the
 * face snap system can align the actual angled surface.
 *
 * A bevel face in local space runs from one edge of the end face to the
 * opposite (shifted by the vertical inset). Its center, normal, and tangent
 * vectors are computed in local space and then rotated to world space using
 * the OBB axes (which already encode the part's rotation).
 */
function addBevelSnapFaces(
  faces: OrientedFace[],
  part: Part,
  partCenter: Vec3,
  axisX: Vec3,
  axisY: Vec3,
  axisZ: Vec3,
  halfLength: number,
  halfThickness: number,
  halfWidth: number
): void {
  const profiles = getPartEndCutProfiles(part);

  for (const side of ['left', 'right'] as const) {
    const profile = side === 'left' ? profiles.left : profiles.right;
    if (profile.verticalInset <= 0) continue;

    const vi = profile.verticalInset;
    const thickness = 2 * halfThickness;

    // The bevel slope length in the X-Y plane
    const slopeLen = Math.sqrt(vi * vi + thickness * thickness);
    const halfSlope = slopeLen / 2;

    // Local bevel face normal (perpendicular to slope, pointing outward).
    // For verticalFlip=false: slope goes from (-hl, -ht) to (-hl+vi, +ht), normal points -X/+Y
    // For verticalFlip=true: slope goes from (-hl, +ht) to (-hl+vi, -ht), normal points -X/-Y
    let localNormal: Vec3;
    let localTangentSlope: Vec3;
    if (side === 'left') {
      if (profile.verticalFlip) {
        // Slope: (-hl, +ht) → (-hl+vi, -ht). Edge dir = (vi, -thickness).
        // Outward normal rotated 90° CW in XY: (-thickness → normal_x, -vi → ?)
        // Normal = perpendicular pointing outward (-X side) = (-thickness/sl, -vi/sl, 0)
        localNormal = { x: -thickness / slopeLen, y: -vi / slopeLen, z: 0 };
        localTangentSlope = { x: vi / slopeLen, y: -thickness / slopeLen, z: 0 };
      } else {
        // Slope: (-hl, -ht) → (-hl+vi, +ht). Edge dir = (vi, thickness).
        // Normal pointing outward (-X side) = (-thickness/sl, vi/sl, 0)
        localNormal = { x: -thickness / slopeLen, y: vi / slopeLen, z: 0 };
        localTangentSlope = { x: vi / slopeLen, y: thickness / slopeLen, z: 0 };
      }
    } else {
      if (profile.verticalFlip) {
        // Right side, flip: slope from (+hl, -ht) → (+hl-vi, +ht).
        localNormal = { x: thickness / slopeLen, y: vi / slopeLen, z: 0 };
        localTangentSlope = { x: -vi / slopeLen, y: thickness / slopeLen, z: 0 };
      } else {
        // Right side, no flip: slope from (+hl, +ht) → (+hl-vi, -ht).
        localNormal = { x: thickness / slopeLen, y: -vi / slopeLen, z: 0 };
        localTangentSlope = { x: -vi / slopeLen, y: -thickness / slopeLen, z: 0 };
      }
    }

    // Local center of the bevel face: midpoint of the slope edge
    const midInset = vi / 2;
    const localCenterX = side === 'left' ? -halfLength + midInset : halfLength - midInset;
    const localCenterY = 0; // Midpoint of thickness range

    // Transform local vectors to world space via OBB axes:
    // world = axisX * local.x + axisY * local.y + axisZ * local.z
    const worldNormal: Vec3 = {
      x: axisX.x * localNormal.x + axisY.x * localNormal.y + axisZ.x * localNormal.z,
      y: axisX.y * localNormal.x + axisY.y * localNormal.y + axisZ.y * localNormal.z,
      z: axisX.z * localNormal.x + axisY.z * localNormal.y + axisZ.z * localNormal.z
    };

    const worldTangentSlope: Vec3 = {
      x: axisX.x * localTangentSlope.x + axisY.x * localTangentSlope.y,
      y: axisX.y * localTangentSlope.x + axisY.y * localTangentSlope.y,
      z: axisX.z * localTangentSlope.x + axisY.z * localTangentSlope.y
    };

    const worldCenter: Vec3 = {
      x: partCenter.x + axisX.x * localCenterX + axisY.x * localCenterY,
      y: partCenter.y + axisX.y * localCenterX + axisY.y * localCenterY,
      z: partCenter.z + axisX.z * localCenterX + axisY.z * localCenterY
    };

    faces.push({
      normal: worldNormal,
      center: worldCenter,
      tangent1: worldTangentSlope,
      tangent2: axisZ,
      half1: halfSlope,
      half2: halfWidth
    });
  }
}

function projectFaceInterval(face: OrientedFace, axis: Vec3): { min: number; max: number } {
  const centerProjection = dotVec(face.center, axis);
  const radius =
    face.half1 * Math.abs(dotVec(face.tangent1, axis)) + face.half2 * Math.abs(dotVec(face.tangent2, axis));
  return {
    min: centerProjection - radius,
    max: centerProjection + radius
  };
}

function areFacesSnapCompatible(faceA: OrientedFace, faceB: OrientedFace, snapThreshold: number): boolean {
  const normalDot = dotVec(faceA.normal, faceB.normal);
  // Faces should oppose each other (nearly anti-parallel) for flush snap.
  if (normalDot > -0.98) return false;

  const overlapSlack = Math.max(0.01, snapThreshold * 0.25);
  const axesToCheck: Vec3[] = [faceB.tangent1, faceB.tangent2];
  for (const axis of axesToCheck) {
    const intervalA = projectFaceInterval(faceA, axis);
    const intervalB = projectFaceInterval(faceB, axis);
    const overlap = Math.min(intervalA.max, intervalB.max) - Math.max(intervalA.min, intervalB.min);
    if (overlap < -overlapSlack) return false;
  }

  return true;
}

type PartEdge = {
  a: Vec3;
  b: Vec3;
  dir: Vec3;
  length: number;
};

function subVec(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function addVec(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function mulVec(a: Vec3, scalar: number): Vec3 {
  return { x: a.x * scalar, y: a.y * scalar, z: a.z * scalar };
}

function lenVec(a: Vec3): number {
  return Math.sqrt(dotVec(a, a));
}

function normalizeVec(a: Vec3): Vec3 {
  const l = lenVec(a);
  if (l < 1e-9) return { x: 0, y: 0, z: 0 };
  return { x: a.x / l, y: a.y / l, z: a.z / l };
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function closestPointsOnSegments(p1: Vec3, q1: Vec3, p2: Vec3, q2: Vec3): { c1: Vec3; c2: Vec3 } {
  const EPS = 1e-8;
  const d1 = subVec(q1, p1);
  const d2 = subVec(q2, p2);
  const r = subVec(p1, p2);
  const a = dotVec(d1, d1);
  const e = dotVec(d2, d2);
  const f = dotVec(d2, r);
  let s = 0;
  let t = 0;

  if (a <= EPS && e <= EPS) {
    return { c1: p1, c2: p2 };
  }

  if (a <= EPS) {
    s = 0;
    t = clamp01(f / e);
  } else {
    const c = dotVec(d1, r);
    if (e <= EPS) {
      t = 0;
      s = clamp01(-c / a);
    } else {
      const b = dotVec(d1, d2);
      const denom = a * e - b * b;

      if (Math.abs(denom) > EPS) {
        s = clamp01((b * f - c * e) / denom);
      } else {
        s = 0;
      }

      t = (b * s + f) / e;

      if (t < 0) {
        t = 0;
        s = clamp01(-c / a);
      } else if (t > 1) {
        t = 1;
        s = clamp01((b - c) / a);
      }
    }
  }

  const c1 = addVec(p1, mulVec(d1, s));
  const c2 = addVec(p2, mulVec(d2, t));
  return { c1, c2 };
}

function dominantAxisFromDelta(delta: Vec3): 'x' | 'y' | 'z' {
  const ax = Math.abs(delta.x);
  const ay = Math.abs(delta.y);
  const az = Math.abs(delta.z);
  return ax >= ay && ax >= az ? 'x' : ay >= az ? 'y' : 'z';
}

function transformLocalVertexToWorld(
  local: { x: number; y: number; z: number },
  rotation: { x: number; y: number; z: number },
  position: { x: number; y: number; z: number }
): Vec3 {
  const { ax0, ax1, ax2, ay0, ay1, ay2, az0, az1, az2 } = eulerToAxes(rotation);
  return {
    x: position.x + ax0 * local.x + ay0 * local.y + az0 * local.z,
    y: position.y + ax1 * local.x + ay1 * local.y + az1 * local.z,
    z: position.z + ax2 * local.x + ay2 * local.y + az2 * local.z
  };
}

/**
 * World-space snap vertices for a part. Feature-bearing parts return their
 * true hull (so cut-away corners are not offered as snap targets); plain
 * parts return the eight box corners.
 */
export function getPartVertices(part: Part, position: { x: number; y: number; z: number }): Vec3[] {
  // Feature-bearing parts snap by their true hull vertices so cut-away
  // corners (mitres, notches) stop offering ghost snap targets.
  if (hasRenderablePartFeatures(part)) {
    return getPartLocalConvexVertices(part).map((local) => transformLocalVertexToWorld(local, part.rotation, position));
  }
  return getPartObbVertices(part, position);
}

function getPartObbVertices(part: Part, position: { x: number; y: number; z: number }): Vec3[] {
  const obb = getPartOBB(part, position);
  const center = obb.center;
  const [ax, ay, az] = obb.axes;
  const [hx, hy, hz] = obb.halfExtents;
  const verts = new Array<Vec3>(8);
  for (const sx of [-1, 1] as const) {
    for (const sy of [-1, 1] as const) {
      for (const sz of [-1, 1] as const) {
        const idx = (sx > 0 ? 4 : 0) + (sy > 0 ? 2 : 0) + (sz > 0 ? 1 : 0);
        verts[idx] = {
          x: center.x + ax.x * hx * sx + ay.x * hy * sy + az.x * hz * sz,
          y: center.y + ax.y * hx * sx + ay.y * hy * sy + az.y * hz * sz,
          z: center.z + ax.z * hx * sx + ay.z * hy * sy + az.z * hz * sz
        };
      }
    }
  }
  return verts;
}

function getPartEdges(part: Part, position: { x: number; y: number; z: number }): PartEdge[] {
  // Feature-bearing flat-contour parts get true contour edges; parts with
  // vertical end-cut insets (bevels/compounds) keep the tightened-OBB edge
  // approximation because the deduped hull loses the bottom/top pairing.
  if (hasRenderablePartFeatures(part)) {
    const profiles = getPartEndCutProfiles(part);
    const hasVertical = profiles.left.verticalInset > 0 || profiles.right.verticalInset > 0;
    if (!hasVertical) {
      const world = getPartLocalConvexVertices(part).map((local) =>
        transformLocalVertexToWorld(local, part.rotation, position)
      );
      const contourPointCount = world.length / 2;
      const edges: PartEdge[] = [];
      const pushEdge = (a: Vec3, b: Vec3) => {
        const ab = subVec(b, a);
        const length = lenVec(ab);
        if (length <= 1e-6) return;
        edges.push({ a, b, dir: normalizeVec(ab), length });
      };
      for (let i = 0; i < contourPointCount; i += 1) {
        const j = (i + 1) % contourPointCount;
        pushEdge(world[2 * i], world[2 * j]); // bottom contour loop
        pushEdge(world[2 * i + 1], world[2 * j + 1]); // top contour loop
        pushEdge(world[2 * i], world[2 * i + 1]); // vertical connector
      }
      return edges;
    }
  }

  const v = getPartObbVertices(part, position);
  const edgeIndices: Array<[number, number]> = [
    [0, 1],
    [0, 2],
    [0, 4],
    [1, 3],
    [1, 5],
    [2, 3],
    [2, 6],
    [3, 7],
    [4, 5],
    [4, 6],
    [5, 7],
    [6, 7]
  ];
  return edgeIndices
    .map(([i, j]) => {
      const a = v[i];
      const b = v[j];
      const ab = subVec(b, a);
      const length = lenVec(ab);
      const dir = normalizeVec(ab);
      return { a, b, dir, length };
    })
    .filter((e) => e.length > 1e-6);
}

function pointInsideFace(point: Vec3, face: OrientedFace, slack: number): boolean {
  const offset = subVec(point, face.center);
  const u = dotVec(offset, face.tangent1);
  const v = dotVec(offset, face.tangent2);
  return Math.abs(u) <= face.half1 + slack && Math.abs(v) <= face.half2 + slack;
}

export function detectFeatureSnaps(
  draggingPart: Part,
  currentPosition: { x: number; y: number; z: number },
  allParts: Part[],
  draggingPartIds: string[],
  snapThreshold: number
): SnapResult {
  const MIN_VERTEX_FACE_DISTANCE = Math.max(1e-4, snapThreshold * 0.002);
  const draggingBounds = getPartBoundsAtPosition(draggingPart, currentPosition);
  const nearestParts = getNearestParts(draggingBounds, allParts, draggingPartIds);
  const dragEdges = getPartEdges(draggingPart, currentPosition);
  const dragVertices = getPartVertices(draggingPart, currentPosition);

  let best:
    | {
        delta: Vec3;
        lineStart: Vec3;
        lineEnd: Vec3;
        distance: number;
        subtype: string;
      }
    | undefined;
  let bestDistance = snapThreshold;

  for (const targetPart of nearestParts) {
    const targetEdges = getPartEdges(targetPart, targetPart.position);
    const targetFaces = getPartFaces(targetPart, targetPart.position);

    // Edge-edge: align nearly parallel edges by minimizing perpendicular offset.
    for (const e1 of dragEdges) {
      for (const e2 of targetEdges) {
        const parallel = Math.abs(dotVec(e1.dir, e2.dir));
        if (parallel < 0.985) continue;

        const { c1, c2 } = closestPointsOnSegments(e1.a, e1.b, e2.a, e2.b);
        const closestDiff = subVec(c2, c1);
        const along = dotVec(closestDiff, e1.dir);
        const perpOffset = subVec(closestDiff, mulVec(e1.dir, along));
        const distance = lenVec(perpOffset);

        const p1a = dotVec(e1.a, e1.dir);
        const p1b = dotVec(e1.b, e1.dir);
        const p2a = dotVec(e2.a, e1.dir);
        const p2b = dotVec(e2.b, e1.dir);
        const min1 = Math.min(p1a, p1b);
        const max1 = Math.max(p1a, p1b);
        const min2 = Math.min(p2a, p2b);
        const max2 = Math.max(p2a, p2b);
        const overlap = Math.min(max1, max2) - Math.max(min1, min2);
        if (overlap < -Math.max(0.01, snapThreshold * 0.5)) continue;

        if (distance <= 1e-5) {
          // Coplanar/collinear edges: snap by endpoint alignment along the edge direction.
          // This enables edge snapping while sliding on an already surface-snapped face.
          const edge1MinPoint = p1a <= p1b ? e1.a : e1.b;
          const edge1MaxPoint = p1a <= p1b ? e1.b : e1.a;
          const edge2MinPoint = p2a <= p2b ? e2.a : e2.b;
          const edge2MaxPoint = p2a <= p2b ? e2.b : e2.a;
          const alongCandidates = [
            { delta: min2 - min1, lineStart: edge1MinPoint, lineEnd: edge2MinPoint },
            { delta: max2 - max1, lineStart: edge1MaxPoint, lineEnd: edge2MaxPoint },
            { delta: min2 - max1, lineStart: edge1MaxPoint, lineEnd: edge2MinPoint },
            { delta: max2 - min1, lineStart: edge1MinPoint, lineEnd: edge2MaxPoint }
          ];

          for (const candidate of alongCandidates) {
            const candidateDistance = Math.abs(candidate.delta);
            if (candidateDistance <= 1e-5 || candidateDistance >= bestDistance) continue;
            bestDistance = candidateDistance;
            best = {
              delta: mulVec(e1.dir, candidate.delta),
              lineStart: candidate.lineStart,
              lineEnd: candidate.lineEnd,
              distance: candidateDistance,
              subtype: 'edge-extension'
            };
          }
          continue;
        }

        if (distance >= bestDistance) continue;

        bestDistance = distance;
        best = {
          delta: perpOffset,
          lineStart: c1,
          lineEnd: c2,
          distance,
          subtype: 'edge-edge'
        };
      }
    }

    // Vertex-face: project a dragging vertex to a compatible target face plane.
    for (const vertex of dragVertices) {
      for (const face of targetFaces) {
        const offset = subVec(vertex, face.center);
        const planeDistance = dotVec(offset, face.normal);
        const absDistance = Math.abs(planeDistance);
        // Ignore already-coplanar candidates; they should not suppress
        // meaningful edge-alignment snaps on the same surface.
        if (absDistance <= MIN_VERTEX_FACE_DISTANCE) continue;
        if (absDistance >= bestDistance) continue;

        const projected = subVec(vertex, mulVec(face.normal, planeDistance));
        // Use a tight boundary tolerance so vertex->face projection does not
        // "magnetize" to nearby face planes when the projected point is just
        // outside the actual face extents (causes visible edge gaps).
        if (!pointInsideFace(projected, face, 1e-4)) continue;

        bestDistance = absDistance;
        best = {
          delta: mulVec(face.normal, -planeDistance),
          lineStart: vertex,
          lineEnd: projected,
          distance: absDistance,
          subtype: 'vertex-face'
        };
      }
    }
  }

  if (!best) {
    return {
      adjustedPosition: currentPosition,
      snappedX: false,
      snappedY: false,
      snappedZ: false,
      snapLines: [],
      closestDistance: Number.isFinite(bestDistance) ? bestDistance : undefined
    };
  }

  if (lenVec(best.delta) <= 1e-5) {
    return {
      adjustedPosition: currentPosition,
      snappedX: false,
      snappedY: false,
      snappedZ: false,
      snapLines: [],
      closestDistance: best.distance
    };
  }

  const adjustedPosition = {
    x: currentPosition.x + best.delta.x,
    y: currentPosition.y + best.delta.y,
    z: currentPosition.z + best.delta.z
  };
  const snappedX = Math.abs(best.delta.x) > 1e-5;
  const snappedY = Math.abs(best.delta.y) > 1e-5;
  const snappedZ = Math.abs(best.delta.z) > 1e-5;
  const axis = dominantAxisFromDelta(best.delta);

  return {
    adjustedPosition,
    snappedX,
    snappedY,
    snappedZ,
    snapLines: withSnapFamily(
      [
        {
          axis,
          type: 'edge',
          start: { x: best.lineStart.x, y: best.lineStart.y, z: best.lineStart.z },
          end: { x: best.lineEnd.x, y: best.lineEnd.y, z: best.lineEnd.z },
          snapValue: axis === 'x' ? best.lineEnd.x : axis === 'y' ? best.lineEnd.y : best.lineEnd.z
        }
      ],
      'feature',
      best.subtype
    ),
    closestDistance: best.distance
  };
}

export function detectSurfaceAnchorSnaps(
  draggingPart: Part,
  currentPosition: { x: number; y: number; z: number },
  allParts: Part[],
  draggingPartIds: string[],
  snapThreshold: number
): SnapResult {
  const dragFaces = getPartFaces(draggingPart, currentPosition);
  const draggingBounds = getPartBoundsAtPosition(draggingPart, currentPosition);
  const nearestParts = getNearestParts(draggingBounds, allParts, draggingPartIds);
  const FACE_SNAP_CLEARANCE = 1e-4;
  let best:
    | {
        delta: Vec3;
        lineStart: Vec3;
        lineEnd: Vec3;
        distance: number;
        subtype: string;
      }
    | undefined;
  let bestDistance = snapThreshold;

  for (const targetPart of nearestParts) {
    const targetFaces = getPartFaces(targetPart, targetPart.position);
    for (const dragFace of dragFaces) {
      for (const targetFace of targetFaces) {
        if (!areFacesSnapCompatible(dragFace, targetFace, snapThreshold)) continue;

        const centerDelta = subVec(targetFace.center, dragFace.center);
        const planeDistance = dotVec(centerDelta, targetFace.normal);
        const absPlaneDistance = Math.abs(planeDistance);
        if (absPlaneDistance > snapThreshold) continue;

        const clearance = Math.min(FACE_SNAP_CLEARANCE, absPlaneDistance * 0.5);
        const correctedPlaneDistance = planeDistance - Math.sign(planeDistance || 1) * clearance;

        const dragOnTargetPlane = addScaledVec(dragFace.center, targetFace.normal, correctedPlaneDistance);
        const planarOffset = subVec(dragOnTargetPlane, targetFace.center);
        const u = dotVec(planarOffset, targetFace.tangent1);
        const v = dotVec(planarOffset, targetFace.tangent2);

        const anchors: Array<{ u: number; v: number; subtype: string }> = [
          { u: 0, v: 0, subtype: 'center-2d' },
          { u: 0, v, subtype: 'center-1d' },
          { u, v: 0, subtype: 'center-1d' },
          { u: targetFace.half1 * 0.5, v, subtype: 'edge-quarterline' },
          { u: -targetFace.half1 * 0.5, v, subtype: 'edge-quarterline' },
          { u, v: targetFace.half2 * 0.5, subtype: 'edge-quarterline' },
          { u, v: -targetFace.half2 * 0.5, subtype: 'edge-quarterline' },
          { u: targetFace.half1, v: 0, subtype: 'edge-midline' },
          { u: -targetFace.half1, v: 0, subtype: 'edge-midline' },
          { u: 0, v: targetFace.half2, subtype: 'edge-midline' },
          { u: 0, v: -targetFace.half2, subtype: 'edge-midline' }
        ];

        for (const anchor of anchors) {
          if (Math.abs(anchor.u) > targetFace.half1 + 1e-4 || Math.abs(anchor.v) > targetFace.half2 + 1e-4) continue;
          const du = anchor.u - u;
          const dv = anchor.v - v;
          const candidateDistance = Math.hypot(absPlaneDistance, du, dv);
          if (candidateDistance >= bestDistance) continue;

          const tangentialDelta = addVec(mulVec(targetFace.tangent1, du), mulVec(targetFace.tangent2, dv));
          const normalDelta = mulVec(targetFace.normal, correctedPlaneDistance);
          const delta = addVec(normalDelta, tangentialDelta);
          const lineEnd = addVec(
            targetFace.center,
            addVec(mulVec(targetFace.tangent1, anchor.u), mulVec(targetFace.tangent2, anchor.v))
          );
          bestDistance = candidateDistance;
          best = {
            delta,
            lineStart: dragFace.center,
            lineEnd,
            distance: candidateDistance,
            subtype: anchor.subtype
          };
        }
      }
    }
  }

  if (!best) {
    return {
      adjustedPosition: currentPosition,
      snappedX: false,
      snappedY: false,
      snappedZ: false,
      snapLines: [],
      closestDistance: undefined
    };
  }

  const adjustedPosition = {
    x: currentPosition.x + best.delta.x,
    y: currentPosition.y + best.delta.y,
    z: currentPosition.z + best.delta.z
  };
  const snappedX = Math.abs(best.delta.x) > 1e-5;
  const snappedY = Math.abs(best.delta.y) > 1e-5;
  const snappedZ = Math.abs(best.delta.z) > 1e-5;
  const axis = dominantAxisFromDelta(best.delta);

  return {
    adjustedPosition,
    snappedX,
    snappedY,
    snappedZ,
    snapLines: withSnapFamily(
      [
        {
          axis,
          type: 'center',
          start: best.lineStart,
          end: best.lineEnd,
          snapValue: axis === 'x' ? best.lineEnd.x : axis === 'y' ? best.lineEnd.y : best.lineEnd.z
        }
      ],
      'surface-anchor',
      best.subtype
    ),
    closestDistance: best.distance
  };
}

export function detectFractionalFaceSnaps(
  draggingPart: Part,
  currentPosition: { x: number; y: number; z: number },
  allParts: Part[],
  draggingPartIds: string[],
  snapThreshold: number,
  includeGoldenRatioAnchors = false
): SnapResult {
  const dragFaces = getPartFaces(draggingPart, currentPosition);
  const draggingBounds = getPartBoundsAtPosition(draggingPart, currentPosition);
  const nearestParts = getNearestParts(draggingBounds, allParts, draggingPartIds);
  const FACE_SNAP_CLEARANCE = 1e-4;
  const fractionAnchors = [
    { f: 0, subtype: 'fraction-0' },
    { f: 0.25, subtype: 'fraction-25' },
    { f: 0.5, subtype: 'fraction-50' },
    { f: 0.75, subtype: 'fraction-75' },
    { f: 1, subtype: 'fraction-100' }
  ];
  const goldenAnchors = includeGoldenRatioAnchors
    ? [
        { f: 0.382, subtype: 'golden-38' },
        { f: 0.618, subtype: 'golden-62' }
      ]
    : [];
  const anchors = [...fractionAnchors, ...goldenAnchors];

  let best:
    | {
        delta: Vec3;
        lineStart: Vec3;
        lineEnd: Vec3;
        distance: number;
        subtype: string;
      }
    | undefined;
  let bestDistance = snapThreshold;

  for (const targetPart of nearestParts) {
    const targetFaces = getPartFaces(targetPart, targetPart.position);
    for (const dragFace of dragFaces) {
      for (const targetFace of targetFaces) {
        if (!areFacesSnapCompatible(dragFace, targetFace, snapThreshold)) continue;

        const centerDelta = subVec(targetFace.center, dragFace.center);
        const planeDistance = dotVec(centerDelta, targetFace.normal);
        const absPlaneDistance = Math.abs(planeDistance);
        if (absPlaneDistance > snapThreshold) continue;

        const clearance = Math.min(FACE_SNAP_CLEARANCE, absPlaneDistance * 0.5);
        const correctedPlaneDistance = planeDistance - Math.sign(planeDistance || 1) * clearance;
        const dragOnTargetPlane = addScaledVec(dragFace.center, targetFace.normal, correctedPlaneDistance);
        const planarOffset = subVec(dragOnTargetPlane, targetFace.center);
        const u = dotVec(planarOffset, targetFace.tangent1);
        const v = dotVec(planarOffset, targetFace.tangent2);

        for (const anchor of anchors) {
          const uTarget = (anchor.f - 0.5) * 2 * targetFace.half1;
          const du = uTarget - u;
          const candidateDistanceU = Math.hypot(absPlaneDistance, du);
          if (candidateDistanceU < bestDistance) {
            const tangentialDelta = mulVec(targetFace.tangent1, du);
            const normalDelta = mulVec(targetFace.normal, correctedPlaneDistance);
            const delta = addVec(normalDelta, tangentialDelta);
            const lineEnd = addVec(
              targetFace.center,
              addVec(mulVec(targetFace.tangent1, uTarget), mulVec(targetFace.tangent2, v))
            );
            bestDistance = candidateDistanceU;
            best = {
              delta,
              lineStart: dragFace.center,
              lineEnd,
              distance: candidateDistanceU,
              subtype: anchor.subtype
            };
          }

          const vTarget = (anchor.f - 0.5) * 2 * targetFace.half2;
          const dv = vTarget - v;
          const candidateDistanceV = Math.hypot(absPlaneDistance, dv);
          if (candidateDistanceV < bestDistance) {
            const tangentialDelta = mulVec(targetFace.tangent2, dv);
            const normalDelta = mulVec(targetFace.normal, correctedPlaneDistance);
            const delta = addVec(normalDelta, tangentialDelta);
            const lineEnd = addVec(
              targetFace.center,
              addVec(mulVec(targetFace.tangent1, u), mulVec(targetFace.tangent2, vTarget))
            );
            bestDistance = candidateDistanceV;
            best = {
              delta,
              lineStart: dragFace.center,
              lineEnd,
              distance: candidateDistanceV,
              subtype: anchor.subtype
            };
          }
        }

        for (const cornerU of [0, 1] as const) {
          for (const cornerV of [0, 1] as const) {
            const uTarget = (cornerU - 0.5) * 2 * targetFace.half1;
            const vTarget = (cornerV - 0.5) * 2 * targetFace.half2;
            const du = uTarget - u;
            const dv = vTarget - v;
            const candidateDistance = Math.hypot(absPlaneDistance, du, dv);
            if (candidateDistance >= bestDistance) continue;
            const tangentialDelta = addVec(mulVec(targetFace.tangent1, du), mulVec(targetFace.tangent2, dv));
            const normalDelta = mulVec(targetFace.normal, correctedPlaneDistance);
            const delta = addVec(normalDelta, tangentialDelta);
            const lineEnd = addVec(
              targetFace.center,
              addVec(mulVec(targetFace.tangent1, uTarget), mulVec(targetFace.tangent2, vTarget))
            );
            bestDistance = candidateDistance;
            best = {
              delta,
              lineStart: dragFace.center,
              lineEnd,
              distance: candidateDistance,
              subtype: 'corner-anchor'
            };
          }
        }
      }
    }
  }

  if (!best) {
    return {
      adjustedPosition: currentPosition,
      snappedX: false,
      snappedY: false,
      snappedZ: false,
      snapLines: [],
      closestDistance: undefined
    };
  }

  const adjustedPosition = {
    x: currentPosition.x + best.delta.x,
    y: currentPosition.y + best.delta.y,
    z: currentPosition.z + best.delta.z
  };
  const snappedX = Math.abs(best.delta.x) > 1e-5;
  const snappedY = Math.abs(best.delta.y) > 1e-5;
  const snappedZ = Math.abs(best.delta.z) > 1e-5;
  const axis = dominantAxisFromDelta(best.delta);

  return {
    adjustedPosition,
    snappedX,
    snappedY,
    snappedZ,
    snapLines: withSnapFamily(
      [
        {
          axis,
          type: 'center',
          start: best.lineStart,
          end: best.lineEnd,
          snapValue: axis === 'x' ? best.lineEnd.x : axis === 'y' ? best.lineEnd.y : best.lineEnd.z
        }
      ],
      'surface-fraction',
      best.subtype
    ),
    closestDistance: best.distance
  };
}

// Create visual line for face-to-face snap
function createFaceSnapLine(
  axis: 'x' | 'y' | 'z',
  position: number,
  draggingBounds: PartBounds,
  targetBounds: PartBounds
): SnapLine {
  const LINE_EXTENSION = 5;

  switch (axis) {
    case 'x': {
      // Line showing the X plane where faces meet
      const minY = Math.min(draggingBounds.minY, targetBounds.minY) - LINE_EXTENSION;
      const maxY = Math.max(draggingBounds.maxY, targetBounds.maxY) + LINE_EXTENSION;
      const avgZ = (draggingBounds.centerZ + targetBounds.centerZ) / 2;
      return {
        axis: 'x',
        type: 'face',
        family: 'face',
        state: 'winner',
        start: { x: position, y: minY, z: avgZ },
        end: { x: position, y: maxY, z: avgZ },
        snapValue: position
      };
    }
    case 'y': {
      // Line showing the Y plane where faces meet
      const minX = Math.min(draggingBounds.minX, targetBounds.minX) - LINE_EXTENSION;
      const maxX = Math.max(draggingBounds.maxX, targetBounds.maxX) + LINE_EXTENSION;
      const avgZ = (draggingBounds.centerZ + targetBounds.centerZ) / 2;
      return {
        axis: 'y',
        type: 'face',
        family: 'face',
        state: 'winner',
        start: { x: minX, y: position, z: avgZ },
        end: { x: maxX, y: position, z: avgZ },
        snapValue: position
      };
    }
    case 'z':
    default: {
      // Line showing the Z plane where faces meet
      const minX = Math.min(draggingBounds.minX, targetBounds.minX) - LINE_EXTENSION;
      const maxX = Math.max(draggingBounds.maxX, targetBounds.maxX) + LINE_EXTENSION;
      const avgY = (draggingBounds.centerY + targetBounds.centerY) / 2;
      return {
        axis: 'z',
        type: 'face',
        family: 'face',
        state: 'winner',
        start: { x: minX, y: avgY, z: position },
        end: { x: maxX, y: avgY, z: position },
        snapValue: position
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Feature-mating snap system
// ---------------------------------------------------------------------------
// A FeatureSocket represents a pocket/slot opening on a part's surface
// where another part can be inserted (dado, groove, mortise, rabbet, etc.).
// The abstraction is intentionally generic so future feature types (dowels,
// dovetails, etc.) can produce sockets with the same interface.

export interface FeatureSocket {
  hostPartId: string;
  featureId: string;
  /** World-space center of the socket opening */
  openingCenter: Vec3;
  /** Normal pointing OUT of the socket (away from insertion) */
  openingNormal: Vec3;
  /** First tangent spanning the opening face */
  tangent1: Vec3;
  /** Second tangent spanning the opening face */
  tangent2: Vec3;
  /** Half-extent of opening along tangent1 */
  halfExtent1: number;
  /** Half-extent of opening along tangent2 */
  halfExtent2: number;
  /** Depth of the socket (along -openingNormal) */
  depth: number;
}

// Tolerance for dimension matching (inches) — parts whose dimension is within
// this tolerance of the socket opening are considered a "tight fit".
const MATE_DIM_TOLERANCE = 0.03;
// Cosine threshold for axis alignment — OBB axis must be roughly parallel to
// socket normal / tangents to be considered for mating.
const MATE_ALIGN_THRESHOLD = 0.85;

/**
 * Compute feature sockets for a part's enabled rect_cut features.
 * Currently handles features targeting top / bottom faces.
 * The architecture allows future feature types (dowels, dovetails) to
 * generate sockets through the same FeatureSocket interface.
 */
export function getPartFeatureSockets(part: Part): FeatureSocket[] {
  const features = part.features;
  if (!features || features.length === 0) return [];

  // Build rotation matrix once (same logic as getPartOBB).
  _boundsEuler.set(
    (part.rotation.x * Math.PI) / 180,
    (part.rotation.y * Math.PI) / 180,
    (part.rotation.z * Math.PI) / 180,
    'XYZ'
  );
  _boundsQuat.setFromEuler(_boundsEuler);
  const qx = _boundsQuat.x;
  const qy = _boundsQuat.y;
  const qz = _boundsQuat.z;
  const qw = _boundsQuat.w;
  const xx = qx * qx;
  const yy = qy * qy;
  const zz = qz * qz;
  const xy = qx * qy;
  const xz = qx * qz;
  const yz = qy * qz;
  const wx = qw * qx;
  const wy = qw * qy;
  const wz = qw * qz;

  // Local axes in world space
  const axX: Vec3 = { x: 1 - 2 * (yy + zz), y: 2 * (xy + wz), z: 2 * (xz - wy) };
  const axY: Vec3 = { x: 2 * (xy - wz), y: 1 - 2 * (xx + zz), z: 2 * (yz + wx) };
  const axZ: Vec3 = { x: 2 * (xz + wy), y: 2 * (yz - wx), z: 1 - 2 * (xx + yy) };

  const halfLength = part.length / 2;
  const halfWidth = part.width / 2;
  const halfThick = part.thickness / 2;

  const sockets: FeatureSocket[] = [];

  for (const feature of features) {
    if (!feature.enabled) continue;
    if (feature.kind !== 'rect_cut') continue;

    const rectFeature = feature as RectCutFeature;
    const resolved = getResolvedRectCutFeature(rectFeature, part);

    // Currently only support top/bottom face targets
    if (resolved.target.type !== 'face') continue;
    const isTop = isTopTarget(resolved);
    const isBottom = !isTop && resolved.target.face === 'bottom_face';
    if (!isTop && !isBottom) continue;

    const depth = getRectCutDepth(resolved, part.thickness);
    if (depth <= 0) continue;

    // Local-space opening rectangle
    const startX = -halfLength + resolved.placement.x;
    const endX = startX + resolved.parameters.size.length;
    const startZ = -halfWidth + resolved.placement.z;
    const endZ = startZ + resolved.parameters.size.width;
    const localCenterX = (startX + endX) / 2;
    const localCenterZ = (startZ + endZ) / 2;
    const localCenterY = isTop ? halfThick : -halfThick;

    // Transform to world space
    const worldCenter: Vec3 = {
      x: part.position.x + axX.x * localCenterX + axY.x * localCenterY + axZ.x * localCenterZ,
      y: part.position.y + axX.y * localCenterX + axY.y * localCenterY + axZ.y * localCenterZ,
      z: part.position.z + axX.z * localCenterX + axY.z * localCenterY + axZ.z * localCenterZ
    };

    // Opening normal: +Y for top, -Y for bottom, in world space
    const openingNormal: Vec3 = isTop ? { x: axY.x, y: axY.y, z: axY.z } : { x: -axY.x, y: -axY.y, z: -axY.z };

    sockets.push({
      hostPartId: part.id,
      featureId: feature.id,
      openingCenter: worldCenter,
      openingNormal,
      tangent1: axX, // along part length
      tangent2: axZ, // along part width
      halfExtent1: resolved.parameters.size.length / 2,
      halfExtent2: resolved.parameters.size.width / 2,
      depth
    });
  }

  return sockets;
}

export interface MateSnapResult extends SnapResult {
  mateHostPartId?: string;
}

/**
 * Detect feature-mating snaps: when a dragged part's cross-section fits
 * inside the socket of a nearby part's rect cut feature (dado, groove,
 * mortise, rabbet, etc.), snap the part into position.
 *
 * The function is intentionally agnostic to the specific feature type;
 * it only inspects the FeatureSocket geometry. This makes it extensible
 * for future feature types (dowels, dovetails, etc.).
 */
export function detectFeatureMateSnaps(
  draggingPart: Part,
  currentPosition: Vec3,
  allParts: Part[],
  draggingPartIds: string[],
  snapThreshold: number
): MateSnapResult {
  const draggingOBB = getPartOBB(draggingPart, currentPosition);
  const draggingBounds = getPartBoundsAtPosition(draggingPart, currentPosition);
  const nearParts = getNearestParts(draggingBounds, allParts, draggingPartIds);

  let bestDelta: Vec3 | undefined;
  let bestDistance = Infinity;
  let bestHostPartId: string | undefined;

  for (const hostPart of nearParts) {
    const sockets = getPartFeatureSockets(hostPart);
    if (sockets.length === 0) continue;

    for (const socket of sockets) {
      const match = findBestMateMatch(draggingOBB, socket, snapThreshold);
      if (!match || match.distance >= bestDistance) continue;
      bestDistance = match.distance;
      bestDelta = match.delta;
      bestHostPartId = hostPart.id;
    }
  }

  if (!bestDelta) {
    return {
      adjustedPosition: currentPosition,
      snappedX: false,
      snappedY: false,
      snappedZ: false,
      snapLines: []
    };
  }

  const adjustedPosition = addVec(currentPosition, bestDelta);
  const snappedX = Math.abs(bestDelta.x) > 1e-5;
  const snappedY = Math.abs(bestDelta.y) > 1e-5;
  const snappedZ = Math.abs(bestDelta.z) > 1e-5;
  const axis = dominantAxisFromDelta(bestDelta);

  return {
    adjustedPosition,
    snappedX,
    snappedY,
    snappedZ,
    snapLines: [
      {
        axis,
        type: 'face',
        start: { x: currentPosition.x, y: currentPosition.y, z: currentPosition.z },
        end: { x: adjustedPosition.x, y: adjustedPosition.y, z: adjustedPosition.z },
        snapValue: axis === 'x' ? adjustedPosition.x : axis === 'y' ? adjustedPosition.y : adjustedPosition.z
      }
    ],
    mateHostPartId: bestHostPartId
  };
}

/**
 * Try to match the dragged part's OBB against a single socket.
 * Returns the snap delta and metric distance if a valid mate exists, or undefined.
 */
function findBestMateMatch(
  draggingOBB: PartOBB,
  socket: FeatureSocket,
  snapThreshold: number
): { delta: Vec3; distance: number } | undefined {
  const [axisX, axisY, axisZ] = draggingOBB.axes;
  const [hx, hy, hz] = draggingOBB.halfExtents;

  // Try each of the dragged part's OBB axes as the potential insertion axis
  const candidates = [
    {
      axis: axisX,
      halfExt: hx,
      cross: [
        { axis: axisY, half: hy },
        { axis: axisZ, half: hz }
      ]
    },
    {
      axis: axisY,
      halfExt: hy,
      cross: [
        { axis: axisX, half: hx },
        { axis: axisZ, half: hz }
      ]
    },
    {
      axis: axisZ,
      halfExt: hz,
      cross: [
        { axis: axisX, half: hx },
        { axis: axisY, half: hy }
      ]
    }
  ];

  let bestResult: { delta: Vec3; distance: number } | undefined;
  let bestDist = Infinity;

  for (const cand of candidates) {
    const alignment = dotVec(cand.axis, socket.openingNormal);
    if (Math.abs(alignment) < MATE_ALIGN_THRESHOLD) continue;

    // Determine which cross-section axis maps to which socket tangent
    const cs0AlignT1 = Math.abs(dotVec(cand.cross[0].axis, socket.tangent1));
    const cs0AlignT2 = Math.abs(dotVec(cand.cross[0].axis, socket.tangent2));

    let socketHE1: number;
    let socketHE2: number;
    let csHalf1: number;
    let csHalf2: number;
    let snapT1: Vec3;
    let snapT2: Vec3;

    if (cs0AlignT1 >= cs0AlignT2) {
      socketHE1 = socket.halfExtent1;
      socketHE2 = socket.halfExtent2;
      csHalf1 = cand.cross[0].half;
      csHalf2 = cand.cross[1].half;
      snapT1 = socket.tangent1;
      snapT2 = socket.tangent2;
    } else {
      socketHE1 = socket.halfExtent2;
      socketHE2 = socket.halfExtent1;
      csHalf1 = cand.cross[0].half;
      csHalf2 = cand.cross[1].half;
      snapT1 = socket.tangent2;
      snapT2 = socket.tangent1;
    }

    // Both cross-section dimensions must fit within the socket opening
    const fits1 = 2 * csHalf1 <= 2 * socketHE1 + MATE_DIM_TOLERANCE;
    const fits2 = 2 * csHalf2 <= 2 * socketHE2 + MATE_DIM_TOLERANCE;
    if (!fits1 || !fits2) continue;

    // At least one dimension must be a snug/tight fit
    const tight1 = Math.abs(2 * csHalf1 - 2 * socketHE1) < MATE_DIM_TOLERANCE;
    const tight2 = Math.abs(2 * csHalf2 - 2 * socketHE2) < MATE_DIM_TOLERANCE;
    if (!tight1 && !tight2) continue;

    // --- Insertion axis delta ---
    // The entering face of the dragged part should sit at the socket floor.
    const n = socket.openingNormal;
    const sign = alignment > 0 ? 1 : -1;
    const partCenterAlongN = dotVec(draggingOBB.center, n);
    const enterFaceAlongN = partCenterAlongN - sign * cand.halfExt;
    const openingAlongN = dotVec(socket.openingCenter, n);
    const floorAlongN = openingAlongN - socket.depth;

    // Only snap when the part is reasonably close to the socket surface.
    const distFromSurface = enterFaceAlongN - openingAlongN;
    if (distFromSurface < -socket.depth - snapThreshold) continue;
    if (distFromSurface > snapThreshold) continue;

    const insertionDelta = floorAlongN - enterFaceAlongN;
    let delta = mulVec(n, insertionDelta);

    // --- Cross-section centering for tight-fit dimensions ---
    if (tight1) {
      const partAlongT1 = dotVec(draggingOBB.center, snapT1);
      const socketAlongT1 = dotVec(socket.openingCenter, snapT1);
      const dt1 = socketAlongT1 - partAlongT1;
      if (Math.abs(dt1) <= snapThreshold) {
        delta = addVec(delta, mulVec(snapT1, dt1));
      }
    }
    if (tight2) {
      const partAlongT2 = dotVec(draggingOBB.center, snapT2);
      const socketAlongT2 = dotVec(socket.openingCenter, snapT2);
      const dt2 = socketAlongT2 - partAlongT2;
      if (Math.abs(dt2) <= snapThreshold) {
        delta = addVec(delta, mulVec(snapT2, dt2));
      }
    }

    const distance = lenVec(delta);
    if (distance < bestDist) {
      bestDist = distance;
      bestResult = { delta, distance };
    }
  }

  return bestResult;
}
