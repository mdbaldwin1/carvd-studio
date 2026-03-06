import { create } from 'zustand';
import { SnapLine, ReferenceDistanceIndicator } from '../types';
import {
  getCombinedBounds,
  calculateDistancesFromBounds,
  calculateVectorReferenceDistance
} from '../utils/snapToPartsUtil';
import { isAxisAlignedRotation } from '../utils/rotation';
import { useProjectStore, getAllDescendantPartIds } from './projectStore';
import { useSelectionStore } from './selectionStore';

function snapLineSignature(lines: SnapLine[]): string {
  return lines
    .filter((line) => (line.state ?? 'winner') !== 'candidate')
    .map((line) => {
      const value = typeof line.snapValue === 'number' && Number.isFinite(line.snapValue) ? line.snapValue : 0;
      return `${line.family ?? line.type}:${line.subtype ?? ''}:${line.axis}:${value.toFixed(3)}`;
    })
    .join('|');
}

interface SnapStoreState {
  // Snap-to-parts feature
  snapToPartsEnabled: boolean;
  activeSnapLines: SnapLine[]; // Current alignment lines to display during drag
  // Reference parts for precision snapping
  referencePartIds: string[]; // Parts marked as snap reference targets
  activeReferenceDistances: ReferenceDistanceIndicator[]; // Distance indicators to reference parts during drag
  faceLatchActive: boolean;
  snapPulseAt: number;
  snapLabelPosition: { x: number; y: number; z: number } | null;
  snapPerf: {
    lastMs: number;
    avgMs: number;
    maxMs: number;
    sampleCount: number;
    overBudgetCount: number;
    budgetMs: number;
  };

  // Simple setters
  setSnapToPartsEnabled: (enabled: boolean) => void;
  setActiveSnapLines: (lines: SnapLine[]) => void;
  setActiveReferenceDistances: (distances: ReferenceDistanceIndicator[]) => void;
  setFaceLatchActive: (active: boolean) => void;
  setSnapLabelPosition: (position: { x: number; y: number; z: number } | null) => void;
  // Batched setter for hot paths (single setState call instead of two)
  setSnapIndicators: (lines: SnapLine[], distances: ReferenceDistanceIndicator[]) => void;
  recordSnapPerfSample: (ms: number) => void;
  resetSnapPerf: () => void;

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
  faceLatchActive: false,
  snapPulseAt: 0,
  snapLabelPosition: null,
  snapPerf: {
    lastMs: 0,
    avgMs: 0,
    maxMs: 0,
    sampleCount: 0,
    overBudgetCount: 0,
    budgetMs: 4
  },

  setSnapToPartsEnabled: (snapToPartsEnabled) => set({ snapToPartsEnabled }),
  setActiveSnapLines: (activeSnapLines) =>
    set((state) => {
      const prevWinner = snapLineSignature(state.activeSnapLines);
      const nextWinner = snapLineSignature(activeSnapLines);
      return {
        activeSnapLines,
        snapPulseAt: prevWinner !== nextWinner ? performance.now() : state.snapPulseAt
      };
    }),
  setActiveReferenceDistances: (activeReferenceDistances) => set({ activeReferenceDistances }),
  setFaceLatchActive: (faceLatchActive) => set({ faceLatchActive }),
  setSnapLabelPosition: (snapLabelPosition) => set({ snapLabelPosition }),
  setSnapIndicators: (activeSnapLines, activeReferenceDistances) =>
    set((state) => {
      const prevWinner = snapLineSignature(state.activeSnapLines);
      const nextWinner = snapLineSignature(activeSnapLines);
      return {
        activeSnapLines,
        activeReferenceDistances,
        snapPulseAt: prevWinner !== nextWinner ? performance.now() : state.snapPulseAt
      };
    }),
  recordSnapPerfSample: (ms) =>
    set((state) => {
      const sampleCount = state.snapPerf.sampleCount + 1;
      const avgMs = (state.snapPerf.avgMs * state.snapPerf.sampleCount + ms) / sampleCount;
      const maxMs = Math.max(state.snapPerf.maxMs, ms);
      const overBudgetCount = state.snapPerf.overBudgetCount + (ms > state.snapPerf.budgetMs ? 1 : 0);
      return {
        snapPerf: {
          ...state.snapPerf,
          lastMs: ms,
          avgMs,
          maxMs,
          sampleCount,
          overBudgetCount
        }
      };
    }),
  resetSnapPerf: () =>
    set((state) => ({
      snapPerf: {
        ...state.snapPerf,
        lastMs: 0,
        avgMs: 0,
        maxMs: 0,
        sampleCount: 0,
        overBudgetCount: 0
      }
    })),

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
    const fromPartId = selectedParts.length === 1 ? selectedParts[0].id : 'selected-group';
    const toPartId = referenceParts.length === 1 ? referenceParts[0].id : 'reference-group';
    const axisAlignedContext = [...selectedParts, ...referenceParts].every((p) => isAxisAlignedRotation(p.rotation));
    const indicators = axisAlignedContext
      ? calculateDistancesFromBounds(getCombinedBounds(selectedParts), fromPartId, referenceParts)
      : calculateVectorReferenceDistance(selectedParts, referenceParts, fromPartId, toPartId);

    set({ activeReferenceDistances: indicators });
  }
}));
