import { FractionInput } from '@renderer/components/common/FractionInput';
import {
  applyTargetToFeatureDraft,
  buildDraftFromFeature,
  buildDraftFromPreset,
  buildFeatureFromDraft,
  CORNER_TARGETS,
  duplicateFeature,
  EDGE_TARGETS,
  END_TARGETS,
  FACE_TARGETS,
  FeatureDraft,
  getFeatureDraftTarget,
  OperationPreset
} from '@renderer/components/part-features/partFeatureEditorState';
import { PartCutsPreviewCanvas } from '@renderer/components/part-cuts/PartCutsPreviewCanvas';
import { Badge } from '@renderer/components/ui/badge';
import { Button } from '@renderer/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Checkbox } from '@renderer/components/ui/checkbox';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { Select } from '@renderer/components/ui/select';
import { EndCutFeature, Part, PartFeature, PartFeatureTarget, RectCutFeature } from '@renderer/types';
import { getDerivedLengthMeasurements } from '@renderer/utils/endCutUtils';
import { getAvailableMirrorActions, getMirrorActionLabel, mirrorFeature } from '@renderer/utils/partFeatureActions';
import { getPartFeatureConflicts } from '@renderer/utils/partFeatureConflicts';
import { getPickableTargetLabel, isTargetValidForDraft, partFeatureTargetEquals } from '@renderer/utils/partCutPicking';
import { formatMeasurementWithUnit } from '@renderer/utils/fractions';
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
import { useEffect, useMemo, useState } from 'react';

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
  if (draft.cutType === 'edge_notch' || draft.cutType === 'rabbet') return EDGE_LABELS[draft.edgeTarget];
  return FACE_LABELS[draft.faceTarget];
}

function getOperationPresetLabel(preset: OperationPreset): string {
  switch (preset) {
    case 'end_cut':
      return 'End Cut';
    case 'corner_notch':
      return 'Corner Notch';
    case 'edge_notch':
      return 'Edge Notch';
    case 'cutout':
      return 'Cutout';
    case 'dado':
      return 'Dado';
    case 'stopped_dado':
      return 'Stopped Dado';
    case 'rabbet':
      return 'Rabbet';
    case 'groove':
      return 'Groove';
    case 'stopped_groove':
      return 'Stopped Groove';
    case 'mortise':
      return 'Mortise';
  }
}

function getOperationPresetHint(preset: OperationPreset): string {
  switch (preset) {
    case 'end_cut':
      return 'Mitres, bevels, and compound cuts on either end.';
    case 'corner_notch':
      return 'Remove a rectangular chunk from one exact corner.';
    case 'edge_notch':
      return 'Notch into a specific edge while keeping the blank rectangular.';
    case 'cutout':
      return 'Place a rectangular pocket or opening on one face.';
    case 'dado':
      return 'Cut a full-width channel across the top or bottom face.';
    case 'stopped_dado':
      return 'Cut a blind channel across the board width with a limited run along the blank.';
    case 'rabbet':
      return 'Cut a full-run edge recess along one supported edge.';
    case 'groove':
      return 'Cut a full-length face groove with blind depth.';
    case 'stopped_groove':
      return 'Cut a blind face groove with a limited run and explicit placement.';
    case 'mortise':
      return 'Cut a blind face pocket for joinery layout.';
  }
}

