import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { join, normalize, isAbsolute } from 'path';
import { readFile, writeFile, unlink, access, readdir, mkdir, stat } from 'fs/promises';
import log from 'electron-log';
import {
  store,
  getWindowBounds,
  setWindowBounds,
  addRecentProject,
  getRecentProjects,
  clearRecentProjects,
  removeRecentProject,
  updateRecentProjectPath,
  getFavoriteProjects,
  addFavoriteProject,
  removeFavoriteProject,
  isFavoriteProject,
  setFavoriteProjects,
  getNewProjectDefaults,
  setNewProjectDefaults,
  NewProjectDefaults,
  getHasCompletedWelcome,
  setHasCompletedWelcome,
  getUserTemplates,
  addUserTemplate,
  updateUserTemplate,
  removeUserTemplate,
  trackTemplateUsage,
  UserTemplateItem,
  seedDefaultLibraries,
  getCustomColors,
  addCustomColor,
  removeCustomColor,
  setCustomColors,
  exportAppState,
  importAppState,
  validateAppStateExport,
  previewImport,
  AppStateExport,
  ImportOptions,
  exportTemplate,
  exportAssembly,
  exportStocks,
  validateTemplateExport,
  validateAssemblyExport,
  validateStocksExport,
  importTemplate,
  importAssembly,
  importStocks,
  TemplateExport,
  AssemblyExport,
  StocksExport
} from './store';
import { createApplicationMenu, refreshMenu } from './menu';
import {
  verifyLicense,
  activateLicenseKey,
  deactivateLicenseKey,
  getStoredLicenseKey,
  getStoredLicenseData
} from './license';
import { initializeAutoUpdater, checkForUpdates, downloadUpdate, quitAndInstall, getUpdateInfo } from './updater';
import {
  getTrialStatus,
  acknowledgeTrialExpired,
  resetTrialAcknowledgement,
  resetTrial,
  simulateTrialDaysRemaining,
  simulateTrialExpired
} from './trial';

// =============================================================================
// Global Error Handlers
// =============================================================================

process.on('uncaughtException', (error) => {
  log.error('[Main] Uncaught exception:', error);
  // Show error dialog in production only (not dev or test mode).
  // dialog.showErrorBox() is synchronous and blocks the main thread,
  // which would hang E2E tests and prevent BrowserWindow creation.
  const isTestMode = process.env.NODE_ENV === 'test' || process.argv.includes('--test-mode');
  if (process.env.NODE_ENV !== 'development' && !isTestMode) {
    dialog.showErrorBox(
      'Unexpected Error',
      'An unexpected error occurred. The application may be unstable. Please save your work and restart.'
    );
  }
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('[Main] Unhandled rejection at:', promise, 'reason:', reason);
});

// =============================================================================
// Security: Path Validation Utilities
// =============================================================================

/**
 * Validate that a file path is safe for file operations.
 * Prevents path traversal attacks and restricts to allowed directories.
 */
function isPathSafe(filePath: string): boolean {
  if (!filePath || typeof filePath !== 'string') {
    return false;
  }

  // Must be absolute path
  if (!isAbsolute(filePath)) {
    return false;
  }

  // Normalize and check for path traversal
  const normalizedPath = normalize(filePath);
  if (normalizedPath !== filePath.replace(/\\/g, '/').replace(/\/+/g, '/')) {
    // Path contained traversal sequences that got normalized out
    if (filePath.includes('..')) {
      return false;
    }
  }

  // Block null bytes (used in some path traversal attacks)
  if (filePath.includes('\0')) {
    return false;
  }

  return true;
}

/**
 * Validate that a recovery file name is safe (no path separators)
 */
function isRecoveryFileNameSafe(fileName: string): boolean {
  if (!fileName || typeof fileName !== 'string') {
    return false;
  }

  // Must not contain path separators
  if (fileName.includes('/') || fileName.includes('\\')) {
    return false;
  }

  // Must not contain null bytes
  if (fileName.includes('\0')) {
    return false;
  }

  // Must end with expected extension
  if (!fileName.endsWith('.carvd-recovery')) {
    return false;
  }

  return true;
}

/**
 * Validate that a URL is safe to open externally
 */
