import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Part, PartFeature, RectCutFeature } from '../types';
import { getEdgeBevelInsetAt, getEndCutInsetAt, getPartEdgeBevelProfiles, getPartEndCutProfiles } from './endCutUtils';
import {
  getRectCutDepth,
  getRectCutPreviewSupport,
  getResolvedRectCutFeature,
  isBottomTarget,
  isSideFaceTarget,
  isTopTarget
} from './rectCutUtils';

type Point2 = { x: number; z: number };

const geometryCache = new Map<string, THREE.BufferGeometry>();
const MAX_GEOMETRY_CACHE_ENTRIES = 128;
const _worldAabbPosition = new THREE.Vector3();
const _worldAabbQuaternion = new THREE.Quaternion();
const _worldAabbEuler = new THREE.Euler();
const _worldAabbCorner = new THREE.Vector3();

function featureKey(part: Part): string {
  return JSON.stringify({
    length: part.length,
    width: part.width,
    thickness: part.thickness,
    features: (part.features ?? []).filter((feature) => feature.enabled)
  });
}

function clonePoint(point: Point2): Point2 {
  return { x: point.x, z: point.z };
}

function linePointAtZ(start: Point2, end: Point2, z: number): Point2 {
  if (Math.abs(end.z - start.z) < 1e-9) return { x: start.x, z };
  const t = (z - start.z) / (end.z - start.z);
  return {
    x: start.x + (end.x - start.x) * t,
    z
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getEnabledFeatures(part: Part): PartFeature[] {
  return (part.features ?? []).filter((feature) => feature.enabled);
}

export function hasRenderablePartFeatures(part: Part): boolean {
  return getEnabledFeatures(part).length > 0;
}

function hasOnlyEndCutFeatures(part: Part): boolean {
  const features = getEnabledFeatures(part);
  return features.length > 0 && features.every((feature) => feature.kind === 'end_cut');
}

function buildOuterContour(part: Part): Point2[] {
  const halfLength = part.length / 2;
  const halfWidth = part.width / 2;
  const profiles = getPartEndCutProfiles(part);
  const leftFrontInset = profiles.left.horizontalFlip ? profiles.left.horizontalInset : 0;
  const leftBackInset = profiles.left.horizontalFlip ? 0 : profiles.left.horizontalInset;
  const rightFrontInset = profiles.right.horizontalFlip ? 0 : profiles.right.horizontalInset;
  const rightBackInset = profiles.right.horizontalFlip ? profiles.right.horizontalInset : 0;

  return [
    { x: -halfLength + profiles.left.baseInset + leftFrontInset, z: -halfWidth },
    { x: halfLength - profiles.right.baseInset - rightFrontInset, z: -halfWidth },
    { x: halfLength - profiles.right.baseInset - rightBackInset, z: halfWidth },
    { x: -halfLength + profiles.left.baseInset + leftBackInset, z: halfWidth }
  ];
}

function getCornerKey(feature: RectCutFeature): 'left_front' | 'right_front' | 'right_back' | 'left_back' {
  const target = feature.target.type === 'corner' ? feature.target.corner : 'front_left_corner';
  const left = target.includes('left');
  const front = target.includes('front');
  if (left && front) return 'left_front';
  if (!left && front) return 'right_front';
  if (!left && !front) return 'right_back';
  return 'left_back';
}

function mapEdgeFamily(feature: RectCutFeature): 'front' | 'back' | 'left' | 'right' {
  const edge = feature.target.type === 'edge' ? feature.target.edge : 'top_front_edge';
  if (edge.includes('front')) return 'front';
  if (edge.includes('back')) return 'back';
  if (edge.includes('left')) return 'left';
  return 'right';
}

function applyCornerNotch(contour: Point2[], feature: RectCutFeature): Point2[] {
  const sizeX = feature.parameters.size.length;
  const sizeZ = feature.parameters.size.width;
  const [lf, rf, rb, lb] = contour.map(clonePoint);
  const halfWidth = Math.abs(rf.z - rb.z) / 2;

  switch (getCornerKey(feature)) {
    case 'left_front': {
      const z = clamp(-halfWidth + sizeZ, lf.z, lb.z);
      const leftIn = linePointAtZ(lf, lb, z);
      return [{ x: lf.x + sizeX, z: lf.z }, rf, rb, lb, leftIn, { x: lf.x + sizeX, z }];
    }
    case 'right_front': {
      const z = clamp(-halfWidth + sizeZ, rf.z, rb.z);
      const rightIn = linePointAtZ(rf, rb, z);
      return [lf, { x: rf.x - sizeX, z: rf.z }, { x: rf.x - sizeX, z }, rightIn, rb, lb];
    }
    case 'right_back': {
      const z = clamp(halfWidth - sizeZ, rf.z, rb.z);
      const rightIn = linePointAtZ(rf, rb, z);
      return [lf, rf, rightIn, { x: rb.x - sizeX, z }, { x: rb.x - sizeX, z: rb.z }, lb];
    }
    case 'left_back':
    default: {
      const z = clamp(halfWidth - sizeZ, lf.z, lb.z);
      const leftIn = linePointAtZ(lf, lb, z);
      return [lf, rf, rb, { x: lb.x + sizeX, z: lb.z }, { x: lb.x + sizeX, z }, leftIn];
    }
  }
}

function applyEdgeNotch(contour: Point2[], feature: RectCutFeature): Point2[] {
  const sizeX = feature.parameters.size.length;
  const sizeZ = feature.parameters.size.width;
  const [lf, rf, rb, lb] = contour.map(clonePoint);
  const minX = Math.min(lf.x, lb.x);
  const halfWidth = Math.abs(rf.z - rb.z) / 2;
  const family = mapEdgeFamily(feature);

  // Threshold for considering the notch flush with a corner.
  // When flush, the corner vertex is omitted so the extruded wall
  // correctly shows the cutout (like a corner notch).
  const flush = 0.001;

  if (family === 'front') {
    const startX = clamp(minX + feature.placement.x, lf.x, rf.x - sizeX);
    const endX = clamp(startX + sizeX, startX, rf.x);
    const flushLeft = startX <= lf.x + flush;
    const flushRight = endX >= rf.x - flush;
    const pts: Point2[] = [];
    if (!flushLeft) pts.push(lf, { x: startX, z: lf.z });
    pts.push({ x: startX, z: lf.z + sizeZ }, { x: endX, z: lf.z + sizeZ });
    if (!flushRight) pts.push({ x: endX, z: lf.z }, rf);
    pts.push(rb, lb);
    return pts;
  }

  if (family === 'back') {
    const startX = clamp(minX + feature.placement.x, lb.x, rb.x - sizeX);
    const endX = clamp(startX + sizeX, startX, rb.x);
    const flushLeft = startX <= lb.x + flush;
    const flushRight = endX >= rb.x - flush;
    const pts: Point2[] = [];
    pts.push(lf, rf);
    if (!flushRight) pts.push(rb, { x: endX, z: rb.z });
    pts.push({ x: endX, z: rb.z - sizeZ }, { x: startX, z: rb.z - sizeZ });
    if (!flushLeft) pts.push({ x: startX, z: rb.z }, lb);
    // When flushLeft, omit lb — closing edge goes directly from notch interior to lf
    return pts;
  }

  if (family === 'left') {
    const startZ = clamp(-halfWidth + feature.placement.z, lf.z, lb.z - sizeZ);
    const endZ = clamp(startZ + sizeZ, startZ, lb.z);
    const flushFront = startZ <= lf.z + flush;
    const flushBack = endZ >= lb.z - flush;
    const pStart = linePointAtZ(lf, lb, startZ);
    const pEnd = linePointAtZ(lf, lb, endZ);
    const pts: Point2[] = [];
    if (!flushFront) pts.push(lf);
    pts.push(rf, rb);
    if (!flushBack) pts.push(lb, { x: pEnd.x, z: endZ });
    // When flushBack, omit lb — closing edge goes directly from rb to notch interior
    pts.push({ x: pEnd.x + sizeX, z: endZ }, { x: pStart.x + sizeX, z: startZ });
    if (!flushFront) pts.push({ x: pStart.x, z: startZ });
    return pts;
  }

  // right
  const startZ = clamp(-halfWidth + feature.placement.z, rf.z, rb.z - sizeZ);
  const endZ = clamp(startZ + sizeZ, startZ, rb.z);
  const flushFront = startZ <= rf.z + flush;
  const flushBack = endZ >= rb.z - flush;
  const pStart = linePointAtZ(rf, rb, startZ);
  const pEnd = linePointAtZ(rf, rb, endZ);
  const pts: Point2[] = [];
  pts.push(lf);
  if (!flushFront) pts.push(rf, { x: pStart.x, z: startZ });
  pts.push({ x: pStart.x - sizeX, z: startZ }, { x: pEnd.x - sizeX, z: endZ });
  if (!flushBack) pts.push({ x: pEnd.x, z: endZ }, rb);
  // When flushBack, omit rb — closing edge connects notch interior to lb directly
  pts.push(lb);
  return pts;
}

function shapeFromContour(contour: Point2[], holes: Point2[][]): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(contour[0].x, contour[0].z);
  for (let i = 1; i < contour.length; i += 1) {
    shape.lineTo(contour[i].x, contour[i].z);
  }
  shape.closePath();

  for (const holePoints of holes) {
    const hole = new THREE.Path();
    hole.moveTo(holePoints[0].x, holePoints[0].z);
    for (let i = 1; i < holePoints.length; i += 1) {
      hole.lineTo(holePoints[i].x, holePoints[i].z);
    }
    hole.closePath();
    shape.holes.push(hole);
  }

  return shape;
}

function getRectCutHole(feature: RectCutFeature, part: Part): Point2[] | null {
  const halfLength = part.length / 2;
  const halfWidth = part.width / 2;
  const margin = 0.001;

  const rawSX = -halfLength + feature.placement.x;
  const rawSZ = -halfWidth + feature.placement.z;
  const rawEX = rawSX + feature.parameters.size.length;
  const rawEZ = rawSZ + feature.parameters.size.width;

  // When an edge of the cut is flush with the part boundary, extend it to
  // the boundary instead of clamping inward — this eliminates the thin
  // sliver of material that would otherwise remain.
  const flushL = rawSX <= -halfLength + margin;
  const flushR = rawEX >= halfLength - margin;
  const flushF = rawSZ <= -halfWidth + margin;
  const flushB = rawEZ >= halfWidth - margin;

  const startX = flushL ? -halfLength : clamp(rawSX, -halfLength + margin, halfLength - margin);
  const startZ = flushF ? -halfWidth : clamp(rawSZ, -halfWidth + margin, halfWidth - margin);
  const endX = flushR ? halfLength : clamp(rawEX, startX + margin, halfLength - margin);
  const endZ = flushB ? halfWidth : clamp(rawEZ, startZ + margin, halfWidth - margin);

  if (endX <= startX || endZ <= startZ) return null;

  return [
    { x: startX, z: startZ },
    { x: startX, z: endZ },
    { x: endX, z: endZ },
    { x: endX, z: startZ }
  ];
}

/**
 * Apply a through-depth cutout as a contour modification when it's flush
 * with one or more edges. Returns the modified contour, or null if the
 * cutout is fully interior (should be kept as a hole instead).
 */
function applyCutoutToContour(contour: Point2[], feature: RectCutFeature, part: Part): Point2[] | null {
  const halfLength = part.length / 2;
  const halfWidth = part.width / 2;
  const flush = 0.001;

  const rawSX = -halfLength + feature.placement.x;
  const rawSZ = -halfWidth + feature.placement.z;
  const rawEX = rawSX + feature.parameters.size.length;
  const rawEZ = rawSZ + feature.parameters.size.width;

  const fl = rawSX <= -halfLength + flush;
  const fr = rawEX >= halfLength - flush;
  const ff = rawSZ <= -halfWidth + flush;
  const fb = rawEZ >= halfWidth - flush;

  if (!fl && !fr && !ff && !fb) return null; // fully interior → use hole

  const flushCount = [fl, fr, ff, fb].filter(Boolean).length;

  // 3-edge flush (e.g. dado at one end spanning full width): clip the contour
  // by clamping points inside the cut zone to the cut boundary. The remaining
  // material is a single connected region.
  if (flushCount >= 3) {
    const sx = Math.max(-halfLength, rawSX);
    const sz = Math.max(-halfWidth, rawSZ);
    const ex = Math.min(halfLength, rawEX);
    const ez = Math.min(halfWidth, rawEZ);

    // Only clamp along axes where the cut is flush on ONE side (not both).
    // When flush on both sides of an axis, the cut spans the full dimension
    // and there's nothing to clip along that axis.
    const clampX = fl !== fr; // exactly one of left/right is flush
    const clampZ = ff !== fb; // exactly one of front/back is flush

    const clipped = contour.map((p) => ({
      x: clampX ? (fl ? Math.max(p.x, ex) : Math.min(p.x, sx)) : p.x,
      z: clampZ ? (ff ? Math.max(p.z, ez) : Math.min(p.z, sz)) : p.z
    }));

    // Remove consecutive duplicate points
    const deduped = clipped.filter(
      (p, i) => i === 0 || Math.abs(p.x - clipped[i - 1].x) > 1e-6 || Math.abs(p.z - clipped[i - 1].z) > 1e-6
    );
    // Also check wrap-around duplicate
    if (
      deduped.length > 1 &&
      Math.abs(deduped[0].x - deduped[deduped.length - 1].x) < 1e-6 &&
      Math.abs(deduped[0].z - deduped[deduped.length - 1].z) < 1e-6
    ) {
      deduped.pop();
    }

    return deduped.length >= 3 ? deduped : null;
  }

  // Opposite-edge flush without a third creates disconnected regions — keep as hole
  if (flushCount === 2 && ((fl && fr) || (ff && fb))) return null;

  const sx = Math.max(-halfLength, rawSX);
  const sz = Math.max(-halfWidth, rawSZ);
  const ex = Math.min(halfLength, rawEX);
  const ez = Math.min(halfWidth, rawEZ);

  const lf = contour[0] ?? { x: -halfLength, z: -halfWidth };
  const rf = contour[1] ?? { x: halfLength, z: -halfWidth };
  const rb = contour[2] ?? { x: halfLength, z: halfWidth };
  const lb = contour[3] ?? { x: -halfLength, z: halfWidth };

  const pts: Point2[] = [];

  // Walk CCW around the outer rect: lf → rf → rb → lb.
  // At each edge, if the cutout is flush, route inward through the cutout.
  // At each corner, skip it if the cutout covers both adjacent edges.
  // When two adjacent edges are both flush (corner cutout), only the FIRST
  // edge (in CCW order) emits the routing — the second just continues past.

  // --- Front edge (lf → rf) ---
  if (!(fl && ff)) pts.push(lf);
  if (ff && !fl) {
    // Route through cutout on front edge (left edge didn't already route)
    pts.push({ x: sx, z: lf.z }, { x: sx, z: ez }, { x: ex, z: ez });
    if (!fr) pts.push({ x: ex, z: lf.z });
  }

  // --- Right edge (rf → rb) ---
  if (!(ff && fr)) pts.push(rf);
  if (fr && !ff) {
    // Route through cutout on right edge (front edge didn't already route)
    pts.push({ x: rf.x, z: sz }, { x: sx, z: sz }, { x: sx, z: ez });
    if (!fb) pts.push({ x: rf.x, z: ez });
  }

  // --- Back edge (rb → lb) ---
  if (!(fr && fb)) pts.push(rb);
  if (fb && !fr) {
    // Route through cutout on back edge (right edge didn't already route)
    pts.push({ x: ex, z: rb.z }, { x: ex, z: sz }, { x: sx, z: sz });
    if (!fl) pts.push({ x: sx, z: rb.z });
  }

  // --- Left edge (lb → lf) ---
  if (!(fb && fl)) pts.push(lb);
  if (fl && !fb) {
    // Route through cutout on left edge (back edge didn't already route)
    pts.push({ x: lf.x, z: ez }, { x: ex, z: ez }, { x: ex, z: sz });
    if (!ff) pts.push({ x: lf.x, z: sz });
  }

  return pts.length >= 3 ? pts : null;
}

function getLayerGeometry(contour: Point2[], holes: Point2[][], depth: number, yMin: number): THREE.BufferGeometry {
  const shape = shapeFromContour(contour, holes);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 1
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, yMin, 0);
  return geometry;
}

