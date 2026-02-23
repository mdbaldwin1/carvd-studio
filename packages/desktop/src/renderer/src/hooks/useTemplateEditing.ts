/**
 * Hook for managing template editing in the 3D workspace.
 * Handles entering/exiting edit mode, saving changes, and the unsaved changes dialog.
 */

import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useProjectStore, generateThumbnail } from '../store/projectStore';
import { useLicenseStore } from '../store/licenseStore';
import { useUIStore } from '../store/uiStore';
import { useCameraStore } from '../store/cameraStore';
import { UNTITLED_TEMPLATE_NAME } from '../constants/appDefaults';
import { UserTemplate } from '../templates';
import { Project } from '../types';
import { getFeatureLimits, getBlockedMessage } from '../utils/featureLimits';
import { hasUnsavedChanges } from '../utils/fileOperations';
import { logger } from '../utils/logger';

interface TemplateEditingState {
  isActive: boolean;
  templateId: string | null;
  templateName: string;
  templateDescription: string;
  isCreatingNew: boolean;
  originalProject: Project | null; // The project before entering template edit mode
}

interface UseTemplateEditingOptions {
  onSaveComplete?: () => void; // Called after template is saved and editing exits
  onDiscardComplete?: () => void; // Called after template editing is discarded
}

interface UseTemplateEditingResult {
  // State
  isEditingTemplate: boolean;
  editingTemplateName: string;
  editingTemplateDescription: string;
  isCreatingNewTemplate: boolean;
  showSaveDialog: boolean;
  showDiscardDialog: boolean;
  showNewTemplateSetupDialog: boolean; // Show before entering edit mode for new templates

  // Actions
  startEditing: (template: UserTemplate) => Promise<boolean>;
  startCreatingNew: () => void; // Now shows setup dialog instead of immediately entering edit mode
  confirmNewTemplateSetup: (name: string, description: string) => Promise<boolean>; // Actually enters edit mode
  cancelNewTemplateSetup: () => void;
  openSaveDialog: () => void;
  saveTemplate: () => Promise<void>; // Direct save using project name/notes
  saveAndExit: (name: string, description: string) => Promise<void>;
  requestDiscard: () => void;
  discardAndExit: () => void;
  cancelDialog: () => void;
}

