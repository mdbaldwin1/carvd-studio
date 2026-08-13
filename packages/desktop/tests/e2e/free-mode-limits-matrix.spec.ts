import { expect, test } from '@playwright/test';
import {
  closeElectronApp,
  createBlankProject,
  getProjectSnapshot,
  launchElectronApp,
  openSelectionContextMenu,
  seedProject,
  waitForAppReady,
  type RunningElectronApp
} from './helpers/electron-app';

test.describe('free mode feature and limit gates', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
    await createBlankProject(running.window, 'Free Mode Limits E2E');
    await setLicenseMode(running.window, 'free');
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('blocks adding an eleventh part', async () => {
    const { window } = running;

    await window.evaluate(() => {
      const project = window.useProjectStore.getState();
      for (let index = project.parts.length; index < 10; index += 1) {
        project.addPart({ name: `Free Limit Part ${index + 1}`, position: { x: index * 2, y: 0.375, z: 0 } });
      }
    });
    await expect.poll(async () => (await getProjectSnapshot(window)).parts.length).toBe(10);

    await window.locator('button[title="Add Part"]').first().click();
    await expect(window.getByText('Part limit reached (10). Upgrade to add more parts.')).toBeVisible();
    await expect.poll(async () => (await getProjectSnapshot(window)).parts.length).toBe(10);
  });

  test('blocks project stock creation once the free stock limit is reached', async () => {
    const { window } = running;

    await seedFiveProjectStocks(window);
    await window.locator('button[title="Add Stock from Library"]').click();
    const addStockDialog = window.getByRole('dialog', { name: 'Add Stock to Project' });
    await expect(addStockDialog).toBeVisible();
    await addStockDialog.getByLabel('Create new stock').click();
    await addStockDialog.locator('input[type="text"]').nth(1).fill('Free Mode Extra Stock');
    await addStockDialog.getByRole('button', { name: 'Create & Add to Project' }).click();

    await expect(window.getByText('Stock limit reached (5). Upgrade to add more stock.')).toBeVisible();
    await expect.poll(async () => (await getProjectSnapshot(window)).stocks.length).toBe(5);
    await expect(addStockDialog).toHaveCount(0);
  });

  test('disables premium grouping and assembly actions from real menus and sidebar', async () => {
    const { window } = running;

    await setLicenseMode(window, 'trial');
    await seedProject(window, 'two-parts');
    await setLicenseMode(window, 'free');
    await expect(window.getByText('Assemblies require a license.')).toBeVisible();

    await openSelectionContextMenu(window);
    const menu = window.getByRole('menu');
    await expect(menu.getByRole('menuitem', { name: 'Save as Assembly' })).toBeDisabled();
    await expect(menu.getByRole('menuitem', { name: 'Create Group (G)' })).toBeDisabled();
    await menu.getByRole('menuitem', { name: 'Save as Assembly' }).click({ force: true });
    await expect(window.getByText('Assemblies require a license.')).toBeVisible();
    await expect.poll(async () => (await getProjectSnapshot(window)).groups.length).toBe(0);
  });

  test('hides custom template import and creation controls in free mode', async () => {
    const { window } = running;

    await openTemplatesScreen(window);
    const myTemplatesSection = window.locator('section').filter({
      has: window.getByRole('heading', { name: 'My Templates' })
    });
    await expect(myTemplatesSection.getByText('No custom templates yet.')).toBeVisible();
    await expect(myTemplatesSection.getByRole('button', { name: 'Import' })).toHaveCount(0);
    await expect(myTemplatesSection.getByRole('button', { name: 'New Template' })).toHaveCount(0);
  });
});

async function setLicenseMode(window: import('@playwright/test').Page, mode: 'trial' | 'licensed' | 'free') {
  await window.evaluate((nextMode) => {
    window.useLicenseStore.getState().setLicenseMode(nextMode);
  }, mode);
  await expect.poll(async () => window.evaluate(() => window.useLicenseStore.getState().licenseMode)).toBe(mode);
}

async function seedFiveProjectStocks(window: import('@playwright/test').Page) {
  await window.evaluate(() => {
    const project = window.useProjectStore.getState();
    project.stocks.forEach((stock: { id: string }) => project.deleteStock(stock.id));
    for (let index = 0; index < 5; index += 1) {
      project.addStock({ name: `Free Limit Stock ${index + 1}`, length: 96, width: 48, thickness: 0.75 });
    }
  });
  await expect.poll(async () => (await getProjectSnapshot(window)).stocks.length).toBe(5);
}

async function openTemplatesScreen(window: import('@playwright/test').Page) {
  if (
    await window
      .getByRole('heading', { name: 'Templates', exact: true, level: 1 })
      .isVisible()
      .catch(() => false)
  ) {
    return;
  }

  if (
    await window
      .getByRole('button', { name: 'Carvd Studio home' })
      .isVisible()
      .catch(() => false)
  ) {
    await window.getByRole('button', { name: 'Carvd Studio home' }).click();
    const unsavedDialog = window.getByRole('alertdialog', { name: 'Unsaved Changes' });
    if (await unsavedDialog.isVisible({ timeout: 1000 }).catch(() => false)) {
      await unsavedDialog.getByRole('button', { name: "Don't Save" }).click();
    }
  }

  await waitForAppReady(window);
  await window.getByRole('button', { name: 'View All' }).click();
  await expect(window.getByRole('heading', { name: 'Templates', exact: true, level: 1 })).toBeVisible();
}
