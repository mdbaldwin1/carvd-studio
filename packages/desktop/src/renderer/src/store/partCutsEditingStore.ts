import { create } from 'zustand';
import { PartFeature, PartFeatureTarget } from '../types';
import { clearPartGeometryCache } from '../utils/partFeatureGeometry';
import { clonePartFeatures } from '../utils/partFeatures';
import { useCameraStore } from './cameraStore';

function featuresEqual(a: PartFeature[], b: PartFeature[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

interface PartCutsEditingState {
  sessionGeneration: number;
  isEditingPartCuts: boolean;
  sourcePartId: string | null;
  sourcePartName: string;
  draftFeatures: PartFeature[];
  draftHistory: PartFeature[][];
  draftFuture: PartFeature[][];
  /** Which cut the newest history entry belongs to, for collapsing edit runs. */
  draftCoalesceKey: string | null;
  selectedFeatureId: string | null;
  hoveredTarget: PartFeatureTarget | null;
  pendingTarget: PartFeatureTarget | null;
  showExitDialog: boolean;
  inspectorDirty: boolean;
  commitInspector: (() => string | null) | null;
  registerInspector: (dirty: boolean, commit: (() => string | null) | null) => void;

  startEditingPartCuts: (partId: string, partName: string, features?: PartFeature[]) => void;
  setDraftFeatures: (features: PartFeature[], options?: { coalesceKey?: string }) => void;
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
  sessionGeneration: 0,
  isEditingPartCuts: false,
  sourcePartId: null,
  sourcePartName: '',
  draftFeatures: [],
  draftHistory: [],
  draftFuture: [],
  draftCoalesceKey: null,
  selectedFeatureId: null,
  hoveredTarget: null,
  pendingTarget: null,
  showExitDialog: false,
  inspectorDirty: false,
  commitInspector: null,
  registerInspector: (inspectorDirty, commitInspector) => set({ inspectorDirty, commitInspector }),

  startEditingPartCuts: (partId, partName, features = []) => {
    const draftFeatures = clonePartFeatures(features);
    set({
      sessionGeneration: get().sessionGeneration + 1,
      isEditingPartCuts: true,
      sourcePartId: partId,
      sourcePartName: partName,
      draftFeatures,
      draftHistory: [],
      draftFuture: [],
      draftCoalesceKey: null,
      selectedFeatureId: draftFeatures[0]?.id ?? null,
      hoveredTarget: null,
      pendingTarget: null,
      showExitDialog: false,
      inspectorDirty: false,
      commitInspector: null
    });
  },

  setDraftFeatures: (features, options) =>
    set((state) => {
      const draftFeatures = clonePartFeatures(features);
      if (featuresEqual(draftFeatures, state.draftFeatures)) {
        return {};
      }
      const selectedStillExists = state.selectedFeatureId
        ? draftFeatures.some((feature) => feature.id === state.selectedFeatureId)
        : false;

      // A run of edits to one cut collapses into a single undo step: the first
      // change pushes history and the rest fold into it. The inspector writes
      // straight through on every keystroke, so without this a typed dimension
      // would spend the 50-entry budget a character at a time and push the
      // cut's own creation off the end of the stack.
      const coalesce = !!options?.coalesceKey && options.coalesceKey === state.draftCoalesceKey;

      return {
        draftFeatures,
        draftHistory: coalesce ? state.draftHistory : [...state.draftHistory.slice(-49), state.draftFeatures],
        draftCoalesceKey: options?.coalesceKey ?? null,
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
        draftCoalesceKey: null,
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
        draftCoalesceKey: null,
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
      draftCoalesceKey: null,
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
    if (!get().inspectorDirty && featuresEqual(draftFeatures, normalizedSourceFeatures)) {
      get().finishEditing();
      return;
    }
    set({ showExitDialog: true });
  },

  cancelExit: () => set({ showExitDialog: false }),

  finishEditing: () => {
    set({
      sessionGeneration: get().sessionGeneration + 1,
      isEditingPartCuts: false,
      sourcePartId: null,
      sourcePartName: '',
      draftFeatures: [],
      draftHistory: [],
      draftFuture: [],
      draftCoalesceKey: null,
      selectedFeatureId: null,
      hoveredTarget: null,
      pendingTarget: null,
      showExitDialog: false,
      inspectorDirty: false,
      commitInspector: null
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
    return get().inspectorDirty || !featuresEqual(draftFeatures, clonePartFeatures(sourceFeatures));
  }
}));
