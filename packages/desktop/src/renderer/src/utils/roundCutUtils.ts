import type { CircularCutFeature, FaceTarget, Part, RoundedCutFeature } from '../types';

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

export interface FaceFrame {
  origin: Point3;
  primaryAxis: Point3;
  secondaryAxis: Point3;
  inwardNormal: Point3;
  primarySize: number;
  secondarySize: number;
}

export interface ExpandedCircularCut {
  memberIndex: number;
  entryPoint: Point3;
  axis: Point3;
}

const degrees = (value: number): number => (value * Math.PI) / 180;
const clean = (value: number): number => (Math.abs(value) < 1e-12 ? 0 : Number(value.toFixed(12)));

function addScaled(
  origin: Point3,
  primary: Point3,
  primaryValue: number,
  secondary: Point3,
  secondaryValue: number
): Point3 {
  return {
    x: clean(origin.x + primary.x * primaryValue + secondary.x * secondaryValue),
    y: clean(origin.y + primary.y * primaryValue + secondary.y * secondaryValue),
    z: clean(origin.z + primary.z * primaryValue + secondary.z * secondaryValue)
  };
}

export function getFaceFrame(part: Part, face: FaceTarget): FaceFrame {
  const halfLength = part.length / 2;
  const halfThickness = part.thickness / 2;
  const halfWidth = part.width / 2;
  switch (face) {
    case 'top_face':
      return {
        origin: { x: 0, y: halfThickness, z: 0 },
        primaryAxis: { x: 1, y: 0, z: 0 },
        secondaryAxis: { x: 0, y: 0, z: 1 },
        inwardNormal: { x: 0, y: -1, z: 0 },
        primarySize: part.length,
        secondarySize: part.width
      };
    case 'bottom_face':
      return {
        origin: { x: 0, y: -halfThickness, z: 0 },
        primaryAxis: { x: 1, y: 0, z: 0 },
        secondaryAxis: { x: 0, y: 0, z: -1 },
        inwardNormal: { x: 0, y: 1, z: 0 },
        primarySize: part.length,
        secondarySize: part.width
      };
    case 'front_face':
      return {
        origin: { x: 0, y: 0, z: -halfWidth },
        primaryAxis: { x: 1, y: 0, z: 0 },
        secondaryAxis: { x: 0, y: 1, z: 0 },
        inwardNormal: { x: 0, y: 0, z: 1 },
        primarySize: part.length,
        secondarySize: part.thickness
      };
    case 'back_face':
      return {
        origin: { x: 0, y: 0, z: halfWidth },
        primaryAxis: { x: -1, y: 0, z: 0 },
        secondaryAxis: { x: 0, y: 1, z: 0 },
        inwardNormal: { x: 0, y: 0, z: -1 },
        primarySize: part.length,
        secondarySize: part.thickness
      };
    case 'left_end':
      return {
        origin: { x: -halfLength, y: 0, z: 0 },
        primaryAxis: { x: 0, y: 0, z: 1 },
        secondaryAxis: { x: 0, y: 1, z: 0 },
        inwardNormal: { x: 1, y: 0, z: 0 },
        primarySize: part.width,
        secondarySize: part.thickness
      };
    case 'right_end':
      return {
        origin: { x: halfLength, y: 0, z: 0 },
        primaryAxis: { x: 0, y: 0, z: -1 },
        secondaryAxis: { x: 0, y: 1, z: 0 },
        inwardNormal: { x: -1, y: 0, z: 0 },
        primarySize: part.width,
        secondarySize: part.thickness
      };
  }
}

function referencedOffset(value: number, size: number, from: 'min' | 'center' | 'max' | undefined): number {
  if (from === 'min') return -size / 2 + value;
  if (from === 'max') return size / 2 - value;
  return value;
}

function axisFor(feature: CircularCutFeature, frame: FaceFrame): Point3 {
  const tilt = degrees(feature.parameters.tilt);
  const direction = degrees(feature.parameters.direction);
  const normalWeight = Math.cos(tilt);
  const planeWeight = Math.sin(tilt);
  return {
    x: clean(
      frame.inwardNormal.x * normalWeight +
        frame.primaryAxis.x * planeWeight * Math.cos(direction) +
        frame.secondaryAxis.x * planeWeight * Math.sin(direction)
    ),
    y: clean(
      frame.inwardNormal.y * normalWeight +
        frame.primaryAxis.y * planeWeight * Math.cos(direction) +
        frame.secondaryAxis.y * planeWeight * Math.sin(direction)
    ),
    z: clean(
      frame.inwardNormal.z * normalWeight +
        frame.primaryAxis.z * planeWeight * Math.cos(direction) +
        frame.secondaryAxis.z * planeWeight * Math.sin(direction)
    )
  };
}

