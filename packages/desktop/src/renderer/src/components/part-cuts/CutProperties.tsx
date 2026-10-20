import { CircleRouteLayout } from './CircleRouteLayout';
import { FractionInput } from '@renderer/components/common/FractionInput';
import { useEffect, useState } from 'react';
import {
  EDGE_NOTCH_SIDE_LABELS,
  EDGE_NOTCH_SIDES,
  edgeNotchSideToTarget,
  edgeTargetToSide,
  END_TARGETS,
  FACE_TARGETS,
  isEdgeBevelTarget,
  normalizeEndCutDraft
} from '@renderer/components/part-features/partFeatureEditorState';
import { Button } from '@renderer/components/ui/button';
import { Checkbox } from '@renderer/components/ui/checkbox';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Select } from '@renderer/components/ui/select';
import { EndCutFeature, RectCutFeature } from '@renderer/types';
import { formatMeasurementWithUnit } from '@renderer/utils/fractions';
import { CORNER_LABELS, EDGE_LABELS, FACE_LABELS } from '@renderer/utils/partFeatureSummary';
import { getRouterProfileRevision } from '@renderer/utils/routerProfiles';

import { usePartCutsEditor } from './PartCutsEditorContext';
import { RouterBitSelector } from './RouterBitSelector';
import { EdgeProfileSelector } from './EdgeProfileSelector';
import { EdgeProfileLibraryControls } from './EdgeProfileLibraryControls';
import { getCutHint } from './cutHints';
import { bitReachesDepth, DRILL_BIT_CATALOG, findBitForDiameter } from '../../../../shared/drillBits';

function JointAngleInput({
  id,
  value,
  limit,
  minimum = -limit,
  onChange
}: {
  id: string;
  value: number;
  limit: number;
  minimum?: number;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <Input
      id={id}
      type="number"
      min={minimum}
      max={limit}
      step={0.1}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => {
        const next = Number(text);
        if (text.trim() && Number.isFinite(next)) onChange(next);
        else setText(String(value));
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
      }}
    />
  );
}

/**
 * The selected cut's fields, laid out the way the project editor lays out a
 * selected part: one `properties-panel`, a flat run of sibling
 * `properties-card` blocks, and one `property-group` per field.
 *
 * The cards divide the same way the part panel's do -- what the cut is, its
 * shape, where it sits, and any repeat -- so a cut with three fields and a
 * cut with fifteen both read top to bottom without nesting.
 */
