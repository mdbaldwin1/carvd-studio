import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import {
  closeElectronApp,
  createBlankProject,
  getProjectSnapshot,
  launchElectronApp,
  queueOpenPaths,
  queueSavePath,
  seedProject,
  sendNativeMenuCommand,
  type RunningElectronApp
} from './helpers/electron-app';

test.describe('native menu command workflows', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('native app/help commands open About, Settings, and Templates surfaces', async () => {
    const { window } = running;
    await createBlankProject(window, 'Native Menu Surfaces E2E');

    await sendNativeMenuCommand(running, 'show-about');
    const about = window.getByRole('dialog', { name: 'About Carvd Studio' });
    await expect(about).toBeVisible();
    await about.getByRole('button', { name: 'Close' }).last().click();
    await expect(about).toHaveCount(0);

    await sendNativeMenuCommand(running, 'open-settings');
    const settings = window.getByRole('dialog', { name: 'App Settings' });
    await expect(settings).toBeVisible();
    await settings.getByLabel('Close').click();
    await expect(settings).toHaveCount(0);

    await sendNativeMenuCommand(running, 'new-from-template');
    await expect(window.getByRole('heading', { name: 'Templates', exact: true })).toBeVisible();
  });

  test('native File commands save, save as, open recent, clear recent, close, and add favorites', async () => {
    const { window, userDataDir } = running;
    const firstPath = path.join(userDataDir, 'native-menu-original.carvd');
    const secondPath = path.join(userDataDir, 'native-menu-renamed.carvd');

    await createBlankProject(window, 'Native Menu File E2E');

    await sendNativeMenuCommand(running, 'add-to-favorites');
    await expect(window.getByText('Save project first to add to favorites')).toBeVisible();

    await queueSavePath(window, firstPath);
    await sendNativeMenuCommand(running, 'save-project');
    await expect.poll(() => fs.existsSync(firstPath), { timeout: 5000 }).toBe(true);

    await sendNativeMenuCommand(running, 'add-to-favorites');
    await expect.poll(async () => window.evaluate(() => window.electronAPI.getFavoriteProjects())).toContain(firstPath);

    await queueSavePath(window, secondPath);
    await sendNativeMenuCommand(running, 'save-project-as');
    await expect.poll(() => fs.existsSync(secondPath), { timeout: 5000 }).toBe(true);

    await sendNativeMenuCommand(running, 'close-project');
    await expect(window.locator('.start-screen')).toBeVisible();

    await sendNativeMenuCommand(running, 'open-recent', firstPath);
    await expect.poll(async () => (await getProjectSnapshot(window)).projectName).toBe('native-menu-original');

    await sendNativeMenuCommand(running, 'clear-recent');
    await expect(window.getByText('Recent projects cleared')).toBeVisible();
    await expect.poll(async () => window.evaluate(() => window.electronAPI.getRecentProjects())).toEqual([]);

    await sendNativeMenuCommand(running, 'close-project');
    await expect(window.locator('.start-screen')).toBeVisible();

    await queueOpenPaths(window, [secondPath]);
    await sendNativeMenuCommand(running, 'open-project');
    await expect.poll(async () => (await getProjectSnapshot(window)).projectName).toBe('native-menu-renamed');
  });

  test('native Edit and View commands mutate selection, history, deletion, and camera requests', async () => {
    const { window } = running;
    await seedProject(window, 'two-parts');

    await sendNativeMenuCommand(running, 'select-all');
    await expect.poll(async () => (await getProjectSnapshot(window)).selectedPartIds.length).toBe(2);

    await window.evaluate(() => {
      const project = window.useProjectStore.getState();
      const part = project.parts[0];
      project.updatePart(part.id, { name: 'Native Menu Updated Part' });
    });
    await expect.poll(async () => (await getProjectSnapshot(window)).parts[0].name).toBe('Native Menu Updated Part');

    await sendNativeMenuCommand(running, 'undo');
    await expect.poll(async () => (await getProjectSnapshot(window)).parts[0].name).toBe('E2E Part');

    await sendNativeMenuCommand(running, 'redo');
    await expect.poll(async () => (await getProjectSnapshot(window)).parts[0].name).toBe('Native Menu Updated Part');

    await sendNativeMenuCommand(running, 'delete');
    const deleteDialog = window.getByRole('alertdialog', { name: /delete/i });
    await expect(deleteDialog).toBeVisible();
    await deleteDialog
      .getByRole('button', { name: /delete/i })
      .last()
      .click();
    await expect.poll(async () => (await getProjectSnapshot(window)).parts.length).toBe(0);

    await window.evaluate(() => {
      const cameraStore = window.useCameraStore;
      const originalRequestCenterCameraAtOrigin = cameraStore.getState().requestCenterCameraAtOrigin;
      cameraStore.setState({
        centerCameraAtOriginRequested: false,
        e2eResetCameraRequests: 0,
        requestCenterCameraAtOrigin: () => {
          const currentRequests = cameraStore.getState().e2eResetCameraRequests ?? 0;
          cameraStore.setState({ e2eResetCameraRequests: currentRequests + 1 });
          originalRequestCenterCameraAtOrigin();
        }
      });
    });
    await sendNativeMenuCommand(running, 'reset-camera');
    await expect
      .poll(async () => window.evaluate(() => window.useCameraStore.getState().e2eResetCameraRequests))
      .toBe(1);
  });

  test('native file commands are blocked while assembly editing is active', async () => {
    const { window, userDataDir } = running;
    const blockedOpenPath = path.join(userDataDir, 'blocked-open.carvd');

    await createBlankProject(window, 'Native Menu Blocked E2E');
    await queueSavePath(window, blockedOpenPath);
    await sendNativeMenuCommand(running, 'save-project');
    await expect.poll(() => fs.existsSync(blockedOpenPath), { timeout: 5000 }).toBe(true);

    await window.evaluate(() => {
      window.useAssemblyEditingStore.getState().startEditingAssembly('e2e-assembly', 'E2E Assembly', []);
    });

    await sendNativeMenuCommand(running, 'new-project');
    await expect(window.getByText('Finish editing assembly first')).toBeVisible();
    await expect(window.getByRole('button', { name: 'E2E Assembly' })).toBeVisible();

    await queueOpenPaths(window, [blockedOpenPath]);
    await sendNativeMenuCommand(running, 'open-project');
    await expect(window.getByText('Finish editing assembly first').first()).toBeVisible();
    await expect(window.getByRole('button', { name: 'E2E Assembly' })).toBeVisible();
  });
});
