import { Grid, Html, Line, OrbitControls } from '@react-three/drei';
import { ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { GRID_SIZE } from '../constants';
import { useProjectStore, getAllDescendantPartIds } from '../store/projectStore';
import { SnapLine } from '../types';
import { formatMeasurementWithUnit } from '../utils/fractions';
import { Part } from './Part';

// Type guard to check if controls is OrbitControls
function isOrbitControls(controls: THREE.EventDispatcher<object> | null): controls is OrbitControlsImpl {
  return controls !== null && 'enabled' in controls;
}

// Component that handles camera centering and view vector tracking
function CameraController() {
  const { camera, controls } = useThree();
  const parts = useProjectStore((s) => s.parts);
  const selectedPartIds = useProjectStore((s) => s.selectedPartIds);
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
    if (!centerCameraRequested || selectedPartIds.length === 0) return;

    // Calculate center of all selected parts
    const selectedParts = parts.filter((p) => selectedPartIds.includes(p.id));
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
  }, [centerCameraRequested, selectedPartIds, parts, controls, clearCenterCameraRequest]);

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

  // Only show when 2+ parts are effectively selected
  if (effectiveSelectedPartIds.length < 2) return null;

  const selectedParts = parts.filter((p) => effectiveSelectedPartIds.includes(p.id));
  if (selectedParts.length < 2) return null;

  // Calculate bounding boxes for each part, applying drag delta if active
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
      return '#ffa94d'; // Orange for dimension matching
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

          {/* Distance indicator lines and labels */}
          {line.distanceIndicators?.map((indicator, distIndex) => (
            <group key={`distance-${index}-${distIndex}`}>
              {/* Distance line */}
              <Line
                points={[
                  [indicator.start.x, indicator.start.y, indicator.start.z],
                  [indicator.end.x, indicator.end.y, indicator.end.z]
                ]}
                color={distanceColor}
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
                color={distanceColor}
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
                color={distanceColor}
                lineWidth={1.5}
              />
              {/* Distance label */}
              <Html
                position={[indicator.labelPosition.x, indicator.labelPosition.y, indicator.labelPosition.z]}
                center
                zIndexRange={[0, 50]}
                style={{ pointerEvents: 'none' }}
              >
                <div
                  style={{
                    color: distanceColor,
                    fontSize: '11px',
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    padding: '2px 5px',
                    borderRadius: '3px',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                    border: `1px solid ${distanceColor}`
                  }}
                >
                  {formatMeasurementWithUnit(indicator.distance, units)}
                </div>
              </Html>
            </group>
          ))}
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

  const { camera, gl, controls } = useThree();

  // Drag-box selection state
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const boxStartRef = useRef<{ x: number; y: number } | null>(null);
  const boxEndRef = useRef<{ x: number; y: number } | null>(null);

  // Track mouse position to distinguish click vs drag (for camera orbit)
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

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

  // Right-click on ground to show context menu
  const handleGroundContextMenu = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation(); // Prevent event from also triggering on sky sphere
    e.nativeEvent.preventDefault();

    // Use intersection point with Y=0 for ground clicks
    const worldPosition = e.point ? { x: e.point.x, y: 0, z: e.point.z } : { x: 0, y: 0, z: 0 };

    openContextMenu({
      x: e.nativeEvent.clientX,
      y: e.nativeEvent.clientY,
      type: 'background',
      worldPosition
    });
  };

  // Right-click on sky (when nothing else is hit) to show context menu
  const handleSkyContextMenu = (e: ThreeEvent<MouseEvent>) => {
    e.nativeEvent.preventDefault();

    // Use the intersection point on the sky sphere
    // This gives a 3D position that can be used for Y guides at any height
    const worldPosition = e.point ? { x: e.point.x, y: e.point.y, z: e.point.z } : { x: 0, y: 0, z: 0 };

    openContextMenu({
      x: e.nativeEvent.clientX,
      y: e.nativeEvent.clientY,
      type: 'background',
      worldPosition
    });
  };

  // Track pointer down position to detect click vs drag
  const handleBackgroundPointerDownForClick = (e: ThreeEvent<PointerEvent>) => {
    if (e.object.userData.isGround) {
      pointerDownPos.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
    }
  };

  // Start box selection on background pointer down (requires Ctrl/Cmd modifier)
  const handleBackgroundPointerDown = (e: ThreeEvent<PointerEvent>) => {
    // Always track pointer position for click detection
    handleBackgroundPointerDownForClick(e);

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

      {/* Ground plane (invisible but clickable) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.001, 0]}
        onClick={handleBackgroundClick}
        onContextMenu={handleGroundContextMenu}
        onPointerDown={handleBackgroundPointerDown}
        userData={{ isGround: true }}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Sky sphere (catches clicks that miss everything else) */}
      <mesh onContextMenu={handleSkyContextMenu} userData={{ isSky: true }} renderOrder={-1}>
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

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} />

      {/* Camera controls */}
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} minDistance={5} maxDistance={600} />

      {/* All parts */}
      {parts.map((part) => (
        <Part key={part.id} part={part} />
      ))}

      {/* Empty state message when no parts exist */}
      {parts.length === 0 && (
        <Html center zIndexRange={[0, 0]}>
          <div className="text-center pointer-events-none select-none">
            <div className="bg-gray-800 bg-opacity-95 rounded-xl p-10 shadow-2xl backdrop-blur-sm border-2 border-gray-700" style={{ minWidth: '480px', maxWidth: '560px' }}>
              <div className="text-7xl mb-5">🛠️</div>
              <h2 className="text-3xl font-bold text-white mb-4">Start Building</h2>
              <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                Add parts to your design to get started. You can create parts from the sidebar or drag stock materials onto the canvas.
              </p>
              <div className="text-base text-gray-400 space-y-3">
                <div className="flex items-center justify-center gap-3">
                  <kbd className="px-3 py-2 bg-gray-700 rounded-md text-sm font-semibold text-yellow-400 border border-gray-600 shadow-sm">P</kbd>
                  <span>Add new part</span>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-gray-500 font-medium">Drag stock →</span>
                  <span>Create part from stock</span>
                </div>
              </div>
            </div>
          </div>
        </Html>
      )}

      {/* Multi-selection bounding box dimensions */}
      <MultiSelectionDimensions />

      {/* Snap alignment lines */}
      <SnapAlignmentLines />

      {/* Persistent snap guides */}
      <SnapGuides />
    </>
  );
}

// Component that renders persistent snap guides
function SnapGuides() {
  const snapGuides = useProjectStore((s) => s.snapGuides);
  const openContextMenu = useProjectStore((s) => s.openContextMenu);

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

  const handleGuideContextMenu = (e: ThreeEvent<MouseEvent>, guideId: string) => {
    e.stopPropagation();
    e.nativeEvent.preventDefault();

    openContextMenu({
      x: e.nativeEvent.clientX,
      y: e.nativeEvent.clientY,
      type: 'guide',
      guideId
    });
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
            <mesh position={position} rotation={rotation} onContextMenu={(e) => handleGuideContextMenu(e, guide.id)}>
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
