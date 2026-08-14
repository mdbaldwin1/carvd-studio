import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  closeElectronApp,
  getProjectSnapshot,
  launchElectronApp,
  seedProject,
  type RunningElectronApp
} from './helpers/electron-app';

test.describe('desktop form validation matrix', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('stock creation and edit forms disable saving invalid stock data', async () => {
    const { window } = running;
    await seedProject(window, 'empty');

    await window.getByTitle('Stock Library').click();
    const library = window.getByRole('dialog', { name: /Stock Library|Library/ });
    await expect(library).toBeVisible();

    await library.getByLabel('Create new stock').click();
    await expect(library.getByRole('heading', { name: 'Create Stock' })).toBeVisible();
    const createButton = library.getByRole('button', { name: 'Create', exact: true });
    await expect(createButton).toBeEnabled();

    await getTextInputAfterLabel(library, 'Name').first().fill('');
    await expect(createButton).toBeDisabled();

    await getTextInputAfterLabel(library, 'Name').first().fill('E2E Validation Stock');
    await getNumberInputAfterLabel(library, 'Price ($)').fill('-12.50');
    await createButton.click();
    await expect(library.getByRole('heading', { name: 'E2E Validation Stock' })).toBeVisible();

    let stocks = await window.evaluate(() => window.electronAPI.getPreference('stockLibrary'));
    expect(stocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'E2E Validation Stock',
          pricePerUnit: -12.5
        })
      ])
    );

    await library.getByRole('button', { name: /E2E Validation Stock/ }).click();
    await library.getByRole('button', { name: 'Edit', exact: true }).click();
    const saveButton = library.getByRole('button', { name: 'Save', exact: true });
    await getTextInputAfterLabel(library, 'Name').first().fill('');
    await expect(saveButton).toBeDisabled();

    await library.getByRole('button', { name: 'Cancel' }).click();
    await expect(library.getByRole('heading', { name: 'E2E Validation Stock' })).toBeVisible();
    stocks = await window.evaluate(() => window.electronAPI.getPreference('stockLibrary'));
    expect(stocks).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'E2E Validation Stock' })]));
  });

  test('project and app settings clamp numeric fields and persist select-based defaults', async () => {
    const { window } = running;
    await seedProject(window, 'one-part');

    await window.getByRole('button', { name: 'Project Settings' }).click();
    const projectSettings = window.getByRole('dialog', { name: 'Project Settings' });
    await projectSettings.getByRole('tab', { name: 'Preferences' }).click();
    const overageInput = projectSettings.locator('input[type="number"]').first();
    await overageInput.fill('95');
    await expect.poll(async () => (await getProjectSnapshot(window)).overageFactor).toBe(0.5);
    await overageInput.fill('-20');
    await expect.poll(async () => (await getProjectSnapshot(window)).overageFactor).toBe(0);
    await projectSettings.getByRole('button', { name: 'Done' }).click();

    await window.getByTitle('App Settings').click();
    const appSettings = window.getByRole('dialog', { name: 'App Settings' });
    await appSettings.getByRole('tab', { name: 'New Project Defaults' }).click();
    const selects = appSettings.locator('select').filter({ visible: true });
    await selects.first().selectOption('metric');
    await selects.nth(1).selectOption({ label: '10mm' });
    await expect
      .poll(async () => window.evaluate(() => window.electronAPI.getPreference('defaultUnits')))
      .toBe('metric');
    await expect
      .poll(async () => window.evaluate(() => window.electronAPI.getPreference('defaultGridSize')))
      .toBeCloseTo(10 / 25.4, 5);
  });

  test('template setup and save dialogs require a name before proceeding', async () => {
    const { window } = running;
    await seedProject(window, 'empty');

    await window.getByRole('button', { name: 'Carvd Studio home' }).click();
    await window.getByRole('button', { name: 'View All' }).click();
    await window.getByRole('button', { name: 'New Template' }).click();
    const setupDialog = window.getByRole('alertdialog').filter({ hasText: 'Create New Template' });
    await expect(setupDialog.getByRole('button', { name: 'Start Editing' })).toBeDisabled();
    await setupDialog.getByLabel('Name').fill('E2E Validation Template');
    await expect(setupDialog.getByRole('button', { name: 'Start Editing' })).toBeEnabled();
    await setupDialog.getByRole('button', { name: 'Start Editing' }).click();

    await expect(window.getByText('Template', { exact: true })).toBeVisible();
    await expect(window.getByRole('button', { name: 'E2E Validation Template' })).toBeVisible();
  });

  test('assembly save and edit forms require names and preserve state on cancel', async () => {
    const { window } = running;
    await seedProject(window, 'two-parts');

    await window.evaluate(() => window.useUIStore.getState().openSaveAssemblyModal());
    const saveAssembly = window.getByRole('dialog', { name: 'Save as Assembly' });
    await expect(saveAssembly).toBeVisible();
    await getTextInputAfterLabel(saveAssembly, 'Name *').first().fill('');
    await saveAssembly.getByRole('button', { name: 'Save Assembly' }).click();
    await expect(saveAssembly.getByText('Please enter a name')).toBeVisible();
    await getTextInputAfterLabel(saveAssembly, 'Name *').first().fill('E2E Validation Assembly');
    await saveAssembly.getByRole('button', { name: 'Save Assembly' }).click();
    await expect(saveAssembly).toHaveCount(0);
    await expect.poll(async () => (await getProjectSnapshot(window)).assemblies.length).toBe(1);

    await window.getByTitle('Stock Library').click();
    const library = window.getByRole('dialog', { name: /Stock Library|Library/ });
    await library.getByRole('tab', { name: 'Assemblies' }).click();
    await library.getByRole('button', { name: /E2E Validation Assembly/ }).click();
    await library.getByRole('button', { name: 'Edit', exact: true }).click();
    const saveButton = library.getByRole('button', { name: 'Save', exact: true });
    await getTextInputAfterLabel(library, 'Name').first().fill('');
    await expect(saveButton).toBeDisabled();
    await library.getByRole('button', { name: 'Cancel' }).click();
    await expect(library.getByRole('heading', { name: 'E2E Validation Assembly' })).toBeVisible();
  });

  test('license activation disables empty submit and reports invalid keys', async () => {
    const { window } = running;
    await seedProject(window, 'empty');

    await window.getByTitle('App Settings').click();
    const appSettings = window.getByRole('dialog', { name: 'App Settings' });
    await appSettings.getByRole('tab', { name: 'Data & License' }).click();
    await appSettings.getByRole('button', { name: 'Enter License Key' }).click();

    const licenseDialog = window.getByRole('dialog').filter({ hasText: 'Activate Carvd Studio' });
    await expect(licenseDialog.getByRole('button', { name: 'Activate License' })).toBeDisabled();
    await licenseDialog.getByLabel('License Key').fill('E2E-BAD-LICENSE-KEY');
    await expect(licenseDialog.getByRole('button', { name: 'Activate License' })).toBeEnabled();
    await licenseDialog.getByRole('button', { name: 'Activate License' }).click();
    await expect(licenseDialog.getByText('Activation Failed')).toBeVisible({ timeout: 10000 });
  });
});

function getTextInputAfterLabel(scope: Locator, label: string) {
  return scope.locator(`xpath=.//*[normalize-space()="${label}"]/following::input[not(@type="number")][1]`);
}

function getNumberInputAfterLabel(scope: Locator, label: string) {
  return scope.locator(`xpath=.//*[normalize-space()="${label}"]/following::input[@type="number"][1]`);
}
