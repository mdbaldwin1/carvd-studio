import { expect, test } from '@playwright/test';
import {
  closeElectronApp,
  dragCanvas,
  getProjectSnapshot,
  getResizeHandleCanvasPoint,
  getRotationHandleCanvasPoint,
  launchElectronApp,
  seedProject,
  type RunningElectronApp
} from './helpers/electron-app';

test.describe('Canvas resize and rotation handles', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('resizes a selected part by dragging a resize handle', async () => {
    await seedProject(running.window, 'one-part');
    const before = await getProjectSnapshot(running.window);

    const handle = await getResizeHandleCanvasPoint(running.window, { x: 1, y: 0, z: 1 });
    await dragCanvas(running.window, handle, { x: 95, y: -25 });

    const after = await getProjectSnapshot(running.window);
    expect([after.parts[0].length, after.parts[0].width, after.parts[0].thickness]).not.toEqual([
      before.parts[0].length,
      before.parts[0].width,
      before.parts[0].thickness
    ]);
    expect(after.activeSession).toBeNull();
  });

  test('caps resize handle changes at assigned stock dimensions when dimension constraints are enabled', async () => {
    await seedProject(running.window, 'stocked-one-part');
    await running.window.evaluate(() => {
      const project = window.useProjectStore.getState();
      const part = project.parts[0];
      const stock = project.stocks[0];
      project.updateStock(stock.id, { length: 26, width: 12, thickness: 2 });
      project.updatePart(part.id, { length: 24, width: 10, thickness: 2, position: { x: 0, y: 1, z: 0 } });
      project.setStockConstraints({ ...project.stockConstraints, constrainDimensions: true });
      window.useSelectionStore.getState().selectPart(part.id);
    });

    const handle = await getResizeHandleCanvasPoint(running.window, { x: 1, y: 0, z: 1 });
    await dragCanvas(running.window, handle, { x: 240, y: -80 });

    const after = await getProjectSnapshot(running.window);
    expect(after.parts[0].length).toBeLessThanOrEqual(26);
    expect(after.parts[0].width).toBeLessThanOrEqual(12);
  });

  test('rotates a selected part 90 degrees by clicking a rotation ring handle', async () => {
    await seedProject(running.window, 'one-part');
    const ring = await getRotationHandleCanvasPoint(running.window, { axis: 'y', side: 1, target: 'ring' });

    await running.window.mouse.click(ring.x, ring.y);

    await expect.poll(async () => (await getProjectSnapshot(running.window)).parts[0].rotation.y).toBe(90);
  });

  test('rotates a selected part by a non-90-degree amount from rotation grab handles', async () => {
    await seedProject(running.window, 'one-part');
    const grab = await getRotationHandleCanvasPoint(running.window, { axis: 'y', side: 1, target: 'grab' });

    await dragCanvas(running.window, grab, { x: 80, y: -95 });

    const rotation = (await getProjectSnapshot(running.window)).parts[0].rotation;
    const changedAxes = [rotation.x, rotation.y, rotation.z].map((value) => Math.abs(value));
    expect(changedAxes.some((value) => value > 5)).toBe(true);
    expect(changedAxes.some((value) => value > 5 && value !== 90)).toBe(true);
  });
});
