import type { RouterProfilePoint, RouterProfileSegment } from '../types';

export interface RouterProfileContour {
  start: RouterProfilePoint;
  segments: RouterProfileSegment[];
  closed: boolean;
}

export type DxfProfileUnits = 'inches' | 'feet' | 'millimeters' | 'centimeters' | 'meters' | 'unknown';

export interface DxfProfileLimits {
  maxFileBytes: number;
  maxPairs: number;
  maxEntities: number;
  maxCoordinates: number;
  maxBlocks: number;
  maxSegments: number;
  maxAbsCoordinate: number;
}

export interface DxfProfileParseOptions {
  limits?: Partial<DxfProfileLimits>;
  connectTolerance?: number;
  repairTolerance?: number;
  /** Maximum target deviation used when approximating non-Bezier SPLINE entities. */
  splineTolerance?: number;
}

export interface DxfProfileParseResult {
  units: DxfProfileUnits;
  unitScaleToInches: number | null;
  contours: RouterProfileContour[];
  unsupportedEntities: string[];
  warnings: string[];
}

export interface RouterProfileContourValidation {
  valid: boolean;
  closed: boolean;
  selfIntersects: boolean;
  errors: string[];
}

const DEFAULT_LIMITS: DxfProfileLimits = {
  maxFileBytes: 2 * 1024 * 1024,
  maxPairs: 200_000,
  maxEntities: 20_000,
  maxCoordinates: 100_000,
  maxBlocks: 1_000,
  maxSegments: 20_000,
  maxAbsCoordinate: 1_000_000
};

interface Pair {
  code: number;
  value: string;
}

interface RawEntity {
  type: string;
  pairs: Pair[];
}

const clonePoint = (point: RouterProfilePoint): RouterProfilePoint => ({ ...point });
const distance = (a: RouterProfilePoint, b: RouterProfilePoint): number => Math.hypot(a.u - b.u, a.v - b.v);
const finitePoint = (point: RouterProfilePoint): boolean => Number.isFinite(point.u) && Number.isFinite(point.v);

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length) {
      const low = value.charCodeAt(index + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        bytes += 4;
        index += 1;
      } else bytes += 3;
    } else bytes += 3;
  }
  return bytes;
}

export class DxfProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DxfProfileError';
  }
}

function readNumber(entity: RawEntity, code: number, occurrence = 0): number | undefined {
  const pair = entity.pairs.filter((candidate) => candidate.code === code)[occurrence];
  if (!pair) return undefined;
  const value = Number(pair.value);
  return Number.isFinite(value) ? value : undefined;
}

function pointsEqual(a: RouterProfilePoint, b: RouterProfilePoint, tolerance: number): boolean {
  return distance(a, b) <= tolerance;
}

function contourEnd(contour: RouterProfileContour): RouterProfilePoint {
  return contour.segments.length ? contour.segments[contour.segments.length - 1].to : contour.start;
}

function segmentArc(
  points: RouterProfilePoint[],
  center: RouterProfilePoint,
  radius: number,
  startAngle: number,
  sweep: number
): void {
  const count = Math.max(1, Math.ceil(Math.abs(sweep) / Math.PI));
  for (let index = 1; index <= count; index += 1) {
    const angle = startAngle + (sweep * index) / count;
    points.push({ u: center.u + radius * Math.cos(angle), v: center.v + radius * Math.sin(angle) });
  }
}

function arcContour(
  center: RouterProfilePoint,
  radius: number,
  startDegrees: number,
  endDegrees: number
): RouterProfileContour {
  const startAngle = (startDegrees * Math.PI) / 180;
  let sweep = ((endDegrees - startDegrees) * Math.PI) / 180;
  while (sweep <= 0) sweep += Math.PI * 2;
  const points = [{ u: center.u + radius * Math.cos(startAngle), v: center.v + radius * Math.sin(startAngle) }];
  if (Math.abs(sweep - Math.PI * 2) < 1e-9) {
    for (let quarter = 1; quarter <= 4; quarter += 1) {
      const angle = startAngle + (sweep * quarter) / 4;
      points.push({ u: center.u + radius * Math.cos(angle), v: center.v + radius * Math.sin(angle) });
    }
  } else {
    segmentArc(points, center, radius, startAngle, sweep);
  }
  return {
    start: points[0],
    segments: points.slice(1).map((to) => ({ kind: 'arc' as const, to, radius, clockwise: false })),
    closed: Math.abs(sweep - Math.PI * 2) < 1e-9
  };
}

