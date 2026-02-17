/**
 * Auto-recovery hook - automatically saves project to a recovery file
 * to prevent data loss in case of crashes
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { useCameraStore } from '../store/cameraStore';
import { serializeProject, parseCarvdFile, deserializeToProject } from '../utils/fileFormat';
import { logger } from '../utils/logger';

// Auto-save interval in milliseconds (2 minutes)
const AUTO_SAVE_INTERVAL = 2 * 60 * 1000;

// Recovery file name (uses a session ID to allow multiple windows)
function getRecoveryFileName(): string {
  // Use a consistent session ID stored in sessionStorage
  let sessionId = sessionStorage.getItem('carvd-session-id');
  if (!sessionId) {
    sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2);
    sessionStorage.setItem('carvd-session-id', sessionId);
  }
  return `${sessionId}.carvd-recovery`;
}

interface RecoveryInfo {
  projectName: string;
  modifiedAt: string;
  fileName: string;
  originalFilePath: string | null; // The file path the project was loaded from
}

interface UseAutoRecoveryResult {
  // Recovery state
  hasRecovery: boolean;
  recoveryInfo: RecoveryInfo | null;
  // Actions
  restoreRecovery: () => Promise<boolean>;
  discardRecovery: () => Promise<void>;
  // Status
  lastAutoSave: Date | null;
}

export function useAutoRecovery(): UseAutoRecoveryResult {
  const isDirty = useProjectStore((s) => s.isDirty);
  const filePath = useProjectStore((s) => s.filePath);
  const projectName = useProjectStore((s) => s.projectName);
  const createdAt = useProjectStore((s) => s.createdAt);
  const modifiedAt = useProjectStore((s) => s.modifiedAt);
  const units = useProjectStore((s) => s.units);
  const gridSize = useProjectStore((s) => s.gridSize);
  const kerfWidth = useProjectStore((s) => s.kerfWidth);
  const overageFactor = useProjectStore((s) => s.overageFactor);
  const projectNotes = useProjectStore((s) => s.projectNotes);
  const stockConstraints = useProjectStore((s) => s.stockConstraints);
  const parts = useProjectStore((s) => s.parts);
  const stocks = useProjectStore((s) => s.stocks);
  const groups = useProjectStore((s) => s.groups);
  const groupMembers = useProjectStore((s) => s.groupMembers);
  const assemblies = useProjectStore((s) => s.assemblies);
  const snapGuides = useProjectStore((s) => s.snapGuides);
  const cameraState = useCameraStore((s) => s.cameraState);
  const customShoppingItems = useProjectStore((s) => s.customShoppingItems);
  const cutList = useProjectStore((s) => s.cutList);
  const loadProject = useProjectStore((s) => s.loadProject);
  const showToast = useUIStore((s) => s.showToast);

  const [hasRecovery, setHasRecovery] = useState(false);
  const [recoveryInfo, setRecoveryInfo] = useState<RecoveryInfo | null>(null);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);

  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recoveryFileName = useRef(getRecoveryFileName());

  // Save to recovery file
  const saveToRecovery = useCallback(async () => {
    if (!isDirty) return;

    try {
      const fileData = serializeProject({
        projectName,
        createdAt,
        modifiedAt,
        units,
        gridSize,
        kerfWidth,
        overageFactor,
        projectNotes,
        stockConstraints,
        parts,
        stocks,
        groups,
        groupMembers,
        assemblies,
        snapGuides,
        cameraState,
        customShoppingItems,
        cutList
      });

      // Wrap project data with recovery metadata (includes original file path)
      const recoveryData = {
        recovery: {
          filePath: filePath // Store the original file path so we can save back to it
        },
        projectData: fileData
      };

      const json = JSON.stringify(recoveryData);
      await window.electronAPI.saveRecoveryFile(recoveryFileName.current, json);
      setLastAutoSave(new Date());
      logger.info('[AutoRecovery] Saved recovery file');
    } catch (error) {
      logger.error('[AutoRecovery] Failed to save recovery file:', error);
    }
  }, [
    isDirty,
    filePath,
    projectName,
    createdAt,
    modifiedAt,
    units,
    gridSize,
    kerfWidth,
    overageFactor,
    projectNotes,
    stockConstraints,
    parts,
    stocks,
    groups,
    groupMembers,
    assemblies,
    snapGuides,
    cameraState,
    customShoppingItems,
    cutList
  ]);

  // Clear recovery file (called after successful save)
  const clearRecovery = useCallback(async () => {
    try {
      await window.electronAPI.deleteRecoveryFile(recoveryFileName.current);
      logger.info('[AutoRecovery] Cleared recovery file');
    } catch (error) {
      logger.error('[AutoRecovery] Failed to clear recovery file:', error);
    }
  }, []);

  // Check for existing recovery files on mount
  useEffect(() => {
    const checkForRecovery = async () => {
      try {
        const files = await window.electronAPI.listRecoveryFiles();

        // Check for any recovery files (could be from previous sessions that crashed)
        if (files.length > 0) {
          // Read the first recovery file to get info
          const content = await window.electronAPI.readRecoveryFile(files[0]);
          if (content) {
            // Try parsing as new wrapper format first
            let parsed: { recovery?: { filePath: string | null }; projectData?: unknown } | null = null;
            let projectData: unknown = null;
            let originalFilePath: string | null = null;

            try {
              parsed = JSON.parse(content);
              if (parsed && 'recovery' in parsed && 'projectData' in parsed) {
                // New format with wrapper
                projectData = parsed.projectData;
                originalFilePath = parsed.recovery?.filePath ?? null;
              } else {
                // Old format - content is the project data directly
                projectData = parsed;
              }
            } catch {
              // If JSON parse fails, it's not valid
              return;
            }

            const validation = parseCarvdFile(JSON.stringify(projectData));
            if (validation.valid && validation.data) {
              setHasRecovery(true);
              setRecoveryInfo({
                projectName: validation.data.project.name,
                modifiedAt: validation.data.project.modifiedAt,
                fileName: files[0],
                originalFilePath
              });
            }
          }
        }
      } catch (error) {
        logger.error('[AutoRecovery] Failed to check for recovery files:', error);
      }
    };

    checkForRecovery();
  }, []);

  // Set up auto-save interval
  useEffect(() => {
    autoSaveIntervalRef.current = setInterval(() => {
      if (isDirty) {
        saveToRecovery();
      }
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [isDirty, saveToRecovery]);

  // Clear recovery file when project is saved (isDirty becomes false)
  useEffect(() => {
    if (!isDirty) {
      clearRecovery();
    }
  }, [isDirty, clearRecovery]);

  // Restore from recovery file
  const restoreRecovery = useCallback(async (): Promise<boolean> => {
    if (!recoveryInfo) return false;

    try {
      const content = await window.electronAPI.readRecoveryFile(recoveryInfo.fileName);
      if (!content) {
        showToast('Recovery file not found');
        return false;
      }

      // Parse the recovery file - handle both new wrapper format and old format
      let projectData: unknown = null;
      let originalFilePath: string | null = recoveryInfo.originalFilePath;

      try {
        const parsed = JSON.parse(content);
        if (parsed && 'recovery' in parsed && 'projectData' in parsed) {
          // New format with wrapper
          projectData = parsed.projectData;
          // Use recoveryInfo.originalFilePath which was set during check
        } else {
          // Old format - content is the project data directly
          projectData = parsed;
        }
      } catch {
        showToast('Recovery file is corrupted');
        return false;
      }

      const validation = parseCarvdFile(JSON.stringify(projectData));
      if (!validation.valid || !validation.data) {
        showToast('Recovery file is corrupted');
        return false;
      }

      const project = deserializeToProject(validation.data);
      // Pass the original file path so Save works without prompting for location
      loadProject(project, originalFilePath ?? undefined);

      // Mark as dirty since this is a recovered unsaved state
      useProjectStore.getState().markDirty();

      // Clear all recovery files
      const files = await window.electronAPI.listRecoveryFiles();
      for (const file of files) {
        await window.electronAPI.deleteRecoveryFile(file);
      }

      setHasRecovery(false);
      setRecoveryInfo(null);
      showToast('Project restored from auto-save');

      return true;
    } catch (error) {
      logger.error('[AutoRecovery] Failed to restore:', error);
      showToast('Failed to restore project');
      return false;
    }
  }, [recoveryInfo, loadProject, showToast]);

  // Discard recovery file
  const discardRecovery = useCallback(async () => {
    if (!recoveryInfo) return;

    try {
      // Clear all recovery files
      const files = await window.electronAPI.listRecoveryFiles();
      for (const file of files) {
        await window.electronAPI.deleteRecoveryFile(file);
      }

      setHasRecovery(false);
      setRecoveryInfo(null);
      logger.info('[AutoRecovery] Discarded recovery files');
    } catch (error) {
      logger.error('[AutoRecovery] Failed to discard recovery:', error);
    }
  }, [recoveryInfo]);

  return {
    hasRecovery,
    recoveryInfo,
    restoreRecovery,
    discardRecovery,
    lastAutoSave
  };
}
