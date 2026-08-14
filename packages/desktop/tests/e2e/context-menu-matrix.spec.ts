import { expect, test } from '@playwright/test';
import {
  clickMenuItem,
  closeElectronApp,
  getCanvasPoint,
  getProjectSnapshot,
  launchElectronApp,
  openSelectionContextMenu,
  rightClickCanvas,
  seedProject,
  type RunningElectronApp
} from './helpers/electron-app';

test.describe('Context menu matrix', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('shows and applies the single selected part menu', async () => {
    await seedProject(running.window, 'stocked-one-part');
    await openSelectionContextMenu(running.window);
    const menu = running.window.getByRole('menu');

    await expect(menu.getByText('1 part selected')).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Center View' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Copy' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Save as Assembly' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Reset to Stock' })).toBeEnabled();
    await expect(menu.getByRole('menuitem', { name: /Set as Reference/ })).toBeVisible();

    await menu.getByRole('menuitem', { name: /Set as Reference/ }).click();
    await expect
      .poll(async () => {
        return running.window.evaluate(() => window.useSnapStore.getState().referencePartIds.length);
      })
      .toBe(1);
  });

  test('shows and applies the multiple selected parts menu', async () => {
    await seedProject(running.window, 'two-parts');
    await openSelectionContextMenu(running.window);
    const menu = running.window.getByRole('menu');

    await expect(menu.getByText('2 parts selected')).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Create Group (G)' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Reset to Stock' })).toBeDisabled();

    await clickMenuItem(running.window, 'Create Group (G)');
    await expect.poll(async () => (await getProjectSnapshot(running.window)).groups.length).toBe(1);
  });

  test('shows and applies the single selected group menu', async () => {
    await seedProject(running.window, 'one-group');
    await openSelectionContextMenu(running.window);
    const menu = running.window.getByRole('menu');

    await expect(menu.getByText('1 group selected')).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: /Ungroup "Group 1"/ })).toBeVisible();

    await menu.getByRole('menuitem', { name: /Ungroup "Group 1"/ }).click();
    await expect.poll(async () => (await getProjectSnapshot(running.window)).groups.length).toBe(0);
  });

  test('shows and applies the multiple selected groups menu', async () => {
    await seedProject(running.window, 'two-groups');
    await openSelectionContextMenu(running.window);
    const menu = running.window.getByRole('menu');

    await expect(menu.getByText('2 groups selected')).toBeVisible();
    await expect(menu.getByText(/Merge Groups \(2\)/)).toBeVisible();
    await expect(menu.getByText(/Add to Group/)).toBeVisible();

    await menu.getByText(/Merge Groups \(2\)/).hover();
    await clickMenuItem(running.window, 'Top Level (Preserve Structure)');
    await expect.poll(async () => (await getProjectSnapshot(running.window)).groups.length).toBe(1);
  });

  test('shows and applies the mixed selected parts and groups menu', async () => {
    await seedProject(running.window, 'mixed-part-and-group');
    await openSelectionContextMenu(running.window);
    const menu = running.window.getByRole('menu');

    await expect(menu.getByText('1 part, 1 group')).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Create Group (G)' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: /Add to "Group 1"/ })).toBeVisible();

    await menu.getByRole('menuitem', { name: /Add to "Group 1"/ }).click();
    const snapshot = await getProjectSnapshot(running.window);
    expect(snapshot.groupMembers.filter((member) => member.groupId === snapshot.groups[0].id)).toHaveLength(2);
  });

  test('shows and applies background menu actions from a real right click', async () => {
    await seedProject(running.window, 'one-part');

    const point = await getCanvasPoint(running.window, 0.15, 0.8);
    await rightClickCanvas(running.window, point);
    const menu = running.window.getByRole('menu');
    await expect(menu.getByRole('menuitem', { name: 'Reset View' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Center View Here' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Add X Guide Here' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Add Y Guide Here' })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Add Z Guide Here' })).toBeVisible();

    await clickMenuItem(running.window, 'Add X Guide Here');
    await expect.poll(async () => (await getProjectSnapshot(running.window)).snapGuides.length).toBe(1);
  });

  test('shows and applies guide menu actions', async () => {
    await seedProject(running.window, 'guide');
    await running.window.evaluate(() => {
      const guide = window.useProjectStore.getState().snapGuides[0];
      window.useUIStore.getState().openContextMenu({ x: 500, y: 300, type: 'guide', guideId: guide.id });
    });

    const menu = running.window.getByRole('menu');
    await expect(menu.getByText(/X Guide at/)).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Delete This Guide' })).toBeVisible();

    await clickMenuItem(running.window, 'Delete This Guide');
    await expect.poll(async () => (await getProjectSnapshot(running.window)).snapGuides.length).toBe(0);
  });
});
