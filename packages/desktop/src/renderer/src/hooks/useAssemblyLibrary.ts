import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { Assembly } from '../types';

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
  window.electronAPI.getPreference('assemblyLibrary').then((library) => {
    assemblyLibraryState = (library as Assembly[]) || [];
    assemblyLibraryLoading = false;
    notifyAssemblySubscribers();
  }).catch((error) => {
    console.error('Failed to load assembly library:', error);
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

  // Subscribe to the singleton state
  const assemblies = useSyncExternalStore(subscribeToAssemblyLibrary, getAssemblyLibrarySnapshot);
  const [isLoading, setIsLoading] = useState(assemblyLibraryLoading);

  // Update loading state when singleton changes
  useEffect(() => {
    const unsubscribe = subscribeToAssemblyLibrary(() => {
      setIsLoading(getAssemblyLibraryLoadingSnapshot());
    });
    return unsubscribe;
  }, []);

  // Save assembly library whenever it changes
  const saveLibrary = useCallback(async (newAssemblies: Assembly[]) => {
    console.log('[saveLibrary] Saving assemblies:', newAssemblies.length, 'items');
    try {
      await window.electronAPI.setPreference('assemblyLibrary', newAssemblies);
      console.log('[saveLibrary] setPreference completed');
      // Update singleton state immediately for responsive UI
      assemblyLibraryState = newAssemblies;
      notifyAssemblySubscribers();
    } catch (error) {
      console.error('Failed to save assembly library:', error);
      throw error; // Re-throw so caller can handle
    }
  }, []);

  const addAssembly = useCallback(
    async (assembly: Assembly) => {
      // Read current assemblies directly from storage to avoid stale closure issues
      const currentAssemblies = (await window.electronAPI.getPreference('assemblyLibrary') as Assembly[]) || [];
      console.log('[addAssembly] Current assemblies from storage:', currentAssemblies.length, 'Adding:', assembly.name);
      const newAssemblies = [...currentAssemblies, assembly];
      await saveLibrary(newAssemblies);
      console.log('[addAssembly] Save completed, new count:', newAssemblies.length);
    },
    [saveLibrary]
  );

  const updateAssembly = useCallback(
    async (id: string, updates: Partial<Assembly>) => {
      // Read current assemblies directly from storage to avoid stale closure issues
      // This is important when editing an assembly, as the closure might capture old data
      const currentAssemblies = (await window.electronAPI.getPreference('assemblyLibrary') as Assembly[]) || [];
      console.log('[updateAssembly] Current assemblies from storage:', currentAssemblies.length, 'items');
      const newAssemblies = currentAssemblies.map((c) => (c.id === id ? { ...c, ...updates } : c));
      console.log('[updateAssembly] Updated assembly id:', id, 'parts count:', updates.parts?.length);
      await saveLibrary(newAssemblies);
    },
    [saveLibrary]
  );

  const deleteAssembly = useCallback(
    async (id: string) => {
      // Read current assemblies directly from storage to avoid stale closure issues
      const currentAssemblies = (await window.electronAPI.getPreference('assemblyLibrary') as Assembly[]) || [];
      const newAssemblies = currentAssemblies.filter((c) => c.id !== id);
      await saveLibrary(newAssemblies);
    },
    [saveLibrary]
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
    findAssembly
  };
}
