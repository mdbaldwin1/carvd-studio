import { FractionInput } from '@renderer/components/common/FractionInput';
import { HelpTooltip } from '@renderer/components/common/HelpTooltip';
import {
  buildDraftFromFeature,
  buildDraftFromPreset,
  buildFeatureFromDraft,
  CORNER_TARGETS,
  duplicateFeature,
  EDGE_NOTCH_SIDE_LABELS,
  EDGE_NOTCH_SIDES,
  edgeNotchSideToTarget,
  edgeTargetToSide,
  END_TARGETS,
  FACE_TARGETS,
  FeatureDraft,
  getPresetHint,
  getPresetLabel,
  OperationPreset
} from '@renderer/components/part-features/partFeatureEditorState';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@renderer/components/ui/accordion';
import { Badge } from '@renderer/components/ui/badge';
import { Button } from '@renderer/components/ui/button';
import { Checkbox } from '@renderer/components/ui/checkbox';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Select } from '@renderer/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu';
import { EndCutFeature, Part, PartFeature, RectCutFeature } from '@renderer/types';
import { getDerivedLengthMeasurements } from '@renderer/utils/endCutUtils';
import { formatMeasurementWithUnit } from '@renderer/utils/fractions';
import { getAvailableMirrorActions, getMirrorActionLabel, mirrorFeature } from '@renderer/utils/partFeatureActions';
import {
  CORNER_LABELS,
  FACE_LABELS,
  getFeatureSummary,
  getFeatureTargetLabel
} from '@renderer/utils/partFeatureSummary';
import {
  TOP_BOTTOM_CORNER_TARGETS,
  TOP_BOTTOM_FACE_TARGETS,
  validateRectCutFeature
} from '@renderer/utils/rectCutUtils';
import { MoreHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface SinglePartFeaturesCardProps {
  selectedPart: Part;
  units: 'imperial' | 'metric';
  onFeaturesChange: (features: PartFeature[]) => void;
}

export function SinglePartFeaturesCard({ selectedPart, units, onFeaturesChange }: SinglePartFeaturesCardProps) {
  const features = useMemo(() => selectedPart.features ?? [], [selectedPart.features]);
  const [draft, setDraft] = useState<FeatureDraft | null>(null);

  useEffect(() => {
    setDraft(null);
  }, [selectedPart.id]);

  const activePreset = useMemo<OperationPreset | null>(() => {
    if (!draft) return null;
    if (draft.mode === 'end_cut') return 'end_cut';
    return draft.cutType;
  }, [draft]);

  const partDerivedLengths = useMemo(
    () =>
      getDerivedLengthMeasurements({
        length: selectedPart.length,
        width: selectedPart.width,
        thickness: selectedPart.thickness,
        features
      }),
    [features, selectedPart.length, selectedPart.thickness, selectedPart.width]
  );

  const draftPreviewFeature = useMemo(() => {
    if (!draft || draft.mode !== 'end_cut') return null;
    return buildFeatureFromDraft(draft);
  }, [draft]);

  const availableCornerTargets = useMemo(() => {
    if (!draft || draft.mode !== 'rect_cut' || draft.cutType !== 'corner_notch') return CORNER_TARGETS;
    return draft.depthMode === 'blind' ? TOP_BOTTOM_CORNER_TARGETS : CORNER_TARGETS;
  }, [draft]);

  const availableFaceTargets = useMemo(() => {
    if (!draft || draft.mode !== 'rect_cut' || draft.cutType !== 'cutout') return FACE_TARGETS;
    return TOP_BOTTOM_FACE_TARGETS;
  }, [draft]);

  const draftValidationMessage = useMemo(() => {
    if (!draft || draft.mode !== 'rect_cut') return null;
    return validateRectCutFeature(buildFeatureFromDraft(draft), selectedPart);
  }, [draft, selectedPart]);

  const endCutPreviewMeasurements = useMemo(() => {
    if (!draftPreviewFeature || draftPreviewFeature.kind !== 'end_cut') return null;

    const nextFeatures = draft.featureId
      ? features.map((feature) => (feature.id === draft.featureId ? draftPreviewFeature : feature))
      : [...features, draftPreviewFeature];

    const measurements = getDerivedLengthMeasurements({
      length: selectedPart.length,
      width: selectedPart.width,
      thickness: selectedPart.thickness,
      features: nextFeatures
    });

    return measurements;
  }, [draft, draftPreviewFeature, features, selectedPart.length, selectedPart.thickness, selectedPart.width]);

  const isEndCutHighPointOnTop = (targetFace: 'left_end' | 'right_end', verticalFlip: boolean): boolean =>
    targetFace === 'right_end' ? !verticalFlip : verticalFlip;

  const getVerticalFlipFromHighPoint = (targetFace: 'left_end' | 'right_end', highPoint: 'top' | 'bottom'): boolean =>
    targetFace === 'right_end' ? highPoint !== 'top' : highPoint === 'top';

  const startDraft = (preset: OperationPreset) =>
    setDraft(
      buildDraftFromPreset(preset, {
        partLength: selectedPart.length,
        partWidth: selectedPart.width,
        partThickness: selectedPart.thickness
      })
    );

  const handleSaveDraft = () => {
    if (!draft) return;
    if (draft.mode === 'rect_cut' && draftValidationMessage) return;
    const nextFeature = buildFeatureFromDraft(draft);
    const nextFeatures = draft.featureId
      ? features.map((feature) => (feature.id === draft.featureId ? nextFeature : feature))
      : [...features, nextFeature];
    onFeaturesChange(nextFeatures);
    setDraft(null);
  };

  const handleRemoveFeature = (featureId: string) => {
    onFeaturesChange(features.filter((feature) => feature.id !== featureId));
    if (draft?.featureId === featureId) {
      setDraft(null);
    }
  };

  const handleDuplicateFeature = (feature: PartFeature) => {
    onFeaturesChange([...features, duplicateFeature(feature)]);
  };

  const handleMirrorFeature = (feature: PartFeature, action: ReturnType<typeof getAvailableMirrorActions>[number]) => {
    const mirrored = mirrorFeature(feature, action, selectedPart);
    const sourceIndex = features.findIndex((f) => f.id === feature.id);
    const next = [...features];
    next.splice(sourceIndex + 1, 0, mirrored);
    onFeaturesChange(next);
  };

  const handleMoveFeature = (featureId: string, direction: -1 | 1) => {
    const fromIndex = features.findIndex((f) => f.id === featureId);
    if (fromIndex < 0) return;
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= features.length) return;
    const next = [...features];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onFeaturesChange(next);
  };

  return (
    <Accordion type="single" collapsible className="properties-card p-0 overflow-hidden" defaultValue="operations">
      <AccordionItem value="operations" className="mt-0 border-0 rounded-none">
        <AccordionTrigger>
          <span className="flex items-center gap-2">
            Operations
            {features.length > 0 && <Badge variant="secondary">{features.length}</Badge>}
          </span>
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-3 px-[14px] pb-[14px]">
          <div className="rounded-[var(--radius-sm)] border border-border bg-surface p-3">
            <div className="flex items-center gap-2">
              <Label className="m-0">Blank Size</Label>
              <HelpTooltip
                text="Start with the full rectangular blank here, then add the operations that shape it into the finished part."
                docsSection="parts"
                inline
              />
            </div>
            <p className="mt-1 text-[12px] text-text">
              {formatMeasurementWithUnit(selectedPart.length, units)} ×{' '}
              {formatMeasurementWithUnit(selectedPart.width, units)} ×{' '}
              {formatMeasurementWithUnit(selectedPart.thickness, units)}
            </p>
            <p className="mt-1 text-[11px] text-text-muted">
              Think like the shop floor: choose the operation first, then the exact end, edge, face, or corner it lands
              on.
            </p>
          </div>

          <div className="property-group mb-0">
            <Label className="mb-2 block">1. Choose Operation</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['end_cut', 'corner_notch', 'edge_notch', 'cutout'] as OperationPreset[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`rounded-[var(--radius-sm)] border px-3 py-2 text-left transition-colors ${
                    activePreset === preset
                      ? 'border-accent bg-accent/10 text-text'
                      : 'border-border bg-surface hover:bg-surface-hover'
                  }`}
                  onClick={() => startDraft(preset)}
                >
                  <div className="text-[12px] font-semibold">{getPresetLabel(preset)}</div>
                  <div className="mt-1 text-[11px] text-text-muted">{getPresetHint(preset)}</div>
                </button>
              ))}
            </div>
          </div>

          {features.length === 0 ? (
            <div className="rounded-[var(--radius-sm)] border border-dashed border-border p-3 text-[11px] text-text-muted">
              No operations yet. Common shop moves usually start with a mitre on one end, a mirrored cut on the opposite
              end, or a notch anchored to one specific corner.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {features.map((feature, index) => (
                <div key={feature.id} className="rounded-[var(--radius-sm)] border border-border bg-surface p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[12px] font-semibold">Operation {index + 1}</span>
                        <Badge variant={feature.enabled ? 'secondary' : 'outline'}>
                          {feature.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[12px] text-text">{feature.label || getFeatureSummary(feature, units)}</p>
                      <p className="mt-1 text-[11px] text-text-muted">{getFeatureTargetLabel(feature)}</p>
                      {feature.kind === 'end_cut' && (
                        <p className="mt-1 text-[11px] text-text-muted">
                          Long {formatMeasurementWithUnit(partDerivedLengths.longPoint, units)} · Short{' '}
                          {formatMeasurementWithUnit(partDerivedLengths.shortPoint, units)} · Centerline{' '}
                          {formatMeasurementWithUnit(partDerivedLengths.centerline, units)}
                        </p>
                      )}
                    </div>
                    <label className="flex items-center gap-2 text-[11px] text-text-muted">
                      <Checkbox
                        aria-label={`Enable ${feature.label || `operation ${index + 1}`}`}
                        checked={feature.enabled}
                        onChange={(e) =>
                          onFeaturesChange(
                            features.map((existing) =>
                              existing.id === feature.id ? { ...existing, enabled: e.target.checked } : existing
                            )
                          )
                        }
                      />
                      Live
                    </label>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() => setDraft(buildDraftFromFeature(feature, selectedPart))}
                    >
                      Edit
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="rounded p-1 text-text-muted transition-colors hover:bg-accent/10 hover:text-text"
                          aria-label={`Actions for operation ${index + 1}`}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => handleMoveFeature(feature.id, -1)} disabled={index === 0}>
                          Move Up
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleMoveFeature(feature.id, 1)}
                          disabled={index === features.length - 1}
                        >
                          Move Down
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDuplicateFeature(feature)}>Duplicate</DropdownMenuItem>
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
                </div>
              ))}
            </div>
          )}

          {draft && (
            <div className="rounded-[var(--radius-sm)] border border-border bg-surface p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Label className="block">2. Pick Target</Label>
                  <p className="mt-1 text-[11px] text-text-muted">
                    Use shop language here. Choose the exact end, edge, face, or corner before entering measurements.
                  </p>
                </div>
                <Badge variant="outline">{draft.featureId ? 'Editing' : 'New'}</Badge>
              </div>

              {draft.mode === 'end_cut' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {END_TARGETS.map((target) => (
                    <Button
                      key={target}
                      type="button"
                      size="xs"
                      variant="outline"
                      active={draft.targetFace === target}
                      onClick={() => setDraft({ ...draft, targetFace: target })}
                    >
                      {FACE_LABELS[target]}
                    </Button>
                  ))}
                </div>
              )}

              {draft.mode === 'rect_cut' && draft.cutType === 'corner_notch' && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {availableCornerTargets.map((target) => (
                    <Button
                      key={target}
                      type="button"
                      size="xs"
                      variant="outline"
                      active={draft.cornerTarget === target}
                      onClick={() => setDraft({ ...draft, cornerTarget: target })}
                    >
                      {CORNER_LABELS[target]}
                    </Button>
                  ))}
                </div>
              )}

              {draft.mode === 'rect_cut' && draft.cutType === 'edge_notch' && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {EDGE_NOTCH_SIDES.map((side) => (
                    <Button
                      key={side}
                      type="button"
                      size="xs"
                      variant="outline"
                      active={edgeTargetToSide(draft.edgeTarget) === side}
                      onClick={() => setDraft({ ...draft, edgeTarget: edgeNotchSideToTarget(side) })}
                    >
                      {EDGE_NOTCH_SIDE_LABELS[side]}
                    </Button>
                  ))}
                </div>
              )}

              {draft.mode === 'rect_cut' && draft.cutType === 'cutout' && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {availableFaceTargets.map((target) => (
                    <Button
                      key={target}
                      type="button"
                      size="xs"
                      variant="outline"
                      active={draft.faceTarget === target}
                      onClick={() => setDraft({ ...draft, faceTarget: target })}
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
                      value={draft.label}
                      onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                      placeholder="Face-frame left stile"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-2 text-[12px] text-text">
                      <Checkbox
                        checked={draft.enabled}
                        onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
                      />
                      Enable this operation
                    </label>
                  </div>
                </div>

                {draft.mode === 'end_cut' && (
                  <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="end-cut-type">Cut Style</Label>
                        <Select
                          id="end-cut-type"
                          value={draft.cutType}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              cutType: e.target.value as EndCutFeature['cutType']
                            })
                          }
                        >
                          <option value="mitre">Mitre</option>
                          <option value="bevel">Bevel</option>
                          <option value="compound">Compound</option>
                        </Select>
                      </div>
                      <div className="rounded-[var(--radius-sm)] border border-border bg-background p-3 text-[12px] text-text-muted">
                        The board length stays fixed at{' '}
                        <span className="font-medium text-text">
                          {formatMeasurementWithUnit(selectedPart.length, units)}
                        </span>
                        . This cut only shapes the selected end.
                      </div>
                    </div>

                    {(draft.cutType === 'mitre' || draft.cutType === 'compound') && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="horizontal-angle">Mitre Angle</Label>
                          <Input
                            id="horizontal-angle"
                            type="number"
                            value={draft.horizontalAngle}
                            onChange={(e) => {
                              const nextAngle = Number(e.target.value);
                              setDraft({
                                ...draft,
                                horizontalAngle: Math.abs(nextAngle),
                                horizontalFlip: nextAngle < 0 ? true : draft.horizontalFlip
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor="horizontal-flip">Long Point On</Label>
                          <Select
                            id="horizontal-flip"
                            value={draft.horizontalFlip ? 'back' : 'front'}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
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

                    {(draft.cutType === 'bevel' || draft.cutType === 'compound') && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="vertical-angle">Bevel Angle</Label>
                          <Input
                            id="vertical-angle"
                            type="number"
                            value={draft.verticalAngle}
                            onChange={(e) => {
                              const nextAngle = Number(e.target.value);
                              setDraft({
                                ...draft,
                                verticalAngle: Math.abs(nextAngle),
                                verticalFlip: nextAngle < 0 ? !draft.verticalFlip : draft.verticalFlip
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor="vertical-flip">High Point On</Label>
                          <Select
                            id="vertical-flip"
                            value={isEndCutHighPointOnTop(draft.targetFace, draft.verticalFlip) ? 'top' : 'bottom'}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                verticalFlip: getVerticalFlipFromHighPoint(
                                  draft.targetFace,
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

                    {endCutPreviewMeasurements && (
                      <div className="rounded-[var(--radius-sm)] border border-border bg-background p-3">
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

                {draft.mode === 'rect_cut' && (
                  <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {draft.cutType !== 'corner_notch' && draft.cutType !== 'edge_notch' && (
                        <div>
                          <Label htmlFor="depth-mode">Depth</Label>
                          <Select
                            id="depth-mode"
                            value={draft.depthMode}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                depthMode: e.target.value as RectCutFeature['parameters']['depthMode']
                              })
                            }
                          >
                            <option value="through">Through</option>
                            <option value="blind">Blind</option>
                          </Select>
                        </div>
                      )}
                    </div>

                    {draft.cutType === 'cutout' && (
                      <p className="text-[11px] text-text-muted">
                        POC note: face cutout previews currently target top or bottom faces only.
                      </p>
                    )}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Run Along Blank</Label>
                        <FractionInput
                          value={draft.sizeLength}
                          onChange={(value) => setDraft({ ...draft, sizeLength: value })}
                          min={0.125}
                        />
                      </div>
                      <div>
                        <Label>Cross-Cut Width</Label>
                        <FractionInput
                          value={draft.sizeWidth}
                          onChange={(value) => setDraft({ ...draft, sizeWidth: value })}
                          min={0.125}
                        />
                      </div>
                    </div>

                    {draft.depthMode === 'blind' && (
                      <div>
                        <Label>Blind Depth</Label>
                        <FractionInput
                          value={draft.depth}
                          onChange={(value) => setDraft({ ...draft, depth: value })}
                          min={0.125}
                        />
                      </div>
                    )}

                    {draft.cutType === 'edge_notch' && (
                      <div>
                        <Label>
                          {edgeTargetToSide(draft.edgeTarget) === 'front' ||
                          edgeTargetToSide(draft.edgeTarget) === 'back'
                            ? 'Offset Along Length'
                            : 'Offset Across Width'}
                        </Label>
                        <FractionInput
                          value={
                            edgeTargetToSide(draft.edgeTarget) === 'front' ||
                            edgeTargetToSide(draft.edgeTarget) === 'back'
                              ? draft.placementX
                              : draft.placementZ
                          }
                          onChange={(value) => {
                            const side = edgeTargetToSide(draft.edgeTarget);
                            setDraft(
                              side === 'front' || side === 'back'
                                ? { ...draft, placementX: value, placementZ: 0 }
                                : { ...draft, placementX: 0, placementZ: value }
                            );
                          }}
                          min={0}
                        />
                      </div>
                    )}

                    {draft.cutType !== 'corner_notch' && draft.cutType !== 'edge_notch' && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <Label>Offset Along Length</Label>
                          <FractionInput
                            value={draft.placementX}
                            onChange={(value) => setDraft({ ...draft, placementX: value })}
                            min={0}
                          />
                        </div>
                        <div>
                          <Label>Offset Across Width</Label>
                          <FractionInput
                            value={draft.placementZ}
                            onChange={(value) => setDraft({ ...draft, placementZ: value })}
                            min={0}
                          />
                        </div>
                      </div>
                    )}

                    {draftValidationMessage && (
                      <div className="rounded-[var(--radius-sm)] border border-danger/30 bg-danger/5 p-3 text-[11px] text-danger">
                        {draftValidationMessage}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="xs"
                  onClick={handleSaveDraft}
                  disabled={draft.mode === 'rect_cut' && !!draftValidationMessage}
                >
                  {draft.featureId ? 'Save Operation' : 'Add Operation'}
                </Button>
                <Button type="button" size="xs" variant="ghost" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
