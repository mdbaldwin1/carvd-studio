import { isLengthwiseEdgeTarget } from '@renderer/utils/rectCutUtils';
import { usePartCutsEditingStore } from '@renderer/store/partCutsEditingStore';
import { useProjectStore } from '@renderer/store/projectStore';
import {
  applyTargetToFeatureDraft,
  buildDraftFromFeature,
  buildDraftFromPreset,
  buildFeatureFromDraft,
  CORNER_TARGETS,
  duplicateFeature,
  EDGE_TARGETS,
  FACE_TARGETS,
  FeatureDraft,
  getFeatureDraftTarget,
  isEdgeBevelTarget,
  normalizeEndCutDraft,
  normalizeRectCutDraft,
  OperationPreset
} from '@renderer/components/part-features/partFeatureEditorState';
import { PartFeature, PartFeatureTarget } from '@renderer/types';
import {
  getDerivedLengthMeasurements,
  getDerivedWidthMeasurements,
  validateEndCutFeature
} from '@renderer/utils/endCutUtils';
import { isTargetValidForDraft, partFeatureTargetEquals } from '@renderer/utils/partCutPicking';
import { getAvailableMirrorActions, mirrorFeature } from '@renderer/utils/partFeatureActions';
import { getPartFeatureConflicts } from '@renderer/utils/partFeatureConflicts';
import { getPartCutsDraftStatus } from '@renderer/utils/partCutsDraftStatus';
import { clonePartFeature } from '@renderer/utils/partFeatures';
import { getFeatureSummary, getFeatureTargetLabel } from '@renderer/utils/partFeatureSummary';
import {
  TOP_BOTTOM_CORNER_TARGETS,
  TOP_BOTTOM_EDGE_TARGETS,
  TOP_BOTTOM_FACE_TARGETS,
  validateRectCutFeature
} from '@renderer/utils/rectCutUtils';
import { validateCircularCut, validateRoundedCut } from '@renderer/utils/roundCutUtils';
import {} from '@renderer/components/ui/dropdown-menu';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Part } from '@renderer/types';

interface PartCutsWorkspaceProps {
  part: Part;
  draftFeatures: PartFeature[];
  units: 'imperial' | 'metric';
  selectedFeatureId: string | null;
  hoveredTarget: PartFeatureTarget | null;
  pendingTarget: PartFeatureTarget | null;
  onSelectFeature: (featureId: string | null) => void;
  onDraftFeaturesChange: (features: PartFeature[]) => void;
  onHoveredTargetChange: (target: PartFeatureTarget | null) => void;
  onPendingTargetChange: (target: PartFeatureTarget | null) => void;
  onExit: () => void;
  /** Retained for the header's Save path; this panel no longer renders a Save button. */
  onSave?: () => void;
  hasUnsavedChanges: boolean;
}

type CutsPanelMode = 'list' | 'add' | 'edit';

