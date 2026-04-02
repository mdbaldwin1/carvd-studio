import {
  CornerTarget,
  EdgeTarget,
  EndCutFeature,
  FaceTarget,
  PartFeature,
  PartFeatureTarget,
  RectCutFeature
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
  | 'corner_notch'
  | 'edge_notch'
  | 'cutout'
  | 'dado'
  | 'stopped_dado'
  | 'rabbet'
  | 'groove'
  | 'stopped_groove'
  | 'mortise';

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
      cutType === 'dado'
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
      cutType === 'rabbet' || cutType === 'groove' || cutType === 'stopped_groove'
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

  if (
    normalized.cutType === 'cutout' ||
    normalized.cutType === 'dado' ||
    normalized.cutType === 'stopped_dado' ||
    normalized.cutType === 'groove' ||
    normalized.cutType === 'stopped_groove' ||
    normalized.cutType === 'mortise'
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
  return duplicate;
}

export function getPresetLabel(preset: OperationPreset): string {
  switch (preset) {
    case 'end_cut':
      return 'End Cut';
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
  }
}

export function getPresetHint(preset: OperationPreset): string {
  switch (preset) {
    case 'end_cut':
      return 'Mitres, bevels, and compound cuts on either end.';
    case 'corner_notch':
      return 'Remove a rectangular chunk from one exact corner.';
    case 'edge_notch':
      return 'Notch into a specific edge while keeping the blank rectangular.';
    case 'cutout':
      return 'Place a rectangular pocket or opening on one face.';
    case 'dado':
      return 'Cut a full-width channel across the top or bottom face.';
    case 'stopped_dado':
      return 'Cut a blind channel across the board width with a limited run along the blank.';
    case 'rabbet':
      return 'Cut a full-run edge recess along one supported edge.';
    case 'groove':
      return 'Cut a full-length face groove with blind depth.';
    case 'stopped_groove':
      return 'Cut a blind face groove with a limited run and explicit placement.';
    case 'mortise':
      return 'Cut a blind face pocket for loose-tenon or joinery layout.';
  }
}
