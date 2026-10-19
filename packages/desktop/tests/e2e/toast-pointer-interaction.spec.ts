import { expect, test } from '@playwright/test';
import { closeElectronApp, launchElectronApp, seedProject, type RunningElectronApp } from './helpers/electron-app';

test.describe('Toast pointer interaction', () => {
  let running: RunningElectronApp;
  test.beforeEach(async () => {
    running = await launchElectronApp();
    await seedProject(running.window, 'one-part');
  });
  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('hidden stack entries cannot intercept input while visible toast actions remain clickable', async () => {
    await running.window.evaluate(() => {
      document.documentElement.dataset.toastActionClicks = '0';
      for (let index = 0; index < 6; index += 1) {
        window.useUIStore.getState().showToast(`Persistent stack entry ${index}`, 'info', {
          duration: Infinity,
          action: {
            label: `Toast action ${index}`,
            onClick: () => {
              document.documentElement.dataset.toastActionClicks = String(
                Number(document.documentElement.dataset.toastActionClicks) + 1
              );
            }
          }
        });
      }
    });
    const hidden = running.window.locator('[data-sonner-toast][data-visible="false"]');
    await expect.poll(() => hidden.count()).toBeGreaterThan(0);
    // Browser-computed styles exercise the real Sonner cascade, not a mocked
    // toaster or a source-text assertion. The old !important override fails here.
    for (const toast of await hidden.all()) {
      await expect(toast).toHaveCSS('pointer-events', 'none');
      await expect(toast).toHaveCSS('opacity', '0');
    }
    const action = running.window.getByRole('button', { name: 'Toast action 5', exact: true });
    await action.click();
    await expect(running.window.locator('html')).toHaveAttribute('data-toast-action-clicks', '1');
    await running.window.getByRole('button', { name: 'Grid', exact: true }).click();
    await expect.poll(() => running.window.evaluate(() => window.useCameraStore.getState().showGrid)).toBe(false);
  });
});
