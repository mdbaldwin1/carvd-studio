import * as THREE from 'three';
import polygonClipping from 'polygon-clipping';
import { ADDITION, Brush, Evaluator, INTERSECTION, SUBTRACTION } from 'three-bvh-csg';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getEdgeProfileFeatureBoundary, type EdgeProfilePoint } from './edgeProfileShape';
import { ConvexHull } from 'three/examples/jsm/math/ConvexHull.js';
import { Earcut } from 'three/src/extras/Earcut.js';
import { MeshBVH } from 'three-mesh-bvh';
import {
  CircularCutFeature,
  EdgeProfileFeature,
  Part,
  PartFeature,
  EndCutFeature,
  RectCutFeature,
  RoundedCutFeature,
  RoutedPathFeature
} from '../types';
import {
  getEdgeBevelInsetAt,
  getEndCutInsetAt,
  getPartEdgeBevelProfiles,
  getPartEndCutProfiles,
  getPartStockPlanes
} from './endCutUtils';
import {
  getRectCutDepth,
  getRectCutPlanBounds,
  getRectCutPreviewSupport,
  getResolvedRectCutFeature,
  hasFiniteRectCutPlacement,
  isBottomTarget,
  isSideFaceTarget,
  isTopTarget
} from './rectCutUtils';
import { expandCircularCut, getFaceFrame } from './roundCutUtils';

type Point2 = { x: number; z: number };

const geometryCache = new Map<string, THREE.BufferGeometry>();
const planTriangleCache = new Map<string, Point2[][]>();
const convexVertexCache = new WeakMap<THREE.BufferGeometry, Array<{ x: number; y: number; z: number }>>();
const outlineGeometryCache = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();
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
    features: (part.features ?? [])
      .filter((feature) => feature.enabled)
      .map((feature) => {
        const common = {
          kind: feature.kind,
          target: feature.target,
          reference: feature.reference,
          parameters: feature.parameters
        };
        if (feature.kind === 'routed_path') return { ...common, path: feature.path, bit: feature.bit };
        if (feature.kind === 'edge_profile')
          return {
            ...common,
            profile: feature.profile,
            routerProfileSnapshot: feature.profile === 'custom' ? feature.routerProfileSnapshot : undefined
          };
        return {
          ...common,
          cutType: feature.cutType,
          ...(feature.kind === 'end_cut' ? { lengthMode: feature.lengthMode } : { placement: feature.placement }),
          ...(feature.kind === 'circular_cut' ? { pattern: feature.pattern } : {})
        };
      })
  });
}

/**
 * Every number this feature contributes to triangulation.
 *
 * A half-typed measurement is momentarily NaN, and the clipper throws
 * "Tried to create degenerate segment" on one -- inside React's render, which
 * unmounts the editor and drops the user at the home screen with no warning.
 * Placement was already screened; the sizes were not, so editing a cut's run
 * or width was enough to take the session down.
 */
function hasFiniteGeometry(feature: PartFeature): boolean {
  // An absent value is not a malformed one: a through cut carries no depth,
  // and older files store that as null rather than undefined.
  const finite = (...values: Array<number | null | undefined>) =>
    values.every((value) => value === null || value === undefined || Number.isFinite(value));

  if (feature.kind === 'rect_cut') {
    return (
      hasFiniteRectCutPlacement(feature) &&
      finite(feature.parameters.size.length, feature.parameters.size.width, feature.parameters.depth)
    );
  }
  if (feature.kind === 'circular_cut') {
    return finite(
      feature.placement.primary,
      feature.placement.secondary,
      feature.placement.rotation,
      feature.parameters.diameter,
      feature.parameters.depth,
      feature.parameters.tilt,
      feature.parameters.direction
    );
  }
  if (feature.kind === 'rounded_cut') {
    return finite(
      feature.placement.primary,
      feature.placement.secondary,
      feature.placement.rotation,
      feature.parameters.length,
      feature.parameters.width,
      feature.parameters.cornerRadius,
      feature.parameters.depth
    );
  }
  if (feature.kind === 'routed_path') {
    return (
      feature.path.points.length >= 2 &&
      feature.path.points.every((point) => finite(point.primary, point.secondary, point.cornerRadius)) &&
      finite(
        feature.bit.diameter,
        feature.bit.includedAngle,
        'shankDiameter' in feature.bit ? feature.bit.shankDiameter : undefined,
        'cutterHeight' in feature.bit ? feature.bit.cutterHeight : undefined,
        feature.parameters.depth
      )
    );
  }
  if (feature.kind === 'edge_profile') {
    return finite(feature.parameters.size, feature.parameters.depth);
  }
  return finite(
    feature.parameters.horizontalAngle,
    feature.parameters.verticalAngle,
    feature.parameters.reference?.value
  );
}

function getEnabledFeatures(part: Part): PartFeature[] {
  // Invalid authored data remains editable, but must never enter triangulation.
  return (part.features ?? []).filter((feature) => feature.enabled && hasFiniteGeometry(feature));
}

export function hasRenderablePartFeatures(part: Part): boolean {
  return getEnabledFeatures(part).length > 0;
}

function hasOnlyEndCutFeatures(part: Part): boolean {
  const features = getEnabledFeatures(part);
  // A cut running in a band needs the clip the layered path builds; the
  // shortcut here clips the whole blank with the plain end-cut planes.
  return features.length > 0 && features.every((feature) => feature.kind === 'end_cut' && !feature.parameters.band);
}

function buildOuterContour(part: Part): Point2[] {
  const halfLength = part.length / 2;
  const halfWidth = part.width / 2;
  const profiles = getPartEndCutProfiles(part);
  const leftFrontInset = profiles.left.horizontalFlip ? profiles.left.horizontalInset : 0;
  const leftBackInset = profiles.left.horizontalFlip ? 0 : profiles.left.horizontalInset;
  const rightFrontInset = profiles.right.horizontalFlip ? profiles.right.horizontalInset : 0;
  const rightBackInset = profiles.right.horizontalFlip ? 0 : profiles.right.horizontalInset;

  return [
    { x: -halfLength + profiles.left.baseInset + leftFrontInset, z: -halfWidth },
    { x: halfLength - profiles.right.baseInset - rightFrontInset, z: -halfWidth },
    { x: halfLength - profiles.right.baseInset - rightBackInset, z: halfWidth },
    { x: -halfLength + profiles.left.baseInset + leftBackInset, z: halfWidth }
  ];
}

