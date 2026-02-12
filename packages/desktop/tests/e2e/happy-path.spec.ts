import { test, expect, _electron as electron } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

/**
 * Wait for the main application window (not the splash screen).
 * The app creates a splash BrowserWindow first, then the main window.
 * We need the main window which contains the React app.
 */
async function getMainWindow(electronApp: ElectronApplication): Promise<Page> {
  // Give the app time to create both windows (splash shows for >=1.5s)
  // Check existing windows first, then wait for new ones if needed
  const checkForMainWindow = async (): Promise<Page | null> => {
    const windows = electronApp.windows();
    for (const win of windows) {
      const hasApp = await win
        .locator('.app')
        .isVisible({ timeout: 1000 })
        .catch(() => false);
      if (hasApp) return win;
    }
    return null;
  };

  // Try existing windows first
  const existing = await checkForMainWindow();
  if (existing) return existing;

  // Wait for the main window to appear (splash closes, main opens)
  // Poll for up to 30 seconds
  for (let i = 0; i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const found = await checkForMainWindow();
    if (found) return found;

    // Also check if a new window was created
    const windows = electronApp.windows();
    for (const win of windows) {
      await win.waitForLoadState('domcontentloaded').catch(() => {});
      const hasApp = await win
        .locator('.app')
        .isVisible({ timeout: 1000 })
        .catch(() => false);
      if (hasApp) return win;
    }
  }

  // Fallback: return the last window
  const windows = electronApp.windows();
  return windows[windows.length - 1];
}

test.describe('Happy Path Workflow', () => {
  let electronApp: ElectronApplication;
  let window: Page;

  test.beforeAll(async () => {
    const electronPath = require('electron') as unknown as string;
    const appPath = path.join(__dirname, '../../');

    // On Linux CI, Electron needs --no-sandbox due to SUID sandbox restrictions
    const args = [appPath];
    if (process.env.CI && process.platform === 'linux') {
      args.unshift('--no-sandbox');
    }

    electronApp = await electron.launch({
      executablePath: electronPath,
      args,
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    // Get the main application window (skip splash screen)
    window = await getMainWindow(electronApp);
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('app launches and reaches a usable state', async () => {
    // The app shows screens in this order on first launch:
    // 1. Splash screen (separate BrowserWindow, auto-closes after ~1.5s)
    // 2. Main window loads React app
    // 3. Either: Welcome Tutorial (new user) → Start Screen, or Start Screen directly

    // Wait for the React app to mount
    await expect(window.locator('.app')).toBeVisible({ timeout: 30000 });

    // Handle welcome tutorial if it appears - skip it
    const skipTutorialBtn = window.locator('.tutorial-tooltip-skip');
    if (await skipTutorialBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipTutorialBtn.click();
      await window.waitForTimeout(500);
    }

    // After tutorial skip (or if no tutorial), we should see the start screen
    // or the main editor. Either state means the app loaded successfully.
    const startScreen = window.locator('.start-screen');
    const appHeader = window.locator('.app-header');

    // Wait for one of: start screen or app header (editor mode)
    await expect(startScreen.or(appHeader)).toBeVisible({ timeout: 15000 });

    // If we're on the start screen, verify key elements
    if (await startScreen.isVisible().catch(() => false)) {
      const blankTemplate = window.locator('.blank-template');
      await expect(blankTemplate).toBeVisible();
    }
  });

  test('can create a new project from start screen', async () => {
    const startScreen = window.locator('.start-screen');

    if (!(await startScreen.isVisible().catch(() => false))) {
      // Skip tutorial if showing
      const skipTutorialBtn = window.locator('.tutorial-tooltip-skip');
      if (await skipTutorialBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await skipTutorialBtn.click();
        await window.waitForTimeout(500);
      }
    }

    // Wait for start screen
    await expect(startScreen).toBeVisible({ timeout: 10000 });

    // Click "New Blank Project" button
    const blankTemplate = window.locator('.blank-template');
    await blankTemplate.click();
    await window.waitForTimeout(500);

    // After creating a new project, the editor should be visible
    const appHeader = window.locator('.app-header');
    await expect(appHeader).toBeVisible({ timeout: 10000 });

    // Verify 3D canvas exists
    const canvas = window.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('editor UI elements are present after project creation', async () => {
    const appHeader = window.locator('.app-header');

    if (!(await appHeader.isVisible().catch(() => false))) {
      // Navigate to editor if not there
      const startScreen = window.locator('.start-screen');
      if (await startScreen.isVisible({ timeout: 3000 }).catch(() => false)) {
        await window.locator('.blank-template').click();
        await window.waitForTimeout(500);
      }
    }

    await expect(appHeader).toBeVisible({ timeout: 10000 });

    // Verify sidebar exists
    const sidebar = window.locator('.sidebar');
    await expect(sidebar).toBeVisible();

    // Verify canvas exists
    const canvas = window.locator('canvas');
    await expect(canvas).toBeVisible();
  });
});
