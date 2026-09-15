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
  OperationPreset,
  rectCutIsBlindOnly
} from '@renderer/components/part-features/partFeatureEditorState';
import { PartFeature, PartFeatureTarget } from '@renderer/types';
import { formatMeasurementWithUnit } from '@renderer/utils/fractions';
import {
  getDerivedLengthMeasurements,
  getDerivedWidthMeasurements,
  validateEndCutFeature
} from '@renderer/utils/endCutUtils';
import { isTargetValidForDraft, partFeatureTargetEquals } from '@renderer/utils/partCutPicking';
import { getAvailableMirrorActions, mirrorFeature } from '@renderer/utils/partFeatureActions';
import { buildPreviewPart } from '@renderer/components/part-cuts/PartCutsPreviewCanvas';
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
import { getFaceFrame, validateCircularCut, validateRoundedCut } from '@renderer/utils/roundCutUtils';
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
  onDraftFeaturesChange: (features: PartFeature[], options?: { coalesceKey?: string }) => void;
  onHoveredTargetChange: (target: PartFeatureTarget | null) => void;
  onPendingTargetChange: (target: PartFeatureTarget | null) => void;
  onExit: () => void;
  /** Retained for the header's Save path; this panel no longer renders a Save button. */
  onSave?: () => void;
  hasUnsavedChanges: boolean;
}

type CutsPanelMode = 'list' | 'add' | 'edit';

/**
 * A cut's identity, independent of property order.
 *
 * buildFeatureFromDraft and a stored feature spell the same cut with their
 * properties in different orders, so comparing plain JSON.stringify output
 * reports a change where there is none — which left the inspector and the cut
 * list writing to each other without end.
 */
