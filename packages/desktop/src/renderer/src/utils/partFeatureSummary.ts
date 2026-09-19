import { CornerTarget, EdgeTarget, FaceTarget, PartFeature } from '@renderer/types';
import { formatFabricationMeasurement as formatMeasurementWithUnit } from '@renderer/utils/fractions';

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
    // A through notch has no distinct entry face; blind notches must preserve
    // Top/Bottom so fabrication identifies the face to machine.
    if (feature.kind === 'rect_cut' && feature.cutType === 'edge_notch' && feature.parameters.depthMode === 'through') {
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
  const longPointOnFront = !horizontalFlip;
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
      const operation =
        feature.cutType === 'countersink' ? ' Countersink' : feature.cutType === 'counterbore' ? ' Counterbore' : '';
      const profile =
        feature.cutType === 'countersink' && feature.parameters.countersink
          ? `${holeDiameter} hole × ${formatMeasurementWithUnit(feature.parameters.countersink.majorDiameter, units)} major · ${feature.parameters.countersink.includedAngle}°`
          : feature.cutType === 'counterbore' && feature.parameters.counterbore
            ? `${holeDiameter} hole · ${formatMeasurementWithUnit(feature.parameters.counterbore.diameter, units)} × ${formatMeasurementWithUnit(feature.parameters.counterbore.depth, units)} recess`
            : `${holeDiameter} diameter`;
      const spacing =
        feature.pattern.type === 'linear'
          ? ` · ${formatMeasurementWithUnit(feature.pattern.spacing, units)} spacing · ${feature.pattern.direction}° direction`
          : feature.pattern.type === 'grid'
            ? ` · ${formatMeasurementWithUnit(feature.pattern.columnSpacing, units)} × ${formatMeasurementWithUnit(feature.pattern.rowSpacing, units)} spacing · ${feature.pattern.rotation}° rotation`
            : ` · ${formatMeasurementWithUnit(feature.pattern.radius, units)} radius · ${feature.pattern.startAngle}° start angle`;
      return `${count}-hole ${toTitleCase(feature.pattern.type)}${operation} Pattern on ${target} · ${profile}${spacing} · ${termination}${angle}`;
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

  if (feature.kind === 'routed_path') {
    const diameter = formatMeasurementWithUnit(feature.bit.diameter, units);
    const profile =
      feature.bit.profile === 'v_bit'
        ? `V-Bit ${feature.bit.includedAngle}°`
        : feature.bit.profile === 'dovetail'
          ? `Dovetail ${feature.bit.includedAngle}° · ${formatMeasurementWithUnit(feature.bit.shankDiameter, units)} shank`
          : feature.bit.profile === 't_slot' || feature.bit.profile === 'keyhole'
            ? `${toTitleCase(feature.bit.profile)} · ${formatMeasurementWithUnit(feature.bit.shankDiameter, units)} shank × ${formatMeasurementWithUnit(feature.bit.cutterHeight, units)} cutter height`
            : feature.bit.profile === 'straight'
              ? 'Flat Bottom'
              : feature.bit.profile === 'core_box' || feature.bit.profile === 'ball_nose'
                ? 'Round Bottom'
                : toTitleCase(feature.bit.profile);
    const termination =
      feature.parameters.depthMode === 'through'
        ? 'Through'
        : `${formatMeasurementWithUnit(feature.parameters.depth ?? 0, units)} deep`;
    const pathType = feature.path.closed ? 'Closed' : 'Open';
    const roundedCorners = feature.path.points.filter((point) => (point.cornerRadius ?? 0) > 0).length;
    const cornerText =
      roundedCorners > 0 ? ` · ${roundedCorners} rounded ${roundedCorners === 1 ? 'corner' : 'corners'}` : '';
    const diameterLabel =
      feature.bit.profile === 'dovetail' || feature.bit.profile === 't_slot' || feature.bit.profile === 'keyhole'
        ? `${diameter} max diameter`
        : `${diameter} diameter`;
    return `Routed Path on ${getFeatureTargetLabel(feature)} · ${pathType} ${feature.path.points.length}-point path${cornerText} · ${profile}, ${diameterLabel} · ${termination}`;
  }

  if (feature.kind === 'edge_profile') {
    const tool = feature.routerToolSnapshot;
    const toolText = tool
      ? `Tool: ${tool.name}${tool.manufacturer ? ` (${tool.manufacturer}${tool.sku ? ` ${tool.sku}` : ''})` : ''}${tool.sections?.length ? ` · ${tool.sections.length} axial sections${tool.overallLength ? ` · ${formatMeasurementWithUnit(tool.overallLength, units)} overall` : ''}` : ' · legacy axial envelope'}`
      : 'Generic profile / no physical tool assigned';
    const profileName = feature.routerProfileSnapshot?.name ?? toTitleCase(feature.profile);
    return `${profileName} Edge Profile on ${getFeatureTargetLabel(feature)} · ${formatMeasurementWithUnit(feature.parameters.size, units)} size × ${formatMeasurementWithUnit(feature.parameters.depth, units)} depth · ${toolText}`;
  }

  if (feature.cutType === 'tenon') {
    const tongueThickness = feature.parameters.depth ?? 0;
    return `Tenon on ${getFeatureTargetLabel(feature)} \u00b7 ${formatMeasurementWithUnit(feature.parameters.size.length, units)} long \u00d7 ${formatMeasurementWithUnit(feature.parameters.size.width, units)} wide \u00d7 ${formatMeasurementWithUnit(tongueThickness, units)} thick`;
  }

  if (feature.cutType === 'half_lap') {
    // Say the depth is half the stock rather than just quoting the number, so
    // the fabricator knows it follows the board and is not a free measurement.
    return `Half Lap on ${getFeatureTargetLabel(feature)} · ${formatMeasurementWithUnit(feature.parameters.size.length, units)} run × ${formatMeasurementWithUnit(feature.parameters.depth ?? 0, units)} deep (half the stock)`;
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

  const size = `${formatMeasurementWithUnit(feature.parameters.size.length, units)} × ${formatMeasurementWithUnit(feature.parameters.size.width, units)}`;
  const termination =
    feature.parameters.depthMode === 'through'
      ? 'Through'
      : `${formatMeasurementWithUnit(feature.parameters.depth ?? 0, units)} deep`;
  const depthSeparator = feature.parameters.depthMode === 'through' ? ' · ' : ' × ';
  return `${toTitleCase(feature.cutType)} on ${getFeatureTargetLabel(feature)} · ${size}${depthSeparator}${termination}`;
}

export function getAuthoredFeatureCount(features?: PartFeature[]): number {
  return features?.length ?? 0;
}

export function getFeaturePlacementSummary(feature: PartFeature, units: 'imperial' | 'metric'): string | null {
  const measure = (value: number) => formatMeasurementWithUnit(value, units);
  if (feature.kind === 'end_cut') return null;
  if (feature.kind === 'routed_path') {
    const first = feature.path.points[0];
    const last = feature.path.points.at(-1);
    if (!first || !last) return null;
    return `${feature.path.points.length} points · starts at (${measure(first.primary)}, ${measure(first.secondary)}) · ends at (${measure(last.primary)}, ${measure(last.secondary)})`;
  }
  if (feature.kind === 'edge_profile') return 'Full run along the selected edge';
  if (feature.kind === 'rect_cut') {
    if (feature.cutType === 'rabbet') return 'Full run along the selected edge';
    if (feature.target.type === 'edge') {
      const alongLength = feature.target.edge.includes('front') || feature.target.edge.includes('back');
      return `${measure(alongLength ? feature.placement.x : feature.placement.z)} from ${alongLength ? 'Left' : 'Front'} along the selected edge`;
    }
    if (feature.cutType === 'corner_notch')
      return feature.parameters.depthMode === 'blind' ? 'Enter from Top Face at the selected corner' : null;
    if (feature.cutType === 'tenon')
      return `Tongue starts ${measure(feature.placement.z)} from Front; centered through thickness`;
    if (feature.cutType === 'dado' || feature.cutType === 'stopped_dado' || feature.cutType === 'half_lap')
      return `${measure(feature.placement.x)} from Left; full width`;
    if (feature.cutType === 'groove') return `${measure(feature.placement.z)} from Front; full length`;
    const secondaryEdge =
      feature.target.type === 'face' && (feature.target.face === 'front_face' || feature.target.face === 'back_face')
        ? 'Bottom'
        : 'Front';
    return `${measure(feature.placement.x)} from Left · ${measure(feature.placement.z)} from ${secondaryEdge}`;
  }
  const face = feature.target.face;
  const primaryEdges =
    face === 'back_face'
      ? ['Right', 'Left']
      : face === 'left_end'
        ? ['Back', 'Front']
        : face === 'right_end'
          ? ['Front', 'Back']
          : ['Left', 'Right'];
  const secondaryEdges =
    face === 'top_face' ? ['Back', 'Front'] : face === 'bottom_face' ? ['Front', 'Back'] : ['Bottom', 'Top'];
  const coordinate = (name: string, value: number, origin: 'min' | 'center' | 'max' | undefined, edges: string[]) =>
    `${name} ${measure(value)} from ${origin === 'min' ? edges[0] : origin === 'max' ? edges[1] : `center (+${edges[1]})`}`;
  const details = [
    coordinate('Primary', feature.placement.primary, feature.reference.primaryFrom, primaryEdges),
    coordinate('Secondary', feature.placement.secondary, feature.reference.secondaryFrom, secondaryEdges)
  ];
  if (feature.kind === 'rounded_cut') details.push(`${feature.placement.rotation}° rotation`);
  if (feature.kind === 'circular_cut' && feature.pattern?.type === 'grid')
    details.push(`${feature.pattern.rows} rows × ${feature.pattern.columns} columns`);
  if (
    feature.kind === 'rounded_cut' ||
    (feature.kind === 'circular_cut' && (feature.pattern || feature.parameters.tilt))
  )
    details.push(`Angles: 0° toward ${primaryEdges[1]}, 90° toward ${secondaryEdges[1]}`);
  return details.join(' · ');
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
