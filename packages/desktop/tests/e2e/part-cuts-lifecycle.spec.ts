import { expect, test } from '@playwright/test';
import type { Page } from 'playwright';
import fs from 'fs';
import path from 'path';
import {
  addPartFromSidebar,
  closeElectronApp,
  createBlankProject,
  launchElectronApp,
  queueOpenPaths,
  queueSavePath,
  type RunningElectronApp
} from './helpers/electron-app';

async function selectFirstPart(window: Page): Promise<void> {
  await window.evaluate(() => {
    const part = window.useProjectStore.getState().parts[0];
    window.useSelectionStore.getState().selectPart(part.id);
  });
}

async function isEditingPartCuts(window: Page): Promise<boolean> {
  return window.evaluate(() => window.usePartCutsEditingStore.getState().isEditingPartCuts);
}

async function getFirstPartFeatureCount(window: Page): Promise<number> {
  return window.evaluate(() => window.useProjectStore.getState().parts[0]?.features?.length ?? 0);
}

async function getPartCount(window: Page): Promise<number> {
  return window.evaluate(() => window.useProjectStore.getState().parts.length);
}

async function openPartCutsFromProperties(window: Page): Promise<void> {
  await selectFirstPart(window);
  await window.getByRole('button', { name: 'Edit Part Cuts' }).click();
  await expect(window.locator('.header-mode-chip', { hasText: 'Part Cuts' })).toBeVisible();
}

async function addDadoCut(window: Page): Promise<void> {
  await window.getByRole('button', { name: '+ Add Cut' }).click();
  // The preset button's accessible name is the label plus its hint copy;
  // anchor to the start so "Dado" does not also match "Stopped Dado".
  await window.getByRole('button', { name: /^Dado\b/ }).click();
  await window.getByRole('button', { name: 'Save Cut' }).click();
}

async function pressSaveShortcut(window: Page): Promise<void> {
  await window.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+S`);
}

test.describe('part cuts editing lifecycle', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
    await createBlankProject(running.window, 'Part Cuts Lifecycle E2E');
    await addPartFromSidebar(running.window);
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('adds a dado in the cuts workspace and saves it to the part', async () => {
    const { window } = running;

    await openPartCutsFromProperties(window);
    await addDadoCut(window);

    // The saved cut shows up in the cuts list with its numbered summary.
    await expect(window.getByText(/^1\./)).toBeVisible();

    await window.getByRole('button', { name: 'Save Part' }).click();

    await expect.poll(() => isEditingPartCuts(window), { timeout: 5000 }).toBe(false);
    await expect.poll(() => getFirstPartFeatureCount(window), { timeout: 5000 }).toBe(1);
    await expect(window.locator('.header-mode-chip', { hasText: 'Part Cuts' })).toHaveCount(0);
  });

  test('prompts before discarding unsaved cut changes', async () => {
    const { window } = running;

    await openPartCutsFromProperties(window);
    await addDadoCut(window);

    await window.getByRole('button', { name: 'Back to Project' }).click();
    const exitDialog = window.getByRole('alertdialog', { name: 'Save Part Cuts?' });
    await expect(exitDialog).toBeVisible();

    // Keep editing: the workspace stays open and the draft survives.
    await exitDialog.getByRole('button', { name: 'Keep Editing' }).click();
    await expect(exitDialog).toHaveCount(0);
    expect(await isEditingPartCuts(window)).toBe(true);

    // Discard: the workspace closes and no features reach the part.
    await window.getByRole('button', { name: 'Back to Project' }).click();
    await window.getByRole('alertdialog', { name: 'Save Part Cuts?' }).getByRole('button', { name: 'Discard' }).click();

    await expect.poll(() => isEditingPartCuts(window), { timeout: 5000 }).toBe(false);
    expect(await getFirstPartFeatureCount(window)).toBe(0);
  });

  test('project shortcuts cannot reach the part being edited', async () => {
    const { window } = running;

    await openPartCutsFromProperties(window);

    const rotationBefore = await window.evaluate(() => window.useProjectStore.getState().parts[0].rotation);

    // Delete / duplicate / rotate are project-level shortcuts; while the cuts
    // workspace is open they must not touch the part behind it.
    await window.keyboard.press('Delete');
    await window.keyboard.press('x');
    await window.keyboard.press('Shift+D');

    expect(await getPartCount(window)).toBe(1);
    expect(await window.evaluate(() => window.useProjectStore.getState().parts[0].rotation)).toEqual(rotationBefore);
    expect(await window.evaluate(() => window.useUIStore.getState().pendingDeletePartIds)).toBeNull();
    expect(await isEditingPartCuts(window)).toBe(true);
  });

  test('persists custom cuts through a project save and reload', async () => {
    const { window, userDataDir } = running;
    const projectPath = path.join(userDataDir, 'part-cuts-persistence.carvd');

    await openPartCutsFromProperties(window);
    await addDadoCut(window);
    await window.getByRole('button', { name: 'Save Part' }).click();
    await queueSavePath(window, projectPath);
    await pressSaveShortcut(window);

    await expect.poll(() => fs.existsSync(projectPath), { timeout: 5000 }).toBe(true);
    const saved = JSON.parse(fs.readFileSync(projectPath, 'utf8')) as {
      version: number;
      parts: Array<{ features?: Array<{ kind: string; cutType: string }> }>;
    };
    expect(saved.version).toBe(2);
    expect(saved.parts[0].features).toEqual([expect.objectContaining({ kind: 'rect_cut', cutType: 'dado' })]);

    await window.getByRole('button', { name: 'Carvd Studio home' }).click();
    await queueOpenPaths(window, [projectPath]);
    await window.getByRole('button', { name: 'Open file...' }).click();
    await expect.poll(() => getFirstPartFeatureCount(window), { timeout: 5000 }).toBe(1);

    await openPartCutsFromProperties(window);
    await expect(window.getByText(/^1\./)).toBeVisible();
  });
});
