import { beforeEach, describe, expect, it } from 'vitest';
import { useInteractionStore } from './interactionStore';

describe('interactionStore', () => {
  beforeEach(() => {
    useInteractionStore.getState().endSession();
  });

  it('starts a move session with deduped affected parts', () => {
    useInteractionStore.getState().beginMoveSession({
      affectedPartIds: ['p1', 'p2', 'p1'],
      primaryPartId: 'p1',
      referenceState: {
        selectionEntities: [{ id: 'sel', kind: 'part', partIds: ['p1'] }],
        referenceEntities: [{ id: 'ref', kind: 'part', partIds: ['p2'] }],
        candidateRelations: [],
        activeRelationId: 'r1'
      }
    });

    expect(useInteractionStore.getState().activeSession).toEqual({
      kind: 'move',
      affectedPartIds: ['p1', 'p2'],
      primaryPartId: 'p1',
      delta: { x: 0, y: 0, z: 0 },
      referenceState: {
        selectionEntities: [{ id: 'sel', kind: 'part', partIds: ['p1'] }],
        referenceEntities: [{ id: 'ref', kind: 'part', partIds: ['p2'] }],
        candidateRelations: [],
        activeRelationId: 'r1',
        hoveredRelationId: null,
        latchedAxis: null
      }
    });
  });

  it('updates move session delta', () => {
    useInteractionStore.getState().beginMoveSession({
      affectedPartIds: ['p1']
    });

    useInteractionStore.getState().updateMoveSessionDelta({ x: 1, y: 2, z: 3 });

    expect(useInteractionStore.getState().activeSession?.delta).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('ends the active session', () => {
    useInteractionStore.getState().beginMoveSession({
      affectedPartIds: ['p1']
    });

    useInteractionStore.getState().endSession();

    expect(useInteractionStore.getState().activeSession).toBeNull();
  });

  it('starts and updates a rotate session', () => {
    useInteractionStore.getState().beginRotateSession({
      affectedPartIds: ['p1', 'p2', 'p1'],
      primaryPartId: 'p1',
      pivot: { x: 1, y: 2, z: 3 }
    });

    useInteractionStore.getState().updateRotateSession('y', 15);
    useInteractionStore.getState().updateRotateSession('y', 15);

    expect(useInteractionStore.getState().activeSession).toEqual({
      kind: 'rotate',
      affectedPartIds: ['p1', 'p2'],
      primaryPartId: 'p1',
      axis: 'y',
      degrees: 30,
      pivot: { x: 1, y: 2, z: 3 },
      referenceState: {
        selectionEntities: [],
        referenceEntities: [],
        candidateRelations: [],
        activeRelationId: null,
        hoveredRelationId: null,
        latchedAxis: null
      }
    });
  });

  it('starts and updates a resize session', () => {
    useInteractionStore.getState().beginResizeSession({
      affectedPartIds: ['p1', 'p1'],
      primaryPartId: 'p1',
      handle: { x: 1, y: 1, z: 1, type: 'corner' },
      initialDimensions: { length: 10, width: 4, thickness: 1 },
      initialPosition: { x: 0, y: 0.5, z: 0 }
    });

    useInteractionStore.getState().updateResizeSession({
      dimensions: { length: 11, width: 4, thickness: 1.25 },
      position: { x: 0.5, y: 0.625, z: 0 }
    });

    expect(useInteractionStore.getState().activeSession).toEqual({
      kind: 'resize',
      affectedPartIds: ['p1'],
      primaryPartId: 'p1',
      handle: { x: 1, y: 1, z: 1, type: 'corner' },
      dimensions: { length: 11, width: 4, thickness: 1.25 },
      position: { x: 0.5, y: 0.625, z: 0 },
      referenceState: {
        selectionEntities: [],
        referenceEntities: [],
        candidateRelations: [],
        activeRelationId: null,
        hoveredRelationId: null,
        latchedAxis: null
      }
    });
  });

  it('updates session reference state without disturbing tool-specific preview state', () => {
    useInteractionStore.getState().beginMoveSession({
      affectedPartIds: ['p1'],
      initialDelta: { x: 2, y: 0, z: 0 }
    });

    useInteractionStore.getState().updateSessionReferenceState({
      activeRelationId: 'rel-1',
      latchedAxis: 'x',
      candidateRelations: [
        {
          id: 'rel-1',
          kind: 'gap',
          axis: 'x',
          fromEntityId: 'sel',
          toEntityId: 'ref',
          fromAnchorId: 'sel:x:outer',
          toAnchorId: 'ref:x:outer',
          value: 5,
          editMode: 'move',
          priority: 100,
          source: 'move',
          indicatorType: 'edge-to-edge',
          start: { x: 0, y: 0, z: 0 },
          end: { x: 5, y: 0, z: 0 },
          labelPosition: { x: 2.5, y: 0.5, z: 0 }
        }
      ]
    });

    expect(useInteractionStore.getState().activeSession).toEqual({
      kind: 'move',
      affectedPartIds: ['p1'],
      primaryPartId: null,
      delta: { x: 2, y: 0, z: 0 },
      referenceState: {
        selectionEntities: [],
        referenceEntities: [],
        candidateRelations: [
          {
            id: 'rel-1',
            kind: 'gap',
            axis: 'x',
            fromEntityId: 'sel',
            toEntityId: 'ref',
            fromAnchorId: 'sel:x:outer',
            toAnchorId: 'ref:x:outer',
            value: 5,
            editMode: 'move',
            priority: 100,
            source: 'move',
            indicatorType: 'edge-to-edge',
            start: { x: 0, y: 0, z: 0 },
            end: { x: 5, y: 0, z: 0 },
            labelPosition: { x: 2.5, y: 0.5, z: 0 }
          }
        ],
        activeRelationId: 'rel-1',
        hoveredRelationId: null,
        latchedAxis: 'x'
      }
    });
  });
});
