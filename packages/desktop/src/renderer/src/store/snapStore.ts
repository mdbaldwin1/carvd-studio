import { create } from 'zustand';
import { SnapLine, ReferenceDistanceIndicator } from '../types';
import { getCombinedBounds, calculateDistancesFromBounds } from '../utils/snapToPartsUtil';
import { useProjectStore, getAllDescendantPartIds } from './projectStore';
import { useSelectionStore } from './selectionStore';

interface SnapStoreState {
  // Snap-to-parts feature
  snapToPartsEnabled: boolean;
  activeSnapLines: SnapLine[]; // Current alignment lines to display during drag
  // Reference parts for precision snapping
  referencePartIds: string[]; // Parts marked as snap reference targets
  activeReferenceDistances: ReferenceDistanceIndicator[]; // Distance indicators to reference parts during drag

  // Simple setters
  setSnapToPartsEnabled: (enabled: boolean) => void;
  setActiveSnapLines: (lines: SnapLine[]) => void;
  setActiveReferenceDistances: (distances: ReferenceDistanceIndicator[]) => void;
  // Batched setter for hot paths (single setState call instead of two)
  setSnapIndicators: (lines: SnapLine[], distances: ReferenceDistanceIndicator[]) => void;

  // Reference parts actions
  setReferencePartIds: (ids: string[]) => void;
  addToReferences: (ids: string[]) => void;
  removeFromReferences: (ids: string[]) => void;
  toggleReference: (ids: string[]) => void;
  clearReferences: () => void;

  // Recalculate distances based on current selection and references
  updateReferenceDistances: () => void;
}

export const useSnapStore = create<SnapStoreState>((set, get) => ({
  snapToPartsEnabled: true,
  activeSnapLines: [],
  referencePartIds: [],
  activeReferenceDistances: [],

  setSnapToPartsEnabled: (snapToPartsEnabled) => set({ snapToPartsEnabled }),
  setActiveSnapLines: (activeSnapLines) => set({ activeSnapLines }),
  setActiveReferenceDistances: (activeReferenceDistances) => set({ activeReferenceDistances }),
  setSnapIndicators: (activeSnapLines, activeReferenceDistances) => set({ activeSnapLines, activeReferenceDistances }),

  setReferencePartIds: (referencePartIds) => {
    set({ referencePartIds });
    get().updateReferenceDistances();
  },
  addToReferences: (ids) => {
    set((state) => ({
      referencePartIds: [...new Set([...state.referencePartIds, ...ids])]
    }));
    get().updateReferenceDistances();
  },
  removeFromReferences: (ids) => {
    set((state) => ({
      referencePartIds: state.referencePartIds.filter((id) => !ids.includes(id))
    }));
    get().updateReferenceDistances();
  },
  toggleReference: (ids) => {
    set((state) => {
      // Check if all ids are already references
      const allAreReferences = ids.every((id) => state.referencePartIds.includes(id));
      if (allAreReferences) {
        // Remove all from references
        return { referencePartIds: state.referencePartIds.filter((id) => !ids.includes(id)) };
      } else {
        // Add all to references
        return { referencePartIds: [...new Set([...state.referencePartIds, ...ids])] };
      }
    });
    get().updateReferenceDistances();
  },
  clearReferences: () => set({ referencePartIds: [], activeReferenceDistances: [] }),

  updateReferenceDistances: () => {
    const { referencePartIds } = get();
    const { parts, groupMembers } = useProjectStore.getState();
    const { selectedPartIds, selectedGroupIds } = useSelectionStore.getState();

    // No references set or nothing selected - clear indicators
    if (referencePartIds.length === 0 || (selectedPartIds.length === 0 && selectedGroupIds.length === 0)) {
      set({ activeReferenceDistances: [] });
      return;
    }

    // Get reference parts
    const referenceParts = parts.filter((p) => referencePartIds.includes(p.id));
    if (referenceParts.length === 0) {
      set({ activeReferenceDistances: [] });
      return;
    }

    // Get all selected parts (including parts from selected groups)
    const selectedPartsFromGroups: string[] = [];
    for (const groupId of selectedGroupIds) {
      const groupPartIds = getAllDescendantPartIds(groupId, groupMembers);
      selectedPartsFromGroups.push(...groupPartIds);
    }
    const allSelectedPartIds = [...new Set([...selectedPartIds, ...selectedPartsFromGroups])];

    // Remove reference parts from selection (can't measure to self)
    const selectedPartsToMeasure = allSelectedPartIds.filter((id) => !referencePartIds.includes(id));
    if (selectedPartsToMeasure.length === 0) {
      set({ activeReferenceDistances: [] });
      return;
    }

    // Get selected parts
    const selectedParts = parts.filter((p) => selectedPartsToMeasure.includes(p.id));
    if (selectedParts.length === 0) {
      set({ activeReferenceDistances: [] });
      return;
    }

    // Calculate combined bounds of selected parts and generate indicators
    const selectedBounds = getCombinedBounds(selectedParts);
    const fromPartId = selectedParts.length === 1 ? selectedParts[0].id : 'selected-group';
    const indicators = calculateDistancesFromBounds(selectedBounds, fromPartId, referenceParts);

    set({ activeReferenceDistances: indicators });
  }
}));
