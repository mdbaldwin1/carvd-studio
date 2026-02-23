import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { renderHook, act, render } from '@testing-library/react';
import React from 'react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';

// Mock fileOperations module
vi.mock('../utils/fileOperations', () => ({
  saveProject: vi.fn(),
  saveProjectAs: vi.fn(),
  openProject: vi.fn(),
  openProjectFromPath: vi.fn(),
  newProject: vi.fn(),
  hasUnsavedChanges: vi.fn().mockReturnValue(false),
  updateWindowTitle: vi.fn(),
  getRecentProjects: vi.fn().mockResolvedValue([]),
  attemptFileRepair: vi.fn(),
  loadRepairedFile: vi.fn()
}));

// Mock fileFormat
vi.mock('../utils/fileFormat', () => ({
  getProjectNameFromPath: vi.fn((p: string) => p.split('/').pop()?.replace('.carvd', '') ?? '')
}));

// Mock the dialog components
vi.mock('../components/project/UnsavedChangesDialog', () => ({
  UnsavedChangesDialog: vi.fn(() => null)
}));
vi.mock('../components/project/FileRecoveryModal', () => ({
  FileRecoveryModal: vi.fn(() => null)
}));

import { useFileOperations } from './useFileOperations';
import {
  saveProject,
  saveProjectAs,
  openProject,
  openProjectFromPath,
  newProject,
  hasUnsavedChanges,
  getRecentProjects,
  attemptFileRepair,
  loadRepairedFile,
  updateWindowTitle
} from '../utils/fileOperations';
import { UnsavedChangesDialog } from '../components/project/UnsavedChangesDialog';
import { FileRecoveryModal } from '../components/project/FileRecoveryModal';

// ============================================================
// Setup
// ============================================================

// Store the registered event callbacks for onOpenProject and onBeforeClose
let onOpenProjectCallback: ((filePath: string) => void) | null = null;
let onBeforeCloseCallback: (() => void) | null = null;

beforeAll(() => {
  window.electronAPI = {
    showSaveDialog: vi.fn(),
    showOpenDialog: vi.fn(),
    writeBinaryFile: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    addRecentProject: vi.fn(),
    getRecentProjects: vi.fn().mockResolvedValue([]),
    clearRecentProjects: vi.fn(),
    setWindowTitle: vi.fn(),
    getPreference: vi.fn(),
    setPreference: vi.fn(),
    onOpenProject: vi.fn((cb: (filePath: string) => void) => {
      onOpenProjectCallback = cb;
    }),
    onBeforeClose: vi.fn((cb: () => void) => {
      onBeforeCloseCallback = cb;
      return vi.fn(); // cleanup function
    }),
    confirmClose: vi.fn(),
    cancelClose: vi.fn(),
    updateRecentProjectPath: vi.fn()
  } as unknown as typeof window.electronAPI;
});

