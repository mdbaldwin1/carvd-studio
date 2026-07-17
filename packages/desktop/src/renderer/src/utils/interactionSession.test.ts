import { beforeEach, describe, expect, it } from 'vitest';
import { useInteractionStore } from '../store/interactionStore';
import { useSelectionStore } from '../store/selectionStore';
import { useSnapStore } from '../store/snapStore';
import {
  beginMoveInteractionSession,
  beginRotateInteractionSession,
  beginResizeInteractionSession,
  clearTransformInteractionPreview,
  clearTransformInteractionPreviewKeepingReferenceDistances,
  clearTransformInteractionPreviewKeepingSelectionDelta,
  clearTransformInteractionPreviewKeepingSelectionDeltaAndReferenceDistances,
  clearMoveInteractionPreview,
  clearTransformDraggingPart,
  markTransformDraggingPart,
  publishSelectionDragDelta,
  publishMoveInteractionPreview,
  publishResizeInteractionPreview,
  publishRotateInteractionPreview,
  resetSelectionDragState
} from './interactionSession';

describe('interactionSession', () => {
  beforeEach(() => {
    useInteractionStore.getState().endSession();
    useSelectionStore.getState().setActiveDragDelta(null);
    useSnapStore.getState().setSnapIndicators([], []);
  });

  it('begins and publishes a shared move interaction session', () => {
    beginMoveInteractionSession({
      affectedPartIds: ['p1', 'p2'],
      primaryPartId: 'p1',
      referenceState: {
        selectionEntities: [{ id: 'sel', kind: 'part', partIds: ['p1'] }],
        referenceEntities: [{ id: 'ref', kind: 'part', partIds: ['p2'] }],
        candidateRelations: [],
        activeRelationId: null,
        latchedAxis: 'x'
      }
    });

    publishMoveInteractionPreview({
      delta: { x: 1, y: 2, z: 3 },
      snapLines: [
        {
          axis: 'x',
          type: 'face',
          start: { x: 0, y: 0, z: 0 },
          end: { x: 1, y: 1, z: 1 },
          snapValue: 1
        }
      ],
      referenceDistances: [],
      referenceState: {
        activeRelationId: 'rel-1'
      }
    });

    expect(useInteractionStore.getState().activeSession?.delta).toEqual({ x: 1, y: 2, z: 3 });
    expect(useInteractionStore.getState().activeSession?.referenceState).toEqual({
      selectionEntities: [{ id: 'sel', kind: 'part', partIds: ['p1'] }],
      referenceEntities: [{ id: 'ref', kind: 'part', partIds: ['p2'] }],
      candidateRelations: [],
      activeRelationId: 'rel-1',
      hoveredRelationId: null,
      latchedAxis: 'x'
    });
    expect(useSelectionStore.getState().activeDragDelta).toEqual({ x: 1, y: 2, z: 3 });
    expect(useSnapStore.getState().activeSnapLines).toHaveLength(1);
  });

  it('clears preview state through one shared cleanup path', () => {
    beginMoveInteractionSession({
      affectedPartIds: ['p1']
    });
    publishMoveInteractionPreview({
      delta: { x: 1, y: 0, z: 0 },
      snapLines: [],
      publishSelectionDragDelta: false
    });

    clearMoveInteractionPreview({
      clearSelectionDragDelta: false,
      clearReferenceDistances: false
    });

    expect(useInteractionStore.getState().activeSession).toBeNull();
    expect(useSelectionStore.getState().activeDragDelta).toBeNull();
    expect(useSnapStore.getState().activeSnapLines).toEqual([]);
  });

  it('clears transform previews with named cleanup intents', () => {
    useSelectionStore.getState().setActiveDragDelta({ x: 9, y: 0, z: 0 });
    beginMoveInteractionSession({ affectedPartIds: ['p1'] });
    useSnapStore
      .getState()
      .setSnapIndicators(
        [{ axis: 'x', type: 'face', start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 1, z: 1 }, snapValue: 1 }],
        []
      );

    clearTransformInteractionPreviewKeepingSelectionDeltaAndReferenceDistances();

    expect(useInteractionStore.getState().activeSession).toBeNull();
    expect(useSelectionStore.getState().activeDragDelta).toEqual({ x: 9, y: 0, z: 0 });
    expect(useSnapStore.getState().activeSnapLines).toEqual([]);

    beginMoveInteractionSession({ affectedPartIds: ['p1'] });
    clearTransformInteractionPreviewKeepingSelectionDelta();

    expect(useSelectionStore.getState().activeDragDelta).toEqual({ x: 9, y: 0, z: 0 });
    expect(useSnapStore.getState().activeReferenceDistances).toEqual([]);

    useSelectionStore.getState().setActiveDragDelta({ x: 3, y: 0, z: 0 });
    beginMoveInteractionSession({ affectedPartIds: ['p1'] });
    useSnapStore.getState().setSnapIndicators([], [{ id: 'r1' } as never]);

    clearTransformInteractionPreviewKeepingReferenceDistances();

    expect(useSelectionStore.getState().activeDragDelta).toBeNull();
    expect(useSnapStore.getState().activeReferenceDistances).toHaveLength(1);

    beginMoveInteractionSession({ affectedPartIds: ['p1'] });
    clearTransformInteractionPreview();

    expect(useInteractionStore.getState().activeSession).toBeNull();
    expect(useSelectionStore.getState().activeDragDelta).toBeNull();
    expect(useSnapStore.getState().activeReferenceDistances).toEqual([]);
  });

  it('names selection drag-state lifecycle operations', () => {
    useSelectionStore.getState().setDragIntent({
      partId: 'p1',
      pointerId: 1,
      screenX: 10,
      screenY: 20,
      worldPoint: { x: 1, y: 2, z: 3 },
      shiftKey: false,
      metaKey: false,
      ctrlKey: false
    });
    markTransformDraggingPart('p1');
    publishSelectionDragDelta({ x: 1, y: 0, z: 0 });

    clearTransformDraggingPart();

    expect(useSelectionStore.getState().draggingPartId).toBeNull();
    expect(useSelectionStore.getState().dragIntent?.partId).toBe('p1');
    expect(useSelectionStore.getState().activeDragDelta).toEqual({ x: 1, y: 0, z: 0 });

    markTransformDraggingPart('p2');
    resetSelectionDragState();

    expect(useSelectionStore.getState().draggingPartId).toBeNull();
    expect(useSelectionStore.getState().dragIntent).toBeNull();
    expect(useSelectionStore.getState().activeDragDelta).toBeNull();
  });

  it('begins and updates a shared rotate interaction session', () => {
    beginRotateInteractionSession({
      affectedPartIds: ['p1', 'p2'],
      primaryPartId: 'p1',
      pivot: { x: 4, y: 5, z: 6 }
    });

    publishRotateInteractionPreview({
      axis: 'z',
      degreesDelta: 15,
      referenceState: {
        activeRelationId: 'rotate-rel'
      }
    });
    publishRotateInteractionPreview({
      axis: 'z',
      degreesDelta: 15
    });

    expect(useInteractionStore.getState().activeSession).toEqual({
      kind: 'rotate',
      affectedPartIds: ['p1', 'p2'],
      primaryPartId: 'p1',
      axis: 'z',
      degrees: 30,
      pivot: { x: 4, y: 5, z: 6 },
      referenceState: {
        selectionEntities: [],
        referenceEntities: [],
        candidateRelations: [],
        activeRelationId: 'rotate-rel',
        hoveredRelationId: null,
        latchedAxis: null
      }
    });
  });

  it('begins and updates a shared resize interaction session', () => {
    beginResizeInteractionSession({
      affectedPartIds: ['p1'],
      primaryPartId: 'p1',
      handle: { x: 1, y: 0, z: 1, type: 'edge-y' },
      initialDimensions: { length: 10, width: 4, thickness: 1 },
      initialPosition: { x: 0, y: 0.5, z: 0 }
    });

    publishResizeInteractionPreview({
      dimensions: { length: 12, width: 5, thickness: 1 },
      position: { x: 1, y: 0.5, z: 1 },
      referenceState: {
        activeRelationId: 'resize-rel',
        latchedAxis: 'z'
      }
    });

    expect(useInteractionStore.getState().activeSession).toEqual({
      kind: 'resize',
      affectedPartIds: ['p1'],
      primaryPartId: 'p1',
      handle: { x: 1, y: 0, z: 1, type: 'edge-y' },
      dimensions: { length: 12, width: 5, thickness: 1 },
      position: { x: 1, y: 0.5, z: 1 },
      referenceState: {
        selectionEntities: [],
        referenceEntities: [],
        candidateRelations: [],
        activeRelationId: 'resize-rel',
        hoveredRelationId: null,
        latchedAxis: 'z'
      }
    });
  });
});
