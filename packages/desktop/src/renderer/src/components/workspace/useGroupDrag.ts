/**
 * useGroupDrag — handles drag of an already-selected group directly from InstancedMesh.
 *
 * When the user clicks on a part within a group that's already selected, this hook
 * manages the drag lifecycle (threshold → drag → drop) entirely at the InstancedMesh level.
 * No individual Part pop-out is needed since the group acts as a single entity.
 */
import { useCallback, useRef } from 'react';
import * as THREE from 'three';
import { useProjectStore } from '../../store/projectStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useSnapStore } from '../../store/snapStore';
import { useAppSettingsStore } from '../../store/appSettingsStore';
import { useInteractionStore } from '../../store/interactionStore';
import { getCombinedBounds, calculateSnapThreshold, type PartBounds } from '../../utils/snapToPartsUtil';
import { snapToGrid } from './partTypes';
import { isOrbitControls } from './workspaceUtils';
import type { Part } from '../../types';
import { dragDebug } from '../../utils/dragDebug';
import { resolveConstrainedMoveDelta, resolveMoveSelection } from '../../utils/interactionMovement';
import {
  createGroupMoveCommitPreview,
  createGroupMoveCommitState,
  groupMoveTool,
  type GroupMoveToolState
} from '../../interaction/tools/groupMoveTool';
import { applyCommitInstructions } from '../../interaction/tools/toolSolver';
import {
  beginMoveInteractionSession,
  clearMoveInteractionPreview,
  publishMoveInteractionPreview
} from '../../utils/interactionSession';
import { resolveReferenceEntities, resolveSelectionEntities } from '../../utils/interactionSelection';
import { referenceRelationToIndicator, solveMoveReferencePreview } from '../../utils/referenceRelations';

// Pre-allocated objects — reused every frame, zero GC pressure
const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _raycaster = new THREE.Raycaster();
const _vec2 = new THREE.Vector2();
const _intersection = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _groupEuler = new THREE.Euler();
const _groupQuat = new THREE.Quaternion();
const _groupLocalX = new THREE.Vector3();
const _groupLocalY = new THREE.Vector3();
const _groupLocalZ = new THREE.Vector3();
const _groupProjected = new THREE.Vector3();
const _groupProjectedV = new THREE.Vector3();