function differenceContours(contour: Point2[], removals: Point2[][]): polygonClipping.MultiPolygon {
  const polygon = (points: Point2[]): polygonClipping.Polygon => [points.map((p) => [p.x, p.z])];
  return removals.length
    ? polygonClipping.difference(polygon(contour), ...removals.map(polygon))
    : polygonClipping.union(polygon(contour));
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

/**
 * The pockets whose inside corners a bit actually leaves behind.
 *
 * A dado or a groove runs out to an edge, so it has no inside corner to
 * round. A stopped run has one rounded end rather than four rounded corners,
 * which wants its own treatment. These two are the true four-cornered pockets.
 */
const ROUNDABLE_RECT_CUT_TYPES: RectCutFeature['cutType'][] = ['mortise', 'cutout'];

/** How finely a corner arc is walked. Matches the rounded-cut builder. */
const CORNER_ARC_STEPS = 8;

export function getRectCutCornerRadius(feature: RectCutFeature, part: Part): number {
  if (!ROUNDABLE_RECT_CUT_TYPES.includes(feature.cutType)) return 0;
  const radius = feature.parameters.cornerRadius ?? 0;
  if (!(radius > 0)) return 0;
  const bounds = getRectCutPlanBounds(feature, part);
  // Never more than fits: at half the smaller span the pocket is a stadium.
  return Math.min(radius, (bounds.maxX - bounds.minX) / 2, (bounds.maxZ - bounds.minZ) / 2);
}

function getRectCutHole(feature: RectCutFeature, part: Part): Point2[] {
  const bounds = getRectCutPlanBounds(feature, part);
  const minX = bounds.minX - part.length / 2;
  const maxX = bounds.maxX - part.length / 2;
  // The contour is punched in a plan whose second axis runs against the
  // part's own, so an offset taken from the back edge turns round here.
  const minZ = part.width / 2 - bounds.maxZ;
  const maxZ = part.width / 2 - bounds.minZ;

  // A dovetail's flare lives in the face, not in the thickness: the far end
  // of the pocket is wider than the near one and the walls stay square to the
  // surface. Symmetric about the pocket's own centreline, so the mirrored
  // plan axis costs nothing here.
  const taper = feature.parameters.taperAngle ?? 0;
  const flare = taper ? Math.tan((taper * Math.PI) / 180) * (maxX - minX) : 0;

  const radius = getRectCutCornerRadius(feature, part);
  if (radius <= 0) {
    return [
      { x: minX, z: minZ },
      { x: maxX, z: minZ - flare },
      { x: maxX, z: maxZ + flare },
      { x: minX, z: maxZ }
    ];
  }

  // Walk the same four corners, replacing each with the arc the bit swept.
  const points: Point2[] = [];
  const corners: Array<[number, number, number]> = [
    [minX + radius, minZ + radius, Math.PI],
    [maxX - radius, minZ + radius, -Math.PI / 2],
    [maxX - radius, maxZ - radius, 0],
    [minX + radius, maxZ - radius, Math.PI / 2]
  ];
  for (const [cx, cz, start] of corners) {
    for (let step = 0; step <= CORNER_ARC_STEPS; step += 1) {
      const angle = start + (step * Math.PI) / (2 * CORNER_ARC_STEPS);
      points.push({ x: cx + Math.cos(angle) * radius, z: cz + Math.sin(angle) * radius });
    }
  }
  return points;
}

function getCircularCutHoles(
  feature: CircularCutFeature,
  part: Part,
  y: number,
  diameter = feature.parameters.diameter
): Point2[][] {
  const segments = Math.min(64, Math.max(16, Math.ceil(diameter * 12)));
  const radius = diameter / 2;
  return expandCircularCut(feature, part).map(({ entryPoint, axis }) => {
    const travel = Math.abs(axis.y) > 1e-9 ? (y - entryPoint.y) / axis.y : 0;
    const centerX = entryPoint.x + axis.x * travel;
    const centerZ = entryPoint.z + axis.z * travel;
    const projectedLength = Math.hypot(axis.x, axis.z);
    const majorX = projectedLength > 1e-9 ? axis.x / projectedLength : 1;
    const majorZ = projectedLength > 1e-9 ? axis.z / projectedLength : 0;
    const minorX = -majorZ;
    const minorZ = majorX;
    const majorRadius = Math.abs(axis.y) > 1e-9 ? radius / Math.abs(axis.y) : radius;
    const points: Point2[] = [];
    for (let index = 0; index < segments; index += 1) {
      const angle = -(index / segments) * Math.PI * 2;
      points.push({
        x: centerX + Math.cos(angle) * majorRadius * majorX + Math.sin(angle) * radius * minorX,
        // ExtrudeGeometry's contour Z is mirrored into world Z.
        z: -(centerZ + Math.cos(angle) * majorRadius * majorZ + Math.sin(angle) * radius * minorZ)
      });
    }
    return points;
  });
}

function referencedFeatureOffset(value: number, size: number, from: 'min' | 'center' | 'max' | undefined): number {
  if (from === 'min') return -size / 2 + value;
  if (from === 'max') return size / 2 - value;
  return value;
}

/**
 * How far a pocket's walls lean out by a given depth below the surface.
 *
 * A negative depth is above the mouth and carries on up the same plane. The
 * cutter is lofted between a ring standing clear of the surface and one past
 * the floor, and both have to sit on the true wall or the loft leans at a
 * slightly wrong angle between them.
 */
function wallSplay(angle: number | undefined, depthBelowSurface: number): number {
  if (!angle) return 0;
  return Math.tan((angle * Math.PI) / 180) * depthBelowSurface;
}

/** How far below the cut surface this layer sits, for a face-placed pocket. */
function depthBelowCutFace(feature: RectCutFeature, part: Part, yMid: number): number {
  return isBottomTarget(feature) ? yMid + part.thickness / 2 : part.thickness / 2 - yMid;
}

/** Whether either pair of this pocket's walls leans off square. */
function hasLeaningWalls(feature: RectCutFeature): boolean {
  return Boolean(feature.parameters.wallAngle || feature.parameters.sideWallAngle);
}

/**
 * The footprint of a pocket whose walls lean, at one depth into the board.
 *
 * Two of these -- the mouth and the floor -- are the ends of the solid that
 * gets subtracted. They used to be a stack of ten, one per layer, which read
 * as a lean from across the room but was a staircase: half of every step
 * stood proud of the true wall. A tail sawn to the real slope therefore
 * could not sit in its socket at all, which is no way to cut a dovetail.
 */
function getSplayedRectCutHole(feature: RectCutFeature, part: Part, yMid: number): Point2[] {
  const below = depthBelowCutFace(feature, part, yMid);
  const grow = wallSplay(feature.parameters.wallAngle, below);
  const growSide = wallSplay(feature.parameters.sideWallAngle, below);
  if (grow === 0 && growSide === 0) return getRectCutHole(feature, part);
  // Leaning inward, a wall can in principle meet its opposite number before
  // the floor. Validation keeps authored cuts clear of that; this keeps a
  // degenerate contour out of the slicer either way.
  const span = (nominal: number, change: number) => Math.max(1e-6, nominal + 2 * change);
  const widened: RectCutFeature = {
    ...feature,
    parameters: {
      ...feature.parameters,
      size: {
        length: span(feature.parameters.size.length, grow),
        width: span(feature.parameters.size.width, growSide)
      }
    },
    placement: { x: feature.placement.x - grow, z: feature.placement.z - growSide }
  };
  return getRectCutHole(widened, part);
}

/**
 * How many slices trace the arc of a rounded opening cut into an edge.
 *
 * An edge slot's curve lies in the plane the part is sliced along, so unlike
 * a slot in a face it cannot be one outline. Each layer takes a rectangle as
 * long as the slot is at that height, and the stack of them makes the curve.
 */
const SIDE_ROUNDED_SLICES = 12;

/** Half the opening's length, measured across its width from the middle. */
function roundedHalfLengthAt(feature: RoundedCutFeature, offset: number): number {
  const halfLength = feature.parameters.length / 2;
  const halfWidth = feature.parameters.width / 2;
  // A slot is a stadium: its ends are half-circles the full width of the cut,
  // whatever corner radius happens to be stored on it.
  const radius = feature.cutType === 'rounded_slot' ? halfWidth : Math.min(feature.parameters.cornerRadius, halfWidth);
  const distance = Math.abs(offset);
  if (distance >= halfWidth) return 0;
  const straight = halfWidth - radius;
  if (distance <= straight) return halfLength;
  const into = distance - straight;
  return halfLength - radius + Math.sqrt(Math.max(0, radius * radius - into * into));
}

/** Where a side-face rounded cut sits across the part's thickness. */
function sideRoundedBand(feature: RoundedCutFeature, part: Part): { center: number; half: number } {
  return {
    center: referencedFeatureOffset(feature.placement.secondary, part.thickness, feature.reference.secondaryFrom),
    half: feature.parameters.width / 2
  };
}

/**
 * How far a rectangular cut reaches in from the long edge it was taken in.
 *
 * Through means right out of the far face, which is what a bridle's open
 * mortise does -- sawn down the end and out through the width, leaving a
 * cheek either side.
 */
function sideRectDepth(feature: RectCutFeature, part: Part): number {
  if (feature.parameters.depthMode === 'through') return part.width;
  return Math.min(feature.parameters.depth ?? 0, part.width);
}

/** How deep a rounded cut goes in from the edge it was cut into. */
function sideRoundedDepth(feature: RoundedCutFeature, part: Part): number {
  return feature.parameters.depthMode === 'through' ? part.width : (feature.parameters.depth ?? 0);
}

/** One slice of a rounded opening cut into a long edge. */
function getSideRoundedCutHole(feature: RoundedCutFeature, part: Part, yMid: number): Point2[] | null {
  const depth = sideRoundedDepth(feature, part);
  if (depth <= 0) return null;
  const band = sideRoundedBand(feature, part);
  const halfLength = roundedHalfLengthAt(feature, yMid - band.center);
  if (halfLength <= 0) return null;

  const centerX = referencedFeatureOffset(feature.placement.primary, part.length, feature.reference.primaryFrom);
  // Plan coordinates run opposite the face frame's second axis, which is why
  // the front edge is the one at negative plan z. Rect cuts reach the same
  // place through getRectCutPlanBounds; this arrives at it directly, so the
  // sign has to be applied here.
  const isBack = feature.target.type === 'face' && feature.target.face === 'back_face';
  const halfWidth = part.width / 2;
  const minZ = isBack ? halfWidth - depth : -halfWidth;
  const maxZ = isBack ? halfWidth : -halfWidth + depth;
  return [
    { x: centerX - halfLength, z: minZ },
    { x: centerX + halfLength, z: minZ },
    { x: centerX + halfLength, z: maxZ },
    { x: centerX - halfLength, z: maxZ }
  ];
}

function getRoundedCutHole(feature: RoundedCutFeature, part: Part): Point2[] {
  const frame = getFaceFrame(part, feature.target.face);
  const centerX = referencedFeatureOffset(feature.placement.primary, part.length, feature.reference.primaryFrom);
  const centerZ = referencedFeatureOffset(feature.placement.secondary, part.width, feature.reference.secondaryFrom);
  const halfLength = feature.parameters.length / 2;
  const halfWidth = feature.parameters.width / 2;
  const radius = feature.cutType === 'rounded_slot' ? halfWidth : feature.parameters.cornerRadius;
  const cornerX = halfLength - radius;
  const cornerZ = halfWidth - radius;
  const rotation = (feature.placement.rotation * Math.PI) / 180;
  const points: Point2[] = [];
  const corners: Array<[number, number, number]> = [
    [-cornerX, cornerZ, Math.PI],
    [cornerX, cornerZ, Math.PI / 2],
    [cornerX, -cornerZ, 0],
    [-cornerX, -cornerZ, -Math.PI / 2]
  ];
  for (const [cx, cz, start] of corners) {
    for (let step = 0; step <= 8; step += 1) {
      const angle = start - (step * Math.PI) / 16;
      const localX = cx + Math.cos(angle) * radius;
      const localZ = cz + Math.sin(angle) * radius;
      const worldX = centerX + localX * Math.cos(rotation) - localZ * Math.sin(rotation);
      const worldZ = centerZ + localX * Math.sin(rotation) + localZ * Math.cos(rotation);
      points.push({
        x: frame.origin.x + frame.primaryAxis.x * worldX + frame.secondaryAxis.x * worldZ,
        z: -(frame.origin.z + frame.primaryAxis.z * worldX + frame.secondaryAxis.z * worldZ)
      });
    }
  }
  return points;
}

function getLayerGeometry(contour: Point2[], holes: Point2[][], depth: number, yMin: number): THREE.BufferGeometry {
  // Subtract the union of removals before triangulation: independent Shape
  // holes cannot represent overlapping or boundary-touching cutters.
  const polygons = differenceContours(contour, holes);
  const shapes = polygons.map((rings) =>
    shapeFromContour(
      rings[0].slice(0, -1).map(([x, z]) => ({ x, z })),
      rings.slice(1).map((ring) => ring.slice(0, -1).map(([x, z]) => ({ x, z })))
    )
  );
  const geometry = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false, steps: 1, curveSegments: 1 });
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
    x: -halfLength + getEndCutInsetAt('left', profiles, part, { y: -halfThickness, z: frontZAt(-halfThickness) }),
    y: -halfThickness,
    z: frontZAt(-halfThickness)
  };
  const lbb = {
    x: -halfLength + getEndCutInsetAt('left', profiles, part, { y: -halfThickness, z: backZAt(-halfThickness) }),
    y: -halfThickness,
    z: backZAt(-halfThickness)
  };
  const lbt = {
    x: -halfLength + getEndCutInsetAt('left', profiles, part, { y: halfThickness, z: backZAt(halfThickness) }),
    y: halfThickness,
    z: backZAt(halfThickness)
  };
  const lft = {
    x: -halfLength + getEndCutInsetAt('left', profiles, part, { y: halfThickness, z: frontZAt(halfThickness) }),
    y: halfThickness,
    z: frontZAt(halfThickness)
  };
  const rfb = {
    x: halfLength - getEndCutInsetAt('right', profiles, part, { y: -halfThickness, z: frontZAt(-halfThickness) }),
    y: -halfThickness,
    z: frontZAt(-halfThickness)
  };
  const rbb = {
    x: halfLength - getEndCutInsetAt('right', profiles, part, { y: -halfThickness, z: backZAt(-halfThickness) }),
    y: -halfThickness,
    z: backZAt(-halfThickness)
  };
  const rbt = {
    x: halfLength - getEndCutInsetAt('right', profiles, part, { y: halfThickness, z: backZAt(halfThickness) }),
    y: halfThickness,
    z: backZAt(halfThickness)
  };
  const rft = {
    x: halfLength - getEndCutInsetAt('right', profiles, part, { y: halfThickness, z: frontZAt(halfThickness) }),
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

  // Build removals in the authored blank coordinates. End/edge cuts clip this
  // solid afterwards; moving boundary vertices would distort other cuts.
  const contour = buildOuterContour({ ...part, features: [] });
  const rectCuts = getEnabledFeatures(part)
    .filter((feature): feature is RectCutFeature => feature.kind === 'rect_cut')
    .map((feature) => getResolvedRectCutFeature(feature, part));
  const supportedRectCuts = rectCuts.filter(
    (feature) => feature.parameters.depthMode === 'through' || getRectCutPreviewSupport(feature).supported
  );
  const circularCuts = getEnabledFeatures(part).filter(
    (feature): feature is CircularCutFeature =>
      feature.kind === 'circular_cut' &&
      feature.cutType !== 'countersink' &&
      feature.target.type === 'face' &&
      feature.parameters.tilt === 0 &&
      (feature.target.face === 'top_face' || feature.target.face === 'bottom_face')
  );
  const roundedCuts = getEnabledFeatures(part).filter(
    (feature): feature is RoundedCutFeature =>
      feature.kind === 'rounded_cut' &&
      feature.target.type === 'face' &&
      (feature.target.face === 'top_face' || feature.target.face === 'bottom_face')
  );
  const sideRoundedCuts = getEnabledFeatures(part).filter(
    (feature): feature is RoundedCutFeature =>
      feature.kind === 'rounded_cut' &&
      feature.target.type === 'face' &&
      (feature.target.face === 'front_face' || feature.target.face === 'back_face')
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
    // A leaning wall needs slicing whether the pocket stops inside the board
    // or runs right through it -- a through dovetail's sockets do both at
    // once, splayed and open at the far face.
    if (feature.parameters.depthMode !== 'blind' && !isSideFaceTarget(feature)) continue;
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
    if (feature.parameters.depthMode === 'blind') {
      if (isTopTarget(feature)) {
        sliceY.add(part.thickness / 2 - depth);
      } else if (isBottomTarget(feature)) {
        sliceY.add(-part.thickness / 2 + depth);
      }
    }
  }

  for (const feature of circularCuts) {
    if (feature.parameters.depthMode !== 'blind' || !feature.parameters.depth) continue;
    const verticalDepth = feature.parameters.depth * Math.cos((feature.parameters.tilt * Math.PI) / 180);
    if (feature.target.face === 'top_face') sliceY.add(part.thickness / 2 - verticalDepth);
    else sliceY.add(-part.thickness / 2 + verticalDepth);
  }
  for (const feature of roundedCuts) {
    if (feature.parameters.depthMode !== 'blind' || !feature.parameters.depth) continue;
    if (feature.target.face === 'top_face') sliceY.add(part.thickness / 2 - feature.parameters.depth);
    else sliceY.add(-part.thickness / 2 + feature.parameters.depth);
  }
  for (const feature of sideRoundedCuts) {
    if (sideRoundedDepth(feature, part) <= 0) continue;
    // Slice across the slot's width so each layer can take a different
    // length; that stack of steps is what renders the curved ends.
    const band = sideRoundedBand(feature, part);
    for (let step = 0; step <= SIDE_ROUNDED_SLICES; step += 1) {
      const y = band.center - band.half + (step * 2 * band.half) / SIDE_ROUNDED_SLICES;
      if (y > -part.thickness / 2 && y < part.thickness / 2) sliceY.add(y);
    }
  }
  for (const feature of circularCuts) {
    const recessDepth = feature.cutType === 'counterbore' ? (feature.parameters.counterbore?.depth ?? 0) : 0;
    if (recessDepth <= 0) continue;
    sliceY.add(
      feature.target.face === 'top_face' ? part.thickness / 2 - recessDepth : -part.thickness / 2 + recessDepth
    );
  }

  const layers = Array.from(sliceY).sort((a, b) => a - b);
  const layerGeometries: THREE.BufferGeometry[] = [];
  const endCuts = getEnabledFeatures(part).filter((feature): feature is EndCutFeature => feature.kind === 'end_cut');
  const wholeEnd = endCuts.filter((feature) => !feature.parameters.band);
  const banded = endCuts.filter((feature) => feature.parameters.band);
  // One clip for the lot: the cuts that take the whole end, narrowed by each
  // cut that runs in a band. Every layer is then clipped the same way, which
  // is what keeps a band that falls between slices from being lost.
  let stock: Brush | null =
    wholeEnd.length > 0 ? new Brush(createStockClipGeometry({ ...part, features: wholeEnd })) : null;
  stock?.updateMatrixWorld(true);
  if (banded.length > 0) {
    const bandEvaluator = new Evaluator();
    bandEvaluator.attributes = ['position', 'normal'];
    bandEvaluator.useGroups = false;
    for (const feature of banded) {
      const bandClip = new Brush(createBandedStockClipGeometry(part, feature));
      bandClip.updateMatrixWorld(true);
      if (!stock) {
        stock = bandClip;
        continue;
      }
      const narrowed = bandEvaluator.evaluate(stock, bandClip, INTERSECTION);
      narrowed.updateMatrixWorld(true);
      stock.geometry.dispose();
      bandClip.geometry.dispose();
      stock = narrowed;
    }
  }
  const evaluator = new Evaluator();
  evaluator.attributes = ['position', 'normal'];
  evaluator.useGroups = false;

  for (let i = 0; i < layers.length - 1; i += 1) {
    const yMin = layers[i];
    const yMax = layers[i + 1];
    const layerDepth = yMax - yMin;
    if (layerDepth <= 0) continue;
    const yMid = yMin + layerDepth / 2;

    const tenons = supportedRectCuts.filter((feature) => feature.cutType === 'tenon');
    const layerHoles = getTenonLayerRemovals(part, tenons, yMid);

    for (const feature of supportedRectCuts) {
      if (feature.cutType === 'tenon') continue;
      if (isSideFaceTarget(feature)) {
        const pocketDepth = sideRectDepth(feature, part);
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
        layerHoles.push(getRectCutHole(pseudoNotch, part));
        continue;
      }

      const depth = getRectCutDepth(feature, part.thickness);
      const active =
        feature.parameters.depthMode === 'through' ||
        (depth > 0 &&
          ((isTopTarget(feature) && yMid >= part.thickness / 2 - depth) ||
            (isBottomTarget(feature) && yMid <= -part.thickness / 2 + depth)));

      if (!active) continue;

      // A leaning wall is cut as one exact solid further down, not stepped
      // through the layers, so the layer leaves it alone.
      if (hasLeaningWalls(feature)) continue;
      layerHoles.push(getRectCutHole(feature, part));
    }

    for (const feature of circularCuts) {
      const active =
        feature.parameters.depthMode === 'through' ||
        (feature.target.face === 'top_face'
          ? (part.thickness / 2 - yMid) / Math.cos((feature.parameters.tilt * Math.PI) / 180) <
            Number(feature.parameters.depth)
          : (yMid + part.thickness / 2) / Math.cos((feature.parameters.tilt * Math.PI) / 180) <
            Number(feature.parameters.depth));
      if (!active) continue;
      const surfaceDepth = feature.target.face === 'top_face' ? part.thickness / 2 - yMid : yMid + part.thickness / 2;
      let diameter = feature.parameters.diameter;
      if (
        feature.cutType === 'counterbore' &&
        feature.parameters.counterbore &&
        surfaceDepth < feature.parameters.counterbore.depth
      ) {
        diameter = feature.parameters.counterbore.diameter;
      }
      layerHoles.push(...getCircularCutHoles(feature, part, yMid, diameter));
    }
    for (const feature of roundedCuts) {
      const active =
        feature.parameters.depthMode === 'through' ||
        (feature.target.face === 'top_face'
          ? yMid >= part.thickness / 2 - Number(feature.parameters.depth)
          : yMid <= -part.thickness / 2 + Number(feature.parameters.depth));
      if (active) layerHoles.push(getRoundedCutHole(feature, part));
    }
    for (const feature of sideRoundedCuts) {
      const hole = getSideRoundedCutHole(feature, part, yMid);
      if (hole) layerHoles.push(hole);
    }

    let layer = getLayerGeometry(contour, layerHoles, layerDepth, yMin);
    if (stock) {
      // Each slice is a closed solid. A merged stack contains coincident
      // internal caps, which are not a valid single input for solid clipping.
      const removed = new Brush(layer);
      removed.updateMatrixWorld(true);
      const clipped = evaluator.evaluate(removed, stock, INTERSECTION);
      layer.dispose();
      layer = clipped.geometry;
    }
    layerGeometries.push(subtractEdgeProfiles(subtractRoutedPaths(subtractSolidCircularCuts(layer, part), part), part));
  }
  stock?.geometry.dispose();

  let geometry =
    layerGeometries.length === 1
      ? layerGeometries[0]
      : (mergeGeometries(layerGeometries, false) ?? getLayerGeometry(contour, [], part.thickness, -part.thickness / 2));
  for (const layer of layerGeometries) if (layer !== geometry) layer.dispose();

  const leaned = subtractLeanedPockets(geometry, part);
  if (leaned !== geometry) geometry.dispose();
  geometry = leaned;

  geometry.computeVertexNormals();
  if (geometry.getAttribute('position').count === 0) {
    geometry.boundingBox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0);
  } else {
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }
  return geometry;
}

