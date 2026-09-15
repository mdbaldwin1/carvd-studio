import type { RouterProfileDefinition, RouterProfilePoint, RouterProfileSegment } from '../types';

export interface RouterProfileSegmentSpan {
  from: RouterProfilePoint;
  segment: RouterProfileSegment;
}
export type RouterProfileJoinContinuity = 'disconnected' | 'g0_corner' | 'g1_tangent' | 'g2_curvature';
export interface RouterProfileContinuityTolerances {
  relativePosition: number;
  angleRadians: number;
  normalizedCurvature: number;
  maxCoordinate: number;
  maxJoins: number;
}
export interface RouterProfileJoinDiagnostic {
  joinIndex: number;
  point: RouterProfilePoint;
  continuity: RouterProfileJoinContinuity;
  gap: number;
  angleDiscontinuity: number | null;
  signedCurvatureBefore: number | null;
  signedCurvatureAfter: number | null;
  normalizedCurvatureDiscontinuity: number | null;
  message: string;
}

const DEFAULTS: RouterProfileContinuityTolerances = {
  relativePosition: 1e-8,
  angleRadians: 1e-4,
  normalizedCurvature: 1e-3,
  maxCoordinate: 1e9,
  maxJoins: 2048
};
const distance = (a: RouterProfilePoint, b: RouterProfilePoint) => Math.hypot(a.u - b.u, a.v - b.v);
const vector = (a: RouterProfilePoint, b: RouterProfilePoint) => ({ u: b.u - a.u, v: b.v - a.v });
const magnitude = (v: RouterProfilePoint) => Math.hypot(v.u, v.v);
const normalize = (v: RouterProfilePoint): RouterProfilePoint | null => {
  const length = magnitude(v);
  return length > 1e-14 && Number.isFinite(length) ? { u: v.u / length, v: v.v / length } : null;
};
const cross = (a: RouterProfilePoint, b: RouterProfilePoint) => a.u * b.v - a.v * b.u;
const dot = (a: RouterProfilePoint, b: RouterProfilePoint) => a.u * b.u + a.v * b.v;

function arcData(
  span: RouterProfileSegmentSpan
): { startAngle: number; sweep: number; radiusU: number; radiusV: number } | null {
  const segment = span.segment;
  if (segment.kind !== 'arc' && segment.kind !== 'ellipseArc') return null;
  const radiusU = segment.kind === 'arc' ? segment.radius : segment.radiusU;
  const radiusV = segment.kind === 'arc' ? segment.radius : segment.radiusV;
  const a = { u: span.from.u / radiusU, v: span.from.v / radiusV };
  const b = { u: segment.to.u / radiusU, v: segment.to.v / radiusV };
  const chord = distance(a, b);
  if (!(chord > 1e-14) || chord > 2 + 1e-9) return null;
  const midpoint = { u: (a.u + b.u) / 2, v: (a.v + b.v) / 2 };
  const height = Math.sqrt(Math.max(0, 1 - (chord / 2) ** 2));
  const perpendicular = { u: -(b.v - a.v) / chord, v: (b.u - a.u) / chord };
  for (const sign of [1, -1]) {
    const center = { u: midpoint.u + perpendicular.u * height * sign, v: midpoint.v + perpendicular.v * height * sign };
    const startAngle = Math.atan2(a.v - center.v, a.u - center.u);
    const endAngle = Math.atan2(b.v - center.v, b.u - center.u);
    let sweep = endAngle - startAngle;
    while (sweep <= -Math.PI) sweep += Math.PI * 2;
    while (sweep > Math.PI) sweep -= Math.PI * 2;
    if ((segment.clockwise && sweep <= 1e-14) || (!segment.clockwise && sweep >= -1e-14))
      return { startAngle, sweep, radiusU, radiusV };
  }
  return null;
}

