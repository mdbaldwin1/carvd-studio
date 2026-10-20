import type { RouterProfilePoint, RouterProfileSegment } from '../types';
import { reverseRouterProfileContour, scaleRouterProfileContour, type RouterProfileContour } from './routerProfileDxf';

export interface SvgProfileLimits {
  maxFileBytes: number;
  maxCommands: number;
  maxCoordinates: number;
  maxTransforms: number;
  maxNesting: number;
  maxSegments: number;
  maxAbsCoordinate: number;
}

export interface SvgProfileParseOptions {
  limits?: Partial<SvgProfileLimits>;
  tolerance?: number;
}
export interface SvgProfileParseResult {
  contours: RouterProfileContour[];
  units: 'inches' | 'millimeters' | 'centimeters' | 'points' | 'pixels' | 'unknown';
  unitScaleToInches: number | null;
  warnings: string[];
  errors: string[];
  fidelity: 'exact' | 'approximated';
  provenance: { format: 'svg'; viewBox?: [number, number, number, number] };
}

const DEFAULT_LIMITS: SvgProfileLimits = {
  maxFileBytes: 2 * 1024 * 1024,
  maxCommands: 20_000,
  maxCoordinates: 100_000,
  maxTransforms: 2_000,
  maxNesting: 32,
  maxSegments: 20_000,
  maxAbsCoordinate: 1_000_000
};
type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const multiply = (a: Matrix, b: Matrix): Matrix => [
  a[0] * b[0] + a[2] * b[1],
  a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4],
  a[1] * b[4] + a[3] * b[5] + a[5]
];
const mapPoint = (m: Matrix, point: RouterProfilePoint): RouterProfilePoint => ({
  u: m[0] * point.u + m[2] * point.v + m[4],
  v: m[1] * point.u + m[3] * point.v + m[5]
});

export class SvgProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SvgProfileError';
  }
}

function byteLength(text: string): number {
  let bytes = 0;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length) {
      bytes += 4;
      index += 1;
    } else bytes += 3;
  }
  return bytes;
}
function numbers(value: string): number[] {
  const matches = value.match(/[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g) ?? [];
  return matches.map(Number);
}
function parseTransform(value: string, limits: SvgProfileLimits, state: { count: number }): Matrix {
  let result = IDENTITY;
  const calls = [...value.matchAll(/([A-Za-z]+)\s*\(([^)]*)\)/g)];
  if (
    calls
      .map((match) => match[0])
      .join('')
      .replace(/\s|,/g, '') !== value.replace(/\s|,/g, '')
  )
    throw new SvgProfileError('Malformed SVG transform');
  for (const call of calls) {
    if (++state.count > limits.maxTransforms) throw new SvgProfileError('SVG exceeds transform limit');
    const args = numbers(call[2]);
    let next: Matrix;
    switch (call[1]) {
      case 'matrix':
        if (args.length !== 6) throw new SvgProfileError('matrix() requires six values');
        next = args as Matrix;
        break;
      case 'translate':
        if (args.length < 1 || args.length > 2) throw new SvgProfileError('translate() requires one or two values');
        next = [1, 0, 0, 1, args[0], args[1] ?? 0];
        break;
      case 'scale':
        if (args.length < 1 || args.length > 2) throw new SvgProfileError('scale() requires one or two values');
        next = [args[0], 0, 0, args[1] ?? args[0], 0, 0];
        break;
      case 'rotate': {
        if (args.length !== 1 && args.length !== 3) throw new SvgProfileError('rotate() requires one or three values');
        const angle = (args[0] * Math.PI) / 180,
          c = Math.cos(angle),
          s = Math.sin(angle);
        const rotation: Matrix = [c, s, -s, c, 0, 0];
        next =
          args.length === 3
            ? multiply(multiply([1, 0, 0, 1, args[1], args[2]], rotation), [1, 0, 0, 1, -args[1], -args[2]])
            : rotation;
        break;
      }
      default:
        throw new SvgProfileError(`Unsupported SVG transform: ${call[1]}`);
    }
    result = multiply(result, next);
  }
  return result;
}

function unit(value?: string): { units: SvgProfileParseResult['units']; scale: number | null; value?: number } {
  if (!value) return { units: 'unknown', scale: null };
  const match = value.trim().match(/^([+-]?(?:\d*\.\d+|\d+\.?))(in|mm|cm|pt|px)?$/i);
  if (!match) return { units: 'unknown', scale: null };
  const suffix = (match[2] ?? 'px').toLowerCase();
  const scales: Record<string, [SvgProfileParseResult['units'], number]> = {
    in: ['inches', 1],
    mm: ['millimeters', 1 / 25.4],
    cm: ['centimeters', 1 / 2.54],
    pt: ['points', 1 / 72],
    px: ['pixels', 1 / 96]
  };
  return { units: scales[suffix][0], scale: scales[suffix][1], value: Number(match[1]) };
}

