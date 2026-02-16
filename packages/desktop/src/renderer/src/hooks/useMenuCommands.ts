/**
 * Hook to handle native menu commands from the main process
 */

import { useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import {
  newProject,
  saveProject,
  saveProjectAs,
  openProject,
  openProjectFromPath,
  clearRecentProjects,
  hasUnsavedChanges
} from '../utils/fileOperations';
import { logger } from '../utils/logger';

interface UseMenuCommandsOptions {
  onOpenSettings?: () => void;
  onShowShortcuts?: () => void;
  onOpenTemplateBrowser?: () => void;
  onShowAbout?: () => void;
  // File operation handlers (with unsaved changes handling)
  onNewProject?: () => Promise<void>;
  onOpenProject?: () => Promise<void>;
  onOpenRecentProject?: (filePath: string) => Promise<void>;
  onCloseProject?: () => void;
  // Template/assembly editing mode
  isEditingTemplate?: boolean;
  onSaveTemplate?: () => Promise<void>;
  onSaveAssembly?: () => Promise<void>;
}

export function useMenuCommands(options: UseMenuCommandsOptions = {}) {
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const requestDeleteParts = useUIStore((s) => s.requestDeleteParts);
  const selectAllParts = useProjectStore((s) => s.selectAllParts);
  const selectedPartIds = useProjectStore((s) => s.selectedPartIds);
  const resetCamera = useProjectStore((s) => s.resetCamera);
  const showToast = useUIStore((s) => s.showToast);
  const isEditingAssembly = useProjectStore((s) => s.isEditingAssembly);
  const filePath = useProjectStore((s) => s.filePath);

  useEffect(() => {
    const handleMenuCommand = async (command: string, ...args: unknown[]) => {
      // Block certain file operations when editing a template or assembly
      const blockableFileCommands = ['new-project', 'new-from-template', 'open-project', 'open-recent'];
      if ((isEditingAssembly || options.isEditingTemplate) && blockableFileCommands.includes(command)) {
        showToast(isEditingAssembly ? 'Finish editing assembly first' : 'Finish editing template first');
        return;
      }

      switch (command) {
        // File commands
        case 'new-project': {
          // Use handler with unsaved changes dialog if provided
          if (options.onNewProject) {
            await options.onNewProject();
          } else {
            await newProject();
          }
          break;
        }

        case 'new-from-template': {
          options.onOpenTemplateBrowser?.();
          break;
        }

        case 'open-project': {
          // Use handler with unsaved changes dialog if provided
          if (options.onOpenProject) {
            await options.onOpenProject();
          } else {
            const result = await openProject();
            if (!result.success && result.error) {
              showToast(result.error);
            }
          }
          break;
        }

        case 'open-recent': {
          const filePath = args[0] as string;
          if (filePath) {
            // Use handler with unsaved changes dialog if provided
            if (options.onOpenRecentProject) {
              await options.onOpenRecentProject(filePath);
            } else {
              const result = await openProjectFromPath(filePath);
              if (!result.success && result.error) {
                showToast(result.error);
              }
            }
          }
          break;
        }

        case 'clear-recent': {
          await clearRecentProjects();
          showToast('Recent projects cleared');
          break;
        }

        case 'save-project': {
          // Route to template or assembly save when in those modes
          if (options.isEditingTemplate && options.onSaveTemplate) {
            await options.onSaveTemplate();
            break;
          }
          if (isEditingAssembly && options.onSaveAssembly) {
            await options.onSaveAssembly();
            break;
          }
          // Normal project save
          const result = await saveProject();
          if (result.success) {
            showToast('Project saved');
          } else if (result.error) {
            showToast(result.error);
          }
          break;
        }

        case 'save-project-as': {
          // "Save As" doesn't apply to template or assembly editing
          if (options.isEditingTemplate) {
            showToast('Use "Save Template" to save template changes');
            break;
          }
          if (isEditingAssembly) {
            showToast('Use "Save Assembly" to save assembly changes');
            break;
          }
          const result = await saveProjectAs();
          if (result.success) {
            showToast('Project saved');
          } else if (result.error) {
            showToast(result.error);
          }
          break;
        }

        // Edit commands
        case 'undo':
          undo();
          break;

        case 'redo':
          redo();
          break;

        case 'delete':
          if (selectedPartIds.length > 0) {
            requestDeleteParts(selectedPartIds);
          }
          break;

        case 'select-all':
          selectAllParts();
          break;

        // View commands
        case 'reset-camera':
          resetCamera();
          break;

        // App commands
        case 'open-settings':
          options.onOpenSettings?.();
          break;

        case 'show-shortcuts':
          options.onShowShortcuts?.();
          break;

        case 'show-about':
          options.onShowAbout?.();
          break;

        case 'close-project': {
          options.onCloseProject?.();
          break;
        }

        case 'add-to-favorites': {
          if (filePath) {
            try {
              await window.electronAPI.addFavoriteProject(filePath);
              showToast('Added to favorites');
            } catch (error) {
              logger.error('Failed to add to favorites:', error);
              showToast('Failed to add to favorites');
            }
          } else {
            showToast('Save project first to add to favorites');
          }
          break;
        }

        default:
          logger.warn('Unknown menu command:', command);
      }
    };

    // Listen for menu commands from main process
    const cleanup = window.electronAPI.onMenuCommand(handleMenuCommand);

    // Clean up the listener when dependencies change or component unmounts
    return cleanup;
  }, [
    undo,
    redo,
    requestDeleteParts,
    selectAllParts,
    selectedPartIds,
    resetCamera,
    showToast,
    isEditingAssembly,
    filePath,
    options
  ]);
}
