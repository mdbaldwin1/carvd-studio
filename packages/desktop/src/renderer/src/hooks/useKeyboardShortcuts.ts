import { useEffect } from 'react';
import * as THREE from 'three';
import { useProjectStore } from '../store/projectStore';
import { useWorkspaceSceneGraph } from '../interaction/useWorkspaceSceneGraph';
import { useClipboardStore } from '../store/clipboardStore';
import { useSelectionStore } from '../store/selectionStore';
import { useSnapStore } from '../store/snapStore';
import { usePartCutsEditingStore } from '../store/partCutsEditingStore';
import { useUIStore } from '../store/uiStore';
import { useCameraStore } from '../store/cameraStore';
import { getContainingGroupId } from '../utils/interactionSelection';
import { Rotation3D } from '../types';
import { rotationTool } from '../interaction/tools/rotationTool';
import { applyCommitInstructions } from '../interaction/tools/toolSolver';
import { resolveRotateBatchGrounding } from '../utils/interactionMovement';

export function useKeyboardShortcuts() {
  const isEditingPartCuts = usePartCutsEditingStore((s) => s.isEditingPartCuts);
  const selectedPartIds = useSelectionStore((s) => s.selectedPartIds);
  const parts = useProjectStore((s) => s.parts);
  const gridSize = useProjectStore((s) => s.gridSize);
  const requestDeleteParts = useUIStore((s) => s.requestDeleteParts);
  const requestDeleteGroups = useUIStore((s) => s.requestDeleteGroups);
  const duplicateSelectedParts = useProjectStore((s) => s.duplicateSelectedParts);
  const updatePart = useProjectStore((s) => s.updatePart);
  const batchUpdateParts = useProjectStore((s) => s.batchUpdateParts);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const copySelectedParts = useClipboardStore((s) => s.copySelectedParts);
  const pasteClipboard = useClipboardStore((s) => s.pasteClipboard);
  const moveSelectedParts = useProjectStore((s) => s.moveSelectedParts);
  const requestCenterCamera = useCameraStore((s) => s.requestCenterCamera);
  const requestCenterCameraAtOrigin = useCameraStore((s) => s.requestCenterCameraAtOrigin);
  const cameraViewVectors = useCameraStore((s) => s.cameraViewVectors);
  const toggleReference = useSnapStore((s) => s.toggleReference);
  const clearReferences = useSnapStore((s) => s.clearReferences);
  const referencePartIds = useSnapStore((s) => s.referencePartIds);
  const groupMembers = useProjectStore((s) => s.groupMembers);
  const groups = useProjectStore((s) => s.groups);
  // ADR-008: read group descendants from the scene graph adapter.
  const sceneGraph = useWorkspaceSceneGraph();
  const selectedGroupIds = useSelectionStore((s) => s.selectedGroupIds);
  const editingGroupId = useSelectionStore((s) => s.editingGroupId);
  const createGroup = useProjectStore((s) => s.createGroup);
  const deleteGroup = useProjectStore((s) => s.deleteGroup);
  const exitGroup = useSelectionStore((s) => s.exitGroup);
  const addPart = useProjectStore((s) => s.addPart);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Part Cuts mode owns its own editing surface. The source part stays
      // selected behind the workspace, so project-level shortcuts (undo,
      // rotate, duplicate, delete, copy/paste) would silently edit it.
      if (isEditingPartCuts) return;

      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Calculate effective selected parts (directly selected + parts from selected groups)
      const effectivePartIds = new Set(selectedPartIds);
      for (const groupId of selectedGroupIds) {
        const groupPartIds = sceneGraph.descendantPartIds(groupId);
        groupPartIds.forEach((id) => effectivePartIds.add(id));
      }

      const selectedParts = parts.filter((p) => effectivePartIds.has(p.id));
      const hasSelection = selectedPartIds.length > 0 || selectedGroupIds.length > 0;

      // Helper to rotate all selected parts (including group members) around a world axis
      // When multiple parts are selected, they rotate around their collective center
      // Uses quaternion math to correctly handle parts with existing rotations
      const rotateAxis = (axis: 'x' | 'y' | 'z') => {
        if (selectedParts.length === 0) return;

        // Create the world rotation quaternion (90 degrees around the specified axis)
        const worldRotationQuat = new THREE.Quaternion();
        if (axis === 'x') {
          worldRotationQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
        } else if (axis === 'y') {
          worldRotationQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
        } else {
          worldRotationQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
        }

        // For single part selection, just rotate in place (around its own center)
        if (selectedParts.length === 1) {
          const part = selectedParts[0];
          const input = { part, axis, degrees: 90, space: 'world' as const };
          const state = rotationTool.begin(input);
          const { preview } = rotationTool.update(input, state);

          applyCommitInstructions(rotationTool.commit(state, preview), { updatePart });
          return;
        }

        // For multiple parts (e.g., a group), rotate around the group center
        // Calculate the center of all selected parts
        let centerX = 0,
          centerY = 0,
          centerZ = 0;
        for (const part of selectedParts) {
          centerX += part.position.x;
          centerY += part.position.y;
          centerZ += part.position.z;
        }
        centerX /= selectedParts.length;
        centerY /= selectedParts.length;
        centerZ /= selectedParts.length;

        const center = new THREE.Vector3(centerX, centerY, centerZ);

        // Calculate all updates first, then batch them
        const updates: Array<{
          id: string;
          changes: {
            position: { x: number; y: number; z: number };
            rotation: Rotation3D;
          };
        }> = [];

        for (const part of selectedParts) {
          // 1. Rotate position around the group center
          const position = new THREE.Vector3(part.position.x, part.position.y, part.position.z);
          const offset = position.clone().sub(center);
          offset.applyQuaternion(worldRotationQuat);
          const newPosition = center.clone().add(offset);

          // 2. Rotate the part's own orientation around world axis
          const input = { part, axis, degrees: 90, space: 'world' as const };
          const state = rotationTool.begin(input);
          const { preview } = rotationTool.update(input, state);

          updates.push({
            id: part.id,
            changes: {
              position: {
                x: newPosition.x,
                y: newPosition.y,
                z: newPosition.z
              },
              rotation: preview.rotation
            }
          });
        }

        // ADR-006: ground clamp runs through the constraint pipeline. For
        // the 'rotate' candidate kind, `groundConstraint.apply` lifts every
        // part uniformly by the deepest dip — same semantics as the legacy
        // inline loop, now shared with every other transform path.
        const grounded = resolveRotateBatchGrounding({
          startingParts: selectedParts,
          projectParts: parts,
          groupMembers,
          updates: updates.map((u) => ({
            partId: u.id,
            position: u.changes.position,
            rotation: u.changes.rotation
          }))
        });

        for (let i = 0; i < updates.length; i++) {
          const adjusted = grounded.updates.find((u) => u.partId === updates[i].id);
          if (adjusted) {
            updates[i].changes.position = adjusted.position;
          }
        }

        // Apply all updates in a single batch (single undo entry)
        batchUpdateParts(updates);
      };

      // Handle Ctrl/Cmd shortcuts
      const isMod = e.metaKey || e.ctrlKey;

      if (isMod) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              // Cmd+Shift+Z = Redo
              useProjectStore.temporal.getState().redo();
            } else {
              // Cmd+Z = Undo
              useProjectStore.temporal.getState().undo();
            }
            return;

          case 'y':
            // Cmd+Y = Redo (Windows style)
            e.preventDefault();
            useProjectStore.temporal.getState().redo();
            return;

          case 'c':
            // Copy selected parts
            if (hasSelection) {
              e.preventDefault();
              copySelectedParts();
            }
            return;

          case 'v':
            // Paste from clipboard
            e.preventDefault();
            pasteClipboard();
            return;

          case 'a':
            // Select all parts
            e.preventDefault();
            useSelectionStore.getState().selectParts(parts.map((p) => p.id));
            return;

          case 'g':
            // Cmd+Shift+G = Ungroup selected parts
            if (e.shiftKey && hasSelection) {
              e.preventDefault();
              // Find the containing group of selected parts
              const selectedPartsGroupIds = selectedPartIds.map((id) => getContainingGroupId(id, groupMembers));
              const uniqueGroupIds = [
                ...new Set([...selectedPartsGroupIds.filter((id): id is string => id !== null), ...selectedGroupIds])
              ];
              // Ungroup each containing group
              for (const groupId of uniqueGroupIds) {
                deleteGroup(groupId, 'ungroup');
              }
            }
            return;
        }
      }

      switch (e.key.toLowerCase()) {
        case 'x':
          // X = Rotate 90 degrees around X-axis
          if (hasSelection) {
            rotateAxis('x');
          }
          break;

        case 'y':
          // Y = Rotate 90 degrees around Y-axis
          if (hasSelection) {
            rotateAxis('y');
          }
          break;

        case 'r':
          // R = Toggle reference parts for snapping. Uses `effectivePartIds`
          // (which expands selected groups to their descendant parts) so that
          // clicking a part inside a group — which auto-selects the group,
          // not the part — still toggles every part in the group on `r`.
          if (hasSelection && effectivePartIds.size > 0) {
            toggleReference([...effectivePartIds]);
          }
          break;

        case 'z':
          // Z = Rotate 90 degrees around Z-axis (but not Ctrl+Z)
          if (hasSelection && !isMod) {
            rotateAxis('z');
          }
          break;

        case 'd':
          // Shift+D = Duplicate
          if (e.shiftKey && hasSelection) {
            duplicateSelectedParts();
          }
          break;

        case 'g':
          // G = Create group from selected items (parts and/or groups, requires 2+ items)
          {
            // Collect ungrouped parts (parts not already in a group)
            const ungroupedPartIds = selectedPartIds.filter((id) => getContainingGroupId(id, groupMembers) === null);
            // Build the members list: ungrouped parts + selected groups
            const members: Array<{ id: string; type: 'part' | 'group' }> = [
              ...ungroupedPartIds.map((id) => ({ id, type: 'part' as const })),
              ...selectedGroupIds.map((id) => ({ id, type: 'group' as const }))
            ];
            if (members.length >= 2) {
              createGroup(`Group ${groups.length + 1}`, members);
            }
          }
          break;

        case 'p':
          // P = Add new part
          addPart();
          break;

        case 'delete':
        case 'backspace':
          // Delete selected parts and groups
          if (hasSelection) {
            e.preventDefault();
            if (selectedGroupIds.length > 0) {
              requestDeleteGroups(selectedGroupIds);
            }
            // Then request delete any directly selected parts (that weren't in deleted groups)
            if (selectedPartIds.length > 0) {
              requestDeleteParts(selectedPartIds);
            }
          }
          break;

        case 'escape':
          // Escape: exit group editing mode first, then clear references, then deselect
          if (editingGroupId !== null) {
            exitGroup();
          } else if (referencePartIds.length > 0) {
            clearReferences();
          } else {
            clearSelection();
          }
          break;

        case 'f':
          // F = Focus camera on selection
          if (hasSelection) {
            requestCenterCamera();
          }
          break;

        case 'home':
          // Home = Reset camera to origin
          requestCenterCameraAtOrigin();
          break;

        case 'arrowup':
        case 'arrowdown':
        case 'arrowleft':
        case 'arrowright':
          // Move selected parts along a single world axis (X, Y, or Z)
          // The axis is chosen based on which one best aligns with the screen direction
          if (hasSelection) {
            e.preventDefault();
            const nudgeAmount = e.shiftKey ? 1 : gridSize; // Shift = 1 inch, normal = grid snap size
            const { up, right } = cameraViewVectors;

            // Determine which camera vector to use based on arrow direction
            const isVertical = e.key === 'ArrowUp' || e.key === 'ArrowDown';
            const isPositive = e.key === 'ArrowUp' || e.key === 'ArrowRight';
            const vec = isVertical ? up : right;

            // Find which world axis is most aligned with this camera vector
            const absX = Math.abs(vec.x);
            const absY = Math.abs(vec.y);
            const absZ = Math.abs(vec.z);

            let delta = { x: 0, y: 0, z: 0 };

            if (absX >= absY && absX >= absZ) {
              // X axis is most aligned
              const direction = vec.x > 0 ? 1 : -1;
              delta.x = direction * nudgeAmount * (isPositive ? 1 : -1);
            } else if (absY >= absX && absY >= absZ) {
              // Y axis is most aligned
              const direction = vec.y > 0 ? 1 : -1;
              delta.y = direction * nudgeAmount * (isPositive ? 1 : -1);
            } else {
              // Z axis is most aligned
              const direction = vec.z > 0 ? 1 : -1;
              delta.z = direction * nudgeAmount * (isPositive ? 1 : -1);
            }

            moveSelectedParts(delta);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isEditingPartCuts,
    selectedPartIds,
    parts,
    gridSize,
    requestDeleteParts,
    requestDeleteGroups,
    duplicateSelectedParts,
    updatePart,
    batchUpdateParts,
    clearSelection,
    copySelectedParts,
    pasteClipboard,
    moveSelectedParts,
    requestCenterCamera,
    requestCenterCameraAtOrigin,
    cameraViewVectors,
    toggleReference,
    clearReferences,
    referencePartIds,
    groupMembers,
    groups,
    sceneGraph,
    selectedGroupIds,
    editingGroupId,
    createGroup,
    deleteGroup,
    exitGroup,
    addPart
  ]);
}
