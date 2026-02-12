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
  for (let i = 0; i < 30; i++) {
    const windows = electronApp.windows();
    for (const win of windows) {
      const hasApp = await win
        .locator('.app')
        .isVisible({ timeout: 1000 })
        .catch(() => false);
      if (hasApp) return win;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const windows = electronApp.windows();
  return windows[windows.length - 1];
}

/**
 * Navigate through the startup flow until the app is ready for interaction.
 * Handles: tutorial (skip), trial expired modal (dismiss), then waits for
 * start screen or editor to appear.
 */
async function waitForAppReady(window: Page): Promise<'start-screen' | 'editor'> {
  await expect(window.locator('.app')).toBeVisible({ timeout: 30000 });

  for (let i = 0; i < 30; i++) {
    // Skip tutorial if showing
    if (await window.locator('.tutorial-tooltip-skip').isVisible({ timeout: 500 }).catch(() => false)) {
      await window.locator('.tutorial-tooltip-skip').click();
      await window.waitForTimeout(500);
      continue;
    }

    // Dismiss trial expired modal if showing
    if (await window.locator('.trial-expired-modal').isVisible({ timeout: 500 }).catch(() => false)) {
      const dismissBtn = window.locator('.trial-expired-modal button').last();
      if (await dismissBtn.isVisible().catch(() => false)) {
        await dismissBtn.click();
        await window.waitForTimeout(500);
      }
      continue;
    }

    if (await window.locator('.start-screen').isVisible({ timeout: 500 }).catch(() => false)) {
      return 'start-screen';
    }
    if (await window.locator('.app-header').isVisible({ timeout: 500 }).catch(() => false)) {
      return 'editor';
    }

    await window.waitForTimeout(1000);
  }

  const bodyHTML = await window.evaluate(() => document.body.innerHTML.substring(0, 500));
  throw new Error(`App did not reach a usable state after 30s. Page content: ${bodyHTML}`);
}

test.describe('Happy Path Workflow', () => {
  let electronApp: ElectronApplication;
  let window: Page;

  test.beforeAll(async () => {
    const electronPath = require('electron') as unknown as string;
    const appPath = path.join(__dirname, '../../');

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

    window = await getMainWindow(electronApp);
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('app launches and shows start screen or editor', async () => {
    const state = await waitForAppReady(window);
    expect(['start-screen', 'editor']).toContain(state);

    if (state === 'start-screen') {
      await expect(window.locator('.blank-template')).toBeVisible();
    } else {
      await expect(window.locator('.app-header')).toBeVisible();
    }
  });

  test('complete workflow: create project and verify editor', async () => {
    const state = await waitForAppReady(window);

    if (state === 'start-screen') {
      // Click "New Blank Project" - use force:true to bypass stability checks
      // (CSS transitions can cause Playwright to wait indefinitely for stability)
      await window.locator('.blank-template').click({ force: true });

      // NewProjectDialog appears - click "Create Project"
      const createBtn = window.locator('.new-project-dialog .btn-accent');
      await expect(createBtn).toBeVisible({ timeout: 5000 });
      await createBtn.click({ force: true });
    }

    // Verify editor is fully loaded
    await expect(window.locator('.app-header')).toBeVisible({ timeout: 10000 });
    await expect(window.locator('.sidebar')).toBeVisible();
    await expect(window.locator('canvas')).toBeVisible();
  });
});
