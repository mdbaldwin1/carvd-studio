import { describe, it, expect, beforeEach } from 'vitest';
import { useSnapStore } from './snapStore';
import { useProjectStore } from './projectStore';
import { useAssemblyEditingStore } from './assemblyEditingStore';
import { useSelectionStore } from './selectionStore';

// Helper to reset store state before each test
const resetStores = () => {
  useProjectStore.getState().newProject();
  useSelectionStore.setState({
    selectedPartIds: [],
    selectedGroupIds: [],
    hoveredPartId: null,
    transformMode: 'translate',
    activeDragDelta: null,
    selectionBox: null,
    expandedGroupIds: [],
    editingGroupId: null
  });
  useSnapStore.setState({
    snapToPartsEnabled: true,
    activeSnapLines: [],
    referencePartIds: [],
    activeReferenceDistances: []
  });
};

describe('snapStore', () => {
  beforeEach(() => {
    resetStores();
  });

  // ============================================================
  // Simple Setters
  // ============================================================

  describe('setSnapToPartsEnabled', () => {
    it('enables snap to parts', () => {
      useSnapStore.setState({ snapToPartsEnabled: false });

      useSnapStore.getState().setSnapToPartsEnabled(true);

      expect(useSnapStore.getState().snapToPartsEnabled).toBe(true);
    });

    it('disables snap to parts', () => {
      useSnapStore.setState({ snapToPartsEnabled: true });

      useSnapStore.getState().setSnapToPartsEnabled(false);

      expect(useSnapStore.getState().snapToPartsEnabled).toBe(false);
    });
  });

  describe('setActiveSnapLines', () => {
    it('sets active snap lines', () => {
      const snapLines = [{ start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 }, color: '#ff0000' }];

      useSnapStore.getState().setActiveSnapLines(snapLines);

      expect(useSnapStore.getState().activeSnapLines).toEqual(snapLines);
    });

    it('clears active snap lines', () => {
      useSnapStore
        .getState()
        .setActiveSnapLines([{ start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 }, color: '#ff0000' }]);

      useSnapStore.getState().setActiveSnapLines([]);

      expect(useSnapStore.getState().activeSnapLines).toHaveLength(0);
    });
  });

  describe('setActiveReferenceDistances', () => {
    it('sets active reference distances', () => {
      const distances = [
        {
          id: 'dist-1',
          type: 'edge-to-edge' as const,
          axis: 'x' as const,
          distance: 5,
          start: { x: 0, y: 0, z: 0 },
          end: { x: 5, y: 0, z: 0 },
          labelPosition: { x: 2.5, y: 0, z: 0 },
          fromPartId: 'p1',
          toPartId: 'p2'
        }
      ];

      useSnapStore.getState().setActiveReferenceDistances(distances);

      expect(useSnapStore.getState().activeReferenceDistances).toEqual(distances);
    });
  });

  describe('setSnapIndicators', () => {
    it('sets both snap lines and reference distances in a single call', () => {
      const snapLines = [{ start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 }, color: '#ff0000' }];
      const distances = [
        {
          id: 'dist-1',
          type: 'edge-to-edge' as const,
          axis: 'x' as const,
          distance: 5,
          start: { x: 0, y: 0, z: 0 },
          end: { x: 5, y: 0, z: 0 },
          labelPosition: { x: 2.5, y: 0, z: 0 },
          fromPartId: 'p1',
          toPartId: 'p2'
        }
      ];

      useSnapStore.getState().setSnapIndicators(snapLines, distances);

      expect(useSnapStore.getState().activeSnapLines).toEqual(snapLines);
      expect(useSnapStore.getState().activeReferenceDistances).toEqual(distances);
    });

    it('clears both snap lines and reference distances', () => {
      useSnapStore.setState({
        activeSnapLines: [{ start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 }, color: '#ff0000' }],
        activeReferenceDistances: [
          {
            id: 'dist-1',
            type: 'edge-to-edge' as const,
            axis: 'x' as const,
            distance: 5,
            start: { x: 0, y: 0, z: 0 },
            end: { x: 5, y: 0, z: 0 },
            labelPosition: { x: 2.5, y: 0, z: 0 },
            fromPartId: 'p1',
            toPartId: 'p2'
          }
        ]
      });

      useSnapStore.getState().setSnapIndicators([], []);

      expect(useSnapStore.getState().activeSnapLines).toHaveLength(0);
      expect(useSnapStore.getState().activeReferenceDistances).toHaveLength(0);
    });
  });

  // ============================================================
  // Reference Parts
  // ============================================================

  describe('setReferencePartIds', () => {
    it('sets reference part IDs directly', () => {
      const part1Id = useProjectStore.getState().addPart();
      const part2Id = useProjectStore.getState().addPart();

      useSnapStore.getState().setReferencePartIds([part1Id, part2Id]);

      expect(useSnapStore.getState().referencePartIds).toEqual([part1Id, part2Id]);
    });

    it('replaces existing reference part IDs', () => {
      const part1Id = useProjectStore.getState().addPart();
      const part2Id = useProjectStore.getState().addPart();
      const part3Id = useProjectStore.getState().addPart();
      useSnapStore.getState().setReferencePartIds([part1Id, part2Id]);

      useSnapStore.getState().setReferencePartIds([part3Id]);

      expect(useSnapStore.getState().referencePartIds).toEqual([part3Id]);
    });
  });

  describe('addToReferences', () => {
    it('adds parts to reference list', () => {
      const part1Id = useProjectStore.getState().addPart();
      const part2Id = useProjectStore.getState().addPart();

      useSnapStore.getState().addToReferences([part1Id, part2Id]);

      expect(useSnapStore.getState().referencePartIds).toContain(part1Id);
      expect(useSnapStore.getState().referencePartIds).toContain(part2Id);
    });

    it('does not add duplicate references', () => {
      const partId = useProjectStore.getState().addPart();
      useSnapStore.getState().addToReferences([partId]);

      useSnapStore.getState().addToReferences([partId]);

      expect(useSnapStore.getState().referencePartIds.filter((id) => id === partId)).toHaveLength(1);
    });
  });

  describe('removeFromReferences', () => {
    it('removes parts from reference list', () => {
      const partId = useProjectStore.getState().addPart();
      useSnapStore.getState().addToReferences([partId]);

      useSnapStore.getState().removeFromReferences([partId]);

      expect(useSnapStore.getState().referencePartIds).not.toContain(partId);
    });

    it('is a no-op when removing parts not in references', () => {
      const partId = useProjectStore.getState().addPart();

      useSnapStore.getState().removeFromReferences([partId]);

      expect(useSnapStore.getState().referencePartIds).toHaveLength(0);
    });
  });

  describe('toggleReference', () => {
    it('adds parts to references when none are references', () => {
      const partId = useProjectStore.getState().addPart();

      useSnapStore.getState().toggleReference([partId]);

      expect(useSnapStore.getState().referencePartIds).toContain(partId);
    });

    it('removes parts from references when all are references', () => {
      const partId = useProjectStore.getState().addPart();
      useSnapStore.getState().toggleReference([partId]);

      useSnapStore.getState().toggleReference([partId]);

      expect(useSnapStore.getState().referencePartIds).not.toContain(partId);
    });

    it('adds all parts when only some are references', () => {
      const part1Id = useProjectStore.getState().addPart();
      const part2Id = useProjectStore.getState().addPart();
      useSnapStore.getState().addToReferences([part1Id]);

      useSnapStore.getState().toggleReference([part1Id, part2Id]);

      expect(useSnapStore.getState().referencePartIds).toContain(part1Id);
      expect(useSnapStore.getState().referencePartIds).toContain(part2Id);
    });
  });

  describe('clearReferences', () => {
    it('clears all reference parts', () => {
      const part1Id = useProjectStore.getState().addPart();
      const part2Id = useProjectStore.getState().addPart();
      useSnapStore.getState().addToReferences([part1Id, part2Id]);

      useSnapStore.getState().clearReferences();

      expect(useSnapStore.getState().referencePartIds).toHaveLength(0);
    });

    it('also clears active reference distances', () => {
      useSnapStore.setState({
        referencePartIds: ['p1'],
        activeReferenceDistances: [
          {
            id: 'dist-1',
            type: 'edge-to-edge',
            axis: 'x',
            distance: 5,
            start: { x: 0, y: 0, z: 0 },
            end: { x: 5, y: 0, z: 0 },
            labelPosition: { x: 2.5, y: 0, z: 0 },
            fromPartId: 'p1',
            toPartId: 'p2'
          }
        ]
      });

      useSnapStore.getState().clearReferences();

      expect(useSnapStore.getState().activeReferenceDistances).toHaveLength(0);
    });
  });

  // ============================================================
  // Cross-store: updateReferenceDistances
  // ============================================================

  describe('updateReferenceDistances', () => {
    it('clears distances when no references are set', () => {
      const partId = useProjectStore.getState().addPart();
      useSelectionStore.setState({ selectedPartIds: [partId] });

      useSnapStore.getState().updateReferenceDistances();

      expect(useSnapStore.getState().activeReferenceDistances).toHaveLength(0);
    });

    it('clears distances when nothing is selected', () => {
      const partId = useProjectStore.getState().addPart();
      useSnapStore.setState({ referencePartIds: [partId] });
      useSelectionStore.setState({ selectedPartIds: [], selectedGroupIds: [] });

      useSnapStore.getState().updateReferenceDistances();

      expect(useSnapStore.getState().activeReferenceDistances).toHaveLength(0);
    });

    it('clears distances when selected part is also the reference', () => {
      const partId = useProjectStore.getState().addPart();
      useSnapStore.setState({ referencePartIds: [partId] });
      useSelectionStore.setState({ selectedPartIds: [partId] });

      useSnapStore.getState().updateReferenceDistances();

      expect(useSnapStore.getState().activeReferenceDistances).toHaveLength(0);
    });

    it('calculates distances between selected and reference parts', () => {
      // Create two parts separated by a gap
      const refPartId = useProjectStore.getState().addPart({
        name: 'Ref',
        position: { x: 0, y: 0.375, z: 0 },
        length: 10,
        width: 5,
        thickness: 0.75
      });
      const selPartId = useProjectStore.getState().addPart({
        name: 'Sel',
        position: { x: 15, y: 0.375, z: 0 },
        length: 10,
        width: 5,
        thickness: 0.75
      });

      useSnapStore.setState({ referencePartIds: [refPartId] });
      useSelectionStore.setState({ selectedPartIds: [selPartId] });

      useSnapStore.getState().updateReferenceDistances();

      const distances = useSnapStore.getState().activeReferenceDistances;
      expect(distances.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // Cross-store: delete actions clean up referencePartIds
  // ============================================================

  describe('cross-store cleanup', () => {
    it('deletePart removes part from references', () => {
      const partId = useProjectStore.getState().addPart();
      useSnapStore.getState().addToReferences([partId]);

      expect(useSnapStore.getState().referencePartIds).toContain(partId);

      useProjectStore.getState().deletePart(partId);

      expect(useSnapStore.getState().referencePartIds).not.toContain(partId);
    });

    it('deleteSelectedParts removes parts from references', () => {
      const part1Id = useProjectStore.getState().addPart({ name: 'Part 1' });
      const part2Id = useProjectStore.getState().addPart({ name: 'Part 2' });
      useSnapStore.getState().addToReferences([part1Id, part2Id]);
      useSelectionStore.getState().selectParts([part1Id, part2Id]);

      useProjectStore.getState().deleteSelectedParts();

      expect(useSnapStore.getState().referencePartIds).toHaveLength(0);
    });

    it('newProject resets snap state', () => {
      useSnapStore.setState({
        referencePartIds: ['p1', 'p2'],
        activeSnapLines: [{ start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 }, color: '#f00' }],
        activeReferenceDistances: [
          {
            id: 'd1',
            type: 'edge-to-edge',
            axis: 'x',
            distance: 5,
            start: { x: 0, y: 0, z: 0 },
            end: { x: 5, y: 0, z: 0 },
            labelPosition: { x: 2.5, y: 0, z: 0 },
            fromPartId: 'p1',
            toPartId: 'p2'
          }
        ]
      });

      useProjectStore.getState().newProject();

      expect(useSnapStore.getState().referencePartIds).toHaveLength(0);
      expect(useSnapStore.getState().activeSnapLines).toHaveLength(0);
      expect(useSnapStore.getState().activeReferenceDistances).toHaveLength(0);
    });

    it('startEditingAssembly clears references', () => {
      const partId = useProjectStore.getState().addPart();
      useSnapStore.getState().addToReferences([partId]);

      useAssemblyEditingStore.getState().startEditingAssembly('assembly-123', 'Test Assembly', [
        {
          id: 'asm-part-1',
          name: 'Asm Part',
          length: 10,
          width: 5,
          thickness: 0.75,
          position: { x: 0, y: 0.375, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          color: '#8B4513',
          stockId: null,
          grainDirection: 'length'
        }
      ]);

      expect(useSnapStore.getState().referencePartIds).toHaveLength(0);
    });
  });
});
