/**
 * PartsRenderer — coordinates rendering of parts via InstancedMesh (bulk) and
 * individual <Part> components (interactive: selected, hovered, reference).
 *
 * Parts that are selected, hovered, or marked as reference snap targets are
 * rendered as individual <Part> components so they get handles, edges, labels,
 * and drag support. Everything else is rendered in a single InstancedMesh draw call.
 */
import { useMemo } from 'react';
import { useProjectStore, getAllDescendantPartIds } from '../../store/projectStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useSnapStore } from '../../store/snapStore';
import { Part } from './Part';
import { InstancedParts } from './InstancedParts';

export function PartsRenderer() {
  const parts = useProjectStore((s) => s.parts);
  const groupMembers = useProjectStore((s) => s.groupMembers);
  const selectedPartIds = useSelectionStore((s) => s.selectedPartIds);
  const selectedGroupIds = useSelectionStore((s) => s.selectedGroupIds);
  const hoveredPartId = useSelectionStore((s) => s.hoveredPartId);
  const dragIntentPartId = useSelectionStore((s) => s.dragIntent?.partId ?? null);
  const draggingPartId = useSelectionStore((s) => s.draggingPartId);
  const referencePartIds = useSnapStore((s) => s.referencePartIds);

  // Build the set of part IDs that need individual rendering.
  // Group-selected parts stay in the InstancedMesh for performance — only directly
  // selected, hovered, or reference parts pop out as individual <Part> components.
  const { individualPartIdSet, dragAffectedPartIds } = useMemo(() => {
    const individualIds = new Set<string>();

    // Directly selected parts (need handles, labels, drag)
    for (const id of selectedPartIds) {
      individualIds.add(id);
    }

    // Hovered part (needs edges, cursor)
    if (hoveredPartId) {
      individualIds.add(hoveredPartId);
    }

    // Reference parts (snap targets, need edges)
    for (const id of referencePartIds) {
      individualIds.add(id);
    }

    // Drag intent/active drag: keep the drag anchor part individual so usePartDrag can handle it
    if (dragIntentPartId) {
      individualIds.add(dragIntentPartId);
    }
    if (draggingPartId) {
      individualIds.add(draggingPartId);
    }

    // Group-selected parts: stay instanced (no individual rendering needed)
    const groupSelected = new Set<string>();
    for (const groupId of selectedGroupIds) {
      const descendantIds = getAllDescendantPartIds(groupId, groupMembers);
      for (const id of descendantIds) {
        groupSelected.add(id);
      }
    }

    // Drag-affected: all parts that move when the selection is dragged
    const dragAffected = new Set<string>();
    for (const id of selectedPartIds) {
      dragAffected.add(id);
    }
    for (const id of groupSelected) {
      dragAffected.add(id);
    }

    return { individualPartIdSet: individualIds, dragAffectedPartIds: dragAffected };
  }, [
    selectedPartIds,
    selectedGroupIds,
    hoveredPartId,
    referencePartIds,
    dragIntentPartId,
    draggingPartId,
    groupMembers
  ]);

  // Split parts into instanced (bulk) vs individual (interactive)
  const { instancedParts, individualParts } = useMemo(() => {
    const instanced = [];
    const individual = [];
    for (const part of parts) {
      if (individualPartIdSet.has(part.id)) {
        individual.push(part);
      } else {
        instanced.push(part);
      }
    }
    return { instancedParts: instanced, individualParts: individual };
  }, [parts, individualPartIdSet]);

  return (
    <>
      {/* Bulk rendering — single draw call for all non-interactive parts */}
      <InstancedParts parts={instancedParts} totalPartCount={parts.length} dragAffectedPartIds={dragAffectedPartIds} />

      {/* Individual rendering — full interactivity with handles, edges, labels */}
      {individualParts.map((part) => (
        <Part key={part.id} part={part} />
      ))}
    </>
  );
}