function isUrlSafe(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    // Only allow safe protocols
    const allowedProtocols = ['https:', 'http:', 'mailto:'];
    return allowedProtocols.includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Auto-recovery directory in user data folder
function getAutoRecoveryDir(): string {
  return join(app.getPath('userData'), 'recovery');
}

// Ensure recovery directory exists
async function ensureRecoveryDir(): Promise<void> {
  try {
    await access(getAutoRecoveryDir());
  } catch {
    await mkdir(getAutoRecoveryDir(), { recursive: true });
  }
}

// Track all open windows
const windows: Set<BrowserWindow> = new Set();

// Track windows that are allowed to close (after user confirmed or chose to discard)
const windowsAllowedToClose: Set<BrowserWindow> = new Set();

// Splash window reference and timing
let splashWindow: BrowserWindow | null = null;
let splashStartTime: number = 0;
const MINIMUM_SPLASH_DURATION = 1500; // 1.5 seconds minimum

function createSplashWindow(): BrowserWindow {
  splashStartTime = Date.now();
  const splash = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    center: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  splash.loadFile(join(__dirname, 'splash.html'));
  splash.show();

  return splash;
}

// File to open after window is ready (for file association)
let pendingFileToOpen: string | null = null;

function createWindow(fileToOpen?: string): BrowserWindow {
  const bounds = getWindowBounds();
  const isMac = process.platform === 'darwin';
  const isTest = process.env.NODE_ENV === 'test' || process.argv.includes('--test-mode');

  // Offset new windows slightly from existing ones
  const offset = windows.size * 30;

  const newWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: (bounds.x ?? 100) + offset,
    y: (bounds.y ?? 100) + offset,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Carvd Studio',
    // Custom title bar configuration
    // NOTE: titleBarOverlay is disabled in test mode because of an Electron
    // bug (electron/electron#42409) where the combination of titleBarStyle
    // 'hidden' + titleBarOverlay + show:false prevents ready-to-show from
    // ever firing on Windows, which hangs Playwright's electron.launch().
    titleBarStyle: isMac ? 'hiddenInset' : isTest ? undefined : 'hidden',
    titleBarOverlay:
      !isMac && !isTest
        ? {
            color: '#1e1e1e',
            symbolColor: '#ffffff',
            height: 48
          }
        : undefined,
    trafficLightPosition: isMac ? { x: 16, y: 14 } : undefined,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // SECURITY NOTE: Sandbox is disabled because the preload script requires
      // access to Node.js APIs (electron-store, fs operations via IPC).
      // Security is maintained through:
      // 1. contextIsolation: true - renderer cannot access preload scope
      // 2. nodeIntegration: false - renderer cannot use Node.js directly
      // 3. All IPC handlers validate their inputs (path traversal, URL protocols)
      // 4. Only specific, validated operations are exposed via contextBridge
      sandbox: false
    }
  });

  windows.add(newWindow);

  // Show window when ready to avoid flicker
  newWindow.on('ready-to-show', () => {
    const showMainWindow = () => {
      // Close splash screen if it exists
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }

      newWindow.show();
      // If there's a file to open, send it to the renderer
      if (fileToOpen) {
        newWindow.webContents.send('open-project', fileToOpen);
      }
    };

    // Ensure splash screen is shown for minimum duration
    const elapsed = Date.now() - splashStartTime;
    const remaining = MINIMUM_SPLASH_DURATION - elapsed;

    if (remaining > 0) {
      setTimeout(showMainWindow, remaining);
    } else {
      showMainWindow();
    }
  });

  // Fallback: force-show after 5s if ready-to-show never fires.
  // Works around Electron bug on Windows where titleBarOverlay + show:false
  // can prevent the event from firing (electron/electron#42409).
  if (isTest) {
    setTimeout(() => {
      if (!newWindow.isDestroyed() && !newWindow.isVisible()) {
        log.warn('[Main] ready-to-show did not fire in time, force-showing window');
        newWindow.show();
      }
    }, 5000);
  }

  // Intercept close to check for unsaved changes
  newWindow.on('close', (event) => {
    // Save window bounds
    const currentBounds = newWindow.getBounds();
    setWindowBounds(currentBounds);

    // If this window is allowed to close, proceed
    if (windowsAllowedToClose.has(newWindow)) {
      windowsAllowedToClose.delete(newWindow);
      return; // Allow close to proceed
    }

    // Otherwise, ask the renderer if there are unsaved changes
    event.preventDefault();
    newWindow.webContents.send('before-close');
  });

  newWindow.on('closed', () => {
    windows.delete(newWindow);
    windowsAllowedToClose.delete(newWindow);
  });

  // Open external links in default browser
  newWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    newWindow.loadURL('http://localhost:5173');
    newWindow.webContents.openDevTools();
  } else {
    newWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return newWindow;
}

