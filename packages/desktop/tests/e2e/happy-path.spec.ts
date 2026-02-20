import { test, expect, _electron as electron } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        const tryAgainBtn = document.querySelector('.error-boundary-actions .btn-secondary') as HTMLElement;
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
    // Graceful close failed or timed out — force kill the process.
    // Use SIGKILL on Unix, kill() (SIGTERM) on Windows where SIGKILL doesn't exist.
    try {
      const signal = process.platform === 'win32' ? undefined : 'SIGKILL';
      electronApp.process().kill(signal);
    } catch {
      /* process may already be gone */
    }
  }
}

async function isElementVisible(window: Page, selector: string): Promise<boolean> {
  return window.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }, selector);
}

async function isEmptyStateVisible(window: Page): Promise<boolean> {
  return isElementVisible(window, '.empty-state-overlay');
}

async function addPartFromSidebar(window: Page): Promise<void> {
  await window.locator('button[title="Add Part"]').first().click({ force: true });
  await window.waitForTimeout(500);
}

async function ensureEditorReady(window: Page): Promise<void> {
  const state = await waitForAppReady(window);
  expect(['start-screen', 'editor']).toContain(state);

  const startScreenVisible = await isElementVisible(window, '.start-screen');
  if (state === 'start-screen' || startScreenVisible) {
    await expect(window.locator('.blank-template')).toBeVisible();

    await window.evaluate(() => {
      const el = document.querySelector('.blank-template') as HTMLElement;
      if (el) el.click();
    });

    const dialog = window.locator('.new-project-dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    await dialog.getByRole('button', { name: 'Create Project' }).click();
  }

  await expect(window.locator('.app-header')).toBeVisible({ timeout: 15000 });
  await expect(window.locator('.sidebar')).toBeVisible();
  await expect(window.locator('canvas')).toBeVisible();
}

test.describe('Happy Path Workflow', () => {
  let electronApp: ElectronApplication;
  let window: Page;

  test.beforeAll(async () => {
    // Use path.resolve (not path.join) to avoid trailing slash.
    // On Windows, Playwright launches via cmd.exe (shell: true) and quotes
    // each arg. A path ending in "\" creates "desktop\" — an escaped quote
    // in MSVC arg parsing — corrupting all subsequent args including
    // --remote-debugging-port, which prevents Playwright from completing.
    const appPath = path.resolve(__dirname, '../..');

    const args = [appPath, '--test-mode'];
    if (process.env.CI) {
      // CI needs --no-sandbox to avoid sandbox permission issues.
      // Do NOT use --disable-gpu — it kills WebGL, crashing Three.js / R3F.
      args.unshift('--no-sandbox');
    }

    electronApp = await electron.launch({
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
    await ensureEditorReady(window);
  });

  test('adds a part via sidebar', async () => {
    await ensureEditorReady(window);
    await addPartFromSidebar(window);
    expect(await isEmptyStateVisible(window)).toBe(false);
    await expect(window.locator('.dimension-inputs input').first()).toBeVisible({ timeout: 5000 });
  });

  test('modifies part dimensions', async () => {
    await ensureEditorReady(window);
    if (await isEmptyStateVisible(window)) {
      await addPartFromSidebar(window);
    }

    // Part 1 should be auto-selected — verify dimension inputs are visible
    const dimInputs = window.locator('.dimension-inputs input');
    await expect(dimInputs.first()).toBeVisible({ timeout: 5000 });

    // Read the initial length value (default 24 inches)
    const initialValue = await dimInputs.first().inputValue();
    expect(initialValue).toBe('24');

    // Change length to 36: click, clear, type, then Tab to commit
    await dimInputs.first().click();
    await dimInputs.first().fill('36');
    await window.keyboard.press('Tab');
    await window.waitForTimeout(500);

    // Verify the dimension updated
    const updatedValue = await dimInputs.first().inputValue();
    expect(updatedValue).toBe('36');
  });

  test('opens cut list modal', async () => {
    await ensureEditorReady(window);
    await window.getByRole('button', { name: /generate cut list/i }).click({ force: true });

    // Wait for the cut list modal to appear
    await expect(window.locator('[role="dialog"][aria-labelledby="cut-list-modal-title"]')).toBeVisible({
      timeout: 10000
    });

    // The modal should show meaningful content — either a generate button,
    // validation issues (part has no stock), or tabs (if auto-generated)
    const modalContent = await window.evaluate(() => {
      const modal = document.querySelector('[role="dialog"][aria-labelledby="cut-list-modal-title"]');
      if (!modal) return { hasGenerate: false, hasIssues: false, hasTabs: false };
      return {
        hasGenerate: !!modal.querySelector('.cut-list-generate'),
        hasIssues: !!modal.querySelector('.cut-list-issues'),
        hasTabs: !!modal.querySelector('.cut-list-tabs')
      };
    });
    expect(modalContent.hasGenerate || modalContent.hasIssues || modalContent.hasTabs).toBe(true);

    // Close the modal
    await window.evaluate(() => {
      const closeBtn = document.querySelector(
        '[role="dialog"][aria-labelledby="cut-list-modal-title"] [aria-label="Close"]'
      ) as HTMLElement;
      if (closeBtn) closeBtn.click();
    });
    await window.waitForTimeout(500);

    // Verify modal is closed
    const modalGone = await window.evaluate(() => {
      const modal = document.querySelector('[role="dialog"][aria-labelledby="cut-list-modal-title"]');
      if (!modal) return true;
      const rect = modal.getBoundingClientRect();
      return rect.width === 0 || rect.height === 0;
    });
    expect(modalGone).toBe(true);
  });

  test('undo removes part, redo restores it', async () => {
    await ensureEditorReady(window);
    if (await isEmptyStateVisible(window)) {
      await addPartFromSidebar(window);
    }
    expect(await isEmptyStateVisible(window)).toBe(false);

    // Dispatch undo/redo keyboard events directly to the document via evaluate().
    // Playwright's keyboard.press() sends events to the focused element, which may
    // not reach the app's document-level keydown handler after modal close.
    const isMac = process.platform === 'darwin';

    // Undo in a loop until all parts are gone (resilient to varying undo stack depth)
    for (let i = 0; i < 20; i++) {
      if (await isEmptyStateVisible(window)) break;
      await window.evaluate((mac: boolean) => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'z',
            code: 'KeyZ',
            metaKey: mac,
            ctrlKey: !mac,
            bubbles: true,
            cancelable: true
          })
        );
      }, isMac);
      await window.waitForTimeout(500);
    }

    expect(await isEmptyStateVisible(window)).toBe(true);

    // Redo in a loop until a part returns
    for (let i = 0; i < 20; i++) {
      if (!(await isEmptyStateVisible(window))) break;
      await window.evaluate((mac: boolean) => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'z',
            code: 'KeyZ',
            metaKey: mac,
            ctrlKey: !mac,
            shiftKey: true,
            bubbles: true,
            cancelable: true
          })
        );
      }, isMac);
      await window.waitForTimeout(500);
    }

    expect(await isEmptyStateVisible(window)).toBe(false);
  });
});
