import type { OpenDialogOptions, OpenDialogReturnValue, SaveDialogOptions, SaveDialogReturnValue } from 'electron';

import type { AnalyticsConsent, DesktopAnalyticsEvent } from './analytics';

// The contract the preload bridge exposes on `window.electronAPI`.
// Both the preload implementation and the renderer's global declaration
// import this, so the two cannot drift apart.
export interface ElectronAPI {
  onOpenProject: (callback: (filePath: string) => void) => () => void;
  onSettingsChanged: (callback: (changes: Record<string, unknown>) => void) => () => void;
  onMenuCommand: (callback: (command: string, ...args: unknown[]) => void) => () => void;
  getPreference: (key: string) => Promise<unknown>;
  setPreference: (key: string, value: unknown) => Promise<void>;
  captureAnalytics: (event: DesktopAnalyticsEvent) => void;
  getAnalyticsConsent: () => Promise<AnalyticsConsent>;
  setAnalyticsConsent: (consent: AnalyticsConsent, surface: 'onboarding' | 'settings') => Promise<{ success: boolean }>;
  showSaveDialog: (options: SaveDialogOptions) => Promise<SaveDialogReturnValue>;
  showOpenDialog: (options: OpenDialogOptions) => Promise<OpenDialogReturnValue>;
  queueTestSaveDialogPath: (filePath: string | null) => Promise<{ success: boolean; error?: string }>;
  queueTestOpenDialogPaths: (filePaths: string[] | null) => Promise<{ success: boolean; error?: string }>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, data: string) => Promise<void>;
  reloadWindow: (ignoreCache: boolean) => Promise<void>;
  writeBinaryFile: (filePath: string, data: number[]) => Promise<void>;
  showItemInFolder: (filePath: string) => Promise<{ success: boolean }>;
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
  setWindowTitle: (title: string) => Promise<void>;
  confirmClose: () => Promise<void>;
  cancelClose: () => Promise<void>;
  onBeforeClose: (callback: () => void) => () => void;
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  isTestMode: () => Promise<boolean>;
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
      thumbnailData?: { data: string; width: number; height: number; generatedAt: string; manuallySet?: boolean };
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
      thumbnailData?: { data: string; width: number; height: number; generatedAt: string; manuallySet?: boolean };
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
