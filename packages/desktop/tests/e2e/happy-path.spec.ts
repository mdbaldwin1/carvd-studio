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
 * We need the main window which contains the React app (.app container).
 */
async function getMainWindow(electronApp: ElectronApplication): Promise<Page> {
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

  // Poll for up to 30 seconds for the main window to appear
  for (let i = 0; i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const found = await checkForMainWindow();
    if (found) return found;
  }

  // Fallback: return the last window
  const windows = electronApp.windows();
  return windows[windows.length - 1];
}

/**
 * Navigate through the startup flow to reach the start screen.
 * Handles: splash → app mount → tutorial (skip) → start screen
 */
async function navigateToStartScreen(window: Page): Promise<void> {
  // Wait for the React app to mount
  await expect(window.locator('.app')).toBeVisible({ timeout: 30000 });

  // Handle welcome tutorial if it appears - skip it
  const skipTutorialBtn = window.locator('.tutorial-tooltip-skip');
  if (await skipTutorialBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await skipTutorialBtn.click();
    await window.waitForTimeout(500);
  }

  // Wait for start screen to appear
  await expect(window.locator('.start-screen')).toBeVisible({ timeout: 15000 });
}

/**
 * Create a new project from the start screen.
 * Clicks "New Blank Project" → fills out NewProjectDialog → "Create Project"
 */
async function createNewProject(window: Page): Promise<void> {
  // Click "New Blank Project" on start screen
  await window.locator('.blank-template').click();

  // NewProjectDialog appears - click "Create Project" to confirm
  const createBtn = window.locator('.new-project-dialog .btn-accent');
  await expect(createBtn).toBeVisible({ timeout: 5000 });
  await createBtn.click();

  // Wait for editor to load
  await expect(window.locator('.app-header')).toBeVisible({ timeout: 10000 });
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

  test('app launches and shows start screen', async () => {
    await navigateToStartScreen(window);

    // Verify key start screen elements
    const blankTemplate = window.locator('.blank-template');
    await expect(blankTemplate).toBeVisible();
  });

  test('can create a new project from start screen', async () => {
    // Ensure we're on start screen
    const startScreen = window.locator('.start-screen');
    if (!(await startScreen.isVisible().catch(() => false))) {
      await navigateToStartScreen(window);
    }

    await createNewProject(window);

    // Verify editor is visible with canvas
    const canvas = window.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('editor UI elements are present after project creation', async () => {
    // Should already be in editor from previous test
    const appHeader = window.locator('.app-header');
    await expect(appHeader).toBeVisible({ timeout: 10000 });

    // Verify sidebar exists
    const sidebar = window.locator('.sidebar');
    await expect(sidebar).toBeVisible();

    // Verify canvas exists
    const canvas = window.locator('canvas');
    await expect(canvas).toBeVisible();
  });
});