type Point3 = { x: number; y: number; z: number };

function addQuad(vertices: number[], a: Point3, b: Point3, c: Point3, d: Point3): void {
  vertices.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
}

function createEndCutOnlyGeometry(part: Part): THREE.BufferGeometry {
  const profiles = getPartEndCutProfiles(part);
  const edgeProfiles = getPartEdgeBevelProfiles(part);
  const halfLength = part.length / 2;
  const halfWidth = part.width / 2;
  const halfThickness = part.thickness / 2;
  // Corners are built in CONTOUR space (front at -halfWidth, back at
  // +halfWidth) and mirrored into world space on emit, exactly as the layered
  // extrusion path does via rotateX(-π/2). Keeping both paths on one
  // convention is what stops asymmetric cuts from rendering on opposite sides
  // depending on whether a part also carries a rect cut.
  const frontZAt = (y: number) => -halfWidth + getEdgeBevelInsetAt('front', edgeProfiles, part, { y });
  const backZAt = (y: number) => halfWidth - getEdgeBevelInsetAt('back', edgeProfiles, part, { y });

  const lfb = {
    x: -halfLength + getEndCutInsetAt('left', profiles, part, { y: -halfThickness, z: -halfWidth }),
    y: -halfThickness,
    z: frontZAt(-halfThickness)
  };
  const lbb = {
    x: -halfLength + getEndCutInsetAt('left', profiles, part, { y: -halfThickness, z: halfWidth }),
    y: -halfThickness,
    z: backZAt(-halfThickness)
  };
  const lbt = {
    x: -halfLength + getEndCutInsetAt('left', profiles, part, { y: halfThickness, z: halfWidth }),
    y: halfThickness,
    z: backZAt(halfThickness)
  };
  const lft = {
    x: -halfLength + getEndCutInsetAt('left', profiles, part, { y: halfThickness, z: -halfWidth }),
    y: halfThickness,
    z: frontZAt(halfThickness)
  };
  const rfb = {
    x: halfLength - getEndCutInsetAt('right', profiles, part, { y: -halfThickness, z: -halfWidth }),
    y: -halfThickness,
    z: frontZAt(-halfThickness)
  };
  const rbb = {
    x: halfLength - getEndCutInsetAt('right', profiles, part, { y: -halfThickness, z: halfWidth }),
    y: -halfThickness,
    z: backZAt(-halfThickness)
  };
  const rbt = {
    x: halfLength - getEndCutInsetAt('right', profiles, part, { y: halfThickness, z: halfWidth }),
    y: halfThickness,
    z: backZAt(halfThickness)
  };
  const rft = {
    x: halfLength - getEndCutInsetAt('right', profiles, part, { y: halfThickness, z: -halfWidth }),
    y: halfThickness,
    z: frontZAt(halfThickness)
  };

  const vertices: number[] = [];
  // Mirroring Z reverses triangle orientation, so each quad is emitted in
  // reverse vertex order to keep its normal facing outward.
  const mirrorZ = (p: Point3): Point3 => ({ x: p.x, y: p.y, z: -p.z });
  const addMirroredQuad = (a: Point3, b: Point3, c: Point3, d: Point3) =>
    addQuad(vertices, mirrorZ(d), mirrorZ(c), mirrorZ(b), mirrorZ(a));

  addMirroredQuad(lfb, lft, rft, rfb);
  addMirroredQuad(lbb, rbb, rbt, lbt);
  addMirroredQuad(lfb, rfb, rbb, lbb);
  addMirroredQuad(lft, lbt, rbt, rft);
  addMirroredQuad(lfb, lbb, lbt, lft);
  addMirroredQuad(rfb, rft, rbt, rbb);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createFeatureGeometry(part: Part): THREE.BufferGeometry {
  if (hasOnlyEndCutFeatures(part)) {
    return createEndCutOnlyGeometry(part);
  }

  let contour = buildOuterContour(part);
  const rectCuts = getEnabledFeatures(part)
    .filter((feature): feature is RectCutFeature => feature.kind === 'rect_cut')
    .map((feature) => getResolvedRectCutFeature(feature, part));
  const supportedRectCuts = rectCuts.filter(
    (feature) => feature.parameters.depthMode === 'through' || getRectCutPreviewSupport(feature).supported
  );
  const sliceY = new Set<number>([-part.thickness / 2, part.thickness / 2]);

  for (const feature of supportedRectCuts) {
    if (feature.cutType === 'tenon') {
      const tongueThickness = feature.parameters.depth ?? 0;
      if (tongueThickness > 0 && tongueThickness < part.thickness) {
        sliceY.add(-tongueThickness / 2);
        sliceY.add(tongueThickness / 2);
      }
      continue;
    }
    if (feature.parameters.depthMode !== 'blind') continue;
    if (isSideFaceTarget(feature)) {
      // Side-face pockets occupy a band across the thickness: slice at the
      // band edges so only those layers get the front/back recess.
      const bandLow = Math.max(-part.thickness / 2, -part.thickness / 2 + feature.placement.z);
      const bandHigh = Math.min(part.thickness / 2, bandLow + feature.parameters.size.width);
      if (bandHigh - bandLow > 1e-6) {
        sliceY.add(bandLow);
        sliceY.add(bandHigh);
      }
      continue;
    }
    const depth = getRectCutDepth(feature, part.thickness);
    if (depth <= 0) continue;
    if (isTopTarget(feature)) {
      sliceY.add(part.thickness / 2 - depth);
    } else if (isBottomTarget(feature)) {
      sliceY.add(-part.thickness / 2 + depth);
    }
  }

  const layers = Array.from(sliceY).sort((a, b) => a - b);
  const layerGeometries: THREE.BufferGeometry[] = [];

  for (let i = 0; i < layers.length - 1; i += 1) {
    const yMin = layers[i];
    const yMax = layers[i + 1];
    const layerDepth = yMax - yMin;
    if (layerDepth <= 1e-6) continue;
    const yMid = yMin + layerDepth / 2;

    const tenons = supportedRectCuts.filter((feature) => feature.cutType === 'tenon');
    let layerContour = tenons.length > 0 ? buildTenonLayerContour(part, tenons, yMid) : contour.map(clonePoint);
    const layerHoles: Point2[][] = [];

    for (const feature of supportedRectCuts) {
      if (feature.cutType === 'tenon') continue;
      if (isSideFaceTarget(feature)) {
        const pocketDepth = Math.min(feature.parameters.depth ?? 0, part.width);
        const bandLow = -part.thickness / 2 + feature.placement.z;
        const bandHigh = bandLow + feature.parameters.size.width;
        if (pocketDepth <= 0 || yMid < bandLow || yMid > bandHigh) continue;
        // Within its band a side-face pocket is a front/back recess: reuse the
        // edge-notch contour math with the pocket depth as the notch width.
        const pseudoNotch: RectCutFeature = {
          ...feature,
          cutType: 'edge_notch',
          target: {
            type: 'edge',
            edge:
              feature.target.type === 'face' && feature.target.face === 'back_face' ? 'top_back_edge' : 'top_front_edge'
          },
          parameters: {
            ...feature.parameters,
            size: { length: feature.parameters.size.length, width: pocketDepth },
            depthMode: 'through'
          },
          placement: { x: feature.placement.x, z: 0 }
        };
        layerContour = applyEdgeNotch(layerContour, pseudoNotch);
        continue;
      }

      const depth = getRectCutDepth(feature, part.thickness);
      const active =
        feature.parameters.depthMode === 'through' ||
        (depth > 0 &&
          ((isTopTarget(feature) && yMid >= part.thickness / 2 - depth) ||
            (isBottomTarget(feature) && yMid <= -part.thickness / 2 + depth)));

      if (!active) continue;

      if (feature.cutType === 'corner_notch') {
        layerContour = applyCornerNotch(layerContour, feature);
        continue;
      }

      if (feature.cutType === 'edge_notch' || feature.cutType === 'rabbet') {
        layerContour = applyEdgeNotch(layerContour, feature);
        continue;
      }

      // Cutouts flush with an edge become contour modifications so the
      // extruded sidewall correctly shows the opening (no sliver of material).
      // This applies to both through and blind cuts in their active layers.
      const flushed = applyCutoutToContour(layerContour, feature, part);
      if (flushed) {
        layerContour = flushed;
        continue;
      }

      const hole = getRectCutHole(feature, part);
      if (hole) layerHoles.push(hole);
    }

    layerGeometries.push(getLayerGeometry(layerContour, layerHoles, layerDepth, yMin));
  }

  const geometry =
    layerGeometries.length === 1
      ? layerGeometries[0]
      : (mergeGeometries(layerGeometries, false) ?? getLayerGeometry(contour, [], part.thickness, -part.thickness / 2));

  applyVerticalEndCuts(geometry, part);
  applyEdgeBevels(geometry, part);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function applyVerticalEndCuts(geometry: THREE.BufferGeometry, part: Part): void {
  const profiles = getPartEndCutProfiles(part);
  if (profiles.left.verticalInset <= 0 && profiles.right.verticalInset <= 0) return;

  const positions = geometry.getAttribute('position');
  const halfLength = part.length / 2;
  const halfThickness = part.thickness / 2;
  const epsilon = 1e-4;

  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);

    if (profiles.left.maxInset > 0) {
      const leftReferenceY = profiles.left.verticalFlip ? halfThickness : -halfThickness;
      const leftBaseInset = getEndCutInsetAt('left', profiles, part, { y: leftReferenceY, z });
      const leftBaseBoundaryX = -halfLength + leftBaseInset;
      const leftInset = getEndCutInsetAt('left', profiles, part, { y, z });
      if (Math.abs(x - leftBaseBoundaryX) < epsilon) {
        positions.setX(i, -halfLength + leftInset);
      }
    }

    if (profiles.right.maxInset > 0) {
      const rightReferenceY = profiles.right.verticalFlip ? -halfThickness : halfThickness;
      const rightBaseInset = getEndCutInsetAt('right', profiles, part, { y: rightReferenceY, z });
      const rightBaseBoundaryX = halfLength - rightBaseInset;
      const rightInset = getEndCutInsetAt('right', profiles, part, { y, z });
      if (Math.abs(x - rightBaseBoundaryX) < epsilon) {
        positions.setX(i, halfLength - rightInset);
      }
    }
  }

  positions.needsUpdate = true;
}

