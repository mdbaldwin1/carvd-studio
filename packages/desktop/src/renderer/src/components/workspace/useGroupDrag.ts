/**
 * useGroupDrag — handles drag of an already-selected group directly from InstancedMesh.
 *
 * When the user clicks on a part within a group that's already selected, this hook
 * manages the drag lifecycle (threshold → drag → drop) entirely at the InstancedMesh level.
 * No individual Part pop-out is needed since the group acts as a single entity.
 */
import { useCallback, useRef } from 'react';
import * as THREE from 'three';
import { useProjectStore, getAllDescendantPartIds } from '../../store/projectStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useSnapStore } from '../../store/snapStore';
import { useAppSettingsStore } from '../../store/appSettingsStore';
import { getCombinedBounds, getPartBoundsAtPosition } from '../../utils/snapToPartsUtil';
import { calculateWorldHalfHeightFromDegrees } from '../../utils/mathPool';
import { snapToGrid } from './partTypes';
import { isOrbitControls } from './workspaceUtils';

// Pre-allocated objects — reused every frame, zero GC pressure
const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _raycaster = new THREE.Raycaster();
const _vec2 = new THREE.Vector2();
const _intersection = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _axisX = new THREE.Vector3(1, 0, 0);
const _axisY = new THREE.Vector3(0, 1, 0);
const _axisZ = new THREE.Vector3(0, 0, 1);

const DRAG_THRESHOLD_SQ = 9; // 3px squared

