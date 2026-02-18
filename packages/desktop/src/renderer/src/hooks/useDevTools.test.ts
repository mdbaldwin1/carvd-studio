import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProjectStore } from '../store/projectStore';
import { useSelectionStore } from '../store/selectionStore';

// Mock seedData
vi.mock('../utils/seedData', () => ({
  generateSeedProject: vi.fn().mockReturnValue({
    version: '1.0',
    name: 'Simple Writing Desk',
    parts: [{ id: 'p1', name: 'Top' }],
    stocks: [{ id: 's1', name: 'Plywood' }],
    groups: [{ id: 'g1', name: 'Legs' }],
    groupMembers: [],
    assemblies: [],
    units: 'imperial',
    gridSize: 1,
    kerfWidth: 0.125,
    overageFactor: 1.0,
    projectNotes: '',
    stockConstraints: {
      constrainDimensions: true,
      constrainGrain: true,
      constrainColor: true,
      preventOverlap: true
    },
    createdAt: '2026-01-01',
    modifiedAt: '2026-01-01'
  }),
  generateStockLibraryItems: vi.fn().mockReturnValue([
    { name: 'Common Plywood', id: 'seed-1' },
    { name: 'Oak Board', id: 'seed-2' }
  ])
}));

import { useDevTools } from './useDevTools';
import { generateSeedProject, generateStockLibraryItems } from '../utils/seedData';

// ============================================================
// Setup
// ============================================================

const originalDev = import.meta.env.DEV;

const seedProjectData = {
  version: '1.0',
  name: 'Simple Writing Desk',
  parts: [{ id: 'p1', name: 'Top' }],
  stocks: [{ id: 's1', name: 'Plywood' }],
  groups: [{ id: 'g1', name: 'Legs' }],
  groupMembers: [],
  assemblies: [],
  units: 'imperial',
  gridSize: 1,
  kerfWidth: 0.125,
  overageFactor: 1.0,
  projectNotes: '',
  stockConstraints: {
    constrainDimensions: true,
    constrainGrain: true,
    constrainColor: true,
    preventOverlap: true
  },
  createdAt: '2026-01-01',
  modifiedAt: '2026-01-01'
};

const seedStockItems = [
  { name: 'Common Plywood', id: 'seed-1' },
  { name: 'Oak Board', id: 'seed-2' }
];

beforeAll(() => {
  window.electronAPI = {
    getPreference: vi.fn().mockResolvedValue([]),
    setPreference: vi.fn().mockResolvedValue(undefined),
    showSaveDialog: vi.fn(),
    showOpenDialog: vi.fn(),
    writeBinaryFile: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    addRecentProject: vi.fn(),
    getRecentProjects: vi.fn(),
    clearRecentProjects: vi.fn(),
    setWindowTitle: vi.fn()
  } as unknown as typeof window.electronAPI;
});

