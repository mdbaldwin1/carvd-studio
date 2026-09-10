import { useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { useProjectStore } from '../store/projectStore';
import { useSelectionStore } from '../store/selectionStore';
import { useUIStore } from '../store/uiStore';
import { usePartCutsEditingStore } from '../store/partCutsEditingStore';
import { getPartFeatureConflicts } from '../utils/partFeatureConflicts';
import { clonePartFeatures } from '../utils/partFeatures';
import { getFeatureTargetLabel } from '../utils/partFeatureSummary';
import { validateRectCutFeature } from '../utils/rectCutUtils';
import { validateEndCutFeature } from '../utils/endCutUtils';
import { validateCircularCut, validateRoundedCut } from '../utils/roundCutUtils';
import { analytics } from '../utils/analytics';
import { bucketCount } from '../../../shared/analytics';

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
  const inspectorDirty = usePartCutsEditingStore((s) => s.inspectorDirty);

  const sourcePart = useMemo(
    () => (sourcePartId ? (parts.find((part) => part.id === sourcePartId) ?? null) : null),
    [parts, sourcePartId]
  );
  const sourceFeatures = useMemo(() => sourcePart?.features ?? [], [sourcePart]);

  const saveAndExit = useCallback(() => {
    // Fraction inputs commit on blur. Flush that update before reading the
    // registered inspector callback, including saves from native menus.
    flushSync(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    const inspectorIssue = usePartCutsEditingStore.getState().commitInspector?.();
    if (inspectorIssue) {
      showToast(inspectorIssue, 'error');
      return false;
    }
    const draftFeatures = usePartCutsEditingStore.getState().draftFeatures;
    const currentPart = sourcePartId ? useProjectStore.getState().parts.find((part) => part.id === sourcePartId) : null;
    if (!currentPart || !sourcePartId) {
      showToast('Part not found', 'error');
      finishEditing();
      return false;
    }

    for (const feature of draftFeatures) {
      if (!feature.enabled) continue;
      const featureIssue =
        feature.kind === 'rect_cut'
          ? validateRectCutFeature(feature, { ...currentPart, features: draftFeatures })
          : feature.kind === 'circular_cut'
            ? validateCircularCut(feature, { ...currentPart, features: draftFeatures })
            : feature.kind === 'rounded_cut'
              ? validateRoundedCut(feature, { ...currentPart, features: draftFeatures })
              : validateEndCutFeature(feature, { ...currentPart, features: draftFeatures });
      if (!featureIssue) continue;
      const featureLabel =
        feature.label?.trim() || `${feature.cutType.replace(/_/g, ' ')} on ${getFeatureTargetLabel(feature)}`;
      showToast(`${featureLabel}: ${featureIssue}`, 'error');
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
    analytics.capture('part_cuts_saved', { operation_count_bucket: bucketCount(draftFeatures.length) });
    finishEditing();
    selectPart(sourcePartId);
    showToast(`Saved cuts for "${currentPart.name}"`, 'success');
    return true;
  }, [finishEditing, selectPart, showToast, sourcePartId, updatePart]);

  const discardAndExit = useCallback(() => {
    finishEditing();
    if (sourcePartId) {
      selectPart(sourcePartId);
    }
  }, [finishEditing, selectPart, sourcePartId]);

  const requestExit = useCallback(() => {
    flushSync(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
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
    hasUnsavedChanges: inspectorDirty || hasUnsavedDraftChanges(sourceFeatures),
    inspectorDirty
  };
}