function applyEdgeBevels(geometry: THREE.BufferGeometry, part: Part): void {
  const profiles = getPartEdgeBevelProfiles(part);
  if (profiles.front.inset <= 0 && profiles.back.inset <= 0) return;

  const positions = geometry.getAttribute('position');
  const halfWidth = part.width / 2;
  const epsilon = 1e-4;

  for (let i = 0; i < positions.count; i += 1) {
    const y = positions.getY(i);
    const z = positions.getZ(i);

    // World-space convention (matching partCutPicking): the FRONT face
    // renders at +Z and the BACK face at -Z.
    if (profiles.front.inset > 0 && Math.abs(z - halfWidth) < epsilon) {
      positions.setZ(i, halfWidth - getEdgeBevelInsetAt('front', profiles, part, { y }));
    }

    if (profiles.back.inset > 0 && Math.abs(z + halfWidth) < epsilon) {
      positions.setZ(i, -halfWidth + getEdgeBevelInsetAt('back', profiles, part, { y }));
    }
  }

  positions.needsUpdate = true;
}

/**
 * Contour for a layer of a tenoned part.
 *
 * A tenon leaves a projecting tongue at one end: layers inside the tongue's
 * thickness band keep the full length (narrowed to the tongue width by the
 * shoulders), while layers outside the band stop at the shoulder line. Both
 * ends are handled in one pass so a rail can carry a tenon at each end.
 */
