import type {
  EdgeProfileFeature,
  RouterProfileDefinition,
  RouterToolAxialSection,
  RouterToolDefinition
} from '../types';
import {
  cloneRouterProfileDefinition,
  getDefinitionRevision,
  getRouterProfileRevision,
  validateEdgeRouterProfileDefinition,
  type LibraryReferenceStatus
} from './routerProfiles';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function positive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

const MAX_SECTIONS = 64;
const MAX_TOOL_DIMENSION = 1000;
const SECTION_ROLES = new Set(['cutter', 'neck', 'shank', 'bearing']);
const TOOL_KEYS = new Set([
  'version',
  'revision',
  'id',
  'name',
  'source',
  'manufacturer',
  'sku',
  'sourceUrl',
  'profileFamily',
  'routerProfileId',
  'cutterDiameter',
  'shankDiameter',
  'cuttingHeight',
  'neckDiameter',
  'bearingDiameter',
  'producedProfiles',
  'envelopeVersion',
  'sections',
  'overallLength',
  'safeColletInsertion'
]);
const MAX_PRODUCED_PROFILES = 32;

function validDimension(value: unknown): value is number {
  return positive(value) && value <= MAX_TOOL_DIMENSION;
}

function validateLinkedProfile(value: Record<string, unknown>, path: string): string[] {
  const errors: string[] = [];
  if (typeof value.profileRevision !== 'string') errors.push(`${path}.profileRevision is invalid`);
  const profileErrors = validateEdgeRouterProfileDefinition(value.profileSnapshot, `${path}.profileSnapshot`);
  errors.push(...profileErrors);
  if (isRecord(value.profileSnapshot)) {
    if (value.profileSnapshot.id !== value.profileId) errors.push(`${path}.profileId must match profileSnapshot.id`);
    if (value.profileRevision !== getDefinitionRevision(value.profileSnapshot))
      errors.push(`${path}.profileRevision must match profileSnapshot`);
  }
  if (value.nominalSize !== undefined && !validDimension(value.nominalSize))
    errors.push(`${path}.nominalSize is invalid`);
  if (value.applicability !== undefined) {
    if (
      !isRecord(value.applicability) ||
      Object.keys(value.applicability).some((key) => !['scalable', 'minScale', 'maxScale'].includes(key)) ||
      typeof value.applicability.scalable !== 'boolean'
    ) {
      errors.push(`${path}.applicability is invalid`);
    } else {
      const min = value.applicability.minScale;
      const max = value.applicability.maxScale;
      if (min !== undefined && !validDimension(min)) errors.push(`${path}.applicability.minScale is invalid`);
      if (max !== undefined && !validDimension(max)) errors.push(`${path}.applicability.maxScale is invalid`);
      if (positive(min) && positive(max) && min > max) errors.push(`${path}.applicability scale range is invalid`);
      if (!value.applicability.scalable && (min !== undefined || max !== undefined))
        errors.push(`${path}.applicability scale range requires scalable`);
    }
  }
  return errors;
}

