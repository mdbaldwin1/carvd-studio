/**
 * Hook for managing assembly editing in the 3D workspace.
 * Handles entering/exiting edit mode, saving changes, and the unsaved changes dialog.
 */

import { useState, useCallback } from 'react';
import { useProjectStore, generateThumbnail } from '../store/projectStore';
import { useAssemblyEditingStore } from '../store/assemblyEditingStore';
import { useUIStore } from '../store/uiStore';
import { useAssemblyLibrary } from './useAssemblyLibrary';
import { useStockLibrary } from './useStockLibrary';
import { Assembly, Part, Group, GroupMember, Stock } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { hasUnsavedChanges } from '../utils/fileOperations';
import { logger } from '../utils/logger';
import { getFeatureLimits, getBlockedMessage } from '../utils/featureLimits';

interface UseAssemblyEditingResult {
  // State
  isEditingAssembly: boolean;
  editingAssemblyName: string;
  showExitDialog: boolean;
  isCreatingNew: boolean;

  // Actions
  startEditing: (assembly: Assembly) => Promise<boolean>;
  startCreatingNew: () => Promise<boolean>;
  saveAndExit: () => Promise<void>;
  discardAndExit: () => void;
  cancelExit: () => void;
  requestExit: () => void;
}

/**
 * Convert an assembly to editable parts, groups, group members, and stocks.
 * Creates new IDs for all items so they can be edited independently.
 * Also extracts embedded stock data and creates stocks for parts that need them.
 */
function assemblyToEditableParts(
  assembly: Assembly,
  libraryStocks: Stock[]
): {
  parts: Part[];
  groups: Group[];
  groupMembers: GroupMember[];
  stocks: Stock[];
} {
  // Track stocks that need to be created from embedded data
  const stocksFromEmbedded: Stock[] = [];
  const stockIdResolutionMap = new Map<string, string>(); // original stockId -> resolved stockId

  // First pass: resolve all stock references
  for (const cp of assembly.parts) {
    if (!cp.stockId) continue;
    if (stockIdResolutionMap.has(cp.stockId)) continue; // Already resolved

    // Check if stock exists in library
    const libraryStock = libraryStocks.find((s) => s.id === cp.stockId);
    if (libraryStock) {
      stockIdResolutionMap.set(cp.stockId, cp.stockId);
      continue;
    }

    // Fall back to embedded stock data
    if (cp.embeddedStock) {
      // Check if we already created a stock from this embedded data
      const existingMatch = stocksFromEmbedded.find(
        (s) =>
          s.name === cp.embeddedStock!.name &&
          s.thickness === cp.embeddedStock!.thickness &&
          s.color === cp.embeddedStock!.color
      );

      if (existingMatch) {
        stockIdResolutionMap.set(cp.stockId, existingMatch.id);
      } else {
        // Create a new stock from embedded data
        const newStock: Stock = {
          id: uuidv4(),
          name: cp.embeddedStock.name,
          length: cp.embeddedStock.length,
          width: cp.embeddedStock.width,
          thickness: cp.embeddedStock.thickness,
          grainDirection: cp.embeddedStock.grainDirection,
          pricingUnit: cp.embeddedStock.pricingUnit,
          pricePerUnit: cp.embeddedStock.pricePerUnit,
          color: cp.embeddedStock.color
        };
        stocksFromEmbedded.push(newStock);
        stockIdResolutionMap.set(cp.stockId, newStock.id);
      }
    } else {
      // No embedded data - will show as unassigned
      stockIdResolutionMap.set(cp.stockId, '');
    }
  }

  // Create parts with new IDs and resolved stock references
  const parts: Part[] = assembly.parts.map((cp) => {
    // Resolve the stockId
    let resolvedStockId: string | null = cp.stockId;
    if (cp.stockId && stockIdResolutionMap.has(cp.stockId)) {
      const resolved = stockIdResolutionMap.get(cp.stockId)!;
      resolvedStockId = resolved || null;
    }

    return {
      id: uuidv4(),
      name: cp.name,
      length: cp.length,
      width: cp.width,
      thickness: cp.thickness,
      position: {
        x: cp.relativePosition.x,
        y: cp.relativePosition.y,
        z: cp.relativePosition.z
      },
      rotation: cp.rotation,
      stockId: resolvedStockId,
      grainSensitive: cp.grainSensitive,
      grainDirection: cp.grainDirection,
      color: cp.color,
      notes: cp.notes,
      extraLength: cp.extraLength,
      extraWidth: cp.extraWidth
    };
  });

  // Create groups with new IDs
  const groups: Group[] = assembly.groups.map((cg) => ({
    id: uuidv4(),
    name: cg.name
  }));

  // Create group members with updated references
  const groupMembers: GroupMember[] = assembly.groupMembers
    .map((cgm) => ({
      id: uuidv4(),
      groupId: groups[cgm.groupIndex]?.id || '',
      memberType: cgm.memberType,
      memberId: cgm.memberType === 'part' ? parts[cgm.memberIndex]?.id || '' : groups[cgm.memberIndex]?.id || ''
    }))
    .filter((gm) => gm.groupId && gm.memberId);

  return { parts, groups, groupMembers, stocks: stocksFromEmbedded };
}

