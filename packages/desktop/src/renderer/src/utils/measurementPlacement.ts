export type MeasurementVec3 = [number, number, number];

export interface DimensionPlacement {
  start: MeasurementVec3;
  end: MeasurementVec3;
  offsetDir: MeasurementVec3;
  offset: number;
}

interface PartDimensionInputs {
  length: number;
  width: number;
  thickness: number;
  cameraLocal: MeasurementVec3;
}

interface BoundingDimensionInputs {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  cameraWorld: MeasurementVec3;
}

interface ReferenceLabelInputs {
  start: MeasurementVec3;
  end: MeasurementVec3;
  axis: 'x' | 'y' | 'z';
  cameraUp: MeasurementVec3;
  cameraRight: MeasurementVec3;
  offsetDistance?: number;
}

function dot(a: MeasurementVec3, b: MeasurementVec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function lengthOf(v: MeasurementVec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

function normalize(v: MeasurementVec3): MeasurementVec3 {
  const len = lengthOf(v);
  if (len < 1e-6) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function scale(v: MeasurementVec3, amount: number): MeasurementVec3 {
  return [v[0] * amount, v[1] * amount, v[2] * amount];
}

function add(a: MeasurementVec3, b: MeasurementVec3): MeasurementVec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function sub(a: MeasurementVec3, b: MeasurementVec3): MeasurementVec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function projectOntoPlane(vector: MeasurementVec3, planeNormal: MeasurementVec3): MeasurementVec3 {
  const normal = normalize(planeNormal);
  return sub(vector, scale(normal, dot(vector, normal)));
}

function signWithDeadzone(value: number, fallback: 1 | -1 = 1): 1 | -1 {
  if (value > 0.05) return 1;
  if (value < -0.05) return -1;
  return fallback;
}

export function getCameraFacingSigns(cameraLocal: MeasurementVec3): { x: 1 | -1; y: 1 | -1; z: 1 | -1 } {
  return {
    x: signWithDeadzone(cameraLocal[0], 1),
    y: signWithDeadzone(cameraLocal[1], 1),
    z: signWithDeadzone(cameraLocal[2], 1)
  };
}

export function getPartDimensionPlacements({ length, width, thickness, cameraLocal }: PartDimensionInputs): {
  length: DimensionPlacement;
  width: DimensionPlacement;
  thickness: DimensionPlacement;
} {
  const halfLength = length / 2;
  const halfWidth = width / 2;
  const halfThickness = thickness / 2;
  const visible = getCameraFacingSigns(cameraLocal);

  return {
    length: {
      start: [-halfLength, visible.y * halfThickness, visible.z * halfWidth],
      end: [halfLength, visible.y * halfThickness, visible.z * halfWidth],
      offsetDir: normalize([0, visible.y * 0.35, visible.z]),
      offset: Math.max(1.1, Math.min(2.2, Math.max(width, thickness) * 0.45 + 0.6))
    },
    width: {
      start: [visible.x * halfLength, visible.y * halfThickness, -halfWidth],
      end: [visible.x * halfLength, visible.y * halfThickness, halfWidth],
      offsetDir: normalize([visible.x, visible.y * 0.35, 0]),
      offset: Math.max(1.1, Math.min(2.2, Math.max(length, thickness) * 0.18 + 0.75))
    },
    thickness: {
      start: [visible.x * halfLength, -halfThickness, visible.z * halfWidth],
      end: [visible.x * halfLength, halfThickness, visible.z * halfWidth],
      offsetDir: normalize([visible.x, 0, visible.z]),
      offset: Math.max(1.2, Math.min(2.4, Math.max(length, width) * 0.1 + 0.9))
    }
  };
}

export function getBoundingBoxDimensionPlacements({
  minX,
  maxX,
  minY,
  maxY,
  minZ,
  maxZ,
  cameraWorld
}: BoundingDimensionInputs): { x: DimensionPlacement; y: DimensionPlacement; z: DimensionPlacement } {
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const sizeX = maxX - minX;
  const sizeY = maxY - minY;
  const sizeZ = maxZ - minZ;
  const visible = getCameraFacingSigns([cameraWorld[0] - centerX, cameraWorld[1] - centerY, cameraWorld[2] - centerZ]);

  return {
    x: {
      start: [minX, visible.y > 0 ? maxY : minY, visible.z > 0 ? maxZ : minZ],
      end: [maxX, visible.y > 0 ? maxY : minY, visible.z > 0 ? maxZ : minZ],
      offsetDir: normalize([0, visible.y * 0.32, visible.z]),
      offset: Math.max(2.2, Math.min(4.25, Math.max(sizeY, sizeZ) * 0.2 + 1.6))
    },
    z: {
      start: [visible.x > 0 ? maxX : minX, visible.y > 0 ? maxY : minY, minZ],
      end: [visible.x > 0 ? maxX : minX, visible.y > 0 ? maxY : minY, maxZ],
      offsetDir: normalize([visible.x, visible.y * 0.32, 0]),
      offset: Math.max(2.2, Math.min(4.25, Math.max(sizeX, sizeY) * 0.18 + 1.8))
    },
    y: {
      start: [visible.x > 0 ? maxX : minX, minY, visible.z > 0 ? maxZ : minZ],
      end: [visible.x > 0 ? maxX : minX, maxY, visible.z > 0 ? maxZ : minZ],
      offsetDir: normalize([visible.x, 0, visible.z]),
      offset: Math.max(2.4, Math.min(4.5, Math.max(sizeX, sizeZ) * 0.14 + 2))
    }
  };
}

function fallbackLabelOffset(axis: 'x' | 'y' | 'z'): MeasurementVec3 {
  switch (axis) {
    case 'x':
      return [0, 1, 0];
    case 'y':
      return [1, 0, 0];
    case 'z':
    default:
      return [0, 1, 0];
  }
}

export function getReferenceLabelPosition({
  start,
  end,
  axis,
  cameraUp,
  cameraRight,
  offsetDistance = 0.85
}: ReferenceLabelInputs): MeasurementVec3 {
  const mid = scale(add(start, end), 0.5);
  const lineDir = normalize(sub(end, start));
  const projectedUp = projectOntoPlane(normalize(cameraUp), lineDir);
  const projectedRight = projectOntoPlane(normalize(cameraRight), lineDir);
  const fallback = projectOntoPlane(fallbackLabelOffset(axis), lineDir);
  const preferredOffset =
    lengthOf(projectedUp) > 0.2
      ? projectedUp
      : lengthOf(projectedRight) > 0.2
        ? projectedRight
        : lengthOf(fallback) > 0.2
          ? fallback
          : fallbackLabelOffset(axis);
  const labelOffset = scale(normalize(preferredOffset), offsetDistance);

  return add(mid, labelOffset);
}
