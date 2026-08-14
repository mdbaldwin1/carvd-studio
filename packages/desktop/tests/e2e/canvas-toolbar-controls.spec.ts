import { expect, test } from '@playwright/test';
import { closeElectronApp, launchElectronApp, seedProject, type RunningElectronApp } from './helpers/electron-app';

test.describe('Canvas toolbar controls', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('toggles display modes, grid, grain, snapping, and reference clearing', async () => {
    await seedProject(running.window, 'one-part');

    await running.window.getByRole('button', { name: 'Wire' }).click();
    await expect
      .poll(async () => running.window.evaluate(() => window.useCameraStore.getState().displayMode))
      .toBe('wireframe');

    await running.window.getByRole('button', { name: 'Ghost' }).click();
    await expect
      .poll(async () => running.window.evaluate(() => window.useCameraStore.getState().displayMode))
      .toBe('translucent');

    await running.window.getByRole('button', { name: 'Solid' }).click();
    await expect
      .poll(async () => running.window.evaluate(() => window.useCameraStore.getState().displayMode))
      .toBe('solid');

    await running.window.getByRole('button', { name: 'Grid' }).click();
    await expect.poll(async () => running.window.evaluate(() => window.useCameraStore.getState().showGrid)).toBe(false);

    await running.window.getByRole('button', { name: 'Grain' }).click();
    await expect
      .poll(async () => running.window.evaluate(() => window.useCameraStore.getState().showGrainDirection))
      .toBe(true);

    await running.window.getByRole('button', { name: 'Snap' }).click();
    await expect
      .poll(async () => running.window.evaluate(() => window.useSnapStore.getState().snapToPartsEnabled))
      .toBe(false);

    await running.window.evaluate(() => {
      window.useSnapStore.getState().toggleReference([window.useProjectStore.getState().parts[0].id]);
    });
    await expect(running.window.getByRole('button', { name: /Ref: 1/ })).toBeVisible();
    await running.window.getByRole('button', { name: /Ref: 1/ }).click();
    await expect
      .poll(async () => running.window.evaluate(() => window.useSnapStore.getState().referencePartIds.length))
      .toBe(0);
  });

  test('adjusts brightness and lighting preset from the lighting popover', async () => {
    await seedProject(running.window, 'empty');

    await running.window.getByTitle('Adjust lighting').click();
    const popover = running.window.locator('input[type="range"]').locator('..');
    await expect(popover).toContainText('100%');

    await running.window.locator('input[type="range"]').fill('1.5');
    await expect(popover).toContainText('150%');
    await running.window.getByRole('button', { name: 'Dramatic' }).click();

    await expect
      .poll(async () => running.window.evaluate(() => window.electronAPI.getPreference('brightnessMultiplier')))
      .toBe(1.5);
    await expect
      .poll(async () => running.window.evaluate(() => window.electronAPI.getPreference('lightingMode')))
      .toBe('dramatic');

    await running.window.keyboard.press('Escape');
    await expect(running.window.locator('input[type="range"]')).toBeHidden();
  });
});
