import {
  CornerTarget,
  CircularCutFeature,
  CircularPattern,
  EdgeTarget,
  EndCutFeature,
  FaceTarget,
  PartFeature,
  PartFeatureTarget,
  RectCutFeature,
  RoundedCutFeature
} from '@renderer/types';
import { clonePartFeature } from '@renderer/utils/partFeatures';

export const END_TARGETS: FaceTarget[] = ['left_end', 'right_end'];
export const FACE_TARGETS: FaceTarget[] = [
  'left_end',
  'right_end',
  'top_face',
  'bottom_face',
  'front_face',
  'back_face'
];
export const EDGE_TARGETS: EdgeTarget[] = [
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
];
export const CORNER_TARGETS: CornerTarget[] = [
  'front_left_corner',
  'front_right_corner',
  'back_left_corner',
  'back_right_corner'
];

// Simplified edge notch side picker (UI shows 4 sides instead of 12 edge targets)
export type EdgeNotchSide = 'front' | 'back' | 'left' | 'right';
export const EDGE_NOTCH_SIDES: EdgeNotchSide[] = ['front', 'back', 'left', 'right'];
export const EDGE_NOTCH_SIDE_LABELS: Record<EdgeNotchSide, string> = {
  front: 'Front',
  back: 'Back',
  left: 'Left',
  right: 'Right'
};

export function edgeNotchSideToTarget(side: EdgeNotchSide): EdgeTarget {
  switch (side) {
    case 'front':
      return 'top_front_edge';
    case 'back':
      return 'top_back_edge';
    case 'left':
      return 'top_left_edge';
    case 'right':
      return 'top_right_edge';
  }
}

export function edgeTargetToSide(edge: EdgeTarget): EdgeNotchSide {
  if (edge.includes('front')) return 'front';
  if (edge.includes('back')) return 'back';
  if (edge.includes('left')) return 'left';
  return 'right';
}

export type OperationPreset =
  | 'end_cut'
  | 'edge_bevel'
  | 'tenon'
  | 'half_lap'
  | 'corner_notch'
  | 'edge_notch'
  | 'cutout'
  | 'dado'
  | 'stopped_dado'
  | 'rabbet'
  | 'groove'
  | 'stopped_groove'
  | 'mortise'
  | 'round_hole'
  | 'countersink'
  | 'counterbore'
  | 'rounded_slot'
  | 'rounded_rectangle';

type EndCutReference = NonNullable<EndCutFeature['parameters']['reference']>;

export type FeatureDraft =
  | {
      mode: 'end_cut';
      featureId: string | null;
      label: string;
      enabled: boolean;
      targetFace: 'left_end' | 'right_end';
      cutType: EndCutFeature['cutType'];
      lengthMode: EndCutFeature['lengthMode'];
      referenceMode: EndCutReference['mode'] | null;
      referenceValue: number | null;
      horizontalAngle: number;
      horizontalFlip: boolean;
      verticalAngle: number;
      verticalFlip: boolean;
    }
  | {
      mode: 'rect_cut';
      featureId: string | null;
      label: string;
      enabled: boolean;
      cutType: RectCutFeature['cutType'];
      faceTarget: FaceTarget;
      edgeTarget: EdgeTarget;
      cornerTarget: CornerTarget;
      sizeLength: number;
      sizeWidth: number;
      depthMode: RectCutFeature['parameters']['depthMode'];
      depth: number;
      placementX: number;
      placementZ: number;
    }
  | {
      mode: 'circular_cut';
      featureId: string | null;
      label: string;
      enabled: boolean;
      cutType: CircularCutFeature['cutType'];
      faceTarget: FaceTarget;
      diameter: number;
      depthMode: CircularCutFeature['parameters']['depthMode'];
      depth: number;
      tilt: number;
      direction: number;
      placementPrimary: number;
      placementSecondary: number;
      rotation: number;
      countersinkMajorDiameter: number;
      countersinkIncludedAngle: number;
      counterboreDiameter: number;
      counterboreDepth: number;
      pattern?: CircularPattern;
    }
  | {
      mode: 'rounded_cut';
      featureId: string | null;
      label: string;
      enabled: boolean;
      cutType: RoundedCutFeature['cutType'];
      faceTarget: FaceTarget;
      length: number;
      width: number;
      cornerRadius: number;
      depthMode: RoundedCutFeature['parameters']['depthMode'];
      depth: number;
      placementPrimary: number;
      placementSecondary: number;
      rotation: number;
    };

