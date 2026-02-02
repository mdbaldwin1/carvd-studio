import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { join } from 'path';
import { readFile, writeFile, unlink, access, readdir, mkdir } from 'fs/promises';
import { store, getWindowBounds, setWindowBounds, addRecentProject, getRecentProjects, clearRecentProjects, getLicenseKey, getLicenseData, setLicenseData, clearLicenseData, getHasCompletedWelcome, setHasCompletedWelcome } from './store';
import { createApplicationMenu, refreshMenu } from './menu';
import { verifyLicense } from './license';

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

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const bounds = getWindowBounds();
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Carvd Studio',
    // Custom title bar configuration
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    titleBarOverlay: !isMac
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
      sandbox: false
    }
  });

  // Show window when ready to avoid flicker
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  // Save window bounds on close
  mainWindow.on('close', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      setWindowBounds(bounds);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// Handle file open from OS (double-click .carvd file)
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (filePath.endsWith('.carvd')) {
    addRecentProject(filePath);
    // TODO: Send file path to renderer to open project
    if (mainWindow) {
      mainWindow.webContents.send('open-project', filePath);
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
  return readFile(filePath, 'utf-8');
});

ipcMain.handle('write-file', async (_event, filePath: string, data: string) => {
  await writeFile(filePath, data, 'utf-8');
});

// Write binary file (for PDFs, images, etc.)
ipcMain.handle('write-binary-file', async (_event, filePath: string, data: number[]) => {
  const buffer = Buffer.from(data);
  await writeFile(filePath, buffer);
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

// License management
ipcMain.handle('verify-license', (_event, licenseKey: string) => {
  const result = verifyLicense(licenseKey);
  if (result.valid && result.data) {
    // Store license data on successful verification
    setLicenseData({
      licenseKey,
      licenseEmail: result.data.email,
      licenseOrderId: result.data.orderId
    });
  }
  return result;
});

ipcMain.handle('get-license-data', () => {
  return getLicenseData();
});

ipcMain.handle('check-license-valid', () => {
  const licenseKey = getLicenseKey();
  if (!licenseKey) {
    return { valid: false };
  }
  return verifyLicense(licenseKey);
});

ipcMain.handle('deactivate-license', () => {
  clearLicenseData();
  return { success: true };
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

// Window title
ipcMain.handle('set-window-title', (_event, title: string) => {
  if (mainWindow) {
    mainWindow.setTitle(title);
  }
});

// Update title bar overlay colors (Windows/Linux only)
ipcMain.handle('set-title-bar-overlay', (_event, options: { color: string; symbolColor: string }) => {
  if (mainWindow && process.platform !== 'darwin') {
    mainWindow.setTitleBarOverlay({
      color: options.color,
      symbolColor: options.symbolColor,
      height: 48
    });
  }
});

// Print to PDF - uses Electron's native PDF generation
ipcMain.handle(
  'print-to-pdf',
  async (_event, options: { defaultFileName?: string; landscape?: boolean }) => {
    if (!mainWindow) return { success: false, error: 'No window available' };

    try {
      // Show save dialog
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: options.defaultFileName || 'document.pdf',
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }

      // Generate PDF from current window content
      const pdfData = await mainWindow.webContents.printToPDF({
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
  }
);

// Auto-recovery file operations
ipcMain.handle('get-recovery-dir', () => {
  return getAutoRecoveryDir();
});

ipcMain.handle('save-recovery-file', async (_event, fileName: string, data: string) => {
  await ensureRecoveryDir();
  const filePath = join(getAutoRecoveryDir(), fileName);
  await writeFile(filePath, data, 'utf-8');
  return filePath;
});

ipcMain.handle('read-recovery-file', async (_event, fileName: string) => {
  const filePath = join(getAutoRecoveryDir(), fileName);
  try {
    return await readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
});

ipcMain.handle('delete-recovery-file', async (_event, fileName: string) => {
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
  // Create application menu
  createApplicationMenu();

  createWindow();

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