export function useTemplateEditing(options: UseTemplateEditingOptions = {}): UseTemplateEditingResult {
  const { onSaveComplete, onDiscardComplete } = options;
  const loadProject = useProjectStore((s) => s.loadProject);
  const isDirty = useProjectStore((s) => s.isDirty);
  const showToast = useUIStore((s) => s.showToast);
  const markClean = useProjectStore((s) => s.markClean);

  // Template editing state
  const [state, setState] = useState<TemplateEditingState>({
    isActive: false,
    templateId: null,
    templateName: '',
    templateDescription: '',
    isCreatingNew: false,
    originalProject: null
  });

  // Store original project state to restore on discard
  const originalProjectRef = useRef<Project | null>(null);

  // Dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showNewTemplateSetupDialog, setShowNewTemplateSetupDialog] = useState(false);

  // Start editing an existing template
  const startEditing = useCallback(
    async (template: UserTemplate): Promise<boolean> => {
      // Check if current project has unsaved changes
      if (hasUnsavedChanges()) {
        showToast('Save or discard your project first', 'warning');
        return false;
      }

      try {
        // Store current project state
        const projectStore = useProjectStore.getState();
        originalProjectRef.current = {
          version: '1.0',
          name: projectStore.projectName,
          stocks: projectStore.stocks,
          parts: projectStore.parts,
          groups: projectStore.groups,
          groupMembers: projectStore.groupMembers,
          assemblies: projectStore.assemblies,
          units: projectStore.units,
          gridSize: projectStore.gridSize,
          kerfWidth: projectStore.kerfWidth,
          overageFactor: projectStore.overageFactor,
          projectNotes: projectStore.projectNotes,
          stockConstraints: projectStore.stockConstraints,
          cameraState: useCameraStore.getState().cameraState || undefined,
          createdAt: projectStore.createdAt,
          modifiedAt: projectStore.modifiedAt
        };

        // Parse and load the template's project
        const templateProject = JSON.parse(template.project as unknown as string) as Project;

        // Sync the template's name and description with the project data
        // This ensures Template Settings modal shows the correct values
        templateProject.name = template.name;
        templateProject.projectNotes = template.description || '';

        // Reset camera to default so it orbits correctly around the template
        templateProject.cameraState = undefined;

        loadProject(templateProject);
        markClean(); // Start with clean state in template edit mode

        setState({
          isActive: true,
          templateId: template.id,
          templateName: template.name,
          templateDescription: template.description || '',
          isCreatingNew: false,
          originalProject: originalProjectRef.current
        });

        return true;
      } catch (error) {
        logger.error('Failed to start template editing:', error);
        showToast('Failed to load template', 'error');
        return false;
      }
    },
    [loadProject, showToast, markClean]
  );

  // Start creating a new template - shows setup dialog first
  const startCreatingNew = useCallback(() => {
    // Check license limits for custom templates
    const limits = getFeatureLimits(useLicenseStore.getState().licenseMode);
    if (!limits.canUseCustomTemplates) {
      showToast(getBlockedMessage('useTemplates'), 'warning');
      return;
    }

    // Check if current project has unsaved changes
    if (hasUnsavedChanges()) {
      showToast('Save or discard your project first', 'warning');
      return;
    }

    // Show the setup dialog to collect name/description before entering edit mode
    setShowNewTemplateSetupDialog(true);
  }, [showToast]);

  // Called when user confirms the new template setup dialog
  const confirmNewTemplateSetup = useCallback(
    async (name: string, description: string): Promise<boolean> => {
      // Store current project state
      const projectStore = useProjectStore.getState();
      originalProjectRef.current = {
        version: '1.0',
        name: projectStore.projectName,
        stocks: projectStore.stocks,
        parts: projectStore.parts,
        groups: projectStore.groups,
        groupMembers: projectStore.groupMembers,
        assemblies: projectStore.assemblies,
        units: projectStore.units,
        gridSize: projectStore.gridSize,
        kerfWidth: projectStore.kerfWidth,
        overageFactor: projectStore.overageFactor,
        projectNotes: projectStore.projectNotes,
        stockConstraints: projectStore.stockConstraints,
        cameraState: useCameraStore.getState().cameraState || undefined,
        createdAt: projectStore.createdAt,
        modifiedAt: projectStore.modifiedAt
      };

      // Create an empty project for the new template with the provided name
      const emptyProject: Project = {
        version: '1.0',
        name: name,
        stocks: [],
        parts: [],
        groups: [],
        groupMembers: [],
        assemblies: [],
        units: projectStore.units, // Keep current units preference
        gridSize: projectStore.gridSize,
        kerfWidth: projectStore.kerfWidth,
        overageFactor: projectStore.overageFactor,
        projectNotes: description, // Use description as project notes
        stockConstraints: projectStore.stockConstraints,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      };

      loadProject(emptyProject);
      markClean(); // Start with clean state

      setState({
        isActive: true,
        templateId: null,
        templateName: name,
        templateDescription: description,
        isCreatingNew: true,
        originalProject: originalProjectRef.current
      });

      setShowNewTemplateSetupDialog(false);
      return true;
    },
    [loadProject, markClean]
  );

  // Cancel the new template setup dialog
  const cancelNewTemplateSetup = useCallback(() => {
    setShowNewTemplateSetupDialog(false);
  }, []);

  // Save template and exit editing mode
  const saveAndExit = useCallback(
    async (name: string, description: string) => {
      const projectStore = useProjectStore.getState();

      // Calculate bounding box for dimensions
      let minX = Infinity,
        maxX = -Infinity;
      let minY = Infinity,
        maxY = -Infinity;
      let minZ = Infinity,
        maxZ = -Infinity;

      for (const part of projectStore.parts) {
        const halfL = part.length / 2;
        const halfW = part.width / 2;
        const halfT = part.thickness / 2;

        minX = Math.min(minX, part.position.x - halfL);
        maxX = Math.max(maxX, part.position.x + halfL);
        minY = Math.min(minY, part.position.y - halfT);
        maxY = Math.max(maxY, part.position.y + halfT);
        minZ = Math.min(minZ, part.position.z - halfW);
        maxZ = Math.max(maxZ, part.position.z + halfW);
      }

      const width = projectStore.parts.length > 0 ? Math.round(maxX - minX) : 0;
      const depth = projectStore.parts.length > 0 ? Math.round(maxZ - minZ) : 0;
      const height = projectStore.parts.length > 0 ? Math.round(maxY - minY) : 0;

      // Create the project object for the template
      const templateProject: Project = {
        version: '1.0',
        name: name,
        stocks: projectStore.stocks,
        parts: projectStore.parts,
        groups: projectStore.groups,
        groupMembers: projectStore.groupMembers,
        assemblies: projectStore.assemblies,
        units: projectStore.units,
        gridSize: projectStore.gridSize,
        kerfWidth: projectStore.kerfWidth,
        overageFactor: projectStore.overageFactor,
        projectNotes: projectStore.projectNotes,
        stockConstraints: projectStore.stockConstraints,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      };

      try {
        // Check for manually captured thumbnail first
        let thumbnailData:
          | { data: string; width: number; height: number; generatedAt: string; manuallySet?: boolean }
          | undefined;
        const uiState = useUIStore.getState();
        const manualThumbnail = uiState.manualThumbnail;

        if (manualThumbnail) {
          // Use the manually captured thumbnail
          thumbnailData = {
            data: manualThumbnail.data,
            width: manualThumbnail.width,
            height: manualThumbnail.height,
            generatedAt: manualThumbnail.generatedAt,
            manuallySet: true
          };
          // Clear the manual thumbnail after using it
          uiState.clearManualThumbnail();
        } else if (!state.isCreatingNew && state.templateId) {
          // Check if existing template has a manually set thumbnail - preserve it
          try {
            const templates = await window.electronAPI.getUserTemplates();
            const existingTemplate = templates.find((t: { id: string }) => t.id === state.templateId);
            if (existingTemplate?.thumbnailData?.manuallySet) {
              // Preserve the existing manually-set thumbnail
              thumbnailData = existingTemplate.thumbnailData;
            }
          } catch {
            // Template not found or error - will auto-generate
          }
        }

        // Only auto-generate if we don't have a thumbnail yet
        if (!thumbnailData && projectStore.parts.length > 0) {
          // Auto-generate thumbnail from the current 3D view
          const thumbnail = await generateThumbnail();
          if (thumbnail) {
            thumbnailData = {
              data: thumbnail,
              width: 400,
              height: 300,
              generatedAt: new Date().toISOString()
            };
          }
        }

        if (state.isCreatingNew || !state.templateId) {
          // Create new template
          const newTemplate = {
            id: uuidv4(),
            name: name,
            description: description,
            dimensions: { width, depth, height },
            partCount: projectStore.parts.length,
            thumbnail: '📐', // Emoji fallback
            thumbnailData, // Base64 image thumbnail
            category: 'other' as const,
            createdAt: new Date().toISOString(),
            project: JSON.stringify(templateProject)
          };

          await window.electronAPI.addUserTemplate(newTemplate);
          showToast(`Created template "${name}"`, 'success');
        } else {
          // Update existing template
          await window.electronAPI.updateUserTemplate(state.templateId, {
            name: name,
            description: description,
            dimensions: { width, depth, height },
            partCount: projectStore.parts.length,
            thumbnailData, // Update thumbnail
            project: JSON.stringify(templateProject)
          });
          showToast(`Saved template "${name}"`, 'success');
        }

        // Restore original project
        if (originalProjectRef.current) {
          loadProject(originalProjectRef.current);
          markClean();
        }

        // Reset state
        setState({
          isActive: false,
          templateId: null,
          templateName: '',
          templateDescription: '',
          isCreatingNew: false,
          originalProject: null
        });
        originalProjectRef.current = null;
        setShowSaveDialog(false);
        setShowDiscardDialog(false);

        // Notify caller that save is complete
        onSaveComplete?.();
      } catch (error) {
        logger.error('Failed to save template:', error);
        showToast('Failed to save template', 'error');
      }
    },
    [state, loadProject, showToast, markClean, onSaveComplete]
  );

  // Open save dialog to enter name/description
  const openSaveDialog = useCallback(() => {
    setShowSaveDialog(true);
  }, []);

  // Smart save - save directly using project name/notes (for both new and existing templates)
  // Name/description are collected upfront for new templates, and editable via Template Settings for existing
  const saveTemplate = useCallback(async () => {
    const projectStore = useProjectStore.getState();
    // Always use current store values - they're set when template loads and updated by Template Settings modal
    // Use nullish coalescing (??) to allow empty strings, only fall back if undefined/null
    const name = projectStore.projectName || state.templateName || UNTITLED_TEMPLATE_NAME;
    // For description, use store value directly (can be empty string - that's valid)
    const description = projectStore.projectNotes ?? '';
    await saveAndExit(name, description);
  }, [state.templateName, saveAndExit]);

  // Request to discard (shows confirmation if there are changes)
  const requestDiscard = useCallback(() => {
    if (isDirty) {
      setShowDiscardDialog(true);
    } else {
      // No changes, just exit
      if (originalProjectRef.current) {
        loadProject(originalProjectRef.current);
        markClean();
      }
      setState({
        isActive: false,
        templateId: null,
        templateName: '',
        templateDescription: '',
        isCreatingNew: false,
        originalProject: null
      });
      originalProjectRef.current = null;

      // Notify caller that discard is complete
      onDiscardComplete?.();
    }
  }, [isDirty, loadProject, markClean, onDiscardComplete]);

  // Discard changes and exit editing mode (called after confirmation)
  const discardAndExit = useCallback(() => {
    // Restore original project
    if (originalProjectRef.current) {
      loadProject(originalProjectRef.current);
      markClean();
    }

    // Reset state
    setState({
      isActive: false,
      templateId: null,
      templateName: '',
      templateDescription: '',
      isCreatingNew: false,
      originalProject: null
    });
    originalProjectRef.current = null;
    setShowSaveDialog(false);
    setShowDiscardDialog(false);

    // Notify caller that discard is complete
    onDiscardComplete?.();
  }, [loadProject, markClean, onDiscardComplete]);

  // Cancel any dialog
  const cancelDialog = useCallback(() => {
    setShowSaveDialog(false);
    setShowDiscardDialog(false);
  }, []);

  return {
    isEditingTemplate: state.isActive,
    editingTemplateName: state.templateName,
    editingTemplateDescription: state.templateDescription,
    isCreatingNewTemplate: state.isCreatingNew,
    showSaveDialog,
    showDiscardDialog,
    showNewTemplateSetupDialog,
    startEditing,
    startCreatingNew,
    confirmNewTemplateSetup,
    cancelNewTemplateSetup,
    openSaveDialog,
    saveTemplate,
    saveAndExit,
    requestDiscard,
    discardAndExit,
    cancelDialog
  };
}
