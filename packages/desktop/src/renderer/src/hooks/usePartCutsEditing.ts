import { useCallback, useMemo } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useSelectionStore } from '../store/selectionStore';
import { useUIStore } from '../store/uiStore';
import { usePartCutsEditingStore } from '../store/partCutsEditingStore';
import { getPartFeatureConflicts } from '../utils/partFeatureConflicts';
import { clonePartFeatures } from '../utils/partFeatures';
import { getFeatureTargetLabel } from '../utils/partFeatureSummary';
import { validateRectCutFeature } from '../utils/rectCutUtils';

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
  const setDraftFeatures = usePartCutsEditingStore((s) => s.setDraftFeatures);
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

  const saveAndExit = useCallback(() => {
    const currentPart = sourcePartId ? useProjectStore.getState().parts.find((part) => part.id === sourcePartId) : null;
    if (!currentPart || !sourcePartId) {
      showToast('Part not found', 'error');
      finishEditing();
      return false;
    }

    for (const feature of draftFeatures) {
      if (!feature.enabled || feature.kind !== 'rect_cut') continue;
      const rectCutIssue = validateRectCutFeature(feature, currentPart);
      if (!rectCutIssue) continue;
      const featureLabel =
        feature.label?.trim() || `${feature.cutType.replace(/_/g, ' ')} on ${getFeatureTargetLabel(feature)}`;
      showToast(`Resolve "${featureLabel}" before saving part cuts`, 'error');
      return false;
    }

    const blockingConflicts = getPartFeatureConflicts(draftFeatures, currentPart).filter(
      (conflict) => conflict.severity === 'error'
    );
    if (blockingConflicts.length > 0) {
      showToast(blockingConflicts[0].message, 'error');
      return false;
    }

    const didUpdate = updatePart(sourcePartId, { features: clonePartFeatures(draftFeatures) });
    if (!didUpdate) {
      showToast('Couldn\u2019t save cuts \u2014 the updated part would overlap another part', 'error');
      return false;
    }
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
    saveAndExit,
    discardAndExit,
    requestExit,
    cancelExit,
    setDraftFeatures,
    selectFeature,
    setHoveredTarget,
    setPendingTarget,
    hasUnsavedChanges: hasUnsavedDraftChanges(sourceFeatures)
  };
}
