import { describe, expect, it, vi } from 'vitest';

// Real joinery is settled against real material, so this suite needs the
// actual three.js geometry classes.
vi.unmock('three');

import type { Part } from '../types';
import deskFrame from '../../../../tests/fixtures/mortise-tenon-desk-frame.json';
import { detectFeatureMateSnaps, detectGroupFeatureMateSnaps } from './snapToPartsUtil';
import { resolveSafeTranslationDelta, wouldTransformedPartsOverlap } from './overlapPolicy';

const groupOne = deskFrame.groupOne as unknown as Part[];
const groupTwo = deskFrame.groupTwo as unknown as Part[];
const allParts = [...groupOne, ...groupTwo];
const named = (name: string) => allParts.find((part) => part.name === name)!;

/** The translation that carries the left assembly into the right one's tenons. */
function seatedDelta() {
  const anchor = groupOne[0];
  const mate = detectGroupFeatureMateSnaps(
    groupOne,
    { x: 0, y: 0, z: 0 },
    anchor.position,
    groupTwo,
    groupOne.map((part) => part.id),
    1
  );
  expect(mate.mateHostPartId, 'the frame should recognise its own joints').toBeDefined();
  return {
    x: mate.adjustedPosition.x - anchor.position.x,
    y: mate.adjustedPosition.y - anchor.position.y,
    z: mate.adjustedPosition.z - anchor.position.z
  };
}

describe('mortise and tenon desk frame', () => {
  it('seats a leg dragged onto an already placed rail', () => {
    // Assembling a frame means moving legs as often as rails. Mating used to
    // run one way only, so a leg snapped to nothing and had to be placed by
    // eye -- which is what leaves a joint a thousandth out.
    const apron = named('Left Side Apron');
    const leg = named('Front Left Leg');
    const nudged: Part = { ...leg, position: { ...leg.position, z: leg.position.z + 0.05 } };
    const mate = detectFeatureMateSnaps(nudged, nudged.position, [apron], [nudged.id], 1);
    expect(mate.mateHostPartId).toBe(apron.id);
    // The nudge is undone: the leg returns to its seat on the apron's tenon,
    // give or take the thousandth this frame already carries.
    expect(Math.abs(mate.adjustedPosition.z - leg.position.z)).toBeLessThan(0.002);
    expect(Math.abs(mate.adjustedPosition.z - nudged.position.z)).toBeGreaterThan(0.045);
  });

  it('seats on one joint exactly rather than between two that disagree', () => {
    // This frame's legs sit a thousandth apart, so its two joints ask for
    // slightly different translations. Averaging them seats neither, and with
    // mortises cut to size that reads as interference.
    const apron = named('Left Side Apron');
    const front = detectFeatureMateSnaps(apron, apron.position, [named('Front Left Leg')], [apron.id], 1);
    const back = detectFeatureMateSnaps(apron, apron.position, [named('Back Left Leg')], [apron.id], 1);
    const frontWants = front.adjustedPosition.z - apron.position.z;
    const backWants = back.adjustedPosition.z - apron.position.z;
    expect(Math.abs(frontWants - backWants)).toBeGreaterThan(1e-4);

    const both = detectFeatureMateSnaps(
      apron,
      apron.position,
      [named('Front Left Leg'), named('Back Left Leg')],
      [apron.id],
      1
    );
    const settled = both.adjustedPosition.z - apron.position.z;
    const mean = (frontWants + backWants) / 2;
    expect([frontWants, backWants].some((want) => Math.abs(settled - want) < 1e-9)).toBe(true);
    expect(Math.abs(settled - mean)).toBeGreaterThan(1e-6);
  });

  it('lets the frame close while it is being dragged', () => {
    // Every joint closes at once, but a drag preview names a single host. The
    // rest must still be recognised, or the move is refused and the drag holds
    // a tenon's length short with the joints open.
    const delta = seatedDelta();
    const movingIds = new Set(groupOne.map((part) => part.id));
    for (const host of [undefined, named('Front Right Leg').id, named('Back Right Leg').id]) {
      const safe = resolveSafeTranslationDelta(allParts, movingIds, delta, undefined, host);
      expect(safe, `host: ${host ?? 'none'}`).not.toBeNull();
      expect(safe!.x).toBeCloseTo(delta.x, 6);
      expect(safe!.z).toBeCloseTo(delta.z, 6);
    }
  });

  it('commits the closed frame instead of discarding the move', () => {
    // Overlap prevention runs again on commit. A tenon inside its mortise
    // interlocks, so a commit check that does not recognise the joint throws
    // the whole update away and the assembly drops back to where the drag
    // began -- previewing perfectly the entire time.
    const delta = seatedDelta();
    const transformed = new Map<string, Part>(
      groupOne.map((part) => [
        part.id,
        {
          ...part,
          position: {
            x: part.position.x + delta.x,
            y: part.position.y + delta.y,
            z: part.position.z + delta.z
          }
        }
      ])
    );
    expect(wouldTransformedPartsOverlap(allParts, transformed)).toBe(false);
  });
});