function bulgeSegments(from: RouterProfilePoint, to: RouterProfilePoint, bulge: number): RouterProfileSegment[] {
  if (Math.abs(bulge) < 1e-12) return [{ kind: 'line', to: clonePoint(to) }];
  const chord = distance(from, to);
  if (!(chord > 0)) return [];
  const sweep = 4 * Math.atan(bulge);
  const radius = chord / (2 * Math.sin(Math.abs(sweep) / 2));
  const midpoint = { u: (from.u + to.u) / 2, v: (from.v + to.v) / 2 };
  const left = { u: -(to.v - from.v) / chord, v: (to.u - from.u) / chord };
  const centerDistance = chord / (2 * Math.tan(sweep / 2));
  const center = { u: midpoint.u + left.u * centerDistance, v: midpoint.v + left.v * centerDistance };
  const startAngle = Math.atan2(from.v - center.v, from.u - center.u);
  const points = [from];
  segmentArc(points, center, radius, startAngle, sweep);
  return points.slice(1).map((point) => ({ kind: 'arc', to: point, radius, clockwise: sweep < 0 }));
}

function polylineContour(
  points: Array<RouterProfilePoint & { bulge?: number }>,
  closed: boolean
): RouterProfileContour | null {
  if (points.length < 2) return null;
  const segments: RouterProfileSegment[] = [];
  const edgeCount = closed ? points.length : points.length - 1;
  for (let index = 0; index < edgeCount; index += 1) {
    const from = points[index];
    const to = points[(index + 1) % points.length];
    segments.push(...bulgeSegments(from, to, from.bulge ?? 0));
  }
  return { start: clonePoint(points[0]), segments, closed };
}

