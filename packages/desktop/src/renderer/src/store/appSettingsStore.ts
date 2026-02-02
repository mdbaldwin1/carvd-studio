import { create } from 'zustand';
import { AppSettings } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  defaultUnits: 'imperial',
  defaultGridSize: 0.0625, // 1/16"
  theme: 'dark',
  confirmBeforeDelete: true,
  showHotkeyHints: true,
  stockConstraints: {
    constrainDimensions: true,
    constrainGrain: true,
    constrainColor: true,
    preventOverlap: true
  }
};

interface AppSettingsState {
  settings: AppSettings;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initSettings: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
}

// Track if we've set up the cross-instance listener
let listenerSetup = false;

export const useAppSettingsStore = create<AppSettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: true,
  isInitialized: false,

  initSettings: async () => {
    // Only initialize once
    if (get().isInitialized) return;

    // Set up listener for settings changes from other instances
    if (!listenerSetup) {
      listenerSetup = true;
      window.electronAPI.onSettingsChanged((changes) => {
        // Only apply changes for app settings keys
        const appSettingsKeys: (keyof AppSettings)[] = [
          'theme',
          'confirmBeforeDelete',
          'showHotkeyHints',
          'defaultUnits',
          'defaultGridSize',
          'stockConstraints'
        ];

        const relevantChanges: Partial<AppSettings> = {};
        for (const key of appSettingsKeys) {
          if (key in changes) {
            relevantChanges[key] = changes[key] as AppSettings[typeof key];
          }
        }

        // Update state if there are relevant changes
        if (Object.keys(relevantChanges).length > 0) {
          const currentSettings = get().settings;
          set({ settings: { ...currentSettings, ...relevantChanges } });
        }
      });
    }

    try {
      const stored = await window.electronAPI.getPreference('appSettings');
      if (stored) {
        set({
          settings: { ...DEFAULT_SETTINGS, ...(stored as Partial<AppSettings>) },
          isLoading: false,
          isInitialized: true
        });
      } else {
        // Migrate from individual fields if they exist
        const [defaultUnits, defaultGridSize, theme, confirmBeforeDelete, showHotkeyHints, stockConstraints] = await Promise.all([
          window.electronAPI.getPreference('defaultUnits'),
          window.electronAPI.getPreference('defaultGridSize'),
          window.electronAPI.getPreference('theme'),
          window.electronAPI.getPreference('confirmBeforeDelete'),
          window.electronAPI.getPreference('showHotkeyHints'),
          window.electronAPI.getPreference('stockConstraints')
        ]);

        const migrated: AppSettings = {
          defaultUnits: (defaultUnits as AppSettings['defaultUnits']) || DEFAULT_SETTINGS.defaultUnits,
          defaultGridSize: (defaultGridSize as number) || DEFAULT_SETTINGS.defaultGridSize,
          theme: (theme as AppSettings['theme']) || DEFAULT_SETTINGS.theme,
          confirmBeforeDelete:
            confirmBeforeDelete !== undefined
              ? (confirmBeforeDelete as boolean)
              : DEFAULT_SETTINGS.confirmBeforeDelete,
          showHotkeyHints:
            showHotkeyHints !== undefined ? (showHotkeyHints as boolean) : DEFAULT_SETTINGS.showHotkeyHints,
          stockConstraints: (stockConstraints as AppSettings['stockConstraints']) || DEFAULT_SETTINGS.stockConstraints
        };

        set({
          settings: migrated,
          isLoading: false,
          isInitialized: true
        });
      }
    } catch (error) {
      console.error('Failed to load app settings:', error);
      set({
        settings: DEFAULT_SETTINGS,
        isLoading: false,
        isInitialized: true
      });
    }
  },

  updateSettings: async (updates: Partial<AppSettings>) => {
    const currentSettings = get().settings;
    const newSettings = { ...currentSettings, ...updates };

    // Optimistically update the state
    set({ settings: newSettings });

    try {
      // Save individual fields for compatibility with main process
      await Promise.all([
        window.electronAPI.setPreference('defaultUnits', newSettings.defaultUnits),
        window.electronAPI.setPreference('defaultGridSize', newSettings.defaultGridSize),
        window.electronAPI.setPreference('theme', newSettings.theme),
        window.electronAPI.setPreference('confirmBeforeDelete', newSettings.confirmBeforeDelete),
        window.electronAPI.setPreference('showHotkeyHints', newSettings.showHotkeyHints),
        window.electronAPI.setPreference('stockConstraints', newSettings.stockConstraints)
      ]);
    } catch (error) {
      console.error('Failed to save app settings:', error);
      // Revert on error
      set({ settings: currentSettings });
    }
  }
}));
