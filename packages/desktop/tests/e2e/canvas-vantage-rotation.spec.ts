import { expect, test } from '@playwright/test';
import {
  closeElectronApp,
  dragCanvas,
  getProjectSnapshot,
  getRotationHandleCanvasPoint,
  launchElectronApp,
  seedProject,
  type RunningElectronApp
} from './helpers/electron-app';

test.describe('Canvas rotation from camera vantage points', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  for (const view of ['isometric', 'top', 'front', 'right'] as const) {
    test(`rotates a selected part by a non-90-degree amount from the ${view} view`, async () => {
      await seedProject(running.window, 'one-part');
      await setCameraView(running.window, view);

      const before = (await getProjectSnapshot(running.window)).parts[0].rotation;
      for (const handle of rotationHandlesForView(view)) {
        const start = await getRotationHandleCanvasPoint(running.window, { ...handle, target: 'grab' });
        await dragCanvas(running.window, start, dragDeltaForView(view));
        const current = (await getProjectSnapshot(running.window)).parts[0].rotation;
        if ((['x', 'y', 'z'] as const).some((axis) => Math.abs(current[axis] - before[axis]) > 5)) {
          break;
        }
      }

      const after = (await getProjectSnapshot(running.window)).parts[0].rotation;
      const changedAxes = (['x', 'y', 'z'] as const).filter((axis) => Math.abs(after[axis] - before[axis]) > 5);
      expect(changedAxes.length).toBeGreaterThan(0);
      expect(changedAxes.some((axis) => Math.abs(after[axis] % 90) > 1)).toBe(true);
    });
  }
});

async function setCameraView(window: import('@playwright/test').Page, view: 'isometric' | 'top' | 'front' | 'right') {
  await window.waitForFunction(() => typeof window.__carvdE2E?.setCameraView === 'function', null, { timeout: 10000 });
  await window.evaluate((targetView) => window.__carvdE2E!.setCameraView(targetView), view);
  await window.waitForTimeout(250);
}

function rotationHandlesForView(view: 'isometric' | 'top' | 'front' | 'right') {
  if (view === 'top') {
    return [
      { axis: 'x' as const, side: 1 as const },
      { axis: 'z' as const, side: 1 as const },
      { axis: 'x' as const, side: -1 as const },
      { axis: 'z' as const, side: -1 as const }
    ];
  }
  if (view === 'front') {
    return [
      { axis: 'z' as const, side: 1 as const },
      { axis: 'y' as const, side: 1 as const }
    ];
  }
  if (view === 'right') {
    return [
      { axis: 'x' as const, side: 1 as const },
      { axis: 'y' as const, side: 1 as const },
      { axis: 'z' as const, side: 1 as const },
      { axis: 'x' as const, side: -1 as const }
    ];
  }
  return [{ axis: 'y' as const, side: 1 as const }];
}

function dragDeltaForView(view: 'isometric' | 'top' | 'front' | 'right') {
  if (view === 'top') return { x: 70, y: 45 };
  if (view === 'front') return { x: 70, y: -45 };
  if (view === 'right') return { x: -70, y: -45 };
  return { x: 70, y: -45 };
}
