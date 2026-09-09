import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  closeElectronApp,
  launchElectronApp,
  seedProject,
  queueSavePath,
  queueOpenPaths,
  sendNativeMenuCommand,
  type RunningElectronApp
} from './helpers/electron-app';

test.describe('round 8 destructive file actions', () => {
  let running: RunningElectronApp;
  let file: string;
  test.beforeEach(async () => {
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
    file = path.join(running.userDataDir, 'original.carvd');
    await queueSavePath(running.window, file);
    await sendNativeMenuCommand(running, 'save-project');
    await expect.poll(() => fs.existsSync(file)).toBe(true);
    await expect.poll(() => running.window.evaluate(() => window.useProjectStore.getState().isDirty)).toBe(false);
    await running.window.getByRole('button', { name: 'Edit Part Cuts' }).click();
    await running.window.getByRole('button', { name: /^1\./ }).click();
    await running.window.getByLabel('Label (optional)', { exact: true }).fill('Unsaved label');
  });
  test.afterEach(async () => {
    await closeElectronApp(running);
  });
  const closeWindow = async () =>
    running.electronApp.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()
        .find((window) => !window.webContents.getURL().includes('splash'))!
        .close();
    });
  const reloadFromMenu = async (force: boolean) =>
    running.electronApp.evaluate(({ Menu, BrowserWindow }, force) => {
      const view = Menu.getApplicationMenu()!.items.find((item) => item.label === 'View')!;
      const role = force ? 'forceReload' : 'reload';
      const item = view.submenu!.items.find(
        (item) => item.role?.toLowerCase() === role.toLowerCase() || item.id === role
      )!;
      item.click({}, BrowserWindow.getAllWindows().find((window) => !window.webContents.getURL().includes('splash'))!);
    }, force);
  for (const route of ['keyboard', 'renderer'] as const)
    for (const modifier of ['Control', 'Meta'])
      for (const key of ['N', 'O'])
        test(`M1 ${route} ${modifier}+${key} refuses replacement with a focused inspector button`, async () => {
          const { window } = running;
          const sourcePartId = await window.evaluate(() => window.useProjectStore.getState().parts[0].id);
          const replacement = JSON.parse(fs.readFileSync(file, 'utf8'));
          replacement.parts[0].id = 'replacement-board';
          replacement.parts[0].features = [];
          const replacementPath = path.join(running.userDataDir, 'replacement.carvd');
          fs.writeFileSync(replacementPath, JSON.stringify(replacement));
          await queueOpenPaths(window, [replacementPath]);
          await window.getByRole('button', { name: 'Save Cut', exact: true }).focus();
          if (route === 'keyboard') await window.keyboard.press(`${modifier}+${key}`);
          else
            await window.getByRole('button', { name: 'Save Cut', exact: true }).evaluate(
              (button, { modifier, key }) => {
                button.dispatchEvent(
                  new KeyboardEvent('keydown', {
                    key: key.toLowerCase(),
                    ctrlKey: modifier === 'Control',
                    metaKey: modifier === 'Meta',
                    bubbles: true,
                    cancelable: true
                  })
                );
              },
              { modifier, key }
            );
          await expect
            .poll(() => window.evaluate(() => window.useProjectStore.getState().parts[0]?.id))
            .toBe(sourcePartId);
          await expect(
            window.getByText('Save or discard part cuts before changing projects.', { exact: true })
          ).toBeVisible();
          await expect(window.getByLabel('Label (optional)', { exact: true })).toHaveValue('Unsaved label');
          expect(await window.evaluate(() => window.useProjectStore.getState().parts.length)).toBe(1);
        });
  for (const force of [false, true])
    for (const projectDirty of [false, true])
      for (const choice of ['Save', "Don't Save", 'Cancel'] as const)
        test(`M2 real ${force ? 'Force Reload' : 'Reload'}, project dirty=${projectDirty}, ${choice}`, async () => {
          if (projectDirty)
            await running.window.evaluate(() =>
              window.useProjectStore.getState().setProjectNotes('Unsaved project notes')
            );
          await reloadFromMenu(force);
          const dialog = running.window.getByRole('alertdialog', { name: 'Unsaved Changes' });
          await expect(dialog).toBeVisible();
          await expect(dialog).toContainText(/reload/i);
          if (choice === 'Cancel') {
            await dialog.getByRole('button', { name: choice, exact: true }).click();
            await expect(running.window.getByLabel('Label (optional)', { exact: true })).toHaveValue('Unsaved label');
          } else {
            const loaded = running.window.waitForEvent('domcontentloaded');
            await dialog.getByRole('button', { name: choice, exact: true }).click();
            await loaded;
            const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
            expect(saved.parts[0].features[0].label).toBe(choice === 'Save' ? 'Unsaved label' : 'Original hole');
            if (choice === 'Save' && projectDirty) expect(saved.project.projectNotes).toBe('Unsaved project notes');
          }
        });
  for (const force of [false, true])
    test(`M2 ${force ? 'Force Reload' : 'Reload'} refuses invalid inspector data`, async () => {
      await running.window.getByRole('textbox', { name: /Hole Diameter/ }).fill('20');
      await reloadFromMenu(force);
      const dialog = running.window.getByRole('alertdialog', { name: 'Unsaved Changes' });
      await dialog.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(dialog.getByRole('alert')).toContainText('Hole profile extends beyond the selected face.');
      expect(JSON.parse(fs.readFileSync(file, 'utf8')).parts[0].features[0].parameters.diameter).toBe(0.25);
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(running.window.getByRole('textbox', { name: /Hole Diameter/ })).toHaveValue('20');
    });
  for (const outcome of [
    'success',
    'newer-project',
    'newer-session',
    'failure-retry',
    'first-save',
    'cancel-first-save'
  ] as const)
    test(`M3 delayed close write: ${outcome}`, async () => {
      let targetFile = file;
      if (outcome === 'first-save' || outcome === 'cancel-first-save') {
        await running.window.evaluate(() => window.useProjectStore.getState().setFilePath(null));
        targetFile = path.join(running.userDataDir, 'first-close-save.carvd');
        if (outcome === 'cancel-first-save') {
          await queueSavePath(running.window, null);
          await closeWindow();
          const dialog = running.window.getByRole('alertdialog', { name: 'Unsaved Changes' });
          await dialog.getByRole('button', { name: 'Save', exact: true }).click();
          await expect(dialog).not.toBeVisible();
          expect(running.window.isClosed()).toBe(false);
          expect(await running.window.evaluate(() => window.useProjectStore.getState().isDirty)).toBe(true);
          expect(fs.existsSync(targetFile)).toBe(false);
        }
        await queueSavePath(running.window, targetFile);
      }
      await running.electronApp.evaluate(async (_electron, target) => {
        const { syncBuiltinESMExports } = process.getBuiltinModule('node:module');
        const promises = process.getBuiltinModule('node:fs/promises');
        const original = promises.writeFile;
        const gate = { entered: false, writes: 0, release: null as null | ((fail: boolean) => void) };
        (globalThis as unknown as { carvdWriteGate: typeof gate }).carvdWriteGate = gate;
        promises.writeFile = async (...args: Parameters<typeof original>) => {
          if (String(args[0]) === target) gate.writes++;
          if (String(args[0]) === target && !gate.entered) {
            gate.entered = true;
            await new Promise<void>((resolve, reject) => {
              gate.release = (fail) => (fail ? reject(new Error('Simulated disk full')) : resolve());
            });
          }
          return original(...args);
        };
        syncBuiltinESMExports();
      }, targetFile);
      await closeWindow();
      const dialog = running.window.getByRole('alertdialog', { name: 'Unsaved Changes' });
      await dialog.getByRole('button', { name: 'Save', exact: true }).click();
      await expect
        .poll(() =>
          running.electronApp.evaluate(
            () => (globalThis as unknown as { carvdWriteGate: { entered: boolean } }).carvdWriteGate.entered
          )
        )
        .toBe(true);
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('button', { name: /Saving/ })).toBeDisabled();
      await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeDisabled();
      await expect(dialog.getByRole('button', { name: "Don't Save" })).toBeDisabled();
      await sendNativeMenuCommand(running, 'save-project');
      await sendNativeMenuCommand(running, 'new-project');
      await reloadFromMenu(false);
      expect(
        await running.electronApp.evaluate(
          () => (globalThis as unknown as { carvdWriteGate: { writes: number } }).carvdWriteGate.writes
        )
      ).toBe(1);
      if (outcome === 'newer-project' || outcome === 'newer-session') {
        await running.window.evaluate((session) => {
          const project = window.useProjectStore.getState();
          const part = project.parts[0];
          const features = part.features!.map((feature) => ({ ...feature, label: 'Edit during pending write' }));
          if (session) {
            window.usePartCutsEditingStore.getState().startEditingPartCuts(part.id, part.name, part.features);
            window.usePartCutsEditingStore.getState().setDraftFeatures(features);
          } else project.updatePart(part.id, { features });
        }, outcome === 'newer-session');
      }
      await running.electronApp.evaluate(
        (_electron, fail) =>
          (globalThis as unknown as { carvdWriteGate: { release: (fail: boolean) => void } }).carvdWriteGate.release(
            fail
          ),
        outcome === 'failure-retry'
      );
      if (outcome === 'failure-retry' || outcome === 'newer-project' || outcome === 'newer-session') {
        await expect(dialog.getByRole('alert')).toContainText(
          outcome === 'failure-retry' ? /disk full/i : /new changes.*save again/i
        );
        expect(running.window.isClosed()).toBe(false);
        if (outcome === 'newer-project')
          expect(await running.window.evaluate(() => window.useProjectStore.getState().isDirty)).toBe(true);
        expect(JSON.parse(fs.readFileSync(targetFile, 'utf8')).parts[0].features[0].label).toBe(
          outcome === 'failure-retry' ? 'Original hole' : 'Unsaved label'
        );
        await dialog.getByRole('button', { name: 'Save', exact: true }).click();
      }
      await expect.poll(() => running.window.isClosed()).toBe(true);
      expect(JSON.parse(fs.readFileSync(targetFile, 'utf8')).parts[0].features[0].label).toBe(
        outcome.startsWith('newer') ? 'Edit during pending write' : 'Unsaved label'
      );
    });
});
