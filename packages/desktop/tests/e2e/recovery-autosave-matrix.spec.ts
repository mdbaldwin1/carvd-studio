import { expect, test } from '@playwright/test';
import {
  closeElectronApp,
  getProjectSnapshot,
  launchElectronApp,
  waitForAppReady,
  type RunningElectronApp
} from './helpers/electron-app';

test.describe('recovery and autosave flows', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
    await waitForAppReady(running.window);
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('restores a valid recovery file into the editor and removes it after restore', async () => {
    const { window } = running;
    await seedRecoveryFile(window, 'restore-session.carvd-recovery', makeRecoveryPayload('Recovered E2E Project'));

    await window.reload();
    await waitForAppReady(window);
    const dialog = window.getByRole('alertdialog', { name: 'Recover Unsaved Work' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Recovered E2E Project')).toBeVisible();
    await dialog.getByRole('button', { name: 'Restore' }).click();

    await expect.poll(async () => (await getProjectSnapshot(window)).projectName).toBe('Recovered E2E Project');
    await expect.poll(async () => (await getProjectSnapshot(window)).parts.length).toBe(1);
    await expect.poll(async () => window.evaluate(() => window.electronAPI.listRecoveryFiles())).toEqual([]);
    await expect(window.getByText('Project restored from auto-save')).toBeVisible();
  });

  test('discards a valid recovery file and remains on the start screen', async () => {
    const { window } = running;
    await seedRecoveryFile(window, 'discard-session.carvd-recovery', makeRecoveryPayload('Discarded E2E Project'));

    await window.reload();
    await waitForAppReady(window);
    const dialog = window.getByRole('alertdialog', { name: 'Recover Unsaved Work' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Discard' }).click();

    await expect(dialog).toHaveCount(0);
    await expect(window.locator('.start-screen')).toBeVisible();
    await expect.poll(async () => window.evaluate(() => window.electronAPI.listRecoveryFiles())).toEqual([]);
  });

  test('ignores malformed recovery files without blocking startup', async () => {
    const { window } = running;
    await seedRecoveryFile(window, 'malformed-session.carvd-recovery', 'not valid json{{{');

    await window.reload();
    await waitForAppReady(window);
    await expect(window.getByRole('alertdialog', { name: 'Recover Unsaved Work' })).toHaveCount(0);
    await expect(window.locator('.start-screen, .app-header').first()).toBeVisible();
  });
});

async function seedRecoveryFile(window: import('@playwright/test').Page, fileName: string, data: string) {
  await window.evaluate(
    async ({ seededFileName, seededData }) => {
      await window.electronAPI.saveRecoveryFile(seededFileName, seededData);
    },
    { seededFileName: fileName, seededData: data }
  );
  await expect.poll(async () => window.evaluate(() => window.electronAPI.listRecoveryFiles())).toContain(fileName);
}

function makeRecoveryPayload(projectName: string): string {
  const now = '2026-08-13T12:00:00.000Z';
  return JSON.stringify({
    recovery: {
      filePath: null
    },
    projectData: {
      version: 1,
      project: {
        name: projectName,
        createdAt: now,
        modifiedAt: now,
        units: 'imperial',
        gridSize: 0.0625,
        kerfWidth: 0.125,
        overageFactor: 0.1,
        projectNotes: '',
        stockConstraints: {
          constrainDimensions: true,
          constrainGrain: true,
          constrainColor: true,
          preventOverlap: true
        }
      },
      parts: [
        {
          id: 'recovered-part-1',
          name: 'Recovered Part',
          length: 24,
          width: 12,
          thickness: 0.75,
          position: { x: 0, y: 0.375, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          stockId: null,
          color: '#c4a574',
          grainSensitive: true,
          grainDirection: 'length'
        }
      ],
      stocks: [],
      groups: [],
      groupMembers: []
    }
  });
}