export function expandCircularCut(feature: CircularCutFeature, part: Part): ExpandedCircularCut[] {
  const frame = getFaceFrame(part, feature.target.face);
  const basePrimary = referencedOffset(feature.placement.primary, frame.primarySize, feature.reference.primaryFrom);
  const baseSecondary = referencedOffset(
    feature.placement.secondary,
    frame.secondarySize,
    feature.reference.secondaryFrom
  );
  const offsets: Array<[number, number]> = [];
  const pattern = feature.pattern;
  if (!pattern) offsets.push([0, 0]);
  else if (pattern.type === 'linear') {
    const angle = degrees(pattern.direction);
    for (let index = 0; index < pattern.count; index += 1)
      offsets.push([Math.cos(angle) * pattern.spacing * index, Math.sin(angle) * pattern.spacing * index]);
  } else if (pattern.type === 'grid') {
    const angle = degrees(pattern.rotation);
    for (let row = 0; row < pattern.rows; row += 1) {
      for (let column = 0; column < pattern.columns; column += 1) {
        const x = column * pattern.columnSpacing;
        const y = row * pattern.rowSpacing;
        offsets.push([x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle)]);
      }
    }
  } else {
    for (let index = 0; index < pattern.count; index += 1) {
      const angle = degrees(pattern.startAngle + (360 * index) / pattern.count);
      offsets.push([clean(Math.cos(angle) * pattern.radius), clean(Math.sin(angle) * pattern.radius)]);
    }
  }
  const axis = axisFor(feature, frame);
  return offsets.map(([primary, secondary], memberIndex) => ({
    memberIndex,
    entryPoint: addScaled(
      frame.origin,
      frame.primaryAxis,
      basePrimary + primary,
      frame.secondaryAxis,
      baseSecondary + secondary
    ),
    axis
  }));
}

function distanceToExit(point: Point3, axis: Point3, part: Part): number {
  const limits: Array<[number, number, number]> = [
    [point.x, axis.x, part.length / 2],
    [point.y, axis.y, part.thickness / 2],
    [point.z, axis.z, part.width / 2]
  ];
  let exit = Number.POSITIVE_INFINITY;
  for (const [coordinate, direction, halfSize] of limits) {
    if (Math.abs(direction) < 1e-12) continue;
    const boundary = direction > 0 ? halfSize : -halfSize;
    const distance = (boundary - coordinate) / direction;
    if (distance > 1e-9) exit = Math.min(exit, distance);
  }
  return exit;
}

export function validateCircularCut(feature: CircularCutFeature, part: Part): string | null {
  const frame = getFaceFrame(part, feature.target.face);
  const radius = feature.parameters.diameter / 2;
  const expanded = expandCircularCut(feature, part);
  for (const member of expanded) {
    const delta = {
      x: member.entryPoint.x - frame.origin.x,
      y: member.entryPoint.y - frame.origin.y,
      z: member.entryPoint.z - frame.origin.z
    };
    const primary = delta.x * frame.primaryAxis.x + delta.y * frame.primaryAxis.y + delta.z * frame.primaryAxis.z;
    const secondary =
      delta.x * frame.secondaryAxis.x + delta.y * frame.secondaryAxis.y + delta.z * frame.secondaryAxis.z;
    if (Math.abs(primary) + radius > frame.primarySize / 2 || Math.abs(secondary) + radius > frame.secondarySize / 2)
      return 'Hole profile extends beyond the selected face.';
    const available = distanceToExit(member.entryPoint, member.axis, part);
    if (feature.parameters.depthMode === 'blind' && Number(feature.parameters.depth) >= available - 1e-9)
      return 'Blind-hole depth exceeds the available material.';
  }
  return null;
}

export function validateRoundedCut(feature: RoundedCutFeature, part: Part): string | null {
  const frame = getFaceFrame(part, feature.target.face);
  const primary = referencedOffset(feature.placement.primary, frame.primarySize, feature.reference.primaryFrom);
  const secondary = referencedOffset(feature.placement.secondary, frame.secondarySize, feature.reference.secondaryFrom);
  const angle = degrees(feature.placement.rotation);
  const halfLength = feature.parameters.length / 2;
  const halfWidth = feature.parameters.width / 2;
  const primaryExtent = Math.abs(Math.cos(angle)) * halfLength + Math.abs(Math.sin(angle)) * halfWidth;
  const secondaryExtent = Math.abs(Math.sin(angle)) * halfLength + Math.abs(Math.cos(angle)) * halfWidth;
  if (
    Math.abs(primary) + primaryExtent > frame.primarySize / 2 ||
    Math.abs(secondary) + secondaryExtent > frame.secondarySize / 2
  ) {
    return 'Rounded cut extends beyond the selected face.';
  }
  if (
    feature.parameters.depthMode === 'blind' &&
    Number(feature.parameters.depth) >= distanceToExit(frame.origin, frame.inwardNormal, part) - 1e-9
  ) {
    return 'Rounded-cut depth exceeds the available material.';
  }
  return null;
}