function splineContour(entity: RawEntity, tolerance: number): { contour?: RouterProfileContour; warning?: string } {
  const degree = readNumber(entity, 71);
  const flags = readNumber(entity, 70) ?? 0;
  if (!Number.isInteger(degree) || degree! < 1 || degree! > 8)
    return { warning: 'Ignored malformed SPLINE: degree must be an integer from 1 through 8' };
  if ((flags & 2) !== 0 || (flags & 1) !== 0)
    return {
      warning: 'Ignored unsupported periodic or closed SPLINE; convert it to an open planar spline before import'
    };
  const xs = entity.pairs.filter((pair) => pair.code === 10).map((pair) => Number(pair.value));
  const ys = entity.pairs.filter((pair) => pair.code === 20).map((pair) => Number(pair.value));
  const zs = entity.pairs.filter((pair) => pair.code === 30).map((pair) => Number(pair.value));
  if (
    xs.length !== ys.length ||
    xs.length < degree! + 1 ||
    [...xs, ...ys, ...zs].some((value) => !Number.isFinite(value))
  )
    return { warning: 'Ignored malformed SPLINE: control-point coordinates are missing or non-finite' };
  if (zs.some((value) => Math.abs(value) > tolerance))
    return { warning: 'Ignored nonplanar SPLINE: control points must lie in the profile plane' };
  const controls = xs.map((u, index) => ({ u, v: ys[index] }));
  const knots = entity.pairs.filter((pair) => pair.code === 40).map((pair) => Number(pair.value));
  const rawWeights = entity.pairs.filter((pair) => pair.code === 41).map((pair) => Number(pair.value));
  const weights = rawWeights.length ? rawWeights : controls.map(() => 1);
  if (
    knots.length !== controls.length + degree! + 1 ||
    knots.some((value, index) => !Number.isFinite(value) || (index > 0 && value < knots[index - 1])) ||
    weights.length !== controls.length ||
    weights.some((weight) => !(weight > 0) || !Number.isFinite(weight))
  )
    return { warning: 'Ignored malformed SPLINE: knot or weight counts are invalid' };
  const startKnot = knots[degree!];
  const endKnot = knots[knots.length - degree! - 1];
  if (!(endKnot > startKnot)) return { warning: 'Ignored malformed SPLINE: parameter domain is empty' };
  const clampedBezier =
    degree === 3 &&
    controls.length === 4 &&
    weights.every((weight) => Math.abs(weight - 1) < 1e-12) &&
    knots.slice(0, 4).every((knot) => Math.abs(knot - startKnot) < 1e-12) &&
    knots.slice(-4).every((knot) => Math.abs(knot - endKnot) < 1e-12);
  if (clampedBezier)
    return {
      contour: {
        start: clonePoint(controls[0]),
        segments: [
          {
            kind: 'cubicBezier',
            control1: clonePoint(controls[1]),
            control2: clonePoint(controls[2]),
            to: clonePoint(controls[3])
          }
        ],
        closed: false
      }
    };
  const basis = (controlIndex: number, order: number, parameter: number): number => {
    let values: number[] = knots
      .slice(0, controls.length)
      .map((_, index) =>
        (parameter >= knots[index] && parameter < knots[index + 1]) ||
        (parameter === endKnot && index === controls.length - 1)
          ? 1
          : 0
      );
    for (let level = 1; level <= order; level += 1) {
      values = values.map((_, index) => {
        const leftDenominator = knots[index + level] - knots[index];
        const rightDenominator = knots[index + level + 1] - knots[index + 1];
        return (
          (leftDenominator ? ((parameter - knots[index]) / leftDenominator) * values[index] : 0) +
          (rightDenominator
            ? ((knots[index + level + 1] - parameter) / rightDenominator) * (values[index + 1] ?? 0)
            : 0)
        );
      });
    }
    return values[controlIndex] ?? 0;
  };
  const pointAt = (parameter: number): RouterProfilePoint => {
    let u = 0;
    let v = 0;
    let denominator = 0;
    controls.forEach((control, index) => {
      const weightedBasis = basis(index, degree!, parameter) * weights[index];
      u += control.u * weightedBasis;
      v += control.v * weightedBasis;
      denominator += weightedBasis;
    });
    return { u: u / denominator, v: v / denominator };
  };
  const sampleCount = Math.min(128, Math.max(16, Math.ceil((endKnot - startKnot) / Math.max(tolerance, 1e-6))));
  const points = Array.from({ length: sampleCount + 1 }, (_, index) =>
    pointAt(startKnot + ((endKnot - startKnot) * index) / sampleCount)
  );
  if (points.some((point) => !finitePoint(point)))
    return { warning: 'Ignored malformed SPLINE: evaluation produced non-finite coordinates' };
  return {
    contour: {
      start: points[0],
      segments: points.slice(1).map((to, index) => {
        const from = points[index];
        return {
          kind: 'cubicBezier' as const,
          control1: { u: from.u + (to.u - from.u) / 3, v: from.v + (to.v - from.v) / 3 },
          control2: { u: from.u + ((to.u - from.u) * 2) / 3, v: from.v + ((to.v - from.v) * 2) / 3 },
          to
        };
      }),
      closed: false
    },
    warning: `Approximated degree-${degree} SPLINE with ${sampleCount} bounded cubic segments`
  };
}

function reverseContour(contour: RouterProfileContour): RouterProfileContour {
  const vertices = [contour.start, ...contour.segments.map((segment) => segment.to)];
  const segments = contour.segments
    .map((segment, index) => ({ segment, from: vertices[index] }))
    .reverse()
    .map(
      ({ segment, from }): RouterProfileSegment =>
        segment.kind === 'line'
          ? { kind: 'line', to: clonePoint(from) }
          : segment.kind === 'cubicBezier'
            ? {
                kind: 'cubicBezier',
                control1: clonePoint(segment.control2),
                control2: clonePoint(segment.control1),
                to: clonePoint(from)
              }
            : segment.kind === 'arc'
              ? { ...segment, to: clonePoint(from), clockwise: !segment.clockwise }
              : { ...segment, to: clonePoint(from), clockwise: !segment.clockwise }
    );
  return { start: clonePoint(vertices[vertices.length - 1]), segments, closed: contour.closed };
}

export function reverseRouterProfileContour(contour: RouterProfileContour): RouterProfileContour {
  return reverseContour(contour);
}