function reorderFeatures(features: PartFeature[], fromIndex: number, toIndex: number): PartFeature[] {
  if (toIndex < 0 || toIndex >= features.length || fromIndex === toIndex) return features;
  const next = [...features];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/**
 * Every piece of cut-editor state, derived value, and action, in one place.
 *
 * The editor is spread across the sidebar list, the Add Cut dialog, the
 * preview, and the properties panel, exactly as the project editor is. They
 * share this through PartCutsEditorProvider so the state lives once.
 */
export function usePartCutsEditorState({
  part,
  draftFeatures,
  units,
  selectedFeatureId,
  hoveredTarget,
  pendingTarget,
  onSelectFeature,
  onDraftFeaturesChange,
  onHoveredTargetChange,
  onPendingTargetChange,
  onExit,
  hasUnsavedChanges
}: PartCutsWorkspaceProps) {
  const [draft, setDraft] = useState<FeatureDraft | null>(null);
  const [panelMode, setPanelMode] = useState<CutsPanelMode>('list');
  const [showDowelDialog, setShowDowelDialog] = useState(false);
  const workspaceRootRef = useRef<HTMLDivElement | null>(null);

  // The workspace replaces the whole editor surface; move focus into it so
  // keyboard users land in the new mode instead of a removed element.
  useEffect(() => {
    workspaceRootRef.current?.focus();
  }, []);

  const projectParts = useProjectStore((state) => state.parts);
  const addDowelJoint = useProjectStore((state) => state.addDowelJoint);

  // Cut shortcuts (undo/redo, Escape, delete, nudge) live in
  // useKeyboardShortcuts alongside the project ones, routed by mode.

  useEffect(() => {
    setDraft(null);
    setPanelMode('list');
  }, [part.id]);

  const draftPreviewFeature = useMemo(() => {
    if (!draft || draft.mode !== 'end_cut') return null;
    // Preview exactly what Save will write. normalizeEndCutDraft rewrites a
    // zero bevel angle to 45, so previewing the raw draft showed a flat board
    // for a cut that saved as a 45 degree bevel.
    return buildFeatureFromDraft(normalizeEndCutDraft(draft));
  }, [draft]);

  const availableCornerTargets = useMemo(() => {
    if (!draft || draft.mode !== 'rect_cut' || draft.cutType !== 'corner_notch') return CORNER_TARGETS;
    return draft.depthMode === 'blind' ? TOP_BOTTOM_CORNER_TARGETS : CORNER_TARGETS;
  }, [draft]);

  const availableEdgeTargets = useMemo(() => {
    if (!draft || draft.mode !== 'rect_cut' || draft.cutType !== 'rabbet') return EDGE_TARGETS;
    // getResolvedRectCutFeature makes every rabbet blind, and a rabbet's run is
    // only defined along a horizontal edge, so never offer the vertical corner
    // edges here regardless of the authored depth mode.
    return TOP_BOTTOM_EDGE_TARGETS;
  }, [draft]);

  const availableFaceTargets = useMemo(() => {
    if (
      !draft ||
      draft.mode !== 'rect_cut' ||
      !['cutout', 'dado', 'stopped_dado', 'groove', 'stopped_groove', 'mortise'].includes(draft.cutType)
    ) {
      return FACE_TARGETS;
    }
    // Pockets can also sink into the front/back side faces (leg mortises);
    // channels stay on top/bottom where their run semantics are defined.
    if (draft.cutType === 'mortise' || draft.cutType === 'cutout') {
      return [...TOP_BOTTOM_FACE_TARGETS, 'front_face', 'back_face'] as typeof TOP_BOTTOM_FACE_TARGETS;
    }
    return TOP_BOTTOM_FACE_TARGETS;
  }, [draft]);

  const draftValidationMessage = useMemo(() => {
    if (!draft) return null;
    // Validate the same normalized draft that Save builds, so the message can
    // never describe geometry other than what will be written.
    const feature = buildFeatureFromDraft(draft.mode === 'end_cut' ? normalizeEndCutDraft(draft) : draft);
    const features = draft.featureId
      ? draftFeatures.map((existing) => (existing.id === draft.featureId ? feature : existing))
      : [...draftFeatures, feature];
    const candidate = { ...part, features };
    const issue =
      feature.kind === 'rect_cut'
        ? validateRectCutFeature(feature, candidate)
        : feature.kind === 'circular_cut'
          ? validateCircularCut(feature, candidate)
          : feature.kind === 'rounded_cut'
            ? validateRoundedCut(feature, candidate)
            : validateEndCutFeature(feature, candidate);
    if (issue) return issue;
    return (
      getPartFeatureConflicts(features, part).find(
        (conflict) =>
          conflict.severity === 'error' && (conflict.code === 'no_material' || conflict.code === 'material_removed')
      )?.message ?? null
    );
  }, [draft, part, draftFeatures]);

  const endCutPreviewMeasurements = useMemo(() => {
    if (!draftPreviewFeature || draftPreviewFeature.kind !== 'end_cut') return null;
    if (isEdgeBevelTarget(draftPreviewFeature.target.face)) return null;

    const nextFeatures = draft.featureId
      ? draftFeatures.map((feature) => (feature.id === draft.featureId ? draftPreviewFeature : feature))
      : [...draftFeatures, draftPreviewFeature];

    const measurements = getDerivedLengthMeasurements({
      length: part.length,
      width: part.width,
      thickness: part.thickness,
      features: nextFeatures
    });

    return measurements;
  }, [draft, draftFeatures, draftPreviewFeature, part.length, part.thickness, part.width]);

  const edgeBevelPreviewMeasurements = useMemo(() => {
    if (!draftPreviewFeature || draftPreviewFeature.kind !== 'end_cut') return null;
    if (!isEdgeBevelTarget(draftPreviewFeature.target.face)) return null;

    const nextFeatures = draft.featureId
      ? draftFeatures.map((feature) => (feature.id === draft.featureId ? draftPreviewFeature : feature))
      : [...draftFeatures, draftPreviewFeature];

    return getDerivedWidthMeasurements({
      width: part.width,
      thickness: part.thickness,
      features: nextFeatures
    });
  }, [draft, draftFeatures, draftPreviewFeature, part.thickness, part.width]);

  const isEndCutHighPointOnTop = (
    targetFace: 'left_end' | 'right_end' | 'front_face' | 'back_face',
    verticalFlip: boolean
  ): boolean => (targetFace === 'right_end' ? !verticalFlip : verticalFlip);

  const getVerticalFlipFromHighPoint = (
    targetFace: 'left_end' | 'right_end' | 'front_face' | 'back_face',
    highPoint: 'top' | 'bottom'
  ): boolean => (targetFace === 'right_end' ? highPoint !== 'top' : highPoint === 'top');

  // Shared with the header Save button so the two cannot disagree about
  // whether this draft is savable.
  const draftStatus = useMemo(
    () => getPartCutsDraftStatus(part, draftFeatures, hasUnsavedChanges),
    [part, draftFeatures, hasUnsavedChanges]
  );
  const featureConflicts = draftStatus.conflicts;
  const operationIssues = draftStatus.issues;
  const firstInvalidIndex = draftStatus.firstInvalidIndex;
  const enabledOperationCount = draftFeatures.filter((feature) => feature.enabled).length;
  const conflictsByFeatureId = useMemo(() => {
    const map = new Map<string, typeof featureConflicts>();
    for (const conflict of featureConflicts) {
      const existing = map.get(conflict.featureId) ?? [];
      existing.push(conflict);
      map.set(conflict.featureId, existing);
    }
    return map;
  }, [featureConflicts]);

  const handleStartPreset = (preset: OperationPreset) => {
    setDraft(
      buildDraftFromPreset(preset, { partLength: part.length, partWidth: part.width, partThickness: part.thickness })
    );
    setPanelMode('add');
    onSelectFeature(null);
  };

  const handleBeginAdd = () => {
    setDraft(null);
    setPanelMode('add');
    onSelectFeature(null);
    onPendingTargetChange(null);
  };

  const handleEditFeature = (feature: PartFeature) => {
    setDraft(buildDraftFromFeature(feature, part));
    setPanelMode('edit');
    onSelectFeature(feature.id);
  };

  const handleSaveDraft = useCallback((): string | null => {
    if (!draft) return null;
    if (draftValidationMessage) return draftValidationMessage;

    const builtFeature = buildFeatureFromDraft(draft.mode === 'end_cut' ? normalizeEndCutDraft(draft) : draft);
    const originalFeature = draft.featureId
      ? draftFeatures.find((feature) => feature.id === draft.featureId)
      : undefined;
    const nextFeature = originalFeature?.metadata
      ? { ...builtFeature, metadata: clonePartFeature(originalFeature).metadata }
      : builtFeature;
    // Draft undo can remove the edited cut from the list while its inspector is
    // still open. Replacing by id would then match nothing and drop the edit
    // without a word, so re-add a cut whose original is gone rather than
    // silently discarding what the user just typed.
    const nextFeatures =
      draft.featureId && originalFeature
        ? draftFeatures.map((feature) => (feature.id === draft.featureId ? nextFeature : feature))
        : [...draftFeatures, nextFeature];

    onDraftFeaturesChange(nextFeatures);
    onSelectFeature(nextFeature.id);
    setDraft(null);
    setPanelMode('list');
    return null;
  }, [draft, draftValidationMessage, draftFeatures, onDraftFeaturesChange, onSelectFeature]);

  const originalInspectorFeature = draft?.featureId
    ? draftFeatures.find((feature) => feature.id === draft.featureId)
    : undefined;
  const inspectorDirty =
    !!draft &&
    (!originalInspectorFeature ||
      JSON.stringify(draft) !== JSON.stringify(buildDraftFromFeature(originalInspectorFeature, part)));
  useLayoutEffect(() => {
    usePartCutsEditingStore.getState().registerInspector(inspectorDirty, draft ? handleSaveDraft : null);
    return () => usePartCutsEditingStore.getState().registerInspector(false, null);
  }, [draft, handleSaveDraft, inspectorDirty]);

  const handleRemoveFeature = (featureId: string) => {
    onDraftFeaturesChange(draftFeatures.filter((feature) => feature.id !== featureId));
    if (draft?.featureId === featureId) {
      setDraft(null);
      setPanelMode('list');
    }
    if (selectedFeatureId === featureId) {
      onSelectFeature(null);
    }
  };

  const handleDuplicateFeature = (feature: PartFeature) => {
    const duplicate = duplicateFeature(feature);
    onDraftFeaturesChange([...draftFeatures, duplicate]);
    onSelectFeature(duplicate.id);
    setDraft(buildDraftFromFeature(duplicate, part));
    setPanelMode('edit');
  };

  const handleMirrorFeature = (feature: PartFeature, action: ReturnType<typeof getAvailableMirrorActions>[number]) => {
    const mirrored = mirrorFeature(feature, action, part);
    const sourceIndex = draftFeatures.findIndex((entry) => entry.id === feature.id);
    const nextFeatures = [...draftFeatures];
    nextFeatures.splice(sourceIndex + 1, 0, mirrored);
    onDraftFeaturesChange(nextFeatures);
    onSelectFeature(mirrored.id);
    setDraft(buildDraftFromFeature(mirrored, part));
    setPanelMode('edit');
  };

  const handleMoveFeature = (featureId: string, direction: -1 | 1) => {
    const fromIndex = draftFeatures.findIndex((feature) => feature.id === featureId);
    if (fromIndex < 0) return;
    const nextFeatures = reorderFeatures(draftFeatures, fromIndex, fromIndex + direction);
    onDraftFeaturesChange(nextFeatures);
  };

  const updateRectDraft = (
    updater:
      | Partial<Extract<FeatureDraft, { mode: 'rect_cut' }>>
      | ((draft: Extract<FeatureDraft, { mode: 'rect_cut' }>) => Extract<FeatureDraft, { mode: 'rect_cut' }>)
  ) => {
    setDraft((current) => {
      if (!current || current.mode !== 'rect_cut') return current;
      const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
      return normalizeRectCutDraft(next, {
        partLength: part.length,
        partWidth: part.width,
        partThickness: part.thickness
      });
    });
  };

  const inspectorDraft = panelMode === 'list' ? null : draft;
  const isChoosingCutType = panelMode === 'add' && !draft;
  const isEditingDraft = !!inspectorDraft;

  useEffect(() => {
    const nextTarget = inspectorDraft ? getFeatureDraftTarget(inspectorDraft) : null;
    if (!partFeatureTargetEquals(nextTarget, pendingTarget)) {
      onPendingTargetChange(nextTarget);
    }
  }, [inspectorDraft, onPendingTargetChange, pendingTarget]);

  const handlePreviewTargetActivation = (target: PartFeatureTarget | null) => {
    onPendingTargetChange(target);
    if (!target || !inspectorDraft || !isTargetValidForDraft(target, inspectorDraft)) return;
    const nextDraft = applyTargetToFeatureDraft(inspectorDraft, target);
    setDraft(
      nextDraft.mode === 'rect_cut'
        ? normalizeRectCutDraft(nextDraft, {
            partLength: part.length,
            partWidth: part.width,
            partThickness: part.thickness
          })
        : nextDraft
    );
  };

  const handleCancelEditor = () => {
    setDraft(null);
    setPanelMode('list');
    onSelectFeature(null);
    onPendingTargetChange(null);
  };

  const selectedFeatureSummary = inspectorDraft
    ? getFeatureSummary(buildFeatureFromDraft(inspectorDraft), units)
    : null;
  const selectedFeatureTargetLabel = inspectorDraft
    ? getFeatureTargetLabel(buildFeatureFromDraft(inspectorDraft))
    : null;
  const inspectorIsRabbet = inspectorDraft?.mode === 'rect_cut' && inspectorDraft.cutType === 'rabbet';
  const rabbetRunsAlongLength = inspectorIsRabbet && isLengthwiseEdgeTarget(inspectorDraft.edgeTarget);
  const rabbetShoulderValue = inspectorIsRabbet
    ? rabbetRunsAlongLength
      ? inspectorDraft.sizeWidth
      : inspectorDraft.sizeLength
    : null;
  const inspectorUsesBlindOnlyDepth =
    inspectorDraft?.mode === 'rect_cut' &&
    ['dado', 'stopped_dado', 'rabbet', 'groove', 'stopped_groove', 'mortise'].includes(inspectorDraft.cutType);
  const inspectorHidesDepthSelector =
    inspectorUsesBlindOnlyDepth ||
    (inspectorDraft?.mode === 'rect_cut' &&
      (inspectorDraft.cutType === 'corner_notch' ||
        inspectorDraft.cutType === 'edge_notch' ||
        // A tenon is sized by its tongue, not by a through/blind choice.
        inspectorDraft.cutType === 'tenon'));
  const inspectorUsesDerivedCrossWidth =
    inspectorDraft?.mode === 'rect_cut' && ['dado', 'stopped_dado', 'rabbet'].includes(inspectorDraft.cutType);
  const preservedEndCutReferenceNote =
    inspectorDraft?.mode === 'end_cut' &&
    (inspectorDraft.lengthMode !== 'long_point' || inspectorDraft.referenceMode !== null)
      ? `This cut keeps its saved ${inspectorDraft.referenceMode ?? inspectorDraft.lengthMode.replace('_', ' ')} reference while you edit it.`
      : null;

  return {
    part,
    draftFeatures,
    units,
    selectedFeatureId,
    hoveredTarget,
    pendingTarget,
    onSelectFeature,
    onDraftFeaturesChange,
    onHoveredTargetChange,
    onPendingTargetChange,
    onExit,
    hasUnsavedChanges,
    draft,
    setDraft,
    panelMode,
    setPanelMode,
    showDowelDialog,
    setShowDowelDialog,
    workspaceRootRef,
    projectParts,
    addDowelJoint,
    draftPreviewFeature,
    availableCornerTargets,
    availableEdgeTargets,
    availableFaceTargets,
    draftValidationMessage,
    endCutPreviewMeasurements,
    edgeBevelPreviewMeasurements,
    isEndCutHighPointOnTop,
    getVerticalFlipFromHighPoint,
    draftStatus,
    featureConflicts,
    operationIssues,
    firstInvalidIndex,
    enabledOperationCount,
    conflictsByFeatureId,
    handleStartPreset,
    handleBeginAdd,
    handleEditFeature,
    handleSaveDraft,
    originalInspectorFeature,
    inspectorDirty,
    handleRemoveFeature,
    handleDuplicateFeature,
    handleMirrorFeature,
    handleMoveFeature,
    updateRectDraft,
    inspectorDraft,
    isChoosingCutType,
    isEditingDraft,
    handlePreviewTargetActivation,
    handleCancelEditor,
    selectedFeatureSummary,
    selectedFeatureTargetLabel,
    inspectorIsRabbet,
    rabbetRunsAlongLength,
    rabbetShoulderValue,
    inspectorUsesBlindOnlyDepth,
    inspectorHidesDepthSelector,
    inspectorUsesDerivedCrossWidth,
    preservedEndCutReferenceNote
  };
}

export type PartCutsEditorState = ReturnType<typeof usePartCutsEditorState>;
