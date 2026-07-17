import { describe, expect, it, vi } from 'vitest';
import { applyCommitInstructions, type CommitInstruction, type CommitTarget } from './toolSolver';

function makeMockTarget(): CommitTarget & {
  calls: Array<{ partId: string; updates: Record<string, unknown> }>;
} {
  const calls: Array<{ partId: string; updates: Record<string, unknown> }> = [];
  return {
    calls,
    updatePart: (partId, updates) => {
      calls.push({ partId, updates: updates as Record<string, unknown> });
    },
    moveSelectedParts: vi.fn()
  };
}

describe('applyCommitInstructions', () => {
  it('updatePartPosition writes position only', () => {
    const target = makeMockTarget();
    const instructions: CommitInstruction[] = [
      { kind: 'updatePartPosition', partId: 'p1', position: { x: 1, y: 2, z: 3 } }
    ];
    applyCommitInstructions(instructions, target);
    expect(target.calls).toEqual([{ partId: 'p1', updates: { position: { x: 1, y: 2, z: 3 } } }]);
  });

  it('updatePartRotation writes rotation only', () => {
    const target = makeMockTarget();
    const instructions: CommitInstruction[] = [
      { kind: 'updatePartRotation', partId: 'p1', rotation: { x: 0, y: 90, z: 0 } }
    ];
    applyCommitInstructions(instructions, target);
    expect(target.calls).toEqual([{ partId: 'p1', updates: { rotation: { x: 0, y: 90, z: 0 } } }]);
  });

  it('updatePartDimensions writes dimensions + position together', () => {
    const target = makeMockTarget();
    const instructions: CommitInstruction[] = [
      {
        kind: 'updatePartDimensions',
        partId: 'p1',
        dimensions: { length: 24, width: 12, thickness: 0.75 },
        position: { x: 5, y: 0.375, z: 0 }
      }
    ];
    applyCommitInstructions(instructions, target);
    expect(target.calls).toEqual([
      {
        partId: 'p1',
        updates: {
          length: 24,
          width: 12,
          thickness: 0.75,
          position: { x: 5, y: 0.375, z: 0 }
        }
      }
    ]);
  });

  it('updateGroupPositions writes each member position', () => {
    const target = makeMockTarget();
    const instructions: CommitInstruction[] = [
      {
        kind: 'updateGroupPositions',
        updates: [
          { partId: 'a', position: { x: 1, y: 0, z: 0 } },
          { partId: 'b', position: { x: 2, y: 0, z: 0 } },
          { partId: 'c', position: { x: 3, y: 0, z: 0 } }
        ]
      }
    ];
    applyCommitInstructions(instructions, target);
    expect(target.calls).toHaveLength(3);
    expect(target.calls[0]).toEqual({
      partId: 'a',
      updates: { position: { x: 1, y: 0, z: 0 } }
    });
    expect(target.calls[2]).toEqual({
      partId: 'c',
      updates: { position: { x: 3, y: 0, z: 0 } }
    });
  });

  it('updateGroupPositions uses batchUpdateParts when available', () => {
    const target = {
      ...makeMockTarget(),
      batchUpdateParts: vi.fn()
    };
    const instructions: CommitInstruction[] = [
      {
        kind: 'updateGroupPositions',
        updates: [
          { partId: 'a', position: { x: 1, y: 0, z: 0 } },
          { partId: 'b', position: { x: 2, y: 0, z: 0 } }
        ]
      }
    ];

    applyCommitInstructions(instructions, target);

    expect(target.calls).toHaveLength(0);
    expect(target.batchUpdateParts).toHaveBeenCalledWith([
      { id: 'a', changes: { position: { x: 1, y: 0, z: 0 } } },
      { id: 'b', changes: { position: { x: 2, y: 0, z: 0 } } }
    ]);
  });

  it('applies a mixed batch in order', () => {
    const target = makeMockTarget();
    const instructions: CommitInstruction[] = [
      { kind: 'updatePartPosition', partId: 'p1', position: { x: 1, y: 1, z: 1 } },
      { kind: 'updatePartRotation', partId: 'p1', rotation: { x: 0, y: 45, z: 0 } }
    ];
    applyCommitInstructions(instructions, target);
    expect(target.calls).toHaveLength(2);
    expect(target.calls[0].updates).toEqual({ position: { x: 1, y: 1, z: 1 } });
    expect(target.calls[1].updates).toEqual({ rotation: { x: 0, y: 45, z: 0 } });
  });
});
