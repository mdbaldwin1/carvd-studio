import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useProjectStore } from '../../store/projectStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useCameraStore } from '../../store/cameraStore';
import { getPartBounds } from '../../utils/snapToPartsUtil';
import { resolveExplicitSelectedPartIds } from '../../utils/interactionSelection';
import { isOrbitControls } from './workspaceUtils';

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
    const allPartIds = new Set(resolveExplicitSelectedPartIds({ selectedPartIds, selectedGroupIds }, groupMembers));

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
      const bounds = getPartBounds(part);
      minX = Math.min(minX, bounds.minX);
      maxX = Math.max(maxX, bounds.maxX);
      minY = Math.min(minY, bounds.minY);
      maxY = Math.max(maxY, bounds.maxY);
      minZ = Math.min(minZ, bounds.minZ);
      maxZ = Math.max(maxZ, bounds.maxZ);
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // Frame the selected stock as well as centering it. Tiny inserts need a
    // close view just as a full assembly needs room around its outer bounds.
    if (isOrbitControls(controls)) {
      const direction = camera.position.clone().sub(controls.target).normalize();
      const radius = Math.max(0.1, Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) / 2);
      if (camera instanceof THREE.PerspectiveCamera) {
        const halfFov = THREE.MathUtils.degToRad(camera.fov) / 2;
        const limitingAngle = Math.min(halfFov, Math.atan(Math.tan(halfFov) * camera.aspect));
        const distance = Math.max(0.5, (radius * 1.25) / Math.sin(limitingAngle));
        camera.position.set(centerX, centerY, centerZ).addScaledVector(direction, distance);
      }
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
    camera,
    controls,
    clearCenterCameraRequest
  ]);

  return null;
}