beforeEach(() => {
  vi.clearAllMocks();
  onOpenProjectCallback = null;
  onBeforeCloseCallback = null;

  // Re-set the implementation after clearAllMocks
  (window.electronAPI.onOpenProject as ReturnType<typeof vi.fn>).mockImplementation(
    (cb: (filePath: string) => void) => {
      onOpenProjectCallback = cb;
    }
  );
  (window.electronAPI.onBeforeClose as ReturnType<typeof vi.fn>).mockImplementation((cb: () => void) => {
    onBeforeCloseCallback = cb;
    return vi.fn();
  });

  useProjectStore.setState({
    isDirty: false,
    projectName: 'Test',
    filePath: null
  });
  useUIStore.setState({
    toast: null
  });
  (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(false);
  (getRecentProjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
});

// Helper: get last props passed to the UnsavedChangesDialog mock
function getDialogProps() {
  const mock = UnsavedChangesDialog as ReturnType<typeof vi.fn>;
  const calls = mock.mock.calls;
  if (calls.length === 0) return null;
  return calls[calls.length - 1][0];
}

// Helper: get last props passed to the FileRecoveryModal mock
function getRecoveryProps() {
  const mock = FileRecoveryModal as ReturnType<typeof vi.fn>;
  const calls = mock.mock.calls;
  if (calls.length === 0) return null;
  return calls[calls.length - 1][0];
}

// Wrapper component that renders both the hook result and the dialog components
// This is needed because the hook returns React components that need to be rendered
// in order to pass props to the mocked sub-components.
function TestHarness(props: {
  options?: Parameters<typeof useFileOperations>[0];
  hookRef: React.MutableRefObject<ReturnType<typeof useFileOperations> | null>;
}) {
  const result = useFileOperations(props.options);
  props.hookRef.current = result;
  return (
    <>
      <result.UnsavedChangesDialogComponent />
      <result.FileRecoveryModalComponent />
    </>
  );
}

function renderWithDialogs(options?: Parameters<typeof useFileOperations>[0]) {
  const hookRef = React.createRef<ReturnType<typeof useFileOperations> | null>() as React.MutableRefObject<ReturnType<
    typeof useFileOperations
  > | null>;
  hookRef.current = null;
  const renderResult = render(<TestHarness options={options} hookRef={hookRef} />);
  return { hookRef, ...renderResult };
}

// ============================================================
// Tests
// ============================================================

describe('useFileOperations', () => {
  describe('handleSave', () => {
    it('saves project and shows toast on success', async () => {
      (saveProject as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleSave();
      });

      expect(saveProject).toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('Project saved', 'success');
    });

    it('shows error toast on save failure', async () => {
      (saveProject as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Disk full'
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleSave();
      });

      expect(showToast).toHaveBeenCalledWith('Error saving: Disk full', 'error');
    });

    it('does nothing when save is canceled', async () => {
      (saveProject as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        canceled: true
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleSave();
      });

      expect(showToast).not.toHaveBeenCalled();
    });

    it('delegates to onSaveTemplate when editing template', async () => {
      const onSaveTemplate = vi.fn();
      const { result } = renderHook(() =>
        useFileOperations({
          isEditingTemplate: true,
          onSaveTemplate
        })
      );

      await act(async () => {
        await result.current.handleSave();
      });

      expect(onSaveTemplate).toHaveBeenCalled();
      expect(saveProject).not.toHaveBeenCalled();
    });

    it('delegates to onSaveAssembly when editing assembly', async () => {
      const onSaveAssembly = vi.fn();
      const { result } = renderHook(() =>
        useFileOperations({
          isEditingAssembly: true,
          onSaveAssembly
        })
      );

      await act(async () => {
        await result.current.handleSave();
      });

      expect(onSaveAssembly).toHaveBeenCalled();
      expect(saveProject).not.toHaveBeenCalled();
    });
  });

  describe('handleSaveAs', () => {
    it('saves as and shows toast on success', async () => {
      (saveProjectAs as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleSaveAs();
      });

      expect(saveProjectAs).toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('Project saved', 'success');
    });

    it('shows error toast on save-as failure', async () => {
      (saveProjectAs as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Permission denied'
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleSaveAs();
      });

      expect(showToast).toHaveBeenCalledWith('Error saving: Permission denied', 'error');
    });

    it('does nothing when save-as is canceled', async () => {
      (saveProjectAs as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        canceled: true
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleSaveAs();
      });

      expect(showToast).not.toHaveBeenCalled();
    });

    it('blocks save-as when editing template', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useFileOperations({ isEditingTemplate: true }));

      await act(async () => {
        await result.current.handleSaveAs();
      });

      expect(saveProjectAs).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('Use "Save Template" to save template changes', 'info');
    });

    it('blocks save-as when editing assembly', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useFileOperations({ isEditingAssembly: true }));

      await act(async () => {
        await result.current.handleSaveAs();
      });

      expect(saveProjectAs).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('Use "Save Assembly" to save assembly changes', 'info');
    });
  });

  describe('handleNew', () => {
    it('creates new project when no unsaved changes', async () => {
      (newProject as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleNew();
      });

      expect(newProject).toHaveBeenCalled();
    });

    it('shows unsaved changes dialog when dirty', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleNew();
      });

      // Should NOT create new project yet (pending dialog)
      expect(newProject).not.toHaveBeenCalled();
    });

    it('blocks when editing template', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useFileOperations({ isEditingTemplate: true }));

      await act(async () => {
        await result.current.handleNew();
      });

      expect(newProject).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('Finish editing template first', 'warning');
    });

    it('blocks when editing assembly', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useFileOperations({ isEditingAssembly: true }));

      await act(async () => {
        await result.current.handleNew();
      });

      expect(newProject).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('Finish editing assembly first', 'warning');
    });
  });

  describe('handleOpen', () => {
    it('opens project when no unsaved changes', async () => {
      (openProject as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleOpen();
      });

      expect(openProject).toHaveBeenCalled();
    });

    it('shows error toast on open failure', async () => {
      (openProject as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Corrupt file'
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleOpen();
      });

      expect(showToast).toHaveBeenCalledWith('Error: Corrupt file', 'error');
    });

    it('blocks when editing template', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useFileOperations({ isEditingTemplate: true }));

      await act(async () => {
        await result.current.handleOpen();
      });

      expect(openProject).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('Finish editing template first', 'warning');
    });

    it('blocks when editing assembly', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useFileOperations({ isEditingAssembly: true }));

      await act(async () => {
        await result.current.handleOpen();
      });

      expect(openProject).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('Finish editing assembly first', 'warning');
    });

    it('shows unsaved changes dialog when dirty', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleOpen();
      });

      expect(openProject).not.toHaveBeenCalled();
    });

    it('triggers recovery when open result needsRecovery (no unsaved changes)', async () => {
      (openProject as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        needsRecovery: true,
        validationErrors: ['Invalid schema'],
        rawContent: '{"broken":true}',
        filePath: '/path/to/broken.carvd'
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleOpen();
      });

      expect(showToast).not.toHaveBeenCalled();
    });
  });

  describe('handleOpenRecent', () => {
    it('opens project from path when no unsaved changes', async () => {
      (openProjectFromPath as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleOpenRecent('/path/to/recent.carvd');
      });

      expect(openProjectFromPath).toHaveBeenCalledWith('/path/to/recent.carvd');
    });

    it('shows error toast on open recent failure', async () => {
      (openProjectFromPath as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'File not found'
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleOpenRecent('/path/to/missing.carvd');
      });

      expect(showToast).toHaveBeenCalledWith('Error: File not found', 'error');
    });

    it('blocks when editing template', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useFileOperations({ isEditingTemplate: true }));

      await act(async () => {
        await result.current.handleOpenRecent('/path/to/recent.carvd');
      });

      expect(openProjectFromPath).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('Finish editing template first', 'warning');
    });

    it('blocks when editing assembly', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useFileOperations({ isEditingAssembly: true }));

      await act(async () => {
        await result.current.handleOpenRecent('/path/to/recent.carvd');
      });

      expect(openProjectFromPath).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('Finish editing assembly first', 'warning');
    });

    it('shows unsaved changes dialog when dirty', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleOpenRecent('/path/to/recent.carvd');
      });

      expect(openProjectFromPath).not.toHaveBeenCalled();
    });

    it('triggers recovery when open recent result needsRecovery', async () => {
      (openProjectFromPath as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        needsRecovery: true,
        validationErrors: ['Bad data'],
        rawContent: '{}',
        filePath: '/path/to/bad.carvd'
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleOpenRecent('/path/to/bad.carvd');
      });

      expect(showToast).not.toHaveBeenCalled();
    });
  });

  describe('handleGoHome', () => {
    it('calls onGoHome when no unsaved changes', async () => {
      const onGoHome = vi.fn();
      const { result } = renderHook(() => useFileOperations({ onGoHome }));

      await act(async () => {
        await result.current.handleGoHome();
      });

      expect(onGoHome).toHaveBeenCalled();
    });

    it('blocks when editing template', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });
      const onGoHome = vi.fn();

      const { result } = renderHook(() => useFileOperations({ isEditingTemplate: true, onGoHome }));

      await act(async () => {
        await result.current.handleGoHome();
      });

      expect(onGoHome).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('Finish editing template first', 'warning');
    });

    it('blocks when editing assembly', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });
      const onGoHome = vi.fn();

      const { result } = renderHook(() => useFileOperations({ isEditingAssembly: true, onGoHome }));

      await act(async () => {
        await result.current.handleGoHome();
      });

      expect(onGoHome).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('Finish editing assembly first', 'warning');
    });

    it('shows unsaved changes dialog when dirty', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const onGoHome = vi.fn();

      const { result } = renderHook(() => useFileOperations({ onGoHome }));

      await act(async () => {
        await result.current.handleGoHome();
      });

      expect(onGoHome).not.toHaveBeenCalled();
    });

    it('does nothing when no onGoHome and no unsaved changes', async () => {
      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleGoHome();
      });
      // No error thrown
    });
  });

  describe('handleRelocateFile', () => {
    it('opens file dialog, updates path, and opens from new location', async () => {
      (window.electronAPI.showOpenDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
        canceled: false,
        filePaths: ['/new/location/project.carvd']
      });
      (window.electronAPI.updateRecentProjectPath as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (openProjectFromPath as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleRelocateFile('/old/path/project.carvd', 'project.carvd');
      });

      expect(window.electronAPI.showOpenDialog).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Locate "project.carvd"' })
      );
      expect(window.electronAPI.updateRecentProjectPath).toHaveBeenCalledWith(
        '/old/path/project.carvd',
        '/new/location/project.carvd'
      );
      expect(openProjectFromPath).toHaveBeenCalledWith('/new/location/project.carvd');
    });

    it('does nothing when dialog is canceled', async () => {
      (window.electronAPI.showOpenDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
        canceled: true,
        filePaths: []
      });

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleRelocateFile('/old/path.carvd', 'old.carvd');
      });

      expect(window.electronAPI.updateRecentProjectPath).not.toHaveBeenCalled();
      expect(openProjectFromPath).not.toHaveBeenCalled();
    });

    it('does nothing when dialog returns empty filePaths', async () => {
      (window.electronAPI.showOpenDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
        canceled: false,
        filePaths: []
      });

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleRelocateFile('/old/path.carvd', 'old.carvd');
      });

      expect(window.electronAPI.updateRecentProjectPath).not.toHaveBeenCalled();
    });

    it('shows error toast when open from relocated path fails', async () => {
      (window.electronAPI.showOpenDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
        canceled: false,
        filePaths: ['/new/path.carvd']
      });
      (window.electronAPI.updateRecentProjectPath as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (openProjectFromPath as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Read error'
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleRelocateFile('/old/path.carvd', 'old.carvd');
      });

      expect(showToast).toHaveBeenCalledWith('Error: Read error', 'error');
    });

    it('triggers recovery when relocated file needsRecovery', async () => {
      (window.electronAPI.showOpenDialog as ReturnType<typeof vi.fn>).mockResolvedValue({
        canceled: false,
        filePaths: ['/new/path.carvd']
      });
      (window.electronAPI.updateRecentProjectPath as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (openProjectFromPath as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        needsRecovery: true,
        validationErrors: ['Corrupt'],
        rawContent: '{}',
        filePath: '/new/path.carvd'
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleRelocateFile('/old/path.carvd', 'old.carvd');
      });

      expect(showToast).not.toHaveBeenCalled();
    });

    it('shows error toast when an exception is thrown', async () => {
      (window.electronAPI.showOpenDialog as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Dialog error'));
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleRelocateFile('/old/path.carvd', 'old.carvd');
      });

      expect(showToast).toHaveBeenCalledWith('Error relocating file: Error: Dialog error', 'error');
    });
  });

  describe('recentProjects', () => {
    it('loads recent projects on mount', async () => {
      (getRecentProjects as ReturnType<typeof vi.fn>).mockResolvedValue(['/a.carvd', '/b.carvd']);

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current.recentProjects).toEqual(['/a.carvd', '/b.carvd']);
    });

    it('refreshes recent projects', async () => {
      (getRecentProjects as ReturnType<typeof vi.fn>).mockResolvedValue(['/new.carvd']);

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.refreshRecentProjects();
      });

      expect(result.current.recentProjects).toEqual(['/new.carvd']);
    });
  });

  describe('file recovery (with TestHarness)', () => {
    it('handles needsRecovery result from open', async () => {
      (openProject as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        needsRecovery: true,
        validationErrors: ['Missing parts'],
        rawContent: '{"version":"1.0"}',
        filePath: '/path/to/corrupt.carvd'
      });

      const { hookRef } = renderWithDialogs();

      await act(async () => {
        await hookRef.current!.handleOpen();
      });

      // FileRecoveryModal should have been rendered with isOpen=true
      const props = getRecoveryProps();
      expect(props).not.toBeNull();
      expect(props.isOpen).toBe(true);
      expect(props.errors).toEqual(['Missing parts']);
      expect(props.fileName).toBe('corrupt');
    });

    it('handleAttemptRepair calls attemptFileRepair via setTimeout', async () => {
      vi.useFakeTimers();

      (openProject as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        needsRecovery: true,
        validationErrors: ['Bad data'],
        rawContent: '{"rawData":"test"}',
        filePath: '/path/to/corrupt.carvd'
      });
      const repairResult = {
        success: true,
        repairedData: { version: '1.0', project: {} },
        repairActions: ['Fixed references'],
        remainingErrors: [],
        warnings: []
      };
      (attemptFileRepair as ReturnType<typeof vi.fn>).mockReturnValue(repairResult);

      const { hookRef } = renderWithDialogs();

      await act(async () => {
        await hookRef.current!.handleOpen();
      });

      // Get recovery modal props and trigger repair
      let props = getRecoveryProps();
      expect(props.isOpen).toBe(true);

      await act(async () => {
        props.onAttemptRepair();
      });

      // Should be in repairing state
      props = getRecoveryProps();
      expect(props.isRepairing).toBe(true);

      // Advance timer to trigger the setTimeout callback
      await act(async () => {
        vi.advanceTimersByTime(150);
      });

      expect(attemptFileRepair).toHaveBeenCalledWith('{"rawData":"test"}');

      // After repair, should have repairResult and no longer repairing
      props = getRecoveryProps();
      expect(props.isRepairing).toBe(false);
      expect(props.repairResult).toEqual(repairResult);

      vi.useRealTimers();
    });

    it('handleAcceptRepair loads repaired file and shows success toast', async () => {
      vi.useFakeTimers();

      (openProject as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        needsRecovery: true,
        validationErrors: ['Bad'],
        rawContent: '{"raw":"data"}',
        filePath: '/path/to/file.carvd'
      });
      const repairedData = { version: '1.0', project: {} };
      (attemptFileRepair as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        repairedData,
        repairActions: [],
        remainingErrors: [],
        warnings: []
      });
      (loadRepairedFile as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { hookRef } = renderWithDialogs();

      // Open corrupt file
      await act(async () => {
        await hookRef.current!.handleOpen();
      });

      // Attempt repair
      let props = getRecoveryProps();
      await act(async () => {
        props.onAttemptRepair();
      });
      await act(async () => {
        vi.advanceTimersByTime(150);
      });

      // Accept repair
      props = getRecoveryProps();
      await act(async () => {
        await props.onAcceptRepair();
      });

      expect(loadRepairedFile).toHaveBeenCalledWith(repairedData, '/path/to/file.carvd');
      expect(showToast).toHaveBeenCalledWith('Project recovered successfully', 'success');

      // Modal should be closed after accept
      props = getRecoveryProps();
      expect(props.isOpen).toBe(false);

      vi.useRealTimers();
    });

    it('handleAcceptRepair shows error when load fails', async () => {
      vi.useFakeTimers();

      (openProject as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        needsRecovery: true,
        validationErrors: ['Bad'],
        rawContent: '{"raw":"x"}',
        filePath: '/path/to/file.carvd'
      });
      (attemptFileRepair as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        repairedData: { version: '1.0' },
        repairActions: [],
        remainingErrors: [],
        warnings: []
      });
      (loadRepairedFile as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Load failed'
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { hookRef } = renderWithDialogs();

      await act(async () => {
        await hookRef.current!.handleOpen();
      });

      let props = getRecoveryProps();
      await act(async () => {
        props.onAttemptRepair();
      });
      await act(async () => {
        vi.advanceTimersByTime(150);
      });

      props = getRecoveryProps();
      await act(async () => {
        await props.onAcceptRepair();
      });

      expect(showToast).toHaveBeenCalledWith('Error loading recovered project: Load failed', 'error');

      vi.useRealTimers();
    });

    it('handleAcceptRepair does nothing when no repair result', async () => {
      (openProject as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        needsRecovery: true,
        validationErrors: ['Err'],
        rawContent: '{}',
        filePath: '/path/to/file.carvd'
      });

      const { hookRef } = renderWithDialogs();

      await act(async () => {
        await hookRef.current!.handleOpen();
      });

      // Accept without running repair first (repairResult is null)
      const props = getRecoveryProps();
      await act(async () => {
        await props.onAcceptRepair();
      });

      expect(loadRepairedFile).not.toHaveBeenCalled();
    });

    it('handleRejectRecovery closes the recovery modal', async () => {
      (openProject as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        needsRecovery: true,
        validationErrors: ['Error'],
        rawContent: '{}',
        filePath: '/path/to/file.carvd'
      });

      const { hookRef } = renderWithDialogs();

      await act(async () => {
        await hookRef.current!.handleOpen();
      });

      let props = getRecoveryProps();
      expect(props.isOpen).toBe(true);

      await act(async () => {
        props.onReject();
      });

      props = getRecoveryProps();
      expect(props.isOpen).toBe(false);
    });
  });

  describe('dialog handlers (with TestHarness)', () => {
    it('handleDialogSave saves and executes pending action on success', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (saveProject as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (newProject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { hookRef } = renderWithDialogs();

      // Trigger pending new action
      await act(async () => {
        await hookRef.current!.handleNew();
      });

      let dialogProps = getDialogProps();
      expect(dialogProps.isOpen).toBe(true);
      expect(dialogProps.action).toBe('new');

      // Choose "Save"
      await act(async () => {
        await dialogProps.onSave();
      });

      expect(saveProject).toHaveBeenCalled();
      expect(newProject).toHaveBeenCalled();

      // Dialog should be closed
      dialogProps = getDialogProps();
      expect(dialogProps.isOpen).toBe(false);
    });

    it('handleDialogSave shows error and cancels close on save failure during close', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (saveProject as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Save failed'
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      renderWithDialogs();

      // Trigger close with unsaved changes via the captured callback
      expect(onBeforeCloseCallback).not.toBeNull();
      await act(async () => {
        onBeforeCloseCallback!();
      });

      let dialogProps = getDialogProps();
      expect(dialogProps.isOpen).toBe(true);
      expect(dialogProps.action).toBe('close');

      // Choose "Save" - but save fails
      await act(async () => {
        await dialogProps.onSave();
      });

      expect(showToast).toHaveBeenCalledWith('Error saving: Save failed', 'error');
      expect(window.electronAPI.cancelClose).toHaveBeenCalled();
    });

    it('handleDialogSave cancels close when save is canceled during close', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (saveProject as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        canceled: true
      });

      renderWithDialogs();

      await act(async () => {
        onBeforeCloseCallback!();
      });

      const dialogProps = getDialogProps();

      await act(async () => {
        await dialogProps.onSave();
      });

      expect(window.electronAPI.cancelClose).toHaveBeenCalled();
    });

    it('handleDialogDiscard executes pending action without saving', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (newProject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { hookRef } = renderWithDialogs();

      await act(async () => {
        await hookRef.current!.handleNew();
      });

      const dialogProps = getDialogProps();

      await act(async () => {
        await dialogProps.onDiscard();
      });

      expect(saveProject).not.toHaveBeenCalled();
      expect(newProject).toHaveBeenCalled();
    });

    it('handleDialogDiscard during close calls confirmClose', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (window.electronAPI.confirmClose as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      renderWithDialogs();

      await act(async () => {
        onBeforeCloseCallback!();
      });

      const dialogProps = getDialogProps();

      await act(async () => {
        await dialogProps.onDiscard();
      });

      expect(window.electronAPI.confirmClose).toHaveBeenCalled();
    });

    it('handleDialogCancel clears pending action for non-close action', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const { hookRef } = renderWithDialogs();

      await act(async () => {
        await hookRef.current!.handleNew();
      });

      let dialogProps = getDialogProps();
      expect(dialogProps.isOpen).toBe(true);

      await act(async () => {
        await dialogProps.onCancel();
      });

      dialogProps = getDialogProps();
      expect(dialogProps.isOpen).toBe(false);
      expect(window.electronAPI.cancelClose).not.toHaveBeenCalled();
    });

    it('handleDialogCancel notifies main process for close action', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);

      renderWithDialogs();

      await act(async () => {
        onBeforeCloseCallback!();
      });

      const dialogProps = getDialogProps();

      await act(async () => {
        await dialogProps.onCancel();
      });

      expect(window.electronAPI.cancelClose).toHaveBeenCalled();
    });

    it('handleDialogSave does not execute pending action when save fails (non-close)', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (saveProject as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Disk error'
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { hookRef } = renderWithDialogs();

      await act(async () => {
        await hookRef.current!.handleNew();
      });

      const dialogProps = getDialogProps();

      await act(async () => {
        await dialogProps.onSave();
      });

      expect(showToast).toHaveBeenCalledWith('Error saving: Disk error', 'error');
      expect(newProject).not.toHaveBeenCalled();
      // cancelClose should NOT be called for non-close actions
      expect(window.electronAPI.cancelClose).not.toHaveBeenCalled();
    });
  });

  describe('onBeforeClose event', () => {
    it('proceeds with close when no unsaved changes', () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(false);

      renderHook(() => useFileOperations());

      expect(onBeforeCloseCallback).not.toBeNull();
      onBeforeCloseCallback!();

      expect(window.electronAPI.confirmClose).toHaveBeenCalled();
    });

    it('shows dialog when there are unsaved changes', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);

      renderWithDialogs();

      await act(async () => {
        onBeforeCloseCallback!();
      });

      const dialogProps = getDialogProps();
      expect(dialogProps.isOpen).toBe(true);
      expect(dialogProps.action).toBe('close');
    });

    it('returns cleanup function', () => {
      const cleanupFn = vi.fn();
      (window.electronAPI.onBeforeClose as ReturnType<typeof vi.fn>).mockReturnValue(cleanupFn);

      const { unmount } = renderHook(() => useFileOperations());

      unmount();

      expect(cleanupFn).toHaveBeenCalled();
    });
  });

  describe('onOpenProject event', () => {
    it('opens project directly when no unsaved changes', async () => {
      (openProjectFromPath as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      renderHook(() => useFileOperations());

      expect(onOpenProjectCallback).not.toBeNull();
      await act(async () => {
        await onOpenProjectCallback!('/path/to/file.carvd');
      });

      expect(openProjectFromPath).toHaveBeenCalledWith('/path/to/file.carvd');
    });

    it('shows error toast when open from event fails', async () => {
      (openProjectFromPath as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Cannot read'
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      renderHook(() => useFileOperations());

      await act(async () => {
        await onOpenProjectCallback!('/path/to/file.carvd');
      });

      expect(showToast).toHaveBeenCalledWith('Error: Cannot read', 'error');
    });

    it('shows unsaved changes dialog when dirty on open event', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);

      renderWithDialogs();

      await act(async () => {
        await onOpenProjectCallback!('/path/to/file.carvd');
      });

      expect(openProjectFromPath).not.toHaveBeenCalled();

      const dialogProps = getDialogProps();
      expect(dialogProps.isOpen).toBe(true);
      expect(dialogProps.action).toBe('open');
    });

    it('executes pending open action after discard in unsaved dialog', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (openProjectFromPath as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      renderWithDialogs();

      await act(async () => {
        await onOpenProjectCallback!('/path/to/file.carvd');
      });

      const dialogProps = getDialogProps();

      await act(async () => {
        await dialogProps.onDiscard();
      });

      expect(openProjectFromPath).toHaveBeenCalledWith('/path/to/file.carvd');
    });

    it('triggers recovery from open event when result needsRecovery (no unsaved)', async () => {
      (openProjectFromPath as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        needsRecovery: true,
        validationErrors: ['Bad'],
        rawContent: '{"x":1}',
        filePath: '/path/to/bad.carvd'
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      renderWithDialogs();

      await act(async () => {
        await onOpenProjectCallback!('/path/to/bad.carvd');
      });

      expect(showToast).not.toHaveBeenCalled();
      const props = getRecoveryProps();
      expect(props.isOpen).toBe(true);
    });

    it('triggers recovery from open event after discard (with unsaved)', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (openProjectFromPath as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        needsRecovery: true,
        validationErrors: ['Corrupt'],
        rawContent: '{"z":2}',
        filePath: '/path/to/corrupt.carvd'
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      renderWithDialogs();

      await act(async () => {
        await onOpenProjectCallback!('/path/to/corrupt.carvd');
      });

      const dialogProps = getDialogProps();
      await act(async () => {
        await dialogProps.onDiscard();
      });

      expect(showToast).not.toHaveBeenCalled();
    });

    it('shows error from open event pending action after discard', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (openProjectFromPath as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Broken file'
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      renderWithDialogs();

      await act(async () => {
        await onOpenProjectCallback!('/path/to/broken.carvd');
      });

      const dialogProps = getDialogProps();
      await act(async () => {
        await dialogProps.onDiscard();
      });

      expect(showToast).toHaveBeenCalledWith('Error: Broken file', 'error');
    });
  });

  describe('keyboard shortcuts', () => {
    it('handles Ctrl+S for save', async () => {
      (saveProject as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      renderHook(() => useFileOperations());

      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }));
      });

      // Give async handlers time to resolve
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(saveProject).toHaveBeenCalled();
    });

    it('handles Cmd+S for save (metaKey)', async () => {
      (saveProject as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      renderHook(() => useFileOperations());

      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true, bubbles: true }));
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(saveProject).toHaveBeenCalled();
    });

    it('handles Ctrl+Shift+S for save as', async () => {
      (saveProjectAs as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      renderHook(() => useFileOperations());

      await act(async () => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 's',
            ctrlKey: true,
            shiftKey: true,
            bubbles: true
          })
        );
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(saveProjectAs).toHaveBeenCalled();
    });

    it('handles Ctrl+O for open', async () => {
      (openProject as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      renderHook(() => useFileOperations());

      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', ctrlKey: true, bubbles: true }));
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(openProject).toHaveBeenCalled();
    });

    it('handles Ctrl+N for new', async () => {
      (newProject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      renderHook(() => useFileOperations());

      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', ctrlKey: true, bubbles: true }));
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(newProject).toHaveBeenCalled();
    });

    it('ignores keyboard shortcuts when typing in an input', async () => {
      (saveProject as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      renderHook(() => useFileOperations());

      const input = document.createElement('input');
      document.body.appendChild(input);

      await act(async () => {
        const event = new KeyboardEvent('keydown', {
          key: 's',
          ctrlKey: true,
          bubbles: true
        });
        Object.defineProperty(event, 'target', { value: input });
        window.dispatchEvent(event);
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(saveProject).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });

    it('ignores keyboard shortcuts when typing in a textarea', async () => {
      (saveProject as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      renderHook(() => useFileOperations());

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      await act(async () => {
        const event = new KeyboardEvent('keydown', {
          key: 's',
          ctrlKey: true,
          bubbles: true
        });
        Object.defineProperty(event, 'target', { value: textarea });
        window.dispatchEvent(event);
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(saveProject).not.toHaveBeenCalled();

      document.body.removeChild(textarea);
    });

    it('ignores non-modifier key presses', async () => {
      (saveProject as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      renderHook(() => useFileOperations());

      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', bubbles: true }));
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(saveProject).not.toHaveBeenCalled();
    });

    it('removes event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useFileOperations());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('window title updates', () => {
    it('calls updateWindowTitle when isDirty changes', async () => {
      renderHook(() => useFileOperations());

      expect(updateWindowTitle).toHaveBeenCalled();
      (updateWindowTitle as ReturnType<typeof vi.fn>).mockClear();

      await act(async () => {
        useProjectStore.setState({ isDirty: true });
      });

      expect(updateWindowTitle).toHaveBeenCalled();
    });

    it('calls updateWindowTitle when projectName changes', async () => {
      renderHook(() => useFileOperations());

      (updateWindowTitle as ReturnType<typeof vi.fn>).mockClear();

      await act(async () => {
        useProjectStore.setState({ projectName: 'New Name' });
      });

      expect(updateWindowTitle).toHaveBeenCalled();
    });

    it('calls updateWindowTitle when filePath changes', async () => {
      renderHook(() => useFileOperations());

      (updateWindowTitle as ReturnType<typeof vi.fn>).mockClear();

      await act(async () => {
        useProjectStore.setState({ filePath: '/new/path.carvd' });
      });

      expect(updateWindowTitle).toHaveBeenCalled();
    });
  });

  describe('handleOpen with unsaved changes - pending action flow (with TestHarness)', () => {
    it('executes open after save in unsaved dialog', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (saveProject as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (openProject as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { hookRef } = renderWithDialogs();

      await act(async () => {
        await hookRef.current!.handleOpen();
      });

      const dialogProps = getDialogProps();

      await act(async () => {
        await dialogProps.onSave();
      });

      expect(saveProject).toHaveBeenCalled();
      expect(openProject).toHaveBeenCalled();
    });

    it('executes open after discard in unsaved dialog', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (openProject as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { hookRef } = renderWithDialogs();

      await act(async () => {
        await hookRef.current!.handleOpen();
      });

      const dialogProps = getDialogProps();

      await act(async () => {
        await dialogProps.onDiscard();
      });

      expect(saveProject).not.toHaveBeenCalled();
      expect(openProject).toHaveBeenCalled();
    });

    it('handles error in open pending action after discard', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (openProject as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Failed to open'
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { hookRef } = renderWithDialogs();

      await act(async () => {
        await hookRef.current!.handleOpen();
      });

      const dialogProps = getDialogProps();

      await act(async () => {
        await dialogProps.onDiscard();
      });

      expect(showToast).toHaveBeenCalledWith('Error: Failed to open', 'error');
    });

    it('handles recovery in open pending action after discard', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (openProject as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        needsRecovery: true,
        validationErrors: ['Error'],
        rawContent: '{}',
        filePath: '/path.carvd'
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { hookRef } = renderWithDialogs();

      await act(async () => {
        await hookRef.current!.handleOpen();
      });

      const dialogProps = getDialogProps();

      await act(async () => {
        await dialogProps.onDiscard();
      });

      expect(showToast).not.toHaveBeenCalled();
    });
  });

  describe('handleOpenRecent with unsaved changes (with TestHarness)', () => {
    it('executes open recent after discard', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (openProjectFromPath as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { hookRef } = renderWithDialogs();

      await act(async () => {
        await hookRef.current!.handleOpenRecent('/my/project.carvd');
      });

      const dialogProps = getDialogProps();

      await act(async () => {
        await dialogProps.onDiscard();
      });

      expect(openProjectFromPath).toHaveBeenCalledWith('/my/project.carvd');
    });

    it('handles error in open recent pending action', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (openProjectFromPath as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Not found'
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { hookRef } = renderWithDialogs();

      await act(async () => {
        await hookRef.current!.handleOpenRecent('/missing.carvd');
      });

      const dialogProps = getDialogProps();

      await act(async () => {
        await dialogProps.onDiscard();
      });

      expect(showToast).toHaveBeenCalledWith('Error: Not found', 'error');
    });

    it('handles recovery in open recent pending action', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (openProjectFromPath as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        needsRecovery: true,
        validationErrors: ['Bad'],
        rawContent: '{}',
        filePath: '/bad.carvd'
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { hookRef } = renderWithDialogs();

      await act(async () => {
        await hookRef.current!.handleOpenRecent('/bad.carvd');
      });

      const dialogProps = getDialogProps();

      await act(async () => {
        await dialogProps.onDiscard();
      });

      expect(showToast).not.toHaveBeenCalled();
    });
  });

  describe('handleGoHome with unsaved changes (with TestHarness)', () => {
    it('executes onGoHome after discard', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const onGoHome = vi.fn();

      const { hookRef } = renderWithDialogs({ onGoHome });

      await act(async () => {
        await hookRef.current!.handleGoHome();
      });

      const dialogProps = getDialogProps();

      await act(async () => {
        await dialogProps.onDiscard();
      });

      expect(onGoHome).toHaveBeenCalled();
    });

    it('executes onGoHome after save in dialog', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (saveProject as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      const onGoHome = vi.fn();

      const { hookRef } = renderWithDialogs({ onGoHome });

      await act(async () => {
        await hookRef.current!.handleGoHome();
      });

      const dialogProps = getDialogProps();

      await act(async () => {
        await dialogProps.onSave();
      });

      expect(saveProject).toHaveBeenCalled();
      expect(onGoHome).toHaveBeenCalled();
    });
  });

  describe('dialog components', () => {
    it('provides UnsavedChangesDialogComponent', () => {
      const { result } = renderHook(() => useFileOperations());
      expect(result.current.UnsavedChangesDialogComponent).toBeDefined();
    });

    it('provides FileRecoveryModalComponent', () => {
      const { result } = renderHook(() => useFileOperations());
      expect(result.current.FileRecoveryModalComponent).toBeDefined();
    });

    it('UnsavedChangesDialogComponent passes correct props when no pending action', () => {
      renderWithDialogs();

      const dialogProps = getDialogProps();
      expect(dialogProps.isOpen).toBe(false);
      expect(dialogProps.action).toBe('custom');
    });

    it('FileRecoveryModalComponent passes correct default props', () => {
      renderWithDialogs();

      const recoveryProps = getRecoveryProps();
      expect(recoveryProps.isOpen).toBe(false);
      expect(recoveryProps.fileName).toBe('');
      expect(recoveryProps.errors).toEqual([]);
      expect(recoveryProps.isRepairing).toBe(false);
      expect(recoveryProps.repairResult).toBeNull();
    });
  });
});
