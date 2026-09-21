import type { Part, RectCutFeature } from '../types';

/**
 * A dado is cut across the grain. A groove runs with it.
 *
 * That is not a convention, it is what the two words mean, and it matters
 * because the two cuts behave differently: a dado severs fibres and leaves a
 * cross-grain housing, a groove follows them. Calling one by the other's name
 * in a cut list sends the wrong instruction to whoever is making it.
 *
 * Carvd tells them apart geometrically -- a dado spans the board's width, a
 * groove runs its length -- which is right only while the grain runs along the
 * length. On a board cross-cut from a wide panel, where the grain runs across
 * the width, the same two cuts swap meaning and the names come out backwards.
 */

/** Which way a rect cut travels across the board it is cut in. */
export type CutRun = 'across_width' | 'along_length';

const ACROSS_WIDTH: RectCutFeature['cutType'][] = ['dado', 'stopped_dado', 'half_lap'];
const ALONG_LENGTH: RectCutFeature['cutType'][] = ['groove', 'stopped_groove'];

export function getCutRun(cutType: RectCutFeature['cutType']): CutRun | null {
  if (ACROSS_WIDTH.includes(cutType)) return 'across_width';
  if (ALONG_LENGTH.includes(cutType)) return 'along_length';
  return null;
}

export interface GrainCutMismatch {
  featureId: string;
  cutType: RectCutFeature['cutType'];
  /** The name the cut should carry, given which way the grain actually runs. */
  shouldBe: 'dado' | 'groove';
  message: string;
}

/**
 * Cuts whose name disagrees with the grain they are actually cut in.
 *
 * Sheet goods are exempt: plywood and MDF have no single grain direction, so
 * neither name is wrong and there is nothing to report.
 */
export function findGrainCutMismatches(part: Part): GrainCutMismatch[] {
  if (!part.grainSensitive) return [];
  // A part with no grain direction to speak of cannot contradict one.
  if (part.grainDirection !== 'width') return [];

  const mismatches: GrainCutMismatch[] = [];

  for (const feature of part.features ?? []) {
    if (!feature.enabled || feature.kind !== 'rect_cut') continue;
    const run = getCutRun(feature.cutType);
    if (!run) continue;

    // The grain runs across the width here, so a cut spanning the width
    // follows it -- that is a groove -- and one running the length crosses it.
    const shouldBe = run === 'across_width' ? 'groove' : 'dado';
    const named = run === 'across_width' ? 'dado' : 'groove';
    if (shouldBe === named) continue;

    mismatches.push({
      featureId: feature.id,
      cutType: feature.cutType,
      shouldBe,
      message:
        shouldBe === 'groove'
          ? 'This runs with the grain, which makes it a groove rather than a dado. The grain on this part runs across its width.'
          : 'This runs across the grain, which makes it a dado rather than a groove. The grain on this part runs across its width.'
    });
  }

  return mismatches;
}