// Handle file open from OS (double-click .carvd file)
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (filePath.endsWith('.carvd')) {
    addRecentProject(filePath);
    // If app is ready, create a new window with this file
    if (app.isReady()) {
      createWindow(filePath);
    } else {
      // App not ready yet, store for later
      pendingFileToOpen = filePath;
    }
  }
});

// IPC Handlers
ipcMain.handle('get-preference', (_event, key: string) => {
  return store.get(key as keyof typeof store.store);
});

ipcMain.handle('set-preference', (_event, key: string, value: unknown) => {
  store.set(key as keyof typeof store.store, value as never);
});

ipcMain.handle('show-save-dialog', async (_event, options) => {
  return dialog.showSaveDialog(options);
});

ipcMain.handle('show-open-dialog', async (_event, options) => {
  return dialog.showOpenDialog(options);
});

ipcMain.handle('read-file', async (_event, filePath: string) => {
  if (!isPathSafe(filePath)) {
    throw new Error('Invalid file path');
  }
  return readFile(filePath, 'utf-8');
});

ipcMain.handle('write-file', async (_event, filePath: string, data: string) => {
  if (!isPathSafe(filePath)) {
    throw new Error('Invalid file path');
  }
  if (typeof data !== 'string') {
    throw new Error('Invalid data type');
  }
  await writeFile(filePath, data, 'utf-8');
});

