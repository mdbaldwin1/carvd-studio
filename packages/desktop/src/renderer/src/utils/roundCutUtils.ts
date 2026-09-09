import type { CircularCutFeature, FaceTarget, Part, RoundedCutFeature } from '../types';
import { fitsRemainingStock } from './remainingStock';

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

const dot = (a: Point3, b: Point3): number => a.x * b.x + a.y * b.y + a.z * b.z;

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

export function getFaceFrame(part: Pick<Part, 'length' | 'width' | 'thickness'>, face: FaceTarget): FaceFrame {
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
        origin: { x: 0, y: 0, z: halfWidth },
        primaryAxis: { x: 1, y: 0, z: 0 },
        secondaryAxis: { x: 0, y: 1, z: 0 },
        inwardNormal: { x: 0, y: 0, z: -1 },
        primarySize: part.length,
        secondarySize: part.thickness
      };
    case 'back_face':
      return {
        origin: { x: 0, y: 0, z: -halfWidth },
        primaryAxis: { x: -1, y: 0, z: 0 },
        secondaryAxis: { x: 0, y: 1, z: 0 },
        inwardNormal: { x: 0, y: 0, z: 1 },
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
  if (!Number.isFinite(feature.parameters.diameter) || feature.parameters.diameter <= 0)
    return 'Hole diameter must be greater than zero.';
  if (!Number.isFinite(feature.parameters.tilt) || feature.parameters.tilt < 0 || feature.parameters.tilt >= 90)
    return 'Hole tilt must be at least 0° and less than 90°.';
  if (!Number.isFinite(feature.parameters.direction)) return 'Hole tilt direction must be a finite angle.';
  if (
    !Number.isFinite(feature.placement.primary) ||
    !Number.isFinite(feature.placement.secondary) ||
    !Number.isFinite(feature.placement.rotation)
  )
    return 'Hole placement and rotation must be finite values.';

  const pattern = feature.pattern;
  if (pattern?.type === 'linear') {
    if (!Number.isInteger(pattern.count) || pattern.count < 1 || pattern.count > 128)
      return 'Linear pattern count must be between 1 and 128.';
    if (!Number.isFinite(pattern.spacing) || pattern.spacing <= 0)
      return 'Linear pattern spacing must be greater than zero.';
    if (!Number.isFinite(pattern.direction)) return 'Linear pattern direction must be a finite angle.';
  }
  if (pattern?.type === 'grid') {
    if (
      !Number.isInteger(pattern.rows) ||
      !Number.isInteger(pattern.columns) ||
      pattern.rows < 1 ||
      pattern.columns < 1
    )
      return 'Grid pattern rows and columns must be whole numbers greater than zero.';
    if (pattern.rows * pattern.columns > 128) return 'Grid pattern count must be between 1 and 128.';
    if (
      !Number.isFinite(pattern.rowSpacing) ||
      !Number.isFinite(pattern.columnSpacing) ||
      pattern.rowSpacing <= 0 ||
      pattern.columnSpacing <= 0
    )
      return 'Grid pattern spacing must be greater than zero.';
    if (!Number.isFinite(pattern.rotation)) return 'Grid pattern rotation must be a finite angle.';
  }
  if (pattern?.type === 'circular') {
    if (!Number.isInteger(pattern.count) || pattern.count < 1 || pattern.count > 128)
      return 'Circular pattern count must be between 1 and 128.';
    if (!Number.isFinite(pattern.radius) || pattern.radius <= 0)
      return 'Circular pattern radius must be greater than zero.';
    if (!Number.isFinite(pattern.startAngle)) return 'Circular pattern start angle must be a finite angle.';
  }

  if (feature.parameters.depthMode === 'blind') {
    const depth = feature.parameters.depth;
    if (!Number.isFinite(depth) || depth === undefined || depth <= 0)
      return 'Blind-hole depth must be greater than zero.';
  }
  if (
    feature.cutType === 'countersink' &&
    (!feature.parameters.countersink ||
      !Number.isFinite(feature.parameters.countersink.majorDiameter) ||
      !Number.isFinite(feature.parameters.countersink.includedAngle) ||
      feature.parameters.countersink.majorDiameter <= feature.parameters.diameter ||
      feature.parameters.countersink.includedAngle <= 0 ||
      feature.parameters.countersink.includedAngle >= 180)
  )
    return 'Countersink diameter must exceed the hole diameter and its angle must be between 0° and 180°.';
  if (
    feature.cutType === 'counterbore' &&
    (!feature.parameters.counterbore ||
      !Number.isFinite(feature.parameters.counterbore.diameter) ||
      !Number.isFinite(feature.parameters.counterbore.depth) ||
      feature.parameters.counterbore.diameter <= feature.parameters.diameter ||
      feature.parameters.counterbore.depth <= 0)
  )
    return 'Counterbore diameter must exceed the hole diameter and its recess depth must be greater than zero.';
  const frame = getFaceFrame(part, feature.target.face);
  const recessDepth =
    feature.cutType === 'countersink'
      ? (feature.parameters.countersink!.majorDiameter - feature.parameters.diameter) /
        (2 * Math.tan(degrees(feature.parameters.countersink!.includedAngle) / 2))
      : feature.cutType === 'counterbore'
        ? feature.parameters.counterbore!.depth
        : 0;
  if (!Number.isFinite(recessDepth)) return 'Recess depth must be finite.';
  if (feature.parameters.depthMode === 'blind' && recessDepth > Number(feature.parameters.depth) + 1e-9)
    return 'Recess depth cannot exceed the blind-hole depth.';
  const profileDiameter =
    feature.cutType === 'countersink'
      ? feature.parameters.countersink!.majorDiameter
      : feature.cutType === 'counterbore'
        ? feature.parameters.counterbore!.diameter
        : feature.parameters.diameter;
  const radius = profileDiameter / 2;
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
    // Intersect the cylinder/cone with the entry plane. A tilted cone's
    // ellipse is offset from the authored axis point, unlike a cylinder's.
    const tilt = degrees(feature.parameters.tilt);
    const sine = Math.sin(tilt);
    const cosine = Math.cos(tilt);
    const taper =
      feature.cutType === 'countersink' ? Math.tan(degrees(feature.parameters.countersink!.includedAngle) / 2) : 0;
    const ellipseDenominator = cosine * cosine - taper * taper * sine * sine;
    if (ellipseDenominator <= 1e-12)
      return 'Countersink tilt and angle must form a bounded entry on the selected face.';
    const centerShift = (-radius * taper * sine) / ellipseDenominator;
    const alongRadius = (radius * cosine) / ellipseDenominator;
    const acrossRadius = (radius * cosine) / Math.sqrt(ellipseDenominator);
    const direction = degrees(feature.parameters.direction);
    const primaryRadius = Math.hypot(alongRadius * Math.cos(direction), acrossRadius * Math.sin(direction));
    const secondaryRadius = Math.hypot(alongRadius * Math.sin(direction), acrossRadius * Math.cos(direction));
    // At steep tilts the asymmetric cone can expose less of its forward rim
    // than the through pilot. Validate the union, not just the larger diameter.
    const pilotRadius = feature.parameters.diameter / 2;
    const pilotPrimaryRadius = pilotRadius * Math.hypot(Math.cos(direction) / cosine, Math.sin(direction));
    const pilotSecondaryRadius = pilotRadius * Math.hypot(Math.sin(direction) / cosine, Math.cos(direction));
    if (
      Math.abs(primary + centerShift * Math.cos(direction)) + primaryRadius > frame.primarySize / 2 + 1e-9 ||
      Math.abs(secondary + centerShift * Math.sin(direction)) + secondaryRadius > frame.secondarySize / 2 + 1e-9 ||
      Math.abs(primary) + pilotPrimaryRadius > frame.primarySize / 2 + 1e-9 ||
      Math.abs(secondary) + pilotSecondaryRadius > frame.secondarySize / 2 + 1e-9
    )
      return 'Hole profile extends beyond the selected face.';
    const along = {
      x: frame.primaryAxis.x * Math.cos(direction) + frame.secondaryAxis.x * Math.sin(direction),
      y: frame.primaryAxis.y * Math.cos(direction) + frame.secondaryAxis.y * Math.sin(direction),
      z: frame.primaryAxis.z * Math.cos(direction) + frame.secondaryAxis.z * Math.sin(direction)
    };
    const across = {
      x: -frame.primaryAxis.x * Math.sin(direction) + frame.secondaryAxis.x * Math.cos(direction),
      y: -frame.primaryAxis.y * Math.sin(direction) + frame.secondaryAxis.y * Math.cos(direction),
      z: -frame.primaryAxis.z * Math.sin(direction) + frame.secondaryAxis.z * Math.cos(direction)
    };
    const entryCenter = {
      x: member.entryPoint.x + along.x * centerShift,
      y: member.entryPoint.y + along.y * centerShift,
      z: member.entryPoint.z + along.z * centerShift
    };
    const recessEntrySupport = (normal: Point3) =>
      dot(normal, entryCenter) + Math.hypot(dot(normal, along) * alongRadius, dot(normal, across) * acrossRadius);
    const pilotEntrySupport = (normal: Point3) =>
      dot(normal, member.entryPoint) +
      Math.hypot((dot(normal, along) * pilotRadius) / cosine, dot(normal, across) * pilotRadius);
    if (
      !fitsRemainingStock(part, entryCenter, (normal) =>
        Math.hypot(dot(normal, along) * alongRadius, dot(normal, across) * acrossRadius)
      ) ||
      !fitsRemainingStock(part, member.entryPoint, (normal) =>
        Math.hypot((dot(normal, along) * pilotRadius) / cosine, dot(normal, across) * pilotRadius)
      )
    )
      return 'Hole entry extends outside the remaining material after an end cut, bevel, or tenon. Move the hole away from the removed material.';
    const available = distanceToExit(member.entryPoint, member.axis, part);
    if (recessDepth > 0 && recessDepth >= available - 1e-9) return 'Recess depth exceeds the available material.';
    if (feature.parameters.depthMode === 'blind' && Number(feature.parameters.depth) >= available - 1e-9)
      return 'Blind-hole depth exceeds the available material.';
    const ends = [
      ...(feature.parameters.depthMode === 'blind'
        ? [
            {
              depth: Number(feature.parameters.depth),
              radius: feature.parameters.diameter / 2,
              entrySupport: pilotEntrySupport
            }
          ]
        : []),
      ...(recessDepth > 0
        ? [
            {
              depth: recessDepth,
              radius: feature.cutType === 'counterbore' ? radius : feature.parameters.diameter / 2,
              entrySupport: recessEntrySupport
            }
          ]
        : [])
    ];
    for (const end of ends) {
      const center = {
        x: member.entryPoint.x + member.axis.x * end.depth,
        y: member.entryPoint.y + member.axis.y * end.depth,
        z: member.entryPoint.z + member.axis.z * end.depth
      };
      if (
        !fitsRemainingStock(
          part,
          { x: 0, y: 0, z: 0 },
          // The clipped finite cutter is the convex hull of its entry ellipse
          // and end disk. Its support is the maximum of those two supports.
          (normal) =>
            Math.max(
              end.entrySupport(normal),
              dot(normal, center) +
                end.radius * Math.sqrt(Math.max(0, dot(normal, normal) - dot(normal, member.axis) ** 2))
            )
        )
      )
        return 'Blind-hole or recess depth extends outside the remaining material. Reduce the depth or move the hole away from the cut.';
      for (const [coordinate, axis, inward, halfSize] of [
        [member.entryPoint.x, member.axis.x, frame.inwardNormal.x, part.length / 2],
        [member.entryPoint.y, member.axis.y, frame.inwardNormal.y, part.thickness / 2],
        [member.entryPoint.z, member.axis.z, frame.inwardNormal.z, part.width / 2]
      ]) {
        const center = coordinate + axis * end.depth;
        const radialExtent = end.radius * Math.sqrt(Math.max(0, 1 - axis * axis));
        // The selected entry plane deliberately clips the cutter; all other
        // stock faces must contain its complete end disk.
        if (
          (inward <= 0 && center - radialExtent < -halfSize - 1e-9) ||
          (inward >= 0 && center + radialExtent > halfSize + 1e-9)
        )
          return 'Blind-hole or recess depth exceeds the available material.';
      }
    }
  }
  return null;
}

