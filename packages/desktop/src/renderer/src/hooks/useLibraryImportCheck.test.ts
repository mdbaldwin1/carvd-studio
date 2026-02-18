import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

// Mock libraryImport utilities
vi.mock('../utils/libraryImport', () => ({
  detectMissingLibraryItems: vi.fn().mockReturnValue({
    hasItems: false,
    missingStocks: [],
    missingAssemblies: []
  }),
  createLibraryStockFromProject: vi.fn().mockImplementation((stock) => ({ ...stock, isLibrary: true })),
  createLibraryAssemblyFromProject: vi.fn().mockImplementation((assembly) => ({ ...assembly, isLibrary: true }))
}));

// Mock useStockLibrary
vi.mock('./useStockLibrary', () => ({
  useStockLibrary: vi.fn().mockReturnValue({
    stocks: [],
    isLoading: false,
    addStock: vi.fn().mockResolvedValue(undefined)
  })
}));

// Mock useAssemblyLibrary
vi.mock('./useAssemblyLibrary', () => ({
  useAssemblyLibrary: vi.fn().mockReturnValue({
    assemblies: [],
    isLoading: false,
    addAssembly: vi.fn().mockResolvedValue(undefined)
  })
}));

import { useLibraryImportCheck } from './useLibraryImportCheck';
import { detectMissingLibraryItems } from '../utils/libraryImport';
import { useStockLibrary } from './useStockLibrary';
import { useAssemblyLibrary } from './useAssemblyLibrary';
import type { Stock, Assembly } from '../types';

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
  vi.useFakeTimers();

  useProjectStore.setState({
    stocks: [],
    assemblies: [],
    filePath: null
  });
  useUIStore.setState({ toast: null });

  // Re-establish mock return values
  (detectMissingLibraryItems as ReturnType<typeof vi.fn>).mockReturnValue({
    hasItems: false,
    missingStocks: [],
    missingAssemblies: []
  });
  (useStockLibrary as ReturnType<typeof vi.fn>).mockReturnValue({
    stocks: [],
    isLoading: false,
    addStock: vi.fn().mockResolvedValue(undefined)
  });
  (useAssemblyLibrary as ReturnType<typeof vi.fn>).mockReturnValue({
    assemblies: [],
    isLoading: false,
    addAssembly: vi.fn().mockResolvedValue(undefined)
  });
});

afterEach(() => {
  vi.useRealTimers();
});

// ============================================================
// Tests
// ============================================================

