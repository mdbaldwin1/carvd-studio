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
  detectPatternRotationSnap,
  calculateReferenceDistances,
  calculateGroupReferenceDistances,
  getCombinedBounds
} from '../../utils/snapToPartsUtil';
import { resolveSafeTranslationDelta } from '../../utils/overlapPolicy';
import { LiveDimensions, snapToGrid } from './partTypes';
import { isOrbitControls, markPartPointerInteraction, setRightClickTarget } from './workspaceUtils';
import { calculateWorldHalfHeight, calculateWorldHalfHeightFromDegrees } from '../../utils/mathPool';
import { isAxisAlignedRotation } from '../../utils/rotation';
import { createAxisSnapWinners, shouldUseSnapStage, tryApplyAxisSnap, type SnapStage } from '../../utils/snapPriority';

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
  const isFiniteVec3 = (v: { x: number; y: number; z: number }): boolean =>
    Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
  const isAxisAlignedNormal = (normal: { x: number; y: number; z: number }): boolean => {
    const ax = Math.abs(normal.x);
    const ay = Math.abs(normal.y);
    const az = Math.abs(normal.z);
    const max = Math.max(ax, ay, az);
    const sumOthers = ax + ay + az - max;
    return max >= 0.999 && sumOthers <= 0.0015;
  };

  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ point: THREE.Vector3; partPos: THREE.Vector3; partOriginalPos: THREE.Vector3 } | null>(
    null
  );
  const justFinishedDragging = useRef(false);
  const lastDragPosition = useRef<{ x: number; y: number; z: number } | null>(null);
  const wasSnappedByParts = useRef<{ x: boolean; y: boolean; z: boolean }>({ x: false, y: false, z: false });
  const latchedFaceSnapRef = useRef<{
    adjustedPosition: { x: number; y: number; z: number };
    snappedX: boolean;
    snappedY: boolean;
    snappedZ: boolean;
    faceNormal?: { x: number; y: number; z: number };
    snapLines: import('../../types').SnapLine[];
  } | null>(null);
  const patternRotationRef = useRef<{ x: number; y: number; z: number } | null>(null);

  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const raycaster = useRef(new THREE.Raycaster());
  const latchPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));

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
  const _tempRefAxis = useRef(new THREE.Vector3());
  const _tempPlanePoint = useRef(new THREE.Vector3());
  const faceLatchDragRef = useRef<{
    active: boolean;
    pointerStart: THREE.Vector3 | null;
    pointerStartScreen: { x: number; y: number } | null;
    partStart: THREE.Vector3 | null;
    axisU: THREE.Vector3 | null;
    axisV: THREE.Vector3 | null;
    screenBasis: { sux: number; suy: number; svx: number; svy: number } | null;
  }>({
    active: false,
    pointerStart: null,
    pointerStartScreen: null,
    partStart: null,
    axisU: null,
    axisV: null,
    screenBasis: null
  });
  const _tempProjectA = useRef(new THREE.Vector3());
  const _tempProjectB = useRef(new THREE.Vector3());
  const _tempCamRight = useRef(new THREE.Vector3());
  const _tempCamUp = useRef(new THREE.Vector3());

  // RAF gating refs for coalescing pointer events to animation frame rate
  const rafIdRef = useRef<number | null>(null);
  const latestEventRef = useRef<PointerEvent | null>(null);

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

  const getWorldPointOnPlane = useCallback(
    (e: PointerEvent | MouseEvent, normal: THREE.Vector3, coplanarPoint: THREE.Vector3): THREE.Vector3 | null => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(_tempVec2.current.set(x, y), camera);
      latchPlaneRef.current.setFromNormalAndCoplanarPoint(normal, coplanarPoint);
      if (raycaster.current.ray.intersectPlane(latchPlaneRef.current, _tempIntersection.current)) {
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
      // Base drag plane should follow cursor on screen: plane perpendicular to
      // camera line-of-sight through the anchor.
      _tempNormal.current.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
      _tempBasisU.current.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
      _tempBasisV.current.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
      planeRef.current.setFromNormalAndCoplanarPoint(_tempNormal.current, partPosition);
      return {
        normal: _tempNormal.current,
        basisU: _tempBasisU.current,
        basisV: _tempBasisV.current,
        // Plane constraints are encoded in basis vectors; allow world-axis updates from projected result.
        axes: { x: true, y: true, z: true }
      };
    },
    [camera]
  );

  const getFaceLatchPlaneInfo = useCallback((faceNormal: { x: number; y: number; z: number }): DragPlaneInfo => {
    _tempNormal.current.set(faceNormal.x, faceNormal.y, faceNormal.z).normalize();
    _tempRefAxis.current.set(0, 1, 0);
    if (Math.abs(_tempRefAxis.current.dot(_tempNormal.current)) > 0.95) {
      _tempRefAxis.current.set(1, 0, 0);
    }
    _tempBasisU.current.crossVectors(_tempRefAxis.current, _tempNormal.current).normalize();
    _tempBasisV.current.crossVectors(_tempNormal.current, _tempBasisU.current).normalize();
    return {
      normal: _tempNormal.current,
      basisU: _tempBasisU.current,
      basisV: _tempBasisV.current,
      axes: { x: true, y: true, z: true }
    };
  }, []);

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
      if (e.buttons === 0) {
        handleIntentUp();
        return;
      }
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
        useSnapStore.getState().setSnapLabelPosition(null);
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
      // Safety: if button is no longer held but drag state is active, force cleanup via pointer-up handler.
      if (isDragging && e.buttons === 0) {
        handleWindowPointerUp();
        return;
      }

      // Coalesce pointer events to animation frame rate (prevents redundant
      // snap detection on 120-240Hz displays)
      latestEventRef.current = e;
      if (rafIdRef.current !== null) return;
      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = null;
        const evt = latestEventRef.current;
        if (!evt || !isDragging || !dragStart.current) return;

        let currentPoint: THREE.Vector3 | null = null;
        const isSnapEnabledForPlane = useSnapStore.getState().snapToPartsEnabled && !evt.altKey;
        const preventOverlapEnabled = useProjectStore.getState().stockConstraints.preventOverlap;
        const latchedFaceForPlane = latchedFaceSnapRef.current;
        const useFaceLatchPlane = Boolean(
          isSnapEnabledForPlane &&
          latchedFaceForPlane?.faceNormal &&
          !isAxisAlignedNormal(latchedFaceForPlane.faceNormal) &&
          !preventOverlapEnabled
        );
        let planeInfo: DragPlaneInfo;
        let newX: number;
        let newY: number;
        let newZ: number;

        if (useFaceLatchPlane && latchedFaceForPlane?.faceNormal) {
          planeInfo = getFaceLatchPlaneInfo(latchedFaceForPlane.faceNormal);
          const anchorPos = lastDragPosition.current
            ? _tempPlanePoint.current.set(
                lastDragPosition.current.x,
                lastDragPosition.current.y,
                lastDragPosition.current.z
              )
            : _tempPlanePoint.current.copy(dragStart.current.partPos);
          currentPoint = getWorldPointOnPlane(evt, planeInfo.normal, anchorPos);
          if (!currentPoint) return;

          if (
            !faceLatchDragRef.current.active ||
            !faceLatchDragRef.current.pointerStart ||
            !faceLatchDragRef.current.partStart
          ) {
            faceLatchDragRef.current.active = true;
            faceLatchDragRef.current.pointerStart = currentPoint.clone();
            faceLatchDragRef.current.pointerStartScreen = { x: evt.clientX, y: evt.clientY };
            faceLatchDragRef.current.partStart = anchorPos.clone();
            const normal = planeInfo.normal;
            const axisU = _tempCamRight.current.set(1, 0, 0).applyQuaternion(camera.quaternion);
            axisU.addScaledVector(normal, -axisU.dot(normal));
            if (axisU.lengthSq() < 1e-8) {
              axisU.copy(planeInfo.basisU);
            } else {
              axisU.normalize();
            }
            const axisV = _tempCamUp.current.set(0, 1, 0).applyQuaternion(camera.quaternion);
            axisV.addScaledVector(normal, -axisV.dot(normal));
            axisV.addScaledVector(axisU, -axisV.dot(axisU));
            if (axisV.lengthSq() < 1e-8) {
              axisV.crossVectors(normal, axisU);
            }
            axisV.normalize();
            faceLatchDragRef.current.axisU = axisU.clone();
            faceLatchDragRef.current.axisV = axisV.clone();

            const rect = gl.domElement.getBoundingClientRect();
            const p0 = _tempProjectA.current.copy(anchorPos).project(camera);
            const pu = _tempProjectB.current.copy(anchorPos).add(axisU).project(camera);
            const pv = _tempIntersection.current.copy(anchorPos).add(axisV).project(camera);
            faceLatchDragRef.current.screenBasis = {
              sux: (pu.x - p0.x) * 0.5 * rect.width,
              suy: (p0.y - pu.y) * 0.5 * rect.height,
              svx: (pv.x - p0.x) * 0.5 * rect.width,
              svy: (p0.y - pv.y) * 0.5 * rect.height
            };
          }

          const startPart = faceLatchDragRef.current.partStart;
          const startScreen = faceLatchDragRef.current.pointerStartScreen;
          const axisU = faceLatchDragRef.current.axisU;
          const axisV = faceLatchDragRef.current.axisV;
          const screenBasis = faceLatchDragRef.current.screenBasis;
          if (!axisU || !axisV || !screenBasis) return;

          // Map screen-space pointer delta to stable in-plane axes aligned with camera right/up.
          const { sux, suy, svx, svy } = screenBasis;
          const mdx = evt.clientX - startScreen.x;
          const mdy = evt.clientY - startScreen.y;
          const det = sux * svy - suy * svx;

          let uAmount: number;
          let vAmount: number;
          if (Math.abs(det) > 1e-5) {
            uAmount = (mdx * svy - mdy * svx) / det;
            vAmount = (mdy * sux - mdx * suy) / det;
          } else {
            // Degenerate projection (camera nearly edge-on): fall back to ray/plane.
            const delta = _tempDelta.current.copy(currentPoint).sub(faceLatchDragRef.current.pointerStart);
            uAmount = delta.dot(axisU);
            vAmount = delta.dot(axisV);
          }

          const projectedDelta = _tempProjectedDelta.current
            .copy(axisU)
            .multiplyScalar(uAmount)
            .add(_tempBasisV.current.copy(axisV).multiplyScalar(vAmount));

          newX = startPart.x + projectedDelta.x;
          newY = startPart.y + projectedDelta.y;
          newZ = startPart.z + projectedDelta.z;
        } else {
          faceLatchDragRef.current.active = false;
          faceLatchDragRef.current.pointerStart = null;
          faceLatchDragRef.current.pointerStartScreen = null;
          faceLatchDragRef.current.partStart = null;
          faceLatchDragRef.current.axisU = null;
          faceLatchDragRef.current.axisV = null;
          faceLatchDragRef.current.screenBasis = null;

          currentPoint = getWorldPoint(evt);
          if (!currentPoint) return;
          planeInfo = getDragPlaneInfo(dragStart.current.partPos);
          const delta = _tempDelta.current.copy(currentPoint).sub(dragStart.current.point);

          const uAmount = delta.dot(planeInfo.basisU);
          const vAmount = delta.dot(planeInfo.basisV);
          const projectedDelta = _tempProjectedDelta.current
            .copy(planeInfo.basisU)
            .multiplyScalar(uAmount)
            .add(_tempBasisV.current.copy(planeInfo.basisV).multiplyScalar(vAmount));

          newX = dragStart.current.partPos.x + projectedDelta.x;
          newY = dragStart.current.partPos.y + projectedDelta.y;
          newZ = dragStart.current.partPos.z + projectedDelta.z;
        }

        if (currentPoint) {
          if (!isFiniteVec3({ x: newX, y: newY, z: newZ })) {
            return;
          }

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
            liveGridSnap,
            snapSensitivity,
            snapToOrigin,
            enableSurfaceAnchors,
            enableFractionalAnchors,
            enableGoldenRatioAnchors,
            enableFeatureAnchors,
            enableLayoutSnaps,
            enableEqualSpacingSnap,
            enableDistributionSnap,
            enablePatternSnap,
            enableAxisLegacySnaps,
            showSnapCandidates
          } = appSettings;

          const hasActiveFaceLatch =
            latchedFaceSnapRef.current !== null &&
            isSnapEnabled &&
            !!latchedFaceSnapRef.current.faceNormal &&
            !isAxisAlignedNormal(latchedFaceSnapRef.current.faceNormal) &&
            !stockConstraints.preventOverlap;
          if (liveGridSnap && !hasActiveFaceLatch) {
            newX = snapToGrid(newX);
            newZ = snapToGrid(newZ);
            const snappedY = snapToGrid(newY);
            if (snappedY >= worldHalfHeight) {
              newY = snappedY;
            }
          }

          // When face-latched, preserve flush contact by constraining motion to
          // the latched face tangent plane. This prevents world-axis drift on
          // angled assemblies when cursor movement is camera-projected.
          if (hasActiveFaceLatch && latchedFaceSnapRef.current?.faceNormal) {
            const latched = latchedFaceSnapRef.current;
            const nx = latched.faceNormal.x;
            const ny = latched.faceNormal.y;
            const nz = latched.faceNormal.z;
            const offsetX = newX - latched.adjustedPosition.x;
            const offsetY = newY - latched.adjustedPosition.y;
            const offsetZ = newZ - latched.adjustedPosition.z;
            const normalDistance = offsetX * nx + offsetY * ny + offsetZ * nz;
            newX -= nx * normalDistance;
            newY -= ny * normalDistance;
            newZ -= nz * normalDistance;
          }

          const snapTargetParts =
            currentReferenceIds.length > 0 ? allParts.filter((p) => currentReferenceIds.includes(p.id)) : allParts;

          const snapLines: import('../../types').SnapLine[] = [];
          const axisSnapWinners = createAxisSnapWinners();
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
            const snapPerfStart = performance.now();
            const cameraDistance = camera.position.distanceTo(_tempCameraTarget.current.set(newX, newY, newZ));
            const snapThreshold = calculateSnapThreshold(cameraDistance, snapSensitivity);
            const hasLatchedFaceAtStart = latchedFaceSnapRef.current !== null;

            const draggingBounds = getPartBoundsAtPosition(part, { x: newX, y: newY, z: newZ });

            // Check for guide snaps first
            if (!hasLatchedFaceAtStart && snapGuides.length > 0) {
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
            if (!hasLatchedFaceAtStart && snapToOrigin) {
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
                latchedFaceSnapRef.current = {
                  adjustedPosition: faceSnapResult.adjustedPosition,
                  snappedX: faceSnapResult.snappedX,
                  snappedY: faceSnapResult.snappedY,
                  snappedZ: faceSnapResult.snappedZ,
                  faceNormal: faceSnapResult.faceNormal,
                  snapLines: faceSnapResult.snapLines
                };
              } else if (
                latchedFaceSnapRef.current &&
                faceSnapResult.closestDistance !== undefined &&
                faceSnapResult.closestDistance < snapThreshold * 1.1
              ) {
                const latched = latchedFaceSnapRef.current;
                // Break out of a latched face snap only when separation grows along
                // the latched face normal, so tangential sliding stays smooth.
                const breakoutDistance = Math.max(0.12, snapThreshold * 0.6);
                let shouldBreakLatch = false;

                if (latched.faceNormal) {
                  const offsetX = newX - latched.adjustedPosition.x;
                  const offsetY = newY - latched.adjustedPosition.y;
                  const offsetZ = newZ - latched.adjustedPosition.z;
                  const normalDistance = Math.abs(
                    offsetX * latched.faceNormal.x + offsetY * latched.faceNormal.y + offsetZ * latched.faceNormal.z
                  );
                  shouldBreakLatch = normalDistance > breakoutDistance;
                } else {
                  const breakX = latched.snappedX && Math.abs(newX - latched.adjustedPosition.x) > breakoutDistance;
                  const breakY = latched.snappedY && Math.abs(newY - latched.adjustedPosition.y) > breakoutDistance;
                  const breakZ = latched.snappedZ && Math.abs(newZ - latched.adjustedPosition.z) > breakoutDistance;
                  shouldBreakLatch = breakX || breakY || breakZ;
                }

                if (!shouldBreakLatch) {
                  faceSnapResult.adjustedPosition = latched.adjustedPosition;
                  faceSnapResult.snappedX = latched.snappedX;
                  faceSnapResult.snappedY = latched.snappedY;
                  faceSnapResult.snappedZ = latched.snappedZ;
                  faceSnapResult.faceNormal = latched.faceNormal;
                  faceSnapResult.snapLines = latched.snapLines.map((line) => ({ ...line, state: 'latched' }));
                } else {
                  latchedFaceSnapRef.current = null;
                }
              } else {
                latchedFaceSnapRef.current = null;
              }

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

              const hasLatchedFaceNow = latchedFaceSnapRef.current !== null;

              if (!hasLatchedFaceNow && (enableSurfaceAnchors ?? true)) {
                const surfaceSnapResult = detectSurfaceAnchorSnaps(
                  part,
                  { x: newX, y: newY, z: newZ },
                  snapTargetParts,
                  effectiveDraggingIds,
                  snapThreshold
                );
                if (surfaceSnapResult.snappedX || surfaceSnapResult.snappedY || surfaceSnapResult.snappedZ) {
                  if (planeInfo.axes.x && surfaceSnapResult.snappedX) {
                    tryApplyStageForAxis('x', 'surface', () => ({
                      accepted: true,
                      lines: (() => {
                        newX = surfaceSnapResult.adjustedPosition.x;
                        return surfaceSnapResult.snapLines.filter((l) => l.axis === 'x');
                      })()
                    }));
                  }
                  if (planeInfo.axes.y && surfaceSnapResult.snappedY) {
                    tryApplyStageForAxis('y', 'surface', () => {
                      const snappedY = surfaceSnapResult.adjustedPosition.y;
                      if (snappedY < worldHalfHeight) return { accepted: false };
                      newY = snappedY;
                      return { accepted: true, lines: surfaceSnapResult.snapLines.filter((l) => l.axis === 'y') };
                    });
                  }
                  if (planeInfo.axes.z && surfaceSnapResult.snappedZ) {
                    tryApplyStageForAxis('z', 'surface', () => ({
                      accepted: true,
                      lines: (() => {
                        newZ = surfaceSnapResult.adjustedPosition.z;
                        return surfaceSnapResult.snapLines.filter((l) => l.axis === 'z');
                      })()
                    }));
                  }
                }
              }

              if (!hasLatchedFaceNow && (enableFractionalAnchors ?? true)) {
                const fractionSnapResult = detectFractionalFaceSnaps(
                  part,
                  { x: newX, y: newY, z: newZ },
                  snapTargetParts,
                  effectiveDraggingIds,
                  snapThreshold,
                  undefined,
                  enableGoldenRatioAnchors ?? false
                );
                if (fractionSnapResult.snappedX || fractionSnapResult.snappedY || fractionSnapResult.snappedZ) {
                  if (planeInfo.axes.x && fractionSnapResult.snappedX) {
                    tryApplyStageForAxis('x', 'fraction', () => ({
                      accepted: true,
                      lines: (() => {
                        newX = fractionSnapResult.adjustedPosition.x;
                        return fractionSnapResult.snapLines.filter((l) => l.axis === 'x');
                      })()
                    }));
                  }
                  if (planeInfo.axes.y && fractionSnapResult.snappedY) {
                    tryApplyStageForAxis('y', 'fraction', () => {
                      const snappedY = fractionSnapResult.adjustedPosition.y;
                      if (snappedY < worldHalfHeight) return { accepted: false };
                      newY = snappedY;
                      return { accepted: true, lines: fractionSnapResult.snapLines.filter((l) => l.axis === 'y') };
                    });
                  }
                  if (planeInfo.axes.z && fractionSnapResult.snappedZ) {
                    tryApplyStageForAxis('z', 'fraction', () => ({
                      accepted: true,
                      lines: (() => {
                        newZ = fractionSnapResult.adjustedPosition.z;
                        return fractionSnapResult.snapLines.filter((l) => l.axis === 'z');
                      })()
                    }));
                  }
                }
              }

              // Feature snaps can still help on tangential axes even while a face snap is active.
              // Per-axis arbitration keeps face wins on their axis (face priority > feature).
              if (!hasLatchedFaceNow && (enableFeatureAnchors ?? true)) {
                const featureSnapResult = detectFeatureSnaps(
                  part,
                  { x: newX, y: newY, z: newZ },
                  snapTargetParts,
                  effectiveDraggingIds,
                  snapThreshold
                );
                if (featureSnapResult.snappedX || featureSnapResult.snappedY || featureSnapResult.snappedZ) {
                  if (planeInfo.axes.x && featureSnapResult.snappedX) {
                    tryApplyStageForAxis('x', 'feature', () => ({
                      accepted: true,
                      lines: (() => {
                        newX = featureSnapResult.adjustedPosition.x;
                        return featureSnapResult.snapLines.filter((l) => l.axis === 'x');
                      })()
                    }));
                  }
                  if (planeInfo.axes.y && featureSnapResult.snappedY) {
                    tryApplyStageForAxis('y', 'feature', () => {
                      const snappedY = featureSnapResult.adjustedPosition.y;
                      if (snappedY < worldHalfHeight) return { accepted: false };
                      newY = snappedY;
                      return { accepted: true, lines: featureSnapResult.snapLines.filter((l) => l.axis === 'y') };
                    });
                  }
                  if (planeInfo.axes.z && featureSnapResult.snappedZ) {
                    tryApplyStageForAxis('z', 'feature', () => ({
                      accepted: true,
                      lines: (() => {
                        newZ = featureSnapResult.adjustedPosition.z;
                        return featureSnapResult.snapLines.filter((l) => l.axis === 'z');
                      })()
                    }));
                  }
                }
              }

              // Legacy axis-based snapping is intentionally disabled for angled assemblies.
              const axisAlignedContext =
                isAxisAlignedRotation(part.rotation) &&
                snapTargetParts.every((candidate) =>
                  effectiveDraggingIds.includes(candidate.id) ? true : isAxisAlignedRotation(candidate.rotation)
                );
              if (!hasLatchedFaceNow && axisAlignedContext && (enableAxisLegacySnaps ?? true)) {
                const snapResult = detectSnaps(
                  part,
                  { x: newX, y: newY, z: newZ },
                  snapTargetParts,
                  effectiveDraggingIds,
                  snapThreshold,
                  {
                    enableLayoutSnaps: enableLayoutSnaps ?? true,
                    enableEqualSpacingSnap: enableEqualSpacingSnap ?? true,
                    enableDistributionSnap: enableDistributionSnap ?? true,
                    enablePatternSnap: enablePatternSnap ?? true
                  }
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

              const hasGroupSelectedForPattern = currentSelectedGroupIds.length > 0;
              const hasMultiplePartsSelectedForPattern = effectiveDraggingIds.length > 1;
              if (
                !hasLatchedFaceNow &&
                !hasGroupSelectedForPattern &&
                !hasMultiplePartsSelectedForPattern &&
                (enablePatternSnap ?? true)
              ) {
                const rotationPattern = detectPatternRotationSnap(part, snapTargetParts, effectiveDraggingIds, 10);
                patternRotationRef.current = rotationPattern?.rotation ?? null;
              } else {
                patternRotationRef.current = null;
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
            const winnerLines = snapLines.map((line) => ({ ...line, state: line.state ?? ('winner' as const) }));
            const candidateLines =
              showSnapCandidates || evt.shiftKey
                ? winnerLines.map((line) => ({ ...line, state: 'candidate' as const }))
                : [];
            useSnapStore.getState().setSnapIndicators([...winnerLines, ...candidateLines], referenceDistances);
            useSnapStore.getState().setSnapLabelPosition({ x: newX, y: newY, z: newZ });
            useSnapStore.getState().recordSnapPerfSample(performance.now() - snapPerfStart);
          } else {
            useSnapStore.getState().setSnapIndicators([], []);
            useSnapStore.getState().setSnapLabelPosition(null);
            patternRotationRef.current = null;
            wasSnappedByParts.current = { x: false, y: false, z: false };
          }

          // Check overlap prevention
          const stockConstraints = useProjectStore.getState().stockConstraints;
          const proposedDelta = {
            x: newX - dragStart.current.partPos.x,
            y: newY - dragStart.current.partPos.y,
            z: newZ - dragStart.current.partPos.z
          };
          if (!isFiniteVec3(proposedDelta)) {
            return;
          }

          if (stockConstraints.preventOverlap) {
            const safeDelta = resolveSafeTranslationDelta(allParts, new Set(effectiveDraggingIds), proposedDelta, {
              allowAxisSliding: latchedFaceSnapRef.current === null
            });
            if (!safeDelta) {
              return;
            }
            if (!isFiniteVec3(safeDelta)) {
              return;
            }
            const clippedByOverlap =
              Math.abs(safeDelta.x - proposedDelta.x) > 1e-6 ||
              Math.abs(safeDelta.y - proposedDelta.y) > 1e-6 ||
              Math.abs(safeDelta.z - proposedDelta.z) > 1e-6;
            const hasFaceLatch = latchedFaceSnapRef.current !== null && isSnapEnabled;

            if (hasFaceLatch && clippedByOverlap) {
              // When pushing into a blocked face-latch contact, keep the prior accepted
              // position to avoid secondary-axis drift (camera in/out movement).
              const fallbackDelta = lastDragPosition.current
                ? {
                    x: lastDragPosition.current.x - dragStart.current.partPos.x,
                    y: lastDragPosition.current.y - dragStart.current.partPos.y,
                    z: lastDragPosition.current.z - dragStart.current.partPos.z
                  }
                : { x: 0, y: 0, z: 0 };
              newX = dragStart.current.partPos.x + fallbackDelta.x;
              newY = dragStart.current.partPos.y + fallbackDelta.y;
              newZ = dragStart.current.partPos.z + fallbackDelta.z;
            } else {
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
        if (
          !isFiniteVec3(lastDragPosition.current) ||
          !isFiniteVec3({
            x: dragStart.current.partPos.x,
            y: dragStart.current.partPos.y,
            z: dragStart.current.partPos.z
          })
        ) {
          setIsDragging(false);
          dragStart.current = null;
          lastDragPosition.current = null;
          latchedFaceSnapRef.current = null;
          wasSnappedByParts.current = { x: false, y: false, z: false };
          justFinishedDragging.current = false;
          useSelectionStore.getState().setActiveDragDelta(null);
          useSelectionStore.getState().setDraggingPartId(null);
          if (isOrbitControls(controls)) controls.enabled = true;
          useSnapStore.getState().setActiveSnapLines([]);
          useSnapStore.getState().setSnapLabelPosition(null);
          patternRotationRef.current = null;
          useSnapStore.getState().updateReferenceDistances();
          return;
        }

        const dragDistanceSq =
          (lastDragPosition.current.x - dragStart.current.partOriginalPos.x) ** 2 +
          (lastDragPosition.current.y - dragStart.current.partOriginalPos.y) ** 2 +
          (lastDragPosition.current.z - dragStart.current.partOriginalPos.z) ** 2;
        let newX = wasSnappedByParts.current.x ? lastDragPosition.current.x : snapToGrid(lastDragPosition.current.x);
        let newY = wasSnappedByParts.current.y ? lastDragPosition.current.y : snapToGrid(lastDragPosition.current.y);
        let newZ = wasSnappedByParts.current.z ? lastDragPosition.current.z : snapToGrid(lastDragPosition.current.z);

        const currentSelectedIds = useSelectionStore.getState().selectedPartIds;
        const currentSelectedGroupIds = useSelectionStore.getState().selectedGroupIds;
        const currentGroupMembers = useProjectStore.getState().groupMembers;
        const allParts = useProjectStore.getState().parts;

        const baseDelta = {
          x: newX - dragStart.current.partPos.x,
          y: newY - dragStart.current.partPos.y,
          z: newZ - dragStart.current.partPos.z
        };
        if (!isFiniteVec3(baseDelta)) {
          setIsDragging(false);
          dragStart.current = null;
          lastDragPosition.current = null;
          latchedFaceSnapRef.current = null;
          wasSnappedByParts.current = { x: false, y: false, z: false };
          justFinishedDragging.current = false;
          useSelectionStore.getState().setActiveDragDelta(null);
          useSelectionStore.getState().setDraggingPartId(null);
          if (isOrbitControls(controls)) controls.enabled = true;
          useSnapStore.getState().setActiveSnapLines([]);
          useSnapStore.getState().setSnapLabelPosition(null);
          patternRotationRef.current = null;
          useSnapStore.getState().updateReferenceDistances();
          return;
        }

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
          if (!isFiniteVec3(adjustedDelta)) {
            setIsDragging(false);
            dragStart.current = null;
            lastDragPosition.current = null;
            latchedFaceSnapRef.current = null;
            wasSnappedByParts.current = { x: false, y: false, z: false };
            justFinishedDragging.current = false;
            useSelectionStore.getState().setActiveDragDelta(null);
            useSelectionStore.getState().setDraggingPartId(null);
            if (isOrbitControls(controls)) controls.enabled = true;
            useSnapStore.getState().setActiveSnapLines([]);
            useSnapStore.getState().setSnapLabelPosition(null);
            patternRotationRef.current = null;
            useSnapStore.getState().updateReferenceDistances();
            return;
          }

          // Check overlap prevention for multi-part move
          const stockConstraints = useProjectStore.getState().stockConstraints;
          if (stockConstraints.preventOverlap) {
            const safeDelta = resolveSafeTranslationDelta(allParts, new Set(effectivePartIds), adjustedDelta, {
              allowAxisSliding: latchedFaceSnapRef.current === null
            });
            if (!safeDelta) {
              setLiveDims({
                x: part.position.x,
                y: part.position.y,
                z: part.position.z,
                length: liveDims.length,
                width: liveDims.width,
                thickness: liveDims.thickness
              });
              setIsDragging(false);
              dragStart.current = null;
              lastDragPosition.current = null;
              latchedFaceSnapRef.current = null;
              useSelectionStore.getState().setActiveDragDelta(null);
              useSelectionStore.getState().setDraggingPartId(null);
              if (isOrbitControls(controls)) controls.enabled = true;
              useSnapStore.getState().setActiveSnapLines([]);
              useSnapStore.getState().setSnapLabelPosition(null);
              patternRotationRef.current = null;
              useSnapStore.getState().updateReferenceDistances();
              return;
            }
            if (!isFiniteVec3(safeDelta)) {
              setIsDragging(false);
              dragStart.current = null;
              lastDragPosition.current = null;
              latchedFaceSnapRef.current = null;
              wasSnappedByParts.current = { x: false, y: false, z: false };
              justFinishedDragging.current = false;
              useSelectionStore.getState().setActiveDragDelta(null);
              useSelectionStore.getState().setDraggingPartId(null);
              if (isOrbitControls(controls)) controls.enabled = true;
              useSnapStore.getState().setActiveSnapLines([]);
              useSnapStore.getState().setSnapLabelPosition(null);
              patternRotationRef.current = null;
              useSnapStore.getState().updateReferenceDistances();
              return;
            }
            adjustedDelta.x = safeDelta.x;
            adjustedDelta.y = safeDelta.y;
            adjustedDelta.z = safeDelta.z;
          }

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
              { x: baseDelta.x, y: newY - dragStart.current.partPos.y, z: baseDelta.z },
              { allowAxisSliding: latchedFaceSnapRef.current === null }
            );
            if (!safeDelta) {
              setLiveDims({
                x: part.position.x,
                y: part.position.y,
                z: part.position.z,
                length: liveDims.length,
                width: liveDims.width,
                thickness: liveDims.thickness
              });
              setIsDragging(false);
              dragStart.current = null;
              lastDragPosition.current = null;
              latchedFaceSnapRef.current = null;
              wasSnappedByParts.current = { x: false, y: false, z: false };
              useSelectionStore.getState().setDraggingPartId(null);
              if (isOrbitControls(controls)) controls.enabled = true;
              useSnapStore.getState().setActiveSnapLines([]);
              useSnapStore.getState().setSnapLabelPosition(null);
              patternRotationRef.current = null;
              useSnapStore.getState().updateReferenceDistances();
              return;
            }
            if (!isFiniteVec3(safeDelta)) {
              setIsDragging(false);
              dragStart.current = null;
              lastDragPosition.current = null;
              latchedFaceSnapRef.current = null;
              wasSnappedByParts.current = { x: false, y: false, z: false };
              justFinishedDragging.current = false;
              useSelectionStore.getState().setDraggingPartId(null);
              if (isOrbitControls(controls)) controls.enabled = true;
              useSnapStore.getState().setActiveSnapLines([]);
              useSnapStore.getState().setSnapLabelPosition(null);
              patternRotationRef.current = null;
              useSnapStore.getState().updateReferenceDistances();
              return;
            }
            newX = dragStart.current.partPos.x + safeDelta.x;
            newY = dragStart.current.partPos.y + safeDelta.y;
            newZ = dragStart.current.partPos.z + safeDelta.z;
          }

          if (!isFiniteVec3({ x: newX, y: newY, z: newZ })) {
            setIsDragging(false);
            dragStart.current = null;
            lastDragPosition.current = null;
            latchedFaceSnapRef.current = null;
            wasSnappedByParts.current = { x: false, y: false, z: false };
            justFinishedDragging.current = false;
            useSelectionStore.getState().setDraggingPartId(null);
            if (isOrbitControls(controls)) controls.enabled = true;
            useSnapStore.getState().setActiveSnapLines([]);
            useSnapStore.getState().setSnapLabelPosition(null);
            patternRotationRef.current = null;
            useSnapStore.getState().updateReferenceDistances();
            return;
          }

          updatePart(part.id, {
            position: { x: newX, y: newY, z: newZ },
            ...(patternRotationRef.current ? { rotation: patternRotationRef.current } : {})
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
        useSnapStore.getState().setSnapLabelPosition(null);
        patternRotationRef.current = null;
        useSnapStore.getState().updateReferenceDistances();
      } else if (isDragging) {
        // Defensive fallback for partial drag-state races.
        setIsDragging(false);
        dragStart.current = null;
        lastDragPosition.current = null;
        latchedFaceSnapRef.current = null;
        wasSnappedByParts.current = { x: false, y: false, z: false };
        justFinishedDragging.current = false;
        useSelectionStore.getState().setActiveDragDelta(null);
        useSelectionStore.getState().setDraggingPartId(null);
        if (isOrbitControls(controls)) controls.enabled = true;
        useSnapStore.getState().setActiveSnapLines([]);
        useSnapStore.getState().setSnapLabelPosition(null);
        patternRotationRef.current = null;
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
    markPartPointerInteraction();
    faceLatchDragRef.current.active = false;
    faceLatchDragRef.current.pointerStart = null;
    faceLatchDragRef.current.pointerStartScreen = null;
    faceLatchDragRef.current.partStart = null;
    faceLatchDragRef.current.axisU = null;
    faceLatchDragRef.current.axisV = null;
    faceLatchDragRef.current.screenBasis = null;

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
      if (isOrbitControls(controls)) controls.enabled = false;
    }
  };

  return { isDragging, justFinishedDragging, handlePointerDown };
}