function joinContours(
  contours: RouterProfileContour[],
  connectTolerance: number,
  repairTolerance: number
): RouterProfileContour[] {
  const remaining = contours.map((contour) => ({
    ...contour,
    start: clonePoint(contour.start),
    segments: contour.segments.map((s) => ({ ...s, to: clonePoint(s.to) }))
  }));
  const removed = remaining.map(() => false);
  const cell = Math.max(repairTolerance, 1e-12);
  const buckets = new Map<string, number[]>();
  const bucketKey = (u: number, v: number) => `${Math.floor(u / cell)}:${Math.floor(v / cell)}`;
  remaining.forEach((contour, index) => {
    if (contour.closed) return;
    for (const point of [contour.start, contourEnd(contour)]) {
      const key = bucketKey(point.u, point.v);
      const entries = buckets.get(key) ?? [];
      entries.push(index);
      buckets.set(key, entries);
    }
  });
  const nearby = (point: RouterProfilePoint): number[] => {
    const u = Math.floor(point.u / cell),
      v = Math.floor(point.v / cell);
    const found = new Set<number>();
    for (let du = -1; du <= 1; du += 1)
      for (let dv = -1; dv <= 1; dv += 1)
        for (const index of buckets.get(`${u + du}:${v + dv}`) ?? []) if (!removed[index]) found.add(index);
    return [...found].sort((a, b) => a - b);
  };
  const joined: RouterProfileContour[] = [];
  for (let baseIndex = 0; baseIndex < remaining.length; baseIndex += 1) {
    if (removed[baseIndex]) continue;
    removed[baseIndex] = true;
    const current = remaining[baseIndex];
    let changed = !current.closed;
    while (changed) {
      changed = false;
      const end = contourEnd(current);
      const candidates = [...new Set([...nearby(end), ...nearby(current.start)])].sort((a, b) => a - b);
      for (const index of candidates) {
        let candidate = remaining[index];
        if (removed[index] || candidate.closed) continue;
        if (!pointsEqual(end, candidate.start, repairTolerance)) {
          const candidateEnd = contourEnd(candidate);
          if (pointsEqual(end, candidateEnd, repairTolerance)) {
            candidate = reverseContour(candidate);
          } else {
            let prefix = candidate;
            if (pointsEqual(current.start, candidate.start, repairTolerance)) prefix = reverseContour(candidate);
            else if (!pointsEqual(current.start, candidateEnd, repairTolerance)) continue;
            const prefixEnd = contourEnd(prefix);
            const prefixGap = distance(prefixEnd, current.start);
            const bridge =
              prefixGap > connectTolerance ? [{ kind: 'line' as const, to: clonePoint(current.start) }] : [];
            current.start = clonePoint(prefix.start);
            current.segments = [...prefix.segments, ...bridge, ...current.segments];
            removed[index] = true;
            changed = true;
            break;
          }
        }
        const gap = distance(end, candidate.start);
        if (gap > connectTolerance && gap <= repairTolerance)
          current.segments.push({ kind: 'line', to: clonePoint(candidate.start) });
        current.segments.push(...candidate.segments);
        removed[index] = true;
        changed = true;
        break;
      }
    }
    const gap = distance(current.start, contourEnd(current));
    if (gap <= repairTolerance) {
      if (gap > connectTolerance) current.segments.push({ kind: 'line', to: clonePoint(current.start) });
      else if (current.segments.length) current.segments[current.segments.length - 1].to = clonePoint(current.start);
      current.closed = true;
    }
    joined.push(current);
  }
  return joined;
}

function unitInfo(code: number | undefined): Pick<DxfProfileParseResult, 'units' | 'unitScaleToInches'> {
  const values: Record<number, [DxfProfileUnits, number]> = {
    1: ['inches', 1],
    2: ['feet', 12],
    4: ['millimeters', 1 / 25.4],
    5: ['centimeters', 1 / 2.54],
    6: ['meters', 100 / 2.54]
  };
  const value = code === undefined ? undefined : values[code];
  return value ? { units: value[0], unitScaleToInches: value[1] } : { units: 'unknown', unitScaleToInches: null };
}

