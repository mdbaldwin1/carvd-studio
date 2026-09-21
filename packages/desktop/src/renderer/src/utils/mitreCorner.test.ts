import { describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { EndCutFeature, Part } from '../types';
import { getPartMaterialVolume } from './partFeatureGeometry';
import { partsOverlap } from './overlapPolicy';

vi.unmock('three');

const LENGTH = 12;
const WIDTH = 3;
const THICKNESS = 0.75;
/** Half the square the two pieces share, which each gives up to the other. */
const HALF_SQUARE = ((WIDTH * WIDTH) / 2) * THICKNESS;

function mitre(face: 'left_end' | 'right_end', horizontalFlip = false): EndCutFeature {
  return {
    id: `mitre-${face}-${horizontalFlip}`,
    kind: 'end_cut',
    version: 1,
    enabled: true,
    label: 'Mitre',
    target: { type: 'face', face },
    reference: { primaryFrom: face === 'left_end' ? 'min' : 'max' },
    cutType: 'mitre',
    lengthMode: 'long_point',
    parameters: { horizontalAngle: 45, horizontalFlip }
  };
}

function rail(features: EndCutFeature[]): Part {
  return createTestPart({
    id: 'rail',
    length: LENGTH,
    width: WIDTH,
    thickness: THICKNESS,
    position: { x: 0, y: THICKNESS / 2, z: 0 },
    features
  });
}

/**
 * The leg of the corner, turned a quarter about Y so it runs away in Z, with
 * its outer face flush to the rail's end and its mitre on the rail's near edge.
 */
function stile(features: EndCutFeature[]): Part {
  return createTestPart({
    id: 'stile',
    length: LENGTH,
    width: WIDTH,
    thickness: THICKNESS,
    rotation: { x: 0, y: 90, z: 0 },
    position: { x: LENGTH / 2 - WIDTH / 2, y: THICKNESS / 2, z: LENGTH / 2 - WIDTH / 2 },
    features
  });
}

describe('a mitred corner', () => {
  it('closes without the two halves fouling each other', () => {
    // A quarter turn about Y sends the leg's length down -Z, so the end that
    // reaches the corner is its right, not its left. The two mitres also have
    // to lean opposite ways: matched, both pieces keep the same half of the
    // square they share and drive straight through one another.
    const a = rail([mitre('right_end', true)]);
    const b = stile([mitre('right_end')]);
    expect(partsOverlap(a, b)).toBe(false);
    const box = LENGTH * WIDTH * THICKNESS;
    expect(getPartMaterialVolume(a)).toBeCloseTo(box - HALF_SQUARE, 4);
    expect(getPartMaterialVolume(b)).toBeCloseTo(box - HALF_SQUARE, 4);
  });

  it('fouls when both mitres lean the same way', () => {
    expect(partsOverlap(rail([mitre('right_end')]), stile([mitre('right_end')]))).toBe(true);
  });

  it('fouls when the leg is mitred on the end that is not at the corner', () => {
    // The trap the test bench fell into: mitring by name rather than by which
    // end the turn actually put at the corner cuts the far end, twelve inches
    // away, leaving the corner square whole on both pieces.
    expect(partsOverlap(rail([mitre('right_end', true)]), stile([mitre('left_end')]))).toBe(true);
  });
});
