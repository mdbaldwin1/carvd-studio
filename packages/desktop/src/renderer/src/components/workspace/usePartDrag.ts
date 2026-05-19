import { useCallback, useEffect, useRef, useState } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { Part as PartType } from '../../types';
import { useProjectStore } from '../../store/projectStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useSnapStore } from '../../store/snapStore';
import { useAppSettingsStore } from '../../store/appSettingsStore';
import { useUIStore } from '../../store/uiStore';
import { useInteractionStore } from '../../store/interactionStore';
import {
  calculateSnapThreshold,
  calculateReferenceDistances,
  calculateGroupReferenceDistances
} from '../../utils/snapToPartsUtil';
import { resolveSafeTranslationDelta } from '../../utils/overlapPolicy';
import { LiveDimensions, snapToGrid } from './partTypes';
import { isOrbitControls } from './workspaceUtils';
import { calculateWorldHalfHeight } from '../../utils/mathPool';
import { applyConstraints } from '../../interaction/constraints/pipeline';
import { groundConstraint } from '../../interaction/constraints/groundConstraint';
import { collisionConstraint } from '../../interaction/constraints/collisionConstraint';
import { createGeometryCache } from '../../interaction/geometry/cache';
import { dragDebug } from '../../utils/dragDebug';
import { resolveConstrainedMoveDelta, resolveMoveSelection } from '../../utils/interactionMovement';
import { solvePartMoveSnapPreview } from '../../utils/interactionMovePreview';
import {
  beginMoveInteractionSession,
  clearMoveInteractionPreview,
  publishMoveInteractionPreview
} from '../../utils/interactionSession';
import { resolveReferenceEntities, resolveSelectionEntities } from '../../utils/interactionSelection';
import { referenceRelationToIndicator, solveMoveReferencePreview } from '../../utils/referenceRelations';

/**
 * Hook encapsulating all drag (move) logic for a Part component.
 * Manages drag state, snap-to-parts, overlap prevention, and store updates.
 */
