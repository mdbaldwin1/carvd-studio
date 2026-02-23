import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';

// Mock fileFormat
vi.mock('../utils/fileFormat', () => ({
  serializeProject: vi.fn().mockReturnValue({ version: '1.0', project: { name: 'Test' } }),
  parseCarvdFile: vi.fn().mockReturnValue({
    valid: true,
    data: { project: { name: 'Recovered Project', modifiedAt: '2026-01-15T00:00:00.000Z' } }
  }),
  deserializeToProject: vi.fn().mockReturnValue({
    version: '1.0',
    name: 'Recovered Project',
    parts: [],
    stocks: [],
    groups: [],
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
    modifiedAt: '2026-01-15'
  })
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import { useAutoRecovery } from './useAutoRecovery';
import { serializeProject, parseCarvdFile, deserializeToProject } from '../utils/fileFormat';

// ============================================================
// Setup
// ============================================================

// Helper to flush all pending promises
async function flushPromises() {
  await act(async () => {});
  await act(async () => {});
  await act(async () => {});
}

beforeAll(() => {
  // Mock sessionStorage
  const sessionStore: Record<string, string> = {};
  Object.defineProperty(window, 'sessionStorage', {
    value: {
      getItem: vi.fn((key: string) => sessionStore[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        sessionStore[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete sessionStore[key];
      })
    },
    writable: true
  });

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
    setWindowTitle: vi.fn(),
    saveRecoveryFile: vi.fn().mockResolvedValue(undefined),
    deleteRecoveryFile: vi.fn().mockResolvedValue(undefined),
    listRecoveryFiles: vi.fn().mockResolvedValue([]),
    readRecoveryFile: vi.fn().mockResolvedValue(null)
  } as unknown as typeof window.electronAPI;
});

beforeEach(() => {
  vi.clearAllMocks();
  // Re-establish mock return values
  (window.electronAPI.saveRecoveryFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (window.electronAPI.deleteRecoveryFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (window.electronAPI.listRecoveryFiles as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (window.electronAPI.readRecoveryFile as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  // Re-establish fileFormat mocks
  (serializeProject as ReturnType<typeof vi.fn>).mockReturnValue({
    version: '1.0',
    project: { name: 'Test' }
  });
  (parseCarvdFile as ReturnType<typeof vi.fn>).mockReturnValue({
    valid: true,
    data: { project: { name: 'Recovered Project', modifiedAt: '2026-01-15T00:00:00.000Z' } }
  });
  (deserializeToProject as ReturnType<typeof vi.fn>).mockReturnValue({
    version: '1.0',
    name: 'Recovered Project',
    parts: [],
    stocks: [],
    groups: [],
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
    modifiedAt: '2026-01-15'
  });

  useProjectStore.setState({
    isDirty: false,
    projectName: 'Test Project',
    filePath: null,
    parts: [],
    stocks: [],
    groups: [],
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
    createdAt: '2026-01-01T00:00:00.000Z',
    modifiedAt: '2026-01-01T00:00:00.000Z'
  });
  useUIStore.setState({ toast: null });
});

// ============================================================
// Tests
// ============================================================

describe('useAutoRecovery', () => {
  describe('initial state', () => {
    it('starts with no recovery', () => {
      const { result } = renderHook(() => useAutoRecovery());
      expect(result.current.hasRecovery).toBe(false);
      expect(result.current.recoveryInfo).toBeNull();
      expect(result.current.lastAutoSave).toBeNull();
    });
  });

  describe('recovery detection on mount', () => {
    it('detects existing recovery files', async () => {
      const recoveryData = JSON.stringify({
        recovery: { filePath: '/path/to/project.carvd' },
        projectData: { version: '1.0', project: { name: 'Recovered', modifiedAt: '2026-01-15' } }
      });
      (window.electronAPI.listRecoveryFiles as ReturnType<typeof vi.fn>).mockResolvedValue(['session1.carvd-recovery']);
      (window.electronAPI.readRecoveryFile as ReturnType<typeof vi.fn>).mockResolvedValue(recoveryData);

      const { result } = renderHook(() => useAutoRecovery());

      await waitFor(() => {
        expect(result.current.hasRecovery).toBe(true);
      });

      expect(result.current.recoveryInfo).not.toBeNull();
      expect(result.current.recoveryInfo!.projectName).toBe('Recovered Project');
      expect(result.current.recoveryInfo!.originalFilePath).toBe('/path/to/project.carvd');
    });

    it('handles old format recovery files', async () => {
      // Old format: project data directly (no wrapper)
      const oldFormatData = JSON.stringify({
        version: '1.0',
        project: { name: 'Old Recovery', modifiedAt: '2026-01-10' }
      });
      (window.electronAPI.listRecoveryFiles as ReturnType<typeof vi.fn>).mockResolvedValue([
        'old-session.carvd-recovery'
      ]);
      (window.electronAPI.readRecoveryFile as ReturnType<typeof vi.fn>).mockResolvedValue(oldFormatData);

      const { result } = renderHook(() => useAutoRecovery());

      await waitFor(() => {
        expect(result.current.hasRecovery).toBe(true);
      });

      expect(result.current.recoveryInfo!.originalFilePath).toBeNull();
    });

    it('handles no recovery files', async () => {
      (window.electronAPI.listRecoveryFiles as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const { result } = renderHook(() => useAutoRecovery());

      await flushPromises();

      expect(result.current.hasRecovery).toBe(false);
    });

    it('handles invalid recovery file content', async () => {
      (window.electronAPI.listRecoveryFiles as ReturnType<typeof vi.fn>).mockResolvedValue(['session.carvd-recovery']);
      (window.electronAPI.readRecoveryFile as ReturnType<typeof vi.fn>).mockResolvedValue('not valid json{{{');

      const { result } = renderHook(() => useAutoRecovery());

      await flushPromises();

      expect(result.current.hasRecovery).toBe(false);
    });
  });

  describe('auto-save interval', () => {
    it('saves recovery file when dirty after interval', async () => {
      vi.useFakeTimers();
      useProjectStore.setState({ isDirty: true });

      renderHook(() => useAutoRecovery());

      // Advance past the 2-minute interval
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
      });

      expect(serializeProject).toHaveBeenCalled();
      expect(window.electronAPI.saveRecoveryFile).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('does not save when project is clean', async () => {
      vi.useFakeTimers();
      useProjectStore.setState({ isDirty: false });

      renderHook(() => useAutoRecovery());

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
      });

      expect(window.electronAPI.saveRecoveryFile).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('clearRecovery', () => {
    it('clears recovery when project becomes clean', async () => {
      // Start dirty so clearRecovery doesn't fire on mount
      useProjectStore.setState({ isDirty: true });
      renderHook(() => useAutoRecovery());

      await flushPromises();
      vi.clearAllMocks();
      // Re-establish mocks
      (window.electronAPI.deleteRecoveryFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      // Mark as clean (simulates successful save)
      await act(async () => {
        useProjectStore.setState({ isDirty: false });
      });

      await flushPromises();
      expect(window.electronAPI.deleteRecoveryFile).toHaveBeenCalled();
    });
  });

  describe('restoreRecovery', () => {
    it('restores project from recovery file', async () => {
      const recoveryData = JSON.stringify({
        recovery: { filePath: '/original/path.carvd' },
        projectData: { version: '1.0', project: { name: 'Recovered' } }
      });
      (window.electronAPI.listRecoveryFiles as ReturnType<typeof vi.fn>).mockResolvedValue(['session.carvd-recovery']);
      (window.electronAPI.readRecoveryFile as ReturnType<typeof vi.fn>).mockResolvedValue(recoveryData);

      const showToast = vi.fn();
      useUIStore.setState({ showToast });
      const loadProject = vi.fn();
      const markDirty = vi.fn();
      useProjectStore.setState({ loadProject, markDirty });

      const { result } = renderHook(() => useAutoRecovery());

      // Wait for recovery detection
      await waitFor(() => {
        expect(result.current.hasRecovery).toBe(true);
      });

      // Restore
      let success: boolean;
      await act(async () => {
        success = await result.current.restoreRecovery();
      });

      expect(success!).toBe(true);
      expect(loadProject).toHaveBeenCalled();
      expect(markDirty).toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('Project restored from auto-save', 'success');
      expect(result.current.hasRecovery).toBe(false);
    });

    it('returns false when no recovery info', async () => {
      const { result } = renderHook(() => useAutoRecovery());

      let success: boolean;
      await act(async () => {
        success = await result.current.restoreRecovery();
      });

      expect(success!).toBe(false);
    });

    it('shows toast when recovery file not found', async () => {
      // Set up detection first
      const recoveryData = JSON.stringify({
        recovery: { filePath: null },
        projectData: { version: '1.0', project: { name: 'Lost' } }
      });
      (window.electronAPI.listRecoveryFiles as ReturnType<typeof vi.fn>).mockResolvedValue(['session.carvd-recovery']);
      (window.electronAPI.readRecoveryFile as ReturnType<typeof vi.fn>).mockResolvedValue(recoveryData);

      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useAutoRecovery());

      await waitFor(() => {
        expect(result.current.hasRecovery).toBe(true);
      });

      // Now the file is gone for the restore attempt
      (window.electronAPI.readRecoveryFile as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      let success: boolean;
      await act(async () => {
        success = await result.current.restoreRecovery();
      });

      expect(success!).toBe(false);
      expect(showToast).toHaveBeenCalledWith('Recovery file not found', 'error');
    });

    it('shows toast when recovery file is corrupted', async () => {
      const recoveryData = JSON.stringify({
        recovery: { filePath: null },
        projectData: { version: '1.0', project: { name: 'Valid' } }
      });
      (window.electronAPI.listRecoveryFiles as ReturnType<typeof vi.fn>).mockResolvedValue(['session.carvd-recovery']);
      (window.electronAPI.readRecoveryFile as ReturnType<typeof vi.fn>).mockResolvedValue(recoveryData);

      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useAutoRecovery());

      await waitFor(() => {
        expect(result.current.hasRecovery).toBe(true);
      });

      // Return corrupted data on restore attempt
      (window.electronAPI.readRecoveryFile as ReturnType<typeof vi.fn>).mockResolvedValue('corrupted{{{');

      let success: boolean;
      await act(async () => {
        success = await result.current.restoreRecovery();
      });

      expect(success!).toBe(false);
      expect(showToast).toHaveBeenCalledWith('Recovery file is corrupted', 'error');
    });
  });

  describe('discardRecovery', () => {
    it('deletes all recovery files', async () => {
      const recoveryData = JSON.stringify({
        recovery: { filePath: null },
        projectData: { version: '1.0', project: { name: 'Discard' } }
      });
      (window.electronAPI.listRecoveryFiles as ReturnType<typeof vi.fn>).mockResolvedValue([
        'session1.carvd-recovery',
        'session2.carvd-recovery'
      ]);
      (window.electronAPI.readRecoveryFile as ReturnType<typeof vi.fn>).mockResolvedValue(recoveryData);

      const { result } = renderHook(() => useAutoRecovery());

      await waitFor(() => {
        expect(result.current.hasRecovery).toBe(true);
      });

      vi.clearAllMocks();
      (window.electronAPI.listRecoveryFiles as ReturnType<typeof vi.fn>).mockResolvedValue([
        'session1.carvd-recovery',
        'session2.carvd-recovery'
      ]);
      (window.electronAPI.deleteRecoveryFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await act(async () => {
        await result.current.discardRecovery();
      });

      expect(window.electronAPI.deleteRecoveryFile).toHaveBeenCalledWith('session1.carvd-recovery');
      expect(window.electronAPI.deleteRecoveryFile).toHaveBeenCalledWith('session2.carvd-recovery');
      expect(result.current.hasRecovery).toBe(false);
      expect(result.current.recoveryInfo).toBeNull();
    });

    it('does nothing when no recovery info', async () => {
      const { result } = renderHook(() => useAutoRecovery());

      await flushPromises();
      vi.clearAllMocks();
      (window.electronAPI.listRecoveryFiles as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (window.electronAPI.deleteRecoveryFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await act(async () => {
        await result.current.discardRecovery();
      });

      // discardRecovery early-returns when no recoveryInfo
      expect(window.electronAPI.listRecoveryFiles).not.toHaveBeenCalled();
    });
  });
});
