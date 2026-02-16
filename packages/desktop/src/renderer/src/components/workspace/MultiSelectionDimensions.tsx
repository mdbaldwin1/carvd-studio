import { Html, Line } from '@react-three/drei';
import { memo, useMemo } from 'react';
import * as THREE from 'three';
import { useProjectStore, getAllDescendantPartIds } from '../../store/projectStore';
import { formatMeasurementWithUnit } from '../../utils/fractions';
import { getPartAABB } from './workspaceUtils';

// Blueprint-style dimension label for multi-selection bounding box
const BoundingBoxDimensionLabel = memo(
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
            [
              offsetStart[0] - normalizedTick[0],
              offsetStart[1] - normalizedTick[1],
              offsetStart[2] - normalizedTick[2]
            ],
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
  },
  (prev, next) =>
    prev.value === next.value &&
    prev.offset === next.offset &&
    prev.color === next.color &&
    prev.units === next.units &&
    prev.start[0] === next.start[0] &&
    prev.start[1] === next.start[1] &&
    prev.start[2] === next.start[2] &&
    prev.end[0] === next.end[0] &&
    prev.end[1] === next.end[1] &&
    prev.end[2] === next.end[2] &&
    prev.offsetDir[0] === next.offsetDir[0] &&
    prev.offsetDir[1] === next.offsetDir[1] &&
    prev.offsetDir[2] === next.offsetDir[2]
);

// Component that shows overall bounding box dimensions when multiple parts are selected
export function MultiSelectionDimensions() {
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

  // Memoize the heavy AABB + gap calculations
  const boundsData = useMemo(() => {
    // Show bounding box for 2+ selected parts, or for group selections (even single-part groups)
    const hasGroupSelection = selectedGroupIds.length > 0;
    const minParts = hasGroupSelection ? 1 : 2;
    if (effectiveSelectedPartIds.length < minParts) return null;

    const selectedParts = parts.filter((p) => effectiveSelectedPartIds.includes(p.id));
    if (selectedParts.length < minParts) return null;

    const partAABBs = selectedParts.map((part) => ({
      part,
      aabb: getPartAABB(part)
    }));

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

    // Calculate gaps between parts along each axis
    const gaps: {
      axis: 'x' | 'y' | 'z';
      start: [number, number, number];
      end: [number, number, number];
      distance: number;
    }[] = [];

    const sortedByX = [...partAABBs].sort((a, b) => a.aabb.minX - b.aabb.minX);
    for (let i = 0; i < sortedByX.length - 1; i++) {
      const current = sortedByX[i];
      const next = sortedByX[i + 1];
      const gap = next.aabb.minX - current.aabb.maxX;
      if (gap > 0.01) {
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

    return { minX, maxX, minY, maxY, minZ, maxZ, gaps };
  }, [effectiveSelectedPartIds, parts, selectedGroupIds]);

  if (!boundsData) return null;
  if (activeDragDelta) return null; // Hide dimension labels while dragging

  const { minX, maxX, minY, maxY, minZ, maxZ, gaps } = boundsData;
  const sizeX = maxX - minX;
  const sizeY = maxY - minY;
  const sizeZ = maxZ - minZ;

  const bottomFrontLeft: [number, number, number] = [minX, minY, minZ];
  const bottomFrontRight: [number, number, number] = [maxX, minY, minZ];
  const bottomBackRight: [number, number, number] = [maxX, minY, maxZ];
  const topFrontRight: [number, number, number] = [maxX, maxY, minZ];

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
