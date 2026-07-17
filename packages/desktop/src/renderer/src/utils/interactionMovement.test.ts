import { describe, expect, it } from 'vitest';
import type { GroupMember, Part } from '../types';
import {
  applyGroundConstraintToDelta,
  resolveConstrainedMoveDelta,
  resolveGroupReleaseMove,
  resolveMoveSelection,
  resolveSinglePartReleaseMove
} from './interactionMovement';

const parts: Part[] = [
  {
    id: 'p-parent',
    name: 'Parent',
    length: 10,
    width: 4,
    thickness: 1,
    position: { x: 0, y: 0.5, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    stockId: null,
    grainSensitive: false,
    grainDirection: 'length',
    color: '#ffffff'
  },
  {
    id: 'p-a1',
    name: 'A1',
    length: 10,
    width: 4,
    thickness: 1,
    position: { x: 10, y: 0.5, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    stockId: null,
    grainSensitive: false,
    grainDirection: 'length',
    color: '#ffffff'
  },
  {
    id: 'p-a2',
    name: 'A2',
    length: 10,
    width: 4,
    thickness: 1,
    position: { x: 20, y: 0.5, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    stockId: null,
    grainSensitive: false,
    grainDirection: 'length',
    color: '#ffffff'
  }
];

const groupMembers: GroupMember[] = [
  { id: 'gm-1', groupId: 'g-parent', memberType: 'part', memberId: 'p-parent' },
  { id: 'gm-2', groupId: 'g-parent', memberType: 'group', memberId: 'g-child-a' },
  { id: 'gm-3', groupId: 'g-child-a', memberType: 'part', memberId: 'p-a1' },
  { id: 'gm-4', groupId: 'g-child-a', memberType: 'part', memberId: 'p-a2' }
];

describe('interactionMovement', () => {
  it('uses the full transform selection to resolve affected parts and anchor', () => {
    const result = resolveMoveSelection(
      {
        selectedPartIds: ['p-a1'],
        selectedGroupIds: [],
        editingGroupId: null
      },
      parts,
      groupMembers,
      'p-a1'
    );

    expect(result.affectedPartIds.sort()).toEqual(['p-a1', 'p-a2']);
    expect(result.anchorPosition).toEqual({ x: 15, y: 0.5, z: 0 });
  });

  it('keeps the selection local while editing within a group', () => {
    const result = resolveMoveSelection(
      {
        selectedPartIds: ['p-a1'],
        selectedGroupIds: [],
        editingGroupId: 'g-parent'
      },
      parts,
      groupMembers,
      'p-a1'
    );

    expect(result.affectedPartIds).toEqual(['p-a1']);
    expect(result.anchorPosition).toEqual({ x: 10, y: 0.5, z: 0 });
  });

  it('falls back to the primary part when selection is temporarily empty', () => {
    const result = resolveMoveSelection(
      {
        selectedPartIds: [],
        selectedGroupIds: [],
        editingGroupId: null
      },
      parts,
      groupMembers,
      'p-parent'
    );

    expect(result.affectedPartIds).toEqual(['p-parent']);
    expect(result.anchorPosition).toEqual({ x: 0, y: 0.5, z: 0 });
  });

  it('raises the delta so every moving part remains above ground', () => {
    const raisedParts: Part[] = [
      {
        ...parts[0],
        position: { x: 0, y: 0.25, z: 0 },
        thickness: 2
      },
      {
        ...parts[1],
        position: { x: 10, y: 1, z: 0 },
        thickness: 1
      }
    ];

    const constrained = applyGroundConstraintToDelta(raisedParts, ['p-parent', 'p-a1'], { x: 1, y: -1, z: 2 });

    expect(constrained).toEqual({ x: 1, y: 0.75, z: 2 });
  });

  it('clamps overlap-prone movement to a safe grounded delta', () => {
    const constrained = resolveConstrainedMoveDelta(
      [
        {
          ...parts[0],
          id: 'moving',
          length: 4,
          width: 4,
          position: { x: 0, y: 0.5, z: 0 }
        },
        {
          ...parts[1],
          id: 'target',
          length: 4,
          width: 4,
          position: { x: 12, y: 0.5, z: 0 }
        }
      ],
      ['moving'],
      { x: 12, y: 0, z: 0 },
      { preventOverlap: true }
    );

    expect(constrained.delta.x).toBeGreaterThan(0);
    expect(constrained.delta.x).toBeLessThan(12);
    expect(constrained.overlapClamped).toBe(true);
    expect(constrained.overlapBlocked).toBe(false);
  });

  it('uses the supplied fallback delta when overlap cannot be safely resolved', () => {
    const constrained = resolveConstrainedMoveDelta(
      [
        {
          ...parts[0],
          id: 'moving',
          length: 4,
          width: 4,
          thickness: 2,
          position: { x: 0, y: 3.001, z: 0 }
        },
        {
          ...parts[1],
          id: 'target',
          length: 8,
          width: 8,
          thickness: 2,
          position: { x: 0, y: 1, z: 0 }
        }
      ],
      ['moving'],
      { x: 3, y: -0.3, z: 0 },
      {
        preventOverlap: true,
        fallbackDeltaOnOverlap: { x: 0, y: 0, z: 0 }
      }
    );

    expect(constrained.delta).toEqual({ x: 0, y: 0, z: 0 });
    expect(constrained.overlapBlocked).toBe(true);
    expect(constrained.usedFallbackDelta).toBe(true);
  });

  it('resolves a group release delta with selected affected part ids', () => {
    const result = resolveGroupReleaseMove({
      parts,
      groupMembers,
      selection: {
        selectedPartIds: [],
        selectedGroupIds: ['g-parent'],
        editingGroupId: null
      },
      proposedDelta: { x: 3, y: 0, z: 2 },
      fallbackDeltaOnOverlap: { x: 1, y: 0, z: 1 },
      preventOverlap: false
    });

    expect([...result.affectedPartIds].sort()).toEqual(['p-a1', 'p-a2', 'p-parent']);
    expect(result.constrained.delta).toEqual({ x: 3, y: 0, z: 2 });
    expect(result.constrained.overlapBlocked).toBe(false);
  });

  it('includes the primary part when resolving a part release move', () => {
    const result = resolveGroupReleaseMove({
      parts,
      groupMembers,
      selection: {
        selectedPartIds: [],
        selectedGroupIds: [],
        editingGroupId: null
      },
      primaryPartId: 'p-parent',
      proposedDelta: { x: 1, y: 0, z: 0 },
      fallbackDeltaOnOverlap: { x: 1, y: 0, z: 0 },
      preventOverlap: false
    });

    expect([...result.affectedPartIds]).toEqual(['p-parent']);
    expect(result.constrained.delta).toEqual({ x: 1, y: 0, z: 0 });
  });

  it('resolves a single-part release position through the constraint pipeline', () => {
    const part = {
      ...parts[0],
      id: 'moving',
      length: 4,
      width: 4,
      position: { x: 0, y: 0.5, z: 0 }
    };

    const result = resolveSinglePartReleaseMove({
      part,
      projectParts: [part],
      proposedPosition: { x: 2, y: 0.5, z: 3 },
      preventOverlap: true
    });

    expect(result.position).toEqual({ x: 2, y: 0.5, z: 3 });
    expect(result.collisionBlocked).toBe(false);
  });
});
