import { expect, test, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import {
  closeElectronApp,
  getProjectSnapshot,
  launchElectronApp,
  queueSavePath,
  seedProject,
  type RunningElectronApp
} from './helpers/electron-app';

test.describe('cut list export, validation, and license gates', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('downloads PDF and CSV from parts, diagrams, shopping list, and project report actions', async () => {
    const { window, userDataDir } = running;
    await seedProject(window, 'stocked-one-part');
    const cutListDialog = await generateCutList(window);

    const partsPdfPath = path.join(userDataDir, 'parts-list.pdf');
    await queueSavePath(window, partsPdfPath);
    await clickTabDownloadItem(cutListDialog, '.cut-list-parts-tab', 'Download PDF');
    await expectSavedFile(partsPdfPath);
    await expect(window.getByText('Parts list saved to PDF')).toBeVisible();

    const partsCsvPath = path.join(userDataDir, 'parts-list.csv');
    await queueSavePath(window, partsCsvPath);
    await clickTabDownloadItem(cutListDialog, '.cut-list-parts-tab', 'Download CSV');
    await expectSavedFile(partsCsvPath);
    expect(fs.readFileSync(partsCsvPath, 'utf8')).toContain('Part ID');

    await cutListDialog.getByRole('tab', { name: /Cutting Diagrams/ }).click();
    const diagramsPdfPath = path.join(userDataDir, 'cutting-diagrams.pdf');
    await queueSavePath(window, diagramsPdfPath);
    await clickTabDownloadItem(cutListDialog, '.cut-list-diagrams-tab', 'Download PDF');
    await expectSavedFile(diagramsPdfPath);
    await expect(window.getByText('Cutting diagrams saved to PDF')).toBeVisible();

    await cutListDialog.getByRole('tab', { name: /Shopping List/ }).click();
    const shoppingPdfPath = path.join(userDataDir, 'shopping-list.pdf');
    await queueSavePath(window, shoppingPdfPath);
    await clickTabDownloadItem(cutListDialog, '.shopping-list-tab', 'Download PDF');
    await expectSavedFile(shoppingPdfPath);
    await expect(window.getByText('Shopping list saved to PDF')).toBeVisible();

    const shoppingCsvPath = path.join(userDataDir, 'shopping-list.csv');
    await queueSavePath(window, shoppingCsvPath);
    await clickTabDownloadItem(cutListDialog, '.shopping-list-tab', 'Download CSV');
    await expectSavedFile(shoppingCsvPath);
    expect(fs.readFileSync(shoppingCsvPath, 'utf8')).toContain('LUMBER & SHEET GOODS');

    const reportPdfPath = path.join(userDataDir, 'project-report.pdf');
    await queueSavePath(window, reportPdfPath);
    await cutListDialog.getByRole('button', { name: 'Download Project Report' }).click();
    await expectSavedFile(reportPdfPath);
    await expect(window.getByText('Project report saved to PDF')).toBeVisible();
  });

  test('surfaces blocking validation for unassigned, oversize, and too-thick parts', async () => {
    const { window } = running;
    await seedInvalidCutListProject(window);

    const cutListDialog = await openCutListDialog(window);
    await cutListDialog.getByRole('button', { name: 'Generate Cut List' }).click();

    await expect(cutListDialog.getByText('Issues Found')).toBeVisible();
    await expect(cutListDialog.getByText('Unassigned Part:')).toBeVisible();
    await expect(cutListDialog.getByText('No stock assigned')).toBeVisible();
    await expect(cutListDialog.getByText('Oversize Part:')).toBeVisible();
    await expect(cutListDialog.getByText(/Dimensions .* exceed stock/)).toBeVisible();
    await expect(cutListDialog.getByText('Too Thick Part:')).toBeVisible();
    await expect(cutListDialog.getByText(/Thickness .* exceeds stock/)).toBeVisible();
    await expect(cutListDialog.getByRole('tab', { name: /Parts List/ })).toHaveCount(0);
    expect((await getProjectSnapshot(window)).cutList).toBeNull();
  });

  test('allows warning-only grain mismatch and glue-up width cases to generate a cut list', async () => {
    const { window } = running;
    await seedWarningOnlyCutListProject(window);

    const cutListDialog = await generateCutList(window);
    await expect(cutListDialog.getByRole('tab', { name: /Parts List/ })).toBeVisible();
    await expect(cutListDialog.getByText('Grain Mismatch Part')).toBeVisible();

    const snapshot = await getProjectSnapshot(window);
    const generatedPartNames = snapshot.cutList?.instructions.map(
      (instruction: { partName: string }) => instruction.partName
    );
    expect(generatedPartNames).toContain('Grain Mismatch Part');
    expect(snapshot.cutList?.skippedParts).toEqual([]);
    expect(snapshot.cutList?.instructions.length ?? 0).toBeGreaterThan(1);
  });

  test('free mode blocks optimizer and PDF export from the real cut-list modal', async () => {
    const { window } = running;
    await seedProject(window, 'stocked-one-part');
    await setLicenseMode(window, 'free');

    let cutListDialog = await openCutListDialog(window);
    await cutListDialog.getByRole('button', { name: 'Generate Cut List' }).click();
    await expect(window.getByText('Cut list optimizer requires a license.')).toBeVisible();
    await expect(cutListDialog.getByRole('tab', { name: /Parts List/ })).toHaveCount(0);

    await cutListDialog.getByRole('button', { name: 'Cancel' }).click();
    await setLicenseMode(window, 'trial');
    cutListDialog = await generateCutList(window);
    await cutListDialog.getByRole('button', { name: 'Done' }).click();

    await setLicenseMode(window, 'free');
    cutListDialog = await openCutListDialog(window);
    await expect(cutListDialog.getByRole('button', { name: 'Download Project Report' })).toBeDisabled();
    await cutListDialog.locator('.cut-list-parts-tab').getByRole('button', { name: 'Download' }).click();
    await expect(window.getByRole('menuitem', { name: 'Download PDF' })).toHaveAttribute('data-disabled');
    await window.keyboard.press('Escape');
  });
});