function validateSections(value: unknown, tool: Record<string, unknown>, path: string): string[] {
  if (value === undefined) return [];
  if (tool.envelopeVersion !== 1) return [`${path}.envelopeVersion is invalid`];
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_SECTIONS)
    return [`${path}.sections is invalid`];
  const errors: string[] = [];
  const sections: RouterToolAxialSection[] = [];
  value.forEach((candidate, index) => {
    const sectionPath = `${path}.sections[${index}]`;
    if (!isRecord(candidate) || !SECTION_ROLES.has(String(candidate.role))) {
      errors.push(`${sectionPath} is invalid`);
      return;
    }
    if (Object.keys(candidate).some((key) => !['role', 'start', 'end', 'diameter', 'stackable'].includes(key)))
      errors.push(`${sectionPath} has unsupported properties`);
    if (
      typeof candidate.start !== 'number' ||
      !Number.isFinite(candidate.start) ||
      Math.abs(candidate.start) > MAX_TOOL_DIMENSION
    )
      errors.push(`${sectionPath}.start is invalid`);
    if (
      typeof candidate.end !== 'number' ||
      !Number.isFinite(candidate.end) ||
      Math.abs(candidate.end) > MAX_TOOL_DIMENSION ||
      (typeof candidate.start === 'number' && candidate.end <= candidate.start)
    )
      errors.push(`${sectionPath}.end is invalid`);
    if (!validDimension(candidate.diameter)) errors.push(`${sectionPath}.diameter is invalid`);
    if (candidate.stackable !== undefined && typeof candidate.stackable !== 'boolean')
      errors.push(`${sectionPath}.stackable is invalid`);
    if (candidate.role !== 'bearing' && candidate.stackable !== undefined)
      errors.push(`${sectionPath}.stackable is only valid for bearings`);
    sections.push(candidate as unknown as RouterToolAxialSection);
  });
  const structural = sections.filter((section) => section.role !== 'bearing');
  if (!structural.some((section) => section.role === 'cutter'))
    errors.push(`${path}.sections requires a cutter section`);
  structural.forEach((section, index) => {
    if (section.start < 0) errors.push(`${path}.sections structural offsets cannot be below the cutter tip`);
    if (index > 0 && section.start < structural[index - 1].end)
      errors.push(`${path}.sections structural sections must not overlap`);
  });
  for (const bearing of sections.filter((section) => section.role === 'bearing')) {
    if (!bearing.stackable && structural.some((section) => bearing.start < section.end && bearing.end > section.start))
      errors.push(`${path}.sections overlapping bearings must be explicitly stackable`);
  }
  const cutters = structural.filter((section) => section.role === 'cutter');
  if (cutters.length) {
    const cutterStart = Math.min(...cutters.map((section) => section.start));
    const cutterEnd = Math.max(...cutters.map((section) => section.end));
    const maxDiameter = Math.max(...cutters.map((section) => section.diameter));
    if (Math.abs(cutterStart) > 1e-7) errors.push(`${path}.sections cutter envelope must begin at tip offset 0`);
    if (positive(tool.cuttingHeight) && Math.abs(cutterEnd - Number(tool.cuttingHeight)) > 1e-7)
      errors.push(`${path}.sections cutter span must match cuttingHeight`);
    if (positive(tool.cutterDiameter) && Math.abs(maxDiameter - Number(tool.cutterDiameter)) > 1e-7)
      errors.push(`${path}.sections cutter diameter must match cutterDiameter`);
  }
  const roleDiameter = (role: 'neck' | 'shank' | 'bearing') => {
    const matching = sections.filter((section) => section.role === role);
    return matching.length ? Math.max(...matching.map((section) => section.diameter)) : undefined;
  };
  for (const [role, field] of [
    ['neck', 'neckDiameter'],
    ['shank', 'shankDiameter'],
    ['bearing', 'bearingDiameter']
  ] as const) {
    const detailed = roleDiameter(role);
    if (detailed !== undefined && !positive(tool[field])) errors.push(`${path}.sections ${role} requires ${field}`);
    if (detailed === undefined && positive(tool[field]) && role !== 'shank')
      errors.push(`${path}.sections must include a ${role} section when ${field} is set`);
    if (detailed !== undefined && positive(tool[field]) && Math.abs(detailed - Number(tool[field])) > 1e-7)
      errors.push(`${path}.sections ${role} diameter must match ${field}`);
  }
  const maxEnd = sections.reduce((maximum, section) => Math.max(maximum, section.end), 0);
  if (tool.overallLength !== undefined && (!validDimension(tool.overallLength) || Number(tool.overallLength) < maxEnd))
    errors.push(`${path}.overallLength must reach every axial section`);
  if (tool.safeColletInsertion !== undefined) {
    if (!validDimension(tool.safeColletInsertion)) errors.push(`${path}.safeColletInsertion is invalid`);
    const shankSpan = structural
      .filter((section) => section.role === 'shank')
      .reduce((total, section) => total + section.end - section.start, 0);
    if (validDimension(tool.safeColletInsertion) && tool.safeColletInsertion > shankSpan)
      errors.push(`${path}.safeColletInsertion exceeds the modeled shank span`);
  }
  return errors;
}

export function getRouterToolRevision(tool: RouterToolDefinition): string {
  return getDefinitionRevision(tool);
}

