import { Edges, Html, Line } from '@react-three/drei';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/shallow';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { GRID_SIZE } from '../../constants';
import {
  useProjectStore,
  getContainingGroupId,
  getAllDescendantPartIds,
  getAncestorGroupIds
} from '../../store/projectStore';
import { useAppSettingsStore } from '../../store/appSettingsStore';
import { Part as PartType, RotationAngle } from '../../types';
import { formatMeasurementWithUnit } from '../../utils/fractions';
import {
  detectSnaps,
  calculateSnapThreshold,
  detectDimensionSnaps,
  createDimensionMatchSnapLine,
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
import { setRightClickTarget } from './Workspace';

// Type guard to check if controls is OrbitControls
function isOrbitControls(controls: THREE.EventDispatcher<object> | null): controls is OrbitControlsImpl {
  return controls !== null && 'enabled' in controls;
}

// Blueprint-style dimension label component
function DimensionLabel({
  start,
  end,
  value,
  offsetDir,
  offset = 1.5,
  color = '#ffffff',
  units
}: {
  start: [number, number, number];
  end: [number, number, number];
  value: number;
  offsetDir: [number, number, number]; // Direction to offset the dimension line (should point away from part)
  offset?: number;
  color?: string;
  units: 'imperial' | 'metric';
}) {
  // Calculate the midpoint for the label
  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2;
  const midZ = (start[2] + end[2]) / 2;

  // Normalize the offset direction and scale by offset amount
  const dirLen = Math.sqrt(offsetDir[0] ** 2 + offsetDir[1] ** 2 + offsetDir[2] ** 2);
  const offsetVec: [number, number, number] = [
    (offsetDir[0] / dirLen) * offset,
    (offsetDir[1] / dirLen) * offset,
    (offsetDir[2] / dirLen) * offset
  ];

  // Offset positions for the dimension line
  const offsetStart: [number, number, number] = [
    start[0] + offsetVec[0],
    start[1] + offsetVec[1],
    start[2] + offsetVec[2]
  ];
  const offsetEnd: [number, number, number] = [end[0] + offsetVec[0], end[1] + offsetVec[1], end[2] + offsetVec[2]];
  const labelPos: [number, number, number] = [midX + offsetVec[0], midY + offsetVec[1], midZ + offsetVec[2]];

  // Calculate tick direction (perpendicular to both the line and offset direction)
  const lineDir: [number, number, number] = [end[0] - start[0], end[1] - start[1], end[2] - start[2]];
  // Cross product of line direction and offset direction gives tick direction
  const tickDir: [number, number, number] = [
    lineDir[1] * offsetVec[2] - lineDir[2] * offsetVec[1],
    lineDir[2] * offsetVec[0] - lineDir[0] * offsetVec[2],
    lineDir[0] * offsetVec[1] - lineDir[1] * offsetVec[0]
  ];
  const tickLen = Math.sqrt(tickDir[0] ** 2 + tickDir[1] ** 2 + tickDir[2] ** 2);
  const tickLength = 0.3;
  const normalizedTick: [number, number, number] =
    tickLen > 0
      ? [
          ((tickDir[0] / tickLen) * tickLength) / 2,
          ((tickDir[1] / tickLen) * tickLength) / 2,
          ((tickDir[2] / tickLen) * tickLength) / 2
        ]
      : [0, tickLength / 2, 0]; // Fallback

  return (
    <group>
      {/* Main dimension line */}
      <Line points={[offsetStart, offsetEnd]} color={color} lineWidth={1.5} />

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

      {/* Start tick mark (perpendicular to dimension line) */}
      <Line
        points={[
          [offsetStart[0] - normalizedTick[0], offsetStart[1] - normalizedTick[1], offsetStart[2] - normalizedTick[2]],
          [offsetStart[0] + normalizedTick[0], offsetStart[1] + normalizedTick[1], offsetStart[2] + normalizedTick[2]]
        ]}
        color={color}
        lineWidth={1.5}
      />

      {/* End tick mark */}
      <Line
        points={[
          [offsetEnd[0] - normalizedTick[0], offsetEnd[1] - normalizedTick[1], offsetEnd[2] - normalizedTick[2]],
          [offsetEnd[0] + normalizedTick[0], offsetEnd[1] + normalizedTick[1], offsetEnd[2] + normalizedTick[2]]
        ]}
        color={color}
        lineWidth={1.5}
      />

      {/* Dimension text */}
      <Html position={labelPos} center zIndexRange={[0, 50]} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            color: color,
            fontSize: '13px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '2px 6px',
            borderRadius: '3px',
            whiteSpace: 'nowrap',
            userSelect: 'none'
          }}
        >
          {formatMeasurementWithUnit(value, units)}
        </div>
      </Html>
    </group>
  );
}

