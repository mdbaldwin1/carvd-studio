import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { useAppSettingsStore } from './appSettingsStore';
import type { AppSettings, StockConstraintSettings } from '../types';

// Default settings expected from the store
const DEFAULT_SETTINGS: AppSettings = {
  defaultUnits: 'imperial',
  defaultGridSize: 0.0625,
  theme: 'dark',
  confirmBeforeDelete: true,
  showHotkeyHints: true,
  stockConstraints: {
    constrainDimensions: true,
    constrainGrain: true,
    constrainColor: true,
    preventOverlap: true
  },
  liveGridSnap: false,
  snapSensitivity: 'normal',
  snapToOrigin: true,
  dimensionSnapSameTypeOnly: false,
  lightingMode: 'default',
  brightnessMultiplier: 1.0,
  autoSave: false
};

// Mock electron API
const mockGetPreference = vi.fn();
const mockSetPreference = vi.fn();

// Setup mock before all tests - the listener setup only happens once
beforeAll(() => {
  // Setup window.electronAPI mock with the onSettingsChanged
  const mockOnSettingsChanged = vi.fn().mockImplementation(() => {
    return () => {};
  });

  window.electronAPI = {
    getPreference: mockGetPreference,
    setPreference: mockSetPreference,
    onSettingsChanged: mockOnSettingsChanged,
    // Stub other required methods
    onOpenProject: vi.fn(() => () => {}),
    onMenuCommand: vi.fn(() => () => {}),
    showSaveDialog: vi.fn(),
    showOpenDialog: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    writeBinaryFile: vi.fn(),
    getRecentProjects: vi.fn(),
    addRecentProject: vi.fn(),
    clearRecentProjects: vi.fn(),
    setWindowTitle: vi.fn(),
    getAppVersion: vi.fn(),
    getPlatform: vi.fn(),
    verifyLicense: vi.fn(),
    getLicenseData: vi.fn(),
    checkLicenseValid: vi.fn(),
    deactivateLicense: vi.fn(),
    setTitleBarOverlay: vi.fn(),
    printToPdf: vi.fn(),
    getRecoveryDir: vi.fn(),
    saveRecoveryFile: vi.fn(),
    readRecoveryFile: vi.fn(),
    deleteRecoveryFile: vi.fn(),
    listRecoveryFiles: vi.fn()
  };
});

// Setup mock before each test
beforeEach(() => {
  // Reset mocks
  mockGetPreference.mockReset();
  mockSetPreference.mockReset();

  // Setup default mock implementations
  mockGetPreference.mockResolvedValue(null);
  mockSetPreference.mockResolvedValue(undefined);

  // Reset store state by setting it directly
  useAppSettingsStore.setState({
    settings: { ...DEFAULT_SETTINGS },
    isLoading: true,
    isInitialized: false
  });
});

