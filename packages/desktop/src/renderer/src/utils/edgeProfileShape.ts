import type {
  EdgeProfile,
  EdgeProfileFeature,
  RouterProfileDefinition,
  RouterProfilePoint,
  RouterProfileSegment
} from '../types';
import { BUILT_IN_ROUTER_PROFILE_REGISTRY, type BuiltInEdgeProfile } from './routerProfileBuiltins';

export interface EdgeProfilePoint {
  x: number;
  y: number;
}

export interface RouterProfileEvaluationOptions {
  chordError?: number;
  maxSegments?: number;
}

const DEFAULT_CHORD_ERROR = 0.001;
const DEFAULT_MAX_SEGMENTS = 4096;

function arcCenter(
  from: RouterProfilePoint,
  to: RouterProfilePoint,
  radiusU: number,
  radiusV: number,
  clockwise: boolean
): { center: RouterProfilePoint; startAngle: number; sweep: number } | null {
  const a = { u: from.u / radiusU, v: from.v / radiusV };
  const b = { u: to.u / radiusU, v: to.v / radiusV };
  const du = b.u - a.u;
  const dv = b.v - a.v;
  const chord = Math.hypot(du, dv);
  if (!(chord > 1e-12) || chord > 2 + 1e-9) return null;
  const midpoint = { u: (a.u + b.u) / 2, v: (a.v + b.v) / 2 };
  const height = Math.sqrt(Math.max(0, 1 - (chord / 2) ** 2));
  const perpendicular = { u: -dv / chord, v: du / chord };
  const centers = [1, -1].map((sign) => ({
    u: midpoint.u + perpendicular.u * height * sign,
    v: midpoint.v + perpendicular.v * height * sign
  }));
  for (const normalizedCenter of centers) {
    const startAngle = Math.atan2(a.v - normalizedCenter.v, a.u - normalizedCenter.u);
    const endAngle = Math.atan2(b.v - normalizedCenter.v, b.u - normalizedCenter.u);
    let sweep = endAngle - startAngle;
    while (sweep <= -Math.PI) sweep += Math.PI * 2;
    while (sweep > Math.PI) sweep -= Math.PI * 2;
    if ((clockwise && sweep <= 1e-12) || (!clockwise && sweep >= -1e-12)) {
      return {
        center: { u: normalizedCenter.u * radiusU, v: normalizedCenter.v * radiusV },
        startAngle,
        sweep
      };
    }
  }
  return null;
}

function evaluateSegment(
  from: RouterProfilePoint,
  segment: RouterProfileSegment,
  chordError: number,
  remainingSegments: number
): RouterProfilePoint[] {
  if (segment.kind === 'line') return [{ ...segment.to }];
  if (segment.kind === 'cubicBezier') {
    // Iterative de Casteljau subdivision. The flatness metric is the maximum
    // control-point distance from the endpoint chord, bounded by chordError.
    const result: RouterProfilePoint[] = [];
    const stack = [{ p0: from, p1: segment.control1, p2: segment.control2, p3: segment.to, depth: 0 }];
    const midpoint = (a: RouterProfilePoint, b: RouterProfilePoint): RouterProfilePoint => ({
      u: (a.u + b.u) / 2,
      v: (a.v + b.v) / 2
    });
    const lineDistance = (point: RouterProfilePoint, a: RouterProfilePoint, b: RouterProfilePoint): number => {
      const du = b.u - a.u;
      const dv = b.v - a.v;
      const length = Math.hypot(du, dv);
      return length > 1e-15
        ? Math.abs(du * (a.v - point.v) - (a.u - point.u) * dv) / length
        : Math.hypot(point.u - a.u, point.v - a.v);
    };
    while (stack.length) {
      const curve = stack.pop()!;
      const flatness = Math.max(lineDistance(curve.p1, curve.p0, curve.p3), lineDistance(curve.p2, curve.p0, curve.p3));
      if (flatness <= chordError || curve.depth >= 24) {
        result.push({ ...curve.p3 });
        if (result.length > remainingSegments) return [];
        continue;
      }
      const p01 = midpoint(curve.p0, curve.p1);
      const p12 = midpoint(curve.p1, curve.p2);
      const p23 = midpoint(curve.p2, curve.p3);
      const p012 = midpoint(p01, p12);
      const p123 = midpoint(p12, p23);
      const split = midpoint(p012, p123);
      if (stack.length + result.length + 2 > remainingSegments * 2 + 1) return [];
      stack.push({ p0: split, p1: p123, p2: p23, p3: curve.p3, depth: curve.depth + 1 });
      stack.push({ p0: curve.p0, p1: p01, p2: p012, p3: split, depth: curve.depth + 1 });
    }
    if (result.length) result[result.length - 1] = { ...segment.to };
    return result;
  }
  const radiusU = segment.kind === 'arc' ? segment.radius : segment.radiusU;
  const radiusV = segment.kind === 'arc' ? segment.radius : segment.radiusV;
  const arc = arcCenter(from, segment.to, radiusU, radiusV, segment.clockwise);
  if (!arc) return [];
  const effectiveRadius = Math.max(radiusU, radiusV);
  const clampedError = Math.min(Math.max(chordError, Number.EPSILON), effectiveRadius);
  const maxAngle = 2 * Math.acos(Math.max(-1, 1 - clampedError / effectiveRadius));
  const count = Math.max(1, Math.ceil(Math.abs(arc.sweep) / maxAngle));
  if (count > remainingSegments) return [];
  const points = Array.from({ length: count }, (_, index) => {
    const angle = arc.startAngle + (arc.sweep * (index + 1)) / count;
    return {
      u: arc.center.u + radiusU * Math.cos(angle),
      v: arc.center.v + radiusV * Math.sin(angle)
    };
  });
  points[points.length - 1] = { ...segment.to };
  return points;
}

