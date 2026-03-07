import { Part } from '../types';
import { getPartOBB, obbsOverlap } from './snapToPartsUtil';
import { dragDebug } from './dragDebug';

const OBB_EPSILON = 1e-6;
const OBB_SEPARATION_TOLERANCE = 1e-8;
const SAFE_SEARCH_STEPS = 14;
const MIN_DIRECTIONAL_FRACTION = 0.005;
type TranslationDelta = { x: number; y: number; z: number };

export function overlapCheckEnabled(a: Part, b: Part): boolean {
  // If either part explicitly allows overlap, the pair is exempt.
  return !a.ignoreOverlap && !b.ignoreOverlap;
}

export function partsOverlap(a: Part, b: Part): boolean {
  if (!overlapCheckEnabled(a, b)) return false;
  return obbsOverlap(getPartOBB(a), getPartOBB(b), OBB_EPSILON, OBB_SEPARATION_TOLERANCE, false);
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

export function wouldTranslationCauseOverlap(parts: Part[], movingIds: Set<string>, delta: TranslationDelta): boolean {
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
  proposedDelta: TranslationDelta
): TranslationDelta | null {
  if (!wouldTranslationCauseOverlap(parts, movingIds, proposedDelta)) {
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
    if (wouldTranslationCauseOverlap(parts, movingIds, candidate)) {
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