type DraftPartDefaults = { partLength?: number; partWidth?: number; partThickness?: number };

const BLIND_ONLY_RECT_CUT_TYPES: RectCutFeature['cutType'][] = [
  'dado',
  'stopped_dado',
  'rabbet',
  'groove',
  'stopped_groove',
  'mortise'
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getDefaultRectDraft(cutType: RectCutFeature['cutType']): Extract<FeatureDraft, { mode: 'rect_cut' }> {
  return {
    mode: 'rect_cut',
    featureId: null,
    label: '',
    enabled: true,
    cutType,
    faceTarget: 'top_face',
    edgeTarget: 'top_front_edge',
    cornerTarget: 'front_left_corner',
    sizeLength:
      cutType === 'tenon'
        ? 1.5
        : cutType === 'dado'
          ? 0.75
          : cutType === 'stopped_dado'
            ? 3
            : cutType === 'rabbet'
              ? 0.5
              : cutType === 'mortise'
                ? 2
                : cutType === 'stopped_groove'
                  ? 4
                  : 0.75,
    sizeWidth:
      cutType === 'tenon'
        ? 2
        : cutType === 'rabbet' || cutType === 'groove' || cutType === 'stopped_groove'
          ? 0.5
          : cutType === 'stopped_dado'
            ? 0
            : 0.75,
    depthMode: BLIND_ONLY_RECT_CUT_TYPES.includes(cutType) ? 'blind' : 'through',
    depth: 0.25,
    placementX: 0,
    placementZ: 0
  };
}

function sanitizeFinite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function getDefaultEdgeTarget(
  cutType: RectCutFeature['cutType'],
  depthMode: RectCutFeature['parameters']['depthMode']
): EdgeTarget {
  if (cutType === 'rabbet' || depthMode === 'blind') return 'top_front_edge';
  return 'front_left_edge';
}

export function normalizeRectCutDraft(
  draft: Extract<FeatureDraft, { mode: 'rect_cut' }>,
  defaults: DraftPartDefaults = {}
): Extract<FeatureDraft, { mode: 'rect_cut' }> {
  const partLength = Math.max(0.125, sanitizeFinite(defaults.partLength ?? 0, 0));
  const partWidth = Math.max(0.125, sanitizeFinite(defaults.partWidth ?? 0, 0));
  const partThickness = Math.max(0.126, sanitizeFinite(defaults.partThickness ?? 0.75, 0.75));
  const normalized = { ...getDefaultRectDraft(draft.cutType), ...draft };

  normalized.depthMode = BLIND_ONLY_RECT_CUT_TYPES.includes(normalized.cutType) ? 'blind' : normalized.depthMode;
  normalized.depth = sanitizeFinite(normalized.depth, 0.25);
  if (normalized.depthMode === 'blind') {
    normalized.depth = clamp(
      normalized.depth <= 0 ? 0.25 : normalized.depth,
      0.125,
      Math.max(0.125, partThickness - 0.001)
    );
  }

  normalized.sizeLength = Math.max(
    0.125,
    sanitizeFinite(normalized.sizeLength, getDefaultRectDraft(normalized.cutType).sizeLength)
  );
  normalized.sizeWidth = Math.max(
    0,
    sanitizeFinite(normalized.sizeWidth, getDefaultRectDraft(normalized.cutType).sizeWidth)
  );
  normalized.placementX = Math.max(0, sanitizeFinite(normalized.placementX, 0));
  normalized.placementZ = Math.max(0, sanitizeFinite(normalized.placementZ, 0));

  if (normalized.cutType === 'tenon') {
    // Tenons live on an end face and are described by tongue dimensions.
    if (normalized.faceTarget !== 'left_end' && normalized.faceTarget !== 'right_end') {
      normalized.faceTarget = 'right_end';
    }
    normalized.depthMode = 'blind';
    normalized.placementX = 0;
    if (defaults?.partThickness && normalized.depth >= defaults.partThickness) {
      normalized.depth = Math.max(0.0625, defaults.partThickness / 3);
    }
    if (defaults?.partWidth) {
      normalized.sizeWidth = Math.min(normalized.sizeWidth, defaults.partWidth);
      normalized.placementZ = Math.max(0, Math.min(normalized.placementZ, defaults.partWidth - normalized.sizeWidth));
    }
    return normalized;
  }

  if (normalized.cutType === 'cutout' || normalized.cutType === 'mortise') {
    // Pockets may target top/bottom or the front/back side faces (side-face
    // pockets recess into the board width and are always blind).
    if (
      normalized.faceTarget !== 'top_face' &&
      normalized.faceTarget !== 'bottom_face' &&
      normalized.faceTarget !== 'front_face' &&
      normalized.faceTarget !== 'back_face'
    ) {
      normalized.faceTarget = 'top_face';
    }
    if (normalized.faceTarget === 'front_face' || normalized.faceTarget === 'back_face') {
      normalized.depthMode = 'blind';
    }
  } else if (
    normalized.cutType === 'dado' ||
    normalized.cutType === 'stopped_dado' ||
    normalized.cutType === 'groove' ||
    normalized.cutType === 'stopped_groove'
  ) {
    if (normalized.faceTarget !== 'top_face' && normalized.faceTarget !== 'bottom_face') {
      normalized.faceTarget = 'top_face';
    }
  }

  if (normalized.cutType === 'edge_notch') {
    // Edge notches are always through-depth (like corner notches)
    normalized.depthMode = 'through';
    // Map any legacy 12-edge target to a canonical 4-side target
    const side = edgeTargetToSide(normalized.edgeTarget);
    normalized.edgeTarget = edgeNotchSideToTarget(side);
    // Zero out the irrelevant placement axis
    if (side === 'front' || side === 'back') {
      normalized.placementZ = 0;
    } else {
      normalized.placementX = 0;
    }
  }

  if (normalized.cutType === 'rabbet') {
    normalized.edgeTarget = getDefaultEdgeTarget(normalized.cutType, normalized.depthMode);
    if (draft.edgeTarget && (draft.edgeTarget.startsWith('top_') || draft.edgeTarget.startsWith('bottom_'))) {
      normalized.edgeTarget = draft.edgeTarget;
    }
  }

  if (normalized.cutType === 'corner_notch') {
    normalized.placementX = 0;
    normalized.placementZ = 0;
  }

  if (normalized.cutType === 'dado' || normalized.cutType === 'stopped_dado') {
    normalized.sizeWidth = partWidth;
    normalized.placementZ = 0;
  }

  if (normalized.cutType === 'groove') {
    normalized.sizeLength = partLength;
    normalized.placementX = 0;
  }

  if (normalized.cutType === 'rabbet') {
    const shoulder =
      normalized.edgeTarget.includes('front') || normalized.edgeTarget.includes('back')
        ? Math.max(0.125, normalized.sizeWidth || 0.5)
        : Math.max(0.125, normalized.sizeLength || 0.5);
    if (normalized.edgeTarget.includes('front') || normalized.edgeTarget.includes('back')) {
      normalized.sizeLength = partLength;
      normalized.sizeWidth = shoulder;
      normalized.placementX = 0;
      normalized.placementZ = 0;
    } else {
      normalized.sizeLength = shoulder;
      normalized.sizeWidth = partWidth;
      normalized.placementX = 0;
      normalized.placementZ = 0;
    }
  }

  const maxX = Math.max(0, partLength - normalized.sizeLength);
  const maxZ = Math.max(0, partWidth - normalized.sizeWidth);

  if (normalized.cutType !== 'corner_notch' && normalized.cutType !== 'groove' && normalized.cutType !== 'rabbet') {
    normalized.placementX = clamp(normalized.placementX, 0, maxX);
  }
  if (
    normalized.cutType !== 'corner_notch' &&
    normalized.cutType !== 'dado' &&
    normalized.cutType !== 'stopped_dado' &&
    normalized.cutType !== 'rabbet'
  ) {
    normalized.placementZ = clamp(normalized.placementZ, 0, maxZ);
  }

  return normalized;
}

export function generateFeatureId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `feature_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildDraftFromPreset(preset: OperationPreset, defaults?: DraftPartDefaults): FeatureDraft {
  if (preset === 'end_cut') {
    return {
      mode: 'end_cut',
      featureId: null,
      label: '',
      enabled: true,
      targetFace: 'left_end',
      cutType: 'mitre',
      lengthMode: 'long_point',
      referenceMode: null,
      referenceValue: null,
      horizontalAngle: 45,
      horizontalFlip: false,
      verticalAngle: 0,
      verticalFlip: false
    };
  }

  if (preset === 'edge_bevel') {
    // Long-edge (rip) bevel: tilts a long face across the thickness. Only the
    // vertical angle applies; the part width stays authoritative (long point).
    return {
      mode: 'end_cut',
      featureId: null,
      label: '',
      enabled: true,
      targetFace: 'front_face',
      cutType: 'bevel',
      lengthMode: 'long_point',
      referenceMode: null,
      referenceValue: null,
      horizontalAngle: 0,
      horizontalFlip: false,
      verticalAngle: 45,
      verticalFlip: false
    };
  }

  if (preset === 'round_hole' || preset === 'countersink' || preset === 'counterbore') {
    return {
      mode: 'circular_cut',
      featureId: null,
      label: '',
      enabled: true,
      cutType: preset,
      faceTarget: 'top_face',
      diameter: 0.25,
      depthMode: 'through',
      depth: Math.min(0.5, (defaults?.partThickness ?? 0.75) / 2),
      tilt: 0,
      direction: 0,
      placementPrimary: 0,
      placementSecondary: 0,
      rotation: 0,
      countersinkMajorDiameter: 0.5,
      countersinkIncludedAngle: 82,
      counterboreDiameter: 0.5,
      counterboreDepth: 0.125
    };
  }

  if (preset === 'rounded_slot' || preset === 'rounded_rectangle') {
    return {
      mode: 'rounded_cut',
      featureId: null,
      label: '',
      enabled: true,
      cutType: preset,
      faceTarget: 'top_face',
      length: 3,
      width: 1,
      cornerRadius: preset === 'rounded_slot' ? 0.5 : 0.25,
      depthMode: 'through',
      depth: Math.min(0.25, (defaults?.partThickness ?? 0.75) / 2),
      placementPrimary: 0,
      placementSecondary: 0,
      rotation: 0
    };
  }

  if (preset === 'half_lap') {
    // A half lap is a blind dado at half the board thickness. Default to an
    // end lap (channel at the left end); the maker adjusts run and position
    // for cross laps.
    const thickness = defaults?.partThickness ?? 0.75;
    return normalizeRectCutDraft(
      {
        ...getDefaultRectDraft('dado'),
        label: 'Half Lap',
        depthMode: 'blind',
        depth: Math.max(0.125, thickness / 2),
        sizeLength: Math.min(defaults?.partWidth ?? 3, defaults?.partLength ?? 3),
        placementX: 0
      },
      defaults
    );
  }

  return normalizeRectCutDraft(getDefaultRectDraft(preset), defaults);
}

export function buildDraftFromFeature(
  feature: PartFeature,
  _part?: Pick<{ length: number; width: number; thickness: number }, 'length' | 'width' | 'thickness'>
): FeatureDraft {
  if (feature.kind === 'end_cut') {
    return {
      mode: 'end_cut',
      featureId: feature.id,
      label: feature.label ?? '',
      enabled: feature.enabled,
      targetFace: feature.target.face,
      cutType: feature.cutType,
      lengthMode: feature.lengthMode,
      referenceMode: feature.parameters.reference?.mode ?? null,
      referenceValue: feature.parameters.reference?.value ?? null,
      horizontalAngle: feature.parameters.horizontalAngle,
      horizontalFlip: feature.parameters.horizontalFlip ?? false,
      verticalAngle: feature.parameters.verticalAngle ?? 0,
      verticalFlip: feature.parameters.verticalFlip ?? false
    };
  }

  if (feature.kind === 'circular_cut') {
    return {
      mode: 'circular_cut',
      featureId: feature.id,
      label: feature.label ?? '',
      enabled: feature.enabled,
      cutType: feature.cutType,
      faceTarget: feature.target.face,
      diameter: feature.parameters.diameter,
      depthMode: feature.parameters.depthMode,
      depth: feature.parameters.depth ?? 0.25,
      tilt: feature.parameters.tilt,
      direction: feature.parameters.direction,
      placementPrimary: feature.placement.primary,
      placementSecondary: feature.placement.secondary,
      rotation: feature.placement.rotation,
      countersinkMajorDiameter: feature.parameters.countersink?.majorDiameter ?? feature.parameters.diameter * 2,
      countersinkIncludedAngle: feature.parameters.countersink?.includedAngle ?? 82,
      counterboreDiameter: feature.parameters.counterbore?.diameter ?? feature.parameters.diameter * 2,
      counterboreDepth: feature.parameters.counterbore?.depth ?? 0.125,
      pattern: feature.pattern ? { ...feature.pattern } : undefined
    };
  }

  if (feature.kind === 'rounded_cut') {
    return {
      mode: 'rounded_cut',
      featureId: feature.id,
      label: feature.label ?? '',
      enabled: feature.enabled,
      cutType: feature.cutType,
      faceTarget: feature.target.face,
      length: feature.parameters.length,
      width: feature.parameters.width,
      cornerRadius: feature.parameters.cornerRadius,
      depthMode: feature.parameters.depthMode,
      depth: feature.parameters.depth ?? 0.25,
      placementPrimary: feature.placement.primary,
      placementSecondary: feature.placement.secondary,
      rotation: feature.placement.rotation
    };
  }

  return normalizeRectCutDraft(
    {
      mode: 'rect_cut',
      featureId: feature.id,
      label: feature.label ?? '',
      enabled: feature.enabled,
      cutType: feature.cutType,
      faceTarget: feature.target.type === 'face' ? feature.target.face : 'top_face',
      edgeTarget: feature.target.type === 'edge' ? feature.target.edge : 'top_front_edge',
      cornerTarget: feature.target.type === 'corner' ? feature.target.corner : 'front_left_corner',
      sizeLength: feature.parameters.size.length,
      sizeWidth: feature.parameters.size.width,
      depthMode: feature.parameters.depthMode,
      depth: feature.parameters.depth ?? 0.25,
      placementX: feature.placement.x,
      placementZ: feature.placement.z
    },
    _part ? { partLength: _part.length, partWidth: _part.width, partThickness: _part.thickness } : undefined
  );
}

export function isEdgeBevelTarget(face: 'left_end' | 'right_end' | 'front_face' | 'back_face'): boolean {
  return face === 'front_face' || face === 'back_face';
}

export function normalizeEndCutDraft(
  draft: Extract<FeatureDraft, { mode: 'end_cut' }>
): Extract<FeatureDraft, { mode: 'end_cut' }> {
  if (!isEdgeBevelTarget(draft.targetFace)) return draft;
  // Long-edge bevels only tilt across the thickness; force the bevel cut type
  // and zero any horizontal component from a previous end-target draft.
  return {
    ...draft,
    cutType: 'bevel',
    horizontalAngle: 0,
    horizontalFlip: false,
    lengthMode: 'long_point',
    referenceMode: null,
    referenceValue: null,
    verticalAngle: draft.verticalAngle === 0 ? 45 : draft.verticalAngle
  };
}

export function buildFeatureFromDraft(draft: FeatureDraft): PartFeature {
  if (draft.mode === 'end_cut') {
    return {
      id: draft.featureId ?? generateFeatureId(),
      kind: 'end_cut',
      version: 1,
      enabled: draft.enabled,
      label: draft.label || undefined,
      target: { type: 'face', face: draft.targetFace },
      reference: { primaryFrom: draft.targetFace === 'left_end' ? 'min' : 'max' },
      cutType: draft.cutType,
      lengthMode: draft.lengthMode,
      parameters: {
        horizontalAngle: draft.cutType === 'bevel' ? 0 : draft.horizontalAngle,
        horizontalFlip: draft.horizontalFlip,
        verticalAngle: draft.cutType === 'mitre' ? undefined : draft.verticalAngle || undefined,
        verticalFlip: draft.cutType === 'mitre' ? undefined : draft.verticalFlip,
        reference:
          draft.referenceMode && draft.referenceValue !== null
            ? {
                mode: draft.referenceMode,
                value: draft.referenceValue
              }
            : undefined
      }
    };
  }

  if (draft.mode === 'circular_cut') {
    return {
      id: draft.featureId ?? generateFeatureId(),
      kind: 'circular_cut',
      version: 1,
      enabled: draft.enabled,
      label: draft.label || undefined,
      target: { type: 'face', face: draft.faceTarget },
      reference: { primaryFrom: 'center', secondaryFrom: 'center' },
      cutType: draft.cutType,
      parameters: {
        diameter: draft.diameter,
        depthMode: draft.depthMode,
        depth: draft.depthMode === 'blind' ? draft.depth : undefined,
        tilt: draft.tilt,
        direction: draft.direction,
        countersink:
          draft.cutType === 'countersink'
            ? { majorDiameter: draft.countersinkMajorDiameter, includedAngle: draft.countersinkIncludedAngle }
            : undefined,
        counterbore:
          draft.cutType === 'counterbore'
            ? { diameter: draft.counterboreDiameter, depth: draft.counterboreDepth }
            : undefined
      },
      placement: {
        primary: draft.placementPrimary,
        secondary: draft.placementSecondary,
        rotation: draft.rotation
      },
      pattern: draft.pattern ? { ...draft.pattern } : undefined
    };
  }

  if (draft.mode === 'rounded_cut') {
    return {
      id: draft.featureId ?? generateFeatureId(),
      kind: 'rounded_cut',
      version: 1,
      enabled: draft.enabled,
      label: draft.label || undefined,
      target: { type: 'face', face: draft.faceTarget },
      reference: { primaryFrom: 'center', secondaryFrom: 'center' },
      cutType: draft.cutType,
      parameters: {
        length: draft.length,
        width: draft.width,
        cornerRadius: draft.cutType === 'rounded_slot' ? draft.width / 2 : draft.cornerRadius,
        depthMode: draft.depthMode,
        depth: draft.depthMode === 'blind' ? draft.depth : undefined
      },
      placement: {
        primary: draft.placementPrimary,
        secondary: draft.placementSecondary,
        rotation: draft.rotation
      }
    };
  }

  const target =
    draft.cutType === 'corner_notch'
      ? { type: 'corner' as const, corner: draft.cornerTarget }
      : draft.cutType === 'edge_notch' || draft.cutType === 'rabbet'
        ? { type: 'edge' as const, edge: draft.edgeTarget }
        : { type: 'face' as const, face: draft.faceTarget };

  return {
    id: draft.featureId ?? generateFeatureId(),
    kind: 'rect_cut',
    version: 1,
    enabled: draft.enabled,
    label: draft.label || undefined,
    target,
    reference: {
      primaryFrom: 'min',
      secondaryFrom: draft.cutType === 'corner_notch' ? 'min' : undefined
    },
    cutType: draft.cutType,
    parameters: {
      size: {
        length: draft.sizeLength,
        width: draft.sizeWidth
      },
      depthMode: draft.depthMode,
      depth: draft.depthMode === 'blind' ? draft.depth : undefined
    },
    placement: {
      x: draft.cutType === 'corner_notch' ? 0 : draft.placementX,
      z:
        draft.cutType === 'corner_notch' || draft.cutType === 'dado' || draft.cutType === 'stopped_dado'
          ? 0
          : draft.placementZ
    }
  };
}

export function getFeatureDraftTarget(draft: FeatureDraft): PartFeatureTarget {
  if (draft.mode === 'end_cut') {
    return { type: 'face', face: draft.targetFace };
  }

  if (draft.mode === 'circular_cut' || draft.mode === 'rounded_cut') {
    return { type: 'face', face: draft.faceTarget };
  }

  if (draft.cutType === 'corner_notch') {
    return { type: 'corner', corner: draft.cornerTarget };
  }

  if (draft.cutType === 'edge_notch' || draft.cutType === 'rabbet') {
    return { type: 'edge', edge: draft.edgeTarget };
  }

  return { type: 'face', face: draft.faceTarget };
}

export function applyTargetToFeatureDraft(draft: FeatureDraft, target: PartFeatureTarget): FeatureDraft {
  if (draft.mode === 'end_cut') {
    return target.type === 'face' && (target.face === 'left_end' || target.face === 'right_end')
      ? { ...draft, targetFace: target.face }
      : draft;
  }

  if (draft.mode === 'circular_cut' || draft.mode === 'rounded_cut') {
    return target.type === 'face' ? { ...draft, faceTarget: target.face } : draft;
  }

  if (draft.cutType === 'corner_notch') {
    return target.type === 'corner' ? { ...draft, cornerTarget: target.corner } : draft;
  }

  if (draft.cutType === 'edge_notch' || draft.cutType === 'rabbet') {
    return target.type === 'edge' ? { ...draft, edgeTarget: target.edge } : draft;
  }

  return target.type === 'face' && (target.face === 'top_face' || target.face === 'bottom_face')
    ? { ...draft, faceTarget: target.face }
    : draft;
}

export function duplicateFeature(feature: PartFeature): PartFeature {
  const duplicate = clonePartFeature(feature);
  duplicate.id = generateFeatureId();
  if (duplicate.metadata?.dowelJoint !== undefined) {
    const ordinaryMetadata = { ...duplicate.metadata };
    delete ordinaryMetadata.dowelJoint;
    duplicate.metadata = Object.keys(ordinaryMetadata).length > 0 ? ordinaryMetadata : undefined;
  }
  return duplicate;
}

export function getPresetLabel(preset: OperationPreset): string {
  switch (preset) {
    case 'end_cut':
      return 'End Cut';
    case 'edge_bevel':
      return 'Edge Bevel';
    case 'tenon':
      return 'Tenon';
    case 'half_lap':
      return 'Half Lap';
    case 'corner_notch':
      return 'Corner Notch';
    case 'edge_notch':
      return 'Edge Notch';
    case 'cutout':
      return 'Cutout';
    case 'dado':
      return 'Dado';
    case 'stopped_dado':
      return 'Stopped Dado';
    case 'rabbet':
      return 'Rabbet';
    case 'groove':
      return 'Groove';
    case 'stopped_groove':
      return 'Stopped Groove';
    case 'mortise':
      return 'Mortise';
    case 'round_hole':
      return 'Round Hole';
    case 'countersink':
      return 'Countersink';
    case 'counterbore':
      return 'Counterbore';
    case 'rounded_slot':
      return 'Rounded Slot';
    case 'rounded_rectangle':
      return 'Rounded Rectangle';
  }
}

export function getPresetHint(preset: OperationPreset): string {
  switch (preset) {
    case 'end_cut':
      return 'Mitres, bevels, and compound cuts on either end.';
    case 'edge_bevel':
      return 'Rip bevel along a long edge, for mitred boxes.';
    case 'tenon':
      return 'Tongue on an end that fits a mortise.';
    case 'half_lap':
      return 'Half-thickness channel for lap joints.';
    case 'corner_notch':
      return 'Remove a rectangle from one corner.';
    case 'edge_notch':
      return 'Notch into one edge of the blank.';
    case 'cutout':
      return 'Rectangular pocket or opening on a face.';
    case 'dado':
      return 'Full-width channel across the face.';
    case 'stopped_dado':
      return 'Blind channel across the width, stopping short.';
    case 'rabbet':
      return 'Recess along one full edge.';
    case 'groove':
      return 'Full-length groove along the face.';
    case 'stopped_groove':
      return 'Blind groove along the length, stopping short.';
    case 'mortise':
      return 'Blind pocket for a tenon to seat into.';
    case 'round_hole':
      return 'Straight or angled round hole, blind or through.';
    case 'countersink':
      return 'Round hole with a tapered recess for a flat-head fastener.';
    case 'counterbore':
      return 'Round hole with a flat-bottomed larger recess.';
    case 'rounded_slot':
      return 'Oblong opening with fully rounded ends.';
    case 'rounded_rectangle':
      return 'Rectangular opening with a controlled corner radius.';
  }
}
