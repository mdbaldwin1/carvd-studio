import { expect, test } from '@playwright/test';
import {
  closeElectronApp,
  getProjectSnapshot,
  launchElectronApp,
  seedProject,
  type RunningElectronApp
} from './helpers/electron-app';

const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

test.describe('Keyboard shortcut matrix', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('covers no-selection shortcuts: add part, select all, undo, redo, and home', async () => {
    await seedProject(running.window, 'empty');

    await running.window.keyboard.press('P');
    await expect.poll(async () => (await getProjectSnapshot(running.window)).parts.length).toBe(1);

    await running.window.keyboard.press(`${mod}+A`);
    await expect.poll(async () => (await getProjectSnapshot(running.window)).selectedPartIds.length).toBe(1);

    await running.window.keyboard.press(`${mod}+Z`);
    await expect.poll(async () => (await getProjectSnapshot(running.window)).parts.length).toBe(0);

    await running.window.keyboard.press(`${mod}+Shift+Z`);
    await expect.poll(async () => (await getProjectSnapshot(running.window)).parts.length).toBe(1);

    await running.window.keyboard.press('Home');
    await expect
      .poll(async () => running.window.evaluate(() => window.useCameraStore.getState().centerCameraAtOriginRequested))
      .toBeTruthy();
  });

  test('covers single-part shortcuts: nudge, rotate, reference, duplicate, copy, paste, focus, delete, escape', async () => {
    await seedProject(running.window, 'one-part');

    const before = await getProjectSnapshot(running.window);
    await running.window.keyboard.press('ArrowRight');
    await expect
      .poll(async () => (await getProjectSnapshot(running.window)).parts[0].position.x)
      .not.toBe(before.parts[0].position.x);

    await running.window.keyboard.press('X');
    await expect.poll(async () => (await getProjectSnapshot(running.window)).parts[0].rotation.x).toBe(90);

    await running.window.keyboard.press('R');
    await expect
      .poll(async () => running.window.evaluate(() => window.useSnapStore.getState().referencePartIds.length))
      .toBe(1);

    await running.window.keyboard.press('Shift+D');
    await expect.poll(async () => (await getProjectSnapshot(running.window)).parts.length).toBe(2);

    await running.window.keyboard.press(`${mod}+C`);
    await running.window.keyboard.press(`${mod}+V`);
    await expect.poll(async () => (await getProjectSnapshot(running.window)).parts.length).toBe(3);

    await running.window.keyboard.press('F');
    await expect
      .poll(async () => running.window.evaluate(() => window.useCameraStore.getState().centerCameraRequested))
      .toBeTruthy();

    await running.window.keyboard.press('Escape');
    await expect
      .poll(async () => running.window.evaluate(() => window.useSnapStore.getState().referencePartIds.length))
      .toBe(0);

    await running.window.keyboard.press('Escape');
    await expect.poll(async () => (await getProjectSnapshot(running.window)).selectedPartIds.length).toBe(0);

    await running.window.evaluate(() => {
      window.useSelectionStore.getState().selectPart(window.useProjectStore.getState().parts[0].id);
    });
    await running.window.keyboard.press('Delete');
    await running.window
      .getByRole('button', { name: /delete/i })
      .last()
      .click();
    await expect.poll(async () => (await getProjectSnapshot(running.window)).parts.length).toBe(2);
  });

  test('covers multi-part shortcuts: group, shift-nudge, batch rotation, ungroup', async () => {
    await seedProject(running.window, 'two-parts');

    const before = await getProjectSnapshot(running.window);
    await running.window.keyboard.press('Shift+ArrowUp');
    const afterNudge = await getProjectSnapshot(running.window);
    expect(afterNudge.parts.map((part) => part.position)).not.toEqual(before.parts.map((part) => part.position));

    await running.window.keyboard.press('Z');
    const afterRotation = await getProjectSnapshot(running.window);
    expect(afterRotation.parts.every((part) => part.rotation.z === 90)).toBe(true);

    await running.window.keyboard.press('G');
    await expect.poll(async () => (await getProjectSnapshot(running.window)).groups.length).toBe(1);

    await running.window.keyboard.press(`${mod}+Shift+G`);
    await expect.poll(async () => (await getProjectSnapshot(running.window)).groups.length).toBe(0);
  });

  test('covers selected group and mixed selection shortcuts', async () => {
    await seedProject(running.window, 'mixed-part-and-group');

    await running.window.keyboard.press('R');
    await expect
      .poll(async () => running.window.evaluate(() => window.useSnapStore.getState().referencePartIds.length))
      .toBe(2);

    await running.window.keyboard.press('Y');
    const rotated = await getProjectSnapshot(running.window);
    expect(rotated.parts.every((part) => part.rotation.y === 90)).toBe(true);

    await running.window.keyboard.press('G');
    await expect.poll(async () => (await getProjectSnapshot(running.window)).groups.length).toBe(2);
  });

  test('ignores editing shortcuts while typing in part inputs', async () => {
    await seedProject(running.window, 'one-part');
    const before = await getProjectSnapshot(running.window);

    const nameInput = running.window.locator('.properties-panel input').first();
    await nameInput.fill('P should not add a part');
    await nameInput.press('ControlOrMeta+A');
    await nameInput.press('X');
    await nameInput.press('Y');
    await nameInput.press('Z');
    await nameInput.press('P');

    const after = await getProjectSnapshot(running.window);
    expect(after.parts).toHaveLength(before.parts.length);
    expect(after.parts[0].rotation).toEqual(before.parts[0].rotation);
  });
});