export function useGroupDrag(
  camera: THREE.Camera,
  gl: THREE.WebGLRenderer,
  controls: THREE.EventDispatcher<object> | null
): {
  startGroupDrag: (worldPoint: THREE.Vector3, screenX: number, screenY: number) => void;
} {
  // RAF gating to coalesce pointer events to animation frame rate
  const rafIdRef = useRef<number | null>(null);
  const latestEventRef = useRef<PointerEvent | null>(null);

  // Drag state refs (not React state — no re-renders needed during drag)
  const dragActiveRef = useRef(false);
  const startPointRef = useRef<THREE.Vector3 | null>(null);
  const anchorPosRef = useRef<THREE.Vector3 | null>(null);
  const planeAxesRef = useRef<{ x: boolean; y: boolean; z: boolean }>({ x: true, y: false, z: true });
  const lastDragPosRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const getWorldPoint = useCallback(
    (e: PointerEvent): THREE.Vector3 | null => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_vec2.set(x, y), camera);
      if (_raycaster.ray.intersectPlane(_plane, _intersection)) {
        return _intersection;
      }
      return null;
    },
    [gl, camera]
  );

  const setupDragPlane = useCallback(
    (anchorPos: THREE.Vector3) => {
      _forward.set(0, 0, -1).applyQuaternion(camera.quaternion);

      const dotX = Math.abs(_forward.dot(_axisX));
      const dotY = Math.abs(_forward.dot(_axisY));
      const dotZ = Math.abs(_forward.dot(_axisZ));

      if (dotZ >= dotX && dotZ >= dotY) {
        _plane.setFromNormalAndCoplanarPoint(_normal.set(0, 0, 1), anchorPos);
        planeAxesRef.current = { x: true, y: true, z: false };
      } else if (dotX >= dotY) {
        _plane.setFromNormalAndCoplanarPoint(_normal.set(1, 0, 0), anchorPos);
        planeAxesRef.current = { x: false, y: true, z: true };
      } else {
        _plane.setFromNormalAndCoplanarPoint(_normal.set(0, 1, 0), anchorPos);
        planeAxesRef.current = { x: true, y: false, z: true };
      }
    },
    [camera]
  );

  const startGroupDrag = useCallback(
    (worldPoint: THREE.Vector3, screenX: number, screenY: number) => {
      // Store start info
      const startPoint = worldPoint.clone();
      let dragStarted = false;

      const handleMove = (e: PointerEvent) => {
        if (!dragStarted) {
          // Threshold check
          const dx = e.clientX - screenX;
          const dy = e.clientY - screenY;
          if (dx * dx + dy * dy < DRAG_THRESHOLD_SQ) return;

          dragStarted = true;
          dragActiveRef.current = true;

          // Compute group center anchor
          const { selectedGroupIds, selectedPartIds } = useSelectionStore.getState();
          const { groupMembers, parts } = useProjectStore.getState();

          const partIdsToInclude = new Set(selectedPartIds);
          for (const groupId of selectedGroupIds) {
            const ids = getAllDescendantPartIds(groupId, groupMembers);
            ids.forEach((id) => partIdsToInclude.add(id));
          }

          const groupParts = parts.filter((p) => partIdsToInclude.has(p.id));
          if (groupParts.length === 0) {
            cleanup();
            return;
          }

          const bounds = getCombinedBounds(groupParts);
          const anchor = new THREE.Vector3(bounds.centerX, bounds.centerY, bounds.centerZ);
          anchorPosRef.current = anchor;
          startPointRef.current = startPoint;

          setupDragPlane(anchor);

          if (isOrbitControls(controls)) (controls as { enabled: boolean }).enabled = false;
        }

        // Drag active — process move
        latestEventRef.current = e;
        if (rafIdRef.current !== null) return;
        rafIdRef.current = window.requestAnimationFrame(() => {
          rafIdRef.current = null;
          const evt = latestEventRef.current;
          if (!evt || !dragActiveRef.current || !startPointRef.current || !anchorPosRef.current) return;

          const currentPoint = getWorldPoint(evt);
          if (!currentPoint) return;

          const axes = planeAxesRef.current;
          const deltaX = currentPoint.x - startPointRef.current.x;
          const deltaY = currentPoint.y - startPointRef.current.y;
          const deltaZ = currentPoint.z - startPointRef.current.z;

          let newX = axes.x ? anchorPosRef.current.x + deltaX : anchorPosRef.current.x;
          let newY = axes.y ? anchorPosRef.current.y + deltaY : anchorPosRef.current.y;
          let newZ = axes.z ? anchorPosRef.current.z + deltaZ : anchorPosRef.current.z;

          // Grid snap
          const { liveGridSnap } = useAppSettingsStore.getState().settings;
          if (liveGridSnap) {
            newX = snapToGrid(newX);
            newZ = snapToGrid(newZ);
            newY = snapToGrid(newY);
          }

          const proposedDelta = {
            x: newX - anchorPosRef.current.x,
            y: newY - anchorPosRef.current.y,
            z: newZ - anchorPosRef.current.z
          };

          // Ground constraint — ensure no group part goes below ground
          const { selectedGroupIds, selectedPartIds } = useSelectionStore.getState();
          const { groupMembers, parts } = useProjectStore.getState();
          const partIds = new Set(selectedPartIds);
          for (const groupId of selectedGroupIds) {
            getAllDescendantPartIds(groupId, groupMembers).forEach((id) => partIds.add(id));
          }

          let maxYAdjustment = 0;
          for (const pid of partIds) {
            const p = parts.find((pp) => pp.id === pid);
            if (!p) continue;
            const halfH = calculateWorldHalfHeightFromDegrees(p.rotation, p.length, p.thickness, p.width);
            const projectedY = p.position.y + proposedDelta.y;
            const adjustment = Math.max(0, halfH - projectedY);
            maxYAdjustment = Math.max(maxYAdjustment, adjustment);
          }

          proposedDelta.y += maxYAdjustment;

          lastDragPosRef.current = proposedDelta;
          useSelectionStore.getState().setActiveDragDelta(proposedDelta);
        });
      };

      const handleUp = () => {
        if (!dragStarted || !lastDragPosRef.current) {
          // Click without drag — clean up
          cleanup();
          return;
        }

        const finalDelta = { ...lastDragPosRef.current };

        // Grid snap the final delta
        const anchor = anchorPosRef.current!;
        let newX = snapToGrid(anchor.x + finalDelta.x);
        let newY = anchor.y + finalDelta.y;
        let newZ = snapToGrid(anchor.z + finalDelta.z);

        const snappedDelta = {
          x: newX - anchor.x,
          y: newY - anchor.y,
          z: newZ - anchor.z
        };

        // Ground constraint on final position
        const { selectedGroupIds, selectedPartIds } = useSelectionStore.getState();
        const { groupMembers, parts, stockConstraints } = useProjectStore.getState();
        const partIds = new Set(selectedPartIds);
        for (const groupId of selectedGroupIds) {
          getAllDescendantPartIds(groupId, groupMembers).forEach((id) => partIds.add(id));
        }

        let maxYAdjustment = 0;
        for (const pid of partIds) {
          const p = parts.find((pp) => pp.id === pid);
          if (!p) continue;
          const halfH = calculateWorldHalfHeightFromDegrees(p.rotation, p.length, p.thickness, p.width);
          const projectedY = p.position.y + snappedDelta.y;
          const adjustment = Math.max(0, halfH - projectedY);
          maxYAdjustment = Math.max(maxYAdjustment, adjustment);
        }
        snappedDelta.y += maxYAdjustment;

        // Overlap prevention
        if (stockConstraints.preventOverlap) {
          let hasOverlap = false;
          for (const pid of partIds) {
            const p = parts.find((pp) => pp.id === pid);
            if (!p || p.ignoreOverlap) continue;
            const movedPos = {
              x: p.position.x + snappedDelta.x,
              y: p.position.y + snappedDelta.y,
              z: p.position.z + snappedDelta.z
            };
            const movedBounds = getPartBoundsAtPosition(p, movedPos);
            for (const other of parts) {
              if (partIds.has(other.id) || other.ignoreOverlap) continue;
              const otherBounds = getPartBoundsAtPosition(other, other.position);
              const epsilon = 0.001;
              if (
                movedBounds.minX < otherBounds.maxX - epsilon &&
                movedBounds.maxX > otherBounds.minX + epsilon &&
                movedBounds.minY < otherBounds.maxY - epsilon &&
                movedBounds.maxY > otherBounds.minY + epsilon &&
                movedBounds.minZ < otherBounds.maxZ - epsilon &&
                movedBounds.maxZ > otherBounds.minZ + epsilon
              ) {
                hasOverlap = true;
                break;
              }
            }
            if (hasOverlap) break;
          }

          if (hasOverlap) {
            // Revert — don't commit the move
            cleanup();
            return;
          }
        }

        // Commit the move
        const moveSelectedParts = useProjectStore.getState().moveSelectedParts;
        moveSelectedParts(snappedDelta);
        cleanup();
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        cleanupRef.current = null;
        dragActiveRef.current = false;
        startPointRef.current = null;
        anchorPosRef.current = null;
        lastDragPosRef.current = null;
        if (rafIdRef.current !== null) {
          window.cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        latestEventRef.current = null;
        useSelectionStore.getState().setActiveDragDelta(null);
        if (isOrbitControls(controls)) (controls as { enabled: boolean }).enabled = true;
        useSnapStore.getState().setActiveSnapLines([]);
      };

      // Clean up any previous drag (safety)
      if (cleanupRef.current) {
        cleanupRef.current();
      }

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      cleanupRef.current = cleanup;
    },
    [controls, getWorldPoint, setupDragPlane]
  );

  return { startGroupDrag };
}
