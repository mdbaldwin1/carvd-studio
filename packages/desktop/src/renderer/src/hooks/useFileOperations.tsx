/**
 * Hook for file operations - handles keyboard shortcuts, unsaved changes dialog,
 * and window title synchronization
 */

import { useCallback, useEffect, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import {
  saveProject,
  saveProjectAs,
  openProject,
  openProjectFromPath,
  newProject,
  hasUnsavedChanges,
  updateWindowTitle,
  getRecentProjects
} from '../utils/fileOperations';
import { UnsavedChangesDialog, UnsavedChangesAction } from '../components/UnsavedChangesDialog';

interface UseFileOperationsResult {
  // Dialog component to render
  UnsavedChangesDialogComponent: React.FC;
  // Actions
  handleNew: () => Promise<void>;
  handleOpen: () => Promise<void>;
  handleSave: () => Promise<void>;
  handleSaveAs: () => Promise<void>;
  // Recent projects
  recentProjects: string[];
  refreshRecentProjects: () => Promise<void>;
}

type PendingAction = {
  type: UnsavedChangesAction;
  execute: () => Promise<void>;
} | null;

export function useFileOperations(): UseFileOperationsResult {
  const isDirty = useProjectStore((s) => s.isDirty);
  const projectName = useProjectStore((s) => s.projectName);
  const filePath = useProjectStore((s) => s.filePath);
  const showToast = useProjectStore((s) => s.showToast);

  // Dialog state
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [recentProjects, setRecentProjects] = useState<string[]>([]);

  // Refresh recent projects list
  const refreshRecentProjects = useCallback(async () => {
    const projects = await getRecentProjects();
    setRecentProjects(projects);
  }, []);

  // Load recent projects on mount
  useEffect(() => {
    refreshRecentProjects();
  }, [refreshRecentProjects]);

  // Update window title when relevant state changes
  useEffect(() => {
    updateWindowTitle();
  }, [isDirty, projectName, filePath]);

  // Handle open-project events from main process (file association)
  useEffect(() => {
    const handleOpenProject = async (openFilePath: string) => {
      if (hasUnsavedChanges()) {
        setPendingAction({
          type: 'open',
          execute: async () => {
            const result = await openProjectFromPath(openFilePath);
            if (result.success) {
              showToast('Project opened');
              refreshRecentProjects();
            } else if (result.error) {
              showToast(`Error: ${result.error}`);
            }
          }
        });
      } else {
        const result = await openProjectFromPath(openFilePath);
        if (result.success) {
          showToast('Project opened');
          refreshRecentProjects();
        } else if (result.error) {
          showToast(`Error: ${result.error}`);
        }
      }
    };

    window.electronAPI.onOpenProject(handleOpenProject);
  }, [showToast, refreshRecentProjects]);

  // File operation handlers
  const handleSave = useCallback(async () => {
    const result = await saveProject();
    if (result.success) {
      showToast('Project saved');
      refreshRecentProjects();
    } else if (result.error) {
      showToast(`Error saving: ${result.error}`);
    }
    // If canceled, do nothing
  }, [showToast, refreshRecentProjects]);

  const handleSaveAs = useCallback(async () => {
    const result = await saveProjectAs();
    if (result.success) {
      showToast('Project saved');
      refreshRecentProjects();
    } else if (result.error) {
      showToast(`Error saving: ${result.error}`);
    }
    // If canceled, do nothing
  }, [showToast, refreshRecentProjects]);

  const handleNew = useCallback(async () => {
    if (hasUnsavedChanges()) {
      setPendingAction({
        type: 'new',
        execute: async () => {
          await newProject();
          showToast('New project created');
        }
      });
    } else {
      await newProject();
      showToast('New project created');
    }
  }, [showToast]);

  const handleOpen = useCallback(async () => {
    if (hasUnsavedChanges()) {
      setPendingAction({
        type: 'open',
        execute: async () => {
          const result = await openProject();
          if (result.success) {
            showToast('Project opened');
            refreshRecentProjects();
          } else if (result.error) {
            showToast(`Error: ${result.error}`);
          }
        }
      });
    } else {
      const result = await openProject();
      if (result.success) {
        showToast('Project opened');
        refreshRecentProjects();
      } else if (result.error) {
        showToast(`Error: ${result.error}`);
      }
    }
  }, [showToast, refreshRecentProjects]);

  // Dialog handlers
  const handleDialogSave = useCallback(async () => {
    const pending = pendingAction;
    setPendingAction(null);

    const result = await saveProject();
    if (result.success && pending) {
      await pending.execute();
    } else if (result.error) {
      showToast(`Error saving: ${result.error}`);
    }
    // If save was canceled, don't proceed with pending action
  }, [pendingAction, showToast]);

  const handleDialogDiscard = useCallback(async () => {
    const pending = pendingAction;
    setPendingAction(null);
    if (pending) {
      await pending.execute();
    }
  }, [pendingAction]);

  const handleDialogCancel = useCallback(() => {
    setPendingAction(null);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;

      if (isMod) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            if (e.shiftKey) {
              handleSaveAs();
            } else {
              handleSave();
            }
            break;

          case 'o':
            e.preventDefault();
            handleOpen();
            break;

          case 'n':
            e.preventDefault();
            handleNew();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleSaveAs, handleOpen, handleNew]);

  // Dialog component
  const UnsavedChangesDialogComponent = useCallback(
    () => (
      <UnsavedChangesDialog
        isOpen={pendingAction !== null}
        action={pendingAction?.type || 'custom'}
        onSave={handleDialogSave}
        onDiscard={handleDialogDiscard}
        onCancel={handleDialogCancel}
      />
    ),
    [pendingAction, handleDialogSave, handleDialogDiscard, handleDialogCancel]
  );

  return {
    UnsavedChangesDialogComponent,
    handleNew,
    handleOpen,
    handleSave,
    handleSaveAs,
    recentProjects,
    refreshRecentProjects
  };
}
