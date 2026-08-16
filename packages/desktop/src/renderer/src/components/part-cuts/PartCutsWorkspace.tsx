import { FractionInput } from '@renderer/components/common/FractionInput';
import { PartCutsPreviewCanvas } from '@renderer/components/part-cuts/PartCutsPreviewCanvas';
import { usePartCutsEditingStore } from '@renderer/store/partCutsEditingStore';
import {
  applyTargetToFeatureDraft,
  buildDraftFromFeature,
  buildDraftFromPreset,
  buildFeatureFromDraft,
  CORNER_TARGETS,
  duplicateFeature,
  EDGE_NOTCH_SIDE_LABELS,
  EDGE_NOTCH_SIDES,
  EDGE_TARGETS,
  edgeNotchSideToTarget,
  edgeTargetToSide,
  END_TARGETS,
  FACE_TARGETS,
  FeatureDraft,
  getFeatureDraftTarget,
  getPresetHint as getOperationPresetHint,
  getPresetLabel as getOperationPresetLabel,
  isEdgeBevelTarget,
  normalizeEndCutDraft,
  normalizeRectCutDraft,
  OperationPreset
} from '@renderer/components/part-features/partFeatureEditorState';
import { Badge } from '@renderer/components/ui/badge';
import { Button } from '@renderer/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Checkbox } from '@renderer/components/ui/checkbox';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { Select } from '@renderer/components/ui/select';
import { EndCutFeature, Part, PartFeature, PartFeatureTarget, RectCutFeature } from '@renderer/types';
import { getDerivedLengthMeasurements, getDerivedWidthMeasurements } from '@renderer/utils/endCutUtils';
import { formatMeasurementWithUnit } from '@renderer/utils/fractions';
import { getPickableTargetLabel, isTargetValidForDraft, partFeatureTargetEquals } from '@renderer/utils/partCutPicking';
import { getAvailableMirrorActions, getMirrorActionLabel, mirrorFeature } from '@renderer/utils/partFeatureActions';
import { getPartFeatureConflicts } from '@renderer/utils/partFeatureConflicts';
import {
  CORNER_LABELS,
  EDGE_LABELS,
  FACE_LABELS,
  getFeatureSummary,
  getFeatureTargetLabel
} from '@renderer/utils/partFeatureSummary';
import {
  TOP_BOTTOM_CORNER_TARGETS,
  TOP_BOTTOM_EDGE_TARGETS,
  TOP_BOTTOM_FACE_TARGETS,
  validateRectCutFeature
} from '@renderer/utils/rectCutUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

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
  onSave: () => void;
  hasUnsavedChanges: boolean;
}

type CutsPanelMode = 'list' | 'add' | 'edit';

function getBlankSizeLabel(part: Part, units: 'imperial' | 'metric'): string {
  return [
    formatMeasurementWithUnit(part.length, units),
    formatMeasurementWithUnit(part.width, units),
    formatMeasurementWithUnit(part.thickness, units)
  ].join(' × ');
}

