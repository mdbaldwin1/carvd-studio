import { beforeEach, describe, expect, it, vi } from 'vitest';

// These actions exercise real three.js rotation math; keep the module unmocked.
vi.unmock('three');

import {
  captureCanvas,
  generateThumbnail,
  registerCanvasCaptureHandler,
  registerThumbnailGenerator,
  unregisterCanvasCaptureHandler,
  unregisterThumbnailGenerator,
  useProjectStore
} from './projectStore';
import { useSelectionStore } from './selectionStore';
import { useSnapStore } from './snapStore';
import { useUIStore } from './uiStore';

describe('projectStore actions', () => {
  beforeEach(() => {
    useProjectStore.getState().newProject();
    useSelectionStore.setState({ selectedPartIds: [], selectedGroupIds: [], editingGroupId: null });
    useSnapStore.setState({ referencePartIds: [] });
    useUIStore.setState({ showToast: vi.fn() });
  });

  describe('rotateSelectedParts', () => {
    it('rotates a selected part around a pivot', () => {
      const store = useProjectStore.getState();
      const partId = store.addPart({ name: 'Spinner', position: { x: 4, y: 1, z: 0 } });
      useSelectionStore.setState({ selectedPartIds: [partId!], selectedGroupIds: [] });

      store.rotateSelectedParts('y', 90, { x: 0, y: 1, z: 0 });

      const rotated = useProjectStore.getState().parts.find((p) => p.id === partId)!;
      expect(rotated.rotation.y).toBeCloseTo(90);
      // (4,0) rotated 90° about the pivot in XZ lands on (0,-4)
      expect(rotated.position.x).toBeCloseTo(0);
      expect(rotated.position.z).toBeCloseTo(-4);
    });

    it('does nothing for empty selections or zero-degree rotations', () => {
      const store = useProjectStore.getState();
      const partId = store.addPart({ position: { x: 4, y: 1, z: 0 } });
      useSelectionStore.setState({ selectedPartIds: [], selectedGroupIds: [] });
      store.rotateSelectedParts('y', 90, { x: 0, y: 0, z: 0 });
      useSelectionStore.setState({ selectedPartIds: [partId!], selectedGroupIds: [] });
      store.rotateSelectedParts('y', 0, { x: 0, y: 0, z: 0 });

      const part = useProjectStore.getState().parts.find((p) => p.id === partId)!;
      expect(part.rotation.y).toBe(0);
      expect(part.position.x).toBeCloseTo(4);
    });
  });

  describe('deleteSelectedParts', () => {
    it('removes selected parts, their selection, and snap references', () => {
      const store = useProjectStore.getState();
      const keepId = store.addPart({ name: 'Keep' });
      const dropId = store.addPart({ name: 'Drop' });
      useSelectionStore.setState({ selectedPartIds: [dropId!], selectedGroupIds: [] });
      useSnapStore.setState({ referencePartIds: [dropId!, keepId!] });

      store.deleteSelectedParts();

      const state = useProjectStore.getState();
      expect(state.parts.map((p) => p.id)).toEqual([keepId]);
      expect(useSelectionStore.getState().selectedPartIds).toEqual([]);
      expect(useSnapStore.getState().referencePartIds).toEqual([keepId]);
    });
  });

  describe('canvas capture and thumbnail registries', () => {
    it('invokes a registered canvas capture handler and ignores calls after unregister', async () => {
      const handler = vi.fn(async () => {});
      registerCanvasCaptureHandler(handler);
      await captureCanvas();
      expect(handler).toHaveBeenCalledTimes(1);

      unregisterCanvasCaptureHandler();
      await captureCanvas();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('returns generated thumbnails and null after unregister', async () => {
      registerThumbnailGenerator(async () => 'data:image/png;base64,abc');
      expect(await generateThumbnail()).toBe('data:image/png;base64,abc');

      unregisterThumbnailGenerator();
      expect(await generateThumbnail()).toBeNull();
    });
  });
  describe('updatePart overlap prevention', () => {
    it('clamps a position update short of overlapping another part', () => {
      const store = useProjectStore.getState();
      store.addPart({ name: 'A', length: 4, width: 4, thickness: 1, position: { x: 0, y: 0.5, z: 0 } });
      const bId = store.addPart({ name: 'B', length: 4, width: 4, thickness: 1, position: { x: 10, y: 0.5, z: 0 } });

      const didUpdate = store.updatePart(bId!, { position: { x: 0, y: 0.5, z: 0 } });

      // The safe-translation solver clamps the move at contact instead of
      // letting the parts interpenetrate.
      expect(didUpdate).toBe(true);
      const b = useProjectStore.getState().parts.find((part) => part.id === bId)!;
      expect(b.position.x).toBeGreaterThanOrEqual(3.9);
      expect(b.position.x).toBeLessThan(10);
    });

    it('rejects a position update when no safe movement exists', () => {
      const store = useProjectStore.getState();
      store.addPart({ name: 'A', length: 4, width: 4, thickness: 1, position: { x: 0, y: 0.5, z: 0 } });
      const bId = store.addPart({
        name: 'B',
        length: 4,
        width: 4,
        thickness: 1,
        position: { x: 4.0005, y: 0.5, z: 0 }
      });

      const didUpdate = store.updatePart(bId!, { position: { x: 2, y: 0.5, z: 0 } });

      expect(didUpdate).toBe(false);
      expect(useProjectStore.getState().parts.find((p) => p.id === bId)!.position.x).toBeCloseTo(4.0005);
    });

    it('allows a non-overlapping position update', () => {
      const store = useProjectStore.getState();
      store.addPart({ name: 'A', length: 4, width: 4, thickness: 1, position: { x: 0, y: 0.5, z: 0 } });
      const bId = store.addPart({ name: 'B', length: 4, width: 4, thickness: 1, position: { x: 10, y: 0.5, z: 0 } });

      const didUpdate = store.updatePart(bId!, { position: { x: 20, y: 0.5, z: 0 } });

      expect(didUpdate).toBe(true);
      expect(useProjectStore.getState().parts.find((p) => p.id === bId)!.position.x).toBeCloseTo(20);
    });
  });

  describe('updateStock dimension clamping', () => {
    it('clamps non-positive dimensions to a small positive floor', () => {
      const store = useProjectStore.getState();
      const stockId = store.addStock({ name: 'Sheet', length: 96, width: 48, thickness: 0.75 });

      store.updateStock(stockId!, { length: -5, width: 0, thickness: -1 });

      const stock = useProjectStore.getState().stocks.find((s) => s.id === stockId)!;
      expect(stock.length).toBe(0.001);
      expect(stock.width).toBe(0.001);
      expect(stock.thickness).toBe(0.001);
    });
  });

  describe('placeAssembly stock resolution', () => {
    it('creates a project stock from embedded stock data when no match exists', () => {
      const store = useProjectStore.getState();
      store.addAssembly({
        id: 'asm-1',
        name: 'Shelf Unit',
        description: '',
        thumbnail: '',
        parts: [
          {
            name: 'Shelf',
            length: 24,
            width: 10,
            thickness: 0.75,
            relativePosition: { x: 0, y: 0.375, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            stockId: 'stale-stock-id',
            embeddedStock: {
              name: 'Embedded Ply',
              length: 96,
              width: 48,
              thickness: 0.75,
              color: '#deb887',
              grainDirection: 'length',
              pricingUnit: 'sheet',
              price: 45
            },
            grainSensitive: false,
            grainDirection: 'length',
            color: '#deb887'
          }
        ],
        groups: [],
        groupMembers: [],
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      } as never);

      store.placeAssembly('asm-1', { x: 0, y: 0, z: 0 });

      const state = useProjectStore.getState();
      const created = state.stocks.find((s) => s.name === 'Embedded Ply');
      expect(created).toBeDefined();
      const placed = state.parts.find((p) => p.name === 'Shelf');
      expect(placed?.stockId).toBe(created!.id);
    });
  });
});
