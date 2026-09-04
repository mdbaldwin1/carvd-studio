import { Part } from '../types';
import { getPartEdgeBevelProfiles, getPartEndCutProfiles } from './endCutUtils';
import {
  getPartWorldContour,
  hasRenderablePartFeatures,
  partsOverlapOnYAxis,
  worldContoursOverlap
} from './partFeatureGeometry';
import {
  convexShapesOverlap,
  getPartConvexShape,
  getPartOBB,
  getPartSubOBBs,
  obbsOverlap,
  type PartOBB
} from './snapToPartsUtil';
import { dragDebug } from './dragDebug';
import type { GeometryCache } from '../interaction/geometry/cache';

const OBB_EPSILON = 1e-6;
const OBB_SEPARATION_TOLERANCE = 1e-8;
const CONTOUR_TOLERANCE = 1e-6;
const SAFE_SEARCH_STEPS = 14;
const MIN_DIRECTIONAL_FRACTION = 0.005;
type TranslationDelta = { x: number; y: number; z: number };

function hasVerticalEndCuts(part: Part): boolean {
  const profiles = getPartEndCutProfiles(part);
  if (profiles.left.verticalInset > 0 || profiles.right.verticalInset > 0) return true;
  // Long-edge bevels also remove material along Y, so they need the same
  // convex-shape treatment to avoid ghost corners at the beveled face.
  const edgeProfiles = getPartEdgeBevelProfiles(part);
  return edgeProfiles.front.inset > 0 || edgeProfiles.back.inset > 0;
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

export function partsOverlap(a: Part, b: Part, geometryCache?: GeometryCache): boolean {
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
  return obbsOverlap(
    getPartOBB(a, a.position, geometryCache),
    getPartOBB(b, b.position, geometryCache),
    OBB_EPSILON,
    OBB_SEPARATION_TOLERANCE,
    false
  );
}

export function wouldOverlapWithAny(part: Part, parts: Part[], geometryCache?: GeometryCache): boolean {
  for (const other of parts) {
    if (other.id === part.id) continue;
    if (partsOverlap(part, other, geometryCache)) return true;
  }
  return false;
}

export function wouldTransformedPartsOverlap(
  parts: Part[],
  transformedPartsById: Map<string, Part>,
  geometryCache?: GeometryCache
): boolean {
  if (transformedPartsById.size === 0) return false;

  const effectivePartsById = new Map(parts.map((p) => [p.id, transformedPartsById.get(p.id) ?? p]));

  for (const [transformedId, transformedPart] of transformedPartsById) {
    for (const other of parts) {
      if (other.id === transformedId) continue;

      // Pairs that do not involve a transformed part are unrelated to this
      // update and should not block valid changes elsewhere in the project.
      if (other.id < transformedId && transformedPartsById.has(other.id)) continue;

      const effectiveOther = effectivePartsById.get(other.id);
      if (effectiveOther && partsOverlap(transformedPart, effectiveOther, geometryCache)) {
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
  geometryCache?: GeometryCache,
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
      if (existingOverlapDoesNotWorsen(p, movedPart, other, geometryCache)) {
        continue;
      }
      if (partsOverlap(movedPart, other, geometryCache)) {
        return true;
      }
    }
  }

  return false;
}

function existingOverlapDoesNotWorsen(
  part: Part,
  movedPart: Part,
  other: Part,
  geometryCache?: GeometryCache
): boolean {
  if (!overlapCheckEnabled(part, other)) return true;
  // The depth comparison below reasons over raw OBBs, which is only valid
  // when the OBB is the actual overlap representation. Feature-bearing parts
  // (custom cuts) can interlock: their coarse OBBs overlap deeply and stably,
  // so any translation would look like "not worsening" and bypass the exact
  // contour/sub-OBB checks in partsOverlap.
  if ((part.features && part.features.length > 0) || (other.features && other.features.length > 0)) {
    return false;
  }
  const beforeDepth = getObbOverlapDepth(
    getPartOBB(part, part.position, geometryCache),
    getPartOBB(other, other.position, geometryCache)
  );
  if (beforeDepth === null) return false;

  const afterDepth = getObbOverlapDepth(
    getPartOBB(movedPart, movedPart.position, geometryCache),
    getPartOBB(other, other.position, geometryCache)
  );
  return afterDepth !== null && afterDepth <= beforeDepth + OBB_EPSILON;
}

function getObbOverlapDepth(a: PartOBB, b: PartOBB): number | null {
  const dot = (u: { x: number; y: number; z: number }, v: { x: number; y: number; z: number }) =>
    u.x * v.x + u.y * v.y + u.z * v.z;

  const R = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];
  const absR = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];

  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      R[i][j] = dot(a.axes[i], b.axes[j]);
      absR[i][j] = Math.abs(R[i][j]) + OBB_EPSILON;
    }
  }

  const tWorld = {
    x: b.center.x - a.center.x,
    y: b.center.y - a.center.y,
    z: b.center.z - a.center.z
  };
  const t = [dot(tWorld, a.axes[0]), dot(tWorld, a.axes[1]), dot(tWorld, a.axes[2])];
  let minDepth = Infinity;

  for (let i = 0; i < 3; i += 1) {
    const ra = a.halfExtents[i];
    const rb = b.halfExtents[0] * absR[i][0] + b.halfExtents[1] * absR[i][1] + b.halfExtents[2] * absR[i][2];
    const depth = ra + rb - Math.abs(t[i]);
    if (depth <= OBB_SEPARATION_TOLERANCE) return null;
    minDepth = Math.min(minDepth, depth);
  }

  for (let j = 0; j < 3; j += 1) {
    const ra = a.halfExtents[0] * absR[0][j] + a.halfExtents[1] * absR[1][j] + a.halfExtents[2] * absR[2][j];
    const rb = b.halfExtents[j];
    const depth = ra + rb - Math.abs(t[0] * R[0][j] + t[1] * R[1][j] + t[2] * R[2][j]);
    if (depth <= OBB_SEPARATION_TOLERANCE) return null;
    minDepth = Math.min(minDepth, depth);
  }

  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      if (Math.abs(R[i][j]) > 1 - OBB_EPSILON) continue;
      const ra = a.halfExtents[(i + 1) % 3] * absR[(i + 2) % 3][j] + a.halfExtents[(i + 2) % 3] * absR[(i + 1) % 3][j];
      const rb = b.halfExtents[(j + 1) % 3] * absR[i][(j + 2) % 3] + b.halfExtents[(j + 2) % 3] * absR[i][(j + 1) % 3];
      const depth = ra + rb - Math.abs(t[(i + 2) % 3] * R[(i + 1) % 3][j] - t[(i + 1) % 3] * R[(i + 2) % 3][j]);
      if (depth <= OBB_SEPARATION_TOLERANCE) return null;
      minDepth = Math.min(minDepth, depth);
    }
  }

  return minDepth;
}

