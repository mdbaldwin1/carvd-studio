import { describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { EndCutFeature, Part, RectCutFeature } from '../types';
import { clearPartGeometryCache, getPartMaterialVolume } from './partFeatureGeometry';
import { validateEndCutFeature } from './endCutUtils';
import { validateRectCutFeature } from './rectCutUtils';
import { partsOverlap } from './overlapPolicy';

vi.unmock('three');

const L = 10;
const W = 4;
const T = 1;
const ANGLE = 45;

function mitre(band?: { from: number; to: number }): EndCutFeature {
  return {
    id: 'mitre',
    kind: 'end_cut',
    version: 1,
    enabled: true,
    cutType: 'mitre',
    target: { type: 'face', face: 'right_end' },
    reference: { primaryFrom: 'max' },
    lengthMode: 'long_point',
    parameters: { horizontalAngle: ANGLE, horizontalFlip: false, verticalFlip: false, ...(band ? { band } : {}) }
  };
}

function removedBy(band?: { from: number; to: number }): number {
  clearPartGeometryCache();
  const part = createTestPart({ length: L, width: W, thickness: T, features: [mitre(band)] });
  return L * W * T - getPartMaterialVolume(part);
}

describe('an end cut that runs in a band of the thickness', () => {
  const whole = removedBy();

  it.each([
    [0, 1],
    [0, 0.5],
    [0.5, 1],
    [0.75, 1],
    [0.25, 0.75]
  ])('takes its share of the end between %s and %s', (from, to) => {
    // A mitre is square to nothing in particular, so the waste it removes is
    // the same shape at every height: a band takes exactly its fraction.
    expect(removedBy({ from, to })).toBeCloseTo(whole * (to - from), 4);
  });

  it('leaves the blank whole outside the band', () => {
    // The sliver of mitre that hides a secret dovetail is the whole point:
    // below it the end must still be square, with the stock all there.
    expect(removedBy({ from: 0.8125, to: 1 })).toBeLessThan(whole * 0.2);
    expect(removedBy({ from: 0.8125, to: 1 })).toBeGreaterThan(0);
  });

  it('refuses a band the board has no room for', () => {
    const part = createTestPart({ length: L, width: W, thickness: T, features: [] });
    expect(validateEndCutFeature(mitre({ from: 0, to: T + 1 }), part)).toContain('within the board thickness');
    expect(validateEndCutFeature(mitre({ from: 0.5, to: 0.5 }), part)).toContain('no height');
    expect(validateEndCutFeature(mitre({ from: 0.75, to: 1 }), part)).toBeNull();
  });

  it('lets a pocket sit behind the band, where that end is still square', () => {
    // Without this the pins of a secret mitred dovetail read as cut into
    // waste the mitre took, when the mitre never reached them.
    const pin: RectCutFeature = {
      id: 'pin',
      kind: 'rect_cut',
      version: 1,
      enabled: true,
      cutType: 'cutout',
      target: { type: 'face', face: 'bottom_face' },
      reference: { primaryFrom: 'min' },
      parameters: { size: { length: 1, width: 1 }, depthMode: 'blind', depth: 0.75 },
      placement: { x: L - 1, z: 1 }
    };
    const behind: Part = createTestPart({
      length: L,
      width: W,
      thickness: T,
      features: [mitre({ from: 0.75, to: 1 }), pin]
    });
    expect(validateRectCutFeature(pin, behind)).toBeNull();

    // The same pocket under a mitre that takes the whole end is still wrong.
    const under: Part = createTestPart({ length: L, width: W, thickness: T, features: [mitre(), pin] });
    expect(validateRectCutFeature(pin, under)).toContain('remaining material');
  });
});

describe('a mitre that runs in a band, and what can be pushed into it', () => {
  const T = 0.75;
  const mitredBoard = (banded: boolean): Part => {
    const mitre: EndCutFeature = {
      id: 'm',
      kind: 'end_cut',
      version: 1,
      enabled: true,
      cutType: 'mitre',
      target: { type: 'face', face: 'right_end' },
      lengthMode: 'long_point',
      reference: { primaryFrom: 'max' },
      parameters: { horizontalAngle: 45, verticalAngle: 0, ...(banded ? { band: { from: 0.5625, to: T } } : {}) }
    };
    return createTestPart({
      id: 'a',
      length: 12,
      width: 3,
      thickness: T,
      position: { x: 0, y: T / 2, z: 0 },
      features: [mitre]
    });
  };

  it('keeps the wood below the band solid against anything driven into it', () => {
    // Behind the mitred sliver the end is square, and that is where a secret
    // mitred dovetail keeps its pins. Read from the top the whole end looks
    // mitred away, which let the other half of the joint pass through it.
    const block = createTestPart({
      id: 'b',
      length: 0.3,
      width: 0.3,
      thickness: 0.3,
      position: { x: 5, y: 0.2, z: -1.2 }
    });
    expect(partsOverlap(mitredBoard(true), block)).toBe(true);
    // Mitred the whole way through, that corner really is gone -- which is
    // the shape the top view was reading, and why it said so.
    expect(partsOverlap(mitredBoard(false), block)).toBe(false);
  });
});