export function validateRoundedCut(feature: RoundedCutFeature, part: Part): string | null {
  if (feature.target.face !== 'top_face' && feature.target.face !== 'bottom_face')
    return 'Rounded openings currently support only the top and bottom faces.';
  if (
    !Number.isFinite(feature.parameters.length) ||
    !Number.isFinite(feature.parameters.width) ||
    feature.parameters.length <= 0 ||
    feature.parameters.width <= 0
  )
    return 'Rounded-cut length and width must be greater than zero.';
  if (feature.cutType === 'rounded_slot' && feature.parameters.length < feature.parameters.width)
    return 'Slot length must be at least its width.';
  if (
    !Number.isFinite(feature.parameters.cornerRadius) ||
    feature.parameters.cornerRadius <= 0 ||
    feature.parameters.cornerRadius > Math.min(feature.parameters.length, feature.parameters.width) / 2
  )
    return 'Corner radius must fit within half the opening width and length.';
  if (
    !Number.isFinite(feature.placement.primary) ||
    !Number.isFinite(feature.placement.secondary) ||
    !Number.isFinite(feature.placement.rotation)
  )
    return 'Rounded-cut placement and rotation must be finite values.';
  const frame = getFaceFrame(part, feature.target.face);
  const primary = referencedOffset(feature.placement.primary, frame.primarySize, feature.reference.primaryFrom);
  const secondary = referencedOffset(feature.placement.secondary, frame.secondarySize, feature.reference.secondaryFrom);
  const angle = degrees(feature.placement.rotation);
  const halfLength = feature.parameters.length / 2;
  const halfWidth = feature.parameters.width / 2;
  // Rounded rectangles are a smaller rectangle swept by a radius disk. A
  // slot uses fully round end caps regardless of its stored corner radius.
  const radius = feature.cutType === 'rounded_slot' ? halfWidth : feature.parameters.cornerRadius;
  const primaryExtent =
    Math.abs(Math.cos(angle)) * (halfLength - radius) + Math.abs(Math.sin(angle)) * (halfWidth - radius) + radius;
  const secondaryExtent =
    Math.abs(Math.sin(angle)) * (halfLength - radius) + Math.abs(Math.cos(angle)) * (halfWidth - radius) + radius;
  if (
    Math.abs(primary) + primaryExtent > frame.primarySize / 2 + 1e-9 ||
    Math.abs(secondary) + secondaryExtent > frame.secondarySize / 2 + 1e-9
  ) {
    return 'Rounded cut extends beyond the selected face.';
  }
  if (feature.parameters.depthMode === 'blind') {
    const depth = feature.parameters.depth;
    const available = distanceToExit(frame.origin, frame.inwardNormal, part);
    if (!Number.isFinite(depth) || depth === undefined || depth <= 0)
      return 'Rounded-cut depth must be greater than zero.';
    if (depth >= available - 1e-9) return 'Rounded-cut depth exceeds the available material.';
    const center = addScaled(frame.origin, frame.primaryAxis, primary, frame.secondaryAxis, secondary);
    center.y += (frame.inwardNormal.y * depth) / 2;
    const along = { x: Math.cos(angle), y: 0, z: frame.secondaryAxis.z * Math.sin(angle) };
    const across = { x: -Math.sin(angle), y: 0, z: frame.secondaryAxis.z * Math.cos(angle) };
    if (
      !fitsRemainingStock(
        part,
        center,
        (normal) =>
          Math.abs(dot(normal, along)) * (halfLength - radius) +
          Math.abs(dot(normal, across)) * (halfWidth - radius) +
          radius * Math.hypot(dot(normal, along), dot(normal, across)) +
          (Math.abs(normal.y) * depth) / 2
      )
    )
      return 'Rounded pocket extends outside the remaining material. Move or resize it, or reduce its depth.';
  }
  return null;
}
