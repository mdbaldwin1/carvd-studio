import { test, expect, _electron as electron } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

/** Collected console messages for debugging failures */
const consoleMessages: string[] = [];

/**
 * Wait for the main application window (not the splash screen).
 * Polls all open windows looking for one with the React root (.app).
 * Uses page.evaluate() for DOM checks to avoid Playwright locator race conditions.
 */
async function getMainWindow(electronApp: ElectronApplication): Promise<Page> {
  for (let i = 0; i < 90; i++) {
    const windows = electronApp.windows();
    for (const win of windows) {
      // Use page.evaluate() (not locator) to atomically check DOM state
      // This avoids the race condition where React re-renders between
      // isVisible() and subsequent interaction, detaching the element
      const hasApp = await win
        .evaluate(() => {
          const el = document.querySelector('.app');
          return el !== null && (el as HTMLElement).offsetParent !== null;
        })
        .catch(() => false);

      if (hasApp) {
        // Ensure the page is fully loaded before interacting
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
 * Handles: tutorial (skip), trial expired modal (dismiss), error boundary
 * (recover), then waits for start screen or editor to appear.
 *
 * All DOM checks and clicks use page.evaluate() to avoid race conditions
 * with React re-renders that detach elements between Playwright locator calls.
 */
async function waitForAppReady(window: Page): Promise<'start-screen' | 'editor'> {
  for (let i = 0; i < 60; i++) {
    // Use a single evaluate() call per iteration to atomically check state
    // and interact with the UI. This prevents the race condition where
    // React re-renders detach an element between isVisible() and click().
    const state = await window.evaluate(() => {
      // Check for error boundary first
      const errorBoundary = document.querySelector('.error-boundary');
      if (errorBoundary) {
        // Try to extract the error message for debugging
        const details = document.querySelector('.error-boundary-details pre');
        const errorMsg = details?.textContent || 'unknown error';
        // Click "Try Again" to attempt recovery
        const tryAgainBtn = document.querySelector(
          '.error-boundary-actions .btn-secondary'
        ) as HTMLElement;
        if (tryAgainBtn) tryAgainBtn.click();
        return { type: 'error-boundary' as const, error: errorMsg };
      }

      // Skip tutorial if showing
      const skipBtn = document.querySelector('.tutorial-tooltip-skip') as HTMLElement;
      if (skipBtn && skipBtn.offsetParent !== null) {
        skipBtn.click();
        return { type: 'skipped-tutorial' as const };
      }

      // Dismiss trial expired modal if showing
      const trialModal = document.querySelector('.trial-expired-modal');
      if (trialModal && (trialModal as HTMLElement).offsetParent !== null) {
        const buttons = trialModal.querySelectorAll('button');
        const lastBtn = buttons[buttons.length - 1] as HTMLElement;
        if (lastBtn) lastBtn.click();
        return { type: 'dismissed-trial' as const };
      }

      // Check if we've reached a usable state
      const startScreen = document.querySelector('.start-screen');
      if (startScreen && (startScreen as HTMLElement).offsetParent !== null) {
        return { type: 'start-screen' as const };
      }

      const appHeader = document.querySelector('.app-header');
      if (appHeader && (appHeader as HTMLElement).offsetParent !== null) {
        return { type: 'editor' as const };
      }

      return { type: 'waiting' as const };
    });

    if (state.type === 'start-screen') return 'start-screen';
    if (state.type === 'editor') return 'editor';

    if (state.type === 'error-boundary') {
      console.log(`[E2E] Error boundary detected: ${(state as { error: string }).error}`);
      // Give the app time to recover after clicking "Try Again"
      await window.waitForTimeout(2000);
      continue;
    }

    if (state.type === 'skipped-tutorial' || state.type === 'dismissed-trial') {
      await window.waitForTimeout(500);
      continue;
    }

    // Still waiting for the app to load
    await window.waitForTimeout(1000);
  }

  const bodyHTML = await window.evaluate(() => document.body.innerHTML.substring(0, 1000));
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
  let userDataDir: string;

  test.beforeAll(async () => {
    const electronPath = require('electron') as unknown as string;
    const appPath = path.join(__dirname, '../../');

    // Create an isolated user data directory for this test run.
    // This ensures electron-store starts with a clean slate — no persisted
    // trial dates, welcome flags, or other state from previous runs that
    // could cause the app to hit a different (potentially broken) code path.
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'carvd-e2e-'));

    const args = [`--user-data-dir=${userDataDir}`, appPath];
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

    // Capture console output for debugging failures
    consoleMessages.length = 0;
    window.on('console', (msg) => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        console.log(`[E2E Console] ${text}`);
      }
    });
    window.on('pageerror', (error) => {
      const text = `[pageerror] ${error.message}`;
      consoleMessages.push(text);
      console.log(`[E2E] ${text}`);
    });
  });

  test.afterAll(async () => {
    if (electronApp) {
      await forceCloseApp(electronApp);
    }
    // Clean up the temporary user data directory
    if (userDataDir) {
      try {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      } catch {
        /* best effort cleanup */
      }
    }
  });

  test('app launches, creates project, and shows editor', async () => {
    const state = await waitForAppReady(window);
    expect(['start-screen', 'editor']).toContain(state);

    if (state === 'start-screen') {
      // Verify start screen elements
      await expect(window.locator('.blank-template')).toBeVisible();

      // Use page.evaluate() for clicks to bypass Playwright's CSS transition
      // stability checks. The template cards have CSS transitions (transform,
      // background) that prevent Playwright from considering them "stable".
      await window.evaluate(() => {
        const el = document.querySelector('.blank-template') as HTMLElement;
        if (el) el.click();
      });

      // Wait for NewProjectDialog to appear (it loads stock library data on mount)
      const dialog = window.locator('.new-project-dialog');
      await expect(dialog).toBeVisible({ timeout: 10000 });

      // Click "Create Project" via page.evaluate() for consistency
      await window.evaluate(() => {
        const el = document.querySelector('.new-project-dialog .btn-accent') as HTMLElement;
        if (el) el.click();
      });
    }

    // Verify editor is fully loaded
    await expect(window.locator('.app-header')).toBeVisible({ timeout: 15000 });
    await expect(window.locator('.sidebar')).toBeVisible();
    await expect(window.locator('canvas')).toBeVisible();
  });
});