export function parseAsciiDxfRouterProfile(text: string, options: DxfProfileParseOptions = {}): DxfProfileParseResult {
  const limits = { ...DEFAULT_LIMITS, ...options.limits };
  if (Object.values(limits).some((value) => !Number.isSafeInteger(value) || value < 0))
    throw new DxfProfileError('DXF limits must be non-negative safe integers');
  for (const [name, value] of [
    ['connectTolerance', options.connectTolerance],
    ['repairTolerance', options.repairTolerance],
    ['splineTolerance', options.splineTolerance]
  ] as const)
    if (value !== undefined && (!(value >= 0) || !Number.isFinite(value)))
      throw new DxfProfileError(`DXF ${name} must be a non-negative finite number`);
  if (utf8ByteLength(text) > limits.maxFileBytes) throw new DxfProfileError('DXF exceeds file size limit');
  if (text.includes('\0')) throw new DxfProfileError('DXF contains binary data');
  const lines = text.replace(/\r/g, '').split('\n');
  if (lines.length % 2 !== 0 && lines[lines.length - 1].trim() !== '')
    throw new DxfProfileError('DXF has an unmatched group code');
  const pairs: Pair[] = [];
  for (let index = 0; index + 1 < lines.length; index += 2) {
    const code = Number(lines[index].trim());
    if (!Number.isInteger(code)) throw new DxfProfileError(`Invalid DXF group code at line ${index + 1}`);
    pairs.push({ code, value: lines[index + 1].trim() });
    if (pairs.length > limits.maxPairs) throw new DxfProfileError('DXF exceeds pair limit');
  }
  let section = '';
  let pendingSection = false;
  let headerVariable = '';
  let insunits: number | undefined;
  let blocks = 0;
  const entities: RawEntity[] = [];
  let current: RawEntity | null = null;
  for (const pair of pairs) {
    if (pair.code === 0 && pair.value === 'SECTION') {
      pendingSection = true;
      continue;
    }
    if (pendingSection && pair.code === 2) {
      section = pair.value;
      pendingSection = false;
      continue;
    }
    if (pair.code === 0 && pair.value === 'ENDSEC') {
      if (current) entities.push(current);
      current = null;
      section = '';
      continue;
    }
    if (section === 'HEADER') {
      if (pair.code === 9) headerVariable = pair.value;
      else if (headerVariable === '$INSUNITS' && pair.code === 70) insunits = Number(pair.value);
      continue;
    }
    if (section === 'BLOCKS' && pair.code === 0 && pair.value === 'BLOCK') {
      blocks += 1;
      if (blocks > limits.maxBlocks) throw new DxfProfileError('DXF exceeds block limit');
      continue;
    }
    if (section !== 'ENTITIES') continue;
    if (pair.code === 0) {
      if (current) entities.push(current);
      current = { type: pair.value.toUpperCase(), pairs: [] };
      if (entities.length >= limits.maxEntities) throw new DxfProfileError('DXF exceeds entity limit');
    } else if (current) current.pairs.push(pair);
  }
  if (current) entities.push(current);

  const contours: RouterProfileContour[] = [];
  const unsupported = new Set<string>();
  const entityWarnings: string[] = [];
  let coordinateCount = 0;
  let segmentCount = 0;
  const addContour = (contour: RouterProfileContour): void => {
    const points = [contour.start, ...contour.segments.map((segment) => segment.to)];
    if (
      points.some(
        (point) =>
          !finitePoint(point) ||
          Math.abs(point.u) > limits.maxAbsCoordinate ||
          Math.abs(point.v) > limits.maxAbsCoordinate
      ) ||
      contour.segments.some(
        (segment) =>
          (segment.kind === 'cubicBezier' &&
            (!finitePoint(segment.control1) ||
              !finitePoint(segment.control2) ||
              Math.abs(segment.control1.u) > limits.maxAbsCoordinate ||
              Math.abs(segment.control1.v) > limits.maxAbsCoordinate ||
              Math.abs(segment.control2.u) > limits.maxAbsCoordinate ||
              Math.abs(segment.control2.v) > limits.maxAbsCoordinate)) ||
          (segment.kind === 'arc' && (!Number.isFinite(segment.radius) || segment.radius > limits.maxAbsCoordinate)) ||
          (segment.kind === 'ellipseArc' &&
            (!Number.isFinite(segment.radiusU) ||
              !Number.isFinite(segment.radiusV) ||
              segment.radiusU > limits.maxAbsCoordinate ||
              segment.radiusV > limits.maxAbsCoordinate))
      )
    )
      throw new DxfProfileError('DXF derived geometry exceeds magnitude limit');
    segmentCount += contour.segments.length;
    if (segmentCount > limits.maxSegments) throw new DxfProfileError('DXF exceeds segment limit');
    contours.push(contour);
  };
  const checkedPoint = (u: number | undefined, v: number | undefined): RouterProfilePoint | null => {
    if (u === undefined || v === undefined) return null;
    coordinateCount += 2;
    if (coordinateCount > limits.maxCoordinates) throw new DxfProfileError('DXF exceeds coordinate limit');
    if (Math.abs(u) > limits.maxAbsCoordinate || Math.abs(v) > limits.maxAbsCoordinate)
      throw new DxfProfileError('DXF coordinate exceeds magnitude limit');
    return { u, v };
  };
  for (let index = 0; index < entities.length; index += 1) {
    const entity = entities[index];
    if (entity.type === 'LINE') {
      const start = checkedPoint(readNumber(entity, 10), readNumber(entity, 20));
      const end = checkedPoint(readNumber(entity, 11), readNumber(entity, 21));
      if (start && end && distance(start, end) > 0)
        addContour({ start, segments: [{ kind: 'line', to: end }], closed: false });
    } else if (entity.type === 'ARC' || entity.type === 'CIRCLE') {
      const center = checkedPoint(readNumber(entity, 10), readNumber(entity, 20));
      const radius = readNumber(entity, 40);
      const start = entity.type === 'CIRCLE' ? 0 : readNumber(entity, 50);
      const end = entity.type === 'CIRCLE' ? 360 : readNumber(entity, 51);
      if (
        center &&
        radius &&
        radius > 0 &&
        start !== undefined &&
        end !== undefined &&
        (entity.type === 'CIRCLE' || Math.abs(end - start) > 1e-12)
      )
        addContour(arcContour(center, radius, start, end));
    } else if (entity.type === 'SPLINE') {
      const parsed = splineContour(entity, options.splineTolerance ?? 0.001);
      if (parsed.warning) entityWarnings.push(parsed.warning);
      if (parsed.contour) {
        coordinateCount += entity.pairs.filter(
          (pair) => pair.code === 10 || pair.code === 20 || pair.code === 30
        ).length;
        if (coordinateCount > limits.maxCoordinates) throw new DxfProfileError('DXF exceeds coordinate limit');
        addContour(parsed.contour);
      }
    } else if (entity.type === 'LWPOLYLINE') {
      const xs = entity.pairs.filter((pair) => pair.code === 10);
      const vertices: Array<RouterProfilePoint & { bulge?: number }> = [];
      let vertex = -1;
      for (const pair of entity.pairs) {
        if (pair.code === 10) {
          vertex += 1;
          vertices.push({ u: Number(pair.value), v: Number.NaN });
        } else if (pair.code === 20 && vertex >= 0) vertices[vertex].v = Number(pair.value);
        else if (pair.code === 42 && vertex >= 0) vertices[vertex].bulge = Number(pair.value);
      }
      coordinateCount += xs.length * 2;
      if (coordinateCount > limits.maxCoordinates) throw new DxfProfileError('DXF exceeds coordinate limit');
      if (
        vertices.some(
          (point) =>
            !finitePoint(point) ||
            Math.abs(point.u) > limits.maxAbsCoordinate ||
            Math.abs(point.v) > limits.maxAbsCoordinate
        )
      )
        throw new DxfProfileError('DXF polyline contains invalid coordinates');
      const contour = polylineContour(vertices, Boolean((readNumber(entity, 70) ?? 0) & 1));
      if (contour) addContour(contour);
    } else if (entity.type === 'POLYLINE') {
      const vertices: Array<RouterProfilePoint & { bulge?: number }> = [];
      while (index + 1 < entities.length && entities[index + 1].type === 'VERTEX') {
        const candidate = entities[++index];
        const point = checkedPoint(readNumber(candidate, 10), readNumber(candidate, 20));
        if (point) vertices.push({ ...point, bulge: readNumber(candidate, 42) });
      }
      if (entities[index + 1]?.type === 'SEQEND') index += 1;
      const contour = polylineContour(vertices, Boolean((readNumber(entity, 70) ?? 0) & 1));
      if (contour) addContour(contour);
    } else if (entity.type !== 'VERTEX' && entity.type !== 'SEQEND') {
      unsupported.add(entity.type);
    }
  }
  const connectTolerance = options.connectTolerance ?? 1e-8;
  const repairTolerance = Math.max(connectTolerance, options.repairTolerance ?? 1e-5);
  const connected = joinContours(contours, connectTolerance, repairTolerance);
  const units = unitInfo(insunits);
  const unitScale = units.unitScaleToInches;
  const normalizedContours =
    unitScale === null ? connected : connected.map((contour) => scaleRouterProfileContour(contour, unitScale));
  return {
    ...units,
    contours: normalizedContours,
    unsupportedEntities: [...unsupported].sort(),
    warnings: [
      ...(units.units === 'unknown' ? ['DXF insertion units are missing or unsupported'] : []),
      ...entityWarnings,
      ...(unsupported.size ? [`Ignored unsupported entities: ${[...unsupported].sort().join(', ')}`] : [])
    ]
  };
}

