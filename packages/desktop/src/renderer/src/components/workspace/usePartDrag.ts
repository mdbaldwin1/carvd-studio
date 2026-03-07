import { useCallback, useEffect, useRef, useState } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { Part as PartType } from '../../types';
import { useProjectStore, getAllDescendantPartIds } from '../../store/projectStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useSnapStore } from '../../store/snapStore';
import { useAppSettingsStore } from '../../store/appSettingsStore';
import { useUIStore } from '../../store/uiStore';
import {
  detectSnaps,
  calculateSnapThreshold,
  detectGuideSnaps,
  createGuideSnapLine,
  getPartBoundsAtPosition,
  detectOriginSnaps,
  createOriginSnapLine,
  detectFaceSnaps,
  detectSurfaceAnchorSnaps,
  detectFractionalFaceSnaps,
  detectFeatureSnaps,
  calculateReferenceDistances,
  calculateGroupReferenceDistances,
  getCombinedBounds
} from '../../utils/snapToPartsUtil';
import { resolveSafeTranslationDelta } from '../../utils/overlapPolicy';
import { LiveDimensions, snapToGrid } from './partTypes';
import { isOrbitControls, setRightClickTarget } from './workspaceUtils';
import { calculateWorldHalfHeight, calculateWorldHalfHeightFromDegrees } from '../../utils/mathPool';
import { isAxisAlignedRotation } from '../../utils/rotation';
import { createAxisSnapWinners, shouldUseSnapStage, tryApplyAxisSnap, type SnapStage } from '../../utils/snapPriority';
import { dragDebug } from '../../utils/dragDebug';

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
      const hasGroup = currentGroupIds.length > 0;
      const hasMulti = currentPartIds.length > 1;

      let anchorPos: THREE.Vector3;
      if (hasGroup || hasMulti) {
        const partIdsToInclude = new Set(currentPartIds);
        for (const groupId of currentGroupIds) {
          const ids = getAllDescendantPartIds(groupId, currentGroupMembers);
          ids.forEach((id) => partIdsToInclude.add(id));
        }
        const allParts = useProjectStore.getState().parts;
        const partsToMeasure = allParts.filter((p) => partIdsToInclude.has(p.id));
        if (partsToMeasure.length > 0) {
          const bounds = getCombinedBounds(partsToMeasure);
          anchorPos = new THREE.Vector3(bounds.centerX, bounds.centerY, bounds.centerZ);
        } else {
          anchorPos = new THREE.Vector3(part.position.x, part.position.y, part.position.z);
        }
      } else {
        anchorPos = new THREE.Vector3(part.position.x, part.position.y, part.position.z);
      }

      getDragPlaneInfo(anchorPos);

      setIsDragging(true);
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
        useSelectionStore.getState().setActiveDragDelta(null);
        if (isOrbitControls(controls)) (controls as { enabled: boolean }).enabled = true;
        useSnapStore.getState().setActiveSnapLines([]);
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

          // Constrain to ground during move
          const worldHalfHeight = calculateWorldHalfHeight(
            rotationQuaternion,
            liveDims.length,
            liveDims.thickness,
            liveDims.width
          );
          newY = Math.max(worldHalfHeight, newY);

          // Apply snap-to-parts if enabled (Alt key temporarily bypasses snapping)
          const isSnapEnabled = useSnapStore.getState().snapToPartsEnabled && !evt.altKey;
          const allParts = useProjectStore.getState().parts;
          const currentSelectedIds = useSelectionStore.getState().selectedPartIds;
          const currentSelectedGroupIds = useSelectionStore.getState().selectedGroupIds;
          const currentGroupMembers = useProjectStore.getState().groupMembers;
          const currentReferenceIds = useSnapStore.getState().referencePartIds;
          const snapGuides = useProjectStore.getState().snapGuides;
          const effectiveDraggingIdsSet = new Set<string>(currentSelectedIds);
          for (const groupId of currentSelectedGroupIds) {
            const groupPartIds = getAllDescendantPartIds(groupId, currentGroupMembers);
            groupPartIds.forEach((id) => effectiveDraggingIdsSet.add(id));
          }
          // Ensure the actively dragged part is always treated as moving.
          effectiveDraggingIdsSet.add(part.id);
          const effectiveDraggingIds = [...effectiveDraggingIdsSet];

          const appSettings = useAppSettingsStore.getState().settings;
          const {
            snapSensitivity,
            snapToOrigin,
            enableSurfaceAnchors,
            enableFractionalAnchors,
            enableGoldenRatioAnchors,
            enableFeatureAnchors,
            enableAxisLegacySnaps
          } = appSettings;

          // Grid snap already applied in basis space above.

          const snapTargetParts =
            currentReferenceIds.length > 0 ? allParts.filter((p) => currentReferenceIds.includes(p.id)) : allParts;

          const snapLines: import('../../types').SnapLine[] = [];
          const axisSnapWinners = createAxisSnapWinners();
          const getFaceLockAxis = (
            faceResult: {
              adjustedPosition: { x: number; y: number; z: number };
              snapLines: import('../../types').SnapLine[];
            },
            basePosition: { x: number; y: number; z: number }
          ): 'x' | 'y' | 'z' => {
            const faceLineAxis = faceResult.snapLines.find((line) => line.type === 'face')?.axis;
            if (faceLineAxis === 'x' || faceLineAxis === 'y' || faceLineAxis === 'z') return faceLineAxis;
            const dx = Math.abs(faceResult.adjustedPosition.x - basePosition.x);
            const dy = Math.abs(faceResult.adjustedPosition.y - basePosition.y);
            const dz = Math.abs(faceResult.adjustedPosition.z - basePosition.z);
            return dx >= dy && dx >= dz ? 'x' : dy >= dz ? 'y' : 'z';
          };
          const tryApplyStageForAxis = (
            axis: 'x' | 'y' | 'z',
            stage: SnapStage,
            apply: () => { accepted: boolean; lines?: import('../../types').SnapLine[] }
          ) => {
            if (!shouldUseSnapStage(axisSnapWinners[axis], stage)) return;
            const result = apply();
            if (!result.accepted) return;
            tryApplyAxisSnap(axis, stage, axisSnapWinners, snapLines, result.lines ?? []);
          };

          if (isSnapEnabled) {
            const cameraDistance = camera.position.distanceTo(_tempCameraTarget.current.set(newX, newY, newZ));
            const snapThreshold = calculateSnapThreshold(cameraDistance, snapSensitivity);

            const draggingBounds = getPartBoundsAtPosition(part, { x: newX, y: newY, z: newZ });

            // Check for guide snaps first
            if (snapGuides.length > 0) {
              const guideSnaps = detectGuideSnaps(draggingBounds, snapGuides, snapThreshold);

              if (guideSnaps.x && planeInfo.axes.x) {
                tryApplyStageForAxis('x', 'guide', () => {
                  newX += guideSnaps.x!.delta;
                  const guide = snapGuides.find((g) => g.id === guideSnaps.x!.guideId);
                  if (!guide) return { accepted: false };
                  const updatedBounds = getPartBoundsAtPosition(part, { x: newX, y: newY, z: newZ });
                  return { accepted: true, lines: [createGuideSnapLine(guide, updatedBounds)] };
                });
              }
              if (guideSnaps.y && planeInfo.axes.y) {
                tryApplyStageForAxis('y', 'guide', () => {
                  const snappedY = newY + guideSnaps.y!.delta;
                  if (snappedY < worldHalfHeight) return { accepted: false };
                  newY = snappedY;
                  const guide = snapGuides.find((g) => g.id === guideSnaps.y!.guideId);
                  if (!guide) return { accepted: false };
                  const updatedBounds = getPartBoundsAtPosition(part, { x: newX, y: newY, z: newZ });
                  return { accepted: true, lines: [createGuideSnapLine(guide, updatedBounds)] };
                });
              }
              if (guideSnaps.z && planeInfo.axes.z) {
                tryApplyStageForAxis('z', 'guide', () => {
                  newZ += guideSnaps.z!.delta;
                  const guide = snapGuides.find((g) => g.id === guideSnaps.z!.guideId);
                  if (!guide) return { accepted: false };
                  const updatedBounds = getPartBoundsAtPosition(part, { x: newX, y: newY, z: newZ });
                  return { accepted: true, lines: [createGuideSnapLine(guide, updatedBounds)] };
                });
              }
            }

            // Check origin snaps if enabled
            if (snapToOrigin) {
              const currentBounds = getPartBoundsAtPosition(part, { x: newX, y: newY, z: newZ });
              const originSnaps = detectOriginSnaps(currentBounds, snapThreshold);

              if (originSnaps.x && planeInfo.axes.x) {
                tryApplyStageForAxis('x', 'origin', () => {
                  newX += originSnaps.x!.delta;
                  const updatedBounds = getPartBoundsAtPosition(part, { x: newX, y: newY, z: newZ });
                  return { accepted: true, lines: [createOriginSnapLine('x', originSnaps.x!.snapType, updatedBounds)] };
                });
              }
              if (originSnaps.y && planeInfo.axes.y) {
                tryApplyStageForAxis('y', 'origin', () => {
                  const snappedY = newY + originSnaps.y!.delta;
                  if (snappedY < worldHalfHeight) return { accepted: false };
                  newY = snappedY;
                  const updatedBounds = getPartBoundsAtPosition(part, { x: newX, y: newY, z: newZ });
                  return { accepted: true, lines: [createOriginSnapLine('y', originSnaps.y!.snapType, updatedBounds)] };
                });
              }
              if (originSnaps.z && planeInfo.axes.z) {
                tryApplyStageForAxis('z', 'origin', () => {
                  newZ += originSnaps.z!.delta;
                  const updatedBounds = getPartBoundsAtPosition(part, { x: newX, y: newY, z: newZ });
                  return { accepted: true, lines: [createOriginSnapLine('z', originSnaps.z!.snapType, updatedBounds)] };
                });
              }
            }

            // Check part snaps
            if (snapTargetParts.length > 0 && allParts.length > 1) {
              const faceSnapResult = detectFaceSnaps(
                part,
                { x: newX, y: newY, z: newZ },
                snapTargetParts,
                effectiveDraggingIds,
                snapThreshold
              );
              const hasFaceSnap = faceSnapResult.snappedX || faceSnapResult.snappedY || faceSnapResult.snappedZ;
              if (hasFaceSnap) {
                const lockAxis = getFaceLockAxis(faceSnapResult, { x: newX, y: newY, z: newZ });
                latchedFaceSnapRef.current = {
                  adjustedPosition: faceSnapResult.adjustedPosition,
                  lockAxis,
                  snappedX: faceSnapResult.snappedX,
                  snappedY: faceSnapResult.snappedY,
                  snappedZ: faceSnapResult.snappedZ,
                  snapLines: faceSnapResult.snapLines
                };
              } else if (
                latchedFaceSnapRef.current &&
                faceSnapResult.closestDistance !== undefined &&
                faceSnapResult.closestDistance < snapThreshold * 1.1
              ) {
                const latched = latchedFaceSnapRef.current;
                // Break out of a latched face snap if the user drags far enough away on the latched axis.
                const breakoutDistance = Math.max(0.12, snapThreshold * 0.6);
                const breakX =
                  latched.lockAxis === 'x' &&
                  latched.snappedX &&
                  Math.abs(newX - latched.adjustedPosition.x) > breakoutDistance;
                const breakY =
                  latched.lockAxis === 'y' &&
                  latched.snappedY &&
                  Math.abs(newY - latched.adjustedPosition.y) > breakoutDistance;
                const breakZ =
                  latched.lockAxis === 'z' &&
                  latched.snappedZ &&
                  Math.abs(newZ - latched.adjustedPosition.z) > breakoutDistance;
                const shouldBreakLatch = breakX || breakY || breakZ;

                if (!shouldBreakLatch) {
                  faceSnapResult.adjustedPosition = latched.adjustedPosition;
                  const axis = latched.lockAxis;
                  faceSnapResult.snappedX = axis === 'x' && latched.snappedX;
                  faceSnapResult.snappedY = axis === 'y' && latched.snappedY;
                  faceSnapResult.snappedZ = axis === 'z' && latched.snappedZ;
                  faceSnapResult.snapLines = latched.snapLines;
                } else {
                  latchedFaceSnapRef.current = null;
                }
              } else {
                latchedFaceSnapRef.current = null;
              }

              const faceBasePosition = { x: newX, y: newY, z: newZ };

              // Always apply the full face correction first; axis winners below
              // decide which world axis remains face-locked versus tangentially adjustable.
              if (faceSnapResult.snappedX || faceSnapResult.snappedY || faceSnapResult.snappedZ) {
                newX = faceSnapResult.adjustedPosition.x;
                newY = faceSnapResult.adjustedPosition.y;
                newZ = faceSnapResult.adjustedPosition.z;
              }

              const faceLockAxis = getFaceLockAxis(faceSnapResult, faceBasePosition);
              faceSnapResult.snappedX = faceLockAxis === 'x' && faceSnapResult.snappedX;
              faceSnapResult.snappedY = faceLockAxis === 'y' && faceSnapResult.snappedY;
              faceSnapResult.snappedZ = faceLockAxis === 'z' && faceSnapResult.snappedZ;

              if (faceSnapResult.snappedX && planeInfo.axes.x) {
                tryApplyStageForAxis('x', 'face', () => ({
                  accepted: true,
                  lines: (() => {
                    newX = faceSnapResult.adjustedPosition.x;
                    return faceSnapResult.snapLines.filter((l) => l.axis === 'x');
                  })()
                }));
              }
              if (faceSnapResult.snappedY && planeInfo.axes.y) {
                tryApplyStageForAxis('y', 'face', () => {
                  const snappedY = faceSnapResult.adjustedPosition.y;
                  if (snappedY < worldHalfHeight) return { accepted: false };
                  newY = snappedY;
                  return { accepted: true, lines: faceSnapResult.snapLines.filter((l) => l.axis === 'y') };
                });
              }
              if (faceSnapResult.snappedZ && planeInfo.axes.z) {
                tryApplyStageForAxis('z', 'face', () => ({
                  accepted: true,
                  lines: (() => {
                    newZ = faceSnapResult.adjustedPosition.z;
                    return faceSnapResult.snapLines.filter((l) => l.axis === 'z');
                  })()
                }));
              }

              const applyAdvancedSnapResult = (snapResult: ReturnType<typeof detectFeatureSnaps>, stage: SnapStage) => {
                if (!(snapResult.snappedX || snapResult.snappedY || snapResult.snappedZ)) return;
                if (planeInfo.axes.x && snapResult.snappedX) {
                  tryApplyStageForAxis('x', stage, () => ({
                    accepted: true,
                    lines: (() => {
                      newX = snapResult.adjustedPosition.x;
                      return snapResult.snapLines.filter((l) => l.axis === 'x');
                    })()
                  }));
                }
                if (planeInfo.axes.y && snapResult.snappedY) {
                  tryApplyStageForAxis('y', stage, () => {
                    const snappedY = snapResult.adjustedPosition.y;
                    if (snappedY < worldHalfHeight) return { accepted: false };
                    newY = snappedY;
                    return { accepted: true, lines: snapResult.snapLines.filter((l) => l.axis === 'y') };
                  });
                }
                if (planeInfo.axes.z && snapResult.snappedZ) {
                  tryApplyStageForAxis('z', stage, () => ({
                    accepted: true,
                    lines: (() => {
                      newZ = snapResult.adjustedPosition.z;
                      return snapResult.snapLines.filter((l) => l.axis === 'z');
                    })()
                  }));
                }
              };

              if (enableSurfaceAnchors ?? true) {
                const surfaceSnapResult = detectSurfaceAnchorSnaps(
                  part,
                  { x: newX, y: newY, z: newZ },
                  snapTargetParts,
                  effectiveDraggingIds,
                  snapThreshold
                );
                applyAdvancedSnapResult(surfaceSnapResult, 'surface');
              }

              if ((enableFractionalAnchors ?? true) || (enableGoldenRatioAnchors ?? false)) {
                const fractionSnapResult = detectFractionalFaceSnaps(
                  part,
                  { x: newX, y: newY, z: newZ },
                  snapTargetParts,
                  effectiveDraggingIds,
                  snapThreshold,
                  enableGoldenRatioAnchors ?? false
                );
                applyAdvancedSnapResult(fractionSnapResult, 'fraction');
              }

              // Feature snaps can still help on tangential axes even while a face snap is active.
              if (enableFeatureAnchors ?? true) {
                const featureSnapResult = detectFeatureSnaps(
                  part,
                  { x: newX, y: newY, z: newZ },
                  snapTargetParts,
                  effectiveDraggingIds,
                  snapThreshold
                );
                const featureDelta = {
                  x: featureSnapResult.adjustedPosition.x - newX,
                  y: featureSnapResult.adjustedPosition.y - newY,
                  z: featureSnapResult.adjustedPosition.z - newZ
                };
                const featureAxesMoved =
                  (Math.abs(featureDelta.x) > 1e-5 ? 1 : 0) +
                  (Math.abs(featureDelta.y) > 1e-5 ? 1 : 0) +
                  (Math.abs(featureDelta.z) > 1e-5 ? 1 : 0);
                const featureStage: SnapStage =
                  latchedFaceSnapRef.current && featureAxesMoved >= 2 ? 'face' : 'feature';
                applyAdvancedSnapResult(featureSnapResult, featureStage);
              }

              // Legacy axis-based snapping is intentionally disabled for angled assemblies.
              const axisAlignedContext =
                isAxisAlignedRotation(part.rotation) &&
                snapTargetParts.every((candidate) =>
                  effectiveDraggingIds.includes(candidate.id) ? true : isAxisAlignedRotation(candidate.rotation)
                );
              if ((enableAxisLegacySnaps ?? true) && axisAlignedContext) {
                const snapResult = detectSnaps(
                  part,
                  { x: newX, y: newY, z: newZ },
                  snapTargetParts,
                  effectiveDraggingIds,
                  snapThreshold
                );

                if (planeInfo.axes.x && snapResult.snappedX) {
                  tryApplyStageForAxis('x', 'axis', () => ({
                    accepted: true,
                    lines: (() => {
                      newX = snapResult.adjustedPosition.x;
                      return snapResult.snapLines.filter((line) => line.axis === 'x');
                    })()
                  }));
                }
                if (planeInfo.axes.y && snapResult.snappedY) {
                  tryApplyStageForAxis('y', 'axis', () => {
                    const snappedY = snapResult.adjustedPosition.y;
                    if (snappedY < worldHalfHeight) return { accepted: false };
                    newY = snappedY;
                    return { accepted: true, lines: snapResult.snapLines.filter((line) => line.axis === 'y') };
                  });
                }
                if (planeInfo.axes.z && snapResult.snappedZ) {
                  tryApplyStageForAxis('z', 'axis', () => ({
                    accepted: true,
                    lines: (() => {
                      newZ = snapResult.adjustedPosition.z;
                      return snapResult.snapLines.filter((line) => line.axis === 'z');
                    })()
                  }));
                }
              }
            }

            wasSnappedByParts.current = {
              x: snapLines.some((l) => l.axis === 'x'),
              y: snapLines.some((l) => l.axis === 'y'),
              z: snapLines.some((l) => l.axis === 'z')
            };

            // Calculate reference distances
            let referenceDistances: import('../../types').ReferenceDistanceIndicator[] = [];
            if (currentReferenceIds.length > 0 && !currentReferenceIds.includes(part.id)) {
              const referenceParts = allParts.filter((p) => currentReferenceIds.includes(p.id));

              const effectiveDragPartIds = new Set(currentSelectedIds);
              for (const groupId of currentSelectedGroupIds) {
                const groupPartIds = getAllDescendantPartIds(groupId, currentGroupMembers);
                groupPartIds.forEach((id) => effectiveDragPartIds.add(id));
              }

              const hasGroupSelected = currentSelectedGroupIds.length > 0;
              const hasMultiplePartsSelected = effectiveDragPartIds.size > 1;

              const draggingPartIds = [...effectiveDragPartIds].filter((id) => !currentReferenceIds.includes(id));

              if ((hasGroupSelected || hasMultiplePartsSelected) && draggingPartIds.length > 0) {
                const draggingParts = allParts.filter((p) => draggingPartIds.includes(p.id));
                const dragDelta = {
                  x: newX - dragStart.current!.partPos.x,
                  y: newY - dragStart.current!.partPos.y,
                  z: newZ - dragStart.current!.partPos.z
                };
                referenceDistances = calculateGroupReferenceDistances(draggingParts, dragDelta, referenceParts);
              } else {
                referenceDistances = calculateReferenceDistances(part, { x: newX, y: newY, z: newZ }, referenceParts);
              }
            }

            // Batch snap lines + reference distances into single store update
            useSnapStore.getState().setSnapIndicators(snapLines, referenceDistances);
            if (dragFrameCounterRef.current % 10 === 0) {
              dragDebug('partDrag:move:snaps', {
                partId: part.id,
                frame: dragFrameCounterRef.current,
                position: { x: newX, y: newY, z: newZ },
                snappedAxes: {
                  x: snapLines.some((l) => l.axis === 'x'),
                  y: snapLines.some((l) => l.axis === 'y'),
                  z: snapLines.some((l) => l.axis === 'z')
                },
                snapLineTypes: snapLines.map((l) => l.type)
              });
            }
          } else {
            useSnapStore.getState().setSnapIndicators([], []);
            wasSnappedByParts.current = { x: false, y: false, z: false };
          }

          // Check overlap prevention
          const stockConstraints = useProjectStore.getState().stockConstraints;
          const proposedDelta = {
            x: newX - dragStart.current.partPos.x,
            y: newY - dragStart.current.partPos.y,
            z: newZ - dragStart.current.partPos.z
          };

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

        const hasGroupSelected = currentSelectedGroupIds.length > 0;
        const hasMultiplePartsSelected = currentSelectedIds.length > 1 && currentSelectedIds.includes(part.id);
        const shouldMoveMultiple = hasGroupSelected || hasMultiplePartsSelected;

        let effectivePartIds: string[] = [...currentSelectedIds];
        if (hasGroupSelected) {
          for (const groupId of currentSelectedGroupIds) {
            const groupPartIds = getAllDescendantPartIds(groupId, currentGroupMembers);
            effectivePartIds.push(...groupPartIds);
          }
          effectivePartIds = [...new Set(effectivePartIds)];
        }

        if (shouldMoveMultiple && effectivePartIds.length > 0) {
          let maxYAdjustment = 0;

          for (const selectedId of effectivePartIds) {
            const selectedPart = allParts.find((p) => p.id === selectedId);
            if (!selectedPart) continue;

            const worldHalfHeight = calculateWorldHalfHeightFromDegrees(
              selectedPart.rotation,
              selectedPart.length,
              selectedPart.thickness,
              selectedPart.width
            );

            const projectedY = selectedPart.position.y + baseDelta.y;
            const minY = worldHalfHeight;
            const adjustment = Math.max(0, minY - projectedY);
            maxYAdjustment = Math.max(maxYAdjustment, adjustment);
          }

          const adjustedDelta = {
            x: baseDelta.x,
            y: baseDelta.y + maxYAdjustment,
            z: baseDelta.z
          };

          // Check overlap prevention for multi-part move
          const stockConstraints = useProjectStore.getState().stockConstraints;
          if (stockConstraints.preventOverlap) {
            const safeDelta = resolveSafeTranslationDelta(allParts, new Set(effectivePartIds), adjustedDelta);
            if (!safeDelta) {
              dragDebug('partDrag:release:multi:noSafeDelta', {
                partId: part.id,
                adjustedDelta,
                fallbackToPreview: true
              });
              // Keep the last previewed drag delta instead of reverting.
              // Final overlap solve can fail near exact-contact due to precision.
              moveSelectedParts(adjustedDelta);
              useSelectionStore.getState().setActiveDragDelta(null);
              setIsDragging(false);
              dragStart.current = null;
              lastDragPosition.current = null;
              latchedFaceSnapRef.current = null;
              wasSnappedByParts.current = { x: false, y: false, z: false };
              justFinishedDragging.current = dragDistanceSq > 1e-4;
              useSelectionStore.getState().setDraggingPartId(null);
              if (isOrbitControls(controls)) controls.enabled = true;
              useSnapStore.getState().setActiveSnapLines([]);
              useSnapStore.getState().updateReferenceDistances();
              return;
            }
            dragDebug('partDrag:release:multi:safeDelta', { partId: part.id, adjustedDelta, safeDelta });
            adjustedDelta.x = safeDelta.x;
            adjustedDelta.y = safeDelta.y;
            adjustedDelta.z = safeDelta.z;
          }

          dragDebug('partDrag:release:multi:commit', { partId: part.id, delta: adjustedDelta });
          moveSelectedParts(adjustedDelta);
          useSelectionStore.getState().setActiveDragDelta(null);
        } else {
          // Single part - apply ground constraint just to this one
          const singlePartWorldHalfHeight = calculateWorldHalfHeight(
            rotationQuaternion,
            liveDims.length,
            liveDims.thickness,
            liveDims.width
          );
          newY = Math.max(singlePartWorldHalfHeight, newY);

          // Check overlap prevention for final snapped position
          const stockConstraints = useProjectStore.getState().stockConstraints;
          if (stockConstraints.preventOverlap) {
            const safeDelta = resolveSafeTranslationDelta(
              allParts,
              new Set(effectivePartIds.length > 0 ? effectivePartIds : [part.id]),
              { x: baseDelta.x, y: newY - dragStart.current.partPos.y, z: baseDelta.z }
            );
            if (!safeDelta) {
              dragDebug('partDrag:release:single:noSafeDelta', {
                partId: part.id,
                fallbackPosition: { x: newX, y: newY, z: newZ }
              });
              // Commit the last validated preview position to avoid jump-back.
              updatePart(part.id, {
                position: { x: newX, y: newY, z: newZ }
              });
              setIsDragging(false);
              dragStart.current = null;
              lastDragPosition.current = null;
              latchedFaceSnapRef.current = null;
              wasSnappedByParts.current = { x: false, y: false, z: false };
              justFinishedDragging.current = dragDistanceSq > 1e-4;
              useSelectionStore.getState().setDraggingPartId(null);
              if (isOrbitControls(controls)) controls.enabled = true;
              useSnapStore.getState().setActiveSnapLines([]);
              useSnapStore.getState().updateReferenceDistances();
              return;
            }
            dragDebug('partDrag:release:single:safeDelta', {
              partId: part.id,
              baseDelta,
              safeDelta
            });
            newX = dragStart.current.partPos.x + safeDelta.x;
            newY = dragStart.current.partPos.y + safeDelta.y;
            newZ = dragStart.current.partPos.z + safeDelta.z;
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
        justFinishedDragging.current = dragDistanceSq > 1e-4;
        useSelectionStore.getState().setDraggingPartId(null);
        if (isOrbitControls(controls)) controls.enabled = true;
        useSnapStore.getState().setActiveSnapLines([]);
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, liveDims]);

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
      setRightClickTarget({ type: 'part' });
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

    // Determine anchor point for drag
    let anchorPos: THREE.Vector3;

    const hasGroupSelected = currentSelectedGroupIds.length > 0;
    const isInSelectedGroup = ancestorGroupIds.some((groupId) => currentSelectedGroupIds.includes(groupId));
    const hasMultipleParts = currentSelectedPartIds.length > 1;

    // Group-selected part drag should use the thresholded group-drag path (same as InstancedParts).
    if (isInSelectedGroup) {
      if (e.point) {
        startGroupDrag(e.point, e.nativeEvent.clientX, e.nativeEvent.clientY);
      }
      return;
    }

    if (hasGroupSelected || hasMultipleParts) {
      const partIdsToInclude = new Set(currentSelectedPartIds);

      for (const groupId of currentSelectedGroupIds) {
        const collectGroupParts = (gId: string) => {
          for (const member of currentGroupMembers) {
            if (member.groupId === gId) {
              if (member.memberType === 'part') {
                partIdsToInclude.add(member.memberId);
              } else if (member.memberType === 'group') {
                collectGroupParts(member.memberId);
              }
            }
          }
        };
        collectGroupParts(groupId);
      }

      const partsToMeasure = useProjectStore.getState().parts.filter((p) => partIdsToInclude.has(p.id));
      if (partsToMeasure.length > 0) {
        const combinedBounds = getCombinedBounds(partsToMeasure);
        anchorPos = new THREE.Vector3(combinedBounds.centerX, combinedBounds.centerY, combinedBounds.centerZ);
      } else {
        anchorPos = new THREE.Vector3(part.position.x, part.position.y, part.position.z);
      }
    } else {
      anchorPos = new THREE.Vector3(part.position.x, part.position.y, part.position.z);
    }

    getDragPlaneInfo(anchorPos);

    const startPoint = getWorldPoint(e.nativeEvent);
    const partOriginalPos = new THREE.Vector3(part.position.x, part.position.y, part.position.z);
    if (startPoint) {
      setIsDragging(true);
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
