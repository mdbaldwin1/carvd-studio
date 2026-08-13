import { expect, test, type Page } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  addPartFromSidebar,
  closeElectronApp,
  createBlankProject,
  getProjectSnapshot,
  launchElectronApp,
  queueSavePath,
  waitForAppReady,
  type RunningElectronApp
} from './helpers/electron-app';

test.describe('window and app behavior', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('editor, start screen, and template screen remain usable across viewport sizes', async () => {
    const { window } = running;

    await createBlankProject(window, 'Responsive Surfaces E2E');
    for (const size of [
      { width: 900, height: 600 },
      { width: 1280, height: 720 },
      { width: 1600, height: 1000 }
    ]) {
      await window.setViewportSize(size);
      await expect(window.locator('.app-header')).toBeVisible();
      await expect(window.locator('.sidebar')).toBeVisible();
      await expect(window.locator('canvas')).toBeVisible();
    }

    await window.getByRole('button', { name: 'Carvd Studio home' }).click();
    await discardUnsavedChangesIfPrompted(window);
    await expect(window.locator('.start-screen')).toBeVisible();
    await window.setViewportSize({ width: 900, height: 600 });
    await expect(window.locator('.blank-template')).toBeVisible();
    await expect(window.getByRole('button', { name: 'View All' })).toBeVisible();

    await window.getByRole('button', { name: 'View All' }).click();
    await expect(window.getByRole('heading', { name: 'Templates', exact: true })).toBeVisible();
    await window.setViewportSize({ width: 1000, height: 640 });
    await expect(window.getByRole('heading', { name: 'Built-in Templates' })).toBeVisible();
    await expect(window.getByRole('heading', { name: 'My Templates' })).toBeVisible();
  });

  test('reload preserves saved preferences and recovers app shell without console errors', async () => {
    const { window, consoleMessages } = running;

    await createBlankProject(window, 'Reload Preferences E2E');
    await window.getByTitle('App Settings').click();
    const settings = window.getByRole('dialog', { name: 'App Settings' });
    await expect(settings).toBeVisible();
    await settings.locator('[data-state="active"] select').first().selectOption('light');
    await settings.getByRole('tab', { name: 'New Project Defaults' }).click();
    await settings.locator('[data-state="active"] select').first().selectOption('metric');
    await settings.getByRole('button', { name: 'Done' }).click();

    await window.reload();
    await waitForAppReady(window);

    await window.getByTitle('App Settings').click();
    const reloadedSettings = window.getByRole('dialog', { name: 'App Settings' });
    await expect(reloadedSettings.locator('[data-state="active"] select').first()).toHaveValue('light');
    await reloadedSettings.getByRole('tab', { name: 'New Project Defaults' }).click();
    await expect(reloadedSettings.locator('[data-state="active"] select').first()).toHaveValue('metric');
    await expect(window.locator('.error-boundary')).toHaveCount(0);
    expect(consoleMessages.filter((message) => message.includes('[pageerror]'))).toEqual([]);
  });

  test('open-file handoff opens project in an application window when feasible', async () => {
    const { window, userDataDir } = running;
    const projectPath = path.join(userDataDir, 'open-file-handoff.carvd');

    await createBlankProject(window, 'Open File Handoff E2E');
    await addPartFromSidebar(window);
    await queueSavePath(window, projectPath);
    await pressShortcut(window, 's');
    await expect.poll(() => fs.existsSync(projectPath), { timeout: 5000 }).toBe(true);

    await emitOpenFile(running, projectPath);
    const targetWindow = await waitForProjectWindow(running, projectPath);
    await expect.poll(async () => (await getProjectSnapshot(targetWindow)).projectName).toBe('open-file-handoff');
    await expect.poll(async () => (await getProjectSnapshot(targetWindow)).parts.length).toBe(1);
    await expect
      .poll(async () => targetWindow.evaluate(() => window.electronAPI.getRecentProjects()))
      .toEqual(expect.arrayContaining([projectPath]));
  });
});

async function discardUnsavedChangesIfPrompted(window: Page) {
  const dialog = window.getByRole('alertdialog', { name: 'Unsaved Changes' });
  if (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) {
    await dialog.getByRole('button', { name: "Don't Save" }).click();
  }
}

async function pressShortcut(window: Page, key: string, modifiers: { shift?: boolean } = {}) {
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  const keys = [modifier, modifiers.shift ? 'Shift' : null, key].filter(Boolean) as string[];
  await window.keyboard.press(keys.join('+'));
}

async function emitOpenFile(running: RunningElectronApp, filePath: string) {
  await running.electronApp.evaluate(
    async ({ app }, payload) => {
      app.emit('open-file', { preventDefault: () => undefined } as Electron.Event, payload.filePath);
    },
    { filePath }
  );
}

async function waitForProjectWindow(running: RunningElectronApp, filePath: string): Promise<Page> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    for (const candidate of running.electronApp.windows()) {
      const hasProject = await candidate
        .evaluate((expectedPath) => window.useProjectStore?.getState().filePath === expectedPath, filePath)
        .catch(() => false);
      if (hasProject) {
        return candidate;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No Electron window opened project file ${filePath}`);
}
