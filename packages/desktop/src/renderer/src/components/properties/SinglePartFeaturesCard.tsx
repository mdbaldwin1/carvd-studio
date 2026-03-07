import { FractionInput } from '@renderer/components/common/FractionInput';
import { HelpTooltip } from '@renderer/components/common/HelpTooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@renderer/components/ui/accordion';
import { Badge } from '@renderer/components/ui/badge';
import { Button } from '@renderer/components/ui/button';
import { Checkbox } from '@renderer/components/ui/checkbox';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Select } from '@renderer/components/ui/select';
import {
  CornerTarget,
  EdgeTarget,
  EndCutFeature,
  FaceTarget,
  Part,
  PartFeature,
  RectCutFeature
} from '@renderer/types';
import { clonePartFeature } from '@renderer/utils/partFeatures';
import { formatMeasurementWithUnit } from '@renderer/utils/fractions';
import { useEffect, useMemo, useState } from 'react';

const FACE_LABELS: Record<FaceTarget, string> = {
  left_end: 'Left End',
  right_end: 'Right End',
  top_face: 'Top Face',
  bottom_face: 'Bottom Face',
  front_face: 'Front Face',
  back_face: 'Back Face'
};

const EDGE_LABELS: Record<EdgeTarget, string> = {
  top_front_edge: 'Top-Front Edge',
  top_back_edge: 'Top-Back Edge',
  top_left_edge: 'Top-Left Edge',
  top_right_edge: 'Top-Right Edge',
  bottom_front_edge: 'Bottom-Front Edge',
  bottom_back_edge: 'Bottom-Back Edge',
  bottom_left_edge: 'Bottom-Left Edge',
  bottom_right_edge: 'Bottom-Right Edge',
  front_left_edge: 'Front-Left Edge',
  front_right_edge: 'Front-Right Edge',
  back_left_edge: 'Back-Left Edge',
  back_right_edge: 'Back-Right Edge'
};

const CORNER_LABELS: Record<CornerTarget, string> = {
  front_top_left_corner: 'Front-Top-Left Corner',
  front_top_right_corner: 'Front-Top-Right Corner',
  front_bottom_left_corner: 'Front-Bottom-Left Corner',
  front_bottom_right_corner: 'Front-Bottom-Right Corner',
  back_top_left_corner: 'Back-Top-Left Corner',
  back_top_right_corner: 'Back-Top-Right Corner',
  back_bottom_left_corner: 'Back-Bottom-Left Corner',
  back_bottom_right_corner: 'Back-Bottom-Right Corner'
};

const END_TARGETS: FaceTarget[] = ['left_end', 'right_end'];
const FACE_TARGETS: FaceTarget[] = ['left_end', 'right_end', 'top_face', 'bottom_face', 'front_face', 'back_face'];
const EDGE_TARGETS: EdgeTarget[] = [
  'top_front_edge',
  'top_back_edge',
  'top_left_edge',
  'top_right_edge',
  'bottom_front_edge',
  'bottom_back_edge',
  'bottom_left_edge',
  'bottom_right_edge',
  'front_left_edge',
  'front_right_edge',
  'back_left_edge',
  'back_right_edge'
];
const CORNER_TARGETS: CornerTarget[] = [
  'front_top_left_corner',
  'front_top_right_corner',
  'front_bottom_left_corner',
  'front_bottom_right_corner',
  'back_top_left_corner',
  'back_top_right_corner',
  'back_bottom_left_corner',
  'back_bottom_right_corner'
];

type OperationPreset = 'end_cut' | 'corner_notch' | 'edge_notch' | 'cutout';

type FeatureDraft =
  | {
      mode: 'end_cut';
      featureId: string | null;
      label: string;
      enabled: boolean;
      targetFace: 'left_end' | 'right_end';
      cutType: EndCutFeature['cutType'];
      lengthMode: EndCutFeature['lengthMode'];
      horizontalAngle: number;
      verticalAngle: number;
    }
  | {
      mode: 'rect_cut';
      featureId: string | null;
      label: string;
      enabled: boolean;
      cutType: RectCutFeature['cutType'];
      faceTarget: FaceTarget;
      edgeTarget: EdgeTarget;
      cornerTarget: CornerTarget;
      sizeLength: number;
      sizeWidth: number;
      depthMode: RectCutFeature['parameters']['depthMode'];
      depth: number;
      placementX: number;
      placementZ: number;
    };

interface SinglePartFeaturesCardProps {
  selectedPart: Part;
  units: 'imperial' | 'metric';
  onFeaturesChange: (features: PartFeature[]) => void;
}

