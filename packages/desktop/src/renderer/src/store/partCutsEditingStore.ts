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
      selectedFeatureId: draftFeatures[0]?.id ?? null,
      hoveredTarget: null,
      pendingTarget: null,
      showExitDialog: false
    });
  },

  setDraftFeatures: (features) =>
    set((state) => {
      const draftFeatures = clonePartFeatures(features);
      const selectedStillExists = state.selectedFeatureId
        ? draftFeatures.some((feature) => feature.id === state.selectedFeatureId)
        : false;

      return {
        draftFeatures,
        selectedFeatureId: selectedStillExists ? state.selectedFeatureId : (draftFeatures[0]?.id ?? null)
      };
    }),

  resetDraftFeatures: (features = []) => {
    const draftFeatures = clonePartFeatures(features);
    set({
      draftFeatures,
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
