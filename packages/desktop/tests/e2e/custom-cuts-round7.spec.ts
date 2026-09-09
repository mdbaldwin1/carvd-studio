import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  closeElectronApp,
  launchElectronApp,
  seedProject,
  queueSavePath,
  sendNativeMenuCommand,
  type RunningElectronApp
} from './helpers/electron-app';

test.describe('round 7 native close and Save As', () => {
  let running: RunningElectronApp;
  let originalFile: string;
  test.beforeEach(async () => {
    // This fixture is an existing user's saved project. Seed the real saved
    // preference before startup so delayed first-run onboarding cannot replace it.
    running = await launchElectronApp({ hasCompletedWelcome: true });
    await seedProject(running.window, 'one-part');
    await running.window.evaluate(() => {
      const part = window.useProjectStore.getState().parts[0];
      window.useProjectStore.setState({
        parts: [
          {
            ...part,
            length: 10,
            width: 4,
            thickness: 1,
            features: [
              {
                id: 'hole',
                label: 'Original hole',
                kind: 'circular_cut',
                version: 1,
                enabled: true,
                cutType: 'round_hole',
                target: { type: 'face', face: 'top_face' },
                reference: { primaryFrom: 'center', secondaryFrom: 'center' },
                placement: { primary: 0, secondary: 0, rotation: 0 },
                parameters: { diameter: 0.25, depthMode: 'through', tilt: 0, direction: 0 }
              }
            ]
          }
        ]
      });
      window.useSelectionStore.getState().selectPart(part.id);
    });
    originalFile = path.join(running.userDataDir, 'original.carvd');
    await queueSavePath(running.window, originalFile);
    await sendNativeMenuCommand(running, 'save-project');
    await expect.poll(() => fs.existsSync(originalFile)).toBe(true);
    await expect.poll(() => running.window.evaluate(() => window.useProjectStore.getState().isDirty)).toBe(false);
  });
  test.afterEach(async () => {
    await closeElectronApp(running);
  });
  const open = async () => {
    await running.window.getByRole('button', { name: 'Edit Part Cuts' }).click();
    await running.window.getByRole('button', { name: /^1\./ }).click();
  };
  const closeWindow = async () => {
    await running.electronApp.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows().find(
        (candidate) => !candidate.webContents.getURL().includes('splash')
      )!;
      window.close();
    });
  };
  test('L1 actual close catches a saved-cut session even with no active inspector', async () => {
    const { window } = running;
    await open();
    await window.getByLabel('Label (optional)', { exact: true }).fill('Session label');
    await window.getByRole('button', { name: 'Save Cut', exact: true }).click();
    expect(await window.evaluate(() => window.useProjectStore.getState().isDirty)).toBe(false);
    expect(await window.evaluate(() => window.usePartCutsEditingStore.getState().inspectorDirty)).toBe(false);
    await closeWindow();
    const dialog = window.getByRole('alertdialog', { name: 'Unsaved Changes' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => window.isClosed()).toBe(true);
    expect(JSON.parse(fs.readFileSync(originalFile, 'utf8')).parts[0].features[0].label).toBe('Session label');
  });
  test('L1 actual close permits an unchanged clean cut session', async () => {
    await open();
    await closeWindow();
    await expect.poll(() => running.window.isClosed()).toBe(true);
    expect(JSON.parse(fs.readFileSync(originalFile, 'utf8')).parts[0].features[0].label).toBe('Original hole');
  });
  for (const projectDirty of [false, true])
    for (const choice of ['Save', "Don't Save", 'Cancel'] as const)
      test(`L1 actual BrowserWindow close, project dirty=${projectDirty}, ${choice}`, async () => {
        const { window } = running;
        if (projectDirty)
          await window.evaluate(() =>
            window.useProjectStore
              .getState()
              .updatePart(window.useProjectStore.getState().parts[0].id, { name: 'Renamed board' })
          );
        await open();
        await window.getByLabel('Label (optional)', { exact: true }).fill('Unsaved label');
        await closeWindow();
        const dialog = window.getByRole('alertdialog', { name: 'Unsaved Changes' });
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: choice, exact: true }).click();
        if (choice === 'Cancel') {
          await expect(dialog).not.toBeVisible();
          expect(window.isClosed()).toBe(false);
          await expect(window.getByLabel('Label (optional)', { exact: true })).toHaveValue('Unsaved label');
        } else await expect.poll(() => window.isClosed()).toBe(true);
        expect(JSON.parse(fs.readFileSync(originalFile, 'utf8')).parts[0].features[0].label).toBe(
          choice === 'Save' ? 'Unsaved label' : 'Original hole'
        );
      });
  for (const projectDirty of [false, true])
    test(`L1 native close validates a focused numeric edit; project dirty=${projectDirty}`, async () => {
      const { window } = running;
      if (projectDirty) await window.evaluate(() => window.useProjectStore.setState({ isDirty: true }));
      await open();
      await window.getByRole('textbox', { name: /Hole Diameter/ }).fill('20');
      await closeWindow();
      const dialog = window.getByRole('alertdialog', { name: 'Unsaved Changes' });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(dialog.getByRole('alert')).toContainText('Hole profile extends beyond the selected face.');
      await expect(dialog).toBeVisible();
      expect(window.isClosed()).toBe(false);
      expect(JSON.parse(fs.readFileSync(originalFile, 'utf8')).parts[0].features[0].parameters.diameter).toBe(0.25);
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await window.getByRole('textbox', { name: /Hole Diameter/ }).fill('.755');
      await closeWindow();
      await dialog.getByRole('button', { name: 'Save', exact: true }).click();
      await expect.poll(() => window.isClosed()).toBe(true);
      expect(JSON.parse(fs.readFileSync(originalFile, 'utf8')).parts[0].features[0].parameters.diameter).toBe(0.755);
    });
  for (const route of ['shortcut', 'native'] as const)
    test(`L2 ${route} Save As commits label and focused numeric edits, rejects invalid without writing`, async () => {
      const { window, userDataDir } = running;
      const saveAs = async () => {
        if (route === 'shortcut')
          await window.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+Shift+S`);
        else await sendNativeMenuCommand(running, 'save-project-as');
      };
      for (const kind of ['label', 'diameter'] as const) {
        await open();
        if (kind === 'label') await window.getByLabel('Label (optional)', { exact: true }).fill('Saved As label');
        else await window.getByRole('textbox', { name: /Hole Diameter/ }).fill('.74');
        const file = path.join(userDataDir, `${route}-${kind}.carvd`);
        await queueSavePath(window, file);
        await saveAs();
        await expect.poll(() => fs.existsSync(file)).toBe(true);
        expect(JSON.parse(fs.readFileSync(file, 'utf8')).parts[0].features[0]).toMatchObject({
          label: 'Saved As label',
          ...(kind === 'diameter' ? { parameters: { diameter: 0.74 } } : {})
        });
        await expect
          .poll(() => window.evaluate(() => window.usePartCutsEditingStore.getState().isEditingPartCuts))
          .toBe(false);
      }
      await open();
      await window.getByRole('textbox', { name: /Hole Diameter/ }).fill('20');
      const invalid = path.join(userDataDir, `${route}-invalid.carvd`);
      await queueSavePath(window, invalid);
      await saveAs();
      await expect(window.getByRole('alert')).toContainText(/diameter|edge|face/i);
      expect(fs.existsSync(invalid)).toBe(false);
      expect(await window.evaluate(() => window.usePartCutsEditingStore.getState().isEditingPartCuts)).toBe(true);
    });
});
