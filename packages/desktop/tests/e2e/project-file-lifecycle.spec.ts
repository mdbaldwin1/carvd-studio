import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import {
  addPartFromSidebar,
  closeElectronApp,
  createBlankProject,
  getProjectSnapshot,
  launchElectronApp,
  queueOpenPaths,
  queueSavePath,
  waitForAppReady,
  type RunningElectronApp
} from './helpers/electron-app';

test.describe('project file lifecycle', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
    await createBlankProject(running.window, 'Project File Lifecycle E2E');
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('saves, opens, records recents, and saves as a new project file', async () => {
    const { window, userDataDir } = running;
    const firstPath = path.join(userDataDir, 'lifecycle-original.carvd');
    const secondPath = path.join(userDataDir, 'lifecycle-renamed.carvd');

    await addPartFromSidebar(window);
    await queueSavePath(window, firstPath);
    await pressShortcut(window, 's');
    await expect.poll(() => fs.existsSync(firstPath), { timeout: 5000 }).toBe(true);

    const firstFile = readCarvdFile(firstPath);
    expect(firstFile.project.name).toBe('lifecycle-original');
    expect(firstFile.parts).toHaveLength(1);
    await expect.poll(async () => window.evaluate(() => window.electronAPI.getRecentProjects())).toContain(firstPath);

    await window.getByRole('button', { name: 'Carvd Studio home' }).click();
    await expect(window.locator('.start-screen')).toBeVisible();

    await queueOpenPaths(window, [firstPath]);
    await window.getByRole('button', { name: 'Open file...' }).click();
    await expect.poll(async () => (await getProjectSnapshot(window)).projectName).toBe('lifecycle-original');
    await expect.poll(async () => (await getProjectSnapshot(window)).parts.length).toBe(1);

    await queueSavePath(window, secondPath);
    await pressShortcut(window, 's', { shift: true });
    await expect.poll(() => fs.existsSync(secondPath), { timeout: 5000 }).toBe(true);
    expect(readCarvdFile(secondPath).project.name).toBe('lifecycle-renamed');
    await expect
      .poll(async () => window.evaluate(() => window.electronAPI.getRecentProjects()))
      .toEqual(expect.arrayContaining([secondPath, firstPath]));
  });

  test('unsaved home dialog supports cancel, discard, and save branches', async () => {
    const { window, userDataDir } = running;
    const savedPath = path.join(userDataDir, 'unsaved-home-save.carvd');

    await addPartFromSidebar(window);
    await window.getByRole('button', { name: 'Carvd Studio home' }).click();
    const dialog = window.getByRole('alertdialog', { name: 'Unsaved Changes' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(window.locator('.app-header')).toBeVisible();

    await window.getByRole('button', { name: 'Carvd Studio home' }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: "Don't Save" }).click();
    await expect(window.locator('.start-screen')).toBeVisible();
    expect(fs.existsSync(savedPath)).toBe(false);

    await createBlankProject(window, 'Project File Lifecycle Save Branch');
    await addPartFromSidebar(window);
    await queueSavePath(window, savedPath);
    await window.getByRole('button', { name: 'Carvd Studio home' }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => fs.existsSync(savedPath), { timeout: 5000 }).toBe(true);
    await expect(window.locator('.start-screen')).toBeVisible();
    expect(readCarvdFile(savedPath).parts).toHaveLength(1);
  });

  test('saved projects can be added to and removed from favorites', async () => {
    const { window, userDataDir } = running;
    const projectPath = path.join(userDataDir, 'favorite-project.carvd');

    await queueSavePath(window, projectPath);
    await pressShortcut(window, 's');
    await expect.poll(() => fs.existsSync(projectPath), { timeout: 5000 }).toBe(true);

    await window.getByRole('button', { name: 'Project Settings' }).click();
    const settings = window.getByRole('dialog', { name: 'Project Settings' });
    await expect(settings).toBeVisible();
    await settings.getByLabel('Add to favorites').click();
    await expect
      .poll(async () => window.evaluate(() => window.electronAPI.getFavoriteProjects()))
      .toContain(projectPath);
    await settings.getByRole('button', { name: 'Done' }).click();

    await window.getByRole('button', { name: 'Carvd Studio home' }).click();
    await expect(window.locator('.start-screen')).toBeVisible();
    await window.getByRole('tab', { name: 'Favorites' }).click();
    await expect(window.getByText('favorite-project')).toBeVisible();

    const removeFavoriteButton = window.getByLabel(/Remove .*favorite-project from favorites/);
    await expect(removeFavoriteButton).toBeVisible();
    await removeFavoriteButton.evaluate((button) => (button as HTMLButtonElement).click());
    await expect
      .poll(async () => window.evaluate(() => window.electronAPI.getFavoriteProjects()))
      .not.toContain(projectPath);
    await window.reload();
    await waitForAppReady(window);
    await window.getByRole('tab', { name: 'Favorites' }).click();
    await expect(window.getByText('No favorites yet. Star a project to add it here.')).toBeVisible();
  });
});

async function pressShortcut(window: import('@playwright/test').Page, key: string, options: { shift?: boolean } = {}) {
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  const keys = [modifier, options.shift ? 'Shift' : null, key.toUpperCase()].filter(Boolean).join('+');
  await window.keyboard.press(keys);
}

function readCarvdFile(filePath: string): { project: { name: string }; parts: unknown[] } {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}