function cubicForQuadratic(
  from: RouterProfilePoint,
  control: RouterProfilePoint,
  to: RouterProfilePoint
): Extract<RouterProfileSegment, { kind: 'cubicBezier' }> {
  return {
    kind: 'cubicBezier',
    control1: { u: from.u + (2 * (control.u - from.u)) / 3, v: from.v + (2 * (control.v - from.v)) / 3 },
    control2: { u: to.u + (2 * (control.u - to.u)) / 3, v: to.v + (2 * (control.v - to.v)) / 3 },
    to
  };
}

function arcSegments(
  from: RouterProfilePoint,
  rx0: number,
  ry0: number,
  rotation: number,
  large: boolean,
  sweep: boolean,
  to: RouterProfilePoint,
  matrix: Matrix,
  tolerance: number
): { segments: RouterProfileSegment[]; approximated: boolean } {
  let rx = Math.abs(rx0),
    ry = Math.abs(ry0);
  if (!(rx > 0) || !(ry > 0) || (from.u === to.u && from.v === to.v))
    return { segments: [{ kind: 'line', to: mapPoint(matrix, to) }], approximated: false };
  const phi = (rotation * Math.PI) / 180,
    c = Math.cos(phi),
    s = Math.sin(phi);
  const dx = (from.u - to.u) / 2,
    dy = (from.v - to.v) / 2;
  const xp = c * dx + s * dy,
    yp = -s * dx + c * dy;
  const lambda = xp ** 2 / rx ** 2 + yp ** 2 / ry ** 2;
  if (lambda > 1) {
    const factor = Math.sqrt(lambda);
    rx *= factor;
    ry *= factor;
  }
  const sign = large === sweep ? -1 : 1;
  const coefficient =
    sign *
    Math.sqrt(
      Math.max(0, (rx ** 2 * ry ** 2 - rx ** 2 * yp ** 2 - ry ** 2 * xp ** 2) / (rx ** 2 * yp ** 2 + ry ** 2 * xp ** 2))
    );
  const cxp = (coefficient * rx * yp) / ry,
    cyp = (coefficient * -ry * xp) / rx;
  const center = { u: c * cxp - s * cyp + (from.u + to.u) / 2, v: s * cxp + c * cyp + (from.v + to.v) / 2 };
  const angle = (x: number, y: number) => Math.atan2(y, x);
  let start = angle((xp - cxp) / rx, (yp - cyp) / ry);
  let delta = angle((-xp - cxp) / rx, (-yp - cyp) / ry) - start;
  if (!sweep && delta > 0) delta -= Math.PI * 2;
  if (sweep && delta < 0) delta += Math.PI * 2;
  const transformVector = (u: number, v: number) => ({
    u: matrix[0] * u + matrix[2] * v,
    v: matrix[1] * u + matrix[3] * v
  });
  const axisU = transformVector(c * rx, s * rx);
  const axisV = transformVector(-s * ry, c * ry);
  const lengthU = Math.hypot(axisU.u, axisU.v),
    lengthV = Math.hypot(axisV.u, axisV.v);
  const dot = axisU.u * axisV.u + axisU.v * axisV.v;
  const circular =
    Math.abs(dot) <= 1e-10 * lengthU * lengthV && Math.abs(lengthU - lengthV) <= 1e-10 * Math.max(lengthU, lengthV);
  const aligned =
    (Math.abs(axisU.v) <= 1e-10 * lengthU && Math.abs(axisV.u) <= 1e-10 * lengthV) ||
    (Math.abs(axisU.u) <= 1e-10 * lengthU && Math.abs(axisV.v) <= 1e-10 * lengthV);
  const exact = circular || aligned;
  const transformedRadius = Math.max(rx * Math.hypot(matrix[0], matrix[1]), ry * Math.hypot(matrix[2], matrix[3]));
  const maxAngle = Math.min(
    Math.PI / 2,
    2 * Math.acos(Math.max(-1, 1 - Math.min(tolerance, transformedRadius) / transformedRadius))
  );
  const parts = Math.max(1, Math.ceil(Math.abs(delta) / maxAngle));
  const segments: RouterProfileSegment[] = [];
  let prior = from;
  for (let index = 1; index <= parts; index += 1) {
    const nextAngle = start + (delta * index) / parts;
    const endpoint =
      index === parts
        ? to
        : {
            u: center.u + c * rx * Math.cos(nextAngle) - s * ry * Math.sin(nextAngle),
            v: center.v + s * rx * Math.cos(nextAngle) + c * ry * Math.sin(nextAngle)
          };
    if (exact) {
      const radiusU = circular ? lengthU : Math.max(Math.abs(axisU.u), Math.abs(axisV.u));
      const radiusV = circular ? lengthU : Math.max(Math.abs(axisU.v), Math.abs(axisV.v));
      const clockwise = delta < 0 !== matrix[0] * matrix[3] - matrix[1] * matrix[2] < 0;
      segments.push(
        circular
          ? { kind: 'arc', to: mapPoint(matrix, endpoint), radius: radiusU, clockwise }
          : { kind: 'ellipseArc', to: mapPoint(matrix, endpoint), radiusU, radiusV, clockwise }
      );
    } else {
      const a0 = start + (delta * (index - 1)) / parts,
        a1 = nextAngle,
        k = (4 / 3) * Math.tan((a1 - a0) / 4);
      const derivative = (a: number): RouterProfilePoint => ({
        u: -c * rx * Math.sin(a) - s * ry * Math.cos(a),
        v: -s * rx * Math.sin(a) + c * ry * Math.cos(a)
      });
      const d0 = derivative(a0),
        d1 = derivative(a1);
      segments.push({
        kind: 'cubicBezier',
        control1: mapPoint(matrix, { u: prior.u + k * d0.u, v: prior.v + k * d0.v }),
        control2: mapPoint(matrix, { u: endpoint.u - k * d1.u, v: endpoint.v - k * d1.v }),
        to: mapPoint(matrix, endpoint)
      });
    }
    prior = endpoint;
  }
  return { segments, approximated: !exact };
}

