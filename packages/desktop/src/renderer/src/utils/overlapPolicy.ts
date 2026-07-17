import { Part } from '../types';
import { getPartOBB, obbsOverlap } from './snapToPartsUtil';
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
      if (partsOverlap(movedPart, other, geometryCache)) {
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