/** The one canonical semantic-boundary evaluator used by previews and CSG. */
export function evaluateRouterProfileBoundary(
  profile: RouterProfileDefinition,
  options: RouterProfileEvaluationOptions = {}
): EdgeProfilePoint[] {
  const chordError = options.chordError ?? DEFAULT_CHORD_ERROR;
  const requestedMaxSegments = options.maxSegments ?? DEFAULT_MAX_SEGMENTS;
  if (!Number.isFinite(requestedMaxSegments) || requestedMaxSegments < 1) return [];
  const maxSegments = Math.max(1, Math.min(Math.floor(requestedMaxSegments), DEFAULT_MAX_SEGMENTS));
  if (!(chordError > 0) || !Number.isFinite(chordError)) return [];
  const points: RouterProfilePoint[] = [{ ...profile.boundary.start }];
  let from = profile.boundary.start;
  for (const segment of profile.boundary.segments) {
    const remaining = maxSegments - points.length + 1;
    if (remaining <= 0) return [];
    const evaluated = evaluateSegment(from, segment, chordError, remaining);
    if (!evaluated.length) return [];
    points.push(...evaluated);
    if (points.length > maxSegments + 1) return [];
    from = segment.to;
  }
  return points.map(({ u, v }) => ({ x: u, y: v }));
}

/**
 * Boundary left behind by an edge-profile cutter, in normalized cross-section
 * coordinates. X runs inward from the stock edge along the first face and Y
 * runs inward along the second face. Geometry and selector diagrams consume
 * this same boundary so the advertised and modeled profiles cannot diverge.
 */
export function getNormalizedEdgeProfileBoundary(profile: EdgeProfile, segments = 16): EdgeProfilePoint[] {
  if (profile === 'custom') return [];
  const chordError = 1 - Math.cos(Math.PI / (Math.max(1, segments) * 2));
  return evaluateRouterProfileBoundary(BUILT_IN_ROUTER_PROFILE_REGISTRY[profile].definition, {
    chordError,
    maxSegments: Math.max(segments * 4, 8)
  });
}

export function getEdgeProfileBoundary(
  profile: EdgeProfile,
  size: number,
  depth: number,
  segments = 16
): EdgeProfilePoint[] {
  if (profile === 'custom') return [];
  const adapted = adaptBuiltInRouterProfile(profile, size, depth);
  const chordError = Math.max(size, depth) * (1 - Math.cos(Math.PI / (Math.max(1, segments) * 2)));
  return evaluateRouterProfileBoundary(adapted, { chordError, maxSegments: Math.max(segments * 8, 16) });
}

export function adaptBuiltInRouterProfile(
  profile: BuiltInEdgeProfile,
  size: number,
  depth: number
): RouterProfileDefinition {
  const registration = BUILT_IN_ROUTER_PROFILE_REGISTRY[profile];
  const base = registration.definition;
  if (registration.adaptation === 'circular-with-flats') {
    const radius = Math.min(size, depth);
    const segments: RouterProfileSegment[] = [];
    if (size > radius) segments.push({ kind: 'line', to: { u: radius, v: 0 } });
    const semanticArc = base.boundary.segments.find((segment) => segment.kind === 'arc');
    if (!semanticArc) return { ...base, boundary: { start: { u: size, v: 0 }, segments: [] } };
    segments.push({ kind: 'arc', to: { u: 0, v: radius }, radius, clockwise: semanticArc.clockwise });
    if (depth > radius) segments.push({ kind: 'line', to: { u: 0, v: depth } });
    return {
      ...base,
      parameters: {
        ...base.parameters,
        size,
        depth,
        radius,
        unequalDimensions: size === depth ? 'false' : 'straight-reveals'
      },
      boundary: { start: { u: size, v: 0 }, segments }
    };
  }
  const mapPoint = ({ u, v }: RouterProfilePoint): RouterProfilePoint => ({ u: u * size, v: v * depth });
  const segments = base.boundary.segments.map((segment): RouterProfileSegment => {
    const to = mapPoint(segment.to);
    if (segment.kind === 'line') return { kind: 'line', to };
    if (segment.kind === 'cubicBezier')
      return { kind: 'cubicBezier', control1: mapPoint(segment.control1), control2: mapPoint(segment.control2), to };
    const radiusU = (segment.kind === 'arc' ? segment.radius : segment.radiusU) * size;
    const radiusV = (segment.kind === 'arc' ? segment.radius : segment.radiusV) * depth;
    if (segment.kind === 'arc' && Math.abs(radiusU - radiusV) < 1e-12)
      return { kind: 'arc', to, radius: radiusU, clockwise: segment.clockwise };
    return { kind: 'ellipseArc', to, radiusU, radiusV, clockwise: segment.clockwise };
  });
  return {
    ...base,
    parameters: { ...base.parameters, size, depth },
    boundary: { start: mapPoint(base.boundary.start), segments }
  };
}

export function getEdgeProfileFeatureBoundary(
  feature: EdgeProfileFeature,
  options?: RouterProfileEvaluationOptions
): EdgeProfilePoint[] {
  if (feature.profile === 'custom') {
    return feature.routerProfileSnapshot ? evaluateRouterProfileBoundary(feature.routerProfileSnapshot, options) : [];
  }
  return getEdgeProfileBoundary(feature.profile, feature.parameters.size, feature.parameters.depth);
}
