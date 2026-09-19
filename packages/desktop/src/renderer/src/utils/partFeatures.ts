import {
  AssemblyPart,
  Part,
  PartFeature,
  PartFeatureReference,
  PartFeatureTarget,
  RouterProfileDefinition,
  RouterToolDefinition
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import {
  cloneRouterProfileDefinition,
  getRouterProfileRevision,
  validateRouterProfileDefinition
} from './routerProfiles';
import { cloneRouterToolDefinition, getRouterToolRevision, validateRouterToolDefinition } from './routerTools';

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
  'half_lap',
  'mortise',
  'tenon'
]);
const REFERENCE_ORIGINS = new Set(['min', 'center', 'max']);
const END_CUT_FACES = new Set(['left_end', 'right_end', 'front_face', 'back_face']);
const LENGTH_MODES = new Set(['long_point', 'short_point', 'centerline']);
const CIRCULAR_CUT_TYPES = new Set(['round_hole', 'countersink', 'counterbore']);
const ROUNDED_CUT_TYPES = new Set(['rounded_slot', 'rounded_rectangle']);
const ROUTER_BIT_TYPES = new Set([
  'straight',
  'mortising',
  'spiral_upcut',
  'spiral_downcut',
  'compression',
  'surfacing',
  'core_box',
  'ball_nose',
  'v_bit',
  'engraving',
  'dovetail',
  't_slot',
  'keyhole'
]);
const EDGE_PROFILE_TYPES = new Set(['roundover', 'cove', 'chamfer', 'rabbet', 'bead', 'ogee', 'thumbnail', 'custom']);
const MAX_PATTERN_MEMBERS = 128;
const MAX_ROUTED_PATH_POINTS = 2048;

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
    if (candidate.kind === 'routed_path') {
      if (
        !isRecord(candidate.target) ||
        candidate.target.type !== 'face' ||
        !FACE_TARGETS.has(String(candidate.target.face))
      )
        errors.push(`${featurePath}.target is invalid for a routed path`);

      const path = candidate.path;
      if (
        !isRecord(path) ||
        !Array.isArray(path.points) ||
        path.points.length < 2 ||
        path.points.length > MAX_ROUTED_PATH_POINTS
      ) {
        errors.push(`${featurePath}.path.points is invalid`);
      } else {
        const points = path.points;
        const validPoints = points.every(
          (point) =>
            isRecord(point) &&
            isFiniteNumber(point.primary) &&
            isFiniteNumber(point.secondary) &&
            (point.cornerRadius === undefined || (isFiniteNumber(point.cornerRadius) && point.cornerRadius >= 0))
        );
        if (!validPoints) errors.push(`${featurePath}.path.points is invalid`);
        else {
          const hasNonZeroSegment = points.some((point, index) => {
            if (index === 0) return false;
            const previous = points[index - 1] as Record<string, number>;
            const current = point as Record<string, number>;
            return current.primary !== previous.primary || current.secondary !== previous.secondary;
          });
          if (!hasNonZeroSegment) errors.push(`${featurePath}.path.points must contain a non-zero segment`);
        }
        if (!isOptionalBoolean(path.closed)) errors.push(`${featurePath}.path.closed is invalid`);
        if (path.closed === true && points.length < 3)
          errors.push(`${featurePath}.path.points must contain at least three points when closed`);
      }

      const parameters = candidate.parameters;
      if (!isRecord(parameters)) {
        errors.push(`${featurePath}.parameters are invalid`);
      } else {
        if (!['through', 'blind'].includes(String(parameters.depthMode)))
          errors.push(`${featurePath}.parameters.depthMode is invalid`);
        if (parameters.depthMode === 'blind' && !isPositiveFiniteNumber(parameters.depth))
          errors.push(`${featurePath}.parameters.depth is invalid`);
        if (parameters.depth !== undefined && !isPositiveFiniteNumber(parameters.depth))
          errors.push(`${featurePath}.parameters.depth is invalid`);
      }
      const bit = candidate.bit;
      if (!isRecord(bit)) {
        errors.push(`${featurePath}.bit is invalid`);
      } else {
        if (!ROUTER_BIT_TYPES.has(String(bit.profile))) errors.push(`${featurePath}.bit.profile is invalid`);
        if (!isPositiveFiniteNumber(bit.diameter)) errors.push(`${featurePath}.bit.diameter is invalid`);
        if (
          (bit.profile === 'v_bit' || bit.profile === 'engraving' || bit.profile === 'dovetail') &&
          (!isPositiveFiniteNumber(bit.includedAngle) || bit.includedAngle >= 180)
        )
          errors.push(`${featurePath}.bit.includedAngle is invalid`);
        if (
          bit.profile !== 'v_bit' &&
          bit.profile !== 'engraving' &&
          bit.profile !== 'dovetail' &&
          bit.includedAngle !== undefined
        )
          errors.push(`${featurePath}.bit.includedAngle is invalid`);
        if (bit.profile === 'dovetail' || bit.profile === 't_slot' || bit.profile === 'keyhole') {
          if (
            !isPositiveFiniteNumber(bit.shankDiameter) ||
            !isPositiveFiniteNumber(bit.diameter) ||
            bit.shankDiameter >= bit.diameter
          )
            errors.push(`${featurePath}.bit.shankDiameter is invalid`);
        } else if (bit.shankDiameter !== undefined) {
          errors.push(`${featurePath}.bit.shankDiameter is invalid`);
        }
        if (bit.profile === 't_slot' || bit.profile === 'keyhole') {
          if (!isPositiveFiniteNumber(bit.cutterHeight)) errors.push(`${featurePath}.bit.cutterHeight is invalid`);
          if (
            isRecord(parameters) &&
            parameters.depthMode === 'blind' &&
            isPositiveFiniteNumber(parameters.depth) &&
            isPositiveFiniteNumber(bit.cutterHeight) &&
            parameters.depth < bit.cutterHeight
          )
            errors.push(`${featurePath}.parameters.depth must be at least the bit cutterHeight`);
        } else if (bit.cutterHeight !== undefined) {
          errors.push(`${featurePath}.bit.cutterHeight is invalid`);
        }
      }
      return;
    }
    if (candidate.kind === 'edge_profile') {
      if (
        !isRecord(candidate.target) ||
        candidate.target.type !== 'edge' ||
        !EDGE_TARGETS.has(String(candidate.target.edge))
      )
        errors.push(`${featurePath}.target is invalid for an edge profile`);
      if (!EDGE_PROFILE_TYPES.has(String(candidate.profile))) errors.push(`${featurePath}.profile is invalid`);
      if (
        candidate.routerProfileId !== undefined &&
        (typeof candidate.routerProfileId !== 'string' || candidate.routerProfileId.length === 0)
      )
        errors.push(`${featurePath}.routerProfileId is invalid`);
      if (
        candidate.routerProfileRevision !== undefined &&
        (typeof candidate.routerProfileRevision !== 'string' || candidate.routerProfileRevision.length === 0)
      )
        errors.push(`${featurePath}.routerProfileRevision is invalid`);
      if (candidate.routerProfileSnapshot !== undefined) {
        errors.push(
          ...validateRouterProfileDefinition(candidate.routerProfileSnapshot, `${featurePath}.routerProfileSnapshot`)
        );
        if (
          typeof candidate.routerProfileRevision === 'string' &&
          isRecord(candidate.routerProfileSnapshot) &&
          candidate.routerProfileRevision !==
            getRouterProfileRevision(candidate.routerProfileSnapshot as unknown as RouterProfileDefinition)
        )
          errors.push(`${featurePath}.routerProfileRevision does not match routerProfileSnapshot`);
      }
      if (candidate.profile === 'custom') {
        if (typeof candidate.routerProfileId !== 'string' || candidate.routerProfileId.length === 0)
          errors.push(`${featurePath}.routerProfileId is required for a custom profile`);
        if (candidate.routerProfileSnapshot === undefined)
          errors.push(`${featurePath}.routerProfileSnapshot is required for a custom profile`);
        else if (
          isRecord(candidate.routerProfileSnapshot) &&
          typeof candidate.routerProfileId === 'string' &&
          candidate.routerProfileSnapshot.id !== candidate.routerProfileId
        )
          errors.push(`${featurePath}.routerProfileSnapshot.id must match routerProfileId`);
      }
      if (
        candidate.routerToolId !== undefined &&
        (typeof candidate.routerToolId !== 'string' || candidate.routerToolId.length === 0)
      )
        errors.push(`${featurePath}.routerToolId is invalid`);
      if (
        candidate.routerToolRevision !== undefined &&
        (typeof candidate.routerToolRevision !== 'string' || candidate.routerToolRevision.length === 0)
      )
        errors.push(`${featurePath}.routerToolRevision is invalid`);
      if (candidate.routerToolSnapshot !== undefined) {
        errors.push(...validateRouterToolDefinition(candidate.routerToolSnapshot, `${featurePath}.routerToolSnapshot`));
        if (
          typeof candidate.routerToolRevision === 'string' &&
          isRecord(candidate.routerToolSnapshot) &&
          candidate.routerToolRevision !==
            getRouterToolRevision(candidate.routerToolSnapshot as unknown as RouterToolDefinition)
        )
          errors.push(`${featurePath}.routerToolRevision does not match routerToolSnapshot`);
      }
      if (typeof candidate.routerToolId === 'string') {
        if (!isRecord(candidate.routerToolSnapshot))
          errors.push(`${featurePath}.routerToolSnapshot is required when a tool is assigned`);
        else if (candidate.routerToolSnapshot.id !== candidate.routerToolId)
          errors.push(`${featurePath}.routerToolSnapshot.id must match routerToolId`);
      }
      if (
        isRecord(candidate.routerToolSnapshot) &&
        validateRouterToolDefinition(candidate.routerToolSnapshot).length === 0
      ) {
        const expectedFamily =
          isRecord(candidate.routerProfileSnapshot) && typeof candidate.routerProfileSnapshot.family === 'string'
            ? candidate.routerProfileSnapshot.family
            : candidate.profile;
        const exactProfileId =
          typeof candidate.routerToolSnapshot.routerProfileId === 'string'
            ? candidate.routerToolSnapshot.routerProfileId
            : undefined;
        if (
          candidate.routerToolSnapshot.profileFamily !== expectedFamily ||
          (exactProfileId !== undefined && exactProfileId !== candidate.routerProfileId)
        )
          errors.push(`${featurePath}.routerToolSnapshot is incompatible with the selected profile`);
      }
      if (!isRecord(candidate.parameters)) errors.push(`${featurePath}.parameters are invalid`);
      else {
        if (!isPositiveFiniteNumber(candidate.parameters.size))
          errors.push(`${featurePath}.parameters.size is invalid`);
        if (!isPositiveFiniteNumber(candidate.parameters.depth))
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
      // A blind cut needs a depth, the same requirement circular and rounded
      // cuts already enforce. Without it getRectCutDepth resolves to 0 and the
      // pocket loads clean but renders as nothing, surfacing much later as an
      // editor conflict instead of an import error.
      if (candidate.parameters.depthMode === 'blind' && !isPositiveFiniteNumber(candidate.parameters.depth))
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

// Cloning never changes a feature's kind, so callers get back the same
// narrowed type they passed in rather than the widened union.
export function clonePartFeature<T extends PartFeature>(feature: T): T {
  return clonePartFeatureOfAnyKind(feature) as T;
}

function clonePartFeatureOfAnyKind(feature: PartFeature): PartFeature {
  if (feature.kind === 'end_cut') {
    return {
      ...feature,
      target: cloneFeatureTarget(feature.target) as typeof feature.target,
      reference: cloneFeatureReference(feature.reference),
      metadata: feature.metadata ? { ...feature.metadata } : undefined,
      parameters: {
        ...feature.parameters,
        reference: feature.parameters.reference ? { ...feature.parameters.reference } : undefined
      }
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

  if (feature.kind === 'routed_path') {
    return {
      ...feature,
      target: cloneFeatureTarget(feature.target) as typeof feature.target,
      reference: cloneFeatureReference(feature.reference),
      metadata: cloneFeatureMetadata(feature.metadata),
      path: {
        ...feature.path,
        points: feature.path.points.map((point) => ({ ...point }))
      },
      bit: { ...feature.bit },
      parameters: { ...feature.parameters }
    };
  }

  if (feature.kind === 'edge_profile') {
    return {
      ...feature,
      target: cloneFeatureTarget(feature.target) as typeof feature.target,
      reference: cloneFeatureReference(feature.reference),
      metadata: cloneFeatureMetadata(feature.metadata),
      parameters: { ...feature.parameters },
      routerProfileSnapshot: feature.routerProfileSnapshot
        ? cloneRouterProfileDefinition(feature.routerProfileSnapshot)
        : undefined,
      routerToolSnapshot: feature.routerToolSnapshot ? cloneRouterToolDefinition(feature.routerToolSnapshot) : undefined
    };
  }

  return {
    ...feature,
    target: cloneFeatureTarget(feature.target) as typeof feature.target,
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

/**
 * Clone features for a part-copy operation while preserving only dowel
 * relationships whose mate is included in the same copy set.
 */
export function clonePartFeaturesForCopy(
  features: PartFeature[] | undefined,
  partIdMap: ReadonlyMap<string, string>,
  jointIdMap: Map<string, string>
): PartFeature[] | undefined {
  if (!features) return undefined;
  return features.map((feature) => {
    const cloned = clonePartFeature(feature);
    cloned.id = uuidv4();
    const dowel = cloned.metadata?.dowelJoint;
    if (!dowel) return cloned;

    const mappedMatePartId = partIdMap.get(dowel.matePartId);
    if (!mappedMatePartId) {
      const metadata = { ...cloned.metadata };
      delete metadata.dowelJoint;
      cloned.metadata = Object.keys(metadata).length > 0 ? metadata : undefined;
      return cloned;
    }

    let mappedJointId = jointIdMap.get(dowel.jointId);
    if (!mappedJointId) {
      mappedJointId = uuidv4();
      jointIdMap.set(dowel.jointId, mappedJointId);
    }
    cloned.metadata = {
      ...cloned.metadata,
      dowelJoint: { ...dowel, jointId: mappedJointId, matePartId: mappedMatePartId }
    };
    return cloned;
  });
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

/** Map assembly-local identities, recovering reciprocal legacy pairs when possible. */
export function getAssemblyPartCopyMap(parts: AssemblyPart[], newIds: string[]): Map<string, string> {
  const result = new Map<string, string>();
  parts.forEach((part, index) => {
    if (part.localId) result.set(part.localId, newIds[index]);
    else {
      for (const feature of part.features ?? []) {
        const joint = feature.metadata?.dowelJoint;
        if (!joint) continue;
        const mates = parts.flatMap((candidate, candidateIndex) =>
          candidateIndex === index
            ? []
            : (candidate.features ?? []).filter(
                (other) =>
                  other.metadata?.dowelJoint?.jointId === joint.jointId &&
                  other.metadata.dowelJoint.memberIndex === joint.memberIndex
              )
        );
        if (mates.length === 1) result.set(mates[0].metadata!.dowelJoint!.matePartId, newIds[index]);
      }
    }
  });
  return result;
}