// Double-headed arrow showing grain direction painted on the part surface
function GrainDirectionArrow({
  liveDims,
  grainDirection
}: {
  liveDims: LiveDimensions;
  grainDirection: 'length' | 'width';
}) {
  // Arrow sits just above top surface
  const surfaceY = liveDims.thickness / 2 + 0.02;

  // Calculate arrow size based on grain direction (60% of that dimension, max 8 inches)
  const alongDim = grainDirection === 'length' ? liveDims.length : liveDims.width;
  const arrowLength = Math.min(alongDim * 0.6, 8);
  const halfArrow = arrowLength / 2;

  // Arrow head and shaft proportions
  const headLength = Math.min(arrowLength * 0.25, 1.5);
  const headWidth = Math.min(arrowLength * 0.15, 0.8);
  const shaftWidth = headWidth * 0.4;

  // Rotation for width direction (rotate 90 degrees around Y)
  const rotation: [number, number, number] = grainDirection === 'length' ? [0, 0, 0] : [0, Math.PI / 2, 0];

  // Wood grain brown color
  const arrowColor = '#8B4513';

  return (
    <group position={[0, surfaceY, 0]} rotation={rotation}>
      {/* Arrow shaft - flat rectangle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[arrowLength - headLength * 2, shaftWidth]} />
        <meshStandardMaterial color={arrowColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Arrow head 1 (positive X direction) */}
      <mesh position={[halfArrow - headLength / 2, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={3}
            array={
              new Float32Array([
                -headLength / 2,
                -headWidth,
                0, // back left
                -headLength / 2,
                headWidth,
                0, // back right
                headLength / 2,
                0,
                0 // tip
              ])
            }
            itemSize={3}
          />
        </bufferGeometry>
        <meshStandardMaterial color={arrowColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Arrow head 2 (negative X direction) */}
      <mesh position={[-halfArrow + headLength / 2, 0, 0]} rotation={[-Math.PI / 2, 0, Math.PI]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={3}
            array={
              new Float32Array([
                -headLength / 2,
                -headWidth,
                0, // back left
                -headLength / 2,
                headWidth,
                0, // back right
                headLength / 2,
                0,
                0 // tip
              ])
            }
            itemSize={3}
          />
        </bufferGeometry>
        <meshStandardMaterial color={arrowColor} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

interface PartProps {
  part: PartType;
}

// Handle types for 3D resize system
type HandleType = 'corner' | 'edge-x' | 'edge-y' | 'edge-z';

// 3D handle position: x, y, z indicate position on the box (-1, 0, or 1)
// For corners: all three are ±1
// For edges: one is 0 (the axis the edge is parallel to), others are ±1
type HandlePosition = {
  x: -1 | 0 | 1;
  y: -1 | 0 | 1;
  z: -1 | 0 | 1;
  type: HandleType;
};

const HANDLE_POSITIONS: HandlePosition[] = [
  // 8 Corners - for uniform scaling
  { x: -1, y: -1, z: -1, type: 'corner' },
  { x: -1, y: -1, z: 1, type: 'corner' },
  { x: -1, y: 1, z: -1, type: 'corner' },
  { x: -1, y: 1, z: 1, type: 'corner' },
  { x: 1, y: -1, z: -1, type: 'corner' },
  { x: 1, y: -1, z: 1, type: 'corner' },
  { x: 1, y: 1, z: -1, type: 'corner' },
  { x: 1, y: 1, z: 1, type: 'corner' },

  // 4 Edges parallel to X axis (affects Y and Z)
  { x: 0, y: -1, z: -1, type: 'edge-x' },
  { x: 0, y: -1, z: 1, type: 'edge-x' },
  { x: 0, y: 1, z: -1, type: 'edge-x' },
  { x: 0, y: 1, z: 1, type: 'edge-x' },

  // 4 Edges parallel to Y axis (affects X and Z)
  { x: -1, y: 0, z: -1, type: 'edge-y' },
  { x: -1, y: 0, z: 1, type: 'edge-y' },
  { x: 1, y: 0, z: -1, type: 'edge-y' },
  { x: 1, y: 0, z: 1, type: 'edge-y' },

  // 4 Edges parallel to Z axis (affects X and Y)
  { x: -1, y: -1, z: 0, type: 'edge-z' },
  { x: -1, y: 1, z: 0, type: 'edge-z' },
  { x: 1, y: -1, z: 0, type: 'edge-z' },
  { x: 1, y: 1, z: 0, type: 'edge-z' }
];

const HANDLE_SIZE = 0.45; // Slightly larger for better visibility

// Bolder resize handle colors for better visibility
const RESIZE_COLORS = {
  corner: '#ffcc44', // Bright gold for corners
  edge: '#44aaff', // Bright blue for edges
  hover: '#ffffff' // White on hover
};

interface LiveDimensions {
  x: number;
  y: number;
  z: number;
  length: number;
  width: number;
  thickness: number;
}

function ResizeHandle({
  liveDims,
  handlePos,
  onResizeStart,
  isResizing
}: {
  liveDims: LiveDimensions;
  handlePos: HandlePosition;
  onResizeStart: (handlePos: HandlePosition, e: ThreeEvent<PointerEvent>) => void;
  isResizing: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  // Calculate handle position relative to part center (0,0,0 in local space)
  // For each axis: if handlePos value is 0, position at center; otherwise at edge
  // Handles are centered on the part edge so they overlap the part by half their size,
  // making them easier to grab when parts are flush against each other
  const halfLength = liveDims.length / 2;
  const halfThickness = liveDims.thickness / 2;
  const halfWidth = liveDims.width / 2;

  // Positions relative to center (group position handles world offset)
  const handleX = handlePos.x === 0 ? 0 : handlePos.x * halfLength;
  const handleY = handlePos.y === 0 ? 0 : handlePos.y * halfThickness;
  const handleZ = handlePos.z === 0 ? 0 : handlePos.z * halfWidth;

  // Determine cursor based on handle type
  let cursor = 'pointer';
  if (handlePos.type === 'corner') {
    cursor = 'nwse-resize'; // Uniform scale
  } else if (handlePos.type === 'edge-x') {
    // Edge parallel to X, affects Y and Z
    cursor = 'ns-resize';
  } else if (handlePos.type === 'edge-y') {
    // Edge parallel to Y (vertical), affects X and Z
    cursor = 'ew-resize';
  } else if (handlePos.type === 'edge-z') {
    // Edge parallel to Z, affects X and Y
    cursor = 'nesw-resize';
  }

  // Bolder colors for different handle types
  const baseColor = handlePos.type === 'corner' ? RESIZE_COLORS.corner : RESIZE_COLORS.edge;
  const isActive = hovered || isResizing;

  return (
    <group position={[handleX, handleY, handleZ]}>
      {/* Dark outline for contrast on any background */}
      <mesh scale={1.15}>
        <boxGeometry args={[HANDLE_SIZE, HANDLE_SIZE, HANDLE_SIZE]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.5} />
      </mesh>
      {/* Main handle */}
      <mesh
        onPointerDown={(e) => {
          e.stopPropagation();
          onResizeStart(handlePos, e);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = cursor;
        }}
        onPointerOut={() => {
          setHovered(false);
          if (!isResizing) document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={[HANDLE_SIZE, HANDLE_SIZE, HANDLE_SIZE]} />
        <meshStandardMaterial
          color={isActive ? RESIZE_COLORS.hover : baseColor}
          emissive={isActive ? baseColor : '#000000'}
          emissiveIntensity={isActive ? 0.3 : 0}
        />
      </mesh>
    </group>
  );
}

// Rotation handle - flat ring with arrow on each face
const ROTATION_HANDLE_SIZE = 0.55; // Slightly larger
const ROTATION_RING_THICKNESS = 0.12; // Thicker ring (was 0.08)

// Bolder, more saturated rotation colors
const ROTATION_COLORS = {
  x: '#ff4444', // Bright red for X
  y: '#44ff44', // Bright green for Y
  z: '#4499ff', // Bright blue for Z
  hover: '#ffffff'
};

function RotationHandle({
  liveDims,
  axis,
  side,
  onRotate
}: {
  liveDims: LiveDimensions;
  axis: 'x' | 'y' | 'z';
  side: 1 | -1; // Which side of the axis (+1 or -1)
  onRotate: (axis: 'x' | 'y' | 'z') => void;
}) {
  const [hovered, setHovered] = useState(false);

  const halfLength = liveDims.length / 2;
  const halfThickness = liveDims.thickness / 2;
  const halfWidth = liveDims.width / 2;
  const offset = 0.15; // Distance above the surface

  // Position the handle on the face perpendicular to the rotation axis
  // Rotation orients the flat ring to be parallel to the face it's on
  let position: [number, number, number];
  let rotation: [number, number, number];

  if (axis === 'y') {
    // Top (+1) or bottom (-1) face - ring lies flat (parallel to XZ plane)
    position = [0, side * (halfThickness + offset), 0];
    rotation = [-Math.PI / 2, 0, 0];
  } else if (axis === 'x') {
    // +X or -X side face - ring parallel to YZ plane
    position = [side * (halfLength + offset), 0, 0];
    rotation = [0, Math.PI / 2, 0];
  } else {
    // +Z or -Z front/back face - ring parallel to XY plane
    position = [0, 0, side * (halfWidth + offset)];
    rotation = [0, 0, 0];
  }

  const baseColor = ROTATION_COLORS[axis];
  const color = hovered ? ROTATION_COLORS.hover : baseColor;

  // Arrow triangle vertices (flat, pointing tangent to the ring)
  // Small Z offset to sit on top of the ring and avoid z-fighting
  const arrowSize = 0.4; // Slightly larger arrow
  const zOffset = 0.02; // Z offset applied to mesh position
  const arrowPosX = ROTATION_HANDLE_SIZE - 0.1; // Position on the ring
  const arrowVertices = new Float32Array([
    0,
    -arrowSize * 0.7,
    0, // back left (wider)
    0,
    arrowSize * 0.7,
    0, // back right (wider)
    arrowSize * 1.1,
    0,
    0 // tip (longer)
  ]);

  // Shared event handlers
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onRotate(axis);
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  return (
    <group position={position} rotation={rotation}>
      {/* Invisible hit area - covers entire circular region for easier clicking */}
      <mesh onClick={handleClick} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
        <circleGeometry args={[ROTATION_HANDLE_SIZE + ROTATION_RING_THICKNESS, 24]} />
        <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Dark outline ring for contrast */}
      <mesh>
        <ringGeometry
          args={[
            ROTATION_HANDLE_SIZE - ROTATION_RING_THICKNESS - 0.02,
            ROTATION_HANDLE_SIZE + ROTATION_RING_THICKNESS + 0.02,
            24
          ]}
        />
        <meshBasicMaterial color="#000000" side={THREE.DoubleSide} transparent opacity={0.4} />
      </mesh>

      {/* Main visible ring - thicker and bolder */}
      <mesh>
        <ringGeometry
          args={[ROTATION_HANDLE_SIZE - ROTATION_RING_THICKNESS, ROTATION_HANDLE_SIZE + ROTATION_RING_THICKNESS, 24]}
        />
        <meshStandardMaterial
          color={color}
          side={THREE.DoubleSide}
          emissive={hovered ? baseColor : '#000000'}
          emissiveIntensity={hovered ? 0.4 : 0}
        />
      </mesh>

      {/* Flat arrow indicator showing rotation direction - positioned on the ring */}
      <mesh position={[arrowPosX, 0, zOffset]} rotation={[0, 0, -Math.PI / 6]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={3} array={arrowVertices} itemSize={3} />
        </bufferGeometry>
        <meshStandardMaterial
          color={color}
          side={THREE.DoubleSide}
          emissive={hovered ? baseColor : '#000000'}
          emissiveIntensity={hovered ? 0.4 : 0}
        />
      </mesh>
    </group>
  );
}

export const Part = memo(function Part({ part }: PartProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera, gl, controls } = useThree();

  // Consolidated state selector - only re-renders when these specific values change
  const {
    selectedPartIds,
    hoveredPartId,
    activeDragDelta,
    units,
    showGrainDirection,
    displayMode,
    referencePartIds,
    groupMembers,
    selectedGroupIds,
    editingGroupId
  } = useProjectStore(
    useShallow((s) => ({
      selectedPartIds: s.selectedPartIds,
      hoveredPartId: s.hoveredPartId,
      activeDragDelta: s.activeDragDelta,
      units: s.units,
      showGrainDirection: s.showGrainDirection,
      displayMode: s.displayMode,
      referencePartIds: s.referencePartIds,
      groupMembers: s.groupMembers,
      selectedGroupIds: s.selectedGroupIds,
      editingGroupId: s.editingGroupId
    }))
  );

  // Actions are stable references - grab them once outside the render cycle
  const selectPart = useProjectStore((s) => s.selectPart);
  const togglePartSelection = useProjectStore((s) => s.togglePartSelection);
  const setHoveredPart = useProjectStore((s) => s.setHoveredPart);
  const updatePart = useProjectStore((s) => s.updatePart);
  const moveSelectedParts = useProjectStore((s) => s.moveSelectedParts);
  const clearSelection = useProjectStore((s) => s.clearSelection);
  const selectGroup = useProjectStore((s) => s.selectGroup);
  const toggleGroupSelection = useProjectStore((s) => s.toggleGroupSelection);
  const enterGroup = useProjectStore((s) => s.enterGroup);
  // Note: snapToPartsEnabled and setActiveSnapLines are accessed via getState() in useEffect

  // Group membership - get all ancestor groups (from immediate to top-level)
  const ancestorGroupIds = getAncestorGroupIds(part.id, groupMembers);
  const containingGroupId = ancestorGroupIds.length > 0 ? ancestorGroupIds[0] : null; // Immediate parent
  const topLevelGroupId = ancestorGroupIds.length > 0 ? ancestorGroupIds[ancestorGroupIds.length - 1] : null; // Root ancestor
  const isInGroup = containingGroupId !== null;
  const isInsideAncestorGroup = editingGroupId !== null && ancestorGroupIds.includes(editingGroupId); // We're editing an ancestor

  // Determine which group to select when clicking this part
  // - If not inside any group: select top-level ancestor
  // - If inside a group: select the immediate child group of editingGroupId (if part is nested deeper)
  //   or null if part is direct child of editingGroupId
  let groupToSelectOnClick: string | null = null;
  // Track if this part is outside the current editing context
  let isOutsideEditingContext = false;
  if (editingGroupId === null) {
    // Not inside any group - select the top-level ancestor
    groupToSelectOnClick = topLevelGroupId;
  } else {
    // Inside a group - find the immediate child of editingGroupId in our ancestry chain
    const editingGroupIndex = ancestorGroupIds.indexOf(editingGroupId);
    if (editingGroupIndex > 0) {
      // Part is in a nested group - select the group that's a direct child of editingGroupId
      groupToSelectOnClick = ancestorGroupIds[editingGroupIndex - 1];
    } else if (editingGroupIndex === -1) {
      // Part is NOT inside the current editing group - clicking should be treated as background click
      isOutsideEditingContext = true;
    }
    // If editingGroupIndex === 0, part is direct child of editing group - select the part itself (null)
  }

  // Selection state - include both direct selection AND group selection (check ALL ancestors)
  const isDirectlySelected = selectedPartIds.includes(part.id);
  const isGroupSelected = ancestorGroupIds.some((gid) => selectedGroupIds.includes(gid));
  const isSelected = isDirectlySelected || isGroupSelected;
  const isOnlySelected = selectedPartIds.length === 1 && isDirectlySelected;
  const isHovered = hoveredPartId === part.id;
  const isReference = referencePartIds.includes(part.id);

  // Live dimensions for smooth visual feedback during drag/resize
  const [liveDims, setLiveDims] = useState<LiveDimensions>({
    x: part.position.x,
    y: part.position.y,
    z: part.position.z,
    length: part.length,
    width: part.width,
    thickness: part.thickness
  });

  // Sync live dims with part when part changes (from store updates)
  useEffect(() => {
    setLiveDims({
      x: part.position.x,
      y: part.position.y,
      z: part.position.z,
      length: part.length,
      width: part.width,
      thickness: part.thickness
    });
  }, [part.position.x, part.position.y, part.position.z, part.length, part.width, part.thickness]);

  // Enforce ground constraint after rotation or dimension changes
  useEffect(() => {
    // Calculate rotation quaternion for current rotation
    const rotX = (part.rotation.x * Math.PI) / 180;
    const rotY = (part.rotation.y * Math.PI) / 180;
    const rotZ = (part.rotation.z * Math.PI) / 180;
    const euler = new THREE.Euler(rotX, rotY, rotZ, 'XYZ');
    const quat = new THREE.Quaternion().setFromEuler(euler);

    // Calculate world-space half-height based on rotation
    const upVector = new THREE.Vector3(0, 1, 0);
    const localX = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
    const localY = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
    const localZ = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
    const worldHalfHeight =
      Math.abs(localX.dot(upVector)) * (part.length / 2) +
      Math.abs(localY.dot(upVector)) * (part.thickness / 2) +
      Math.abs(localZ.dot(upVector)) * (part.width / 2);

    // If part is below ground, adjust position
    if (part.position.y < worldHalfHeight) {
      updatePart(part.id, {
        position: { ...part.position, y: worldHalfHeight }
      });
    }
  }, [
    part.rotation.x,
    part.rotation.y,
    part.rotation.z,
    part.length,
    part.width,
    part.thickness,
    part.id,
    part.position,
    updatePart
  ]);

  // Drag state for moving
  const [isDragging, setIsDragging] = useState(false);
  // partPos = anchor point (group center for groups, part position for single part)
  // partOriginalPos = original position of the clicked part (for visual feedback)
  const dragStart = useRef<{ point: THREE.Vector3; partPos: THREE.Vector3; partOriginalPos: THREE.Vector3 } | null>(
    null
  );
  const justFinishedDragging = useRef(false); // Prevent click from firing after drag
  // Track latest drag position in a ref to avoid stale closure issues
  const lastDragPosition = useRef<{ x: number; y: number; z: number } | null>(null);
  // Track which axes were snapped by snap-to-parts (to avoid grid-snapping over precise alignments)
  const wasSnappedByParts = useRef<{ x: boolean; y: boolean; z: boolean }>({ x: false, y: false, z: false });

  // Resize state
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

  // Convert rotation degrees to radians for all axes
  const rotationX = (part.rotation.x * Math.PI) / 180;
  const rotationY = (part.rotation.y * Math.PI) / 180;
  const rotationZ = (part.rotation.z * Math.PI) / 180;

  // Create rotation matrix and its inverse for transforming between world and local space
  const rotationEuler = new THREE.Euler(rotationX, rotationY, rotationZ, 'XYZ');
  const rotationQuaternion = new THREE.Quaternion().setFromEuler(rotationEuler);
  const inverseRotationQuaternion = rotationQuaternion.clone().invert();

  // Transform a world-space vector to local space (for resize/move deltas)
  const worldToLocal = (worldDelta: THREE.Vector3): THREE.Vector3 => {
    return worldDelta.clone().applyQuaternion(inverseRotationQuaternion);
  };

  // Snap to grid helper
  const snapToGrid = (value: number): number => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };

  // Calculate axis-aligned bounding box for a part at a given position (considering rotation)
  // Uses the proper 3D rotation-aware bounds calculation from snapToPartsUtil
  // which transforms all 8 corners using the rotation quaternion
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

  // Check if two AABBs overlap
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

  // Check if moving this part (and optionally other selected parts) to a new position would cause overlap
  const wouldCauseOverlap = (
    newPosition: { x: number; y: number; z: number },
    allParts: PartType[],
    selectedIds: string[],
    delta?: { x: number; y: number; z: number }
  ): boolean => {
    // If this part has "Allow Overlap" enabled, skip overlap prevention entirely
    if (part.ignoreOverlap) {
      return false;
    }

    // Get the set of parts being moved (this part + any co-selected parts)
    const movingPartIds = new Set(selectedIds.includes(part.id) ? selectedIds : [part.id]);

    // Check this part against all non-moving parts
    const thisPartAABB = getPartAABB(part, newPosition);
    for (const other of allParts) {
      if (movingPartIds.has(other.id)) continue;
      // Skip parts that have "Allow Overlap" enabled
      if (other.ignoreOverlap) continue;
      const otherAABB = getPartAABB(other, other.position);
      if (aabbsOverlap(thisPartAABB, otherAABB)) {
        return true;
      }
    }

    // If we have a delta, also check other selected parts
    if (delta && selectedIds.includes(part.id)) {
      for (const selectedId of selectedIds) {
        if (selectedId === part.id) continue;
        const selectedPart = allParts.find((p) => p.id === selectedId);
        if (!selectedPart) continue;
        // Skip selected parts that have "Allow Overlap" enabled
        if (selectedPart.ignoreOverlap) continue;

        const movedPosition = {
          x: selectedPart.position.x + delta.x,
          y: selectedPart.position.y + delta.y,
          z: selectedPart.position.z + delta.z
        };
        const movedAABB = getPartAABB(selectedPart, movedPosition);

        for (const other of allParts) {
          if (movingPartIds.has(other.id)) continue;
          // Skip parts that have "Allow Overlap" enabled
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

  const getWorldPoint = (e: PointerEvent | MouseEvent): THREE.Vector3 | null => {
    const rect = gl.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.current.setFromCamera(new THREE.Vector2(x, y), camera);
    const intersection = new THREE.Vector3();
    if (raycaster.current.ray.intersectPlane(planeRef.current, intersection)) {
      return intersection;
    }
    return null;
  };

  // === VIEW ANGLE HELPERS ===
  // Determine which plane to use for dragging based on camera angle
  // Returns the best plane normal and which axes are usable
  type DragPlaneInfo = {
    normal: THREE.Vector3;
    axes: { x: boolean; y: boolean; z: boolean };
  };

  const getDragPlaneInfo = (partPosition: THREE.Vector3): DragPlaneInfo => {
    // Get camera forward direction
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(camera.quaternion);

    // Calculate how much we're looking along each axis
    const dotX = Math.abs(forward.dot(new THREE.Vector3(1, 0, 0)));
    const dotY = Math.abs(forward.dot(new THREE.Vector3(0, 1, 0)));
    const dotZ = Math.abs(forward.dot(new THREE.Vector3(0, 0, 1)));

    // Find which axis we're most aligned with (looking along)
    // Use that axis as the plane normal
    if (dotZ >= dotX && dotZ >= dotY) {
      // Looking mostly along Z axis (front/back view) -> use XY plane
      planeRef.current.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), partPosition);
      return {
        normal: new THREE.Vector3(0, 0, 1),
        axes: { x: true, y: true, z: false }
      };
    } else if (dotX >= dotY) {
      // Looking mostly along X axis (side view) -> use YZ plane
      planeRef.current.setFromNormalAndCoplanarPoint(new THREE.Vector3(1, 0, 0), partPosition);
      return {
        normal: new THREE.Vector3(1, 0, 0),
        axes: { x: false, y: true, z: true }
      };
    } else {
      // Looking mostly from above/below (top view) -> use XZ plane
      planeRef.current.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), partPosition);
      return {
        normal: new THREE.Vector3(0, 1, 0),
        axes: { x: true, y: false, z: true }
      };
    }
  };

  // Attach/detach window listeners when dragging or resizing
  // Handlers are defined inside useEffect to avoid stale closure issues
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      if (isDragging && dragStart.current) {
        const currentPoint = getWorldPoint(e);
        if (currentPoint) {
          const delta = currentPoint.clone().sub(dragStart.current.point);
          const planeInfo = getDragPlaneInfo(dragStart.current.partPos);

          // Only apply movement on axes that are usable from current view
          let newX = planeInfo.axes.x ? dragStart.current.partPos.x + delta.x : liveDims.x;
          let newY = planeInfo.axes.y ? dragStart.current.partPos.y + delta.y : liveDims.y;
          let newZ = planeInfo.axes.z ? dragStart.current.partPos.z + delta.z : liveDims.z;

          // Constrain to ground during move - calculate world-space half-height based on rotation
          const upVector = new THREE.Vector3(0, 1, 0);
          const localX = new THREE.Vector3(1, 0, 0).applyQuaternion(rotationQuaternion);
          const localY = new THREE.Vector3(0, 1, 0).applyQuaternion(rotationQuaternion);
          const localZ = new THREE.Vector3(0, 0, 1).applyQuaternion(rotationQuaternion);
          const worldHalfHeight =
            Math.abs(localX.dot(upVector)) * (liveDims.length / 2) +
            Math.abs(localY.dot(upVector)) * (liveDims.thickness / 2) +
            Math.abs(localZ.dot(upVector)) * (liveDims.width / 2);
          newY = Math.max(worldHalfHeight, newY);

          // Apply snap-to-parts if enabled (Alt key temporarily bypasses snapping)
          const isSnapEnabled = useProjectStore.getState().snapToPartsEnabled && !e.altKey;
          const allParts = useProjectStore.getState().parts;
          const currentSelectedIds = useProjectStore.getState().selectedPartIds;
          const currentSelectedGroupIds = useProjectStore.getState().selectedGroupIds;
          const currentReferenceIds = useProjectStore.getState().referencePartIds;
          const snapGuides = useProjectStore.getState().snapGuides;

          // Get snap settings from app settings
          const appSettings = useAppSettingsStore.getState().settings;
          const { liveGridSnap, snapSensitivity, snapToOrigin } = appSettings;

          // Apply live grid snapping if enabled
          if (liveGridSnap) {
            newX = snapToGrid(newX);
            newZ = snapToGrid(newZ);
            // Also apply to Y but respect ground constraint
            const snappedY = snapToGrid(newY);
            if (snappedY >= worldHalfHeight) {
              newY = snappedY;
            }
          }

          // Determine which parts to snap to:
          // - If references exist, only snap to reference parts
          // - Otherwise, snap to all parts
          const snapTargetParts =
            currentReferenceIds.length > 0 ? allParts.filter((p) => currentReferenceIds.includes(p.id)) : allParts;

          const snapLines: import('../types').SnapLine[] = [];

          if (isSnapEnabled) {
            // Calculate snap threshold based on camera distance and sensitivity setting
            const cameraDistance = camera.position.distanceTo(new THREE.Vector3(newX, newY, newZ));
            const snapThreshold = calculateSnapThreshold(cameraDistance, snapSensitivity);

            // Get bounds for guide snap detection
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

            // Check origin snaps if enabled (snap to X=0, Y=0, Z=0 planes)
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

            // Then check part snaps (only if not already snapped to guides or origin)
            if (snapTargetParts.length > 0 && allParts.length > 1) {
              // First check for face-to-face snaps (flush alignment)
              const faceSnapResult = detectFaceSnaps(
                part,
                { x: newX, y: newY, z: newZ },
                snapTargetParts,
                currentSelectedIds,
                snapThreshold
              );

              // Apply face snaps if found (and not already snapped on that axis)
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

              // Then check regular edge/center snaps
              const snapResult = detectSnaps(
                part,
                { x: newX, y: newY, z: newZ },
                snapTargetParts,
                currentSelectedIds,
                snapThreshold
              );

              // Apply snap adjustments (but keep ground constraint)
              // Only apply if we didn't already snap to a guide, origin, or face on that axis
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

              // Add part snap lines (only for axes not already snapped)
              for (const line of snapResult.snapLines) {
                if (snapLines.filter((l) => l.axis === line.axis).length === 0) {
                  snapLines.push(line);
                }
              }
            }

            // Update snap lines for visualization
            useProjectStore.getState().setActiveSnapLines(snapLines);

            // Track which axes were snapped (to skip grid-snapping on pointer up)
            wasSnappedByParts.current = {
              x: snapLines.some((l) => l.axis === 'x'),
              y: snapLines.some((l) => l.axis === 'y'),
              z: snapLines.some((l) => l.axis === 'z')
            };

            // Calculate reference distances if there are reference parts and we're not a reference
            if (currentReferenceIds.length > 0 && !currentReferenceIds.includes(part.id)) {
              const referenceParts = allParts.filter((p) => currentReferenceIds.includes(p.id));
              const currentGroupMembers = useProjectStore.getState().groupMembers;

              // Get all effective part IDs being dragged (including group member parts)
              const effectiveDragPartIds = new Set(currentSelectedIds);
              for (const groupId of currentSelectedGroupIds) {
                const groupPartIds = getAllDescendantPartIds(groupId, currentGroupMembers);
                groupPartIds.forEach((id) => effectiveDragPartIds.add(id));
              }

              // Check if we're dragging multiple parts or a group
              const hasGroupSelected = currentSelectedGroupIds.length > 0;
              const hasMultiplePartsSelected = effectiveDragPartIds.size > 1;

              // Remove reference parts from dragging parts (can't measure distance to self)
              const draggingPartIds = [...effectiveDragPartIds].filter((id) => !currentReferenceIds.includes(id));

              if ((hasGroupSelected || hasMultiplePartsSelected) && draggingPartIds.length > 0) {
                // Use group reference distances for multiple parts
                const draggingParts = allParts.filter((p) => draggingPartIds.includes(p.id));
                const dragDelta = {
                  x: newX - dragStart.current.partPos.x,
                  y: newY - dragStart.current.partPos.y,
                  z: newZ - dragStart.current.partPos.z
                };
                const referenceDistances = calculateGroupReferenceDistances(draggingParts, dragDelta, referenceParts);
                useProjectStore.getState().setActiveReferenceDistances(referenceDistances);
              } else {
                // Single part - use original function
                const referenceDistances = calculateReferenceDistances(
                  part,
                  { x: newX, y: newY, z: newZ },
                  referenceParts
                );
                useProjectStore.getState().setActiveReferenceDistances(referenceDistances);
              }
            } else {
              useProjectStore.getState().setActiveReferenceDistances([]);
            }
          } else {
            // Clear snap lines if snapping disabled
            useProjectStore.getState().setActiveSnapLines([]);
            useProjectStore.getState().setActiveReferenceDistances([]);
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
              // Don't update position if it would cause overlap
              return;
            }
          }

          // Store anchor position in ref for pointer up handler (avoids stale closure)
          lastDragPosition.current = { x: newX, y: newY, z: newZ };

          // For liveDims (visual position of clicked part), apply delta to part's original position
          // This ensures consistent visual behavior regardless of which part in a group is clicked
          const partLiveX = dragStart.current.partOriginalPos.x + proposedDelta.x;
          const partLiveY = dragStart.current.partOriginalPos.y + proposedDelta.y;
          const partLiveZ = dragStart.current.partOriginalPos.z + proposedDelta.z;
          setLiveDims((prev) => ({ ...prev, x: partLiveX, y: partLiveY, z: partLiveZ }));

          // Update global drag delta for other selected parts to follow
          // This applies when: multiple parts selected OR a group is selected
          const hasGroupSelected = currentSelectedGroupIds.length > 0;
          const hasMultiplePartsSelected = currentSelectedIds.length > 1 && currentSelectedIds.includes(part.id);
          if (hasGroupSelected || hasMultiplePartsSelected) {
            useProjectStore.getState().setActiveDragDelta(proposedDelta);
          }
        }
      }

      if (isResizing && resizeStart.current) {
        const currentPoint = getWorldPoint(e);
        if (currentPoint) {
          handleResizeMove(currentPoint);
        }
      }
    };

    const handleWindowPointerUp = () => {
      if (isDragging && dragStart.current && lastDragPosition.current) {
        // Use ref to get latest position (avoids stale closure issue)
        // Only apply grid snap to axes that weren't snapped by snap-to-parts
        // This preserves precise edge alignments from snap-to-parts
        const newX = wasSnappedByParts.current.x ? lastDragPosition.current.x : snapToGrid(lastDragPosition.current.x);
        let newY = wasSnappedByParts.current.y ? lastDragPosition.current.y : snapToGrid(lastDragPosition.current.y);
        const newZ = wasSnappedByParts.current.z ? lastDragPosition.current.z : snapToGrid(lastDragPosition.current.z);

        // Get current selection from store (avoid stale closure)
        const currentSelectedIds = useProjectStore.getState().selectedPartIds;
        const currentSelectedGroupIds = useProjectStore.getState().selectedGroupIds;
        const currentGroupMembers = useProjectStore.getState().groupMembers;
        const allParts = useProjectStore.getState().parts;

        // Calculate base delta (before ground constraint)
        const baseDelta = {
          x: newX - dragStart.current.partPos.x,
          y: newY - dragStart.current.partPos.y,
          z: newZ - dragStart.current.partPos.z
        };

        // Determine if we should move multiple parts:
        // - Multiple parts directly selected, OR
        // - A group is selected (will expand to all group members via moveSelectedParts)
        const hasGroupSelected = currentSelectedGroupIds.length > 0;
        const hasMultiplePartsSelected = currentSelectedIds.length > 1 && currentSelectedIds.includes(part.id);
        const shouldMoveMultiple = hasGroupSelected || hasMultiplePartsSelected;

        // Calculate effective part IDs to check for ground constraint
        let effectivePartIds: string[] = [...currentSelectedIds];
        if (hasGroupSelected) {
          for (const groupId of currentSelectedGroupIds) {
            const groupPartIds = getAllDescendantPartIds(groupId, currentGroupMembers);
            effectivePartIds.push(...groupPartIds);
          }
          effectivePartIds = [...new Set(effectivePartIds)]; // dedupe
        }

        // If multiple parts affected, calculate ground constraint for ALL parts
        // and apply the maximum needed adjustment uniformly
        if (shouldMoveMultiple && effectivePartIds.length > 0) {
          let maxYAdjustment = 0;

          for (const selectedId of effectivePartIds) {
            const selectedPart = allParts.find((p) => p.id === selectedId);
            if (!selectedPart) continue;

            // Calculate the part's rotation quaternion
            const partRotation = new THREE.Quaternion().setFromEuler(
              new THREE.Euler(
                (selectedPart.rotation.x * Math.PI) / 180,
                (selectedPart.rotation.y * Math.PI) / 180,
                (selectedPart.rotation.z * Math.PI) / 180
              )
            );

            // Calculate world-space half-height for this part based on its rotation
            const upVector = new THREE.Vector3(0, 1, 0);
            const localX = new THREE.Vector3(1, 0, 0).applyQuaternion(partRotation);
            const localY = new THREE.Vector3(0, 1, 0).applyQuaternion(partRotation);
            const localZ = new THREE.Vector3(0, 0, 1).applyQuaternion(partRotation);
            const worldHalfHeight =
              Math.abs(localX.dot(upVector)) * (selectedPart.length / 2) +
              Math.abs(localY.dot(upVector)) * (selectedPart.thickness / 2) +
              Math.abs(localZ.dot(upVector)) * (selectedPart.width / 2);

            // Calculate what Y position this part would be at with the base delta
            const projectedY = selectedPart.position.y + baseDelta.y;

            // Calculate how much we need to raise this part to keep it above ground
            const minY = worldHalfHeight;
            const adjustment = Math.max(0, minY - projectedY);
            maxYAdjustment = Math.max(maxYAdjustment, adjustment);
          }

          // Apply the uniform Y adjustment to the delta
          const adjustedDelta = {
            x: baseDelta.x,
            y: baseDelta.y + maxYAdjustment,
            z: baseDelta.z
          };

          // Check overlap prevention for multi-part move
          const stockConstraints = useProjectStore.getState().stockConstraints;
          if (stockConstraints.preventOverlap) {
            // Check if any of the moving parts would overlap with non-moving parts
            const movingPartIds = new Set(effectivePartIds);
            let hasOverlap = false;

            for (const movingId of effectivePartIds) {
              const movingPart = allParts.find((p) => p.id === movingId);
              if (!movingPart) continue;
              // Skip parts that have "Allow Overlap" enabled
              if (movingPart.ignoreOverlap) continue;

              const movedPosition = {
                x: movingPart.position.x + adjustedDelta.x,
                y: movingPart.position.y + adjustedDelta.y,
                z: movingPart.position.z + adjustedDelta.z
              };
              const movedAABB = getPartAABB(movingPart, movedPosition);

              for (const other of allParts) {
                if (movingPartIds.has(other.id)) continue;
                // Skip parts that have "Allow Overlap" enabled
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
              // Revert all parts to original positions
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
              useProjectStore.getState().setActiveDragDelta(null);
              if (isOrbitControls(controls)) controls.enabled = true;
              useProjectStore.getState().setActiveSnapLines([]);
              useProjectStore.getState().updateReferenceDistances();
              return;
            }
          }

          moveSelectedParts(adjustedDelta);
          // Clear the live drag delta
          useProjectStore.getState().setActiveDragDelta(null);
        } else {
          // Single part - apply ground constraint just to this one
          const upVector = new THREE.Vector3(0, 1, 0);
          const localX = new THREE.Vector3(1, 0, 0).applyQuaternion(rotationQuaternion);
          const localY = new THREE.Vector3(0, 1, 0).applyQuaternion(rotationQuaternion);
          const localZ = new THREE.Vector3(0, 0, 1).applyQuaternion(rotationQuaternion);
          const worldHalfHeight =
            Math.abs(localX.dot(upVector)) * (liveDims.length / 2) +
            Math.abs(localY.dot(upVector)) * (liveDims.thickness / 2) +
            Math.abs(localZ.dot(upVector)) * (liveDims.width / 2);
          newY = Math.max(worldHalfHeight, newY);

          // Check overlap prevention for final snapped position
          const stockConstraints = useProjectStore.getState().stockConstraints;
          if (stockConstraints.preventOverlap) {
            const wouldOverlap = wouldCauseOverlap({ x: newX, y: newY, z: newZ }, allParts, currentSelectedIds);
            if (wouldOverlap) {
              // Revert to original position if final position would overlap
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
              if (isOrbitControls(controls)) controls.enabled = true;
              useProjectStore.getState().setActiveSnapLines([]);
              useProjectStore.getState().updateReferenceDistances();
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
        justFinishedDragging.current = true; // Prevent click handler from clearing selection
        if (isOrbitControls(controls)) controls.enabled = true;
        // Clear snap lines and update reference distances when drag ends
        useProjectStore.getState().setActiveSnapLines([]);
        useProjectStore.getState().updateReferenceDistances();
      }

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
  }, [isDragging, isResizing, liveDims]);

  // === MOVE HANDLERS ===
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();

    // If clicking on a part outside the current editing context, treat it like background click
    // (just deselect, don't change context or select this part)
    if (isOutsideEditingContext) {
      clearSelection();
      return;
    }

    // Track right-click for context menu (shown on mouseup by Workspace)
    if (e.nativeEvent.button === 2) {
      // Select the part/group if not already selected
      if (!isSelected) {
        if (groupToSelectOnClick) {
          selectGroup(groupToSelectOnClick);
        } else {
          selectPart(part.id);
        }
      }
      setRightClickTarget({ type: 'part' });
      return; // Don't start drag on right-click
    }

    // Handle shift+click for multi-select
    if (e.nativeEvent.shiftKey) {
      // If part belongs to a group, toggle the group selection instead of the part
      if (groupToSelectOnClick) {
        toggleGroupSelection(groupToSelectOnClick);
      } else {
        togglePartSelection(part.id);
      }
      return; // Don't start drag on shift+click
    }

    // Group selection logic (Figma-style)
    // Select the appropriate group based on nesting level
    // Only change selection if not already selected (preserves multi-select on drag/right-click)
    if (groupToSelectOnClick) {
      if (!isSelected) {
        selectGroup(groupToSelectOnClick);
      }
      // Continue to set up drag - the group will move together via moveSelectedParts
    } else if (!isSelected) {
      // Regular click: select this part (clears other selections)
      selectPart(part.id);
    }

    // Get current state after potential selection change
    const currentState = useProjectStore.getState();
    const currentSelectedPartIds = currentState.selectedPartIds;
    const currentSelectedGroupIds = currentState.selectedGroupIds;
    const currentGroupMembers = currentState.groupMembers;

    // Determine anchor point for drag:
    // - Single part: use that part's position
    // - Multiple parts or group: use combined bounding box center
    let anchorPos: THREE.Vector3;

    const hasGroupSelected = currentSelectedGroupIds.length > 0;
    const hasMultipleParts = currentSelectedPartIds.length > 1;

    if (hasGroupSelected || hasMultipleParts) {
      // Calculate combined bounds of all parts to be dragged
      const partIdsToInclude = new Set(currentSelectedPartIds);

      // Add parts from selected groups
      for (const groupId of currentSelectedGroupIds) {
        const collectGroupParts = (gId: string) => {
          for (const member of currentGroupMembers) {
            if (member.groupId === gId) {
              if (member.type === 'part') {
                partIdsToInclude.add(member.memberId);
              } else if (member.type === 'group') {
                collectGroupParts(member.memberId);
              }
            }
          }
        };
        collectGroupParts(groupId);
      }

      const partsToMeasure = currentState.parts.filter((p) => partIdsToInclude.has(p.id));
      if (partsToMeasure.length > 0) {
        const combinedBounds = getCombinedBounds(partsToMeasure);
        anchorPos = new THREE.Vector3(combinedBounds.centerX, combinedBounds.centerY, combinedBounds.centerZ);
      } else {
        anchorPos = new THREE.Vector3(part.position.x, part.position.y, part.position.z);
      }
    } else {
      anchorPos = new THREE.Vector3(part.position.x, part.position.y, part.position.z);
    }

    // Set up the drag plane based on camera angle, centered on the anchor point
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
      // Initialize with part's original position (not anchor)
      lastDragPosition.current = { x: partOriginalPos.x, y: partOriginalPos.y, z: partOriginalPos.z };
      if (isOrbitControls(controls)) controls.enabled = false;
    }
  };

  // === RESIZE HANDLERS ===
  const handleResizeStart = (handlePos: HandlePosition, e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();

    const partPos = new THREE.Vector3(part.position.x, part.position.y, part.position.z);
    // Set up the drag plane based on camera angle
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
  };

  const handleResizeMove = (currentPoint: THREE.Vector3) => {
    if (!resizeStart.current) return;

    const { handlePos, startPoint, partPos, partLength, partWidth, partThickness } = resizeStart.current;
    const worldDelta = currentPoint.clone().sub(startPoint);
    // Transform world-space delta to local space (accounts for part rotation)
    const localDelta = worldToLocal(worldDelta);

    // Calculate new dimensions based on local-space delta
    // handlePos.x/y/z indicates which direction the handle is from center (-1 or +1)
    // Multiplying delta by handlePos direction gives the amount to add to dimension
    let newLength = partLength;
    let newWidth = partWidth;
    let newThickness = partThickness;

    // Track which dimensions are being resized
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

    // Calculate max dimensions based on stock (if constrained)
    // Glue-up panels can exceed stock width (they'll be made from multiple boards)
    const maxLength = isDimensionConstrained && assignedStock ? assignedStock.length : Infinity;
    const maxWidth = isDimensionConstrained && assignedStock && !part.glueUpPanel ? assignedStock.width : Infinity;
    const maxThickness = isDimensionConstrained && assignedStock ? assignedStock.thickness : Infinity;

    if (handlePos.type === 'corner') {
      // Corner handles: resize all three dimensions
      // Minimum dimensions: 1/2" for length/width, 1/4" for thickness
      newLength = Math.min(maxLength, Math.max(0.5, partLength + localDelta.x * handlePos.x));
      newThickness = Math.min(maxThickness, Math.max(0.25, partThickness + localDelta.y * handlePos.y));
      newWidth = Math.min(maxWidth, Math.max(0.5, partWidth + localDelta.z * handlePos.z));
      resizingDimensions.length = true;
      resizingDimensions.thickness = true;
      resizingDimensions.width = true;
    } else {
      // Edge handles: only resize dimensions where handlePos is non-zero
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
    const isSnapEnabled = useProjectStore.getState().snapToPartsEnabled;
    const allParts = useProjectStore.getState().parts;
    const currentReferenceIds = useProjectStore.getState().referencePartIds;
    const units = useProjectStore.getState().units;

    // Get snap settings from app settings
    const appSettings = useAppSettingsStore.getState().settings;
    const { snapSensitivity, dimensionSnapSameTypeOnly } = appSettings;

    // Determine which parts to snap to (references or all)
    const snapTargetParts =
      currentReferenceIds.length > 0 ? allParts.filter((p) => currentReferenceIds.includes(p.id)) : allParts;

    if (isSnapEnabled) {
      const cameraDistance = camera.position.distanceTo(new THREE.Vector3(partPos.x, partPos.y, partPos.z));
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

      // Apply dimension snaps and create visual feedback
      const snapLines: import('../types').SnapLine[] = [];

      for (const snap of dimensionSnaps) {
        // Apply the snap
        if (snap.dimension === 'length') {
          newLength = snap.targetValue;
        } else if (snap.dimension === 'width') {
          newWidth = snap.targetValue;
        } else if (snap.dimension === 'thickness') {
          newThickness = snap.targetValue;
        }

        // Get part bounds with snapped dimensions (accounts for rotation)
        const tempPart = {
          ...part,
          length: newLength,
          width: newWidth,
          thickness: newThickness
        };
        const resizingBounds = getPartBoundsAtPosition(tempPart, partPos);

        // Create enhanced visual feedback with source info
        const snapLine = createDimensionMatchSnapLine(snap, resizingBounds);

        // Add dimension match metadata for enhanced labels
        snapLine.dimensionMatchInfo = {
          isStandard: snap.isStandardDimension,
          sourcePart: snap.matchedPartName ?? undefined,
          sourceDimension: snap.matchedDimension ?? undefined
        };

        // Add connector line to matched part (if not a standard dimension)
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

      // Update snap lines for visualization
      useProjectStore.getState().setActiveSnapLines(snapLines);
    } else {
      // Clear snap lines if snapping disabled
      useProjectStore.getState().setActiveSnapLines([]);
    }
    // Clear reference distances during resize (not relevant for resizing)
    useProjectStore.getState().setActiveReferenceDistances([]);

    // Calculate the world-space center offset to keep the fixed corner/edge in place
    // The center moves by half the dimension change, in the direction of the handle
    const localCenterOffset = new THREE.Vector3(
      ((newLength - partLength) / 2) * handlePos.x,
      ((newThickness - partThickness) / 2) * handlePos.y,
      ((newWidth - partWidth) / 2) * handlePos.z
    );
    // Transform local center offset to world space
    const worldCenterOffset = localCenterOffset.clone().applyQuaternion(rotationQuaternion);

    // Calculate new world position
    const newX = partPos.x + worldCenterOffset.x;
    const newY = partPos.y + worldCenterOffset.y;
    const newZ = partPos.z + worldCenterOffset.z;

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

    // Get constraint settings from store
    const stockConstraints = useProjectStore.getState().stockConstraints;
    const stocks = useProjectStore.getState().stocks;
    const assignedStock = part.stockId ? stocks.find((s) => s.id === part.stockId) : null;
    const isDimensionConstrained = stockConstraints.constrainDimensions && !!assignedStock;

    // Calculate max dimensions based on stock (if constrained)
    // Glue-up panels can exceed stock width (they'll be made from multiple boards)
    const maxLength = isDimensionConstrained && assignedStock ? assignedStock.length : Infinity;
    const maxWidth = isDimensionConstrained && assignedStock && !part.glueUpPanel ? assignedStock.width : Infinity;
    const maxThickness = isDimensionConstrained && assignedStock ? assignedStock.thickness : Infinity;

    // Snap the final dimensions to grid (1/16 inch increments)
    // Minimum dimensions: 1/2" for length/width, 1/4" for thickness
    // Also enforce max dimensions from stock constraints
    let newLength = Math.min(maxLength, Math.max(0.5, snapToGrid(liveDims.length)));
    let newWidth = Math.min(maxWidth, Math.max(0.5, snapToGrid(liveDims.width)));
    let newThickness = Math.min(maxThickness, Math.max(0.25, snapToGrid(liveDims.thickness)));

    // Calculate the world-space center offset to keep the fixed corner/edge in place
    // The center moves by half the dimension change, in the direction of the handle
    const localCenterOffset = new THREE.Vector3(
      ((newLength - partLength) / 2) * handlePos.x,
      ((newThickness - partThickness) / 2) * handlePos.y,
      ((newWidth - partWidth) / 2) * handlePos.z
    );
    // Transform local center offset to world space
    const worldCenterOffset = localCenterOffset.clone().applyQuaternion(rotationQuaternion);

    // Calculate new world position
    let newX = partPos.x + worldCenterOffset.x;
    let newY = partPos.y + worldCenterOffset.y;
    let newZ = partPos.z + worldCenterOffset.z;

    // Snap position to grid
    newX = snapToGrid(newX);
    newY = snapToGrid(newY);
    newZ = snapToGrid(newZ);

    // Keep part above ground - calculate the world-space half-height based on rotation
    const upVector = new THREE.Vector3(0, 1, 0);
    const localX = new THREE.Vector3(1, 0, 0).applyQuaternion(rotationQuaternion);
    const localY = new THREE.Vector3(0, 1, 0).applyQuaternion(rotationQuaternion);
    const localZ = new THREE.Vector3(0, 0, 1).applyQuaternion(rotationQuaternion);
    const worldHalfHeight =
      Math.abs(localX.dot(upVector)) * (newLength / 2) +
      Math.abs(localY.dot(upVector)) * (newThickness / 2) +
      Math.abs(localZ.dot(upVector)) * (newWidth / 2);
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
    // Clear snap lines and update reference distances when resize ends
    useProjectStore.getState().setActiveSnapLines([]);
    useProjectStore.getState().updateReferenceDistances();
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();

    // If clicking on a part outside the current editing context, treat as background click
    // (pointerDown already handled the deselect, just return here)
    if (isOutsideEditingContext) {
      return;
    }

    // Skip selection if we just finished dragging (prevents clearing multi-selection)
    if (justFinishedDragging.current) {
      justFinishedDragging.current = false;
      return;
    }

    // Shift+click handled in pointerDown, so only do regular select here
    if (!e.nativeEvent.shiftKey) {
      // Group selection logic (Figma-style)
      // Select the appropriate group based on nesting level
      if (groupToSelectOnClick) {
        selectGroup(groupToSelectOnClick);
      } else {
        selectPart(part.id);
      }
    }
  };

  // Double-click to enter a group (Figma-style)
  const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();

    // If double-clicking on a part outside the current editing context, ignore
    // (user should double-click background to exit group first)
    if (isOutsideEditingContext) {
      return;
    }

    // If there's a group that would be selected on click, enter that group instead
    // This allows drilling down one level at a time in nested structures
    if (groupToSelectOnClick) {
      enterGroup(groupToSelectOnClick);
      // After entering, select this specific part (unless it's still in a nested group)
      if (containingGroupId === groupToSelectOnClick) {
        selectPart(part.id);
      }
    }
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHoveredPart(part.id);
    if (!isDragging && !isResizing) {
      document.body.style.cursor = 'move';
    }
  };

  const handlePointerOut = () => {
    setHoveredPart(null);
    if (!isDragging && !isResizing) {
      document.body.style.cursor = 'auto';
    }
  };

  // Handle rotation around an axis (LOCAL rotation - rotates around the part's current axis)
  // Uses quaternion math to properly compose rotations
  const handleRotate = (axis: 'x' | 'y' | 'z') => {
    // Convert current rotation to quaternion
    const currentEuler = new THREE.Euler(
      (part.rotation.x * Math.PI) / 180,
      (part.rotation.y * Math.PI) / 180,
      (part.rotation.z * Math.PI) / 180,
      'XYZ'
    );
    const currentQuat = new THREE.Quaternion().setFromEuler(currentEuler);

    // Create local rotation quaternion (90 degrees around the specified local axis)
    const localRotationQuat = new THREE.Quaternion();
    if (axis === 'x') {
      localRotationQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    } else if (axis === 'y') {
      localRotationQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    } else {
      localRotationQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
    }

    // Apply LOCAL rotation: newQuat = currentQuat * localRotation
    // This rotates around the part's current orientation, not world axes
    const newQuat = currentQuat.clone().multiply(localRotationQuat);

    // Convert back to Euler
    const newEuler = new THREE.Euler().setFromQuaternion(newQuat, 'XYZ');

    // Normalize to 90-degree increments
    const normalizeAngle = (rad: number): RotationAngle => {
      let deg = (rad * 180) / Math.PI;
      deg = ((deg % 360) + 360) % 360;
      const rounded = Math.round(deg / 90) * 90;
      return (rounded === 360 ? 0 : rounded) as RotationAngle;
    };

    updatePart(part.id, {
      rotation: {
        x: normalizeAngle(newEuler.x),
        y: normalizeAngle(newEuler.y),
        z: normalizeAngle(newEuler.z)
      }
    });
  };

  // Use live dimensions for rendering
  const dims: [number, number, number] = [liveDims.length, liveDims.thickness, liveDims.width];

  // Calculate render position:
  // - If this part is being dragged: use liveDims (smooth local feedback)
  // - If this part is selected but another part is being dragged: apply activeDragDelta
  // - Otherwise: use liveDims (which syncs with store)
  let renderX = liveDims.x;
  let renderY = liveDims.y;
  let renderZ = liveDims.z;

  if (!isDragging && isSelected && activeDragDelta) {
    // This part is selected but not the one being dragged - follow along
    renderX = part.position.x + activeDragDelta.x;
    renderY = part.position.y + activeDragDelta.y;
    renderZ = part.position.z + activeDragDelta.z;
  }

  return (
    // Outer group handles world-space position
    <group position={[renderX, renderY, renderZ]}>
      {/* Inner group handles rotation - handles and mesh rotate together */}
      <group rotation={[rotationX, rotationY, rotationZ]}>
        <mesh
          ref={meshRef}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onPointerDown={handlePointerDown}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <boxGeometry args={dims} />
          {displayMode === 'solid' && <meshStandardMaterial color={part.color} />}
          {displayMode === 'wireframe' && <meshBasicMaterial color={part.color} wireframe />}
          {displayMode === 'translucent' && (
            <meshStandardMaterial color="#888888" transparent opacity={0.3} depthWrite={false} />
          )}
          <Edges
            visible={isSelected || isHovered || isReference || displayMode === 'wireframe'}
            scale={1.002}
            threshold={15}
            color={
              isSelected ? '#ffffff' : isReference ? '#00ffff' : displayMode === 'wireframe' ? part.color : '#888888'
            }
          />
        </mesh>

        {/* Grain direction arrow - show when enabled and part is grain-sensitive */}
        {showGrainDirection && part.grainSensitive && (
          <GrainDirectionArrow liveDims={liveDims} grainDirection={part.grainDirection} />
        )}

        {/* Resize handles - only show when single part selected */}
        {isOnlySelected &&
          HANDLE_POSITIONS.map((handlePos, idx) => (
            <ResizeHandle
              key={idx}
              liveDims={liveDims}
              handlePos={handlePos}
              onResizeStart={handleResizeStart}
              isResizing={isResizing}
            />
          ))}

        {/* Rotation handles on all 6 faces - only show when single part selected */}
        {isOnlySelected && (
          <>
            {/* Y-axis rotation: top and bottom faces */}
            <RotationHandle liveDims={liveDims} axis="y" side={1} onRotate={handleRotate} />
            <RotationHandle liveDims={liveDims} axis="y" side={-1} onRotate={handleRotate} />
            {/* X-axis rotation: left and right side faces */}
            <RotationHandle liveDims={liveDims} axis="x" side={1} onRotate={handleRotate} />
            <RotationHandle liveDims={liveDims} axis="x" side={-1} onRotate={handleRotate} />
            {/* Z-axis rotation: front and back faces */}
            <RotationHandle liveDims={liveDims} axis="z" side={1} onRotate={handleRotate} />
            <RotationHandle liveDims={liveDims} axis="z" side={-1} onRotate={handleRotate} />
          </>
        )}

        {/* Blueprint-style dimension labels - show for directly selected parts only (not group-selected) */}
        {isDirectlySelected && !isDragging && !activeDragDelta && (
          <>
            {/* Length dimension (along X axis) - shown on front edge, offset toward -Z */}
            <DimensionLabel
              start={[-liveDims.length / 2, -liveDims.thickness / 2, -liveDims.width / 2]}
              end={[liveDims.length / 2, -liveDims.thickness / 2, -liveDims.width / 2]}
              value={liveDims.length}
              offsetDir={[0, 0, -1]}
              offset={1.5}
              color="#e74c3c"
              units={units}
            />

            {/* Width dimension (along Z axis) - shown on right edge, offset toward +X */}
            <DimensionLabel
              start={[liveDims.length / 2, -liveDims.thickness / 2, -liveDims.width / 2]}
              end={[liveDims.length / 2, -liveDims.thickness / 2, liveDims.width / 2]}
              value={liveDims.width}
              offsetDir={[1, 0, 0]}
              offset={1.5}
              color="#3498db"
              units={units}
            />

            {/* Thickness dimension (along Y axis) - shown on front-right corner, offset diagonally */}
            <DimensionLabel
              start={[liveDims.length / 2, -liveDims.thickness / 2, -liveDims.width / 2]}
              end={[liveDims.length / 2, liveDims.thickness / 2, -liveDims.width / 2]}
              value={liveDims.thickness}
              offsetDir={[1, 0, -1]}
              offset={1.5}
              color="#2ecc71"
              units={units}
            />
          </>
        )}
      </group>
    </group>
  );
});
