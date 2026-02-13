import { contextBridge, ipcRenderer } from 'electron';

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

  // File dialogs
  showSaveDialog: (options: Electron.SaveDialogOptions) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options: Electron.OpenDialogOptions) => ipcRenderer.invoke('show-open-dialog', options),

  // File system (for project files only)
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath: string, data: string) => ipcRenderer.invoke('write-file', filePath, data),
  writeBinaryFile: (filePath: string, data: number[]) => ipcRenderer.invoke('write-binary-file', filePath, data),

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

  // New project defaults
  getNewProjectDefaults: () => ipcRenderer.invoke('get-new-project-defaults'),
  setNewProjectDefaults: (defaults: {
    units?: 'imperial' | 'metric';
    addCommonMaterials?: boolean;
    selectedMaterials?: string[];
    skipSetupDialog?: boolean;
  }) => ipcRenderer.invoke('set-new-project-defaults', defaults),

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

// Type definitions for the exposed API
export interface ElectronAPI {
  onOpenProject: (callback: (filePath: string) => void) => () => void;
  onSettingsChanged: (callback: (changes: Record<string, unknown>) => void) => () => void;
  onMenuCommand: (callback: (command: string, ...args: unknown[]) => void) => () => void;
  getPreference: (key: string) => Promise<unknown>;
  setPreference: (key: string, value: unknown) => Promise<void>;
  showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>;
  showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, data: string) => Promise<void>;
  writeBinaryFile: (filePath: string, data: number[]) => Promise<void>;
  getRecentProjects: () => Promise<string[]>;
  addRecentProject: (filePath: string) => Promise<void>;
  clearRecentProjects: () => Promise<void>;
  removeRecentProject: (filePath: string) => Promise<{ success: boolean }>;
  updateRecentProjectPath: (oldPath: string, newPath: string) => Promise<{ success: boolean }>;
  getFileStats: (filePaths: string[]) => Promise<{ path: string; modifiedAt: string | null }[]>;
  getProjectThumbnails: (
    filePaths: string[]
  ) => Promise<{ path: string; thumbnail: { data: string; width: number; height: number } | null }[]>;
  getFavoriteProjects: () => Promise<string[]>;
  addFavoriteProject: (filePath: string) => Promise<{ success: boolean }>;
  removeFavoriteProject: (filePath: string) => Promise<{ success: boolean }>;
  isFavoriteProject: (filePath: string) => Promise<boolean>;
  reorderFavoriteProjects: (filePaths: string[]) => Promise<{ success: boolean }>;
  getNewProjectDefaults: () => Promise<{
    units: 'imperial' | 'metric';
    addCommonMaterials: boolean;
    selectedMaterials: string[];
    skipSetupDialog: boolean;
  }>;
  setNewProjectDefaults: (defaults: {
    units?: 'imperial' | 'metric';
    addCommonMaterials?: boolean;
    selectedMaterials?: string[];
    skipSetupDialog?: boolean;
  }) => Promise<{ success: boolean }>;
  setWindowTitle: (title: string) => Promise<void>;
  confirmClose: () => Promise<void>;
  cancelClose: () => Promise<void>;
  onBeforeClose: (callback: () => void) => () => void;
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  openLicensesFile: () => Promise<{ success: boolean; error?: string }>;
  verifyLicense: (licenseKey: string) => Promise<{
    valid: boolean;
    data?: {
      email: string;
      customerName: string;
      orderId: number;
      productName: string;
      variantName: string;
      status: string;
      activationLimit: number;
      activationUsage: number;
      expiresAt: string | null;
      validatedAt: number;
    };
    error?: string;
    requiresActivation?: boolean;
  }>;
  activateLicense: (licenseKey: string) => Promise<{
    valid: boolean;
    data?: {
      email: string;
      customerName: string;
      orderId: number;
      productName: string;
      variantName: string;
      status: string;
      activationLimit: number;
      activationUsage: number;
      expiresAt: string | null;
      validatedAt: number;
    };
    error?: string;
  }>;
  getLicenseData: () => Promise<{
    email: string;
    customerName: string;
    orderId: number;
    productName: string;
    variantName: string;
    status: string;
    activationLimit: number;
    activationUsage: number;
    expiresAt: string | null;
    validatedAt: number;
  } | null>;
  getLicenseKey: () => Promise<string | null>;
  checkLicenseValid: () => Promise<{ valid: boolean; error?: string }>;
  deactivateLicense: () => Promise<{ success: boolean; error?: string }>;
  // Trial system
  getTrialStatus: () => Promise<{
    isTrialActive: boolean;
    isTrialExpired: boolean;
    daysRemaining: number;
    shouldShowBanner: boolean;
    trialStartDate: number | null;
    trialEndDate: number | null;
  }>;
  acknowledgeTrialExpired: () => Promise<void>;
  resetTrial: () => Promise<{
    isTrialActive: boolean;
    isTrialExpired: boolean;
    daysRemaining: number;
    shouldShowBanner: boolean;
    trialStartDate: number | null;
    trialEndDate: number | null;
  }>;
  simulateTrialDays: (daysRemaining: number) => Promise<{
    isTrialActive: boolean;
    isTrialExpired: boolean;
    daysRemaining: number;
    shouldShowBanner: boolean;
    trialStartDate: number | null;
    trialEndDate: number | null;
  }>;
  simulateTrialExpired: () => Promise<{
    isTrialActive: boolean;
    isTrialExpired: boolean;
    daysRemaining: number;
    shouldShowBanner: boolean;
    trialStartDate: number | null;
    trialEndDate: number | null;
  }>;
  getHasCompletedWelcome: () => Promise<boolean>;
  setHasCompletedWelcome: (completed: boolean) => Promise<{ success: boolean }>;
  resetWelcomeTutorial: () => Promise<{ success: boolean }>;
  getUserTemplates: () => Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      dimensions: { width: number; depth: number; height: number };
      partCount: number;
      thumbnail: string;
      thumbnailData?: { data: string; width: number; height: number; generatedAt: string };
      category: 'furniture' | 'storage' | 'shop' | 'other';
      createdAt: string;
      lastUsedAt?: string;
      project: string;
    }>
  >;
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
  }) => Promise<{ success: boolean }>;
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
  ) => Promise<{ success: boolean }>;
  removeUserTemplate: (id: string) => Promise<{ success: boolean }>;
  trackTemplateUsage: (id: string) => Promise<{ success: boolean }>;
  getCustomColors: () => Promise<string[]>;
  addCustomColor: (color: string) => Promise<boolean>;
  removeCustomColor: (color: string) => Promise<{ success: boolean }>;
  setCustomColors: (colors: string[]) => Promise<{ success: boolean }>;
  // App state export/import
  exportAppState: () => Promise<{
    success: boolean;
    canceled?: boolean;
    filePath?: string;
    error?: string;
  }>;
  previewImportAppState: () => Promise<{
    success: boolean;
    canceled?: boolean;
    filePath?: string;
    error?: string;
    errors?: string[];
    preview?: {
      valid: boolean;
      errors: string[];
      counts: {
        templates: number;
        assemblies: number;
        stocks: number;
        colors: number;
      };
      duplicates: {
        templates: string[];
        assemblies: string[];
        stocks: string[];
      };
    };
  }>;
  importAppState: (
    filePath: string,
    options: {
      mergeStrategy: 'replace' | 'merge';
      includeTemplates: boolean;
      includeAssemblies: boolean;
      includeStocks: boolean;
      includeColors: boolean;
    }
  ) => Promise<{
    success: boolean;
    imported: {
      templates: number;
      assemblies: number;
      stocks: number;
      colors: number;
    };
    skipped: {
      templates: number;
      assemblies: number;
      stocks: number;
    };
    errors: string[];
  }>;
  // Individual item export/import
  exportTemplate: (templateId: string) => Promise<{
    success: boolean;
    canceled?: boolean;
    filePath?: string;
    error?: string;
  }>;
  exportAssembly: (assemblyId: string) => Promise<{
    success: boolean;
    canceled?: boolean;
    filePath?: string;
    stocksIncluded?: number;
    error?: string;
  }>;
  exportStocks: (stockIds: string[]) => Promise<{
    success: boolean;
    canceled?: boolean;
    filePath?: string;
    count?: number;
    error?: string;
  }>;
  importTemplate: (options?: { replaceIfExists?: boolean }) => Promise<{
    success: boolean;
    canceled?: boolean;
    templateId?: string;
    error?: string;
  }>;
  importAssembly: (options?: { replaceIfExists?: boolean; importStocks?: boolean }) => Promise<{
    success: boolean;
    canceled?: boolean;
    assemblyId?: string;
    stocksImported?: number;
    error?: string;
  }>;
  importStocks: (options?: { replaceIfExists?: boolean }) => Promise<{
    success: boolean;
    canceled?: boolean;
    imported?: number;
    skipped?: number;
    error?: string;
  }>;
  setTitleBarOverlay: (options: { color: string; symbolColor: string }) => Promise<void>;
  printToPdf: (options: { defaultFileName?: string; landscape?: boolean }) => Promise<{
    success: boolean;
    canceled?: boolean;
    filePath?: string;
    error?: string;
  }>;
  getRecoveryDir: () => Promise<string>;
  saveRecoveryFile: (fileName: string, data: string) => Promise<string>;
  readRecoveryFile: (fileName: string) => Promise<string | null>;
  deleteRecoveryFile: (fileName: string) => Promise<boolean>;
  listRecoveryFiles: () => Promise<string[]>;
  openExternal: (url: string) => Promise<void>;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  quitAndInstall: () => Promise<void>;
  getUpdateInfo: () => Promise<{ version: string; releaseNotes?: string; releaseDate?: string } | null>;
  onUpdateAvailable: (
    callback: (info: { version: string; releaseNotes?: string; releaseDate?: string }) => void
  ) => () => void;
  onUpdateDownloadProgress: (
    callback: (progress: { percent: number; transferred: number; total: number }) => void
  ) => () => void;
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void;
  onUpdateError: (callback: (error: { message: string }) => void) => () => void;
  onUpdateJustInstalled: (callback: (info: { previousVersion: string; currentVersion: string }) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
