import type { EdgeProfileFeature, RouterProfileDefinition, RouterProfilePoint, RouterProfileSegment } from '../types';
import { evaluateRouterProfileBoundary } from './edgeProfileShape';
import { validateRouterProfileContour } from './routerProfileDxf';
import { canonicalJson } from '../../../shared/canonicalJson';

const MAX_PROFILE_SEGMENTS = 2048;
const MAX_PROFILE_PARAMETERS = 256;
const MAX_PROFILE_COORDINATE = 1000;
const PROFILE_KEYS = new Set([
  'version',
  'revision',
  'id',
  'name',
  'family',
  'source',
  'manufacturer',
  'sku',
  'sourceUrl',
  'parameters',
  'boundary'
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Stable, synchronous content checksum suitable for project/library drift detection. */
export function getDefinitionRevision(value: object): string {
  let input: string;
  try {
    input = canonicalJson(value, ['revision']);
  } catch {
    return 'invalid:complex-definition';
  }
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}

export function getRouterProfileRevision(profile: RouterProfileDefinition): string {
  return getDefinitionRevision(profile);
}

function isPoint(value: unknown): value is RouterProfilePoint {
  return (
    isRecord(value) &&
    Object.keys(value).every((key) => key === 'u' || key === 'v') &&
    isFiniteNumber(value.u) &&
    Math.abs(value.u) <= MAX_PROFILE_COORDINATE &&
    isFiniteNumber(value.v) &&
    Math.abs(value.v) <= MAX_PROFILE_COORDINATE
  );
}

function validateSegment(value: unknown, path: string): string[] {
  if (!isRecord(value) || !isPoint(value.to)) return [`${path} is invalid`];
  const allowed =
    value.kind === 'line'
      ? new Set(['kind', 'to'])
      : value.kind === 'cubicBezier'
        ? new Set(['kind', 'to', 'control1', 'control2'])
        : value.kind === 'arc'
          ? new Set(['kind', 'to', 'radius', 'clockwise'])
          : value.kind === 'ellipseArc'
            ? new Set(['kind', 'to', 'radiusU', 'radiusV', 'clockwise'])
            : new Set<string>();
  if (Object.keys(value).some((key) => !allowed.has(key))) return [`${path} has unsupported properties`];
  if (value.kind === 'line') return [];
  if (value.kind === 'cubicBezier') {
    const errors: string[] = [];
    if (!isPoint(value.control1)) errors.push(`${path}.control1 is invalid`);
    if (!isPoint(value.control2)) errors.push(`${path}.control2 is invalid`);
    return errors;
  }
  if (value.kind === 'arc') {
    const errors: string[] = [];
    if (!isFiniteNumber(value.radius) || value.radius <= 0 || value.radius > MAX_PROFILE_COORDINATE)
      errors.push(`${path}.radius is invalid`);
    if (typeof value.clockwise !== 'boolean') errors.push(`${path}.clockwise is invalid`);
    return errors;
  }
  if (value.kind === 'ellipseArc') {
    const errors: string[] = [];
    if (!isFiniteNumber(value.radiusU) || value.radiusU <= 0 || value.radiusU > MAX_PROFILE_COORDINATE)
      errors.push(`${path}.radiusU is invalid`);
    if (!isFiniteNumber(value.radiusV) || value.radiusV <= 0 || value.radiusV > MAX_PROFILE_COORDINATE)
      errors.push(`${path}.radiusV is invalid`);
    if (typeof value.clockwise !== 'boolean') errors.push(`${path}.clockwise is invalid`);
    return errors;
  }
  return [`${path}.kind is invalid`];
}

export function validateRouterProfileDefinition(value: unknown, path = 'routerProfile'): string[] {
  if (!isRecord(value)) return [`${path} is invalid`];
  const errors: string[] = [];
  if (Object.keys(value).some((key) => !PROFILE_KEYS.has(key))) errors.push(`${path} has unsupported properties`);
  if (value.version !== 1) errors.push(`${path}.version is invalid`);
  if (
    value.revision !== undefined &&
    (typeof value.revision !== 'string' || value.revision !== getDefinitionRevision(value))
  )
    errors.push(`${path}.revision does not match its content`);
  for (const key of ['id', 'name', 'family'] as const) {
    if (typeof value[key] !== 'string' || value[key].trim().length === 0) errors.push(`${path}.${key} is invalid`);
  }
  if (value.source !== 'generic' && value.source !== 'manufacturer') errors.push(`${path}.source is invalid`);
  for (const key of ['manufacturer', 'sku', 'sourceUrl'] as const) {
    if (value[key] !== undefined && (typeof value[key] !== 'string' || value[key].trim().length === 0))
      errors.push(`${path}.${key} is invalid`);
  }
  if (!isRecord(value.parameters) || Object.keys(value.parameters).length > MAX_PROFILE_PARAMETERS) {
    errors.push(`${path}.parameters is invalid`);
  } else {
    for (const [key, parameter] of Object.entries(value.parameters)) {
      if (
        key.trim().length === 0 ||
        (typeof parameter !== 'string' && (!isFiniteNumber(parameter) || Math.abs(parameter) > MAX_PROFILE_COORDINATE))
      )
        errors.push(`${path}.parameters.${key || '(empty)'} is invalid`);
    }
  }
  if (
    !isRecord(value.boundary) ||
    Object.keys(value.boundary).some((key) => key !== 'start' && key !== 'segments') ||
    !isPoint(value.boundary.start) ||
    !Array.isArray(value.boundary.segments)
  ) {
    errors.push(`${path}.boundary is invalid`);
  } else if (value.boundary.segments.length === 0 || value.boundary.segments.length > MAX_PROFILE_SEGMENTS) {
    errors.push(`${path}.boundary.segments is invalid`);
  } else {
    value.boundary.segments.forEach((segment, index) => {
      errors.push(...validateSegment(segment, `${path}.boundary.segments[${index}]`));
    });
    let from = value.boundary.start;
    value.boundary.segments.forEach((segment, index) => {
      if (!isRecord(segment) || !isPoint(segment.to)) return;
      if (
        segment.kind === 'cubicBezier' &&
        isPoint(segment.control1) &&
        isPoint(segment.control2) &&
        [segment.control1, segment.control2, segment.to].every(
          (point) => Math.hypot(point.u - from.u, point.v - from.v) <= Number.EPSILON
        )
      ) {
        errors.push(`${path}.boundary.segments[${index}] is degenerate`);
      }
      from = segment.to;
    });
  }
  return errors;
}

export function isRouterProfileDefinition(value: unknown): value is RouterProfileDefinition {
  return validateRouterProfileDefinition(value).length === 0;
}

const EDGE_ENDPOINT_TOLERANCE = 1e-7;

function polygonSelfIntersects(points: Array<{ x: number; y: number }>): boolean {
  const orientation = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  for (let first = 0; first < points.length; first += 1) {
    const firstNext = (first + 1) % points.length;
    for (let second = first + 1; second < points.length; second += 1) {
      const secondNext = (second + 1) % points.length;
      if (first === second || firstNext === second || secondNext === first) continue;
      if (first === 0 && secondNext === 0) continue;
      if (
        orientation(points[first], points[firstNext], points[second]) *
          orientation(points[first], points[firstNext], points[secondNext]) <
          0 &&
        orientation(points[second], points[secondNext], points[first]) *
          orientation(points[second], points[secondNext], points[firstNext]) <
          0
      )
        return true;
    }
  }
  return false;
}

/**
 * Validate that a structurally sound definition also describes material
 * removed from a stock corner: one endpoint on each incident axis and a
 * non-degenerate, non-crossing polygon when closed through that corner.
 */
export function validateEdgeRouterProfileDefinition(value: unknown, path = 'routerProfile'): string[] {
  const errors = validateRouterProfileDefinition(value, path);
  if (errors.length || !isRouterProfileDefinition(value)) return errors;
  const start = value.boundary.start;
  const end = value.boundary.segments.at(-1)!.to;
  const atCorner = (point: RouterProfilePoint) =>
    Math.abs(point.u) <= EDGE_ENDPOINT_TOLERANCE && Math.abs(point.v) <= EDGE_ENDPOINT_TOLERANCE;
  const onUAxis = (point: RouterProfilePoint) => Math.abs(point.v) <= EDGE_ENDPOINT_TOLERANCE;
  const onVAxis = (point: RouterProfilePoint) => Math.abs(point.u) <= EDGE_ENDPOINT_TOLERANCE;
  if (atCorner(start) || atCorner(end)) {
    errors.push(`${path} endpoints must be away from the stock corner so the profile removes a measurable area`);
  }
  if (!((onUAxis(start) && onVAxis(end)) || (onVAxis(start) && onUAxis(end)))) {
    errors.push(
      `${path} must start on one stock face axis and end on the other; set one endpoint U to 0 and the other endpoint V to 0`
    );
  }
  const contour = validateRouterProfileContour({
    start,
    segments: value.boundary.segments,
    closed: false
  });
  if (contour.selfIntersects) errors.push(`${path} crosses itself; reorder or adjust the segments before saving`);
  const points = evaluateRouterProfileBoundary(value);
  // The removal polygon follows the authored boundary, then returns along
  // the two incident stock faces through their shared (0,0) corner.
  const removalPolygon = [...points, { x: 0, y: 0 }];
  if (polygonSelfIntersects(removalPolygon)) {
    errors.push(`${path} removal boundary crosses itself or a stock face; adjust the segment endpoints before saving`);
  }
  const area = Math.abs(
    removalPolygon.reduce((sum, point, index) => {
      const next = removalPolygon[(index + 1) % removalPolygon.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0) / 2
  );
  if (!(area > EDGE_ENDPOINT_TOLERANCE ** 2)) {
    errors.push(`${path} encloses no material-removal area; move the endpoints apart on the two stock faces`);
  }
  return [...new Set(errors)];
}

function cloneSegment(segment: RouterProfileSegment): RouterProfileSegment {
  return segment.kind === 'cubicBezier'
    ? { ...segment, control1: { ...segment.control1 }, control2: { ...segment.control2 }, to: { ...segment.to } }
    : { ...segment, to: { ...segment.to } };
}

export function cloneRouterProfileDefinition(profile: RouterProfileDefinition): RouterProfileDefinition {
  const clone: RouterProfileDefinition = {
    ...profile,
    parameters: { ...profile.parameters },
    boundary: {
      start: { ...profile.boundary.start },
      segments: profile.boundary.segments.map(cloneSegment)
    }
  };
  if (profile.revision !== undefined) clone.revision = getRouterProfileRevision(clone);
  return clone;
}

export function withRouterProfileRevision(profile: RouterProfileDefinition): RouterProfileDefinition {
  const clone = cloneRouterProfileDefinition(profile);
  clone.revision = getRouterProfileRevision(clone);
  return clone;
}

export function parseRouterProfileLibrary(value: unknown): RouterProfileDefinition[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((candidate) => {
    if (!isRouterProfileDefinition(candidate) || seen.has(candidate.id)) return [];
    seen.add(candidate.id);
    return [withRouterProfileRevision(candidate)];
  });
}

export type LibraryReferenceStatus = 'unreferenced' | 'current' | 'changed' | 'missing';

export function getEdgeProfileLibraryStatus(
  feature: Pick<EdgeProfileFeature, 'routerProfileId' | 'routerProfileRevision' | 'routerProfileSnapshot'>,
  library: readonly RouterProfileDefinition[]
): LibraryReferenceStatus {
  if (!feature.routerProfileId) return 'unreferenced';
  const current = library.find((profile) => profile.id === feature.routerProfileId);
  if (!current) return 'missing';
  const projectRevision =
    feature.routerProfileRevision ??
    (feature.routerProfileSnapshot ? getRouterProfileRevision(feature.routerProfileSnapshot) : undefined);
  return projectRevision === getRouterProfileRevision(current) ? 'current' : 'changed';
}

/** Resolve project geometry without ever replacing an embedded snapshot from library state. */
export function resolveEdgeProfileSnapshot(
  feature: Pick<EdgeProfileFeature, 'routerProfileId' | 'routerProfileSnapshot'>,
  library: readonly RouterProfileDefinition[]
): RouterProfileDefinition | undefined {
  if (feature.routerProfileSnapshot) return cloneRouterProfileDefinition(feature.routerProfileSnapshot);
  const current = library.find((profile) => profile.id === feature.routerProfileId);
  return current ? cloneRouterProfileDefinition(current) : undefined;
}

const PROFILE_FILE_FORMAT = 'carvd-router-profile';

/** Lossless, versioned interchange for a single canonical router profile. */
export function stringifyRouterProfileFile(profile: RouterProfileDefinition): string {
  const errors = validateEdgeRouterProfileDefinition(profile);
  if (errors.length) throw new Error(errors.join('; '));
  return JSON.stringify(
    { format: PROFILE_FILE_FORMAT, version: 1, profile: cloneRouterProfileDefinition(profile) },
    null,
    2
  );
}

export function parseRouterProfileFile(text: string): RouterProfileDefinition {
  if (text.length > 1024 * 1024) throw new Error('Router profile file exceeds the 1 MiB limit.');
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('This is not valid JSON.');
  }
  if (
    !isRecord(value) ||
    Object.keys(value).some((key) => !['format', 'version', 'profile'].includes(key)) ||
    value.format !== PROFILE_FILE_FORMAT
  )
    throw new Error('This is not a Carvd router profile file.');
  if (value.version !== 1) throw new Error(`Router profile file version ${String(value.version)} is not supported.`);
  const errors = validateEdgeRouterProfileDefinition(value.profile, 'profile');
  if (errors.length) throw new Error(errors.join('; '));
  return cloneRouterProfileDefinition(value.profile as RouterProfileDefinition);
}