function generateFeatureId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `feature_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildDraftFromPreset(preset: OperationPreset): FeatureDraft {
  if (preset === 'end_cut') {
    return {
      mode: 'end_cut',
      featureId: null,
      label: '',
      enabled: true,
      targetFace: 'left_end',
      cutType: 'mitre',
      lengthMode: 'long_point',
      horizontalAngle: 45,
      verticalAngle: 0
    };
  }

  return {
    mode: 'rect_cut',
    featureId: null,
    label: '',
    enabled: true,
    cutType: preset,
    faceTarget: 'top_face',
    edgeTarget: 'top_front_edge',
    cornerTarget: 'front_bottom_left_corner',
    sizeLength: 0.75,
    sizeWidth: 0.75,
    depthMode: 'through',
    depth: 0.25,
    placementX: 0,
    placementZ: 0
  };
}

function buildDraftFromFeature(feature: PartFeature): FeatureDraft {
  if (feature.kind === 'end_cut') {
    return {
      mode: 'end_cut',
      featureId: feature.id,
      label: feature.label ?? '',
      enabled: feature.enabled,
      targetFace: feature.target.face,
      cutType: feature.cutType,
      lengthMode: feature.lengthMode,
      horizontalAngle: feature.parameters.horizontalAngle,
      verticalAngle: feature.parameters.verticalAngle ?? 0
    };
  }

  return {
    mode: 'rect_cut',
    featureId: feature.id,
    label: feature.label ?? '',
    enabled: feature.enabled,
    cutType: feature.cutType,
    faceTarget: feature.target.type === 'face' ? feature.target.face : 'top_face',
    edgeTarget: feature.target.type === 'edge' ? feature.target.edge : 'top_front_edge',
    cornerTarget: feature.target.type === 'corner' ? feature.target.corner : 'front_bottom_left_corner',
    sizeLength: feature.parameters.size.length,
    sizeWidth: feature.parameters.size.width,
    depthMode: feature.parameters.depthMode,
    depth: feature.parameters.depth ?? 0.25,
    placementX: feature.placement.x,
    placementZ: feature.placement.z
  };
}

function getFeatureTargetLabel(feature: PartFeature): string {
  if (feature.target.type === 'face') return FACE_LABELS[feature.target.face];
  if (feature.target.type === 'edge') return EDGE_LABELS[feature.target.edge];
  return CORNER_LABELS[feature.target.corner];
}

function getFeatureSummary(feature: PartFeature, units: 'imperial' | 'metric'): string {
  if (feature.kind === 'end_cut') {
    const angleBits = [];
    if (feature.cutType === 'mitre' || feature.cutType === 'compound') {
      angleBits.push(`${feature.parameters.horizontalAngle}°`);
    }
    if ((feature.cutType === 'bevel' || feature.cutType === 'compound') && feature.parameters.verticalAngle) {
      angleBits.push(`${feature.parameters.verticalAngle}° bevel`);
    }
    const angleText = angleBits.length > 0 ? ` ${angleBits.join(' / ')}` : '';
    return `${feature.cutType[0].toUpperCase()}${feature.cutType.slice(1)}${angleText} on ${getFeatureTargetLabel(feature)}`;
  }

  return `${feature.cutType
    .split('_')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(
      ' '
    )} on ${getFeatureTargetLabel(feature)} · ${formatMeasurementWithUnit(feature.parameters.size.length, units)} × ${formatMeasurementWithUnit(feature.parameters.size.width, units)}`;
}

function buildFeatureFromDraft(draft: FeatureDraft): PartFeature {
  if (draft.mode === 'end_cut') {
    return {
      id: draft.featureId ?? generateFeatureId(),
      kind: 'end_cut',
      version: 1,
      enabled: draft.enabled,
      label: draft.label || undefined,
      target: { type: 'face', face: draft.targetFace },
      reference: { primaryFrom: draft.targetFace === 'left_end' ? 'min' : 'max' },
      cutType: draft.cutType,
      lengthMode: draft.lengthMode,
      parameters: {
        horizontalAngle: draft.cutType === 'bevel' ? 0 : draft.horizontalAngle,
        verticalAngle:
          draft.cutType === 'mitre' || draft.cutType === 'square' ? undefined : draft.verticalAngle || undefined
      }
    };
  }

  const target =
    draft.cutType === 'corner_notch'
      ? { type: 'corner' as const, corner: draft.cornerTarget }
      : draft.cutType === 'edge_notch'
        ? { type: 'edge' as const, edge: draft.edgeTarget }
        : { type: 'face' as const, face: draft.faceTarget };

  return {
    id: draft.featureId ?? generateFeatureId(),
    kind: 'rect_cut',
    version: 1,
    enabled: draft.enabled,
    label: draft.label || undefined,
    target,
    reference: {
      primaryFrom: 'min',
      secondaryFrom: draft.cutType === 'corner_notch' ? 'min' : undefined
    },
    cutType: draft.cutType,
    parameters: {
      size: {
        length: draft.sizeLength,
        width: draft.sizeWidth
      },
      depthMode: draft.depthMode,
      depth: draft.depthMode === 'blind' ? draft.depth : undefined
    },
    placement: {
      x: draft.cutType === 'corner_notch' ? 0 : draft.placementX,
      z: draft.cutType === 'corner_notch' ? 0 : draft.placementZ
    }
  };
}

function getPresetLabel(preset: OperationPreset): string {
  switch (preset) {
    case 'end_cut':
      return 'End Cut';
    case 'corner_notch':
      return 'Corner Notch';
    case 'edge_notch':
      return 'Edge Notch';
    case 'cutout':
      return 'Cutout';
  }
}

function getPresetHint(preset: OperationPreset): string {
  switch (preset) {
    case 'end_cut':
      return 'Mitres, bevels, and compound cuts on either end.';
    case 'corner_notch':
      return 'Remove a rectangular chunk from one exact corner.';
    case 'edge_notch':
      return 'Notch into a specific edge while keeping the blank rectangular.';
    case 'cutout':
      return 'Place a rectangular pocket or opening on one face.';
  }
}

export function SinglePartFeaturesCard({ selectedPart, units, onFeaturesChange }: SinglePartFeaturesCardProps) {
  const features = selectedPart.features ?? [];
  const [draft, setDraft] = useState<FeatureDraft | null>(null);

  useEffect(() => {
    setDraft(null);
  }, [selectedPart.id]);

  const activePreset = useMemo<OperationPreset | null>(() => {
    if (!draft) return null;
    if (draft.mode === 'end_cut') return 'end_cut';
    return draft.cutType;
  }, [draft]);

  const startDraft = (preset: OperationPreset) => setDraft(buildDraftFromPreset(preset));

  const handleSaveDraft = () => {
    if (!draft) return;
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
    const duplicate = clonePartFeature(feature);
    duplicate.id = generateFeatureId();
    onFeaturesChange([...features, duplicate]);
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
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() => setDraft(buildDraftFromFeature(feature))}
                    >
                      Edit
                    </Button>
                    <Button type="button" size="xs" variant="ghost" onClick={() => handleDuplicateFeature(feature)}>
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
                  {CORNER_TARGETS.map((target) => (
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
                  {EDGE_TARGETS.map((target) => (
                    <Button
                      key={target}
                      type="button"
                      size="xs"
                      variant="outline"
                      active={draft.edgeTarget === target}
                      onClick={() => setDraft({ ...draft, edgeTarget: target })}
                    >
                      {EDGE_LABELS[target]}
                    </Button>
                  ))}
                </div>
              )}

              {draft.mode === 'rect_cut' && draft.cutType === 'cutout' && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {FACE_TARGETS.map((target) => (
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
                          value={draft.lengthMode}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
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

                    {(draft.cutType === 'mitre' || draft.cutType === 'compound') && (
                      <div>
                        <Label htmlFor="horizontal-angle">Mitre Angle</Label>
                        <Input
                          id="horizontal-angle"
                          type="number"
                          value={draft.horizontalAngle}
                          onChange={(e) => setDraft({ ...draft, horizontalAngle: Number(e.target.value) })}
                        />
                      </div>
                    )}

                    {(draft.cutType === 'bevel' || draft.cutType === 'compound') && (
                      <div>
                        <Label htmlFor="vertical-angle">Bevel Angle</Label>
                        <Input
                          id="vertical-angle"
                          type="number"
                          value={draft.verticalAngle}
                          onChange={(e) => setDraft({ ...draft, verticalAngle: Number(e.target.value) })}
                        />
                      </div>
                    )}
                  </>
                )}

                {draft.mode === 'rect_cut' && (
                  <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="rect-cut-type">Removal Type</Label>
                        <Select
                          id="rect-cut-type"
                          value={draft.cutType}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
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
                    </div>

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

                    {draft.cutType !== 'corner_notch' && (
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
                  </>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" size="xs" onClick={handleSaveDraft}>
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