function buildTenonLayerContour(part: Part, tenons: RectCutFeature[], yMid: number): Point2[] {
  const halfLength = part.length / 2;
  const halfWidth = part.width / 2;

  const sideOf = (feature: RectCutFeature): 'left' | 'right' =>
    feature.target.type === 'face' && feature.target.face === 'left_end' ? 'left' : 'right';

  const describe = (feature: RectCutFeature | undefined) => {
    if (!feature) return null;
    const tongueThickness = feature.parameters.depth ?? 0;
    const tenonLength = feature.parameters.size.length;
    if (tongueThickness <= 0 || tenonLength <= 0) return null;
    // The tongue is centred in the blank's thickness.
    const inBand = Math.abs(yMid) <= tongueThickness / 2;
    const zMin = -halfWidth + feature.placement.z;
    return { tenonLength, inBand, zMin, zMax: zMin + feature.parameters.size.width };
  };

  const left = describe(tenons.find((feature) => sideOf(feature) === 'left'));
  const right = describe(tenons.find((feature) => sideOf(feature) === 'right'));

  const xLeftBody = left ? -halfLength + left.tenonLength : -halfLength;
  const xRightBody = right ? halfLength - right.tenonLength : halfLength;

  const points: Point2[] = [];
  points.push({ x: xLeftBody, z: -halfWidth });
  points.push({ x: xRightBody, z: -halfWidth });

  if (right?.inBand) {
    points.push({ x: xRightBody, z: right.zMin });
    points.push({ x: halfLength, z: right.zMin });
    points.push({ x: halfLength, z: right.zMax });
    points.push({ x: xRightBody, z: right.zMax });
  }
  points.push({ x: xRightBody, z: halfWidth });
  points.push({ x: xLeftBody, z: halfWidth });

  if (left?.inBand) {
    points.push({ x: xLeftBody, z: left.zMax });
    points.push({ x: -halfLength, z: left.zMax });
    points.push({ x: -halfLength, z: left.zMin });
    points.push({ x: xLeftBody, z: left.zMin });
  }

  // Drop points a degenerate tongue (flush to an edge, or full width) leaves
  // duplicated, so the extruded wall has no zero-length segments.
  const deduped: Point2[] = [];
  for (const point of points) {
    const previous = deduped[deduped.length - 1];
    if (previous && Math.abs(previous.x - point.x) < 1e-9 && Math.abs(previous.z - point.z) < 1e-9) continue;
    deduped.push(point);
  }
  const first = deduped[0];
  const last = deduped[deduped.length - 1];
  if (deduped.length > 1 && Math.abs(first.x - last.x) < 1e-9 && Math.abs(first.z - last.z) < 1e-9) deduped.pop();
  return deduped;
}

