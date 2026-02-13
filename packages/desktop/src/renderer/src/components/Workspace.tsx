import { Grid, Html, Line, OrbitControls } from '@react-three/drei';
import { ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { GRID_SIZE } from '../constants';
import {
  useProjectStore,
  getAllDescendantPartIds,
  registerCanvasCaptureHandler,
  unregisterCanvasCaptureHandler,
  registerThumbnailGenerator,
  unregisterThumbnailGenerator
} from '../store/projectStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { CameraState, LightingMode, SnapLine } from '../types';
import { formatMeasurementWithUnit } from '../utils/fractions';
import { Part } from './Part';
import { ReferenceDistanceIndicators } from './ReferenceDistanceIndicators';

// Lighting presets for different viewing conditions
const LIGHTING_PRESETS: Record<
  LightingMode,
  {
    ambient: number;
    mainLight: { position: [number, number, number]; intensity: number };
    fillLight: { position: [number, number, number]; intensity: number };
    description: string;
  }
> = {
  default: {
    ambient: 0.5,
    mainLight: { position: [10, 20, 10], intensity: 1 },
    fillLight: { position: [-10, 10, -10], intensity: 0.3 },
    description: 'Balanced lighting for general use'
  },
  bright: {
    ambient: 1.0,
    mainLight: { position: [10, 20, 10], intensity: 1.5 },
    fillLight: { position: [-10, 15, -10], intensity: 0.8 },
    description: 'Brighter lighting for dark materials'
  },
  studio: {
    ambient: 0.6,
    mainLight: { position: [15, 25, 15], intensity: 0.8 },
    fillLight: { position: [-15, 15, -15], intensity: 0.5 },
    description: 'Soft, even lighting like a photography studio'
  },
  dramatic: {
    ambient: 0.3,
    mainLight: { position: [5, 30, 5], intensity: 1.5 },
    fillLight: { position: [-8, 5, -8], intensity: 0.15 },
    description: 'High contrast lighting with strong shadows'
  }
};

// Type guard to check if controls is OrbitControls
function isOrbitControls(controls: THREE.EventDispatcher<object> | null): controls is OrbitControlsImpl {
  return controls !== null && 'enabled' in controls;
}

// Module-level tracking for right-click context menu
// Shared between Workspace and SnapGuides
let globalRightClickTarget: {
  type: 'background' | 'part' | 'guide';
  worldPosition?: { x: number; y: number; z: number };
  guideId?: string;
} | null = null;

export function setRightClickTarget(target: typeof globalRightClickTarget) {
  globalRightClickTarget = target;
}

export function getRightClickTarget() {
  return globalRightClickTarget;
}

export function clearRightClickTarget() {
  globalRightClickTarget = null;
}

// Component that handles camera centering and view vector tracking
function CameraController() {
  const { camera, controls } = useThree();
  const parts = useProjectStore((s) => s.parts);
  const selectedPartIds = useProjectStore((s) => s.selectedPartIds);
  const selectedGroupIds = useProjectStore((s) => s.selectedGroupIds);
  const groupMembers = useProjectStore((s) => s.groupMembers);
  const centerCameraRequested = useProjectStore((s) => s.centerCameraRequested);
  const centerCameraAtOriginRequested = useProjectStore((s) => s.centerCameraAtOriginRequested);
  const centerCameraAtPosition = useProjectStore((s) => s.centerCameraAtPosition);
  const clearCenterCameraRequest = useProjectStore((s) => s.clearCenterCameraRequest);
  const setCameraViewVectors = useProjectStore((s) => s.setCameraViewVectors);

  // Track previous camera view vectors to avoid unnecessary state updates
  const prevVectorsRef = useRef({
    upX: 0,
    upY: 1,
    upZ: 0,
    rightX: 1,
    rightY: 0,
    rightZ: 0
  });

  // Track camera view vectors for view-relative movement (screen-aligned)
  useFrame(() => {
    // Get the camera's world matrix to extract view-aligned vectors
    camera.updateMatrixWorld();

    // Camera's right vector (points to the right of the screen)
    const right = new THREE.Vector3();
    right.setFromMatrixColumn(camera.matrixWorld, 0); // First column is right vector
    right.normalize();

    // Camera's up vector (points to the top of the screen)
    const up = new THREE.Vector3();
    up.setFromMatrixColumn(camera.matrixWorld, 1); // Second column is up vector
    up.normalize();

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
      // Get part's bounding box (accounting for rotation)
      const rotX = (part.rotation.x * Math.PI) / 180;
      const rotY = (part.rotation.y * Math.PI) / 180;
      const rotZ = (part.rotation.z * Math.PI) / 180;
      const euler = new THREE.Euler(rotX, rotY, rotZ, 'XYZ');
      const quat = new THREE.Quaternion().setFromEuler(euler);

      const halfLength = part.length / 2;
      const halfThickness = part.thickness / 2;
      const halfWidth = part.width / 2;

      // Get the 8 corners and find world-space bounds
      const corners = [
        new THREE.Vector3(-halfLength, -halfThickness, -halfWidth),
        new THREE.Vector3(-halfLength, -halfThickness, halfWidth),
        new THREE.Vector3(-halfLength, halfThickness, -halfWidth),
        new THREE.Vector3(-halfLength, halfThickness, halfWidth),
        new THREE.Vector3(halfLength, -halfThickness, -halfWidth),
        new THREE.Vector3(halfLength, -halfThickness, halfWidth),
        new THREE.Vector3(halfLength, halfThickness, -halfWidth),
        new THREE.Vector3(halfLength, halfThickness, halfWidth)
      ];

      for (const corner of corners) {
        corner.applyQuaternion(quat);
        corner.add(new THREE.Vector3(part.position.x, part.position.y, part.position.z));
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

// Component that handles canvas capture/export
function CanvasCaptureHandler() {
  const { gl, scene, camera } = useThree();
  const projectName = useProjectStore((s) => s.projectName);

  const captureCanvas = useCallback(async () => {
    // Render the scene to ensure we capture current state
    gl.render(scene, camera);

    // Show save dialog first to get the file path and determine format
    const sanitizedName = (projectName || 'project').replace(/[^a-zA-Z0-9-_]/g, '-');
    const result = await window.electronAPI.showSaveDialog({
      defaultPath: `${sanitizedName}.png`,
      filters: [
        { name: 'PNG Images', extensions: ['png'] },
        { name: 'JPEG Images', extensions: ['jpg', 'jpeg'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return;
    }

    // Determine format based on file extension
    const isJpeg = result.filePath.toLowerCase().endsWith('.jpg') || result.filePath.toLowerCase().endsWith('.jpeg');
    const mimeType = isJpeg ? 'image/jpeg' : 'image/png';

    // Get the canvas data as a data URL
    const dataUrl = gl.domElement.toDataURL(mimeType, isJpeg ? 0.95 : undefined);

    // Convert data URL to Uint8Array without using fetch (CSP compliant)
    const base64Data = dataUrl.split(',')[1];
    const binaryString = atob(base64Data);
    const uint8Array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i);
    }

    // Write the image file
    await window.electronAPI.writeBinaryFile(result.filePath, Array.from(uint8Array));
    useProjectStore.getState().showToast(`Exported to ${result.filePath.split('/').pop()}`);
  }, [gl, scene, camera, projectName]);

  // Register the capture handler on mount
  useEffect(() => {
    registerCanvasCaptureHandler(captureCanvas);
    return () => unregisterCanvasCaptureHandler();
  }, [captureCanvas]);

  return null;
}

// Thumbnail dimensions for project preview
const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_HEIGHT = 300;

// Component that handles thumbnail generation for project saves
function ThumbnailCaptureHandler() {
  const { gl, scene, camera } = useThree();

  const generateThumbnail = useCallback(async (): Promise<string | null> => {
    try {
      // Store original canvas size
      const originalWidth = gl.domElement.width;
      const originalHeight = gl.domElement.height;

      // Create an off-screen canvas for thumbnail
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = THUMBNAIL_WIDTH;
      offscreenCanvas.height = THUMBNAIL_HEIGHT;
      const ctx = offscreenCanvas.getContext('2d');

      if (!ctx) {
        return null;
      }

      // Render the scene at current size
      gl.render(scene, camera);

      // Draw the WebGL canvas onto the offscreen canvas, scaling it down
      ctx.drawImage(gl.domElement, 0, 0, originalWidth, originalHeight, 0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

      // Convert to base64 PNG (without the data:image/png;base64, prefix)
      const dataUrl = offscreenCanvas.toDataURL('image/png', 0.8);
      const base64Data = dataUrl.split(',')[1];

      return base64Data;
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      return null;
    }
  }, [gl, scene, camera]);

  // Register the thumbnail generator on mount
  useEffect(() => {
    registerThumbnailGenerator(generateThumbnail);
    return () => unregisterThumbnailGenerator();
  }, [generateThumbnail]);

  return null;
}

// Log GPU renderer info once on mount so we can compare dev vs production
function GpuTelemetry() {
  const { gl } = useThree();

  useEffect(() => {
    const glCtx = gl.getContext();
    const dbg = glCtx.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      const vendor = glCtx.getParameter(dbg.UNMASKED_VENDOR_WEBGL);
      const renderer = glCtx.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
      console.info(`[GPU] Vendor: ${vendor}  Renderer: ${renderer}`);
    }
    console.info(
      `[GPU] Drawing buffer: ${gl.domElement.width}x${gl.domElement.height}  Pixel ratio: ${gl.getPixelRatio()}`
    );
  }, [gl]);

  return null;
}

// Blueprint-style dimension label for multi-selection bounding box
function BoundingBoxDimensionLabel({
  start,
  end,
  value,
  offsetDir,
  offset = 2,
  color = '#ffffff',
  units
}: {
  start: [number, number, number];
  end: [number, number, number];
  value: number;
  offsetDir: [number, number, number];
  offset?: number;
  color?: string;
  units: 'imperial' | 'metric';
}) {
  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2;
  const midZ = (start[2] + end[2]) / 2;

  const dirLen = Math.sqrt(offsetDir[0] ** 2 + offsetDir[1] ** 2 + offsetDir[2] ** 2);
  const offsetVec: [number, number, number] = [
    (offsetDir[0] / dirLen) * offset,
    (offsetDir[1] / dirLen) * offset,
    (offsetDir[2] / dirLen) * offset
  ];

  const offsetStart: [number, number, number] = [
    start[0] + offsetVec[0],
    start[1] + offsetVec[1],
    start[2] + offsetVec[2]
  ];
  const offsetEnd: [number, number, number] = [end[0] + offsetVec[0], end[1] + offsetVec[1], end[2] + offsetVec[2]];
  const labelPos: [number, number, number] = [midX + offsetVec[0], midY + offsetVec[1], midZ + offsetVec[2]];

  // Calculate tick direction
  const lineDir: [number, number, number] = [end[0] - start[0], end[1] - start[1], end[2] - start[2]];
  const tickDir: [number, number, number] = [
    lineDir[1] * offsetVec[2] - lineDir[2] * offsetVec[1],
    lineDir[2] * offsetVec[0] - lineDir[0] * offsetVec[2],
    lineDir[0] * offsetVec[1] - lineDir[1] * offsetVec[0]
  ];
  const tickLen = Math.sqrt(tickDir[0] ** 2 + tickDir[1] ** 2 + tickDir[2] ** 2);
  const tickLength = 0.4;
  const normalizedTick: [number, number, number] =
    tickLen > 0
      ? [
          ((tickDir[0] / tickLen) * tickLength) / 2,
          ((tickDir[1] / tickLen) * tickLength) / 2,
          ((tickDir[2] / tickLen) * tickLength) / 2
        ]
      : [0, tickLength / 2, 0];

  return (
    <group>
      {/* Main dimension line */}
      <Line points={[offsetStart, offsetEnd]} color={color} lineWidth={2} />

      {/* Start extension line */}
      <Line
        points={[
          [start[0] + offsetVec[0] * 0.2, start[1] + offsetVec[1] * 0.2, start[2] + offsetVec[2] * 0.2],
          [
            offsetStart[0] + offsetVec[0] * 0.15,
            offsetStart[1] + offsetVec[1] * 0.15,
            offsetStart[2] + offsetVec[2] * 0.15
          ]
        ]}
        color={color}
        lineWidth={1}
      />

      {/* End extension line */}
      <Line
        points={[
          [end[0] + offsetVec[0] * 0.2, end[1] + offsetVec[1] * 0.2, end[2] + offsetVec[2] * 0.2],
          [offsetEnd[0] + offsetVec[0] * 0.15, offsetEnd[1] + offsetVec[1] * 0.15, offsetEnd[2] + offsetVec[2] * 0.15]
        ]}
        color={color}
        lineWidth={1}
      />

      {/* Start tick mark */}
      <Line
        points={[
          [offsetStart[0] - normalizedTick[0], offsetStart[1] - normalizedTick[1], offsetStart[2] - normalizedTick[2]],
          [offsetStart[0] + normalizedTick[0], offsetStart[1] + normalizedTick[1], offsetStart[2] + normalizedTick[2]]
        ]}
        color={color}
        lineWidth={2}
      />

      {/* End tick mark */}
      <Line
        points={[
          [offsetEnd[0] - normalizedTick[0], offsetEnd[1] - normalizedTick[1], offsetEnd[2] - normalizedTick[2]],
          [offsetEnd[0] + normalizedTick[0], offsetEnd[1] + normalizedTick[1], offsetEnd[2] + normalizedTick[2]]
        ]}
        color={color}
        lineWidth={2}
      />

      {/* Dimension text */}
      <Html position={labelPos} center zIndexRange={[0, 50]} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            color: color,
            fontSize: '14px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: '3px 8px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            border: `1px solid ${color}`
          }}
        >
          {formatMeasurementWithUnit(value, units)}
        </div>
      </Html>
    </group>
  );
}

// Helper to calculate axis-aligned bounding box for a part
function getPartAABB(part: {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  length: number;
  width: number;
  thickness: number;
}) {
  const rotX = (part.rotation.x * Math.PI) / 180;
  const rotY = (part.rotation.y * Math.PI) / 180;
  const rotZ = (part.rotation.z * Math.PI) / 180;
  const euler = new THREE.Euler(rotX, rotY, rotZ, 'XYZ');
  const quat = new THREE.Quaternion().setFromEuler(euler);

  const halfLength = part.length / 2;
  const halfThickness = part.thickness / 2;
  const halfWidth = part.width / 2;

  const corners = [
    new THREE.Vector3(-halfLength, -halfThickness, -halfWidth),
    new THREE.Vector3(-halfLength, -halfThickness, halfWidth),
    new THREE.Vector3(-halfLength, halfThickness, -halfWidth),
    new THREE.Vector3(-halfLength, halfThickness, halfWidth),
    new THREE.Vector3(halfLength, -halfThickness, -halfWidth),
    new THREE.Vector3(halfLength, -halfThickness, halfWidth),
    new THREE.Vector3(halfLength, halfThickness, -halfWidth),
    new THREE.Vector3(halfLength, halfThickness, halfWidth)
  ];

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;

  for (const corner of corners) {
    corner.applyQuaternion(quat);
    corner.add(new THREE.Vector3(part.position.x, part.position.y, part.position.z));
    minX = Math.min(minX, corner.x);
    maxX = Math.max(maxX, corner.x);
    minY = Math.min(minY, corner.y);
    maxY = Math.max(maxY, corner.y);
    minZ = Math.min(minZ, corner.z);
    maxZ = Math.max(maxZ, corner.z);
  }

  return { minX, maxX, minY, maxY, minZ, maxZ };
}

// Component that shows overall bounding box dimensions when multiple parts are selected
function MultiSelectionDimensions() {
  const parts = useProjectStore((s) => s.parts);
  const selectedPartIds = useProjectStore((s) => s.selectedPartIds);
  const selectedGroupIds = useProjectStore((s) => s.selectedGroupIds);
  const groupMembers = useProjectStore((s) => s.groupMembers);
  const activeDragDelta = useProjectStore((s) => s.activeDragDelta);
  const units = useProjectStore((s) => s.units);

  // Calculate effective selected part IDs (includes parts from selected groups)
  const effectiveSelectedPartIds = useMemo(() => {
    const partIds = new Set(selectedPartIds);
    for (const groupId of selectedGroupIds) {
      const groupPartIds = getAllDescendantPartIds(groupId, groupMembers);
      groupPartIds.forEach((id) => partIds.add(id));
    }
    return [...partIds];
  }, [selectedPartIds, selectedGroupIds, groupMembers]);

  // Only show when 2+ parts are effectively selected, and not while dragging
  if (effectiveSelectedPartIds.length < 2) return null;
  if (activeDragDelta) return null; // Hide dimension labels while dragging

  const selectedParts = parts.filter((p) => effectiveSelectedPartIds.includes(p.id));
  if (selectedParts.length < 2) return null;

  // Calculate bounding boxes for each part
  const partAABBs = selectedParts.map((part) => {
    // Apply drag delta to position if dragging
    const adjustedPart = activeDragDelta
      ? {
          ...part,
          position: {
            x: part.position.x + activeDragDelta.x,
            y: part.position.y + activeDragDelta.y,
            z: part.position.z + activeDragDelta.z
          }
        }
      : part;
    return {
      part: adjustedPart,
      aabb: getPartAABB(adjustedPart)
    };
  });

  // Calculate overall bounding box
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;

  for (const { aabb } of partAABBs) {
    minX = Math.min(minX, aabb.minX);
    maxX = Math.max(maxX, aabb.maxX);
    minY = Math.min(minY, aabb.minY);
    maxY = Math.max(maxY, aabb.maxY);
    minZ = Math.min(minZ, aabb.minZ);
    maxZ = Math.max(maxZ, aabb.maxZ);
  }

  const sizeX = maxX - minX;
  const sizeY = maxY - minY;
  const sizeZ = maxZ - minZ;

  // Define bounding box corners for dimension lines
  const bottomFrontLeft: [number, number, number] = [minX, minY, minZ];
  const bottomFrontRight: [number, number, number] = [maxX, minY, minZ];
  const bottomBackRight: [number, number, number] = [maxX, minY, maxZ];
  const topFrontRight: [number, number, number] = [maxX, maxY, minZ];

  // Calculate gaps between parts (for showing spacing)
  // Find gaps along each axis by looking at part separations
  const gaps: {
    axis: 'x' | 'y' | 'z';
    start: [number, number, number];
    end: [number, number, number];
    distance: number;
  }[] = [];

  // Sort parts by position along each axis and find gaps
  // X-axis gaps
  const sortedByX = [...partAABBs].sort((a, b) => a.aabb.minX - b.aabb.minX);
  for (let i = 0; i < sortedByX.length - 1; i++) {
    const current = sortedByX[i];
    const next = sortedByX[i + 1];
    const gap = next.aabb.minX - current.aabb.maxX;
    if (gap > 0.01) {
      // Only show gaps > 0.01" (avoid floating point noise)
      // Position the gap line at the overlap region between parts
      const avgY = (Math.max(current.aabb.minY, next.aabb.minY) + Math.min(current.aabb.maxY, next.aabb.maxY)) / 2;
      const avgZ = (Math.max(current.aabb.minZ, next.aabb.minZ) + Math.min(current.aabb.maxZ, next.aabb.maxZ)) / 2;
      gaps.push({
        axis: 'x',
        start: [current.aabb.maxX, avgY, avgZ],
        end: [next.aabb.minX, avgY, avgZ],
        distance: gap
      });
    }
  }

  // Z-axis gaps
  const sortedByZ = [...partAABBs].sort((a, b) => a.aabb.minZ - b.aabb.minZ);
  for (let i = 0; i < sortedByZ.length - 1; i++) {
    const current = sortedByZ[i];
    const next = sortedByZ[i + 1];
    const gap = next.aabb.minZ - current.aabb.maxZ;
    if (gap > 0.01) {
      const avgX = (Math.max(current.aabb.minX, next.aabb.minX) + Math.min(current.aabb.maxX, next.aabb.maxX)) / 2;
      const avgY = (Math.max(current.aabb.minY, next.aabb.minY) + Math.min(current.aabb.maxY, next.aabb.maxY)) / 2;
      gaps.push({
        axis: 'z',
        start: [avgX, avgY, current.aabb.maxZ],
        end: [avgX, avgY, next.aabb.minZ],
        distance: gap
      });
    }
  }

  // Y-axis gaps
  const sortedByY = [...partAABBs].sort((a, b) => a.aabb.minY - b.aabb.minY);
  for (let i = 0; i < sortedByY.length - 1; i++) {
    const current = sortedByY[i];
    const next = sortedByY[i + 1];
    const gap = next.aabb.minY - current.aabb.maxY;
    if (gap > 0.01) {
      const avgX = (Math.max(current.aabb.minX, next.aabb.minX) + Math.min(current.aabb.maxX, next.aabb.maxX)) / 2;
      const avgZ = (Math.max(current.aabb.minZ, next.aabb.minZ) + Math.min(current.aabb.maxZ, next.aabb.maxZ)) / 2;
      gaps.push({
        axis: 'y',
        start: [avgX, current.aabb.maxY, avgZ],
        end: [avgX, next.aabb.minY, avgZ],
        distance: gap
      });
    }
  }

  return (
    <group>
      {/* X dimension (width) - along front edge at bottom, offset toward -Z */}
      <BoundingBoxDimensionLabel
        start={bottomFrontLeft}
        end={bottomFrontRight}
        value={sizeX}
        offsetDir={[0, 0, -1]}
        offset={3}
        color="#ff6b6b"
        units={units}
      />

      {/* Z dimension (depth) - along right edge at bottom, offset toward +X */}
      <BoundingBoxDimensionLabel
        start={bottomFrontRight}
        end={bottomBackRight}
        value={sizeZ}
        offsetDir={[1, 0, 0]}
        offset={3}
        color="#4dabf7"
        units={units}
      />

      {/* Y dimension (height) - along front-right vertical edge, offset diagonally */}
      <BoundingBoxDimensionLabel
        start={bottomFrontRight}
        end={topFrontRight}
        value={sizeY}
        offsetDir={[1, 0, -1]}
        offset={3}
        color="#69db7c"
        units={units}
      />

      {/* Gap/spacing dimensions between parts */}
      {gaps.map((gap, index) => {
        const offsetDir: [number, number, number] =
          gap.axis === 'x' ? [0, 1, 0] : gap.axis === 'z' ? [0, 1, 0] : [1, 0, 0];
        return (
          <BoundingBoxDimensionLabel
            key={`gap-${index}`}
            start={gap.start}
            end={gap.end}
            value={gap.distance}
            offsetDir={offsetDir}
            offset={1.5}
            color="#ffd43b"
            units={units}
          />
        );
      })}

      {/* Bounding box wireframe outline */}
      <group position={[(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2]}>
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(sizeX, sizeY, sizeZ)]} />
          <lineBasicMaterial color="#888888" transparent opacity={0.5} />
        </lineSegments>
      </group>
    </group>
  );
}

// Component that renders snap alignment lines during drag operations
function SnapAlignmentLines() {
  const activeSnapLines = useProjectStore((s) => s.activeSnapLines);
  const units = useProjectStore((s) => s.units);

  if (activeSnapLines.length === 0) return null;

  // Colors for different snap types
  const getLineColor = (line: SnapLine) => {
    if (line.type === 'dimension-match') {
      // Different colors for standard vs part-matched dimensions
      if (line.dimensionMatchInfo?.isStandard) {
        return '#40c057'; // Green for standard dimensions
      }
      return '#ffa94d'; // Orange for part-matched dimensions
    }
    if (line.type === 'equal-spacing') {
      return '#da77f2'; // Magenta/purple for equal spacing
    }
    if (line.type === 'center') {
      return '#ffd43b'; // Yellow for center alignment
    }
    // Colors for edge alignment by axis
    switch (line.axis) {
      case 'x':
        return '#ff6b6b'; // Red for X
      case 'y':
        return '#69db7c'; // Green for Y
      case 'z':
        return '#4dabf7'; // Blue for Z
      default:
        return '#ffffff';
    }
  };

  // Distance indicator color (cyan/teal for visibility)
  const distanceColor = '#00d9ff';
  const connectorColor = '#888888'; // Gray for connector lines

  // Format the source info for dimension match labels
  const formatDimensionMatchLabel = (line: SnapLine, distance: number) => {
    const value = formatMeasurementWithUnit(distance, units);

    if (!line.dimensionMatchInfo) {
      return value;
    }

    if (line.dimensionMatchInfo.isStandard) {
      return `${value} (standard)`;
    }

    if (line.dimensionMatchInfo.sourcePart && line.dimensionMatchInfo.sourceDimension) {
      // Abbreviate dimension names
      const dimAbbrev = {
        length: 'L',
        width: 'W',
        thickness: 'T'
      };
      const abbrev = dimAbbrev[line.dimensionMatchInfo.sourceDimension];
      // Truncate part name if too long
      const partName =
        line.dimensionMatchInfo.sourcePart.length > 12
          ? line.dimensionMatchInfo.sourcePart.substring(0, 12) + '...'
          : line.dimensionMatchInfo.sourcePart;
      return `${value} = ${partName} (${abbrev})`;
    }

    return value;
  };

  return (
    <group>
      {activeSnapLines.map((line, index) => (
        <group key={`snap-group-${index}`}>
          {/* Main snap alignment line */}
          <Line
            points={[
              [line.start.x, line.start.y, line.start.z],
              [line.end.x, line.end.y, line.end.z]
            ]}
            color={getLineColor(line)}
            lineWidth={2}
            dashed
            dashSize={0.5}
            gapSize={0.25}
          />

          {/* Connector line to matched part (for dimension-match only) */}
          {line.connectorLine && (
            <Line
              points={[
                [line.connectorLine.start.x, line.connectorLine.start.y, line.connectorLine.start.z],
                [line.connectorLine.end.x, line.connectorLine.end.y, line.connectorLine.end.z]
              ]}
              color={connectorColor}
              lineWidth={1}
              dashed
              dashSize={0.3}
              gapSize={0.2}
            />
          )}

          {/* Distance indicator lines and labels */}
          {line.distanceIndicators?.map((indicator, distIndex) => {
            const isDimensionMatch = line.type === 'dimension-match';
            const labelColor = isDimensionMatch ? getLineColor(line) : distanceColor;

            return (
              <group key={`distance-${index}-${distIndex}`}>
                {/* Distance line */}
                <Line
                  points={[
                    [indicator.start.x, indicator.start.y, indicator.start.z],
                    [indicator.end.x, indicator.end.y, indicator.end.z]
                  ]}
                  color={isDimensionMatch ? getLineColor(line) : distanceColor}
                  lineWidth={1.5}
                />
                {/* End caps (short perpendicular lines) */}
                <Line
                  points={[
                    [
                      indicator.start.x + (indicator.end.x === indicator.start.x ? 0.2 : 0),
                      indicator.start.y + (indicator.end.y === indicator.start.y ? 0.2 : 0),
                      indicator.start.z + (indicator.end.z === indicator.start.z ? 0.2 : 0)
                    ],
                    [
                      indicator.start.x - (indicator.end.x === indicator.start.x ? 0.2 : 0),
                      indicator.start.y - (indicator.end.y === indicator.start.y ? 0.2 : 0),
                      indicator.start.z - (indicator.end.z === indicator.start.z ? 0.2 : 0)
                    ]
                  ]}
                  color={isDimensionMatch ? getLineColor(line) : distanceColor}
                  lineWidth={1.5}
                />
                <Line
                  points={[
                    [
                      indicator.end.x + (indicator.end.x === indicator.start.x ? 0.2 : 0),
                      indicator.end.y + (indicator.end.y === indicator.start.y ? 0.2 : 0),
                      indicator.end.z + (indicator.end.z === indicator.start.z ? 0.2 : 0)
                    ],
                    [
                      indicator.end.x - (indicator.end.x === indicator.start.x ? 0.2 : 0),
                      indicator.end.y - (indicator.end.y === indicator.start.y ? 0.2 : 0),
                      indicator.end.z - (indicator.end.z === indicator.start.z ? 0.2 : 0)
                    ]
                  ]}
                  color={isDimensionMatch ? getLineColor(line) : distanceColor}
                  lineWidth={1.5}
                />
                {/* Distance label (enhanced for dimension matching) */}
                <Html
                  position={[indicator.labelPosition.x, indicator.labelPosition.y, indicator.labelPosition.z]}
                  center
                  zIndexRange={[0, 50]}
                  style={{ pointerEvents: 'none' }}
                >
                  <div
                    style={{
                      color: labelColor,
                      fontSize: '11px',
                      fontWeight: 'bold',
                      fontFamily: 'monospace',
                      backgroundColor: 'rgba(0, 0, 0, 0.85)',
                      padding: isDimensionMatch ? '3px 8px' : '2px 5px',
                      borderRadius: '3px',
                      whiteSpace: 'nowrap',
                      userSelect: 'none',
                      border: `1px solid ${labelColor}`,
                      boxShadow: isDimensionMatch ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
                    }}
                  >
                    {isDimensionMatch
                      ? formatDimensionMatchLabel(line, indicator.distance)
                      : formatMeasurementWithUnit(indicator.distance, units)}
                  </div>
                </Html>
              </group>
            );
          })}
        </group>
      ))}
    </group>
  );
}

// Axis indicator at origin showing X (red), Y (green), Z (blue) with labels
function AxisIndicator() {
  const axisLength = 10;
  const labelOffset = axisLength + 1.5;

  return (
    <group>
      {/* X axis - Red */}
      <Line
        points={[
          [0, 0, 0],
          [axisLength, 0, 0]
        ]}
        color="#ff4444"
        lineWidth={2}
      />
      <Html position={[labelOffset, 0, 0]} center zIndexRange={[0, 50]}>
        <div
          style={{
            color: '#ff4444',
            fontSize: '14px',
            fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        >
          X
        </div>
      </Html>

      {/* Y axis - Green */}
      <Line
        points={[
          [0, 0, 0],
          [0, axisLength, 0]
        ]}
        color="#44ff44"
        lineWidth={2}
      />
      <Html position={[0, labelOffset, 0]} center zIndexRange={[0, 50]}>
        <div
          style={{
            color: '#44ff44',
            fontSize: '14px',
            fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        >
          Y
        </div>
      </Html>

      {/* Z axis - Blue */}
      <Line
        points={[
          [0, 0, 0],
          [0, 0, axisLength]
        ]}
        color="#4444ff"
        lineWidth={2}
      />
      <Html position={[0, 0, labelOffset]} center zIndexRange={[0, 50]}>
        <div
          style={{
            color: '#4444ff',
            fontSize: '14px',
            fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        >
          Z
        </div>
      </Html>
    </group>
  );
}

export function Workspace() {
  const parts = useProjectStore((s) => s.parts);
  const clearSelection = useProjectStore((s) => s.clearSelection);
  const selectParts = useProjectStore((s) => s.selectParts);
  const openContextMenu = useProjectStore((s) => s.openContextMenu);
  const setSelectionBox = useProjectStore((s) => s.setSelectionBox);
  const showGrid = useProjectStore((s) => s.showGrid);
  const cameraState = useProjectStore((s) => s.cameraState);
  const setCameraState = useProjectStore((s) => s.setCameraState);
  const pendingCameraRestore = useProjectStore((s) => s.pendingCameraRestore);
  const clearPendingCameraRestore = useProjectStore((s) => s.clearPendingCameraRestore);
  const editingGroupId = useProjectStore((s) => s.editingGroupId);
  const exitGroup = useProjectStore((s) => s.exitGroup);
  const lightingMode = useAppSettingsStore((s) => s.settings.lightingMode) || 'default';
  const brightnessMultiplier = useAppSettingsStore((s) => s.settings.brightnessMultiplier) ?? 1.0;
  const lightingPreset = LIGHTING_PRESETS[lightingMode];

  const { camera, gl, controls } = useThree();

  // Drag-box selection state
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const boxStartRef = useRef<{ x: number; y: number } | null>(null);
  const boxEndRef = useRef<{ x: number; y: number } | null>(null);

  // Camera state persistence
  const cameraSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Restore camera state when pendingCameraRestore flag is set
  // This happens when loading a project or restoring from edit mode
  useEffect(() => {
    if (pendingCameraRestore && cameraState && isOrbitControls(controls)) {
      // Restore camera position
      camera.position.set(cameraState.position.x, cameraState.position.y, cameraState.position.z);
      // Restore orbit target
      controls.target.set(cameraState.target.x, cameraState.target.y, cameraState.target.z);
      controls.update();
      // Clear the flag to prevent re-restoration
      clearPendingCameraRestore();
    }
  }, [pendingCameraRestore, cameraState, camera, controls, clearPendingCameraRestore]);

  // Reset camera to default when cameraState is null (new project or assembly edit mode)
  useEffect(() => {
    if (cameraState === null) {
      // Reset OrbitControls target to origin so camera orbits correctly
      if (isOrbitControls(controls)) {
        controls.target.set(0, 0, 0);
        controls.update();
      }
    }
  }, [cameraState, controls]);

  // Save camera state on camera changes (debounced)
  useEffect(() => {
    if (!isOrbitControls(controls)) return;

    const handleCameraChange = () => {
      // Clear any pending save
      if (cameraSaveTimeoutRef.current) {
        clearTimeout(cameraSaveTimeoutRef.current);
      }
      // Debounce the save to avoid excessive updates
      cameraSaveTimeoutRef.current = setTimeout(() => {
        const newCameraState: CameraState = {
          position: {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z
          },
          target: {
            x: controls.target.x,
            y: controls.target.y,
            z: controls.target.z
          }
        };
        setCameraState(newCameraState);
      }, 500); // 500ms debounce
    };

    controls.addEventListener('change', handleCameraChange);
    return () => {
      controls.removeEventListener('change', handleCameraChange);
      if (cameraSaveTimeoutRef.current) {
        clearTimeout(cameraSaveTimeoutRef.current);
      }
    };
  }, [controls, camera, setCameraState]);

  // Track mouse position to distinguish click vs drag (for camera orbit)
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  // Track right-click position and time to distinguish right-click vs right-drag (for pan)
  const rightClickDownPos = useRef<{ x: number; y: number; time: number } | null>(null);

  // Prevent native context menu on canvas - we'll show our own on mouseup
  useEffect(() => {
    const canvas = gl.domElement;
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    canvas.addEventListener('contextmenu', preventContextMenu);
    return () => canvas.removeEventListener('contextmenu', preventContextMenu);
  }, [gl]);

  // Track right-click for our custom context menu (fires on mouseup, not mousedown)
  useEffect(() => {
    const canvas = gl.domElement;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        rightClickDownPos.current = { x: e.clientX, y: e.clientY, time: Date.now() };
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2 && rightClickDownPos.current) {
        const dx = e.clientX - rightClickDownPos.current.x;
        const dy = e.clientY - rightClickDownPos.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const elapsed = Date.now() - rightClickDownPos.current.time;

        // Only show context menu if it was a quick click (not a pan)
        if (distance <= 5 && elapsed <= 500) {
          // Show context menu based on what was targeted on mousedown
          const target = getRightClickTarget();
          if (target) {
            if (target.type === 'guide' && target.guideId) {
              openContextMenu({
                x: e.clientX,
                y: e.clientY,
                type: 'guide',
                guideId: target.guideId
              });
            } else if (target.type === 'part') {
              openContextMenu({ x: e.clientX, y: e.clientY, type: 'part' });
            } else {
              openContextMenu({
                x: e.clientX,
                y: e.clientY,
                type: 'background',
                worldPosition: target.worldPosition
              });
            }
          }
        }
        rightClickDownPos.current = null;
        clearRightClickTarget();
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [gl, openContextMenu]);

  // Click on empty space to deselect (only if not box selecting and not after drag)
  const handleBackgroundClick = (e: ThreeEvent<MouseEvent>) => {
    if (!e.object.userData.isGround || isBoxSelecting) return;

    // Only clear selection if we tracked a pointer-down on the ground
    // This prevents clearing selection when dragging a part and releasing over the ground
    if (!pointerDownPos.current) {
      return;
    }

    // Check if this was a drag (camera orbit) vs a click
    // Only clear selection on a deliberate click (minimal mouse movement)
    const dx = e.nativeEvent.clientX - pointerDownPos.current.x;
    const dy = e.nativeEvent.clientY - pointerDownPos.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If mouse moved more than 5 pixels, it was a drag - don't clear selection
    if (distance > 5) {
      pointerDownPos.current = null;
      return;
    }

    pointerDownPos.current = null;
    clearSelection();
  };

  // Track what was right-clicked on pointer down (for context menu on mouseup)
  const handleGroundRightClick = (e: ThreeEvent<PointerEvent>) => {
    if (e.nativeEvent.button === 2) {
      e.stopPropagation();
      const worldPosition = e.point ? { x: e.point.x, y: 0, z: e.point.z } : { x: 0, y: 0, z: 0 };
      setRightClickTarget({ type: 'background', worldPosition });
    }
  };

  const handleSkyRightClick = (e: ThreeEvent<PointerEvent>) => {
    if (e.nativeEvent.button === 2) {
      const worldPosition = e.point ? { x: e.point.x, y: e.point.y, z: e.point.z } : { x: 0, y: 0, z: 0 };
      setRightClickTarget({ type: 'background', worldPosition });
    }
  };

  // Click on sky to deselect (similar to ground click)
  const handleSkyClick = (e: ThreeEvent<MouseEvent>) => {
    if (!e.object.userData.isSky || isBoxSelecting) return;

    // Only clear selection if we tracked a pointer-down on the sky
    if (!pointerDownPos.current) {
      return;
    }

    // Check if this was a drag (camera orbit) vs a click
    const dx = e.nativeEvent.clientX - pointerDownPos.current.x;
    const dy = e.nativeEvent.clientY - pointerDownPos.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If mouse moved more than 5 pixels, it was a drag - don't clear selection
    if (distance > 5) {
      pointerDownPos.current = null;
      return;
    }

    pointerDownPos.current = null;
    clearSelection();
  };

  // Track pointer down position to detect click vs drag
  const handleBackgroundPointerDownForClick = (e: ThreeEvent<PointerEvent>) => {
    if (e.object.userData.isGround || e.object.userData.isSky) {
      pointerDownPos.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
    }
  };

  // Double-click on background exits group editing mode (one level at a time)
  const handleBackgroundDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!e.object.userData.isGround && !e.object.userData.isSky) return;
    if (editingGroupId !== null) {
      exitGroup();
    }
  };

  // Start box selection on background pointer down (requires Ctrl/Cmd modifier)
  const handleBackgroundPointerDown = (e: ThreeEvent<PointerEvent>) => {
    // Always track pointer position for click detection
    handleBackgroundPointerDownForClick(e);

    // Track right-click target for context menu
    if (e.nativeEvent.button === 2) {
      handleGroundRightClick(e);
      return;
    }

    if (!e.object.userData.isGround) return;

    // Only start box selection with left mouse button + Ctrl/Cmd modifier
    // This allows normal drag to still orbit the camera
    if (e.nativeEvent.button !== 0) return;
    if (!e.nativeEvent.ctrlKey && !e.nativeEvent.metaKey) return;

    e.stopPropagation();

    const screenPos = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
    boxStartRef.current = screenPos;
    boxEndRef.current = screenPos;
    setSelectionBox({ start: screenPos, end: screenPos });
    setIsBoxSelecting(true);

    // Disable orbit controls during selection
    if (isOrbitControls(controls)) {
      controls.enabled = false;
    }
  };

  // Handle pointer move and pointer up for box selection
  useEffect(() => {
    if (!isBoxSelecting) return;

    const handlePointerMove = (e: PointerEvent) => {
      const newEnd = { x: e.clientX, y: e.clientY };
      boxEndRef.current = newEnd;
      if (boxStartRef.current) {
        setSelectionBox({ start: boxStartRef.current, end: newEnd });
      }
    };

    const handlePointerUp = () => {
      if (boxStartRef.current && boxEndRef.current) {
        // Calculate which parts are within the selection box
        const selectedIds = getPartsInSelectionBox(boxStartRef.current, boxEndRef.current);

        if (selectedIds.length > 0) {
          selectParts(selectedIds);
        } else {
          clearSelection();
        }
      }

      setIsBoxSelecting(false);
      boxStartRef.current = null;
      boxEndRef.current = null;
      setSelectionBox(null);

      // Re-enable orbit controls
      if (isOrbitControls(controls)) {
        controls.enabled = true;
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBoxSelecting, controls, selectParts, clearSelection, setSelectionBox]);

  // Get parts whose screen-space bounding box intersects with the selection rectangle
  const getPartsInSelectionBox = (start: { x: number; y: number }, end: { x: number; y: number }): string[] => {
    const rect = gl.domElement.getBoundingClientRect();

    // Normalize selection box to min/max
    const selLeft = Math.min(start.x, end.x);
    const selRight = Math.max(start.x, end.x);
    const selTop = Math.min(start.y, end.y);
    const selBottom = Math.max(start.y, end.y);

    // Minimum drag distance to count as box selection (in pixels)
    const minDragDistance = 5;
    if (Math.abs(end.x - start.x) < minDragDistance && Math.abs(end.y - start.y) < minDragDistance) {
      return [];
    }

    const selectedIds: string[] = [];

    for (const part of parts) {
      // Get part's 3D bounding box corners
      const halfLength = part.length / 2;
      const halfThickness = part.thickness / 2;
      const halfWidth = part.width / 2;

      // Calculate rotation quaternion
      const rotX = (part.rotation.x * Math.PI) / 180;
      const rotY = (part.rotation.y * Math.PI) / 180;
      const rotZ = (part.rotation.z * Math.PI) / 180;
      const euler = new THREE.Euler(rotX, rotY, rotZ, 'XYZ');
      const quat = new THREE.Quaternion().setFromEuler(euler);

      // Get the 8 corners of the bounding box in local space
      const localCorners = [
        new THREE.Vector3(-halfLength, -halfThickness, -halfWidth),
        new THREE.Vector3(-halfLength, -halfThickness, halfWidth),
        new THREE.Vector3(-halfLength, halfThickness, -halfWidth),
        new THREE.Vector3(-halfLength, halfThickness, halfWidth),
        new THREE.Vector3(halfLength, -halfThickness, -halfWidth),
        new THREE.Vector3(halfLength, -halfThickness, halfWidth),
        new THREE.Vector3(halfLength, halfThickness, -halfWidth),
        new THREE.Vector3(halfLength, halfThickness, halfWidth)
      ];

      // Transform corners to world space and project to screen
      const screenPoints: { x: number; y: number }[] = [];
      for (const corner of localCorners) {
        // Apply rotation
        corner.applyQuaternion(quat);
        // Apply position
        corner.add(new THREE.Vector3(part.position.x, part.position.y, part.position.z));
        // Project to screen
        corner.project(camera);
        // Convert to screen coordinates
        screenPoints.push({
          x: ((corner.x + 1) / 2) * rect.width + rect.left,
          y: ((-corner.y + 1) / 2) * rect.height + rect.top
        });
      }

      // Get screen-space bounding box of the part
      const partLeft = Math.min(...screenPoints.map((p) => p.x));
      const partRight = Math.max(...screenPoints.map((p) => p.x));
      const partTop = Math.min(...screenPoints.map((p) => p.y));
      const partBottom = Math.max(...screenPoints.map((p) => p.y));

      // Check if part's screen bounding box intersects with selection box
      const intersects = partLeft <= selRight && partRight >= selLeft && partTop <= selBottom && partBottom >= selTop;

      if (intersects) {
        selectedIds.push(part.id);
      }
    }

    return selectedIds;
  };

  return (
    <>
      {/* Camera controller for centering on selection */}
      <CameraController />
      {/* Canvas capture handler for export */}
      <CanvasCaptureHandler />
      {/* Thumbnail generator for project saves */}
      <ThumbnailCaptureHandler />
      {/* GPU telemetry for debugging production performance */}
      <GpuTelemetry />

      {/* Ground plane (invisible but clickable) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.001, 0]}
        onClick={handleBackgroundClick}
        onDoubleClick={handleBackgroundDoubleClick}
        onPointerDown={handleBackgroundPointerDown}
        userData={{ isGround: true }}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Sky sphere (catches clicks that miss everything else) */}
      <mesh
        onPointerDown={(e) => {
          handleBackgroundPointerDownForClick(e);
          if (e.nativeEvent.button === 2) {
            handleSkyRightClick(e);
          }
        }}
        onClick={handleSkyClick}
        onDoubleClick={handleBackgroundDoubleClick}
        userData={{ isSky: true }}
        renderOrder={-1}
      >
        <sphereGeometry args={[500, 32, 32]} />
        <meshBasicMaterial visible={false} side={1} /> {/* BackSide = 1 */}
      </mesh>

      {/* Visual grid */}
      {showGrid && (
        <Grid
          args={[200, 200]}
          cellSize={GRID_SIZE}
          cellThickness={0.5}
          cellColor="#4a4a4a"
          sectionSize={12}
          sectionThickness={1}
          sectionColor="#6a6a6a"
          fadeDistance={100}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={true}
        />
      )}

      {/* Origin axis indicators (only show when grid is visible) */}
      {showGrid && <AxisIndicator />}

      {/* Lighting - uses preset from app settings with brightness multiplier */}
      {/* Keys force recreation when lighting mode changes, ensuring Three.js updates properly */}
      <ambientLight
        key={`ambient-${lightingMode}-${brightnessMultiplier}`}
        intensity={lightingPreset.ambient * brightnessMultiplier}
      />
      <directionalLight
        key={`main-${lightingMode}-${brightnessMultiplier}`}
        position={lightingPreset.mainLight.position}
        intensity={lightingPreset.mainLight.intensity * brightnessMultiplier}
        castShadow
      />
      <directionalLight
        key={`fill-${lightingMode}-${brightnessMultiplier}`}
        position={lightingPreset.fillLight.position}
        intensity={lightingPreset.fillLight.intensity * brightnessMultiplier}
      />

      {/* Camera controls */}
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} minDistance={1} maxDistance={600} zoomSpeed={0.5} />

      {/* All parts */}
      {parts.map((part) => (
        <Part key={part.id} part={part} />
      ))}

      {/* Multi-selection bounding box dimensions */}
      <MultiSelectionDimensions />

      {/* Snap alignment lines */}
      <SnapAlignmentLines />

      {/* Reference distance indicators */}
      <ReferenceDistanceIndicators />

      {/* Persistent snap guides */}
      <SnapGuides />
    </>
  );
}

// Component that renders persistent snap guides
function SnapGuides() {
  const snapGuides = useProjectStore((s) => s.snapGuides);

  if (snapGuides.length === 0) return null;

  // Guide plane size (extends from -50 to +50 on perpendicular axes)
  const GUIDE_SIZE = 100;
  const GUIDE_HALF = GUIDE_SIZE / 2;

  // Colors for each axis (matching snap colors but more transparent)
  const axisColors = {
    x: '#ff6b6b',
    y: '#69db7c',
    z: '#4dabf7'
  };

  // Track right-click on guide for context menu (shown on mouseup by Workspace)
  const handleGuidePointerDown = (e: ThreeEvent<PointerEvent>, guideId: string) => {
    if (e.nativeEvent.button === 2) {
      e.stopPropagation();
      setRightClickTarget({ type: 'guide', guideId });
    }
  };

  return (
    <group>
      {snapGuides.map((guide) => {
        let rotation: [number, number, number];
        let position: [number, number, number];

        switch (guide.axis) {
          case 'x':
            // YZ plane at X = position
            position = [guide.position, 0, 0];
            rotation = [0, Math.PI / 2, 0];
            break;
          case 'y':
            // XZ plane at Y = position
            position = [0, guide.position, 0];
            rotation = [-Math.PI / 2, 0, 0];
            break;
          case 'z':
          default:
            // XY plane at Z = position
            position = [0, 0, guide.position];
            rotation = [0, 0, 0];
            break;
        }

        return (
          <group key={guide.id}>
            {/* Semi-transparent plane - interactive for context menu */}
            <mesh position={position} rotation={rotation} onPointerDown={(e) => handleGuidePointerDown(e, guide.id)}>
              <planeGeometry args={[GUIDE_SIZE, GUIDE_SIZE]} />
              <meshBasicMaterial
                color={axisColors[guide.axis]}
                transparent
                opacity={0.05}
                side={2} // DoubleSide
                depthWrite={false}
              />
            </mesh>

            {/* Edge lines for visibility */}
            <Line
              points={
                guide.axis === 'x'
                  ? [
                      [guide.position, -GUIDE_HALF, -GUIDE_HALF],
                      [guide.position, -GUIDE_HALF, GUIDE_HALF],
                      [guide.position, GUIDE_HALF, GUIDE_HALF],
                      [guide.position, GUIDE_HALF, -GUIDE_HALF],
                      [guide.position, -GUIDE_HALF, -GUIDE_HALF]
                    ]
                  : guide.axis === 'y'
                    ? [
                        [-GUIDE_HALF, guide.position, -GUIDE_HALF],
                        [GUIDE_HALF, guide.position, -GUIDE_HALF],
                        [GUIDE_HALF, guide.position, GUIDE_HALF],
                        [-GUIDE_HALF, guide.position, GUIDE_HALF],
                        [-GUIDE_HALF, guide.position, -GUIDE_HALF]
                      ]
                    : [
                        [-GUIDE_HALF, -GUIDE_HALF, guide.position],
                        [GUIDE_HALF, -GUIDE_HALF, guide.position],
                        [GUIDE_HALF, GUIDE_HALF, guide.position],
                        [-GUIDE_HALF, GUIDE_HALF, guide.position],
                        [-GUIDE_HALF, -GUIDE_HALF, guide.position]
                      ]
              }
              color={axisColors[guide.axis]}
              lineWidth={1}
              dashed
              dashSize={2}
              gapSize={1}
            />
          </group>
        );
      })}
    </group>
  );
}
