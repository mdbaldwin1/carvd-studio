import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useProjectStore, getAllDescendantPartIds } from '../../store/projectStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useCameraStore } from '../../store/cameraStore';
import { isOrbitControls } from './workspaceUtils';

// Pre-allocated objects for camera centering (avoids per-part allocations in the loop)
const _ccEuler = new THREE.Euler();
const _ccQuat = new THREE.Quaternion();
const _ccCorners = Array.from({ length: 8 }, () => new THREE.Vector3());
const _ccPosition = new THREE.Vector3();

// Component that handles camera centering and view vector tracking
export function CameraController() {
  const { camera, controls } = useThree();
  const parts = useProjectStore((s) => s.parts);
  const selectedPartIds = useSelectionStore((s) => s.selectedPartIds);
  const selectedGroupIds = useSelectionStore((s) => s.selectedGroupIds);
  const groupMembers = useProjectStore((s) => s.groupMembers);
  const centerCameraRequested = useCameraStore((s) => s.centerCameraRequested);
  const centerCameraAtOriginRequested = useCameraStore((s) => s.centerCameraAtOriginRequested);
  const centerCameraAtPosition = useCameraStore((s) => s.centerCameraAtPosition);
  const clearCenterCameraRequest = useCameraStore((s) => s.clearCenterCameraRequest);
  const setCameraViewVectors = useCameraStore((s) => s.setCameraViewVectors);

  // Track previous camera view vectors to avoid unnecessary state updates
  const prevVectorsRef = useRef({
    upX: 0,
    upY: 1,
    upZ: 0,
    rightX: 1,
    rightY: 0,
    rightZ: 0
  });

  // Reusable Vector3 objects to avoid GC pressure in the render loop
  const reusableRight = useMemo(() => new THREE.Vector3(), []);
  const reusableUp = useMemo(() => new THREE.Vector3(), []);

  // Track camera view vectors for view-relative movement (screen-aligned)
  useFrame(() => {
    // Get the camera's world matrix to extract view-aligned vectors
    camera.updateMatrixWorld();

    // Camera's right vector (points to the right of the screen)
    reusableRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();

    // Camera's up vector (points to the top of the screen)
    reusableUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();

    const right = reusableRight;
    const up = reusableUp;

    // Only update store if vectors have changed significantly (threshold: 0.001)
    const prev = prevVectorsRef.current;
    const threshold = 0.001;
    if (
      Math.abs(up.x - prev.upX) > threshold ||
      Math.abs(up.y - prev.upY) > threshold ||
      Math.abs(up.z - prev.upZ) > threshold ||
      Math.abs(right.x - prev.rightX) > threshold ||
      Math.abs(right.y - prev.rightY) > threshold ||
      Math.abs(right.z - prev.rightZ) > threshold
    ) {
      prevVectorsRef.current = {
        upX: up.x,
        upY: up.y,
        upZ: up.z,
        rightX: right.x,
        rightY: right.y,
        rightZ: right.z
      };
      setCameraViewVectors({
        up: { x: up.x, y: up.y, z: up.z },
        right: { x: right.x, y: right.y, z: right.z }
      });
    }
  });

  // Handle center at origin
  useEffect(() => {
    if (!centerCameraAtOriginRequested) return;

    if (isOrbitControls(controls)) {
      controls.target.set(0, 0, 0);
      controls.update();
    }

    clearCenterCameraRequest();
  }, [centerCameraAtOriginRequested, controls, clearCenterCameraRequest]);

  // Handle center at specific position (from "Center View Here")
  useEffect(() => {
    if (!centerCameraAtPosition) return;

    if (isOrbitControls(controls)) {
      controls.target.set(centerCameraAtPosition.x, centerCameraAtPosition.y, centerCameraAtPosition.z);
      controls.update();
    }

    clearCenterCameraRequest();
  }, [centerCameraAtPosition, controls, clearCenterCameraRequest]);

  // Handle center on selection
  useEffect(() => {
    // Get all part IDs to center on (directly selected parts + parts within selected groups)
    const allPartIds = new Set(selectedPartIds);
    for (const groupId of selectedGroupIds) {
      const descendantPartIds = getAllDescendantPartIds(groupId, groupMembers);
      for (const partId of descendantPartIds) {
        allPartIds.add(partId);
      }
    }

    if (!centerCameraRequested || allPartIds.size === 0) return;

    // Calculate center of all selected parts
    const selectedParts = parts.filter((p) => allPartIds.has(p.id));
    if (selectedParts.length === 0) {
      clearCenterCameraRequest();
      return;
    }

    // Calculate bounding box center of all selected parts
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;

    for (const part of selectedParts) {
      // Get part's bounding box (accounting for rotation) — reuses pre-allocated objects
      _ccEuler.set(
        (part.rotation.x * Math.PI) / 180,
        (part.rotation.y * Math.PI) / 180,
        (part.rotation.z * Math.PI) / 180,
        'XYZ'
      );
      _ccQuat.setFromEuler(_ccEuler);

      const hL = part.length / 2;
      const hT = part.thickness / 2;
      const hW = part.width / 2;

      // Set the 8 corners (reuses pre-allocated Vector3 array)
      _ccCorners[0].set(-hL, -hT, -hW);
      _ccCorners[1].set(-hL, -hT, hW);
      _ccCorners[2].set(-hL, hT, -hW);
      _ccCorners[3].set(-hL, hT, hW);
      _ccCorners[4].set(hL, -hT, -hW);
      _ccCorners[5].set(hL, -hT, hW);
      _ccCorners[6].set(hL, hT, -hW);
      _ccCorners[7].set(hL, hT, hW);

      _ccPosition.set(part.position.x, part.position.y, part.position.z);

      for (const corner of _ccCorners) {
        corner.applyQuaternion(_ccQuat);
        corner.add(_ccPosition);
        minX = Math.min(minX, corner.x);
        maxX = Math.max(maxX, corner.x);
        minY = Math.min(minY, corner.y);
        maxY = Math.max(maxY, corner.y);
        minZ = Math.min(minZ, corner.z);
        maxZ = Math.max(maxZ, corner.z);
      }
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // Set the orbit controls target to the center of selected parts
    if (isOrbitControls(controls)) {
      controls.target.set(centerX, centerY, centerZ);
      controls.update();
    }

    clearCenterCameraRequest();
  }, [
    centerCameraRequested,
    selectedPartIds,
    selectedGroupIds,
    groupMembers,
    parts,
    controls,
    clearCenterCameraRequest
  ]);

  return null;
}