export function validateRouterToolDefinition(value: unknown, path = 'routerTool'): string[] {
  if (!isRecord(value)) return [`${path} is invalid`];
  const errors: string[] = [];
  if (Object.keys(value).some((key) => !TOOL_KEYS.has(key))) errors.push(`${path} has unsupported properties`);
  if (value.version !== 1) errors.push(`${path}.version is invalid`);
  if (
    value.revision !== undefined &&
    (typeof value.revision !== 'string' || value.revision !== getDefinitionRevision(value))
  )
    errors.push(`${path}.revision does not match its content`);
  for (const key of ['id', 'name', 'profileFamily'] as const) {
    if (typeof value[key] !== 'string' || value[key].trim().length === 0) errors.push(`${path}.${key} is invalid`);
  }
  if (value.source !== 'generic' && value.source !== 'manufacturer') errors.push(`${path}.source is invalid`);
  for (const key of ['manufacturer', 'sku', 'sourceUrl', 'routerProfileId'] as const) {
    if (value[key] !== undefined && (typeof value[key] !== 'string' || value[key].trim().length === 0))
      errors.push(`${path}.${key} is invalid`);
  }
  if (value.source === 'manufacturer') {
    if (typeof value.manufacturer !== 'string' || value.manufacturer.trim().length === 0)
      errors.push(`${path}.manufacturer is required for a manufacturer tool`);
    if (typeof value.sku !== 'string' || value.sku.trim().length === 0)
      errors.push(`${path}.sku is required for a manufacturer tool`);
  }
  if (value.producedProfiles !== undefined) {
    if (
      !Array.isArray(value.producedProfiles) ||
      value.producedProfiles.length === 0 ||
      value.producedProfiles.length > MAX_PRODUCED_PROFILES
    ) {
      errors.push(`${path}.producedProfiles is invalid`);
    } else {
      const seen = new Set<string>();
      value.producedProfiles.forEach((candidate, index) => {
        const itemPath = `${path}.producedProfiles[${index}]`;
        if (
          !isRecord(candidate) ||
          Object.keys(candidate).some(
            (key) => !['profileId', 'profileRevision', 'profileSnapshot', 'nominalSize', 'applicability'].includes(key)
          )
        ) {
          errors.push(`${itemPath} is invalid`);
          return;
        }
        if (typeof candidate.profileId !== 'string' || !candidate.profileId.trim() || seen.has(candidate.profileId))
          errors.push(`${itemPath}.profileId is invalid or duplicate`);
        else seen.add(candidate.profileId);
        const profileErrors = validateLinkedProfile(candidate, itemPath);
        errors.push(...profileErrors);
      });
    }
  }
  for (const key of ['cutterDiameter', 'shankDiameter', 'cuttingHeight'] as const) {
    if (!validDimension(value[key])) errors.push(`${path}.${key} is invalid`);
  }
  if (value.neckDiameter !== undefined) {
    if (!validDimension(value.neckDiameter)) errors.push(`${path}.neckDiameter is invalid`);
    else if (positive(value.cutterDiameter) && value.neckDiameter >= value.cutterDiameter)
      errors.push(`${path}.neckDiameter must be smaller than cutterDiameter`);
    else if (positive(value.shankDiameter) && value.neckDiameter > value.shankDiameter)
      errors.push(`${path}.neckDiameter cannot exceed shankDiameter`);
  }
  if (value.bearingDiameter !== undefined && !validDimension(value.bearingDiameter))
    errors.push(`${path}.bearingDiameter is invalid`);
  errors.push(...validateSections(value.sections, value, path));
  if (value.sections === undefined && value.envelopeVersion !== undefined)
    errors.push(`${path}.envelopeVersion requires sections`);
  if (value.sections === undefined) {
    if (value.overallLength !== undefined && !validDimension(value.overallLength))
      errors.push(`${path}.overallLength is invalid`);
    if (value.safeColletInsertion !== undefined && !validDimension(value.safeColletInsertion))
      errors.push(`${path}.safeColletInsertion is invalid`);
  }
  return errors;
}

export function cloneRouterToolDefinition(tool: RouterToolDefinition): RouterToolDefinition {
  const clone = {
    ...tool,
    sections: tool.sections?.map((section) => ({ ...section })),
    producedProfiles: tool.producedProfiles?.map((link) => ({
      ...link,
      applicability: link.applicability ? { ...link.applicability } : undefined,
      profileSnapshot: cloneRouterProfileDefinition(link.profileSnapshot)
    }))
  };
  if (tool.revision !== undefined) clone.revision = getRouterToolRevision(clone);
  return clone;
}

export interface NormalizedRouterToolEnvelope {
  precision: 'detailed' | 'legacy';
  sections: Array<RouterToolAxialSection & { end: number }>;
}