export function useAssemblyEditing(): UseAssemblyEditingResult {
  const isEditingAssembly = useAssemblyEditingStore((s) => s.isEditingAssembly);
  const editingAssemblyId = useAssemblyEditingStore((s) => s.editingAssemblyId);
  const editingAssemblyName = useAssemblyEditingStore((s) => s.editingAssemblyName);
  const isDirty = useProjectStore((s) => s.isDirty);
  const startEditingAssembly = useAssemblyEditingStore((s) => s.startEditingAssembly);
  const saveEditingAssembly = useAssemblyEditingStore((s) => s.saveEditingAssembly);
  const cancelEditingAssembly = useAssemblyEditingStore((s) => s.cancelEditingAssembly);
  const restorePreviousProject = useAssemblyEditingStore((s) => s.restorePreviousProject);
  const startFreshAfterAssemblyEdit = useAssemblyEditingStore((s) => s.startFreshAfterAssemblyEdit);
  const showToast = useUIStore((s) => s.showToast);

  const { assemblies, addAssembly, updateAssembly } = useAssemblyLibrary();
  const { stocks: libraryStocks } = useStockLibrary();

  // Dialog state
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Start editing an existing assembly
  const startEditing = useCallback(
    async (assembly: Assembly): Promise<boolean> => {
      // Check if current project has unsaved changes
      if (hasUnsavedChanges()) {
        // User needs to save or discard current project first
        showToast('Save or discard your project first');
        return false;
      }

      // Convert assembly to editable parts, resolving stock references
      // This creates stocks from embedded data if they're not in the library
      const { parts, groups, groupMembers, stocks: embeddedStocks } = assemblyToEditableParts(assembly, libraryStocks);

      // Enter assembly editing mode with the resolved stocks
      setIsCreatingNew(false);
      startEditingAssembly(assembly.id, assembly.name, parts, groups, groupMembers, embeddedStocks);

      return true;
    },
    [startEditingAssembly, showToast, libraryStocks]
  );

  // Start creating a new assembly from scratch
  const startCreatingNew = useCallback(async (): Promise<boolean> => {
    // Check license limits for assemblies
    const projectStore = useProjectStore.getState();
    const limits = getFeatureLimits(projectStore.licenseMode);
    if (!limits.canUseAssemblies) {
      showToast(getBlockedMessage('useAssemblies'));
      return false;
    }

    // Check if current project has unsaved changes
    if (hasUnsavedChanges()) {
      // User needs to save or discard current project first
      showToast('Save or discard your project first');
      return false;
    }

    // Generate a new ID for the assembly
    const newId = `assembly_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Enter assembly editing mode with empty workspace
    setIsCreatingNew(true);
    startEditingAssembly(newId, 'New Assembly', [], [], []);

    return true;
  }, [startEditingAssembly, showToast]);

  // Save assembly and exit editing mode
  const saveAndExit = useCallback(async () => {
    // Check if assembly exists in library to determine create vs update
    // This is more reliable than local state which can have stale closure issues
    const existsInLibrary = editingAssemblyId ? assemblies.some((c) => c.id === editingAssemblyId) : false;
    const shouldCreateNew = !existsInLibrary;

    logger.debug('[saveAndExit] Called with:', {
      editingAssemblyId,
      isCreatingNew,
      existsInLibrary,
      shouldCreateNew,
      libraryCount: assemblies.length
    });

    if (!editingAssemblyId) {
      logger.error('[saveAndExit] No editingAssemblyId');
      showToast('No assembly to save');
      return;
    }

    // Create assembly from current workspace
    const updatedAssembly = saveEditingAssembly();
    logger.debug('[saveAndExit] saveEditingAssembly returned:', updatedAssembly);

    if (!updatedAssembly) {
      showToast('Failed to save assembly');
      return;
    }

    // Check if we have any parts
    if (updatedAssembly.parts.length === 0) {
      showToast('Cannot save empty assembly - add at least one part');
      return;
    }

    try {
      const projectStore = useProjectStore.getState();

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
      } else if (!shouldCreateNew) {
        // Check if existing assembly has a manually set thumbnail - preserve it
        const existingAssembly = assemblies.find((c) => c.id === editingAssemblyId);
        if (existingAssembly?.thumbnailData?.manuallySet) {
          // Preserve the existing manually-set thumbnail
          thumbnailData = existingAssembly.thumbnailData;
        }
      }

      // Only auto-generate if we don't have a thumbnail yet
      if (!thumbnailData && updatedAssembly.parts.length > 0) {
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

      if (shouldCreateNew) {
        // Add new assembly to library
        const now = new Date().toISOString();
        const assemblyToSave = {
          ...updatedAssembly,
          thumbnail: '📦', // Emoji fallback
          thumbnailData,
          createdAt: now,
          modifiedAt: now
        };
        logger.debug('[saveAndExit] Adding new assembly:', assemblyToSave);
        await addAssembly(assemblyToSave);
        logger.debug('[saveAndExit] addAssembly completed');
        showToast(`Created "${updatedAssembly.name}" in library`);
      } else {
        // Update existing assembly in library
        const updates = {
          name: updatedAssembly.name,
          description: updatedAssembly.description,
          thumbnailData, // Update thumbnail
          parts: updatedAssembly.parts,
          groups: updatedAssembly.groups,
          groupMembers: updatedAssembly.groupMembers,
          modifiedAt: new Date().toISOString()
        };
        logger.debug('[saveAndExit] Updating assembly:', editingAssemblyId, updates);
        await updateAssembly(editingAssemblyId, updates);
        logger.debug('[saveAndExit] updateAssembly completed');
        showToast(`Saved "${updatedAssembly.name}" to library`);
      }

      // Exit editing mode and restore previous project
      setIsCreatingNew(false);
      cancelEditingAssembly();
      restorePreviousProject();
    } catch (error) {
      logger.error('Failed to save assembly to library:', error);
      showToast('Failed to save assembly to library');
    }
  }, [
    editingAssemblyId,
    saveEditingAssembly,
    assemblies,
    addAssembly,
    updateAssembly,
    cancelEditingAssembly,
    restorePreviousProject,
    showToast
  ]);

  // Discard changes and exit editing mode
  const discardAndExit = useCallback(() => {
    setIsCreatingNew(false);
    cancelEditingAssembly();
    restorePreviousProject();
    setShowExitDialog(false);
  }, [cancelEditingAssembly, restorePreviousProject]);

  // Cancel the exit dialog
  const cancelExit = useCallback(() => {
    setShowExitDialog(false);
    setPendingSave(false);
  }, []);

  // Request to exit editing mode (shows dialog if there are changes)
  const requestExit = useCallback(() => {
    if (isDirty) {
      setShowExitDialog(true);
    } else {
      // No changes, exit immediately
      discardAndExit();
    }
  }, [isDirty, discardAndExit]);

  return {
    isEditingAssembly,
    editingAssemblyName,
    showExitDialog,
    isCreatingNew,
    startEditing,
    startCreatingNew,
    saveAndExit,
    discardAndExit,
    cancelExit,
    requestExit
  };
}