function featureIdentity(feature: PartFeature): string {
  return JSON.stringify(feature, (_key, value) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
      : value
  );
}

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
  /** Identity of the cut this inspector last wrote, to recognise its own echo. */
  const lastWrittenFeature = useRef<string | null>(null);
  /** Identity of the cut as the list last presented it, to spot an outside change. */
  const lastSeenFeature = useRef<string | null>(null);
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
    if (feature.kind === 'routed_path') {
      const frame = getFaceFrame(part, feature.target.face);
      const depth = feature.parameters.depthMode === 'blind' ? Number(feature.parameters.depth) : null;
      const materialDepth =
        feature.target.face === 'top_face' || feature.target.face === 'bottom_face'
          ? part.thickness
          : feature.target.face === 'left_end' || feature.target.face === 'right_end'
            ? part.length
            : part.width;
      if (!(feature.bit.diameter > 0)) return 'Cutter diameter must be greater than zero.';
      if (depth !== null && (!(depth > 0) || depth > materialDepth)) {
        return `Route depth must be greater than zero and no deeper than the ${formatMeasurementWithUnit(materialDepth, units)} material thickness. Use Through for a through-route.`;
      }
      const requestedDepth = depth ?? materialDepth;
      if (feature.bit.profile === 'core_box' || feature.bit.profile === 'ball_nose') {
        const maxDepth = feature.bit.diameter / 2;
        if (requestedDepth > maxDepth) {
          return `This round-bottom bit can cut at most ${formatMeasurementWithUnit(maxDepth, units)} deep at its ${formatMeasurementWithUnit(feature.bit.diameter, units)} diameter.`;
        }
      }
      if (feature.bit.profile === 'v_bit' || feature.bit.profile === 'engraving') {
        const maxDepth = feature.bit.diameter / (2 * Math.tan((feature.bit.includedAngle * Math.PI) / 360));
        if (requestedDepth > maxDepth) {
          return `At ${feature.bit.includedAngle}°, this V-bit can cut at most ${formatMeasurementWithUnit(maxDepth, units)} deep at its ${formatMeasurementWithUnit(feature.bit.diameter, units)} maximum diameter.`;
        }
      }
      if (feature.bit.profile === 'dovetail' || feature.bit.profile === 't_slot' || feature.bit.profile === 'keyhole') {
        if (!(feature.bit.shankDiameter > 0) || feature.bit.shankDiameter >= feature.bit.diameter) {
          return 'Shank diameter must be greater than zero and smaller than the cutter diameter.';
        }
        const cutterHeight =
          feature.bit.profile === 'dovetail'
            ? (feature.bit.diameter - feature.bit.shankDiameter) /
              (2 * Math.tan((feature.bit.includedAngle * Math.PI) / 360))
            : feature.bit.cutterHeight;
        if (!(cutterHeight > 0) || cutterHeight > requestedDepth) {
          return `Route depth must be at least the ${formatMeasurementWithUnit(cutterHeight, units)} cutter height.`;
        }
      }
      const outsidePoint = feature.path.points.findIndex(
        (point) =>
          Math.abs(point.primary) > frame.primarySize / 2 + 1e-9 ||
          Math.abs(point.secondary) > frame.secondarySize / 2 + 1e-9
      );
      if (outsidePoint >= 0) return `Route point ${outsidePoint + 1} must stay on the selected face.`;
      if (feature.path.closed && feature.path.points.length < 3) {
        return 'A closed routed path needs at least three points.';
      }
      const spanCount = feature.path.closed ? feature.path.points.length : feature.path.points.length - 1;
      for (let index = 0; index < spanCount; index += 1) {
        const current = feature.path.points[index];
        const next = feature.path.points[(index + 1) % feature.path.points.length];
        if (Math.hypot(next.primary - current.primary, next.secondary - current.secondary) < 1e-9) {
          return `Route points ${index + 1} and ${((index + 1) % feature.path.points.length) + 1} overlap. Move or remove one point.`;
        }
      }
    }
    if (feature.kind === 'edge_profile') {
      if (!(feature.parameters.size > 0) || !(feature.parameters.depth > 0)) {
        return 'Edge-profile size and depth must both be greater than zero.';
      }
      const edge = feature.target.edge;
      const maxCrossSection =
        edge.startsWith('front_') || edge.startsWith('back_')
          ? Math.min(part.length, part.width)
          : edge.endsWith('front_edge') || edge.endsWith('back_edge')
            ? Math.min(part.thickness, part.width)
            : Math.min(part.thickness, part.length);
      if (feature.parameters.size > maxCrossSection || feature.parameters.depth > maxCrossSection) {
        return `This profile must fit within the selected edge's ${formatMeasurementWithUnit(maxCrossSection, units)} cross-section.`;
      }
    }
    const issue =
      feature.kind === 'rect_cut'
        ? validateRectCutFeature(feature, candidate)
        : feature.kind === 'circular_cut'
          ? validateCircularCut(feature, candidate)
          : feature.kind === 'rounded_cut'
            ? validateRoundedCut(feature, candidate)
            : feature.kind === 'end_cut'
              ? validateEndCutFeature(feature, candidate)
              : null;
    if (issue) return issue;
    return (
      getPartFeatureConflicts(features, part).find(
        (conflict) =>
          conflict.severity === 'error' && (conflict.code === 'no_material' || conflict.code === 'material_removed')
      )?.message ?? null
    );
  }, [draft, part, draftFeatures, units]);

  const endCutPreviewMeasurements = useMemo(() => {
    if (!draft || !draftPreviewFeature || draftPreviewFeature.kind !== 'end_cut') return null;
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
    if (!draft || !draftPreviewFeature || draftPreviewFeature.kind !== 'end_cut') return null;
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

  // The canvas renders the open draft spliced into the saved list, so the
  // cards and conflicts have to read the same list. Reading the saved list
  // alone left them describing geometry that was no longer on screen: retarget
  // a cut to another face and the summary kept naming the old face and the old
  // conflict, and a size that had just become impossible on the new face
  // raised nothing until the edit was committed.
  const liveFeatures = useMemo(
    () => buildPreviewPart(part, draftFeatures, draft).features ?? [],
    [draft, draftFeatures, part]
  );

  // Shared with the header Save button so the two cannot disagree about
  // whether this draft is savable.
  const draftStatus = useMemo(() => getPartCutsDraftStatus(part, liveFeatures), [part, liveFeatures]);
  const featureConflicts = draftStatus.conflicts;
  const operationIssues = draftStatus.issues;
  const firstInvalidIndex = draftStatus.firstInvalidIndex;
  const conflictsByFeatureId = useMemo(() => {
    const map = new Map<string, typeof featureConflicts>();
    for (const conflict of featureConflicts) {
      const existing = map.get(conflict.featureId) ?? [];
      existing.push(conflict);
      map.set(conflict.featureId, existing);
    }
    return map;
  }, [featureConflicts]);

  // Picking a type in the dialog adds the cut. There is no staging step: the
  // cut is in the list from here on, at the preset's defaults, and the
  // inspector edits it in place the way the part panel edits a part.
  const handleStartPreset = (preset: OperationPreset) => {
    const presetDraft = buildDraftFromPreset(preset, {
      partLength: part.length,
      partWidth: part.width,
      partThickness: part.thickness
    });
    const feature = buildFeatureFromDraft(
      presetDraft.mode === 'end_cut' ? normalizeEndCutDraft(presetDraft) : presetDraft
    );
    onDraftFeaturesChange([...draftFeatures, feature]);
    setDraft({ ...presetDraft, featureId: feature.id });
    setPanelMode('edit');
    onSelectFeature(feature.id);
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

  /**
   * Write the open draft into the cut list. The inspector calls this on every
   * change, so it must be idempotent and must leave the panel alone — closing
   * the inspector is a selection concern now, not a save one.
   *
   * Returns the validation message when the draft cannot be written, which is
   * how the header's Save reports a half-typed field instead of committing it.
   */
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
    // Opening a cut must not count as changing it. The inspector writes on
    // every render pass now, and a round trip through the draft reorders and
    // re-spells the feature without altering it, so compare before writing or
    // simply selecting a cut would spend an undo step.
    if (originalFeature && featureIdentity(nextFeature) === featureIdentity(originalFeature)) {
      lastWrittenFeature.current = featureIdentity(originalFeature);
      return null;
    }
    lastWrittenFeature.current = featureIdentity(nextFeature);

    const nextFeatures =
      draft.featureId && originalFeature
        ? draftFeatures.map((feature) => (feature.id === draft.featureId ? nextFeature : feature))
        : [...draftFeatures, nextFeature];

    // The whole run of edits to one cut is a single undo step, so undo steps
    // back to the cut as it was before this visit rather than one keystroke.
    onDraftFeaturesChange(nextFeatures, { coalesceKey: nextFeature.id });
    onSelectFeature(nextFeature.id);
    return null;
  }, [draft, draftValidationMessage, draftFeatures, onDraftFeaturesChange, onSelectFeature]);

  // The inspector and the cut list keep each other in step, in that order of
  // priority. Both directions have to live in one effect: as two, the write
  // would run first on the pass after an undo and put the stale draft straight
  // back, so undo did nothing at all while a cut was open.
  useEffect(() => {
    if (!draft) return;
    const feature = draft.featureId ? draftFeatures.find((candidate) => candidate.id === draft.featureId) : undefined;

    // The list moved to something the inspector did not put there -- an undo,
    // a redo, a nudge, a mirror. That wins over what the panel is holding, so
    // adopt it and write nothing this pass. It has to be an actual transition
    // of the list and not merely "the list disagrees with me": a list that
    // never changes means nobody is accepting the writes, which is not the
    // same as somebody else making one.
    if (feature) {
      const current = featureIdentity(feature);
      const previous = lastSeenFeature.current;
      lastSeenFeature.current = current;
      if (previous !== null && current !== previous && current !== lastWrittenFeature.current) {
        lastWrittenFeature.current = current;
        setDraft(buildDraftFromFeature(feature, part));
        return;
      }
    }

    // Otherwise every inspector change writes straight through. Invalid input
    // is held back rather than committed: the inspector states the reason and
    // the list keeps the last good values, which is also what stops a
    // half-typed dimension from reaching the CSG preview.
    if (draftValidationMessage) return;
    handleSaveDraft();
  }, [draft, draftFeatures, draftValidationMessage, handleSaveDraft, part]);

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

  // With no dismiss button of its own, the inspector follows the selection the
  // way the part panel does: deselecting (Escape, or the preview's empty space)
  // closes it, and selecting a different cut retargets it.
  const lastSelectedFeatureId = useRef(selectedFeatureId);
  useEffect(() => {
    const previous = lastSelectedFeatureId.current;
    lastSelectedFeatureId.current = selectedFeatureId;
    // Only the selection *moving* means anything here. Reading the current
    // value instead would close the inspector on behalf of any caller that
    // does not drive selection at all, rather than only when the user
    // deselects.
    if (panelMode !== 'edit' || previous === selectedFeatureId) return;
    if (selectedFeatureId === null) {
      setDraft(null);
      setPanelMode('list');
      onPendingTargetChange(null);
      return;
    }
    const feature = draftFeatures.find((candidate) => candidate.id === selectedFeatureId);
    if (feature && draft?.featureId !== selectedFeatureId) setDraft(buildDraftFromFeature(feature, part));
  }, [panelMode, selectedFeatureId, draft?.featureId, draftFeatures, part, onPendingTargetChange]);

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

  /**
   * Close the inspector and go back to the list. No cut is discarded — by the
   * time an inspector is open its cut is already in the list — so this is
   * dismissal, not cancellation. Dismissing the type dialog lands here too,
   * before any cut exists.
   */
  const handleCloseInspector = () => {
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
    inspectorDraft?.mode === 'rect_cut' && rectCutIsBlindOnly(inspectorDraft.cutType, inspectorDraft.faceTarget);
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
    liveFeatures,
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
    handleCloseInspector,
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
