import { Part } from '../types';
import { getPartOBB, obbsOverlap, type PartOBB } from './snapToPartsUtil';
import { dragDebug } from './dragDebug';
import type { GeometryCache } from '../interaction/geometry/cache';

const OBB_EPSILON = 1e-6;
const OBB_SEPARATION_TOLERANCE = 1e-8;
const SAFE_SEARCH_STEPS = 14;
const MIN_DIRECTIONAL_FRACTION = 0.005;
type TranslationDelta = { x: number; y: number; z: number };

export function overlapCheckEnabled(a: Part, b: Part): boolean {
  // If either part explicitly allows overlap, the pair is exempt.
  return !a.ignoreOverlap && !b.ignoreOverlap;
}

export function partsOverlap(a: Part, b: Part, geometryCache?: GeometryCache): boolean {
  if (!overlapCheckEnabled(a, b)) return false;
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
  geometryCache?: GeometryCache
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
  geometryCache?: GeometryCache
): TranslationDelta | null {
  if (!wouldTranslationCauseOverlap(parts, movingIds, proposedDelta, geometryCache)) {
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
    if (wouldTranslationCauseOverlap(parts, movingIds, candidate, geometryCache)) {
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
