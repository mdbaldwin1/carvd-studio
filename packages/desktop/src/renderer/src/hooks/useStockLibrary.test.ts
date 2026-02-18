import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import { useStockLibrary } from './useStockLibrary';
import type { Stock } from '../types';

// ============================================================
// Setup
// ============================================================

const createTestStock = (overrides: Partial<Stock> = {}): Stock =>
  ({
    id: 's1',
    name: 'Test Plywood',
    length: 96,
    width: 48,
    thickness: 0.75,
    color: '#D2B48C',
    grainDirection: 'length',
    pricingUnit: 'per_item',
    pricePerUnit: 45,
    ...overrides
  }) as Stock;

beforeAll(() => {
  window.electronAPI = {
    getPreference: vi.fn().mockResolvedValue([]),
    setPreference: vi.fn().mockResolvedValue(undefined),
    onSettingsChanged: vi.fn().mockReturnValue(() => {}),
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
  // Re-establish mock return values
  (window.electronAPI.getPreference as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.setPreference as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (window.electronAPI.onSettingsChanged as ReturnType<typeof vi.fn>).mockReturnValue(() => {});
});

// ============================================================
// Tests
// ============================================================

describe('useStockLibrary', () => {
  describe('initial state', () => {
    it('returns stocks array', () => {
      const { result } = renderHook(() => useStockLibrary());
      expect(Array.isArray(result.current.stocks)).toBe(true);
    });

    it('provides CRUD functions', () => {
      const { result } = renderHook(() => useStockLibrary());
      expect(typeof result.current.addStock).toBe('function');
      expect(typeof result.current.updateStock).toBe('function');
      expect(typeof result.current.deleteStock).toBe('function');
      expect(typeof result.current.findStock).toBe('function');
    });
  });

  describe('addStock', () => {
    it('adds stock to library and persists', async () => {
      const stock = createTestStock();
      (window.electronAPI.getPreference as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const { result } = renderHook(() => useStockLibrary());

      await act(async () => {
        await result.current.addStock(stock);
      });

      expect(window.electronAPI.setPreference).toHaveBeenCalledWith('stockLibrary', [stock]);
    });

    it('appends to existing stocks', async () => {
      const existing = createTestStock({ id: 's-existing', name: 'Existing' });
      const newStock = createTestStock({ id: 's-new', name: 'New Stock' });
      (window.electronAPI.getPreference as ReturnType<typeof vi.fn>).mockResolvedValue([existing]);

      const { result } = renderHook(() => useStockLibrary());

      await act(async () => {
        await result.current.addStock(newStock);
      });

      expect(window.electronAPI.setPreference).toHaveBeenCalledWith('stockLibrary', [existing, newStock]);
    });
  });

  describe('updateStock', () => {
    it('updates stock properties', async () => {
      const stock = createTestStock({ id: 's1', name: 'Original' });
      (window.electronAPI.getPreference as ReturnType<typeof vi.fn>).mockResolvedValue([stock]);

      const { result } = renderHook(() => useStockLibrary());

      await act(async () => {
        await result.current.updateStock('s1', { name: 'Updated' });
      });

      expect(window.electronAPI.setPreference).toHaveBeenCalledWith('stockLibrary', [
        expect.objectContaining({ id: 's1', name: 'Updated' })
      ]);
    });

    it('does not modify other stocks', async () => {
      const stock1 = createTestStock({ id: 's1', name: 'Stock 1' });
      const stock2 = createTestStock({ id: 's2', name: 'Stock 2' });
      (window.electronAPI.getPreference as ReturnType<typeof vi.fn>).mockResolvedValue([stock1, stock2]);

      const { result } = renderHook(() => useStockLibrary());

      await act(async () => {
        await result.current.updateStock('s1', { name: 'Updated 1' });
      });

      const savedStocks = (window.electronAPI.setPreference as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(savedStocks[0].name).toBe('Updated 1');
      expect(savedStocks[1].name).toBe('Stock 2');
    });
  });

  describe('deleteStock', () => {
    it('removes stock by id', async () => {
      const stock1 = createTestStock({ id: 's1' });
      const stock2 = createTestStock({ id: 's2' });
      (window.electronAPI.getPreference as ReturnType<typeof vi.fn>).mockResolvedValue([stock1, stock2]);

      const { result } = renderHook(() => useStockLibrary());

      await act(async () => {
        await result.current.deleteStock('s1');
      });

      expect(window.electronAPI.setPreference).toHaveBeenCalledWith('stockLibrary', [stock2]);
    });
  });

  describe('findStock', () => {
    it('returns undefined when stock not found', () => {
      const { result } = renderHook(() => useStockLibrary());
      const found = result.current.findStock('nonexistent');
      expect(found).toBeUndefined();
    });

    it('returns the stock when found by id', async () => {
      const stock = createTestStock({ id: 's-find-me', name: 'Find Me' });

      const { result } = renderHook(() => useStockLibrary());

      // Add a stock so it's in the singleton state
      (window.electronAPI.getPreference as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      await act(async () => {
        await result.current.addStock(stock);
      });

      // Now findStock should find it
      const found = result.current.findStock('s-find-me');
      expect(found).toBeDefined();
      expect(found?.name).toBe('Find Me');
    });
  });

  describe('saveLibrary error handling', () => {
    it('logs error when setPreference fails during save', async () => {
      const { logger } = await import('../utils/logger');
      (window.electronAPI.getPreference as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (window.electronAPI.setPreference as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Save failed'));

      const { result } = renderHook(() => useStockLibrary());

      await act(async () => {
        await result.current.addStock(createTestStock());
      });

      expect(logger.error).toHaveBeenCalledWith('Failed to save stock library:', expect.any(Error));
    });
  });

  describe('initStockLibrarySingleton error handling', () => {
    it('handles load error from getPreference', async () => {
      // Need a fresh module to test init error path
      vi.resetModules();

      // Set up the mock to reject
      (window.electronAPI.getPreference as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Load failed'));
      (window.electronAPI.onSettingsChanged as ReturnType<typeof vi.fn>).mockReturnValue(() => {});

      const { logger: freshLogger } = await import('../utils/logger');
      const freshModule = await import('./useStockLibrary');

      const { result } = renderHook(() => freshModule.useStockLibrary());

      // Wait for the async init to complete
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(freshLogger.error).toHaveBeenCalledWith('Failed to load stock library:', expect.any(Error));
      // After error, stocks should be empty array and loading should be false
      expect(result.current.stocks).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('onSettingsChanged cross-instance sync', () => {
    it('updates stocks when onSettingsChanged fires with stockLibrary', async () => {
      // Capture the onSettingsChanged callback
      let settingsChangedCallback: ((changes: Record<string, unknown>) => void) | null = null;
      (window.electronAPI.onSettingsChanged as ReturnType<typeof vi.fn>).mockImplementation(
        (cb: (changes: Record<string, unknown>) => void) => {
          settingsChangedCallback = cb;
          return () => {};
        }
      );

      // We need a fresh module to register the onSettingsChanged listener.
      // Use dynamic import with resetModules to get a fresh singleton.
      vi.resetModules();
      const freshModule = await import('./useStockLibrary');

      const { result } = renderHook(() => freshModule.useStockLibrary());

      // Wait for initialization
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      // Simulate cross-instance change
      const updatedStocks = [createTestStock({ id: 's-synced', name: 'Synced Stock' })];
      expect(settingsChangedCallback).not.toBeNull();

      await act(async () => {
        settingsChangedCallback!({ stockLibrary: updatedStocks });
      });

      expect(result.current.stocks).toEqual(updatedStocks);
    });
  });
});
