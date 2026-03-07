import * as THREE from 'three';
import { Part, PartFeature, RectCutFeature } from '../types';

type Point2 = { x: number; z: number };

const geometryCache = new Map<string, THREE.BufferGeometry>();
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

function getEndOffsets(part: Part) {
  const features = getEnabledFeatures(part).filter((feature) => feature.kind === 'end_cut');
  let leftOffset = 0;
  let rightOffset = 0;

  for (const feature of features) {
    if (feature.cutType === 'square' || feature.cutType === 'bevel') continue;
    const angle = Math.abs(feature.parameters.horizontalAngle || 0);
    const offset = clamp(Math.tan((angle * Math.PI) / 180) * part.width, 0, Math.max(0, part.length - 0.01));
    if (feature.target.face === 'left_end') {
      leftOffset = Math.max(leftOffset, offset);
    } else {
      rightOffset = Math.max(rightOffset, offset);
    }
  }

  return { leftOffset, rightOffset };
}

function buildOuterContour(part: Part): Point2[] {
  const halfLength = part.length / 2;
  const halfWidth = part.width / 2;
  const { leftOffset, rightOffset } = getEndOffsets(part);

  return [
    { x: -halfLength, z: -halfWidth },
    { x: halfLength - rightOffset, z: -halfWidth },
    { x: halfLength, z: halfWidth },
    { x: -halfLength + leftOffset, z: halfWidth }
  ];
}

function getCornerKey(feature: RectCutFeature): 'left_front' | 'right_front' | 'right_back' | 'left_back' {
  const target = feature.target.type === 'corner' ? feature.target.corner : 'front_bottom_left_corner';
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
      return [{ x: lf.x + sizeX, z: lf.z }, { x: lf.x + sizeX, z }, leftIn, rf, rb, lb];
    }
    case 'right_front': {
      const z = clamp(-halfWidth + sizeZ, rf.z, rb.z);
      const rightIn = linePointAtZ(rf, rb, z);
      return [lf, { x: rf.x - sizeX, z: rf.z }, rightIn, { x: rf.x - sizeX, z }, rb, lb];
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

  if (family === 'front') {
    const startX = clamp(minX + feature.placement.x, lf.x + 0.001, rf.x - sizeX - 0.001);
    const endX = clamp(startX + sizeX, startX + 0.001, rf.x - 0.001);
    return [
      lf,
      { x: startX, z: lf.z },
      { x: startX, z: lf.z + sizeZ },
      { x: endX, z: lf.z + sizeZ },
      { x: endX, z: lf.z },
      rf,
      rb,
      lb
    ];
  }

  if (family === 'back') {
    const startX = clamp(minX + feature.placement.x, lb.x + 0.001, rb.x - sizeX - 0.001);
    const endX = clamp(startX + sizeX, startX + 0.001, rb.x - 0.001);
    return [
      lf,
      rf,
      rb,
      { x: endX, z: rb.z },
      { x: endX, z: rb.z - sizeZ },
      { x: startX, z: rb.z - sizeZ },
      { x: startX, z: rb.z },
      lb
    ];
  }

  if (family === 'left') {
    const startZ = clamp(-halfWidth + feature.placement.z, lf.z + 0.001, lb.z - sizeZ - 0.001);
    const endZ = clamp(startZ + sizeZ, startZ + 0.001, lb.z - 0.001);
    const pStart = linePointAtZ(lf, lb, startZ);
    const pEnd = linePointAtZ(lf, lb, endZ);
    return [
      lf,
      rf,
      rb,
      lb,
      { x: pEnd.x, z: endZ },
      { x: pEnd.x + sizeX, z: endZ },
      { x: pStart.x + sizeX, z: startZ },
      { x: pStart.x, z: startZ }
    ];
  }

  const startZ = clamp(-halfWidth + feature.placement.z, rf.z + 0.001, rb.z - sizeZ - 0.001);
  const endZ = clamp(startZ + sizeZ, startZ + 0.001, rb.z - 0.001);
  const pStart = linePointAtZ(rf, rb, startZ);
  const pEnd = linePointAtZ(rf, rb, endZ);
  return [
    lf,
    rf,
    { x: pStart.x, z: startZ },
    { x: pStart.x - sizeX, z: startZ },
    { x: pEnd.x - sizeX, z: endZ },
    { x: pEnd.x, z: endZ },
    rb,
    lb
  ];
}

function getRenderableRectCutHoles(features: RectCutFeature[], part: Part): Point2[][] {
  const holes: Point2[][] = [];
  const halfLength = part.length / 2;
  const halfWidth = part.width / 2;

  for (const feature of features) {
    if (feature.cutType !== 'cutout') continue;
    if (feature.target.type !== 'face') continue;
    if (!['top_face', 'bottom_face'].includes(feature.target.face)) continue;
    if (feature.parameters.depthMode !== 'through') continue;

    const startX = clamp(-halfLength + feature.placement.x, -halfLength + 0.001, halfLength - 0.001);
    const startZ = clamp(-halfWidth + feature.placement.z, -halfWidth + 0.001, halfWidth - 0.001);
    const endX = clamp(startX + feature.parameters.size.length, startX + 0.001, halfLength - 0.001);
    const endZ = clamp(startZ + feature.parameters.size.width, startZ + 0.001, halfWidth - 0.001);
    holes.push([
      { x: startX, z: startZ },
      { x: startX, z: endZ },
      { x: endX, z: endZ },
      { x: endX, z: startZ }
    ]);
  }

  return holes;
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

function createFeatureGeometry(part: Part): THREE.BufferGeometry {
  let contour = buildOuterContour(part);
  const rectCuts = getEnabledFeatures(part).filter((feature): feature is RectCutFeature => feature.kind === 'rect_cut');

  for (const feature of rectCuts) {
    if (feature.parameters.depthMode !== 'through') continue;
    if (feature.cutType === 'corner_notch') {
      contour = applyCornerNotch(contour, feature);
    } else if (feature.cutType === 'edge_notch') {
      contour = applyEdgeNotch(contour, feature);
    }
  }

  const shape = shapeFromContour(contour, getRenderableRectCutHoles(rectCuts, part));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: part.thickness,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 1
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -part.thickness / 2, 0);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function getFeatureContour(part: Part): Point2[] {
  let contour = buildOuterContour(part);
  const rectCuts = getEnabledFeatures(part).filter((feature): feature is RectCutFeature => feature.kind === 'rect_cut');

  for (const feature of rectCuts) {
    if (feature.parameters.depthMode !== 'through') continue;
    if (feature.cutType === 'corner_notch') {
      contour = applyCornerNotch(contour, feature);
    } else if (feature.cutType === 'edge_notch') {
      contour = applyEdgeNotch(contour, feature);
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
  if (cached) return cached;

  const geometry = createFeatureGeometry(part);
  geometryCache.set(key, geometry);
  return geometry;
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

  return {
    min: new THREE.Vector3(minX, -part.thickness / 2, minZ),
    max: new THREE.Vector3(maxX, part.thickness / 2, maxZ)
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

export function clearPartGeometryCache(): void {
  for (const geometry of geometryCache.values()) {
    geometry.dispose();
  }
  geometryCache.clear();
}
