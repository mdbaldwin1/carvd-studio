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
import {
  getCombinedBounds,
  calculateSnapThreshold,
  detectGuideSnaps,
  createGuideSnapLine,
  detectOriginSnaps,
  createOriginSnapLine,
  detectFaceSnaps,
  detectFeatureSnaps,
  detectSnaps,
  type PartBounds
} from '../../utils/snapToPartsUtil';
import { resolveSafeTranslationDelta } from '../../utils/overlapPolicy';
import { calculateWorldHalfHeightFromDegrees } from '../../utils/mathPool';
import { snapToGrid } from './partTypes';
import { isOrbitControls } from './workspaceUtils';
import type { Part } from '../../types';
import { createAxisSnapWinners } from '../../utils/snapPriority';
import { applyGroupAxisCandidate } from '../../utils/groupDragSnapArbitration';

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

const DRAG_THRESHOLD_SQ = 25; // 5px squared

function offsetBounds(bounds: PartBounds, delta: { x: number; y: number; z: number }): PartBounds {
  return {
    ...bounds,
    minX: bounds.minX + delta.x,
    maxX: bounds.maxX + delta.x,
    minY: bounds.minY + delta.y,
    maxY: bounds.maxY + delta.y,
    minZ: bounds.minZ + delta.z,
    maxZ: bounds.maxZ + delta.z,
    centerX: bounds.centerX + delta.x,
    centerY: bounds.centerY + delta.y,
    centerZ: bounds.centerZ + delta.z
  };
}

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
  const initialBoundsRef = useRef<PartBounds | null>(null);
  const movingPartIdsRef = useRef<Set<string>>(new Set());
  const wasSnappedByPartsRef = useRef<{ x: boolean; y: boolean; z: boolean }>({ x: false, y: false, z: false });
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
      // If a selected group is being dragged, immediately pause orbit controls so
      // camera orbit doesn't steal the gesture before drag threshold is crossed.
      if (isOrbitControls(controls)) (controls as { enabled: boolean }).enabled = false;

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
          initialBoundsRef.current = bounds;
          movingPartIdsRef.current = partIdsToInclude;
          wasSnappedByPartsRef.current = { x: false, y: false, z: false };
          startPointRef.current = startPoint;

          setupDragPlane(anchor);
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
          const { liveGridSnap, snapSensitivity, snapToOrigin } = useAppSettingsStore.getState().settings;
          if (liveGridSnap) {
            newX = snapToGrid(newX);
            newZ = snapToGrid(newZ);
            newY = snapToGrid(newY);
          }

          const { parts, snapGuides } = useProjectStore.getState();
          const movingIds = movingPartIdsRef.current;
          const snapLines: import('../../types').SnapLine[] = [];
          const axisSnapWinners = createAxisSnapWinners();
          const isSnapEnabled = useSnapStore.getState().snapToPartsEnabled && !evt.altKey;

          if (isSnapEnabled && initialBoundsRef.current) {
            const cameraDistance = camera.position.distanceTo(_intersection.set(newX, newY, newZ));
            const snapThreshold = calculateSnapThreshold(cameraDistance, snapSensitivity);
            let workingDelta = {
              x: newX - anchorPosRef.current.x,
              y: newY - anchorPosRef.current.y,
              z: newZ - anchorPosRef.current.z
            };
            let movingBounds = offsetBounds(initialBoundsRef.current, workingDelta);

            if (snapGuides.length > 0) {
              const guideSnaps = detectGuideSnaps(movingBounds, snapGuides, snapThreshold);
              if (guideSnaps.x && axes.x) {
                workingDelta.x += guideSnaps.x.delta;
                const guide = snapGuides.find((g) => g.id === guideSnaps.x!.guideId);
                if (guide) {
                  movingBounds = offsetBounds(initialBoundsRef.current, workingDelta);
                  const applied = applyGroupAxisCandidate(
                    'x',
                    'guide',
                    workingDelta,
                    workingDelta.x,
                    axisSnapWinners,
                    snapLines,
                    [createGuideSnapLine(guide, movingBounds)]
                  );
                  if (!applied) {
                    movingBounds = offsetBounds(initialBoundsRef.current, workingDelta);
                  }
                }
              }
              if (guideSnaps.y && axes.y) {
                workingDelta.y += guideSnaps.y.delta;
                const guide = snapGuides.find((g) => g.id === guideSnaps.y!.guideId);
                if (guide) {
                  movingBounds = offsetBounds(initialBoundsRef.current, workingDelta);
                  const applied = applyGroupAxisCandidate(
                    'y',
                    'guide',
                    workingDelta,
                    workingDelta.y,
                    axisSnapWinners,
                    snapLines,
                    [createGuideSnapLine(guide, movingBounds)]
                  );
                  if (!applied) {
                    movingBounds = offsetBounds(initialBoundsRef.current, workingDelta);
                  }
                }
              }
              if (guideSnaps.z && axes.z) {
                workingDelta.z += guideSnaps.z.delta;
                const guide = snapGuides.find((g) => g.id === guideSnaps.z!.guideId);
                if (guide) {
                  movingBounds = offsetBounds(initialBoundsRef.current, workingDelta);
                  const applied = applyGroupAxisCandidate(
                    'z',
                    'guide',
                    workingDelta,
                    workingDelta.z,
                    axisSnapWinners,
                    snapLines,
                    [createGuideSnapLine(guide, movingBounds)]
                  );
                  if (!applied) {
                    movingBounds = offsetBounds(initialBoundsRef.current, workingDelta);
                  }
                }
              }
            }

            if (snapToOrigin) {
              const originSnaps = detectOriginSnaps(movingBounds, snapThreshold);
              if (originSnaps.x && axes.x) {
                workingDelta.x += originSnaps.x.delta;
                movingBounds = offsetBounds(initialBoundsRef.current, workingDelta);
                const applied = applyGroupAxisCandidate(
                  'x',
                  'origin',
                  workingDelta,
                  workingDelta.x,
                  axisSnapWinners,
                  snapLines,
                  [createOriginSnapLine('x', originSnaps.x.snapType, movingBounds)]
                );
                if (!applied) {
                  movingBounds = offsetBounds(initialBoundsRef.current, workingDelta);
                }
              }
              if (originSnaps.y && axes.y) {
                workingDelta.y += originSnaps.y.delta;
                movingBounds = offsetBounds(initialBoundsRef.current, workingDelta);
                const applied = applyGroupAxisCandidate(
                  'y',
                  'origin',
                  workingDelta,
                  workingDelta.y,
                  axisSnapWinners,
                  snapLines,
                  [createOriginSnapLine('y', originSnaps.y.snapType, movingBounds)]
                );
                if (!applied) {
                  movingBounds = offsetBounds(initialBoundsRef.current, workingDelta);
                }
              }
              if (originSnaps.z && axes.z) {
                workingDelta.z += originSnaps.z.delta;
                movingBounds = offsetBounds(initialBoundsRef.current, workingDelta);
                const applied = applyGroupAxisCandidate(
                  'z',
                  'origin',
                  workingDelta,
                  workingDelta.z,
                  axisSnapWinners,
                  snapLines,
                  [createOriginSnapLine('z', originSnaps.z.snapType, movingBounds)]
                );
                if (!applied) {
                  movingBounds = offsetBounds(initialBoundsRef.current, workingDelta);
                }
              }
            }

            // Axis-aligned AABB group snap against nearby parts (good baseline parity with single-part axis snaps).
            const proxyPart: Part = {
              id: 'group-proxy',
              name: 'Group Proxy',
              length: initialBoundsRef.current.maxX - initialBoundsRef.current.minX,
              width: initialBoundsRef.current.maxZ - initialBoundsRef.current.minZ,
              thickness: initialBoundsRef.current.maxY - initialBoundsRef.current.minY,
              position: {
                x: anchorPosRef.current.x + workingDelta.x,
                y: anchorPosRef.current.y + workingDelta.y,
                z: anchorPosRef.current.z + workingDelta.z
              },
              rotation: { x: 0, y: 0, z: 0 },
              stockId: null,
              grainSensitive: false,
              grainDirection: 'length',
              color: '#ffffff'
            };
            const proxyPosition = proxyPart.position;

            const faceSnapResult = detectFaceSnaps(proxyPart, proxyPosition, parts, [...movingIds], snapThreshold);
            if (axes.x && faceSnapResult.snappedX) {
              applyGroupAxisCandidate(
                'x',
                'face',
                workingDelta,
                faceSnapResult.adjustedPosition.x - anchorPosRef.current.x,
                axisSnapWinners,
                snapLines,
                faceSnapResult.snapLines.filter((line) => line.axis === 'x')
              );
            }
            if (axes.y && faceSnapResult.snappedY) {
              applyGroupAxisCandidate(
                'y',
                'face',
                workingDelta,
                faceSnapResult.adjustedPosition.y - anchorPosRef.current.y,
                axisSnapWinners,
                snapLines,
                faceSnapResult.snapLines.filter((line) => line.axis === 'y')
              );
            }
            if (axes.z && faceSnapResult.snappedZ) {
              applyGroupAxisCandidate(
                'z',
                'face',
                workingDelta,
                faceSnapResult.adjustedPosition.z - anchorPosRef.current.z,
                axisSnapWinners,
                snapLines,
                faceSnapResult.snapLines.filter((line) => line.axis === 'z')
              );
            }

            const featureProxyPosition = {
              x: anchorPosRef.current.x + workingDelta.x,
              y: anchorPosRef.current.y + workingDelta.y,
              z: anchorPosRef.current.z + workingDelta.z
            };
            const featureSnapResult = detectFeatureSnaps(
              proxyPart,
              featureProxyPosition,
              parts,
              [...movingIds],
              snapThreshold
            );
            if (axes.x && featureSnapResult.snappedX) {
              applyGroupAxisCandidate(
                'x',
                'feature',
                workingDelta,
                featureSnapResult.adjustedPosition.x - anchorPosRef.current.x,
                axisSnapWinners,
                snapLines,
                featureSnapResult.snapLines.filter((line) => line.axis === 'x')
              );
            }
            if (axes.y && featureSnapResult.snappedY) {
              applyGroupAxisCandidate(
                'y',
                'feature',
                workingDelta,
                featureSnapResult.adjustedPosition.y - anchorPosRef.current.y,
                axisSnapWinners,
                snapLines,
                featureSnapResult.snapLines.filter((line) => line.axis === 'y')
              );
            }
            if (axes.z && featureSnapResult.snappedZ) {
              applyGroupAxisCandidate(
                'z',
                'feature',
                workingDelta,
                featureSnapResult.adjustedPosition.z - anchorPosRef.current.z,
                axisSnapWinners,
                snapLines,
                featureSnapResult.snapLines.filter((line) => line.axis === 'z')
              );
            }

            const axisProxyPosition = {
              x: anchorPosRef.current.x + workingDelta.x,
              y: anchorPosRef.current.y + workingDelta.y,
              z: anchorPosRef.current.z + workingDelta.z
            };
            const snapResult = detectSnaps(proxyPart, axisProxyPosition, parts, [...movingIds], snapThreshold);
            if (axes.x && snapResult.snappedX) {
              applyGroupAxisCandidate(
                'x',
                'axis',
                workingDelta,
                snapResult.adjustedPosition.x - anchorPosRef.current.x,
                axisSnapWinners,
                snapLines,
                snapResult.snapLines.filter((line) => line.axis === 'x')
              );
            }
            if (axes.y && snapResult.snappedY) {
              applyGroupAxisCandidate(
                'y',
                'axis',
                workingDelta,
                snapResult.adjustedPosition.y - anchorPosRef.current.y,
                axisSnapWinners,
                snapLines,
                snapResult.snapLines.filter((line) => line.axis === 'y')
              );
            }
            if (axes.z && snapResult.snappedZ) {
              applyGroupAxisCandidate(
                'z',
                'axis',
                workingDelta,
                snapResult.adjustedPosition.z - anchorPosRef.current.z,
                axisSnapWinners,
                snapLines,
                snapResult.snapLines.filter((line) => line.axis === 'z')
              );
            }

            newX = anchorPosRef.current.x + workingDelta.x;
            newY = anchorPosRef.current.y + workingDelta.y;
            newZ = anchorPosRef.current.z + workingDelta.z;
          }

          const proposedDelta = {
            x: newX - anchorPosRef.current.x,
            y: newY - anchorPosRef.current.y,
            z: newZ - anchorPosRef.current.z
          };

          // Ground constraint — ensure no group part goes below ground
          const { selectedGroupIds, selectedPartIds } = useSelectionStore.getState();
          const { groupMembers, parts: allParts } = useProjectStore.getState();
          const partIds = new Set(selectedPartIds);
          for (const groupId of selectedGroupIds) {
            getAllDescendantPartIds(groupId, groupMembers).forEach((id) => partIds.add(id));
          }

          let maxYAdjustment = 0;
          for (const pid of partIds) {
            const p = allParts.find((pp) => pp.id === pid);
            if (!p) continue;
            const halfH = calculateWorldHalfHeightFromDegrees(p.rotation, p.length, p.thickness, p.width);
            const projectedY = p.position.y + proposedDelta.y;
            const adjustment = Math.max(0, halfH - projectedY);
            maxYAdjustment = Math.max(maxYAdjustment, adjustment);
          }

          proposedDelta.y += maxYAdjustment;
          useSnapStore.getState().setActiveSnapLines(snapLines);
          wasSnappedByPartsRef.current = {
            x: snapLines.some((line) => line.axis === 'x'),
            y: snapLines.some((line) => line.axis === 'y'),
            z: snapLines.some((line) => line.axis === 'z')
          };

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
        const wasSnappedByParts = wasSnappedByPartsRef.current;

        // Grid snap the final delta
        const anchor = anchorPosRef.current!;
        let newX = wasSnappedByParts.x ? anchor.x + finalDelta.x : snapToGrid(anchor.x + finalDelta.x);
        let newY = anchor.y + finalDelta.y;
        let newZ = wasSnappedByParts.z ? anchor.z + finalDelta.z : snapToGrid(anchor.z + finalDelta.z);

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

        // Overlap prevention (OBB + swept fallback)
        if (stockConstraints.preventOverlap) {
          const safeDelta = resolveSafeTranslationDelta(parts, partIds, snappedDelta);
          if (!safeDelta) {
            // Revert — don't commit the move
            cleanup();
            return;
          }
          snappedDelta.x = safeDelta.x;
          snappedDelta.y = safeDelta.y;
          snappedDelta.z = safeDelta.z;
        }

        // Commit the move
        const moveSelectedParts = useProjectStore.getState().moveSelectedParts;
        moveSelectedParts(snappedDelta);
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
        initialBoundsRef.current = null;
        movingPartIdsRef.current = new Set();
        wasSnappedByPartsRef.current = { x: false, y: false, z: false };
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
      window.addEventListener('pointercancel', handleUp);
      window.addEventListener('blur', handleUp);
      cleanupRef.current = cleanup;
    },
    [camera.position, controls, getWorldPoint, setupDragPlane]
  );

  return { startGroupDrag };
}