async function openCutListDialog(window: Page) {
  await window.getByRole('button', { name: /Generate Cut List|View Cut List/ }).click();
  const cutListDialog = window.getByRole('dialog').filter({ has: window.getByRole('heading', { name: 'Cut List' }) });
  await expect(cutListDialog).toBeVisible({ timeout: 10000 });
  return cutListDialog;
}

async function generateCutList(window: Page) {
  const cutListDialog = await openCutListDialog(window);
  await cutListDialog.getByRole('button', { name: 'Generate Cut List' }).click();
  await expect(cutListDialog.getByRole('tab', { name: /Parts List/ })).toBeVisible({ timeout: 10000 });
  return cutListDialog;
}

async function clickTabDownloadItem(cutListDialog: ReturnType<Page['locator']>, tabSelector: string, itemName: string) {
  await cutListDialog.locator(tabSelector).getByRole('button', { name: 'Download' }).click();
  await cutListDialog.page().getByRole('menuitem', { name: itemName }).click();
}

async function expectSavedFile(filePath: string) {
  await expect.poll(() => fs.existsSync(filePath), { timeout: 5000 }).toBe(true);
  expect(fs.statSync(filePath).size).toBeGreaterThan(0);
}

async function setLicenseMode(window: Page, mode: 'trial' | 'licensed' | 'free') {
  await window.evaluate((licenseMode) => {
    window.useLicenseStore.getState().setLicenseMode(licenseMode);
  }, mode);
  await expect.poll(async () => window.evaluate(() => window.useLicenseStore.getState().licenseMode)).toBe(mode);
}

async function seedInvalidCutListProject(window: Page) {
  await seedProject(window, 'empty');
  await window.evaluate(() => {
    const project = window.useProjectStore.getState();
    project.newProject();
    const stockId = project.addStock({
      name: 'Small Test Stock',
      length: 24,
      width: 8,
      thickness: 0.75,
      color: '#d4a574',
      grainDirection: 'length'
    });
    project.addPart({
      name: 'Unassigned Part',
      length: 8,
      width: 4,
      thickness: 0.75,
      stockId: null,
      position: { x: 0, y: 0.375, z: 0 },
      color: '#c4a574',
      grainDirection: 'length'
    });
    project.addPart({
      name: 'Oversize Part',
      length: 36,
      width: 10,
      thickness: 0.75,
      stockId,
      position: { x: 20, y: 0.375, z: 0 },
      color: '#c4a574',
      grainDirection: 'length'
    });
    project.addPart({
      name: 'Too Thick Part',
      length: 8,
      width: 4,
      thickness: 2,
      stockId,
      position: { x: 40, y: 1, z: 0 },
      color: '#c4a574',
      grainDirection: 'length'
    });
  });
}

async function seedWarningOnlyCutListProject(window: Page) {
  await seedProject(window, 'empty');
  await window.evaluate(() => {
    const project = window.useProjectStore.getState();
    project.newProject();
    const stockId = project.addStock({
      name: 'Long Test Stock',
      length: 96,
      width: 8,
      thickness: 0.75,
      color: '#d4a574',
      grainDirection: 'length'
    });
    project.addPart({
      name: 'Grain Mismatch Part',
      length: 24,
      width: 6,
      thickness: 0.75,
      stockId,
      position: { x: 0, y: 0.375, z: 0 },
      color: '#c4a574',
      grainSensitive: true,
      grainDirection: 'width'
    });
    project.addPart({
      name: 'Glue-Up Panel',
      length: 24,
      width: 18,
      thickness: 0.75,
      stockId,
      position: { x: 30, y: 0.375, z: 0 },
      color: '#c4a574',
      grainSensitive: true,
      grainDirection: 'length',
      glueUpPanel: true
    });
  });
}