/** Keep authored cutting planes exact, but move irrelevant blank walls outside
 * the layer. Coplanar perforated caps otherwise trigger quadratic triangle
 * splitting in CSG even though those caps require no clipping at all. */
/** A box spanning the whole blank in plan, between two heights. */
function slabBrush(part: Part, yMin: number, yMax: number): Brush {
  const pad = Math.max(part.length, part.width) * 0.02 + 1;
  const height = Math.max(1e-6, yMax - yMin);
  const geometry = new THREE.BoxGeometry(part.length + pad, height, part.width + pad);
  geometry.translate(0, (yMin + yMax) / 2, 0);
  const brush = new Brush(geometry);
  brush.updateMatrixWorld(true);
  return brush;
}

/**
 * The clip for an end cut that runs in a band of the thickness.
 *
 * Everywhere outside the band the blank is left whole, so the solid is the
 * mitre's own clip cut down to the band and then the untouched blank added
 * back above and below it. Restricting a layer at a time instead means the
 * clip has to land on a slice boundary, and a band that does not is quietly
 * ignored -- which is how the first attempt at this removed nothing.
 */
function createBandedStockClipGeometry(part: Part, feature: EndCutFeature): THREE.BufferGeometry {
  const band = feature.parameters.band!;
  const half = part.thickness / 2;
  const from = Math.max(-half, -half + Math.min(band.from, band.to));
  const to = Math.min(half, -half + Math.max(band.from, band.to));

  const evaluator = new Evaluator();
  evaluator.attributes = ['position', 'normal'];
  evaluator.useGroups = false;

  const mitred = new Brush(createStockClipGeometry({ ...part, features: [feature] }));
  mitred.updateMatrixWorld(true);
  const withinBand = evaluator.evaluate(mitred, slabBrush(part, from, to), INTERSECTION);
  withinBand.updateMatrixWorld(true);

  let combined: Brush = withinBand;
  const pad = part.thickness;
  for (const [low, high] of [
    [-half - pad, from],
    [to, half + pad]
  ]) {
    if (high - low <= 1e-9) continue;
    const outside = slabBrush(part, low, high);
    combined = evaluator.evaluate(combined, outside, ADDITION);
    combined.updateMatrixWorld(true);
  }
  mitred.geometry.dispose();
  return combined.geometry;
}