// Write binary file (for PDFs, images, etc.)
ipcMain.handle('write-binary-file', async (_event, filePath: string, data: number[]) => {
  if (!isPathSafe(filePath)) {
    throw new Error('Invalid file path');
  }
  if (!Array.isArray(data)) {
    throw new Error('Invalid data type');
  }
  const buffer = Buffer.from(data);
  await writeFile(filePath, buffer);
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

ipcMain.handle('open-licenses-file', async () => {
  // In production, the resources folder is in the app bundle
  // In development, it's relative to the project
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  let licensesPath: string;

  if (isDev) {
    licensesPath = join(__dirname, '../../resources/THIRD_PARTY_LICENSES.txt');
  } else {
    // In production, resources are in the app's resources folder
    licensesPath = join(process.resourcesPath, 'THIRD_PARTY_LICENSES.txt');
  }

  try {
    await shell.openPath(licensesPath);
    return { success: true };
  } catch (error) {
    log.error('Failed to open licenses file:', error);
    return { success: false, error: String(error) };
  }
});

// License management
ipcMain.handle('verify-license', async (_event, licenseKey: string) => {
  const result = await verifyLicense(licenseKey);
  // License data is now cached automatically in license.ts
  return result;
});

ipcMain.handle('activate-license', async (_event, licenseKey: string) => {
  return await activateLicenseKey(licenseKey);
});

ipcMain.handle('get-license-data', () => {
  return getStoredLicenseData();
});

ipcMain.handle('get-license-key', () => {
  return getStoredLicenseKey();
});

ipcMain.handle('check-license-valid', async () => {
  const licenseKey = getStoredLicenseKey();
  if (!licenseKey) {
    return { valid: false };
  }
  return await verifyLicense(licenseKey);
});

ipcMain.handle('deactivate-license', async () => {
  return await deactivateLicenseKey();
});

// Trial system
ipcMain.handle('get-trial-status', () => {
  return getTrialStatus();
});

ipcMain.handle('acknowledge-trial-expired', () => {
  acknowledgeTrialExpired();
});

// Dev only - for testing trial reset
ipcMain.handle('reset-trial', () => {
  resetTrial();
  return getTrialStatus();
});

// Dev only - simulate trial with X days remaining
ipcMain.handle('simulate-trial-days', (_event, daysRemaining: number) => {
  return simulateTrialDaysRemaining(daysRemaining);
});

// Dev only - simulate expired trial
ipcMain.handle('simulate-trial-expired', () => {
  return simulateTrialExpired();
});

// Welcome/onboarding
ipcMain.handle('get-has-completed-welcome', () => {
  return getHasCompletedWelcome();
});

ipcMain.handle('set-has-completed-welcome', (_event, completed: boolean) => {
  setHasCompletedWelcome(completed);
  return { success: true };
});

ipcMain.handle('reset-welcome-tutorial', () => {
  setHasCompletedWelcome(false);
  return { success: true };
});

// User templates
ipcMain.handle('get-user-templates', () => {
  return getUserTemplates();
});

ipcMain.handle('add-user-template', (_event, template: UserTemplateItem) => {
  addUserTemplate(template);
  return { success: true };
});

ipcMain.handle('update-user-template', (_event, id: string, updates: Partial<UserTemplateItem>) => {
  updateUserTemplate(id, updates);
  return { success: true };
});

ipcMain.handle('remove-user-template', (_event, id: string) => {
  removeUserTemplate(id);
  return { success: true };
});

ipcMain.handle('track-template-usage', (_event, id: string) => {
  trackTemplateUsage(id);
  return { success: true };
});

// Custom colors
ipcMain.handle('get-custom-colors', () => {
  return getCustomColors();
});

ipcMain.handle('add-custom-color', (_event, color: string) => {
  return addCustomColor(color);
});

ipcMain.handle('remove-custom-color', (_event, color: string) => {
  removeCustomColor(color);
  return { success: true };
});

ipcMain.handle('set-custom-colors', (_event, colors: string[]) => {
  setCustomColors(colors);
  return { success: true };
});

// App state export/import
ipcMain.handle('export-app-state', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { success: false, error: 'No window available' };

  try {
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Export App State',
      defaultPath: `carvd-backup-${new Date().toISOString().split('T')[0]}.carvd-backup`,
      filters: [{ name: 'Carvd Backup', extensions: ['carvd-backup'] }]
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    const exportData = exportAppState(app.getVersion());
    await writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8');

    return { success: true, filePath };
  } catch (error) {
    log.error('Failed to export app state:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('preview-import-app-state', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { success: false, error: 'No window available' };

  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Import App State',
      filters: [{ name: 'Carvd Backup', extensions: ['carvd-backup'] }],
      properties: ['openFile']
    });

    if (canceled || !filePaths.length) {
      return { success: false, canceled: true };
    }

    const content = await readFile(filePaths[0], 'utf-8');
    let data: unknown;
    try {
      data = JSON.parse(content);
    } catch {
      return { success: false, error: 'Invalid JSON format' };
    }

    const validation = validateAppStateExport(data);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const preview = previewImport(data as AppStateExport);
    return {
      success: true,
      filePath: filePaths[0],
      preview
    };
  } catch (error) {
    log.error('Failed to preview import:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('import-app-state', async (_event, filePath: string, options: ImportOptions) => {
  if (!isPathSafe(filePath)) {
    return { success: false, error: 'Invalid file path' };
  }

  try {
    const content = await readFile(filePath, 'utf-8');
    let data: unknown;
    try {
      data = JSON.parse(content);
    } catch {
      return { success: false, error: 'Invalid JSON format' };
    }

    const validation = validateAppStateExport(data);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const result = importAppState(data as AppStateExport, options);
    return result;
  } catch (error) {
    log.error('Failed to import app state:', error);
    return { success: false, error: String(error) };
  }
});

// Individual item export/import
ipcMain.handle('export-template', async (event, templateId: string) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { success: false, error: 'No window available' };

  try {
    const exportData = exportTemplate(templateId, app.getVersion());
    if (!exportData) {
      return { success: false, error: 'Template not found' };
    }

    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Export Template',
      defaultPath: `${exportData.data.name.replace(/[^a-zA-Z0-9-_ ]/g, '')}.carvd-template`,
      filters: [{ name: 'Carvd Template', extensions: ['carvd-template'] }]
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    await writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8');
    return { success: true, filePath };
  } catch (error) {
    log.error('Failed to export template:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('export-assembly', async (event, assemblyId: string) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { success: false, error: 'No window available' };

  try {
    const exportData = exportAssembly(assemblyId, app.getVersion());
    if (!exportData) {
      return { success: false, error: 'Assembly not found' };
    }

    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Export Assembly',
      defaultPath: `${exportData.data.name.replace(/[^a-zA-Z0-9-_ ]/g, '')}.carvd-assembly`,
      filters: [{ name: 'Carvd Assembly', extensions: ['carvd-assembly'] }]
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    await writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8');
    return { success: true, filePath, stocksIncluded: exportData.referencedStocks.length };
  } catch (error) {
    log.error('Failed to export assembly:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('export-stocks', async (event, stockIds: string[]) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { success: false, error: 'No window available' };

  try {
    const exportData = exportStocks(stockIds, app.getVersion());
    if (!exportData) {
      return { success: false, error: 'No stocks found' };
    }

    const defaultName = stockIds.length === 1 ? exportData.data[0].name : `stocks-${stockIds.length}`;
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Export Stocks',
      defaultPath: `${defaultName.replace(/[^a-zA-Z0-9-_ ]/g, '')}.carvd-stocks`,
      filters: [{ name: 'Carvd Stocks', extensions: ['carvd-stocks'] }]
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    await writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8');
    return { success: true, filePath, count: exportData.data.length };
  } catch (error) {
    log.error('Failed to export stocks:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('import-template', async (event, options?: { replaceIfExists?: boolean }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { success: false, error: 'No window available' };

  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Import Template',
      filters: [{ name: 'Carvd Template', extensions: ['carvd-template'] }],
      properties: ['openFile']
    });

    if (canceled || !filePaths.length) {
      return { success: false, canceled: true };
    }

    const content = await readFile(filePaths[0], 'utf-8');
    let data: unknown;
    try {
      data = JSON.parse(content);
    } catch {
      return { success: false, error: 'Invalid file format' };
    }

    const validation = validateTemplateExport(data);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    const result = importTemplate(data as TemplateExport, {
      replaceIfExists: options?.replaceIfExists ?? false
    });
    return result;
  } catch (error) {
    log.error('Failed to import template:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('import-assembly', async (event, options?: { replaceIfExists?: boolean; importStocks?: boolean }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { success: false, error: 'No window available' };

  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Import Assembly',
      filters: [{ name: 'Carvd Assembly', extensions: ['carvd-assembly'] }],
      properties: ['openFile']
    });

    if (canceled || !filePaths.length) {
      return { success: false, canceled: true };
    }

    const content = await readFile(filePaths[0], 'utf-8');
    let data: unknown;
    try {
      data = JSON.parse(content);
    } catch {
      return { success: false, error: 'Invalid file format' };
    }

    const validation = validateAssemblyExport(data);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    const result = importAssembly(data as AssemblyExport, {
      replaceIfExists: options?.replaceIfExists ?? false,
      importStocks: options?.importStocks ?? true
    });
    return result;
  } catch (error) {
    log.error('Failed to import assembly:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('import-stocks', async (event, options?: { replaceIfExists?: boolean }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { success: false, error: 'No window available' };

  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Import Stocks',
      filters: [{ name: 'Carvd Stocks', extensions: ['carvd-stocks'] }],
      properties: ['openFile']
    });

    if (canceled || !filePaths.length) {
      return { success: false, canceled: true };
    }

    const content = await readFile(filePaths[0], 'utf-8');
    let data: unknown;
    try {
      data = JSON.parse(content);
    } catch {
      return { success: false, error: 'Invalid file format' };
    }

    const validation = validateStocksExport(data);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    const result = importStocks(data as StocksExport, {
      replaceIfExists: options?.replaceIfExists ?? false
    });
    return result;
  } catch (error) {
    log.error('Failed to import stocks:', error);
    return { success: false, error: String(error) };
  }
});

// Recent projects
ipcMain.handle('get-recent-projects', () => {
  return getRecentProjects();
});

ipcMain.handle('add-recent-project', (_event, filePath: string) => {
  addRecentProject(filePath);
  refreshMenu(); // Update Open Recent menu
});

ipcMain.handle('clear-recent-projects', () => {
  clearRecentProjects();
  refreshMenu(); // Update Open Recent menu
});

ipcMain.handle('remove-recent-project', (_event, filePath: string) => {
  removeRecentProject(filePath);
  refreshMenu(); // Update Open Recent menu
  return { success: true };
});

ipcMain.handle('update-recent-project-path', (_event, oldPath: string, newPath: string) => {
  updateRecentProjectPath(oldPath, newPath);
  refreshMenu(); // Update Open Recent menu
  return { success: true };
});

// Get file modification times for a list of paths
ipcMain.handle('get-file-stats', async (_event, filePaths: string[]) => {
  const results: { path: string; modifiedAt: string | null }[] = [];
  for (const filePath of filePaths) {
    if (!isPathSafe(filePath)) {
      log.warn('[get-file-stats] Path failed safety check:', filePath);
      results.push({ path: filePath, modifiedAt: null });
      continue;
    }
    try {
      const stats = await stat(filePath);
      results.push({ path: filePath, modifiedAt: stats.mtime.toISOString() });
    } catch (error) {
      log.warn('[get-file-stats] Failed to stat file:', filePath, error);
      results.push({ path: filePath, modifiedAt: null });
    }
  }
  return results;
});

// Get thumbnails from project files (for StartScreen display)
ipcMain.handle('get-project-thumbnails', async (_event, filePaths: string[]) => {
  const results: { path: string; thumbnail: { data: string; width: number; height: number } | null }[] = [];
  for (const filePath of filePaths) {
    if (!isPathSafe(filePath)) {
      results.push({ path: filePath, thumbnail: null });
      continue;
    }
    try {
      const content = await readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      if (data.thumbnail && data.thumbnail.data) {
        results.push({
          path: filePath,
          thumbnail: {
            data: data.thumbnail.data,
            width: data.thumbnail.width || 400,
            height: data.thumbnail.height || 300
          }
        });
      } else {
        results.push({ path: filePath, thumbnail: null });
      }
    } catch {
      results.push({ path: filePath, thumbnail: null });
    }
  }
  return results;
});

// Favorite projects
ipcMain.handle('get-favorite-projects', () => {
  return getFavoriteProjects();
});

ipcMain.handle('add-favorite-project', (_event, filePath: string) => {
  addFavoriteProject(filePath);
  return { success: true };
});

ipcMain.handle('remove-favorite-project', (_event, filePath: string) => {
  removeFavoriteProject(filePath);
  return { success: true };
});

ipcMain.handle('is-favorite-project', (_event, filePath: string) => {
  return isFavoriteProject(filePath);
});

ipcMain.handle('reorder-favorite-projects', (_event, filePaths: string[]) => {
  setFavoriteProjects(filePaths);
  return { success: true };
});

// New project defaults (for "remember these choices" feature)
ipcMain.handle('get-new-project-defaults', () => {
  return getNewProjectDefaults();
});

ipcMain.handle('set-new-project-defaults', (_event, defaults: Partial<NewProjectDefaults>) => {
  setNewProjectDefaults(defaults);
  return { success: true };
});

// Window title
ipcMain.handle('set-window-title', (event, title: string) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setTitle(title);
  }
});

