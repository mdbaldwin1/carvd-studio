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
  front_left_corner: 'Front-Left Corner',
  front_right_corner: 'Front-Right Corner',
  back_left_corner: 'Back-Left Corner',
  back_right_corner: 'Back-Right Corner'
};

const EDGE_NOTCH_SIDE_DISPLAY: Record<string, string> = {
  front: 'Front Side',
  back: 'Back Side',
  left: 'Left Side',
  right: 'Right Side'
};

export function getFeatureTargetLabel(feature: PartFeature): string {
  if (feature.target.type === 'face') return FACE_LABELS[feature.target.face];
  if (feature.target.type === 'edge') {
    // Edge notches show simplified side labels
    if (feature.kind === 'rect_cut' && feature.cutType === 'edge_notch') {
      const edge = feature.target.edge;
      const side = edge.includes('front')
        ? 'front'
        : edge.includes('back')
          ? 'back'
          : edge.includes('left')
            ? 'left'
            : 'right';
      return EDGE_NOTCH_SIDE_DISPLAY[side];
    }
    return EDGE_LABELS[feature.target.edge];
  }
  return CORNER_LABELS[feature.target.corner];
}

function toTitleCase(input: string): string {
  return input
    .split('_')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

function getEndCutLongPointLabel(feature: Extract<PartFeature, { kind: 'end_cut' }>): string {
  const horizontalFlip = feature.parameters.horizontalFlip ?? false;
  const longPointOnFront = feature.target.face === 'left_end' ? !horizontalFlip : horizontalFlip;
  return longPointOnFront ? 'Long point on Front' : 'Long point on Back';
}

function getEndCutHighPointLabel(feature: Extract<PartFeature, { kind: 'end_cut' }>): string {
  const verticalFlip = feature.parameters.verticalFlip ?? false;
  const highPointOnTop = feature.target.face === 'right_end' ? !verticalFlip : verticalFlip;
  return highPointOnTop ? 'High point on Top' : 'High point on Bottom';
}

export function getFeatureSummary(feature: PartFeature, units: 'imperial' | 'metric'): string {
  if (feature.kind === 'end_cut' && (feature.target.face === 'front_face' || feature.target.face === 'back_face')) {
    const angle = feature.parameters.verticalAngle ?? 0;
    const edgeLabel = feature.target.face === 'front_face' ? 'Front Edge' : 'Back Edge';
    const highPoint = feature.parameters.verticalFlip ? 'Top' : 'Bottom';
    return `Edge Bevel ${angle}\u00b0 on ${edgeLabel} \u00b7 High point on ${highPoint}`;
  }

  if (feature.kind === 'end_cut') {
    const angleBits = [];
    if (feature.cutType === 'mitre' || feature.cutType === 'compound') {
      angleBits.push(`${feature.parameters.horizontalAngle}°`);
    }
    if ((feature.cutType === 'bevel' || feature.cutType === 'compound') && feature.parameters.verticalAngle) {
      angleBits.push(`${feature.parameters.verticalAngle}° bevel`);
    }

    const angleText = angleBits.length > 0 ? ` ${angleBits.join(' / ')}` : '';
    const directionBits = [];
    if (feature.cutType === 'mitre' || feature.cutType === 'compound') {
      directionBits.push(getEndCutLongPointLabel(feature));
    }
    if (
      (feature.cutType === 'bevel' || feature.cutType === 'compound') &&
      (feature.parameters.verticalAngle ?? 0) > 0
    ) {
      directionBits.push(getEndCutHighPointLabel(feature));
    }
    const directionText = directionBits.length > 0 ? ` · ${directionBits.join(' · ')}` : '';
    return `${toTitleCase(feature.cutType)}${angleText} on ${getFeatureTargetLabel(feature)}${directionText}`;
  }

  if (feature.kind === 'circular_cut') {
    const target = getFeatureTargetLabel(feature);
    const holeDiameter = formatMeasurementWithUnit(feature.parameters.diameter, units);
    const termination =
      feature.parameters.depthMode === 'through'
        ? 'Through'
        : `${formatMeasurementWithUnit(feature.parameters.depth ?? 0, units)} deep`;
    const angle =
      feature.parameters.tilt > 0 ? ` · ${feature.parameters.tilt}° tilt toward ${feature.parameters.direction}°` : '';
    if (feature.pattern) {
      const count =
        feature.pattern.type === 'grid' ? feature.pattern.rows * feature.pattern.columns : feature.pattern.count;
      const spacing =
        feature.pattern.type === 'linear'
          ? ` · ${formatMeasurementWithUnit(feature.pattern.spacing, units)} spacing`
          : feature.pattern.type === 'grid'
            ? ` · ${formatMeasurementWithUnit(feature.pattern.columnSpacing, units)} × ${formatMeasurementWithUnit(feature.pattern.rowSpacing, units)} spacing`
            : ` · ${formatMeasurementWithUnit(feature.pattern.radius, units)} radius`;
      return `${count}-hole ${toTitleCase(feature.pattern.type)} Pattern on ${target} · ${holeDiameter} diameter${spacing} · ${termination}${angle}`;
    }
    if (feature.cutType === 'countersink' && feature.parameters.countersink) {
      return `Countersink on ${target} · ${holeDiameter} hole × ${formatMeasurementWithUnit(feature.parameters.countersink.majorDiameter, units)} major · ${feature.parameters.countersink.includedAngle}° · ${termination}${angle}`;
    }
    if (feature.cutType === 'counterbore' && feature.parameters.counterbore) {
      return `Counterbore on ${target} · ${holeDiameter} hole · ${formatMeasurementWithUnit(feature.parameters.counterbore.diameter, units)} × ${formatMeasurementWithUnit(feature.parameters.counterbore.depth, units)} recess · ${termination}${angle}`;
    }
    const depthSeparator = feature.parameters.depthMode === 'through' ? ' · ' : ' × ';
    return `Round Hole on ${target} · ${holeDiameter} diameter${depthSeparator}${termination}${angle}`;
  }

  if (feature.kind === 'rounded_cut') {
    const target = getFeatureTargetLabel(feature);
    const size = `${formatMeasurementWithUnit(feature.parameters.length, units)} × ${formatMeasurementWithUnit(feature.parameters.width, units)}`;
    const termination =
      feature.parameters.depthMode === 'through'
        ? 'Through'
        : `${formatMeasurementWithUnit(feature.parameters.depth ?? 0, units)} deep`;
    const radius =
      feature.cutType === 'rounded_rectangle'
        ? ` · ${formatMeasurementWithUnit(feature.parameters.cornerRadius, units)} radius`
        : '';
    return `${toTitleCase(feature.cutType)} on ${target} · ${size}${radius} × ${termination}`.replace(
      ` × Through`,
      ` · Through`
    );
  }

  if (feature.cutType === 'tenon') {
    const tongueThickness = feature.parameters.depth ?? 0;
    return `Tenon on ${getFeatureTargetLabel(feature)} \u00b7 ${formatMeasurementWithUnit(feature.parameters.size.length, units)} long \u00d7 ${formatMeasurementWithUnit(feature.parameters.size.width, units)} wide \u00d7 ${formatMeasurementWithUnit(tongueThickness, units)} thick`;
  }

  if (feature.cutType === 'dado') {
    return `Dado on ${getFeatureTargetLabel(feature)} · ${formatMeasurementWithUnit(feature.parameters.size.length, units)} wide × ${formatMeasurementWithUnit(feature.parameters.depth ?? 0, units)} deep`;
  }

  if (feature.cutType === 'stopped_dado') {
    return `Stopped Dado on ${getFeatureTargetLabel(feature)} · ${formatMeasurementWithUnit(feature.parameters.size.length, units)} run × ${formatMeasurementWithUnit(feature.parameters.depth ?? 0, units)} deep`;
  }

  if (feature.cutType === 'rabbet') {
    const shoulderWidth =
      feature.target.type === 'edge' && (feature.target.edge.includes('front') || feature.target.edge.includes('back'))
        ? feature.parameters.size.width
        : feature.parameters.size.length;
    return `Rabbet on ${getFeatureTargetLabel(feature)} · ${formatMeasurementWithUnit(shoulderWidth, units)} shoulder × ${formatMeasurementWithUnit(feature.parameters.depth ?? 0, units)} deep`;
  }

  if (feature.cutType === 'groove') {
    return `Groove on ${getFeatureTargetLabel(feature)} · ${formatMeasurementWithUnit(feature.parameters.size.width, units)} wide × ${formatMeasurementWithUnit(feature.parameters.depth ?? 0, units)} deep`;
  }

  if (feature.cutType === 'stopped_groove') {
    return `Stopped Groove on ${getFeatureTargetLabel(feature)} · ${formatMeasurementWithUnit(feature.parameters.size.length, units)} run × ${formatMeasurementWithUnit(feature.parameters.size.width, units)} wide × ${formatMeasurementWithUnit(feature.parameters.depth ?? 0, units)} deep`;
  }

  if (feature.cutType === 'mortise') {
    return `Mortise on ${getFeatureTargetLabel(feature)} · ${formatMeasurementWithUnit(feature.parameters.size.length, units)} × ${formatMeasurementWithUnit(feature.parameters.size.width, units)} × ${formatMeasurementWithUnit(feature.parameters.depth ?? 0, units)} deep`;
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
