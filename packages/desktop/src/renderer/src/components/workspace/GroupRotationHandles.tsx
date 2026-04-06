import { useMemo, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import { useShallow } from 'zustand/shallow';
import { useProjectStore, getAllDescendantPartIds, getContainingGroupId } from '../../store/projectStore';
import { useSelectionStore } from '../../store/selectionStore';
import { getCombinedBounds } from '../../utils/snapToPartsUtil';
import { LiveDimensions } from './partTypes';
import { RotationHandle } from './RotationHandle';
import { isOrbitControls } from './workspaceUtils';

export function GroupRotationHandles() {
  const { controls } = useThree();
  const parts = useProjectStore((s) => s.parts);
  const groupMembers = useProjectStore((s) => s.groupMembers);
  const rotateSelectedParts = useProjectStore((s) => s.rotateSelectedParts);
  const { selectedPartIds, selectedGroupIds, editingGroupId, activeDragDelta } = useSelectionStore(
    useShallow((s) => ({
      selectedPartIds: s.selectedPartIds,
      selectedGroupIds: s.selectedGroupIds,
      editingGroupId: s.editingGroupId,
      activeDragDelta: s.activeDragDelta
    }))
  );

  const selectedIds = useMemo(() => {
    let partIdsToRotate: Set<string>;
    if (editingGroupId !== null) {
      partIdsToRotate = new Set(selectedPartIds);
      for (const groupId of selectedGroupIds) {
        const groupPartIds = getAllDescendantPartIds(groupId, groupMembers);
        groupPartIds.forEach((id) => partIdsToRotate.add(id));
      }
    } else {
      partIdsToRotate = new Set(selectedPartIds);
      for (const partId of selectedPartIds) {
        const containingGroupId = getContainingGroupId(partId, groupMembers);
        if (containingGroupId) {
          const groupPartIds = getAllDescendantPartIds(containingGroupId, groupMembers);
          groupPartIds.forEach((id) => partIdsToRotate.add(id));
        }
      }
      for (const groupId of selectedGroupIds) {
        const groupPartIds = getAllDescendantPartIds(groupId, groupMembers);
        groupPartIds.forEach((id) => partIdsToRotate.add(id));
      }
    }
    return [...partIdsToRotate];
  }, [editingGroupId, groupMembers, selectedGroupIds, selectedPartIds]);

  const selectedParts = useMemo(() => parts.filter((p) => selectedIds.includes(p.id)), [parts, selectedIds]);
  const bounds = useMemo(() => (selectedParts.length > 1 ? getCombinedBounds(selectedParts) : null), [selectedParts]);

  const liveDims: LiveDimensions | null = useMemo(() => {
    if (!bounds) return null;
    return {
      x: bounds.centerX,
      y: bounds.centerY,
      z: bounds.centerZ,
      length: Math.max(0.5, bounds.maxX - bounds.minX),
      thickness: Math.max(0.25, bounds.maxY - bounds.minY),
      width: Math.max(0.5, bounds.maxZ - bounds.minZ)
    };
  }, [bounds]);

  const pivot = useMemo(() => (bounds ? { x: bounds.centerX, y: bounds.centerY, z: bounds.centerZ } : null), [bounds]);

  const handleRotate = useCallback(
    (axis: 'x' | 'y' | 'z') => {
      if (!pivot) return;
      rotateSelectedParts(axis, 90, pivot);
    },
    [pivot, rotateSelectedParts]
  );

  const handleRotateDelta = useCallback(
    (axis: 'x' | 'y' | 'z', degrees: number) => {
      if (!pivot || Math.abs(degrees) < 0.01) return;
      rotateSelectedParts(axis, degrees, pivot);
    },
    [pivot, rotateSelectedParts]
  );

  const handleRotateStart = useCallback(() => {
    if (isOrbitControls(controls)) controls.enabled = false;
  }, [controls]);

  const handleRotateEnd = useCallback(() => {
    if (isOrbitControls(controls)) controls.enabled = true;
  }, [controls]);

  if (!liveDims || !pivot || activeDragDelta) return null;

  return (
    <group position={[pivot.x, pivot.y, pivot.z]}>
      <RotationHandle
        liveDims={liveDims}
        axis="x"
        side={1}
        onRotate={handleRotate}
        onRotateDelta={handleRotateDelta}
        onRotateStart={handleRotateStart}
        onRotateEnd={handleRotateEnd}
      />
      <RotationHandle
        liveDims={liveDims}
        axis="x"
        side={-1}
        onRotate={handleRotate}
        onRotateDelta={handleRotateDelta}
        onRotateStart={handleRotateStart}
        onRotateEnd={handleRotateEnd}
      />
      <RotationHandle
        liveDims={liveDims}
        axis="y"
        side={1}
        onRotate={handleRotate}
        onRotateDelta={handleRotateDelta}
        onRotateStart={handleRotateStart}
        onRotateEnd={handleRotateEnd}
      />
      <RotationHandle
        liveDims={liveDims}
        axis="y"
        side={-1}
        onRotate={handleRotate}
        onRotateDelta={handleRotateDelta}
        onRotateStart={handleRotateStart}
        onRotateEnd={handleRotateEnd}
      />
      <RotationHandle
        liveDims={liveDims}
        axis="z"
        side={1}
        onRotate={handleRotate}
        onRotateDelta={handleRotateDelta}
        onRotateStart={handleRotateStart}
        onRotateEnd={handleRotateEnd}
      />
      <RotationHandle
        liveDims={liveDims}
        axis="z"
        side={-1}
        onRotate={handleRotate}
        onRotateDelta={handleRotateDelta}
        onRotateStart={handleRotateStart}
        onRotateEnd={handleRotateEnd}
      />
    </group>
  );
}
