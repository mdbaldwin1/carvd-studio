import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCustomColors } from './useCustomColors';

describe('useCustomColors', () => {
  beforeAll(() => {
    window.electronAPI = {
      getCustomColors: vi.fn(),
      addCustomColor: vi.fn(),
      removeCustomColor: vi.fn(),
      // Add other required methods as stubs
      getPreference: vi.fn(),
      setPreference: vi.fn(),
      onMenuCommand: vi.fn(),
      removeMenuCommandListener: vi.fn(),
      openExternal: vi.fn(),
      onUpdaterEvent: vi.fn(),
      removeUpdaterEventListener: vi.fn()
    } as unknown as typeof window.electronAPI;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(window.electronAPI.getCustomColors).mockResolvedValue([]);
    vi.mocked(window.electronAPI.addCustomColor).mockResolvedValue(undefined);
    vi.mocked(window.electronAPI.removeCustomColor).mockResolvedValue(undefined);
  });

  describe('initialization', () => {
    it('starts with empty colors and loading state', () => {
      const { result } = renderHook(() => useCustomColors());

      expect(result.current.customColors).toEqual([]);
      expect(result.current.isLoading).toBe(true);
    });

    it('loads colors from electronAPI on mount', async () => {
      vi.mocked(window.electronAPI.getCustomColors).mockResolvedValue(['#ff0000', '#00ff00']);

      const { result } = renderHook(() => useCustomColors());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.customColors).toEqual(['#ff0000', '#00ff00']);
      expect(window.electronAPI.getCustomColors).toHaveBeenCalled();
    });

    it('handles load error gracefully', async () => {
      vi.mocked(window.electronAPI.getCustomColors).mockRejectedValue(new Error('Load failed'));

      const { result } = renderHook(() => useCustomColors());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.customColors).toEqual([]);
    });
  });

  describe('addColor', () => {
    it('adds a color to the list', async () => {
      const { result } = renderHook(() => useCustomColors());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addColor('#ff0000');
      });

      expect(result.current.customColors).toContain('#ff0000');
      expect(window.electronAPI.addCustomColor).toHaveBeenCalledWith('#ff0000');
    });

    it('normalizes colors to lowercase', async () => {
      const { result } = renderHook(() => useCustomColors());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addColor('#FF0000');
      });

      expect(result.current.customColors).toContain('#ff0000');
    });

    it('does not add duplicate colors', async () => {
      vi.mocked(window.electronAPI.getCustomColors).mockResolvedValue(['#ff0000']);

      const { result } = renderHook(() => useCustomColors());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addColor('#ff0000');
      });

      expect(result.current.customColors).toEqual(['#ff0000']);
    });

    it('enforces max limit of 16 colors', async () => {
      const existingColors = Array.from({ length: 16 }, (_, i) => `#${i.toString().padStart(6, '0')}`);
      vi.mocked(window.electronAPI.getCustomColors).mockResolvedValue(existingColors);

      const { result } = renderHook(() => useCustomColors());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addColor('#newcolor');
      });

      expect(result.current.customColors).toHaveLength(16);
      expect(result.current.customColors).toContain('#newcolor');
      // First color should have been removed
      expect(result.current.customColors).not.toContain('#000000');
    });
  });

  describe('removeColor', () => {
    it('removes a color from the list', async () => {
      vi.mocked(window.electronAPI.getCustomColors).mockResolvedValue(['#ff0000', '#00ff00']);

      const { result } = renderHook(() => useCustomColors());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.removeColor('#ff0000');
      });

      expect(result.current.customColors).not.toContain('#ff0000');
      expect(result.current.customColors).toContain('#00ff00');
      expect(window.electronAPI.removeCustomColor).toHaveBeenCalledWith('#ff0000');
    });

    it('normalizes color when removing', async () => {
      vi.mocked(window.electronAPI.getCustomColors).mockResolvedValue(['#ff0000']);

      const { result } = renderHook(() => useCustomColors());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.removeColor('#FF0000');
      });

      expect(result.current.customColors).not.toContain('#ff0000');
    });
  });

  describe('hasColor', () => {
    it('returns true if color exists', async () => {
      vi.mocked(window.electronAPI.getCustomColors).mockResolvedValue(['#ff0000']);

      const { result } = renderHook(() => useCustomColors());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasColor('#ff0000')).toBe(true);
    });

    it('returns false if color does not exist', async () => {
      vi.mocked(window.electronAPI.getCustomColors).mockResolvedValue(['#ff0000']);

      const { result } = renderHook(() => useCustomColors());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasColor('#00ff00')).toBe(false);
    });

    it('checks case-insensitively', async () => {
      vi.mocked(window.electronAPI.getCustomColors).mockResolvedValue(['#ff0000']);

      const { result } = renderHook(() => useCustomColors());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasColor('#FF0000')).toBe(true);
    });
  });
});
