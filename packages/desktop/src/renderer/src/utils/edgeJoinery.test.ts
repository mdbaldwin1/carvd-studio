import { describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { CircularCutFeature, Part, RectCutFeature } from '../types';
import { getPartMaterialVolume } from './partFeatureGeometry';
import { getPartFeatureSockets, detectFeatureMateSnaps } from './snapToPartsUtil';
import { wouldTransformedPartsOverlap } from './overlapPolicy';

vi.unmock('three');

const THICKNESS = 0.75;
const GROOVE_WIDTH = 0.25;
const GROOVE_DEPTH = 0.375;

/** A groove ploughed the length of a long edge, centred in the thickness. */
function edgeGroove(face: 'front_face' | 'back_face'): RectCutFeature {
  return {
    id: `groove-${face}`,
    kind: 'rect_cut',
    version: 1,
    enabled: true,
    cutType: 'groove',
    target: { type: 'face', face },
    reference: { primaryFrom: 'min' },
    parameters: { size: { length: 12, width: GROOVE_WIDTH }, depthMode: 'blind', depth: GROOVE_DEPTH },
    placement: { x: 0, z: (THICKNESS - GROOVE_WIDTH) / 2 }
  };
}

function groovedBoard(face: 'front_face' | 'back_face', z: number): Part {
  return createTestPart({
    id: `board-${face}`,
    length: 12,
    width: 5,
    thickness: THICKNESS,
    position: { x: 0, y: THICKNESS / 2, z },
    features: [edgeGroove(face)]
  });
}

describe('a groove ploughed in an edge', () => {
  it('actually takes material out of the board', () => {
    // It was drawable but never appeared in the part: grooves were allowed
    // only on the faces, so a panel, a spline and a tongue all had nothing to
    // sit in and read as driven into solid wood.
    const board = groovedBoard('back_face', 0);
    const removed = 12 * 5 * THICKNESS - getPartMaterialVolume(board);
    expect(removed).toBeCloseTo(12 * GROOVE_WIDTH * GROOVE_DEPTH, 4);
  });

  it('offers itself as a socket opening out of that edge', () => {
    const [socket] = getPartFeatureSockets(groovedBoard('back_face', 0));
    expect(socket.mateKind).toBe('groove');
    expect(socket.openingNormal.z).toBeCloseTo(-1, 6);
    expect(socket.halfExtent2).toBeCloseTo(GROOVE_WIDTH / 2, 6);
    expect(socket.through).toBe(false);
  });

  it('holds a spline in the grooves of two boards at once', () => {
    const a = groovedBoard('front_face', -2.5);
    const b = groovedBoard('back_face', 2.5);
    // 0.7 across a pair of 3/8" grooves, so it floats at both ends.
    const spline: Part = createTestPart({
      id: 'spline',
      length: 12,
      width: 0.7,
      thickness: GROOVE_WIDTH,
      position: { x: 0, y: THICKNESS / 2, z: 0 },
      features: []
    });
    for (const host of [a, b]) {
      expect(detectFeatureMateSnaps(spline, spline.position, [host], [spline.id], 0.03).mateHostPartId).toBe(host.id);
    }
    const parked: Part = { ...spline, position: { x: 900, y: THICKNESS / 2, z: 0 } };
    expect(wouldTransformedPartsOverlap([a, b, parked], new Map([[spline.id, spline]]))).toBe(false);
  });
});

describe('a peg driven through a joint', () => {
  /** A board bored right through its thickness at the centre. */
  function bored(id: string, y: number): Part {
    const hole: CircularCutFeature = {
      id: `hole-${id}`,
      kind: 'circular_cut',
      version: 1,
      enabled: true,
      cutType: 'round_hole',
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'center', secondaryFrom: 'center' },
      placement: { primary: 0, secondary: 0, rotation: 0 },
      parameters: { diameter: 0.25, depthMode: 'through', tilt: 0, direction: 0 }
    };
    return createTestPart({
      id,
      length: 12,
      width: 3,
      thickness: 0.375,
      position: { x: 0, y, z: 0 },
      features: [hole]
    });
  }

  it('passes out of the far side of a hole that is open at both ends', () => {
    // A pin goes right through both halves of a lap. Treating the bottom of a
    // through hole as a floor made that the one thing it could not do: the
    // peg read as driven into solid wood the moment it left the first board.
    const lower = bored('lower', 0.1875);
    const upper = bored('upper', 0.5625);
    const peg: Part = createTestPart({
      id: 'peg',
      length: 0.75,
      width: 0.25,
      thickness: 0.25,
      rotation: { x: 0, y: 0, z: 90 },
      position: { x: 0, y: 0.375, z: 0 },
      features: []
    });
    for (const host of [lower, upper]) {
      expect(detectFeatureMateSnaps(peg, peg.position, [host], [peg.id], 0.03).mateHostPartId).toBe(host.id);
    }
    const parked: Part = { ...peg, position: { x: 900, y: 0.375, z: 0 } };
    expect(wouldTransformedPartsOverlap([lower, upper, parked], new Map([[peg.id, peg]]))).toBe(false);
  });

  it('still refuses a peg nowhere near the holes', () => {
    const lower = bored('lower', 0.1875);
    const upper = bored('upper', 0.5625);
    const astray: Part = createTestPart({
      id: 'peg',
      length: 0.75,
      width: 0.25,
      thickness: 0.25,
      rotation: { x: 0, y: 0, z: 90 },
      position: { x: 4, y: 0.375, z: 0 },
      features: []
    });
    const parked: Part = { ...astray, position: { x: 900, y: 0.375, z: 0 } };
    expect(wouldTransformedPartsOverlap([lower, upper, parked], new Map([[astray.id, astray]]))).toBe(true);
  });
});
