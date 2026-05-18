// ADR-009: Derive a `PartGeometryBundle` from a box-shaped `Part`.
//
// Phase §5a: handles the current part shape (length × width × thickness box).
// Phase §6 will add a dispatcher that routes parts with fabrication operations
// to a different deriver while keeping the bundle interface stable.

import type { Part } from '../../types';
import type {
  Aabb,
  CornerAnchor,
  EdgeAnchor,
  FaceAnchor,
  FractionLine,
  GeometryVersion,
  HitProxy,
  MeasureGraph,
  Obb,
  PartGeometryBundle,
  SnapAnchorGraph
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Version key
//
// Captures every part field that affects the bundle shape. Position is NOT
// part of the key — bundles are local-space.
// ─────────────────────────────────────────────────────────────────────────────

export function computeBoxVersionKey(part: Part): GeometryVersion {
  return [
    'box',
    part.length.toFixed(6),
    part.width.toFixed(6),
    part.thickness.toFixed(6),
    part.rotation.x.toFixed(4),
    part.rotation.y.toFixed(4),
    part.rotation.z.toFixed(4)
  ].join('|');
}

// ─────────────────────────────────────────────────────────────────────────────
// Bounds
// ─────────────────────────────────────────────────────────────────────────────

function computeLocalAabb(part: Part): Aabb {
  const hl = part.length / 2;
  const hw = part.width / 2;
  const ht = part.thickness / 2;
  return {
    min: { x: -hl, y: -ht, z: -hw },
    max: { x: hl, y: ht, z: hw }
  };
}

function computeLocalObb(part: Part): Obb {
  // For box parts, OBB matches AABB in local space — the basis is identity.
  // Custom cuts will diverge here.
  return {
    center: { x: 0, y: 0, z: 0 },
    halfExtents: { x: part.length / 2, y: part.thickness / 2, z: part.width / 2 },
    axisU: { x: 1, y: 0, z: 0 },
    axisV: { x: 0, y: 1, z: 0 },
    axisW: { x: 0, y: 0, z: 1 }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Snap anchor graph
// ─────────────────────────────────────────────────────────────────────────────

function computeFaces(part: Part): ReadonlyArray<FaceAnchor> {
  const hl = part.length / 2;
  const hw = part.width / 2;
  const ht = part.thickness / 2;
  return [
    { kind: 'face', axis: 'x', side: -1, point: { x: -hl, y: 0, z: 0 }, normal: { x: -1, y: 0, z: 0 } },
    { kind: 'face', axis: 'x', side: 1, point: { x: hl, y: 0, z: 0 }, normal: { x: 1, y: 0, z: 0 } },
    { kind: 'face', axis: 'y', side: -1, point: { x: 0, y: -ht, z: 0 }, normal: { x: 0, y: -1, z: 0 } },
    { kind: 'face', axis: 'y', side: 1, point: { x: 0, y: ht, z: 0 }, normal: { x: 0, y: 1, z: 0 } },
    { kind: 'face', axis: 'z', side: -1, point: { x: 0, y: 0, z: -hw }, normal: { x: 0, y: 0, z: -1 } },
    { kind: 'face', axis: 'z', side: 1, point: { x: 0, y: 0, z: hw }, normal: { x: 0, y: 0, z: 1 } }
  ];
}

function computeEdges(part: Part): ReadonlyArray<EdgeAnchor> {
  const hl = part.length / 2;
  const hw = part.width / 2;
  const ht = part.thickness / 2;
  const edges: EdgeAnchor[] = [];

  // Edges parallel to X (4 total): pairs of (±y, ±z)
  for (const sy of [-1, 1] as const) {
    for (const sz of [-1, 1] as const) {
      edges.push({
        kind: 'edge',
        axis: 'x',
        start: { x: -hl, y: sy * ht, z: sz * hw },
        end: { x: hl, y: sy * ht, z: sz * hw }
      });
    }
  }
  // Edges parallel to Y (4 total): pairs of (±x, ±z)
  for (const sx of [-1, 1] as const) {
    for (const sz of [-1, 1] as const) {
      edges.push({
        kind: 'edge',
        axis: 'y',
        start: { x: sx * hl, y: -ht, z: sz * hw },
        end: { x: sx * hl, y: ht, z: sz * hw }
      });
    }
  }
  // Edges parallel to Z (4 total): pairs of (±x, ±y)
  for (const sx of [-1, 1] as const) {
    for (const sy of [-1, 1] as const) {
      edges.push({
        kind: 'edge',
        axis: 'z',
        start: { x: sx * hl, y: sy * ht, z: -hw },
        end: { x: sx * hl, y: sy * ht, z: hw }
      });
    }
  }

  return edges;
}

function computeCorners(part: Part): ReadonlyArray<CornerAnchor> {
  const hl = part.length / 2;
  const hw = part.width / 2;
  const ht = part.thickness / 2;
  const corners: CornerAnchor[] = [];
  for (const sx of [-1, 1] as const) {
    for (const sy of [-1, 1] as const) {
      for (const sz of [-1, 1] as const) {
        corners.push({
          kind: 'corner',
          point: { x: sx * hl, y: sy * ht, z: sz * hw },
          axisSigns: { x: sx, y: sy, z: sz }
        });
      }
    }
  }
  return corners;
}

const FRACTION_VALUES = [0.25, 0.5, 0.75] as const;

function computeFractionLines(part: Part): ReadonlyArray<FractionLine> {
  // For each of the 6 faces, generate a midline along each of the two in-face
  // axes plus quarter-lines. Per ADR-008 / snap blueprint, downstream snap
  // filters subselect which families are enabled.
  const hl = part.length / 2;
  const hw = part.width / 2;
  const ht = part.thickness / 2;
  const lines: FractionLine[] = [];

  for (const faceAxis of ['x', 'y', 'z'] as const) {
    for (const faceSide of [-1, 1] as const) {
      const faceCenter =
        faceAxis === 'x'
          ? { x: faceSide * hl, y: 0, z: 0 }
          : faceAxis === 'y'
            ? { x: 0, y: faceSide * ht, z: 0 }
            : { x: 0, y: 0, z: faceSide * hw };

      // The two axes that lie in the plane of this face.
      const inFaceAxes = (['x', 'y', 'z'] as const).filter((a) => a !== faceAxis) as ['x' | 'y' | 'z', 'x' | 'y' | 'z'];

      for (const alongAxis of inFaceAxes) {
        const perpAxis = inFaceAxes.find((a) => a !== alongAxis)!;
        const perpHalf = perpAxis === 'x' ? hl : perpAxis === 'y' ? ht : hw;
        const alongHalf = alongAxis === 'x' ? hl : alongAxis === 'y' ? ht : hw;

        for (const fraction of FRACTION_VALUES) {
          // Fraction is measured from one end of the perpendicular axis;
          // convert to local-coord position along that axis.
          // Map fraction in [0,1] to local offset in [-perpHalf, +perpHalf].
          const perpOffset = (fraction - 0.5) * perpHalf * 2;

          const startBase = { ...faceCenter };
          const endBase = { ...faceCenter };
          // Move both endpoints along `perpAxis` by `perpOffset`.
          if (perpAxis === 'x') {
            startBase.x = perpOffset;
            endBase.x = perpOffset;
          } else if (perpAxis === 'y') {
            startBase.y = perpOffset;
            endBase.y = perpOffset;
          } else {
            startBase.z = perpOffset;
            endBase.z = perpOffset;
          }
          // Span along `alongAxis` over [-alongHalf, +alongHalf].
          if (alongAxis === 'x') {
            startBase.x = -alongHalf;
            endBase.x = alongHalf;
          } else if (alongAxis === 'y') {
            startBase.y = -alongHalf;
            endBase.y = alongHalf;
          } else {
            startBase.z = -alongHalf;
            endBase.z = alongHalf;
          }
          lines.push({
            kind: 'fraction-line',
            faceAxis,
            faceSide,
            alongAxis,
            fraction,
            start: startBase,
            end: endBase
          });
        }
      }
    }
  }
  return lines;
}

// ─────────────────────────────────────────────────────────────────────────────
// Measure graph
// ─────────────────────────────────────────────────────────────────────────────

function computeMeasureGraph(part: Part): MeasureGraph {
  const hl = part.length / 2;
  const hw = part.width / 2;
  const ht = part.thickness / 2;
  return {
    primarySegments: {
      length: {
        axis: 'x',
        start: { x: -hl, y: 0, z: 0 },
        end: { x: hl, y: 0, z: 0 },
        length: part.length
      },
      width: {
        axis: 'z',
        start: { x: 0, y: 0, z: -hw },
        end: { x: 0, y: 0, z: hw },
        length: part.width
      },
      thickness: {
        axis: 'y',
        start: { x: 0, y: -ht, z: 0 },
        end: { x: 0, y: ht, z: 0 },
        length: part.thickness
      }
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public derivation
// ─────────────────────────────────────────────────────────────────────────────

export function deriveBoxBundle(part: Part): PartGeometryBundle {
  const localAabb = computeLocalAabb(part);
  const localObb = computeLocalObb(part);
  const hitProxy: HitProxy = { localAabb };
  const snapGraph: SnapAnchorGraph = {
    faces: computeFaces(part),
    edges: computeEdges(part),
    corners: computeCorners(part),
    fractionLines: computeFractionLines(part),
    center: { x: 0, y: 0, z: 0 }
  };
  return {
    partId: part.id,
    versionKey: computeBoxVersionKey(part),
    bounds: { localAabb, localObb },
    renderMesh: {
      geometryKey: 'unit-box',
      scale: { length: part.length, width: part.width, thickness: part.thickness }
    },
    hitProxy,
    snapGraph,
    measureGraph: computeMeasureGraph(part),
    collisionProxy: { localAabb, localObb }
  };
}
