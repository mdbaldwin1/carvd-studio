/**
 * useGroupDrag handles drag of a selected group from InstancedMesh.
 */
import { useCallback, useRef } from 'react';
import * as THREE from 'three';
import type { Part, SnapLine } from '../../types';
import { useProjectStore, getAllDescendantPartIds } from '../../store/projectStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useSnapStore } from '../../store/snapStore';
import { useAppSettingsStore } from '../../store/appSettingsStore';
import {
  getCombinedBounds,
  getPartBoundsAtPosition,
  detectSnaps,
  calculateSnapThreshold,
  type PartBounds
} from '../../utils/snapToPartsUtil';
import { calculateWorldHalfHeightFromDegrees } from '../../utils/mathPool';
import { resolveSafeTranslationDelta } from '../../utils/overlapPolicy';
import { snapToGrid } from './partTypes';
import { isOrbitControls } from './workspaceUtils';

const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _raycaster = new THREE.Raycaster();
const _vec2 = new THREE.Vector2();
const _intersection = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _axisX = new THREE.Vector3(1, 0, 0);
const _axisY = new THREE.Vector3(0, 1, 0);
const _axisZ = new THREE.Vector3(0, 0, 1);

const DRAG_THRESHOLD_SQ = 25;

function axisBounds(bounds: PartBounds, axis: 'x' | 'y' | 'z') {
  if (axis === 'x') return { min: bounds.minX, max: bounds.maxX, center: bounds.centerX, size: bounds.maxX - bounds.minX };
  if (axis === 'y') return { min: bounds.minY, max: bounds.maxY, center: bounds.centerY, size: bounds.maxY - bounds.minY };
  return { min: bounds.minZ, max: bounds.maxZ, center: bounds.centerZ, size: bounds.maxZ - bounds.minZ };
}

function createBboxAnchorLine(axis: 'x' | 'y' | 'z', value: number, subtype: string, bounds: PartBounds): SnapLine {
  if (axis === 'x') {
    return {
      axis,
      type: 'edge',
      family: 'surface-fraction',
      subtype,
      state: 'winner',
      start: { x: value, y: bounds.minY - 4, z: bounds.centerZ },
      end: { x: value, y: bounds.maxY + 4, z: bounds.centerZ },
      snapValue: value
    };
  }
  if (axis === 'y') {
    return {
      axis,
      type: 'edge',
      family: 'surface-fraction',
      subtype,
      state: 'winner',
      start: { x: bounds.minX - 4, y: value, z: bounds.centerZ },
      end: { x: bounds.maxX + 4, y: value, z: bounds.centerZ },
      snapValue: value
    };
  }
  return {
    axis,
    type: 'edge',
    family: 'surface-fraction',
    subtype,
    state: 'winner',
    start: { x: bounds.centerX, y: bounds.minY - 4, z: value },
    end: { x: bounds.centerX, y: bounds.maxY + 4, z: value },
    snapValue: value
  };
}

