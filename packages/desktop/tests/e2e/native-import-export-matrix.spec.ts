import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import {
  closeElectronApp,
  createBlankProject,
  launchElectronApp,
  waitForAppReady,
  type RunningElectronApp
} from './helpers/electron-app';

type ElectronAPIWithTestDialogs = Window['electronAPI'] & {
  queueTestSaveDialogPath: (filePath: string | null) => Promise<{ success: boolean; error?: string }>;
  queueTestOpenDialogPaths: (filePaths: string[] | null) => Promise<{ success: boolean; error?: string }>;
};

const stock = {
  id: 'e2e-stock-native-roundtrip',
  name: 'E2E Native Export Walnut',
  length: 96,
  width: 8,
  thickness: 0.75,
  grainDirection: 'length' as const,
  pricingUnit: 'board_foot' as const,
  pricePerUnit: 12.5,
  color: '#6b3f24'
};

const template = {
  id: 'e2e-template-native-roundtrip',
  name: 'E2E Native Export Template',
  description: 'Template seeded for native import/export e2e coverage.',
  dimensions: { width: 24, depth: 12, height: 18 },
  partCount: 1,
  thumbnail: '📦',
  category: 'shop' as const,
  createdAt: '2026-08-13T12:00:00.000Z',
  project: JSON.stringify({
    name: 'E2E Native Export Template',
    parts: [],
    stocks: [],
    groups: [],
    groupMembers: []
  })
};

const assembly = {
  id: 'e2e-assembly-native-roundtrip',
  name: 'E2E Native Export Assembly',
  description: 'Assembly seeded for native import/export e2e coverage.',
  thumbnail: '🧩',
  parts: [
    {
      name: 'Assembly Rail',
      length: 24,
      width: 3,
      thickness: 0.75,
      relativePosition: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      stockId: stock.id,
      grainSensitive: true,
      grainDirection: 'length' as const,
      color: stock.color
    }
  ],
  groups: [],
  groupMembers: [],
  createdAt: '2026-08-13T12:00:00.000Z',
  modifiedAt: '2026-08-13T12:00:00.000Z'
};

test.describe('native import/export round trips', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
    await createBlankProject(running.window, 'Native Import Export E2E');
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('exports and imports app backup, stocks, templates, and assemblies through file-dialog backed UI flows', async () => {
    const { window, userDataDir } = running;
    const outDir = path.join(userDataDir, 'roundtrip-files');
    fs.mkdirSync(outDir, { recursive: true });

    await seedLibraries(window);

    const backupPath = path.join(outDir, 'native-roundtrip.carvd-backup');
    await queueSavePath(window, backupPath);
    await window.getByTitle('App Settings').click();
    const settings = window.getByRole('dialog', { name: 'App Settings' });
    await settings.getByRole('tab', { name: 'Data & License' }).click();
    await settings.getByRole('button', { name: 'Export' }).click();
    await expect.poll(() => fs.existsSync(backupPath), { timeout: 5000 }).toBe(true);
    expect(readJson(backupPath)).toMatchObject({
      version: 1,
      data: {
        userTemplates: [expect.objectContaining({ name: template.name })],
        assemblyLibrary: [expect.objectContaining({ name: assembly.name })],
        stockLibrary: [expect.objectContaining({ name: stock.name })],
        customColors: ['#123456']
      }
    });

    await clearLibraries(window);
    await queueOpenPaths(window, [backupPath]);
    await settings.getByRole('button', { name: 'Import' }).click();
    const importDialog = window.getByRole('dialog', { name: 'Import App State' });
    await importDialog.getByRole('button', { name: 'Select Backup File' }).click();
    await expect(importDialog.getByText('Backup Contents')).toBeVisible();
    await expect(importDialog.getByText('Templates (1)')).toBeVisible();
    await expect(importDialog.getByText('Assemblies (1)')).toBeVisible();
    await expect(importDialog.getByText('Stock Materials (1)')).toBeVisible();
    await importDialog.getByRole('button', { name: 'Import' }).click();
    await expect(importDialog.getByText('Import Complete')).toBeVisible({ timeout: 5000 });
    await importDialog.getByRole('button', { name: 'Done' }).click();
    await expect(importDialog).toHaveCount(0);
    await expect
      .poll(async () => getLibraryNames(window), { timeout: 5000 })
      .toMatchObject({
        stocks: [stock.name],
        templates: [template.name],
        assemblies: [assembly.name],
        colors: ['#123456']
      });
    if (await settings.isVisible().catch(() => false)) {
      await settings.getByLabel('Close').click();
    }

    await assertStockRoundTrip(window, outDir);
    await assertAssemblyRoundTrip(window, outDir);
    await assertTemplateRoundTrip(window, outDir);
  });
});

async function assertStockRoundTrip(window: import('@playwright/test').Page, outDir: string) {
  const stockPath = path.join(outDir, 'stock-roundtrip.carvd-stocks');
  await window.getByTitle('Stock Library').click();
  const dialog = window.getByRole('dialog', { name: 'App Library' });
  await dialog.getByRole('button', { name: /E2E Native Export Walnut/ }).click();
  await queueSavePath(window, stockPath);
  await dialog.getByRole('button', { name: 'Export', exact: true }).click();
  await expect.poll(() => fs.existsSync(stockPath), { timeout: 5000 }).toBe(true);
  expect(readJson(stockPath)).toMatchObject({ type: 'stocks', data: [expect.objectContaining({ name: stock.name })] });

  await window.evaluate(() => window.electronAPI.setPreference('stockLibrary', []));
  await queueOpenPaths(window, [stockPath]);
  await dialog.getByLabel('Import stocks').click();
  await expect.poll(async () => getLibraryNames(window), { timeout: 5000 }).toMatchObject({ stocks: [stock.name] });
  await dialog.getByText('Close', { exact: true }).click();
}

