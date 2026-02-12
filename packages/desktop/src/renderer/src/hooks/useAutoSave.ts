/**
 * Auto-save hook - automatically saves project when changes are made
 * Works alongside auto-recovery (which saves to a recovery file for crash protection)
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { saveProject } from '../utils/fileOperations';
import { logger } from '../utils/logger';

// Auto-save delay after last change (30 seconds)
const AUTO_SAVE_DELAY = 30 * 1000;

interface UseAutoSaveOptions {
  // Callback for when initial save is needed (project has no file path)
  onInitialSaveNeeded?: () => Promise<void>;
  // Whether auto-save is currently blocked (e.g., during template/assembly editing)
  blocked?: boolean;
}

interface UseAutoSaveResult {
  // Last auto-save timestamp
  lastAutoSave: Date | null;
  // Whether an auto-save is pending
  isPending: boolean;
}

export function useAutoSave(options: UseAutoSaveOptions = {}): UseAutoSaveResult {
  const { onInitialSaveNeeded, blocked = false } = options;

  const isDirty = useProjectStore((s) => s.isDirty);
  const filePath = useProjectStore((s) => s.filePath);
  const showToast = useProjectStore((s) => s.showToast);
  const autoSaveEnabled = useAppSettingsStore((s) => s.settings.autoSave);

  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [isPending, setIsPending] = useState(false);

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  // Track if we've already prompted for initial save this session
  const hasPromptedForInitialSaveRef = useRef(false);

  // Clear any pending auto-save timeout
  const clearPendingAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
    setIsPending(false);
  }, []);

  // Perform the auto-save
  const performAutoSave = useCallback(async () => {
    if (isSavingRef.current || blocked) return;

    isSavingRef.current = true;
    setIsPending(false);

    try {
      // If no file path, we need to prompt for initial save
      if (!filePath) {
        // Only prompt once per session to avoid nagging
        if (!hasPromptedForInitialSaveRef.current && onInitialSaveNeeded) {
          hasPromptedForInitialSaveRef.current = true;
          await onInitialSaveNeeded();
        }
        return;
      }

      // Save to existing file
      const result = await saveProject();
      if (result.success) {
        setLastAutoSave(new Date());
        logger.info('[AutoSave] Project auto-saved');
      } else if (result.error) {
        logger.error('[AutoSave] Failed to auto-save:', result.error);
        showToast(`Auto-save failed: ${result.error}`, 'error');
      }
      // If canceled, don't show error (user closed dialog)
    } catch (error) {
      logger.error('[AutoSave] Error during auto-save:', error);
    } finally {
      isSavingRef.current = false;
    }
  }, [filePath, blocked, onInitialSaveNeeded, showToast]);

  // Schedule auto-save when project becomes dirty
  useEffect(() => {
    // Don't schedule if auto-save is disabled, not dirty, or blocked
    if (!autoSaveEnabled || !isDirty || blocked) {
      clearPendingAutoSave();
      return;
    }

    // Clear any existing timeout and schedule a new one
    clearPendingAutoSave();
    setIsPending(true);

    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave();
    }, AUTO_SAVE_DELAY);

    return () => {
      clearPendingAutoSave();
    };
  }, [autoSaveEnabled, isDirty, blocked, performAutoSave, clearPendingAutoSave]);

  // Reset initial save prompt flag when file path changes (new project or opened different file)
  useEffect(() => {
    hasPromptedForInitialSaveRef.current = false;
  }, [filePath]);

  // Clear pending auto-save on unmount
  useEffect(() => {
    return () => {
      clearPendingAutoSave();
    };
  }, [clearPendingAutoSave]);

  return {
    lastAutoSave,
    isPending
  };
}
