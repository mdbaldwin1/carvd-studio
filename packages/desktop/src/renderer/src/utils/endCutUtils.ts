import { EndCutFeature, PartFeature } from '../types';

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

function getReferenceMode(feature: EndCutFeature): EndCutFeature['lengthMode'] {
  return feature.parameters.reference?.mode ?? feature.lengthMode;
}

export function getEndCutReferenceValue(
  feature: EndCutFeature,
  part: Pick<{ length: number; width: number; thickness: number }, 'length' | 'width' | 'thickness'>
): number {
  const measurements = getDerivedLengthMeasurements({
    length: part.length,
    width: part.width,
    thickness: part.thickness,
    features: [feature]
  });
  const mode = getReferenceMode(feature);
  return getLengthReferenceValue(measurements, mode);
}

function getEnabledEndCuts(features?: PartFeature[]): EndCutFeature[] {
  return (features ?? []).filter((feature): feature is EndCutFeature => feature.enabled && feature.kind === 'end_cut');
}

function getFeatureHorizontalInset(feature: EndCutFeature, width: number): number {
  if (feature.cutType === 'square' || feature.cutType === 'bevel' || width <= 0) return 0;
  const angle = Math.abs(feature.parameters.horizontalAngle || 0);
  return Math.max(0, Math.tan((angle * Math.PI) / 180) * width);
}

function getFeatureVerticalInset(feature: EndCutFeature, thickness: number): number {
  if (feature.cutType === 'square' || feature.cutType === 'mitre' || thickness <= 0) return 0;
  const angle = Math.abs(feature.parameters.verticalAngle || 0);
  const horizontalAngle = feature.cutType === 'compound' ? Math.abs(feature.parameters.horizontalAngle || 0) : 0;
  const horizontalCos = Math.cos((horizontalAngle * Math.PI) / 180);
  const projectionScale = horizontalCos <= 1e-6 ? 1 : 1 / horizontalCos;
  return Math.max(0, Math.tan((angle * Math.PI) / 180) * thickness * projectionScale);
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
    const profile = feature.target.face === 'left_end' ? left : right;
    profile.horizontalInset = getFeatureHorizontalInset(feature, input.width);
    profile.verticalInset = getFeatureVerticalInset(feature, input.thickness);
    profile.maxInset = profile.horizontalInset + profile.verticalInset;
    profile.baseInset = 0;
    profile.horizontalFlip = getHorizontalFlip(feature);
    profile.verticalFlip = getVerticalFlip(feature);
  }

  const allowedMaxInset = Math.max(0, input.length - 0.01);
  const totalMaxInset = left.maxInset + right.maxInset;

  if (totalMaxInset > allowedMaxInset && totalMaxInset > 0) {
    const scale = allowedMaxInset / totalMaxInset;
    for (const profile of [left, right]) {
      profile.horizontalInset *= scale;
      profile.verticalInset *= scale;
      profile.maxInset = profile.horizontalInset + profile.verticalInset;
    }
  }

  const remainingForBaseInset = Math.max(0, allowedMaxInset - left.maxInset - right.maxInset);
  const totalBaseInset = left.baseInset + right.baseInset;
  if (totalBaseInset > remainingForBaseInset && totalBaseInset > 0) {
    const scale = remainingForBaseInset / totalBaseInset;
    left.baseInset *= scale;
    right.baseInset *= scale;
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

  const defaultHorizontalRatio =
    dimensions.width <= 0
      ? 0
      : side === 'left'
        ? clamp((point.z + halfWidth) / dimensions.width, 0, 1)
        : clamp((halfWidth - point.z) / dimensions.width, 0, 1);
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
