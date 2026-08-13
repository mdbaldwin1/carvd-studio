import { expect, test } from '@playwright/test';
import {
  closeElectronApp,
  getProjectSnapshot,
  launchElectronApp,
  seedProject,
  type RunningElectronApp
} from './helpers/electron-app';

test.describe('Cut list, shopping list, and settings workflows', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('generates a cut list from stocked parts and adds a custom shopping item', async () => {
    await seedProject(running.window, 'stocked-one-part');

    await running.window.getByRole('button', { name: 'Generate Cut List' }).click();
    const cutListDialog = running.window.getByRole('dialog').filter({ hasText: 'Cut List' });
    await expect(cutListDialog.getByRole('button', { name: 'Generate Cut List' })).toBeVisible({ timeout: 10000 });
    await cutListDialog.getByRole('button', { name: 'Generate Cut List' }).click();

    await expect(running.window.getByRole('tab', { name: /Parts List/ })).toBeVisible({ timeout: 10000 });
    await expect(running.window.getByRole('tab', { name: /Cutting Diagrams/ })).toBeVisible();
    await expect(running.window.getByRole('tab', { name: /Shopping List/ })).toBeVisible();
    await expect.poll(async () => (await getProjectSnapshot(running.window)).cutList?.instructions.length ?? 0).toBe(1);

    await running.window.getByRole('tab', { name: /Shopping List/ }).click();
    await running.window.getByRole('button', { name: '+ Add Item' }).click();
    const form = running.window.getByLabel('Custom shopping item form');
    await form.getByPlaceholder(/Item name/).fill('E2E Screws');
    await form.locator('input[type="number"]').nth(0).fill('2');
    await form.locator('input[type="number"]').nth(1).fill('7.5');
    await form.getByRole('button', { name: 'Add', exact: true }).click();

    await expect(running.window.getByText('E2E Screws')).toBeVisible();
    const snapshot = await getProjectSnapshot(running.window);
    expect(snapshot.customShoppingItems).toMatchObject([{ name: 'E2E Screws', quantity: 2, unitPrice: 7.5 }]);
  });

  test('updates project details and preferences through project settings', async () => {
    await seedProject(running.window, 'one-part');

    await running.window.getByRole('button', { name: 'Project Settings' }).click();
    await expect(running.window.getByRole('dialog')).toContainText('Project Settings');

    await running.window.getByPlaceholder('Project name').fill('E2E Settings Project');
    await running.window.getByPlaceholder(/Add notes/).fill('Notes added by e2e.');
    await running.window.getByRole('tab', { name: 'Preferences' }).click();
    await running.window.locator('select:has(option[value="metric"])').selectOption('metric');
    await running.window.getByRole('button', { name: 'Done' }).click();

    const snapshot = await getProjectSnapshot(running.window);
    expect(snapshot.projectName).toBe('E2E Settings Project');
    expect(snapshot.projectNotes).toBe('Notes added by e2e.');
    expect(snapshot.units).toBe('metric');
  });

  test('opens global settings and stock library from header controls', async () => {
    await seedProject(running.window, 'empty');

    await running.window.getByTitle('App Settings').click();
    await expect(running.window.getByRole('dialog')).toContainText('App Settings');
    await running.window.getByLabel('Close').click();

    await running.window.getByTitle('Stock Library').click();
    await expect(running.window.getByRole('dialog')).toContainText(/Stock Library|Library/);
    await running.window.getByLabel('Close').click();
  });
});
