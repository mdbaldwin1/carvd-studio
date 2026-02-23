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
  calculateReferenceDistances,
  calculateGroupReferenceDistances,
  getCombinedBounds
} from '../../utils/snapToPartsUtil';
import { LiveDimensions, snapToGrid } from './partTypes';
import { isOrbitControls, setRightClickTarget } from './workspaceUtils';
import { calculateWorldHalfHeight, calculateWorldHalfHeightFromDegrees } from '../../utils/mathPool';

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

  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const raycaster = useRef(new THREE.Raycaster());

  // Reusable objects for hot-path calculations (avoids GC pressure during drag)
  const _tempVec2 = useRef(new THREE.Vector2());
  const _tempIntersection = useRef(new THREE.Vector3());
  const _tempForward = useRef(new THREE.Vector3());
  const _tempAxisX = useRef(new THREE.Vector3());
  const _tempAxisY = useRef(new THREE.Vector3());
  const _tempAxisZ = useRef(new THREE.Vector3());
  const _tempNormal = useRef(new THREE.Vector3());
  const _tempCameraTarget = useRef(new THREE.Vector3());
  const _tempDelta = useRef(new THREE.Vector3());

  // RAF gating refs for coalescing pointer events to animation frame rate
  const rafIdRef = useRef<number | null>(null);
  const latestEventRef = useRef<PointerEvent | null>(null);

  // Calculate axis-aligned bounding box for a part at a given position (considering rotation)
  const getPartAABB = (p: PartType, position: { x: number; y: number; z: number }) => {
    const bounds = getPartBoundsAtPosition(p, position);
    return {
      minX: bounds.minX,
      maxX: bounds.maxX,
      minY: bounds.minY,
      maxY: bounds.maxY,
      minZ: bounds.minZ,
      maxZ: bounds.maxZ
    };
  };

  const aabbsOverlap = (a: ReturnType<typeof getPartAABB>, b: ReturnType<typeof getPartAABB>) => {
    const epsilon = 0.001;
    return (
      a.minX < b.maxX - epsilon &&
      a.maxX > b.minX + epsilon &&
      a.minY < b.maxY - epsilon &&
      a.maxY > b.minY + epsilon &&
      a.minZ < b.maxZ - epsilon &&
      a.maxZ > b.minZ + epsilon
    );
  };

  const wouldCauseOverlap = (
    newPosition: { x: number; y: number; z: number },
    allParts: PartType[],
    selectedIds: string[],
    delta?: { x: number; y: number; z: number }
  ): boolean => {
    if (part.ignoreOverlap) {
      return false;
    }

    const movingPartIds = new Set(selectedIds.includes(part.id) ? selectedIds : [part.id]);

    const thisPartAABB = getPartAABB(part, newPosition);
    for (const other of allParts) {
      if (movingPartIds.has(other.id)) continue;
      if (other.ignoreOverlap) continue;
      const otherAABB = getPartAABB(other, other.position);
      if (aabbsOverlap(thisPartAABB, otherAABB)) {
        return true;
      }
    }

    if (delta && selectedIds.includes(part.id)) {
      for (const selectedId of selectedIds) {
        if (selectedId === part.id) continue;
        const selectedPart = allParts.find((p) => p.id === selectedId);
        if (!selectedPart) continue;
        if (selectedPart.ignoreOverlap) continue;

        const movedPosition = {
          x: selectedPart.position.x + delta.x,
          y: selectedPart.position.y + delta.y,
          z: selectedPart.position.z + delta.z
        };
        const movedAABB = getPartAABB(selectedPart, movedPosition);

        for (const other of allParts) {
          if (movingPartIds.has(other.id)) continue;
          if (other.ignoreOverlap) continue;
          const otherAABB = getPartAABB(other, other.position);
          if (aabbsOverlap(movedAABB, otherAABB)) {
            return true;
          }
        }
      }
    }

    return false;
  };

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
    axes: { x: boolean; y: boolean; z: boolean };
  };

  const getDragPlaneInfo = useCallback(
    (partPosition: THREE.Vector3): DragPlaneInfo => {
      _tempForward.current.set(0, 0, -1).applyQuaternion(camera.quaternion);

      const dotX = Math.abs(_tempForward.current.dot(_tempAxisX.current.set(1, 0, 0)));
      const dotY = Math.abs(_tempForward.current.dot(_tempAxisY.current.set(0, 1, 0)));
      const dotZ = Math.abs(_tempForward.current.dot(_tempAxisZ.current.set(0, 0, 1)));

      if (dotZ >= dotX && dotZ >= dotY) {
        planeRef.current.setFromNormalAndCoplanarPoint(_tempNormal.current.set(0, 0, 1), partPosition);
        return {
          normal: _tempNormal.current.set(0, 0, 1),
          axes: { x: true, y: true, z: false }
        };
      } else if (dotX >= dotY) {
        planeRef.current.setFromNormalAndCoplanarPoint(_tempNormal.current.set(1, 0, 0), partPosition);
        return {
          normal: _tempNormal.current.set(1, 0, 0),
          axes: { x: false, y: true, z: true }
        };
      } else {
        planeRef.current.setFromNormalAndCoplanarPoint(_tempNormal.current.set(0, 1, 0), partPosition);
        return {
          normal: _tempNormal.current.set(0, 1, 0),
          axes: { x: true, y: false, z: true }
        };
      }
    },
    [camera]
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
      intentListenerCleanup.current = null;
    };

    window.addEventListener('pointermove', handleIntentMove);
    window.addEventListener('pointerup', handleIntentUp);
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
          const planeInfo = getDragPlaneInfo(dragStart.current.partPos);

          let newX = planeInfo.axes.x ? dragStart.current.partPos.x + delta.x : liveDims.x;
          let newY = planeInfo.axes.y ? dragStart.current.partPos.y + delta.y : liveDims.y;
          let newZ = planeInfo.axes.z ? dragStart.current.partPos.z + delta.z : liveDims.z;

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
          const currentReferenceIds = useSnapStore.getState().referencePartIds;
          const snapGuides = useProjectStore.getState().snapGuides;

          const appSettings = useAppSettingsStore.getState().settings;
          const { liveGridSnap, snapSensitivity, snapToOrigin } = appSettings;

          if (liveGridSnap) {
            newX = snapToGrid(newX);
            newZ = snapToGrid(newZ);
            const snappedY = snapToGrid(newY);
            if (snappedY >= worldHalfHeight) {
              newY = snappedY;
            }
          }

          const snapTargetParts =
            currentReferenceIds.length > 0 ? allParts.filter((p) => currentReferenceIds.includes(p.id)) : allParts;

          const snapLines: import('../../types').SnapLine[] = [];

          if (isSnapEnabled) {
            const cameraDistance = camera.position.distanceTo(_tempCameraTarget.current.set(newX, newY, newZ));
            const snapThreshold = calculateSnapThreshold(cameraDistance, snapSensitivity);

            const draggingBounds = getPartBoundsAtPosition(part, { x: newX, y: newY, z: newZ });

            // Check for guide snaps first
            if (snapGuides.length > 0) {
              const guideSnaps = detectGuideSnaps(draggingBounds, snapGuides, snapThreshold);

              if (guideSnaps.x && planeInfo.axes.x) {
                newX += guideSnaps.x.delta;
                const guide = snapGuides.find((g) => g.id === guideSnaps.x!.guideId);
                if (guide) {
                  const updatedBounds = getPartBoundsAtPosition(part, { x: newX, y: newY, z: newZ });
                  snapLines.push(createGuideSnapLine(guide, updatedBounds));
                }
              }
              if (guideSnaps.y && planeInfo.axes.y) {
                const snappedY = newY + guideSnaps.y.delta;
                if (snappedY >= worldHalfHeight) {
                  newY = snappedY;
                  const guide = snapGuides.find((g) => g.id === guideSnaps.y!.guideId);
                  if (guide) {
                    const updatedBounds = getPartBoundsAtPosition(part, { x: newX, y: newY, z: newZ });
                    snapLines.push(createGuideSnapLine(guide, updatedBounds));
                  }
                }
              }
              if (guideSnaps.z && planeInfo.axes.z) {
                newZ += guideSnaps.z.delta;
                const guide = snapGuides.find((g) => g.id === guideSnaps.z!.guideId);
                if (guide) {
                  const updatedBounds = getPartBoundsAtPosition(part, { x: newX, y: newY, z: newZ });
                  snapLines.push(createGuideSnapLine(guide, updatedBounds));
                }
              }
            }

            // Check origin snaps if enabled
            if (snapToOrigin) {
              const currentBounds = getPartBoundsAtPosition(part, { x: newX, y: newY, z: newZ });
              const originSnaps = detectOriginSnaps(currentBounds, snapThreshold);

              if (originSnaps.x && planeInfo.axes.x && snapLines.filter((l) => l.axis === 'x').length === 0) {
                newX += originSnaps.x.delta;
                const updatedBounds = getPartBoundsAtPosition(part, { x: newX, y: newY, z: newZ });
                snapLines.push(createOriginSnapLine('x', originSnaps.x.snapType, updatedBounds));
              }
              if (originSnaps.y && planeInfo.axes.y && snapLines.filter((l) => l.axis === 'y').length === 0) {
                const snappedY = newY + originSnaps.y.delta;
                if (snappedY >= worldHalfHeight) {
                  newY = snappedY;
                  const updatedBounds = getPartBoundsAtPosition(part, { x: newX, y: newY, z: newZ });
                  snapLines.push(createOriginSnapLine('y', originSnaps.y.snapType, updatedBounds));
                }
              }
              if (originSnaps.z && planeInfo.axes.z && snapLines.filter((l) => l.axis === 'z').length === 0) {
                newZ += originSnaps.z.delta;
                const updatedBounds = getPartBoundsAtPosition(part, { x: newX, y: newY, z: newZ });
                snapLines.push(createOriginSnapLine('z', originSnaps.z.snapType, updatedBounds));
              }
            }

            // Check part snaps
            if (snapTargetParts.length > 0 && allParts.length > 1) {
              const faceSnapResult = detectFaceSnaps(
                part,
                { x: newX, y: newY, z: newZ },
                snapTargetParts,
                currentSelectedIds,
                snapThreshold
              );

              if (faceSnapResult.snappedX && planeInfo.axes.x && snapLines.filter((l) => l.axis === 'x').length === 0) {
                newX = faceSnapResult.adjustedPosition.x;
                snapLines.push(...faceSnapResult.snapLines.filter((l) => l.axis === 'x'));
              }
              if (faceSnapResult.snappedY && planeInfo.axes.y && snapLines.filter((l) => l.axis === 'y').length === 0) {
                const snappedY = faceSnapResult.adjustedPosition.y;
                if (snappedY >= worldHalfHeight) {
                  newY = snappedY;
                  snapLines.push(...faceSnapResult.snapLines.filter((l) => l.axis === 'y'));
                }
              }
              if (faceSnapResult.snappedZ && planeInfo.axes.z && snapLines.filter((l) => l.axis === 'z').length === 0) {
                newZ = faceSnapResult.adjustedPosition.z;
                snapLines.push(...faceSnapResult.snapLines.filter((l) => l.axis === 'z'));
              }

              const snapResult = detectSnaps(
                part,
                { x: newX, y: newY, z: newZ },
                snapTargetParts,
                currentSelectedIds,
                snapThreshold
              );

              if (planeInfo.axes.x && snapResult.snappedX && snapLines.filter((l) => l.axis === 'x').length === 0) {
                newX = snapResult.adjustedPosition.x;
              }
              if (planeInfo.axes.y && snapResult.snappedY && snapLines.filter((l) => l.axis === 'y').length === 0) {
                const snappedY = snapResult.adjustedPosition.y;
                if (snappedY >= worldHalfHeight) {
                  newY = snappedY;
                }
              }
              if (planeInfo.axes.z && snapResult.snappedZ && snapLines.filter((l) => l.axis === 'z').length === 0) {
                newZ = snapResult.adjustedPosition.z;
              }

              for (const line of snapResult.snapLines) {
                if (snapLines.filter((l) => l.axis === line.axis).length === 0) {
                  snapLines.push(line);
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
              const currentGroupMembers = useProjectStore.getState().groupMembers;

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
            const wouldOverlap = wouldCauseOverlap(
              { x: newX, y: newY, z: newZ },
              allParts,
              currentSelectedIds,
              proposedDelta
            );

            if (wouldOverlap) {
              return;
            }
          }

          lastDragPosition.current = { x: newX, y: newY, z: newZ };

          const partLiveX = dragStart.current.partOriginalPos.x + proposedDelta.x;
          const partLiveY = dragStart.current.partOriginalPos.y + proposedDelta.y;
          const partLiveZ = dragStart.current.partOriginalPos.z + proposedDelta.z;
          setLiveDims((prev) => ({ ...prev, x: partLiveX, y: partLiveY, z: partLiveZ }));

          const hasGroupSelected = currentSelectedGroupIds.length > 0;
          const hasMultiplePartsSelected = currentSelectedIds.length > 1 && currentSelectedIds.includes(part.id);
          if (hasGroupSelected || hasMultiplePartsSelected) {
            useSelectionStore.getState().setActiveDragDelta(proposedDelta);
          }
        }
      });
    };

    const handleWindowPointerUp = () => {
      if (isDragging && dragStart.current && lastDragPosition.current) {
        const newX = wasSnappedByParts.current.x ? lastDragPosition.current.x : snapToGrid(lastDragPosition.current.x);
        let newY = wasSnappedByParts.current.y ? lastDragPosition.current.y : snapToGrid(lastDragPosition.current.y);
        const newZ = wasSnappedByParts.current.z ? lastDragPosition.current.z : snapToGrid(lastDragPosition.current.z);

        const currentSelectedIds = useSelectionStore.getState().selectedPartIds;
        const currentSelectedGroupIds = useSelectionStore.getState().selectedGroupIds;
        const currentGroupMembers = useProjectStore.getState().groupMembers;
        const allParts = useProjectStore.getState().parts;

        const baseDelta = {
          x: newX - dragStart.current.partPos.x,
          y: newY - dragStart.current.partPos.y,
          z: newZ - dragStart.current.partPos.z
        };

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
            const movingPartIds = new Set(effectivePartIds);
            let hasOverlap = false;

            for (const movingId of effectivePartIds) {
              const movingPart = allParts.find((p) => p.id === movingId);
              if (!movingPart) continue;
              if (movingPart.ignoreOverlap) continue;

              const movedPosition = {
                x: movingPart.position.x + adjustedDelta.x,
                y: movingPart.position.y + adjustedDelta.y,
                z: movingPart.position.z + adjustedDelta.z
              };
              const movedAABB = getPartAABB(movingPart, movedPosition);

              for (const other of allParts) {
                if (movingPartIds.has(other.id)) continue;
                if (other.ignoreOverlap) continue;
                const otherAABB = getPartAABB(other, other.position);
                if (aabbsOverlap(movedAABB, otherAABB)) {
                  hasOverlap = true;
                  break;
                }
              }
              if (hasOverlap) break;
            }

            if (hasOverlap) {
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
              useSelectionStore.getState().setActiveDragDelta(null);
              useSelectionStore.getState().setDraggingPartId(null);
              if (isOrbitControls(controls)) controls.enabled = true;
              useSnapStore.getState().setActiveSnapLines([]);
              useSnapStore.getState().updateReferenceDistances();
              return;
            }
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
            const wouldOverlap = wouldCauseOverlap({ x: newX, y: newY, z: newZ }, allParts, currentSelectedIds);
            if (wouldOverlap) {
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
              wasSnappedByParts.current = { x: false, y: false, z: false };
              useSelectionStore.getState().setDraggingPartId(null);
              if (isOrbitControls(controls)) controls.enabled = true;
              useSnapStore.getState().setActiveSnapLines([]);
              useSnapStore.getState().updateReferenceDistances();
              return;
            }
          }

          updatePart(part.id, {
            position: { x: newX, y: newY, z: newZ }
          });
        }

        setIsDragging(false);
        dragStart.current = null;
        lastDragPosition.current = null;
        wasSnappedByParts.current = { x: false, y: false, z: false };
        justFinishedDragging.current = true;
        useSelectionStore.getState().setDraggingPartId(null);
        if (isOrbitControls(controls)) controls.enabled = true;
        useSnapStore.getState().setActiveSnapLines([]);
        useSnapStore.getState().updateReferenceDistances();
      }
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
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
    const isInSelectedGroup = groupToSelectOnClick && currentSelectedGroupIds.includes(groupToSelectOnClick);
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