function createStockClipGeometry(part: Part): THREE.BufferGeometry {
  const padding = Math.min(part.length, part.width, part.thickness) * 0.01;
  const planes = getPartStockPlanes(part).map((plane) => ({
    normal: new THREE.Vector3(plane.normal.x, plane.normal.y, plane.normal.z),
    limit: plane.limit + (Object.values(plane.normal).filter((value) => value !== 0).length === 1 ? padding : 0)
  }));
  planes.push(
    { normal: new THREE.Vector3(0, 1, 0), limit: part.thickness / 2 + padding },
    { normal: new THREE.Vector3(0, -1, 0), limit: part.thickness / 2 + padding }
  );
  // Six half spaces have at most twenty triple-plane intersections. This
  // bounded construction also handles meeting end planes: it does not assume
  // the clipped stock still has eight rectangular-blank corners.
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < planes.length - 2; i += 1) {
    for (let j = i + 1; j < planes.length - 1; j += 1) {
      for (let k = j + 1; k < planes.length; k += 1) {
        const a = planes[i],
          b = planes[j],
          c = planes[k];
        const bc = new THREE.Vector3().crossVectors(b.normal, c.normal);
        const determinant = a.normal.dot(bc);
        if (determinant === 0) continue;
        const point = bc
          .multiplyScalar(a.limit)
          .addScaledVector(new THREE.Vector3().crossVectors(c.normal, a.normal), b.limit)
          .addScaledVector(new THREE.Vector3().crossVectors(a.normal, b.normal), c.limit)
          .divideScalar(determinant);
        if (planes.every((plane) => plane.normal.dot(point) <= plane.limit + 1e-9)) points.push(point);
      }
    }
  }
  const vertices: number[] = [];
  // A lower-dimensional intersection contains no solid to triangulate.
  const origin = points[0];
  const fullDimensional =
    origin &&
    points.some((a) =>
      points.some((b) => {
        const normal = new THREE.Vector3().crossVectors(a.clone().sub(origin), b.clone().sub(origin));
        return points.some((c) => Math.abs(normal.dot(c.clone().sub(origin))) > Number.EPSILON * 64);
      })
    );
  if (fullDimensional) {
    const hull = new ConvexHull().setFromPoints(points);
    for (const face of hull.faces) {
      for (let edge = 0; edge < 3; edge += 1) {
        const point = face.getEdge(edge).head().point;
        vertices.push(point.x, point.y, point.z);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Signed tetrahedral volume of the rendered, closed layer solids. */
export function getPartMaterialVolume(part: Part): number {
  return getGeometryVolume(getPartRenderGeometry(part));
}

function getGeometryVolume(geometry: THREE.BufferGeometry): number {
  const positions = geometry.getAttribute('position');
  const index = geometry.index;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let volume = 0;
  for (let i = 0; i < (index?.count ?? positions.count); i += 3) {
    a.fromBufferAttribute(positions, index ? index.getX(i) : i);
    b.fromBufferAttribute(positions, index ? index.getX(i + 1) : i + 1);
    c.fromBufferAttribute(positions, index ? index.getX(i + 2) : i + 2);
    volume += a.dot(b.cross(c)) / 6;
  }
  return Math.abs(volume);
}

/** Compare the remaining solids, including openings on any face. */
export function partsOverlapInMaterial(a: Part, b: Part, tolerance = 1e-6): boolean {
  const geometryFor = (part: Part) => {
    const source = getPartRenderGeometry(part);
    const geometry = hasRenderablePartFeatures(part) ? source.clone() : source;
    const rotation = new THREE.Euler(
      (part.rotation.x * Math.PI) / 180,
      (part.rotation.y * Math.PI) / 180,
      (part.rotation.z * Math.PI) / 180,
      'XYZ'
    );
    geometry.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(
          part.position.x - a.position.x,
          part.position.y - a.position.y,
          part.position.z - a.position.z
        ),
        new THREE.Quaternion().setFromEuler(rotation),
        new THREE.Vector3(1, 1, 1)
      )
    );
    return geometry;
  };
  const first = geometryFor(a),
    second = geometryFor(b);
  try {
    if (!first.getAttribute('position').count || !second.getAttribute('position').count) return false;
    const treeA = new MeshBVH(first),
      treeB = new MeshBVH(second);
    const direction = new THREE.Vector3(0.371, 0.529, 0.763).normalize();
    const inside = (tree: MeshBVH, point: THREE.Vector3): boolean => {
      if (!tree.geometry.boundingBox!.containsPoint(point)) return false;
      const hits = tree
        .raycast(new THREE.Ray(point, direction), THREE.DoubleSide)
        .sort((a, b) => a.distance - b.distance);
      let winding = 0;
      for (let i = 0; i < hits.length; ) {
        const distance = hits[i].distance;
        let orientation = 0,
          normalDistance = Infinity;
        do {
          const dot = hits[i].face!.normal.dot(direction);
          orientation += Math.sign(dot);
          normalDistance = Math.min(normalDistance, distance * Math.abs(dot));
          i++;
        } while (i < hits.length && Math.abs(hits[i].distance - distance) < tolerance * 0.1);
        // Opposite caps between closed layers cancel. Duplicate edge hits on
        // the same outward face count once, as a winding crossing, not twice.
        if (orientation) {
          if (normalDistance <= tolerance) return false;
          winding += Math.sign(orientation);
        }
      }
      return winding > 0;
    };
    const inBoth = (point: THREE.Vector3) => inside(treeA, point) && inside(treeB, point);
    const normalA = new THREE.Vector3(),
      normalB = new THREE.Vector3(),
      point = new THREE.Vector3();
    const surfaceSample = (tree: MeshBVH) =>
      tree.shapecast({
        intersectsBounds: () => true,
        intersectsTriangle: (triangle) => {
          triangle.getNormal(normalA);
          triangle.getMidpoint(point).addScaledVector(normalA, -tolerance * 2);
          return inBoth(point);
        }
      });
    if (surfaceSample(treeA) || surfaceSample(treeB)) return true;
    const line = new THREE.Line3();
    return treeA.bvhcast(treeB, new THREE.Matrix4(), {
      intersectsTriangles: (triangleA, triangleB) => {
        triangleA.getNormal(normalA);
        triangleB.getNormal(normalB);
        const dot = normalA.dot(normalB);
        // Coplanar/tangent surfaces cannot establish strict volume overlap;
        // their interior is covered by the surface samples above.
        if (
          Math.abs(dot) > 1 - 1e-10 ||
          !triangleA.intersectsTriangle(triangleB, line, true) ||
          line.distanceSq() <= tolerance * tolerance
        )
          return false;
        line
          .getCenter(point)
          .addScaledVector(normalA, (-tolerance * 2) / (1 + dot))
          .addScaledVector(normalB, (-tolerance * 2) / (1 + dot));
        return inBoth(point);
      }
    });
  } finally {
    first.dispose();
    second.dispose();
  }
}

function subtractSolidCircularCuts(baseGeometry: THREE.BufferGeometry, part: Part): THREE.BufferGeometry {
  const features = getEnabledFeatures(part).filter(
    (feature): feature is CircularCutFeature =>
      feature.kind === 'circular_cut' &&
      feature.target.type === 'face' &&
      (feature.cutType === 'countersink' ||
        (feature.target.face !== 'top_face' && feature.target.face !== 'bottom_face') ||
        feature.parameters.tilt !== 0)
  );
  if (features.length === 0) return baseGeometry;

  const evaluator = new Evaluator();
  evaluator.attributes = ['position', 'normal'];
  evaluator.useGroups = false;
  let current = new Brush(baseGeometry);
  current.updateMatrixWorld(true);
  const diagonal = Math.hypot(part.length, part.width, part.thickness);

  for (const feature of features) {
    for (const member of expandCircularCut(feature, part)) {
      const axis = new THREE.Vector3(member.axis.x, member.axis.y, member.axis.z).normalize();
      const subtractCutter = (entryRadius: number, endRadius: number, length: number, startOffset: number): void => {
        if (!(length > 0)) return;
        const taper = (entryRadius - endRadius) / length;
        const tilt = (feature.parameters.tilt * Math.PI) / 180;
        const entryDenominator = Math.cos(tilt) - taper * Math.sin(tilt);
        if (entryDenominator <= 1e-9) return; // Invalid, unbounded entry; authoring/fabrication validation explains why.
        // The whole start cap must lie outside the tilted entry face. Extend
        // along the original cone slope; padding must not change its angle.
        const start = Math.min(startOffset, (-entryRadius * Math.sin(tilt)) / entryDenominator - 0.002);
        const end = startOffset + length + 0.002;
        const cutterLength = end - start;
        const extendedEntryRadius = endRadius + taper * cutterLength;
        const cutterGeometry = new THREE.CylinderGeometry(
          endRadius,
          extendedEntryRadius,
          cutterLength,
          Math.min(64, Math.max(16, Math.ceil(Math.max(entryRadius, endRadius) * 24))),
          1,
          false
        );
        const cutter = new Brush(cutterGeometry);
        cutter.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
        cutter.position
          .set(member.entryPoint.x, member.entryPoint.y, member.entryPoint.z)
          .addScaledVector(axis, start + cutterLength / 2);
        cutter.updateMatrixWorld(true);
        const result = evaluator.evaluate(current, cutter, SUBTRACTION) as Brush;
        result.geometry.computeVertexNormals();
        if (current.geometry !== baseGeometry) current.geometry.dispose();
        cutterGeometry.dispose();
        current = result;
        current.updateMatrixWorld(true);
      };

      const pilotLength = feature.parameters.depthMode === 'blind' ? Number(feature.parameters.depth) : diagonal * 2;
      if (!(pilotLength > 0)) continue;
      if (feature.cutType === 'counterbore' && feature.parameters.counterbore) {
        subtractCutter(
          feature.parameters.counterbore.diameter / 2,
          feature.parameters.counterbore.diameter / 2,
          feature.parameters.counterbore.depth,
          -0.002
        );
      } else if (feature.cutType === 'countersink' && feature.parameters.countersink) {
        const entryRadius = feature.parameters.countersink.majorDiameter / 2;
        const endRadius = feature.parameters.diameter / 2;
        const sinkDepth =
          (entryRadius - endRadius) / Math.tan((feature.parameters.countersink.includedAngle * Math.PI) / 360);
        subtractCutter(entryRadius, endRadius, sinkDepth, -0.002);
      }
      subtractCutter(
        feature.parameters.diameter / 2,
        feature.parameters.diameter / 2,
        pilotLength,
        feature.parameters.depthMode === 'through' ? -diagonal / 2 : -0.002
      );
    }
  }

  if (current.geometry !== baseGeometry) baseGeometry.dispose();
  return current.geometry;
}

function routedPoint(
  feature: RoutedPathFeature,
  frame: ReturnType<typeof getFaceFrame>,
  point: RoutedPathFeature['path']['points'][number]
): THREE.Vector3 {
  const primary = referencedFeatureOffset(point.primary, frame.primarySize, feature.reference.primaryFrom);
  const secondary = referencedFeatureOffset(point.secondary, frame.secondarySize, feature.reference.secondaryFrom);
  return new THREE.Vector3(frame.origin.x, frame.origin.y, frame.origin.z)
    .addScaledVector(new THREE.Vector3(frame.primaryAxis.x, frame.primaryAxis.y, frame.primaryAxis.z), primary)
    .addScaledVector(new THREE.Vector3(frame.secondaryAxis.x, frame.secondaryAxis.y, frame.secondaryAxis.z), secondary);
}

interface RoutedCorner {
  incoming: THREE.Vector3;
  outgoing: THREE.Vector3;
  arc: THREE.Vector3[];
}

function getRoutedCorner(
  previous: THREE.Vector3,
  corner: THREE.Vector3,
  next: THREE.Vector3,
  requestedRadius: number,
  faceNormal: THREE.Vector3
): RoutedCorner | null {
  if (!(requestedRadius > 0)) return null;
  const towardPrevious = previous.clone().sub(corner);
  const towardNext = next.clone().sub(corner);
  const previousLength = towardPrevious.length();
  const nextLength = towardNext.length();
  if (previousLength <= 1e-9 || nextLength <= 1e-9) return null;
  towardPrevious.divideScalar(previousLength);
  towardNext.divideScalar(nextLength);
  const angle = Math.acos(THREE.MathUtils.clamp(towardPrevious.dot(towardNext), -1, 1));
  const tangent = Math.tan(angle / 2);
  if (Math.abs(towardPrevious.dot(towardNext)) > 1 - 1e-9 || !(tangent > 1e-9)) return null;

  // Each end may consume at most half its adjacent span. Consequently two
  // neighboring fillets can never cross, even when both radii are oversized.
  const requestedTrim = requestedRadius / tangent;
  const trim = Math.min(requestedTrim, previousLength * 0.499, nextLength * 0.499);
  if (!(trim > 1e-9)) return null;
  const radius = trim * tangent;
  const incoming = corner.clone().addScaledVector(towardPrevious, trim);
  const outgoing = corner.clone().addScaledVector(towardNext, trim);
  const bisector = towardPrevious.clone().add(towardNext).normalize();
  const center = corner.clone().addScaledVector(bisector, radius / Math.sin(angle / 2));
  const radialStart = incoming.clone().sub(center);
  const radialEnd = outgoing.clone().sub(center);
  const signedSweep = Math.atan2(
    faceNormal.dot(new THREE.Vector3().crossVectors(radialStart, radialEnd)),
    radialStart.dot(radialEnd)
  );
  // Four samples per half-turn is visually smooth at furniture scale while
  // keeping the sequential CSG cost bounded for closed multi-corner paths.
  const steps = Math.max(1, Math.ceil(Math.abs(signedSweep) / (Math.PI / 4)));
  const arc: THREE.Vector3[] = [];
  for (let step = 1; step <= steps; step += 1) {
    arc.push(
      radialStart
        .clone()
        .applyAxisAngle(faceNormal, (signedSweep * step) / steps)
        .add(center)
    );
  }
  return { incoming, outgoing, arc };
}

function expandRoutedPath(feature: RoutedPathFeature, part: Part): THREE.Vector3[] {
  const frame = getFaceFrame(part, feature.target.face);
  const normal = new THREE.Vector3(frame.inwardNormal.x, frame.inwardNormal.y, frame.inwardNormal.z).normalize();
  const authored = feature.path.points.map((point) => routedPoint(feature, frame, point));
  const cornerAt = (index: number): RoutedCorner | null => {
    if (!feature.path.closed && (index === 0 || index === authored.length - 1)) return null;
    return getRoutedCorner(
      authored[(index - 1 + authored.length) % authored.length],
      authored[index],
      authored[(index + 1) % authored.length],
      feature.path.points[index].cornerRadius ?? 0,
      normal
    );
  };
  const corners = authored.map((_, index) => cornerAt(index));
  if (!feature.path.closed) {
    const expanded = [authored[0]];
    for (let index = 1; index < authored.length - 1; index += 1) {
      const corner = corners[index];
      if (corner) expanded.push(corner.incoming, ...corner.arc);
      else expanded.push(authored[index]);
    }
    expanded.push(authored[authored.length - 1]);
    return expanded;
  }
  const expanded: THREE.Vector3[] = [];
  for (let index = 0; index < authored.length; index += 1) {
    const corner = corners[index];
    if (corner) expanded.push(corner.incoming, ...corner.arc);
    else expanded.push(authored[index]);
  }
  expanded.push(expanded[0].clone());
  return expanded;
}

/**
 * Cut every pocket whose walls lean, as one solid with the walls it was given.
 *
 * The walls of such a pocket are flat planes, so the removal is a hexahedron
 * between the footprint at the mouth and the footprint at the floor -- a
 * loft, which also carries a radiused corner round with it because both
 * rings come off the same contour. Cutting it whole is the only way the two
 * halves of a dovetail can meet: one is sawn to a slope and the other has to
 * be the same slope, not an approximation of it.
 */
function subtractLeanedPockets(baseGeometry: THREE.BufferGeometry, part: Part): THREE.BufferGeometry {
  const features = getEnabledFeatures(part)
    .filter((feature): feature is RectCutFeature => feature.kind === 'rect_cut')
    .map((feature) => getResolvedRectCutFeature(feature, part))
    .filter(
      (feature) =>
        hasLeaningWalls(feature) && (isTopTarget(feature) || isBottomTarget(feature)) && !isSideFaceTarget(feature)
    );
  if (features.length === 0) return baseGeometry;

  const evaluator = new Evaluator();
  evaluator.attributes = ['position', 'normal'];
  evaluator.useGroups = false;
  let current = new Brush(baseGeometry);
  current.updateMatrixWorld(true);

  for (const feature of features) {
    const geometry = leanedPocketGeometry(feature, part);
    if (!geometry) continue;
    const cutter = new Brush(geometry);
    cutter.updateMatrixWorld(true);
    const result = evaluator.evaluate(current, cutter, SUBTRACTION) as Brush;
    result.geometry.computeVertexNormals();
    if (current.geometry !== baseGeometry) current.geometry.dispose();
    geometry.dispose();
    current = result;
    current.updateMatrixWorld(true);
  }
  return current.geometry;
}

function leanedPocketGeometry(feature: RectCutFeature, part: Part): THREE.BufferGeometry | null {
  const depth = getRectCutDepth(feature, part.thickness);
  if (!(depth > 0)) return null;
  const bottom = isBottomTarget(feature);
  // Stand the mouth off the surface, and a through pocket out past the far
  // face, so neither cap lands exactly on a face the boolean has to keep.
  const overshoot = Math.max(part.thickness, 1) * 1e-3;
  const floorDepth = feature.parameters.depthMode === 'through' ? depth + overshoot : depth;
  const yAt = (into: number) => (bottom ? -part.thickness / 2 + into : part.thickness / 2 - into);
  // Contour Z is mirrored into local Z by the layer builder's rotateX(-pi/2).
  const ringAt = (into: number) => {
    const y = yAt(into);
    return getSplayedRectCutHole(feature, part, y).map((point) => ({ x: point.x, y, z: -point.z }));
  };
  const mouth = ringAt(-overshoot);
  const floor = ringAt(floorDepth);
  if (mouth.length < 3 || mouth.length !== floor.length) return null;

  const vertices: number[] = [];
  const triangle = (a: Point3, b: Point3, c: Point3) => vertices.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  for (let index = 0; index < mouth.length; index += 1) {
    const next = (index + 1) % mouth.length;
    triangle(mouth[index], mouth[next], floor[next]);
    triangle(mouth[index], floor[next], floor[index]);
  }
  // Both rings run the same way round, so the caps have to be fanned against
  // each other: every edge of a closed solid is walked once in each
  // direction, and the walls have already taken the mouth ring forwards.
  for (let index = 1; index + 1 < mouth.length; index += 1) triangle(mouth[0], mouth[index + 1], mouth[index]);
  for (let index = 1; index + 1 < floor.length; index += 1) triangle(floor[0], floor[index], floor[index + 1]);

  // That closes it, but front-to-back depends on which way round the contour
  // came, so settle the facing on the finished solid: a negative signed
  // volume means the whole thing is inside out.
  let signed = 0;
  for (let index = 0; index < vertices.length; index += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = vertices.slice(index, index + 9);
    signed += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  if (signed < 0)
    for (let index = 0; index < vertices.length; index += 9) {
      for (let axis = 0; axis < 3; axis += 1) {
        const swap = vertices[index + axis];
        vertices[index + axis] = vertices[index + 6 + axis];
        vertices[index + 6 + axis] = swap;
      }
    }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Subtract a router bit swept along each straight path span. The MVP path is
 * polyline based; adjoining cutters overlap so corners remain watertight. */
function subtractRoutedPaths(baseGeometry: THREE.BufferGeometry, part: Part): THREE.BufferGeometry {
  const features = getEnabledFeatures(part).filter(
    (feature): feature is RoutedPathFeature => feature.kind === 'routed_path' && feature.target.type === 'face'
  );
  if (features.length === 0) return baseGeometry;

  const evaluator = new Evaluator();
  evaluator.attributes = ['position', 'normal'];
  evaluator.useGroups = false;
  let current = new Brush(baseGeometry);
  current.updateMatrixWorld(true);
  const diagonal = Math.hypot(part.length, part.width, part.thickness);

  const subtract = (geometry: THREE.BufferGeometry, position?: THREE.Vector3, quaternion?: THREE.Quaternion) => {
    const cutter = new Brush(geometry);
    if (position) cutter.position.copy(position);
    if (quaternion) cutter.quaternion.copy(quaternion);
    cutter.updateMatrixWorld(true);
    const result = evaluator.evaluate(current, cutter, SUBTRACTION) as Brush;
    result.geometry.computeVertexNormals();
    if (current.geometry !== baseGeometry) current.geometry.dispose();
    geometry.dispose();
    current = result;
    current.updateMatrixWorld(true);
  };

  for (const feature of features) {
    const frame = getFaceFrame(part, feature.target.face);
    const normal = new THREE.Vector3(frame.inwardNormal.x, frame.inwardNormal.y, frame.inwardNormal.z).normalize();
    const points = expandRoutedPath(feature, part);
    const diameter = feature.bit.diameter;
    const requestedDepth =
      feature.parameters.depthMode === 'through' ? diagonal * 2 : Number(feature.parameters.depth ?? 0);
    if (!(diameter > 0) || !(requestedDepth > 0)) continue;

    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      const tangent = end.clone().sub(start);
      const length = tangent.length();
      if (length <= 1e-9) continue;
      tangent.divideScalar(length);
      const center = start.clone().add(end).multiplyScalar(0.5);
      const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
      const padding = 0.002;

      if (feature.bit.profile === 'dovetail' || feature.bit.profile === 't_slot' || feature.bit.profile === 'keyhole') {
        const shankDiameter = feature.bit.shankDiameter;
        if (!(shankDiameter > 0) || shankDiameter >= diameter) continue;
        let cavityHeight: number;
        if (feature.bit.profile === 'dovetail') {
          const halfAngle = THREE.MathUtils.degToRad(feature.bit.includedAngle) / 2;
          if (!(halfAngle > 0) || halfAngle >= Math.PI / 2) continue;
          cavityHeight = (diameter - shankDiameter) / 2 / Math.tan(halfAngle);
        } else {
          cavityHeight = feature.bit.cutterHeight;
        }
        if (!(cavityHeight > 0) || cavityHeight > requestedDepth) continue;
        const cavityTop = requestedDepth - cavityHeight;
        const shankHalf = shankDiameter / 2;
        const cutterHalf = diameter / 2;
        const profile = new THREE.Shape();
        profile.moveTo(-shankHalf, -padding);
        profile.lineTo(shankHalf, -padding);
        profile.lineTo(shankHalf, cavityTop);
        if (feature.bit.profile !== 'dovetail') profile.lineTo(cutterHalf, cavityTop);
        profile.lineTo(cutterHalf, requestedDepth);
        profile.lineTo(-cutterHalf, requestedDepth);
        if (feature.bit.profile !== 'dovetail') profile.lineTo(-cutterHalf, cavityTop);
        profile.lineTo(-shankHalf, cavityTop);
        profile.closePath();
        const geometry = new THREE.ExtrudeGeometry(profile, {
          depth: length,
          bevelEnabled: false,
          steps: 1,
          curveSegments: 1
        });
        geometry.applyMatrix4(new THREE.Matrix4().makeBasis(bitangent, normal, tangent).setPosition(start));
        subtract(geometry);

        const capRotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
        for (const endpoint of index === 0 ? [start, end] : [end]) {
          subtract(
            new THREE.CylinderGeometry(shankHalf, shankHalf, requestedDepth + padding, 24, 1, false),
            endpoint.clone().addScaledVector(normal, (requestedDepth - padding) / 2),
            capRotation
          );
          const cavityCap =
            feature.bit.profile === 'dovetail'
              ? new THREE.CylinderGeometry(cutterHalf, shankHalf, cavityHeight, 24, 1, false)
              : new THREE.CylinderGeometry(cutterHalf, cutterHalf, cavityHeight, 24, 1, false);
          subtract(cavityCap, endpoint.clone().addScaledVector(normal, requestedDepth - cavityHeight / 2), capRotation);
        }
        if (feature.bit.profile === 'keyhole' && index === 0) {
          const plungePoint = routedPoint(feature, frame, feature.path.points[0]);
          subtract(
            new THREE.CylinderGeometry(cutterHalf, cutterHalf, requestedDepth + padding, 24, 1, false),
            plungePoint.addScaledVector(normal, (requestedDepth - padding) / 2),
            capRotation
          );
        }
        continue;
      }

      if (feature.bit.profile === 'core_box' || feature.bit.profile === 'ball_nose') {
        const radius = diameter / 2;
        const depth = Math.min(requestedDepth, radius);
        const axisCenter = center.clone().addScaledVector(normal, radius - depth);
        const cylinder = new THREE.CylinderGeometry(radius, radius, length, 32, 1, false);
        const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
        subtract(cylinder, axisCenter, rotation);
        for (const endpoint of index === 0 ? [start, end] : [end]) {
          subtract(new THREE.SphereGeometry(radius, 24, 12), endpoint.clone().addScaledVector(normal, radius - depth));
        }
        continue;
      }

      const isTaperedPoint = feature.bit.profile === 'v_bit' || feature.bit.profile === 'engraving';
      const depth =
        isTaperedPoint && feature.bit.includedAngle
          ? Math.min(requestedDepth, diameter / (2 * Math.tan(THREE.MathUtils.degToRad(feature.bit.includedAngle) / 2)))
          : requestedDepth;
      const topWidth =
        isTaperedPoint && feature.bit.includedAngle
          ? Math.min(diameter, 2 * depth * Math.tan(THREE.MathUtils.degToRad(feature.bit.includedAngle) / 2))
          : diameter;
      const halfWidth = topWidth / 2;
      const profile = new THREE.Shape();
      profile.moveTo(-halfWidth, -padding);
      profile.lineTo(halfWidth, -padding);
      if (isTaperedPoint) {
        profile.lineTo(0, depth);
      } else {
        profile.lineTo(halfWidth, depth);
        profile.lineTo(-halfWidth, depth);
      }
      profile.closePath();
      const geometry = new THREE.ExtrudeGeometry(profile, {
        depth: length,
        bevelEnabled: false,
        steps: 1,
        curveSegments: 1
      });
      // ExtrudeGeometry axes are profile X/Y and sweep Z. Map those to the
      // face's across/inward directions and the path tangent respectively.
      geometry.applyMatrix4(new THREE.Matrix4().makeBasis(bitangent, normal, tangent).setPosition(start));
      subtract(geometry);
      const capHeight = depth + padding;
      const capRotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      for (const endpoint of index === 0 ? [start, end] : [end]) {
        const cap = isTaperedPoint
          ? new THREE.ConeGeometry(halfWidth, capHeight, 32, 1, false)
          : new THREE.CylinderGeometry(halfWidth, halfWidth, capHeight, 32, 1, false);
        subtract(cap, endpoint.clone().addScaledVector(normal, (depth - padding) / 2), capRotation);
      }
    }
  }
  if (current.geometry !== baseGeometry) baseGeometry.dispose();
  return current.geometry;
}

function getEdgeProfileFrame(part: Part, feature: EdgeProfileFeature) {
  const edge = feature.target.edge;
  const half = { x: part.length / 2, y: part.thickness / 2, z: part.width / 2 };
  const named = edge.split('_');
  const inward = (name: string) =>
    name === 'top'
      ? new THREE.Vector3(0, -1, 0)
      : name === 'bottom'
        ? new THREE.Vector3(0, 1, 0)
        : name === 'front'
          ? new THREE.Vector3(0, 0, -1)
          : name === 'back'
            ? new THREE.Vector3(0, 0, 1)
            : name === 'left'
              ? new THREE.Vector3(1, 0, 0)
              : new THREE.Vector3(-1, 0, 0);
  const firstInward = inward(named[0]);
  const secondInward = inward(named[1]);
  // CSG requires a consistently right-handed cutter basis. Using an
  // arbitrary positive edge direction mirrors half of the cutters, which
  // makes their winding face inward and causes subtraction to leave the
  // original sharp corner untouched.
  const tangent = new THREE.Vector3().crossVectors(firstInward, secondInward).normalize();
  const run = tangent.x ? part.length : tangent.y ? part.thickness : part.width;
  const anchor = new THREE.Vector3(
    tangent.x ? (tangent.x > 0 ? -half.x : half.x) : edge.includes('left') ? -half.x : half.x,
    tangent.y ? (tangent.y > 0 ? -half.y : half.y) : edge.includes('top') ? half.y : -half.y,
    tangent.z ? (tangent.z > 0 ? -half.z : half.z) : edge.includes('front') ? half.z : -half.z
  );
  return { anchor, tangent, run, firstInward, secondInward };
}

function edgeRemovalShape(feature: EdgeProfileFeature): THREE.Shape | null {
  let boundary = getEdgeProfileFeatureBoundary(feature);
  if (boundary.length < 2 || boundary.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y)))
    return null;
  const polygon = [{ x: 0, y: 0 }, ...boundary];
  const orientation = (a: EdgeProfilePoint, b: EdgeProfilePoint, c: EdgeProfilePoint) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  for (let first = 0; first < polygon.length; first += 1) {
    const firstNext = (first + 1) % polygon.length;
    for (let second = first + 2; second < polygon.length; second += 1) {
      const secondNext = (second + 1) % polygon.length;
      if (first === secondNext || firstNext === second) continue;
      if (
        orientation(polygon[first], polygon[firstNext], polygon[second]) *
          orientation(polygon[first], polygon[firstNext], polygon[secondNext]) <
          0 &&
        orientation(polygon[second], polygon[secondNext], polygon[first]) *
          orientation(polygon[second], polygon[secondNext], polygon[firstNext]) <
          0
      )
        return null;
    }
  }
  const area =
    polygon.reduce((sum, point, index) => {
      const next = polygon[(index + 1) % polygon.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0) / 2;
  if (Math.abs(area) <= 1e-10) return null;
  if (area < 0) boundary = [...boundary].reverse();
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  for (const point of boundary) {
    shape.lineTo(point.x, point.y);
  }
  shape.closePath();
  return shape;
}

function subtractEdgeProfiles(baseGeometry: THREE.BufferGeometry, part: Part): THREE.BufferGeometry {
  const features = getEnabledFeatures(part).filter(
    (feature): feature is EdgeProfileFeature => feature.kind === 'edge_profile'
  );
  if (!features.length) return baseGeometry;
  const evaluator = new Evaluator();
  evaluator.attributes = ['position', 'normal'];
  evaluator.useGroups = false;
  let current = new Brush(baseGeometry);
  current.updateMatrixWorld(true);
  for (const feature of features) {
    const removalShape = edgeRemovalShape(feature);
    if (!removalShape) continue;
    const { anchor, tangent, run, firstInward, secondInward } = getEdgeProfileFrame(part, feature);
    const padding = 0.004;
    const cutterGeometry = new THREE.ExtrudeGeometry(removalShape, {
      depth: run + padding * 2,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 1
    });
    cutterGeometry.applyMatrix4(
      new THREE.Matrix4()
        .makeBasis(firstInward, secondInward, tangent)
        .setPosition(anchor.clone().addScaledVector(tangent, -padding))
    );
    const cutter = new Brush(cutterGeometry);
    cutter.updateMatrixWorld(true);
    const result = evaluator.evaluate(current, cutter, SUBTRACTION) as Brush;
    result.geometry.computeVertexNormals();
    if (current.geometry !== baseGeometry) current.geometry.dispose();
    cutterGeometry.dispose();
    current = result;
  }
  if (current.geometry !== baseGeometry) baseGeometry.dispose();
  return current.geometry;
}

/**
 * Shoulder removals for a layer of a tenoned part.
 *
 * A tenon leaves a projecting tongue at one end: layers inside the tongue's
 * thickness band keep the full length (narrowed to the tongue width by the
 * shoulders), while layers outside the band stop at the shoulder line. Both
 * Every operation contributes removal regions. Unioning these cutters avoids
 * self-crossing outlines when opposing shoulders pass and never ignores later
 * same-end cuts. Adding or lengthening a cut cannot restore material.
 */
function getTenonLayerRemovals(part: Part, tenons: RectCutFeature[], yMid: number): Point2[][] {
  const halfLength = part.length / 2;
  const halfWidth = part.width / 2;
  const removals: Point2[][] = [];
  for (const feature of tenons) {
    const tongueThickness = feature.parameters.depth ?? 0;
    const length = feature.parameters.size.length;
    if (tongueThickness <= 0 || length <= 0) continue;
    const left = feature.target.type === 'face' && feature.target.face === 'left_end';
    const minX = left ? -halfLength : halfLength - length;
    const maxX = left ? -halfLength + length : halfLength;
    const removeBand = (minZ: number, maxZ: number) => {
      if (maxZ <= minZ) return;
      removals.push([
        { x: minX, z: minZ },
        { x: maxX, z: minZ },
        { x: maxX, z: maxZ },
        { x: minX, z: maxZ }
      ]);
    };
    if (Math.abs(yMid) > tongueThickness / 2) {
      removeBand(-halfWidth, halfWidth);
    } else {
      const minZ = -halfWidth + feature.placement.z;
      removeBand(-halfWidth, minZ);
      removeBand(minZ + feature.parameters.size.width, halfWidth);
    }
  }
  return removals;
}

function getFeaturePolygons(part: Part): polygonClipping.MultiPolygon {
  const contour = buildOuterContour(part);
  // Resolve before testing depth, exactly as the 3D removal pass does. Family
  // cuts (dado, groove, rabbet, tenon, mortise) resolve to blind whatever the
  // authored mode says, so reading the authored one here would punch a full
  // through hole in the plan model for a cut that renders as a shallow
  // channel -- and collision would let parts pass through solid wood.
  const removals = getEnabledFeatures(part)
    .filter((feature): feature is RectCutFeature => feature.kind === 'rect_cut')
    .map((feature) => getResolvedRectCutFeature(feature, part))
    .filter((feature) => feature.parameters.depthMode === 'through')
    .map((feature) => getRectCutHole(feature, part));
  if (!removals.length) return [[contour.concat(contour[0]).map(({ x, z }) => [x, z])]];
  return differenceContours(contour, removals);
}

function getFeatureContour(part: Part): Point2[] {
  const contour = buildOuterContour(part);
  const polygons = getFeaturePolygons(part);
  // Legacy single-outline bounds may be conservative. Collision uses every
  // component and interior ring via getFeaturePolygons, never this fallback.
  return polygons.length === 1 ? polygons[0][0].slice(0, -1).map(([x, z]) => ({ x, z })) : contour;
}

/**
 * Round parts repeat heavily -- a project uses a handful of dowel diameters and
 * a handful of lengths -- so pool them by size rather than rebuilding per part.
 */
const rodGeometryCache = new Map<string, THREE.BufferGeometry>();
const MAX_ROD_GEOMETRY_CACHE_ENTRIES = 64;
/**
 * Fine enough that drei's 15-degree Edges threshold suppresses the lateral
 * seams and draws only the two end circles, which is what reads as a dowel.
 */
const ROD_RADIAL_SEGMENTS = 32;

/** A dowel: round in cross-section, with its axis along the part's length. */
export function getRodRenderGeometry(length: number, diameter: number): THREE.BufferGeometry {
  const key = `${length}:${diameter}`;
  const cached = rodGeometryCache.get(key);
  if (cached) {
    rodGeometryCache.delete(key);
    rodGeometryCache.set(key, cached);
    return cached;
  }

  const radius = Math.max(diameter, 0) / 2;
  const geometry = new THREE.CylinderGeometry(radius, radius, Math.max(length, 0), ROD_RADIAL_SEGMENTS);
  // Three builds a cylinder along Y; a part's length runs along its local X.
  geometry.rotateZ(Math.PI / 2);

  if (rodGeometryCache.size >= MAX_ROD_GEOMETRY_CACHE_ENTRIES) {
    const oldestKey = rodGeometryCache.keys().next().value;
    // Evict the reference but never dispose, for the reason getPartRenderGeometry
    // gives: an evicted geometry is very likely still mounted.
    if (oldestKey !== undefined) rodGeometryCache.delete(oldestKey);
  }
  rodGeometryCache.set(key, geometry);
  return geometry;
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
      // Evict the reference but never dispose here. Part.tsx memoizes whatever
      // this returned and renders it via <primitive>, so the evicted geometry
      // is very likely still mounted -- disposing it makes that part vanish
      // once a scene holds more than MAX_GEOMETRY_CACHE_ENTRIES distinct cuts.
      // Dropping the last reference lets three release the GPU buffers.
      geometryCache.delete(oldestKey);
    }
  }
  geometryCache.set(key, geometry);
  return geometry;
}

