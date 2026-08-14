import { create } from 'zustand';
import type { InteractionSelectionEntity } from '../utils/interactionSelection';
import type { ReferenceRelation } from '../utils/referenceRelations';

export interface ReferenceInteractionState {
  selectionEntities: InteractionSelectionEntity[];
  referenceEntities: InteractionSelectionEntity[];
  candidateRelations: ReferenceRelation[];
  activeRelationId: string | null;
  hoveredRelationId: string | null;
  latchedAxis: 'x' | 'y' | 'z' | null;
}

function createEmptyReferenceInteractionState(): ReferenceInteractionState {
  return {
    selectionEntities: [],
    referenceEntities: [],
    candidateRelations: [],
    activeRelationId: null,
    hoveredRelationId: null,
    latchedAxis: null
  };
}

export interface MoveInteractionSession {
  kind: 'move';
  affectedPartIds: string[];
  primaryPartId: string | null;
  delta: { x: number; y: number; z: number };
  referenceState: ReferenceInteractionState;
}

export interface RotateInteractionSession {
  kind: 'rotate';
  affectedPartIds: string[];
  primaryPartId: string | null;
  axis: 'x' | 'y' | 'z' | null;
  degrees: number;
  pivot: { x: number; y: number; z: number };
  referenceState: ReferenceInteractionState;
}

export interface ResizeInteractionSession {
  kind: 'resize';
  affectedPartIds: string[];
  primaryPartId: string | null;
  handle: { x: -1 | 0 | 1; y: -1 | 0 | 1; z: -1 | 0 | 1; type: 'corner' | 'edge-x' | 'edge-y' | 'edge-z' } | null;
  dimensions: { length: number; width: number; thickness: number } | null;
  position: { x: number; y: number; z: number } | null;
  referenceState: ReferenceInteractionState;
}

export type InteractionSession = MoveInteractionSession | RotateInteractionSession | ResizeInteractionSession;

interface InteractionStoreState {
  activeSession: InteractionSession | null;
  beginMoveSession: (params: {
    affectedPartIds: string[];
    primaryPartId?: string | null;
    initialDelta?: { x: number; y: number; z: number };
    referenceState?: Partial<ReferenceInteractionState>;
  }) => void;
  beginRotateSession: (params: {
    affectedPartIds: string[];
    primaryPartId?: string | null;
    pivot: { x: number; y: number; z: number };
    axis?: 'x' | 'y' | 'z' | null;
    initialDegrees?: number;
    referenceState?: Partial<ReferenceInteractionState>;
  }) => void;
  beginResizeSession: (params: {
    affectedPartIds: string[];
    primaryPartId?: string | null;
    handle?: ResizeInteractionSession['handle'];
    initialDimensions?: ResizeInteractionSession['dimensions'];
    initialPosition?: ResizeInteractionSession['position'];
    referenceState?: Partial<ReferenceInteractionState>;
  }) => void;
  updateMoveSessionDelta: (delta: { x: number; y: number; z: number }) => void;
  updateRotateSession: (axis: 'x' | 'y' | 'z', degreesDelta: number) => void;
  updateResizeSession: (preview: {
    dimensions: { length: number; width: number; thickness: number };
    position: { x: number; y: number; z: number };
  }) => void;
  updateSessionReferenceState: (referenceState: Partial<ReferenceInteractionState>) => void;
  endSession: () => void;
}

export const useInteractionStore = create<InteractionStoreState>((set) => ({
  activeSession: null,

  beginMoveSession: ({ affectedPartIds, primaryPartId = null, initialDelta = { x: 0, y: 0, z: 0 }, referenceState }) =>
    set({
      activeSession: {
        kind: 'move',
        affectedPartIds: [...new Set(affectedPartIds)],
        primaryPartId,
        delta: initialDelta,
        referenceState: {
          ...createEmptyReferenceInteractionState(),
          ...referenceState
        }
      }
    }),

  beginRotateSession: ({
    affectedPartIds,
    primaryPartId = null,
    pivot,
    axis = null,
    initialDegrees = 0,
    referenceState
  }) =>
    set({
      activeSession: {
        kind: 'rotate',
        affectedPartIds: [...new Set(affectedPartIds)],
        primaryPartId,
        axis,
        degrees: initialDegrees,
        pivot,
        referenceState: {
          ...createEmptyReferenceInteractionState(),
          ...referenceState
        }
      }
    }),

  beginResizeSession: ({
    affectedPartIds,
    primaryPartId = null,
    handle = null,
    initialDimensions = null,
    initialPosition = null,
    referenceState
  }) =>
    set({
      activeSession: {
        kind: 'resize',
        affectedPartIds: [...new Set(affectedPartIds)],
        primaryPartId,
        handle,
        dimensions: initialDimensions,
        position: initialPosition,
        referenceState: {
          ...createEmptyReferenceInteractionState(),
          ...referenceState
        }
      }
    }),

  updateMoveSessionDelta: (delta) =>
    set((state) => {
      if (!state.activeSession || state.activeSession.kind !== 'move') return state;
      return {
        activeSession: {
          ...state.activeSession,
          delta
        }
      };
    }),

  updateRotateSession: (axis, degreesDelta) =>
    set((state) => {
      if (!state.activeSession || state.activeSession.kind !== 'rotate') return state;
      return {
        activeSession: {
          ...state.activeSession,
          axis,
          degrees: state.activeSession.degrees + degreesDelta
        }
      };
    }),

  updateResizeSession: (preview) =>
    set((state) => {
      if (!state.activeSession || state.activeSession.kind !== 'resize') return state;
      return {
        activeSession: {
          ...state.activeSession,
          dimensions: preview.dimensions,
          position: preview.position
        }
      };
    }),

  updateSessionReferenceState: (referenceState) =>
    set((state) => {
      if (!state.activeSession) return state;
      return {
        activeSession: {
          ...state.activeSession,
          referenceState: {
            ...state.activeSession.referenceState,
            ...referenceState
          }
        }
      };
    }),

  endSession: () => set({ activeSession: null })
}));