function getFeatureContour(part: Part): Point2[] {
  let contour = buildOuterContour(part);
  const rectCuts = getEnabledFeatures(part).filter((feature): feature is RectCutFeature => feature.kind === 'rect_cut');
  const resolvedRectCuts = rectCuts.map((feature) => getResolvedRectCutFeature(feature, part));

  for (const feature of resolvedRectCuts) {
    if (feature.parameters.depthMode !== 'through') continue;
    if (feature.cutType === 'corner_notch') {
      contour = applyCornerNotch(contour, feature);
    } else if (feature.cutType === 'edge_notch' || feature.cutType === 'rabbet') {
      contour = applyEdgeNotch(contour, feature);
    } else {
      // Through cutouts flush with an edge modify the contour
      const flushed = applyCutoutToContour(contour, feature, part);
      if (flushed) contour = flushed;
    }
  }

  return contour;
}

export function getPartRenderGeometry(part: Part): THREE.BufferGeometry {
  if (!hasRenderablePartFeatures(part)) {
    return new THREE.BoxGeometry(part.length, part.thickness, part.width);
  }

  const key = featureKey(part);
  const cached = geometryCache.get(key);
  if (cached) {
    geometryCache.delete(key);
    geometryCache.set(key, cached);
    return cached;
  }

  const geometry = createFeatureGeometry(part);
  if (geometryCache.size >= MAX_GEOMETRY_CACHE_ENTRIES) {
    const oldestKey = geometryCache.keys().next().value;
    if (oldestKey !== undefined) {
      geometryCache.get(oldestKey)?.dispose();
      geometryCache.delete(oldestKey);
    }
  }
  geometryCache.set(key, geometry);
  return geometry;
}

