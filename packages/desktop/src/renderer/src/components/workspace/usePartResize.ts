import { useCallback, useEffect, useRef, useState } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { Part as PartType } from '../../types';
import { useProjectStore } from '../../store/projectStore';
import { useSnapStore } from '../../store/snapStore';
import { useAppSettingsStore } from '../../store/appSettingsStore';
import {
  calculateSnapThreshold,
  detectDimensionSnaps,
  createDimensionMatchSnapLine,
  getPartBoundsAtPosition
} from '../../utils/snapToPartsUtil';
import { LiveDimensions, HandlePosition, snapToGrid } from './partTypes';
import { isOrbitControls } from './workspaceUtils';
import { calculateWorldHalfHeight } from '../../utils/mathPool';

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
  const resizeStart = useRef<{
    handlePos: HandlePosition;
    startPoint: THREE.Vector3;
    partPos: THREE.Vector3;
    partLength: number;
    partWidth: number;
    partThickness: number;
  } | null>(null);

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

      const dotX = Math.abs(_tempForward.current.dot(_tempAxisX.current.set(1, 0, 0)));
      const dotY = Math.abs(_tempForward.current.dot(_tempAxisY.current.set(0, 1, 0)));
      const dotZ = Math.abs(_tempForward.current.dot(_tempAxisZ.current.set(0, 0, 1)));

      if (dotZ >= dotX && dotZ >= dotY) {
        planeRef.current.setFromNormalAndCoplanarPoint(_tempNormal.current.set(0, 0, 1), partPosition);
      } else if (dotX >= dotY) {
        planeRef.current.setFromNormalAndCoplanarPoint(_tempNormal.current.set(1, 0, 0), partPosition);
      } else {
        planeRef.current.setFromNormalAndCoplanarPoint(_tempNormal.current.set(0, 1, 0), partPosition);
      }
    },
    [camera]
  );

  const handleResizeMove = (currentPoint: THREE.Vector3) => {
    if (!resizeStart.current) return;

    const { handlePos, startPoint, partPos, partLength, partWidth, partThickness } = resizeStart.current;
    const worldDelta = _tempWorldDelta.current.copy(currentPoint).sub(startPoint);
    const localDelta = worldToLocal(worldDelta);

    let newLength = partLength;
    let newWidth = partWidth;
    let newThickness = partThickness;

    const resizingDimensions = {
      length: false,
      width: false,
      thickness: false
    };

    // Get constraint settings from store
    const stockConstraints = useProjectStore.getState().stockConstraints;
    const stocks = useProjectStore.getState().stocks;
    const assignedStock = part.stockId ? stocks.find((s) => s.id === part.stockId) : null;
    const isDimensionConstrained = stockConstraints.constrainDimensions && !!assignedStock;

    const maxLength = isDimensionConstrained && assignedStock ? assignedStock.length : Infinity;
    const maxWidth = isDimensionConstrained && assignedStock && !part.glueUpPanel ? assignedStock.width : Infinity;
    const maxThickness = isDimensionConstrained && assignedStock ? assignedStock.thickness : Infinity;

    if (handlePos.type === 'corner') {
      newLength = Math.min(maxLength, Math.max(0.5, partLength + localDelta.x * handlePos.x));
      newThickness = Math.min(maxThickness, Math.max(0.25, partThickness + localDelta.y * handlePos.y));
      newWidth = Math.min(maxWidth, Math.max(0.5, partWidth + localDelta.z * handlePos.z));
      resizingDimensions.length = true;
      resizingDimensions.thickness = true;
      resizingDimensions.width = true;
    } else {
      if (handlePos.x !== 0) {
        newLength = Math.min(maxLength, Math.max(0.5, partLength + localDelta.x * handlePos.x));
        resizingDimensions.length = true;
      }
      if (handlePos.y !== 0) {
        newThickness = Math.min(maxThickness, Math.max(0.25, partThickness + localDelta.y * handlePos.y));
        resizingDimensions.thickness = true;
      }
      if (handlePos.z !== 0) {
        newWidth = Math.min(maxWidth, Math.max(0.5, partWidth + localDelta.z * handlePos.z));
        resizingDimensions.width = true;
      }
    }

    // Apply dimension matching snap if enabled
    const isSnapEnabled = useSnapStore.getState().snapToPartsEnabled;
    const allParts = useProjectStore.getState().parts;
    const currentReferenceIds = useSnapStore.getState().referencePartIds;
    const units = useProjectStore.getState().units;

    const appSettings = useAppSettingsStore.getState().settings;
    const { snapSensitivity, dimensionSnapSameTypeOnly } = appSettings;

    const snapTargetParts =
      currentReferenceIds.length > 0 ? allParts.filter((p) => currentReferenceIds.includes(p.id)) : allParts;

    if (isSnapEnabled) {
      const cameraDistance = camera.position.distanceTo(_tempCameraTarget.current.set(partPos.x, partPos.y, partPos.z));
      const snapThreshold = calculateSnapThreshold(cameraDistance, snapSensitivity);

      const dimensionSnaps = detectDimensionSnaps(
        { length: newLength, width: newWidth, thickness: newThickness },
        resizingDimensions,
        snapTargetParts,
        part.id,
        snapThreshold,
        dimensionSnapSameTypeOnly,
        units,
        true // Enable standard dimension snapping
      );

      const snapLines: import('../../types').SnapLine[] = [];

      for (const snap of dimensionSnaps) {
        if (snap.dimension === 'length') {
          newLength = snap.targetValue;
        } else if (snap.dimension === 'width') {
          newWidth = snap.targetValue;
        } else if (snap.dimension === 'thickness') {
          newThickness = snap.targetValue;
        }

        const tempPart = {
          ...part,
          length: newLength,
          width: newWidth,
          thickness: newThickness
        };
        const resizingBounds = getPartBoundsAtPosition(tempPart, partPos);
        const snapLine = createDimensionMatchSnapLine(snap, resizingBounds);

        snapLine.dimensionMatchInfo = {
          isStandard: snap.isStandardDimension,
          sourcePart: snap.matchedPartName ?? undefined,
          sourceDimension: snap.matchedDimension ?? undefined
        };

        if (snap.matchedPartBounds && !snap.isStandardDimension) {
          const labelPos = snapLine.distanceIndicators![0].labelPosition;
          snapLine.connectorLine = {
            start: labelPos,
            end: {
              x: snap.matchedPartBounds.centerX,
              y: snap.matchedPartBounds.maxY + 0.5,
              z: snap.matchedPartBounds.centerZ
            }
          };
        }

        snapLines.push(snapLine);
      }

      useSnapStore.getState().setActiveSnapLines(snapLines);
    } else {
      useSnapStore.getState().setActiveSnapLines([]);
    }
    useSnapStore.getState().setActiveReferenceDistances([]);

    // Calculate the world-space center offset to keep the fixed corner/edge in place
    _tempLocalOffset.current.set(
      ((newLength - partLength) / 2) * handlePos.x,
      ((newThickness - partThickness) / 2) * handlePos.y,
      ((newWidth - partWidth) / 2) * handlePos.z
    );
    _tempWorldOffset.current.copy(_tempLocalOffset.current).applyQuaternion(rotationQuaternion);

    const newX = partPos.x + _tempWorldOffset.current.x;
    const newY = partPos.y + _tempWorldOffset.current.y;
    const newZ = partPos.z + _tempWorldOffset.current.z;

    // Note: We don't clamp to ground during live resize to avoid the "opposite direction"
    // bug where clamping position but not dimensions causes inconsistent behavior.
    // Ground constraint is enforced in finishResize().

    setLiveDims((prev) => ({
      ...prev,
      x: newX,
      y: newY,
      z: newZ,
      length: newLength,
      width: newWidth,
      thickness: newThickness
    }));
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

    // Snap the final dimensions to grid
    let newLength = Math.min(maxLength, Math.max(0.5, snapToGrid(liveDims.length)));
    let newWidth = Math.min(maxWidth, Math.max(0.5, snapToGrid(liveDims.width)));
    let newThickness = Math.min(maxThickness, Math.max(0.25, snapToGrid(liveDims.thickness)));

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

    // Keep part above ground
    const worldHalfHeight = calculateWorldHalfHeight(rotationQuaternion, newLength, newThickness, newWidth);
    newY = Math.max(worldHalfHeight, newY);

    updatePart(part.id, {
      length: newLength,
      width: newWidth,
      thickness: newThickness,
      position: { x: newX, y: newY, z: newZ }
    });

    setIsResizing(false);
    resizeStart.current = null;
    if (isOrbitControls(controls)) controls.enabled = true;
    document.body.style.cursor = 'auto';
    useSnapStore.getState().setActiveSnapLines([]);
    useSnapStore.getState().updateReferenceDistances();
  };

  // Attach/detach window listeners when resizing
  useEffect(() => {
    if (!isResizing) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      if (isResizing && resizeStart.current) {
        const currentPoint = getWorldPoint(e);
        if (currentPoint) {
          handleResizeMove(currentPoint);
        }
      }
    };

    const handleWindowPointerUp = () => {
      if (isResizing && resizeStart.current) {
        finishResize();
      }
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
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
        resizeStart.current = {
          handlePos,
          startPoint: startPoint.clone(),
          partPos: new THREE.Vector3(part.position.x, part.position.y, part.position.z),
          partLength: part.length,
          partWidth: part.width,
          partThickness: part.thickness
        };
        if (isOrbitControls(controls)) controls.enabled = false;
      }
    },
    [
      part.position.x,
      part.position.y,
      part.position.z,
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
