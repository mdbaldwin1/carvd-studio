import {
  CornerTarget,
  CircularCutFeature,
  CircularPattern,
  EdgeTarget,
  EdgeProfileFeature,
  EndCutFeature,
  FaceTarget,
  PartFeature,
  PartFeatureTarget,
  RectCutFeature,
  RoundedCutFeature,
  RoutedPathFeature
} from '@renderer/types';
import { clonePartFeature } from '@renderer/utils/partFeatures';
import { cloneRouterProfileDefinition } from '@renderer/utils/routerProfiles';
import { cloneRouterToolDefinition } from '@renderer/utils/routerTools';
import { isLengthwiseEdgeTarget } from '@renderer/utils/rectCutUtils';

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
  | 'rounded_rectangle'
  | 'routed_path'
  | 'edge_profile';

type EndCutReference = NonNullable<EndCutFeature['parameters']['reference']>;

export interface EndCutDraft {
  mode: 'end_cut';
  featureId: string | null;
  label: string;
  enabled: boolean;
  // Ends take mitre/bevel/compound; the front and back faces take long-edge
  // bevels, so the draft carries the same face set as the feature itself.
  targetFace: EndCutFeature['target']['face'];
  cutType: EndCutFeature['cutType'];
  lengthMode: EndCutFeature['lengthMode'];
  referenceMode: EndCutReference['mode'] | null;
  referenceValue: number | null;
  horizontalAngle: number;
  horizontalFlip: boolean;
  verticalAngle: number;
  verticalFlip: boolean;
}

export interface RectCutDraft {
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
  /** Zero for a pocket chopped square; the bit radius for one routed. */
  cornerRadius: number;
  placementX: number;
  placementZ: number;
}

