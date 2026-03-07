import { CornerTarget, EdgeTarget, FaceTarget, PartFeature } from '@renderer/types';
import { formatMeasurementWithUnit } from '@renderer/utils/fractions';

export const FACE_LABELS: Record<FaceTarget, string> = {
  left_end: 'Left End',
  right_end: 'Right End',
  top_face: 'Top Face',
  bottom_face: 'Bottom Face',
  front_face: 'Front Face',
  back_face: 'Back Face'
};

export const EDGE_LABELS: Record<EdgeTarget, string> = {
  top_front_edge: 'Top-Front Edge',
  top_back_edge: 'Top-Back Edge',
  top_left_edge: 'Top-Left Edge',
  top_right_edge: 'Top-Right Edge',
  bottom_front_edge: 'Bottom-Front Edge',
  bottom_back_edge: 'Bottom-Back Edge',
  bottom_left_edge: 'Bottom-Left Edge',
  bottom_right_edge: 'Bottom-Right Edge',
  front_left_edge: 'Front-Left Edge',
  front_right_edge: 'Front-Right Edge',
  back_left_edge: 'Back-Left Edge',
  back_right_edge: 'Back-Right Edge'
};

export const CORNER_LABELS: Record<CornerTarget, string> = {
  front_top_left_corner: 'Front-Top-Left Corner',
  front_top_right_corner: 'Front-Top-Right Corner',
  front_bottom_left_corner: 'Front-Bottom-Left Corner',
  front_bottom_right_corner: 'Front-Bottom-Right Corner',
  back_top_left_corner: 'Back-Top-Left Corner',
  back_top_right_corner: 'Back-Top-Right Corner',
  back_bottom_left_corner: 'Back-Bottom-Left Corner',
  back_bottom_right_corner: 'Back-Bottom-Right Corner'
};

export function getFeatureTargetLabel(feature: PartFeature): string {
  if (feature.target.type === 'face') return FACE_LABELS[feature.target.face];
  if (feature.target.type === 'edge') return EDGE_LABELS[feature.target.edge];
  return CORNER_LABELS[feature.target.corner];
}

function toTitleCase(input: string): string {
  return input
    .split('_')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

export function getFeatureSummary(feature: PartFeature, units: 'imperial' | 'metric'): string {
  if (feature.kind === 'end_cut') {
    const angleBits = [];
    if (feature.cutType === 'mitre' || feature.cutType === 'compound') {
      angleBits.push(`${feature.parameters.horizontalAngle}°`);
    }
    if ((feature.cutType === 'bevel' || feature.cutType === 'compound') && feature.parameters.verticalAngle) {
      angleBits.push(`${feature.parameters.verticalAngle}° bevel`);
    }

    const referenceLabel =
      feature.lengthMode === 'centerline'
        ? 'Centerline'
        : feature.lengthMode === 'short_point'
          ? 'Short Point'
          : 'Long Point';

    const angleText = angleBits.length > 0 ? ` ${angleBits.join(' / ')}` : '';
    return `${toTitleCase(feature.cutType)}${angleText} on ${getFeatureTargetLabel(feature)} · ${referenceLabel} reference`;
  }

  return `${toTitleCase(feature.cutType)} on ${getFeatureTargetLabel(feature)} · ${formatMeasurementWithUnit(feature.parameters.size.length, units)} × ${formatMeasurementWithUnit(feature.parameters.size.width, units)}`;
}

export function getAuthoredFeatureCount(features?: PartFeature[]): number {
  return features?.length ?? 0;
}

export function getEnabledFeatureCount(features?: PartFeature[]): number {
  return features?.filter((feature) => feature.enabled).length ?? 0;
}

export function getPrimaryFeatureText(
  features: PartFeature[] | undefined,
  units: 'imperial' | 'metric',
  options: { preferLabel?: boolean } = {}
): string | null {
  const feature = features?.find((entry) => entry.enabled) ?? features?.[0];
  if (!feature) return null;
  if (options.preferLabel !== false && feature.label?.trim()) {
    return feature.label.trim();
  }
  const summary = getFeatureSummary(feature, units);
  return feature.enabled ? summary : `${summary} (disabled)`;
}

export function getFeatureBadgeLabel(features?: PartFeature[]): string | null {
  const count = getAuthoredFeatureCount(features);
  return count > 0 ? `Ops ${count}` : null;
}
