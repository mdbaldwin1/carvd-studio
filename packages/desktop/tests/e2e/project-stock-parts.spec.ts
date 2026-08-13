import { expect, test } from '@playwright/test';
import {
  clickMenuItem,
  closeElectronApp,
  getProjectSnapshot,
  getSelectedPartCanvasPoint,
  launchElectronApp,
  rightClickCanvas,
  seedProject,
  type RunningElectronApp
} from './helpers/electron-app';

test.describe('Project, stock, part, and context-menu workflows', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('resets a selected part to assigned stock through the part context menu', async () => {
    await seedProject(running.window, 'stocked-one-part');
    await running.window.evaluate(() => {
      const project = window.useProjectStore.getState();
      const part = project.parts[0];
      project.updatePart(part.id, {
        length: 30,
        width: 12,
        thickness: 3,
        position: { x: 0, y: 1.5, z: 0 },
        color: '#0000ff',
        grainDirection: 'width'
      });
      window.useSelectionStore.getState().selectPart(part.id);
    });

    const point = await getSelectedPartCanvasPoint(running.window);
    await rightClickCanvas(running.window, point);
    await expect(running.window.getByText('Reset to Stock')).toBeVisible({ timeout: 5000 });
    await clickMenuItem(running.window, 'Reset to Stock');

    const snapshot = await getProjectSnapshot(running.window);
    const stock = snapshot.stocks[0];
    const part = snapshot.parts[0];
    expect(part.length).toBe(stock.length);
    expect(part.width).toBe(stock.width);
    expect(part.thickness).toBe(stock.thickness);
    expect(part.color).toBe(stock.color);
    expect(part.grainDirection).toBe(stock.grainDirection);
  });

  test('duplicates and deletes a selected part through keyboard workflows', async () => {
    await seedProject(running.window, 'one-part');
    let snapshot = await getProjectSnapshot(running.window);
    expect(snapshot.parts).toHaveLength(1);

    await running.window.keyboard.press('Shift+D');
    await expect.poll(async () => (await getProjectSnapshot(running.window)).parts.length).toBe(2);

    snapshot = await getProjectSnapshot(running.window);
    expect(snapshot.selectedPartIds).toHaveLength(1);
    const duplicatedPartId = snapshot.selectedPartIds[0];
    expect(snapshot.parts.some((part) => part.id === duplicatedPartId)).toBe(true);

    await running.window.keyboard.press('Delete');
    await running.window
      .getByRole('button', { name: /delete/i })
      .last()
      .click();
    await expect.poll(async () => (await getProjectSnapshot(running.window)).parts.length).toBe(1);
  });
});