async function assertAssemblyRoundTrip(window: import('@playwright/test').Page, outDir: string) {
  const assemblyPath = path.join(outDir, 'assembly-roundtrip.carvd-assembly');
  await window.getByTitle('Stock Library').click();
  const dialog = window.getByRole('dialog', { name: 'App Library' });
  await dialog.getByRole('tab', { name: 'Assemblies' }).click();
  await dialog.getByRole('button', { name: /E2E Native Export Assembly/ }).click();
  await queueSavePath(window, assemblyPath);
  await dialog.getByRole('button', { name: 'Export', exact: true }).click();
  await expect.poll(() => fs.existsSync(assemblyPath), { timeout: 5000 }).toBe(true);
  expect(readJson(assemblyPath)).toMatchObject({
    type: 'assembly',
    data: expect.objectContaining({ name: assembly.name }),
    referencedStocks: [expect.objectContaining({ name: stock.name })]
  });

  await window.evaluate(() => window.electronAPI.setPreference('assemblyLibrary', []));
  await queueOpenPaths(window, [assemblyPath]);
  await dialog.getByLabel('Import assembly').click();
  await expect
    .poll(async () => getLibraryNames(window), { timeout: 5000 })
    .toMatchObject({ assemblies: [assembly.name] });
  await dialog.getByText('Close', { exact: true }).click();
}

async function assertTemplateRoundTrip(window: import('@playwright/test').Page, outDir: string) {
  const templatePath = path.join(outDir, 'template-roundtrip.carvd-template');
  await openTemplatesScreen(window);
  await queueSavePath(window, templatePath);
  await window.getByLabel(`Export ${template.name}`, { exact: true }).click();
  await expect.poll(() => fs.existsSync(templatePath), { timeout: 5000 }).toBe(true);
  expect(readJson(templatePath)).toMatchObject({
    type: 'template',
    data: expect.objectContaining({ name: template.name })
  });

  await window.evaluate(() => window.electronAPI.setPreference('userTemplates', []));
  await window.reload();
  await waitForAppReady(window);
  await openTemplatesScreen(window);
  await queueOpenPaths(window, [templatePath]);
  await window.getByRole('button', { name: 'Import' }).click();
  await expect
    .poll(async () => getLibraryNames(window), { timeout: 5000 })
    .toMatchObject({ templates: [template.name] });
  await expect(window.getByText(template.name).first()).toBeVisible();
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

  await window.getByRole('button', { name: 'View All' }).click();
  await expect(window.getByRole('heading', { name: 'Templates', exact: true, level: 1 })).toBeVisible();
}

async function seedLibraries(window: import('@playwright/test').Page) {
  await window.evaluate(
    async ({ seededStock, seededTemplate, seededAssembly }) => {
      await window.electronAPI.setPreference('stockLibrary', [seededStock]);
      await window.electronAPI.setPreference('userTemplates', [seededTemplate]);
      await window.electronAPI.setPreference('assemblyLibrary', [seededAssembly]);
      await window.electronAPI.setPreference('customColors', ['#123456']);
    },
    { seededStock: stock, seededTemplate: template, seededAssembly: assembly }
  );
}

async function clearLibraries(window: import('@playwright/test').Page) {
  await window.evaluate(async () => {
    await window.electronAPI.setPreference('stockLibrary', []);
    await window.electronAPI.setPreference('userTemplates', []);
    await window.electronAPI.setPreference('assemblyLibrary', []);
    await window.electronAPI.setPreference('customColors', []);
  });
}

async function getLibraryNames(window: import('@playwright/test').Page) {
  return window.evaluate(async () => ({
    stocks: ((await window.electronAPI.getPreference('stockLibrary')) as Array<{ name: string }>).map(
      (item) => item.name
    ),
    templates: ((await window.electronAPI.getPreference('userTemplates')) as Array<{ name: string }>).map(
      (item) => item.name
    ),
    assemblies: ((await window.electronAPI.getPreference('assemblyLibrary')) as Array<{ name: string }>).map(
      (item) => item.name
    ),
    colors: (await window.electronAPI.getPreference('customColors')) as string[]
  }));
}

async function queueSavePath(window: import('@playwright/test').Page, filePath: string) {
  const result = await window.evaluate(async (queuedPath) => {
    const api = window.electronAPI as ElectronAPIWithTestDialogs;
    return api.queueTestSaveDialogPath(queuedPath);
  }, filePath);
  expect(result).toMatchObject({ success: true });
}

async function queueOpenPaths(window: import('@playwright/test').Page, filePaths: string[]) {
  const result = await window.evaluate(async (queuedPaths) => {
    const api = window.electronAPI as ElectronAPIWithTestDialogs;
    return api.queueTestOpenDialogPaths(queuedPaths);
  }, filePaths);
  expect(result).toMatchObject({ success: true });
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}