function derivatives(
  span: RouterProfileSegmentSpan,
  end: 'start' | 'end'
): { first: RouterProfilePoint | null; curvature: number | null } {
  const { from, segment } = span;
  if (segment.kind === 'line') return { first: normalize(vector(from, segment.to)), curvature: 0 };
  if (segment.kind === 'cubicBezier') {
    const firstRaw = end === 'start' ? vector(from, segment.control1) : vector(segment.control2, segment.to);
    const fallback =
      end === 'start'
        ? [vector(from, segment.control2), vector(from, segment.to)]
        : [vector(segment.control1, segment.to), vector(from, segment.to)];
    const first = normalize(firstRaw) ?? normalize(fallback[0]) ?? normalize(fallback[1]);
    const derivative = { u: firstRaw.u * 3, v: firstRaw.v * 3 };
    const second =
      end === 'start'
        ? {
            u: 6 * (from.u - 2 * segment.control1.u + segment.control2.u),
            v: 6 * (from.v - 2 * segment.control1.v + segment.control2.v)
          }
        : {
            u: 6 * (segment.to.u - 2 * segment.control2.u + segment.control1.u),
            v: 6 * (segment.to.v - 2 * segment.control2.v + segment.control1.v)
          };
    const speed = magnitude(derivative);
    return { first, curvature: speed > 1e-12 ? cross(derivative, second) / speed ** 3 : null };
  }
  const arc = arcData(span);
  if (!arc) return { first: null, curvature: null };
  const angle = end === 'start' ? arc.startAngle : arc.startAngle + arc.sweep;
  const direction = Math.sign(arc.sweep) || 1;
  const tangent = normalize({
    u: -arc.radiusU * Math.sin(angle) * direction,
    v: arc.radiusV * Math.cos(angle) * direction
  });
  const denominator = (arc.radiusU ** 2 * Math.sin(angle) ** 2 + arc.radiusV ** 2 * Math.cos(angle) ** 2) ** 1.5;
  return {
    first: tangent,
    curvature: denominator > 1e-15 ? (direction * arc.radiusU * arc.radiusV) / denominator : null
  };
}

function scaleOf(left: RouterProfileSegmentSpan, right: RouterProfileSegmentSpan): number {
  const lengths = [distance(left.from, left.segment.to), distance(right.from, right.segment.to)];
  if (left.segment.kind === 'cubicBezier')
    lengths.push(distance(left.from, left.segment.control1), distance(left.segment.control2, left.segment.to));
  if (right.segment.kind === 'cubicBezier')
    lengths.push(distance(right.from, right.segment.control1), distance(right.segment.control2, right.segment.to));
  return Math.max(1e-12, ...lengths);
}

export function analyzeRouterProfileJoin(
  left: RouterProfileSegmentSpan,
  right: RouterProfileSegmentSpan,
  joinIndex = 0,
  options: Partial<RouterProfileContinuityTolerances> = {}
): RouterProfileJoinDiagnostic {
  const tolerance = { ...DEFAULTS, ...options };
  const scale = scaleOf(left, right);
  const gap = distance(left.segment.to, right.from);
  const point = { u: (left.segment.to.u + right.from.u) / 2, v: (left.segment.to.v + right.from.v) / 2 };
  if (
    ![point.u, point.v, gap, scale].every(Number.isFinite) ||
    Math.max(Math.abs(point.u), Math.abs(point.v)) > tolerance.maxCoordinate
  )
    return {
      joinIndex,
      point,
      continuity: 'disconnected',
      gap: Number.isFinite(gap) ? gap : Infinity,
      angleDiscontinuity: null,
      signedCurvatureBefore: null,
      signedCurvatureAfter: null,
      normalizedCurvatureDiscontinuity: null,
      message: 'Join coordinates are non-finite or exceed the analysis bound.'
    };
  if (gap > tolerance.relativePosition * scale)
    return {
      joinIndex,
      point,
      continuity: 'disconnected',
      gap,
      angleDiscontinuity: null,
      signedCurvatureBefore: null,
      signedCurvatureAfter: null,
      normalizedCurvatureDiscontinuity: null,
      message: 'Segment endpoints are disconnected.'
    };
  const before = derivatives(left, 'end');
  const after = derivatives(right, 'start');
  const angle =
    before.first && after.first
      ? Math.atan2(Math.abs(cross(before.first, after.first)), dot(before.first, after.first))
      : null;
  if (angle === null || angle > tolerance.angleRadians)
    return {
      joinIndex,
      point,
      continuity: 'g0_corner',
      gap,
      angleDiscontinuity: angle,
      signedCurvatureBefore: before.curvature,
      signedCurvatureAfter: after.curvature,
      normalizedCurvatureDiscontinuity: null,
      message:
        angle === null
          ? 'Join is positional but has a degenerate tangent handle.'
          : `Intentional or unsmoothed corner (${angle} rad tangent change).`
    };
  const curvatureDifference =
    before.curvature === null || after.curvature === null ? null : Math.abs(before.curvature - after.curvature) * scale;
  if (curvatureDifference === null || curvatureDifference > tolerance.normalizedCurvature)
    return {
      joinIndex,
      point,
      continuity: 'g1_tangent',
      gap,
      angleDiscontinuity: angle,
      signedCurvatureBefore: before.curvature,
      signedCurvatureAfter: after.curvature,
      normalizedCurvatureDiscontinuity: curvatureDifference,
      message: 'Tangents align, but signed curvature changes at the join.'
    };
  return {
    joinIndex,
    point,
    continuity: 'g2_curvature',
    gap,
    angleDiscontinuity: angle,
    signedCurvatureBefore: before.curvature,
    signedCurvatureAfter: after.curvature,
    normalizedCurvatureDiscontinuity: curvatureDifference,
    message: 'Tangents and signed curvature are continuous within tolerance.'
  };
}

