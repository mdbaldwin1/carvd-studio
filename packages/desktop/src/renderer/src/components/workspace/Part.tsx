import { Edges } from '@react-three/drei';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/shallow';
import { useCameraStore } from '../../store/cameraStore';
import { useProjectStore } from '../../store/projectStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useInteractionStore } from '../../store/interactionStore';
import { useSnapStore } from '../../store/snapStore';
import { Part as PartType } from '../../types';
import { calculateWorldHalfHeightFromDegrees } from '../../utils/mathPool';
import {
  beginRotateInteractionSession,
  clearMoveInteractionPreview,
  publishRotateInteractionPreview
} from '../../utils/interactionSession';
import { resolvePartInteractionPreview, shouldHideMeasurementOverlays } from '../../utils/interactionOverlay';
import { getProjectedMeasurementLength, resolveMeasurementOverlayLayout } from '../../utils/measurementOverlayLayout';
import { getPartDimensionPlacements } from '../../utils/measurementPlacement';
import { getPartDimensionPriority } from '../../utils/measurementPriority';
import { rotateAroundLocalAxis } from '../../utils/rotation';
import { DimensionLabel } from './DimensionLabel';
import { GrainDirectionArrow } from './GrainDirectionArrow';
import { getPartGroupContext } from './partClickHandler';
import { GRAIN_ARROW_MAX_DISTANCE_SQ, HANDLE_POSITIONS, LiveDimensions } from './partTypes';
import { ResizeHandle } from './ResizeHandle';
import { RotationHandle } from './RotationHandle';
import { useGroupDrag } from './useGroupDrag';
import { usePartDrag } from './usePartDrag';
import { usePartResize } from './usePartResize';

// Decorative edges should never consume pointer hits.
const NOOP_RAYCAST: THREE.Object3D['raycast'] = () => {};

interface PartProps {
  part: PartType;
  isStockHighlighted?: boolean;
}

