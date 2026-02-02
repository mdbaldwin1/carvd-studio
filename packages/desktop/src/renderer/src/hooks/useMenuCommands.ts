/**
 * Hook to handle native menu commands from the main process
 */

import { useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';
import {
  newProject,
  saveProject,
  saveProjectAs,
  openProject,
  openProjectFromPath,
  clearRecentProjects,
  hasUnsavedChanges
} from '../utils/fileOperations';

interface UseMenuCommandsOptions {
  onOpenSettings?: () => void;
  onShowShortcuts?: () => void;
}

export function useMenuCommands(options: UseMenuCommandsOptions = {}) {
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const requestDeleteParts = useProjectStore((s) => s.requestDeleteParts);
  const selectAllParts = useProjectStore((s) => s.selectAllParts);
  const selectedPartIds = useProjectStore((s) => s.selectedPartIds);
  const resetCamera = useProjectStore((s) => s.resetCamera);
  const showToast = useProjectStore((s) => s.showToast);
  const isEditingAssembly = useProjectStore((s) => s.isEditingAssembly);

  useEffect(() => {
    const handleMenuCommand = async (command: string, ...args: unknown[]) => {
      // Block file operations when editing an assembly
      const fileCommands = ['new-project', 'open-project', 'open-recent', 'save-project', 'save-project-as'];
      if (isEditingAssembly && fileCommands.includes(command)) {
        showToast('Finish editing assembly first');
        return;
      }

      switch (command) {
        // File commands
        case 'new-project': {
          if (hasUnsavedChanges()) {
            // TODO: Show unsaved changes dialog
            // For now, just create new project
          }
          await newProject();
          break;
        }

        case 'open-project': {
          if (hasUnsavedChanges()) {
            // TODO: Show unsaved changes dialog
          }
          const result = await openProject();
          if (!result.success && result.error) {
            showToast(result.error);
          }
          break;
        }

        case 'open-recent': {
          const filePath = args[0] as string;
          if (filePath) {
            if (hasUnsavedChanges()) {
              // TODO: Show unsaved changes dialog
            }
            const result = await openProjectFromPath(filePath);
            if (!result.success && result.error) {
              showToast(result.error);
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
          const result = await saveProject();
          if (result.success) {
            showToast('Project saved');
          } else if (result.error) {
            showToast(result.error);
          }
          break;
        }

        case 'save-project-as': {
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

        default:
          console.log('Unknown menu command:', command);
      }
    };

    // Listen for menu commands from main process
    const cleanup = window.electronAPI.onMenuCommand(handleMenuCommand);

    // Clean up the listener when dependencies change or component unmounts
    return cleanup;
  }, [undo, redo, requestDeleteParts, selectAllParts, selectedPartIds, resetCamera, showToast, isEditingAssembly, options]);
}