const COMMAND_ARITY: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
function parsePath(
  d: string,
  matrix: Matrix,
  limits: SvgProfileLimits,
  tolerance: number,
  budget: { commands: number; coordinates: number; segments: number }
): { contours: RouterProfileContour[]; approximated: boolean } {
  const tokens = d.match(/[AaCcHhLlMmQqSsTtVvZz]|[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g) ?? [];
  if (tokens.join('').length !== d.replace(/[\s,]/g, '').length) throw new SvgProfileError('Malformed SVG path data');
  const contours: RouterProfileContour[] = [];
  let index = 0,
    command = '',
    current = { u: 0, v: 0 },
    start = current,
    segments: RouterProfileSegment[] = [];
  let lastCubic: RouterProfilePoint | undefined,
    lastQuadratic: RouterProfilePoint | undefined,
    approximated = false;
  const flush = (closed = false) => {
    if (segments.length) contours.push({ start: mapPoint(matrix, start), segments, closed });
    segments = [];
  };
  const point = (u: number, v: number, relative: boolean): RouterProfilePoint =>
    relative ? { u: current.u + u, v: current.v + v } : { u, v };
  while (index < tokens.length) {
    if (/^[A-Za-z]$/.test(tokens[index])) command = tokens[index++];
    if (!command) throw new SvgProfileError('SVG path must begin with a command');
    const upper = command.toUpperCase(),
      relative = command !== upper,
      arity = COMMAND_ARITY[upper];
    if (arity === undefined) throw new SvgProfileError(`Unsupported SVG path command: ${command}`);
    if (++budget.commands > limits.maxCommands) throw new SvgProfileError('SVG exceeds command limit');
    if (upper === 'Z') {
      if (current.u !== start.u || current.v !== start.v) segments.push({ kind: 'line', to: mapPoint(matrix, start) });
      current = start;
      flush(true);
      command = '';
      continue;
    }
    if (index + arity > tokens.length || tokens.slice(index, index + arity).some((token) => /^[A-Za-z]$/.test(token)))
      throw new SvgProfileError(`SVG ${command} command is missing coordinates`);
    const args = tokens.slice(index, (index += arity)).map(Number);
    budget.coordinates += arity;
    if (budget.coordinates > limits.maxCoordinates || args.some((value) => !Number.isFinite(value)))
      throw new SvgProfileError('SVG coordinates are invalid or exceed the coordinate limit');
    if (upper === 'M') {
      flush();
      current = point(args[0], args[1], relative);
      start = current;
      command = relative ? 'l' : 'L';
      continue;
    }
    let to: RouterProfilePoint;
    if (upper === 'H') to = point(args[0], relative ? 0 : current.v, relative);
    else if (upper === 'V') to = point(relative ? 0 : current.u, args[0], relative);
    else to = point(args[args.length - 2], args[args.length - 1], relative);
    if (upper === 'L' || upper === 'H' || upper === 'V') segments.push({ kind: 'line', to: mapPoint(matrix, to) });
    else if (upper === 'C') {
      const c1 = point(args[0], args[1], relative),
        c2 = point(args[2], args[3], relative);
      segments.push({
        kind: 'cubicBezier',
        control1: mapPoint(matrix, c1),
        control2: mapPoint(matrix, c2),
        to: mapPoint(matrix, to)
      });
      lastCubic = c2;
    } else if (upper === 'S') {
      const c1 = lastCubic ? { u: 2 * current.u - lastCubic.u, v: 2 * current.v - lastCubic.v } : current;
      const c2 = point(args[0], args[1], relative);
      segments.push({
        kind: 'cubicBezier',
        control1: mapPoint(matrix, c1),
        control2: mapPoint(matrix, c2),
        to: mapPoint(matrix, to)
      });
      lastCubic = c2;
    } else if (upper === 'Q' || upper === 'T') {
      const control =
        upper === 'Q'
          ? point(args[0], args[1], relative)
          : lastQuadratic
            ? { u: 2 * current.u - lastQuadratic.u, v: 2 * current.v - lastQuadratic.v }
            : current;
      const cubic = cubicForQuadratic(current, control, to);
      segments.push({
        ...cubic,
        control1: mapPoint(matrix, cubic.control1),
        control2: mapPoint(matrix, cubic.control2),
        to: mapPoint(matrix, to)
      });
      lastQuadratic = control;
    } else if (upper === 'A') {
      if (![0, 1].includes(args[3]) || ![0, 1].includes(args[4]))
        throw new SvgProfileError('SVG arc flags must be 0 or 1');
      const arc = arcSegments(
        current,
        args[0],
        args[1],
        args[2],
        Boolean(args[3]),
        Boolean(args[4]),
        to,
        matrix,
        tolerance
      );
      segments.push(...arc.segments);
      approximated ||= arc.approximated;
    }
    if (upper !== 'C' && upper !== 'S') lastCubic = undefined;
    if (upper !== 'Q' && upper !== 'T') lastQuadratic = undefined;
    current = to;
    if (budget.segments + segments.length > limits.maxSegments)
      throw new SvgProfileError('SVG exceeds output segment limit');
  }
  flush();
  return { contours, approximated };
}

function attributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/gs)) result[match[1]] = match[3];
  return result;
}