export const Part = memo(function Part({ part, isStockHighlighted = false }: PartProps) {
  const { camera, gl, controls, size } = useThree();

  // Project state selector - only re-renders when these specific values change
  const { units, groupMembers } = useProjectStore(
    useShallow((s) => ({
      units: s.units,
      groupMembers: s.groupMembers
    }))
  );
  const referencePartIds = useSnapStore((s) => s.referencePartIds);

  // Selection state selector
  const { selectedPartIds, hoveredPartId, selectedGroupIds, editingGroupId } = useSelectionStore(
    useShallow((s) => ({
      selectedPartIds: s.selectedPartIds,
      hoveredPartId: s.hoveredPartId,
      selectedGroupIds: s.selectedGroupIds,
      editingGroupId: s.editingGroupId
    }))
  );
  const activeSession = useInteractionStore((s) => s.activeSession);

  // Camera store state
  const showGrainDirection = useCameraStore((s) => s.showGrainDirection);
  const displayMode = useCameraStore((s) => s.displayMode);

  // Actions are stable references - grab them once outside the render cycle
  const selectPart = useSelectionStore((s) => s.selectPart);
  const togglePartSelection = useSelectionStore((s) => s.togglePartSelection);
  const setHoveredPart = useSelectionStore((s) => s.setHoveredPart);
  const updatePart = useProjectStore((s) => s.updatePart);
  const moveSelectedParts = useProjectStore((s) => s.moveSelectedParts);
  const selectGroup = useSelectionStore((s) => s.selectGroup);
  const toggleGroupSelection = useSelectionStore((s) => s.toggleGroupSelection);
  const enterGroup = useSelectionStore((s) => s.enterGroup);
  const { startGroupDrag } = useGroupDrag(camera, gl, controls);

  // Group membership context — uses shared logic with InstancedParts
  const { groupToSelectOnClick, isOutsideEditingContext, ancestorGroupIds } = useMemo(
    () => getPartGroupContext(part.id, groupMembers, editingGroupId),
    [part.id, groupMembers, editingGroupId]
  );

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- using individual rotation axes (x,y,z) as deps is intentional; part.rotation object ref may change without value changes
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
    ancestorGroupIds,
    isSelected,
    selectPart,
    togglePartSelection,
    selectGroup,
    toggleGroupSelection,
    updatePart,
    moveSelectedParts,
    startGroupDrag
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

    const isMac = window.navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
    const isModKey = isMac ? e.nativeEvent.metaKey : e.nativeEvent.ctrlKey;
    const isAdditiveSelection = e.nativeEvent.shiftKey || isModKey;

    if (isAdditiveSelection) {
      return;
    }

    if (groupToSelectOnClick) {
      selectGroup(groupToSelectOnClick);
    } else {
      selectPart(part.id);
    }
  };

  // Double-click to enter a group (Figma-style)
  const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    (e.nativeEvent as MouseEvent & { __carvdPartDblClickHandled?: boolean }).__carvdPartDblClickHandled = true;

    if (isOutsideEditingContext) {
      return;
    }

    if (groupToSelectOnClick) {
      enterGroup(groupToSelectOnClick);
      // Top-level -> nested part: select the immediate child group on the path.
      // Deeper drilling: keep focus on the exact part.
      const topLevelGroupId = ancestorGroupIds[ancestorGroupIds.length - 1] ?? null;
      const immediateChildGroupId = ancestorGroupIds.length > 1 ? ancestorGroupIds[ancestorGroupIds.length - 2] : null;
      if (groupToSelectOnClick === topLevelGroupId && immediateChildGroupId) {
        selectGroup(immediateChildGroupId);
      } else {
        selectPart(part.id);
      }
      return;
    }

    // Already in the target edit context: still select the double-clicked part.
    selectPart(part.id);
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
  const applyLocalRotation = useCallback(
    (axis: 'x' | 'y' | 'z', degrees: number) => {
      const latestPart = useProjectStore.getState().parts.find((p) => p.id === part.id);
      if (!latestPart) return;
      const newRotation = rotateAroundLocalAxis(latestPart.rotation, axis, degrees);
      updatePart(part.id, {
        rotation: newRotation
      });
    },
    [part.id, updatePart]
  );

  const handleRotate = useCallback(
    (axis: 'x' | 'y' | 'z') => {
      beginRotateInteractionSession({
        affectedPartIds: [part.id],
        primaryPartId: part.id,
        pivot: { x: part.position.x, y: part.position.y, z: part.position.z },
        axis,
        initialDegrees: 90
      });
      applyLocalRotation(axis, 90);
      clearMoveInteractionPreview({
        clearSelectionDragDelta: false,
        clearReferenceDistances: false
      });
    },
    [applyLocalRotation, part.id, part.position.x, part.position.y, part.position.z]
  );
  const handleRotateDelta = useCallback(
    (axis: 'x' | 'y' | 'z', degrees: number) => {
      if (Math.abs(degrees) < 0.01) return;
      applyLocalRotation(axis, degrees);
      publishRotateInteractionPreview({ axis, degreesDelta: degrees });
    },
    [applyLocalRotation]
  );

  const handleRotateStart = useCallback(() => {
    if (controls) controls.enabled = false;
    beginRotateInteractionSession({
      affectedPartIds: [part.id],
      primaryPartId: part.id,
      pivot: { x: part.position.x, y: part.position.y, z: part.position.z }
    });
  }, [controls, part.id, part.position.x, part.position.y, part.position.z]);

  const handleRotateEnd = useCallback(() => {
    if (controls) controls.enabled = true;
    clearMoveInteractionPreview({
      clearSelectionDragDelta: false,
      clearReferenceDistances: false
    });
  }, [controls]);

  // Use live dimensions for rendering
  const dims: [number, number, number] = [liveDims.length, liveDims.thickness, liveDims.width];

  // Calculate render position
  let renderX = liveDims.x;
  let renderY = liveDims.y;
  let renderZ = liveDims.z;

  const interactionPreview = resolvePartInteractionPreview(part, activeSession);
  const isAffectedByActiveInteraction = interactionPreview.affected;

  if (!isDragging && !isResizing && isAffectedByActiveInteraction) {
    renderX = interactionPreview.position.x;
    renderY = interactionPreview.position.y;
    renderZ = interactionPreview.position.z;
  }

  const partDimensionPlacements = useMemo(() => {
    const cameraLocal = new THREE.Vector3(
      camera.position.x - renderX,
      camera.position.y - renderY,
      camera.position.z - renderZ
    ).applyQuaternion(inverseRotationQuaternion);

    return getPartDimensionPlacements({
      length: liveDims.length,
      width: liveDims.width,
      thickness: liveDims.thickness,
      cameraLocal: [cameraLocal.x, cameraLocal.y, cameraLocal.z]
    });
  }, [
    camera.position.x,
    camera.position.y,
    camera.position.z,
    inverseRotationQuaternion,
    liveDims.length,
    liveDims.thickness,
    liveDims.width,
    renderX,
    renderY,
    renderZ
  ]);

  const partDimensionLayout = useMemo(() => {
    const viewport = { width: size.width, height: size.height };
    const candidates = [
      {
        id: 'length' as const,
        placement: partDimensionPlacements.length,
        start: partDimensionPlacements.length.start,
        end: partDimensionPlacements.length.end,
        priority: getPartDimensionPriority('length')
      },
      {
        id: 'width' as const,
        placement: partDimensionPlacements.width,
        start: partDimensionPlacements.width.start,
        end: partDimensionPlacements.width.end,
        priority: getPartDimensionPriority('width')
      },
      {
        id: 'thickness' as const,
        placement: partDimensionPlacements.thickness,
        start: partDimensionPlacements.thickness.start,
        end: partDimensionPlacements.thickness.end,
        priority: getPartDimensionPriority('thickness')
      }
    ];

    const visibleByLength = candidates.filter((candidate) => {
      const start = new THREE.Vector3(...candidate.start)
        .applyQuaternion(rotationQuaternion)
        .add(new THREE.Vector3(renderX, renderY, renderZ));
      const end = new THREE.Vector3(...candidate.end)
        .applyQuaternion(rotationQuaternion)
        .add(new THREE.Vector3(renderX, renderY, renderZ));

      return (
        getProjectedMeasurementLength(
          { x: start.x, y: start.y, z: start.z },
          { x: end.x, y: end.y, z: end.z },
          camera,
          viewport
        ) >= (candidate.id === 'thickness' ? 44 : 56)
      );
    });

    return resolveMeasurementOverlayLayout(
      visibleByLength.map((candidate) => {
        const labelLocal = new THREE.Vector3(
          (candidate.start[0] + candidate.end[0]) / 2 + candidate.placement.offsetDir[0] * candidate.placement.offset,
          (candidate.start[1] + candidate.end[1]) / 2 + candidate.placement.offsetDir[1] * candidate.placement.offset,
          (candidate.start[2] + candidate.end[2]) / 2 + candidate.placement.offsetDir[2] * candidate.placement.offset
        );
        labelLocal.applyQuaternion(rotationQuaternion).add(new THREE.Vector3(renderX, renderY, renderZ));

        return {
          id: candidate.id,
          worldPosition: { x: labelLocal.x, y: labelLocal.y, z: labelLocal.z },
          priority: candidate.priority
        };
      }),
      camera,
      viewport,
      42,
      2
    );
  }, [camera, partDimensionPlacements, renderX, renderY, renderZ, rotationQuaternion, size.height, size.width]);

  // Rotation handles stay visible the whole time a single part is selected — they're
  // the primary affordance for rotating, including the 90° click and drag-rotate.
  const showSinglePartRotationHandles = isOnlySelected;
  // Resize handles only appear on hover / during an active resize gesture. Always-on
  // resize handles clutter the part with small dots that read as opaque rectangles
  // sitting on top of the part body, especially during drag.
  const showSinglePartResizeHandles =
    isOnlySelected &&
    (isHovered || isResizing || (activeSession?.primaryPartId === part.id && activeSession.kind === 'resize'));

  return (
    <group position={[renderX, renderY, renderZ]}>
      <group rotation={[rotationX, rotationY, rotationZ]}>
        <mesh
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onPointerDown={handlePointerDown}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          // ADR-002: descriptor schema so the hit-test service can resolve this mesh.
          userData={{
            partId: part.id,
            hitTarget: { kind: 'part-body', nodeId: part.id, partId: part.id }
          }}
        >
          <boxGeometry args={dims} />
          {displayMode === 'solid' && <meshStandardMaterial color={part.color} />}
          {displayMode === 'wireframe' && <meshBasicMaterial color={part.color} wireframe />}
          {displayMode === 'translucent' && (
            <meshStandardMaterial color={part.color} transparent opacity={0.55} depthWrite={false} />
          )}
          {displayMode !== 'solid' && displayMode !== 'wireframe' && displayMode !== 'translucent' && (
            <meshStandardMaterial color={part.color} />
          )}
          {(isDirectlySelected ||
            isHovered ||
            isReference ||
            isStockHighlighted ||
            displayMode === 'wireframe' ||
            displayMode === 'translucent') && (
            <Edges
              scale={1.002}
              threshold={15}
              raycast={NOOP_RAYCAST}
              color={
                isSelected
                  ? '#ffffff'
                  : isReference
                    ? '#00ffff'
                    : isStockHighlighted
                      ? '#4fd1ff'
                      : displayMode === 'wireframe'
                        ? part.color
                        : displayMode === 'translucent'
                          ? '#ffffff'
                          : '#888888'
              }
            />
          )}
        </mesh>

        {/* Grain direction arrow - show when enabled, grain-sensitive, and close enough to camera */}
        {showGrainDirection &&
          part.grainSensitive &&
          (camera.position.x - renderX) ** 2 + (camera.position.y - renderY) ** 2 + (camera.position.z - renderZ) ** 2 <
            GRAIN_ARROW_MAX_DISTANCE_SQ && (
            <GrainDirectionArrow liveDims={liveDims} grainDirection={part.grainDirection} />
          )}

        {/* Resize handles - only show when single part selected and hovered/resizing */}
        {showSinglePartResizeHandles &&
          HANDLE_POSITIONS.map((handlePos, idx) => (
            <ResizeHandle
              key={idx}
              partId={part.id}
              liveDims={liveDims}
              handlePos={handlePos}
              onResizeStart={handleResizeStart}
              isResizing={isResizing}
            />
          ))}

        {/* Rotation handles on all 6 faces - always visible while a single part is selected */}
        {showSinglePartRotationHandles && (
          <>
            <RotationHandle
              partId={part.id}
              liveDims={liveDims}
              axis="y"
              side={1}
              onRotate={handleRotate}
              onRotateDelta={handleRotateDelta}
              onRotateStart={handleRotateStart}
              onRotateEnd={handleRotateEnd}
            />
            <RotationHandle
              partId={part.id}
              liveDims={liveDims}
              axis="y"
              side={-1}
              onRotate={handleRotate}
              onRotateDelta={handleRotateDelta}
              onRotateStart={handleRotateStart}
              onRotateEnd={handleRotateEnd}
            />
            <RotationHandle
              partId={part.id}
              liveDims={liveDims}
              axis="x"
              side={1}
              onRotate={handleRotate}
              onRotateDelta={handleRotateDelta}
              onRotateStart={handleRotateStart}
              onRotateEnd={handleRotateEnd}
            />
            <RotationHandle
              partId={part.id}
              liveDims={liveDims}
              axis="x"
              side={-1}
              onRotate={handleRotate}
              onRotateDelta={handleRotateDelta}
              onRotateStart={handleRotateStart}
              onRotateEnd={handleRotateEnd}
            />
            <RotationHandle
              partId={part.id}
              liveDims={liveDims}
              axis="z"
              side={1}
              onRotate={handleRotate}
              onRotateDelta={handleRotateDelta}
              onRotateStart={handleRotateStart}
              onRotateEnd={handleRotateEnd}
            />
            <RotationHandle
              partId={part.id}
              liveDims={liveDims}
              axis="z"
              side={-1}
              onRotate={handleRotate}
              onRotateDelta={handleRotateDelta}
              onRotateStart={handleRotateStart}
              onRotateEnd={handleRotateEnd}
            />
          </>
        )}

        {/* Blueprint-style dimension labels - show for directly selected parts only */}
        {isDirectlySelected && !isDragging && !isResizing && !shouldHideMeasurementOverlays(activeSession) && (
          <>
            <DimensionLabel
              hidden={!partDimensionLayout.get('length')?.visible}
              start={partDimensionPlacements.length.start}
              end={partDimensionPlacements.length.end}
              value={liveDims.length}
              offsetDir={partDimensionPlacements.length.offsetDir}
              offset={partDimensionPlacements.length.offset + (partDimensionLayout.get('length')?.lane ?? 0) * 0.7}
              color="#e74c3c"
              units={units}
              fontSize={0.44}
            />
            <DimensionLabel
              hidden={!partDimensionLayout.get('width')?.visible}
              start={partDimensionPlacements.width.start}
              end={partDimensionPlacements.width.end}
              value={liveDims.width}
              offsetDir={partDimensionPlacements.width.offsetDir}
              offset={partDimensionPlacements.width.offset + (partDimensionLayout.get('width')?.lane ?? 0) * 0.7}
              color="#3498db"
              units={units}
              fontSize={0.44}
            />
            <DimensionLabel
              hidden={!partDimensionLayout.get('thickness')?.visible}
              start={partDimensionPlacements.thickness.start}
              end={partDimensionPlacements.thickness.end}
              value={liveDims.thickness}
              offsetDir={partDimensionPlacements.thickness.offsetDir}
              offset={
                partDimensionPlacements.thickness.offset + (partDimensionLayout.get('thickness')?.lane ?? 0) * 0.65
              }
              color="#2ecc71"
              units={units}
              fontSize={0.4}
            />
          </>
        )}
      </group>
    </group>
  );
});
