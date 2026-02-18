import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProjectStore } from '../store/projectStore';
import { useAssemblyEditingStore } from '../store/assemblyEditingStore';
import { useSelectionStore } from '../store/selectionStore';
import { useUIStore } from '../store/uiStore';

// Mock file operations
vi.mock('../utils/fileOperations', () => ({
  newProject: vi.fn().mockResolvedValue(undefined),
  saveProject: vi.fn().mockResolvedValue({ success: true }),
  saveProjectAs: vi.fn().mockResolvedValue({ success: true }),
  openProject: vi.fn().mockResolvedValue({ success: true }),
  openProjectFromPath: vi.fn().mockResolvedValue({ success: true }),
  clearRecentProjects: vi.fn().mockResolvedValue(undefined),
  hasUnsavedChanges: vi.fn().mockReturnValue(false)
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import { useMenuCommands } from './useMenuCommands';
import { saveProject, saveProjectAs, openProject, clearRecentProjects } from '../utils/fileOperations';

// ============================================================
// Setup
// ============================================================

// Capture the menu command handler registered via onMenuCommand
let menuCommandHandler: (command: string, ...args: unknown[]) => Promise<void>;

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
    setWindowTitle: vi.fn(),
    onMenuCommand: vi.fn().mockImplementation((handler) => {
      menuCommandHandler = handler;
      return vi.fn(); // cleanup function
    }),
    addFavoriteProject: vi.fn().mockResolvedValue(undefined)
  } as unknown as typeof window.electronAPI;
});