export interface CircularCutDraft {
  mode: 'circular_cut';
  reference?: CircularCutFeature['reference'];
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

export interface RoundedCutDraft {
  mode: 'rounded_cut';
  reference?: RoundedCutFeature['reference'];
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
}

export interface RoutedPathDraft {
  mode: 'routed_path';
  featureId: string | null;
  label: string;
  enabled: boolean;
  faceTarget: FaceTarget;
  points: RoutedPathFeature['path']['points'];
  closed: boolean;
  bitProfile: RoutedPathFeature['bit']['profile'];
  bitDiameter: number;
  bitShankDiameter: number;
  bitAngle: number;
  bitCutterHeight: number;
  depthMode: RoutedPathFeature['parameters']['depthMode'];
  depth: number;
}

export interface EdgeProfileDraft {
  mode: 'edge_profile';
  featureId: string | null;
  label: string;
  enabled: boolean;
  edgeTarget: EdgeTarget;
  profile: EdgeProfileFeature['profile'];
  routerProfileId?: string;
  routerProfileRevision?: string;
  routerProfileSnapshot?: EdgeProfileFeature['routerProfileSnapshot'];
  routerToolId?: string;
  routerToolRevision?: string;
  routerToolSnapshot?: EdgeProfileFeature['routerToolSnapshot'];
  size: number;
  depth: number;
}

export type FeatureDraft =
  | EndCutDraft
  | RectCutDraft
  | CircularCutDraft
  | RoundedCutDraft
  | RoutedPathDraft
  | EdgeProfileDraft;

type DraftPartDefaults = { partLength?: number; partWidth?: number; partThickness?: number };

/**
 * A tenon is about a third of the stock: strong enough to carry the joint,
 * with shoulders left either side to seat against.
 */
const TENON_THICKNESS_RATIO = 1 / 3;
/** Shoulders top and bottom leave roughly two thirds of the board as tongue. */
const TENON_WIDTH_RATIO = 2 / 3;
/** A workaday furniture tenon. Long enough to hold, short enough to clear. */
const DEFAULT_TENON_LENGTH = 1;
/**
 * A mortise is cut a shade deeper than its tenon is long, so the tenon seats
 * on its shoulders rather than bottoming out, and glue has somewhere to go.
 */
const MORTISE_RELIEF = 1 / 16;

/** Shop measurements land on a sixteenth; a third of 3/4" is not 0.2499. */
function toNearestSixteenth(value: number): number {
  return Math.round(value * 16) / 16;
}

/**
 * Defaults for the two halves of a mortise and tenon, chosen so that accepting
 * both produces a joint that actually closes.
 *
 * The tenon scales with the board it is cut on. The mortise cannot -- it is cut
 * into the leg, and nothing here knows which rail is coming -- so it defaults to
 * the tenon that 3/4" stock carries, which is the common case and the one the
 * app should demonstrate. Sizing a mortise to its actual mate is what the fit
 * operation is for.
 */
function getJoineryRectDraft(
  cutType: 'tenon' | 'mortise',
  defaults: DraftPartDefaults
): Extract<FeatureDraft, { mode: 'rect_cut' }> {
  const stockTenonThickness = Math.max(
    1 / 8,
    toNearestSixteenth((defaults.partThickness ?? 0.75) * TENON_THICKNESS_RATIO)
  );

  if (cutType === 'tenon') {
    return {
      ...getDefaultRectDraft('tenon'),
      sizeLength: DEFAULT_TENON_LENGTH,
      sizeWidth: Math.max(1 / 4, toNearestSixteenth((defaults.partWidth ?? 3) * TENON_WIDTH_RATIO)),
      depth: stockTenonThickness
    };
  }

  // A leg takes the full tenon. Thin stock cannot, so the mortise goes as deep
  // as it can while leaving a wall behind it -- and the tenon then wants
  // fitting to it rather than left at its own default.
  const deepestSensible = (defaults.partThickness ?? 1.75) * (2 / 3);

  return {
    ...getDefaultRectDraft('mortise'),
    // Length takes the tenon's width, width takes its thickness.
    sizeWidth: Math.max(1 / 8, toNearestSixteenth(0.75 * TENON_THICKNESS_RATIO)),
    depth: Math.min(DEFAULT_TENON_LENGTH + MORTISE_RELIEF, deepestSensible)
  };
}

const BLIND_ONLY_RECT_CUT_TYPES: RectCutFeature['cutType'][] = [
  'dado',
  'stopped_dado',
  'rabbet',
  'groove',
  'stopped_groove',
  // A lap taken all the way through is not a lap; it is a cut-off end.
  'half_lap'
];

/**
 * Cuts that start blind but may be taken through.
 *
 * A mortise is usually blind, and that is what a new one should be. But a
 * through mortise is an ordinary joint -- a wedged tenon needs one -- and
 * forcing it to be drawn as a Cutout instead costs the cut its identity in the
 * summary and the cut list, and the joint any chance of being understood as
 * one. Through mortises are only available on the top and bottom faces, since
 * a pocket cut into an edge has nowhere to come out.
 */
const BLIND_BY_DEFAULT_RECT_CUT_TYPES: RectCutFeature['cutType'][] = [...BLIND_ONLY_RECT_CUT_TYPES, 'mortise'];

/** Whether this cut, as targeted, can only ever be blind. */
export function rectCutIsBlindOnly(cutType: RectCutFeature['cutType'], faceTarget?: FaceTarget): boolean {
  if (BLIND_ONLY_RECT_CUT_TYPES.includes(cutType)) return true;
  // A pocket cut into the front or back face runs across the thickness, so it
  // has no far side to break out of.
  return cutType === 'mortise' && (faceTarget === 'front_face' || faceTarget === 'back_face');
}

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
    depthMode: BLIND_BY_DEFAULT_RECT_CUT_TYPES.includes(cutType) ? 'blind' : 'through',
    depth: 0.25,
    // Square by default: a chisel-chopped pocket is the shape the drawing has
    // always shown, so nothing changes until the maker says it was routed.
    cornerRadius: 0,
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
  const preserveInvalidOffsets = () => {
    // Hidden/derived offsets must remain invalid through unrelated edits. Only
    // an explicit correction may move an imported malformed operation to zero.
    if (!Number.isFinite(draft.placementX)) normalized.placementX = draft.placementX;
    if (!Number.isFinite(draft.placementZ)) normalized.placementZ = draft.placementZ;
    return normalized;
  };

  normalized.depthMode = rectCutIsBlindOnly(normalized.cutType, normalized.faceTarget) ? 'blind' : normalized.depthMode;
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
    return preserveInvalidOffsets();
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

  if (normalized.cutType === 'mortise' || normalized.cutType === 'cutout') {
    const limit = Math.min(normalized.sizeLength, normalized.sizeWidth) / 2;
    normalized.cornerRadius = clamp(sanitizeFinite(normalized.cornerRadius, 0), 0, limit);
  } else {
    // Only a four-cornered pocket has corners a bit can round.
    normalized.cornerRadius = 0;
  }

