/**
 * Hook for file operations - handles keyboard shortcuts, unsaved changes dialog,
 * file recovery, and window title synchronization
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
  getRecentProjects,
  attemptFileRepair,
  loadRepairedFile,
  FileOperationResult
} from '../utils/fileOperations';
import { FileRepairResult, getProjectNameFromPath } from '../utils/fileFormat';
import { UnsavedChangesDialog, UnsavedChangesAction } from '../components/project/UnsavedChangesDialog';
import { FileRecoveryModal } from '../components/project/FileRecoveryModal';

interface UseFileOperationsOptions {
  // Template editing mode
  isEditingTemplate?: boolean;
  onSaveTemplate?: () => Promise<void>;
  // Assembly editing mode
  isEditingAssembly?: boolean;
  onSaveAssembly?: () => Promise<void>;
  // Callback when returning to start screen
  onGoHome?: () => void;
}

interface UseFileOperationsResult {
  // Dialog components to render
  UnsavedChangesDialogComponent: React.FC;
  FileRecoveryModalComponent: React.FC;
  // Actions
  handleNew: () => Promise<void>;
  handleOpen: () => Promise<void>;
  handleOpenRecent: (filePath: string) => Promise<void>;
  handleRelocateFile: (originalPath: string, fileName: string) => Promise<void>;
  handleSave: () => Promise<void>;
  handleSaveAs: () => Promise<void>;
  handleGoHome: () => Promise<void>;
  // Recent projects
  recentProjects: string[];
  refreshRecentProjects: () => Promise<void>;
}

type PendingAction = {
  type: UnsavedChangesAction;
  execute: () => Promise<void>;
} | null;

export function useFileOperations(options: UseFileOperationsOptions = {}): UseFileOperationsResult {
  const { isEditingTemplate = false, onSaveTemplate, isEditingAssembly = false, onSaveAssembly, onGoHome } = options;
  const isDirty = useProjectStore((s) => s.isDirty);
  const projectName = useProjectStore((s) => s.projectName);
  const filePath = useProjectStore((s) => s.filePath);
  const showToast = useProjectStore((s) => s.showToast);

  // Dialog state
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [recentProjects, setRecentProjects] = useState<string[]>([]);

  // File recovery state
  const [recoveryState, setRecoveryState] = useState<{
    isOpen: boolean;
    fileName: string;
    filePath: string;
    errors: string[];
    rawContent: string;
    repairResult: FileRepairResult | null;
    isRepairing: boolean;
  }>({
    isOpen: false,
    fileName: '',
    filePath: '',
    errors: [],
    rawContent: '',
    repairResult: null,
    isRepairing: false
  });

  // Refresh recent projects list
  const refreshRecentProjects = useCallback(async () => {
    const projects = await getRecentProjects();
    setRecentProjects(projects);
  }, []);

  // Load recent projects on mount
  useEffect(() => {
    refreshRecentProjects();
  }, [refreshRecentProjects]);

  // Helper to handle file operation results (checks for recovery needs)
  const handleFileOperationResult = useCallback((result: FileOperationResult) => {
    if (result.needsRecovery && result.validationErrors && result.rawContent && result.filePath) {
      // Show file recovery modal
      setRecoveryState({
        isOpen: true,
        fileName: getProjectNameFromPath(result.filePath),
        filePath: result.filePath,
        errors: result.validationErrors,
        rawContent: result.rawContent,
        repairResult: null,
        isRepairing: false
      });
      return true; // Indicates recovery is needed
    }
    return false; // No recovery needed
  }, []);

  // File recovery handlers
  const handleAttemptRepair = useCallback(() => {
    setRecoveryState((prev) => ({ ...prev, isRepairing: true }));

    // Run repair asynchronously to allow UI to update
    setTimeout(() => {
      const result = attemptFileRepair(recoveryState.rawContent);
      setRecoveryState((prev) => ({
        ...prev,
        repairResult: result,
        isRepairing: false
      }));
    }, 100);
  }, [recoveryState.rawContent]);

  const handleAcceptRepair = useCallback(async () => {
    if (recoveryState.repairResult?.success && recoveryState.repairResult.repairedData) {
      const result = await loadRepairedFile(recoveryState.repairResult.repairedData, recoveryState.filePath);

      if (result.success) {
        showToast('Project recovered successfully');
        refreshRecentProjects();
      } else if (result.error) {
        showToast(`Error loading recovered project: ${result.error}`);
      }
    }

    // Close the modal
    setRecoveryState({
      isOpen: false,
      fileName: '',
      filePath: '',
      errors: [],
      rawContent: '',
      repairResult: null,
      isRepairing: false
    });
  }, [recoveryState, showToast, refreshRecentProjects]);

  const handleRejectRecovery = useCallback(() => {
    setRecoveryState({
      isOpen: false,
      fileName: '',
      filePath: '',
      errors: [],
      rawContent: '',
      repairResult: null,
      isRepairing: false
    });
  }, []);

  // Handle relocating a missing file
  const handleRelocateFile = useCallback(
    async (originalPath: string, fileName: string) => {
      try {
        const result = await window.electronAPI.showOpenDialog({
          title: `Locate "${fileName}"`,
          filters: [{ name: 'Carvd Projects', extensions: ['carvd'] }],
          properties: ['openFile'],
          message: `The file "${fileName}" could not be found at its original location. Please locate it.`
        });

        if (result.canceled || result.filePaths.length === 0) {
          return; // User canceled
        }

        const newPath = result.filePaths[0];

        // Update the recent projects list to use the new path
        await window.electronAPI.updateRecentProjectPath(originalPath, newPath);

        // Open the file from the new location
        const openResult = await openProjectFromPath(newPath);

        if (handleFileOperationResult(openResult)) {
          return; // Recovery modal will be shown
        }

        if (openResult.success) {
          showToast('Project opened');
          refreshRecentProjects();
        } else if (openResult.error) {
          showToast(`Error: ${openResult.error}`);
        }
      } catch (error) {
        showToast(`Error relocating file: ${error}`);
      }
    },
    [showToast, refreshRecentProjects, handleFileOperationResult]
  );

  // Update window title when relevant state changes
  useEffect(() => {
    updateWindowTitle();
  }, [isDirty, projectName, filePath]);

  // Handle open-project events from main process (file association)
  useEffect(() => {
    const handleOpenProjectEvent = async (openFilePath: string) => {
      if (hasUnsavedChanges()) {
        setPendingAction({
          type: 'open',
          execute: async () => {
            const result = await openProjectFromPath(openFilePath);
            if (handleFileOperationResult(result)) {
              return; // Recovery modal will be shown
            }
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
        if (handleFileOperationResult(result)) {
          return; // Recovery modal will be shown
        }
        if (result.success) {
          showToast('Project opened');
          refreshRecentProjects();
        } else if (result.error) {
          showToast(`Error: ${result.error}`);
        }
      }
    };

    window.electronAPI.onOpenProject(handleOpenProjectEvent);
  }, [showToast, refreshRecentProjects, handleFileOperationResult]);

  // Handle window close event from main process
  useEffect(() => {
    const cleanup = window.electronAPI.onBeforeClose(() => {
      if (hasUnsavedChanges()) {
        // Show the unsaved changes dialog
        setPendingAction({
          type: 'close',
          execute: async () => {
            // This executes after user chooses "Don't Save"
            await window.electronAPI.confirmClose();
          }
        });
      } else {
        // No unsaved changes, proceed with close
        window.electronAPI.confirmClose();
      }
    });

    return cleanup;
  }, []);

  // File operation handlers
  const handleSave = useCallback(async () => {
    // Check if we're in template or assembly editing mode
    if (isEditingTemplate && onSaveTemplate) {
      await onSaveTemplate();
      return;
    }
    if (isEditingAssembly && onSaveAssembly) {
      await onSaveAssembly();
      return;
    }

    // Normal project save
    const result = await saveProject();
    if (result.success) {
      showToast('Project saved');
      refreshRecentProjects();
    } else if (result.error) {
      showToast(`Error saving: ${result.error}`);
    }
    // If canceled, do nothing
  }, [showToast, refreshRecentProjects, isEditingTemplate, onSaveTemplate, isEditingAssembly, onSaveAssembly]);

  const handleSaveAs = useCallback(async () => {
    // "Save As" doesn't apply to template or assembly editing
    if (isEditingTemplate) {
      showToast('Use "Save Template" to save template changes');
      return;
    }
    if (isEditingAssembly) {
      showToast('Use "Save Assembly" to save assembly changes');
      return;
    }

    const result = await saveProjectAs();
    if (result.success) {
      showToast('Project saved');
      refreshRecentProjects();
    } else if (result.error) {
      showToast(`Error saving: ${result.error}`);
    }
    // If canceled, do nothing
  }, [showToast, refreshRecentProjects, isEditingTemplate, isEditingAssembly]);

  const handleNew = useCallback(async () => {
    // Block when editing template or assembly
    if (isEditingTemplate) {
      showToast('Finish editing template first');
      return;
    }
    if (isEditingAssembly) {
      showToast('Finish editing assembly first');
      return;
    }

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
  }, [showToast, isEditingTemplate, isEditingAssembly]);

  const handleOpen = useCallback(async () => {
    // Block when editing template or assembly
    if (isEditingTemplate) {
      showToast('Finish editing template first');
      return;
    }
    if (isEditingAssembly) {
      showToast('Finish editing assembly first');
      return;
    }

    if (hasUnsavedChanges()) {
      setPendingAction({
        type: 'open',
        execute: async () => {
          const result = await openProject();
          if (handleFileOperationResult(result)) {
            return; // Recovery modal will be shown
          }
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
      if (handleFileOperationResult(result)) {
        return; // Recovery modal will be shown
      }
      if (result.success) {
        showToast('Project opened');
        refreshRecentProjects();
      } else if (result.error) {
        showToast(`Error: ${result.error}`);
      }
    }
  }, [showToast, refreshRecentProjects, isEditingTemplate, isEditingAssembly, handleFileOperationResult]);

  const handleOpenRecent = useCallback(
    async (openFilePath: string) => {
      // Block when editing template or assembly
      if (isEditingTemplate) {
        showToast('Finish editing template first');
        return;
      }
      if (isEditingAssembly) {
        showToast('Finish editing assembly first');
        return;
      }

      if (hasUnsavedChanges()) {
        setPendingAction({
          type: 'open',
          execute: async () => {
            const result = await openProjectFromPath(openFilePath);
            if (handleFileOperationResult(result)) {
              return; // Recovery modal will be shown
            }
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
        if (handleFileOperationResult(result)) {
          return; // Recovery modal will be shown
        }
        if (result.success) {
          showToast('Project opened');
          refreshRecentProjects();
        } else if (result.error) {
          showToast(`Error: ${result.error}`);
        }
      }
    },
    [showToast, refreshRecentProjects, isEditingTemplate, isEditingAssembly, handleFileOperationResult]
  );

  const handleGoHome = useCallback(async () => {
    // Block when editing template or assembly
    if (isEditingTemplate) {
      showToast('Finish editing template first');
      return;
    }
    if (isEditingAssembly) {
      showToast('Finish editing assembly first');
      return;
    }

    if (hasUnsavedChanges()) {
      setPendingAction({
        type: 'home',
        execute: async () => {
          onGoHome?.();
        }
      });
    } else {
      onGoHome?.();
    }
  }, [showToast, isEditingTemplate, isEditingAssembly, onGoHome]);

  // Dialog handlers
  const handleDialogSave = useCallback(async () => {
    const pending = pendingAction;
    const isCloseAction = pending?.type === 'close';
    setPendingAction(null);

    const result = await saveProject();
    if (result.success && pending) {
      await pending.execute();
    } else if (result.error) {
      showToast(`Error saving: ${result.error}`);
      // If save failed during close, cancel the close
      if (isCloseAction) {
        await window.electronAPI.cancelClose();
      }
    } else if (result.canceled && isCloseAction) {
      // User canceled save dialog during close - cancel the close
      await window.electronAPI.cancelClose();
    }
  }, [pendingAction, showToast]);

  const handleDialogDiscard = useCallback(async () => {
    const pending = pendingAction;
    setPendingAction(null);
    if (pending) {
      await pending.execute();
    }
  }, [pendingAction]);

  const handleDialogCancel = useCallback(async () => {
    const isCloseAction = pendingAction?.type === 'close';
    setPendingAction(null);
    // If this was a close action, notify main process that close was canceled
    if (isCloseAction) {
      await window.electronAPI.cancelClose();
    }
  }, [pendingAction]);

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

  // File recovery modal component
  const FileRecoveryModalComponent = useCallback(
    () => (
      <FileRecoveryModal
        isOpen={recoveryState.isOpen}
        fileName={recoveryState.fileName}
        errors={recoveryState.errors}
        repairResult={recoveryState.repairResult}
        onAttemptRepair={handleAttemptRepair}
        onAcceptRepair={handleAcceptRepair}
        onReject={handleRejectRecovery}
        isRepairing={recoveryState.isRepairing}
      />
    ),
    [recoveryState, handleAttemptRepair, handleAcceptRepair, handleRejectRecovery]
  );

  return {
    UnsavedChangesDialogComponent,
    FileRecoveryModalComponent,
    handleNew,
    handleOpen,
    handleOpenRecent,
    handleRelocateFile,
    handleSave,
    handleSaveAs,
    handleGoHome,
    recentProjects,
    refreshRecentProjects
  };
}