function mapContour(
  contour: RouterProfileContour,
  map: (point: RouterProfilePoint) => RouterProfilePoint,
  reversesOrientation = false
): RouterProfileContour {
  return {
    start: map(contour.start),
    closed: contour.closed,
    segments: contour.segments.map((segment) => ({
      ...segment,
      to: map(segment.to),
      ...(segment.kind === 'cubicBezier' ? { control1: map(segment.control1), control2: map(segment.control2) } : {}),
      ...('clockwise' in segment && reversesOrientation ? { clockwise: !segment.clockwise } : {})
    }))
  };
}

export function translateRouterProfileContour(
  contour: RouterProfileContour,
  du: number,
  dv: number
): RouterProfileContour {
  return mapContour(contour, ({ u, v }) => ({ u: u + du, v: v + dv }));
}

export function rotateRouterProfileContour(contour: RouterProfileContour, radians: number): RouterProfileContour {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return mapContour(contour, ({ u, v }) => ({ u: u * cosine - v * sine, v: u * sine + v * cosine }));
}

export function scaleRouterProfileContour(contour: RouterProfileContour, scale: number): RouterProfileContour {
  const magnitude = Math.abs(scale);
  // A negative uniform scale is a 180-degree rotation, whose determinant is
  // positive; unlike a one-axis mirror it does not reverse arc orientation.
  const mapped = mapContour(contour, ({ u, v }) => ({ u: u * scale, v: v * scale }));
  mapped.segments = mapped.segments.map((segment) =>
    segment.kind === 'arc'
      ? { ...segment, radius: segment.radius * magnitude }
      : segment.kind === 'ellipseArc'
        ? { ...segment, radiusU: segment.radiusU * magnitude, radiusV: segment.radiusV * magnitude }
        : segment
  );
  return mapped;
}