/**
 * Weld the position-only topology used by the outline pass.
 *
 * CSG emits a non-indexed triangle soup. Drei's Edges correctly treats every
 * unshared triangle side as a boundary, which exposes the hidden top-face
 * triangulation as long spokes. Welding equal positions restores adjacency;
 * the render geometry keeps its authored normals and remains untouched.
 */
export function getPartOutlineGeometry(part: Part): THREE.BufferGeometry {
  const renderGeometry = getPartRenderGeometry(part);
  const cached = outlineGeometryCache.get(renderGeometry);
  if (cached) return cached;
  const positionOnly = new THREE.BufferGeometry();
  positionOnly.setAttribute('position', renderGeometry.getAttribute('position').clone());
  const welded = mergeVertices(positionOnly, 1e-5);
  positionOnly.dispose();
  outlineGeometryCache.set(renderGeometry, welded);
  return welded;
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
  const features = getEnabledFeatures(part);
  if (
    features.some((feature) => feature.kind === 'end_cut') &&
    features.some((feature) => feature.kind !== 'end_cut')
  ) {
    // Mixed removals introduce corners that were never on the original end
    // boundary. Derive their hull from the already clipped solid, rather than
    // warping selected contour points back beyond an authored cut plane.
    const geometry = getPartRenderGeometry(part);
    const cached = convexVertexCache.get(geometry);
    if (cached) return cached;
    const positions = geometry.getAttribute('position');
    const points = new Map<string, THREE.Vector3>();
    for (let i = 0; i < positions.count; i += 1) {
      const point = new THREE.Vector3().fromBufferAttribute(positions, i);
      points.set(`${point.x},${point.y},${point.z}`, point);
    }
    const hull = new ConvexHull().setFromPoints([...points.values()]);
    const vertices = new Set<THREE.Vector3>();
    for (const face of hull.faces) {
      for (let i = 0; i < 3; i += 1) vertices.add(face.getEdge(i).head().point);
    }
    const result = [...vertices].map(({ x, y, z }) => ({ x, y, z }));
    convexVertexCache.set(geometry, result);
    return result;
  }
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
      const z = applyEdgeBevelToVertex(-p.z, y);

      // Adjust left-end vertices
      if (profiles.left.maxInset > 0) {
        const leftBaseX =
          -halfLength +
          getEndCutInsetAt('left', profiles, part, {
            y: profiles.left.verticalFlip ? halfThickness : -halfThickness,
            z: p.z
          });
        if (Math.abs(x - leftBaseX) < 1e-6) {
          x = -halfLength + getEndCutInsetAt('left', profiles, part, { y, z: -z });
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
          x = halfLength - getEndCutInsetAt('right', profiles, part, { y, z: -z });
        }
      }

      // Negate contour Z to match the mirrored render geometry, then apply
      // the edge bevel in that same world space.
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
  const polygons = getFeaturePolygons(part).map((rings) =>
    rings.map((ring) => ring.slice(0, -1).map(([x, z]) => ({ x, z })))
  );
  if (!polygons.length) return [];
  const contour = polygons.flat(2);

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
      if (
        polygons.some(
          ([outer, ...holes]) => pointInPolygon(cx, cz, outer) && !holes.some((hole) => pointInPolygon(cx, cz, hole))
        )
      ) {
        boxes.push({
          centerX: cx,
          centerZ: cz,
          halfX: (xs[i + 1] - xs[i]) / 2 - WALL_SHRINK,
          halfZ: (zs[j + 1] - zs[j]) / 2 - WALL_SHRINK
        });
      }
    }
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
  return projectContour(part, contour, position);
}

