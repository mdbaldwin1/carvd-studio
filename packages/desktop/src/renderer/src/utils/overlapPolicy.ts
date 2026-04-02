import { Part } from '../types';
import { getPartEndCutProfiles } from './endCutUtils';
import {
  getPartWorldContour,
  hasRenderablePartFeatures,
  partsOverlapOnYAxis,
  worldContoursOverlap
} from './partFeatureGeometry';
import { convexShapesOverlap, getPartConvexShape, getPartOBB, getPartSubOBBs, obbsOverlap } from './snapToPartsUtil';

const OBB_EPSILON = 1e-6;
const OBB_SEPARATION_TOLERANCE = 1e-8;
const CONTOUR_TOLERANCE = 1e-6;
const MIN_SAFE_FRACTION = 1e-3;
const SAFE_SEARCH_STEPS = 14;
type TranslationDelta = { x: number; y: number; z: number };

function hasVerticalEndCuts(part: Part): boolean {
  const profiles = getPartEndCutProfiles(part);
  return profiles.left.verticalInset > 0 || profiles.right.verticalInset > 0;
}

function hasNonRectangularContour(part: Part): boolean {
  if (!hasRenderablePartFeatures(part)) return false;
  const features = (part.features ?? []).filter((f) => f.enabled);
  return features.some(
    (f) => f.kind === 'rect_cut' && (f as { parameters: { depthMode: string } }).parameters.depthMode === 'through'
  );
}

/** True when the part lies flat (only rotated around Y, if at all). */
function isFlat(part: Part): boolean {
  const rx = Math.abs(part.rotation.x % 360);
  const rz = Math.abs(part.rotation.z % 360);
  return (
    (rx < 0.01 || Math.abs(rx - 180) < 0.01 || Math.abs(rx - 360) < 0.01) &&
    (rz < 0.01 || Math.abs(rz - 180) < 0.01 || Math.abs(rz - 360) < 0.01)
  );
}

export function overlapCheckEnabled(a: Part, b: Part): boolean {
  // If either part explicitly allows overlap, the pair is exempt.
  return !a.ignoreOverlap && !b.ignoreOverlap;
}

export function partsOverlap(a: Part, b: Part): boolean {
  if (!overlapCheckEnabled(a, b)) return false;

  // Use convex shape SAT when either part has vertical end cuts (bevels,
  // compounds) that remove material along the Y axis — OBB cannot represent
  // the angled face and creates a "ghost corner".
  if (hasVerticalEndCuts(a) || hasVerticalEndCuts(b)) {
    return convexShapesOverlap(getPartConvexShape(a), getPartConvexShape(b), OBB_SEPARATION_TOLERANCE, false);
  }

  // For flat parts with through-depth features (corner notches, edge notches, etc.),
  // use direct 2D polygon intersection on the actual contour shape.
  // This is exact for any contour geometry — no sub-box approximation.
  // Non-flat parts (rotated around X or Z) fall through to the sub-OBB path
  // because the 2D contour projection doesn't work for tilted parts.
  if (hasNonRectangularContour(a) || hasNonRectangularContour(b)) {
    if (isFlat(a) && isFlat(b)) {
      if (!partsOverlapOnYAxis(a, b, CONTOUR_TOLERANCE)) return false;
      const contourA = getPartWorldContour(a);
      const contourB = getPartWorldContour(b);
      return worldContoursOverlap(contourA, contourB, CONTOUR_TOLERANCE);
    }

    // Non-flat featured parts: use sub-OBB decomposition which handles 3D rotation
    const obbsA = getPartSubOBBs(a);
    const obbsB = getPartSubOBBs(b);
    for (const obbA of obbsA) {
      for (const obbB of obbsB) {
        if (obbsOverlap(obbA, obbB, OBB_EPSILON, OBB_SEPARATION_TOLERANCE, false)) {
          return true;
        }
      }
    }
    return false;
  }

  // Simple rectangular parts: fast OBB test
  const obbA = getPartOBB(a);
  const obbB = getPartOBB(b);
  return obbsOverlap(obbA, obbB, OBB_EPSILON, OBB_SEPARATION_TOLERANCE, false);
}

export function wouldOverlapWithAny(part: Part, parts: Part[]): boolean {
  for (const other of parts) {
    if (other.id === part.id) continue;
    if (partsOverlap(part, other)) return true;
  }
  return false;
}