/** Normalize legacy summary fields without pretending unknown axial spans are measured. */
export function normalizeRouterToolEnvelope(tool: RouterToolDefinition): NormalizedRouterToolEnvelope {
  if (tool.sections?.length) {
    return { precision: 'detailed', sections: tool.sections.map((section) => ({ ...section })) };
  }
  const sections: NormalizedRouterToolEnvelope['sections'] = [
    { role: 'cutter', start: 0, end: tool.cuttingHeight, diameter: tool.cutterDiameter }
  ];
  // Legacy records do not say where the neck, shank, or bearing begins. Put
  // their conservative envelope above the cutter and mark precision=legacy.
  const legacyEnd = Number.POSITIVE_INFINITY;
  if (tool.neckDiameter)
    sections.push({ role: 'neck', start: tool.cuttingHeight, end: legacyEnd, diameter: tool.neckDiameter });
  sections.push({ role: 'shank', start: tool.cuttingHeight, end: legacyEnd, diameter: tool.shankDiameter });
  if (tool.bearingDiameter)
    sections.push({
      role: 'bearing',
      start: tool.cuttingHeight,
      end: legacyEnd,
      diameter: tool.bearingDiameter,
      stackable: true
    });
  return { precision: 'legacy', sections };
}

export interface RouterToolRadialEnvelope {
  radius: number;
  roles: RouterToolAxialSection['role'][];
  precision: 'detailed' | 'legacy';
}

export function getRouterToolRadialEnvelopeAt(
  tool: RouterToolDefinition,
  axialOffset: number
): RouterToolRadialEnvelope {
  const normalized = normalizeRouterToolEnvelope(tool);
  const active = normalized.sections.filter((section) => axialOffset >= section.start && axialOffset <= section.end);
  return {
    radius: active.reduce((maximum, section) => Math.max(maximum, section.diameter / 2), 0),
    roles: [...new Set(active.map((section) => section.role))],
    precision: normalized.precision
  };
}

export function withRouterToolRevision(tool: RouterToolDefinition): RouterToolDefinition {
  const clone = cloneRouterToolDefinition(tool);
  clone.revision = getRouterToolRevision(clone);
  return clone;
}

export function parseRouterToolLibrary(value: unknown): RouterToolDefinition[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((candidate) => {
    const errors = validateRouterToolDefinition(candidate);
    if (errors.length || !isRecord(candidate) || seen.has(String(candidate.id))) return [];
    seen.add(String(candidate.id));
    return [withRouterToolRevision(candidate as unknown as RouterToolDefinition)];
  });
}

export function isRouterToolCompatibleWithProfile(
  tool: RouterToolDefinition,
  profile: RouterProfileDefinition
): boolean {
  return getRouterToolProfileCompatibility(tool, profile).quality !== 'mismatch';
}

export type RouterToolProfileMatchQuality =
  | 'exact'
  | 'geometrically_equivalent'
  | 'scalable'
  | 'family_compatible'
  | 'mismatch'
  | 'missing_linkage';
export interface RouterToolProfileCompatibility {
  quality: RouterToolProfileMatchQuality;
  linkedProfileId?: string;
  scale?: number;
}

function profileGeometryRevision(profile: RouterProfileDefinition): string {
  return getDefinitionRevision({ family: profile.family, boundary: profile.boundary });
}

function inferredScale(source: RouterProfileDefinition, target: RouterProfileDefinition): number | undefined {
  const sourcePoints = [source.boundary.start, ...source.boundary.segments.map((segment) => segment.to)];
  const targetPoints = [target.boundary.start, ...target.boundary.segments.map((segment) => segment.to)];
  if (
    sourcePoints.length !== targetPoints.length ||
    source.boundary.segments.some((segment, index) => segment.kind !== target.boundary.segments[index]?.kind)
  )
    return undefined;
  const ratios: number[] = [];
  sourcePoints.forEach((point, index) => {
    for (const axis of ['u', 'v'] as const)
      if (Math.abs(point[axis]) > 1e-9) ratios.push(targetPoints[index][axis] / point[axis]);
  });
  const scale = ratios.find((ratio) => Number.isFinite(ratio) && ratio > 0);
  if (!scale || ratios.some((ratio) => Math.abs(ratio - scale) > 1e-7)) return undefined;
  const scaled = cloneRouterProfileDefinition(source);
  const scalePoint = (point: { u: number; v: number }) => ({ u: point.u * scale, v: point.v * scale });
  scaled.boundary.start = scalePoint(scaled.boundary.start);
  scaled.boundary.segments = scaled.boundary.segments.map((segment) => {
    if (segment.kind === 'arc') return { ...segment, radius: segment.radius * scale, to: scalePoint(segment.to) };
    if (segment.kind === 'ellipseArc')
      return {
        ...segment,
        radiusU: segment.radiusU * scale,
        radiusV: segment.radiusV * scale,
        to: scalePoint(segment.to)
      };
    if (segment.kind === 'cubicBezier')
      return {
        ...segment,
        control1: scalePoint(segment.control1),
        control2: scalePoint(segment.control2),
        to: scalePoint(segment.to)
      };
    return { ...segment, to: scalePoint(segment.to) };
  });
  return profileGeometryRevision(scaled) === profileGeometryRevision(target) ? scale : undefined;
}

