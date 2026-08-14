import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import {
  clickMenuItem,
  closeElectronApp,
  dragCanvas,
  getCanvasPoint,
  getProjectSnapshot,
  launchElectronApp,
  queueSavePath,
  rightClickCanvas,
  seedProject,
  type RunningElectronApp
} from './helpers/electron-app';

test.describe('canvas selection and context edge cases', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('box select selects multiple visible parts and shift-click toggles one part', async () => {
    const { window } = running;
    await seedProject(window, 'two-parts');
    await window.evaluate(() => window.useSelectionStore.getState().clearSelection());
    const [firstId, secondId] = await window.evaluate(() => window.useProjectStore.getState().parts.map((p) => p.id));
    const first = await getPartPoint(window, firstId);
    const second = await getPartPoint(window, secondId);

    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
    await window.keyboard.down(mod);
    await dragCanvas(
      window,
      { x: Math.min(first.x, second.x) - 60, y: Math.min(first.y, second.y) - 60 },
      { x: Math.abs(second.x - first.x) + 120, y: Math.abs(second.y - first.y) + 120 }
    );
    await window.keyboard.up(mod);

    await expect
      .poll(async () => (await getProjectSnapshot(window)).selectedPartIds.sort())
      .toEqual([firstId, secondId].sort());

    await window.keyboard.down('Shift');
    await window.mouse.click(first.x, first.y);
    await window.keyboard.up('Shift');
    await expect.poll(async () => (await getProjectSnapshot(window)).selectedPartIds).toEqual([secondId]);
  });

  test('double click/drill selects nested grouped part without corrupting group selection', async () => {
    const { window } = running;
    await seedProject(window, 'one-group');
    const groupId = (await getProjectSnapshot(window)).selectedGroupIds[0];
    const partId = await window.evaluate(() => window.useProjectStore.getState().parts[0].id);
    const point = await getPartPoint(window, partId);

    await window.mouse.dblclick(point.x, point.y);

    await expect
      .poll(async () => window.evaluate(() => window.useSelectionStore.getState().editingGroupId))
      .toBe(groupId);
    await expect.poll(async () => (await getProjectSnapshot(window)).selectedPartIds).toEqual([partId]);
    await expect.poll(async () => (await getProjectSnapshot(window)).selectedGroupIds).toEqual([]);
  });

  test('background click clears selection, while modifier background click preserves selection', async () => {
    const { window } = running;
    await seedProject(window, 'one-part');
    const partId = (await getProjectSnapshot(window)).parts[0].id;
    const background = await getCanvasPoint(window, 0.92, 0.18);

    await window.keyboard.down('Shift');
    await window.mouse.click(background.x, background.y);
    await window.keyboard.up('Shift');
    await expect.poll(async () => (await getProjectSnapshot(window)).selectedPartIds).toEqual([partId]);

    await window.mouse.click(background.x, background.y);
    await expect.poll(async () => (await getProjectSnapshot(window)).selectedPartIds).toEqual([]);
  });

  test('background context Paste Here places clipboard at clicked location', async () => {
    const { window } = running;
    await seedProject(window, 'one-part');
    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
    await window.keyboard.press(`${mod}+C`);
    const background = await getCanvasPoint(window, 0.78, 0.72);

    await rightClickCanvas(window, background);
    await clickMenuItem(window, 'Paste Here');

    await expect.poll(async () => (await getProjectSnapshot(window)).parts.length).toBe(2);
  });

  test('background context Export as Image and Capture Thumbnail produce observable artifacts', async () => {
    const { window, userDataDir } = running;
    await seedProject(window, 'one-part');
    const background = await getCanvasPoint(window, 0.75, 0.75);
    const imagePath = path.join(userDataDir, 'canvas-export.png');

    await queueSavePath(window, imagePath);
    await rightClickCanvas(window, background);
    await clickMenuItem(window, 'Export as Image');
    await expect.poll(() => fs.existsSync(imagePath), { timeout: 5000 }).toBe(true);

    await rightClickCanvas(window, background);
    await clickMenuItem(window, 'Capture Thumbnail');
    await expect
      .poll(async () => window.evaluate(() => window.useUIStore.getState().manualThumbnail?.manuallySet ?? false), {
        timeout: 5000
      })
      .toBe(true);
  });

  test('clear all guides works from background and guide context menus', async () => {
    const { window } = running;
    await seedProject(window, 'guide');
    await window.evaluate(() => {
      window.useProjectStore.getState().addSnapGuide('z', 20);
    });
    const background = await getCanvasPoint(window, 0.7, 0.72);

    await rightClickCanvas(window, background);
    await clickMenuItem(window, 'Clear All Guides (2)');
    await expect.poll(async () => (await getProjectSnapshot(window)).snapGuides).toEqual([]);

    await window.evaluate(() => {
      const project = window.useProjectStore.getState();
      const guideId = project.addSnapGuide('x', 10);
      project.addSnapGuide('z', 20);
      window.useUIStore.getState().openContextMenu({ x: 500, y: 300, type: 'guide', guideId });
    });
    await expect(window.locator('[role="menu"], .context-menu')).toBeVisible();
    await clickMenuItem(window, 'Clear All Guides (2)');
    await expect.poll(async () => (await getProjectSnapshot(window)).snapGuides).toEqual([]);
  });
});

async function getPartPoint(window: import('@playwright/test').Page, partId: string) {
  await window.waitForFunction(() => typeof window.__carvdE2E?.getPartScreenPoint === 'function', null, {
    timeout: 10000
  });
  const point = await window.evaluate((id) => window.__carvdE2E?.getPartScreenPoint(id) ?? null, partId);
  if (!point) throw new Error(`No screen point for part ${partId}`);
  return point;
}
