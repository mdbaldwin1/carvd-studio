import { AssemblyPart, Part, PartFeature, PartFeatureReference, PartFeatureTarget } from '../types';

const FACE_TARGETS = new Set(['left_end', 'right_end', 'top_face', 'bottom_face', 'front_face', 'back_face']);
const EDGE_TARGETS = new Set([
  'top_front_edge',
  'top_back_edge',
  'top_left_edge',
  'top_right_edge',
  'bottom_front_edge',
  'bottom_back_edge',
  'bottom_left_edge',
  'bottom_right_edge',
  'front_left_edge',
  'front_right_edge',
  'back_left_edge',
  'back_right_edge'
]);
const CORNER_TARGETS = new Set(['front_left_corner', 'front_right_corner', 'back_left_corner', 'back_right_corner']);
const RECT_CUT_TYPES = new Set([
  'corner_notch',
  'edge_notch',
  'cutout',
  'dado',
  'stopped_dado',
  'rabbet',
  'groove',
  'stopped_groove',
  'mortise',
  'tenon'
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidTarget(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.type === 'face') return typeof value.face === 'string' && FACE_TARGETS.has(value.face);
  if (value.type === 'edge') return typeof value.edge === 'string' && EDGE_TARGETS.has(value.edge);
  if (value.type === 'corner') return typeof value.corner === 'string' && CORNER_TARGETS.has(value.corner);
  return false;
}

export function validateSerializedPartFeatures(value: unknown, path: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return [`${path} must be an array`];

  const errors: string[] = [];
  const ids = new Set<string>();
  value.forEach((candidate, index) => {
    const featurePath = `${path}[${index}]`;
    if (!isRecord(candidate)) {
      errors.push(`${featurePath} is invalid`);
      return;
    }
    if (typeof candidate.id !== 'string' || candidate.id.length === 0) errors.push(`${featurePath}.id is invalid`);
    else if (ids.has(candidate.id)) errors.push(`${path} contains duplicate feature id "${candidate.id}"`);
    else ids.add(candidate.id);
    if (candidate.version !== 1) errors.push(`${featurePath}.version is invalid`);
    if (typeof candidate.enabled !== 'boolean') errors.push(`${featurePath}.enabled is invalid`);
    if (!isValidTarget(candidate.target)) errors.push(`${featurePath}.target is invalid`);
    if (!isRecord(candidate.reference) || !['min', 'center', 'max'].includes(String(candidate.reference.primaryFrom))) {
      errors.push(`${featurePath}.reference is invalid`);
    }

    if (candidate.kind === 'end_cut') {
      if (!['mitre', 'bevel', 'compound'].includes(String(candidate.cutType)))
        errors.push(`${featurePath}.cutType is invalid`);
      if (!isRecord(candidate.parameters) || !isFiniteNumber(candidate.parameters.horizontalAngle)) {
        errors.push(`${featurePath}.parameters are invalid`);
      }
      return;
    }
    if (candidate.kind !== 'rect_cut') {
      errors.push(`${featurePath}.kind is invalid`);
      return;
    }
    if (typeof candidate.cutType !== 'string' || !RECT_CUT_TYPES.has(candidate.cutType))
      errors.push(`${featurePath}.cutType is invalid`);
    if (!isRecord(candidate.parameters) || !isRecord(candidate.parameters.size)) {
      errors.push(`${featurePath}.parameters are invalid`);
    } else {
      if (!isFiniteNumber(candidate.parameters.size.length) || candidate.parameters.size.length <= 0)
        errors.push(`${featurePath}.parameters.size.length is invalid`);
      if (!isFiniteNumber(candidate.parameters.size.width) || candidate.parameters.size.width <= 0)
        errors.push(`${featurePath}.parameters.size.width is invalid`);
      if (!['through', 'blind'].includes(String(candidate.parameters.depthMode)))
        errors.push(`${featurePath}.parameters.depthMode is invalid`);
      if (
        candidate.parameters.depth !== undefined &&
        (!isFiniteNumber(candidate.parameters.depth) || candidate.parameters.depth <= 0)
      )
        errors.push(`${featurePath}.parameters.depth is invalid`);
    }
    if (
      !isRecord(candidate.placement) ||
      !isFiniteNumber(candidate.placement.x) ||
      !isFiniteNumber(candidate.placement.z)
    ) {
      errors.push(`${featurePath}.placement is invalid`);
    }
  });
  return errors;
}

function cloneFeatureTarget(target: PartFeatureTarget): PartFeatureTarget {
  if (target.type === 'face') {
    return { type: 'face', face: target.face };
  }
  if (target.type === 'edge') {
    return { type: 'edge', edge: target.edge };
  }
  return { type: 'corner', corner: target.corner };
}

function cloneFeatureReference(reference: PartFeatureReference): PartFeatureReference {
  return {
    primaryFrom: reference.primaryFrom,
    secondaryFrom: reference.secondaryFrom,
    tertiaryFrom: reference.tertiaryFrom
  };
}

export function clonePartFeature(feature: PartFeature): PartFeature {
  if (feature.kind === 'end_cut') {
    return {
      ...feature,
      target: cloneFeatureTarget(feature.target) as PartFeature['target'],
      reference: cloneFeatureReference(feature.reference),
      metadata: feature.metadata ? { ...feature.metadata } : undefined,
      parameters: { ...feature.parameters }
    };
  }

  return {
    ...feature,
    target: cloneFeatureTarget(feature.target) as PartFeature['target'],
    reference: cloneFeatureReference(feature.reference),
    metadata: feature.metadata ? { ...feature.metadata } : undefined,
    parameters: {
      ...feature.parameters,
      size: { ...feature.parameters.size }
    },
    placement: { ...feature.placement }
  };
}

export function clonePartFeatures(features?: PartFeature[]): PartFeature[] {
  return features?.map((feature) => clonePartFeature(feature)) ?? [];
}

export function normalizePart(part: Part): Part {
  return {
    ...part,
    rotation: part.rotation ?? { x: 0, y: 0, z: 0 },
    grainSensitive: part.grainSensitive ?? true,
    grainDirection: part.grainDirection ?? 'length',
    features: clonePartFeatures(part.features)
  };
}

export function normalizeAssemblyPart(part: AssemblyPart): AssemblyPart {
  return {
    ...part,
    rotation: part.rotation ?? { x: 0, y: 0, z: 0 },
    grainSensitive: part.grainSensitive ?? true,
    grainDirection: part.grainDirection ?? 'length',
    features: clonePartFeatures(part.features)
  };
}
