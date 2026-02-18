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
const mockGenerateThumbnail = vi.fn().mockResolvedValue(null);
vi.mock('../store/projectStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../store/projectStore')>();
  return {
    ...actual,
    generateThumbnail: (...args: unknown[]) => mockGenerateThumbnail(...args)
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
  mockGenerateThumbnail.mockResolvedValue(null);
});

// ============================================================
// Helpers
// ============================================================

function makeTemplate(overrides: Record<string, unknown> = {}) {
  return {
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
    }),
    ...overrides
  };
}

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

    it('shows error toast when addUserTemplate fails', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });
      (window.electronAPI.addUserTemplate as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('disk full'));

      const { result } = renderHook(() => useTemplateEditing());

      await act(async () => {
        await result.current.confirmNewTemplateSetup('Fail Template', 'Desc');
      });

      await act(async () => {
        await result.current.saveAndExit('Fail Template', 'Desc');
      });

      expect(showToast).toHaveBeenCalledWith('Failed to save template');
    });

    it('shows error toast when updateUserTemplate fails', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });
      (window.electronAPI.updateUserTemplate as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('disk full'));
      (window.electronAPI.getUserTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const { result } = renderHook(() => useTemplateEditing());

      // Start editing existing template
      await act(async () => {
        await result.current.startEditing(makeTemplate() as any);
      });

      // Save triggers update path (template has id 't1')
      (window.electronAPI.getUserTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 't1' }]);
      await act(async () => {
        await result.current.saveAndExit('Updated', 'Desc');
      });

      expect(showToast).toHaveBeenCalledWith('Failed to save template');
      // Should still be in editing mode since save failed
      expect(result.current.isEditingTemplate).toBe(true);
    });

    it('calculates bounding box dimensions when parts exist', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useTemplateEditing());

      await act(async () => {
        await result.current.confirmNewTemplateSetup('With Parts', 'Desc');
      });

      // Add parts to project store to test bounding box calculation
      useProjectStore.setState({
        parts: [
          {
            id: 'p1',
            name: 'Part 1',
            length: 24,
            width: 12,
            thickness: 0.75,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            stockId: null,
            grainSensitive: false,
            grainDirection: 'length' as const,
            color: '#8B4513'
          },
          {
            id: 'p2',
            name: 'Part 2',
            length: 10,
            width: 8,
            thickness: 0.75,
            position: { x: 20, y: 5, z: 10 },
            rotation: { x: 0, y: 0, z: 0 },
            stockId: null,
            grainSensitive: false,
            grainDirection: 'length' as const,
            color: '#8B4513'
          }
        ] as any[]
      });

      await act(async () => {
        await result.current.saveAndExit('With Parts', 'Desc');
      });

      const callArgs = (window.electronAPI.addUserTemplate as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.dimensions).toBeDefined();
      expect(callArgs.dimensions.width).toBeGreaterThan(0);
      expect(callArgs.dimensions.height).toBeGreaterThan(0);
      expect(callArgs.dimensions.depth).toBeGreaterThan(0);
      expect(callArgs.partCount).toBe(2);
    });

    it('uses manual thumbnail when available', async () => {
      const clearManualThumbnail = vi.fn();
      useUIStore.setState({
        manualThumbnail: {
          data: 'base64-data',
          width: 400,
          height: 300,
          generatedAt: '2026-01-15T00:00:00Z',
          manuallySet: true
        },
        clearManualThumbnail
      });

      const { result } = renderHook(() => useTemplateEditing());

      await act(async () => {
        await result.current.confirmNewTemplateSetup('Thumb Template', 'Desc');
      });

      await act(async () => {
        await result.current.saveAndExit('Thumb Template', 'Desc');
      });

      const callArgs = (window.electronAPI.addUserTemplate as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.thumbnailData).toBeDefined();
      expect(callArgs.thumbnailData.data).toBe('base64-data');
      expect(callArgs.thumbnailData.manuallySet).toBe(true);
      expect(clearManualThumbnail).toHaveBeenCalled();
    });

    it('preserves manually-set thumbnail when editing existing template', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const existingThumbnailData = {
        data: 'existing-thumb',
        width: 400,
        height: 300,
        generatedAt: '2026-01-10T00:00:00Z',
        manuallySet: true
      };

      // Mock getUserTemplates to return existing template with manual thumbnail
      (window.electronAPI.getUserTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 't1', thumbnailData: existingThumbnailData }
      ]);

      const { result } = renderHook(() => useTemplateEditing());

      // Start editing existing template
      await act(async () => {
        await result.current.startEditing(makeTemplate() as any);
      });

      // Save and exit - should preserve existing manually-set thumbnail
      await act(async () => {
        await result.current.saveAndExit('Updated Template', 'Desc');
      });

      expect(window.electronAPI.updateUserTemplate).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({
          thumbnailData: existingThumbnailData
        })
      );
    });

    it('auto-generates thumbnail when parts exist and no manual thumbnail', async () => {
      mockGenerateThumbnail.mockResolvedValueOnce('auto-generated-base64');

      const { result } = renderHook(() => useTemplateEditing());

      await act(async () => {
        await result.current.confirmNewTemplateSetup('Auto Thumb', 'Desc');
      });

      // Add a part so thumbnail generation is attempted
      useProjectStore.setState({
        parts: [
          {
            id: 'p1',
            name: 'Part',
            length: 10,
            width: 5,
            thickness: 0.75,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            stockId: null,
            grainSensitive: false,
            grainDirection: 'length' as const,
            color: '#8B4513'
          }
        ] as any[]
      });

      await act(async () => {
        await result.current.saveAndExit('Auto Thumb', 'Desc');
      });

      expect(mockGenerateThumbnail).toHaveBeenCalled();
      const callArgs = (window.electronAPI.addUserTemplate as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.thumbnailData.data).toBe('auto-generated-base64');
      expect(callArgs.thumbnailData.width).toBe(400);
      expect(callArgs.thumbnailData.height).toBe(300);
    });

    it('handles empty template with zero dimensions', async () => {
      const { result } = renderHook(() => useTemplateEditing());

      await act(async () => {
        await result.current.confirmNewTemplateSetup('Empty', 'Desc');
      });

      // parts is empty in the store (default)
      await act(async () => {
        await result.current.saveAndExit('Empty', 'Desc');
      });

      const callArgs = (window.electronAPI.addUserTemplate as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.dimensions.width).toBe(0);
      expect(callArgs.dimensions.depth).toBe(0);
      expect(callArgs.dimensions.height).toBe(0);
      expect(callArgs.partCount).toBe(0);
    });

    it('does not preserve thumbnail when existing template has non-manual thumbnail', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      // Existing template with auto-generated (non-manual) thumbnail
      (window.electronAPI.getUserTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 't1',
          thumbnailData: {
            data: 'auto-thumb',
            width: 400,
            height: 300,
            generatedAt: '2026-01-10T00:00:00Z'
            // manuallySet not set (or false)
          }
        }
      ]);

      const { result } = renderHook(() => useTemplateEditing());

      await act(async () => {
        await result.current.startEditing(makeTemplate() as any);
      });

      await act(async () => {
        await result.current.saveAndExit('Updated', 'Desc');
      });

      // The non-manual thumbnail should NOT be preserved, and since there are no parts,
      // no auto-generation happens either -> thumbnailData should be undefined
      expect(window.electronAPI.updateUserTemplate).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({
          thumbnailData: undefined
        })
      );
    });

    it('handles getUserTemplates failure gracefully when checking existing thumbnails', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      // getUserTemplates fails
      (window.electronAPI.getUserTemplates as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'));

      const { result } = renderHook(() => useTemplateEditing());

      await act(async () => {
        await result.current.startEditing(makeTemplate() as any);
      });

      // Should still succeed despite getUserTemplates failure
      await act(async () => {
        await result.current.saveAndExit('Updated', 'Desc');
      });

      // Should have updated successfully (the catch inside is silenced)
      expect(window.electronAPI.updateUserTemplate).toHaveBeenCalled();
      expect(result.current.isEditingTemplate).toBe(false);
    });
  });

  describe('saveTemplate', () => {
    it('uses projectName and projectNotes from store', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useTemplateEditing());

      await act(async () => {
        await result.current.confirmNewTemplateSetup('Initial Name', 'Initial Desc');
      });

      // Update project store values (simulating Template Settings modal)
      useProjectStore.setState({
        projectName: 'Store Name',
        projectNotes: 'Store Notes'
      });

      await act(async () => {
        await result.current.saveTemplate();
      });

      expect(window.electronAPI.addUserTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Store Name'
        })
      );
    });

    it('falls back to templateName when projectName is empty', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useTemplateEditing());

      await act(async () => {
        await result.current.confirmNewTemplateSetup('Fallback Name', 'Desc');
      });

      // Set projectName to empty
      useProjectStore.setState({
        projectName: '',
        projectNotes: ''
      });

      await act(async () => {
        await result.current.saveTemplate();
      });

      expect(window.electronAPI.addUserTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Fallback Name'
        })
      );
    });

    it('falls back to "Untitled Template" when both names are empty', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useTemplateEditing());

      await act(async () => {
        await result.current.confirmNewTemplateSetup('', '');
      });

      // Both projectName and templateName are empty
      useProjectStore.setState({
        projectName: '',
        projectNotes: 'Some notes'
      });

      await act(async () => {
        await result.current.saveTemplate();
      });

      expect(window.electronAPI.addUserTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Untitled Template'
        })
      );
    });

    it('uses empty string for description when projectNotes is empty string', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const { result } = renderHook(() => useTemplateEditing());

      await act(async () => {
        await result.current.confirmNewTemplateSetup('Test', '');
      });

      useProjectStore.setState({
        projectName: 'Test',
        projectNotes: ''
      });

      await act(async () => {
        await result.current.saveTemplate();
      });

      // Description argument to saveAndExit should be empty string
      expect(window.electronAPI.addUserTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          description: ''
        })
      );
    });
  });

  describe('startEditing - error path', () => {
    it('returns false and shows toast on JSON parse error', async () => {
      const showToast = vi.fn();
      useUIStore.setState({ showToast });

      const badTemplate = {
        id: 't1',
        name: 'Bad Template',
        description: 'Broken',
        project: 'NOT VALID JSON'
      };

      const { result } = renderHook(() => useTemplateEditing());

      let success: boolean;
      await act(async () => {
        success = await result.current.startEditing(badTemplate as any);
      });

      expect(success!).toBe(false);
      expect(showToast).toHaveBeenCalledWith('Failed to load template');
      expect(result.current.isEditingTemplate).toBe(false);
    });
  });

  describe('requestDiscard - callbacks', () => {
    it('calls onDiscardComplete when clean and exiting immediately', async () => {
      const onDiscardComplete = vi.fn();
      const { result } = renderHook(() => useTemplateEditing({ onDiscardComplete }));

      await act(async () => {
        await result.current.confirmNewTemplateSetup('Test', 'Desc');
      });
      expect(result.current.isEditingTemplate).toBe(true);

      // isDirty is false (clean), so requestDiscard exits immediately
      act(() => {
        result.current.requestDiscard();
      });

      expect(result.current.isEditingTemplate).toBe(false);
      expect(onDiscardComplete).toHaveBeenCalled();
    });
  });
});
