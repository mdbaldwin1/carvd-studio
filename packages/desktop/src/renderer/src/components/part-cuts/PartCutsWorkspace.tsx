import { FractionInput } from '@renderer/components/common/FractionInput';
import { PartCutsPreviewCanvas } from '@renderer/components/part-cuts/PartCutsPreviewCanvas';
import { DowelJointDialog } from '@renderer/components/part-cuts/DowelJointDialog';
import { useProjectStore } from '@renderer/store/projectStore';
import { useSelectionStore } from '@renderer/store/selectionStore';
import {
  EDGE_NOTCH_SIDE_LABELS,
  EDGE_NOTCH_SIDES,
  edgeNotchSideToTarget,
  edgeTargetToSide,
  END_TARGETS,
  FACE_TARGETS,
  FeatureDraft,
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
import { cn } from '@renderer/lib/utils';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Select } from '@renderer/components/ui/select';
import { EndCutFeature, RectCutFeature } from '@renderer/types';
import {} from '@renderer/utils/endCutUtils';
import { formatMeasurementWithUnit } from '@renderer/utils/fractions';
import { usePartCutsEditor } from './PartCutsEditorContext';
import { CORNER_LABELS, EDGE_LABELS, FACE_LABELS } from '@renderer/utils/partFeatureSummary';
import {} from '@renderer/utils/rectCutUtils';
import {} from '@renderer/components/ui/dropdown-menu';