function projectContour(part: Part, contour: Point2[], position: Part['position']): Point2[] {
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

  // Match Three.js's canonical XYZ Euler transform used by rendered parts and
  // OBBs. Only the X/Z projection columns are needed for a flat contour.
  const cx = Math.cos(rx),
    sx = Math.sin(rx);
  const cy = Math.cos(rad),
    sy = Math.sin(rad);
  const cz = Math.cos(rz),
    sz = Math.sin(rz);
  const m00 = cy * cz;
  const m02 = sy;
  const m20 = sx * sz - cx * sy * cz;
  const m22 = cx * cy;

  // Negate authored contour Z first to match the render geometry convention.
  return contour.map((p) => ({
    x: m00 * p.x + m02 * -p.z + position.x,
    z: m20 * p.x + m22 * -p.z + position.z
  }));
}

function getPlanTriangles(part: Part): Point2[][] {
  const key = featureKey(part);
  const cached = planTriangleCache.get(key);
  if (cached) return cached;
  const triangles = getFeaturePolygons(part).flatMap((rings) => {
    const points: Point2[] = [];
    const holes: number[] = [];
    for (const [index, ring] of rings.entries()) {
      if (index) holes.push(points.length);
      // Polygon clipping closes its rings; Earcut needs each vertex once.
      const closed = ring.length > 1 && ring[0][0] === ring.at(-1)![0] && ring[0][1] === ring.at(-1)![1];
      points.push(...(closed ? ring.slice(0, -1) : ring).map(([x, z]) => ({ x, z })));
    }
    const indices = Earcut.triangulate(
      points.flatMap(({ x, z }) => [x, z]),
      holes,
      2
    );
    const result: Point2[][] = [];
    for (let i = 0; i < indices.length; i += 3) result.push(indices.slice(i, i + 3).map((index) => points[index]));
    return result;
  });
  if (planTriangleCache.size >= MAX_GEOMETRY_CACHE_ENTRIES)
    planTriangleCache.delete(planTriangleCache.keys().next().value!);
  planTriangleCache.set(key, triangles);
  return triangles;
}

