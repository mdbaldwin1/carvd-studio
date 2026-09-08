import { EndCutFeature, Part, PartFeature } from '../types';

export function validateEndCutFeature(
  feature: EndCutFeature,
  part: Pick<Part, 'length' | 'width' | 'thickness' | 'features'>
): string | null {
  const angles = [feature.parameters.horizontalAngle, feature.parameters.verticalAngle ?? 0];
  if (angles.some((angle) => !Number.isFinite(angle) || Math.abs(angle) >= 90))
    return 'Cut angles must be finite and less than 90°.';
  const candidate = {
    ...part,
    features: [...(part.features ?? []).filter((existing) => existing.id !== feature.id), feature]
  };
  const profiles = getPartEndCutProfiles(candidate);
  for (const y of [-part.thickness / 2, part.thickness / 2]) {
    for (const z of [-part.width / 2, part.width / 2]) {
      if (
        getEndCutInsetAt('left', profiles, part, { y, z }) + getEndCutInsetAt('right', profiles, part, { y, z }) >=
        part.length - 1e-9
      )
        return 'Cut angles exceed the available blank length. Reduce the angle or increase the blank length.';
    }
  }
  const edges = getPartEdgeBevelProfiles(candidate);
  for (const y of [-part.thickness / 2, part.thickness / 2]) {
    if (
      getEdgeBevelInsetAt('front', edges, part, { y }) + getEdgeBevelInsetAt('back', edges, part, { y }) >=
      part.width - 1e-9
    )
      return 'Bevel angles exceed the available blank width. Reduce the angle or increase the blank width.';
  }
  return null;
}

export interface EndCutSideProfile {
  baseInset: number;
  horizontalInset: number;
  verticalInset: number;
  maxInset: number;
  horizontalFlip: boolean;
  verticalFlip: boolean;
}

export interface PartEndCutProfiles {
  left: EndCutSideProfile;
  right: EndCutSideProfile;
}

