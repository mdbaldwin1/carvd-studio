import type { ReferenceDistanceIndicator, SnapLine } from '../types';
import { useInteractionStore } from '../store/interactionStore';
import { useSelectionStore } from '../store/selectionStore';
import type { DragIntent } from '../store/selectionStore';
import { useSnapStore } from '../store/snapStore';
import type { InteractionSelectionEntity } from './interactionSelection';
import type { ReferenceRelation } from './referenceRelations';

type Delta3D = { x: number; y: number; z: number };

export function beginMoveInteractionSession(params: {
  affectedPartIds: string[];
  primaryPartId?: string | null;
  initialDelta?: Delta3D;
  referenceState?: {
    selectionEntities?: InteractionSelectionEntity[];
    referenceEntities?: InteractionSelectionEntity[];
    candidateRelations?: ReferenceRelation[];
    activeRelationId?: string | null;
    hoveredRelationId?: string | null;
    latchedAxis?: 'x' | 'y' | 'z' | null;
  };
}): void {
  useInteractionStore.getState().beginMoveSession(params);
}

export function beginRotateInteractionSession(params: {
  affectedPartIds: string[];
  primaryPartId?: string | null;
  pivot: Delta3D;
  axis?: 'x' | 'y' | 'z' | null;
  initialDegrees?: number;
  referenceState?: {
    selectionEntities?: InteractionSelectionEntity[];
    referenceEntities?: InteractionSelectionEntity[];
    candidateRelations?: ReferenceRelation[];
    activeRelationId?: string | null;
    hoveredRelationId?: string | null;
    latchedAxis?: 'x' | 'y' | 'z' | null;
  };
}): void {
  useInteractionStore.getState().beginRotateSession(params);
}

export function beginResizeInteractionSession(params: {
  affectedPartIds: string[];
  primaryPartId?: string | null;
  handle?: {
    x: -1 | 0 | 1;
    y: -1 | 0 | 1;
    z: -1 | 0 | 1;
    type: 'corner' | 'edge-x' | 'edge-y' | 'edge-z';
  } | null;
  initialDimensions?: { length: number; width: number; thickness: number } | null;
  initialPosition?: Delta3D | null;
  referenceState?: {
    selectionEntities?: InteractionSelectionEntity[];
    referenceEntities?: InteractionSelectionEntity[];
    candidateRelations?: ReferenceRelation[];
    activeRelationId?: string | null;
    hoveredRelationId?: string | null;
    latchedAxis?: 'x' | 'y' | 'z' | null;
  };
}): void {
  useInteractionStore.getState().beginResizeSession(params);
}

export function markTransformDraggingPart(partId: string): void {
  useSelectionStore.getState().setDraggingPartId(partId);
}

export function clearTransformDraggingPart(): void {
  useSelectionStore.getState().setDraggingPartId(null);
}

export function resetSelectionDragState(): void {
  const selection = useSelectionStore.getState();
  selection.clearDragIntent();
  selection.setDraggingPartId(null);
  selection.setActiveDragDelta(null);
}

export function consumeTransformDragIntent(partId: string): DragIntent | null {
  const selection = useSelectionStore.getState();
  const intent = selection.dragIntent;
  if (!intent || intent.partId !== partId) return null;

  selection.clearDragIntent();
  return intent;
}

export function publishSelectionDragDelta(delta: Delta3D): void {
  useSelectionStore.getState().setActiveDragDelta(delta);
}

export function publishMoveInteractionPreview(params: {
  delta: Delta3D;
  snapLines: SnapLine[];
  referenceDistances?: ReferenceDistanceIndicator[];
  referenceState?: {
    selectionEntities?: InteractionSelectionEntity[];
    referenceEntities?: InteractionSelectionEntity[];
    candidateRelations?: ReferenceRelation[];
    activeRelationId?: string | null;
    hoveredRelationId?: string | null;
    latchedAxis?: 'x' | 'y' | 'z' | null;
  };
  publishSelectionDragDelta?: boolean;
}): void {
  const { delta, snapLines, referenceDistances, referenceState, publishSelectionDragDelta = true } = params;
  useInteractionStore.getState().updateMoveSessionDelta(delta);
  if (referenceState) {
    useInteractionStore.getState().updateSessionReferenceState(referenceState);
  }
  if (publishSelectionDragDelta) {
    useSelectionStore.getState().setActiveDragDelta(delta);
  }
  if (referenceDistances) {
    useSnapStore.getState().setSnapIndicators(snapLines, referenceDistances);
  } else {
    useSnapStore.getState().setActiveSnapLines(snapLines);
  }
}

export function publishRotateInteractionPreview(params: {
  axis: 'x' | 'y' | 'z';
  degreesDelta: number;
  referenceState?: {
    selectionEntities?: InteractionSelectionEntity[];
    referenceEntities?: InteractionSelectionEntity[];
    candidateRelations?: ReferenceRelation[];
    activeRelationId?: string | null;
    hoveredRelationId?: string | null;
    latchedAxis?: 'x' | 'y' | 'z' | null;
  };
}): void {
  useInteractionStore.getState().updateRotateSession(params.axis, params.degreesDelta);
  if (params.referenceState) {
    useInteractionStore.getState().updateSessionReferenceState(params.referenceState);
  }
}

export function publishResizeInteractionPreview(params: {
  dimensions: { length: number; width: number; thickness: number };
  position: Delta3D;
  referenceState?: {
    selectionEntities?: InteractionSelectionEntity[];
    referenceEntities?: InteractionSelectionEntity[];
    candidateRelations?: ReferenceRelation[];
    activeRelationId?: string | null;
    hoveredRelationId?: string | null;
    latchedAxis?: 'x' | 'y' | 'z' | null;
  };
}): void {
  useInteractionStore.getState().updateResizeSession({
    dimensions: params.dimensions,
    position: params.position
  });
  if (params.referenceState) {
    useInteractionStore.getState().updateSessionReferenceState(params.referenceState);
  }
}

export function clearMoveInteractionPreview(params?: {
  clearSelectionDragDelta?: boolean;
  clearReferenceDistances?: boolean;
}): void {
  const { clearSelectionDragDelta = true, clearReferenceDistances = true } = params ?? {};
  if (clearSelectionDragDelta) {
    useSelectionStore.getState().setActiveDragDelta(null);
  }
  useInteractionStore.getState().endSession();
  if (clearReferenceDistances) {
    useSnapStore.getState().setSnapIndicators([], []);
  } else {
    useSnapStore.getState().setActiveSnapLines([]);
  }
}

export function clearTransformInteractionPreview(): void {
  clearMoveInteractionPreview();
}

export function clearTransformInteractionPreviewKeepingReferenceDistances(): void {
  clearMoveInteractionPreview({
    clearReferenceDistances: false
  });
}

export function clearTransformInteractionPreviewKeepingSelectionDelta(): void {
  clearMoveInteractionPreview({
    clearSelectionDragDelta: false
  });
}

export function clearTransformInteractionPreviewKeepingSelectionDeltaAndReferenceDistances(): void {
  clearMoveInteractionPreview({
    clearSelectionDragDelta: false,
    clearReferenceDistances: false
  });
}
