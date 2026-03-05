import { Part } from '../types';
import { getPartOBB, obbsOverlap } from './snapToPartsUtil';

const OBB_EPSILON = 1e-6;
const OBB_SEPARATION_TOLERANCE = 1e-8;
const MIN_SAFE_FRACTION = 1e-3;
const SAFE_SEARCH_STEPS = 14;
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
    if (!wouldTranslationCauseOverlap(parts, movingIds, fullAxisCandidate)) {
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

      if (wouldTranslationCauseOverlap(parts, movingIds, axisCandidate)) {
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

  return safe;
}
