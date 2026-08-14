import { expect, test } from '@playwright/test';
import {
  closeElectronApp,
  getProjectSnapshot,
  launchElectronApp,
  seedProject,
  type RunningElectronApp
} from './helpers/electron-app';

test.describe('properties panel matrix', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('single part properties edit grain direction, color, assigned stock, and notes', async () => {
    const { window } = running;
    await seedProject(window, 'one-part');
    const stockId = await addProjectStock(window, 'Properties Cherry', '#884422');
    await window.evaluate(() => {
      const project = window.useProjectStore.getState();
      project.setStockConstraints({ ...project.stockConstraints, constrainGrain: false, constrainColor: false });
    });

    const panel = window.locator('.properties-panel');
    await panel.locator('select').first().selectOption(stockId);
    await panel.getByLabel('Choose custom color').fill('#123456');
    await panel.locator('select').nth(1).selectOption('width');
    await panel.getByText('Notes').click();
    await panel.locator('textarea').fill('Properties panel e2e notes.');

    const part = (await getProjectSnapshot(window)).parts[0];
    expect(part.stockId).toBe(stockId);
    expect(part.color).toBe('#123456');
    expect(part.grainDirection).toBe('width');
    expect(await window.evaluate(() => window.useProjectStore.getState().parts[0].notes)).toBe(
      'Properties panel e2e notes.'
    );
  });

  test('custom colors can be added from color controls and reused', async () => {
    const { window } = running;
    await seedProject(window, 'one-part');
    await window.evaluate(() => {
      const project = window.useProjectStore.getState();
      project.setStockConstraints({ ...project.stockConstraints, constrainColor: false });
    });

    const panel = window.locator('.properties-panel');
    await panel.getByLabel('Choose custom color').fill('#345678');
    await panel.getByRole('button', { name: 'Save Color' }).click();
    await panel.getByRole('button', { name: 'Save', exact: true }).click();

    await expect.poll(() => getCustomColors(window), { timeout: 5000 }).toContain('#345678');
    await panel.getByLabel('Choose custom color').fill('#c4a574');
    await panel.getByLabel('Select custom color #345678').click();
    await expect.poll(async () => (await getProjectSnapshot(window)).parts[0].color).toBe('#345678');
  });

  test('multi-selection properties apply shared editable fields to all selected parts', async () => {
    const { window } = running;
    await seedProject(window, 'two-parts');
    const stockId = await addProjectStock(window, 'Batch Maple', '#ddaa66');

    const panel = window.locator('.properties-panel');
    await expect(panel.getByText('2 parts selected')).toBeVisible();
    await panel.locator('select').first().selectOption(stockId);
    await expect
      .poll(async () => (await getProjectSnapshot(window)).parts.map((part) => part.stockId))
      .toEqual([stockId, stockId]);

    await panel.getByRole('button', { name: 'Duplicate All' }).click();
    await expect.poll(async () => (await getProjectSnapshot(window)).parts.length).toBe(4);
  });

  test('free mode hides or blocks grain controls', async () => {
    const { window } = running;
    await seedProject(window, 'stocked-one-part');
    await window.evaluate(() => {
      window.useLicenseStore.getState().setLicenseMode('free');
      const project = window.useProjectStore.getState();
      project.setStockConstraints({ ...project.stockConstraints, constrainGrain: true });
    });

    const grainSelect = window.locator('.properties-panel').locator('select').nth(1);
    await expect(grainSelect).toBeDisabled();
    await expect(window.getByText(/Locked by stock grain constraint|Grain Direction/)).toBeVisible();
  });
});

async function addProjectStock(window: import('@playwright/test').Page, name: string, color: string) {
  return window.evaluate(
    ({ stockName, stockColor }) =>
      window.useProjectStore.getState().addStock({
        name: stockName,
        length: 96,
        width: 48,
        thickness: 0.75,
        grainDirection: 'length',
        color: stockColor
      }),
    { stockName: name, stockColor: color }
  );
}

async function getCustomColors(window: import('@playwright/test').Page) {
  return window.evaluate(async () => ((await window.electronAPI.getPreference('customColors')) as string[]) ?? []);
}