export function usePartDrag(
  part: PartType,
  liveDims: LiveDimensions,
  setLiveDims: React.Dispatch<React.SetStateAction<LiveDimensions>>,
  rotationQuaternion: THREE.Quaternion,
  camera: THREE.Camera,
  gl: THREE.WebGLRenderer,
  controls: THREE.EventDispatcher<object> | null,
  // Group context (computed in Part.tsx)
  groupToSelectOnClick: string | null,
  isOutsideEditingContext: boolean,
  ancestorGroupIds: string[],
  isSelected: boolean,
  // Store actions
  selectPart: (id: string) => void,
  togglePartSelection: (id: string) => void,
  selectGroup: (id: string) => void,
  toggleGroupSelection: (id: string) => void,
  updatePart: (id: string, updates: Partial<PartType>) => void,
  moveSelectedParts: (delta: { x: number; y: number; z: number }) => void,
  startGroupDrag: (worldPoint: THREE.Vector3, screenX: number, screenY: number) => void
) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ point: THREE.Vector3; partPos: THREE.Vector3; partOriginalPos: THREE.Vector3 } | null>(
    null
  );
  const justFinishedDragging = useRef(false);
  const justFinishedDraggingTimeoutRef = useRef<number | null>(null);
  const lastDragPosition = useRef<{ x: number; y: number; z: number } | null>(null);
  const wasSnappedByParts = useRef<{ x: boolean; y: boolean; z: boolean }>({ x: false, y: false, z: false });
  const latchedFaceSnapRef = useRef<{
    adjustedPosition: { x: number; y: number; z: number };
    lockAxis: 'x' | 'y' | 'z';
    snappedX: boolean;
    snappedY: boolean;
    snappedZ: boolean;
    snapLines: import('../../types').SnapLine[];
  } | null>(null);

  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const raycaster = useRef(new THREE.Raycaster());

  // ADR-009: one geometry cache per hook lifetime. Bundles for the dragged
  // part (and any reference parts the snap engine touches once §5b proper
  // migrations land) are built once and reused across every constraint
  // pipeline call within this drag session. The cache invalidates per part
  // automatically on dimension/rotation change via the bundle version key.
  const geometryCacheRef = useRef(createGeometryCache());

  // Reusable objects for hot-path calculations (avoids GC pressure during drag)
  const _tempVec2 = useRef(new THREE.Vector2());
  const _tempIntersection = useRef(new THREE.Vector3());
  const _tempForward = useRef(new THREE.Vector3());
  const _tempAxisX = useRef(new THREE.Vector3());
  const _tempAxisY = useRef(new THREE.Vector3());
  const _tempAxisZ = useRef(new THREE.Vector3());
  const _tempBasisU = useRef(new THREE.Vector3());
  const _tempBasisV = useRef(new THREE.Vector3());
  const _tempNormal = useRef(new THREE.Vector3());
  const _tempCameraTarget = useRef(new THREE.Vector3());
  const _tempDelta = useRef(new THREE.Vector3());
  const _tempProjectedDelta = useRef(new THREE.Vector3());

  // RAF gating refs for coalescing pointer events to animation frame rate
  const rafIdRef = useRef<number | null>(null);
  const latestEventRef = useRef<PointerEvent | null>(null);
  const dragFrameCounterRef = useRef(0);

  const getWorldPoint = useCallback(
    (e: PointerEvent | MouseEvent): THREE.Vector3 | null => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(_tempVec2.current.set(x, y), camera);
      if (raycaster.current.ray.intersectPlane(planeRef.current, _tempIntersection.current)) {
        return _tempIntersection.current;
      }
      return null;
    },
    [gl, camera]
  );

  type DragPlaneInfo = {
    normal: THREE.Vector3;
    basisU: THREE.Vector3;
    basisV: THREE.Vector3;
    axes: { x: boolean; y: boolean; z: boolean };
  };

  const getDragPlaneInfo = useCallback(
    (partPosition: THREE.Vector3): DragPlaneInfo => {
      _tempForward.current.set(0, 0, -1).applyQuaternion(camera.quaternion);
      _tempNormal.current.copy(_tempForward.current).normalize();
      planeRef.current.setFromNormalAndCoplanarPoint(_tempNormal.current, partPosition);

      // Build movement "virtual axes" from the part's local axes projected onto the camera-facing drag plane.
      const localAxes = [
        _tempAxisX.current.set(1, 0, 0).applyQuaternion(rotationQuaternion).normalize(),
        _tempAxisY.current.set(0, 1, 0).applyQuaternion(rotationQuaternion).normalize(),
        _tempAxisZ.current.set(0, 0, 1).applyQuaternion(rotationQuaternion).normalize()
      ];

      const projectedAxes = localAxes
        .map((axis) => {
          const projected = axis.clone().addScaledVector(_tempNormal.current, -axis.dot(_tempNormal.current));
          const len = projected.length();
          if (len < 1e-5) return null;
          projected.multiplyScalar(1 / len);
          return { axis: projected, score: len };
        })
        .filter((entry): entry is { axis: THREE.Vector3; score: number } => entry !== null)
        .sort((a, b) => b.score - a.score);

      if (projectedAxes.length >= 2) {
        _tempBasisU.current.copy(projectedAxes[0].axis);

        // Pick a second axis that is not nearly collinear with U.
        let second = projectedAxes[1].axis;
        for (let i = 1; i < projectedAxes.length; i += 1) {
          if (Math.abs(projectedAxes[i].axis.dot(_tempBasisU.current)) < 0.98) {
            second = projectedAxes[i].axis;
            break;
          }
        }
        // Orthonormalize V against U to avoid skew/drift from non-orthogonal projected axes.
        _tempBasisV.current.copy(second);
        const uv = _tempBasisV.current.dot(_tempBasisU.current);
        _tempBasisV.current.addScaledVector(_tempBasisU.current, -uv);
        if (_tempBasisV.current.lengthSq() < 1e-8) {
          _tempBasisV.current.copy(_tempNormal.current).cross(_tempBasisU.current);
        }
        _tempBasisV.current.normalize();
      } else {
        // Fallback basis if projection degenerates.
        _tempBasisU.current.set(1, 0, 0);
        if (Math.abs(_tempBasisU.current.dot(_tempNormal.current)) > 0.95) {
          _tempBasisU.current.set(0, 1, 0);
        }
        _tempBasisU.current
          .addScaledVector(_tempNormal.current, -_tempBasisU.current.dot(_tempNormal.current))
          .normalize();
        _tempBasisV.current.copy(_tempNormal.current).cross(_tempBasisU.current).normalize();
      }

      return {
        normal: _tempNormal.current,
        basisU: _tempBasisU.current,
        basisV: _tempBasisV.current,
        // Plane constraints are encoded in basis vectors; allow world-axis updates from projected result.
        axes: { x: true, y: true, z: true }
      };
    },
    [camera, rotationQuaternion]
  );

  // Ref for cleanup of intent listeners (so the drag useEffect can remove them when it takes over)
  const intentListenerCleanup = useRef<(() => void) | null>(null);

  const markJustFinishedDragging = useCallback((didMove: boolean) => {
    if (justFinishedDraggingTimeoutRef.current !== null) {
      window.clearTimeout(justFinishedDraggingTimeoutRef.current);
      justFinishedDraggingTimeoutRef.current = null;
    }

    justFinishedDragging.current = didMove;
    if (!didMove) return;

    // Suppress only the synthetic click that immediately follows a drag release.
    // Leaving this sticky makes later legitimate selection clicks get ignored
    // until the component remounts, which matches the "works after reopen" bug.
    justFinishedDraggingTimeoutRef.current = window.setTimeout(() => {
      justFinishedDragging.current = false;
      justFinishedDraggingTimeoutRef.current = null;
    }, 0);
  }, []);

  // Drag intent handoff: when this Part mounts because InstancedMesh selected it,
  // pick up the stored drag intent and watch for drag movement.
  // Uses a threshold to distinguish clicks from drags and attaches window listeners
  // synchronously to avoid race conditions with quick clicks.
  useEffect(() => {
    const { dragIntent, clearDragIntent, setDraggingPartId } = useSelectionStore.getState();
    if (!dragIntent || dragIntent.partId !== part.id) return;

    // Keep this part rendered individually, then consume the intent
    setDraggingPartId(part.id);
    clearDragIntent();

    // Use the stored world point as the drag start reference
    let startPoint: THREE.Vector3 | null = null;
    if (dragIntent.worldPoint) {
      startPoint = new THREE.Vector3(dragIntent.worldPoint.x, dragIntent.worldPoint.y, dragIntent.worldPoint.z);
    }

    if (!startPoint) {
      useSelectionStore.getState().setDraggingPartId(null);
      return;
    }

    const startScreenX = dragIntent.screenX;
    const startScreenY = dragIntent.screenY;
    const DRAG_THRESHOLD_SQ = 9; // 3px squared
    let dragStarted = false;

    // Window listener: watch for enough mouse movement to distinguish drag from click
    const handleIntentMove = (e: PointerEvent) => {
      if (dragStarted) return; // second useEffect has taken over
      const dx = e.clientX - startScreenX;
      const dy = e.clientY - startScreenY;
      if (dx * dx + dy * dy < DRAG_THRESHOLD_SQ) return;

      // Past threshold — start the actual drag
      dragStarted = true;

      // Compute proper anchor (group center for multi-part, part position for single)
      const currentState = useSelectionStore.getState();
      const currentGroupIds = currentState.selectedGroupIds;
      const currentPartIds = currentState.selectedPartIds;
      const currentGroupMembers = useProjectStore.getState().groupMembers;
      const allParts = useProjectStore.getState().parts;
      const moveSelection = resolveMoveSelection(
        {
          selectedPartIds: currentPartIds,
          selectedGroupIds: currentGroupIds,
          editingGroupId: currentState.editingGroupId
        },
        allParts,
        currentGroupMembers,
        part.id
      );
      const anchorPos = new THREE.Vector3(
        moveSelection.anchorPosition.x,
        moveSelection.anchorPosition.y,
        moveSelection.anchorPosition.z
      );

      getDragPlaneInfo(anchorPos);

      setIsDragging(true);
      beginMoveInteractionSession({
        affectedPartIds: moveSelection.affectedPartIds,
        primaryPartId: part.id
      });
      dragStart.current = {
        point: startPoint!.clone(),
        partPos: anchorPos,
        partOriginalPos: new THREE.Vector3(part.position.x, part.position.y, part.position.z)
      };
      lastDragPosition.current = { x: part.position.x, y: part.position.y, z: part.position.z };
      dragFrameCounterRef.current = 0;
      dragDebug('partDrag:intentStart', {
        partId: part.id,
        anchorPos: { x: anchorPos.x, y: anchorPos.y, z: anchorPos.z },
        partOriginalPos: { x: part.position.x, y: part.position.y, z: part.position.z }
      });
      if (isOrbitControls(controls)) (controls as { enabled: boolean }).enabled = false;
    };

    // Window listener: if pointer released before threshold, it was a click — clean up
    const handleIntentUp = () => {
      if (!dragStarted) {
        // Click without drag — clean up drag intent state
        removeIntentListeners();
        useSelectionStore.getState().setDraggingPartId(null);
      } else {
        // Safety net: drag was started but second useEffect hasn't attached its listeners yet.
        // Do minimal cleanup to prevent stuck drag state.
        removeIntentListeners();
        setIsDragging(false);
        dragStart.current = null;
        lastDragPosition.current = null;
        latchedFaceSnapRef.current = null;
        wasSnappedByParts.current = { x: false, y: false, z: false };
        useSelectionStore.getState().setDraggingPartId(null);
        clearMoveInteractionPreview({
          clearSelectionDragDelta: true,
          clearReferenceDistances: false
        });
        if (isOrbitControls(controls)) (controls as { enabled: boolean }).enabled = true;
      }
    };

    const removeIntentListeners = () => {
      window.removeEventListener('pointermove', handleIntentMove);
      window.removeEventListener('pointerup', handleIntentUp);
      window.removeEventListener('pointercancel', handleIntentUp);
      window.removeEventListener('blur', handleIntentUp);
      intentListenerCleanup.current = null;
    };

    window.addEventListener('pointermove', handleIntentMove);
    window.addEventListener('pointerup', handleIntentUp);
    window.addEventListener('pointercancel', handleIntentUp);
    window.addEventListener('blur', handleIntentUp);
    intentListenerCleanup.current = removeIntentListeners;

    return removeIntentListeners;
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach/detach window listeners when dragging
  useEffect(() => {
    if (!isDragging) return;

    // Clean up mount effect's intent listeners now that the drag is fully active
    if (intentListenerCleanup.current) {
      intentListenerCleanup.current();
    }

    const handleWindowPointerMove = (e: PointerEvent) => {
      // Coalesce pointer events to animation frame rate (prevents redundant
      // snap detection on 120-240Hz displays)
      latestEventRef.current = e;
      if (rafIdRef.current !== null) return;
      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = null;
        const evt = latestEventRef.current;
        if (!evt || !isDragging || !dragStart.current) return;

        const currentPoint = getWorldPoint(evt);
        if (currentPoint) {
          const delta = _tempDelta.current.copy(currentPoint).sub(dragStart.current.point);
          dragFrameCounterRef.current += 1;
          const planeInfo = getDragPlaneInfo(dragStart.current.partPos);

          let uAmount = delta.dot(planeInfo.basisU);
          let vAmount = delta.dot(planeInfo.basisV);

          if (useAppSettingsStore.getState().settings.liveGridSnap) {
            // Quantize movement along the drag plane's virtual basis (part-aligned at angles).
            uAmount = snapToGrid(uAmount);
            vAmount = snapToGrid(vAmount);
          }

          const projectedDelta = _tempProjectedDelta.current
            .copy(planeInfo.basisU)
            .multiplyScalar(uAmount)
            .add(_tempBasisV.current.copy(planeInfo.basisV).multiplyScalar(vAmount));

          let newX = dragStart.current.partPos.x + projectedDelta.x;
          let newY = dragStart.current.partPos.y + projectedDelta.y;
          let newZ = dragStart.current.partPos.z + projectedDelta.z;

          // The snap solver below still needs `worldHalfHeight` as a scalar
          // for its in-snap ground rejection. Compute it here so both the
          // constraint pipeline and the snap solver see the same value.
          const worldHalfHeight = calculateWorldHalfHeight(
            rotationQuaternion,
            liveDims.length,
            liveDims.thickness,
            liveDims.width
          );

          // ADR-006: ground clamp through the constraint pipeline. Uses the
          // current `liveDims` (which may differ from `part.length/width/
          // thickness` during a concurrent resize-then-move) so the rotated
          // AABB computed inside groundConstraint reflects the live shape.
          const previewPart: PartType = {
            ...part,
            length: liveDims.length,
            thickness: liveDims.thickness,
            width: liveDims.width
          };
          const groundResult = applyConstraints(
            {
              candidate: {
                kind: 'move',
                delta: projectedDelta,
                positions: new Map([[part.id, { x: newX, y: newY, z: newZ }]])
              },
              startingParts: [previewPart],
              project: {
                parts: useProjectStore.getState().parts,
                stocks: [],
                groupMembers: []
              },
              geometryCache: geometryCacheRef.current
            },
            [groundConstraint]
          );
          if (groundResult.adjusted.kind === 'move') {
            const adjusted = groundResult.adjusted.positions.get(part.id);
            if (adjusted) {
              newX = adjusted.x;
              newY = adjusted.y;
              newZ = adjusted.z;
            }
          }

          // Apply snap-to-parts if enabled (Alt key temporarily bypasses snapping)
          const isSnapEnabled = useSnapStore.getState().snapToPartsEnabled && !evt.altKey;
          const allParts = useProjectStore.getState().parts;
          const currentSelectedIds = useSelectionStore.getState().selectedPartIds;
          const currentSelectedGroupIds = useSelectionStore.getState().selectedGroupIds;
          const currentEditingGroupId = useSelectionStore.getState().editingGroupId;
          const currentGroupMembers = useProjectStore.getState().groupMembers;
          const currentReferenceIds = useSnapStore.getState().referencePartIds;
          const currentActiveReferenceState = useInteractionStore.getState().activeSession?.referenceState ?? null;
          const snapGuides = useProjectStore.getState().snapGuides;
          const effectiveDraggingIds = resolveMoveSelection(
            {
              selectedPartIds: currentSelectedIds,
              selectedGroupIds: currentSelectedGroupIds,
              editingGroupId: currentEditingGroupId
            },
            allParts,
            currentGroupMembers,
            part.id
          ).affectedPartIds;

          const appSettings = useAppSettingsStore.getState().settings;
          const { snapSensitivity } = appSettings;

          // Grid snap already applied in basis space above.

          const snapTargetParts =
            currentReferenceIds.length > 0 ? allParts.filter((p) => currentReferenceIds.includes(p.id)) : allParts;

          const snapLines: import('../../types').SnapLine[] = [];
          if (isSnapEnabled) {
            const cameraDistance = camera.position.distanceTo(_tempCameraTarget.current.set(newX, newY, newZ));
            const snapThreshold = calculateSnapThreshold(cameraDistance, snapSensitivity);
            const preview = solvePartMoveSnapPreview({
              part,
              position: { x: newX, y: newY, z: newZ },
              axes: planeInfo.axes,
              worldHalfHeight,
              referenceParts: snapTargetParts.length > 0 && allParts.length > 1 ? snapTargetParts : [],
              movingPartIds: effectiveDraggingIds,
              snapGuides,
              settings: appSettings,
              snapThreshold,
              latchedFaceSnap: latchedFaceSnapRef.current,
              resolveFeatureStage: (featureSnapResult, currentPosition) => {
                const featureDelta = {
                  x: featureSnapResult.adjustedPosition.x - currentPosition.x,
                  y: featureSnapResult.adjustedPosition.y - currentPosition.y,
                  z: featureSnapResult.adjustedPosition.z - currentPosition.z
                };
                const featureAxesMoved =
                  (Math.abs(featureDelta.x) > 1e-5 ? 1 : 0) +
                  (Math.abs(featureDelta.y) > 1e-5 ? 1 : 0) +
                  (Math.abs(featureDelta.z) > 1e-5 ? 1 : 0);
                return latchedFaceSnapRef.current && featureAxesMoved >= 2 ? 'face' : 'feature';
              }
            });
            newX = preview.position.x;
            newY = preview.position.y;
            newZ = preview.position.z;
            latchedFaceSnapRef.current = preview.nextLatchedFaceSnap;
            snapLines.push(...preview.snapLines);
            wasSnappedByParts.current = preview.snappedAxes;
            if (dragFrameCounterRef.current % 10 === 0) {
              dragDebug('partDrag:move:snaps', {
                partId: part.id,
                frame: dragFrameCounterRef.current,
                position: { x: newX, y: newY, z: newZ },
                snappedAxes: {
                  x: preview.snappedAxes.x,
                  y: preview.snappedAxes.y,
                  z: preview.snappedAxes.z
                },
                snapLineTypes: snapLines.map((l) => l.type)
              });
            }
          } else {
            wasSnappedByParts.current = { x: false, y: false, z: false };
          }

          const previewDelta = {
            x: newX - dragStart.current.partPos.x,
            y: newY - dragStart.current.partPos.y,
            z: newZ - dragStart.current.partPos.z
          };

          let referenceDistances: import('../../types').ReferenceDistanceIndicator[] = [];
          let referenceState:
            | {
                selectionEntities?: import('../../utils/interactionSelection').InteractionSelectionEntity[];
                referenceEntities?: import('../../utils/interactionSelection').InteractionSelectionEntity[];
                candidateRelations?: import('../../utils/referenceRelations').ReferenceRelation[];
                activeRelationId?: string | null;
                latchedAxis?: 'x' | 'y' | 'z' | null;
              }
            | undefined;

          if (currentReferenceIds.length > 0 && !currentReferenceIds.includes(part.id)) {
            const referenceParts = allParts.filter((p) => currentReferenceIds.includes(p.id));
            const hasGroupSelected = currentSelectedGroupIds.length > 0;
            const hasMultiplePartsSelected = effectiveDraggingIds.length > 1;
            const draggingPartIds = effectiveDraggingIds.filter((id) => !currentReferenceIds.includes(id));

            const referenceEntities = resolveReferenceEntities(currentReferenceIds, currentGroupMembers);
            const selectionEntities = resolveSelectionEntities(
              {
                selectedPartIds: currentSelectedIds,
                selectedGroupIds: currentSelectedGroupIds
              },
              currentGroupMembers
            )
              .map((entity) => ({
                ...entity,
                partIds: entity.partIds.filter((id) => !currentReferenceIds.includes(id))
              }))
              .filter((entity) => entity.partIds.length > 0);

            if (selectionEntities.length > 0 && referenceEntities.length > 0) {
              const relationPreview = solveMoveReferencePreview({
                selectionEntities,
                referenceEntities,
                parts: allParts,
                movingPartIds: effectiveDraggingIds,
                delta: previewDelta,
                preferredAxis: currentActiveReferenceState?.latchedAxis ?? null,
                latchedRelationId: currentActiveReferenceState?.activeRelationId ?? null,
                latchedAxis: currentActiveReferenceState?.latchedAxis ?? null
              });

              if (relationPreview.axisAligned && relationPreview.relations.length > 0) {
                referenceDistances = relationPreview.relations.map(referenceRelationToIndicator);
                referenceState = {
                  selectionEntities,
                  referenceEntities,
                  candidateRelations: relationPreview.relations,
                  activeRelationId: relationPreview.activeRelation?.id ?? null,
                  latchedAxis: relationPreview.activeRelation?.axis ?? null
                };
              }
            }

            if (referenceDistances.length === 0) {
              if ((hasGroupSelected || hasMultiplePartsSelected) && draggingPartIds.length > 0) {
                const draggingParts = allParts.filter((p) => draggingPartIds.includes(p.id));
                referenceDistances = calculateGroupReferenceDistances(draggingParts, previewDelta, referenceParts);
              } else {
                referenceDistances = calculateReferenceDistances(part, { x: newX, y: newY, z: newZ }, referenceParts);
              }
            }
          }

          publishMoveInteractionPreview({
            delta: previewDelta,
            snapLines,
            referenceDistances,
            referenceState,
            publishSelectionDragDelta: false
          });

          // Check overlap prevention
          const stockConstraints = useProjectStore.getState().stockConstraints;
          const proposedDelta = { ...previewDelta };

          if (stockConstraints.preventOverlap) {
            const safeDelta = resolveSafeTranslationDelta(allParts, new Set(effectiveDraggingIds), proposedDelta);
            if (!safeDelta) {
              dragDebug('partDrag:move:overlapBlocked', {
                partId: part.id,
                frame: dragFrameCounterRef.current,
                proposedDelta,
                lastDragPosition: lastDragPosition.current
              });
              // Hold position at the last valid point instead of aborting the frame.
              // Aborting leaves stale drag state and can make pointer-up jump back.
              const fallback =
                lastDragPosition.current ??
                ({
                  x: dragStart.current.partPos.x,
                  y: dragStart.current.partPos.y,
                  z: dragStart.current.partPos.z
                } as const);
              newX = fallback.x;
              newY = fallback.y;
              newZ = fallback.z;
            } else {
              if (
                Math.abs(safeDelta.x - proposedDelta.x) > 1e-6 ||
                Math.abs(safeDelta.y - proposedDelta.y) > 1e-6 ||
                Math.abs(safeDelta.z - proposedDelta.z) > 1e-6
              ) {
                dragDebug('partDrag:move:overlapClamped', {
                  partId: part.id,
                  frame: dragFrameCounterRef.current,
                  proposedDelta,
                  safeDelta
                });
              }
              newX = dragStart.current.partPos.x + safeDelta.x;
              newY = dragStart.current.partPos.y + safeDelta.y;
              newZ = dragStart.current.partPos.z + safeDelta.z;
            }
          }

          lastDragPosition.current = { x: newX, y: newY, z: newZ };

          const effectiveDelta = {
            x: newX - dragStart.current.partPos.x,
            y: newY - dragStart.current.partPos.y,
            z: newZ - dragStart.current.partPos.z
          };
          const partLiveX = dragStart.current.partOriginalPos.x + effectiveDelta.x;
          const partLiveY = dragStart.current.partOriginalPos.y + effectiveDelta.y;
          const partLiveZ = dragStart.current.partOriginalPos.z + effectiveDelta.z;
          setLiveDims((prev) => ({ ...prev, x: partLiveX, y: partLiveY, z: partLiveZ }));

          const hasGroupSelected = currentSelectedGroupIds.length > 0;
          const hasMultiplePartsSelected = effectiveDraggingIds.length > 1;
          if (hasGroupSelected || hasMultiplePartsSelected) {
            useSelectionStore.getState().setActiveDragDelta(effectiveDelta);
          }
        }
      });
    };

    const handleWindowPointerUp = () => {
      if (isDragging && dragStart.current && lastDragPosition.current) {
        const dragDistanceSq =
          (lastDragPosition.current.x - dragStart.current.partOriginalPos.x) ** 2 +
          (lastDragPosition.current.y - dragStart.current.partOriginalPos.y) ** 2 +
          (lastDragPosition.current.z - dragStart.current.partOriginalPos.z) ** 2;
        let newX = lastDragPosition.current.x;
        let newY = lastDragPosition.current.y;
        let newZ = lastDragPosition.current.z;

        const currentSelectedIds = useSelectionStore.getState().selectedPartIds;
        const currentSelectedGroupIds = useSelectionStore.getState().selectedGroupIds;
        const currentGroupMembers = useProjectStore.getState().groupMembers;
        const allParts = useProjectStore.getState().parts;

        const baseDelta = {
          x: newX - dragStart.current.partPos.x,
          y: newY - dragStart.current.partPos.y,
          z: newZ - dragStart.current.partPos.z
        };
        dragDebug('partDrag:release:start', {
          partId: part.id,
          lastDragPosition: lastDragPosition.current,
          startPartPos: dragStart.current.partPos,
          baseDelta,
          selectedIds: currentSelectedIds,
          selectedGroupIds: currentSelectedGroupIds
        });

        const effectivePartIds = resolveMoveSelection(
          {
            selectedPartIds: currentSelectedIds,
            selectedGroupIds: currentSelectedGroupIds,
            editingGroupId: useSelectionStore.getState().editingGroupId
          },
          allParts,
          currentGroupMembers,
          part.id
        ).affectedPartIds;
        const hasGroupSelected = currentSelectedGroupIds.length > 0;
        const hasMultiplePartsSelected = effectivePartIds.length > 1;
        const shouldMoveMultiple = hasGroupSelected || hasMultiplePartsSelected;

        if (shouldMoveMultiple && effectivePartIds.length > 0) {
          // Check overlap prevention for multi-part move
          const constrainedMultiDelta = resolveConstrainedMoveDelta(allParts, effectivePartIds, baseDelta, {
            preventOverlap: useProjectStore.getState().stockConstraints.preventOverlap,
            fallbackDeltaOnOverlap: baseDelta
          });
          if (constrainedMultiDelta.overlapBlocked) {
            dragDebug('partDrag:release:multi:noSafeDelta', {
              partId: part.id,
              adjustedDelta: constrainedMultiDelta.delta,
              fallbackToPreview: true
            });
            // Keep the last previewed drag delta instead of reverting.
            // Final overlap solve can fail near exact-contact due to precision.
            moveSelectedParts(constrainedMultiDelta.delta);
            clearMoveInteractionPreview();
            setIsDragging(false);
            dragStart.current = null;
            lastDragPosition.current = null;
            latchedFaceSnapRef.current = null;
            wasSnappedByParts.current = { x: false, y: false, z: false };
            markJustFinishedDragging(dragDistanceSq > 1e-4);
            useSelectionStore.getState().setDraggingPartId(null);
            if (isOrbitControls(controls)) controls.enabled = true;
            useSnapStore.getState().updateReferenceDistances();
            return;
          }
          if (constrainedMultiDelta.overlapClamped) {
            dragDebug('partDrag:release:multi:safeDelta', {
              partId: part.id,
              adjustedDelta: baseDelta,
              safeDelta: constrainedMultiDelta.delta
            });
          }

          dragDebug('partDrag:release:multi:commit', { partId: part.id, delta: constrainedMultiDelta.delta });
          moveSelectedParts(constrainedMultiDelta.delta);
          clearMoveInteractionPreview();
        } else {
          // ADR-006: single-part release runs ground + collision in one
          // pipeline call. groundConstraint lifts the part to the floor if
          // needed; collisionConstraint clamps the delta to the nearest safe
          // position along the drag direction (or surfaces a blocker when no
          // safe motion exists).
          const releasePart: PartType = {
            ...part,
            length: liveDims.length,
            thickness: liveDims.thickness,
            width: liveDims.width
          };
          const stockConstraints = useProjectStore.getState().stockConstraints;
          const releaseResult = applyConstraints(
            {
              candidate: {
                kind: 'move',
                delta: { x: newX - part.position.x, y: newY - part.position.y, z: newZ - part.position.z },
                positions: new Map([[part.id, { x: newX, y: newY, z: newZ }]])
              },
              startingParts: [releasePart],
              project: {
                parts: allParts,
                stocks: [],
                groupMembers: [],
                preventOverlap: stockConstraints.preventOverlap
              },
              geometryCache: geometryCacheRef.current
            },
            [groundConstraint, collisionConstraint]
          );

          const collisionBlocked = releaseResult.blockers.some((b) => b.constraintName === 'collision');
          if (collisionBlocked) {
            dragDebug('partDrag:release:single:noSafeDelta', {
              partId: part.id,
              fallbackPosition: { x: newX, y: newY, z: newZ }
            });
            // Commit the last validated preview position to avoid jump-back.
            updatePart(part.id, {
              position: { x: newX, y: newY, z: newZ }
            });
            clearMoveInteractionPreview();
            setIsDragging(false);
            dragStart.current = null;
            lastDragPosition.current = null;
            latchedFaceSnapRef.current = null;
            wasSnappedByParts.current = { x: false, y: false, z: false };
            markJustFinishedDragging(dragDistanceSq > 1e-4);
            useSelectionStore.getState().setDraggingPartId(null);
            if (isOrbitControls(controls)) controls.enabled = true;
            useSnapStore.getState().updateReferenceDistances();
            return;
          }

          if (releaseResult.adjusted.kind === 'move') {
            const adjusted = releaseResult.adjusted.positions.get(part.id);
            if (adjusted) {
              newX = adjusted.x;
              newY = adjusted.y;
              newZ = adjusted.z;
            }
            dragDebug('partDrag:release:single:pipelineApplied', {
              partId: part.id,
              baseDelta,
              adjustedDelta: releaseResult.adjusted.delta,
              clamped: releaseResult.warnings.some(
                (w) => w.constraintName === 'collision' && w.kind === 'soft-collision'
              )
            });
          }

          dragDebug('partDrag:release:single:commit', { partId: part.id, position: { x: newX, y: newY, z: newZ } });
          updatePart(part.id, {
            position: { x: newX, y: newY, z: newZ }
          });
        }

        setIsDragging(false);
        dragStart.current = null;
        lastDragPosition.current = null;
        latchedFaceSnapRef.current = null;
        wasSnappedByParts.current = { x: false, y: false, z: false };
        // Only suppress the next click if this was a real drag movement.
        markJustFinishedDragging(dragDistanceSq > 1e-4);
        useSelectionStore.getState().setDraggingPartId(null);
        clearMoveInteractionPreview();
        if (isOrbitControls(controls)) controls.enabled = true;
        useSnapStore.getState().updateReferenceDistances();
      }
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
    window.addEventListener('blur', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
      window.removeEventListener('blur', handleWindowPointerUp);
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      clearMoveInteractionPreview();
    };
    // Depend only on the *dimension* fields of liveDims, not the position fields.
    // Position fields (x/y/z) update on every drag frame via setLiveDims, and
    // re-running this effect each frame would tear down the move session via
    // clearMoveInteractionPreview() in the cleanup, breaking the multi-part preview
    // because subsequent updateMoveSessionDelta() calls no-op against a null session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, liveDims.length, liveDims.width, liveDims.thickness, markJustFinishedDragging]);

  useEffect(() => {
    return () => {
      if (justFinishedDraggingTimeoutRef.current !== null) {
        window.clearTimeout(justFinishedDraggingTimeoutRef.current);
        justFinishedDraggingTimeoutRef.current = null;
      }
    };
  }, []);

  // === MOVE HANDLERS ===
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();

    if (isOutsideEditingContext) {
      // Recover from stale/narrow edit context by exiting to top-level context
      // and selecting what was clicked.
      useSelectionStore.setState({ editingGroupId: null });
      const topLevelGroupId = ancestorGroupIds[ancestorGroupIds.length - 1] ?? null;
      if (topLevelGroupId) {
        selectGroup(topLevelGroupId);
      } else {
        selectPart(part.id);
      }
      useUIStore.getState().setSelectedSidebarStockId(null);
      return;
    }

    // Track right-click for context menu
    if (e.nativeEvent.button === 2) {
      if (!isSelected) {
        if (groupToSelectOnClick) {
          selectGroup(groupToSelectOnClick);
        } else {
          selectPart(part.id);
        }
        useUIStore.getState().setSelectedSidebarStockId(null);
      }
      // ADR-003: right-click contextmenu now routed via the session
      // controller's onContextMenu using the hit-target descriptor.
      return;
    }

    const isMac = window.navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
    const isModKey = isMac ? e.nativeEvent.metaKey : e.nativeEvent.ctrlKey;
    const isAdditiveSelection = e.nativeEvent.shiftKey || isModKey;

    // Additive click for multi-select
    if (isAdditiveSelection) {
      if (groupToSelectOnClick) {
        toggleGroupSelection(groupToSelectOnClick);
      } else {
        togglePartSelection(part.id);
      }
      return;
    }

    // Group selection logic (Figma-style)
    if (groupToSelectOnClick) {
      if (!isSelected) {
        selectGroup(groupToSelectOnClick);
        useUIStore.getState().setSelectedSidebarStockId(null);
      }
    } else if (!isSelected) {
      selectPart(part.id);
      useUIStore.getState().setSelectedSidebarStockId(null);
    }

    // Get current state after potential selection change
    const currentSelectionState = useSelectionStore.getState();
    const currentSelectedPartIds = currentSelectionState.selectedPartIds;
    const currentSelectedGroupIds = currentSelectionState.selectedGroupIds;
    const currentGroupMembers = useProjectStore.getState().groupMembers;

    const isInSelectedGroup = ancestorGroupIds.some((groupId) => currentSelectedGroupIds.includes(groupId));

    // Group-selected part drag should use the thresholded group-drag path (same as InstancedParts).
    if (isInSelectedGroup) {
      if (e.point) {
        startGroupDrag(e.point, e.nativeEvent.clientX, e.nativeEvent.clientY);
      }
      return;
    }

    const moveSelection = resolveMoveSelection(
      {
        selectedPartIds: currentSelectedPartIds,
        selectedGroupIds: currentSelectedGroupIds,
        editingGroupId: currentSelectionState.editingGroupId
      },
      useProjectStore.getState().parts,
      currentGroupMembers,
      part.id
    );
    const anchorPos = new THREE.Vector3(
      moveSelection.anchorPosition.x,
      moveSelection.anchorPosition.y,
      moveSelection.anchorPosition.z
    );

    getDragPlaneInfo(anchorPos);

    const startPoint = getWorldPoint(e.nativeEvent);
    const partOriginalPos = new THREE.Vector3(part.position.x, part.position.y, part.position.z);
    if (startPoint) {
      setIsDragging(true);
      beginMoveInteractionSession({
        affectedPartIds: moveSelection.affectedPartIds,
        primaryPartId: part.id
      });
      dragStart.current = {
        point: startPoint.clone(),
        partPos: anchorPos,
        partOriginalPos: partOriginalPos
      };
      lastDragPosition.current = { x: partOriginalPos.x, y: partOriginalPos.y, z: partOriginalPos.z };
      dragFrameCounterRef.current = 0;
      dragDebug('partDrag:start', {
        partId: part.id,
        anchorPos: { x: anchorPos.x, y: anchorPos.y, z: anchorPos.z },
        partOriginalPos: { x: partOriginalPos.x, y: partOriginalPos.y, z: partOriginalPos.z }
      });
      if (isOrbitControls(controls)) controls.enabled = false;
    }
  };

  return { isDragging, justFinishedDragging, handlePointerDown };
}
