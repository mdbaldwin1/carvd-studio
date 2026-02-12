import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from './useAutoSave';
import { useProjectStore } from '../store/projectStore';
import { useAppSettingsStore } from '../store/appSettingsStore';

// Mock saveProject
const mockSaveProject = vi.fn();
vi.mock('../utils/fileOperations', () => ({
  saveProject: () => mockSaveProject()
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

// Setup electron API mock
beforeAll(() => {
  window.electronAPI = {
    getPreference: vi.fn(),
    setPreference: vi.fn(),
    onSettingsChanged: vi.fn(() => () => {}),
    showSaveDialog: vi.fn(),
    showOpenDialog: vi.fn()
  } as unknown as typeof window.electronAPI;
});

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSaveProject.mockReset();
    mockSaveProject.mockResolvedValue({ success: true });

    // Reset project store state
    useProjectStore.setState({
      isDirty: false,
      filePath: null,
      toast: null
    });

    // Reset app settings store state
    useAppSettingsStore.setState({
      settings: {
        defaultUnits: 'imperial',
        defaultGridSize: 0.0625,
        theme: 'dark',
        confirmBeforeDelete: true,
        showHotkeyHints: true,
        stockConstraints: {
          constrainDimensions: true,
          constrainGrain: true,
          constrainColor: true,
          preventOverlap: true
        },
        liveGridSnap: false,
        snapSensitivity: 'normal',
        snapToOrigin: true,
        dimensionSnapSameTypeOnly: false,
        lightingMode: 'default',
        autoSave: false
      },
      isLoading: false,
      isInitialized: true
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('when autoSave is disabled', () => {
    it('does not save even when project is dirty', async () => {
      useProjectStore.setState({ isDirty: true, filePath: '/test/project.carvd' });

      renderHook(() => useAutoSave());

      // Advance time past the auto-save delay
      await act(async () => {
        vi.advanceTimersByTime(35000);
      });

      expect(mockSaveProject).not.toHaveBeenCalled();
    });

    it('returns isPending as false', () => {
      useProjectStore.setState({ isDirty: true, filePath: '/test/project.carvd' });

      const { result } = renderHook(() => useAutoSave());

      expect(result.current.isPending).toBe(false);
    });
  });

  describe('when autoSave is enabled', () => {
    beforeEach(() => {
      useAppSettingsStore.setState({
        settings: {
          ...useAppSettingsStore.getState().settings,
          autoSave: true
        }
      });
    });

    it('does not save when project is not dirty', async () => {
      useProjectStore.setState({ isDirty: false, filePath: '/test/project.carvd' });

      renderHook(() => useAutoSave());

      await act(async () => {
        vi.advanceTimersByTime(35000);
      });

      expect(mockSaveProject).not.toHaveBeenCalled();
    });

    it('saves after delay when project is dirty and has file path', async () => {
      useProjectStore.setState({ isDirty: true, filePath: '/test/project.carvd' });

      renderHook(() => useAutoSave());

      // Should not save immediately
      expect(mockSaveProject).not.toHaveBeenCalled();

      // Advance time past the auto-save delay (30 seconds)
      await act(async () => {
        vi.advanceTimersByTime(31000);
      });

      expect(mockSaveProject).toHaveBeenCalledTimes(1);
    });

    it('sets isPending to true while waiting to save', async () => {
      useProjectStore.setState({ isDirty: true, filePath: '/test/project.carvd' });

      const { result } = renderHook(() => useAutoSave());

      // Should be pending while waiting
      expect(result.current.isPending).toBe(true);

      // After save completes
      await act(async () => {
        vi.advanceTimersByTime(31000);
      });

      expect(result.current.isPending).toBe(false);
    });

    it('updates lastAutoSave after successful save', async () => {
      useProjectStore.setState({ isDirty: true, filePath: '/test/project.carvd' });

      const { result } = renderHook(() => useAutoSave());

      expect(result.current.lastAutoSave).toBeNull();

      await act(async () => {
        vi.advanceTimersByTime(31000);
      });

      expect(result.current.lastAutoSave).toBeInstanceOf(Date);
    });

    it('calls onInitialSaveNeeded when project has no file path', async () => {
      const mockOnInitialSaveNeeded = vi.fn().mockResolvedValue(undefined);
      useProjectStore.setState({ isDirty: true, filePath: null });

      renderHook(() => useAutoSave({ onInitialSaveNeeded: mockOnInitialSaveNeeded }));

      await act(async () => {
        vi.advanceTimersByTime(31000);
      });

      expect(mockOnInitialSaveNeeded).toHaveBeenCalledTimes(1);
      expect(mockSaveProject).not.toHaveBeenCalled();
    });

    it('only prompts for initial save once per session', async () => {
      const mockOnInitialSaveNeeded = vi.fn().mockResolvedValue(undefined);
      useProjectStore.setState({ isDirty: true, filePath: null });

      renderHook(() => useAutoSave({ onInitialSaveNeeded: mockOnInitialSaveNeeded }));

      // First trigger
      await act(async () => {
        vi.advanceTimersByTime(31000);
      });

      // Make dirty again
      await act(async () => {
        useProjectStore.setState({ isDirty: true });
      });

      // Second trigger
      await act(async () => {
        vi.advanceTimersByTime(31000);
      });

      // Should only have been called once
      expect(mockOnInitialSaveNeeded).toHaveBeenCalledTimes(1);
    });

    it('does not save when blocked', async () => {
      useProjectStore.setState({ isDirty: true, filePath: '/test/project.carvd' });

      renderHook(() => useAutoSave({ blocked: true }));

      await act(async () => {
        vi.advanceTimersByTime(35000);
      });

      expect(mockSaveProject).not.toHaveBeenCalled();
    });

    it('does not save before the delay period', async () => {
      useProjectStore.setState({ isDirty: true, filePath: '/test/project.carvd' });

      renderHook(() => useAutoSave());

      // Wait 25 seconds (less than 30s delay)
      await act(async () => {
        vi.advanceTimersByTime(25000);
      });

      // Should not have saved yet
      expect(mockSaveProject).not.toHaveBeenCalled();

      // Wait remaining 10 seconds (past 30s delay)
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });

      // Now it should have saved
      expect(mockSaveProject).toHaveBeenCalledTimes(1);
    });
  });
});
