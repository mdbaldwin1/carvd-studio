import type { Part, RoutedPathFeature } from '../types';
import { getFaceFrame } from './roundCutUtils';
import { formatMeasurementWithUnit } from './fractions';

/** Shared editor and report guard for local-face routing geometry. */
export function validateRoutedPath(
  feature: RoutedPathFeature,
  part: Pick<Part, 'length' | 'width' | 'thickness'>,
  units: 'imperial' | 'metric' = 'imperial'
): string | null {
  const frame = getFaceFrame(part, feature.target.face);
  const depth = feature.parameters.depthMode === 'blind' ? Number(feature.parameters.depth) : null;
  const materialDepth =
    feature.target.face === 'top_face' || feature.target.face === 'bottom_face'
      ? part.thickness
      : feature.target.face === 'left_end' || feature.target.face === 'right_end'
        ? part.length
        : part.width;
  if (!(feature.bit.diameter > 0)) return 'Cutter diameter must be greater than zero.';
  if (depth !== null && (!(depth > 0) || depth > materialDepth)) {
    return `Route depth must be greater than zero and no deeper than the ${formatMeasurementWithUnit(materialDepth, units)} material thickness. Use Through for a through-route.`;
  }
  const requestedDepth = depth ?? materialDepth;
  if (feature.bit.profile === 'core_box' || feature.bit.profile === 'ball_nose') {
    const maxDepth = feature.bit.diameter / 2;
    if (requestedDepth > maxDepth + 1e-9) {
      return `This round-bottom bit can cut at most ${formatMeasurementWithUnit(maxDepth, units)} deep at its ${formatMeasurementWithUnit(feature.bit.diameter, units)} diameter.`;
    }
  }
  if (feature.bit.profile === 'v_bit' || feature.bit.profile === 'engraving') {
    const maxDepth = feature.bit.diameter / (2 * Math.tan((feature.bit.includedAngle * Math.PI) / 360));
    if (requestedDepth > maxDepth + 1e-9) {
      return `At ${feature.bit.includedAngle}°, this V-bit can cut at most ${formatMeasurementWithUnit(maxDepth, units)} deep at its ${formatMeasurementWithUnit(feature.bit.diameter, units)} maximum diameter.`;
    }
  }
  if (feature.bit.profile === 'dovetail' || feature.bit.profile === 't_slot' || feature.bit.profile === 'keyhole') {
    if (!(feature.bit.shankDiameter > 0) || feature.bit.shankDiameter >= feature.bit.diameter) {
      return 'Shank diameter must be greater than zero and smaller than the cutter diameter.';
    }
    const cutterHeight =
      feature.bit.profile === 'dovetail'
        ? (feature.bit.diameter - feature.bit.shankDiameter) /
          (2 * Math.tan((feature.bit.includedAngle * Math.PI) / 360))
        : feature.bit.cutterHeight;
    if (!(cutterHeight > 0) || cutterHeight > requestedDepth) {
      return `Route depth must be at least the ${formatMeasurementWithUnit(cutterHeight, units)} cutter height.`;
    }
  }
  // A router can travel in air before entering the stock, including on a
  // circle jig. Require a cutting span to reach the face, not every point.
  const halfPrimary = (frame.primarySize + feature.bit.diameter) / 2;
  const halfSecondary = (frame.secondarySize + feature.bit.diameter) / 2;
  const reachesFace = feature.path.points.some((point, index, points) => {
    if (!feature.path.closed && index === points.length - 1) return false;
    const next = points[(index + 1) % points.length];
    let enter = 0;
    let leave = 1;
    for (const [start, end, half] of [
      [point.primary, next.primary, halfPrimary],
      [point.secondary, next.secondary, halfSecondary]
    ]) {
      const delta = end - start;
      if (Math.abs(delta) < 1e-9) {
        if (Math.abs(start) > half) return false;
      } else {
        const a = (-half - start) / delta;
        const b = (half - start) / delta;
        enter = Math.max(enter, Math.min(a, b));
        leave = Math.min(leave, Math.max(a, b));
        if (enter > leave) return false;
      }
    }
    return true;
  });
  if (!reachesFace) return 'This route does not reach the stock. Move the path or its pivot onto the face.';
  if (feature.path.closed && feature.path.points.length < 3) {
    return 'A closed routed path needs at least three points.';
  }
  const spanCount = feature.path.closed ? feature.path.points.length : feature.path.points.length - 1;
  for (let index = 0; index < spanCount; index += 1) {
    const current = feature.path.points[index];
    const next = feature.path.points[(index + 1) % feature.path.points.length];
    if (Math.hypot(next.primary - current.primary, next.secondary - current.secondary) < 1e-9) {
      return `Route points ${index + 1} and ${((index + 1) % feature.path.points.length) + 1} overlap. Move or remove one point.`;
    }
  }

  return null;
}
