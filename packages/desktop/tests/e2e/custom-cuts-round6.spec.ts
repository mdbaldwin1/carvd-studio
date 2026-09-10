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

test.describe('round 6 active cut inspector lifecycle', () => {
  let running: RunningElectronApp;
  test.beforeEach(async () => {
    // This suite starts in an existing user's cut editor, not first-run onboarding.
    // Seed the persisted preference before App schedules its delayed tutorial.
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
                reference: { primaryFrom: 'min', secondaryFrom: 'max' },
                placement: { primary: 1, secondary: 1, rotation: 0 },
                parameters: { diameter: 0.25, depthMode: 'through', tilt: 0, direction: 0 }
              }
            ]
          }
        ]
      });
      window.useSelectionStore.getState().selectPart(part.id);
    });
  });
  test.afterEach(async () => {
    await closeElectronApp(running);
  });
  const open = async () => {
    await running.window.getByRole('button', { name: 'Edit Part Cuts' }).click();
    await running.window.getByRole('button', { name: /^1\./ }).click();
  };
  for (const route of ['header', 'shortcut', 'native'] as const)
    test(`K7 ${route} saves active label and focused numeric edits; invalid stays open`, async () => {
      const { window, userDataDir } = running;
      const file = path.join(userDataDir, `active-${route}.carvd`);
      await queueSavePath(window, file);
      // Save in cuts mode commits the draft and stops there, exactly as it
      // does for template and assembly editing. Writing the project is a
      // second, ordinary Save once the workspace has closed.
      const save = async () => {
        if (route === 'header') await window.getByTitle('Save (Cmd+S)', { exact: true }).click();
        else if (route === 'shortcut')
          await window.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+S`);
        else await sendNativeMenuCommand(running, 'save-project');
      };
      const saveProjectFile = async () => {
        await window.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+S`);
      };
      for (const kind of ['label', 'diameter'] as const) {
        await open();
        if (kind === 'label') await window.getByLabel('Label (optional)', { exact: true }).fill('Renamed hole');
        else await window.getByRole('textbox', { name: /Hole Diameter/ }).fill('.755'); // No blur before shortcut/native save.
        await save();
        await expect
          .poll(() => window.evaluate(() => window.usePartCutsEditingStore.getState().isEditingPartCuts))
          .toBe(false);
        await saveProjectFile();
        await expect.poll(() => fs.existsSync(file)).toBe(true);
        await expect
          .poll(() => JSON.parse(fs.readFileSync(file, 'utf8')).parts[0].features[0])
          .toMatchObject({
            label: 'Renamed hole',
            reference: { primaryFrom: 'min', secondaryFrom: 'max' },
            ...(kind === 'diameter' ? { parameters: { diameter: 0.755 } } : {})
          });
      }
      await open();
      await window.getByRole('textbox', { name: /Hole Diameter/ }).fill('20');
      await save();
      await expect(window.getByRole('alert')).toContainText(/diameter|edge|face/i);
      expect(await window.evaluate(() => window.usePartCutsEditingStore.getState().isEditingPartCuts)).toBe(true);
      expect(JSON.parse(fs.readFileSync(file, 'utf8')).parts[0].features[0].parameters.diameter).toBe(0.755);
    });
  for (const route of ['exit', 'logo', 'native-close'] as const)
    test(`K7 ${route} prompts for local label and focused numeric changes`, async () => {
      const { window } = running;
      for (const kind of ['label', 'diameter'] as const) {
        await open();
        if (kind === 'label') await window.getByLabel('Label (optional)', { exact: true }).fill('Unsaved label');
        else await window.getByRole('textbox', { name: /Hole Diameter/ }).fill('.74');
        if (route === 'exit')
          await window
            .getByRole('button', { name: /^(Cancel|Exit)$/ })
            .first()
            .click();
        else if (route === 'logo') await window.getByRole('button', { name: 'Carvd Studio home' }).click();
        else await sendNativeMenuCommand(running, 'close-project');
        const dialog = window.getByRole('alertdialog', { name: 'Save Part Cuts?' });
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: 'Keep Editing' }).click();
        expect(await window.evaluate(() => window.usePartCutsEditingStore.getState().isEditingPartCuts)).toBe(true);
        await window.getByRole('button', { name: 'Carvd Studio home' }).click();
        await dialog.getByRole('button', { name: 'Discard' }).click();
        await expect
          .poll(() => window.evaluate(() => window.usePartCutsEditingStore.getState().isEditingPartCuts))
          .toBe(false);
        expect(await window.evaluate(() => window.useProjectStore.getState().parts[0].features![0].label)).toBe(
          'Original hole'
        );
      }
    });
});
