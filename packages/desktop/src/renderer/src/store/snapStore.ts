import { create } from 'zustand';
import { SnapLine, ReferenceDistanceIndicator, ReferenceRuler } from '../types';
import {
  getCombinedBounds,
  calculateDistancesFromBounds,
  calculateVectorReferenceDistance
} from '../utils/snapToPartsUtil';
import { isAxisAlignedRotation } from '../utils/rotation';
import { useProjectStore } from './projectStore';
import { useSelectionStore } from './selectionStore';
import { resolveReferenceEntities, resolveSelectionEntities } from '../utils/interactionSelection';
import {
  referenceIndicatorToRuler,
  referenceRelationToIndicator,
  referenceRelationToRuler,
  solveReferenceRelations
} from '../utils/referenceRelations';

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
  activeReferenceRulers: ReferenceRuler[];
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
  setActiveReferenceRulers: (rulers: ReferenceRuler[]) => void;
  setFaceLatchActive: (active: boolean) => void;
  setSnapLabelPosition: (position: { x: number; y: number; z: number } | null) => void;
  // Batched setter for hot paths (single setState call instead of two)
  setSnapIndicators: (lines: SnapLine[], distances: ReferenceDistanceIndicator[]) => void;
  setSnapIndicatorsWithRulers: (
    lines: SnapLine[],
    distances: ReferenceDistanceIndicator[],
    rulers: ReferenceRuler[]
  ) => void;
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
  activeReferenceRulers: [],
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
  setActiveReferenceDistances: (activeReferenceDistances) =>
    set({
      activeReferenceDistances,
      activeReferenceRulers: activeReferenceDistances.map((indicator) => referenceIndicatorToRuler(indicator))
    }),
  setActiveReferenceRulers: (activeReferenceRulers) => set({ activeReferenceRulers }),
  setFaceLatchActive: (faceLatchActive) => set({ faceLatchActive }),
  setSnapLabelPosition: (snapLabelPosition) => set({ snapLabelPosition }),
  setSnapIndicators: (activeSnapLines, activeReferenceDistances) =>
    set((state) => {
      const prevWinner = snapLineSignature(state.activeSnapLines);
      const nextWinner = snapLineSignature(activeSnapLines);
      return {
        activeSnapLines,
        activeReferenceDistances,
        activeReferenceRulers: activeReferenceDistances.map((indicator) => referenceIndicatorToRuler(indicator)),
        snapPulseAt: prevWinner !== nextWinner ? performance.now() : state.snapPulseAt
      };
    }),
  setSnapIndicatorsWithRulers: (activeSnapLines, activeReferenceDistances, activeReferenceRulers) =>
    set((state) => {
      const prevWinner = snapLineSignature(state.activeSnapLines);
      const nextWinner = snapLineSignature(activeSnapLines);
      return {
        activeSnapLines,
        activeReferenceDistances,
        activeReferenceRulers,
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
  clearReferences: () => set({ referencePartIds: [], activeReferenceDistances: [], activeReferenceRulers: [] }),

  updateReferenceDistances: () => {
    const { referencePartIds } = get();
    const { parts, groupMembers } = useProjectStore.getState();
    const { selectedPartIds, selectedGroupIds } = useSelectionStore.getState();

    // No references set or nothing selected - clear indicators
    if (referencePartIds.length === 0 || (selectedPartIds.length === 0 && selectedGroupIds.length === 0)) {
      set({ activeReferenceDistances: [], activeReferenceRulers: [] });
      return;
    }

    const referenceEntities = resolveReferenceEntities(referencePartIds, groupMembers);
    if (referenceEntities.length === 0) {
      set({ activeReferenceDistances: [], activeReferenceRulers: [] });
      return;
    }

    const selectedEntities = resolveSelectionEntities({ selectedPartIds, selectedGroupIds }, groupMembers)
      .map((entity) => ({
        ...entity,
        partIds: entity.partIds.filter((id) => !referencePartIds.includes(id))
      }))
      .filter((entity) => entity.partIds.length > 0);

    if (selectedEntities.length === 0) {
      set({ activeReferenceDistances: [], activeReferenceRulers: [] });
      return;
    }

    const referenceParts = parts.filter((p) => referenceEntities.some((entity) => entity.partIds.includes(p.id)));
    const selectedParts = parts.filter((p) => selectedEntities.some((entity) => entity.partIds.includes(p.id)));
    if (selectedParts.length === 0) {
      set({ activeReferenceDistances: [], activeReferenceRulers: [] });
      return;
    }

    const selectedAnchorId =
      selectedEntities.length === 1
        ? selectedEntities[0].id
        : selectedEntities.some((entity) => entity.kind === 'group')
          ? 'selected-group'
          : 'selected-parts';
    const referenceAnchorId =
      referenceEntities.length === 1
        ? referenceEntities[0].id
        : referenceEntities.some((entity) => entity.kind === 'group')
          ? 'reference-group'
          : 'reference-parts';
    const axisAlignedContext = [...selectedParts, ...referenceParts].every((p) => isAxisAlignedRotation(p.rotation));
    let indicators: ReferenceDistanceIndicator[] = [];
    let rulers: ReferenceRuler[] = [];

    if (axisAlignedContext) {
      const relationResult = solveReferenceRelations({
        selectionEntities: selectedEntities,
        referenceEntities,
        parts,
        source: 'idle'
      });

      if (relationResult.relations.length > 0) {
        const activeRelationId = relationResult.activeRelation?.id ?? null;
        rulers = relationResult.relations.map((relation) =>
          referenceRelationToRuler(relation, relation.id === activeRelationId ? 'active' : 'passive')
        );
        indicators = relationResult.relations.map(referenceRelationToIndicator);
      } else {
        indicators = calculateDistancesFromBounds(getCombinedBounds(selectedParts), selectedAnchorId, referenceParts);
        rulers = indicators.map((indicator) => referenceIndicatorToRuler(indicator));
      }
    } else {
      indicators = calculateVectorReferenceDistance(selectedParts, referenceParts, selectedAnchorId, referenceAnchorId);
      rulers = indicators.map((indicator) => referenceIndicatorToRuler(indicator));
    }

    set({
      activeReferenceDistances: indicators,
      activeReferenceRulers: rulers
    });
  }
}));