beforeEach(() => {
  vi.clearAllMocks();
  // Re-establish mocks after clearAllMocks
  (window.electronAPI.onMenuCommand as ReturnType<typeof vi.fn>).mockImplementation((handler) => {
    menuCommandHandler = handler;
    return vi.fn();
  });
  (window.electronAPI.addFavoriteProject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (saveProject as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
  (saveProjectAs as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
  (openProject as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
  (clearRecentProjects as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
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
  useAssemblyEditingStore.setState({ isEditingAssembly: false });
  useSelectionStore.setState({ selectedPartIds: [] });
  useUIStore.setState({ toast: null });
});

// ============================================================
// Tests
// ============================================================

describe('useMenuCommands', () => {
  describe('edit commands', () => {
    it('handles undo command', async () => {
      const undo = vi.fn();
      useProjectStore.setState({ undo });

      renderHook(() => useMenuCommands());
      await menuCommandHandler('undo');

      expect(undo).toHaveBeenCalled();
    });

    it('handles redo command', async () => {
      const redo = vi.fn();
      useProjectStore.setState({ redo });

      renderHook(() => useMenuCommands());
      await menuCommandHandler('redo');

      expect(redo).toHaveBeenCalled();
    });

    it('handles delete command with selected parts', async () => {
      useSelectionStore.setState({ selectedPartIds: ['p1', 'p2'] });
      const requestDeleteParts = vi.fn();
      useUIStore.setState({ requestDeleteParts });

      renderHook(() => useMenuCommands());
      await menuCommandHandler('delete');

      expect(requestDeleteParts).toHaveBeenCalledWith(['p1', 'p2']);
    });

    it('ignores delete command with no selection', async () => {
      useSelectionStore.setState({ selectedPartIds: [] });
      const requestDeleteParts = vi.fn();
      useUIStore.setState({ requestDeleteParts });

      renderHook(() => useMenuCommands());
      await menuCommandHandler('delete');

      expect(requestDeleteParts).not.toHaveBeenCalled();
    });

    it('handles select-all command', async () => {
      const selectAllParts = vi.fn();
      useProjectStore.setState({ selectAllParts });

      renderHook(() => useMenuCommands());
      await menuCommandHandler('select-all');

      expect(selectAllParts).toHaveBeenCalled();
    });
  });

  describe('view commands', () => {
    it('handles reset-camera command', async () => {
      const resetCamera = vi.fn();
      useProjectStore.setState({ resetCamera });

      renderHook(() => useMenuCommands());
      await menuCommandHandler('reset-camera');

      expect(resetCamera).toHaveBeenCalled();
    });
  });

  describe('file commands', () => {
    it('handles new-project with provided handler', async () => {
      const onNewProject = vi.fn().mockResolvedValue(undefined);
      renderHook(() => useMenuCommands({ onNewProject }));
      await menuCommandHandler('new-project');

      expect(onNewProject).toHaveBeenCalled();
    });

    it('handles save-project command', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      renderHook(() => useMenuCommands());
      await menuCommandHandler('save-project');

      expect(saveProject).toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('Project saved');
    });

    it('handles save-project error', async () => {
      (saveProject as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: false,
        error: 'Save failed'
      });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      renderHook(() => useMenuCommands());
      await menuCommandHandler('save-project');

      expect(showToast).toHaveBeenCalledWith('Save failed');
    });

    it('handles save-project-as command', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      renderHook(() => useMenuCommands());
      await menuCommandHandler('save-project-as');

      expect(saveProjectAs).toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('Project saved');
    });

    it('handles open-project with provided handler', async () => {
      const onOpenProject = vi.fn().mockResolvedValue(undefined);
      renderHook(() => useMenuCommands({ onOpenProject }));
      await menuCommandHandler('open-project');

      expect(onOpenProject).toHaveBeenCalled();
    });

    it('handles open-project without handler', async () => {
      renderHook(() => useMenuCommands());
      await menuCommandHandler('open-project');

      expect(openProject).toHaveBeenCalled();
    });

    it('handles open-recent with provided handler', async () => {
      const onOpenRecentProject = vi.fn().mockResolvedValue(undefined);
      renderHook(() => useMenuCommands({ onOpenRecentProject }));
      await menuCommandHandler('open-recent', '/path/to/file.carvd');

      expect(onOpenRecentProject).toHaveBeenCalledWith('/path/to/file.carvd');
    });

    it('handles clear-recent command', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      renderHook(() => useMenuCommands());
      await menuCommandHandler('clear-recent');

      expect(clearRecentProjects).toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('Recent projects cleared');
    });

    it('handles new-from-template command', async () => {
      const onOpenTemplateBrowser = vi.fn();
      renderHook(() => useMenuCommands({ onOpenTemplateBrowser }));
      await menuCommandHandler('new-from-template');

      expect(onOpenTemplateBrowser).toHaveBeenCalled();
    });

    it('handles close-project command', async () => {
      const onCloseProject = vi.fn();
      renderHook(() => useMenuCommands({ onCloseProject }));
      await menuCommandHandler('close-project');

      expect(onCloseProject).toHaveBeenCalled();
    });
  });

  describe('app commands', () => {
    it('handles open-settings command', async () => {
      const onOpenSettings = vi.fn();
      renderHook(() => useMenuCommands({ onOpenSettings }));
      await menuCommandHandler('open-settings');

      expect(onOpenSettings).toHaveBeenCalled();
    });

    it('handles show-shortcuts command', async () => {
      const onShowShortcuts = vi.fn();
      renderHook(() => useMenuCommands({ onShowShortcuts }));
      await menuCommandHandler('show-shortcuts');

      expect(onShowShortcuts).toHaveBeenCalled();
    });

    it('handles show-about command', async () => {
      const onShowAbout = vi.fn();
      renderHook(() => useMenuCommands({ onShowAbout }));
      await menuCommandHandler('show-about');

      expect(onShowAbout).toHaveBeenCalled();
    });

    it('handles add-to-favorites with saved file', async () => {
      useProjectStore.setState({ filePath: '/path/to/project.carvd' });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      renderHook(() => useMenuCommands());
      await menuCommandHandler('add-to-favorites');

      expect(window.electronAPI.addFavoriteProject).toHaveBeenCalledWith('/path/to/project.carvd');
      expect(showToast).toHaveBeenCalledWith('Added to favorites');
    });

    it('blocks add-to-favorites without saved file', async () => {
      useProjectStore.setState({ filePath: null });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      renderHook(() => useMenuCommands());
      await menuCommandHandler('add-to-favorites');

      expect(window.electronAPI.addFavoriteProject).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('Save project first to add to favorites');
    });
  });

  describe('blocking during editing', () => {
    it('blocks file commands when editing assembly', async () => {
      useAssemblyEditingStore.setState({ isEditingAssembly: true });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      renderHook(() => useMenuCommands());
      await menuCommandHandler('new-project');

      expect(showToast).toHaveBeenCalledWith('Finish editing assembly first');
    });

    it('blocks file commands when editing template', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      renderHook(() => useMenuCommands({ isEditingTemplate: true }));
      await menuCommandHandler('open-project');

      expect(showToast).toHaveBeenCalledWith('Finish editing template first');
    });

    it('routes save to template save when editing template', async () => {
      const onSaveTemplate = vi.fn().mockResolvedValue(undefined);
      renderHook(() => useMenuCommands({ isEditingTemplate: true, onSaveTemplate }));
      await menuCommandHandler('save-project');

      expect(onSaveTemplate).toHaveBeenCalled();
      expect(saveProject).not.toHaveBeenCalled();
    });

    it('routes save to assembly save when editing assembly', async () => {
      useAssemblyEditingStore.setState({ isEditingAssembly: true });
      const onSaveAssembly = vi.fn().mockResolvedValue(undefined);
      renderHook(() => useMenuCommands({ onSaveAssembly }));
      await menuCommandHandler('save-project');

      expect(onSaveAssembly).toHaveBeenCalled();
      expect(saveProject).not.toHaveBeenCalled();
    });

    it('blocks save-as when editing template', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      renderHook(() => useMenuCommands({ isEditingTemplate: true }));
      await menuCommandHandler('save-project-as');

      expect(showToast).toHaveBeenCalledWith('Use "Save Template" to save template changes');
      expect(saveProjectAs).not.toHaveBeenCalled();
    });

    it('blocks save-as when editing assembly', async () => {
      useAssemblyEditingStore.setState({ isEditingAssembly: true });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      renderHook(() => useMenuCommands());
      await menuCommandHandler('save-project-as');

      expect(showToast).toHaveBeenCalledWith('Use "Save Assembly" to save assembly changes');
      expect(saveProjectAs).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('registers onMenuCommand listener', () => {
      renderHook(() => useMenuCommands());
      expect(window.electronAPI.onMenuCommand).toHaveBeenCalled();
    });
  });
});
