import { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Assembly } from '../types';
import { logger } from '../utils/logger';
import { getBuiltInAssemblies, isBuiltInAssembly } from '../templates/builtInAssemblies';

// Singleton state for assembly library (shared across all hook instances)
let assemblyLibraryState: Assembly[] = [];
let assemblyLibraryLoading = true;
let assemblyLibraryInitialized = false;
const assemblyLibrarySubscribers = new Set<() => void>();

function notifyAssemblySubscribers() {
  assemblyLibrarySubscribers.forEach((callback) => callback());
}

function subscribeToAssemblyLibrary(callback: () => void) {
  assemblyLibrarySubscribers.add(callback);
  return () => assemblyLibrarySubscribers.delete(callback);
}

function getAssemblyLibrarySnapshot() {
  return assemblyLibraryState;
}

function getAssemblyLibraryLoadingSnapshot() {
  return assemblyLibraryLoading;
}

// Initialize the singleton listener (called once)
function initAssemblyLibrarySingleton() {
  if (assemblyLibraryInitialized) return;
  assemblyLibraryInitialized = true;

  // Load initial data
  window.electronAPI
    .getPreference('assemblyLibrary')
    .then((library) => {
      assemblyLibraryState = (library as Assembly[]) || [];
      assemblyLibraryLoading = false;
      notifyAssemblySubscribers();
    })
    .catch((error) => {
      logger.error('Failed to load assembly library:', error);
      assemblyLibraryState = [];
      assemblyLibraryLoading = false;
      notifyAssemblySubscribers();
    });

  // Set up singleton listener for cross-instance changes
  window.electronAPI.onSettingsChanged((changes) => {
    if ('assemblyLibrary' in changes) {
      assemblyLibraryState = (changes.assemblyLibrary as Assembly[]) || [];
      notifyAssemblySubscribers();
    }
  });
}

/**
 * Hook for managing the app-level assembly library persisted via electron-store.
 * This is separate from the project-level assemblies in the Zustand store.
 * Supports cross-instance sync via electron-store's file watching.
 * Uses a singleton pattern to avoid multiple listeners.
 */
export function useAssemblyLibrary() {
  // Initialize singleton on first use
  useEffect(() => {
    initAssemblyLibrarySingleton();
  }, []);

  // Subscribe to the singleton state (user assemblies only)
  const userAssemblies = useSyncExternalStore(subscribeToAssemblyLibrary, getAssemblyLibrarySnapshot);
  const [isLoading, setIsLoading] = useState(assemblyLibraryLoading);

  // Combine built-in assemblies with user assemblies
  // Built-in assemblies appear first
  const assemblies = useMemo(() => {
    const builtIn = getBuiltInAssemblies();
    return [...builtIn, ...userAssemblies];
  }, [userAssemblies]);

  // Update loading state when singleton changes
  useEffect(() => {
    const unsubscribe = subscribeToAssemblyLibrary(() => {
      setIsLoading(getAssemblyLibraryLoadingSnapshot());
    });
    return unsubscribe;
  }, []);

  // Save assembly library whenever it changes
  const saveLibrary = useCallback(async (newAssemblies: Assembly[]) => {
    logger.debug('[saveLibrary] Saving assemblies:', newAssemblies.length, 'items');
    try {
      await window.electronAPI.setPreference('assemblyLibrary', newAssemblies);
      logger.debug('[saveLibrary] setPreference completed');
      // Update singleton state immediately for responsive UI
      assemblyLibraryState = newAssemblies;
      notifyAssemblySubscribers();
    } catch (error) {
      logger.error('Failed to save assembly library:', error);
      throw error; // Re-throw so caller can handle
    }
  }, []);

  const addAssembly = useCallback(
    async (assembly: Assembly) => {
      // Read current assemblies directly from storage to avoid stale closure issues
      const currentAssemblies = ((await window.electronAPI.getPreference('assemblyLibrary')) as Assembly[]) || [];
      logger.debug(
        '[addAssembly] Current assemblies from storage:',
        currentAssemblies.length,
        'Adding:',
        assembly.name
      );
      const newAssemblies = [...currentAssemblies, assembly];
      await saveLibrary(newAssemblies);
      logger.debug('[addAssembly] Save completed, new count:', newAssemblies.length);
    },
    [saveLibrary]
  );

  const updateAssembly = useCallback(
    async (id: string, updates: Partial<Assembly>) => {
      // Prevent modifying built-in assemblies
      if (isBuiltInAssembly(id)) {
        logger.warn('[updateAssembly] Cannot modify built-in assembly:', id);
        return;
      }
      // Read current assemblies directly from storage to avoid stale closure issues
      // This is important when editing an assembly, as the closure might capture old data
      const currentAssemblies = ((await window.electronAPI.getPreference('assemblyLibrary')) as Assembly[]) || [];
      logger.debug('[updateAssembly] Current assemblies from storage:', currentAssemblies.length, 'items');
      const newAssemblies = currentAssemblies.map((c) => (c.id === id ? { ...c, ...updates } : c));
      logger.debug('[updateAssembly] Updated assembly id:', id, 'parts count:', updates.parts?.length);
      await saveLibrary(newAssemblies);
    },
    [saveLibrary]
  );

  const deleteAssembly = useCallback(
    async (id: string) => {
      // Prevent deleting built-in assemblies
      if (isBuiltInAssembly(id)) {
        logger.warn('[deleteAssembly] Cannot delete built-in assembly:', id);
        return;
      }
      // Read current assemblies directly from storage to avoid stale closure issues
      const currentAssemblies = ((await window.electronAPI.getPreference('assemblyLibrary')) as Assembly[]) || [];
      const newAssemblies = currentAssemblies.filter((c) => c.id !== id);
      await saveLibrary(newAssemblies);
    },
    [saveLibrary]
  );

  const duplicateAssembly = useCallback(
    async (assembly: Assembly): Promise<Assembly> => {
      const now = new Date().toISOString();
      // Create a copy with new ID and updated name
      const duplicated: Assembly = {
        ...assembly,
        id: uuidv4(),
        name: `${assembly.name} (Copy)`,
        createdAt: now,
        modifiedAt: now,
        // Generate new IDs for parts to avoid conflicts
        parts: assembly.parts.map((part) => ({
          ...part,
          id: uuidv4()
        })),
        // Generate new IDs for groups
        groups: assembly.groups.map((group) => ({
          ...group,
          id: uuidv4()
        })),
        // Update group members with new part/group IDs
        groupMembers: [] // Will be empty since IDs changed - user can re-group
      };

      await addAssembly(duplicated);
      logger.debug('[duplicateAssembly] Duplicated assembly:', assembly.name, '->', duplicated.name);
      return duplicated;
    },
    [addAssembly]
  );

  const findAssembly = useCallback(
    (id: string) => {
      return assemblies.find((c) => c.id === id);
    },
    [assemblies]
  );

  return {
    assemblies,
    isLoading,
    addAssembly,
    updateAssembly,
    deleteAssembly,
    duplicateAssembly,
    findAssembly
  };
}
