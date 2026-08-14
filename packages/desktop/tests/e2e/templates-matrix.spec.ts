import { test, expect } from '@playwright/test';
import {
  addPartFromSidebar,
  closeElectronApp,
  getProjectSnapshot,
  launchElectronApp,
  waitForAppReady,
  type RunningElectronApp
} from './helpers/electron-app';

test.describe('template browser and editor flows', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
    await waitForAppReady(running.window);
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('creates, saves, reopens, and deletes a custom template through the app UI', async () => {
    const { window } = running;

    await window.getByRole('button', { name: 'View All' }).click();
    await expect(window.getByRole('heading', { name: 'Templates', exact: true })).toBeVisible();
    await expect(window.getByRole('heading', { name: 'Built-in Templates' })).toBeVisible();
    await expect(window.getByRole('heading', { name: 'My Templates' })).toBeVisible();

    await window.getByRole('button', { name: 'New Template' }).click();
    const setupDialog = window.getByRole('alertdialog', { name: 'Create New Template' });
    await expect(setupDialog).toBeVisible();
    await setupDialog.getByLabel('Name').fill('E2E Router Table');
    await setupDialog.getByLabel('Description (optional)').fill('Template created by the Electron e2e suite.');
    await expect(setupDialog.getByRole('button', { name: 'Start Editing' })).toBeEnabled();
    await setupDialog.getByRole('button', { name: 'Start Editing' }).click();

    await expect(window.getByText('/')).toBeVisible();
    await expect(window.getByText('Template')).toBeVisible();
    await expect(window.getByText('E2E Router Table')).toBeVisible();
    await addPartFromSidebar(window);
    await expect.poll(async () => (await getProjectSnapshot(window)).parts.length).toBe(1);

    await window.getByTitle('Save (Cmd+S)').click();

    await expect
      .poll(async () => window.evaluate(() => window.electronAPI.getUserTemplates()), { timeout: 10000 })
      .toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'E2E Router Table',
            description: 'Template created by the Electron e2e suite.',
            partCount: 1
          })
        ])
      );

    await expect(window.getByRole('heading', { name: 'Templates', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(window.getByText('E2E Router Table').first()).toBeVisible();

    await window.getByText('E2E Router Table').first().hover();
    await window.getByLabel('Delete E2E Router Table').click();
    const deleteDialog = window.getByRole('alertdialog', { name: 'Delete this template?' });
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole('button', { name: 'Delete' }).click();

    await expect
      .poll(async () => window.evaluate(() => window.electronAPI.getUserTemplates()), { timeout: 5000 })
      .not.toEqual(expect.arrayContaining([expect.objectContaining({ name: 'E2E Router Table' })]));
  });
});
