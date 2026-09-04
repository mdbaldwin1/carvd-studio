import { expect, test } from '@playwright/test';
import type { Page } from 'playwright';
import fs from 'fs';
import path from 'path';
import {
  addPartFromSidebar,
  clickMenuItem,
  closeElectronApp,
  createBlankProject,
  launchElectronApp,
  openSelectionContextMenu,
  queueOpenPaths,
  queueSavePath,
  seedProject,
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
  await addPresetCut(window, 'Dado');
}

async function addPresetCut(window: Page, preset: string): Promise<void> {
  await window.getByRole('button', { name: '+ Add Cut' }).click();
  await window.getByRole('button', { name: new RegExp(`^${preset}\\b`) }).click();
  await window.getByRole('button', { name: 'Save Cut' }).click();
}

async function getFirstPartFeatures(window: Page): Promise<Array<{ id: string; cutType: string }>> {
  return window.evaluate(() =>
    (window.useProjectStore.getState().parts[0]?.features ?? []).map((feature) => ({
      id: feature.id,
      cutType: feature.kind === 'end_cut' ? feature.cutType : feature.cutType
    }))
  );
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

  test('authors mortise-and-tenon operations through the real cuts controls', async () => {
    const { window } = running;
    await openPartCutsFromProperties(window);
    await addPresetCut(window, 'Tenon');
    await addPresetCut(window, 'Mortise');
    await window.getByRole('button', { name: 'Save Part' }).click();

    await expect.poll(() => getFirstPartFeatureCount(window)).toBe(2);
    expect((await getFirstPartFeatures(window)).map((feature) => feature.cutType)).toEqual(['tenon', 'mortise']);
  });

  test('blocks conflicting duplicate end cuts and keeps the workspace open', async () => {
    const { window } = running;
    await openPartCutsFromProperties(window);
    await addPresetCut(window, 'End Cut');
    await addPresetCut(window, 'End Cut');

    await expect(window.getByText(/Only one enabled cut per end or edge/i).first()).toBeVisible();
    await expect(window.getByRole('button', { name: 'Save Part' })).toBeDisabled();
    expect(await isEditingPartCuts(window)).toBe(true);
  });

  test('copies cuts to another part with independent feature ids', async () => {
    const { window } = running;
    await openPartCutsFromProperties(window);
    await addDadoCut(window);
    await window.getByRole('button', { name: 'Save Part' }).click();
    await addPartFromSidebar(window);

    await window.evaluate(() => {
      const source = window.useProjectStore.getState().parts[0];
      window.useSelectionStore.getState().selectPart(source.id);
    });
    await openSelectionContextMenu(window);
    await clickMenuItem(window, 'Copy Cuts');
    await window.evaluate(() => {
      const target = window.useProjectStore.getState().parts[1];
      window.useSelectionStore.getState().selectPart(target.id);
    });
    await openSelectionContextMenu(window);
    await window.getByRole('menuitem', { name: /^Paste Cuts/ }).click();
    await expect
      .poll(async () => window.evaluate(() => window.useProjectStore.getState().parts[1].features?.length))
      .toBe(1);

    const result = await window.evaluate(() => {
      const parts = window.useProjectStore.getState().parts;
      return {
        sourceIds: parts[0].features?.map((feature) => feature.id) ?? [],
        targetIds: parts[1].features?.map((feature) => feature.id) ?? [],
        targetTypes: parts[1].features?.map((feature) => feature.kind === 'rect_cut' && feature.cutType) ?? []
      };
    });

    expect(result.targetTypes).toEqual(['dado']);
    expect(result.targetIds).toHaveLength(1);
    expect(result.targetIds[0]).not.toBe(result.sourceIds[0]);
  });

  test('shows saved operations in fabrication output', async () => {
    const { window } = running;
    await seedProject(window, 'stocked-one-part');
    await openPartCutsFromProperties(window);
    await addDadoCut(window);
    await window.getByRole('button', { name: 'Save Part' }).click();

    await window.getByRole('button', { name: /Generate Cut List|View Cut List/ }).click();
    const dialog = window.getByRole('dialog').filter({ has: window.getByRole('heading', { name: 'Cut List' }) });
    await dialog.getByRole('button', { name: 'Generate Cut List' }).click();
    await expect(dialog.getByText(/Cut blanks first/i)).toBeVisible();
    await expect(dialog.getByText(/Dado/i)).toBeVisible();
  });

  test('persists round and rounded operations through save and reopen', async () => {
    const { window, userDataDir } = running;
    const projectPath = path.join(userDataDir, 'round-cuts-persistence.carvd');

    await openPartCutsFromProperties(window);
    await window.getByRole('button', { name: '+ Add Cut' }).click();
    await window.getByRole('button', { name: /^Round Hole\b/ }).click();
    await window.getByLabel('Depth').selectOption('blind');
    await window.getByLabel('Tilt From Square (degrees)').fill('15');
    await window.getByLabel('Repeating Pattern').selectOption('linear');
    await window.getByLabel('Hole Count').fill('3');
    await window.getByRole('button', { name: 'Save Cut' }).click();

    await window.getByRole('button', { name: '+ Add Cut' }).click();
    await window.getByRole('button', { name: /^Rounded Rectangle\b/ }).click();
    await window.getByRole('button', { name: 'Save Cut' }).click();
    await window.getByRole('button', { name: 'Save Part' }).click();

    await queueSavePath(window, projectPath);
    await pressSaveShortcut(window);
    await expect.poll(() => fs.existsSync(projectPath), { timeout: 5000 }).toBe(true);

    await window.getByRole('button', { name: 'Carvd Studio home' }).click();
    await queueOpenPaths(window, [projectPath]);
    await window.getByRole('button', { name: 'Open file...' }).click();
    await expect.poll(() => getFirstPartFeatureCount(window), { timeout: 5000 }).toBe(2);

    const savedKinds = await window.evaluate(() =>
      (window.useProjectStore.getState().parts[0].features ?? []).map((feature) => ({
        kind: feature.kind,
        pattern: feature.kind === 'circular_cut' ? feature.pattern?.type : undefined
      }))
    );
    expect(savedKinds).toEqual([
      { kind: 'circular_cut', pattern: 'linear' },
      { kind: 'rounded_cut', pattern: undefined }
    ]);
  });

  test('creates and undoes both sides of a paired dowel joint atomically', async () => {
    const { window } = running;
    await addPartFromSidebar(window);
    await window.evaluate(() => {
      const [first, second] = window.useProjectStore.getState().parts;
      window.useProjectStore.setState({
        parts: [
          { ...first, name: 'Lower rail', position: { x: 0, y: 0, z: 0 } },
          { ...second, name: 'Upper rail', position: { x: 0, y: first.thickness, z: 0 } }
        ]
      });
      window.useSelectionStore.getState().selectPart(first.id);
    });

    await openPartCutsFromProperties(window);
    await window.getByRole('button', { name: '+ Add Cut' }).click();
    await window.getByRole('button', { name: /^Create Dowel Joint\b/ }).click();
    await window.getByRole('button', { name: 'Next' }).click();
    await window.getByRole('button', { name: 'Next' }).click();
    await window.getByRole('button', { name: 'Next' }).click();
    await window.getByRole('button', { name: 'Create Dowel Joint' }).click();

    await expect
      .poll(async () =>
        window.evaluate(() => window.useProjectStore.getState().parts.map((part) => part.features?.length ?? 0))
      )
      .toEqual([2, 2]);
    await window.evaluate(() => window.useProjectStore.temporal.getState().undo());
    await expect
      .poll(async () =>
        window.evaluate(() => window.useProjectStore.getState().parts.map((part) => part.features?.length ?? 0))
      )
      .toEqual([0, 0]);
  });
});
