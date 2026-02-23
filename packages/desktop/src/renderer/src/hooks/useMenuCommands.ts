/**
 * Hook to handle native menu commands from the main process.
 * Uses a ref for the options object and imperative store reads
 * to avoid re-registering the listener on every render.
 */

import { useEffect, useRef } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useAssemblyEditingStore } from '../store/assemblyEditingStore';
import { useSelectionStore } from '../store/selectionStore';
import { useUIStore } from '../store/uiStore';
import {
  newProject,
  saveProject,
  saveProjectAs,
  openProject,
  openProjectFromPath,
  clearRecentProjects
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
  // Store options in a ref so the effect doesn't re-run when they change.
  // The handler always reads the latest options via the ref.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const handleMenuCommand = async (command: string, ...args: unknown[]) => {
      const opts = optionsRef.current;

      // Read store state imperatively
      const isEditingAssembly = useAssemblyEditingStore.getState().isEditingAssembly;
      const showToast = useUIStore.getState().showToast;
      const filePath = useProjectStore.getState().filePath;

      // Block certain file operations when editing a template or assembly
      const blockableFileCommands = ['new-project', 'new-from-template', 'open-project', 'open-recent'];
      if ((isEditingAssembly || opts.isEditingTemplate) && blockableFileCommands.includes(command)) {
        showToast(isEditingAssembly ? 'Finish editing assembly first' : 'Finish editing template first', 'warning');
        return;
      }

      switch (command) {
        // File commands
        case 'new-project': {
          // Use handler with unsaved changes dialog if provided
          if (opts.onNewProject) {
            await opts.onNewProject();
          } else {
            await newProject();
          }
          break;
        }

        case 'new-from-template': {
          opts.onOpenTemplateBrowser?.();
          break;
        }

        case 'open-project': {
          // Use handler with unsaved changes dialog if provided
          if (opts.onOpenProject) {
            await opts.onOpenProject();
          } else {
            const result = await openProject();
            if (!result.success && result.error) {
              showToast(result.error, 'error');
            }
          }
          break;
        }

        case 'open-recent': {
          const recentFilePath = args[0] as string;
          if (recentFilePath) {
            // Use handler with unsaved changes dialog if provided
            if (opts.onOpenRecentProject) {
              await opts.onOpenRecentProject(recentFilePath);
            } else {
              const result = await openProjectFromPath(recentFilePath);
              if (!result.success && result.error) {
                showToast(result.error, 'error');
              }
            }
          }
          break;
        }

        case 'clear-recent': {
          await clearRecentProjects();
          showToast('Recent projects cleared', 'success');
          break;
        }

        case 'save-project': {
          // Route to template or assembly save when in those modes
          if (opts.isEditingTemplate && opts.onSaveTemplate) {
            await opts.onSaveTemplate();
            break;
          }
          if (isEditingAssembly && opts.onSaveAssembly) {
            await opts.onSaveAssembly();
            break;
          }
          // Normal project save
          const result = await saveProject();
          if (result.success) {
            showToast('Project saved', 'success');
          } else if (result.error) {
            showToast(result.error, 'error');
          }
          break;
        }

        case 'save-project-as': {
          // "Save As" doesn't apply to template or assembly editing
          if (opts.isEditingTemplate) {
            showToast('Use "Save Template" to save template changes', 'info');
            break;
          }
          if (isEditingAssembly) {
            showToast('Use "Save Assembly" to save assembly changes', 'info');
            break;
          }
          const result = await saveProjectAs();
          if (result.success) {
            showToast('Project saved', 'success');
          } else if (result.error) {
            showToast(result.error, 'error');
          }
          break;
        }

        // Edit commands
        case 'undo':
          useProjectStore.getState().undo();
          break;

        case 'redo':
          useProjectStore.getState().redo();
          break;

        case 'delete': {
          const selectedPartIds = useSelectionStore.getState().selectedPartIds;
          if (selectedPartIds.length > 0) {
            useUIStore.getState().requestDeleteParts(selectedPartIds);
          }
          break;
        }

        case 'select-all':
          useProjectStore.getState().selectAllParts();
          break;

        // View commands
        case 'reset-camera':
          useProjectStore.getState().resetCamera();
          break;

        // App commands
        case 'open-settings':
          opts.onOpenSettings?.();
          break;

        case 'show-shortcuts':
          opts.onShowShortcuts?.();
          break;

        case 'show-about':
          opts.onShowAbout?.();
          break;

        case 'close-project': {
          opts.onCloseProject?.();
          break;
        }

        case 'add-to-favorites': {
          if (filePath) {
            try {
              await window.electronAPI.addFavoriteProject(filePath);
              showToast('Added to favorites', 'success');
            } catch (error) {
              logger.error('Failed to add to favorites:', error);
              showToast('Failed to add to favorites', 'error');
            }
          } else {
            showToast('Save project first to add to favorites', 'warning');
          }
          break;
        }

        default:
          logger.warn('Unknown menu command:', command);
      }
    };

    // Listen for menu commands from main process — registered once
    const cleanup = window.electronAPI.onMenuCommand(handleMenuCommand);

    // Clean up the listener when component unmounts
    return cleanup;
  }, []);
}