beforeEach(() => {
  vi.clearAllMocks();
  (window.electronAPI.getPreference as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.setPreference as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (generateSeedProject as ReturnType<typeof vi.fn>).mockReturnValue(seedProjectData);
  (generateStockLibraryItems as ReturnType<typeof vi.fn>).mockReturnValue(seedStockItems);
  useProjectStore.setState({
    projectName: 'Test Project',
    parts: [],
    stocks: [],
    groups: [],
    groupMembers: [],
    assemblies: []
  });
  useSelectionStore.setState({ selectedPartIds: [] });
  delete window.carvdDev;
});

afterEach(() => {
  delete window.carvdDev;
});

// ============================================================
// Tests
// ============================================================

describe('useDevTools', () => {
  // In vitest, import.meta.env.DEV is true by default

  describe('in development mode', () => {
    it('exposes window.carvdDev on mount', () => {
      renderHook(() => useDevTools());
      expect(window.carvdDev).toBeDefined();
    });

    it('cleans up window.carvdDev on unmount', () => {
      const { unmount } = renderHook(() => useDevTools());
      expect(window.carvdDev).toBeDefined();

      unmount();
      expect(window.carvdDev).toBeUndefined();
    });

    it('exposes all dev tool functions', () => {
      renderHook(() => useDevTools());
      expect(typeof window.carvdDev!.loadSeedProject).toBe('function');
      expect(typeof window.carvdDev!.seedStockLibrary).toBe('function');
      expect(typeof window.carvdDev!.clearProject).toBe('function');
      expect(typeof window.carvdDev!.getProjectState).toBe('function');
      expect(typeof window.carvdDev!.createParts).toBe('function');
      expect(typeof window.carvdDev!.measureUndoSnapshot).toBe('function');
      expect(typeof window.carvdDev!.perfBaseline).toBe('function');
    });
  });

  describe('loadSeedProject', () => {
    it('loads the seed project into the store', () => {
      const loadProject = vi.fn();
      useProjectStore.setState({ loadProject });

      renderHook(() => useDevTools());
      window.carvdDev!.loadSeedProject();

      expect(loadProject).toHaveBeenCalledWith(expect.objectContaining({ name: 'Simple Writing Desk' }));
    });
  });

  describe('seedStockLibrary', () => {
    it('merges seed stocks with existing library', async () => {
      (window.electronAPI.getPreference as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      renderHook(() => useDevTools());
      await window.carvdDev!.seedStockLibrary();

      expect(window.electronAPI.setPreference).toHaveBeenCalledWith(
        'stockLibrary',
        expect.arrayContaining([
          expect.objectContaining({ name: 'Common Plywood' }),
          expect.objectContaining({ name: 'Oak Board' })
        ])
      );
    });

    it('skips stocks that already exist by name', async () => {
      (window.electronAPI.getPreference as ReturnType<typeof vi.fn>).mockResolvedValue([
        { name: 'Common Plywood', id: 'existing-1' }
      ]);

      renderHook(() => useDevTools());
      await window.carvdDev!.seedStockLibrary();

      // Should only add Oak Board (Common Plywood already exists)
      const savedStocks = (window.electronAPI.setPreference as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(savedStocks).toHaveLength(2); // existing + 1 new
      const names = savedStocks.map((s: { name: string }) => s.name);
      expect(names).toContain('Common Plywood');
      expect(names).toContain('Oak Board');
    });
  });

  describe('clearProject', () => {
    it('calls newProject on the store', () => {
      const newProjectFn = vi.fn();
      useProjectStore.setState({ newProject: newProjectFn });

      renderHook(() => useDevTools());
      window.carvdDev!.clearProject();

      expect(newProjectFn).toHaveBeenCalled();
    });
  });

  describe('getProjectState', () => {
    it('returns project state summary', () => {
      useProjectStore.setState({
        projectName: 'My Project',
        parts: [{ id: 'p1' }] as never[],
        stocks: [{ id: 's1' }, { id: 's2' }] as never[],
        groups: [] as never[]
      });

      renderHook(() => useDevTools());
      const state = window.carvdDev!.getProjectState() as {
        projectName: string;
        partsCount: number;
        stocksCount: number;
      };

      expect(state.projectName).toBe('My Project');
      expect(state.partsCount).toBe(1);
      expect(state.stocksCount).toBe(2);
    });
  });

  describe('createParts', () => {
    it('creates specified number of parts', () => {
      const addPart = vi.fn().mockReturnValue({ id: 'new-part' });
      const clearSelection = vi.fn();
      useProjectStore.setState({ addPart });
      useSelectionStore.setState({ clearSelection });

      renderHook(() => useDevTools());
      window.carvdDev!.createParts(5);

      expect(addPart).toHaveBeenCalledTimes(5);
      expect(clearSelection).toHaveBeenCalled();
    });
  });

  describe('measureUndoSnapshot', () => {
    it('logs message when no undo history', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      // Mock temporal state
      useProjectStore.temporal = {
        getState: () => ({ pastStates: [], futureStates: [] })
      } as never;

      renderHook(() => useDevTools());
      window.carvdDev!.measureUndoSnapshot();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No undo history'));
      consoleSpy.mockRestore();
    });
  });

  describe('perfBaseline', () => {
    it('prints performance baseline without errors', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      useProjectStore.temporal = {
        getState: () => ({ pastStates: [], futureStates: [] })
      } as never;

      renderHook(() => useDevTools());
      window.carvdDev!.perfBaseline();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Performance Baseline'));
      consoleSpy.mockRestore();
    });
  });
});
