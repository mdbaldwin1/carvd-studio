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
 * Waits up to 90 seconds for the app to initialize (macOS CI can be slow).
 */
async function getMainWindow(electronApp: ElectronApplication): Promise<Page> {
  for (let i = 0; i < 90; i++) {
    const windows = electronApp.windows();
    for (const win of windows) {
      const hasApp = await win
        .locator('.app')
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      if (hasApp) {
        // Wait for the page to fully load before interacting
        await win.waitForFunction(() => document.readyState === 'complete', null, {
          timeout: 30000
        });
        return win;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('Main application window with .app root not found after 90s');
}

/**
 * Navigate through the startup flow until the app is ready for interaction.
 * Handles: tutorial (skip), trial expired modal (dismiss), then waits for
 * start screen or editor to appear.
 *
 * Uses force: true clicks to bypass Playwright stability checks that hang when:
 * - CSS transitions are animating
 * - React re-renders are detaching/reattaching DOM elements
 */
async function waitForAppReady(window: Page): Promise<'start-screen' | 'editor'> {
  for (let i = 0; i < 60; i++) {
    // Skip tutorial if showing
    const skipBtn = window.locator('.tutorial-tooltip-skip');
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn.click({ force: true });
      await window.waitForTimeout(500);
      continue;
    }

    // Dismiss trial expired modal if showing
    const trialModal = window.locator('.trial-expired-modal');
    if (await trialModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      const lastBtn = window.locator('.trial-expired-modal button').last();
      if (await lastBtn.isVisible().catch(() => false)) {
        await lastBtn.click({ force: true });
        await window.waitForTimeout(500);
      }
      continue;
    }

    if (
      await window
        .locator('.start-screen')
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      return 'start-screen';
    }
    if (
      await window
        .locator('.app-header')
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      return 'editor';
    }

    await window.waitForTimeout(1000);
  }

  const bodyHTML = await window.evaluate(() => document.body.innerHTML.substring(0, 500));
  throw new Error(`App did not reach a usable state after 60s. Page content: ${bodyHTML}`);
}

/**
 * Force-close the Electron app, falling back to SIGKILL if graceful close hangs.
 * This prevents worker teardown timeouts in CI.
 */
async function forceCloseApp(electronApp: ElectronApplication): Promise<void> {
  try {
    await Promise.race([
      electronApp.close(),
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error('close timeout')), 5000))
    ]);
  } catch {
    // Graceful close failed or timed out - force kill the process
    try {
      electronApp.process().kill('SIGKILL');
    } catch {
      /* process may already be gone */
    }
  }
}

test.describe('Happy Path Workflow', () => {
  let electronApp: ElectronApplication;
  let window: Page;

  test.beforeAll(async () => {
    const electronPath = require('electron') as unknown as string;
    const appPath = path.join(__dirname, '../../');

    const args = [appPath];
    if (process.env.CI) {
      // Disable GPU acceleration in CI (no real GPU available)
      args.unshift('--disable-gpu', '--disable-software-rasterizer');
      if (process.platform === 'linux') {
        args.unshift('--no-sandbox');
      }
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
      await forceCloseApp(electronApp);
    }
  });

  test('app launches, creates project, and shows editor', async () => {
    const state = await waitForAppReady(window);
    expect(['start-screen', 'editor']).toContain(state);

    if (state === 'start-screen') {
      // Verify start screen elements
      await expect(window.locator('.blank-template')).toBeVisible();

      // Use JS click to bypass Playwright's CSS transition stability checks.
      // The template cards have CSS transitions (transform, background) that
      // prevent Playwright from considering the element "stable" for clicking.
      await window.locator('.blank-template').evaluate((el) => (el as HTMLElement).click());

      // Wait for NewProjectDialog to appear (it loads stock library data on mount)
      const dialog = window.locator('.new-project-dialog');
      await expect(dialog).toBeVisible({ timeout: 10000 });

      // Click "Create Project" via JS click for consistency
      await window
        .locator('.new-project-dialog .btn-accent')
        .evaluate((el) => (el as HTMLElement).click());
    }

    // Verify editor is fully loaded
    await expect(window.locator('.app-header')).toBeVisible({ timeout: 15000 });
    await expect(window.locator('.sidebar')).toBeVisible();
    await expect(window.locator('canvas')).toBeVisible();
  });
});