export function getRouterToolProfileCompatibility(
  tool: RouterToolDefinition,
  profile: RouterProfileDefinition
): RouterToolProfileCompatibility {
  if (tool.producedProfiles?.length) {
    for (const link of tool.producedProfiles) {
      if (link.profileId === profile.id && link.profileRevision === getRouterProfileRevision(profile))
        return { quality: 'exact', linkedProfileId: link.profileId };
      if (profileGeometryRevision(link.profileSnapshot) === profileGeometryRevision(profile))
        return { quality: 'geometrically_equivalent', linkedProfileId: link.profileId };
      if (link.applicability?.scalable && link.profileSnapshot.family === profile.family) {
        const scale = inferredScale(link.profileSnapshot, profile);
        if (
          scale !== undefined &&
          (link.applicability.minScale === undefined || scale >= link.applicability.minScale) &&
          (link.applicability.maxScale === undefined || scale <= link.applicability.maxScale)
        )
          return { quality: 'scalable', linkedProfileId: link.profileId, scale };
      }
    }
    return { quality: 'mismatch' };
  }
  if (!tool.profileFamily) return { quality: 'missing_linkage' };
  return tool.profileFamily === profile.family && (!tool.routerProfileId || tool.routerProfileId === profile.id)
    ? { quality: 'family_compatible' }
    : { quality: 'mismatch' };
}

export function getEdgeProfileToolLibraryStatus(
  feature: Pick<EdgeProfileFeature, 'routerToolId' | 'routerToolRevision' | 'routerToolSnapshot'>,
  library: readonly RouterToolDefinition[]
): LibraryReferenceStatus {
  if (!feature.routerToolId) return 'unreferenced';
  const current = library.find((tool) => tool.id === feature.routerToolId);
  if (!current) return 'missing';
  const projectRevision =
    feature.routerToolRevision ??
    (feature.routerToolSnapshot ? getRouterToolRevision(feature.routerToolSnapshot) : undefined);
  return projectRevision === getRouterToolRevision(current) ? 'current' : 'changed';
}

export function resolveEdgeProfileToolSnapshot(
  feature: Pick<EdgeProfileFeature, 'routerToolId' | 'routerToolSnapshot'>,
  library: readonly RouterToolDefinition[]
): RouterToolDefinition | undefined {
  if (feature.routerToolSnapshot) return cloneRouterToolDefinition(feature.routerToolSnapshot);
  const current = library.find((tool) => tool.id === feature.routerToolId);
  return current ? cloneRouterToolDefinition(current) : undefined;
}

export function stringifyRouterToolFile(tool: RouterToolDefinition): string {
  const errors = validateRouterToolDefinition({ ...tool, revision: undefined });
  if (errors.length) throw new Error(errors.join('; '));
  return JSON.stringify({ format: 'carvd-router-tool', version: 1, tool: withRouterToolRevision(tool) }, null, 2);
}

export function parseRouterToolFile(text: string): RouterToolDefinition {
  if (text.length > 1024 * 1024) throw new Error('Router tool file exceeds the 1 MiB limit.');
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('This is not valid JSON.');
  }
  if (
    !isRecord(value) ||
    Object.keys(value).some((key) => !['format', 'version', 'tool'].includes(key)) ||
    value.format !== 'carvd-router-tool'
  )
    throw new Error('This is not a Carvd router tool file.');
  if (value.version !== 1) throw new Error(`Router tool file version ${String(value.version)} is not supported.`);
  const errors = validateRouterToolDefinition(value.tool);
  if (errors.length) throw new Error(errors.join('; '));
  return withRouterToolRevision(value.tool as unknown as RouterToolDefinition);
}