function getDraftStepTitle(draft: FeatureDraft): string {
  if (draft.mode === 'end_cut') return 'Step 2: Pick the end and set the angle';

  switch (draft.cutType) {
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
    if (!draft || draft.mode !== 'rect_cut' || !['edge_notch', 'rabbet'].includes(draft.cutType)) return EDGE_TARGETS;
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
    return TOP_BOTTOM_FACE_TARGETS;
  }, [draft]);

  const draftValidationMessage = useMemo(() => {
    if (!draft || draft.mode !== 'rect_cut') return null;
    return validateRectCutFeature(buildFeatureFromDraft(draft), part);
  }, [draft, part]);

  const endCutPreviewMeasurements = useMemo(() => {
    if (!draftPreviewFeature || draftPreviewFeature.kind !== 'end_cut') return null;

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

    const nextFeature = buildFeatureFromDraft(draft);
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
    const mirrored = mirrorFeature(feature, action);
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

  const inspectorDraft = panelMode === 'list' ? null : draft;
  const isChoosingCutType = panelMode === 'add' && !draft;
  const isEditingDraft = !!inspectorDraft;
  const editingFeatureIndex = inspectorDraft?.featureId
    ? draftFeatures.findIndex((feature) => feature.id === inspectorDraft.featureId)
    : -1;

  useEffect(() => {
    const nextTarget = inspectorDraft ? getFeatureDraftTarget(inspectorDraft) : null;
    if (!partFeatureTargetEquals(nextTarget, pendingTarget)) {
      onPendingTargetChange(nextTarget);
    }
  }, [inspectorDraft, onPendingTargetChange, pendingTarget]);

  const handlePreviewTargetActivation = (target: PartFeatureTarget | null) => {
    onPendingTargetChange(target);
    if (!target || !inspectorDraft || !isTargetValidForDraft(target, inspectorDraft)) return;
    setDraft(applyTargetToFeatureDraft(inspectorDraft, target));
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

  return (
    <div className="app-main flex min-h-0 flex-1 bg-bg">
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
                onDraftChange={setDraft}
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
                <Button onClick={handleBeginAdd}>+ Add Cut</Button>
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
                      {hasUnsavedChanges ? 'Unsaved part changes' : 'Saved to part draft'}
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
                          <button
                            key={feature.id}
                            type="button"
                            className="w-full rounded-md border border-border bg-bg px-3 py-3 text-left transition-colors hover:border-accent hover:bg-accent/5"
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
                                {!feature.enabled && (
                                  <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                                    Disabled
                                  </Badge>
                                )}
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
                <div className="rounded-md border border-border bg-bg-secondary px-3 py-3 text-sm text-text-secondary">
                  Different cuts use different workflows. End cuts focus on the part ends and angles. Notches, cutouts,
                  and joinery start by picking the face, edge, or corner they belong on.
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      'end_cut',
                      'corner_notch',
                      'edge_notch',
                      'cutout',
                      'dado',
                      'stopped_dado',
                      'rabbet',
                      'groove',
                      'stopped_groove',
                      'mortise'
                    ] as OperationPreset[]
                  ).map((preset) => (
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
                      {END_TARGETS.map((target) => (
                        <Button
                          key={target}
                          type="button"
                          size="xs"
                          variant="outline"
                          active={inspectorDraft.targetFace === target}
                          onClick={() => setDraft({ ...inspectorDraft, targetFace: target })}
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
                          onClick={() => setDraft({ ...inspectorDraft, cornerTarget: target })}
                        >
                          {CORNER_LABELS[target]}
                        </Button>
                      ))}
                    </div>
                  )}

                  {inspectorDraft.mode === 'rect_cut' &&
                    (inspectorDraft.cutType === 'edge_notch' || inspectorDraft.cutType === 'rabbet') && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {availableEdgeTargets.map((target) => (
                          <Button
                            key={target}
                            type="button"
                            size="xs"
                            variant="outline"
                            active={inspectorDraft.edgeTarget === target}
                            onClick={() => setDraft({ ...inspectorDraft, edgeTarget: target })}
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
                            onClick={() => setDraft({ ...inspectorDraft, faceTarget: target })}
                          >
                            {FACE_LABELS[target]}
                          </Button>
                        ))}
                      </div>
                    )}

                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="feature-label">Label (optional)</Label>
                        <Input
                          id="feature-label"
                          value={inspectorDraft.label}
                          onChange={(e) => setDraft({ ...inspectorDraft, label: e.target.value })}
                          placeholder="Face-frame left stile"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <label className="flex items-center gap-2 text-[12px] text-text">
                          <Checkbox
                            checked={inspectorDraft.enabled}
                            onChange={(e) => setDraft({ ...inspectorDraft, enabled: e.target.checked })}
                          />
                          Enable this operation
                        </label>
                      </div>
                    </div>

                    {inspectorDraft.mode === 'end_cut' && (
                      <>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                              <option value="square">Square</option>
                              <option value="mitre">Mitre</option>
                              <option value="bevel">Bevel</option>
                              <option value="compound">Compound</option>
                            </Select>
                          </div>
                          <div className="rounded-md border border-border bg-bg p-3 text-[12px] text-text-secondary">
                            The board length stays fixed at{' '}
                            <span className="font-medium text-text">
                              {formatMeasurementWithUnit(part.length, units)}
                            </span>
                            . This cut only shapes the selected end.
                          </div>
                        </div>

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
                          <div>
                            <Label htmlFor="vertical-angle">Bevel Angle</Label>
                            <Input
                              id="vertical-angle"
                              type="number"
                              value={inspectorDraft.verticalAngle}
                              onChange={(e) => setDraft({ ...inspectorDraft, verticalAngle: Number(e.target.value) })}
                            />
                          </div>
                        )}

                        {endCutPreviewMeasurements && (
                          <div className="rounded-md border border-border bg-bg p-3">
                            <p className="text-[12px] font-medium text-text">Resulting Lengths</p>
                            <p className="mt-1 text-[11px] text-text-muted">
                              Long point stays locked to the board length. The angle only changes the shaped end.
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
                          <div>
                            <Label htmlFor="rect-cut-type">Removal Type</Label>
                            <Select
                              id="rect-cut-type"
                              value={inspectorDraft.cutType}
                              onChange={(e) =>
                                setDraft({
                                  ...inspectorDraft,
                                  cutType: e.target.value as RectCutFeature['cutType']
                                })
                              }
                            >
                              <option value="corner_notch">Corner Notch</option>
                              <option value="edge_notch">Edge Notch</option>
                              <option value="cutout">Cutout</option>
                              <option value="dado">Dado</option>
                              <option value="stopped_dado">Stopped Dado</option>
                              <option value="rabbet">Rabbet</option>
                              <option value="groove">Groove</option>
                              <option value="stopped_groove">Stopped Groove</option>
                              <option value="mortise">Mortise</option>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="depth-mode">Depth</Label>
                            <Select
                              id="depth-mode"
                              value={inspectorDraft.depthMode}
                              disabled={
                                inspectorDraft.cutType === 'dado' ||
                                inspectorDraft.cutType === 'stopped_dado' ||
                                inspectorDraft.cutType === 'rabbet' ||
                                inspectorDraft.cutType === 'groove' ||
                                inspectorDraft.cutType === 'stopped_groove' ||
                                inspectorDraft.cutType === 'mortise'
                              }
                              onChange={(e) =>
                                setDraft({
                                  ...inspectorDraft,
                                  depthMode: e.target.value as RectCutFeature['parameters']['depthMode']
                                })
                              }
                            >
                              <option value="through">Through</option>
                              <option value="blind">Blind</option>
                            </Select>
                          </div>
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

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <Label>
                              {inspectorDraft.cutType === 'rabbet'
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
                                setDraft(
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
                          </div>
                          <div>
                            <Label>
                              {inspectorDraft.cutType === 'dado'
                                ? 'Across Board Width'
                                : inspectorDraft.cutType === 'stopped_dado'
                                  ? 'Across Board Width'
                                  : inspectorDraft.cutType === 'rabbet'
                                    ? 'Full Edge Run'
                                    : inspectorDraft.cutType === 'groove'
                                      ? 'Groove Width'
                                      : 'Cross-Cut Width'}
                            </Label>
                            <FractionInput
                              value={
                                inspectorDraft.cutType === 'dado'
                                  ? part.width
                                  : inspectorDraft.cutType === 'stopped_dado'
                                    ? part.width
                                    : inspectorDraft.cutType === 'rabbet'
                                      ? rabbetRunsAlongLength
                                        ? part.length
                                        : part.width
                                      : inspectorDraft.cutType === 'groove'
                                        ? inspectorDraft.sizeWidth
                                        : inspectorDraft.sizeWidth
                              }
                              onChange={(value) => setDraft({ ...inspectorDraft, sizeWidth: value })}
                              min={0.125}
                              disabled={
                                inspectorDraft.cutType === 'dado' ||
                                inspectorDraft.cutType === 'stopped_dado' ||
                                inspectorDraft.cutType === 'rabbet'
                              }
                            />
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
                            <Label>Blind Depth</Label>
                            <FractionInput
                              value={inspectorDraft.depth}
                              onChange={(value) => setDraft({ ...inspectorDraft, depth: value })}
                              min={0.125}
                            />
                          </div>
                        )}

                        {inspectorDraft.cutType !== 'corner_notch' &&
                          inspectorDraft.cutType !== 'dado' &&
                          inspectorDraft.cutType !== 'rabbet' &&
                          inspectorDraft.cutType !== 'groove' && (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div>
                                <Label>Offset Along Length</Label>
                                <FractionInput
                                  value={inspectorDraft.placementX}
                                  onChange={(value) => setDraft({ ...inspectorDraft, placementX: value })}
                                  min={0}
                                />
                              </div>
                              <div>
                                <Label>Offset Across Width</Label>
                                <FractionInput
                                  value={inspectorDraft.placementZ}
                                  onChange={(value) => setDraft({ ...inspectorDraft, placementZ: value })}
                                  min={0}
                                  disabled={inspectorDraft.cutType === 'stopped_dado'}
                                />
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
                              Blind previews use top or bottom targets so the recess direction stays clear.
                            </p>
                          )}

                        {draftValidationMessage && (
                          <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-[11px] text-danger">
                            {draftValidationMessage}
                          </div>
                        )}

                        {inspectorDraft.featureId && (
                          <div className="rounded-md border border-border bg-bg p-3">
                            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                              Cut Actions
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                onClick={() => handleMoveFeature(inspectorDraft.featureId!, -1)}
                                disabled={editingFeatureIndex <= 0}
                              >
                                Move Up
                              </Button>
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                onClick={() => handleMoveFeature(inspectorDraft.featureId!, 1)}
                                disabled={editingFeatureIndex < 0 || editingFeatureIndex >= draftFeatures.length - 1}
                              >
                                Move Down
                              </Button>
                              <Button
                                type="button"
                                size="xs"
                                variant="ghost"
                                onClick={() => handleDuplicateFeature(buildFeatureFromDraft(inspectorDraft))}
                              >
                                Duplicate
                              </Button>
                              {getAvailableMirrorActions(buildFeatureFromDraft(inspectorDraft)).map((action) => (
                                <Button
                                  key={action}
                                  type="button"
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => handleMirrorFeature(buildFeatureFromDraft(inspectorDraft), action)}
                                >
                                  {getMirrorActionLabel(action)}
                                </Button>
                              ))}
                              <Button
                                type="button"
                                size="xs"
                                variant="destructiveGhost"
                                onClick={() => handleRemoveFeature(inspectorDraft.featureId!)}
                              >
                                Delete Cut
                              </Button>
                            </div>
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
