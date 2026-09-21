import { describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { Part, RectCutFeature } from '../types';
import { clearPartGeometryCache, getPartMaterialVolume } from './partFeatureGeometry';
import { getPartFeatureConflicts } from './partFeatureConflicts';
import { partsOverlap } from './overlapPolicy';
import { getPartMaterialOBBs } from './snapToPartsUtil';
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

/**
 * A pocket has two pairs of walls and they lean independently, so which pair
 * leaned is the thing worth measuring. These use a pocket that is longer one
 * way than the other, because on a square one every wrong answer looks right.
 */
describe('which pair of walls leans', () => {
  const rect = (over: Partial<RectCutFeature['parameters']> = {}): RectCutFeature => ({
    ...socket(),
    parameters: { size: { length: 1, width: 2 }, depthMode: 'blind', depth: 0.5, ...over },
    placement: { x: 4.5, z: 0.5 }
  });
  const removedBy = (feature: RectCutFeature) => {
    clearPartGeometryCache();
    return L * W * T - getPartMaterialVolume(boardWith(feature));
  };
  const lean = (depth: number, angle: number) => Math.tan((angle * Math.PI) / 180) * depth;

  it('leans the ends of the length for a wall angle', () => {
    // The undercut of a sliding dovetail's housing: the 1in span opens out.
    expect(removedBy(rect({ wallAngle: 10 }))).toBeCloseTo((1 + lean(0.5, 10)) * 2 * 0.5, 4);
  });

  it('leans the sides of the width for a side wall angle', () => {
    // The pin board of a through dovetail: the 2in span opens out instead,
    // which removes a different amount of wood from the same pocket.
    expect(removedBy(rect({ sideWallAngle: 10 }))).toBeCloseTo(1 * (2 + lean(0.5, 10)) * 0.5, 4);
  });

  it('leans both pairs at once when both are given', () => {
    const k = Math.tan((10 * Math.PI) / 180);
    const d = 0.5;
    // The pocket is a pyramid frustum, not a wedge: integrate the growing
    // rectangle rather than trusting either angle on its own.
    expect(removedBy(rect({ wallAngle: 10, sideWallAngle: 10 }))).toBeCloseTo(
      1 * 2 * d + k * d * d * (1 + 2) + (4 / 3) * k * k * d * d * d,
      4
    );
  });

  it('refuses a side lean no cutter could make', () => {
    expect(validateRectCutFeature(rect({ sideWallAngle: 60 }), boardWith(rect()))).toContain('45 degrees');
    expect(validateRectCutFeature(rect({ sideWallAngle: -14 }), boardWith(rect()))).toBeNull();
  });
});

/**
 * The flare of a through dovetail is not a leaning wall at all. The walls
 * stay square to the face and the footprint stops being a rectangle, which
 * is what a saw held upright but skewed in plan actually cuts.
 */
describe('a footprint that tapers across the face', () => {
  const rect = (over: Partial<RectCutFeature['parameters']> = {}): RectCutFeature => ({
    ...socket(),
    cutType: 'cutout',
    parameters: { size: { length: 1, width: 2 }, depthMode: 'through', ...over },
    placement: { x: 4.5, z: 0.5 }
  });
  const removedBy = (feature: RectCutFeature) => {
    clearPartGeometryCache();
    return L * W * T - getPartMaterialVolume(boardWith(feature));
  };

  it('widens the far end of the pocket by the taper', () => {
    const flare = Math.tan((10 * Math.PI) / 180) * 1;
    expect(removedBy(rect({ taperAngle: 10 }))).toBeCloseTo(((2 + (2 + 2 * flare)) / 2) * 1 * T, 4);
  });

  it('narrows it again for a negative taper', () => {
    const flare = Math.tan((10 * Math.PI) / 180) * 1;
    expect(removedBy(rect({ taperAngle: -10 }))).toBeCloseTo(((2 + (2 - 2 * flare)) / 2) * 1 * T, 4);
  });

  it('keeps the walls square to the surface', () => {
    // A taper is the same trapezoid at every depth, so half the thickness
    // takes exactly half the wood. A leaning wall would not.
    const through = removedBy(rect({ taperAngle: 10 }));
    const half = removedBy(rect({ taperAngle: 10, depthMode: 'blind', depth: T / 2 }));
    expect(half).toBeCloseTo(through / 2, 4);
  });

  it('is a different cut from a wall of the same angle', () => {
    // The bug this guards: the taper measured down the depth instead of
    // along the length. On a pocket whose length and thickness differ, the
    // two answers cannot be confused.
    expect(removedBy(rect({ taperAngle: 10 }))).not.toBeCloseTo(removedBy(rect({ sideWallAngle: 10 })), 4);
  });

  it('refuses a taper that closes the pocket, or one no dovetail wants', () => {
    expect(validateRectCutFeature(rect({ taperAngle: 40 }), boardWith(rect()))).toContain('30 degrees');
    expect(validateRectCutFeature(rect({ taperAngle: -45 }), boardWith(rect()))).toContain('30 degrees');
    // Narrower than twice its own flare, the trapezoid crosses itself.
    const narrow = rect({ size: { length: 1, width: 1 }, taperAngle: -30 });
    expect(validateRectCutFeature(narrow, boardWith(narrow))).toContain('closes the pocket');
    expect(validateRectCutFeature(rect({ taperAngle: 10, cornerRadius: 0.2 }), boardWith(rect()))).toContain(
      'radiused corners'
    );
    expect(validateRectCutFeature(rect({ taperAngle: 10 }), boardWith(rect()))).toBeNull();
  });
});

/**
 * The two halves of a dovetail are cut on different axes, so the only way to
 * know they describe the same joint is to measure them against each other:
 * the wood the tail board has left standing in the joint has to be exactly
 * the wood the pin board has taken away. Anything else is a joint that binds
 * or a joint that rattles, and either way the flare is on the wrong pair of
 * faces.
 */
describe('the two halves of a dovetail', () => {
  const DL = 12;
  const DW = 3;
  const cut = (id: string, z: number, width: number, over: Partial<RectCutFeature['parameters']>): RectCutFeature => ({
    id,
    kind: 'rect_cut',
    version: 1,
    enabled: true,
    cutType: 'cutout',
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'min' },
    parameters: { size: { length: 0.75, width }, depthMode: 'through', ...over },
    placement: { x: 0, z }
  });
  const dovetailBoard = (id: string, features: RectCutFeature[]) =>
    createTestPart({ id, length: DL, width: DW, thickness: T, features });
  const removedFrom = (part: Part) => {
    clearPartGeometryCache();
    return DL * DW * T - getPartMaterialVolume(part);
  };

  it('closes a through dovetail exactly', () => {
    // Station 09: half pin, tail, pin, tail, half pin across three inches.
    // The tail board is sawn along its length, so its flare is a taper in
    // the face; the pin board is bored through its thickness, so the same
    // flare leans down the depth of its sockets.
    const tails = dovetailBoard(
      'tails',
      [0, 1.3, 2.6].map((z, i) => cut(`p${i}`, z, 0.4, { taperAngle: 10 }))
    );
    const pins = dovetailBoard(
      'pins',
      [0.4, 1.7].map((z, i) => cut(`t${i}`, z, 0.9, { sideWallAngle: -10 }))
    );
    // The joint zone is one board thickness deep across the full width.
    const standing = 0.75 * DW * T - removedFrom(tails);
    expect(standing).toBeCloseTo(removedFrom(pins), 4);
  });

  it('closes a half-blind dovetail exactly', () => {
    // Station 10: the sockets stop short, so the plane where the two
    // patterns agree moves to the front's face -- the tails at their
    // narrowest -- and each socket opens out from there to its floor.
    const depth = 0.5;
    const flare = Math.tan((10 * Math.PI) / 180) * depth;
    const side = dovetailBoard(
      'side',
      [0, 1.3, 2.6].map((z, i) => cut(`p${i}`, z, 0.4, { size: { length: depth, width: 0.4 }, taperAngle: 10 }))
    );
    const front = dovetailBoard(
      'front',
      [0.4, 1.7].map((z, i) => ({
        ...cut(`t${i}`, z + flare, 0.9 - 2 * flare, {
          size: { length: 0.75, width: 0.9 - 2 * flare },
          depthMode: 'blind',
          depth,
          sideWallAngle: 10
        })
      }))
    );
    const standing = depth * DW * T - removedFrom(side);
    expect(standing).toBeCloseTo(removedFrom(front), 4);
  });

  it('does not close when the flare is taken on the wrong pair of faces', () => {
    // The bug as it was: both boards leaning their length ends through the
    // thickness. The tails no longer fill the sockets they were cut for.
    const tails = dovetailBoard(
      'tails',
      [0, 1.3, 2.6].map((z, i) => cut(`p${i}`, z, 0.4, { wallAngle: 10 }))
    );
    const pins = dovetailBoard(
      'pins',
      [0.4, 1.7].map((z, i) => cut(`t${i}`, z, 0.9, { wallAngle: 10 }))
    );
    const standing = 0.75 * DW * T - removedFrom(tails);
    expect(standing).not.toBeCloseTo(removedFrom(pins), 2);
  });
});

