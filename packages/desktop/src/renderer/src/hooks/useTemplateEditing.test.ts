import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProjectStore } from '../store/projectStore';
import { useLicenseStore } from '../store/licenseStore';
import { useUIStore } from '../store/uiStore';
import { useCameraStore } from '../store/cameraStore';

// Mock file operations
vi.mock('../utils/fileOperations', () => ({
  hasUnsavedChanges: vi.fn().mockReturnValue(false)
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

// Mock generateThumbnail
vi.mock('../store/projectStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../store/projectStore')>();
  return {
    ...actual,
    generateThumbnail: vi.fn().mockResolvedValue(null)
  };
});

import { useTemplateEditing } from './useTemplateEditing';
import { hasUnsavedChanges } from '../utils/fileOperations';

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
    setWindowTitle: vi.fn(),
    getUserTemplates: vi.fn().mockResolvedValue([]),
    addUserTemplate: vi.fn().mockResolvedValue(undefined),
    updateUserTemplate: vi.fn().mockResolvedValue(undefined)
  } as unknown as typeof window.electronAPI;
});

beforeEach(() => {
  vi.clearAllMocks();
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
  useLicenseStore.setState({ licenseMode: 'trial' });
  useUIStore.setState({ toast: null, manualThumbnail: null });
  (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(false);
});

// ============================================================
// Tests
// ============================================================

describe('useTemplateEditing', () => {
  describe('initial state', () => {
    it('starts with editing inactive', () => {
      const { result } = renderHook(() => useTemplateEditing());
      expect(result.current.isEditingTemplate).toBe(false);
      expect(result.current.editingTemplateName).toBe('');
      expect(result.current.isCreatingNewTemplate).toBe(false);
      expect(result.current.showSaveDialog).toBe(false);
      expect(result.current.showDiscardDialog).toBe(false);
      expect(result.current.showNewTemplateSetupDialog).toBe(false);
    });
  });

  describe('startEditing', () => {
    it('loads template into workspace', async () => {
      const template = {
        id: 't1',
        name: 'My Template',
        description: 'A test template',
        project: JSON.stringify({
          version: '1.0',
          name: 'Template Project',
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
          modifiedAt: '2026-01-01'
        })
      };

      const { result } = renderHook(() => useTemplateEditing());

      let success: boolean;
      await act(async () => {
        success = await result.current.startEditing(template as any);
      });

      expect(success!).toBe(true);
      expect(result.current.isEditingTemplate).toBe(true);
      expect(result.current.editingTemplateName).toBe('My Template');
    });

    it('blocks when project has unsaved changes', async () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useTemplateEditing());

      let success: boolean;
      await act(async () => {
        success = await result.current.startEditing({ id: 't1', name: 'T' } as any);
      });

      expect(success!).toBe(false);
      expect(showToast).toHaveBeenCalledWith('Save or discard your project first');
    });
  });

  describe('startCreatingNew', () => {
    it('shows setup dialog for new template', () => {
      const { result } = renderHook(() => useTemplateEditing());

      act(() => {
        result.current.startCreatingNew();
      });

      expect(result.current.showNewTemplateSetupDialog).toBe(true);
    });

    it('blocks when in free mode', () => {
      useLicenseStore.setState({ licenseMode: 'free' });
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useTemplateEditing());

      act(() => {
        result.current.startCreatingNew();
      });

      expect(result.current.showNewTemplateSetupDialog).toBe(false);
      expect(showToast).toHaveBeenCalled();
    });

    it('blocks when project has unsaved changes', () => {
      (hasUnsavedChanges as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useTemplateEditing());

      act(() => {
        result.current.startCreatingNew();
      });

      expect(result.current.showNewTemplateSetupDialog).toBe(false);
      expect(showToast).toHaveBeenCalledWith('Save or discard your project first');
    });
  });

  describe('confirmNewTemplateSetup', () => {
    it('enters edit mode with empty workspace', async () => {
      const { result } = renderHook(() => useTemplateEditing());

      // Show setup dialog first
      act(() => {
        result.current.startCreatingNew();
      });

      let success: boolean;
      await act(async () => {
        success = await result.current.confirmNewTemplateSetup('New Template', 'A description');
      });

      expect(success!).toBe(true);
      expect(result.current.isEditingTemplate).toBe(true);
      expect(result.current.editingTemplateName).toBe('New Template');
      expect(result.current.isCreatingNewTemplate).toBe(true);
      expect(result.current.showNewTemplateSetupDialog).toBe(false);
    });
  });

  describe('cancelNewTemplateSetup', () => {
    it('closes the setup dialog', () => {
      const { result } = renderHook(() => useTemplateEditing());

      act(() => {
        result.current.startCreatingNew();
      });
      expect(result.current.showNewTemplateSetupDialog).toBe(true);

      act(() => {
        result.current.cancelNewTemplateSetup();
      });
      expect(result.current.showNewTemplateSetupDialog).toBe(false);
    });
  });

  describe('openSaveDialog', () => {
    it('opens the save dialog', () => {
      const { result } = renderHook(() => useTemplateEditing());

      act(() => {
        result.current.openSaveDialog();
      });

      expect(result.current.showSaveDialog).toBe(true);
    });
  });

  describe('cancelDialog', () => {
    it('closes both save and discard dialogs', () => {
      const { result } = renderHook(() => useTemplateEditing());

      act(() => {
        result.current.openSaveDialog();
      });
      expect(result.current.showSaveDialog).toBe(true);

      act(() => {
        result.current.cancelDialog();
      });
      expect(result.current.showSaveDialog).toBe(false);
      expect(result.current.showDiscardDialog).toBe(false);
    });
  });

  describe('requestDiscard', () => {
    it('exits immediately when project is clean', async () => {
      // First enter edit mode
      const { result } = renderHook(() => useTemplateEditing());

      await act(async () => {
        await result.current.confirmNewTemplateSetup('Test', 'Desc');
      });
      expect(result.current.isEditingTemplate).toBe(true);

      // Request discard when clean
      act(() => {
        result.current.requestDiscard();
      });

      expect(result.current.isEditingTemplate).toBe(false);
    });

    it('shows discard dialog when project is dirty', async () => {
      const { result } = renderHook(() => useTemplateEditing());

      await act(async () => {
        await result.current.confirmNewTemplateSetup('Test', 'Desc');
      });

      // Make project dirty — must be in act() to trigger re-render
      await act(async () => {
        useProjectStore.setState({ isDirty: true });
      });

      act(() => {
        result.current.requestDiscard();
      });

      expect(result.current.showDiscardDialog).toBe(true);
    });
  });

  describe('discardAndExit', () => {
    it('restores original project and exits', async () => {
      const { result } = renderHook(() => useTemplateEditing());

      // Enter edit mode
      await act(async () => {
        await result.current.confirmNewTemplateSetup('Test', 'Desc');
      });
      expect(result.current.isEditingTemplate).toBe(true);

      // Discard
      act(() => {
        result.current.discardAndExit();
      });

      expect(result.current.isEditingTemplate).toBe(false);
      expect(result.current.showSaveDialog).toBe(false);
      expect(result.current.showDiscardDialog).toBe(false);
    });

    it('calls onDiscardComplete callback', async () => {
      const onDiscardComplete = vi.fn();
      const { result } = renderHook(() => useTemplateEditing({ onDiscardComplete }));

      await act(async () => {
        await result.current.confirmNewTemplateSetup('Test', 'Desc');
      });

      act(() => {
        result.current.discardAndExit();
      });

      expect(onDiscardComplete).toHaveBeenCalled();
    });
  });

  describe('saveAndExit', () => {
    it('creates new template and exits', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useTemplateEditing());

      // Enter edit mode for new template
      await act(async () => {
        await result.current.confirmNewTemplateSetup('My New Template', 'Description');
      });

      // Save and exit
      await act(async () => {
        await result.current.saveAndExit('My New Template', 'Description');
      });

      expect(window.electronAPI.addUserTemplate).toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('Created template "My New Template"');
      expect(result.current.isEditingTemplate).toBe(false);
    });

    it('updates existing template', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const template = {
        id: 't1',
        name: 'Existing',
        description: 'Desc',
        project: JSON.stringify({
          version: '1.0',
          name: 'Existing',
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
          modifiedAt: '2026-01-01'
        })
      };

      (window.electronAPI.getUserTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const { result } = renderHook(() => useTemplateEditing());

      await act(async () => {
        await result.current.startEditing(template as any);
      });

      // Make changes and save (the template already exists, so update)
      (window.electronAPI.getUserTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 't1' }]);
      await act(async () => {
        await result.current.saveAndExit('Updated Name', 'Updated desc');
      });

      expect(window.electronAPI.updateUserTemplate).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({ name: 'Updated Name' })
      );
    });

    it('calls onSaveComplete callback', async () => {
      const onSaveComplete = vi.fn();
      const { result } = renderHook(() => useTemplateEditing({ onSaveComplete }));

      await act(async () => {
        await result.current.confirmNewTemplateSetup('Test', 'Desc');
      });

      await act(async () => {
        await result.current.saveAndExit('Test', 'Desc');
      });

      expect(onSaveComplete).toHaveBeenCalled();
    });
  });
});
