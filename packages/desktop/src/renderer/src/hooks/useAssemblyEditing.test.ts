import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProjectStore } from '../store/projectStore';
import { useAssemblyEditingStore } from '../store/assemblyEditingStore';
import { useLicenseStore } from '../store/licenseStore';
import { useUIStore } from '../store/uiStore';
import type { Assembly } from '../types';

// Mock file operations
vi.mock('../utils/fileOperations', () => ({
  hasUnsavedChanges: vi.fn().mockReturnValue(false)
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

// Mock generateThumbnail
const mockGenerateThumbnail = vi.fn().mockResolvedValue(null);
vi.mock('../store/projectStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../store/projectStore')>();
  return {
    ...actual,
    generateThumbnail: (...args: unknown[]) => mockGenerateThumbnail(...args)
  };
});

// Mock useAssemblyLibrary and useStockLibrary hooks
vi.mock('./useAssemblyLibrary', () => ({
  useAssemblyLibrary: vi.fn().mockReturnValue({
    assemblies: [],
    addAssembly: vi.fn().mockResolvedValue(undefined),
    updateAssembly: vi.fn().mockResolvedValue(undefined)
  })
}));

vi.mock('./useStockLibrary', () => ({
  useStockLibrary: vi.fn().mockReturnValue({
    stocks: []
  })
}));

// Mock uuid with counter for unique IDs
let uuidCounter = 0;
vi.mock('uuid', () => ({
  v4: vi.fn(() => `mock-uuid-${++uuidCounter}`)
}));

import { useAssemblyEditing } from './useAssemblyEditing';
import { hasUnsavedChanges } from '../utils/fileOperations';
import { useAssemblyLibrary } from './useAssemblyLibrary';
import { useStockLibrary } from './useStockLibrary';

// ============================================================
// Setup
// ============================================================

beforeAll(() => {
  window.electronAPI = {
    getPreference: vi.fn(),
    setPreference: vi.fn(),
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
  uuidCounter = 0;
  useProjectStore.setState({
    isDirty: false,
    projectName: 'Test Project',
    filePath: null,
    parts: [],
    stocks: [],
    groups: [],
    groupMembers: [],
    assemblies: []
  });
  useAssemblyEditingStore.setState({
    isEditingAssembly: false,
    editingAssemblyId: null,
    editingAssemblyName: '',
    previousProjectSnapshot: null
  });
  useLicenseStore.setState({ licenseMode: 'trial' });
  useUIStore.setState({ toast: null, manualThumbnail: null });
  (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(false);
  mockGenerateThumbnail.mockResolvedValue(null);
  // Re-establish mock return values after clearAllMocks
  (useAssemblyLibrary as ReturnType<typeof vi.fn>).mockReturnValue({
    assemblies: [],
    addAssembly: vi.fn().mockResolvedValue(undefined),
    updateAssembly: vi.fn().mockResolvedValue(undefined)
  });
  (useStockLibrary as ReturnType<typeof vi.fn>).mockReturnValue({
    stocks: []
  });
});

// ============================================================
// Tests
// ============================================================

describe('useAssemblyEditing', () => {
  describe('initial state', () => {
    it('starts with editing inactive', () => {
      const { result } = renderHook(() => useAssemblyEditing());
      expect(result.current.isEditingAssembly).toBe(false);
      expect(result.current.editingAssemblyName).toBe('');
      expect(result.current.showExitDialog).toBe(false);
      expect(result.current.isCreatingNew).toBe(false);
    });
  });

  describe('startEditing', () => {
    it('enters editing mode for existing assembly', async () => {
      const assembly = {
        id: 'a1',
        name: 'Test Assembly',
        description: 'A test',
        thumbnail: '📦',
        parts: [
          {
            name: 'Part 1',
            length: 24,
            width: 12,
            thickness: 0.75,
            relativePosition: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            stockId: null,
            grainSensitive: false,
            grainDirection: 'length',
            color: '#8B4513'
          }
        ],
        groups: [],
        groupMembers: [],
        createdAt: '2026-01-01',
        modifiedAt: '2026-01-01'
      };

      const { result } = renderHook(() => useAssemblyEditing());

      let success: boolean;
      await act(async () => {
        success = await result.current.startEditing(assembly as unknown as Assembly);
      });

      expect(success!).toBe(true);
    });

    it('blocks when project has unsaved changes', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useAssemblyEditing());

      let success: boolean;
      await act(async () => {
        success = await result.current.startEditing({ id: 'a1', name: 'A' } as unknown as Assembly);
      });

      expect(success!).toBe(false);
      expect(showToast).toHaveBeenCalledWith('Save or discard your project first');
    });
  });

  describe('startCreatingNew', () => {
    it('enters editing mode for new assembly', async () => {
      const { result } = renderHook(() => useAssemblyEditing());

      let success: boolean;
      await act(async () => {
        success = await result.current.startCreatingNew();
      });

      expect(success!).toBe(true);
    });

    it('blocks when in free mode', async () => {
      useLicenseStore.setState({ licenseMode: 'free' });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useAssemblyEditing());

      let success: boolean;
      await act(async () => {
        success = await result.current.startCreatingNew();
      });

      expect(success!).toBe(false);
      expect(showToast).toHaveBeenCalled();
    });

    it('blocks when project has unsaved changes', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useAssemblyEditing());

      let success: boolean;
      await act(async () => {
        success = await result.current.startCreatingNew();
      });

      expect(success!).toBe(false);
      expect(showToast).toHaveBeenCalledWith('Save or discard your project first');
    });
  });

  describe('requestExit', () => {
    it('shows exit dialog when project is dirty', () => {
      useProjectStore.setState({ isDirty: true });

      const { result } = renderHook(() => useAssemblyEditing());

      act(() => {
        result.current.requestExit();
      });

      expect(result.current.showExitDialog).toBe(true);
    });

    it('exits immediately when project is clean', () => {
      useProjectStore.setState({ isDirty: false });
      const cancelEditingAssembly = vi.fn();
      const restorePreviousProject = vi.fn();
      useAssemblyEditingStore.setState({ cancelEditingAssembly, restorePreviousProject });

      const { result } = renderHook(() => useAssemblyEditing());

      act(() => {
        result.current.requestExit();
      });

      expect(result.current.showExitDialog).toBe(false);
      expect(cancelEditingAssembly).toHaveBeenCalled();
      expect(restorePreviousProject).toHaveBeenCalled();
    });
  });

  describe('cancelExit', () => {
    it('closes the exit dialog', () => {
      useProjectStore.setState({ isDirty: true });

      const { result } = renderHook(() => useAssemblyEditing());

      act(() => {
        result.current.requestExit();
      });
      expect(result.current.showExitDialog).toBe(true);

      act(() => {
        result.current.cancelExit();
      });
      expect(result.current.showExitDialog).toBe(false);
    });
  });

  describe('discardAndExit', () => {
    it('cancels editing and restores previous project', () => {
      const cancelEditingAssembly = vi.fn();
      const restorePreviousProject = vi.fn();
      useAssemblyEditingStore.setState({ cancelEditingAssembly, restorePreviousProject });

      const { result } = renderHook(() => useAssemblyEditing());

      act(() => {
        result.current.discardAndExit();
      });

      expect(cancelEditingAssembly).toHaveBeenCalled();
      expect(restorePreviousProject).toHaveBeenCalled();
      expect(result.current.showExitDialog).toBe(false);
    });
  });

  describe('saveAndExit', () => {
    it('shows toast when no editingAssemblyId', async () => {
      useAssemblyEditingStore.setState({ editingAssemblyId: null });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useAssemblyEditing());

      await act(async () => {
        await result.current.saveAndExit();
      });

      expect(showToast).toHaveBeenCalledWith('No assembly to save');
    });

    it('shows toast when saveEditingAssembly returns null', async () => {
      useAssemblyEditingStore.setState({
        editingAssemblyId: 'a1',
        saveEditingAssembly: vi.fn().mockReturnValue(null)
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useAssemblyEditing());

      await act(async () => {
        await result.current.saveAndExit();
      });

      expect(showToast).toHaveBeenCalledWith('Failed to save assembly');
    });

    it('shows toast when assembly has no parts', async () => {
      useAssemblyEditingStore.setState({
        editingAssemblyId: 'a1',
        saveEditingAssembly: vi.fn().mockReturnValue({
          id: 'a1',
          name: 'Empty Assembly',
          parts: [],
          groups: [],
          groupMembers: []
        })
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useAssemblyEditing());

      await act(async () => {
        await result.current.saveAndExit();
      });

      expect(showToast).toHaveBeenCalledWith('Cannot save empty assembly - add at least one part');
    });

    it('creates new assembly when not in library', async () => {
      useAssemblyEditingStore.setState({
        editingAssemblyId: 'a1',
        isEditingAssembly: true,
        saveEditingAssembly: vi.fn().mockReturnValue({
          id: 'a1',
          name: 'New Assembly',
          parts: [{ name: 'Part 1' }],
          groups: [],
          groupMembers: []
        }),
        cancelEditingAssembly: vi.fn(),
        restorePreviousProject: vi.fn()
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const mockAddAssembly = vi.fn().mockResolvedValue(undefined);
      (useAssemblyLibrary as ReturnType<typeof vi.fn>).mockReturnValue({
        assemblies: [], // Not in library
        addAssembly: mockAddAssembly,
        updateAssembly: vi.fn()
      });

      const { result } = renderHook(() => useAssemblyEditing());

      await act(async () => {
        await result.current.saveAndExit();
      });

      expect(mockAddAssembly).toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('Created "New Assembly" in library');
    });

    it('updates existing assembly when in library', async () => {
      useAssemblyEditingStore.setState({
        editingAssemblyId: 'a1',
        isEditingAssembly: true,
        saveEditingAssembly: vi.fn().mockReturnValue({
          id: 'a1',
          name: 'Updated Assembly',
          parts: [{ name: 'Part 1' }],
          groups: [],
          groupMembers: []
        }),
        cancelEditingAssembly: vi.fn(),
        restorePreviousProject: vi.fn()
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const mockUpdateAssembly = vi.fn().mockResolvedValue(undefined);
      (useAssemblyLibrary as ReturnType<typeof vi.fn>).mockReturnValue({
        assemblies: [{ id: 'a1', name: 'Original' }], // In library
        addAssembly: vi.fn(),
        updateAssembly: mockUpdateAssembly
      });

      const { result } = renderHook(() => useAssemblyEditing());

      await act(async () => {
        await result.current.saveAndExit();
      });

      expect(mockUpdateAssembly).toHaveBeenCalledWith('a1', expect.objectContaining({ name: 'Updated Assembly' }));
      expect(showToast).toHaveBeenCalledWith('Saved "Updated Assembly" to library');
    });

    it('shows error toast when addAssembly throws', async () => {
      useAssemblyEditingStore.setState({
        editingAssemblyId: 'a1',
        isEditingAssembly: true,
        saveEditingAssembly: vi.fn().mockReturnValue({
          id: 'a1',
          name: 'New Assembly',
          parts: [{ name: 'Part 1' }],
          groups: [],
          groupMembers: []
        }),
        cancelEditingAssembly: vi.fn(),
        restorePreviousProject: vi.fn()
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const mockAddAssembly = vi.fn().mockRejectedValueOnce(new Error('disk full'));
      (useAssemblyLibrary as ReturnType<typeof vi.fn>).mockReturnValue({
        assemblies: [],
        addAssembly: mockAddAssembly,
        updateAssembly: vi.fn()
      });

      const { result } = renderHook(() => useAssemblyEditing());

      await act(async () => {
        await result.current.saveAndExit();
      });

      expect(showToast).toHaveBeenCalledWith('Failed to save assembly to library');
    });

    it('uses manual thumbnail when available', async () => {
      const clearManualThumbnail = vi.fn();
      useUIStore.setState({
        manualThumbnail: {
          data: 'manual-thumb-base64',
          width: 400,
          height: 300,
          generatedAt: '2026-01-15T00:00:00Z',
          manuallySet: true
        },
        clearManualThumbnail
      });

      useAssemblyEditingStore.setState({
        editingAssemblyId: 'a1',
        isEditingAssembly: true,
        saveEditingAssembly: vi.fn().mockReturnValue({
          id: 'a1',
          name: 'Thumb Assembly',
          parts: [{ name: 'Part 1' }],
          groups: [],
          groupMembers: []
        }),
        cancelEditingAssembly: vi.fn(),
        restorePreviousProject: vi.fn()
      });
      const showToast = vi.fn();
      useUIStore.setState({
        showToast,
        manualThumbnail: {
          data: 'manual-thumb-base64',
          width: 400,
          height: 300,
          generatedAt: '2026-01-15T00:00:00Z',
          manuallySet: true
        },
        clearManualThumbnail
      });

      const mockAddAssembly = vi.fn().mockResolvedValue(undefined);
      (useAssemblyLibrary as ReturnType<typeof vi.fn>).mockReturnValue({
        assemblies: [],
        addAssembly: mockAddAssembly,
        updateAssembly: vi.fn()
      });

      const { result } = renderHook(() => useAssemblyEditing());

      await act(async () => {
        await result.current.saveAndExit();
      });

      const callArgs = mockAddAssembly.mock.calls[0][0];
      expect(callArgs.thumbnailData).toBeDefined();
      expect(callArgs.thumbnailData.data).toBe('manual-thumb-base64');
      expect(callArgs.thumbnailData.manuallySet).toBe(true);
      expect(clearManualThumbnail).toHaveBeenCalled();
    });

    it('preserves manually-set thumbnail when editing existing assembly', async () => {
      const existingThumbnailData = {
        data: 'existing-manual-thumb',
        width: 400,
        height: 300,
        generatedAt: '2026-01-10T00:00:00Z',
        manuallySet: true
      };

      useAssemblyEditingStore.setState({
        editingAssemblyId: 'a1',
        isEditingAssembly: true,
        saveEditingAssembly: vi.fn().mockReturnValue({
          id: 'a1',
          name: 'Existing Assembly',
          parts: [{ name: 'Part 1' }],
          groups: [],
          groupMembers: []
        }),
        cancelEditingAssembly: vi.fn(),
        restorePreviousProject: vi.fn()
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const mockUpdateAssembly = vi.fn().mockResolvedValue(undefined);
      (useAssemblyLibrary as ReturnType<typeof vi.fn>).mockReturnValue({
        assemblies: [{ id: 'a1', name: 'Existing', thumbnailData: existingThumbnailData }],
        addAssembly: vi.fn(),
        updateAssembly: mockUpdateAssembly
      });

      const { result } = renderHook(() => useAssemblyEditing());

      await act(async () => {
        await result.current.saveAndExit();
      });

      const callArgs = mockUpdateAssembly.mock.calls[0][1];
      expect(callArgs.thumbnailData).toEqual(existingThumbnailData);
    });

    it('auto-generates thumbnail when no manual thumbnail and parts exist', async () => {
      mockGenerateThumbnail.mockResolvedValueOnce('auto-generated-base64');

      useAssemblyEditingStore.setState({
        editingAssemblyId: 'a1',
        isEditingAssembly: true,
        saveEditingAssembly: vi.fn().mockReturnValue({
          id: 'a1',
          name: 'Auto Thumb Assembly',
          parts: [{ name: 'Part 1' }],
          groups: [],
          groupMembers: []
        }),
        cancelEditingAssembly: vi.fn(),
        restorePreviousProject: vi.fn()
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const mockAddAssembly = vi.fn().mockResolvedValue(undefined);
      (useAssemblyLibrary as ReturnType<typeof vi.fn>).mockReturnValue({
        assemblies: [],
        addAssembly: mockAddAssembly,
        updateAssembly: vi.fn()
      });

      const { result } = renderHook(() => useAssemblyEditing());

      await act(async () => {
        await result.current.saveAndExit();
      });

      expect(mockGenerateThumbnail).toHaveBeenCalled();
      const callArgs = mockAddAssembly.mock.calls[0][0];
      expect(callArgs.thumbnailData.data).toBe('auto-generated-base64');
      expect(callArgs.thumbnailData.width).toBe(400);
      expect(callArgs.thumbnailData.height).toBe(300);
    });
  });

  describe('assemblyToEditableParts (via startEditing)', () => {
    it('resolves stock from library when available', async () => {
      const startEditingAssembly = vi.fn();
      useAssemblyEditingStore.setState({ startEditingAssembly });

      (useStockLibrary as ReturnType<typeof vi.fn>).mockReturnValue({
        stocks: [
          {
            id: 'stock-1',
            name: 'Oak Plywood',
            length: 96,
            width: 48,
            thickness: 0.75,
            grainDirection: 'length',
            color: '#8B4513'
          }
        ]
      });

      const assembly = {
        id: 'a1',
        name: 'Test',
        description: '',
        thumbnail: '📦',
        parts: [
          {
            name: 'Part 1',
            length: 24,
            width: 12,
            thickness: 0.75,
            relativePosition: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            stockId: 'stock-1',
            grainSensitive: false,
            grainDirection: 'length',
            color: '#8B4513'
          }
        ],
        groups: [],
        groupMembers: [],
        createdAt: '2026-01-01',
        modifiedAt: '2026-01-01'
      };

      const { result } = renderHook(() => useAssemblyEditing());

      await act(async () => {
        await result.current.startEditing(assembly as unknown as Assembly);
      });

      // startEditingAssembly should have been called with the resolved parts
      expect(startEditingAssembly).toHaveBeenCalled();
      // The embeddedStocks (6th arg) should be empty since library stock was found
      const embeddedStocks = startEditingAssembly.mock.calls[0][5];
      expect(embeddedStocks).toHaveLength(0);
    });

    it('creates stock from embedded data when not in library', async () => {
      const startEditingAssembly = vi.fn();
      useAssemblyEditingStore.setState({ startEditingAssembly });

      const assembly = {
        id: 'a1',
        name: 'Test',
        description: '',
        thumbnail: '📦',
        parts: [
          {
            name: 'Part 1',
            length: 24,
            width: 12,
            thickness: 0.75,
            relativePosition: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            stockId: 'missing-stock',
            grainSensitive: false,
            grainDirection: 'length',
            color: '#8B4513',
            embeddedStock: {
              name: 'Embedded Oak',
              length: 96,
              width: 48,
              thickness: 0.75,
              grainDirection: 'length',
              pricingUnit: 'sheet',
              pricePerUnit: 45,
              color: '#8B4513'
            }
          }
        ],
        groups: [],
        groupMembers: [],
        createdAt: '2026-01-01',
        modifiedAt: '2026-01-01'
      };

      const { result } = renderHook(() => useAssemblyEditing());

      await act(async () => {
        await result.current.startEditing(assembly as unknown as Assembly);
      });

      expect(startEditingAssembly).toHaveBeenCalled();
      const embeddedStocks = startEditingAssembly.mock.calls[0][5];
      expect(embeddedStocks).toHaveLength(1);
      expect(embeddedStocks[0].name).toBe('Embedded Oak');
    });

    it('deduplicates embedded stocks with matching name, thickness, and color', async () => {
      const startEditingAssembly = vi.fn();
      useAssemblyEditingStore.setState({ startEditingAssembly });

      const embeddedStock = {
        name: 'Same Stock',
        length: 96,
        width: 48,
        thickness: 0.75,
        grainDirection: 'length',
        pricingUnit: 'sheet',
        pricePerUnit: 45,
        color: '#8B4513'
      };

      const assembly = {
        id: 'a1',
        name: 'Test',
        description: '',
        thumbnail: '📦',
        parts: [
          {
            name: 'Part 1',
            length: 24,
            width: 12,
            thickness: 0.75,
            relativePosition: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            stockId: 'stock-a',
            grainSensitive: false,
            grainDirection: 'length',
            color: '#8B4513',
            embeddedStock
          },
          {
            name: 'Part 2',
            length: 18,
            width: 8,
            thickness: 0.75,
            relativePosition: { x: 10, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            stockId: 'stock-b',
            grainSensitive: false,
            grainDirection: 'length',
            color: '#8B4513',
            embeddedStock // Same embedded stock data
          }
        ],
        groups: [],
        groupMembers: [],
        createdAt: '2026-01-01',
        modifiedAt: '2026-01-01'
      };

      const { result } = renderHook(() => useAssemblyEditing());

      await act(async () => {
        await result.current.startEditing(assembly as unknown as Assembly);
      });

      expect(startEditingAssembly).toHaveBeenCalled();
      // Should deduplicate: only 1 stock created for both parts
      const embeddedStocks = startEditingAssembly.mock.calls[0][5];
      expect(embeddedStocks).toHaveLength(1);
    });

    it('sets stockId to empty string when no embedded data and stock not in library', async () => {
      const startEditingAssembly = vi.fn();
      useAssemblyEditingStore.setState({ startEditingAssembly });

      const assembly = {
        id: 'a1',
        name: 'Test',
        description: '',
        thumbnail: '📦',
        parts: [
          {
            name: 'Part 1',
            length: 24,
            width: 12,
            thickness: 0.75,
            relativePosition: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            stockId: 'non-existent-stock',
            grainSensitive: false,
            grainDirection: 'length',
            color: '#8B4513'
            // No embeddedStock
          }
        ],
        groups: [],
        groupMembers: [],
        createdAt: '2026-01-01',
        modifiedAt: '2026-01-01'
      };

      const { result } = renderHook(() => useAssemblyEditing());

      await act(async () => {
        await result.current.startEditing(assembly as unknown as Assembly);
      });

      expect(startEditingAssembly).toHaveBeenCalled();
      // Parts should have null stockId since resolved to empty string -> null
      const parts = startEditingAssembly.mock.calls[0][2];
      expect(parts[0].stockId).toBeNull();
    });

    it('handles assembly with groups and group members', async () => {
      const startEditingAssembly = vi.fn();
      useAssemblyEditingStore.setState({ startEditingAssembly });

      const assembly = {
        id: 'a1',
        name: 'Grouped Assembly',
        description: '',
        thumbnail: '📦',
        parts: [
          {
            name: 'Side A',
            length: 24,
            width: 12,
            thickness: 0.75,
            relativePosition: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            stockId: null,
            grainSensitive: false,
            grainDirection: 'length',
            color: '#8B4513'
          },
          {
            name: 'Side B',
            length: 24,
            width: 12,
            thickness: 0.75,
            relativePosition: { x: 10, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            stockId: null,
            grainSensitive: false,
            grainDirection: 'length',
            color: '#8B4513'
          }
        ],
        groups: [{ name: 'Sides' }],
        groupMembers: [
          { groupIndex: 0, memberType: 'part', memberIndex: 0 },
          { groupIndex: 0, memberType: 'part', memberIndex: 1 }
        ],
        createdAt: '2026-01-01',
        modifiedAt: '2026-01-01'
      };

      const { result } = renderHook(() => useAssemblyEditing());

      await act(async () => {
        await result.current.startEditing(assembly as unknown as Assembly);
      });

      expect(startEditingAssembly).toHaveBeenCalled();
      const groups = startEditingAssembly.mock.calls[0][3];
      const groupMembers = startEditingAssembly.mock.calls[0][4];
      expect(groups).toHaveLength(1);
      expect(groups[0].name).toBe('Sides');
      expect(groupMembers).toHaveLength(2);
    });

    it('handles parts with null stockId (skips resolution)', async () => {
      const startEditingAssembly = vi.fn();
      useAssemblyEditingStore.setState({ startEditingAssembly });

      const assembly = {
        id: 'a1',
        name: 'Test',
        description: '',
        thumbnail: '📦',
        parts: [
          {
            name: 'Unassigned Part',
            length: 24,
            width: 12,
            thickness: 0.75,
            relativePosition: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            stockId: null,
            grainSensitive: false,
            grainDirection: 'length',
            color: '#8B4513'
          }
        ],
        groups: [],
        groupMembers: [],
        createdAt: '2026-01-01',
        modifiedAt: '2026-01-01'
      };

      const { result } = renderHook(() => useAssemblyEditing());

      await act(async () => {
        await result.current.startEditing(assembly as unknown as Assembly);
      });

      expect(startEditingAssembly).toHaveBeenCalled();
      const parts = startEditingAssembly.mock.calls[0][2];
      expect(parts[0].stockId).toBeNull();
    });
  });
});
