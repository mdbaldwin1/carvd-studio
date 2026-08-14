import { expect, test } from '@playwright/test';
import {
  closeElectronApp,
  getProjectSnapshot,
  launchElectronApp,
  seedProject,
  type RunningElectronApp
} from './helpers/electron-app';

test.describe('Group, camera, and workspace control workflows', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('groups selected parts and ungroups them with keyboard shortcuts', async () => {
    await seedProject(running.window, 'two-parts');
    await expect.poll(async () => (await getProjectSnapshot(running.window)).selectedPartIds.length).toBe(2);

    await running.window.keyboard.press('G');
    await expect.poll(async () => (await getProjectSnapshot(running.window)).groups.length).toBe(1);
    let snapshot = await getProjectSnapshot(running.window);
    expect(snapshot.groupMembers).toHaveLength(2);

    await running.window.keyboard.press(process.platform === 'darwin' ? 'Meta+Shift+G' : 'Control+Shift+G');
    await expect.poll(async () => (await getProjectSnapshot(running.window)).groups.length).toBe(0);
    snapshot = await getProjectSnapshot(running.window);
    expect(snapshot.groupMembers).toHaveLength(0);
    expect(snapshot.parts).toHaveLength(2);
  });

  test('toggles workspace view controls without disturbing project state', async () => {
    await seedProject(running.window, 'one-part');
    const before = await getProjectSnapshot(running.window);

    await running.window.getByRole('button', { name: 'Wire' }).click();
    await running.window.getByRole('button', { name: 'Ghost' }).click();
    await running.window.getByRole('button', { name: 'Grid' }).click();
    await running.window.getByRole('button', { name: 'Grain' }).click();
    await running.window.getByRole('button', { name: 'Snap' }).click();

    const after = await getProjectSnapshot(running.window);
    expect(after.parts).toHaveLength(before.parts.length);
    expect(after.selectedPartIds).toEqual(before.selectedPartIds);
  });

  test('adds a part with the keyboard shortcut and then undoes it', async () => {
    await seedProject(running.window, 'empty');

    await running.window.keyboard.press('P');
    await expect.poll(async () => (await getProjectSnapshot(running.window)).parts.length).toBe(1);

    await running.window.keyboard.press(process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z');
    await expect.poll(async () => (await getProjectSnapshot(running.window)).parts.length).toBe(0);
  });
});