function reorderFeatures(features: PartFeature[], fromIndex: number, toIndex: number): PartFeature[] {
  if (toIndex < 0 || toIndex >= features.length || fromIndex === toIndex) return features;
  const next = [...features];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function getSelectedTargetLabel(draft: FeatureDraft | null): string | null {
  if (!draft) return null;
  if (draft.mode === 'end_cut') return FACE_LABELS[draft.targetFace];
  if (draft.cutType === 'corner_notch') return CORNER_LABELS[draft.cornerTarget];
  if (draft.cutType === 'edge_notch') return EDGE_NOTCH_SIDE_LABELS[edgeTargetToSide(draft.edgeTarget)];
  if (draft.cutType === 'rabbet') return EDGE_LABELS[draft.edgeTarget];
  return FACE_LABELS[draft.faceTarget];
}

function getDraftStepTitle(draft: FeatureDraft): string {
  if (draft.mode === 'end_cut')
    return isEdgeBevelTarget(draft.targetFace)
      ? 'Step 2: Pick the edge and set the bevel angle'
      : 'Step 2: Pick the end and set the angle';

  switch (draft.cutType) {
    case 'tenon':
      return 'Step 2: Pick the end and size the tongue';
    case 'corner_notch':
      return 'Step 2: Pick the corner and size the notch';
    case 'edge_notch':
      return 'Step 2: Pick the edge and size the notch';
    case 'cutout':
      return 'Step 2: Pick the face and place the cutout';
    case 'dado':
    case 'stopped_dado':
      return 'Step 2: Pick the face and lay out the dado';
    case 'rabbet':
      return 'Step 2: Pick the edge and size the rabbet';
    case 'groove':
    case 'stopped_groove':
      return 'Step 2: Pick the face and lay out the groove';
    case 'mortise':
      return 'Step 2: Pick the face and place the mortise';
  }
}

function getDraftStepDescription(draft: FeatureDraft): string {
  if (draft.mode === 'end_cut') {
    return 'Choose the end first, then set the cut style, angle, and direction. The part length stays fixed for the cut list.';
  }

  switch (draft.cutType) {
    case 'corner_notch':
      return 'Choose the exact corner, then set the notch size and depth.';
    case 'edge_notch':
      return 'Choose the edge, then set the notch size, depth, and offsets.';
    case 'cutout':
      return 'Choose the face, then set the opening size, depth, and placement.';
    case 'dado':
      return 'Choose the face, then set the dado width and depth.';
    case 'stopped_dado':
      return 'Choose the face, then set the stopped run, width, start offset, and depth.';
    case 'rabbet':
      return 'Choose the edge, then set the shoulder width and depth.';
    case 'groove':
      return 'Choose the face, then set the groove width and depth.';
    case 'stopped_groove':
      return 'Choose the face, then set the groove run, width, offsets, and depth.';
    case 'mortise':
      return 'Choose the face, then set the pocket size, placement, and depth.';
  }
}

export function PartCutsWorkspace({
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
  onSave,
  hasUnsavedChanges
}: PartCutsWorkspaceProps) {
  const [draft, setDraft] = useState<FeatureDraft | null>(null);
  const [panelMode, setPanelMode] = useState<CutsPanelMode>('list');
  const workspaceRootRef = useRef<HTMLDivElement | null>(null);

  // The workspace replaces the whole editor surface; move focus into it so
  // keyboard users land in the new mode instead of a removed element.
  useEffect(() => {
    workspaceRootRef.current?.focus();
  }, []);

  const undoDraft = usePartCutsEditingStore((state) => state.undoDraft);
  const redoDraft = usePartCutsEditingStore((state) => state.redoDraft);
  const canUndoDraft = usePartCutsEditingStore((state) => state.draftHistory.length > 0);
  const canRedoDraft = usePartCutsEditingStore((state) => state.draftFuture.length > 0);

  // Draft-level undo/redo: the global project shortcuts are gated off in this
  // mode, so Cmd+Z here steps the cut draft, not the project.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const isMod = event.metaKey || event.ctrlKey;
      if (!isMod) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && event.shiftKey) {
        event.preventDefault();
        redoDraft();
      } else if (key === 'z') {
        event.preventDefault();
        undoDraft();
      } else if (key === 'y') {
        event.preventDefault();
        redoDraft();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [redoDraft, undoDraft]);

  useEffect(() => {
    setDraft(null);
    setPanelMode('list');
  }, [part.id]);

  const draftPreviewFeature = useMemo(() => {
    if (!draft || draft.mode !== 'end_cut') return null;
    return buildFeatureFromDraft(draft);
  }, [draft]);

  const availableCornerTargets = useMemo(() => {
    if (!draft || draft.mode !== 'rect_cut' || draft.cutType !== 'corner_notch') return CORNER_TARGETS;
    return draft.depthMode === 'blind' ? TOP_BOTTOM_CORNER_TARGETS : CORNER_TARGETS;
  }, [draft]);

  const availableEdgeTargets = useMemo(() => {
    if (!draft || draft.mode !== 'rect_cut' || draft.cutType !== 'rabbet') return EDGE_TARGETS;
    return draft.depthMode === 'blind' ? TOP_BOTTOM_EDGE_TARGETS : EDGE_TARGETS;
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
    if (!draft || draft.mode !== 'rect_cut') return null;
    return validateRectCutFeature(buildFeatureFromDraft(draft), part);
  }, [draft, part]);

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

  const featureConflicts = useMemo(() => getPartFeatureConflicts(draftFeatures, part), [draftFeatures, part]);
  const hasBlockingFeatureConflicts = featureConflicts.some((conflict) => conflict.severity === 'error');
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

  const handleSaveDraft = () => {
    if (!draft) return;
    if (draft.mode === 'rect_cut' && draftValidationMessage) return;

    const nextFeature = buildFeatureFromDraft(draft.mode === 'end_cut' ? normalizeEndCutDraft(draft) : draft);
    const nextFeatures = draft.featureId
      ? draftFeatures.map((feature) => (feature.id === draft.featureId ? nextFeature : feature))
      : [...draftFeatures, nextFeature];

    onDraftFeaturesChange(nextFeatures);
    onSelectFeature(nextFeature.id);
    setDraft(null);
    setPanelMode('list');
  };

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

  const selectedTargetLabel = getSelectedTargetLabel(inspectorDraft);
  const activeTargetLabel = getPickableTargetLabel(hoveredTarget) ?? getPickableTargetLabel(pendingTarget);
  const selectedFeatureSummary = inspectorDraft
    ? getFeatureSummary(buildFeatureFromDraft(inspectorDraft), units)
    : null;
  const selectedFeatureTargetLabel = inspectorDraft
    ? getFeatureTargetLabel(buildFeatureFromDraft(inspectorDraft))
    : null;
  const inspectorIsRabbet = inspectorDraft?.mode === 'rect_cut' && inspectorDraft.cutType === 'rabbet';
  const rabbetRunsAlongLength =
    inspectorIsRabbet && (inspectorDraft.edgeTarget.includes('front') || inspectorDraft.edgeTarget.includes('back'));
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

  return (
    <div
      ref={workspaceRootRef}
      tabIndex={-1}
      role="region"
      aria-label={`Part cuts for ${part.name}`}
      className="app-main flex min-h-0 flex-1 bg-bg outline-none"
    >
      <div className="flex min-h-0 flex-1 gap-4 p-4">
        <Card className="flex min-h-0 flex-1 flex-col">
          <CardHeader className="pb-4">
            <CardTitle>{part.name}</CardTitle>
            <CardDescription>
              Blank size: <span className="font-medium text-text">{getBlankSizeLabel(part, units)}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-[320px] flex-1 flex-col gap-3">
              <PartCutsPreviewCanvas
                part={part}
                draftFeatures={draftFeatures}
                draft={inspectorDraft}
                selectedFeatureSummary={selectedFeatureSummary}
                selectedFeatureTargetLabel={selectedFeatureTargetLabel}
                hoveredTarget={hoveredTarget}
                pendingTarget={pendingTarget}
                onHoverTarget={onHoveredTargetChange}
                onActivateTarget={handlePreviewTargetActivation}
                onDraftChange={(nextDraft) =>
                  setDraft(
                    nextDraft.mode === 'rect_cut'
                      ? normalizeRectCutDraft(nextDraft, {
                          partLength: part.length,
                          partWidth: part.width,
                          partThickness: part.thickness
                        })
                      : nextDraft
                  )
                }
              />

              {(selectedTargetLabel || activeTargetLabel || selectedFeatureSummary) && (
                <div className="rounded-md border border-border bg-bg px-3 py-3 text-left text-sm text-text-secondary">
                  {selectedFeatureSummary && <div className="font-medium text-text">{selectedFeatureSummary}</div>}
                  {selectedTargetLabel && (
                    <div className="mt-1">
                      Target: <span className="font-medium text-text">{selectedTargetLabel}</span>
                    </div>
                  )}
                  {activeTargetLabel && (
                    <div className="mt-1">
                      Preview pick: <span className="font-medium text-text">{activeTargetLabel}</span>
                    </div>
                  )}
                </div>
              )}
              {featureConflicts.length > 0 && (
                <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-3 text-left">
                  <div className="text-xs font-semibold uppercase tracking-wide text-warning">Cut Conflicts</div>
                  <ul className="mt-2 space-y-1 text-sm text-warning">
                    {featureConflicts.slice(0, 3).map((conflict, index) => (
                      <li key={`${conflict.featureId}-${conflict.relatedFeatureId ?? 'none'}-${index}`}>
                        {conflict.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex min-h-0 w-[420px] flex-col">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>{panelMode === 'list' ? 'Cuts' : panelMode === 'add' ? 'Add Cut' : 'Edit Cut'}</CardTitle>
                <CardDescription>
                  {panelMode === 'list'
                    ? `${draftFeatures.length} cut${draftFeatures.length === 1 ? '' : 's'} on this part`
                    : panelMode === 'add' && !draft
                      ? 'Step 1: choose the kind of cut you want to add.'
                      : inspectorDraft
                        ? getDraftStepDescription(inspectorDraft)
                        : 'Finish this cut, then save it back to the cut list.'}
                </CardDescription>
              </div>
              {panelMode === 'list' ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={undoDraft}
                    disabled={!canUndoDraft}
                    aria-label="Undo cut change"
                    title="Undo cut change (Cmd+Z)"
                  >
                    Undo
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={redoDraft}
                    disabled={!canRedoDraft}
                    aria-label="Redo cut change"
                    title="Redo cut change (Cmd+Shift+Z)"
                  >
                    Redo
                  </Button>
                  <Button onClick={handleBeginAdd}>+ Add Cut</Button>
                </div>
              ) : (
                <Button variant="ghost" onClick={handleCancelEditor}>
                  Back to Cuts
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
            {panelMode === 'list' && (
              <>
                <div className="rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm text-text-secondary">
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      <span className="font-medium text-text">{enabledOperationCount}</span> enabled
                    </span>
                    <span className={`font-medium ${hasUnsavedChanges ? 'text-accent' : 'text-text'}`}>
                      {hasUnsavedChanges ? 'Unsaved part changes' : 'No unsaved changes'}
                    </span>
                  </div>
                </div>

                <ScrollArea className="min-h-0 flex-1">
                  <div className="space-y-3 pr-1">
                    {draftFeatures.length === 0 ? (
                      <div className="rounded-md border border-dashed border-border px-3 py-5 text-sm text-text-muted">
                        No cuts yet. Use <span className="font-medium text-text">+ Add Cut</span> to start the first
                        one.
                      </div>
                    ) : (
                      draftFeatures.map((feature, index) => {
                        const conflicts = conflictsByFeatureId.get(feature.id) ?? [];
                        return (
                          <div
                            key={feature.id}
                            className="flex items-start gap-2 rounded-md border border-border bg-bg px-3 py-3 transition-colors hover:border-accent hover:bg-accent/5"
                          >
                            <div className="pt-0.5">
                              <Checkbox
                                checked={feature.enabled}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  onDraftFeaturesChange(
                                    draftFeatures.map((f) =>
                                      f.id === feature.id ? { ...f, enabled: e.target.checked } : f
                                    )
                                  );
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              className="flex-1 text-left"
                              onClick={() => handleEditFeature(feature)}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-medium text-text">
                                    {index + 1}. {feature.label?.trim() || getFeatureSummary(feature, units)}
                                  </div>
                                  <div className="mt-1 text-[11px] text-text-muted">
                                    Target: {getFeatureTargetLabel(feature)}
                                  </div>
                                </div>
                                <div className="flex flex-wrap justify-end gap-1">
                                  {conflicts.length > 0 && (
                                    <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
                                      {conflicts.some((conflict) => conflict.severity === 'error')
                                        ? 'Conflict'
                                        : 'Warning'}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {conflicts.length > 0 && (
                                <div className="mt-2 text-[11px] text-warning">{conflicts[0].message}</div>
                              )}
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="mt-0.5 shrink-0 rounded p-1 text-text-muted transition-colors hover:bg-accent/10 hover:text-text"
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label={`Actions for cut ${index + 1}`}
                                >
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleMoveFeature(feature.id, -1)}
                                  disabled={index === 0}
                                >
                                  Move Up
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleMoveFeature(feature.id, 1)}
                                  disabled={index === draftFeatures.length - 1}
                                >
                                  Move Down
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDuplicateFeature(feature)}>
                                  Duplicate
                                </DropdownMenuItem>
                                {getAvailableMirrorActions(feature).map((action) => (
                                  <DropdownMenuItem key={action} onClick={() => handleMirrorFeature(feature, action)}>
                                    {getMirrorActionLabel(action)}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleRemoveFeature(feature.id)}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>

                <div className="mt-auto flex flex-wrap gap-2">
                  <Button variant="outline" onClick={onExit}>
                    Back to Project
                  </Button>
                  <Button
                    onClick={onSave}
                    disabled={!hasUnsavedChanges || hasBlockingFeatureConflicts}
                    className="ml-auto"
                  >
                    Save Part
                  </Button>
                </div>
              </>
            )}

            {isChoosingCutType && (
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-semibold text-text">What kind of cut?</h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    Pick the cut type first. The next step will walk through the right target and measurements.
                  </p>
                </div>
                <div className="flex flex-col gap-4">
                  {(
                    [
                      { group: 'Ends & Edges', presets: ['end_cut', 'edge_bevel', 'tenon'] },
                      {
                        group: 'Channels & Laps',
                        presets: ['dado', 'stopped_dado', 'groove', 'stopped_groove', 'half_lap']
                      },
                      { group: 'Edges & Corners', presets: ['rabbet', 'edge_notch', 'corner_notch'] },
                      { group: 'Pockets & Openings', presets: ['mortise', 'cutout'] }
                    ] as Array<{ group: string; presets: OperationPreset[] }>
                  ).map(({ group, presets }) => (
                    <div key={group}>
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                        {group}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {presets.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            className="rounded-md border border-border bg-bg px-3 py-3 text-left transition-colors hover:border-accent hover:bg-accent/5"
                            onClick={() => handleStartPreset(preset)}
                          >
                            <div className="text-sm font-semibold text-text">{getOperationPresetLabel(preset)}</div>
                            <div className="mt-1 text-[11px] text-text-muted">{getOperationPresetHint(preset)}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isEditingDraft && (
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="rounded-md border border-border bg-bg-secondary p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <Label className="block">{getDraftStepTitle(inspectorDraft)}</Label>
                      <p className="mt-1 text-[11px] text-text-muted">{getDraftStepDescription(inspectorDraft)}</p>
                    </div>
                    <Badge variant="outline">{panelMode === 'edit' ? 'Editing' : 'New Cut'}</Badge>
                  </div>

                  {inspectorDraft.mode === 'end_cut' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {([...END_TARGETS, 'front_face', 'back_face'] as (typeof inspectorDraft.targetFace)[]).map(
                        (target) => (
                          <Button
                            key={target}
                            type="button"
                            size="xs"
                            variant="outline"
                            active={inspectorDraft.targetFace === target}
                            onClick={() => setDraft(normalizeEndCutDraft({ ...inspectorDraft, targetFace: target }))}
                          >
                            {target === 'front_face'
                              ? 'Front Edge'
                              : target === 'back_face'
                                ? 'Back Edge'
                                : FACE_LABELS[target]}
                          </Button>
                        )
                      )}
                    </div>
                  )}

                  {inspectorDraft.mode === 'rect_cut' && inspectorDraft.cutType === 'tenon' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {END_TARGETS.map((target) => (
                        <Button
                          key={target}
                          type="button"
                          size="xs"
                          variant="outline"
                          active={inspectorDraft.faceTarget === target}
                          onClick={() => updateRectDraft({ faceTarget: target })}
                        >
                          {FACE_LABELS[target]}
                        </Button>
                      ))}
                    </div>
                  )}

                  {inspectorDraft.mode === 'rect_cut' && inspectorDraft.cutType === 'corner_notch' && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {availableCornerTargets.map((target) => (
                        <Button
                          key={target}
                          type="button"
                          size="xs"
                          variant="outline"
                          active={inspectorDraft.cornerTarget === target}
                          onClick={() => updateRectDraft({ cornerTarget: target })}
                        >
                          {CORNER_LABELS[target]}
                        </Button>
                      ))}
                    </div>
                  )}

                  {inspectorDraft.mode === 'rect_cut' && inspectorDraft.cutType === 'edge_notch' && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {EDGE_NOTCH_SIDES.map((side) => (
                        <Button
                          key={side}
                          type="button"
                          size="xs"
                          variant="outline"
                          active={edgeTargetToSide(inspectorDraft.edgeTarget) === side}
                          onClick={() => updateRectDraft({ edgeTarget: edgeNotchSideToTarget(side) })}
                        >
                          {EDGE_NOTCH_SIDE_LABELS[side]}
                        </Button>
                      ))}
                    </div>
                  )}

                  {inspectorDraft.mode === 'rect_cut' && inspectorDraft.cutType === 'rabbet' && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {availableEdgeTargets.map((target) => (
                        <Button
                          key={target}
                          type="button"
                          size="xs"
                          variant="outline"
                          active={inspectorDraft.edgeTarget === target}
                          onClick={() => updateRectDraft({ edgeTarget: target })}
                        >
                          {EDGE_LABELS[target]}
                        </Button>
                      ))}
                    </div>
                  )}

                  {inspectorDraft.mode === 'rect_cut' &&
                    ['cutout', 'dado', 'stopped_dado', 'groove', 'stopped_groove', 'mortise'].includes(
                      inspectorDraft.cutType
                    ) && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {availableFaceTargets.map((target) => (
                          <Button
                            key={target}
                            type="button"
                            size="xs"
                            variant="outline"
                            active={inspectorDraft.faceTarget === target}
                            onClick={() => updateRectDraft({ faceTarget: target })}
                          >
                            {FACE_LABELS[target]}
                          </Button>
                        ))}
                      </div>
                    )}

                  <div className="mt-4 space-y-3">
                    <div>
                      <Label htmlFor="feature-label">Label (optional)</Label>
                      <Input
                        id="feature-label"
                        value={inspectorDraft.label}
                        onChange={(e) => setDraft({ ...inspectorDraft, label: e.target.value })}
                        placeholder="Face-frame left stile"
                      />
                    </div>

                    {inspectorDraft.mode === 'end_cut' && (
                      <>
                        {isEdgeBevelTarget(inspectorDraft.targetFace) ? (
                          <p className="text-[11px] text-text-muted">
                            Edge bevels tilt the whole long face across the thickness, so the cut style is always a
                            bevel. The board width stays locked to the long point.
                          </p>
                        ) : (
                          <div>
                            <Label htmlFor="end-cut-type">Cut Style</Label>
                            <Select
                              id="end-cut-type"
                              value={inspectorDraft.cutType}
                              onChange={(e) =>
                                setDraft({
                                  ...inspectorDraft,
                                  cutType: e.target.value as EndCutFeature['cutType']
                                })
                              }
                            >
                              <option value="mitre">Mitre</option>
                              <option value="bevel">Bevel</option>
                              <option value="compound">Compound</option>
                            </Select>
                          </div>
                        )}

                        {(inspectorDraft.cutType === 'mitre' || inspectorDraft.cutType === 'compound') && (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <Label htmlFor="horizontal-angle">Mitre Angle</Label>
                              <Input
                                id="horizontal-angle"
                                type="number"
                                value={inspectorDraft.horizontalAngle}
                                onChange={(e) => {
                                  const nextAngle = Number(e.target.value);
                                  setDraft({
                                    ...inspectorDraft,
                                    horizontalAngle: Math.abs(nextAngle),
                                    horizontalFlip: nextAngle < 0 ? true : inspectorDraft.horizontalFlip
                                  });
                                }}
                              />
                            </div>
                            <div>
                              <Label htmlFor="horizontal-flip">Long Point On</Label>
                              <Select
                                id="horizontal-flip"
                                value={inspectorDraft.horizontalFlip ? 'back' : 'front'}
                                onChange={(e) =>
                                  setDraft({
                                    ...inspectorDraft,
                                    horizontalFlip: e.target.value === 'back'
                                  })
                                }
                              >
                                <option value="front">Front</option>
                                <option value="back">Back</option>
                              </Select>
                            </div>
                          </div>
                        )}

                        {(inspectorDraft.cutType === 'bevel' || inspectorDraft.cutType === 'compound') && (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <Label htmlFor="vertical-angle">Bevel Angle</Label>
                              <Input
                                id="vertical-angle"
                                type="number"
                                value={inspectorDraft.verticalAngle}
                                onChange={(e) => {
                                  const nextAngle = Number(e.target.value);
                                  setDraft({
                                    ...inspectorDraft,
                                    verticalAngle: Math.abs(nextAngle),
                                    verticalFlip:
                                      nextAngle < 0 ? !inspectorDraft.verticalFlip : inspectorDraft.verticalFlip
                                  });
                                }}
                              />
                            </div>
                            <div>
                              <Label htmlFor="vertical-flip">High Point On</Label>
                              <Select
                                id="vertical-flip"
                                value={
                                  isEndCutHighPointOnTop(inspectorDraft.targetFace, inspectorDraft.verticalFlip)
                                    ? 'top'
                                    : 'bottom'
                                }
                                onChange={(e) =>
                                  setDraft({
                                    ...inspectorDraft,
                                    verticalFlip: getVerticalFlipFromHighPoint(
                                      inspectorDraft.targetFace,
                                      e.target.value as 'top' | 'bottom'
                                    )
                                  })
                                }
                              >
                                <option value="top">Top</option>
                                <option value="bottom">Bottom</option>
                              </Select>
                            </div>
                          </div>
                        )}

                        {edgeBevelPreviewMeasurements && (
                          <div className="rounded-md border border-border bg-bg p-3">
                            <p className="text-[12px] font-medium text-text">Resulting Widths</p>
                            <p className="mt-1 text-[11px] text-text-muted">
                              Long point stays locked to the board width. The bevel only tilts the shaped edge.
                            </p>
                            <div className="mt-2 grid grid-cols-1 gap-1 text-[11px] text-text-muted sm:grid-cols-3">
                              <span>Blank {formatMeasurementWithUnit(part.width, units)}</span>
                              <span>
                                Long Point {formatMeasurementWithUnit(edgeBevelPreviewMeasurements.longPoint, units)}
                              </span>
                              <span>
                                Short Point {formatMeasurementWithUnit(edgeBevelPreviewMeasurements.shortPoint, units)}
                              </span>
                            </div>
                          </div>
                        )}

                        {endCutPreviewMeasurements && (
                          <div className="rounded-md border border-border bg-bg p-3">
                            <p className="text-[12px] font-medium text-text">Resulting Lengths</p>
                            <p className="mt-1 text-[11px] text-text-muted">
                              {preservedEndCutReferenceNote ??
                                'Long point stays locked to the board length. The angle only changes the shaped end.'}
                            </p>
                            <div className="mt-2 grid grid-cols-1 gap-1 text-[11px] text-text-muted sm:grid-cols-3">
                              <span>Blank {formatMeasurementWithUnit(endCutPreviewMeasurements.blank, units)}</span>
                              <span>
                                Long Point {formatMeasurementWithUnit(endCutPreviewMeasurements.longPoint, units)}
                              </span>
                              <span>
                                Short Point {formatMeasurementWithUnit(endCutPreviewMeasurements.shortPoint, units)}
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {inspectorDraft.mode === 'rect_cut' && (
                      <>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {inspectorUsesBlindOnlyDepth ? (
                            <div>
                              <Label>Depth</Label>
                              <div className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text">
                                Blind only
                                <p className="mt-1 text-[11px] text-text-muted">
                                  This operation cuts from one face into the blank and does not pass through.
                                </p>
                              </div>
                            </div>
                          ) : !inspectorHidesDepthSelector ? (
                            <div>
                              <Label htmlFor="depth-mode">Depth</Label>
                              <Select
                                id="depth-mode"
                                value={inspectorDraft.depthMode}
                                onChange={(e) =>
                                  updateRectDraft({
                                    depthMode: e.target.value as RectCutFeature['parameters']['depthMode']
                                  })
                                }
                              >
                                <option value="through">Through</option>
                                <option value="blind">Blind</option>
                              </Select>
                            </div>
                          ) : null}
                        </div>

                        {inspectorDraft.cutType === 'cutout' && (
                          <p className="text-[11px] text-text-muted">Face cutouts target the top or bottom face.</p>
                        )}
                        {inspectorDraft.cutType === 'dado' && (
                          <p className="text-[11px] text-text-muted">
                            Dado spans the full board width. Set the channel width along the blank and the blind depth.
                          </p>
                        )}
                        {inspectorDraft.cutType === 'stopped_dado' && (
                          <p className="text-[11px] text-text-muted">
                            Stopped dado spans full board width, but the run is limited along the blank. Set run length,
                            start offset, and blind depth.
                          </p>
                        )}
                        {inspectorDraft.cutType === 'rabbet' && (
                          <p className="text-[11px] text-text-muted">
                            Rabbet runs the full edge length. Set the shoulder width and blind depth.
                          </p>
                        )}
                        {inspectorDraft.cutType === 'groove' && (
                          <p className="text-[11px] text-text-muted">
                            Groove runs the full board length. Set the groove width across the board and the blind
                            depth.
                          </p>
                        )}
                        {inspectorDraft.cutType === 'stopped_groove' && (
                          <p className="text-[11px] text-text-muted">
                            Stopped groove uses a limited run and explicit placement. Set run length, groove width,
                            offsets, and blind depth.
                          </p>
                        )}
                        {inspectorDraft.cutType === 'mortise' && (
                          <p className="text-[11px] text-text-muted">
                            Mortise is a blind face pocket. Set pocket size, placement, and blind depth.
                          </p>
                        )}
                        {inspectorDraft.cutType === 'tenon' && (
                          <p className="text-[11px] text-text-muted">
                            Tenon leaves a tongue on the end, centred in the board thickness. Size it to the mortise it
                            fits — the board length already includes the tenon, so no extra allowance is needed.
                          </p>
                        )}

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <Label>
                              {inspectorDraft.cutType === 'tenon'
                                ? 'Tenon Length'
                                : inspectorDraft.cutType === 'rabbet'
                                  ? 'Shoulder Width'
                                  : inspectorDraft.cutType === 'stopped_dado'
                                    ? 'Run Along Blank'
                                    : inspectorDraft.cutType === 'groove'
                                      ? 'Full Board Run'
                                      : 'Run Along Blank'}
                            </Label>
                            <FractionInput
                              value={
                                inspectorDraft.cutType === 'rabbet'
                                  ? (rabbetShoulderValue ?? 0.5)
                                  : inspectorDraft.cutType === 'stopped_dado'
                                    ? inspectorDraft.sizeLength
                                    : inspectorDraft.cutType === 'groove'
                                      ? part.length
                                      : inspectorDraft.sizeLength
                              }
                              onChange={(value) =>
                                updateRectDraft(
                                  inspectorDraft.cutType === 'rabbet'
                                    ? {
                                        ...inspectorDraft,
                                        sizeLength: rabbetRunsAlongLength ? inspectorDraft.sizeLength : value,
                                        sizeWidth: rabbetRunsAlongLength ? value : inspectorDraft.sizeWidth
                                      }
                                    : inspectorDraft.cutType === 'stopped_dado'
                                      ? { ...inspectorDraft, sizeLength: value }
                                      : inspectorDraft.cutType === 'groove'
                                        ? { ...inspectorDraft, sizeLength: part.length }
                                        : { ...inspectorDraft, sizeLength: value }
                                )
                              }
                              min={0.125}
                              disabled={inspectorDraft.cutType === 'groove'}
                            />
                            {inspectorDraft.cutType === 'groove' && (
                              <p className="mt-1 text-[11px] text-text-muted">
                                Grooves always run the full board length, so the run matches the blank.
                              </p>
                            )}
                          </div>
                          <div>
                            <Label>
                              {inspectorDraft.cutType === 'tenon'
                                ? 'Tenon Width'
                                : inspectorDraft.faceTarget === 'front_face' ||
                                    inspectorDraft.faceTarget === 'back_face'
                                  ? 'Height Across Thickness'
                                  : inspectorDraft.cutType === 'dado'
                                    ? 'Across Board Width'
                                    : inspectorDraft.cutType === 'stopped_dado'
                                      ? 'Across Board Width'
                                      : inspectorDraft.cutType === 'rabbet'
                                        ? 'Full Edge Run'
                                        : inspectorDraft.cutType === 'groove'
                                          ? 'Groove Width'
                                          : 'Cross-Cut Width'}
                            </Label>
                            {inspectorUsesDerivedCrossWidth ? (
                              <div className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text">
                                {formatMeasurementWithUnit(
                                  inspectorDraft.cutType === 'rabbet'
                                    ? rabbetRunsAlongLength
                                      ? part.length
                                      : part.width
                                    : part.width,
                                  units
                                )}
                              </div>
                            ) : (
                              <FractionInput
                                value={inspectorDraft.sizeWidth}
                                onChange={(value) => updateRectDraft({ sizeWidth: value })}
                                min={0.125}
                              />
                            )}
                            {['dado', 'stopped_dado', 'rabbet', 'groove'].includes(inspectorDraft.cutType) && (
                              <p className="mt-1 text-[11px] text-text-muted">
                                {inspectorDraft.cutType === 'dado'
                                  ? 'Derived from blank width.'
                                  : inspectorDraft.cutType === 'stopped_dado'
                                    ? 'Derived from blank width.'
                                    : inspectorDraft.cutType === 'rabbet'
                                      ? 'Runs the full edge length.'
                                      : 'Derived from blank length.'}
                              </p>
                            )}
                          </div>
                        </div>

                        {inspectorDraft.depthMode === 'blind' && (
                          <div>
                            <Label>
                              {inspectorDraft.cutType === 'tenon'
                                ? 'Tenon Thickness'
                                : inspectorDraft.faceTarget === 'front_face' ||
                                    inspectorDraft.faceTarget === 'back_face'
                                  ? 'Depth Into Width'
                                  : 'Blind Depth'}
                            </Label>
                            <FractionInput
                              value={inspectorDraft.depth}
                              onChange={(value) => updateRectDraft({ depth: value })}
                              min={0.125}
                            />
                          </div>
                        )}

                        {inspectorDraft.cutType === 'edge_notch' && (
                          <div>
                            <Label>
                              {edgeTargetToSide(inspectorDraft.edgeTarget) === 'front' ||
                              edgeTargetToSide(inspectorDraft.edgeTarget) === 'back'
                                ? 'Offset Along Length'
                                : 'Offset Across Width'}
                            </Label>
                            <FractionInput
                              value={
                                edgeTargetToSide(inspectorDraft.edgeTarget) === 'front' ||
                                edgeTargetToSide(inspectorDraft.edgeTarget) === 'back'
                                  ? inspectorDraft.placementX
                                  : inspectorDraft.placementZ
                              }
                              onChange={(value) => {
                                const side = edgeTargetToSide(inspectorDraft.edgeTarget);
                                updateRectDraft(
                                  side === 'front' || side === 'back'
                                    ? { placementX: value, placementZ: 0 }
                                    : { placementX: 0, placementZ: value }
                                );
                              }}
                              min={0}
                            />
                          </div>
                        )}

                        {inspectorDraft.cutType !== 'corner_notch' &&
                          inspectorDraft.cutType !== 'edge_notch' &&
                          inspectorDraft.cutType !== 'dado' &&
                          inspectorDraft.cutType !== 'rabbet' &&
                          inspectorDraft.cutType !== 'groove' && (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              {inspectorDraft.cutType !== 'tenon' && (
                                <div>
                                  <Label>Offset Along Length</Label>
                                  <FractionInput
                                    value={inspectorDraft.placementX}
                                    onChange={(value) => updateRectDraft({ placementX: value })}
                                    min={0}
                                  />
                                </div>
                              )}
                              <div>
                                <Label>
                                  {inspectorDraft.cutType === 'tenon'
                                    ? 'Shoulder Offset Across Width'
                                    : inspectorDraft.faceTarget === 'front_face' ||
                                        inspectorDraft.faceTarget === 'back_face'
                                      ? 'Offset Up From Bottom'
                                      : 'Offset Across Width'}
                                </Label>
                                <FractionInput
                                  value={inspectorDraft.placementZ}
                                  onChange={(value) => updateRectDraft({ placementZ: value })}
                                  min={0}
                                  disabled={inspectorDraft.cutType === 'stopped_dado'}
                                />
                                {inspectorDraft.cutType === 'stopped_dado' && (
                                  <p className="mt-1 text-[11px] text-text-muted">
                                    Stopped dados span the full board width, so this offset stays fixed.
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                        {inspectorDraft.depthMode === 'blind' &&
                          (inspectorDraft.cutType === 'corner_notch' ||
                            inspectorDraft.cutType === 'edge_notch' ||
                            inspectorDraft.cutType === 'rabbet' ||
                            inspectorDraft.cutType === 'groove' ||
                            inspectorDraft.cutType === 'stopped_dado' ||
                            inspectorDraft.cutType === 'stopped_groove' ||
                            inspectorDraft.cutType === 'mortise') && (
                            <p className="text-[11px] text-text-muted">
                              {inspectorDraft.faceTarget === 'front_face' || inspectorDraft.faceTarget === 'back_face'
                                ? 'Side-face pockets recess into the board width from the face you picked.'
                                : 'Blind previews use top or bottom targets so the recess direction stays clear.'}
                            </p>
                          )}

                        {draftValidationMessage && (
                          <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-[11px] text-danger">
                            {draftValidationMessage}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={handleSaveDraft} disabled={!!draftValidationMessage}>
                    Save Cut
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={handleCancelEditor}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