export function wouldTransformedPartsOverlap(parts: Part[], transformedPartsById: Map<string, Part>): boolean {
  const effectiveParts = parts.map((p) => transformedPartsById.get(p.id) ?? p);

  for (let i = 0; i < effectiveParts.length; i += 1) {
    for (let j = i + 1; j < effectiveParts.length; j += 1) {
      if (partsOverlap(effectiveParts[i], effectiveParts[j])) {
        return true;
      }
    }
  }

  return false;
}

export function wouldTranslationCauseOverlap(
  parts: Part[],
  movingIds: Set<string>,
  delta: TranslationDelta,
  exemptIds?: Set<string>
): boolean {
  for (const p of parts) {
    if (!movingIds.has(p.id)) continue;

    const movedPart: Part = {
      ...p,
      position: {
        x: p.position.x + delta.x,
        y: p.position.y + delta.y,
        z: p.position.z + delta.z
      }
    };

    for (const other of parts) {
      if (movingIds.has(other.id)) continue;
      if (exemptIds && exemptIds.has(other.id)) continue;
      if (partsOverlap(movedPart, other)) {
        return true;
      }
    }
  }

  return false;
}

export function resolveSafeTranslationDelta(
  parts: Part[],
  movingIds: Set<string>,
  proposedDelta: TranslationDelta,
  exemptIds?: Set<string>
): TranslationDelta | null {
  if (!wouldTranslationCauseOverlap(parts, movingIds, proposedDelta, exemptIds)) {
    return proposedDelta;
  }

  // Resolve per-axis so tangential movement survives while penetration components are clamped.
  const safe: TranslationDelta = { x: 0, y: 0, z: 0 };
  const axes: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z'].sort(
    (a, b) => Math.abs(proposedDelta[b]) - Math.abs(proposedDelta[a])
  );

  for (const axis of axes) {
    const axisTarget = proposedDelta[axis];
    if (Math.abs(axisTarget) < 1e-9) continue;

    const fullAxisCandidate: TranslationDelta = {
      x: safe.x,
      y: safe.y,
      z: safe.z,
      [axis]: safe[axis] + axisTarget
    };
    if (!wouldTranslationCauseOverlap(parts, movingIds, fullAxisCandidate, exemptIds)) {
      safe[axis] += axisTarget;
      continue;
    }

    let low = 0;
    let high = 1;
    for (let i = 0; i < SAFE_SEARCH_STEPS; i += 1) {
      const mid = (low + high) / 2;
      const axisCandidate: TranslationDelta = {
        x: safe.x,
        y: safe.y,
        z: safe.z,
        [axis]: safe[axis] + axisTarget * mid
      };

      if (wouldTranslationCauseOverlap(parts, movingIds, axisCandidate, exemptIds)) {
        high = mid;
      } else {
        low = mid;
      }
    }

    if (low >= MIN_SAFE_FRACTION) {
      safe[axis] += axisTarget * low;
    }
  }

  const movedDistance = Math.abs(safe.x) + Math.abs(safe.y) + Math.abs(safe.z);
  if (movedDistance < 1e-6) return null;

  // Final verification: the per-axis binary search resolves each axis
  // independently, but the combined result could overlap when the collision
  // boundary is non-convex (e.g. L-shaped sub-OBB regions). If the combined
  // result overlaps, zero out the later-resolved axes one at a time until
  // the result is safe.
  if (wouldTranslationCauseOverlap(parts, movingIds, safe, exemptIds)) {
    // Try dropping axes in reverse resolution order (smallest delta first).
    // The dominant axis is most likely safe on its own.
    const reverseAxes = [...axes].reverse();
    for (const dropAxis of reverseAxes) {
      safe[dropAxis] = 0;
      if (!wouldTranslationCauseOverlap(parts, movingIds, safe, exemptIds)) {
        break;
      }
    }
    // If still overlapping after dropping all minor axes, reject entirely.
    if (wouldTranslationCauseOverlap(parts, movingIds, safe, exemptIds)) {
      return null;
    }
    const reducedDistance = Math.abs(safe.x) + Math.abs(safe.y) + Math.abs(safe.z);
    if (reducedDistance < 1e-6) return null;
  }

  return safe;
}
