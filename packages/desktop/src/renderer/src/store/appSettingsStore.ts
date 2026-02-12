import { create } from 'zustand';
import { AppSettings } from '../types';
import { logger } from '../utils/logger';

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
  },
  // Snap settings
  liveGridSnap: false, // Traditional behavior: grid snap on release only
  snapSensitivity: 'normal',
  snapToOrigin: true, // Snap to origin planes by default
  dimensionSnapSameTypeOnly: false, // Allow matching any dimension by default
  // Display settings
  lightingMode: 'default', // Default lighting preset
  brightnessMultiplier: 1.0, // Default brightness (1.0 = 100%)
  // Auto-save settings
  autoSave: false // Disabled by default
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
          'stockConstraints',
          'liveGridSnap',
          'snapSensitivity',
          'snapToOrigin',
          'dimensionSnapSameTypeOnly',
          'lightingMode',
          'brightnessMultiplier',
          'autoSave'
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
        const [
          defaultUnits,
          defaultGridSize,
          theme,
          confirmBeforeDelete,
          showHotkeyHints,
          stockConstraints,
          liveGridSnap,
          snapSensitivity,
          snapToOrigin,
          dimensionSnapSameTypeOnly,
          lightingMode,
          brightnessMultiplier,
          autoSave
        ] = await Promise.all([
          window.electronAPI.getPreference('defaultUnits'),
          window.electronAPI.getPreference('defaultGridSize'),
          window.electronAPI.getPreference('theme'),
          window.electronAPI.getPreference('confirmBeforeDelete'),
          window.electronAPI.getPreference('showHotkeyHints'),
          window.electronAPI.getPreference('stockConstraints'),
          window.electronAPI.getPreference('liveGridSnap'),
          window.electronAPI.getPreference('snapSensitivity'),
          window.electronAPI.getPreference('snapToOrigin'),
          window.electronAPI.getPreference('dimensionSnapSameTypeOnly'),
          window.electronAPI.getPreference('lightingMode'),
          window.electronAPI.getPreference('brightnessMultiplier'),
          window.electronAPI.getPreference('autoSave')
        ]);

        const migrated: AppSettings = {
          defaultUnits: (defaultUnits as AppSettings['defaultUnits']) || DEFAULT_SETTINGS.defaultUnits,
          defaultGridSize: (defaultGridSize as number) || DEFAULT_SETTINGS.defaultGridSize,
          theme: (theme as AppSettings['theme']) || DEFAULT_SETTINGS.theme,
          confirmBeforeDelete:
            confirmBeforeDelete !== undefined ? (confirmBeforeDelete as boolean) : DEFAULT_SETTINGS.confirmBeforeDelete,
          showHotkeyHints:
            showHotkeyHints !== undefined ? (showHotkeyHints as boolean) : DEFAULT_SETTINGS.showHotkeyHints,
          stockConstraints: (stockConstraints as AppSettings['stockConstraints']) || DEFAULT_SETTINGS.stockConstraints,
          liveGridSnap: liveGridSnap !== undefined ? (liveGridSnap as boolean) : DEFAULT_SETTINGS.liveGridSnap,
          snapSensitivity: (snapSensitivity as AppSettings['snapSensitivity']) || DEFAULT_SETTINGS.snapSensitivity,
          snapToOrigin: snapToOrigin !== undefined ? (snapToOrigin as boolean) : DEFAULT_SETTINGS.snapToOrigin,
          dimensionSnapSameTypeOnly:
            dimensionSnapSameTypeOnly !== undefined
              ? (dimensionSnapSameTypeOnly as boolean)
              : DEFAULT_SETTINGS.dimensionSnapSameTypeOnly,
          lightingMode: (lightingMode as AppSettings['lightingMode']) || DEFAULT_SETTINGS.lightingMode,
          brightnessMultiplier: (brightnessMultiplier as number) || DEFAULT_SETTINGS.brightnessMultiplier,
          autoSave: autoSave !== undefined ? (autoSave as boolean) : DEFAULT_SETTINGS.autoSave
        };

        set({
          settings: migrated,
          isLoading: false,
          isInitialized: true
        });
      }
    } catch (error) {
      logger.error('Failed to load app settings:', error);
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
      // Use fallback values to prevent electron-store errors with undefined values
      await Promise.all([
        window.electronAPI.setPreference('defaultUnits', newSettings.defaultUnits ?? 'imperial'),
        window.electronAPI.setPreference('defaultGridSize', newSettings.defaultGridSize ?? 0.0625),
        window.electronAPI.setPreference('theme', newSettings.theme ?? 'dark'),
        window.electronAPI.setPreference('confirmBeforeDelete', newSettings.confirmBeforeDelete ?? true),
        window.electronAPI.setPreference('showHotkeyHints', newSettings.showHotkeyHints ?? true),
        window.electronAPI.setPreference(
          'stockConstraints',
          newSettings.stockConstraints ?? DEFAULT_SETTINGS.stockConstraints
        ),
        window.electronAPI.setPreference('liveGridSnap', newSettings.liveGridSnap ?? false),
        window.electronAPI.setPreference('snapSensitivity', newSettings.snapSensitivity ?? 'normal'),
        window.electronAPI.setPreference('snapToOrigin', newSettings.snapToOrigin ?? true),
        window.electronAPI.setPreference('dimensionSnapSameTypeOnly', newSettings.dimensionSnapSameTypeOnly ?? false),
        window.electronAPI.setPreference('lightingMode', newSettings.lightingMode ?? 'default'),
        window.electronAPI.setPreference('brightnessMultiplier', newSettings.brightnessMultiplier ?? 1.0),
        window.electronAPI.setPreference('autoSave', newSettings.autoSave ?? false)
      ]);
    } catch (error) {
      logger.error('Failed to save app settings:', error);
      // Revert on error
      set({ settings: currentSettings });
    }
  }
}));