export function getPartGeometryCacheSizeForTests(): number {
  return geometryCache.size;
}

/**
 * Return convex-hull vertices in local part space, accounting for vertical
 * end cuts (bevels, compound mitres) that remove material along the Y axis.
 * For plain boxes or parts with only horizontal cuts the result is the 8 box
 * corners derived from the 2D feature contour. When vertical insets are
 * present the left/right X positions are adjusted per cross-section corner,
 * and duplicate vertices are removed to keep the hull minimal.
 */
export function getPartLocalConvexVertices(part: Part): Array<{ x: number; y: number; z: number }> {
  const contour = hasRenderablePartFeatures(part) ? getFeatureContour(part) : buildOuterContour(part);
  const halfThickness = part.thickness / 2;

  const profiles = getPartEndCutProfiles(part);
  const edgeProfiles = getPartEdgeBevelProfiles(part);
  const hasVertical = profiles.left.verticalInset > 0 || profiles.right.verticalInset > 0;
  const hasEdgeBevels = edgeProfiles.front.inset > 0 || edgeProfiles.back.inset > 0;
  const halfWidthForBevels = part.width / 2;

  // Operates in world space (post Z-mirror), matching applyEdgeBevels: the
  // front face is at +Z and the back face at -Z.
  const applyEdgeBevelToVertex = (z: number, y: number): number => {
    if (!hasEdgeBevels) return z;
    if (edgeProfiles.front.inset > 0 && Math.abs(z - halfWidthForBevels) < 1e-6) {
      return halfWidthForBevels - getEdgeBevelInsetAt('front', edgeProfiles, part, { y });
    }
    if (edgeProfiles.back.inset > 0 && Math.abs(z + halfWidthForBevels) < 1e-6) {
      return -halfWidthForBevels + getEdgeBevelInsetAt('back', edgeProfiles, part, { y });
    }
    return z;
  };

  if (!hasVertical && !hasEdgeBevels) {
    // Fast path: just extrude the 2D contour at ±halfThickness.
    // Contour Z is negated because the render pipeline mirrors it (see
    // getLayerGeometry); the hull must sit where the mesh is drawn.
    const verts: Array<{ x: number; y: number; z: number }> = [];
    for (const p of contour) {
      verts.push({ x: p.x, y: -halfThickness, z: -p.z });
      verts.push({ x: p.x, y: halfThickness, z: -p.z });
    }
    return verts;
  }

  // With vertical insets, the left/right X extent depends on the (y,z) position.
  // The 2D contour already accounts for horizontal insets (mitres). We need to
  // further adjust the X coordinates of left-end and right-end contour points
  // at each Y level.
  const halfLength = part.length / 2;
  const verts: Array<{ x: number; y: number; z: number }> = [];
  const seen = new Set<string>();

  for (const p of contour) {
    for (const y of [-halfThickness, halfThickness]) {
      let x = p.x;

      // Adjust left-end vertices
      if (profiles.left.maxInset > 0) {
        const leftBaseX =
          -halfLength +
          getEndCutInsetAt('left', profiles, part, {
            y: profiles.left.verticalFlip ? halfThickness : -halfThickness,
            z: p.z
          });
        if (Math.abs(x - leftBaseX) < 1e-6) {
          x = -halfLength + getEndCutInsetAt('left', profiles, part, { y, z: p.z });
        }
      }

      // Adjust right-end vertices
      if (profiles.right.maxInset > 0) {
        const rightBaseX =
          halfLength -
          getEndCutInsetAt('right', profiles, part, {
            y: profiles.right.verticalFlip ? -halfThickness : halfThickness,
            z: p.z
          });
        if (Math.abs(x - rightBaseX) < 1e-6) {
          x = halfLength - getEndCutInsetAt('right', profiles, part, { y, z: p.z });
        }
      }

      // Negate contour Z to match the mirrored render geometry, then apply
      // the edge bevel in that same world space.
      const z = applyEdgeBevelToVertex(-p.z, y);
      const key = `${x.toFixed(8)},${y.toFixed(8)},${z.toFixed(8)}`;
      if (!seen.has(key)) {
        seen.add(key);
        verts.push({ x, y, z });
      }
    }
  }

  return verts;
}

export function getPartLocalBoundingBox(part: Part): { min: THREE.Vector3; max: THREE.Vector3 } {
  const contour = hasRenderablePartFeatures(part) ? getFeatureContour(part) : buildOuterContour(part);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const point of contour) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  }

  // Contour Z is mirrored by the render pipeline, so the world-space Z range
  // is [-maxZ, -minZ].
  return {
    min: new THREE.Vector3(minX, -part.thickness / 2, -maxZ),
    max: new THREE.Vector3(maxX, part.thickness / 2, -minZ)
  };
}

