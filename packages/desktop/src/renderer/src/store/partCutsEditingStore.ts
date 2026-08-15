import { create } from 'zustand';
import { PartFeature, PartFeatureTarget } from '../types';
import { clearPartGeometryCache } from '../utils/partFeatureGeometry';
import { clonePartFeatures } from '../utils/partFeatures';
import { useCameraStore } from './cameraStore';

function featuresEqual(a: PartFeature[], b: PartFeature[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

interface PartCutsEditingState {
  isEditingPartCuts: boolean;
  sourcePartId: string | null;
  sourcePartName: string;
  draftFeatures: PartFeature[];
  draftHistory: PartFeature[][];
  draftFuture: PartFeature[][];
  selectedFeatureId: string | null;
  hoveredTarget: PartFeatureTarget | null;
  pendingTarget: PartFeatureTarget | null;
  showExitDialog: boolean;

  startEditingPartCuts: (partId: string, partName: string, features?: PartFeature[]) => void;
  setDraftFeatures: (features: PartFeature[]) => void;
  resetDraftFeatures: (features?: PartFeature[]) => void;
  selectFeature: (featureId: string | null) => void;
  setHoveredTarget: (target: PartFeatureTarget | null) => void;
  setPendingTarget: (target: PartFeatureTarget | null) => void;
  undoDraft: () => void;
  redoDraft: () => void;
  canUndoDraft: () => boolean;
  canRedoDraft: () => boolean;
  requestExit: (sourceFeatures?: PartFeature[]) => void;
  cancelExit: () => void;
  finishEditing: () => void;
  hasUnsavedDraftChanges: (sourceFeatures?: PartFeature[]) => boolean;
}

export const usePartCutsEditingStore = create<PartCutsEditingState>((set, get) => ({
  isEditingPartCuts: false,
  sourcePartId: null,
  sourcePartName: '',
  draftFeatures: [],
  draftHistory: [],
  draftFuture: [],
  selectedFeatureId: null,
  hoveredTarget: null,
  pendingTarget: null,
  showExitDialog: false,

  startEditingPartCuts: (partId, partName, features = []) => {
    const draftFeatures = clonePartFeatures(features);
    set({
      isEditingPartCuts: true,
      sourcePartId: partId,
      sourcePartName: partName,
      draftFeatures,
      draftHistory: [],
      draftFuture: [],
      selectedFeatureId: draftFeatures[0]?.id ?? null,
      hoveredTarget: null,
      pendingTarget: null,
      showExitDialog: false
    });
  },

  setDraftFeatures: (features) =>
    set((state) => {
      const draftFeatures = clonePartFeatures(features);
      if (featuresEqual(draftFeatures, state.draftFeatures)) {
        return {};
      }
      const selectedStillExists = state.selectedFeatureId
        ? draftFeatures.some((feature) => feature.id === state.selectedFeatureId)
        : false;

      return {
        draftFeatures,
        // Each committed draft change is an undo step within the session.
        draftHistory: [...state.draftHistory.slice(-49), state.draftFeatures],
        draftFuture: [],
        selectedFeatureId: selectedStillExists ? state.selectedFeatureId : (draftFeatures[0]?.id ?? null)
      };
    }),

  undoDraft: () =>
    set((state) => {
      const previous = state.draftHistory[state.draftHistory.length - 1];
      if (!previous) return {};
      return {
        draftFeatures: clonePartFeatures(previous),
        draftHistory: state.draftHistory.slice(0, -1),
        draftFuture: [state.draftFeatures, ...state.draftFuture],
        selectedFeatureId: previous[0]?.id ?? null
      };
    }),

  redoDraft: () =>
    set((state) => {
      const next = state.draftFuture[0];
      if (!next) return {};
      return {
        draftFeatures: clonePartFeatures(next),
        draftHistory: [...state.draftHistory, state.draftFeatures],
        draftFuture: state.draftFuture.slice(1),
        selectedFeatureId: next[0]?.id ?? null
      };
    }),

  canUndoDraft: () => get().draftHistory.length > 0,
  canRedoDraft: () => get().draftFuture.length > 0,

  resetDraftFeatures: (features = []) => {
    const draftFeatures = clonePartFeatures(features);
    set({
      draftFeatures,
      draftHistory: [],
      draftFuture: [],
      selectedFeatureId: draftFeatures[0]?.id ?? null,
      hoveredTarget: null,
      pendingTarget: null
    });
  },

  selectFeature: (featureId) => set({ selectedFeatureId: featureId }),
  setHoveredTarget: (target) => set({ hoveredTarget: target }),
  setPendingTarget: (target) => set({ pendingTarget: target }),

  requestExit: (sourceFeatures = []) => {
    const { draftFeatures } = get();
    const normalizedSourceFeatures = clonePartFeatures(sourceFeatures);
    if (featuresEqual(draftFeatures, normalizedSourceFeatures)) {
      get().finishEditing();
      return;
    }
    set({ showExitDialog: true });
  },

  cancelExit: () => set({ showExitDialog: false }),

  finishEditing: () => {
    set({
      isEditingPartCuts: false,
      sourcePartId: null,
      sourcePartName: '',
      draftFeatures: [],
      draftHistory: [],
      draftFuture: [],
      selectedFeatureId: null,
      hoveredTarget: null,
      pendingTarget: null,
      showExitDialog: false
    });
    // Clear geometry cache so the main workspace doesn't use stale meshes
    clearPartGeometryCache();
    // Restore the main workspace camera position on re-mount
    if (useCameraStore.getState().cameraState) {
      useCameraStore.setState({ pendingCameraRestore: true });
    }
  },

  hasUnsavedDraftChanges: (sourceFeatures = []) => {
    const { draftFeatures } = get();
    return !featuresEqual(draftFeatures, clonePartFeatures(sourceFeatures));
  }
}));
