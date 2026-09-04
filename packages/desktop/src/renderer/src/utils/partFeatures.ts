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
const REFERENCE_ORIGINS = new Set(['min', 'center', 'max']);
const END_CUT_FACES = new Set(['left_end', 'right_end', 'front_face', 'back_face']);
const LENGTH_MODES = new Set(['long_point', 'short_point', 'centerline']);
const CIRCULAR_CUT_TYPES = new Set(['round_hole', 'countersink', 'counterbore']);
const ROUNDED_CUT_TYPES = new Set(['rounded_slot', 'rounded_rectangle']);
const MAX_PATTERN_MEMBERS = 128;

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

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === 'boolean';
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

function isPositiveIntegerAtMost(value: unknown, maximum: number): value is number {
  return Number.isInteger(value) && Number(value) > 0 && Number(value) <= maximum;
}

function validateFacePlacement(candidate: Record<string, unknown>, featurePath: string, errors: string[]): void {
  if (
    !isRecord(candidate.target) ||
    candidate.target.type !== 'face' ||
    !FACE_TARGETS.has(String(candidate.target.face))
  ) {
    errors.push(`${featurePath}.target is invalid`);
  }
  if (
    !isRecord(candidate.placement) ||
    !isFiniteNumber(candidate.placement.primary) ||
    !isFiniteNumber(candidate.placement.secondary) ||
    !isFiniteNumber(candidate.placement.rotation)
  ) {
    errors.push(`${featurePath}.placement is invalid`);
  }
}

function validatePattern(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.type === 'linear') {
    return (
      isPositiveIntegerAtMost(value.count, MAX_PATTERN_MEMBERS) &&
      isPositiveFiniteNumber(value.spacing) &&
      isFiniteNumber(value.direction)
    );
  }
  if (value.type === 'grid') {
    return (
      isPositiveIntegerAtMost(value.rows, MAX_PATTERN_MEMBERS) &&
      isPositiveIntegerAtMost(value.columns, MAX_PATTERN_MEMBERS) &&
      Number(value.rows) * Number(value.columns) <= MAX_PATTERN_MEMBERS &&
      isPositiveFiniteNumber(value.rowSpacing) &&
      isPositiveFiniteNumber(value.columnSpacing) &&
      isFiniteNumber(value.rotation)
    );
  }
  if (value.type === 'circular') {
    return (
      isPositiveIntegerAtMost(value.count, MAX_PATTERN_MEMBERS) &&
      isPositiveFiniteNumber(value.radius) &&
      isFiniteNumber(value.startAngle)
    );
  }
  return false;
}

