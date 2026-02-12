import { test, expect, _electron as electron } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';
import path from 'path';
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
      // Use page.evaluate() (not locator) to atomically check DOM state.
      // Check element exists and has a non-zero bounding rect (similar to
      // Playwright's isVisible). Don't use offsetParent — it returns null
      // for position:fixed elements, which breaks start-screen detection.
      const hasApp = await win
        .evaluate(() => {
          const el = document.querySelector('.app');
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
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
    // Helper to check visibility via bounding rect (works for position:fixed)
    const state = await window.evaluate(() => {
      function isVisible(el: Element | null): boolean {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }

      // Check for error boundary first
      const errorBoundary = document.querySelector('.error-boundary');
      if (isVisible(errorBoundary)) {
        const details = document.querySelector('.error-boundary-details pre');
        const errorMsg = details?.textContent || 'unknown error';
        const tryAgainBtn = document.querySelector(
          '.error-boundary-actions .btn-secondary'
        ) as HTMLElement;
        if (tryAgainBtn) tryAgainBtn.click();
        return { type: 'error-boundary' as const, error: errorMsg };
      }

      // Skip tutorial if showing
      const skipBtn = document.querySelector('.tutorial-tooltip-skip') as HTMLElement;
      if (isVisible(skipBtn)) {
        skipBtn.click();
        return { type: 'skipped-tutorial' as const };
      }

      // Dismiss trial expired modal if showing
      const trialModal = document.querySelector('.trial-expired-modal');
      if (isVisible(trialModal)) {
        const buttons = trialModal!.querySelectorAll('button');
        const lastBtn = buttons[buttons.length - 1] as HTMLElement;
        if (lastBtn) lastBtn.click();
        return { type: 'dismissed-trial' as const };
      }

      // Check if we've reached a usable state
      if (isVisible(document.querySelector('.start-screen'))) {
        return { type: 'start-screen' as const };
      }
      if (isVisible(document.querySelector('.app-header'))) {
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

  test.beforeAll(async () => {
    const electronPath = require('electron') as unknown as string;
    const appPath = path.join(__dirname, '../../');

    const args = [appPath];
    if (process.env.CI) {
      // Linux CI needs --no-sandbox for xvfb to work properly.
      // Do NOT use --disable-gpu or --disable-software-rasterizer — they
      // prevent WebGL context creation, which crashes Three.js / R3F.
      // Linux CI uses xvfb for software rendering; macOS CI has Metal GPU.
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
