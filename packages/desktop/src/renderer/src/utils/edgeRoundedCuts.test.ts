import { describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import type { Part, RoundedCutFeature } from '../types';
import { getPartMaterialVolume, getPartRenderGeometry } from './partFeatureGeometry';
import { detectFeatureMateSnaps, getPartFeatureSockets } from './snapToPartsUtil';
import { wouldTransformedPartsOverlap } from './overlapPolicy';

vi.unmock('three');

const MM = 1 / 25.4;
const SLOT_LENGTH = 56 * MM;
const SLOT_WIDTH = 4 * MM;
const SLOT_DEPTH = 0.5;

/**
 * The slot a plate joiner cuts: in the edge two boards meet on, with the
 * blade's arc left at each end.
 */
function biscuitSlot(face: 'front_face' | 'back_face' | 'top_face'): RoundedCutFeature {
  return {
    id: `slot-${face}`,
    kind: 'rounded_cut',
    version: 1,
    enabled: true,
    cutType: 'rounded_slot',
    target: { type: 'face', face },
    reference: { primaryFrom: 'center', secondaryFrom: 'center' },
    parameters: {
      length: SLOT_LENGTH,
      width: SLOT_WIDTH,
      cornerRadius: SLOT_WIDTH / 2,
      depthMode: 'blind',
      depth: SLOT_DEPTH
    },
    placement: { primary: 0, secondary: 0, rotation: 0 }
  };
}

function boardWith(face: 'front_face' | 'back_face', z: number): Part {
  return createTestPart({
    id: face === 'front_face' ? 'a' : 'b',
    length: 12,
    width: 6,
    thickness: 0.75,
    position: { x: 0, y: 0.375, z },
    features: [biscuitSlot(face)]
  });
}

/** A #20 biscuit lying across the seam, half into each board. */
function biscuit(): Part {
  return createTestPart({
    id: 'biscuit',
    length: SLOT_LENGTH,
    width: 23 * MM,
    thickness: SLOT_WIDTH,
    position: { x: 0, y: 0.375, z: 0 },
    features: []
  });
}

/** The extent of whatever was cut away, in the part's own axes. */
function cutBounds(part: Part) {
  const geometry = getPartRenderGeometry({ ...part, position: { x: 0, y: 0, z: 0 } });
  const position = geometry.getAttribute('position');
  const halfLength = part.length / 2;
  const halfWidth = part.width / 2;
  const box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    // Anything off the part's own outer planes belongs to the recess.
    if (Math.abs(z) >= halfWidth - 1e-6 || Math.abs(x) >= halfLength - 1e-6) continue;
    box.minX = Math.min(box.minX, x);
    box.maxX = Math.max(box.maxX, x);
    box.minY = Math.min(box.minY, y);
    box.maxY = Math.max(box.maxY, y);
    box.minZ = Math.min(box.minZ, z);
    box.maxZ = Math.max(box.maxZ, z);
  }
  return box;
}

describe('rounded cuts in an edge', () => {
  it('cuts the edge, not the face', () => {
    const board = boardWith('front_face', 0);
    const box = cutBounds(board);
    // Centred along the board and through its thickness, standing in from the
    // front edge by the slot's depth.
    expect(box.minX).toBeCloseTo(-SLOT_LENGTH / 2, 3);
    expect(box.maxX).toBeCloseTo(SLOT_LENGTH / 2, 3);
    expect(box.minY).toBeCloseTo(-SLOT_WIDTH / 2, 3);
    expect(box.maxY).toBeCloseTo(SLOT_WIDTH / 2, 3);
    expect(box.maxZ).toBeCloseTo(board.width / 2 - SLOT_DEPTH, 3);
  });

  it('takes the back edge when that is the one asked for', () => {
    const box = cutBounds(boardWith('back_face', 0));
    expect(box.minZ).toBeCloseTo(-(6 / 2) + SLOT_DEPTH, 3);
  });

  it('leaves the arc at each end rather than squaring it off', () => {
    // A stadium is a rectangle less the two half-width corners it rounds off,
    // so it removes pi/4 of the corner squares less than a square-ended slot.
    const board = boardWith('front_face', 0);
    const removed = 12 * 6 * 0.75 - getPartMaterialVolume(board);
    const squareEnded = SLOT_LENGTH * SLOT_WIDTH * SLOT_DEPTH;
    const stadium = ((SLOT_LENGTH - SLOT_WIDTH) * SLOT_WIDTH + Math.PI * (SLOT_WIDTH / 2) ** 2) * SLOT_DEPTH;
    expect(removed).toBeLessThan(squareEnded);
    expect(removed).toBeCloseTo(stadium, 2);
  });

  it('offers the slot as a socket, opening out of the edge', () => {
    const [socket] = getPartFeatureSockets(boardWith('front_face', 0));
    expect(socket).toBeDefined();
    expect(socket.mateKind).toBe('rounded_slot');
    expect(socket.openingNormal.z).toBeCloseTo(1, 6);
    expect(socket.halfExtent1).toBeCloseTo(SLOT_LENGTH / 2, 6);
    expect(socket.halfExtent2).toBeCloseTo(SLOT_WIDTH / 2, 6);
    expect(socket.depth).toBeCloseTo(SLOT_DEPTH, 6);
  });

  it('seats a biscuit in both boards at once', () => {
    const a = boardWith('front_face', -3);
    const b = boardWith('back_face', 3);
    const pip = biscuit();
    for (const host of [a, b]) {
      expect(detectFeatureMateSnaps(pip, pip.position, [host], [pip.id], 0.03).mateHostPartId).toBe(host.id);
    }
  });

  it('keeps the biscuit on commit even though it floats in its slots', () => {
    // A biscuit is deliberately narrower than its two slots together, so it
    // never reaches either floor. Insisting a piece be driven home before the
    // joint counted as assembled rejected every biscuit, domino and loose
    // tenon the moment it was let go.
    const a = boardWith('front_face', -3);
    const b = boardWith('back_face', 3);
    const pip = biscuit();
    const parked: Part = { ...pip, position: { x: 900, y: 0.375, z: 0 } };
    expect(wouldTransformedPartsOverlap([a, b, parked], new Map([[pip.id, pip]]))).toBe(false);
  });

  it('still refuses a biscuit driven past the bottom of its slot', () => {
    // Floating short of the floor is a joint; standing in solid wood is not.
    const a = boardWith('front_face', -3);
    const b = boardWith('back_face', 3);
    const fat: Part = { ...biscuit(), width: 2 };
    const parked: Part = { ...fat, position: { x: 900, y: 0.375, z: 0 } };
    expect(wouldTransformedPartsOverlap([a, b, parked], new Map([[fat.id, fat]]))).toBe(true);
  });
});
