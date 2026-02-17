import { Edges } from '@react-three/drei';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/shallow';
import { useProjectStore, getAncestorGroupIds } from '../../store/projectStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useCameraStore } from '../../store/cameraStore';
import { useSnapStore } from '../../store/snapStore';
import { Part as PartType, RotationAngle } from '../../types';
import { LiveDimensions, HANDLE_POSITIONS, GRAIN_ARROW_MAX_DISTANCE_SQ } from './partTypes';
import { DimensionLabel } from './DimensionLabel';
import { GrainDirectionArrow } from './GrainDirectionArrow';
import { ResizeHandle } from './ResizeHandle';
import { RotationHandle } from './RotationHandle';
import { usePartDrag } from './usePartDrag';
import { usePartResize } from './usePartResize';
import { calculateWorldHalfHeightFromDegrees } from '../../utils/mathPool';

interface PartProps {
  part: PartType;
}

export const Part = memo(function Part({ part }: PartProps) {
  const { camera, gl, controls } = useThree();

  // Project state selector - only re-renders when these specific values change
  const { units, groupMembers } = useProjectStore(
    useShallow((s) => ({
      units: s.units,
      groupMembers: s.groupMembers
    }))
  );
  const referencePartIds = useSnapStore((s) => s.referencePartIds);

  // Selection state selector
  const { selectedPartIds, hoveredPartId, activeDragDelta, selectedGroupIds, editingGroupId } = useSelectionStore(
    useShallow((s) => ({
      selectedPartIds: s.selectedPartIds,
      hoveredPartId: s.hoveredPartId,
      activeDragDelta: s.activeDragDelta,
      selectedGroupIds: s.selectedGroupIds,
      editingGroupId: s.editingGroupId
    }))
  );

  // Camera store state
  const showGrainDirection = useCameraStore((s) => s.showGrainDirection);
  const displayMode = useCameraStore((s) => s.displayMode);

  // Actions are stable references - grab them once outside the render cycle
  const selectPart = useSelectionStore((s) => s.selectPart);
  const togglePartSelection = useSelectionStore((s) => s.togglePartSelection);
  const setHoveredPart = useSelectionStore((s) => s.setHoveredPart);
  const updatePart = useProjectStore((s) => s.updatePart);
  const moveSelectedParts = useProjectStore((s) => s.moveSelectedParts);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const selectGroup = useSelectionStore((s) => s.selectGroup);
  const toggleGroupSelection = useSelectionStore((s) => s.toggleGroupSelection);
  const enterGroup = useSelectionStore((s) => s.enterGroup);

  // Group membership - get all ancestor groups (from immediate to top-level)
  const ancestorGroupIds = getAncestorGroupIds(part.id, groupMembers);
  const containingGroupId = ancestorGroupIds.length > 0 ? ancestorGroupIds[0] : null;
  const topLevelGroupId = ancestorGroupIds.length > 0 ? ancestorGroupIds[ancestorGroupIds.length - 1] : null;

  // Determine which group to select when clicking this part
  let groupToSelectOnClick: string | null = null;
  let isOutsideEditingContext = false;
  if (editingGroupId === null) {
    groupToSelectOnClick = topLevelGroupId;
  } else {
    const editingGroupIndex = ancestorGroupIds.indexOf(editingGroupId);
    if (editingGroupIndex > 0) {
      groupToSelectOnClick = ancestorGroupIds[editingGroupIndex - 1];
    } else if (editingGroupIndex === -1) {
      isOutsideEditingContext = true;
    }
  }

  // Selection state
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
    const worldHalfHeight = calculateWorldHalfHeightFromDegrees(part.rotation, part.length, part.thickness, part.width);

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

  // Convert rotation degrees to radians for all axes
  const rotationX = (part.rotation.x * Math.PI) / 180;
  const rotationY = (part.rotation.y * Math.PI) / 180;
  const rotationZ = (part.rotation.z * Math.PI) / 180;

  // Memoized rotation objects - only recreated when rotation actually changes
  const rotationQuaternion = useMemo(() => {
    const euler = new THREE.Euler(rotationX, rotationY, rotationZ, 'XYZ');
    return new THREE.Quaternion().setFromEuler(euler);
  }, [rotationX, rotationY, rotationZ]);
  const inverseRotationQuaternion = useMemo(() => rotationQuaternion.clone().invert(), [rotationQuaternion]);

  // Drag hook
  const { isDragging, justFinishedDragging, handlePointerDown } = usePartDrag(
    part,
    liveDims,
    setLiveDims,
    rotationQuaternion,
    camera,
    gl,
    controls,
    groupToSelectOnClick,
    isOutsideEditingContext,
    isSelected,
    selectPart,
    togglePartSelection,
    clearSelection,
    selectGroup,
    toggleGroupSelection,
    updatePart,
    moveSelectedParts
  );

  // Resize hook
  const { isResizing, handleResizeStart } = usePartResize(
    part,
    liveDims,
    setLiveDims,
    rotationQuaternion,
    inverseRotationQuaternion,
    camera,
    gl,
    controls,
    updatePart
  );

  // === EVENT HANDLERS ===
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();

    if (isOutsideEditingContext) {
      return;
    }

    // Skip selection if we just finished dragging (prevents clearing multi-selection)
    if (justFinishedDragging.current) {
      justFinishedDragging.current = false;
      return;
    }

    if (!e.nativeEvent.shiftKey) {
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

    if (isOutsideEditingContext) {
      return;
    }

    if (groupToSelectOnClick) {
      enterGroup(groupToSelectOnClick);
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

  // Handle rotation around an axis (LOCAL rotation)
  const handleRotate = useCallback(
    (axis: 'x' | 'y' | 'z') => {
      const currentEuler = new THREE.Euler(
        (part.rotation.x * Math.PI) / 180,
        (part.rotation.y * Math.PI) / 180,
        (part.rotation.z * Math.PI) / 180,
        'XYZ'
      );
      const currentQuat = new THREE.Quaternion().setFromEuler(currentEuler);

      const localRotationQuat = new THREE.Quaternion();
      if (axis === 'x') {
        localRotationQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
      } else if (axis === 'y') {
        localRotationQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
      } else {
        localRotationQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
      }

      const newQuat = currentQuat.clone().multiply(localRotationQuat);
      const newEuler = new THREE.Euler().setFromQuaternion(newQuat, 'XYZ');

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
    },
    [part.rotation.x, part.rotation.y, part.rotation.z, part.id, updatePart]
  );

  // Use live dimensions for rendering
  const dims: [number, number, number] = [liveDims.length, liveDims.thickness, liveDims.width];

  // Calculate render position
  let renderX = liveDims.x;
  let renderY = liveDims.y;
  let renderZ = liveDims.z;

  if (!isDragging && isSelected && activeDragDelta) {
    renderX = part.position.x + activeDragDelta.x;
    renderY = part.position.y + activeDragDelta.y;
    renderZ = part.position.z + activeDragDelta.z;
  }

  return (
    <group position={[renderX, renderY, renderZ]}>
      <group rotation={[rotationX, rotationY, rotationZ]}>
        <mesh
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
          {(isSelected || isHovered || isReference || displayMode === 'wireframe') && (
            <Edges
              scale={1.002}
              threshold={15}
              color={
                isSelected ? '#ffffff' : isReference ? '#00ffff' : displayMode === 'wireframe' ? part.color : '#888888'
              }
            />
          )}
        </mesh>

        {/* Grain direction arrow - show when enabled, grain-sensitive, and close enough to camera */}
        {showGrainDirection &&
          part.grainSensitive &&
          (camera.position.x - renderX) ** 2 +
            (camera.position.y - renderY) ** 2 +
            (camera.position.z - renderZ) ** 2 <
            GRAIN_ARROW_MAX_DISTANCE_SQ && (
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
            <RotationHandle liveDims={liveDims} axis="y" side={1} onRotate={handleRotate} />
            <RotationHandle liveDims={liveDims} axis="y" side={-1} onRotate={handleRotate} />
            <RotationHandle liveDims={liveDims} axis="x" side={1} onRotate={handleRotate} />
            <RotationHandle liveDims={liveDims} axis="x" side={-1} onRotate={handleRotate} />
            <RotationHandle liveDims={liveDims} axis="z" side={1} onRotate={handleRotate} />
            <RotationHandle liveDims={liveDims} axis="z" side={-1} onRotate={handleRotate} />
          </>
        )}

        {/* Blueprint-style dimension labels - show for directly selected parts only */}
        {isDirectlySelected && !isDragging && !activeDragDelta && (
          <>
            <DimensionLabel
              start={[-liveDims.length / 2, -liveDims.thickness / 2, -liveDims.width / 2]}
              end={[liveDims.length / 2, -liveDims.thickness / 2, -liveDims.width / 2]}
              value={liveDims.length}
              offsetDir={[0, 0, -1]}
              offset={1.5}
              color="#e74c3c"
              units={units}
            />
            <DimensionLabel
              start={[liveDims.length / 2, -liveDims.thickness / 2, -liveDims.width / 2]}
              end={[liveDims.length / 2, -liveDims.thickness / 2, liveDims.width / 2]}
              value={liveDims.width}
              offsetDir={[1, 0, 0]}
              offset={1.5}
              color="#3498db"
              units={units}
            />
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
