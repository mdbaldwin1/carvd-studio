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
  advancedSnapPreset: 'precision',
  enableSurfaceAnchors: true,
  enableFractionalAnchors: true,
  enableGoldenRatioAnchors: false,
  enableFeatureAnchors: true,
  enableLayoutSnaps: true,
  enableEqualSpacingSnap: true,
  enableDistributionSnap: true,
  enablePatternSnap: true,
  enableAxisLegacySnaps: true,
  showSnapCandidates: false,
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

    // Set up listener for settings changes from other instances. Cross-instance
    // sync is a nicety; a bridge that cannot provide it must not stop settings
    // from loading, and the latch only closes on success so a later init can
    // still pick the listener up.
    if (!listenerSetup) {
      try {
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
            'advancedSnapPreset',
            'enableSurfaceAnchors',
            'enableFractionalAnchors',
            'enableGoldenRatioAnchors',
            'enableFeatureAnchors',
            'enableLayoutSnaps',
            'enableEqualSpacingSnap',
            'enableDistributionSnap',
            'enablePatternSnap',
            'enableAxisLegacySnaps',
            'showSnapCandidates',
            'lightingMode',
            'brightnessMultiplier',
            'autoSave'
          ];

          const relevantChanges: Partial<AppSettings> = {};
          for (const key of appSettingsKeys) {
            if (key in changes) {
              // A union key makes the per-key value type unresolvable here;
              // appSettingsKeys guarantees the key belongs to AppSettings.
              (relevantChanges as Record<string, unknown>)[key] = changes[key];
            }
          }

          // Update state if there are relevant changes
          if (Object.keys(relevantChanges).length > 0) {
            const currentSettings = get().settings;
            set({ settings: { ...currentSettings, ...relevantChanges } });
          }
        });
        listenerSetup = true;
      } catch (error) {
        logger.warn('Settings sync between windows unavailable:', error);
      }
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
          advancedSnapPreset,
          enableSurfaceAnchors,
          enableFractionalAnchors,
          enableGoldenRatioAnchors,
          enableFeatureAnchors,
          enableLayoutSnaps,
          enableEqualSpacingSnap,
          enableDistributionSnap,
          enablePatternSnap,
          enableAxisLegacySnaps,
          showSnapCandidates,
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
          window.electronAPI.getPreference('advancedSnapPreset'),
          window.electronAPI.getPreference('enableSurfaceAnchors'),
          window.electronAPI.getPreference('enableFractionalAnchors'),
          window.electronAPI.getPreference('enableGoldenRatioAnchors'),
          window.electronAPI.getPreference('enableFeatureAnchors'),
          window.electronAPI.getPreference('enableLayoutSnaps'),
          window.electronAPI.getPreference('enableEqualSpacingSnap'),
          window.electronAPI.getPreference('enableDistributionSnap'),
          window.electronAPI.getPreference('enablePatternSnap'),
          window.electronAPI.getPreference('enableAxisLegacySnaps'),
          window.electronAPI.getPreference('showSnapCandidates'),
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
          // Settings stored before preventOverlap existed carry only three
          // keys, so fill from the defaults rather than passing undefined on.
          stockConstraints: {
            ...DEFAULT_SETTINGS.stockConstraints,
            ...((stockConstraints as Partial<AppSettings['stockConstraints']> | null) ?? {})
          },
          liveGridSnap: liveGridSnap !== undefined ? (liveGridSnap as boolean) : DEFAULT_SETTINGS.liveGridSnap,
          snapSensitivity: (snapSensitivity as AppSettings['snapSensitivity']) || DEFAULT_SETTINGS.snapSensitivity,
          snapToOrigin: snapToOrigin !== undefined ? (snapToOrigin as boolean) : DEFAULT_SETTINGS.snapToOrigin,
          dimensionSnapSameTypeOnly:
            dimensionSnapSameTypeOnly !== undefined
              ? (dimensionSnapSameTypeOnly as boolean)
              : DEFAULT_SETTINGS.dimensionSnapSameTypeOnly,
          advancedSnapPreset:
            (advancedSnapPreset as AppSettings['advancedSnapPreset']) || DEFAULT_SETTINGS.advancedSnapPreset,
          enableSurfaceAnchors:
            enableSurfaceAnchors !== undefined
              ? (enableSurfaceAnchors as boolean)
              : DEFAULT_SETTINGS.enableSurfaceAnchors,
          enableFractionalAnchors:
            enableFractionalAnchors !== undefined
              ? (enableFractionalAnchors as boolean)
              : DEFAULT_SETTINGS.enableFractionalAnchors,
          enableGoldenRatioAnchors:
            enableGoldenRatioAnchors !== undefined
              ? (enableGoldenRatioAnchors as boolean)
              : DEFAULT_SETTINGS.enableGoldenRatioAnchors,
          enableFeatureAnchors:
            enableFeatureAnchors !== undefined
              ? (enableFeatureAnchors as boolean)
              : DEFAULT_SETTINGS.enableFeatureAnchors,
          enableLayoutSnaps:
            enableLayoutSnaps !== undefined ? (enableLayoutSnaps as boolean) : DEFAULT_SETTINGS.enableLayoutSnaps,
          enableEqualSpacingSnap:
            enableEqualSpacingSnap !== undefined
              ? (enableEqualSpacingSnap as boolean)
              : DEFAULT_SETTINGS.enableEqualSpacingSnap,
          enableDistributionSnap:
            enableDistributionSnap !== undefined
              ? (enableDistributionSnap as boolean)
              : DEFAULT_SETTINGS.enableDistributionSnap,
          enablePatternSnap:
            enablePatternSnap !== undefined ? (enablePatternSnap as boolean) : DEFAULT_SETTINGS.enablePatternSnap,
          enableAxisLegacySnaps:
            enableAxisLegacySnaps !== undefined
              ? (enableAxisLegacySnaps as boolean)
              : DEFAULT_SETTINGS.enableAxisLegacySnaps,
          showSnapCandidates:
            showSnapCandidates !== undefined ? (showSnapCandidates as boolean) : DEFAULT_SETTINGS.showSnapCandidates,
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
      // A preset changes several fields in succession. Persist only its supplied
      // keys: rewriting the entire snapshot for each field floods the main
      // process with synchronous disk writes and replays stale unrelated values.
      const keys = (Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]).filter((key) =>
        Object.prototype.hasOwnProperty.call(updates, key)
      );
      await Promise.all(
        keys.map((key) => window.electronAPI.setPreference(key, newSettings[key] ?? DEFAULT_SETTINGS[key]))
      );
    } catch (error) {
      logger.error('Failed to save app settings:', error);
      // Revert on error
      set({ settings: currentSettings });
    }
  }
}));
