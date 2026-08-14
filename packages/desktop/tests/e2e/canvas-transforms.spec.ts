import { expect, test } from '@playwright/test';
import {
  closeElectronApp,
  dragCanvas,
  getProjectSnapshot,
  getSelectedPartCanvasPoint,
  launchElectronApp,
  seedProject,
  type RunningElectronApp
} from './helpers/electron-app';

test.describe('Canvas transform workflows', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('moves a selected part with a real canvas drag', async () => {
    await seedProject(running.window, 'one-part');
    const before = await getProjectSnapshot(running.window);
    const beforePosition = before.parts[0].position;

    const point = await getSelectedPartCanvasPoint(running.window);
    await dragCanvas(running.window, point, { x: 90, y: -55 });

    const after = await getProjectSnapshot(running.window);
    const afterPosition = after.parts[0].position;
    expect(afterPosition.x).not.toBeCloseTo(beforePosition.x, 5);
    expect(afterPosition.z).not.toBeCloseTo(beforePosition.z, 5);
    expect(after.activeSession).toBeNull();
  });

  test('rotates a selected part with keyboard axis shortcuts', async () => {
    await seedProject(running.window, 'one-part');
    await running.window.locator('canvas').click({ force: true });

    for (const [key, axis] of [
      ['X', 'x'],
      ['Y', 'y'],
      ['Z', 'z']
    ] as const) {
      await running.window.evaluate(() => {
        const project = window.useProjectStore.getState();
        const part = project.parts[0];
        project.updatePart(part.id, { rotation: { x: 0, y: 0, z: 0 } });
        window.useSelectionStore.getState().selectPart(part.id);
      });
      await running.window.keyboard.press(key);
      await expect.poll(async () => (await getProjectSnapshot(running.window)).parts[0].rotation[axis]).toBe(90);
    }
  });

  test('edits dimensions through the properties panel and commits to project state', async () => {
    await seedProject(running.window, 'one-part');

    const dimInputs = running.window.locator('.dimension-inputs input');
    await expect(dimInputs.first()).toBeVisible({ timeout: 5000 });
    await dimInputs.nth(0).fill('30');
    await running.window.keyboard.press('Tab');
    await dimInputs.nth(1).fill('10');
    await running.window.keyboard.press('Tab');
    await dimInputs.nth(2).fill('1.5');
    await running.window.keyboard.press('Tab');

    const snapshot = await getProjectSnapshot(running.window);
    expect(snapshot.parts[0].length).toBe(30);
    expect(snapshot.parts[0].width).toBe(10);
    expect(snapshot.parts[0].thickness).toBe(1.5);
    expect(snapshot.parts[0].position.y).toBe(0.75);
  });
});
