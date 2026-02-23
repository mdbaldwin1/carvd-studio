/**
 * InstancedParts — renders all non-interactive parts via a single InstancedMesh.
 *
 * Each instance uses a unit cube geometry (1×1×1) with per-instance transforms
 * encoding position, rotation, and scale (length × thickness × width).
 * Per-instance colors are set via the instanceColor attribute.
 *
 * This replaces 2048 individual <Part> components with a single draw call.
 */
import { useEffect, useMemo, useRef, useCallback } from 'react';
import { ThreeEvent, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Part } from '../../types';
import { useSelectionStore } from '../../store/selectionStore';
import { useProjectStore } from '../../store/projectStore';
import { useCameraStore } from '../../store/cameraStore';
import { useUIStore } from '../../store/uiStore';
import { getPartGroupContext } from './partClickHandler';
import { setRightClickTarget } from './workspaceUtils';
import { useGroupDrag } from './useGroupDrag';

// Pre-allocated objects at module scope — reused every update, zero GC pressure
const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _color = new THREE.Color();

// Shared unit cube geometry — all instances share this single geometry
const unitBoxGeometry = new THREE.BoxGeometry(1, 1, 1);

interface InstancedPartsProps {
  parts: Part[];
  /** Total parts in the project — used as the stable allocation size to avoid re-mounting */
  totalPartCount: number;
  /** IDs of parts affected by the current drag (selected parts + group descendants) */
  dragAffectedPartIds: Set<string>;
}