export function mirrorRouterProfileContour(contour: RouterProfileContour, axis: 'u' | 'v'): RouterProfileContour {
  return mapContour(contour, ({ u, v }) => ({ u: axis === 'u' ? -u : u, v: axis === 'v' ? -v : v }), true);
}

export function swapRouterProfileContourAxes(contour: RouterProfileContour): RouterProfileContour {
  const swapped = mapContour(contour, ({ u, v }) => ({ u: v, v: u }), true);
  swapped.segments = swapped.segments.map((segment) =>
    segment.kind === 'ellipseArc' ? { ...segment, radiusU: segment.radiusV, radiusV: segment.radiusU } : segment
  );
  return swapped;
}

function sampledContour(contour: RouterProfileContour): RouterProfilePoint[] {
  // Validation deliberately samples curves conservatively; imported circular
  // arcs are already split to <=180 degrees, so 16 chords per segment catches
  // ordinary profile crossings without turning samples into stored geometry.
  const result = [contour.start];
  let from = contour.start;
  for (const segment of contour.segments) {
    if (segment.kind === 'cubicBezier') {
      const p0 = from;
      for (let step = 1; step <= 16; step += 1) {
        const t = step / 16;
        const s = 1 - t;
        result.push({
          u:
            s ** 3 * p0.u +
            3 * s ** 2 * t * segment.control1.u +
            3 * s * t ** 2 * segment.control2.u +
            t ** 3 * segment.to.u,
          v:
            s ** 3 * p0.v +
            3 * s ** 2 * t * segment.control1.v +
            3 * s * t ** 2 * segment.control2.v +
            t ** 3 * segment.to.v
        });
      }
      from = segment.to;
      continue;
    }
    if (segment.kind !== 'arc') {
      result.push(segment.to);
      from = segment.to;
      continue;
    }
    const chord = distance(from, segment.to);
    if (!(chord > 0) || chord > segment.radius * 2 + 1e-8) {
      result.push(segment.to);
      from = segment.to;
      continue;
    }
    const midpoint = { u: (from.u + segment.to.u) / 2, v: (from.v + segment.to.v) / 2 };
    const height = Math.sqrt(Math.max(0, segment.radius ** 2 - (chord / 2) ** 2));
    const left = { u: -(segment.to.v - from.v) / chord, v: (segment.to.u - from.u) / chord };
    const centers = [1, -1].map((sign) => ({
      u: midpoint.u + left.u * height * sign,
      v: midpoint.v + left.v * height * sign
    }));
    const center =
      centers.find((candidate) => {
        const startAngle = Math.atan2(from.v - candidate.v, from.u - candidate.u);
        const endAngle = Math.atan2(segment.to.v - candidate.v, segment.to.u - candidate.u);
        let sweep = endAngle - startAngle;
        while (sweep <= -Math.PI) sweep += Math.PI * 2;
        while (sweep > Math.PI) sweep -= Math.PI * 2;
        return segment.clockwise ? sweep <= 0 : sweep >= 0;
      }) ?? centers[0];
    const startAngle = Math.atan2(from.v - center.v, from.u - center.u);
    const endAngle = Math.atan2(segment.to.v - center.v, segment.to.u - center.u);
    let sweep = endAngle - startAngle;
    if (segment.clockwise) while (sweep > 0) sweep -= Math.PI * 2;
    else while (sweep < 0) sweep += Math.PI * 2;
    for (let step = 1; step <= 8; step += 1) {
      const angle = startAngle + (sweep * step) / 8;
      result.push({ u: center.u + segment.radius * Math.cos(angle), v: center.v + segment.radius * Math.sin(angle) });
    }
    from = segment.to;
  }
  return result;
}