describe('appSettingsStore', () => {
  describe('initial state', () => {
    it('has default settings', () => {
      const state = useAppSettingsStore.getState();

      expect(state.settings).toEqual(DEFAULT_SETTINGS);
    });

    it('starts in loading state', () => {
      const state = useAppSettingsStore.getState();

      expect(state.isLoading).toBe(true);
    });

    it('starts uninitialized', () => {
      const state = useAppSettingsStore.getState();

      expect(state.isInitialized).toBe(false);
    });
  });

  describe('default settings values', () => {
    it('uses imperial units by default', () => {
      const state = useAppSettingsStore.getState();

      expect(state.settings.defaultUnits).toBe('imperial');
    });

    it('uses 1/16" grid size by default', () => {
      const state = useAppSettingsStore.getState();

      expect(state.settings.defaultGridSize).toBe(0.0625);
    });

    it('uses dark theme by default', () => {
      const state = useAppSettingsStore.getState();

      expect(state.settings.theme).toBe('dark');
    });

    it('enables delete confirmation by default', () => {
      const state = useAppSettingsStore.getState();

      expect(state.settings.confirmBeforeDelete).toBe(true);
    });

    it('shows hotkey hints by default', () => {
      const state = useAppSettingsStore.getState();

      expect(state.settings.showHotkeyHints).toBe(true);
    });

    it('enables all stock constraints by default', () => {
      const state = useAppSettingsStore.getState();

      expect(state.settings.stockConstraints.constrainDimensions).toBe(true);
      expect(state.settings.stockConstraints.constrainGrain).toBe(true);
      expect(state.settings.stockConstraints.constrainColor).toBe(true);
      expect(state.settings.stockConstraints.preventOverlap).toBe(true);
    });

    it('disables live grid snap by default', () => {
      const state = useAppSettingsStore.getState();

      expect(state.settings.liveGridSnap).toBe(false);
    });

    it('uses normal snap sensitivity by default', () => {
      const state = useAppSettingsStore.getState();

      expect(state.settings.snapSensitivity).toBe('normal');
    });

    it('enables snap to origin by default', () => {
      const state = useAppSettingsStore.getState();

      expect(state.settings.snapToOrigin).toBe(true);
    });

    it('allows dimension snap to any type by default', () => {
      const state = useAppSettingsStore.getState();

      expect(state.settings.dimensionSnapSameTypeOnly).toBe(false);
    });

    it('disables auto-save by default', () => {
      const state = useAppSettingsStore.getState();

      expect(state.settings.autoSave).toBe(false);
    });
  });

  describe('initSettings', () => {
    it('loads stored settings from preferences', async () => {
      const storedSettings: Partial<AppSettings> = {
        theme: 'light',
        defaultUnits: 'metric',
        confirmBeforeDelete: false
      };
      mockGetPreference.mockImplementation((key) => {
        if (key === 'appSettings') return Promise.resolve(storedSettings);
        return Promise.resolve(null);
      });

      await useAppSettingsStore.getState().initSettings();

      const state = useAppSettingsStore.getState();
      expect(state.settings.theme).toBe('light');
      expect(state.settings.defaultUnits).toBe('metric');
      expect(state.settings.confirmBeforeDelete).toBe(false);
      // Other settings should still have defaults
      expect(state.settings.showHotkeyHints).toBe(true);
    });

    it('sets isLoading to false after initialization', async () => {
      await useAppSettingsStore.getState().initSettings();

      const state = useAppSettingsStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it('sets isInitialized to true after initialization', async () => {
      await useAppSettingsStore.getState().initSettings();

      const state = useAppSettingsStore.getState();
      expect(state.isInitialized).toBe(true);
    });

    it('only initializes once when called multiple times', async () => {
      // First call should initialize
      await useAppSettingsStore.getState().initSettings();
      const callCountAfterFirst = mockGetPreference.mock.calls.length;

      // Second call should be a no-op since already initialized
      await useAppSettingsStore.getState().initSettings();
      const callCountAfterSecond = mockGetPreference.mock.calls.length;

      // The call count should not increase on second call
      expect(callCountAfterSecond).toBe(callCountAfterFirst);
    });

    it('migrates from individual preference fields if appSettings not found', async () => {
      mockGetPreference.mockImplementation((key) => {
        switch (key) {
          case 'appSettings':
            return Promise.resolve(null);
          case 'defaultUnits':
            return Promise.resolve('metric');
          case 'defaultGridSize':
            return Promise.resolve(0.125);
          case 'theme':
            return Promise.resolve('light');
          case 'confirmBeforeDelete':
            return Promise.resolve(false);
          case 'showHotkeyHints':
            return Promise.resolve(false);
          case 'stockConstraints':
            return Promise.resolve({
              constrainDimensions: false,
              constrainGrain: false,
              constrainColor: false,
              preventOverlap: false
            });
          default:
            return Promise.resolve(null);
        }
      });

      await useAppSettingsStore.getState().initSettings();

      const state = useAppSettingsStore.getState();
      expect(state.settings.defaultUnits).toBe('metric');
      expect(state.settings.defaultGridSize).toBe(0.125);
      expect(state.settings.theme).toBe('light');
      expect(state.settings.confirmBeforeDelete).toBe(false);
      expect(state.settings.showHotkeyHints).toBe(false);
      expect(state.settings.stockConstraints.constrainDimensions).toBe(false);
    });

    it('handles errors gracefully by using defaults', async () => {
      mockGetPreference.mockRejectedValue(new Error('Failed to load'));

      await useAppSettingsStore.getState().initSettings();

      const state = useAppSettingsStore.getState();
      expect(state.settings).toEqual(DEFAULT_SETTINGS);
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(true);
    });

    it('merges stored settings with defaults', async () => {
      // Only store some settings
      const partialSettings = {
        theme: 'light'
      };
      mockGetPreference.mockImplementation((key) => {
        if (key === 'appSettings') return Promise.resolve(partialSettings);
        return Promise.resolve(null);
      });

      await useAppSettingsStore.getState().initSettings();

      const state = useAppSettingsStore.getState();
      // Stored setting should be applied
      expect(state.settings.theme).toBe('light');
      // Default settings should be preserved
      expect(state.settings.defaultUnits).toBe('imperial');
      expect(state.settings.snapSensitivity).toBe('normal');
    });
  });

  describe('updateSettings', () => {
    beforeEach(async () => {
      // Return appSettings so initSettings doesn't use migration path
      mockGetPreference.mockImplementation((key) => {
        if (key === 'appSettings') return Promise.resolve(DEFAULT_SETTINGS);
        return Promise.resolve(null);
      });
      // Initialize the store first
      await useAppSettingsStore.getState().initSettings();
    });

    it('updates a single setting', async () => {
      await useAppSettingsStore.getState().updateSettings({ theme: 'light' });

      const state = useAppSettingsStore.getState();
      expect(state.settings.theme).toBe('light');
    });

    it('updates multiple settings at once', async () => {
      await useAppSettingsStore.getState().updateSettings({
        theme: 'light',
        defaultUnits: 'metric',
        confirmBeforeDelete: false
      });

      const state = useAppSettingsStore.getState();
      expect(state.settings.theme).toBe('light');
      expect(state.settings.defaultUnits).toBe('metric');
      expect(state.settings.confirmBeforeDelete).toBe(false);
    });

    it('preserves unchanged settings', async () => {
      // Ensure we start with known settings
      const initialSettings = useAppSettingsStore.getState().settings;
      expect(initialSettings.defaultUnits).toBe('imperial');
      expect(initialSettings.showHotkeyHints).toBe(true);

      // Update only theme
      await useAppSettingsStore.getState().updateSettings({ theme: 'light' });

      // Other settings should remain unchanged
      const state = useAppSettingsStore.getState();
      expect(state.settings.defaultUnits).toBe('imperial');
      expect(state.settings.showHotkeyHints).toBe(true);
    });

    it('persists settings to preferences', async () => {
      await useAppSettingsStore.getState().updateSettings({ theme: 'light' });

      expect(mockSetPreference).toHaveBeenCalledWith('theme', 'light');
    });

    it('persists all individual settings to preferences', async () => {
      await useAppSettingsStore.getState().updateSettings({
        defaultUnits: 'metric',
        liveGridSnap: true
      });

      expect(mockSetPreference).toHaveBeenCalledWith('defaultUnits', 'metric');
      expect(mockSetPreference).toHaveBeenCalledWith('liveGridSnap', true);
    });

    it('reverts on save error', async () => {
      mockSetPreference.mockRejectedValue(new Error('Save failed'));

      const originalTheme = useAppSettingsStore.getState().settings.theme;
      await useAppSettingsStore.getState().updateSettings({ theme: 'light' });

      // Should revert to original
      const state = useAppSettingsStore.getState();
      expect(state.settings.theme).toBe(originalTheme);
    });

    it('updates stock constraints', async () => {
      const newConstraints: StockConstraintSettings = {
        constrainDimensions: false,
        constrainGrain: false,
        constrainColor: true,
        preventOverlap: false
      };

      await useAppSettingsStore.getState().updateSettings({
        stockConstraints: newConstraints
      });

      const state = useAppSettingsStore.getState();
      expect(state.settings.stockConstraints).toEqual(newConstraints);
      expect(mockSetPreference).toHaveBeenCalledWith('stockConstraints', newConstraints);
    });

    it('updates snap sensitivity', async () => {
      await useAppSettingsStore.getState().updateSettings({
        snapSensitivity: 'tight'
      });

      const state = useAppSettingsStore.getState();
      expect(state.settings.snapSensitivity).toBe('tight');
      expect(mockSetPreference).toHaveBeenCalledWith('snapSensitivity', 'tight');
    });

    it('updates snap to origin', async () => {
      await useAppSettingsStore.getState().updateSettings({
        snapToOrigin: false
      });

      const state = useAppSettingsStore.getState();
      expect(state.settings.snapToOrigin).toBe(false);
      expect(mockSetPreference).toHaveBeenCalledWith('snapToOrigin', false);
    });

    it('updates dimension snap same type only', async () => {
      await useAppSettingsStore.getState().updateSettings({
        dimensionSnapSameTypeOnly: true
      });

      const state = useAppSettingsStore.getState();
      expect(state.settings.dimensionSnapSameTypeOnly).toBe(true);
      expect(mockSetPreference).toHaveBeenCalledWith('dimensionSnapSameTypeOnly', true);
    });

    it('updates auto-save', async () => {
      await useAppSettingsStore.getState().updateSettings({
        autoSave: true
      });

      const state = useAppSettingsStore.getState();
      expect(state.settings.autoSave).toBe(true);
      expect(mockSetPreference).toHaveBeenCalledWith('autoSave', true);
    });
  });

  // Note: Cross-instance settings sync tests are skipped because the listener
  // is set up once at module initialization, making it difficult to test
  // properly with mocks. The functionality is tested through integration tests.

  describe('settings validation', () => {
    it('accepts valid theme values', async () => {
      await useAppSettingsStore.getState().initSettings();

      await useAppSettingsStore.getState().updateSettings({ theme: 'light' });
      expect(useAppSettingsStore.getState().settings.theme).toBe('light');

      await useAppSettingsStore.getState().updateSettings({ theme: 'dark' });
      expect(useAppSettingsStore.getState().settings.theme).toBe('dark');

      await useAppSettingsStore.getState().updateSettings({ theme: 'system' });
      expect(useAppSettingsStore.getState().settings.theme).toBe('system');
    });

    it('accepts valid units values', async () => {
      await useAppSettingsStore.getState().initSettings();

      await useAppSettingsStore.getState().updateSettings({ defaultUnits: 'metric' });
      expect(useAppSettingsStore.getState().settings.defaultUnits).toBe('metric');

      await useAppSettingsStore.getState().updateSettings({ defaultUnits: 'imperial' });
      expect(useAppSettingsStore.getState().settings.defaultUnits).toBe('imperial');
    });

    it('accepts valid snap sensitivity values', async () => {
      await useAppSettingsStore.getState().initSettings();

      await useAppSettingsStore.getState().updateSettings({ snapSensitivity: 'tight' });
      expect(useAppSettingsStore.getState().settings.snapSensitivity).toBe('tight');

      await useAppSettingsStore.getState().updateSettings({ snapSensitivity: 'normal' });
      expect(useAppSettingsStore.getState().settings.snapSensitivity).toBe('normal');

      await useAppSettingsStore.getState().updateSettings({ snapSensitivity: 'loose' });
      expect(useAppSettingsStore.getState().settings.snapSensitivity).toBe('loose');
    });

    it('accepts valid grid size values', async () => {
      await useAppSettingsStore.getState().initSettings();

      await useAppSettingsStore.getState().updateSettings({ defaultGridSize: 0.125 });
      expect(useAppSettingsStore.getState().settings.defaultGridSize).toBe(0.125);

      await useAppSettingsStore.getState().updateSettings({ defaultGridSize: 1 });
      expect(useAppSettingsStore.getState().settings.defaultGridSize).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('handles partial stored settings (only some keys present)', async () => {
      // Only provide some settings, not all
      const partialSettings = {
        defaultUnits: 'metric',
        confirmBeforeDelete: false
      };
      mockGetPreference.mockImplementation((key) => {
        if (key === 'appSettings') return Promise.resolve(partialSettings);
        return Promise.resolve(null);
      });

      await useAppSettingsStore.getState().initSettings();

      const state = useAppSettingsStore.getState();
      // Stored values should be applied
      expect(state.settings.defaultUnits).toBe('metric');
      expect(state.settings.confirmBeforeDelete).toBe(false);
      // Missing values should use defaults
      expect(state.settings.theme).toBe('dark');
      expect(state.settings.showHotkeyHints).toBe(true);
    });

    it('handles null stored appSettings', async () => {
      mockGetPreference.mockResolvedValue(null);

      await useAppSettingsStore.getState().initSettings();

      const state = useAppSettingsStore.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('handles concurrent updateSettings calls', async () => {
      await useAppSettingsStore.getState().initSettings();

      // Fire multiple updates concurrently
      const updates = [
        useAppSettingsStore.getState().updateSettings({ theme: 'light' }),
        useAppSettingsStore.getState().updateSettings({ defaultUnits: 'metric' }),
        useAppSettingsStore.getState().updateSettings({ confirmBeforeDelete: false })
      ];

      await Promise.all(updates);

      const state = useAppSettingsStore.getState();
      expect(state.settings.theme).toBe('light');
      expect(state.settings.defaultUnits).toBe('metric');
      expect(state.settings.confirmBeforeDelete).toBe(false);
    });
  });
});