export function CutProperties() {
  const {
    part,
    draftFeatures,
    onDraftFeaturesChange,
    units,
    setDraft,
    inspectorDraft,
    isEditingDraft,
    draftValidationMessage,
    endCutPreviewMeasurements,
    edgeBevelPreviewMeasurements,
    isEndCutHighPointOnTop,
    getVerticalFlipFromHighPoint,
    availableCornerTargets,
    availableEdgeTargets,
    availableFaceTargets,
    updateRectDraft,
    selectedFeatureSummary,
    selectedFeatureTargetLabel,
    preservedEndCutReferenceNote,
    inspectorUsesBlindOnlyDepth,
    inspectorHidesDepthSelector,
    inspectorUsesDerivedCrossWidth,
    inspectorUsesDerivedDepth,
    rabbetShoulderValue,
    rabbetRunsAlongLength
  } = usePartCutsEditor();

  if (!isEditingDraft || !inspectorDraft) return null;

  const isRect = inspectorDraft.mode === 'rect_cut';

  // Only a four-cornered pocket has corners a rotating bit can round. A dado
  // or a groove runs out to an edge and has none.
  const isRoundablePocket =
    inspectorDraft.mode === 'rect_cut' && ['mortise', 'cutout', 'stopped_dado'].includes(inspectorDraft.cutType);
  // Routed with a bit the pocket's own width, which is the usual way, the ends
  // come out half-round. A narrower bit in several passes leaves less.
  const routedCornerRadius =
    inspectorDraft.mode === 'rect_cut' ? Math.min(inspectorDraft.sizeLength, inspectorDraft.sizeWidth) / 2 : 0;

  // A Forstner runs out of flute long before a twist bit does, which is the
  // kind of thing you find out at the drill press rather than in a drawing.
  const chosenBit = inspectorDraft.mode === 'circular_cut' ? findBitForDiameter(inspectorDraft.diameter) : undefined;
  const outOfReachBit =
    chosenBit && inspectorDraft.mode === 'circular_cut' && !bitReachesDepth(chosenBit, inspectorDraft.depth ?? 0)
      ? chosenBit
      : undefined;
  const isSideFace =
    isRect && (inspectorDraft.faceTarget === 'front_face' || inspectorDraft.faceTarget === 'back_face');

  /** The one-line note for a rectangular cut's own conventions. */
  const rectCutNote = !isRect
    ? null
    : inspectorDraft.cutType === 'cutout'
      ? 'Cutout opens through or into a face. Top and bottom cut across the board; front and back sink into its width.'
      : inspectorDraft.cutType === 'dado'
        ? 'Dado spans the full board width. Set the channel width along the blank and the blind depth.'
        : inspectorDraft.cutType === 'stopped_dado'
          ? 'Measure the dado from the left end, then set how far it stops from the front and back edges. A zero stop opens that end.'
          : inspectorDraft.cutType === 'rabbet'
            ? 'Rabbet runs the full edge length. Set the shoulder width and blind depth.'
            : inspectorDraft.cutType === 'groove'
              ? 'Groove runs the full board length. Set the groove width across the board and the blind depth.'
              : inspectorDraft.cutType === 'stopped_groove'
                ? 'Stopped groove uses a limited run and explicit placement. Set run length, groove width, offsets, and blind depth.'
                : inspectorDraft.cutType === 'half_lap'
                  ? 'Half lap removes half the board so two pieces cross flush. Set the run and where it starts; the depth follows the stock.'
                  : inspectorDraft.cutType === 'mortise'
                    ? 'Mortise is a face pocket for a tenon. Set pocket size and placement, and choose a blind depth or take it through for a wedged or exposed tenon.'
                    : inspectorDraft.cutType === 'tenon'
                      ? 'Tenon leaves a tongue on the end, centred in the board thickness. Size it to the mortise it fits — the board length already includes the tenon, so no extra allowance is needed.'
                      : null;

  const runLabel =
    !isRect || inspectorDraft.mode !== 'rect_cut'
      ? ''
      : inspectorDraft.cutType === 'tenon'
        ? 'Tenon Length'
        : inspectorDraft.cutType === 'rabbet'
          ? 'Shoulder Width'
          : inspectorDraft.cutType === 'dado' || inspectorDraft.cutType === 'stopped_dado'
            ? 'Dado Width'
            : inspectorDraft.cutType === 'groove'
              ? 'Full Board Run'
              : 'Run Along Blank';

  const crossLabel =
    !isRect || inspectorDraft.mode !== 'rect_cut'
      ? ''
      : inspectorDraft.cutType === 'tenon'
        ? 'Tenon Width'
        : isSideFace
          ? 'Height Across Thickness'
          : inspectorDraft.cutType === 'dado' || inspectorDraft.cutType === 'stopped_dado'
            ? 'Across Board Width'
            : inspectorDraft.cutType === 'rabbet'
              ? 'Full Edge Run'
              : inspectorDraft.cutType === 'groove'
                ? 'Groove Width'
                : 'Cross-Cut Width';

  /** The cross-field's aria-label omits the derived-value wordings. */
  const crossInputLabel =
    !isRect || inspectorDraft.mode !== 'rect_cut'
      ? ''
      : inspectorDraft.cutType === 'tenon'
        ? 'Tenon Width'
        : isSideFace
          ? 'Height Across Thickness'
          : inspectorDraft.cutType === 'groove'
            ? 'Groove Width'
            : 'Cross-Cut Width';

  const blindDepthLabel =
    !isRect || inspectorDraft.mode !== 'rect_cut'
      ? ''
      : inspectorDraft.cutType === 'tenon'
        ? 'Tenon Thickness'
        : isSideFace
          ? 'Depth Into Width'
          : 'Blind Depth';

  const edgeNotchOffsetLabel =
    isRect && inspectorDraft.mode === 'rect_cut' && inspectorDraft.cutType === 'edge_notch'
      ? edgeTargetToSide(inspectorDraft.edgeTarget) === 'front' ||
        edgeTargetToSide(inspectorDraft.edgeTarget) === 'back'
        ? 'Offset Along Length'
        : 'Offset Across Width'
      : '';

  const acrossOffsetLabel =
    !isRect || inspectorDraft.mode !== 'rect_cut'
      ? ''
      : inspectorDraft.cutType === 'tenon'
        ? 'Shoulder Offset'
        : isSideFace
          ? 'Offset Up From Bottom'
          : 'Offset Across Width';

  const showRectOffsets =
    isRect &&
    inspectorDraft.mode === 'rect_cut' &&
    inspectorDraft.cutType !== 'corner_notch' &&
    inspectorDraft.cutType !== 'edge_notch' &&
    inspectorDraft.cutType !== 'rabbet';

  // Cut types whose blind recess direction is worth stating. Some of them
  // (a corner notch, a rabbet) have no offsets at all, so this has to keep
  // the placement card alive on its own.
  const showBlindRecessNote =
    isRect &&
    inspectorDraft.mode === 'rect_cut' &&
    inspectorDraft.depthMode === 'blind' &&
    ['corner_notch', 'edge_notch', 'rabbet', 'groove', 'stopped_dado', 'stopped_groove', 'mortise'].includes(
      inspectorDraft.cutType
    );

  // Bound once so the narrowing survives into the callbacks below; narrowing
  // `inspectorDraft.pattern` inline is lost inside a map.
  const gridPattern =
    inspectorDraft.mode === 'circular_cut' && inspectorDraft.pattern?.type === 'grid' ? inspectorDraft.pattern : null;

  return (
    // Named so the panel's own alert is distinguishable from the sidebar's
    // blocking-conflicts summary, which is also an alert.
    <aside className="properties-panel" aria-label="Cut properties">
      <h2>Properties</h2>

      {/* What this cut is, and the face or edge it acts on. */}
      <div className="properties-card">
        <div className="property-group">
          <div className="text-sm font-medium text-text">{inspectorDraft.label?.trim() || selectedFeatureSummary}</div>
          {selectedFeatureTargetLabel && (
            <div className="mt-0.5 text-[11px] text-text-muted">Target: {selectedFeatureTargetLabel}</div>
          )}
          <p className="mt-1.5 text-[11px] text-text-muted">{getCutHint(inspectorDraft)}</p>
        </div>

        <div className="property-group">
          <Label htmlFor="feature-label">Label (optional)</Label>
          <Input
            id="feature-label"
            value={inspectorDraft.label}
            onChange={(e) => setDraft({ ...inspectorDraft, label: e.target.value })}
            placeholder="Face-frame left stile"
          />
        </div>

        {inspectorDraft.mode === 'end_cut' && (
          <div className="property-group">
            <label>End or Edge</label>
            <div className="flex flex-wrap gap-1.5">
              {([...END_TARGETS, 'front_face', 'back_face'] as (typeof inspectorDraft.targetFace)[]).map((target) => (
                <Button
                  key={target}
                  type="button"
                  size="xs"
                  variant="outline"
                  active={inspectorDraft.targetFace === target}
                  onClick={() => setDraft(normalizeEndCutDraft({ ...inspectorDraft, targetFace: target }))}
                >
                  {target === 'front_face' ? 'Front Edge' : target === 'back_face' ? 'Back Edge' : FACE_LABELS[target]}
                </Button>
              ))}
            </div>
          </div>
        )}

        {inspectorDraft.mode === 'rect_cut' && inspectorDraft.cutType === 'tenon' && (
          <div className="property-group">
            <label>End</label>
            <div className="flex flex-wrap gap-1.5">
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
          </div>
        )}

        {inspectorDraft.mode === 'rect_cut' && inspectorDraft.cutType === 'corner_notch' && (
          <div className="property-group">
            <label>Corner</label>
            <div className="flex flex-wrap gap-1.5">
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
          </div>
        )}

        {inspectorDraft.mode === 'rect_cut' && inspectorDraft.cutType === 'edge_notch' && (
          <div className="property-group">
            <label>Edge</label>
            <div className="flex flex-wrap gap-1.5">
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
          </div>
        )}

        {inspectorDraft.mode === 'rect_cut' && inspectorDraft.cutType === 'rabbet' && (
          <div className="property-group">
            <label>Edge</label>
            <div className="flex flex-wrap gap-1.5">
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
          </div>
        )}

        {inspectorDraft.mode === 'edge_profile' && (
          <div className="property-group">
            <label>Edge</label>
            <div className="flex flex-wrap gap-1.5">
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
          </div>
        )}

        {(inspectorDraft.mode === 'circular_cut' ||
          inspectorDraft.mode === 'rounded_cut' ||
          inspectorDraft.mode === 'routed_path') && (
          <div className="property-group">
            <label>Face</label>
            <div className="flex flex-wrap gap-1.5">
              {(inspectorDraft.mode === 'rounded_cut'
                ? (['top_face', 'bottom_face', 'front_face', 'back_face'] as const)
                : FACE_TARGETS
              ).map((target) => (
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
          </div>
        )}

        {inspectorDraft.mode === 'rect_cut' &&
          ['cutout', 'dado', 'stopped_dado', 'groove', 'stopped_groove', 'mortise', 'half_lap'].includes(
            inspectorDraft.cutType
          ) && (
            <div className="property-group">
              <label>Face</label>
              <div className="flex flex-wrap gap-1.5">
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
            </div>
          )}
      </div>

      {/* The cut's own geometry. */}
      <div className="properties-card">
        {rectCutNote && <p className="property-group text-[11px] text-text-muted">{rectCutNote}</p>}

        {inspectorDraft.mode === 'end_cut' && (
          <>
            {isEdgeBevelTarget(inspectorDraft.targetFace) ? (
              <p className="property-group text-[11px] text-text-muted">
                Edge bevels tilt the whole long face across the thickness, so the cut style is always a bevel. The board
                width stays locked to the long point.
              </p>
            ) : (
              <div className="property-group">
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
              <>
                <div className="property-group">
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
                <div className="property-group">
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
              </>
            )}

            {(inspectorDraft.cutType === 'bevel' || inspectorDraft.cutType === 'compound') && (
              <>
                <div className="property-group">
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
                        // Set, never toggle: toggling makes the same typed
                        // value produce opposite geometry depending on
                        // history. Matches the mitre handler above.
                        verticalFlip: nextAngle < 0 ? true : inspectorDraft.verticalFlip
                      });
                    }}
                  />
                </div>
                <div className="property-group">
                  <Label htmlFor="vertical-flip">High Point On</Label>
                  <Select
                    id="vertical-flip"
                    value={
                      isEndCutHighPointOnTop(inspectorDraft.targetFace, inspectorDraft.verticalFlip) ? 'top' : 'bottom'
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
              </>
            )}
          </>
        )}

        {inspectorDraft.mode === 'end_cut' && !isEdgeBevelTarget(inspectorDraft.targetFace) && (
          <div className="property-group">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={Boolean(inspectorDraft.band)}
                onChange={(event) =>
                  setDraft({
                    ...inspectorDraft,
                    band: event.target.checked ? { from: 0, to: part.thickness / 3 } : undefined
                  })
                }
              />
              Cut only a lip
            </label>
            {inspectorDraft.band && (
              <>
                <p className="my-2 text-[11px] text-text-muted">
                  Limit the cut to a band of thickness, measured from the bottom face. Useful for a hidden dovetail's
                  mitred lip.
                </p>
                <Label>Band Start From Bottom</Label>
                <FractionInput
                  ariaLabel="Band Start From Bottom"
                  value={inspectorDraft.band.from}
                  min={0}
                  onChange={(from) => setDraft({ ...inspectorDraft, band: { ...inspectorDraft.band!, from } })}
                />
                <Label>Band End From Bottom</Label>
                <FractionInput
                  ariaLabel="Band End From Bottom"
                  value={inspectorDraft.band.to}
                  min={0}
                  onChange={(to) => setDraft({ ...inspectorDraft, band: { ...inspectorDraft.band!, to } })}
                />
              </>
            )}
          </div>
        )}

        {inspectorDraft.mode === 'circular_cut' && (
          <>
            <div className="property-group">
              <Label htmlFor="drill-bit">Bit</Label>
              {/* You bore 3/8" because you own a 3/8" bit. Picking the bit is
                  the real choice; the diameter follows from it. */}
              <Select
                id="drill-bit"
                value={findBitForDiameter(inspectorDraft.diameter)?.id ?? ''}
                onChange={(event) => {
                  const chosen = DRILL_BIT_CATALOG.find((candidate) => candidate.id === event.target.value);
                  if (chosen) setDraft({ ...inspectorDraft, diameter: chosen.diameter });
                }}
              >
                {findBitForDiameter(inspectorDraft.diameter) === undefined && (
                  <option value="">No bit this size</option>
                )}
                {DRILL_BIT_CATALOG.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="property-group">
              <Label>Hole Diameter</Label>
              <FractionInput
                ariaLabel="Hole Diameter"
                value={inspectorDraft.diameter}
                onChange={(diameter) => setDraft({ ...inspectorDraft, diameter })}
                min={0.001}
              />

              {inspectorDraft.depthMode === 'blind' && outOfReachBit && (
                <p className="mt-1 text-[11px] text-warning">
                  {outOfReachBit.name} reaches {formatMeasurementWithUnit(outOfReachBit.maxDepth, units)}; this hole is
                  deeper.
                </p>
              )}
            </div>
            <div className="property-group">
              <Label htmlFor="round-depth-mode">Depth</Label>
              <Select
                id="round-depth-mode"
                value={inspectorDraft.depthMode}
                onChange={(event) =>
                  setDraft({
                    ...inspectorDraft,
                    depthMode: event.target.value as 'through' | 'blind'
                  })
                }
              >
                <option value="through">Through</option>
                <option value="blind">Blind</option>
              </Select>
            </div>
            {inspectorDraft.depthMode === 'blind' && (
              <div className="property-group">
                <Label>Hole Depth</Label>
                <FractionInput
                  ariaLabel="Hole Depth"
                  value={inspectorDraft.depth}
                  onChange={(depth) => setDraft({ ...inspectorDraft, depth })}
                  min={0.001}
                />
              </div>
            )}
            {inspectorDraft.cutType === 'countersink' && (
              <>
                <div className="property-group">
                  <Label>Countersink Major Diameter</Label>
                  <FractionInput
                    ariaLabel="Countersink Major Diameter"
                    value={inspectorDraft.countersinkMajorDiameter}
                    onChange={(countersinkMajorDiameter) => setDraft({ ...inspectorDraft, countersinkMajorDiameter })}
                    min={inspectorDraft.diameter}
                  />
                </div>
                <div className="property-group">
                  <Label htmlFor="countersink-angle">Included Angle</Label>
                  <Input
                    id="countersink-angle"
                    type="number"
                    value={inspectorDraft.countersinkIncludedAngle}
                    onChange={(event) =>
                      setDraft({
                        ...inspectorDraft,
                        countersinkIncludedAngle: Number(event.target.value)
                      })
                    }
                  />
                </div>
              </>
            )}
            {inspectorDraft.cutType === 'counterbore' && (
              <>
                <div className="property-group">
                  <Label>Counterbore Diameter</Label>
                  <FractionInput
                    ariaLabel="Counterbore Diameter"
                    value={inspectorDraft.counterboreDiameter}
                    onChange={(counterboreDiameter) => setDraft({ ...inspectorDraft, counterboreDiameter })}
                    min={inspectorDraft.diameter}
                  />
                </div>
                <div className="property-group">
                  <Label>Counterbore Depth</Label>
                  <FractionInput
                    ariaLabel="Counterbore Depth"
                    value={inspectorDraft.counterboreDepth}
                    onChange={(counterboreDepth) => setDraft({ ...inspectorDraft, counterboreDepth })}
                    min={0}
                  />
                </div>
              </>
            )}
          </>
        )}

        {inspectorDraft.mode === 'rounded_cut' && (
          <>
            <div className="property-group">
              {inspectorDraft.plateJoiner && (
                <p className="text-xs text-text-muted">
                  Plate-joiner slot: length is the blade’s opening at the edge; width is its kerf. The curved ends lie
                  inside the board.
                </p>
              )}
              <Label>Opening Length</Label>
              <FractionInput
                ariaLabel="Opening Length"
                value={inspectorDraft.length}
                onChange={(length) => setDraft({ ...inspectorDraft, length })}
                min={0.001}
              />
            </div>
            <div className="property-group">
              <Label>Opening Width</Label>
              <FractionInput
                ariaLabel="Opening Width"
                value={inspectorDraft.width}
                onChange={(width) => setDraft({ ...inspectorDraft, width })}
                min={0.001}
              />
            </div>
            {inspectorDraft.cutType === 'rounded_rectangle' && (
              <div className="property-group">
                <Label>Corner Radius</Label>
                <FractionInput
                  ariaLabel="Corner Radius"
                  value={inspectorDraft.cornerRadius}
                  onChange={(cornerRadius) => setDraft({ ...inspectorDraft, cornerRadius })}
                  min={0.001}
                />
              </div>
            )}
            <div className="property-group">
              <Label htmlFor="rounded-depth-mode">Depth</Label>
              <Select
                id="rounded-depth-mode"
                value={inspectorDraft.depthMode}
                onChange={(event) =>
                  setDraft({
                    ...inspectorDraft,
                    depthMode: event.target.value as 'through' | 'blind'
                  })
                }
              >
                <option value="through">Through</option>
                <option value="blind">Blind</option>
              </Select>
            </div>
            {inspectorDraft.depthMode === 'blind' && (
              <div className="property-group">
                <Label>Opening Depth</Label>
                <FractionInput
                  ariaLabel="Opening Depth"
                  value={inspectorDraft.depth}
                  onChange={(depth) => setDraft({ ...inspectorDraft, depth })}
                  min={0.001}
                />
              </div>
            )}
          </>
        )}

        {inspectorDraft.mode === 'routed_path' && (
          <>
            <p className="property-group text-[11px] text-text-muted">
              Drag the colored points directly on the part to shape the route. Green is the start; orange points create
              the path and its turns. Use the measurements below when you need exact placement.
            </p>
            <div className="property-group">
              <Label>Bit Profile</Label>
              <RouterBitSelector
                value={inspectorDraft.bitProfile}
                onSelect={(bitProfile) => {
                  const usesShank = bitProfile === 'dovetail' || bitProfile === 't_slot' || bitProfile === 'keyhole';
                  const bitShankDiameter =
                    usesShank && inspectorDraft.bitShankDiameter >= inspectorDraft.bitDiameter
                      ? Math.min(inspectorDraft.bitDiameter / 2, 0.25)
                      : inspectorDraft.bitShankDiameter;
                  let depth = inspectorDraft.depth;
                  if (inspectorDraft.depthMode === 'blind') {
                    if (bitProfile === 'core_box' || bitProfile === 'ball_nose') {
                      depth = Math.min(depth, inspectorDraft.bitDiameter / 2);
                    } else if (bitProfile === 'v_bit' || bitProfile === 'engraving') {
                      depth = Math.min(
                        depth,
                        inspectorDraft.bitDiameter / (2 * Math.tan((inspectorDraft.bitAngle * Math.PI) / 360))
                      );
                    } else if (bitProfile === 'dovetail') {
                      depth = Math.max(
                        depth,
                        (inspectorDraft.bitDiameter - bitShankDiameter) /
                          (2 * Math.tan((inspectorDraft.bitAngle * Math.PI) / 360))
                      );
                    } else if (bitProfile === 't_slot' || bitProfile === 'keyhole') {
                      depth = Math.max(depth, inspectorDraft.bitCutterHeight);
                    }
                  }
                  setDraft({
                    ...inspectorDraft,
                    bitProfile,
                    bitShankDiameter,
                    depth
                  });
                }}
              />
            </div>
            <div className="property-group">
              <Label>Cutter Diameter</Label>
              <FractionInput
                ariaLabel="Cutter Diameter"
                value={inspectorDraft.bitDiameter}
                onChange={(bitDiameter) => setDraft({ ...inspectorDraft, bitDiameter })}
                min={0.001}
              />
              <p className="mt-1 text-[11px] text-text-muted">Maximum width cut by the bit.</p>
            </div>
            {['dovetail', 't_slot', 'keyhole'].includes(inspectorDraft.bitProfile) && (
              <div className="property-group">
                <Label>Shank Diameter</Label>
                <FractionInput
                  ariaLabel="Shank Diameter"
                  value={inspectorDraft.bitShankDiameter}
                  onChange={(bitShankDiameter) => setDraft({ ...inspectorDraft, bitShankDiameter })}
                  min={0.001}
                />
                <p className="mt-1 text-[11px] text-text-muted">
                  Width of the neck that passes through the entry slot.
                </p>
              </div>
            )}
            {(['v_bit', 'engraving', 'dovetail'] as const).some((profile) => profile === inspectorDraft.bitProfile) && (
              <div className="property-group">
                <Label htmlFor="router-bit-angle">Included Angle</Label>
                <JointAngleInput
                  id="router-bit-angle"
                  limit={179}
                  minimum={1}
                  value={inspectorDraft.bitAngle}
                  onChange={(bitAngle) => setDraft({ ...inspectorDraft, bitAngle })}
                />
                {inspectorDraft.bitProfile === 'dovetail' && (
                  <p className="mt-1 text-[11px] text-text-muted">Full angle between the two sloped cutting faces.</p>
                )}
              </div>
            )}
            {(inspectorDraft.bitProfile === 't_slot' || inspectorDraft.bitProfile === 'keyhole') && (
              <div className="property-group">
                <Label>Cutter Height</Label>
                <FractionInput
                  ariaLabel="Cutter Height"
                  value={inspectorDraft.bitCutterHeight}
                  onChange={(bitCutterHeight) => setDraft({ ...inspectorDraft, bitCutterHeight })}
                  min={0.001}
                />
                <p className="mt-1 text-[11px] text-text-muted">
                  Height of the wider cutter below the narrow entry slot.
                </p>
              </div>
            )}
            <div className="property-group">
              <Label htmlFor="routed-path-depth-mode">Depth</Label>
              <Select
                id="routed-path-depth-mode"
                value={inspectorDraft.depthMode}
                onChange={(event) =>
                  setDraft({ ...inspectorDraft, depthMode: event.target.value as 'through' | 'blind' })
                }
              >
                <option value="blind">Blind</option>
                <option value="through">Through</option>
              </Select>
            </div>
            {inspectorDraft.depthMode === 'blind' && (
              <div className="property-group">
                <Label>Route Depth</Label>
                <FractionInput
                  ariaLabel="Route Depth"
                  value={inspectorDraft.depth}
                  onChange={(depth) => setDraft({ ...inspectorDraft, depth })}
                  min={0.001}
                />
              </div>
            )}
          </>
        )}

        {inspectorDraft.mode === 'edge_profile' && (
          <>
            <p className="property-group text-[11px] text-text-muted">
              Select an edge directly on the part or use the edge controls above, then choose its finished profile.
            </p>
            <div className="property-group">
              <Label>Edge Profile</Label>
              <EdgeProfileSelector
                value={inspectorDraft.profile}
                customProfileId={inspectorDraft.routerProfileId}
                onSelect={(profile, customProfile) =>
                  setDraft({
                    ...inspectorDraft,
                    profile,
                    routerProfileId: customProfile?.id,
                    routerProfileRevision: customProfile ? getRouterProfileRevision(customProfile) : undefined,
                    routerProfileSnapshot: customProfile
                  })
                }
              />
            </div>
            <EdgeProfileLibraryControls
              draft={inspectorDraft}
              features={draftFeatures}
              part={part}
              onChange={setDraft}
              onBatchChange={onDraftFeaturesChange}
            />
            <div className="property-group">
              <Label>Profile Size</Label>
              <FractionInput
                ariaLabel="Profile Size"
                value={inspectorDraft.size}
                onChange={(size) => setDraft({ ...inspectorDraft, size })}
                min={0.001}
              />
              <p className="mt-1 text-[11px] text-text-muted">
                Radius for curved profiles; shoulder width for chamfers and rabbets.
              </p>
            </div>
            <div className="property-group">
              <Label>Profile Depth</Label>
              <FractionInput
                ariaLabel="Profile Depth"
                value={inspectorDraft.depth}
                onChange={(depth) => setDraft({ ...inspectorDraft, depth })}
                min={0.001}
              />
            </div>
          </>
        )}

        {inspectorDraft.mode === 'rect_cut' && (
          <>
            {inspectorUsesBlindOnlyDepth ? (
              <div className="property-group">
                <label>Depth</label>
                <div className="text-sm text-text">Blind only</div>
                <p className="mt-1 text-[11px] text-text-muted">
                  This operation cuts from one face into the blank and does not pass through.
                </p>
              </div>
            ) : !inspectorHidesDepthSelector ? (
              <div className="property-group">
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

            <div className="property-group">
              <Label>{runLabel}</Label>
              <FractionInput
                ariaLabel={runLabel}
                value={
                  inspectorDraft.cutType === 'rabbet'
                    ? (rabbetShoulderValue ?? 0.5)
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

            <div className="property-group">
              <Label>{crossLabel}</Label>
              {inspectorDraft.cutType === 'stopped_dado' ? (
                <div className="text-sm text-text">{formatMeasurementWithUnit(inspectorDraft.sizeWidth, units)}</div>
              ) : inspectorUsesDerivedCrossWidth ? (
                <div className="text-sm text-text">
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
                  ariaLabel={crossInputLabel}
                  value={inspectorDraft.sizeWidth}
                  onChange={(value) => updateRectDraft({ sizeWidth: value })}
                  min={0.125}
                />
              )}
              {['dado', 'rabbet'].includes(inspectorDraft.cutType) && (
                <p className="mt-1 text-[11px] text-text-muted">
                  {inspectorDraft.cutType === 'dado' || inspectorDraft.cutType === 'stopped_dado'
                    ? 'Derived from blank width.'
                    : 'Runs the full edge length.'}
                </p>
              )}
            </div>

            {inspectorDraft.cutType === 'stopped_dado' && (
              <>
                <div className="property-group">
                  <Label>Stop from Back Edge</Label>
                  <FractionInput
                    ariaLabel="Stop from Back Edge"
                    value={inspectorDraft.placementZ}
                    min={0}
                    max={inspectorDraft.placementZ + inspectorDraft.sizeWidth - 0.125}
                    onChange={(stop) =>
                      updateRectDraft({
                        placementZ: stop,
                        sizeWidth: inspectorDraft.sizeWidth + inspectorDraft.placementZ - stop
                      })
                    }
                  />
                </div>
                <div className="property-group">
                  <Label>Stop from Front Edge</Label>
                  <FractionInput
                    ariaLabel="Stop from Front Edge"
                    value={part.width - inspectorDraft.placementZ - inspectorDraft.sizeWidth}
                    min={0}
                    max={part.width - inspectorDraft.placementZ - 0.125}
                    onChange={(stop) => updateRectDraft({ sizeWidth: part.width - inspectorDraft.placementZ - stop })}
                  />
                </div>
                <p className="text-xs text-text-muted">
                  Notch the shelf where the housing stops, or shorten its tongue to clear those ends. Allow for the
                  cutter radius at routed stops. The shelf is not changed automatically.
                </p>
              </>
            )}

            {isRoundablePocket && (
              <div className="property-group">
                <Label htmlFor="pocket-corners">Corners</Label>
                {/* How it is cut decides its shape, and the mating tenon has
                    to match: a routed pocket has round ends. */}
                <Select
                  id="pocket-corners"
                  value={inspectorDraft.cornerRadius > 0 ? 'routed' : 'square'}
                  onChange={(event) =>
                    updateRectDraft({
                      cornerRadius: event.target.value === 'routed' ? routedCornerRadius : 0
                    })
                  }
                >
                  <option value="square">Square (chopped)</option>
                  <option value="routed">Rounded (routed)</option>
                </Select>
                {inspectorDraft.cornerRadius > 0 ? (
                  <p className="mt-1 text-[11px] text-text-muted">
                    A bit leaves {formatMeasurementWithUnit(inspectorDraft.cornerRadius, units)} radius corners. Round
                    the mating tenon to match, or chop these square.
                  </p>
                ) : null}
              </div>
            )}

            {isRoundablePocket && inspectorDraft.cornerRadius > 0 && (
              <div className="property-group">
                <Label>Corner Radius</Label>
                <FractionInput
                  ariaLabel="Corner Radius"
                  value={inspectorDraft.cornerRadius}
                  onChange={(cornerRadius) => updateRectDraft({ cornerRadius })}
                  min={0.0156}
                />
              </div>
            )}

            {inspectorDraft.depthMode === 'blind' &&
              (inspectorUsesDerivedDepth ? (
                <div className="property-group">
                  <Label>Depth</Label>
                  <div className="text-sm text-text">{formatMeasurementWithUnit(inspectorDraft.depth, units)}</div>
                  <p className="mt-1 text-[11px] text-text-muted">
                    Half the board thickness. Two laps cut this way meet flush.
                  </p>
                </div>
              ) : (
                <div className="property-group">
                  <Label>{blindDepthLabel}</Label>
                  <FractionInput
                    ariaLabel={blindDepthLabel}
                    value={inspectorDraft.depth}
                    onChange={(value) => updateRectDraft({ depth: value })}
                    min={0.001}
                  />
                </div>
              ))}
          </>
        )}
      </div>

      {inspectorDraft.mode === 'rect_cut' &&
        ['cutout', 'mortise', 'dado', 'stopped_dado', 'groove', 'stopped_groove'].includes(inspectorDraft.cutType) && (
          <details
            className="properties-card"
            open={Boolean(inspectorDraft.wallAngle || inspectorDraft.sideWallAngle || inspectorDraft.taperAngle)}
          >
            <summary className="cursor-pointer text-sm font-semibold">Dovetail shaping</summary>
            <p className="my-2 text-[11px] text-text-muted">
              Angles are measured from square. Leave them at zero for straight sockets.
            </p>
            {(
              [
                [
                  'taperAngle',
                  'Tail Splay',
                  'Flare the socket across the face along its run. Positive widens toward the far end.',
                  30
                ],
                [
                  'sideWallAngle',
                  'Socket Side Angle',
                  'Lean the long walls through the cut depth. Positive widens at the floor; negative narrows.',
                  45
                ],
                [
                  'wallAngle',
                  'Socket End Angle',
                  'Lean the end walls through the cut depth, as for a sliding dovetail housing. Positive widens at the floor.',
                  45
                ]
              ] as const
            ).map(([field, label, help, limit]) => (
              <div className="property-group" key={field}>
                <Label htmlFor={`cut-${field}`}>{label}</Label>
                <JointAngleInput
                  key={`${inspectorDraft.featureId}-${field}`}
                  id={`cut-${field}`}
                  limit={limit}
                  value={inspectorDraft[field] ?? 0}
                  onChange={(value) => updateRectDraft({ [field]: value })}
                />
                <p className="mt-1 text-[11px] text-text-muted">{help}</p>
              </div>
            ))}
          </details>
        )}

      {inspectorDraft.mode === 'routed_path' && (
        <div className="properties-card">
          <div className="property-group">
            <div className="flex items-center justify-between gap-2">
              <label>Path Points</label>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => {
                  const last = inspectorDraft.points.at(-1) ?? { primary: 0, secondary: 0 };
                  setDraft({
                    ...inspectorDraft,
                    points: [
                      ...inspectorDraft.points,
                      { primary: last.primary + 1, secondary: last.secondary, cornerRadius: 0 }
                    ]
                  });
                }}
              >
                Add Point
              </Button>
            </div>
            <p className="mt-1 text-[11px] text-text-muted">Coordinates are measured from the center of the face.</p>
          </div>
          <CircleRouteLayout
            key={inspectorDraft.featureId}
            onApply={(points) => setDraft({ ...inspectorDraft, points, closed: true })}
          />
          {inspectorDraft.points.map((point, index) => (
            <div className="property-group" key={index}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-text">Point {index + 1}</span>
                {inspectorDraft.points.length > 2 && (
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    aria-label={`Remove point ${index + 1}`}
                    onClick={() => {
                      const remaining = inspectorDraft.points.filter((_, pointIndex) => pointIndex !== index);
                      const closed = inspectorDraft.closed && remaining.length >= 3;
                      setDraft({
                        ...inspectorDraft,
                        closed,
                        points: closed
                          ? remaining
                          : remaining.map((candidate, pointIndex) =>
                              pointIndex === 0 || pointIndex === remaining.length - 1
                                ? { ...candidate, cornerRadius: 0 }
                                : candidate
                            )
                      });
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <FractionInput
                  ariaLabel={`Point ${index + 1} along face`}
                  min={-Infinity}
                  value={point.primary}
                  onChange={(primary) =>
                    setDraft({
                      ...inspectorDraft,
                      points: inspectorDraft.points.map((candidate, pointIndex) =>
                        pointIndex === index ? { ...candidate, primary } : candidate
                      )
                    })
                  }
                />
                <FractionInput
                  ariaLabel={`Point ${index + 1} across face`}
                  min={-Infinity}
                  value={point.secondary}
                  onChange={(secondary) =>
                    setDraft({
                      ...inspectorDraft,
                      points: inspectorDraft.points.map((candidate, pointIndex) =>
                        pointIndex === index ? { ...candidate, secondary } : candidate
                      )
                    })
                  }
                />
              </div>
              <div className="mt-2">
                <FractionInput
                  ariaLabel={`Point ${index + 1} corner radius`}
                  value={point.cornerRadius ?? 0}
                  onChange={(cornerRadius) =>
                    setDraft({
                      ...inspectorDraft,
                      points: inspectorDraft.points.map((candidate, pointIndex) =>
                        pointIndex === index ? { ...candidate, cornerRadius: Math.max(0, cornerRadius) } : candidate
                      )
                    })
                  }
                  min={0}
                  disabled={!inspectorDraft.closed && (index === 0 || index === inspectorDraft.points.length - 1)}
                />
                {!inspectorDraft.closed && (index === 0 || index === inspectorDraft.points.length - 1) && (
                  <p className="mt-1 text-[11px] text-text-muted">Open-path endpoints do not form corners.</p>
                )}
              </div>
            </div>
          ))}
          <div className="property-group flex items-center gap-2">
            <Checkbox
              id="routed-path-closed"
              checked={inspectorDraft.closed}
              disabled={!inspectorDraft.closed && inspectorDraft.points.length < 3}
              onChange={(event) => {
                const closed = event.target.checked;
                setDraft({
                  ...inspectorDraft,
                  closed,
                  points: closed
                    ? inspectorDraft.points
                    : inspectorDraft.points.map((point, index) =>
                        index === 0 || index === inspectorDraft.points.length - 1
                          ? { ...point, cornerRadius: 0 }
                          : point
                      )
                });
              }}
            />
            <Label htmlFor="routed-path-closed">Close path back to first point</Label>
            {!inspectorDraft.closed && inspectorDraft.points.length < 3 ? (
              <p className="text-[11px] text-text-muted">Add at least three points to make a closed route.</p>
            ) : null}
          </div>
        </div>
      )}

      {/* Where it sits on the blank. */}
      {(inspectorDraft.mode === 'circular_cut' ||
        inspectorDraft.mode === 'rounded_cut' ||
        (inspectorDraft.mode === 'rect_cut' &&
          (showRectOffsets || inspectorDraft.cutType === 'edge_notch' || showBlindRecessNote))) && (
        <div className="properties-card">
          {(inspectorDraft.mode === 'circular_cut' || inspectorDraft.mode === 'rounded_cut') && (
            <>
              <div className="property-group">
                <Label>Offset Along Face</Label>
                <FractionInput
                  ariaLabel="Offset Along Face"
                  min={-Infinity}
                  value={inspectorDraft.placementPrimary}
                  onChange={(placementPrimary) => setDraft({ ...inspectorDraft, placementPrimary })}
                />
              </div>
              <div className="property-group">
                <Label>Offset Across Face</Label>
                <FractionInput
                  ariaLabel="Offset Across Face"
                  min={-Infinity}
                  value={inspectorDraft.placementSecondary}
                  onChange={(placementSecondary) => setDraft({ ...inspectorDraft, placementSecondary })}
                />
              </div>
            </>
          )}

          {inspectorDraft.mode === 'circular_cut' && (
            <>
              <div className="property-group">
                <Label htmlFor="hole-tilt">Drill angle from face (degrees)</Label>
                <Input
                  id="hole-tilt"
                  type="number"
                  min={1}
                  max={90}
                  value={90 - inspectorDraft.tilt}
                  onChange={(event) => setDraft({ ...inspectorDraft, tilt: 90 - Number(event.target.value) })}
                />
                <p className="text-[11px] text-text-muted">
                  90° drills square into the face. A 15° pocket hole runs nearly along it.
                </p>
                <svg
                  viewBox="0 0 180 70"
                  role="img"
                  aria-label="Drilling angle measured from the board face"
                  className="h-16 w-full"
                >
                  <path d="M15 55 H165 V65 H15 Z" fill="currentColor" opacity=".2" />
                  <path d="M35 55 L145 25 M35 55 H95" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path d="M75 55 A40 40 0 0 0 74 44" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
                  <text x="82" y="44" fill="currentColor" fontSize="11">
                    15° from face
                  </text>
                </svg>
              </div>
              <div className="property-group">
                <Label htmlFor="hole-direction">Drill direction across face (degrees)</Label>
                <Input
                  id="hole-direction"
                  type="number"
                  value={inspectorDraft.direction}
                  onChange={(event) => setDraft({ ...inspectorDraft, direction: Number(event.target.value) })}
                />
              </div>
            </>
          )}

          {inspectorDraft.mode === 'rounded_cut' && (
            <div className="property-group">
              <Label htmlFor="rounded-rotation">Rotation (degrees)</Label>
              <Input
                id="rounded-rotation"
                type="number"
                value={inspectorDraft.rotation}
                onChange={(event) => setDraft({ ...inspectorDraft, rotation: Number(event.target.value) })}
              />
            </div>
          )}

          {inspectorDraft.mode === 'rect_cut' && inspectorDraft.cutType === 'edge_notch' && (
            <div className="property-group">
              <Label>{edgeNotchOffsetLabel}</Label>
              <FractionInput
                ariaLabel={edgeNotchOffsetLabel}
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

          {inspectorDraft.mode === 'rect_cut' && showRectOffsets && (
            <>
              {inspectorDraft.cutType !== 'tenon' && inspectorDraft.cutType !== 'groove' && (
                <div className="property-group">
                  <Label>Offset Along Length</Label>
                  <FractionInput
                    ariaLabel="Offset Along Length"
                    value={inspectorDraft.placementX}
                    onChange={(value) => updateRectDraft({ placementX: value })}
                    min={0}
                  />
                  {inspectorDraft.cutType === 'dado' && (
                    <p className="mt-1 text-[11px] text-text-muted">
                      Measure from the left end to the near edge of the dado.
                    </p>
                  )}
                </div>
              )}
              {!['dado', 'stopped_dado'].includes(inspectorDraft.cutType) && (
                <div className="property-group">
                  <Label>{acrossOffsetLabel}</Label>
                  <FractionInput
                    ariaLabel={acrossOffsetLabel}
                    value={inspectorDraft.placementZ}
                    onChange={(value) => updateRectDraft({ placementZ: value })}
                    min={0}
                  />
                  {inspectorDraft.cutType === 'groove' && (
                    <p className="mt-1 text-[11px] text-text-muted">
                      Measure from the {isSideFace ? 'bottom' : 'back'} edge to the near edge of the groove.
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {showBlindRecessNote && (
            <p className="text-[11px] text-text-muted">
              {isSideFace
                ? 'Depth is measured into the board width from the face you picked.'
                : 'Depth is measured into the board thickness from the face you picked.'}
            </p>
          )}
        </div>
      )}

      {/* Repeating the hole, when it repeats. */}
      {inspectorDraft.mode === 'circular_cut' && (
        <div className="properties-card">
          <div className="property-group">
            <Label htmlFor="hole-pattern">Repeating Pattern</Label>
            <Select
              id="hole-pattern"
              value={inspectorDraft.pattern?.type ?? 'none'}
              onChange={(event) => {
                const type = event.target.value;
                setDraft({
                  ...inspectorDraft,
                  pattern:
                    type === 'linear'
                      ? { type: 'linear', count: 2, spacing: 1, direction: 0 }
                      : type === 'grid'
                        ? {
                            type: 'grid',
                            rows: 2,
                            columns: 2,
                            rowSpacing: 1,
                            columnSpacing: 1,
                            rotation: 0
                          }
                        : type === 'circular'
                          ? { type: 'circular', count: 4, radius: 1, startAngle: 0 }
                          : undefined
                });
              }}
            >
              <option value="none">Single hole</option>
              <option value="linear">Linear</option>
              <option value="grid">Grid</option>
              <option value="circular">Around a circle</option>
            </Select>
          </div>

          {inspectorDraft.pattern?.type === 'linear' && (
            <>
              <div className="property-group">
                <Label htmlFor="linear-count">Hole Count</Label>
                <Input
                  id="linear-count"
                  type="number"
                  min={1}
                  max={128}
                  value={inspectorDraft.pattern.count}
                  onChange={(event) =>
                    setDraft({
                      ...inspectorDraft,
                      pattern: {
                        ...inspectorDraft.pattern!,
                        count: Number(event.target.value)
                      } as never
                    })
                  }
                />
              </div>
              <div className="property-group">
                <Label>Spacing</Label>
                <FractionInput
                  ariaLabel="Spacing"
                  value={inspectorDraft.pattern.spacing}
                  onChange={(spacing) =>
                    setDraft({
                      ...inspectorDraft,
                      pattern: { ...inspectorDraft.pattern!, spacing } as never
                    })
                  }
                  min={0}
                />
              </div>
              <div className="property-group">
                <Label htmlFor="linear-direction">Direction</Label>
                <Input
                  id="linear-direction"
                  type="number"
                  value={inspectorDraft.pattern.direction}
                  onChange={(event) =>
                    setDraft({
                      ...inspectorDraft,
                      pattern: {
                        ...inspectorDraft.pattern!,
                        direction: Number(event.target.value)
                      } as never
                    })
                  }
                />
              </div>
            </>
          )}

          {gridPattern && (
            <>
              {(['rows', 'columns'] as const).map((field) => (
                <div className="property-group" key={field}>
                  <Label htmlFor={`grid-${field}`}>{field === 'rows' ? 'Rows' : 'Columns'}</Label>
                  <Input
                    id={`grid-${field}`}
                    type="number"
                    min={1}
                    max={128}
                    value={gridPattern[field]}
                    onChange={(event) =>
                      setDraft({
                        ...inspectorDraft,
                        pattern: {
                          ...gridPattern,
                          [field]: Number(event.target.value)
                        }
                      })
                    }
                  />
                </div>
              ))}
              <div className="property-group">
                <Label>Row Spacing</Label>
                <FractionInput
                  ariaLabel="Row Spacing"
                  value={gridPattern.rowSpacing}
                  onChange={(rowSpacing) =>
                    setDraft({
                      ...inspectorDraft,
                      pattern: { ...gridPattern, rowSpacing }
                    })
                  }
                  min={0.001}
                />
              </div>
              <div className="property-group">
                <Label>Column Spacing</Label>
                <FractionInput
                  ariaLabel="Column Spacing"
                  value={gridPattern.columnSpacing}
                  onChange={(columnSpacing) =>
                    setDraft({
                      ...inspectorDraft,
                      pattern: { ...gridPattern, columnSpacing }
                    })
                  }
                  min={0.001}
                />
              </div>
              <div className="property-group">
                <Label htmlFor="grid-rotation">Grid Rotation</Label>
                <Input
                  id="grid-rotation"
                  type="number"
                  value={gridPattern.rotation}
                  onChange={(event) =>
                    setDraft({
                      ...inspectorDraft,
                      pattern: {
                        ...gridPattern,
                        rotation: Number(event.target.value)
                      }
                    })
                  }
                />
              </div>
            </>
          )}

          {inspectorDraft.pattern?.type === 'circular' && (
            <>
              <div className="property-group">
                <Label htmlFor="circular-count">Hole Count</Label>
                <Input
                  id="circular-count"
                  type="number"
                  min={1}
                  max={128}
                  value={inspectorDraft.pattern.count}
                  onChange={(event) =>
                    setDraft({
                      ...inspectorDraft,
                      pattern: {
                        ...inspectorDraft.pattern!,
                        count: Number(event.target.value)
                      } as never
                    })
                  }
                />
              </div>
              <div className="property-group">
                <Label>Pattern Radius</Label>
                <FractionInput
                  ariaLabel="Pattern Radius"
                  value={inspectorDraft.pattern.radius}
                  onChange={(radius) =>
                    setDraft({
                      ...inspectorDraft,
                      pattern: { ...inspectorDraft.pattern!, radius } as never
                    })
                  }
                  min={0.001}
                />
              </div>
              <div className="property-group">
                <Label htmlFor="circular-start-angle">Start Angle</Label>
                <Input
                  id="circular-start-angle"
                  type="number"
                  value={inspectorDraft.pattern.startAngle}
                  onChange={(event) =>
                    setDraft({
                      ...inspectorDraft,
                      pattern: {
                        ...inspectorDraft.pattern!,
                        startAngle: Number(event.target.value)
                      } as never
                    })
                  }
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* What the angle leaves behind, for the cuts that shorten a board. */}
      {edgeBevelPreviewMeasurements && (
        <div className="properties-card">
          <div className="property-group">
            <label>Resulting Widths</label>
            <div className="flex flex-col gap-0.5 text-[11px] text-text-muted">
              <span>Blank {formatMeasurementWithUnit(part.width, units)}</span>
              <span>Long Point {formatMeasurementWithUnit(edgeBevelPreviewMeasurements.longPoint, units)}</span>
              <span>Short Point {formatMeasurementWithUnit(edgeBevelPreviewMeasurements.shortPoint, units)}</span>
            </div>
            <p className="mt-1.5 text-[11px] text-text-muted">
              Long point stays locked to the board width. The bevel only tilts the shaped edge.
            </p>
          </div>
        </div>
      )}

      {endCutPreviewMeasurements && (
        <div className="properties-card">
          <div className="property-group">
            <label>Resulting Lengths</label>
            <div className="flex flex-col gap-0.5 text-[11px] text-text-muted">
              <span>Blank {formatMeasurementWithUnit(endCutPreviewMeasurements.blank, units)}</span>
              <span>Long Point {formatMeasurementWithUnit(endCutPreviewMeasurements.longPoint, units)}</span>
              <span>Short Point {formatMeasurementWithUnit(endCutPreviewMeasurements.shortPoint, units)}</span>
            </div>
            <p className="mt-1.5 text-[11px] text-text-muted">
              {preservedEndCutReferenceNote ??
                'Long point stays locked to the board length. The angle only changes the shaped end.'}
            </p>
          </div>
        </div>
      )}

      {draftValidationMessage && (
        <div role="alert" className="properties-card border-danger/30 bg-danger/5 text-[11px] text-danger">
          {draftValidationMessage}
          {inspectorDraft.mode === 'rect_cut' &&
            (!Number.isFinite(inspectorDraft.placementX) || !Number.isFinite(inspectorDraft.placementZ)) && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2 block"
                onClick={() =>
                  setDraft((current) =>
                    current?.mode === 'rect_cut'
                      ? {
                          ...current,
                          placementX: Number.isFinite(current.placementX) ? current.placementX : 0,
                          placementZ: Number.isFinite(current.placementZ) ? current.placementZ : 0
                        }
                      : current
                  )
                }
              >
                Reset invalid offsets to zero
              </Button>
            )}
        </div>
      )}
    </aside>
  );
}
