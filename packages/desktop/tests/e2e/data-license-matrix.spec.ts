import { expect, test } from '@playwright/test';
import {
  closeElectronApp,
  createBlankProject,
  launchElectronApp,
  type RunningElectronApp
} from './helpers/electron-app';

test.describe('Data management and license flows', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
    await createBlankProject(running.window, 'Data License E2E');
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('opens Data & License settings, exports backup, and walks through app-state import options', async () => {
    const { window } = running;

    await window.getByTitle('App Settings').click();
    const settings = window.getByRole('dialog', { name: 'App Settings' });
    await settings.getByRole('tab', { name: 'Data & License' }).click();
    await expect(settings.getByText('Data Management')).toBeVisible();
    await expect(settings.getByText(/free trial|free version/i)).toBeVisible();

    await settings.getByRole('button', { name: 'Export' }).click();
    await expect(settings).toBeVisible();

    await settings.getByRole('button', { name: 'Import' }).click();
    const importDialog = window.getByRole('dialog', { name: 'Import App State' });
    await expect(importDialog).toBeVisible();
    await expect(
      importDialog.getByText('Import templates, assemblies, stock materials, and custom colors')
    ).toBeVisible();
    await expect(importDialog.getByRole('button', { name: 'Select Backup File' })).toBeVisible();
    await importDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(importDialog).toHaveCount(0);
  });

  test('opens license activation from settings and surfaces invalid license feedback', async () => {
    const { window } = running;

    await window.getByTitle('App Settings').click();
    const settings = window.getByRole('dialog', { name: 'App Settings' });
    await settings.getByRole('tab', { name: 'Data & License' }).click();
    await settings.getByRole('button', { name: 'Enter License Key' }).click();
    if (
      !(await window
        .getByText('Activate Carvd Studio')
        .last()
        .isVisible({ timeout: 3000 })
        .catch(() => false))
    ) {
      await window.getByTitle('App Settings').click();
      const reopenedSettings = window.getByRole('dialog', { name: 'App Settings' });
      await reopenedSettings.getByRole('tab', { name: 'Data & License' }).click();
      await reopenedSettings.getByRole('button', { name: 'Enter License Key' }).click();
    }

    const licenseDialog = window.getByRole('dialog').filter({ hasText: 'Activate Carvd Studio' });
    await expect(licenseDialog).toBeVisible();
    await expect(licenseDialog.getByRole('button', { name: 'Activate License' })).toBeDisabled();

    await licenseDialog.getByLabel('License Key').fill('E2E-BAD-LICENSE-KEY');
    await expect(licenseDialog.getByRole('button', { name: 'Activate License' })).toBeEnabled();
    await licenseDialog.getByRole('button', { name: 'Activate License' }).click();
    await expect(licenseDialog.getByText('Activation Failed')).toBeVisible({ timeout: 10000 });
    await licenseDialog.getByRole('button', { name: 'Close' }).click();
    await expect(licenseDialog).toHaveCount(0);
  });
});
