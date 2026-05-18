import { useMemo, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import { useShallow } from 'zustand/shallow';
import { useProjectStore } from '../../store/projectStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useInteractionStore } from '../../store/interactionStore';
import { getCombinedBounds } from '../../utils/snapToPartsUtil';
import { resolveTransformSelectedPartIds } from '../../utils/interactionSelection';
import { shouldHideGroupTransformHandles } from '../../utils/interactionOverlay';
import {
  beginRotateInteractionSession,
  clearMoveInteractionPreview,
  publishRotateInteractionPreview
} from '../../utils/interactionSession';
import { LiveDimensions } from './partTypes';
import { RotationHandle } from './RotationHandle';
import { isOrbitControls } from './workspaceUtils';

export function GroupRotationHandles() {
  const { controls } = useThree();
  const parts = useProjectStore((s) => s.parts);
  const groupMembers = useProjectStore((s) => s.groupMembers);
  const rotateSelectedParts = useProjectStore((s) => s.rotateSelectedParts);
  const { selectedPartIds, selectedGroupIds, editingGroupId } = useSelectionStore(
    useShallow((s) => ({
      selectedPartIds: s.selectedPartIds,
      selectedGroupIds: s.selectedGroupIds,
      editingGroupId: s.editingGroupId
    }))
  );
  const activeSession = useInteractionStore((s) => s.activeSession);

  const selectedIds = useMemo(() => {
    return resolveTransformSelectedPartIds({ selectedPartIds, selectedGroupIds, editingGroupId }, groupMembers);
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
      beginRotateInteractionSession({
        affectedPartIds: selectedIds,
        primaryPartId: selectedIds[0] ?? null,
        pivot,
        axis,
        initialDegrees: 90
      });
      rotateSelectedParts(axis, 90, pivot);
      clearMoveInteractionPreview({
        clearSelectionDragDelta: false,
        clearReferenceDistances: false
      });
    },
    [pivot, rotateSelectedParts, selectedIds]
  );

  const handleRotateDelta = useCallback(
    (axis: 'x' | 'y' | 'z', degrees: number) => {
      if (!pivot || Math.abs(degrees) < 0.01) return;
      rotateSelectedParts(axis, degrees, pivot);
      publishRotateInteractionPreview({ axis, degreesDelta: degrees });
    },
    [pivot, rotateSelectedParts]
  );

  const handleRotateStart = useCallback(() => {
    if (isOrbitControls(controls)) controls.enabled = false;
    if (!pivot || selectedIds.length === 0) return;
    beginRotateInteractionSession({
      affectedPartIds: selectedIds,
      primaryPartId: selectedIds[0] ?? null,
      pivot
    });
  }, [controls, pivot, selectedIds]);

  const handleRotateEnd = useCallback(() => {
    if (isOrbitControls(controls)) controls.enabled = true;
    clearMoveInteractionPreview({
      clearSelectionDragDelta: false,
      clearReferenceDistances: false
    });
  }, [controls]);

  if (!liveDims || !pivot || shouldHideGroupTransformHandles(activeSession)) return null;

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