export function getPartWorldAABB(
  part: Part,
  position: { x: number; y: number; z: number } = part.position
): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
} {
  const localBox = getPartLocalBoundingBox(part);
  _worldAabbEuler.set(
    (part.rotation.x * Math.PI) / 180,
    (part.rotation.y * Math.PI) / 180,
    (part.rotation.z * Math.PI) / 180,
    'XYZ'
  );
  _worldAabbQuaternion.setFromEuler(_worldAabbEuler);
  _worldAabbPosition.set(position.x, position.y, position.z);
  const { min, max } = localBox;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const x of [min.x, max.x]) {
    for (const y of [min.y, max.y]) {
      for (const z of [min.z, max.z]) {
        _worldAabbCorner.set(x, y, z).applyQuaternion(_worldAabbQuaternion).add(_worldAabbPosition);
        minX = Math.min(minX, _worldAabbCorner.x);
        maxX = Math.max(maxX, _worldAabbCorner.x);
        minY = Math.min(minY, _worldAabbCorner.y);
        maxY = Math.max(maxY, _worldAabbCorner.y);
        minZ = Math.min(minZ, _worldAabbCorner.z);
        maxZ = Math.max(maxZ, _worldAabbCorner.z);
      }
    }
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ
  };
}

export function getPartWorldHalfHeight(
  part: Pick<Part, 'rotation' | 'position' | 'length' | 'width' | 'thickness' | 'features'>
): number {
  const bounds = getPartWorldAABB(part as Part, { x: 0, y: 0, z: 0 });
  return -bounds.minY;
}

export function getPartLocalCorners(part: Part): THREE.Vector3[] {
  const { min, max } = getPartLocalBoundingBox(part);
  return [
    new THREE.Vector3(min.x, min.y, min.z),
    new THREE.Vector3(min.x, min.y, max.z),
    new THREE.Vector3(min.x, max.y, min.z),
    new THREE.Vector3(min.x, max.y, max.z),
    new THREE.Vector3(max.x, min.y, min.z),
    new THREE.Vector3(max.x, min.y, max.z),
    new THREE.Vector3(max.x, max.y, min.z),
    new THREE.Vector3(max.x, max.y, max.z)
  ];
}

export interface ContourSubBox {
  centerX: number;
  centerZ: number;
  halfX: number;
  halfZ: number;
}

/**
 * Decompose the part's 2D feature contour into axis-aligned sub-rectangles.
 * For simple boxes this returns one rectangle. For parts with through-depth
 * corner/edge notches it returns multiple smaller rectangles that tile the
 * actual material area — eliminating "ghost corners" from the bounding box.
 */
export function getPartContourSubBoxes(part: Part): ContourSubBox[] {
  const contour = hasRenderablePartFeatures(part) ? getFeatureContour(part) : buildOuterContour(part);

  const xSet = new Set<number>();
  const zSet = new Set<number>();
  for (const p of contour) {
    xSet.add(snapCoord(p.x));
    zSet.add(snapCoord(p.z));
  }
  const xs = [...xSet].sort((a, b) => a - b);
  const zs = [...zSet].sort((a, b) => a - b);

  if (xs.length <= 2 && zs.length <= 2) {
    return [
      {
        centerX: (xs[0] + xs[xs.length - 1]) / 2,
        centerZ: (zs[0] + zs[zs.length - 1]) / 2,
        halfX: (xs[xs.length - 1] - xs[0]) / 2,
        halfZ: (zs[zs.length - 1] - zs[0]) / 2
      }
    ];
  }

  // Shrink each sub-box by a tiny epsilon so that sub-boxes from different
  // parts sharing an exact wall have a micro-gap. This prevents the OBB SAT
  // test's epsilon-inflated cross-product axes from creating false overlaps
  // at shared walls while being physically negligible (~0.00001 inches).
  const WALL_SHRINK = 1e-5;

  const boxes: ContourSubBox[] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < zs.length - 1; j++) {
      const cx = (xs[i] + xs[i + 1]) / 2;
      const cz = (zs[j] + zs[j + 1]) / 2;
      if (pointInPolygon(cx, cz, contour)) {
        boxes.push({
          centerX: cx,
          centerZ: cz,
          halfX: (xs[i + 1] - xs[i]) / 2 - WALL_SHRINK,
          halfZ: (zs[j + 1] - zs[j]) / 2 - WALL_SHRINK
        });
      }
    }
  }

  if (boxes.length === 0) {
    return [
      {
        centerX: (xs[0] + xs[xs.length - 1]) / 2,
        centerZ: (zs[0] + zs[zs.length - 1]) / 2,
        halfX: (xs[xs.length - 1] - xs[0]) / 2,
        halfZ: (zs[zs.length - 1] - zs[0]) / 2
      }
    ];
  }

  return boxes;
}

function snapCoord(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

function pointInPolygon(px: number, pz: number, poly: Point2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const zi = poly[i].z;
    const zj = poly[j].z;
    if (zi > pz !== zj > pz) {
      const xCross = poly[i].x + ((pz - zi) / (zj - zi)) * (poly[j].x - poly[i].x);
      if (px < xCross) {
        inside = !inside;
      }
    }
  }
  return inside;
}

/**
 * Return the 2D contour of a part in world XZ coordinates.
 * Accounts for through-depth features (corner notches, edge notches, rabbets)
 * and rotation. For axis-aligned parts this is a simple translate; for rotated
 * parts the local contour vertices are rotated about Y.
 */
