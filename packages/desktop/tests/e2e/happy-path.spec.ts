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
 * Polls all open windows looking for one with the React root (.app).
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

  // Poll for up to 30 seconds for the main window to appear
  for (let i = 0; i < 30; i++) {
    const found = await checkForMainWindow();
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Fallback: return the last window
  const windows = electronApp.windows();
  return windows[windows.length - 1];
}

/**
 * Navigate through the startup flow until the app is ready for interaction.
 * Handles all possible initial states:
 * - Welcome tutorial → skip it
 * - Trial expired modal → dismiss it
 * - Start screen → ready
 * - Editor (if project was opened) → ready
 */
async function waitForAppReady(window: Page): Promise<string> {
  // Wait for React app to mount
  await expect(window.locator('.app')).toBeVisible({ timeout: 30000 });

  // Wait for the app to finish initializing (license check, etc.)
  // The app will show one of several states. Poll for any interactive element.
  for (let i = 0; i < 30; i++) {
    // Check for tutorial
    const hasTutorial = await window
      .locator('.tutorial-tooltip-skip')
      .isVisible({ timeout: 500 })
      .catch(() => false);
    if (hasTutorial) {
      await window.locator('.tutorial-tooltip-skip').click();
      await window.waitForTimeout(500);
      continue; // Check again for next state
    }

    // Check for trial expired modal - dismiss it
    const hasExpiredModal = await window
      .locator('.trial-expired-modal')
      .isVisible({ timeout: 500 })
      .catch(() => false);
    if (hasExpiredModal) {
      // Click "Continue with Free" or similar dismiss button
      const dismissBtn = window.locator('.trial-expired-modal button').last();
      if (await dismissBtn.isVisible().catch(() => false)) {
        await dismissBtn.click();
        await window.waitForTimeout(500);
      }
      continue;
    }

    // Check for start screen
    const hasStartScreen = await window
      .locator('.start-screen')
      .isVisible({ timeout: 500 })
      .catch(() => false);
    if (hasStartScreen) return 'start-screen';

    // Check for editor
    const hasEditor = await window
      .locator('.app-header')
      .isVisible({ timeout: 500 })
      .catch(() => false);
    if (hasEditor) return 'editor';

    await window.waitForTimeout(1000);
  }

  // Capture page state for debugging
  const bodyHTML = await window.evaluate(() => document.body.innerHTML.substring(0, 500));
  throw new Error(`App did not reach a usable state after 30s. Body starts with: ${bodyHTML}`);
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
    const state = await waitForAppReady(window);

    // App should reach either start screen or editor
    expect(['start-screen', 'editor']).toContain(state);

    if (state === 'start-screen') {
      // Verify start screen has the new project button
      await expect(window.locator('.blank-template')).toBeVisible();
    } else {
      // Verify editor has the header
      await expect(window.locator('.app-header')).toBeVisible();
    }
  });

  test('can create a new project from start screen', async () => {
    const startScreen = window.locator('.start-screen');

    // Navigate to start screen if not already there
    if (!(await startScreen.isVisible().catch(() => false))) {
      const state = await waitForAppReady(window);
      if (state !== 'start-screen') {
        // Already in editor - test passes
        await expect(window.locator('.app-header')).toBeVisible();
        return;
      }
    }

    // Click "New Blank Project" on start screen
    await window.locator('.blank-template').click();

    // NewProjectDialog appears - click "Create Project" to confirm
    const createBtn = window.locator('.new-project-dialog .btn-accent');
    await expect(createBtn).toBeVisible({ timeout: 5000 });
    await createBtn.click();

    // Wait for editor to load
    await expect(window.locator('.app-header')).toBeVisible({ timeout: 10000 });
    await expect(window.locator('canvas')).toBeVisible();
  });

  test('editor UI elements are present', async () => {
    // Ensure we're in the editor
    const appHeader = window.locator('.app-header');
    if (!(await appHeader.isVisible().catch(() => false))) {
      // Try to get to editor
      await waitForAppReady(window);
    }

    await expect(window.locator('.app-header')).toBeVisible({ timeout: 10000 });
    await expect(window.locator('.sidebar')).toBeVisible();
    await expect(window.locator('canvas')).toBeVisible();
  });
});
