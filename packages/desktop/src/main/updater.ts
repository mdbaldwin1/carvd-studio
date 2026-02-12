import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import { BrowserWindow, dialog, app } from 'electron';
import log from 'electron-log';

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

// Disable auto-download - we want to show UI first
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate?: string;
}

let updateInfo: UpdateInfo | null = null;

/**
 * Initialize auto-updater
 * - Checks for updates after app launch (with delay)
 * - Checks periodically every 6 hours
 * - Only runs in production builds
 */
export function initializeAutoUpdater(): void {
  // Skip in development
  if (process.env.NODE_ENV === 'development') {
    log.info('[Updater] Skipping auto-update in development mode');
    return;
  }

  log.info('[Updater] Initializing auto-updater');

  // Event: Update available
  autoUpdater.on('update-available', (info) => {
    log.info('[Updater] Update available:', info.version);
    updateInfo = {
      version: info.version,
      releaseNotes: info.releaseNotes as string | undefined,
      releaseDate: info.releaseDate
    };

    // Notify renderer
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((win) => {
      win.webContents.send('update-available', updateInfo);
    });
  });

  // Event: Update not available
  autoUpdater.on('update-not-available', () => {
    log.info('[Updater] No updates available');
    updateInfo = null;
  });

  // Event: Download progress
  autoUpdater.on('download-progress', (progress) => {
    log.info(`[Updater] Download progress: ${progress.percent.toFixed(2)}%`);

    const windows = BrowserWindow.getAllWindows();
    windows.forEach((win) => {
      win.webContents.send('update-download-progress', {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total
      });
    });
  });

  // Event: Update downloaded
  autoUpdater.on('update-downloaded', (info) => {
    log.info('[Updater] Update downloaded:', info.version);

    // Notify renderer
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((win) => {
      win.webContents.send('update-downloaded', {
        version: info.version
      });
    });
  });

  // Event: Error
  autoUpdater.on('error', (error) => {
    log.error('[Updater] Error:', error);

    const windows = BrowserWindow.getAllWindows();
    windows.forEach((win) => {
      win.webContents.send('update-error', {
        message: error.message
      });
    });
  });

  // Check for updates after 3 seconds delay
  setTimeout(() => {
    log.info('[Updater] Checking for updates (delayed)');
    checkForUpdates();
  }, 3000);

  // Check every 6 hours
  setInterval(
    () => {
      log.info('[Updater] Checking for updates (periodic)');
      checkForUpdates();
    },
    6 * 60 * 60 * 1000
  ); // 6 hours
}

/**
 * Check for updates (silent - used for automatic checks)
 */
export async function checkForUpdates(): Promise<void> {
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    log.error('[Updater] Check failed:', error);
  }
}

/**
 * Check for updates manually with user feedback
 * Shows a dialog if no updates are available
 */
export async function checkForUpdatesManual(): Promise<void> {
  // Skip in development
  if (process.env.NODE_ENV === 'development') {
    dialog.showMessageBox({
      type: 'info',
      title: 'Check for Updates',
      message: 'Update checking is disabled in development mode.',
      buttons: ['OK']
    });
    return;
  }

  try {
    log.info('[Updater] Manual update check');
    const result = await autoUpdater.checkForUpdates();

    // If no update is available, show a message
    if (!result || !result.updateInfo || result.updateInfo.version === app.getVersion()) {
      dialog.showMessageBox({
        type: 'info',
        title: 'Check for Updates',
        message: "You're up to date!",
        detail: `Carvd Studio ${app.getVersion()} is the latest version.`,
        buttons: ['OK']
      });
    }
    // If update is available, the 'update-available' event will handle it
  } catch (error) {
    log.error('[Updater] Manual check failed:', error);
    dialog.showMessageBox({
      type: 'error',
      title: 'Update Check Failed',
      message: 'Unable to check for updates.',
      detail: 'Please check your internet connection and try again.',
      buttons: ['OK']
    });
  }
}

/**
 * Download update (called by renderer)
 */
export async function downloadUpdate(): Promise<void> {
  try {
    log.info('[Updater] Starting download');
    await autoUpdater.downloadUpdate();
  } catch (error) {
    log.error('[Updater] Download failed:', error);
    throw error;
  }
}

/**
 * Quit and install update (called by renderer)
 */
export function quitAndInstall(): void {
  log.info('[Updater] Quitting and installing update');
  autoUpdater.quitAndInstall(false, true);
}

/**
 * Get current update info
 */
export function getUpdateInfo(): UpdateInfo | null {
  return updateInfo;
}
