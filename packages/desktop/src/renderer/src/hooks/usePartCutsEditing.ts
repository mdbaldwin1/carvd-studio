import { useCallback, useMemo } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useSelectionStore } from '../store/selectionStore';
import { useUIStore } from '../store/uiStore';
import { usePartCutsEditingStore } from '../store/partCutsEditingStore';
import { clonePartFeatures } from '../utils/partFeatures';

export function usePartCutsEditing() {
  const parts = useProjectStore((s) => s.parts);
  const updatePart = useProjectStore((s) => s.updatePart);
  const selectPart = useSelectionStore((s) => s.selectPart);
  const showToast = useUIStore((s) => s.showToast);

  const isEditingPartCuts = usePartCutsEditingStore((s) => s.isEditingPartCuts);
  const sourcePartId = usePartCutsEditingStore((s) => s.sourcePartId);
  const sourcePartName = usePartCutsEditingStore((s) => s.sourcePartName);
  const draftFeatures = usePartCutsEditingStore((s) => s.draftFeatures);
  const selectedFeatureId = usePartCutsEditingStore((s) => s.selectedFeatureId);
  const hoveredTarget = usePartCutsEditingStore((s) => s.hoveredTarget);
  const pendingTarget = usePartCutsEditingStore((s) => s.pendingTarget);
  const showExitDialog = usePartCutsEditingStore((s) => s.showExitDialog);
  const startEditingPartCuts = usePartCutsEditingStore((s) => s.startEditingPartCuts);
  const setDraftFeatures = usePartCutsEditingStore((s) => s.setDraftFeatures);
  const resetDraftFeatures = usePartCutsEditingStore((s) => s.resetDraftFeatures);
  const selectFeature = usePartCutsEditingStore((s) => s.selectFeature);
  const setHoveredTarget = usePartCutsEditingStore((s) => s.setHoveredTarget);
  const setPendingTarget = usePartCutsEditingStore((s) => s.setPendingTarget);
  const requestStoreExit = usePartCutsEditingStore((s) => s.requestExit);
  const cancelExit = usePartCutsEditingStore((s) => s.cancelExit);
  const finishEditing = usePartCutsEditingStore((s) => s.finishEditing);
  const hasUnsavedDraftChanges = usePartCutsEditingStore((s) => s.hasUnsavedDraftChanges);

  const sourcePart = useMemo(
    () => (sourcePartId ? (parts.find((part) => part.id === sourcePartId) ?? null) : null),
    [parts, sourcePartId]
  );
  const sourceFeatures = useMemo(() => sourcePart?.features ?? [], [sourcePart]);

  const openForPart = useCallback(
    (partId: string) => {
      const part = useProjectStore.getState().parts.find((entry) => entry.id === partId);
      if (!part) {
        showToast('Part not found', 'error');
        return false;
      }

      startEditingPartCuts(part.id, part.name, part.features);
      selectPart(part.id);
      return true;
    },
    [selectPart, showToast, startEditingPartCuts]
  );

  const saveAndExit = useCallback(() => {
    const currentPart = sourcePartId ? useProjectStore.getState().parts.find((part) => part.id === sourcePartId) : null;
    if (!currentPart || !sourcePartId) {
      showToast('Part not found', 'error');
      finishEditing();
      return false;
    }

    updatePart(sourcePartId, { features: clonePartFeatures(draftFeatures) });
    finishEditing();
    selectPart(sourcePartId);
    showToast(`Saved cuts for "${currentPart.name}"`, 'success');
    return true;
  }, [draftFeatures, finishEditing, selectPart, showToast, sourcePartId, updatePart]);

  const discardAndExit = useCallback(() => {
    finishEditing();
    if (sourcePartId) {
      selectPart(sourcePartId);
    }
  }, [finishEditing, selectPart, sourcePartId]);

  const requestExit = useCallback(() => {
    requestStoreExit(sourceFeatures);
  }, [requestStoreExit, sourceFeatures]);

  const restoreDraftFromSource = useCallback(() => {
    resetDraftFeatures(sourceFeatures);
  }, [resetDraftFeatures, sourceFeatures]);

  return {
    isEditingPartCuts,
    sourcePartId,
    sourcePartName,
    sourcePart,
    draftFeatures,
    selectedFeatureId,
    hoveredTarget,
    pendingTarget,
    showExitDialog,
    openForPart,
    saveAndExit,
    discardAndExit,
    requestExit,
    cancelExit,
    restoreDraftFromSource,
    setDraftFeatures,
    selectFeature,
    setHoveredTarget,
    setPendingTarget,
    hasUnsavedChanges: hasUnsavedDraftChanges(sourceFeatures)
  };
}