export function useGroupDrag(
  camera: THREE.Camera,
  gl: THREE.WebGLRenderer,
  controls: THREE.EventDispatcher<object> | null
): {
  startGroupDrag: (worldPoint: THREE.Vector3, screenX: number, screenY: number) => void;
} {
  const rafIdRef = useRef<number | null>(null);
  const latestEventRef = useRef<PointerEvent | null>(null);

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
      const startPoint = worldPoint.clone();
      let dragStarted = false;

      const handleMove = (e: PointerEvent) => {
        // Safety: if button is no longer held and we missed pointerup, abort stale listeners.
        if (e.buttons === 0) {
          handleUp();
          return;
        }

        if (!dragStarted) {
          const dx = e.clientX - screenX;
          const dy = e.clientY - screenY;
          if (dx * dx + dy * dy < DRAG_THRESHOLD_SQ) return;

          dragStarted = true;
          dragActiveRef.current = true;

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

          const {
            liveGridSnap,
            snapSensitivity,
            enableLayoutSnaps,
            enableEqualSpacingSnap,
            enableDistributionSnap,
            enablePatternSnap,
            enableAxisLegacySnaps,
            showSnapCandidates
          } = useAppSettingsStore.getState().settings;

          if (liveGridSnap) {
            newX = snapToGrid(newX);
            newZ = snapToGrid(newZ);
            newY = snapToGrid(newY);
          }

          const { selectedGroupIds, selectedPartIds } = useSelectionStore.getState();
          const { groupMembers, parts, stockConstraints } = useProjectStore.getState();
          const partIds = new Set(selectedPartIds);
          for (const groupId of selectedGroupIds) {
            getAllDescendantPartIds(groupId, groupMembers).forEach((id) => partIds.add(id));
          }

          const snapLines: SnapLine[] = [];
          if ((enableAxisLegacySnaps ?? true) && useSnapStore.getState().snapToPartsEnabled && !evt.altKey) {
            const groupBounds = getCombinedBounds(parts.filter((p) => partIds.has(p.id)));
            const proxyPart: Part = {
              id: 'group-proxy',
              name: 'Group Proxy',
              length: groupBounds.maxX - groupBounds.minX,
              width: groupBounds.maxZ - groupBounds.minZ,
              thickness: groupBounds.maxY - groupBounds.minY,
              position: { x: newX, y: newY, z: newZ },
              rotation: { x: 0, y: 0, z: 0 },
              stockId: null,
              grainSensitive: false,
              grainDirection: 'length',
              color: '#ffffff'
            };
            const snapThreshold = calculateSnapThreshold(camera.position.distanceTo(_intersection), snapSensitivity);
            const proxyBounds = getPartBoundsAtPosition(proxyPart, proxyPart.position);

            const applyBBoxAxisSnap = (axis: 'x' | 'y' | 'z') => {
              if (!axes[axis]) return;
              let bestDelta = Number.POSITIVE_INFINITY;
              let bestValue: number | null = null;
              let bestSubtype = 'fraction-50';
              let bestTargetBounds: PartBounds | null = null;
              const drag = axisBounds(proxyBounds, axis);
              const dragAnchors = [drag.min, drag.center, drag.max];

              for (const target of parts) {
                if (partIds.has(target.id)) continue;
                const tb = getPartBoundsAtPosition(target, target.position);
                const t = axisBounds(tb, axis);
                const targetAnchors = [
                  { value: t.min, subtype: 'fraction-0' },
                  { value: t.min + t.size * 0.25, subtype: 'fraction-25' },
                  { value: t.center, subtype: 'fraction-50' },
                  { value: t.min + t.size * 0.75, subtype: 'fraction-75' },
                  { value: t.max, subtype: 'fraction-100' }
                ];
                for (const d of dragAnchors) {
                  for (const ta of targetAnchors) {
                    const delta = ta.value - d;
                    const distance = Math.abs(delta);
                    if (distance < bestDelta && distance <= snapThreshold) {
                      bestDelta = distance;
                      bestValue = axis === 'x' ? newX + delta : axis === 'y' ? newY + delta : newZ + delta;
                      bestSubtype = ta.subtype;
                      bestTargetBounds = tb;
                    }
                  }
                }
              }

              if (bestValue === null || !bestTargetBounds) return;
              if (axis === 'x') newX = bestValue;
              if (axis === 'y') newY = bestValue;
              if (axis === 'z') newZ = bestValue;
              snapLines.push(createBboxAnchorLine(axis, bestValue, bestSubtype, bestTargetBounds));
            };

            applyBBoxAxisSnap('x');
            applyBBoxAxisSnap('y');
            applyBBoxAxisSnap('z');

            const xEdge = snapLines.find((l) => l.axis === 'x' && (l.subtype === 'fraction-0' || l.subtype === 'fraction-100'));
            const zEdge = snapLines.find((l) => l.axis === 'z' && (l.subtype === 'fraction-0' || l.subtype === 'fraction-100'));
            if (xEdge && zEdge) {
              xEdge.subtype = 'corner-anchor';
              zEdge.subtype = 'corner-anchor';
            }

            const snapResult = detectSnaps(proxyPart, proxyPart.position, parts, [...partIds], snapThreshold, {
              enableLayoutSnaps: enableLayoutSnaps ?? true,
              enableEqualSpacingSnap: enableEqualSpacingSnap ?? true,
              enableDistributionSnap: enableDistributionSnap ?? true,
              enablePatternSnap: enablePatternSnap ?? true
            });
            if (axes.x && snapResult.snappedX) newX = snapResult.adjustedPosition.x;
            if (axes.y && snapResult.snappedY) newY = snapResult.adjustedPosition.y;
            if (axes.z && snapResult.snappedZ) newZ = snapResult.adjustedPosition.z;
            snapLines.push(...snapResult.snapLines.map((line) => ({ ...line, state: 'winner' as const })));
          }

          let proposedDelta = {
            x: newX - anchorPosRef.current.x,
            y: newY - anchorPosRef.current.y,
            z: newZ - anchorPosRef.current.z
          };

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

          // Enforce overlap prevention during drag previews (not only on release)
          // so grouped angled assemblies don't visually pass through other parts.
          if (stockConstraints.preventOverlap) {
            const safeDelta = resolveSafeTranslationDelta(parts, partIds, proposedDelta);
            if (!safeDelta) {
              return;
            }
            proposedDelta = safeDelta;
            newX = anchorPosRef.current.x + proposedDelta.x;
            newY = anchorPosRef.current.y + proposedDelta.y;
            newZ = anchorPosRef.current.z + proposedDelta.z;
          }

          const candidateLines =
            showSnapCandidates || evt.shiftKey ? snapLines.map((line) => ({ ...line, state: 'candidate' as const })) : [];
          useSnapStore.getState().setActiveSnapLines([...snapLines, ...candidateLines]);
          useSnapStore.getState().setSnapLabelPosition({ x: newX, y: newY, z: newZ });

          lastDragPosRef.current = proposedDelta;
          useSelectionStore.getState().setActiveDragDelta(proposedDelta);
        });
      };

      const handleUp = () => {
        if (!dragStarted || !lastDragPosRef.current) {
          cleanup();
          return;
        }

        const finalDelta = { ...lastDragPosRef.current };

        const anchor = anchorPosRef.current!;
        let newX = snapToGrid(anchor.x + finalDelta.x);
        let newY = anchor.y + finalDelta.y;
        let newZ = snapToGrid(anchor.z + finalDelta.z);

        const snappedDelta = {
          x: newX - anchor.x,
          y: newY - anchor.y,
          z: newZ - anchor.z
        };

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

        if (stockConstraints.preventOverlap) {
          const safeDelta = resolveSafeTranslationDelta(parts, partIds, snappedDelta);
          if (!safeDelta) {
            cleanup();
            return;
          }
          snappedDelta.x = safeDelta.x;
          snappedDelta.y = safeDelta.y;
          snappedDelta.z = safeDelta.z;
        }

        useProjectStore.getState().moveSelectedParts(snappedDelta);
        cleanup();
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleUp);
        window.removeEventListener('blur', handleUp);
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
        useSnapStore.getState().setSnapLabelPosition(null);
      };

      if (cleanupRef.current) {
        cleanupRef.current();
      }

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('pointercancel', handleUp);
      window.addEventListener('blur', handleUp);
      cleanupRef.current = cleanup;
    },
    [camera, controls, getWorldPoint, setupDragPlane]
  );

  return { startGroupDrag };
}
