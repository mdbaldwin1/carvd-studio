import { describe, expect, it, vi } from 'vitest';
import { createTestPart, createTestStock } from '../../../../tests/helpers/factories';
import { defaultInsertSocketOptions, insertDimensions, planInsertSocket } from './insertSocket';
import { planAssembly, suggestAssembly } from './assemblyLayout';
import { detectFeatureMateSnaps, getPartFeatureSockets } from './snapToPartsUtil';
import { getFaceFrame } from './roundCutUtils';
import { partsOverlap } from './overlapPolicy';
vi.unmock('three');

describe('insert-derived sockets', () => {
  it.each(['front_face', 'back_face', 'top_face', 'bottom_face'] as const)(
    'measures an off-center loose-tenon socket from the labeled edges on %s',
    (face) => {
      const stock = createTestStock({ form: 'insert', insertKind: 'loose_tenon' });
      const insert = createTestPart({ stockId: stock.id, length: 1, width: 0.5, thickness: 0.25 });
      const board = createTestPart({ length: 12, width: 6, thickness: 0.75, position: { x: 0, y: 0, z: 0 } });
      const frame = getFaceFrame(board, face);
      const fromStart = 4,
        fromNearEdge = frame.secondarySize / 3;
      const result = planInsertSocket(board, insert, [stock], {
        face,
        fromStart,
        fromNearEdge,
        insertion: 0.25,
        clearance: 0,
        bottomSpace: 0.04
      });
      expect(result.error).toBeNull();
      const socket = getPartFeatureSockets({ ...board, features: result.features })[0];
      for (const axis of ['x', 'y', 'z'] as const)
        expect(socket.openingCenter[axis]).toBeCloseTo(
          frame.origin[axis] +
            frame.primaryAxis[axis] * (fromStart - frame.primarySize / 2) +
            frame.secondaryAxis[axis] * (fromNearEdge - frame.secondarySize / 2),
          6
        );
    }
  );
  it.each(['domino', 'biscuit', 'loose_tenon', 'dowel_pin'] as const)(
    'cuts and seats %s on rotated stock with no overlap exemption',
    (kind) => {
      const stock = createTestStock({ id: kind, form: 'insert', insertKind: kind });
      const insert = createTestPart({
        id: 'insert',
        stockId: kind,
        length: 2,
        width: kind === 'dowel_pin' ? 0.25 : 0.75,
        thickness: 0.25,
        blankShape: kind === 'loose_tenon' ? undefined : kind === 'dowel_pin' ? 'round' : kind
      });
      const board = createTestPart({
        id: 'board',
        length: 12,
        width: 4,
        thickness: 0.75,
        rotation: { x: 14, y: 30, z: 6 }
      });
      const insertion = insertDimensions(insert, [stock]).length / 2;
      const result = planInsertSocket(board, insert, [stock], {
        face: 'front_face',
        fromStart: 4,
        fromNearEdge: 0.375,
        insertion,
        clearance: 0.01,
        bottomSpace: 0.04
      });
      expect(result.error).toBeNull();
      const receiver = { ...board, features: result.features };
      const suggestion = suggestAssembly([receiver, insert]);
      expect(suggestion.swapped).toBe(true);
      expect(suggestion.options.insertion).toBe(insertion);
      const placed = planAssembly(insert, receiver, suggestion.options)!;
      expect(placed).not.toBeNull();
      expect(partsOverlap(placed, receiver)).toBe(false);
      const near = { ...placed.position, x: placed.position.x + 0.005, z: placed.position.z + 0.005 };
      const away = { ...placed, position: { ...placed.position, x: placed.position.x + 5 } };
      const snap = detectFeatureMateSnaps(away, near, [away, receiver], [away.id], 0.2);
      expect(snap.adjustedPosition.x).toBeCloseTo(placed.position.x, 6);
      expect(snap.adjustedPosition.y).toBeCloseTo(placed.position.y, 6);
      expect(snap.adjustedPosition.z).toBeCloseTo(placed.position.z, 6);
      const movedReceiver = { ...receiver, position: { ...receiver.position, x: receiver.position.x + 5 } };
      const receiverNear = { ...receiver.position, x: receiver.position.x + 0.005, z: receiver.position.z + 0.005 };
      const reverse = detectFeatureMateSnaps(movedReceiver, receiverNear, [movedReceiver, placed], [receiver.id], 0.2);
      expect(reverse.adjustedPosition.x).toBeCloseTo(receiver.position.x, 6);
      expect(reverse.adjustedPosition.y).toBeCloseTo(receiver.position.y, 6);
      expect(reverse.adjustedPosition.z).toBeCloseTo(receiver.position.z, 6);

      expect(partsOverlap(placed, board)).toBe(true);
      const secondBoard = { ...board, id: 'second-board', position: { x: 20, y: 5, z: 20 } };
      const secondOptions = defaultInsertSocketOptions(secondBoard, insert, [stock], [receiver, placed, secondBoard]);
      expect(secondOptions.matingFace).toBe(kind === 'biscuit' ? 'back_face' : 'left_end');
      const secondCut = planInsertSocket(secondBoard, insert, [stock], {
        ...secondOptions,
        face: 'back_face',
        fromStart: board.length - 4
      });
      expect(secondCut.error).toBeNull();
      const secondReceiver = { ...secondBoard, features: secondCut.features };
      const secondSuggestion = suggestAssembly([secondReceiver, placed], [receiver, placed, secondReceiver]);
      expect(secondSuggestion.swapped).toBe(false);
      const secondPlaced = planAssembly(secondReceiver, placed, secondSuggestion.options)!;
      expect(secondPlaced).not.toBeNull();
      expect(partsOverlap(secondPlaced, placed)).toBe(false);
      expect(partsOverlap(secondPlaced, receiver)).toBe(false);
      expect(
        Math.hypot(
          secondPlaced.position.x - receiver.position.x,
          secondPlaced.position.y - receiver.position.y,
          secondPlaced.position.z - receiver.position.z
        )
      ).toBeCloseTo(board.width, 6);

      expect(
        planInsertSocket(receiver, insert, [stock], {
          face: 'front_face',
          fromStart: 5,
          fromNearEdge: 0.375,
          insertion,
          clearance: 0,
          bottomSpace: 0.04
        }).features
      ).toHaveLength(1);
    }
  );
  it('rejects negative clearance and a slot outside the board', () => {
    const stock = createTestStock({ id: 'stock', form: 'insert', insertKind: 'domino' });
    const insert = createTestPart({ stockId: stock.id, length: 2, width: 1, thickness: 0.25, blankShape: 'domino' });
    const options = {
      face: 'front_face' as const,
      fromStart: 0,
      fromNearEdge: 0.375,
      insertion: 1,
      clearance: 0,
      bottomSpace: 0.04
    };
    expect(planInsertSocket(createTestPart(), insert, [stock], options).error).not.toBeNull();
    expect(
      planInsertSocket(createTestPart(), insert, [stock], { ...options, fromStart: 12, clearance: -0.1 }).error
    ).toContain('negative');
  });
});
