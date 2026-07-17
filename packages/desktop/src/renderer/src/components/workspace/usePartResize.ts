import { useCallback, useEffect, useRef, useState } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { Part as PartType } from '../../types';
import { useProjectStore } from '../../store/projectStore';
import { useSnapStore } from '../../store/snapStore';
import { useAppSettingsStore } from '../../store/appSettingsStore';
import { useInteractionStore } from '../../store/interactionStore';
import {
  beginResizeInteractionSession,
  clearTransformInteractionPreviewKeepingSelectionDelta,
  publishResizeInteractionPreview
} from '../../utils/interactionSession';
import { LiveDimensions, HandlePosition, snapToGrid } from './partTypes';
import {
  bindWindowPointerSession,
  createPointerRafQueue,
  pauseOrbitControls,
  resumeOrbitControls
} from './workspaceUtils';
import {
  createResizeCommitPreview,
  createResizeCommitState,
  resizeTool,
  type ResizeToolState
} from '../../interaction/tools/resizeTool';
import { applyCommitInstructions } from '../../interaction/tools/toolSolver';
import { resolveResizeReleaseMove } from '../../utils/interactionMovement';

/**
 * Hook encapsulating all resize logic for a Part component.
 * Manages resize state, pointer events, dimension snapping, and store updates.
 */