/**
 * The cell grid that mate seating is judged against is boxes, and a leaning
 * or tapering cut is not. It has to err by modelling the cut a shade large:
 * modelled small it leaves wood in the grid that the saw took out, and the
 * joint cut to fit is refused as driven into solid stock.
 */
describe('the cells a splayed cut leaves behind', () => {
  const board = (over: Partial<RectCutFeature['parameters']>) =>
    createTestPart({
      id: 'b',
      length: L,
      width: W,
      thickness: T,
      position: { x: 0, y: 0, z: 0 },
      features: [
        {
          ...socket(),
          cutType: 'mortise',
          parameters: { size: { length: 1, width: 1 }, depthMode: 'blind', depth: 0.5, ...over },
          placement: { x: 4.5, z: 1 }
        }
      ]
    });
  const inAnyCell = (part: Part, point: { x: number; y: number; z: number }) =>
    getPartMaterialOBBs(part).some((obb) =>
      (['x', 'y', 'z'] as const).every(
        (axis, index) => Math.abs(point[axis] - obb.center[axis]) <= obb.halfExtents[index] + 1e-9
      )
    );

  it('clears the wood a leaning wall took, not just the mouth of the pocket', () => {
    const angled = board({ sideWallAngle: 20 });
    // Just outside the mouth, but well inside the pocket down at the floor.
    // The pocket is z -0.5..0.5 at its mouth and opens to 0.68 at its floor.
    const flared = { x: 0, y: -0.12, z: 0.6 };
    expect(inAnyCell(board({}), flared)).toBe(true);
    expect(inAnyCell(angled, flared)).toBe(false);
    // Wood the cut never reaches stays wood.
    expect(inAnyCell(angled, { x: 0, y: 0, z: -1.4 })).toBe(true);
  });

  it('clears the wood a taper took at the far end of the pocket', () => {
    const tapered = board({ depthMode: 'through', taperAngle: 20 });
    // Square, the pocket never passes z 0.5; tapered it reaches 0.86 by its
    // far end, so this point is wood in the one and air in the other.
    const flared = { x: 0.45, y: 0, z: 0.6 };
    expect(inAnyCell(board({ depthMode: 'through' }), flared)).toBe(true);
    expect(inAnyCell(tapered, flared)).toBe(false);
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