export interface DerivedLengthMeasurements {
  blank: number;
  longPoint: number;
  shortPoint: number;
  centerline: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getHorizontalFlip(feature: EndCutFeature): boolean {
  return feature.parameters.horizontalFlip ?? false;
}

function getVerticalFlip(feature: EndCutFeature): boolean {
  return feature.parameters.verticalFlip ?? false;
}

export function getReferenceMode(feature: EndCutFeature): EndCutFeature['lengthMode'] {
  return feature.parameters.reference?.mode ?? feature.lengthMode;
}

function getEnabledEndCuts(features?: PartFeature[]): EndCutFeature[] {
  return (features ?? []).filter((feature): feature is EndCutFeature => feature.enabled && feature.kind === 'end_cut');
}

function getFeatureHorizontalInset(feature: EndCutFeature, width: number): number {
  if (feature.cutType === 'bevel' || width <= 0) return 0;
  const angle = Math.abs(feature.parameters.horizontalAngle || 0);
  return Math.max(0, Math.tan((angle * Math.PI) / 180) * width);
}

function getFeatureVerticalInset(feature: EndCutFeature, thickness: number): number {
  if (feature.cutType === 'mitre' || thickness <= 0) return 0;
  const angle = Math.abs(feature.parameters.verticalAngle || 0);
  return Math.max(0, Math.tan((angle * Math.PI) / 180) * thickness);
}

export function getPartEndCutProfiles(input: {
  length: number;
  width: number;
  thickness: number;
  features?: PartFeature[];
}): PartEndCutProfiles {
  const left: EndCutSideProfile = {
    baseInset: 0,
    horizontalInset: 0,
    verticalInset: 0,
    maxInset: 0,
    horizontalFlip: false,
    verticalFlip: false
  };
  const right: EndCutSideProfile = {
    baseInset: 0,
    horizontalInset: 0,
    verticalInset: 0,
    maxInset: 0,
    horizontalFlip: false,
    verticalFlip: false
  };

  for (const feature of getEnabledEndCuts(input.features)) {
    if (feature.target.face !== 'left_end' && feature.target.face !== 'right_end') continue;
    const profile = feature.target.face === 'left_end' ? left : right;
    profile.horizontalInset = getFeatureHorizontalInset(feature, input.width);
    profile.verticalInset = getFeatureVerticalInset(feature, input.thickness);
    profile.maxInset = profile.horizontalInset + profile.verticalInset;
    profile.baseInset = 0;
    profile.horizontalFlip = getHorizontalFlip(feature);
    profile.verticalFlip = getVerticalFlip(feature);
  }

  return { left, right };
}

export function getEndCutInsetAt(
  side: 'left' | 'right',
  profiles: PartEndCutProfiles,
  dimensions: { width: number; thickness: number },
  point: { y: number; z: number }
): number {
  const profile = side === 'left' ? profiles.left : profiles.right;
  if (profile.maxInset <= 0 && profile.baseInset <= 0) return 0;

  const halfWidth = dimensions.width / 2;
  const halfThickness = dimensions.thickness / 2;

  const defaultHorizontalRatio = dimensions.width <= 0 ? 0 : clamp((point.z + halfWidth) / dimensions.width, 0, 1);
  const horizontalRatio = profile.horizontalFlip ? 1 - defaultHorizontalRatio : defaultHorizontalRatio;

  const defaultVerticalRatio =
    dimensions.thickness <= 0
      ? 0
      : side === 'left'
        ? clamp((point.y + halfThickness) / dimensions.thickness, 0, 1)
        : clamp((halfThickness - point.y) / dimensions.thickness, 0, 1);
  const verticalRatio = profile.verticalFlip ? 1 - defaultVerticalRatio : defaultVerticalRatio;

  return profile.baseInset + profile.horizontalInset * horizontalRatio + profile.verticalInset * verticalRatio;
}

export function getDerivedLengthMeasurements(input: {
  length: number;
  width: number;
  thickness: number;
  features?: PartFeature[];
}): DerivedLengthMeasurements {
  const profiles = getPartEndCutProfiles(input);
  const longPoint = Math.max(0, input.length);
  const shortPoint = Math.max(0, longPoint - profiles.left.maxInset - profiles.right.maxInset);
  return {
    blank: input.length,
    longPoint,
    shortPoint,
    centerline: Math.max(0, (longPoint + shortPoint) / 2)
  };
}

export function getLengthReferenceValue(
  measurements: DerivedLengthMeasurements,
  lengthMode: EndCutFeature['lengthMode']
): number {
  switch (lengthMode) {
    case 'short_point':
      return measurements.shortPoint;
    case 'centerline':
      return measurements.centerline;
    case 'long_point':
    default:
      return measurements.longPoint;
  }
}

export interface EdgeBevelProfile {
  /** Z inset removed at the short-point face, in inches. */
  inset: number;
  /** false = long point at the bottom face (default); true = long point on top. */
  flip: boolean;
}

export interface PartEdgeBevelProfiles {
  front: EdgeBevelProfile;
  back: EdgeBevelProfile;
}

/**
 * Long-edge (rip) bevels: an end_cut feature targeting front_face/back_face
 * tilts that long face across the thickness. Only the vertical angle applies.
 */
export function getPartEdgeBevelProfiles(input: {
  width: number;
  thickness: number;
  features?: PartFeature[];
}): PartEdgeBevelProfiles {
  const front: EdgeBevelProfile = { inset: 0, flip: false };
  const back: EdgeBevelProfile = { inset: 0, flip: false };

  for (const feature of getEnabledEndCuts(input.features)) {
    if (feature.target.face !== 'front_face' && feature.target.face !== 'back_face') continue;
    const profile = feature.target.face === 'front_face' ? front : back;
    const angle = Math.abs(feature.parameters.verticalAngle || 0);
    profile.inset = input.thickness > 0 ? Math.max(0, Math.tan((angle * Math.PI) / 180) * input.thickness) : 0;
    profile.flip = feature.parameters.verticalFlip ?? false;
  }

  return { front, back };
}

export function getEdgeBevelInsetAt(
  side: 'front' | 'back',
  profiles: PartEdgeBevelProfiles,
  dimensions: { thickness: number },
  point: { y: number }
): number {
  const profile = side === 'front' ? profiles.front : profiles.back;
  if (profile.inset <= 0) return 0;

  const halfThickness = dimensions.thickness / 2;
  const defaultRatio =
    dimensions.thickness <= 0 ? 0 : Math.min(1, Math.max(0, (point.y + halfThickness) / dimensions.thickness));
  const ratio = profile.flip ? 1 - defaultRatio : defaultRatio;
  return profile.inset * ratio;
}

/** Derived width measurements for parts with long-edge bevels. */
export function getDerivedWidthMeasurements(input: { width: number; thickness: number; features?: PartFeature[] }): {
  longPoint: number;
  shortPoint: number;
  centerline: number;
} {
  const profiles = getPartEdgeBevelProfiles(input);
  const longPoint = Math.max(0, input.width);
  const shortPoint = Math.max(0, longPoint - profiles.front.inset - profiles.back.inset);
  return { longPoint, shortPoint, centerline: (longPoint + shortPoint) / 2 };
}
