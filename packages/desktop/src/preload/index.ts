import { contextBridge, ipcRenderer } from 'electron';
import type { AnalyticsConsent, DesktopAnalyticsEvent } from '../shared/analytics';

const analyticsTestBridgeEnabled =
  import.meta.env.PRELOAD_VITE_ANALYTICS_E2E === '1' && process.argv.includes('--analytics-e2e-control');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Project file operations
  onOpenProject: (callback: (filePath: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, filePath: string) => callback(filePath);
    ipcRenderer.on('open-project', handler);
    // Return cleanup function
    return () => ipcRenderer.removeListener('open-project', handler);
  },

  // Settings sync across instances
  onSettingsChanged: (callback: (changes: Record<string, unknown>) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, changes: Record<string, unknown>) => callback(changes);
    ipcRenderer.on('settings-changed', handler);
    // Return cleanup function
    return () => ipcRenderer.removeListener('settings-changed', handler);
  },

  // Menu commands from native menu
  onMenuCommand: (callback: (command: string, ...args: unknown[]) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, command: string, ...args: unknown[]) =>
      callback(command, ...args);
    ipcRenderer.on('menu-command', handler);
    // Return cleanup function
    return () => ipcRenderer.removeListener('menu-command', handler);
  },

  // Preferences
  getPreference: (key: string) => ipcRenderer.invoke('get-preference', key),
  setPreference: (key: string, value: unknown) => ipcRenderer.invoke('set-preference', key, value),

  // Analytics consent and capture
  captureAnalytics: (event: DesktopAnalyticsEvent) => {
    try {
      void ipcRenderer.invoke('analytics:capture', event).catch(() => undefined);
    } catch {
      // Analytics cannot affect renderer control flow.
    }
  },
  getAnalyticsConsent: () => ipcRenderer.invoke('analytics:get-consent'),
  setAnalyticsConsent: (consent: AnalyticsConsent, surface: 'onboarding' | 'settings') =>
    ipcRenderer.invoke('analytics:set-consent', consent, surface),
  ...(analyticsTestBridgeEnabled
    ? {
        analyticsTestSetMode: (mode: 'success' | 'offline' | 'timeout') =>
          ipcRenderer.invoke('analytics:test:set-mode', mode),
        analyticsTestGetState: () => ipcRenderer.invoke('analytics:test:get-state'),
        analyticsTestFlush: () => ipcRenderer.invoke('analytics:test:flush')
      }
    : {}),

  // File dialogs
  showSaveDialog: (options: Electron.SaveDialogOptions) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options: Electron.OpenDialogOptions) => ipcRenderer.invoke('show-open-dialog', options),
  queueTestSaveDialogPath: (filePath: string | null) => ipcRenderer.invoke('queue-test-save-dialog-path', filePath),
  queueTestOpenDialogPaths: (filePaths: string[] | null) =>
    ipcRenderer.invoke('queue-test-open-dialog-paths', filePaths),

  // File system (for project files only)
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath: string, data: string) => ipcRenderer.invoke('write-file', filePath, data),
  reloadWindow: (ignoreCache: boolean) => ipcRenderer.invoke('reload-window', ignoreCache),
  writeBinaryFile: (filePath: string, data: number[]) => ipcRenderer.invoke('write-binary-file', filePath, data),
  showItemInFolder: (filePath: string) => ipcRenderer.invoke('show-item-in-folder', filePath),

  // Recent projects
  getRecentProjects: () => ipcRenderer.invoke('get-recent-projects'),
  addRecentProject: (filePath: string) => ipcRenderer.invoke('add-recent-project', filePath),
  clearRecentProjects: () => ipcRenderer.invoke('clear-recent-projects'),
  removeRecentProject: (filePath: string) => ipcRenderer.invoke('remove-recent-project', filePath),
  updateRecentProjectPath: (oldPath: string, newPath: string) =>
    ipcRenderer.invoke('update-recent-project-path', oldPath, newPath),
  getFileStats: (filePaths: string[]) => ipcRenderer.invoke('get-file-stats', filePaths),
  getProjectThumbnails: (filePaths: string[]) => ipcRenderer.invoke('get-project-thumbnails', filePaths),

  // Favorite projects
  getFavoriteProjects: () => ipcRenderer.invoke('get-favorite-projects'),
  addFavoriteProject: (filePath: string) => ipcRenderer.invoke('add-favorite-project', filePath),
  removeFavoriteProject: (filePath: string) => ipcRenderer.invoke('remove-favorite-project', filePath),
  isFavoriteProject: (filePath: string) => ipcRenderer.invoke('is-favorite-project', filePath),
  reorderFavoriteProjects: (filePaths: string[]) => ipcRenderer.invoke('reorder-favorite-projects', filePaths),

  // Window title
  setWindowTitle: (title: string) => ipcRenderer.invoke('set-window-title', title),

  // Window close confirmation
  confirmClose: () => ipcRenderer.invoke('confirm-close'),
  cancelClose: () => ipcRenderer.invoke('cancel-close'),
  onBeforeClose: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('before-close', handler);
    return () => ipcRenderer.removeListener('before-close', handler);
  },

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  isTestMode: () => ipcRenderer.invoke('is-test-mode'),
  openLicensesFile: () => ipcRenderer.invoke('open-licenses-file'),

  // License management
  verifyLicense: (licenseKey: string) => ipcRenderer.invoke('verify-license', licenseKey),
  activateLicense: (licenseKey: string) => ipcRenderer.invoke('activate-license', licenseKey),
  getLicenseData: () => ipcRenderer.invoke('get-license-data'),
  getLicenseKey: () => ipcRenderer.invoke('get-license-key'),
  checkLicenseValid: () => ipcRenderer.invoke('check-license-valid'),
  deactivateLicense: () => ipcRenderer.invoke('deactivate-license'),

  // Trial system
  getTrialStatus: () => ipcRenderer.invoke('get-trial-status'),
  acknowledgeTrialExpired: () => ipcRenderer.invoke('acknowledge-trial-expired'),
  resetTrial: () => ipcRenderer.invoke('reset-trial'), // Dev only
  simulateTrialDays: (daysRemaining: number) => ipcRenderer.invoke('simulate-trial-days', daysRemaining), // Dev only
  simulateTrialExpired: () => ipcRenderer.invoke('simulate-trial-expired'), // Dev only

  // Welcome/onboarding
  getHasCompletedWelcome: () => ipcRenderer.invoke('get-has-completed-welcome'),
  setHasCompletedWelcome: (completed: boolean) => ipcRenderer.invoke('set-has-completed-welcome', completed),
  resetWelcomeTutorial: () => ipcRenderer.invoke('reset-welcome-tutorial'),

  // User templates
  getUserTemplates: () => ipcRenderer.invoke('get-user-templates'),
  addUserTemplate: (template: {
    id: string;
    name: string;
    description: string;
    dimensions: { width: number; depth: number; height: number };
    partCount: number;
    thumbnail: string;
    thumbnailData?: { data: string; width: number; height: number; generatedAt: string };
    category: 'furniture' | 'storage' | 'shop' | 'other';
    createdAt: string;
    project: string;
  }) => ipcRenderer.invoke('add-user-template', template),
  updateUserTemplate: (
    id: string,
    updates: Partial<{
      name: string;
      description: string;
      dimensions: { width: number; depth: number; height: number };
      partCount: number;
      thumbnail: string;
      thumbnailData?: { data: string; width: number; height: number; generatedAt: string };
      category: 'furniture' | 'storage' | 'shop' | 'other';
      project: string;
    }>
  ) => ipcRenderer.invoke('update-user-template', id, updates),
  removeUserTemplate: (id: string) => ipcRenderer.invoke('remove-user-template', id),
  trackTemplateUsage: (id: string) => ipcRenderer.invoke('track-template-usage', id),

  // Custom colors (user-saved palette)
  getCustomColors: () => ipcRenderer.invoke('get-custom-colors'),
  addCustomColor: (color: string) => ipcRenderer.invoke('add-custom-color', color),
  removeCustomColor: (color: string) => ipcRenderer.invoke('remove-custom-color', color),
  setCustomColors: (colors: string[]) => ipcRenderer.invoke('set-custom-colors', colors),

  // App state export/import
  exportAppState: () => ipcRenderer.invoke('export-app-state'),
  previewImportAppState: () => ipcRenderer.invoke('preview-import-app-state'),
  importAppState: (
    filePath: string,
    options: {
      mergeStrategy: 'replace' | 'merge';
      includeTemplates: boolean;
      includeAssemblies: boolean;
      includeStocks: boolean;
      includeColors: boolean;
    }
  ) => ipcRenderer.invoke('import-app-state', filePath, options),

  // Individual item export/import
  exportTemplate: (templateId: string) => ipcRenderer.invoke('export-template', templateId),
  exportAssembly: (assemblyId: string) => ipcRenderer.invoke('export-assembly', assemblyId),
  exportStocks: (stockIds: string[]) => ipcRenderer.invoke('export-stocks', stockIds),
  importTemplate: (options?: { replaceIfExists?: boolean }) => ipcRenderer.invoke('import-template', options),
  importAssembly: (options?: { replaceIfExists?: boolean; importStocks?: boolean }) =>
    ipcRenderer.invoke('import-assembly', options),
  importStocks: (options?: { replaceIfExists?: boolean }) => ipcRenderer.invoke('import-stocks', options),

  // Window controls
  setTitleBarOverlay: (options: { color: string; symbolColor: string }) =>
    ipcRenderer.invoke('set-title-bar-overlay', options),

  // Print to PDF
  printToPdf: (options: { defaultFileName?: string; landscape?: boolean }) =>
    ipcRenderer.invoke('print-to-pdf', options),

  // Auto-recovery
  getRecoveryDir: () => ipcRenderer.invoke('get-recovery-dir'),
  saveRecoveryFile: (fileName: string, data: string) => ipcRenderer.invoke('save-recovery-file', fileName, data),
  readRecoveryFile: (fileName: string) => ipcRenderer.invoke('read-recovery-file', fileName),
  deleteRecoveryFile: (fileName: string) => ipcRenderer.invoke('delete-recovery-file', fileName),
  listRecoveryFiles: () => ipcRenderer.invoke('list-recovery-files'),

  // Open external links
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  getUpdateInfo: () => ipcRenderer.invoke('get-update-info'),
  onUpdateAvailable: (callback: (info: { version: string; releaseNotes?: string; releaseDate?: string }) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      info: { version: string; releaseNotes?: string; releaseDate?: string }
    ) => callback(info);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },
  onUpdateDownloadProgress: (callback: (progress: { percent: number; transferred: number; total: number }) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      progress: { percent: number; transferred: number; total: number }
    ) => callback(progress);
    ipcRenderer.on('update-download-progress', handler);
    return () => ipcRenderer.removeListener('update-download-progress', handler);
  },
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: { version: string }) => callback(info);
    ipcRenderer.on('update-downloaded', handler);
    return () => ipcRenderer.removeListener('update-downloaded', handler);
  },
  onUpdateError: (callback: (error: { message: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, error: { message: string }) => callback(error);
    ipcRenderer.on('update-error', handler);
    return () => ipcRenderer.removeListener('update-error', handler);
  },
  onUpdateJustInstalled: (callback: (info: { previousVersion: string; currentVersion: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: { previousVersion: string; currentVersion: string }) =>
      callback(info);
    ipcRenderer.on('update-just-installed', handler);
    return () => ipcRenderer.removeListener('update-just-installed', handler);
  }
});

// The API contract lives in src/shared/electronAPI.ts so the renderer's
// global declaration and this implementation share one definition.
import type { ElectronAPI } from '../shared/electronAPI';

export type { ElectronAPI };

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
