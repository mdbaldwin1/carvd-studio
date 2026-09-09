import * as THREE from 'three';
import polygonClipping from 'polygon-clipping';
import { Brush, Evaluator, INTERSECTION, SUBTRACTION } from 'three-bvh-csg';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ConvexHull } from 'three/examples/jsm/math/ConvexHull.js';
import { CircularCutFeature, Part, PartFeature, RectCutFeature, RoundedCutFeature } from '../types';
import { getEdgeBevelInsetAt, getEndCutInsetAt, getPartEdgeBevelProfiles, getPartEndCutProfiles } from './endCutUtils';
import {
  getRectCutDepth,
  getRectCutPlanBounds,
  getRectCutPreviewSupport,
  getResolvedRectCutFeature,
  isBottomTarget,
  isSideFaceTarget,
  isTopTarget
} from './rectCutUtils';
import { expandCircularCut, getFaceFrame } from './roundCutUtils';

type Point2 = { x: number; z: number };

const geometryCache = new Map<string, THREE.BufferGeometry>();
const convexVertexCache = new WeakMap<THREE.BufferGeometry, Array<{ x: number; y: number; z: number }>>();
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
      .map((feature) => ({
        kind: feature.kind,
        cutType: feature.cutType,
        target: feature.target,
        reference: feature.reference,
        parameters: feature.parameters,
        ...(feature.kind === 'end_cut' ? { lengthMode: feature.lengthMode } : { placement: feature.placement }),
        ...(feature.kind === 'circular_cut' ? { pattern: feature.pattern } : {})
      }))
  });
}

function clonePoint(point: Point2): Point2 {
  return { x: point.x, z: point.z };
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

function getRectCutHole(feature: RectCutFeature, part: Part): Point2[] {
  const bounds = getRectCutPlanBounds(feature, part);
  const minX = bounds.minX - part.length / 2;
  const maxX = bounds.maxX - part.length / 2;
  const minZ = bounds.minZ - part.width / 2;
  const maxZ = bounds.maxZ - part.width / 2;
  return [
    { x: minX, z: minZ },
    { x: maxX, z: minZ },
    { x: maxX, z: maxZ },
    { x: minX, z: maxZ }
  ];
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
  for (const feature of circularCuts) {
    const recessDepth = feature.cutType === 'counterbore' ? (feature.parameters.counterbore?.depth ?? 0) : 0;
    if (recessDepth <= 0) continue;
    sliceY.add(
      feature.target.face === 'top_face' ? part.thickness / 2 - recessDepth : -part.thickness / 2 + recessDepth
    );
  }

  const layers = Array.from(sliceY).sort((a, b) => a - b);
  const layerGeometries: THREE.BufferGeometry[] = [];
  const stock = getEnabledFeatures(part).some((feature) => feature.kind === 'end_cut')
    ? new Brush(createEndCutOnlyGeometry(part))
    : null;
  stock?.updateMatrixWorld(true);
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
    const layerContour = tenons.length > 0 ? buildTenonLayerContour(part, tenons, yMid) : contour.map(clonePoint);
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

    let layer = getLayerGeometry(layerContour, layerHoles, layerDepth, yMin);
    if (stock) {
      // Each slice is a closed solid. A merged stack contains coincident
      // internal caps, which are not a valid single input for solid clipping.
      const removed = new Brush(layer);
      removed.updateMatrixWorld(true);
      const clipped = evaluator.evaluate(removed, stock, INTERSECTION);
      layer.dispose();
      layer = clipped.geometry;
    }
    layerGeometries.push(subtractSolidCircularCuts(layer, part));
  }
  stock?.geometry.dispose();

  const geometry =
    layerGeometries.length === 1
      ? layerGeometries[0]
      : (mergeGeometries(layerGeometries, false) ?? getLayerGeometry(contour, [], part.thickness, -part.thickness / 2));
  for (const layer of layerGeometries) if (layer !== geometry) layer.dispose();

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

/** Signed tetrahedral volume of the rendered, closed layer solids. */
export function getPartMaterialVolume(part: Part): number {
  const geometry = getPartRenderGeometry(part);
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
  const contour = buildOuterContour(part);
  const removals = getEnabledFeatures(part)
    .filter(
      (feature): feature is RectCutFeature => feature.kind === 'rect_cut' && feature.parameters.depthMode === 'through'
    )
    .map((feature) => getRectCutHole(feature, part));
  if (!removals.length) return contour;
  const polygons = differenceContours(contour, removals);
  // The flat-outline interface accepts one contour. Bound disconnected stock
  // conservatively; layer rendering retains every connected component.
  return polygons.length === 1 ? polygons[0][0].slice(0, -1).map(([x, z]) => ({ x, z })) : contour;
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