// Update title bar overlay colors (Windows/Linux only)
ipcMain.handle('set-title-bar-overlay', (event, options: { color: string; symbolColor: string }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && process.platform !== 'darwin') {
    win.setTitleBarOverlay({
      color: options.color,
      symbolColor: options.symbolColor,
      height: 48
    });
  }
});

// Window close confirmation - called by renderer to proceed with close
ipcMain.handle('confirm-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    windowsAllowedToClose.add(win);
    win.close();
  }
});

// Window close cancellation - called by renderer to cancel close
ipcMain.handle('cancel-close', () => {
  // Nothing to do - just don't close the window
  // The close was already prevented by event.preventDefault()
});

// Print to PDF - uses Electron's native PDF generation
ipcMain.handle('print-to-pdf', async (event, options: { defaultFileName?: string; landscape?: boolean }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { success: false, error: 'No window available' };

  try {
    // Show save dialog
    const result = await dialog.showSaveDialog(win, {
      defaultPath: options.defaultFileName || 'document.pdf',
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }

    // Generate PDF from current window content
    const pdfData = await win.webContents.printToPDF({
      landscape: options.landscape ?? false,
      printBackground: true,
      margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 }
    });

    // Write to file
    await writeFile(result.filePath, pdfData);

    return { success: true, filePath: result.filePath };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// Auto-recovery file operations
ipcMain.handle('get-recovery-dir', () => {
  return getAutoRecoveryDir();
});

ipcMain.handle('save-recovery-file', async (_event, fileName: string, data: string) => {
  if (!isRecoveryFileNameSafe(fileName)) {
    throw new Error('Invalid recovery file name');
  }
  if (typeof data !== 'string') {
    throw new Error('Invalid data type');
  }
  await ensureRecoveryDir();
  const filePath = join(getAutoRecoveryDir(), fileName);
  await writeFile(filePath, data, 'utf-8');
  return filePath;
});

ipcMain.handle('read-recovery-file', async (_event, fileName: string) => {
  if (!isRecoveryFileNameSafe(fileName)) {
    throw new Error('Invalid recovery file name');
  }
  const filePath = join(getAutoRecoveryDir(), fileName);
  try {
    return await readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
});

ipcMain.handle('delete-recovery-file', async (_event, fileName: string) => {
  if (!isRecoveryFileNameSafe(fileName)) {
    throw new Error('Invalid recovery file name');
  }
  const filePath = join(getAutoRecoveryDir(), fileName);
  try {
    await unlink(filePath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('list-recovery-files', async () => {
  try {
    await ensureRecoveryDir();
    const files = await readdir(getAutoRecoveryDir());
    return files.filter((f) => f.endsWith('.carvd-recovery'));
  } catch {
    return [];
  }
});

// Open external links (mailto, https, etc.)
ipcMain.handle('open-external', async (_event, url: string) => {
  if (!isUrlSafe(url)) {
    throw new Error('Invalid or disallowed URL protocol');
  }
  await shell.openExternal(url);
});

// Auto-updater
ipcMain.handle('check-for-updates', async () => {
  await checkForUpdates();
});

ipcMain.handle('download-update', async () => {
  await downloadUpdate();
});

ipcMain.handle('quit-and-install', () => {
  quitAndInstall();
});

ipcMain.handle('get-update-info', () => {
  return getUpdateInfo();
});

// Watch for settings changes from other instances (cross-process sync)
// The settings keys we want to sync across instances
const syncedSettingsKeys = [
  'theme',
  'confirmBeforeDelete',
  'showHotkeyHints',
  'defaultUnits',
  'defaultGridSize',
  'stockLibrary',
  'assemblyLibrary'
];

store.onDidAnyChange((newValue, oldValue) => {
  // Find which keys changed
  const changedKeys = syncedSettingsKeys.filter((key) => {
    const newVal = newValue?.[key as keyof typeof newValue];
    const oldVal = oldValue?.[key as keyof typeof oldValue];
    return JSON.stringify(newVal) !== JSON.stringify(oldVal);
  });

  // Broadcast changes to all windows
  if (changedKeys.length > 0) {
    const changes: Record<string, unknown> = {};
    for (const key of changedKeys) {
      changes[key] = newValue?.[key as keyof typeof newValue];
    }
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('settings-changed', changes);
    });
  }
});

app.whenReady().then(() => {
  const isTest = process.env.NODE_ENV === 'test' || process.argv.includes('--test-mode');
  if (isTest) {
    log.info('[Main] Test mode detected — skipping splash screen and auto-updater');
  }

  // Show splash screen (skip in test mode for faster startup)
  if (!isTest) {
    splashWindow = createSplashWindow();
  }

  // Reset trial acknowledgement so expired modal shows each launch
  resetTrialAcknowledgement();

  // Seed default stock and assembly libraries if empty (first run)
  seedDefaultLibraries();

  // Create application menu
  createApplicationMenu();

  // If a file was double-clicked before app was ready, open it
  // Otherwise create a normal window
  if (pendingFileToOpen) {
    createWindow(pendingFileToOpen);
    pendingFileToOpen = null;
  } else {
    createWindow();
  }

  // Initialize auto-updater (skip in development and test)
  if (!isTest) {
    initializeAutoUpdater();
  }

  app.on('activate', () => {
    // macOS: re-create window when dock icon clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Quit on all platforms except macOS
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
