import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import {
  closeElectronApp,
  createBlankProject,
  getProjectSnapshot,
  launchElectronApp,
  queueOpenPaths,
  type RunningElectronApp
} from './helpers/electron-app';

test.describe('library import prompts', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
    await createBlankProject(running.window, 'Library Import Prompt E2E');
    await running.window.evaluate(async () => {
      await window.electronAPI.setPreference('stockLibrary', []);
      await window.electronAPI.setPreference('assemblyLibrary', []);
      window.useProjectStore.getState().markClean();
    });
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('opening project with missing stock prompts to import stock into app library', async () => {
    const { window, userDataDir } = running;
    const projectPath = path.join(userDataDir, 'missing-stock.carvd');
    writeProjectFile(projectPath, { stocks: [stockFixture()] });

    await openProjectFile(window, projectPath);
    const dialog = window.getByRole('dialog', { name: 'Import to Library' });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText('Stocks (1)')).toBeVisible();
    await expect(dialog.getByText('Project-Only Walnut')).toBeVisible();
    await dialog.getByRole('button', { name: 'Import (1)' }).click();

    await expect.poll(() => getStockLibraryNames(window), { timeout: 5000 }).toEqual(['Project-Only Walnut']);
    await expect.poll(async () => (await getProjectSnapshot(window)).projectName).toBe('Library Import Fixture');
  });

  test('opening project with missing assembly prompts to import assembly into app library', async () => {
    const { window, userDataDir } = running;
    const projectPath = path.join(userDataDir, 'missing-assembly.carvd');
    writeProjectFile(projectPath, { assemblies: [assemblyFixture()] });

    await openProjectFile(window, projectPath);
    const dialog = window.getByRole('dialog', { name: 'Import to Library' });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText('Assemblies (1)')).toBeVisible();
    await expect(dialog.getByText('Project-Only Assembly')).toBeVisible();
    await dialog.getByRole('button', { name: 'Import (1)' }).click();

    await expect.poll(() => getAssemblyLibraryNames(window), { timeout: 5000 }).toEqual(['Project-Only Assembly']);
    await expect.poll(async () => (await getProjectSnapshot(window)).projectName).toBe('Library Import Fixture');
  });

  test('skip leaves app library unchanged but project still opens', async () => {
    const { window, userDataDir } = running;
    const projectPath = path.join(userDataDir, 'skip-missing-library-items.carvd');
    writeProjectFile(projectPath, { stocks: [stockFixture()], assemblies: [assemblyFixture()] });

    await openProjectFile(window, projectPath);
    const dialog = window.getByRole('dialog', { name: 'Import to Library' });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByText('Project-Only Walnut')).toBeVisible();
    await expect(dialog.getByText('Project-Only Assembly')).toBeVisible();
    await dialog.getByRole('button', { name: 'Skip' }).click();

    await expect(dialog).toHaveCount(0);
    await expect.poll(() => getStockLibraryNames(window)).toEqual([]);
    await expect.poll(() => getAssemblyLibraryNames(window)).toEqual([]);
    const snapshot = await getProjectSnapshot(window);
    expect(snapshot.projectName).toBe('Library Import Fixture');
    expect(snapshot.stocks.map((stock) => stock.name)).toContain('Project-Only Walnut');
    expect(snapshot.assemblies.map((assembly) => assembly.name)).toContain('Project-Only Assembly');
  });
});

async function openProjectFile(window: import('@playwright/test').Page, projectPath: string) {
  await queueOpenPaths(window, [projectPath]);
  await window.getByRole('button', { name: 'Carvd Studio home' }).click();
  await expect(window.locator('.start-screen')).toBeVisible();
  await window.getByRole('button', { name: 'Open file...' }).click();
}

async function getStockLibraryNames(window: import('@playwright/test').Page) {
  return window.evaluate(async () =>
    ((await window.electronAPI.getPreference('stockLibrary')) as Array<{ name: string }>).map((stock) => stock.name)
  );
}

async function getAssemblyLibraryNames(window: import('@playwright/test').Page) {
  return window.evaluate(async () =>
    ((await window.electronAPI.getPreference('assemblyLibrary')) as Array<{ name: string }>).map(
      (assembly) => assembly.name
    )
  );
}

function writeProjectFile(
  filePath: string,
  contents: {
    stocks?: ReturnType<typeof stockFixture>[];
    assemblies?: ReturnType<typeof assemblyFixture>[];
  }
) {
  const now = '2026-08-13T12:00:00.000Z';
  const stocks = contents.stocks ?? [];
  const assemblies = contents.assemblies ?? [];
  fs.writeFileSync(
    filePath,
    JSON.stringify(
      {
        version: 1,
        project: {
          name: 'Library Import Fixture',
          createdAt: now,
          modifiedAt: now,
          units: 'imperial',
          gridSize: 0.0625,
          kerfWidth: 0.125,
          overageFactor: 0.1,
          projectNotes: '',
          stockConstraints: {
            constrainDimensions: true,
            constrainGrain: true,
            constrainColor: true,
            preventOverlap: true
          }
        },
        stocks,
        parts: [],
        groups: [],
        groupMembers: [],
        assemblies
      },
      null,
      2
    )
  );
}

function stockFixture() {
  return {
    id: 'project-only-stock',
    name: 'Project-Only Walnut',
    length: 96,
    width: 8,
    thickness: 0.75,
    grainDirection: 'length' as const,
    pricingUnit: 'board_foot' as const,
    pricePerUnit: 14,
    color: '#6b3f24'
  };
}

function assemblyFixture() {
  return {
    id: 'project-only-assembly',
    name: 'Project-Only Assembly',
    description: 'Assembly that exists only inside an opened project.',
    thumbnail: '🧩',
    parts: [
      {
        name: 'Assembly Part',
        length: 12,
        width: 4,
        thickness: 0.75,
        relativePosition: { x: 0, y: 0.375, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        stockId: null,
        grainSensitive: true,
        grainDirection: 'length' as const,
        color: '#c4a574'
      }
    ],
    groups: [],
    groupMembers: [],
    createdAt: '2026-08-13T12:00:00.000Z',
    modifiedAt: '2026-08-13T12:00:00.000Z'
  };
}