describe('useLibraryImportCheck', () => {
  describe('initial state', () => {
    it('starts with dialog hidden', () => {
      const { result } = renderHook(() => useLibraryImportCheck());
      expect(result.current.showImportDialog).toBe(false);
      expect(result.current.missingStocks).toEqual([]);
      expect(result.current.missingAssemblies).toEqual([]);
    });
  });

  describe('detection', () => {
    it('does not check when libraries are loading', async () => {
      (useStockLibrary as ReturnType<typeof vi.fn>).mockReturnValue({
        stocks: [],
        isLoading: true,
        addStock: vi.fn()
      });
      useProjectStore.setState({ filePath: '/path/to/project.carvd' });

      renderHook(() => useLibraryImportCheck());

      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      expect(detectMissingLibraryItems).not.toHaveBeenCalled();
    });

    it('does not check when no file is loaded', async () => {
      useProjectStore.setState({ filePath: null });

      renderHook(() => useLibraryImportCheck());

      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      expect(detectMissingLibraryItems).not.toHaveBeenCalled();
    });

    it('shows dialog when missing items detected', async () => {
      const missingStock = { id: 's1', name: 'Missing Plywood' } as Stock;
      (detectMissingLibraryItems as ReturnType<typeof vi.fn>).mockReturnValue({
        hasItems: true,
        missingStocks: [missingStock],
        missingAssemblies: []
      });
      useProjectStore.setState({ filePath: '/path/to/project.carvd' });

      const { result } = renderHook(() => useLibraryImportCheck());

      // Wait for the 100ms debounce
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current.showImportDialog).toBe(true);
      expect(result.current.missingStocks).toEqual([missingStock]);
    });

    it('does not re-check same file path', async () => {
      useProjectStore.setState({ filePath: '/path/to/project.carvd' });

      const { rerender } = renderHook(() => useLibraryImportCheck());

      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // Should have checked once
      expect(detectMissingLibraryItems).toHaveBeenCalledTimes(1);

      // Rerender with same path
      rerender();

      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // Should not check again
      expect(detectMissingLibraryItems).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleImport', () => {
    it('imports selected stocks and assemblies', async () => {
      const mockAddStock = vi.fn().mockResolvedValue(undefined);
      const mockAddAssembly = vi.fn().mockResolvedValue(undefined);
      (useStockLibrary as ReturnType<typeof vi.fn>).mockReturnValue({
        stocks: [],
        isLoading: false,
        addStock: mockAddStock
      });
      (useAssemblyLibrary as ReturnType<typeof vi.fn>).mockReturnValue({
        assemblies: [],
        isLoading: false,
        addAssembly: mockAddAssembly
      });

      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useLibraryImportCheck());

      const stocksToImport = [{ id: 's1', name: 'Stock 1' }] as Stock[];
      const assembliesToImport = [{ id: 'a1', name: 'Assembly 1' }] as Assembly[];

      await act(async () => {
        await result.current.handleImport(stocksToImport, assembliesToImport);
      });

      expect(mockAddStock).toHaveBeenCalledTimes(1);
      expect(mockAddAssembly).toHaveBeenCalledTimes(1);
      expect(showToast).toHaveBeenCalledWith('Added 2 items to library');
      expect(result.current.showImportDialog).toBe(false);
    });

    it('shows singular message for 1 item', async () => {
      const mockAddStock = vi.fn().mockResolvedValue(undefined);
      (useStockLibrary as ReturnType<typeof vi.fn>).mockReturnValue({
        stocks: [],
        isLoading: false,
        addStock: mockAddStock
      });
      (useAssemblyLibrary as ReturnType<typeof vi.fn>).mockReturnValue({
        assemblies: [],
        isLoading: false,
        addAssembly: vi.fn()
      });

      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useLibraryImportCheck());

      await act(async () => {
        await result.current.handleImport([{ id: 's1' }] as Stock[], []);
      });

      expect(showToast).toHaveBeenCalledWith('Added 1 item to library');
    });

    it('handles import errors gracefully', async () => {
      const mockAddStock = vi.fn().mockRejectedValue(new Error('Import failed'));
      (useStockLibrary as ReturnType<typeof vi.fn>).mockReturnValue({
        stocks: [],
        isLoading: false,
        addStock: mockAddStock
      });
      (useAssemblyLibrary as ReturnType<typeof vi.fn>).mockReturnValue({
        assemblies: [],
        isLoading: false,
        addAssembly: vi.fn()
      });

      const { result } = renderHook(() => useLibraryImportCheck());

      // Should not throw
      await act(async () => {
        await result.current.handleImport([{ id: 's1' }] as Stock[], []);
      });

      // Dialog should still close
      expect(result.current.showImportDialog).toBe(false);
    });
  });

  describe('handleSkip', () => {
    it('closes dialog and clears state', async () => {
      // First trigger the dialog
      const missingStock = { id: 's1', name: 'Missing' } as Stock;
      (detectMissingLibraryItems as ReturnType<typeof vi.fn>).mockReturnValue({
        hasItems: true,
        missingStocks: [missingStock],
        missingAssemblies: []
      });
      useProjectStore.setState({ filePath: '/path/to/project.carvd' });

      const { result } = renderHook(() => useLibraryImportCheck());

      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current.showImportDialog).toBe(true);

      act(() => {
        result.current.handleSkip();
      });

      expect(result.current.showImportDialog).toBe(false);
      expect(result.current.missingStocks).toEqual([]);
      expect(result.current.missingAssemblies).toEqual([]);
    });
  });
});