  if (normalized.cutType === 'half_lap') {
    normalized.sizeWidth = partWidth;
    normalized.placementZ = 0;
    // Half the stock, always. Two laps cut this way meet flush by construction
    // whenever the boards match, which is the only way the joint works.
    normalized.depth = partThickness / 2;
  }

  if (normalized.cutType === 'groove') {
    normalized.sizeLength = partLength;
    normalized.placementX = 0;
  }

  if (normalized.cutType === 'rabbet') {
    // A rabbet runs along one horizontal edge; `includes` would also match the
    // vertical corner edges and rip it the wrong way across the blank.
    const alongLength = isLengthwiseEdgeTarget(normalized.edgeTarget);
    // The shoulder lives in whichever slot the run does not: sizeWidth while
    // the rabbet runs along the length, sizeLength while it runs across. On an
    // orientation change the slots have to swap, so read the shoulder from the
    // layout the draft still holds rather than the one it is moving to --
    // otherwise switching edges reads the outgoing *run* as the new shoulder
    // and a 1/2" rabbet silently becomes a 24" one that eats the whole face.
    // Normalization always pins the run to exactly partLength or partWidth,
    // so which slot holds it is unambiguous.
    const heldAlongLength = Math.abs(normalized.sizeLength - partLength) < 1e-9;
    const heldAcrossWidth = Math.abs(normalized.sizeWidth - partWidth) < 1e-9;
    const previousShoulder = heldAlongLength
      ? normalized.sizeWidth
      : heldAcrossWidth
        ? normalized.sizeLength
        : alongLength
          ? normalized.sizeWidth
          : normalized.sizeLength;
    const shoulder = Math.max(0.125, previousShoulder || 0.5);
    if (alongLength) {
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
  // On front/back faces the cross measurement and its offset run across the
  // board thickness, not its width -- the same bound validateRectCutFeature
  // applies. Clamping against the width instead silently rewrites a valid
  // side-face pocket the moment the inspector opens it.
  const isSideFacePocket = normalized.faceTarget === 'front_face' || normalized.faceTarget === 'back_face';
  const crossExtent = isSideFacePocket ? partThickness : partWidth;
  const maxZ = Math.max(0, crossExtent - normalized.sizeWidth);

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

  return preserveInvalidOffsets();
}

export function generateFeatureId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `feature_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildDraftFromPreset(preset: OperationPreset, defaults?: DraftPartDefaults): FeatureDraft {
  if (preset === 'edge_profile') {
    return {
      mode: 'edge_profile',
      featureId: null,
      label: '',
      enabled: true,
      edgeTarget: 'top_front_edge',
      profile: 'roundover',
      routerProfileId: undefined,
      routerProfileRevision: undefined,
      routerProfileSnapshot: undefined,
      routerToolId: undefined,
      routerToolRevision: undefined,
      routerToolSnapshot: undefined,
      size: Math.min(0.25, (defaults?.partThickness ?? 0.75) / 2),
      depth: Math.min(0.25, (defaults?.partThickness ?? 0.75) / 2)
    };
  }

  if (preset === 'routed_path') {
    const run = Math.min(3, Math.max(0.5, (defaults?.partLength ?? 4) / 2));
    return {
      mode: 'routed_path',
      featureId: null,
      label: '',
      enabled: true,
      faceTarget: 'top_face',
      points: [
        { primary: -run / 2, secondary: 0, cornerRadius: 0 },
        { primary: run / 2, secondary: 0, cornerRadius: 0 }
      ],
      closed: false,
      bitProfile: 'straight',
      bitDiameter: 0.25,
      bitShankDiameter: 0.25,
      bitAngle: 90,
      bitCutterHeight: 0.125,
      depthMode: 'blind',
      depth: Math.min(0.25, (defaults?.partThickness ?? 0.75) / 2)
    };
  }

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
    // Default to an end lap -- a channel at the left end, the width of the
    // board it crosses. The maker moves it along for a cross lap. Depth is not
    // offered because a half lap is half the stock by definition.
    return normalizeRectCutDraft(
      {
        ...getDefaultRectDraft('dado'),
        cutType: 'half_lap',
        depthMode: 'blind',
        sizeLength: Math.min(defaults?.partWidth ?? 3, defaults?.partLength ?? 3),
        placementX: 0
      },
      defaults
    );
  }

  if (preset === 'tenon' || preset === 'mortise') {
    return normalizeRectCutDraft(getJoineryRectDraft(preset, defaults ?? {}), defaults);
  }

  return normalizeRectCutDraft(getDefaultRectDraft(preset), defaults);
}

export function buildDraftFromFeature(
  feature: PartFeature,
  _part?: Pick<{ length: number; width: number; thickness: number }, 'length' | 'width' | 'thickness'>
): FeatureDraft {
  if (feature.kind === 'edge_profile') {
    return {
      mode: 'edge_profile',
      featureId: feature.id,
      label: feature.label ?? '',
      enabled: feature.enabled,
      edgeTarget: feature.target.edge,
      profile: feature.profile,
      routerProfileId: feature.routerProfileId,
      routerProfileRevision: feature.routerProfileRevision,
      routerProfileSnapshot: feature.routerProfileSnapshot
        ? cloneRouterProfileDefinition(feature.routerProfileSnapshot)
        : undefined,
      routerToolId: feature.routerToolId,
      routerToolRevision: feature.routerToolRevision,
      routerToolSnapshot: feature.routerToolSnapshot
        ? cloneRouterToolDefinition(feature.routerToolSnapshot)
        : undefined,
      size: feature.parameters.size,
      depth: feature.parameters.depth
    };
  }

  if (feature.kind === 'routed_path') {
    return {
      mode: 'routed_path',
      featureId: feature.id,
      label: feature.label ?? '',
      enabled: feature.enabled,
      faceTarget: feature.target.face,
      points: feature.path.points.map((point) => ({ ...point, cornerRadius: point.cornerRadius ?? 0 })),
      closed: feature.path.closed ?? false,
      bitProfile: feature.bit.profile,
      bitDiameter: feature.bit.diameter,
      bitShankDiameter: 'shankDiameter' in feature.bit ? feature.bit.shankDiameter : feature.bit.diameter,
      bitAngle: feature.bit.profile === 'v_bit' || feature.bit.profile === 'dovetail' ? feature.bit.includedAngle : 90,
      bitCutterHeight: 'cutterHeight' in feature.bit ? feature.bit.cutterHeight : 0.125,
      depthMode: feature.parameters.depthMode,
      depth: feature.parameters.depth ?? 0.25
    };
  }

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
      reference: { ...feature.reference },
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
      reference: { ...feature.reference },
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

  const rectDraft = normalizeRectCutDraft(
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
      cornerRadius: feature.parameters.cornerRadius ?? 0,
      placementX: feature.placement.x,
      placementZ: feature.placement.z
    },
    _part ? { partLength: _part.length, partWidth: _part.width, partThickness: _part.thickness } : undefined
  );
  return rectDraft;
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
  if (draft.mode === 'routed_path') {
    return {
      id: draft.featureId ?? generateFeatureId(),
      kind: 'routed_path',
      version: 1,
      enabled: draft.enabled,
      label: draft.label || undefined,
      target: { type: 'face', face: draft.faceTarget },
      reference: { primaryFrom: 'center', secondaryFrom: 'center' },
      path: {
        points: draft.points.map((point, index) => {
          const cornerRadius =
            !draft.closed && (index === 0 || index === draft.points.length - 1)
              ? 0
              : Math.max(0, point.cornerRadius ?? 0);
          const coordinates = { primary: point.primary, secondary: point.secondary };
          return cornerRadius > 0 ? { ...coordinates, cornerRadius } : coordinates;
        }),
        closed: draft.closed || undefined
      },
      bit:
        draft.bitProfile === 'v_bit' || draft.bitProfile === 'engraving'
          ? { profile: draft.bitProfile, diameter: draft.bitDiameter, includedAngle: draft.bitAngle }
          : draft.bitProfile === 'dovetail'
            ? {
                profile: 'dovetail',
                diameter: draft.bitDiameter,
                shankDiameter: draft.bitShankDiameter,
                includedAngle: draft.bitAngle
              }
            : draft.bitProfile === 't_slot' || draft.bitProfile === 'keyhole'
              ? {
                  profile: draft.bitProfile,
                  diameter: draft.bitDiameter,
                  shankDiameter: draft.bitShankDiameter,
                  cutterHeight: draft.bitCutterHeight
                }
              : { profile: draft.bitProfile, diameter: draft.bitDiameter },
      parameters: {
        depthMode: draft.depthMode,
        depth: draft.depthMode === 'blind' ? draft.depth : undefined
      }
    };
  }

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
      reference: draft.reference ? { ...draft.reference } : { primaryFrom: 'center', secondaryFrom: 'center' },
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
      reference: draft.reference ? { ...draft.reference } : { primaryFrom: 'center', secondaryFrom: 'center' },
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

  if (draft.mode === 'edge_profile') {
    return {
      id: draft.featureId ?? generateFeatureId(),
      kind: 'edge_profile',
      version: 1,
      enabled: draft.enabled,
      label: draft.label || undefined,
      target: { type: 'edge', edge: draft.edgeTarget },
      reference: { primaryFrom: 'min', secondaryFrom: 'min' },
      profile: draft.profile,
      routerProfileId: draft.routerProfileId,
      routerProfileRevision: draft.routerProfileRevision,
      routerProfileSnapshot: draft.routerProfileSnapshot
        ? cloneRouterProfileDefinition(draft.routerProfileSnapshot)
        : undefined,
      routerToolId: draft.routerToolId,
      routerToolRevision: draft.routerToolRevision,
      routerToolSnapshot: draft.routerToolSnapshot ? cloneRouterToolDefinition(draft.routerToolSnapshot) : undefined,
      parameters: { size: draft.size, depth: draft.depth }
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
      depth: draft.depthMode === 'blind' ? draft.depth : undefined,
      // Absent rather than zero for a square pocket, so a file only carries
      // the field when a bit actually left something behind.
      cornerRadius: draft.cornerRadius > 0 ? draft.cornerRadius : undefined
    },
    placement: {
      x: draft.cutType === 'corner_notch' && Number.isFinite(draft.placementX) ? 0 : draft.placementX,
      z:
        (draft.cutType === 'corner_notch' || draft.cutType === 'dado' || draft.cutType === 'stopped_dado') &&
        Number.isFinite(draft.placementZ)
          ? 0
          : draft.placementZ
    }
  };
}

export function getFeatureDraftTarget(draft: FeatureDraft): PartFeatureTarget {
  if (draft.mode === 'end_cut') {
    return { type: 'face', face: draft.targetFace };
  }

  if (draft.mode === 'circular_cut' || draft.mode === 'rounded_cut' || draft.mode === 'routed_path') {
    return { type: 'face', face: draft.faceTarget };
  }
  if (draft.mode === 'edge_profile') return { type: 'edge', edge: draft.edgeTarget };

  if (draft.cutType === 'corner_notch') {
    return { type: 'corner', corner: draft.cornerTarget };
  }

  if (draft.cutType === 'edge_notch' || draft.cutType === 'rabbet') {
    return { type: 'edge', edge: draft.edgeTarget };
  }

  return { type: 'face', face: draft.faceTarget };
}

export function applyTargetToFeatureDraft(draft: FeatureDraft, target: PartFeatureTarget): FeatureDraft {
  // Each branch must accept exactly what isTargetValidForDraft offers a pane
  // for. A pane offered here but rejected there is a control that does
  // nothing when clicked.
  if (draft.mode === 'end_cut') {
    return target.type === 'face' &&
      (target.face === 'left_end' ||
        target.face === 'right_end' ||
        target.face === 'front_face' ||
        target.face === 'back_face')
      ? { ...draft, targetFace: target.face }
      : draft;
  }

  if (draft.mode === 'circular_cut') {
    return target.type === 'face' ? { ...draft, faceTarget: target.face } : draft;
  }

  if (draft.mode === 'rounded_cut') {
    return target.type === 'face' && (target.face === 'top_face' || target.face === 'bottom_face')
      ? { ...draft, faceTarget: target.face }
      : draft;
  }

  if (draft.mode === 'routed_path') {
    return target.type === 'face' ? { ...draft, faceTarget: target.face } : draft;
  }
  if (draft.mode === 'edge_profile') {
    return target.type === 'edge' ? { ...draft, edgeTarget: target.edge } : draft;
  }

  if (draft.cutType === 'corner_notch') {
    return target.type === 'corner' ? { ...draft, cornerTarget: target.corner } : draft;
  }

  if (draft.cutType === 'tenon') {
    return target.type === 'face' && (target.face === 'left_end' || target.face === 'right_end')
      ? { ...draft, faceTarget: target.face }
      : draft;
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
    case 'routed_path':
      return 'Routed Path';
    case 'edge_profile':
      return 'Edge Profile';
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
    case 'routed_path':
      return 'Sweep a router bit along a straight or polyline path on a face.';
    case 'edge_profile':
      return 'Shape one continuous stock edge with a bearing-guided profile.';
  }
}