export function getPartWorldContour(
  part: Part,
  position: { x: number; y: number; z: number } = part.position
): Point2[] {
  const contour = hasRenderablePartFeatures(part) ? getFeatureContour(part) : buildOuterContour(part);

  // Compute rotation about Y (parts lie flat, so Y rotation is the relevant one).
  // For axis-aligned parts (rotation 0,0,0) this is a no-op.
  const rad = ((part.rotation.y ?? 0) * Math.PI) / 180;
  // For general XYZ Euler rotations, compute the full XZ projection.
  const rx = ((part.rotation.x ?? 0) * Math.PI) / 180;
  const rz = ((part.rotation.z ?? 0) * Math.PI) / 180;

  // The 2D contour uses +Z = "back" but the 3D geometry applies rotateX(-π/2)
  // which negates Z.  Negate here so the overlap contour matches the rendered mesh.

  // Fast path: no rotation
  if (Math.abs(rx) < 1e-9 && Math.abs(rad) < 1e-9 && Math.abs(rz) < 1e-9) {
    return contour.map((p) => ({ x: p.x + position.x, z: -p.z + position.z }));
  }

  // General rotation: use Euler XYZ → rotation matrix, project onto XZ
  const cx = Math.cos(rx),
    sx = Math.sin(rx);
  const cy = Math.cos(rad),
    sy = Math.sin(rad);
  const cz = Math.cos(rz),
    sz = Math.sin(rz);

  // Rotation matrix columns for X and Z (we only need XZ projection)
  const m00 = cy * cz + sy * sx * sz;
  const m02 = -sy * cx;
  const m20 = sy * cz - cy * sx * sz;
  const m22 = cy * cx;

  // Negate contour Z to match the rotateX(-π/2) applied by the render geometry.
  return contour.map((p) => ({
    x: m00 * p.x + m02 * -p.z + position.x,
    z: m20 * p.x + m22 * -p.z + position.z
  }));
}

/**
 * Check if two world-space 2D polygons overlap.
 * Uses edge-edge intersection plus containment checks.
 * Returns false for touching (shared edge/vertex) when touchingIsOverlap is false.
 */
export function worldContoursOverlap(polyA: Point2[], polyB: Point2[], tolerance = 1e-8): boolean {
  // 1. Check edge-edge intersections (catches most overlap cases)
  for (let i = 0; i < polyA.length; i++) {
    const a1 = polyA[i];
    const a2 = polyA[(i + 1) % polyA.length];
    for (let j = 0; j < polyB.length; j++) {
      const b1 = polyB[j];
      const b2 = polyB[(j + 1) % polyB.length];
      if (edgesProperlyIntersect(a1, a2, b1, b2, tolerance)) return true;
    }
  }

  // 2. Check containment: is any vertex of A strictly inside B, or vice versa?
  //    (If edges don't cross, one polygon might be entirely inside the other.)
  for (const v of polyA) {
    if (strictPointInPolygon(v.x, v.z, polyB, tolerance)) return true;
  }
  for (const v of polyB) {
    if (strictPointInPolygon(v.x, v.z, polyA, tolerance)) return true;
  }

  // 3. Shared-boundary case: when two L-shaped polygons interlock, all vertices
  //    may lie exactly on the other polygon's edges (collinear shared edges).
  //    Test the center of the bounding-box overlap — if it's strictly inside
  //    both polygons, they share a 2D area.
  const aMinX = Math.min(...polyA.map((p) => p.x));
  const aMaxX = Math.max(...polyA.map((p) => p.x));
  const aMinZ = Math.min(...polyA.map((p) => p.z));
  const aMaxZ = Math.max(...polyA.map((p) => p.z));
  const bMinX = Math.min(...polyB.map((p) => p.x));
  const bMaxX = Math.max(...polyB.map((p) => p.x));
  const bMinZ = Math.min(...polyB.map((p) => p.z));
  const bMaxZ = Math.max(...polyB.map((p) => p.z));

  const overlapMinX = Math.max(aMinX, bMinX);
  const overlapMaxX = Math.min(aMaxX, bMaxX);
  const overlapMinZ = Math.max(aMinZ, bMinZ);
  const overlapMaxZ = Math.min(aMaxZ, bMaxZ);

  if (overlapMaxX - overlapMinX > tolerance && overlapMaxZ - overlapMinZ > tolerance) {
    const cx = (overlapMinX + overlapMaxX) / 2;
    const cz = (overlapMinZ + overlapMaxZ) / 2;
    if (pointInPolygon(cx, cz, polyA) && pointInPolygon(cx, cz, polyB)) {
      return true;
    }
  }

  return false;
}

/** Check if two line segments properly intersect (cross each other, not just touch). */
function edgesProperlyIntersect(a1: Point2, a2: Point2, b1: Point2, b2: Point2, eps: number): boolean {
  const d1 = cross2d(b1, b2, a1);
  const d2 = cross2d(b1, b2, a2);
  const d3 = cross2d(a1, a2, b1);
  const d4 = cross2d(a1, a2, b2);

  // Segments properly cross: products have opposite signs (strictly)
  if (d1 * d2 < -eps * eps && d3 * d4 < -eps * eps) return true;

  return false;
}

/** Signed area of triangle (p1, p2, p3) × 2. Positive if CCW. */
function cross2d(p1: Point2, p2: Point2, p3: Point2): number {
  return (p2.x - p1.x) * (p3.z - p1.z) - (p2.z - p1.z) * (p3.x - p1.x);
}

/** Point-in-polygon with tolerance: returns true only if point is strictly inside (not on edge). */
function strictPointInPolygon(px: number, pz: number, poly: Point2[], eps: number): boolean {
  // First check if point is on or very near any edge — treat as NOT inside
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if (pointNearSegment(px, pz, poly[i], poly[j], eps)) return false;
  }
  // Standard ray-casting
  return pointInPolygon(px, pz, poly);
}

/** Check if point (px, pz) is within eps distance of segment (a, b). */
function pointNearSegment(px: number, pz: number, a: Point2, b: Point2, eps: number): boolean {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len2 = dx * dx + dz * dz;
  if (len2 < 1e-18) return Math.abs(px - a.x) < eps && Math.abs(pz - a.z) < eps;
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / len2));
  const projX = a.x + t * dx;
  const projZ = a.z + t * dz;
  const dist2 = (px - projX) ** 2 + (pz - projZ) ** 2;
  return dist2 < eps * eps;
}

/**
 * Quick Y-axis overlap check for two parts.
 * Returns true if their thickness ranges overlap (strictly, not touching).
 */
export function partsOverlapOnYAxis(a: Part, b: Part, tolerance = 1e-8): boolean {
  const aMinY = a.position.y - a.thickness / 2;
  const aMaxY = a.position.y + a.thickness / 2;
  const bMinY = b.position.y - b.thickness / 2;
  const bMaxY = b.position.y + b.thickness / 2;

  // Overlap if ranges intersect (with tolerance for touching)
  return aMinY < bMaxY - tolerance && bMinY < aMaxY - tolerance;
}

export function clearPartGeometryCache(): void {
  for (const geometry of geometryCache.values()) {
    geometry.dispose();
  }
  geometryCache.clear();
}
