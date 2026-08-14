// ADR-009: Per-part geometry bundle types.
//
// Every interaction subsystem (snap, hit-test, measurement, collision) reads
// from a typed view on this bundle. Local-space only; consumers apply world
// transforms (position + rotation) themselves.

import type { Vec3 } from '../tools/toolSolver';

export type GeometryVersion = string;

// ─────────────────────────────────────────────────────────────────────────────
// Bounds
// ─────────────────────────────────────────────────────────────────────────────

export interface Aabb {
  min: Vec3;
  max: Vec3;
}

export interface Obb {
  /** Center of the box in local space (origin for box parts). */
  center: Vec3;
  /** Half-extents along each local axis. */
  halfExtents: Vec3;
  /** Local-space axis basis. Identity for box parts; will differ for cuts. */
  axisU: Vec3;
  axisV: Vec3;
  axisW: Vec3;
}

// ─────────────────────────────────────────────────────────────────────────────
// Render mesh descriptor
//
// Today this is always a unit box scaled by length × thickness × width to match
// the existing partGeometry.ts setup. When custom cuts arrive, this grows.
// ─────────────────────────────────────────────────────────────────────────────

export interface RenderMeshDescriptor {
  geometryKey: 'unit-box';
  scale: { length: number; width: number; thickness: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hit proxy: what the §11 hit-test service intersects against
// ─────────────────────────────────────────────────────────────────────────────

export interface HitProxy {
  /** Local-space AABB used as the ray-box test target. */
  localAabb: Aabb;
}

// ─────────────────────────────────────────────────────────────────────────────
// Snap anchor graph: faces, edges, fractional lines, corners
// ─────────────────────────────────────────────────────────────────────────────

export type AnchorAxis = 'x' | 'y' | 'z';

export interface FaceAnchor {
  kind: 'face';
  /** Which face: 'x' = the ±X faces, etc. */
  axis: AnchorAxis;
  /** Which side: -1 (low) or +1 (high). */
  side: -1 | 1;
  /** Local-space point on the face (center of the face). */
  point: Vec3;
  /** Local-space outward normal. */
  normal: Vec3;
}

export interface EdgeAnchor {
  kind: 'edge';
  /** Axis the edge is parallel to in local space. */
  axis: AnchorAxis;
  /** Local-space endpoints. */
  start: Vec3;
  end: Vec3;
}

export interface CornerAnchor {
  kind: 'corner';
  /** Local-space corner point. */
  point: Vec3;
  /** Sign on each axis: -1 (min) or +1 (max). */
  axisSigns: { x: -1 | 1; y: -1 | 1; z: -1 | 1 };
}

export interface FractionLine {
  kind: 'fraction-line';
  /** Which face the line lies on. */
  faceAxis: AnchorAxis;
  faceSide: -1 | 1;
  /** Which in-face axis the line runs along. */
  alongAxis: AnchorAxis;
  /** Fraction along the perpendicular in-face axis (0..1, 0.5 = midline, etc.). */
  fraction: number;
  /** Local-space endpoints of the line. */
  start: Vec3;
  end: Vec3;
}

export interface SnapAnchorGraph {
  faces: ReadonlyArray<FaceAnchor>;
  edges: ReadonlyArray<EdgeAnchor>;
  corners: ReadonlyArray<CornerAnchor>;
  /** Fractional anchor lines on each face (midline, quarter-lines, etc.). */
  fractionLines: ReadonlyArray<FractionLine>;
  /** Local-space center of the part. */
  center: Vec3;
}

// ─────────────────────────────────────────────────────────────────────────────
// Measure graph: what overlay components project to label
// ─────────────────────────────────────────────────────────────────────────────

export interface MeasureSegment {
  /** Axis the segment runs along. */
  axis: AnchorAxis;
  start: Vec3;
  end: Vec3;
  /** Local-space length. */
  length: number;
}

export interface MeasureGraph {
  /** The three primary dimensions (length, width, thickness). */
  primarySegments: {
    length: MeasureSegment;
    width: MeasureSegment;
    thickness: MeasureSegment;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Collision proxy: §9 reads this for overlap and fit decisions
// ─────────────────────────────────────────────────────────────────────────────

export interface CollisionProxy {
  /** Local-space AABB; world-transformed by the caller. */
  localAabb: Aabb;
  /** Local-space OBB; matches the visible part for boxes, will diverge for cuts. */
  localObb: Obb;
}

// ─────────────────────────────────────────────────────────────────────────────
// PartGeometryBundle
// ─────────────────────────────────────────────────────────────────────────────

export interface PartGeometryBundle {
  readonly partId: string;
  readonly versionKey: GeometryVersion;
  readonly bounds: { readonly localAabb: Aabb; readonly localObb: Obb };
  readonly renderMesh: RenderMeshDescriptor;
  readonly hitProxy: HitProxy;
  readonly snapGraph: SnapAnchorGraph;
  readonly measureGraph: MeasureGraph;
  readonly collisionProxy: CollisionProxy;
}