export function analyzeRouterProfileContinuity(
  profile: RouterProfileDefinition,
  options: Partial<RouterProfileContinuityTolerances> = {}
): RouterProfileJoinDiagnostic[] {
  const requested = options.maxJoins ?? DEFAULTS.maxJoins;
  const maxJoins = Number.isFinite(requested) ? Math.max(0, Math.min(Math.floor(requested), DEFAULTS.maxJoins)) : 0;
  const spans: RouterProfileSegmentSpan[] = [];
  let from = profile.boundary.start;
  for (const segment of profile.boundary.segments) {
    spans.push({ from, segment });
    from = segment.to;
  }
  return spans
    .slice(0, Math.min(Math.max(0, spans.length - 1), maxJoins))
    .map((span, index) => analyzeRouterProfileJoin(span, spans[index + 1], index, options));
}

export interface TangentEnforcementOptions {
  anchor?: 'left' | 'right';
  mode?: 'aligned' | 'mirrored';
  maxHandleLength?: number;
}
export interface TangentEnforcementResult {
  left: RouterProfileSegmentSpan;
  right: RouterProfileSegmentSpan;
  changed: boolean;
  recommendation?: string;
}
const cloneSpan = (span: RouterProfileSegmentSpan): RouterProfileSegmentSpan => ({
  from: { ...span.from },
  segment:
    span.segment.kind === 'cubicBezier'
      ? {
          ...span.segment,
          control1: { ...span.segment.control1 },
          control2: { ...span.segment.control2 },
          to: { ...span.segment.to }
        }
      : { ...span.segment, to: { ...span.segment.to } }
});

export function enforceRouterProfileJoinTangent(
  leftInput: RouterProfileSegmentSpan,
  rightInput: RouterProfileSegmentSpan,
  options: TangentEnforcementOptions = {}
): TangentEnforcementResult {
  const left = cloneSpan(leftInput),
    right = cloneSpan(rightInput);
  const join = left.segment.to;
  if (distance(join, right.from) > 1e-8 * scaleOf(left, right))
    return { left, right, changed: false, recommendation: 'Connect the segment endpoints before enforcing tangency.' };
  if (
    left.segment.kind === 'arc' ||
    left.segment.kind === 'ellipseArc' ||
    right.segment.kind === 'arc' ||
    right.segment.kind === 'ellipseArc'
  )
    return {
      left,
      right,
      changed: false,
      recommendation:
        'Convert the adjacent arc or ellipse to cubic Beziers before editing tangency so its radius is not silently changed.'
    };
  const anchor = options.anchor ?? 'left',
    mode = options.mode ?? 'aligned',
    cap = Math.max(0, options.maxHandleLength ?? 1e9);
  const leftDirection = derivatives(left, 'end').first,
    rightDirection = derivatives(right, 'start').first;
  const chosen = anchor === 'left' ? leftDirection : rightDirection;
  if (!chosen)
    return {
      left,
      right,
      changed: false,
      recommendation: 'The chosen anchor has no stable tangent; move its control handle first.'
    };
  const leftHandle = left.segment.kind === 'cubicBezier' ? distance(left.segment.control2, join) : 0;
  const rightHandle = right.segment.kind === 'cubicBezier' ? distance(right.from, right.segment.control1) : 0;
  if (anchor === 'left' && right.segment.kind === 'cubicBezier') {
    const length = Math.min(mode === 'mirrored' && left.segment.kind === 'cubicBezier' ? leftHandle : rightHandle, cap);
    right.segment.control1 = { u: right.from.u + chosen.u * length, v: right.from.v + chosen.v * length };
    return { left, right, changed: true };
  }
  if (anchor === 'right' && left.segment.kind === 'cubicBezier') {
    const length = Math.min(
      mode === 'mirrored' && right.segment.kind === 'cubicBezier' ? rightHandle : leftHandle,
      cap
    );
    left.segment.control2 = { u: join.u - chosen.u * length, v: join.v - chosen.v * length };
    return { left, right, changed: true };
  }
  return {
    left,
    right,
    changed: false,
    recommendation:
      'Tangency enforcement requires at least one cubic segment; line-line corners are already fully constrained.'
  };
}

/** Optional authoring-quality text; never use as runtime validity. */
export function getRouterProfileContinuityQualityInfo(profile: RouterProfileDefinition): string[] {
  return analyzeRouterProfileContinuity(profile)
    .filter(
      ({ continuity }) => continuity === 'disconnected' || continuity === 'g0_corner' || continuity === 'g1_tangent'
    )
    .map(({ joinIndex, continuity, message }) => `Join ${joinIndex + 1} (${continuity}): ${message}`);
}
