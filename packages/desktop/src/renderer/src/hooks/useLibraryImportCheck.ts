/**
 * Hook that checks for stocks/assemblies not in the library after a project is loaded
 * and provides state for the import dialog
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { useStockLibrary } from './useStockLibrary';
import { useAssemblyLibrary } from './useAssemblyLibrary';
import { Stock, Assembly } from '../types';
import {
  detectMissingLibraryItems,
  createLibraryStockFromProject,
  createLibraryAssemblyFromProject
} from '../utils/libraryImport';
import { logger } from '../utils/logger';

interface UseLibraryImportCheckResult {
  // Dialog state
  showImportDialog: boolean;
  missingStocks: Stock[];
  missingAssemblies: Assembly[];
  // Actions
  handleImport: (stocks: Stock[], assemblies: Assembly[]) => void;
  handleSkip: () => void;
}

export function useLibraryImportCheck(): UseLibraryImportCheckResult {
  const projectStocks = useProjectStore((s) => s.stocks);
  const projectAssemblies = useProjectStore((s) => s.assemblies);
  const filePath = useProjectStore((s) => s.filePath);
  const showToast = useUIStore((s) => s.showToast);

  const { stocks: libraryStocks, addStock: addStockToLibrary, isLoading: stocksLoading } = useStockLibrary();
  const {
    assemblies: libraryAssemblies,
    addAssembly: addAssemblyToLibrary,
    isLoading: assembliesLoading
  } = useAssemblyLibrary();

  // Dialog state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [missingStocks, setMissingStocks] = useState<Stock[]>([]);
  const [missingAssemblies, setMissingAssemblies] = useState<Assembly[]>([]);

  // Track the last checked file path to avoid re-checking the same project
  const lastCheckedFilePath = useRef<string | null>(null);

  // Check for missing items when a project is loaded
  useEffect(() => {
    // Don't check while libraries are still loading
    if (stocksLoading || assembliesLoading) return;

    // Don't check if no file is loaded (new project)
    if (!filePath) {
      lastCheckedFilePath.current = null;
      return;
    }

    // Don't re-check if we already checked this file
    if (filePath === lastCheckedFilePath.current) return;

    // Mark as checked
    lastCheckedFilePath.current = filePath;

    // Wait a tick to ensure project state is fully loaded
    const timeoutId = setTimeout(() => {
      // Check for missing items
      const result = detectMissingLibraryItems(projectStocks, projectAssemblies, libraryStocks, libraryAssemblies);

      if (result.hasItems) {
        setMissingStocks(result.missingStocks);
        setMissingAssemblies(result.missingAssemblies);
        setShowImportDialog(true);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [filePath, projectStocks, projectAssemblies, libraryStocks, libraryAssemblies, stocksLoading, assembliesLoading]);

  // Handle import
  const handleImport = useCallback(
    async (stocks: Stock[], assemblies: Assembly[]) => {
      let importedCount = 0;

      // Import selected stocks
      for (const stock of stocks) {
        try {
          const libraryStock = createLibraryStockFromProject(stock);
          await addStockToLibrary(libraryStock);
          importedCount++;
        } catch (error) {
          logger.error('Failed to import stock to library:', error);
        }
      }

      // Import selected assemblies
      for (const assembly of assemblies) {
        try {
          const libraryAssembly = createLibraryAssemblyFromProject(assembly);
          await addAssemblyToLibrary(libraryAssembly);
          importedCount++;
        } catch (error) {
          logger.error('Failed to import assembly to library:', error);
        }
      }

      // Close dialog and show feedback
      setShowImportDialog(false);
      setMissingStocks([]);
      setMissingAssemblies([]);

      if (importedCount > 0) {
        showToast(`Added ${importedCount} item${importedCount !== 1 ? 's' : ''} to library`);
      }
    },
    [addStockToLibrary, addAssemblyToLibrary, showToast]
  );

  // Handle skip
  const handleSkip = useCallback(() => {
    setShowImportDialog(false);
    setMissingStocks([]);
    setMissingAssemblies([]);
  }, []);

  return {
    showImportDialog,
    missingStocks,
    missingAssemblies,
    handleImport,
    handleSkip
  };
}