function trianglesOverlap(a: Point2[], b: Point2[], tolerance: number): boolean {
  // Strict SAT avoids reconstructing rings from numerically coincident rotated
  // boundaries. Tolerance is a distance, not an area or an unscaled dot product.
  for (const triangle of [a, b]) {
    for (let i = 0; i < 3; i++) {
      const current = triangle[i];
      const next = triangle[(i + 1) % 3];
      const nx = current.z - next.z;
      const nz = next.x - current.x;
      const length = Math.hypot(nx, nz);
      if (length === 0) continue;
      const project = (point: Point2) => point.x * nx + point.z * nz;
      const first = a.map(project);
      const second = b.map(project);
      if (
        Math.max(...first) <= Math.min(...second) + tolerance * length ||
        Math.max(...second) <= Math.min(...first) + tolerance * length
      )
        return false;
    }
  }
  return true;
}

/** Exact flat-stock overlap, preserving disconnected components and holes. */
export function partsOverlapInPlan(a: Part, b: Part, tolerance = 1e-8): boolean {
  // Triangulate only local stock once, then transform the cached triangles into
  // a pair-relative frame. Large world translations never enter SAT products.
  const project = (part: Part) =>
    getPlanTriangles(part).map((triangle) =>
      projectContour(part, triangle, {
        x: part.position.x - a.position.x,
        y: 0,
        z: part.position.z - a.position.z
      })
    );
  const first = project(a);
  const second = project(b);
  return first.some((triangle) => second.some((other) => trianglesOverlap(triangle, other, tolerance)));
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
  planTriangleCache.clear();
}