function validateDowelMetadata(metadata: unknown): boolean {
  if (!isRecord(metadata) || metadata.dowelJoint === undefined) return true;
  const dowel = metadata.dowelJoint;
  return (
    isRecord(dowel) &&
    typeof dowel.jointId === 'string' &&
    dowel.jointId.length > 0 &&
    typeof dowel.matePartId === 'string' &&
    dowel.matePartId.length > 0 &&
    Number.isInteger(dowel.memberIndex) &&
    Number(dowel.memberIndex) >= 0 &&
    isPositiveFiniteNumber(dowel.dowelDiameter) &&
    isPositiveFiniteNumber(dowel.dowelLength) &&
    isPositiveFiniteNumber(dowel.embedmentDepth)
  );
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
    if (candidate.label !== undefined && typeof candidate.label !== 'string')
      errors.push(`${featurePath}.label is invalid`);
    if (candidate.metadata !== undefined && !isRecord(candidate.metadata))
      errors.push(`${featurePath}.metadata is invalid`);
    else if (!validateDowelMetadata(candidate.metadata)) errors.push(`${featurePath}.metadata.dowelJoint is invalid`);
    if (!isValidTarget(candidate.target)) errors.push(`${featurePath}.target is invalid`);
    if (
      !isRecord(candidate.reference) ||
      !REFERENCE_ORIGINS.has(String(candidate.reference.primaryFrom)) ||
      (candidate.reference.secondaryFrom !== undefined &&
        !REFERENCE_ORIGINS.has(String(candidate.reference.secondaryFrom))) ||
      (candidate.reference.tertiaryFrom !== undefined &&
        !REFERENCE_ORIGINS.has(String(candidate.reference.tertiaryFrom)))
    ) {
      errors.push(`${featurePath}.reference is invalid`);
    }

    if (candidate.kind === 'end_cut') {
      if (
        !isRecord(candidate.target) ||
        candidate.target.type !== 'face' ||
        !END_CUT_FACES.has(String(candidate.target.face))
      )
        errors.push(`${featurePath}.target is invalid for an end cut`);
      if (!['mitre', 'bevel', 'compound'].includes(String(candidate.cutType)))
        errors.push(`${featurePath}.cutType is invalid`);
      if (!LENGTH_MODES.has(String(candidate.lengthMode))) errors.push(`${featurePath}.lengthMode is invalid`);
      if (
        !isRecord(candidate.parameters) ||
        !isFiniteNumber(candidate.parameters.horizontalAngle) ||
        !isOptionalBoolean(candidate.parameters.horizontalFlip) ||
        (candidate.parameters.verticalAngle !== undefined && !isFiniteNumber(candidate.parameters.verticalAngle)) ||
        !isOptionalBoolean(candidate.parameters.verticalFlip) ||
        (candidate.parameters.reference !== undefined &&
          (!isRecord(candidate.parameters.reference) ||
            !LENGTH_MODES.has(String(candidate.parameters.reference.mode)) ||
            !isFiniteNumber(candidate.parameters.reference.value)))
      ) {
        errors.push(`${featurePath}.parameters are invalid`);
      }
      return;
    }
    if (candidate.kind === 'circular_cut') {
      validateFacePlacement(candidate, featurePath, errors);
      if (!CIRCULAR_CUT_TYPES.has(String(candidate.cutType))) errors.push(`${featurePath}.cutType is invalid`);
      const parameters = candidate.parameters;
      if (!isRecord(parameters)) {
        errors.push(`${featurePath}.parameters are invalid`);
      } else {
        if (!isPositiveFiniteNumber(parameters.diameter)) errors.push(`${featurePath}.parameters.diameter is invalid`);
        if (!['through', 'blind'].includes(String(parameters.depthMode)))
          errors.push(`${featurePath}.parameters.depthMode is invalid`);
        if (parameters.depthMode === 'blind' && !isPositiveFiniteNumber(parameters.depth))
          errors.push(`${featurePath}.parameters.depth is invalid`);
        if (!isFiniteNumber(parameters.tilt) || parameters.tilt < 0 || parameters.tilt >= 90)
          errors.push(`${featurePath}.parameters.tilt is invalid`);
        if (!isFiniteNumber(parameters.direction)) errors.push(`${featurePath}.parameters.direction is invalid`);
        if (
          candidate.cutType === 'countersink' &&
          (!isRecord(parameters.countersink) ||
            !isPositiveFiniteNumber(parameters.countersink.majorDiameter) ||
            parameters.countersink.majorDiameter <= Number(parameters.diameter) ||
            !isPositiveFiniteNumber(parameters.countersink.includedAngle) ||
            parameters.countersink.includedAngle >= 180)
        ) {
          errors.push(`${featurePath}.parameters.countersink is invalid`);
        }
        if (
          candidate.cutType === 'counterbore' &&
          (!isRecord(parameters.counterbore) ||
            !isPositiveFiniteNumber(parameters.counterbore.diameter) ||
            parameters.counterbore.diameter <= Number(parameters.diameter) ||
            !isPositiveFiniteNumber(parameters.counterbore.depth))
        ) {
          errors.push(`${featurePath}.parameters.counterbore is invalid`);
        }
      }
      if (candidate.pattern !== undefined && !validatePattern(candidate.pattern))
        errors.push(`${featurePath}.pattern is invalid`);
      return;
    }
    if (candidate.kind === 'rounded_cut') {
      validateFacePlacement(candidate, featurePath, errors);
      if (!ROUNDED_CUT_TYPES.has(String(candidate.cutType))) errors.push(`${featurePath}.cutType is invalid`);
      const parameters = candidate.parameters;
      if (!isRecord(parameters)) {
        errors.push(`${featurePath}.parameters are invalid`);
      } else {
        if (!isPositiveFiniteNumber(parameters.length)) errors.push(`${featurePath}.parameters.length is invalid`);
        if (!isPositiveFiniteNumber(parameters.width)) errors.push(`${featurePath}.parameters.width is invalid`);
        if (
          !isPositiveFiniteNumber(parameters.cornerRadius) ||
          parameters.cornerRadius > Math.min(Number(parameters.length), Number(parameters.width)) / 2
        )
          errors.push(`${featurePath}.parameters.cornerRadius is invalid`);
        if (!['through', 'blind'].includes(String(parameters.depthMode)))
          errors.push(`${featurePath}.parameters.depthMode is invalid`);
        if (parameters.depthMode === 'blind' && !isPositiveFiniteNumber(parameters.depth))
          errors.push(`${featurePath}.parameters.depth is invalid`);
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

function cloneFeatureMetadata(metadata: PartFeature['metadata']): PartFeature['metadata'] {
  if (!metadata) return undefined;
  const dowelJoint = metadata.dowelJoint;
  return {
    ...metadata,
    ...(typeof dowelJoint === 'object' && dowelJoint !== null ? { dowelJoint: { ...dowelJoint } } : {})
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

  if (feature.kind === 'circular_cut') {
    return {
      ...feature,
      target: cloneFeatureTarget(feature.target) as typeof feature.target,
      reference: cloneFeatureReference(feature.reference),
      metadata: cloneFeatureMetadata(feature.metadata),
      parameters: {
        ...feature.parameters,
        countersink: feature.parameters.countersink ? { ...feature.parameters.countersink } : undefined,
        counterbore: feature.parameters.counterbore ? { ...feature.parameters.counterbore } : undefined
      },
      placement: { ...feature.placement },
      pattern: feature.pattern ? { ...feature.pattern } : undefined
    };
  }

  if (feature.kind === 'rounded_cut') {
    return {
      ...feature,
      target: cloneFeatureTarget(feature.target) as typeof feature.target,
      reference: cloneFeatureReference(feature.reference),
      metadata: cloneFeatureMetadata(feature.metadata),
      parameters: { ...feature.parameters },
      placement: { ...feature.placement }
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
