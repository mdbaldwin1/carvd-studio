// Type definitions for the Electron API exposed via preload
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
  showItemInFolder: (filePath: string) => Promise<{ success: boolean }>;
  getRecentProjects: () => Promise<string[]>;
  addRecentProject: (filePath: string) => Promise<void>;
  clearRecentProjects: () => Promise<void>;
  setWindowTitle: (title: string) => Promise<void>;
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  verifyLicense: (licenseKey: string) => Promise<{
    valid: boolean;
    data?: {
      email: string;
      orderId: string;
      product: string;
      licenseType: string;
      iat: number;
      exp: number | null;
    };
    error?: string;
  }>;
  getLicenseData: () => Promise<{
    licenseKey: string | null;
    licenseEmail: string | null;
    licenseOrderId: string | null;
    licenseActivatedAt: string | null;
  }>;
  checkLicenseValid: () => Promise<{ valid: boolean; error?: string }>;
  deactivateLicense: () => Promise<{ success: boolean }>;
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
  openExternal?: (url: string) => Promise<void>;
  // Auto-updater
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
  onUpdateJustInstalled?: (callback: (info: { previousVersion: string; currentVersion: string }) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