export function InstancedParts({ parts, totalPartCount, dragAffectedPartIds }: InstancedPartsProps) {
  const { camera, gl, controls } = useThree();
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Stable allocation capacity — only grows, never shrinks, to avoid re-mounting the mesh.
  // Re-mount only when parts are added beyond the current capacity.
  const capacityRef = useRef(totalPartCount);
  if (totalPartCount > capacityRef.current) {
    capacityRef.current = totalPartCount;
  }
  const meshCapacity = capacityRef.current;

  // Display mode
  const displayMode = useCameraStore((s) => s.displayMode);

  // Drag delta for parts being dragged by someone else (group drag)
  const activeDragDelta = useSelectionStore((s) => s.activeDragDelta);

  // Actions
  const selectPart = useSelectionStore((s) => s.selectPart);
  const togglePartSelection = useSelectionStore((s) => s.togglePartSelection);
  const setHoveredPart = useSelectionStore((s) => s.setHoveredPart);
  const selectGroup = useSelectionStore((s) => s.selectGroup);
  const toggleGroupSelection = useSelectionStore((s) => s.toggleGroupSelection);
  const enterGroup = useSelectionStore((s) => s.enterGroup);
  const setDragIntent = useSelectionStore((s) => s.setDragIntent);
  const setSelectedSidebarStockId = useUIStore((s) => s.setSelectedSidebarStockId);

  // Group drag hook — handles drag of already-selected groups at InstancedMesh level
  const { startGroupDrag } = useGroupDrag(camera, gl, controls);

  // Part ID by instance index — used to resolve instanceId from pointer events
  const partIdByIndex = useMemo(() => parts.map((p) => p.id), [parts]);

  // Update instance matrices and colors whenever parts change
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || parts.length === 0) return;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      // Rotation
      _euler.set(
        (part.rotation.x * Math.PI) / 180,
        (part.rotation.y * Math.PI) / 180,
        (part.rotation.z * Math.PI) / 180,
        'XYZ'
      );
      _quaternion.setFromEuler(_euler);

      // Scale = part dimensions (unit cube scaled to actual size)
      _scale.set(part.length, part.thickness, part.width);

      // Position (apply drag delta for parts in the selected group)
      _position.set(part.position.x, part.position.y, part.position.z);
      if (activeDragDelta && dragAffectedPartIds.has(part.id)) {
        _position.x += activeDragDelta.x;
        _position.y += activeDragDelta.y;
        _position.z += activeDragDelta.z;
      }

      _matrix.compose(_position, _quaternion, _scale);
      mesh.setMatrixAt(i, _matrix);

      // Per-instance color
      if (displayMode === 'translucent') {
        _color.set('#888888');
      } else {
        _color.set(part.color);
      }
      mesh.setColorAt(i, _color);
    }

    // Update visible instance count (may differ from allocated count)
    mesh.count = parts.length;

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }

    // Expose instance->part mapping for native workspace raycast fallbacks.
    mesh.userData.partIdByInstance = partIdByIndex;
    mesh.userData.isInstancedParts = true;
  }, [parts, activeDragDelta, dragAffectedPartIds, displayMode, partIdByIndex]);

  // Compute bounding sphere for frustum culling
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || parts.length === 0) return;

    const box = new THREE.Box3();
    const tempBox = new THREE.Box3();
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();

    for (const part of parts) {
      center.set(part.position.x, part.position.y, part.position.z);
      size.set(part.length, part.thickness, part.width);
      tempBox.setFromCenterAndSize(center, size);
      box.union(tempBox);
    }

    mesh.geometry.boundingBox = box;
    mesh.geometry.boundingSphere = new THREE.Sphere();
    box.getBoundingSphere(mesh.geometry.boundingSphere);
  }, [parts]);

  // === Interaction handlers ===

  // Helper: get group context for a part
  const getGroupContext = useCallback(
    (partId: string) => {
      const { groupMembers } = useProjectStore.getState();
      const { editingGroupId } = useSelectionStore.getState();
      return getPartGroupContext(partId, groupMembers, editingGroupId);
    },
    [] // reads imperatively, no deps
  );

  // Track hovered instance (R3F doesn't fire per-instance over/out)
  const lastHoveredInstanceRef = useRef<number | undefined>(undefined);

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (e.instanceId !== lastHoveredInstanceRef.current) {
        lastHoveredInstanceRef.current = e.instanceId;
        if (e.instanceId !== undefined) {
          const partId = partIdByIndex[e.instanceId];
          if (partId) {
            const ctx = getGroupContext(partId);
            if (!ctx.isOutsideEditingContext) {
              setHoveredPart(partId);
              document.body.style.cursor = 'move';
            }
          }
        }
      }
    },
    [partIdByIndex, getGroupContext, setHoveredPart]
  );

  const handlePointerOut = useCallback(() => {
    lastHoveredInstanceRef.current = undefined;
    setHoveredPart(null);
    document.body.style.cursor = 'auto';
  }, [setHoveredPart]);

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (e.instanceId === undefined) return;

      const partId = partIdByIndex[e.instanceId];
      if (!partId) return;

      const ctx = getGroupContext(partId);

      if (ctx.isOutsideEditingContext) {
        // Recover from stale/narrow edit context by exiting to top-level context
        // and selecting what was clicked.
        useSelectionStore.setState({ editingGroupId: null });
        const topLevelGroupId = ctx.ancestorGroupIds[ctx.ancestorGroupIds.length - 1] ?? null;
        if (topLevelGroupId) {
          selectGroup(topLevelGroupId);
        } else {
          selectPart(partId);
        }
        setSelectedSidebarStockId(null);
        return;
      }

      // Right-click: select and set context menu target
      if (e.nativeEvent.button === 2) {
        if (ctx.groupToSelectOnClick) {
          selectGroup(ctx.groupToSelectOnClick);
        } else {
          selectPart(partId);
        }
        setSelectedSidebarStockId(null);
        setRightClickTarget({ type: 'part' });
        return;
      }

      const isMac = window.navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
      const isModKey = isMac ? e.nativeEvent.metaKey : e.nativeEvent.ctrlKey;
      const isAdditiveSelection = e.nativeEvent.shiftKey || isModKey;

      // Additive click: toggle selection
      if (isAdditiveSelection) {
        if (ctx.groupToSelectOnClick) {
          toggleGroupSelection(ctx.groupToSelectOnClick);
        } else {
          togglePartSelection(partId);
        }
        return;
      }

      // Check if this part belongs to an already-selected group
      const { selectedGroupIds } = useSelectionStore.getState();
      const isInSelectedGroup = ctx.groupToSelectOnClick && selectedGroupIds.includes(ctx.groupToSelectOnClick);

      if (isInSelectedGroup) {
        // Group already selected — don't change selection, just prepare for group drag
        if (e.point) {
          startGroupDrag(e.point, e.nativeEvent.clientX, e.nativeEvent.clientY);
        }
        return;
      }

      // Normal click: select and store drag intent for individual Part pop-out
      if (ctx.groupToSelectOnClick) {
        selectGroup(ctx.groupToSelectOnClick);
      } else {
        selectPart(partId);
      }
      setSelectedSidebarStockId(null);

      // Store drag intent so the individual Part component can pick up the drag
      setDragIntent({
        partId,
        screenX: e.nativeEvent.clientX,
        screenY: e.nativeEvent.clientY,
        worldPoint: e.point ? { x: e.point.x, y: e.point.y, z: e.point.z } : null
      });
    },
    [
      partIdByIndex,
      getGroupContext,
      selectPart,
      selectGroup,
      togglePartSelection,
      toggleGroupSelection,
      setDragIntent,
      startGroupDrag,
      setSelectedSidebarStockId
    ]
  );

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (e.instanceId === undefined) return;

      const partId = partIdByIndex[e.instanceId];
      if (!partId) return;

      const ctx = getGroupContext(partId);
      if (ctx.isOutsideEditingContext) return;

      // PointerDown remains the primary path (selection + drag intent). This click
      // handler is a fallback for plain left-click selection when pointerDown is
      // consumed by drag/orbit timing.
      const isMac = window.navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
      const isModKey = isMac ? e.nativeEvent.metaKey : e.nativeEvent.ctrlKey;
      const isAdditiveSelection = e.nativeEvent.shiftKey || isModKey;
      if (isAdditiveSelection) return;

      if (ctx.groupToSelectOnClick) {
        selectGroup(ctx.groupToSelectOnClick);
      } else {
        selectPart(partId);
      }
      setSelectedSidebarStockId(null);
    },
    [partIdByIndex, getGroupContext, selectGroup, selectPart, setSelectedSidebarStockId]
  );

  const handleDoubleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      (e.nativeEvent as MouseEvent & { __carvdPartDblClickHandled?: boolean }).__carvdPartDblClickHandled = true;
      if (e.instanceId === undefined) return;

      const partId = partIdByIndex[e.instanceId];
      if (!partId) return;

      const ctx = getGroupContext(partId);
      if (ctx.isOutsideEditingContext) return;

      if (ctx.groupToSelectOnClick) {
        enterGroup(ctx.groupToSelectOnClick);
        // Top-level -> nested part: select the immediate child group on the path.
        // Deeper drilling: keep focus on the exact part.
        const topLevelGroupId = ctx.ancestorGroupIds[ctx.ancestorGroupIds.length - 1] ?? null;
        const immediateChildGroupId =
          ctx.ancestorGroupIds.length > 1 ? ctx.ancestorGroupIds[ctx.ancestorGroupIds.length - 2] : null;
        if (ctx.groupToSelectOnClick === topLevelGroupId && immediateChildGroupId) {
          selectGroup(immediateChildGroupId);
        } else {
          selectPart(partId);
        }
        return;
      }

      // Already in the target edit context: still select the part that was double-clicked.
      selectPart(partId);
    },
    [partIdByIndex, getGroupContext, enterGroup, selectPart, selectGroup]
  );

  if (parts.length === 0) return null;

  return (
    <instancedMesh
      key={meshCapacity}
      ref={meshRef}
      args={[unitBoxGeometry, undefined, meshCapacity]}
      frustumCulled={false}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
    >
      {displayMode === 'solid' && <meshStandardMaterial />}
      {displayMode === 'wireframe' && <meshBasicMaterial wireframe />}
      {displayMode === 'translucent' && <meshStandardMaterial transparent opacity={0.3} depthWrite={false} />}
    </instancedMesh>
  );
}
