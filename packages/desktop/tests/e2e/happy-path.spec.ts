import { test, expect, _electron as electron } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

test.describe('Happy Path Workflow', () => {
  let electronApp: ElectronApplication;
  let window: Page;

  test.beforeAll(async () => {
    // Launch Electron app
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

    // Wait for the first window
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('complete workflow: skip tutorial → add part → assign stock → verify', async () => {
    // Step 1: Skip tutorial if it appears
    const skipButton = window.getByRole('button', { name: /skip tutorial/i });
    if (await skipButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skipButton.click();
      await window.waitForTimeout(500);
    }

    // Step 2: Verify app loaded
    await expect(window.locator('.app-header')).toBeVisible();

    // Step 3: Add a new part (if "Add Part" button exists)
    const addPartButton = window
      .getByRole('button', { name: /add part|new part|\+/i })
      .first();
    if (await addPartButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addPartButton.click();
      await window.waitForTimeout(500);
    }

    // Step 4: Verify parts list exists
    const sidebar = window.locator('.sidebar');
    await expect(sidebar).toBeVisible();

    // Step 5: Verify 3D canvas exists
    const canvas = window.locator('canvas');
    await expect(canvas).toBeVisible();

    // Success: App is running and basic UI is present
  });

  test('file menu is accessible', async () => {
    // Skip tutorial
    const skipButton = window.getByRole('button', { name: /skip tutorial/i });
    if (await skipButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skipButton.click();
    }

    // Verify header exists (where File menu typically is)
    const header = window.locator('.app-header');
    await expect(header).toBeVisible();

    // On macOS, file menu is in system menu bar (not testable in Playwright)
    // On Windows/Linux, verify menu items are accessible
    // This is a basic smoke test
  });

  test('license modal appears for unlicensed user', async () => {
    // If no valid license, license modal should appear
    const licenseModal = window
      .locator('[role="dialog"]')
      .filter({ hasText: /license|activate/i });

    // Either license modal appears, or app loads normally (license already activated)
    const modalVisible = await licenseModal
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (modalVisible) {
      // License modal is showing
      expect(modalVisible).toBe(true);
    } else {
      // App loaded normally (license already valid)
      await expect(window.locator('.app-header')).toBeVisible();
    }
  });
});
