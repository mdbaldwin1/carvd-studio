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
    const handler = (_event: Electron.IpcRendererEvent, command: string, ...args: unknown[]) => callback(command, ...args);
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

  // Window title
  setWindowTitle: (title: string) => ipcRenderer.invoke('set-window-title', title),

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  // License management
  verifyLicense: (licenseKey: string) => ipcRenderer.invoke('verify-license', licenseKey),
  getLicenseData: () => ipcRenderer.invoke('get-license-data'),
  checkLicenseValid: () => ipcRenderer.invoke('check-license-valid'),
  deactivateLicense: () => ipcRenderer.invoke('deactivate-license'),

  // Welcome/onboarding
  getHasCompletedWelcome: () => ipcRenderer.invoke('get-has-completed-welcome'),
  setHasCompletedWelcome: (completed: boolean) => ipcRenderer.invoke('set-has-completed-welcome', completed),
  resetWelcomeTutorial: () => ipcRenderer.invoke('reset-welcome-tutorial'),

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
  listRecoveryFiles: () => ipcRenderer.invoke('list-recovery-files')
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
  setWindowTitle: (title: string) => Promise<void>;
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  verifyLicense: (licenseKey: string) => Promise<{ valid: boolean; data?: { email: string; orderId: string; product: string; licenseType: string; iat: number; exp: number | null }; error?: string }>;
  getLicenseData: () => Promise<{ licenseKey: string | null; licenseEmail: string | null; licenseOrderId: string | null; licenseActivatedAt: string | null }>;
  checkLicenseValid: () => Promise<{ valid: boolean; error?: string }>;
  deactivateLicense: () => Promise<{ success: boolean }>;
  getHasCompletedWelcome: () => Promise<boolean>;
  setHasCompletedWelcome: (completed: boolean) => Promise<{ success: boolean }>;
  resetWelcomeTutorial: () => Promise<{ success: boolean }>;
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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
