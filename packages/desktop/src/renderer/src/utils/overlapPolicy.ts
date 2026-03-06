import { Part } from '../types';
import { getPartOBB, obbsOverlap } from './snapToPartsUtil';

const OBB_EPSILON = 1e-6;
const OBB_SEPARATION_TOLERANCE = 1e-8;
const MIN_SAFE_FRACTION = 1e-3;
const SAFE_SEARCH_STEPS = 14;
const SWEEP_PATH_STEPS = 24;
type TranslationDelta = { x: number; y: number; z: number };
type ResolveSafeTranslationOptions = {
  // When false, keep motion on the original movement vector (no axis redirection/sliding).
  allowAxisSliding?: boolean;
};

function lerpDelta(from: TranslationDelta, to: TranslationDelta, t: number): TranslationDelta {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    z: from.z + (to.z - from.z) * t
  };
}

function findFirstOverlapInterval(
  parts: Part[],
  movingIds: Set<string>,
  from: TranslationDelta,
  to: TranslationDelta,
  steps: number
): { safeT: number; blockedT: number } | null {
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    if (wouldTranslationCauseOverlap(parts, movingIds, lerpDelta(from, to, t))) {
      return { safeT: (i - 1) / steps, blockedT: t };
    }
  }
  return null;
}

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
  proposedDelta: TranslationDelta,
  options: ResolveSafeTranslationOptions = {}
): TranslationDelta | null {
  const { allowAxisSliding = true } = options;
  const origin: TranslationDelta = { x: 0, y: 0, z: 0 };
  const fullPathOverlap = findFirstOverlapInterval(parts, movingIds, origin, proposedDelta, SWEEP_PATH_STEPS);
  if (!fullPathOverlap) {
    return proposedDelta;
  }

  if (!allowAxisSliding) {
    let low = fullPathOverlap.safeT;
    let high = fullPathOverlap.blockedT;
    for (let i = 0; i < SAFE_SEARCH_STEPS; i += 1) {
      const mid = (low + high) / 2;
      const candidate = lerpDelta(origin, proposedDelta, mid);
      if (wouldTranslationCauseOverlap(parts, movingIds, candidate)) {
        high = mid;
      } else {
        low = mid;
      }
    }
    if (low < MIN_SAFE_FRACTION) return null;
    return lerpDelta(origin, proposedDelta, low);
  }

  // Resolve per-axis so tangential movement survives while penetration components are clamped.
  const safe: TranslationDelta = { x: 0, y: 0, z: 0 };
  const axes: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z'].sort(
    (a, b) => Math.abs(proposedDelta[b]) - Math.abs(proposedDelta[a])
  );

  for (const axis of axes) {
    const axisTarget = proposedDelta[axis];
    if (Math.abs(axisTarget) < 1e-9) continue;

    const axisStart: TranslationDelta = { x: safe.x, y: safe.y, z: safe.z };
    const fullAxisCandidate: TranslationDelta = {
      x: safe.x,
      y: safe.y,
      z: safe.z,
      [axis]: safe[axis] + axisTarget
    };
    const axisInterval = findFirstOverlapInterval(parts, movingIds, axisStart, fullAxisCandidate, SWEEP_PATH_STEPS);
    if (!axisInterval) {
      safe[axis] += axisTarget;
      continue;
    }

    let low = axisInterval.safeT;
    let high = axisInterval.blockedT;
    for (let i = 0; i < SAFE_SEARCH_STEPS; i += 1) {
      const mid = (low + high) / 2;
      const axisCandidate = lerpDelta(axisStart, fullAxisCandidate, mid);

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