function getDraftStepTitle(draft: FeatureDraft): string {
  if (draft.mode === 'end_cut')
    return isEdgeBevelTarget(draft.targetFace)
      ? 'Step 2: Pick the edge and set the bevel angle'
      : 'Step 2: Pick the end and set the angle';
  if (draft.mode === 'circular_cut') return 'Step 2: Pick a face and place the hole';
  if (draft.mode === 'rounded_cut') return 'Step 2: Pick a face and size the rounded opening';

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
  if (draft.mode === 'circular_cut') {
    return 'Choose any face, then set diameter, depth, angle, placement, and an optional repeating pattern.';
  }
  if (draft.mode === 'rounded_cut') {
    return 'Choose any face, then set the profile size, corner shape, depth, placement, and rotation.';
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

/**
 * The cut editor's viewport. The list, the type picker, and the inspector live
 * in the sidebar, a dialog, and the properties panel, sharing state through
 * PartCutsEditorProvider.
 */
export function PartCutsWorkspace() {
  const {
    part,
    draftFeatures,
    units,
    hoveredTarget,
    pendingTarget,
    onDraftFeaturesChange,
    onHoveredTargetChange,
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
    availableCornerTargets,
    availableEdgeTargets,
    availableFaceTargets,
    draftValidationMessage,
    endCutPreviewMeasurements,
    edgeBevelPreviewMeasurements,
    isEndCutHighPointOnTop,
    getVerticalFlipFromHighPoint,
    featureConflicts,
    handleStartPreset,
    handleSaveDraft,
    updateRectDraft,
    inspectorDraft,
    isChoosingCutType,
    isEditingDraft,
    handlePreviewTargetActivation,
    handleCancelEditor,
    selectedFeatureSummary,
    selectedFeatureTargetLabel,
    rabbetRunsAlongLength,
    rabbetShoulderValue,
    inspectorUsesBlindOnlyDepth,
    inspectorHidesDepthSelector,
    inspectorUsesDerivedCrossWidth,
    preservedEndCutReferenceNote
  } = usePartCutsEditor();

  return (
    <div
      ref={workspaceRootRef}
      tabIndex={-1}
      role="region"
      aria-label={`Part cuts for ${part.name}`}
      className="app-main flex min-h-0 flex-1 bg-bg outline-none"
    >
      {/* The preview fills the canvas area like the project's 3D view. The
          part it belongs to is named in the sidebar above its cut list, so
          nothing frames the model here. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
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

        {/* Only the type picker and the inspector live here now; the cut list
            is a sidebar section, and Add Cut opens from it. */}
        {panelMode !== 'list' && (
          <Card className="flex min-h-0 w-[420px] flex-col">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>{panelMode === 'add' ? 'Add Cut' : 'Edit Cut'}</CardTitle>
                  <CardDescription>
                    {panelMode === 'add' && !draft
                      ? 'Step 1: choose the kind of cut you want to add.'
                      : inspectorDraft
                        ? getDraftStepDescription(inspectorDraft)
                        : 'Finish this cut, then save it back to the cut list.'}
                  </CardDescription>
                </div>
                <Button variant="ghost" onClick={handleCancelEditor}>
                  Back to Cuts
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
              {isChoosingCutType && (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-base font-semibold text-text">What kind of cut?</h3>
                    <p className="mt-1 text-sm text-text-secondary">
                      Pick the cut type first. The next step will walk through the right target and measurements.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    {(
                      [
                        { group: 'Ends & Edges', presets: ['end_cut', 'edge_bevel', 'tenon'] },
                        {
                          group: 'Channels & Laps',
                          presets: ['dado', 'stopped_dado', 'groove', 'stopped_groove', 'half_lap']
                        },
                        { group: 'Edges & Corners', presets: ['rabbet', 'edge_notch', 'corner_notch'] },
                        { group: 'Pockets & Openings', presets: ['mortise', 'cutout'] },
                        { group: 'Round Cuts', presets: ['round_hole', 'countersink', 'counterbore'] },
                        { group: 'Rounded Openings', presets: ['rounded_slot', 'rounded_rectangle'] }
                      ] as Array<{ group: string; presets: OperationPreset[] }>
                    ).map(({ group, presets }) => (
                      <div key={group}>
                        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                          {group}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {presets.map((preset, presetIndex) => (
                            <button
                              key={preset}
                              type="button"
                              className={cn(
                                'rounded-md border border-border bg-bg px-3 py-2 text-left transition-colors hover:border-accent hover:bg-accent/5',
                                // Let an odd trailing tile fill the row instead of
                                // leaving a hole beside it.
                                presets.length % 2 === 1 && presetIndex === presets.length - 1 && 'col-span-2'
                              )}
                              onClick={() => handleStartPreset(preset)}
                            >
                              <div className="text-sm font-semibold text-text">{getOperationPresetLabel(preset)}</div>
                              <div className="mt-0.5 text-[11px] leading-snug text-text-muted">
                                {getOperationPresetHint(preset)}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div>
                      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                        Joinery
                      </div>
                      <button
                        type="button"
                        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-left transition-colors hover:enabled:border-accent hover:enabled:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => setShowDowelDialog(true)}
                        disabled={hasUnsavedChanges}
                        aria-describedby={hasUnsavedChanges ? 'dowel-joint-dirty-draft-message' : undefined}
                      >
                        <div className="text-sm font-semibold text-text">Create Dowel Joint</div>
                        <div
                          id={hasUnsavedChanges ? 'dowel-joint-dirty-draft-message' : undefined}
                          className="mt-0.5 text-[11px] leading-snug text-text-muted"
                        >
                          {hasUnsavedChanges
                            ? 'Save or discard part changes first'
                            : 'Add matching holes to this part and a mating part in one step.'}
                        </div>
                      </button>
                    </div>
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

                    {(inspectorDraft.mode === 'circular_cut' || inspectorDraft.mode === 'rounded_cut') && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {(inspectorDraft.mode === 'rounded_cut' ? ['top_face', 'bottom_face'] : FACE_TARGETS).map(
                          (target) => (
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
                          )
                        )}
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
                                      // Set, never toggle: toggling makes the same
                                      // typed value produce opposite geometry
                                      // depending on history. Matches the mitre
                                      // handler above.
                                      verticalFlip: nextAngle < 0 ? true : inspectorDraft.verticalFlip
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
                                  Short Point{' '}
                                  {formatMeasurementWithUnit(edgeBevelPreviewMeasurements.shortPoint, units)}
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

                      {inspectorDraft.mode === 'circular_cut' && (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Hole Diameter</Label>
                              <FractionInput
                                ariaLabel="Hole Diameter"
                                value={inspectorDraft.diameter}
                                onChange={(diameter) => setDraft({ ...inspectorDraft, diameter })}
                                min={0.001}
                              />
                            </div>
                            <div>
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
                          </div>
                          {inspectorDraft.depthMode === 'blind' && (
                            <div>
                              <Label>Hole Depth</Label>
                              <FractionInput
                                ariaLabel="Hole Depth"
                                value={inspectorDraft.depth}
                                onChange={(depth) => setDraft({ ...inspectorDraft, depth })}
                                min={0.001}
                              />
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor="hole-tilt">Tilt From Square (degrees)</Label>
                              <Input
                                id="hole-tilt"
                                type="number"
                                min={0}
                                max={89}
                                value={inspectorDraft.tilt}
                                onChange={(event) => setDraft({ ...inspectorDraft, tilt: Number(event.target.value) })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="hole-direction">Tilt Toward (degrees)</Label>
                              <Input
                                id="hole-direction"
                                type="number"
                                value={inspectorDraft.direction}
                                onChange={(event) =>
                                  setDraft({ ...inspectorDraft, direction: Number(event.target.value) })
                                }
                              />
                            </div>
                          </div>
                          {inspectorDraft.cutType === 'countersink' && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>Countersink Major Diameter</Label>
                                <FractionInput
                                  ariaLabel="Countersink Major Diameter"
                                  value={inspectorDraft.countersinkMajorDiameter}
                                  onChange={(countersinkMajorDiameter) =>
                                    setDraft({ ...inspectorDraft, countersinkMajorDiameter })
                                  }
                                  min={inspectorDraft.diameter}
                                />
                              </div>
                              <div>
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
                            </div>
                          )}
                          {inspectorDraft.cutType === 'counterbore' && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>Counterbore Diameter</Label>
                                <FractionInput
                                  ariaLabel="Counterbore Diameter"
                                  value={inspectorDraft.counterboreDiameter}
                                  onChange={(counterboreDiameter) =>
                                    setDraft({ ...inspectorDraft, counterboreDiameter })
                                  }
                                  min={inspectorDraft.diameter}
                                />
                              </div>
                              <div>
                                <Label>Counterbore Depth</Label>
                                <FractionInput
                                  ariaLabel="Counterbore Depth"
                                  value={inspectorDraft.counterboreDepth}
                                  onChange={(counterboreDepth) => setDraft({ ...inspectorDraft, counterboreDepth })}
                                  min={0}
                                />
                              </div>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Offset Along Face</Label>
                              <FractionInput
                                ariaLabel="Offset Along Face"
                                value={inspectorDraft.placementPrimary}
                                onChange={(placementPrimary) => setDraft({ ...inspectorDraft, placementPrimary })}
                              />
                            </div>
                            <div>
                              <Label>Offset Across Face</Label>
                              <FractionInput
                                ariaLabel="Offset Across Face"
                                value={inspectorDraft.placementSecondary}
                                onChange={(placementSecondary) => setDraft({ ...inspectorDraft, placementSecondary })}
                              />
                            </div>
                          </div>
                          <div>
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
                            <div className="grid grid-cols-3 gap-3">
                              <div>
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
                              <div>
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
                              <div>
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
                            </div>
                          )}
                          {inspectorDraft.pattern?.type === 'grid' && (
                            <div className="grid grid-cols-2 gap-3">
                              {(['rows', 'columns'] as const).map((field) => (
                                <div key={field}>
                                  <Label htmlFor={`grid-${field}`}>{field === 'rows' ? 'Rows' : 'Columns'}</Label>
                                  <Input
                                    id={`grid-${field}`}
                                    type="number"
                                    min={1}
                                    max={128}
                                    value={inspectorDraft.pattern![field]}
                                    onChange={(event) =>
                                      setDraft({
                                        ...inspectorDraft,
                                        pattern: {
                                          ...inspectorDraft.pattern!,
                                          [field]: Number(event.target.value)
                                        } as never
                                      })
                                    }
                                  />
                                </div>
                              ))}
                              <div>
                                <Label>Row Spacing</Label>
                                <FractionInput
                                  ariaLabel="Row Spacing"
                                  value={inspectorDraft.pattern.rowSpacing}
                                  onChange={(rowSpacing) =>
                                    setDraft({
                                      ...inspectorDraft,
                                      pattern: { ...inspectorDraft.pattern!, rowSpacing } as never
                                    })
                                  }
                                  min={0.001}
                                />
                              </div>
                              <div>
                                <Label>Column Spacing</Label>
                                <FractionInput
                                  ariaLabel="Column Spacing"
                                  value={inspectorDraft.pattern.columnSpacing}
                                  onChange={(columnSpacing) =>
                                    setDraft({
                                      ...inspectorDraft,
                                      pattern: { ...inspectorDraft.pattern!, columnSpacing } as never
                                    })
                                  }
                                  min={0.001}
                                />
                              </div>
                              <div>
                                <Label htmlFor="grid-rotation">Grid Rotation</Label>
                                <Input
                                  id="grid-rotation"
                                  type="number"
                                  value={inspectorDraft.pattern.rotation}
                                  onChange={(event) =>
                                    setDraft({
                                      ...inspectorDraft,
                                      pattern: {
                                        ...inspectorDraft.pattern!,
                                        rotation: Number(event.target.value)
                                      } as never
                                    })
                                  }
                                />
                              </div>
                            </div>
                          )}
                          {inspectorDraft.pattern?.type === 'circular' && (
                            <div className="grid grid-cols-3 gap-3">
                              <div>
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
                              <div>
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
                              <div>
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
                            </div>
                          )}
                        </>
                      )}

                      {inspectorDraft.mode === 'rounded_cut' && (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Opening Length</Label>
                              <FractionInput
                                ariaLabel="Opening Length"
                                value={inspectorDraft.length}
                                onChange={(length) => setDraft({ ...inspectorDraft, length })}
                                min={0.001}
                              />
                            </div>
                            <div>
                              <Label>Opening Width</Label>
                              <FractionInput
                                ariaLabel="Opening Width"
                                value={inspectorDraft.width}
                                onChange={(width) => setDraft({ ...inspectorDraft, width })}
                                min={0.001}
                              />
                            </div>
                          </div>
                          {inspectorDraft.cutType === 'rounded_rectangle' && (
                            <div>
                              <Label>Corner Radius</Label>
                              <FractionInput
                                ariaLabel="Corner Radius"
                                value={inspectorDraft.cornerRadius}
                                onChange={(cornerRadius) => setDraft({ ...inspectorDraft, cornerRadius })}
                                min={0.001}
                              />
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
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
                            <div>
                              <Label htmlFor="rounded-rotation">Rotation (degrees)</Label>
                              <Input
                                id="rounded-rotation"
                                type="number"
                                value={inspectorDraft.rotation}
                                onChange={(event) =>
                                  setDraft({ ...inspectorDraft, rotation: Number(event.target.value) })
                                }
                              />
                            </div>
                          </div>
                          {inspectorDraft.depthMode === 'blind' && (
                            <div>
                              <Label>Opening Depth</Label>
                              <FractionInput
                                ariaLabel="Opening Depth"
                                value={inspectorDraft.depth}
                                onChange={(depth) => setDraft({ ...inspectorDraft, depth })}
                                min={0.001}
                              />
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Offset Along Face</Label>
                              <FractionInput
                                ariaLabel="Offset Along Face"
                                value={inspectorDraft.placementPrimary}
                                onChange={(placementPrimary) => setDraft({ ...inspectorDraft, placementPrimary })}
                              />
                            </div>
                            <div>
                              <Label>Offset Across Face</Label>
                              <FractionInput
                                ariaLabel="Offset Across Face"
                                value={inspectorDraft.placementSecondary}
                                onChange={(placementSecondary) => setDraft({ ...inspectorDraft, placementSecondary })}
                              />
                            </div>
                          </div>
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
                              Dado spans the full board width. Set the channel width along the blank and the blind
                              depth.
                            </p>
                          )}
                          {inspectorDraft.cutType === 'stopped_dado' && (
                            <p className="text-[11px] text-text-muted">
                              Stopped dado spans full board width, but the run is limited along the blank. Set run
                              length, start offset, and blind depth. For a channel stopped before a side edge, use
                              Mortise; use Stopped Groove for a limited lengthwise channel.
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
                              Tenon leaves a tongue on the end, centred in the board thickness. Size it to the mortise
                              it fits — the board length already includes the tenon, so no extra allowance is needed.
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
                                ariaLabel={
                                  inspectorDraft.cutType === 'tenon'
                                    ? 'Tenon Length'
                                    : inspectorDraft.cutType === 'rabbet'
                                      ? 'Shoulder Width'
                                      : inspectorDraft.cutType === 'stopped_dado'
                                        ? 'Run Along Blank'
                                        : inspectorDraft.cutType === 'groove'
                                          ? 'Full Board Run'
                                          : 'Run Along Blank'
                                }
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
                                  ariaLabel={
                                    inspectorDraft.cutType === 'tenon'
                                      ? 'Tenon Width'
                                      : inspectorDraft.faceTarget === 'front_face' ||
                                          inspectorDraft.faceTarget === 'back_face'
                                        ? 'Height Across Thickness'
                                        : inspectorDraft.cutType === 'groove'
                                          ? 'Groove Width'
                                          : 'Cross-Cut Width'
                                  }
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
                                ariaLabel={
                                  inspectorDraft.cutType === 'tenon'
                                    ? 'Tenon Thickness'
                                    : inspectorDraft.faceTarget === 'front_face' ||
                                        inspectorDraft.faceTarget === 'back_face'
                                      ? 'Depth Into Width'
                                      : 'Blind Depth'
                                }
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
                                ariaLabel={
                                  edgeTargetToSide(inspectorDraft.edgeTarget) === 'front' ||
                                  edgeTargetToSide(inspectorDraft.edgeTarget) === 'back'
                                    ? 'Offset Along Length'
                                    : 'Offset Across Width'
                                }
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
                                      ariaLabel="Offset Along Length"
                                      value={inspectorDraft.placementX}
                                      onChange={(value) => updateRectDraft({ placementX: value })}
                                      min={0}
                                    />
                                  </div>
                                )}
                                <div>
                                  <Label>
                                    {inspectorDraft.cutType === 'tenon'
                                      ? 'Shoulder Offset'
                                      : inspectorDraft.faceTarget === 'front_face' ||
                                          inspectorDraft.faceTarget === 'back_face'
                                        ? 'Offset Up From Bottom'
                                        : 'Offset Across Width'}
                                  </Label>
                                  <FractionInput
                                    ariaLabel={
                                      inspectorDraft.cutType === 'tenon'
                                        ? 'Shoulder Offset'
                                        : inspectorDraft.faceTarget === 'front_face' ||
                                            inspectorDraft.faceTarget === 'back_face'
                                          ? 'Offset Up From Bottom'
                                          : 'Offset Across Width'
                                    }
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
                        </>
                      )}
                    </div>
                  </div>
                  {draftValidationMessage && (
                    <div
                      role="alert"
                      className="mt-3 rounded-md border border-danger/30 bg-danger/5 p-3 text-[11px] text-danger"
                    >
                      {draftValidationMessage}
                      {inspectorDraft.mode === 'rect_cut' &&
                        (!Number.isFinite(inspectorDraft.placementX) ||
                          !Number.isFinite(inspectorDraft.placementZ)) && (
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
        )}
      </div>
      {showDowelDialog && (
        <DowelJointDialog
          open
          firstPart={part}
          candidateParts={projectParts.filter((candidate) => candidate.id !== part.id)}
          onClose={() => {
            setShowDowelDialog(false);
            setPanelMode('list');
          }}
          onCreate={(input) => {
            const jointId = addDowelJoint(input);
            if (!jointId) return null;
            const refreshedPart = useProjectStore.getState().parts.find((candidate) => candidate.id === part.id);
            if (refreshedPart) onDraftFeaturesChange(refreshedPart.features ?? []);
            return jointId;
          }}
          onAlignRequested={({ firstPartId, secondPartId }) => {
            setShowDowelDialog(false);
            setPanelMode('list');
            useSelectionStore.getState().selectParts([firstPartId, secondPartId]);
            onExit();
          }}
        />
      )}
    </div>
  );
}
