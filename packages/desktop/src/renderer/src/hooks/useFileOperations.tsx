/**
 * Hook for file operations - handles keyboard shortcuts, unsaved changes dialog,
 * file recovery, and window title synchronization
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useProjectStore } from '../store/projectStore';
import { usePartCutsEditingStore } from '../store/partCutsEditingStore';
import { useUIStore } from '../store/uiStore';
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
import { analytics } from '../utils/analytics';

interface UseFileOperationsOptions {
  // Template editing mode
  isEditingTemplate?: boolean;
  onSaveTemplate?: () => Promise<void>;
  // Assembly editing mode
  isEditingAssembly?: boolean;
  onSaveAssembly?: () => Promise<void>;
  isEditingPartCuts?: boolean;
  onSavePartCuts?: () => boolean;
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
  handleReload: (ignoreCache: boolean) => Promise<void>;
  isFileActionBusy: () => boolean;
  // Recent projects
  recentProjects: string[];
  refreshRecentProjects: () => Promise<void>;
}

type PendingAction = {
  type: UnsavedChangesAction;
  execute: () => Promise<void>;
} | null;

function flushFocusedInput(): void {
  flushSync(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
}

function hasUnsavedCutChanges(): boolean {
  const cuts = usePartCutsEditingStore.getState();
  const sourceFeatures = useProjectStore.getState().parts.find((part) => part.id === cuts.sourcePartId)?.features;
  return cuts.isEditingPartCuts && cuts.hasUnsavedDraftChanges(sourceFeatures);
}

export function useFileOperations(options: UseFileOperationsOptions = {}): UseFileOperationsResult {
  const {
    isEditingTemplate = false,
    onSaveTemplate,
    isEditingAssembly = false,
    onSaveAssembly,
    isEditingPartCuts = false,
    onSavePartCuts,
    onGoHome
  } = options;
  const isDirty = useProjectStore((s) => s.isDirty);
  const projectName = useProjectStore((s) => s.projectName);
  const filePath = useProjectStore((s) => s.filePath);
  const showToast = useUIStore((s) => s.showToast);

  // Dialog state
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [dialogSaveError, setDialogSaveError] = useState<string | null>(null);
  const [isDialogSaving, setIsDialogSaving] = useState(false);
  const dialogSavingRef = useRef(false);
  const [recentProjects, setRecentProjects] = useState<string[]>([]);

  const blockPartCutsReplacement = useCallback(() => {
    if (dialogSavingRef.current) return true;
    if (!isEditingPartCuts && !usePartCutsEditingStore.getState().isEditingPartCuts) return false;
    showToast('Save or discard part cuts before changing projects.', 'warning');
    return true;
  }, [isEditingPartCuts, showToast]);

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
        showToast('Project recovered successfully', 'success');
        refreshRecentProjects();
      } else if (result.error) {
        showToast(`Error loading recovered project: ${result.error}`, 'error');
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
      if (blockPartCutsReplacement()) return;
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
          refreshRecentProjects();
        } else if (openResult.error) {
          showToast(`Error: ${openResult.error}`, 'error');
        }
      } catch (error) {
        showToast(`Error relocating file: ${error}`, 'error');
      }
    },
    [showToast, refreshRecentProjects, handleFileOperationResult, blockPartCutsReplacement]
  );

  // Update window title when relevant state changes
  useEffect(() => {
    updateWindowTitle();
  }, [isDirty, projectName, filePath]);

  // Handle open-project events from main process (file association)
  useEffect(() => {
    const handleOpenProjectEvent = async (openFilePath: string) => {
      if (blockPartCutsReplacement()) return;
      if (hasUnsavedChanges()) {
        setPendingAction({
          type: 'open',
          execute: async () => {
            const result = await openProjectFromPath(openFilePath);
            if (handleFileOperationResult(result)) {
              return; // Recovery modal will be shown
            }
            if (result.success) {
              refreshRecentProjects();
            } else if (result.error) {
              showToast(`Error: ${result.error}`, 'error');
            }
          }
        });
      } else {
        const result = await openProjectFromPath(openFilePath);
        if (handleFileOperationResult(result)) {
          return; // Recovery modal will be shown
        }
        if (result.success) {
          refreshRecentProjects();
        } else if (result.error) {
          showToast(`Error: ${result.error}`, 'error');
        }
      }
    };

    return window.electronAPI.onOpenProject(handleOpenProjectEvent);
  }, [showToast, refreshRecentProjects, handleFileOperationResult, blockPartCutsReplacement]);

  // Handle window close event from main process
  useEffect(() => {
    const cleanup = window.electronAPI.onBeforeClose(() => {
      if (dialogSavingRef.current) return;
      setDialogSaveError(null);
      // Fraction inputs commit on blur. Read the live session after that commit,
      // not only the project snapshot (Save Cut has not updated the project yet).
      flushFocusedInput();
      if (hasUnsavedChanges() || hasUnsavedCutChanges()) {
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
  const createMenuProject = useCallback(async () => {
    const result = await newProject();
    if (result?.success) {
      analytics.capture('project_created', { source: 'menu', units: useProjectStore.getState().units });
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (dialogSavingRef.current || pendingAction) return;
    if (isEditingPartCuts && onSavePartCuts && !onSavePartCuts()) return;
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
      showToast('Project saved', 'success');
      refreshRecentProjects();
    } else if (result.error) {
      showToast(`Error saving: ${result.error}`, 'error');
    }
    // If canceled, do nothing
  }, [
    showToast,
    refreshRecentProjects,
    isEditingTemplate,
    onSaveTemplate,
    isEditingAssembly,
    onSaveAssembly,
    isEditingPartCuts,
    onSavePartCuts,
    pendingAction
  ]);

  const handleSaveAs = useCallback(async () => {
    if (dialogSavingRef.current || pendingAction) return;
    if (isEditingPartCuts && onSavePartCuts && !onSavePartCuts()) return;
    // "Save As" doesn't apply to template or assembly editing
    if (isEditingTemplate) {
      showToast('Use "Save Template" to save template changes', 'info');
      return;
    }
    if (isEditingAssembly) {
      showToast('Use "Save Assembly" to save assembly changes', 'info');
      return;
    }

    const result = await saveProjectAs();
    if (result.success) {
      showToast('Project saved', 'success');
      refreshRecentProjects();
    } else if (result.error) {
      showToast(`Error saving: ${result.error}`, 'error');
    }
    // If canceled, do nothing
  }, [
    showToast,
    refreshRecentProjects,
    isEditingTemplate,
    isEditingAssembly,
    isEditingPartCuts,
    onSavePartCuts,
    pendingAction
  ]);

  const handleNew = useCallback(async () => {
    if (blockPartCutsReplacement()) return;
    // Block when editing template or assembly
    if (isEditingTemplate) {
      showToast('Finish editing template first', 'warning');
      return;
    }
    if (isEditingAssembly) {
      showToast('Finish editing assembly first', 'warning');
      return;
    }

    if (hasUnsavedChanges()) {
      setPendingAction({
        type: 'new',
        execute: async () => {
          await createMenuProject();
        }
      });
    } else {
      await createMenuProject();
    }
  }, [showToast, isEditingTemplate, isEditingAssembly, createMenuProject, blockPartCutsReplacement]);

  const handleOpen = useCallback(async () => {
    if (blockPartCutsReplacement()) return;
    // Block when editing template or assembly
    if (isEditingTemplate) {
      showToast('Finish editing template first', 'warning');
      return;
    }
    if (isEditingAssembly) {
      showToast('Finish editing assembly first', 'warning');
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
            refreshRecentProjects();
          } else if (result.error) {
            showToast(`Error: ${result.error}`, 'error');
          }
        }
      });
    } else {
      const result = await openProject();
      if (handleFileOperationResult(result)) {
        return; // Recovery modal will be shown
      }
      if (result.success) {
        refreshRecentProjects();
      } else if (result.error) {
        showToast(`Error: ${result.error}`, 'error');
      }
    }
  }, [
    showToast,
    refreshRecentProjects,
    isEditingTemplate,
    isEditingAssembly,
    handleFileOperationResult,
    blockPartCutsReplacement
  ]);

  const handleOpenRecent = useCallback(
    async (openFilePath: string) => {
      if (blockPartCutsReplacement()) return;
      // Block when editing template or assembly
      if (isEditingTemplate) {
        showToast('Finish editing template first', 'warning');
        return;
      }
      if (isEditingAssembly) {
        showToast('Finish editing assembly first', 'warning');
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
              refreshRecentProjects();
            } else if (result.error) {
              showToast(`Error: ${result.error}`, 'error');
            }
          }
        });
      } else {
        const result = await openProjectFromPath(openFilePath);
        if (handleFileOperationResult(result)) {
          return; // Recovery modal will be shown
        }
        if (result.success) {
          refreshRecentProjects();
        } else if (result.error) {
          showToast(`Error: ${result.error}`, 'error');
        }
      }
    },
    [
      showToast,
      refreshRecentProjects,
      isEditingTemplate,
      isEditingAssembly,
      handleFileOperationResult,
      blockPartCutsReplacement
    ]
  );

  const handleGoHome = useCallback(async () => {
    if (blockPartCutsReplacement()) return;
    // Block when editing template or assembly
    if (isEditingTemplate) {
      showToast('Finish editing template first', 'warning');
      return;
    }
    if (isEditingAssembly) {
      showToast('Finish editing assembly first', 'warning');
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
  }, [showToast, isEditingTemplate, isEditingAssembly, onGoHome, blockPartCutsReplacement]);

  // Dialog handlers
  const handleReload = useCallback(
    async (ignoreCache: boolean) => {
      if (dialogSavingRef.current) return;
      if (isEditingTemplate || isEditingAssembly) {
        showToast(`Save or discard the ${isEditingTemplate ? 'template' : 'assembly'} before reloading.`, 'warning');
        return;
      }
      flushFocusedInput();
      const execute = async () => {
        await window.electronAPI.reloadWindow(ignoreCache);
      };
      if (hasUnsavedChanges() || hasUnsavedCutChanges()) {
        setDialogSaveError(null);
        setPendingAction({ type: 'reload', execute });
      } else await execute();
    },
    [isEditingTemplate, isEditingAssembly, showToast]
  );

  const handleDialogSave = useCallback(async () => {
    const pending = pendingAction;
    if (!pending || dialogSavingRef.current) return;
    dialogSavingRef.current = true;
    setIsDialogSaving(true);
    const isCloseAction = pending?.type === 'close';
    try {
      // A rejected inspector edit must leave both the editor and pending close
      // intact; the user can cancel the dialog to correct the specific error.
      const previousToast = useUIStore.getState().toast;
      if (isEditingPartCuts && onSavePartCuts && !onSavePartCuts()) {
        const saveToast = useUIStore.getState().toast;
        // The save callback reports the exact validation failure through the UI
        // store. Repeat it inside the modal, since outside toasts are aria-hidden.
        setDialogSaveError(
          saveToast && saveToast !== previousToast
            ? saveToast.message
            : 'Cannot save this cut. Cancel and correct the highlighted operation.'
        );
        return;
      }
      setDialogSaveError(null);
      const result = await saveProject();
      if (result.success) {
        if (result.pendingChanges || useProjectStore.getState().isDirty || hasUnsavedCutChanges()) {
          setDialogSaveError('New changes were made while saving. Save again to include them.');
          return;
        }
        await pending.execute();
        setPendingAction(null);
      } else if (result.error) {
        showToast(`Error saving: ${result.error}`, 'error');
        setDialogSaveError(`Error saving: ${result.error}`);
        // If save failed during close, cancel the close
        if (isCloseAction) {
          await window.electronAPI.cancelClose();
        }
      } else if (result.canceled) {
        setPendingAction(null);
        // User canceled save dialog during close - cancel the close
        if (isCloseAction) await window.electronAPI.cancelClose();
      }
    } catch (error) {
      setDialogSaveError(`Error saving: ${String(error)}`);
      if (isCloseAction) await window.electronAPI.cancelClose();
    } finally {
      dialogSavingRef.current = false;
      setIsDialogSaving(false);
    }
  }, [pendingAction, showToast, isEditingPartCuts, onSavePartCuts]);

  const handleDialogDiscard = useCallback(async () => {
    if (dialogSavingRef.current) return;
    setDialogSaveError(null);
    const pending = pendingAction;
    setPendingAction(null);
    if (pending) {
      await pending.execute();
    }
  }, [pendingAction]);

  const handleDialogCancel = useCallback(async () => {
    if (dialogSavingRef.current) return;
    setDialogSaveError(null);
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
      if (
        (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) &&
        !(isEditingPartCuts && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's')
      ) {
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
  }, [handleSave, handleSaveAs, handleOpen, handleNew, isEditingPartCuts]);

  // Dialog component
  const UnsavedChangesDialogComponent = useCallback(
    () => (
      <UnsavedChangesDialog
        isOpen={pendingAction !== null}
        action={pendingAction?.type || 'custom'}
        saveError={dialogSaveError}
        isSaving={isDialogSaving}
        onSave={handleDialogSave}
        onDiscard={handleDialogDiscard}
        onCancel={handleDialogCancel}
      />
    ),
    [pendingAction, dialogSaveError, isDialogSaving, handleDialogSave, handleDialogDiscard, handleDialogCancel]
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
    handleReload,
    isFileActionBusy: () => dialogSavingRef.current,
    recentProjects,
    refreshRecentProjects
  };
}
