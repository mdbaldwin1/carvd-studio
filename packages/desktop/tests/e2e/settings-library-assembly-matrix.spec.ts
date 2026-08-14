import { test, expect } from '@playwright/test';
import {
  closeElectronApp,
  createBlankProject,
  getProjectSnapshot,
  launchElectronApp,
  openSelectionContextMenu,
  seedProject,
  type RunningElectronApp
} from './helpers/electron-app';

test.describe('settings, library, and assembly flows', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
    await createBlankProject(running.window, 'Settings Library E2E');
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  test('project settings edits details, preferences, cut-list values, and stock constraints', async () => {
    const { window } = running;

    await window.getByRole('button', { name: 'Project Settings' }).click();
    const dialog = window.getByRole('dialog', { name: 'Project Settings' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('textbox', { name: 'Project name' }).fill('Cabinet Shop Test Project');
    await dialog.locator('textarea').fill('Client wants walnut fronts, verify grain before cutting.');

    await dialog.getByRole('tab', { name: 'Preferences' }).click();
    await selectInSettingsRow(dialog, 'Units', 'metric');
    await selectInSettingsRow(dialog, 'Grid Snap Size', String(10 / 25.4));
    await dialog.locator('.settings-row').filter({ hasText: 'Blade Kerf' }).locator('input').fill('3');
    await dialog.locator('.settings-row').filter({ hasText: 'Material Overage' }).locator('input').fill('25');
    await toggleSettingsCheckbox(dialog, 'Constrain Dimensions');
    await toggleSettingsCheckbox(dialog, 'Constrain Grain');
    await toggleSettingsCheckbox(dialog, 'Sync Part Color');
    await toggleSettingsCheckbox(dialog, 'Prevent Overlap');
    await dialog.getByRole('button', { name: 'Done' }).click();

    const snapshot = await getProjectSnapshot(window);
    expect(snapshot.projectName).toBe('Cabinet Shop Test Project');
    expect(snapshot.projectNotes).toContain('walnut fronts');
    expect(snapshot.units).toBe('metric');
    expect(snapshot.gridSize).toBeCloseTo(10 / 25.4, 4);
    expect(snapshot.kerfWidth).toBeCloseTo(3 / 25.4, 4);
    expect(snapshot.overageFactor).toBe(0.25);

    const constraints = await window.evaluate(() => window.useProjectStore.getState().stockConstraints);
    expect(constraints).toEqual({
      constrainDimensions: false,
      constrainGrain: false,
      constrainColor: false,
      preventOverlap: false
    });
  });

  test('app settings autosave every general/defaults control into preferences', async () => {
    const { window } = running;

    await window.getByTitle('App Settings').click();
    const dialog = window.getByRole('dialog', { name: 'App Settings' });
    await expect(dialog).toBeVisible();

    await selectInSettingsRow(dialog, 'Theme', 'light');
    await toggleSettingsCheckbox(dialog, 'Show Hotkey Hints');
    await selectInSettingsRow(dialog, 'Lighting Mode', 'bright');
    await toggleSettingsCheckbox(dialog, 'Auto-Save');
    await toggleSettingsCheckbox(dialog, 'Confirm Before Delete');
    await selectInSettingsRow(dialog, 'Snap Sensitivity', 'loose');
    await selectInSettingsRow(dialog, 'Advanced Snap Preset', 'layout');
    await toggleSettingsCheckbox(dialog, 'Live Grid Snapping');
    await toggleSettingsCheckbox(dialog, 'Snap to Origin');
    await toggleSettingsCheckbox(dialog, 'Match Same Dimensions Only');

    await dialog.getByRole('tab', { name: 'New Project Defaults' }).click();
    await selectInSettingsRow(dialog, 'Units', 'metric');
    await selectInSettingsRow(dialog, 'Grid Snap Size', String(5 / 25.4));
    await toggleSettingsCheckbox(dialog, 'Constrain Dimensions');
    await toggleSettingsCheckbox(dialog, 'Constrain Grain Direction');
    await toggleSettingsCheckbox(dialog, 'Auto-sync Color');
    await toggleSettingsCheckbox(dialog, 'Prevent Overlap');
    await dialog.getByRole('button', { name: 'Done' }).click();

    await expect
      .poll(async () => getPersistedAppSettings(window), { timeout: 5000 })
      .toMatchObject({
        theme: 'light',
        lightingMode: 'bright',
        snapSensitivity: 'loose',
        advancedSnapPreset: 'layout',
        defaultUnits: 'metric',
        defaultGridSize: 5 / 25.4,
        liveGridSnap: true,
        snapToOrigin: false,
        dimensionSnapSameTypeOnly: true,
        stockConstraints: {
          constrainDimensions: false,
          constrainGrain: false,
          constrainColor: false,
          preventOverlap: false
        }
      });
  });

  test('app library creates, searches, edits, exports, and deletes stock materials', async () => {
    const { window } = running;

    await window.getByTitle('Stock Library').click();
    const dialog = window.getByRole('dialog', { name: 'App Library' });
    await expect(dialog).toBeVisible();

    await dialog.locator('button[aria-label="Create new stock"]').click();
    await expect(dialog.getByText('New Stock')).toBeVisible();
    await dialog.locator('input[type="text"]').nth(1).fill('E2E Baltic Birch');
    await dialog.locator('input[type="text"]').nth(2).fill('60');
    await dialog.locator('input[type="text"]').nth(3).fill('30');
    await dialog.locator('input[type="text"]').nth(4).fill('0.5');
    await dialog.locator('select').first().selectOption('width');
    await dialog.locator('select').nth(1).selectOption('board_foot');
    await dialog.locator('input[type="number"]').fill('8.75');
    await dialog.getByRole('button', { name: 'Create', exact: true }).click();

    await expect(dialog.getByRole('heading', { name: 'E2E Baltic Birch' })).toBeVisible();
    await dialog.locator('input[placeholder="Search stocks..."]').fill('Baltic');
    await expect(dialog.getByRole('button', { name: /E2E Baltic Birch/ })).toBeVisible();
    await dialog.getByRole('button', { name: /E2E Baltic Birch/ }).click();
    await dialog.getByRole('button', { name: 'Edit' }).click();
    await dialog.locator('input[type="text"]').nth(1).fill('E2E Walnut Board');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog.getByRole('heading', { name: 'E2E Walnut Board' })).toBeVisible();

    await dialog.getByRole('button', { name: 'Export' }).click();
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Delete' }).click();
    await expect(dialog.getByText('E2E Walnut Board')).toHaveCount(0);

    const library = await window.evaluate(() => window.electronAPI.getPreference('stockLibrary'));
    expect(JSON.stringify(library)).not.toContain('E2E Walnut Board');
  });

  test('selection can be saved as an assembly, added to library, and placed back into the project', async () => {
    const { window } = running;

    await seedProject(window, 'two-parts');
    await openSelectionContextMenu(window);
    await window.getByRole('menuitem', { name: 'Save as Assembly' }).click();

    const saveDialog = window.getByRole('dialog', { name: 'Save as Assembly' });
    await expect(saveDialog).toBeVisible();
    await saveDialog.locator('input[type="text"]').fill('E2E Face Frame');
    await saveDialog.locator('textarea').fill('A reusable two-part face frame assembly.');
    await saveDialog.getByRole('button', { name: 'Save Assembly' }).click();

    await expect
      .poll(async () => getProjectSnapshot(window), { timeout: 5000 })
      .toMatchObject({ assemblies: [{ name: 'E2E Face Frame' }] });

    await seedProject(window, 'empty');
    await window.getByTitle('Add Assembly from Library').click();
    const addDialog = window.getByRole('dialog', { name: 'Add Assembly to Project' });
    await expect(addDialog).toBeVisible();
    await addDialog.locator('input[placeholder="Search assemblies..."]').fill('Face');
    await addDialog.getByText('E2E Face Frame').click();
    await addDialog.getByRole('button', { name: /Add to Project/ }).click();

    const snapshot = await getProjectSnapshot(window);
    expect(snapshot.assemblies.map((assembly) => assembly.name)).toContain('E2E Face Frame');
  });
});

