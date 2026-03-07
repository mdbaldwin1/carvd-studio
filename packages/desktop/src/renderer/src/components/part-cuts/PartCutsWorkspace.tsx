import { FractionInput } from '@renderer/components/common/FractionInput';
import {
  buildDraftFromFeature,
  buildDraftFromPreset,
  buildFeatureFromDraft,
  CORNER_TARGETS,
  duplicateFeature,
  EDGE_TARGETS,
  END_TARGETS,
  FACE_TARGETS,
  FeatureDraft,
  getPresetHint,
  getPresetLabel,
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
import { EndCutFeature, Part, PartFeature, RectCutFeature } from '@renderer/types';
import { getDerivedLengthMeasurements, getLengthReferenceValue } from '@renderer/utils/endCutUtils';
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
  onSelectFeature: (featureId: string | null) => void;
  onDraftFeaturesChange: (features: PartFeature[]) => void;
  onExit: () => void;
  onSave: () => void;
  hasUnsavedChanges: boolean;
}

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

export function PartCutsWorkspace({
  part,
  draftFeatures,
  units,
  selectedFeatureId,
  onSelectFeature,
  onDraftFeaturesChange,
  onExit,
  onSave,
  hasUnsavedChanges
}: PartCutsWorkspaceProps) {
  const [draft, setDraft] = useState<FeatureDraft | null>(null);

  useEffect(() => {
    setDraft(null);
  }, [part.id]);

  const selectedFeature = useMemo(
    () => draftFeatures.find((feature) => feature.id === selectedFeatureId) ?? null,
    [draftFeatures, selectedFeatureId]
  );

  const activePreset = useMemo<OperationPreset | null>(() => {
    if (!draft) return null;
    if (draft.mode === 'end_cut') return 'end_cut';
    return draft.cutType;
  }, [draft]);

  const draftPreviewFeature = useMemo(() => {
    if (!draft || draft.mode !== 'end_cut') return null;
    return buildFeatureFromDraft(draft);
  }, [draft]);

  const availableCornerTargets = useMemo(() => {
    if (!draft || draft.mode !== 'rect_cut' || draft.cutType !== 'corner_notch') return CORNER_TARGETS;
    return draft.depthMode === 'blind' ? TOP_BOTTOM_CORNER_TARGETS : CORNER_TARGETS;
  }, [draft]);

  const availableEdgeTargets = useMemo(() => {
    if (!draft || draft.mode !== 'rect_cut' || draft.cutType !== 'edge_notch') return EDGE_TARGETS;
    return draft.depthMode === 'blind' ? TOP_BOTTOM_EDGE_TARGETS : EDGE_TARGETS;
  }, [draft]);

  const availableFaceTargets = useMemo(() => {
    if (!draft || draft.mode !== 'rect_cut' || draft.cutType !== 'cutout') return FACE_TARGETS;
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

    return {
      ...measurements,
      controllingValue: getLengthReferenceValue(measurements, draftPreviewFeature.lengthMode),
      lengthMode: draftPreviewFeature.lengthMode
    };
  }, [draft, draftFeatures, draftPreviewFeature, part.length, part.thickness, part.width]);

  const handleStartPreset = (preset: OperationPreset) => {
    setDraft(buildDraftFromPreset(preset));
    onSelectFeature(null);
  };

  const handleEditFeature = (feature: PartFeature) => {
    setDraft(buildDraftFromFeature(feature));
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
  };

  const handleRemoveFeature = (featureId: string) => {
    onDraftFeaturesChange(draftFeatures.filter((feature) => feature.id !== featureId));
    if (draft?.featureId === featureId) {
      setDraft(null);
    }
    if (selectedFeatureId === featureId) {
      onSelectFeature(null);
    }
  };

  const handleDuplicateFeature = (feature: PartFeature) => {
    const duplicate = duplicateFeature(feature);
    onDraftFeaturesChange([...draftFeatures, duplicate]);
    onSelectFeature(duplicate.id);
    setDraft(buildDraftFromFeature(duplicate));
  };

  const handleMoveFeature = (featureId: string, direction: -1 | 1) => {
    const fromIndex = draftFeatures.findIndex((feature) => feature.id === featureId);
    if (fromIndex < 0) return;
    const nextFeatures = reorderFeatures(draftFeatures, fromIndex, fromIndex + direction);
    onDraftFeaturesChange(nextFeatures);
  };

  const inspectorDraft = draft ?? (selectedFeature ? buildDraftFromFeature(selectedFeature) : null);

  useEffect(() => {
    if (!draft && selectedFeature) {
      setDraft(buildDraftFromFeature(selectedFeature));
    }
  }, [draft, selectedFeature]);

  return (
    <div className="app-main flex min-h-0 flex-1 bg-bg">
      <div className="flex min-h-0 flex-1 gap-4 p-4">
        <Card className="flex min-h-0 w-[340px] flex-col">
          <CardHeader className="pb-4">
            <CardTitle>Operations</CardTitle>
            <CardDescription>
              Build and order the cut stack for <span className="font-medium text-text">{part.name}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm text-text-secondary">
              <div className="font-medium text-text">Blank Size</div>
              <div>{getBlankSizeLabel(part, units)}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(['end_cut', 'corner_notch', 'edge_notch', 'cutout'] as OperationPreset[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`rounded-md border px-3 py-2 text-left transition-colors ${
                    activePreset === preset
                      ? 'border-accent bg-accent/10 text-text'
                      : 'border-border bg-bg-secondary hover:bg-bg-tertiary'
                  }`}
                  onClick={() => handleStartPreset(preset)}
                >
                  <div className="text-[12px] font-semibold">{getPresetLabel(preset)}</div>
                  <div className="mt-1 text-[11px] text-text-muted">{getPresetHint(preset)}</div>
                </button>
              ))}
            </div>

            <ScrollArea className="min-h-0 flex-1 rounded-md border border-border bg-bg-secondary">
              <div className="space-y-2 p-3">
                {draftFeatures.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-text-muted">
                    No cuts authored yet. Add an operation, pick the target, then save the stack back to the part.
                  </div>
                ) : (
                  draftFeatures.map((feature, index) => {
                    const isSelected = selectedFeatureId === feature.id;
                    return (
                      <div
                        key={feature.id}
                        className={`rounded-md border px-3 py-3 ${
                          isSelected ? 'border-accent bg-accent/5' : 'border-border bg-bg'
                        }`}
                      >
                        <button type="button" className="w-full text-left" onClick={() => handleEditFeature(feature)}>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <div className="text-sm font-medium text-text">
                              {index + 1}. {feature.label?.trim() || getFeatureTargetLabel(feature)}
                            </div>
                            {!feature.enabled && (
                              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                                Disabled
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs leading-relaxed text-text-secondary">
                            {getFeatureSummary(feature, units)}
                          </div>
                        </button>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            onClick={() => handleMoveFeature(feature.id, -1)}
                            disabled={index === 0}
                          >
                            Move Up
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            onClick={() => handleMoveFeature(feature.id, 1)}
                            disabled={index === draftFeatures.length - 1}
                          >
                            Move Down
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            variant="ghost"
                            onClick={() => handleDuplicateFeature(feature)}
                          >
                            Duplicate
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            variant="destructiveGhost"
                            onClick={() => handleRemoveFeature(feature.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-1 flex-col">
          <CardHeader className="pb-4">
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Dedicated 3D part preview and target selection land in `carvd-studio-13.4`.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-[320px] flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-gradient-to-br from-bg-secondary to-bg px-6 py-8 text-center">
              <div className="max-w-md space-y-3">
                <div className="text-lg font-semibold text-text">{part.name}</div>
                <div className="text-sm text-text-secondary">
                  This editor is now the primary surface for authoring and ordering part operations. The next bead adds
                  target highlighting and in-workspace spatial selection.
                </div>
                <div className="text-xs text-text-muted">Blank size: {getBlankSizeLabel(part, units)}</div>
                {draftFeatures.length > 0 && (
                  <div className="text-xs text-text-muted">
                    Current stack:{' '}
                    {draftFeatures
                      .map((feature, index) => `${index + 1}. ${getFeatureTargetLabel(feature)}`)
                      .join(' · ')}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex min-h-0 w-[360px] flex-col">
          <CardHeader className="pb-4">
            <CardTitle>Inspector</CardTitle>
            <CardDescription>
              Edit the selected operation here. The project editor no longer needs to be the primary authoring surface.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
            {!inspectorDraft ? (
              <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-text-muted">
                Select an operation or start a new one from the left rail.
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="rounded-md border border-border bg-bg-secondary p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <Label className="block">Target</Label>
                      <p className="mt-1 text-[11px] text-text-muted">
                        Choose the exact end, edge, face, or corner before entering measurements.
                      </p>
                    </div>
                    <Badge variant="outline">{inspectorDraft.featureId ? 'Editing' : 'New'}</Badge>
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

                  {inspectorDraft.mode === 'rect_cut' && inspectorDraft.cutType === 'edge_notch' && (
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

                  {inspectorDraft.mode === 'rect_cut' && inspectorDraft.cutType === 'cutout' && (
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
                          <div>
                            <Label htmlFor="length-mode">Reference</Label>
                            <Select
                              id="length-mode"
                              value={inspectorDraft.lengthMode}
                              onChange={(e) =>
                                setDraft({
                                  ...inspectorDraft,
                                  lengthMode: e.target.value as EndCutFeature['lengthMode']
                                })
                              }
                            >
                              <option value="long_point">Long Point</option>
                              <option value="short_point">Short Point</option>
                              <option value="centerline">Centerline</option>
                            </Select>
                          </div>
                        </div>

                        {(inspectorDraft.cutType === 'mitre' || inspectorDraft.cutType === 'compound') && (
                          <div>
                            <Label htmlFor="horizontal-angle">Mitre Angle</Label>
                            <Input
                              id="horizontal-angle"
                              type="number"
                              value={inspectorDraft.horizontalAngle}
                              onChange={(e) => setDraft({ ...inspectorDraft, horizontalAngle: Number(e.target.value) })}
                            />
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
                            <p className="text-[12px] font-medium text-text">
                              Derived Lengths ({endCutPreviewMeasurements.lengthMode.replace('_', ' ')})
                            </p>
                            <p className="mt-1 text-[11px] text-text-muted">
                              Control value:{' '}
                              {formatMeasurementWithUnit(endCutPreviewMeasurements.controllingValue, units)} from the
                              selected reference.
                            </p>
                            <div className="mt-2 grid grid-cols-1 gap-1 text-[11px] text-text-muted sm:grid-cols-3">
                              <span>
                                Long Point {formatMeasurementWithUnit(endCutPreviewMeasurements.longPoint, units)}
                              </span>
                              <span>
                                Short Point {formatMeasurementWithUnit(endCutPreviewMeasurements.shortPoint, units)}
                              </span>
                              <span>
                                Centerline {formatMeasurementWithUnit(endCutPreviewMeasurements.centerline, units)}
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
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="depth-mode">Depth</Label>
                            <Select
                              id="depth-mode"
                              value={inspectorDraft.depthMode}
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
                          <p className="text-[11px] text-text-muted">
                            POC note: face cutout previews currently target top or bottom faces only.
                          </p>
                        )}

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <Label>Run Along Blank</Label>
                            <FractionInput
                              value={inspectorDraft.sizeLength}
                              onChange={(value) => setDraft({ ...inspectorDraft, sizeLength: value })}
                              min={0.125}
                            />
                          </div>
                          <div>
                            <Label>Cross-Cut Width</Label>
                            <FractionInput
                              value={inspectorDraft.sizeWidth}
                              onChange={(value) => setDraft({ ...inspectorDraft, sizeWidth: value })}
                              min={0.125}
                            />
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

                        {inspectorDraft.cutType !== 'corner_notch' && (
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
                              />
                            </div>
                          </div>
                        )}

                        {inspectorDraft.depthMode === 'blind' &&
                          (inspectorDraft.cutType === 'corner_notch' || inspectorDraft.cutType === 'edge_notch') && (
                            <p className="text-[11px] text-text-muted">
                              Blind notch previews currently support top or bottom targets so the recess direction stays
                              unambiguous.
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
              </div>
            )}

            <div className="mt-auto flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={handleSaveDraft} disabled={!!draftValidationMessage}>
                {inspectorDraft?.featureId ? 'Save Operation' : 'Add Operation'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDraft(selectedFeature ? buildDraftFromFeature(selectedFeature) : null);
                }}
              >
                Reset
              </Button>
              <Button variant="outline" onClick={onExit} className="ml-auto">
                {hasUnsavedChanges ? 'Cancel' : 'Exit'}
              </Button>
              <Button onClick={onSave} disabled={!hasUnsavedChanges}>
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
