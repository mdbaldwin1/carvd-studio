import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppSettings } from './useAppSettings';
import { useAppSettingsStore } from '../store/appSettingsStore';

describe('useAppSettings', () => {
  const mockSettings = {
    defaultUnits: 'imperial' as const,
    defaultGridSize: 0.0625,
    theme: 'dark' as const,
    confirmBeforeDelete: true,
    showHotkeyHints: true,
    stockConstraints: {
      constrainDimensions: true,
      constrainGrain: true,
      constrainColor: true,
      preventOverlap: true
    },
    liveGridSnap: false,
    snapSensitivity: 'normal' as const,
    snapToOrigin: true,
    dimensionSnapSameTypeOnly: false
  };

  beforeAll(() => {
    // Mock electronAPI
    window.electronAPI = {
      getPreference: vi.fn(),
      setPreference: vi.fn(),
      onSettingsChanged: vi.fn().mockReturnValue(() => {}),
      getCustomColors: vi.fn(),
      addCustomColor: vi.fn(),
      removeCustomColor: vi.fn(),
      onMenuCommand: vi.fn(),
      removeMenuCommandListener: vi.fn(),
      openExternal: vi.fn(),
      onUpdaterEvent: vi.fn(),
      removeUpdaterEventListener: vi.fn()
    } as unknown as typeof window.electronAPI;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the store state - set isInitialized to true to skip init API call
    useAppSettingsStore.setState({
      settings: mockSettings,
      isLoading: false,
      isInitialized: true
    });
    vi.mocked(window.electronAPI.getPreference).mockResolvedValue(mockSettings);
    vi.mocked(window.electronAPI.setPreference).mockResolvedValue(undefined);
  });

  describe('initialization', () => {
    it('returns settings from the store', () => {
      const { result } = renderHook(() => useAppSettings());

      expect(result.current.settings).toBeDefined();
      expect(result.current.settings.defaultUnits).toBeDefined();
    });

    it('returns loading state', () => {
      const { result } = renderHook(() => useAppSettings());

      expect(typeof result.current.isLoading).toBe('boolean');
    });

    it('returns updateSettings function', () => {
      const { result } = renderHook(() => useAppSettings());

      expect(typeof result.current.updateSettings).toBe('function');
    });
  });

  describe('settings values', () => {
    it('provides default units setting', () => {
      const { result } = renderHook(() => useAppSettings());

      expect(result.current.settings.defaultUnits).toMatch(/imperial|metric/);
    });

    it('provides default grid size setting', () => {
      const { result } = renderHook(() => useAppSettings());

      expect(typeof result.current.settings.defaultGridSize).toBe('number');
    });

    it('provides theme setting', () => {
      const { result } = renderHook(() => useAppSettings());

      expect(result.current.settings.theme).toMatch(/dark|light/);
    });

    it('provides confirmBeforeDelete setting', () => {
      const { result } = renderHook(() => useAppSettings());

      expect(typeof result.current.settings.confirmBeforeDelete).toBe('boolean');
    });

    it('provides stockConstraints setting', () => {
      const { result } = renderHook(() => useAppSettings());

      expect(result.current.settings.stockConstraints).toBeDefined();
      expect(typeof result.current.settings.stockConstraints.constrainDimensions).toBe('boolean');
    });
  });

  describe('updateSettings', () => {
    it('can update a single setting', async () => {
      const { result } = renderHook(() => useAppSettings());

      await act(async () => {
        await result.current.updateSettings({ defaultUnits: 'metric' });
      });

      expect(window.electronAPI.setPreference).toHaveBeenCalled();
    });

    it('updates the local store state', async () => {
      const { result } = renderHook(() => useAppSettings());

      await act(async () => {
        await result.current.updateSettings({ defaultUnits: 'metric' });
      });

      expect(result.current.settings.defaultUnits).toBe('metric');
    });

    it('can update multiple settings at once', async () => {
      const { result } = renderHook(() => useAppSettings());

      await act(async () => {
        await result.current.updateSettings({
          defaultUnits: 'metric',
          defaultGridSize: 1
        });
      });

      expect(result.current.settings.defaultUnits).toBe('metric');
      expect(result.current.settings.defaultGridSize).toBe(1);
    });

    it('can update theme', async () => {
      const { result } = renderHook(() => useAppSettings());

      await act(async () => {
        await result.current.updateSettings({ theme: 'light' });
      });

      expect(result.current.settings.theme).toBe('light');
    });

    it('can update nested stockConstraints', async () => {
      const { result } = renderHook(() => useAppSettings());

      await act(async () => {
        await result.current.updateSettings({
          stockConstraints: {
            constrainDimensions: false,
            constrainGrain: false,
            constrainColor: true,
            preventOverlap: true
          }
        });
      });

      expect(result.current.settings.stockConstraints.constrainDimensions).toBe(false);
    });
  });
});