function orientation(a: RouterProfilePoint, b: RouterProfilePoint, c: RouterProfilePoint): number {
  return (b.u - a.u) * (c.v - a.v) - (b.v - a.v) * (c.u - a.u);
}

function lineSegmentsIntersect(
  a: RouterProfilePoint,
  b: RouterProfilePoint,
  c: RouterProfilePoint,
  d: RouterProfilePoint
): boolean {
  return orientation(a, b, c) * orientation(a, b, d) < 0 && orientation(c, d, a) * orientation(c, d, b) < 0;
}

export function validateRouterProfileContour(
  contour: RouterProfileContour,
  tolerance = 1e-8
): RouterProfileContourValidation {
  const errors: string[] = [];
  if (!finitePoint(contour.start) || contour.segments.some((segment) => !finitePoint(segment.to)))
    errors.push('Contour contains non-finite coordinates');
  if (contour.segments.length === 0) errors.push('Contour has no segments');
  const points = sampledContour(contour);
  const closed = points.length > 1 && pointsEqual(points[0], points[points.length - 1], tolerance);
  if (contour.closed && !closed) errors.push('Contour is marked closed but has an endpoint gap');
  let from = contour.start;
  for (const segment of contour.segments) {
    if (distance(from, segment.to) <= tolerance) errors.push('Contour contains a degenerate segment');
    if (segment.kind === 'arc' && distance(from, segment.to) > segment.radius * 2 + tolerance)
      errors.push('Contour contains an impossible arc radius');
    from = segment.to;
  }
  let selfIntersects = false;
  for (let first = 0; first < points.length - 1; first += 1) {
    for (let second = first + 2; second < points.length - 1; second += 1) {
      if (closed && first === 0 && second === points.length - 2) continue;
      if (lineSegmentsIntersect(points[first], points[first + 1], points[second], points[second + 1]))
        selfIntersects = true;
    }
  }
  if (selfIntersects) errors.push('Contour self-intersects');
  return { valid: errors.length === 0, closed, selfIntersects, errors };
}