export function usePartResize(
  part: PartType,
  liveDims: LiveDimensions,
  setLiveDims: React.Dispatch<React.SetStateAction<LiveDimensions>>,
  rotationQuaternion: THREE.Quaternion,
  inverseRotationQuaternion: THREE.Quaternion,
  camera: THREE.Camera,
  gl: THREE.WebGLRenderer,
  controls: THREE.EventDispatcher<object> | null,
  updatePart: (id: string, updates: Partial<PartType>) => void
) {
  const [isResizing, setIsResizing] = useState(false);
  const snappedDimensionsRef = useRef<{ length: boolean; width: boolean; thickness: boolean }>({
    length: false,
    width: false,
    thickness: false
  });
  const resizeStart = useRef<{
    handlePos: HandlePosition;
    startPoint: THREE.Vector3;
    partPos: THREE.Vector3;
    partLength: number;
    partWidth: number;
    partThickness: number;
  } | null>(null);
  const resizeToolStateRef = useRef<ResizeToolState | null>(null);

  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const raycaster = useRef(new THREE.Raycaster());

  // Reusable objects for hot-path calculations (avoids GC pressure during resize)
  const _tempVec2 = useRef(new THREE.Vector2());
  const _tempIntersection = useRef(new THREE.Vector3());
  const _tempForward = useRef(new THREE.Vector3());
  const _tempAxisX = useRef(new THREE.Vector3());
  const _tempAxisY = useRef(new THREE.Vector3());
  const _tempAxisZ = useRef(new THREE.Vector3());
  const _tempNormal = useRef(new THREE.Vector3());
  const _tempLocalDelta = useRef(new THREE.Vector3());
  const _tempWorldDelta = useRef(new THREE.Vector3());
  const _tempLocalOffset = useRef(new THREE.Vector3());
  const _tempWorldOffset = useRef(new THREE.Vector3());
  const _tempCameraTarget = useRef(new THREE.Vector3());

  // Transform a world-space vector to local space (accounts for part rotation)
  const worldToLocal = (worldDelta: THREE.Vector3): THREE.Vector3 => {
    return _tempLocalDelta.current.copy(worldDelta).applyQuaternion(inverseRotationQuaternion);
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

  const getDragPlaneInfo = useCallback(
    (partPosition: THREE.Vector3) => {
      _tempForward.current.set(0, 0, -1).applyQuaternion(camera.quaternion);

      // Camera-aware local-plane selection improves resize behavior for arbitrarily rotated parts.
      const xAxis = _tempAxisX.current.set(1, 0, 0).applyQuaternion(rotationQuaternion).normalize();
      const yAxis = _tempAxisY.current.set(0, 1, 0).applyQuaternion(rotationQuaternion).normalize();
      const zAxis = _tempAxisZ.current.set(0, 0, 1).applyQuaternion(rotationQuaternion).normalize();

      const dotX = Math.abs(_tempForward.current.dot(xAxis));
      const dotY = Math.abs(_tempForward.current.dot(yAxis));
      const dotZ = Math.abs(_tempForward.current.dot(zAxis));

      if (dotZ >= dotX && dotZ >= dotY) {
        planeRef.current.setFromNormalAndCoplanarPoint(_tempNormal.current.copy(zAxis), partPosition);
      } else if (dotX >= dotY) {
        planeRef.current.setFromNormalAndCoplanarPoint(_tempNormal.current.copy(xAxis), partPosition);
      } else {
        planeRef.current.setFromNormalAndCoplanarPoint(_tempNormal.current.copy(yAxis), partPosition);
      }
    },
    [camera, rotationQuaternion]
  );

  const handleResizeMove = (currentPoint: THREE.Vector3) => {
    if (!resizeStart.current) return;

    const { handlePos, startPoint, partPos, partLength, partWidth, partThickness } = resizeStart.current;
    const worldDelta = _tempWorldDelta.current.copy(currentPoint).sub(startPoint);
    const localDelta = worldToLocal(worldDelta);

    // Get constraint settings from store
    const stockConstraints = useProjectStore.getState().stockConstraints;
    const stocks = useProjectStore.getState().stocks;
    const assignedStock = part.stockId ? stocks.find((s) => s.id === part.stockId) : null;

    // Apply dimension matching snap if enabled
    const isSnapEnabled = useSnapStore.getState().snapToPartsEnabled;
    const allParts = useProjectStore.getState().parts;
    const currentReferenceIds = useSnapStore.getState().referencePartIds;
    const currentGroupMembers = useProjectStore.getState().groupMembers;
    const currentActiveReferenceState = useInteractionStore.getState().activeSession?.referenceState ?? null;
    const units = useProjectStore.getState().units;

    const appSettings = useAppSettingsStore.getState().settings;
    const cameraDistance = camera.position.distanceTo(_tempCameraTarget.current.set(partPos.x, partPos.y, partPos.z));
    const toolInput = {
      part,
      handlePos,
      localDelta: { x: localDelta.x, y: localDelta.y, z: localDelta.z },
      partPosition: { x: partPos.x, y: partPos.y, z: partPos.z },
      startingDimensions: {
        length: partLength,
        width: partWidth,
        thickness: partThickness
      },
      assignedStock,
      constrainDimensions: stockConstraints.constrainDimensions,
      rotationQuaternion,
      referenceParts: allParts,
      referencePartIds: currentReferenceIds,
      groupMembers: currentGroupMembers,
      latchedRelationId: currentActiveReferenceState?.activeRelationId ?? null,
      latchedAxis: currentActiveReferenceState?.latchedAxis ?? null,
      snapToPartsEnabled: isSnapEnabled,
      appSettings,
      units,
      cameraDistance
    };
    if (!resizeToolStateRef.current) {
      resizeToolStateRef.current = resizeTool.begin(toolInput);
    }
    const toolResult = resizeTool.update(toolInput, resizeToolStateRef.current);
    resizeToolStateRef.current = toolResult.state;
    const preview = toolResult.preview;

    snappedDimensionsRef.current = preview.snappedDimensions;
    useSnapStore.getState().setSnapIndicators(preview.snapLines, []);

    // Note: We don't clamp to ground during live resize to avoid the "opposite direction"
    // bug where clamping position but not dimensions causes inconsistent behavior.
    // Ground constraint is enforced in finishResize().

    setLiveDims((prev) => ({
      ...prev,
      x: preview.position.x,
      y: preview.position.y,
      z: preview.position.z,
      length: preview.dimensions.length,
      width: preview.dimensions.width,
      thickness: preview.dimensions.thickness
    }));
    publishResizeInteractionPreview({
      dimensions: {
        length: preview.dimensions.length,
        width: preview.dimensions.width,
        thickness: preview.dimensions.thickness
      },
      position: {
        x: preview.position.x,
        y: preview.position.y,
        z: preview.position.z
      },
      referenceState: preview.referenceState
    });
  };

  const finishResize = () => {
    if (!resizeStart.current) return;

    const { handlePos, partPos, partLength, partWidth, partThickness } = resizeStart.current;

    const stockConstraints = useProjectStore.getState().stockConstraints;
    const stocks = useProjectStore.getState().stocks;
    const assignedStock = part.stockId ? stocks.find((s) => s.id === part.stockId) : null;
    const isDimensionConstrained = stockConstraints.constrainDimensions && !!assignedStock;

    const maxLength = isDimensionConstrained && assignedStock ? assignedStock.length : Infinity;
    const maxWidth = isDimensionConstrained && assignedStock && !part.glueUpPanel ? assignedStock.width : Infinity;
    const maxThickness = isDimensionConstrained && assignedStock ? assignedStock.thickness : Infinity;

    // Preserve live snapped dimensions on commit; otherwise fall back to grid snapping.
    const snappedDimensions = snappedDimensionsRef.current;
    let newLength = Math.min(
      maxLength,
      Math.max(0.5, snappedDimensions.length ? liveDims.length : snapToGrid(liveDims.length))
    );
    let newWidth = Math.min(
      maxWidth,
      Math.max(0.5, snappedDimensions.width ? liveDims.width : snapToGrid(liveDims.width))
    );
    let newThickness = Math.min(
      maxThickness,
      Math.max(0.25, snappedDimensions.thickness ? liveDims.thickness : snapToGrid(liveDims.thickness))
    );

    _tempLocalOffset.current.set(
      ((newLength - partLength) / 2) * handlePos.x,
      ((newThickness - partThickness) / 2) * handlePos.y,
      ((newWidth - partWidth) / 2) * handlePos.z
    );
    _tempWorldOffset.current.copy(_tempLocalOffset.current).applyQuaternion(rotationQuaternion);

    let newX = partPos.x + _tempWorldOffset.current.x;
    let newY = partPos.y + _tempWorldOffset.current.y;
    let newZ = partPos.z + _tempWorldOffset.current.z;

    newX = snapToGrid(newX);
    newY = snapToGrid(newY);
    newZ = snapToGrid(newZ);

    // ADR-006: ground clamp runs through the constraint pipeline. The
    // groundConstraint computes the resized part's world-space minY via the
    // rotated AABB and lifts the position if it would dip below ground —
    // same intent as the legacy `worldHalfHeight = max(...) ; newY = max(halfHeight, newY)`
    // path, now sharing the pipeline with every other transform consumer.
    const groundResult = resolveResizeReleaseMove({
      part,
      projectParts: useProjectStore.getState().parts,
      stocks: useProjectStore.getState().stocks,
      groupMembers: useProjectStore.getState().groupMembers,
      dimensions: { length: newLength, width: newWidth, thickness: newThickness },
      proposedPosition: { x: newX, y: newY, z: newZ }
    });
    newX = groundResult.position.x;
    newY = groundResult.position.y;
    newZ = groundResult.position.z;

    const commitPreview = createResizeCommitPreview({
      partId: part.id,
      dimensions: { length: newLength, width: newWidth, thickness: newThickness },
      position: { x: newX, y: newY, z: newZ },
      snappedDimensions
    });
    const commitState =
      resizeToolStateRef.current ??
      createResizeCommitState({
        startingDimensions: { length: partLength, width: partWidth, thickness: partThickness },
        startingPosition: { x: partPos.x, y: partPos.y, z: partPos.z }
      });
    applyCommitInstructions(resizeTool.commit(commitState, commitPreview), { updatePart });

    setIsResizing(false);
    snappedDimensionsRef.current = { length: false, width: false, thickness: false };
    resizeToolStateRef.current = null;
    resizeStart.current = null;
    resumeOrbitControls(controls);
    document.body.style.cursor = 'auto';
    clearTransformInteractionPreviewKeepingSelectionDelta();
    useSnapStore.getState().updateReferenceDistances();
  };

  // Attach/detach window listeners when resizing
  useEffect(() => {
    if (!isResizing) return;

    const handleWindowPointerUp = () => {
      if (isResizing && resizeStart.current) {
        finishResize();
      }
    };

    const pointerRafQueue = createPointerRafQueue(window, (evt) => {
      if (!isResizing || !resizeStart.current) return;
      const currentPoint = getWorldPoint(evt);
      if (currentPoint) {
        handleResizeMove(currentPoint);
      }
    });
    const handleWindowPointerMove = (e: PointerEvent) => {
      if (e.buttons === 0) {
        handleWindowPointerUp();
        return;
      }
      // Coalesce pointer events to animation frame rate
      pointerRafQueue.schedule(e);
    };

    const unbindPointerSession = bindWindowPointerSession(window, {
      onMove: handleWindowPointerMove,
      onEnd: handleWindowPointerUp
    });
    return () => {
      unbindPointerSession();
      pointerRafQueue.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResizing, liveDims]);

  const handleResizeStart = useCallback(
    (handlePos: HandlePosition, e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();

      const partPos = new THREE.Vector3(part.position.x, part.position.y, part.position.z);
      getDragPlaneInfo(partPos);

      const startPoint = getWorldPoint(e.nativeEvent);
      if (startPoint) {
        setIsResizing(true);
        resizeToolStateRef.current = null;
        resizeStart.current = {
          handlePos,
          startPoint: startPoint.clone(),
          partPos: new THREE.Vector3(part.position.x, part.position.y, part.position.z),
          partLength: part.length,
          partWidth: part.width,
          partThickness: part.thickness
        };
        beginResizeInteractionSession({
          affectedPartIds: [part.id],
          primaryPartId: part.id,
          handle: handlePos,
          initialDimensions: {
            length: part.length,
            width: part.width,
            thickness: part.thickness
          },
          initialPosition: {
            x: part.position.x,
            y: part.position.y,
            z: part.position.z
          }
        });
        pauseOrbitControls(controls);
      }
    },
    [
      part.position.x,
      part.position.y,
      part.position.z,
      part.id,
      part.length,
      part.width,
      part.thickness,
      controls,
      getDragPlaneInfo,
      getWorldPoint
    ]
  );

  return { isResizing, handleResizeStart };
}