async function selectInSettingsRow(
  dialog: ReturnType<import('@playwright/test').Page['getByRole']>,
  label: string,
  value: string
) {
  await dialog.locator('.settings-row').filter({ hasText: label }).locator('select').selectOption(value);
}

async function toggleSettingsCheckbox(dialog: ReturnType<import('@playwright/test').Page['getByRole']>, label: string) {
  await dialog.locator('.settings-row').filter({ hasText: label }).locator('input[type="checkbox"]').click();
}

async function getPersistedAppSettings(window: import('@playwright/test').Page) {
  return window.evaluate(async () => ({
    theme: await window.electronAPI.getPreference('theme'),
    lightingMode: await window.electronAPI.getPreference('lightingMode'),
    snapSensitivity: await window.electronAPI.getPreference('snapSensitivity'),
    advancedSnapPreset: await window.electronAPI.getPreference('advancedSnapPreset'),
    defaultUnits: await window.electronAPI.getPreference('defaultUnits'),
    defaultGridSize: await window.electronAPI.getPreference('defaultGridSize'),
    liveGridSnap: await window.electronAPI.getPreference('liveGridSnap'),
    snapToOrigin: await window.electronAPI.getPreference('snapToOrigin'),
    dimensionSnapSameTypeOnly: await window.electronAPI.getPreference('dimensionSnapSameTypeOnly'),
    stockConstraints: await window.electronAPI.getPreference('stockConstraints')
  }));
}