export function parseSvgRouterProfile(text: string, options: SvgProfileParseOptions = {}): SvgProfileParseResult {
  const limits = { ...DEFAULT_LIMITS, ...options.limits };
  if (Object.values(limits).some((value) => !Number.isSafeInteger(value) || value < 0))
    throw new SvgProfileError('SVG limits must be non-negative safe integers');
  const requestedTolerance = options.tolerance ?? 0.001;
  if (!(requestedTolerance > 0) || !Number.isFinite(requestedTolerance))
    throw new SvgProfileError('SVG tolerance must be a positive finite number');
  if (byteLength(text) > limits.maxFileBytes) throw new SvgProfileError('SVG exceeds file size limit');
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new SvgProfileError('SVG DTD and entity declarations are forbidden');
  if (
    /<\s*(script|style|image|use|foreignObject|iframe|object|embed|link|font)\b/i.test(text) ||
    /(?:href\s*=|url\s*\(|\son[a-z]+\s*=)/i.test(text)
  )
    throw new SvgProfileError('SVG contains forbidden active or external content');
  const tags = [...text.matchAll(/<\/?(?:svg|g|path)\b[^>]*>|<[^!?][^>]*>/gi)];
  const unknown = tags.find((match) => !/^<\/?(?:svg|g|path)\b/i.test(match[0]));
  if (unknown) throw new SvgProfileError('SVG contains unsupported geometry or markup');
  const transformState = { count: 0 },
    budget = { commands: 0, coordinates: 0, segments: 0 },
    stack: Matrix[] = [IDENTITY];
  const contours: RouterProfileContour[] = [],
    warnings: string[] = [],
    errors: string[] = [];
  let viewBox: [number, number, number, number] | undefined,
    units: SvgProfileParseResult['units'] = 'unknown',
    unitScaleToInches: number | null = null,
    approximated = false;
  for (const match of tags) {
    const tag = match[0],
      closing = /^<\//.test(tag),
      name = tag.match(/^<\/?(\w+)/)?.[1].toLowerCase();
    if (closing) {
      if ((name === 'svg' || name === 'g') && stack.length <= 1)
        throw new SvgProfileError('SVG markup has an unmatched closing tag');
      if (name === 'svg' || name === 'g') stack.pop();
      continue;
    }
    const attrs = attributes(tag);
    let local = attrs.transform ? parseTransform(attrs.transform, limits, transformState) : IDENTITY;
    if (name === 'svg' && !viewBox && attrs.viewBox) {
      const values = numbers(attrs.viewBox);
      if (values.length !== 4 || !(values[2] > 0) || !(values[3] > 0))
        throw new SvgProfileError('SVG viewBox is invalid');
      viewBox = values as [number, number, number, number];
      const width = unit(attrs.width),
        height = unit(attrs.height);
      units = width.units;
      unitScaleToInches = width.scale;
      if (width.value && height.value)
        local = multiply(
          [
            width.value / values[2],
            0,
            0,
            height.value / values[3],
            (-values[0] * width.value) / values[2],
            (-values[1] * height.value) / values[3]
          ],
          local
        );
      else warnings.push('SVG viewBox has no physical width and height; coordinates remain in user units');
    }
    const combined = multiply(stack[stack.length - 1], local);
    if ((name === 'svg' || name === 'g') && !/\/\s*>$/.test(tag)) {
      if (stack.length >= limits.maxNesting) throw new SvgProfileError('SVG exceeds nesting limit');
      stack.push(combined);
    } else if (name === 'path') {
      if (!attrs.d) continue;
      const before = budget.segments;
      const parsed = parsePath(attrs.d, combined, limits, requestedTolerance, budget);
      budget.segments = before + parsed.contours.reduce((sum, contour) => sum + contour.segments.length, 0);
      if (budget.segments > limits.maxSegments) throw new SvgProfileError('SVG exceeds output segment limit');
      contours.push(...parsed.contours);
      approximated ||= parsed.approximated;
    }
  }
  if (stack.length !== 1) throw new SvgProfileError('SVG markup has unclosed group or root elements');
  const tolerance = requestedTolerance;
  const connected: RouterProfileContour[] = [];
  for (const contour of contours) {
    if (contour.closed) {
      connected.push(contour);
      continue;
    }
    const match = connected.findIndex(
      (candidate) =>
        !candidate.closed &&
        Math.hypot(
          candidate.segments.at(-1)!.to.u - contour.start.u,
          candidate.segments.at(-1)!.to.v - contour.start.v
        ) <= tolerance
    );
    const reversedMatch = connected.findIndex(
      (candidate) =>
        !candidate.closed &&
        Math.hypot(
          candidate.segments.at(-1)!.to.u - contour.segments.at(-1)!.to.u,
          candidate.segments.at(-1)!.to.v - contour.segments.at(-1)!.to.v
        ) <= tolerance
    );
    if (match >= 0) connected[match].segments.push(...contour.segments);
    else if (reversedMatch >= 0)
      connected[reversedMatch].segments.push(...reverseRouterProfileContour(contour).segments);
    else connected.push(contour);
  }
  if (connected.some((contour) => contour.closed))
    errors.push('Closed SVG contours are not valid edge profiles; select or open one contour first');
  if (connected.length > 1)
    errors.push('SVG contains multiple contours; select one unambiguous open contour before import');
  if (!connected.length) errors.push('SVG contains no supported path contour');
  if (approximated)
    warnings.push('Rotated or skewed elliptical arcs were approximated deterministically with cubic Beziers');
  const normalized =
    unitScaleToInches === null
      ? connected
      : connected.map((contour) => scaleRouterProfileContour(contour, unitScaleToInches!));
  const points = normalized.flatMap((contour) => [
    contour.start,
    ...contour.segments.flatMap((segment) =>
      segment.kind === 'cubicBezier' ? [segment.control1, segment.control2, segment.to] : [segment.to]
    )
  ]);
  if (
    points.some(
      (point) =>
        !Number.isFinite(point.u) ||
        !Number.isFinite(point.v) ||
        Math.abs(point.u) > limits.maxAbsCoordinate ||
        Math.abs(point.v) > limits.maxAbsCoordinate
    )
  )
    throw new SvgProfileError('SVG derived geometry exceeds coordinate magnitude limit');
  if (normalized.reduce((sum, contour) => sum + contour.segments.length, 0) > limits.maxSegments)
    throw new SvgProfileError('SVG exceeds output segment limit');
  return {
    contours: normalized,
    units,
    unitScaleToInches,
    warnings,
    errors,
    fidelity: approximated ? 'approximated' : 'exact',
    provenance: { format: 'svg', viewBox }
  };
}
