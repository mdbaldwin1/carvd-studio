import { expect, test } from '@playwright/test';
import {
  addPartFromSidebar,
  closeElectronApp,
  createBlankProject,
  ensureEditorReady,
  getProjectSnapshot,
  isEmptyStateVisible,
  launchElectronApp,
  type RunningElectronApp
} from './helpers/electron-app';

test.describe('Happy Path Workflow', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('app launches, creates project, and shows editor', async () => {
    await createBlankProject(running.window, 'Happy Path Project');

    const snapshot = await getProjectSnapshot(running.window);
    expect(snapshot.projectName).toBe('Happy Path Project');
    await expect(running.window.locator('.app-header')).toBeVisible();
    await expect(running.window.locator('.sidebar')).toBeVisible();
    await expect(running.window.locator('canvas')).toBeVisible();
  });

  test('adds a part via sidebar', async () => {
    await ensureEditorReady(running.window);
    expect(await isEmptyStateVisible(running.window)).toBe(true);

    await addPartFromSidebar(running.window);

    expect(await isEmptyStateVisible(running.window)).toBe(false);
    const snapshot = await getProjectSnapshot(running.window);
    expect(snapshot.parts).toHaveLength(1);
    expect(snapshot.selectedPartIds).toEqual([snapshot.parts[0].id]);
  });

  test('modifies part dimensions', async () => {
    await ensureEditorReady(running.window);
    await addPartFromSidebar(running.window);

    const dimInputs = running.window.locator('.dimension-inputs input');
    await expect(dimInputs.first()).toBeVisible({ timeout: 5000 });
    await expect(dimInputs.first()).toHaveValue('24');

    await dimInputs.first().fill('36');
    await running.window.keyboard.press('Tab');
    await expect(dimInputs.first()).toHaveValue('36');

    const snapshot = await getProjectSnapshot(running.window);
    expect(snapshot.parts[0].length).toBe(36);
  });

  test('opens cut list modal', async () => {
    await ensureEditorReady(running.window);
    await addPartFromSidebar(running.window);

    await running.window.getByRole('button', { name: /generate cut list/i }).click({ force: true });

    const cutListDialog = running.window
      .getByRole('dialog')
      .filter({ has: running.window.getByRole('heading', { name: 'Cut List' }) });
    await expect(cutListDialog).toBeVisible({ timeout: 10000 });

    const modalContent = await running.window.evaluate(() => {
      const heading = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).find(
        (el) => el.textContent?.trim() === 'Cut List'
      );
      const modal = heading?.closest('[role="dialog"]');
      if (!modal) return { hasGenerate: false, hasIssues: false, hasTabs: false };
      return {
        hasGenerate: !!modal.querySelector('.cut-list-generate'),
        hasIssues: !!modal.querySelector('.cut-list-issues'),
        hasTabs: !!modal.querySelector('.cut-list-tabs')
      };
    });
    expect(modalContent.hasGenerate || modalContent.hasIssues || modalContent.hasTabs).toBe(true);

    await running.window.keyboard.press('Escape');
    await expect(cutListDialog).toBeHidden({ timeout: 5000 });
  });

  test('undo removes part, redo restores it', async () => {
    await ensureEditorReady(running.window);
    await addPartFromSidebar(running.window);
    expect(await isEmptyStateVisible(running.window)).toBe(false);

    const isMac = process.platform === 'darwin';
    await running.window.keyboard.press(isMac ? 'Meta+Z' : 'Control+Z');
    await expect.poll(() => isEmptyStateVisible(running.window)).toBe(true);

    await running.window.keyboard.press(isMac ? 'Meta+Shift+Z' : 'Control+Shift+Z');
    await expect.poll(() => isEmptyStateVisible(running.window)).toBe(false);

    const snapshot = await getProjectSnapshot(running.window);
    expect(snapshot.parts).toHaveLength(1);
  });
});