export function resolveSafeTranslationDelta(
  parts: Part[],
  movingIds: Set<string>,
  proposedDelta: TranslationDelta,
  geometryCache?: GeometryCache,
  exemptIds?: Set<string>
): TranslationDelta | null {
  if (!wouldTranslationCauseOverlap(parts, movingIds, proposedDelta, geometryCache, exemptIds)) {
    return proposedDelta;
  }

  // First preference: preserve drag direction by finding the furthest safe
  // fraction along the full proposed vector.
  let low = 0;
  let high = 1;
  for (let i = 0; i < SAFE_SEARCH_STEPS; i += 1) {
    const mid = (low + high) / 2;
    const candidate = {
      x: proposedDelta.x * mid,
      y: proposedDelta.y * mid,
      z: proposedDelta.z * mid
    };
    if (wouldTranslationCauseOverlap(parts, movingIds, candidate, geometryCache, exemptIds)) {
      high = mid;
    } else {
      low = mid;
    }
  }
  if (low >= MIN_DIRECTIONAL_FRACTION) {
    const directionalSafe = {
      x: proposedDelta.x * low,
      y: proposedDelta.y * low,
      z: proposedDelta.z * low
    };
    dragDebug('overlapPolicy:directionalSafe', {
      movingIds: [...movingIds],
      proposedDelta,
      safeDelta: directionalSafe,
      fraction: low
    });
    return directionalSafe;
  }

  // Do not redirect onto other axes when blocked; stop instead.
  dragDebug('overlapPolicy:noDirectionalSafeDelta', {
    movingIds: [...movingIds],
    proposedDelta
  });
  return null;
}