const DRAG_THRESHOLD_SQ = 25; // 5px squared

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
  const groupMoveToolStateRef = useRef<GroupMoveToolState | null>(null);
  const planeAxesRef = useRef<{ x: boolean; y: boolean; z: boolean }>({ x: true, y: false, z: true });
  const planeBasisURef = useRef(new THREE.Vector3(1, 0, 0));
  const planeBasisVRef = useRef(new THREE.Vector3(0, 0, 1));
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
    (anchorPos: THREE.Vector3, orientationQuat?: THREE.Quaternion) => {
      _forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
      _normal.copy(_forward).normalize();
      _plane.setFromNormalAndCoplanarPoint(_normal, anchorPos);

      const quat = orientationQuat ?? _groupQuat.identity();
      const localAxes = [
        _groupLocalX.set(1, 0, 0).applyQuaternion(quat).normalize(),
        _groupLocalY.set(0, 1, 0).applyQuaternion(quat).normalize(),
        _groupLocalZ.set(0, 0, 1).applyQuaternion(quat).normalize()
      ];

      const projected = localAxes
        .map((axis) => {
          _groupProjected.copy(axis).addScaledVector(_normal, -axis.dot(_normal));
          const len = _groupProjected.length();
          if (len < 1e-5) return null;
          _groupProjected.multiplyScalar(1 / len);
          return { axis: _groupProjected.clone(), score: len };
        })
        .filter((entry): entry is { axis: THREE.Vector3; score: number } => entry !== null)
        .sort((a, b) => b.score - a.score);

      if (projected.length >= 2) {
        planeBasisURef.current.copy(projected[0].axis);
        let second = projected[1].axis;
        for (let i = 1; i < projected.length; i += 1) {
          if (Math.abs(projected[i].axis.dot(planeBasisURef.current)) < 0.98) {
            second = projected[i].axis;
            break;
          }
        }
        _groupProjectedV.copy(second);
        const uv = _groupProjectedV.dot(planeBasisURef.current);
        _groupProjectedV.addScaledVector(planeBasisURef.current, -uv);
        if (_groupProjectedV.lengthSq() < 1e-8) {
          _groupProjectedV.copy(_normal).cross(planeBasisURef.current);
        }
        planeBasisVRef.current.copy(_groupProjectedV).normalize();
      } else {
        planeBasisURef.current.set(1, 0, 0);
        if (Math.abs(planeBasisURef.current.dot(_normal)) > 0.95) {
          planeBasisURef.current.set(0, 1, 0);
        }
        planeBasisURef.current.addScaledVector(_normal, -planeBasisURef.current.dot(_normal)).normalize();
        planeBasisVRef.current.copy(_normal).cross(planeBasisURef.current).normalize();
      }

      planeAxesRef.current = { x: true, y: true, z: true };
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
          const { selectedGroupIds, selectedPartIds, editingGroupId } = useSelectionStore.getState();
          const { groupMembers, parts } = useProjectStore.getState();
          const moveSelection = resolveMoveSelection(
            {
              selectedPartIds,
              selectedGroupIds,
              editingGroupId
            },
            parts,
            groupMembers
          );
          const groupParts = moveSelection.affectedParts;
          if (groupParts.length === 0) {
            cleanup();
            return;
          }
          const bounds = getCombinedBounds(groupParts);
          const anchor = new THREE.Vector3(
            moveSelection.anchorPosition.x,
            moveSelection.anchorPosition.y,
            moveSelection.anchorPosition.z
          );
          anchorPosRef.current = anchor;
          initialBoundsRef.current = bounds;
          movingPartIdsRef.current = new Set(moveSelection.affectedPartIds);
          beginMoveInteractionSession({
            affectedPartIds: moveSelection.affectedPartIds,
            primaryPartId: groupParts[0]?.id ?? null
          });
          wasSnappedByPartsRef.current = { x: false, y: false, z: false };
          startPointRef.current = startPoint;
          dragDebug('groupDrag:start', {
            anchorPos: { x: anchor.x, y: anchor.y, z: anchor.z },
            movingPartIds: moveSelection.affectedPartIds
          });
          let closestPart: Part | null = null;
          let bestDistSq = Number.POSITIVE_INFINITY;
          for (const gp of groupParts) {
            const dxp = gp.position.x - worldPoint.x;
            const dyp = gp.position.y - worldPoint.y;
            const dzp = gp.position.z - worldPoint.z;
            const distSq = dxp * dxp + dyp * dyp + dzp * dzp;
            if (distSq < bestDistSq) {
              bestDistSq = distSq;
              closestPart = gp;
            }
          }
          if (closestPart) {
            _groupEuler.set(
              (closestPart.rotation.x * Math.PI) / 180,
              (closestPart.rotation.y * Math.PI) / 180,
              (closestPart.rotation.z * Math.PI) / 180,
              'XYZ'
            );
            _groupQuat.setFromEuler(_groupEuler);
            setupDragPlane(anchor, _groupQuat);
          } else {
            setupDragPlane(anchor);
          }
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
          const delta = _groupProjected.copy(currentPoint).sub(startPointRef.current);
          let uAmount = delta.dot(planeBasisURef.current);
          let vAmount = delta.dot(planeBasisVRef.current);

          const settings = useAppSettingsStore.getState().settings;
          if (settings.liveGridSnap) {
            // Quantize along virtual group drag basis instead of world axes.
            uAmount = snapToGrid(uAmount);
            vAmount = snapToGrid(vAmount);
          }

          const projectedDelta = _groupProjectedV
            .copy(planeBasisURef.current)
            .multiplyScalar(uAmount)
            .add(_groupProjected.copy(planeBasisVRef.current).multiplyScalar(vAmount));

          let newX = anchorPosRef.current.x + projectedDelta.x;
          let newY = anchorPosRef.current.y + projectedDelta.y;
          let newZ = anchorPosRef.current.z + projectedDelta.z;

          // Grid snap
          const { snapSensitivity } = settings;
          // Grid snap already applied in virtual basis space above.

          const { parts, snapGuides } = useProjectStore.getState();
          const movingIds = movingPartIdsRef.current;
          const isSnapEnabled = useSnapStore.getState().snapToPartsEnabled && !evt.altKey;
          let snapLines: import('../../types').SnapLine[] = [];

          if (isSnapEnabled && initialBoundsRef.current) {
            const cameraDistance = camera.position.distanceTo(_intersection.set(newX, newY, newZ));
            const snapThreshold = calculateSnapThreshold(cameraDistance, snapSensitivity);
            const workingDelta = {
              x: newX - anchorPosRef.current.x,
              y: newY - anchorPosRef.current.y,
              z: newZ - anchorPosRef.current.z
            };
            const movingParts = parts.filter((part) => movingIds.has(part.id));
            const toolInput = {
              initialBounds: initialBoundsRef.current,
              anchorPosition: anchorPosRef.current,
              delta: workingDelta,
              axes,
              referenceParts: parts,
              movingParts,
              snapGuides,
              settings,
              snapThreshold
            };
            if (!groupMoveToolStateRef.current) {
              groupMoveToolStateRef.current = groupMoveTool.begin(toolInput);
            }
            const toolResult = groupMoveTool.update(toolInput, groupMoveToolStateRef.current);
            groupMoveToolStateRef.current = toolResult.state;
            const preview = toolResult.preview;
            newX = anchorPosRef.current.x + preview.delta.x;
            newY = anchorPosRef.current.y + preview.delta.y;
            newZ = anchorPosRef.current.z + preview.delta.z;
            snapLines = preview.snapLines;
            wasSnappedByPartsRef.current = preview.snappedAxes;
          } else {
            groupMoveToolStateRef.current = null;
          }

          const proposedDelta = {
            x: newX - anchorPosRef.current.x,
            y: newY - anchorPosRef.current.y,
            z: newZ - anchorPosRef.current.z
          };

          // Ground constraint — ensure no group part goes below ground
          const { selectedGroupIds, selectedPartIds, editingGroupId } = useSelectionStore.getState();
          const { groupMembers, parts: allParts, stockConstraints } = useProjectStore.getState();
          const partIds = new Set(
            resolveMoveSelection(
              {
                selectedPartIds,
                selectedGroupIds,
                editingGroupId
              },
              allParts,
              groupMembers
            ).affectedPartIds
          );

          const constrainedPreview = resolveConstrainedMoveDelta(allParts, partIds, proposedDelta, {
            preventOverlap: stockConstraints.preventOverlap,
            fallbackDeltaOnOverlap: lastDragPosRef.current ?? { x: 0, y: 0, z: 0 }
          });
          proposedDelta.x = constrainedPreview.delta.x;
          proposedDelta.y = constrainedPreview.delta.y;
          proposedDelta.z = constrainedPreview.delta.z;

          if (constrainedPreview.overlapBlocked) {
            dragDebug('groupDrag:move:overlapBlocked', {
              requestedDelta: proposedDelta,
              fallbackDelta: constrainedPreview.delta
            });
          } else if (constrainedPreview.overlapClamped) {
            dragDebug('groupDrag:move:overlapClamped', {
              requestedDelta: proposedDelta,
              safeDelta: constrainedPreview.delta
            });
          }
          if (snapLines.length > 0) {
            dragDebug('groupDrag:move:snaps', {
              delta: proposedDelta,
              snapLineTypes: snapLines.map((l) => l.type),
              snappedAxes: {
                x: wasSnappedByPartsRef.current.x,
                y: wasSnappedByPartsRef.current.y,
                z: wasSnappedByPartsRef.current.z
              }
            });
          }

          let referenceDistances: import('../../types').ReferenceDistanceIndicator[] = [];
          let referenceState:
            | {
                selectionEntities?: import('../../utils/interactionSelection').InteractionSelectionEntity[];
                referenceEntities?: import('../../utils/interactionSelection').InteractionSelectionEntity[];
                candidateRelations?: import('../../utils/referenceRelations').ReferenceRelation[];
                activeRelationId?: string | null;
                latchedAxis?: 'x' | 'y' | 'z' | null;
              }
            | undefined;

          const currentReferenceIds = useSnapStore.getState().referencePartIds;
          const currentActiveReferenceState = useInteractionStore.getState().activeSession?.referenceState ?? null;
          if (currentReferenceIds.length > 0) {
            const referenceEntities = resolveReferenceEntities(currentReferenceIds, groupMembers);
            const selectionEntities = resolveSelectionEntities(
              {
                selectedPartIds,
                selectedGroupIds
              },
              groupMembers
            )
              .map((entity) => ({
                ...entity,
                partIds: entity.partIds.filter((id) => !currentReferenceIds.includes(id))
              }))
              .filter((entity) => entity.partIds.length > 0);

            if (selectionEntities.length > 0 && referenceEntities.length > 0) {
              const relationPreview = solveMoveReferencePreview({
                selectionEntities,
                referenceEntities,
                parts: allParts,
                movingPartIds: [...partIds],
                delta: proposedDelta,
                preferredAxis: currentActiveReferenceState?.latchedAxis ?? null,
                latchedRelationId: currentActiveReferenceState?.activeRelationId ?? null,
                latchedAxis: currentActiveReferenceState?.latchedAxis ?? null
              });

              if (relationPreview.axisAligned && relationPreview.relations.length > 0) {
                referenceDistances = relationPreview.relations.map(referenceRelationToIndicator);
                referenceState = {
                  selectionEntities,
                  referenceEntities,
                  candidateRelations: relationPreview.relations,
                  activeRelationId: relationPreview.activeRelation?.id ?? null,
                  latchedAxis: relationPreview.activeRelation?.axis ?? null
                };
              }
            }
          }

          lastDragPosRef.current = proposedDelta;
          publishMoveInteractionPreview({
            delta: proposedDelta,
            snapLines,
            referenceDistances,
            referenceState,
            publishSelectionDragDelta: true
          });
          if (snapLines.length === 0) {
            wasSnappedByPartsRef.current = { x: false, y: false, z: false };
          }
        });
      };

      const handleUp = () => {
        if (!dragStarted || !lastDragPosRef.current) {
          // Click without drag — clean up
          cleanup();
          return;
        }

        const finalDelta = { ...lastDragPosRef.current };
        const anchor = anchorPosRef.current!;
        let newX = anchor.x + finalDelta.x;
        let newY = anchor.y + finalDelta.y;
        let newZ = anchor.z + finalDelta.z;

        const snappedDelta = {
          x: newX - anchor.x,
          y: newY - anchor.y,
          z: newZ - anchor.z
        };
        dragDebug('groupDrag:release:start', {
          finalDelta,
          snappedDelta
        });

        // Ground constraint on final position
        const { selectedGroupIds, selectedPartIds, editingGroupId } = useSelectionStore.getState();
        const { groupMembers, parts, stockConstraints } = useProjectStore.getState();
        const partIds = new Set(
          resolveMoveSelection(
            {
              selectedPartIds,
              selectedGroupIds,
              editingGroupId
            },
            parts,
            groupMembers
          ).affectedPartIds
        );

        const constrainedRelease = resolveConstrainedMoveDelta(parts, partIds, snappedDelta, {
          preventOverlap: stockConstraints.preventOverlap,
          fallbackDeltaOnOverlap: finalDelta
        });

        if (constrainedRelease.overlapBlocked) {
          dragDebug('groupDrag:release:noSafeDelta', {
            requestedDelta: snappedDelta,
            fallbackToPreviewDelta: constrainedRelease.delta
          });
        } else if (constrainedRelease.overlapClamped) {
          dragDebug('groupDrag:release:safeDelta', {
            requestedDelta: snappedDelta,
            safeDelta: constrainedRelease.delta
          });
        }
        snappedDelta.x = constrainedRelease.delta.x;
        snappedDelta.y = constrainedRelease.delta.y;
        snappedDelta.z = constrainedRelease.delta.z;

        const commitState =
          groupMoveToolStateRef.current ??
          createGroupMoveCommitState({
            fallbackParts: parts,
            affectedPartIds: partIds
          });
        const commitPreview = createGroupMoveCommitPreview({
          delta: snappedDelta,
          state: commitState,
          snappedAxes: wasSnappedByPartsRef.current
        });
        const { batchUpdateParts, updatePart } = useProjectStore.getState();
        dragDebug('groupDrag:release:commit', { snappedDelta });
        applyCommitInstructions(groupMoveTool.commit(commitState, commitPreview), { updatePart, batchUpdateParts });
        cleanup();
      };

      const resetGroupDragRefs = () => {
        dragActiveRef.current = false;
        startPointRef.current = null;
        anchorPosRef.current = null;
        initialBoundsRef.current = null;
        movingPartIdsRef.current = new Set();
        wasSnappedByPartsRef.current = { x: false, y: false, z: false };
        groupMoveToolStateRef.current = null;
        lastDragPosRef.current = null;
        if (rafIdRef.current !== null) {
          window.cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        latestEventRef.current = null;
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleUp);
        window.removeEventListener('blur', handleUp);
        cleanupRef.current = null;
        resetGroupDragRefs();
        clearMoveInteractionPreview({
          clearSelectionDragDelta: true,
          clearReferenceDistances: false
        });
        if (isOrbitControls(controls)) (controls as { enabled: boolean }).enabled = true;
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
