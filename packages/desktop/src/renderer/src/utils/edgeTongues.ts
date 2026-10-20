import { getRectCutPlanBounds } from './rectCutUtils';
import type { Part, RectCutFeature } from '../types';

/** A full-length tongue left between matching top and bottom edge rebates.
 * Recognize the removed geometry equally for face cutouts and edge rabbets. */
export function getEdgeTongues(part: Part) {
  const enabled = (part.features ?? []).filter((feature) => feature.enabled);
  const rebates = enabled.filter(
    (feature): feature is RectCutFeature =>
      feature.kind === 'rect_cut' &&
      ['rabbet', 'cutout'].includes(feature.cutType) &&
      feature.parameters.depthMode === 'blind' &&
      !feature.parameters.taperAngle &&
      !feature.parameters.sideWallAngle &&
      !feature.parameters.wallAngle &&
      !feature.parameters.cornerRadius &&
      ((feature.target.type === 'face' && ['top_face', 'bottom_face'].includes(feature.target.face)) ||
        (feature.target.type === 'edge' &&
          ['top_front_edge', 'bottom_front_edge', 'top_back_edge', 'bottom_back_edge'].includes(feature.target.edge)))
  );
  return (['front', 'back'] as const).flatMap((edge) => {
    const strips = rebates.filter((cut) => {
      const b = getRectCutPlanBounds(cut, part);
      return (
        Math.abs(b.minX) < 1e-9 &&
        Math.abs(b.maxX - part.length) < 1e-9 &&
        (edge === 'back' ? Math.abs(b.minZ) < 1e-9 : Math.abs(b.maxZ - part.width) < 1e-9)
      );
    });
    const isTop = (cut: RectCutFeature) =>
      cut.target.type === 'face'
        ? cut.target.face === 'top_face'
        : cut.target.type === 'edge' && cut.target.edge.startsWith('top_');
    const top = strips.filter(isTop),
      bottom = strips.filter((cut) => !isTop(cut));
    if (top.length !== 1 || bottom.length !== 1) return [];
    const bounds = getRectCutPlanBounds(top[0], part);
    const bottomBounds = getRectCutPlanBounds(bottom[0], part);
    const topDepth = top[0].parameters.depth ?? 0;
    const bottomDepth = bottom[0].parameters.depth ?? 0;
    const projection = bounds.maxZ - bounds.minZ;
    const thickness = part.thickness - topDepth - bottomDepth;
    if (
      !Number.isFinite(topDepth + bottomDepth) ||
      topDepth <= 0 ||
      bottomDepth <= 0 ||
      thickness <= 1e-9 ||
      projection <= 0 ||
      projection >= part.width ||
      Math.abs(bounds.minZ - bottomBounds.minZ) > 1e-9 ||
      Math.abs(bounds.maxZ - bottomBounds.maxZ) > 1e-9
    )
      return [];
    if (
      enabled.some((cut) => {
        if (strips.includes(cut as RectCutFeature)) return false;
        // A shallow shoulder chamfer above/below the remaining tongue does not
        // alter its mating section, even where it crosses the rebate boundary.
        if (cut.kind === 'routed_path' && cut.parameters.depthMode === 'blind') {
          const allowance =
            cut.target.face === 'top_face' ? topDepth : cut.target.face === 'bottom_face' ? bottomDepth : 0;
          return !(allowance > 0 && (cut.parameters.depth ?? Infinity) <= allowance);
        }
        if (cut.kind !== 'rect_cut') return true;
        const b = getRectCutPlanBounds(cut, part);
        return b.minZ < bounds.maxZ - 1e-9 && b.maxZ > bounds.minZ + 1e-9;
      })
    )
      return [];
    return [
      {
        id: `tongue:${top[0].id}:${bottom[0].id}`,
        face: `${edge}_face` as 'front_face' | 'back_face',
        thickness,
        centerY: (bottomDepth - topDepth) / 2,
        projection
      }
    ];
  });
}

/** Recognize a full-width end rebate leaving a straight tongue above/below it. */
export function getEndTongues(part: Part) {
  const enabled = (part.features ?? []).filter((cut) => cut.enabled);
  const candidates = enabled.filter(
    (cut): cut is RectCutFeature =>
      cut.kind === 'rect_cut' &&
      ['cutout', 'rabbet'].includes(cut.cutType) &&
      cut.parameters.depthMode === 'blind' &&
      !cut.parameters.taperAngle &&
      !cut.parameters.sideWallAngle &&
      !cut.parameters.wallAngle &&
      !cut.parameters.cornerRadius &&
      ((cut.target.type === 'face' && ['top_face', 'bottom_face'].includes(cut.target.face)) ||
        (cut.target.type === 'edge' &&
          ['top_left_edge', 'bottom_left_edge', 'top_right_edge', 'bottom_right_edge'].includes(cut.target.edge)))
  );
  return (['left_end', 'right_end'] as const).flatMap((face) => {
    const strips = candidates.filter((cut) => {
      const b = getRectCutPlanBounds(cut, part);
      return (
        Math.abs(b.minZ) < 1e-9 &&
        Math.abs(b.maxZ - part.width) < 1e-9 &&
        (face === 'left_end' ? Math.abs(b.minX) < 1e-9 : Math.abs(b.maxX - part.length) < 1e-9)
      );
    });
    if (!strips.length || strips.length > 2) return [];
    const top = strips.filter((cut) =>
      cut.target.type === 'face'
        ? cut.target.face === 'top_face'
        : cut.target.type === 'edge' && cut.target.edge.startsWith('top')
    );
    const bottom = strips.filter((cut) => !top.includes(cut));
    if (top.length > 1 || bottom.length > 1) return [];
    const bounds = getRectCutPlanBounds(strips[0], part);
    const projection = bounds.maxX - bounds.minX;
    const topDepth = top[0]?.parameters.depth ?? 0;
    const bottomDepth = bottom[0]?.parameters.depth ?? 0;
    const thickness = part.thickness - topDepth - bottomDepth;
    if (
      !(projection > 0 && projection < part.length && thickness > 1e-9) ||
      strips.some(
        (cut) =>
          !Number.isFinite(cut.parameters.depth) ||
          (cut.parameters.depth ?? 0) <= 0 ||
          Math.abs(getRectCutPlanBounds(cut, part).maxX - getRectCutPlanBounds(cut, part).minX - projection) > 1e-9
      )
    )
      return [];
    // Do not infer a plain tongue when another operation cuts into this strip.
    if (
      enabled.some((cut) => {
        if (strips.includes(cut as RectCutFeature)) return false;
        if (cut.kind !== 'rect_cut') return true;
        const b = getRectCutPlanBounds(cut, part);
        return b.minX < bounds.maxX - 1e-9 && b.maxX > bounds.minX + 1e-9;
      })
    )
      return [];
    return [
      {
        id: `end-tongue:${strips.map((cut) => cut.id).join(':')}`,
        face,
        thickness,
        centerY: (bottomDepth - topDepth) / 2,
        projection
      }
    ];
  });
}
