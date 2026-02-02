import { useEffect } from 'react';
import { useAppSettingsStore } from '../store/appSettingsStore';

/**
 * Hook for managing app-level settings persisted via electron-store.
 * These settings provide defaults for new projects and control app behavior.
 * Uses Zustand store for global state management.
 */
export function useAppSettings() {
  const settings = useAppSettingsStore((s) => s.settings);
  const isLoading = useAppSettingsStore((s) => s.isLoading);
  const initSettings = useAppSettingsStore((s) => s.initSettings);
  const updateSettings = useAppSettingsStore((s) => s.updateSettings);

  // Initialize settings on first use
  useEffect(() => {
    initSettings();
  }, [initSettings]);

  return {
    settings,
    isLoading,
    updateSettings
  };
}
