/**
 * PartsRenderer — coordinates rendering of parts via InstancedMesh (bulk) and
 * individual <Part> components (interactive: selected, hovered, reference).
 *
 * Parts that are selected, hovered, or marked as reference snap targets are
 * rendered as individual <Part> components so they get handles, edges, labels,
 * and drag support. Everything else is rendered in a single InstancedMesh draw call.
 */
import { useMemo } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useSnapStore } from '../../store/snapStore';
import { useUIStore } from '../../store/uiStore';
import { useCameraStore } from '../../store/cameraStore';
import { hasRenderablePartFeatures } from '../../utils/partFeatureGeometry';
import { Part } from './Part';
import { InstancedParts } from './InstancedParts';
import { useWorkspaceSceneGraph } from '../../interaction/useWorkspaceSceneGraph';

export function PartsRenderer() {
  const parts = useProjectStore((s) => s.parts);
  const selectedPartIds = useSelectionStore((s) => s.selectedPartIds);
  const selectedGroupIds = useSelectionStore((s) => s.selectedGroupIds);
  const hoveredPartId = useSelectionStore((s) => s.hoveredPartId);
  const dragIntentPartId = useSelectionStore((s) => s.dragIntent?.partId ?? null);
  const draggingPartId = useSelectionStore((s) => s.draggingPartId);
  const displayMode = useCameraStore((s) => s.displayMode);
  const referencePartIds = useSnapStore((s) => s.referencePartIds);
  const selectedSidebarStockId = useUIStore((s) => s.selectedSidebarStockId);
  // ADR-008: read group descendants from the scene graph adapter.
  const sceneGraph = useWorkspaceSceneGraph();

  // Build the set of part IDs that need individual rendering.
  // Group-selected parts stay in the InstancedMesh for performance — only directly
  // selected, hovered, or reference parts pop out as individual <Part> components.
  const { individualPartIdSet } = useMemo(() => {
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

    if (selectedSidebarStockId) {
      for (const part of parts) {
        if (part.stockId === selectedSidebarStockId) {
          individualIds.add(part.id);
        }
      }
    }

    // Feature-bearing parts use the dedicated geometry path instead of instancing.
    for (const part of parts) {
      if (hasRenderablePartFeatures(part)) {
        individualIds.add(part.id);
      }
    }

    // Group-selected parts: stay instanced (no individual rendering needed).
    // ADR-008: descendantPartIds comes from the scene graph adapter — same
    // semantics as legacy getAllDescendantPartIds, memoized once per scene
    // build.
    for (const groupId of selectedGroupIds) {
      const descendantIds = sceneGraph.descendantPartIds(groupId);
      for (const id of descendantIds) {
        // Keep selected-group parts as individual meshes so drag hit-testing is
        // consistent across the full visible surface (no instanced edge cases).
        individualIds.add(id);
      }
    }

    // Drag-affected: all parts that move when the selection is dragged
    return { individualPartIdSet: individualIds };
  }, [
    parts,
    selectedPartIds,
    selectedGroupIds,
    hoveredPartId,
    referencePartIds,
    dragIntentPartId,
    draggingPartId,
    sceneGraph,
    selectedSidebarStockId
  ]);

  // Split parts into instanced (bulk) vs individual (interactive).
  //
  // The previous "shouldForceIndividualFallback" branch is intentionally gone:
  // it was a workaround for an instanced-raycast bounding-sphere bug, not a
  // performance optimization. ADR-002 (hit-testing service) makes instanced
  // hits reliable, so the workaround is unnecessary and actively harmful — it
  // forces every part into individual rendering for scenes ≤ 500 parts, which
  // costs us draw calls and re-renders.
  const { instancedParts, individualParts } = useMemo(() => {
    // In Ghost mode, render all parts individually so unselected parts get
    // the same edge-outline treatment as selected parts.
    if (displayMode === 'translucent') {
      return { instancedParts: [], individualParts: parts };
    }

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
  }, [parts, individualPartIdSet, displayMode]);

  return (
    <>
      {/* Bulk rendering — single draw call for all non-interactive parts */}
      <InstancedParts parts={instancedParts} totalPartCount={parts.length} />

      {/* Individual rendering — full interactivity with handles, edges, labels */}
      {individualParts.map((part) => (
        <Part
          key={part.id}
          part={part}
          isStockHighlighted={!!selectedSidebarStockId && part.stockId === selectedSidebarStockId}
        />
      ))}
    </>
  );
}
