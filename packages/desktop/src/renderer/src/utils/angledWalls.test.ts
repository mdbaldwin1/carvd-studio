import { describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { Part, RectCutFeature } from '../types';
import { clearPartGeometryCache, getPartMaterialVolume } from './partFeatureGeometry';
import { getPartFeatureConflicts } from './partFeatureConflicts';
import { partsOverlap } from './overlapPolicy';
import { validateRectCutFeature } from './rectCutUtils';

vi.unmock('three');

const L = 10;
const W = 3;
const T = 0.75;

function socket(over: Partial<RectCutFeature['parameters']> = {}, id = 's'): RectCutFeature {
  return {
    id,
    kind: 'rect_cut',
    version: 1,
    enabled: true,
    cutType: 'mortise',
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'min' },
    parameters: { size: { length: 1, width: W }, depthMode: 'blind', depth: 0.5, ...over },
    placement: { x: 4.5, z: 0 }
  };
}

function boardWith(feature: RectCutFeature): Part {
  return createTestPart({
    id: 'b',
    length: L,
    width: W,
    thickness: T,
    position: { x: 0, y: T / 2, z: 0 },
    features: [feature]
  });
}

/** A frustum: the mouth as authored, the floor wider by the lean. */
function frustumVolume(length: number, depth: number, angle: number): number {
  const grow = Math.tan((angle * Math.PI) / 180) * depth;
  return ((length + (length + 2 * grow)) / 2) * W * depth;
}

describe('walls that lean off square', () => {
  it.each([7, 14])('takes out a frustum, not a box, at %d degrees', (angle) => {
    clearPartGeometryCache();
    const board = boardWith(socket({ wallAngle: angle }));
    const removed = L * W * T - getPartMaterialVolume(board);
    expect(removed).toBeCloseTo(frustumVolume(1, 0.5, angle), 4);
    // Strictly more than the square-walled pocket it started as.
    expect(removed).toBeGreaterThan(frustumVolume(1, 0.5, 0));
  });

  it('leans a socket cut right through as well as a blind one', () => {
    // A through dovetail's sockets are open at the far face and splayed all
    // the way, which is both at once.
    clearPartGeometryCache();
    const board = boardWith(socket({ depthMode: 'through', wallAngle: 10 }));
    expect(L * W * T - getPartMaterialVolume(board)).toBeCloseTo(frustumVolume(1, T, 10), 4);
  });

  it('lets a tail sit in the socket it was cut for, and refuses a fatter one', () => {
    clearPartGeometryCache();
    const host = boardWith(socket({ wallAngle: 14 }));
    const tail = createTestPart({
      id: 't',
      length: 0.98,
      width: W,
      thickness: 0.5,
      position: { x: 0, y: T - 0.25, z: 0 },
      features: []
    });
    expect(partsOverlap(tail, host)).toBe(false);
    expect(partsOverlap({ ...tail, length: 1.6 }, host)).toBe(true);
  });

  it('refuses a lean no cutter could make', () => {
    expect(validateRectCutFeature(socket({ wallAngle: 60 }), boardWith(socket()))).toContain('45 degrees');
    expect(validateRectCutFeature(socket({ wallAngle: 14 }), boardWith(socket()))).toBeNull();
  });
});

describe('a cut taken in the floor of an earlier one', () => {
  it('allows a pocket that reaches past the one above it', () => {
    // The pins of a secret mitred dovetail are chopped in the floor of the
    // rebate that hides them, so the rebate's footprint holds every one.
    const rebate = socket({ depth: 0.2 }, 'rebate');
    const pin: RectCutFeature = {
      ...socket({ depth: 0.5 }, 'pin'),
      parameters: { size: { length: 0.4, width: 1 }, depthMode: 'blind', depth: 0.5 },
      placement: { x: 4.8, z: 1 }
    };
    const part = createTestPart({ id: 'p', length: L, width: W, thickness: T, features: [rebate, pin] });
    expect(getPartFeatureConflicts(part.features ?? [], part)).toEqual([]);
  });

  it('still refuses one that reaches no further, because it removes nothing', () => {
    const rebate = socket({ depth: 0.5 }, 'rebate');
    const pin: RectCutFeature = {
      ...socket({ depth: 0.3 }, 'pin'),
      parameters: { size: { length: 0.4, width: 1 }, depthMode: 'blind', depth: 0.3 },
      placement: { x: 4.8, z: 1 }
    };
    const part = createTestPart({ id: 'p', length: L, width: W, thickness: T, features: [rebate, pin] });
    expect(getPartFeatureConflicts(part.features ?? [], part)).toContainEqual(
      expect.objectContaining({ code: 'rect_consumed', severity: 'error' })
    );
  });
});
