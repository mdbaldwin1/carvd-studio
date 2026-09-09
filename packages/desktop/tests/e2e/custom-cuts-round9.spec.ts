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

test.describe('round 9 file transaction ownership and quit', () => {
  let running: RunningElectronApp;
  let first: string;
  let second: string;
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
                label: 'Original',
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
    first = path.join(running.userDataDir, 'first.carvd');
    second = path.join(running.userDataDir, 'second.carvd');
    await queueSavePath(running.window, first);
    await sendNativeMenuCommand(running, 'save-project');
    await expect.poll(() => fs.existsSync(first)).toBe(true);
    await expect.poll(() => running.window.evaluate(() => window.useProjectStore.getState().isDirty)).toBe(false);
    const data = JSON.parse(fs.readFileSync(first, 'utf8'));
    data.project.name = 'Second';
    data.parts[0].id = 'second-board';
    data.parts[0].features[0].label = 'Second cut';
    fs.writeFileSync(second, JSON.stringify(data));
  });
  test.afterEach(async () => closeElectronApp(running));
  const setLabel = async (label: string) =>
    running.window.evaluate((label) => {
      const store = window.useProjectStore.getState();
      const part = store.parts[0];
      store.updatePart(part.id, { features: part.features!.map((feature) => ({ ...feature, label })) });
    }, label);
  const editInspector = async () => {
    await running.window.getByRole('button', { name: 'Edit Part Cuts' }).click();
    await running.window.getByRole('button', { name: /^1\./ }).click();
    await running.window.getByLabel('Label (optional)', { exact: true }).fill('Unsaved inspector');
  };
  const closeWindow = async () =>
    running.electronApp.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()
        .find((win) => !win.webContents.getURL().includes('splash'))!
        .close();
    });
  const installGate = async (method: 'writeFile' | 'readFile', file: string) =>
    running.electronApp.evaluate(
      (_electron, { method, file }) => {
        const io = process.getBuiltinModule('node:fs/promises');
        const original = io[method] as (...args: unknown[]) => Promise<unknown>;
        const gate = { entered: false, completed: false, release: null as null | (() => void) };
        (globalThis as unknown as { round9Gate: typeof gate }).round9Gate = gate;
        (io as unknown as Record<string, unknown>)[method] = async (...args: unknown[]) => {
          if (String(args[0]) === file && !gate.entered) {
            gate.entered = true;
            await new Promise<void>((resolve) => {
              gate.release = resolve;
            });
            const result = await original(...args);
            gate.completed = true;
            return result;
          }
          return original(...args);
        };
        process.getBuiltinModule('node:module').syncBuiltinESMExports();
      },
      { method, file }
    );
  const gateState = async () =>
    running.electronApp.evaluate(() => {
      const gate = (globalThis as unknown as { round9Gate: { entered: boolean; completed: boolean } }).round9Gate;
      return { entered: gate.entered, completed: gate.completed };
    });
  const release = async () =>
    running.electronApp.evaluate(() => {
      (globalThis as unknown as { round9Gate: { release: () => void } }).round9Gate.release();
    });

  test('N1 an older suspended native save cannot overwrite a close-save', async () => {
    await installGate('writeFile', first);
    await setLabel('Older');
    await sendNativeMenuCommand(running, 'save-project');
    await expect.poll(async () => (await gateState()).entered).toBe(true);
    await setLabel('NEWEST');
    await closeWindow();
    await running.window.getByRole('alertdialog').getByRole('button', { name: 'Save', exact: true }).click();
    // Give any incorrectly unqueued write time to finish, while the old I/O
    // remains deterministically suspended in the real main process.
    await new Promise((resolve) => setTimeout(resolve, 300));
    const closedBeforeRelease = running.window.isClosed();
    await release();
    await expect.poll(async () => (await gateState()).completed).toBe(true);
    await expect.poll(() => running.window.isClosed()).toBe(true);
    expect.soft(closedBeforeRelease).toBe(false);
    expect(JSON.parse(fs.readFileSync(first, 'utf8')).parts[0].features[0].label).toBe('NEWEST');
  });

  test('N1 the main-process file boundary orders independent concurrent writers', async () => {
    await installGate('writeFile', first);
    const older = JSON.parse(fs.readFileSync(first, 'utf8'));
    older.parts[0].features[0].label = 'Older IPC';
    await running.window.evaluate(
      ({ file, data }) => {
        (globalThis as unknown as { writesFinished: number }).writesFinished = 0;
        void window.electronAPI.writeFile(file, data).then(() => {
          (globalThis as unknown as { writesFinished: number }).writesFinished++;
        });
      },
      { file: first, data: JSON.stringify(older) }
    );
    await expect.poll(async () => (await gateState()).entered).toBe(true);
    older.parts[0].features[0].label = 'Newest IPC';
    await running.window.evaluate(
      ({ file, data }) => {
        void window.electronAPI.writeFile(file, data).then(() => {
          (globalThis as unknown as { writesFinished: number }).writesFinished++;
        });
      },
      { file: first, data: JSON.stringify(older) }
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    await release();
    await expect
      .poll(() => running.window.evaluate(() => (globalThis as unknown as { writesFinished: number }).writesFinished))
      .toBe(2);
    expect(JSON.parse(fs.readFileSync(first, 'utf8')).parts[0].features[0].label).toBe('Newest IPC');
  });

  test('N2 an old save cannot retarget Open Recent or overwrite either physical file', async () => {
    await installGate('writeFile', first);
    await setLabel('Older');
    await sendNativeMenuCommand(running, 'save-project');
    await expect.poll(async () => (await gateState()).entered).toBe(true);
    await sendNativeMenuCommand(running, 'open-recent', second);
    await running.window.getByRole('alertdialog').getByRole('button', { name: "Don't Save" }).click();
    await expect
      .poll(() => running.window.evaluate(() => window.useProjectStore.getState().parts[0]?.id))
      .toBe('second-board');
    await release();
    await expect.poll(async () => (await gateState()).completed).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect.soft(await running.window.evaluate(() => window.useProjectStore.getState().filePath)).toBe(second);
    expect.soft(await running.window.evaluate(() => window.useProjectStore.getState().isDirty)).toBe(false);
    await setLabel('Second newest');
    await sendNativeMenuCommand(running, 'save-project');
    await expect.poll(() => running.window.evaluate(() => window.useProjectStore.getState().isDirty)).toBe(false);
    expect.soft(JSON.parse(fs.readFileSync(first, 'utf8')).parts[0].features[0].label).toBe('Older');
    expect(JSON.parse(fs.readFileSync(second, 'utf8')).parts[0].features[0].label).toBe('Second newest');
  });

  for (const route of ['clean-close', 'discard-close', 'discard-reload'] as const)
    test(`N1 ${route} drains an already-requested manual write`, async () => {
      await installGate('writeFile', first);
      await setLabel('Requested save');
      if (route === 'clean-close') await running.window.evaluate(() => window.useProjectStore.getState().markClean());
      await sendNativeMenuCommand(running, 'save-project');
      await expect.poll(async () => (await gateState()).entered).toBe(true);
      let reloaded = false;
      running.window.once('domcontentloaded', () => {
        reloaded = true;
      });
      if (route === 'discard-reload') await sendNativeMenuCommand(running, 'request-reload', false);
      else await closeWindow();
      if (route !== 'clean-close')
        await running.window.getByRole('alertdialog').getByRole('button', { name: "Don't Save" }).click();
      await new Promise((resolve) => setTimeout(resolve, 300));
      const destroyedBeforeRelease = reloaded || running.window.isClosed();
      await release();
      await expect.poll(async () => (await gateState()).completed).toBe(true);
      await expect.poll(() => (route === 'discard-reload' ? reloaded : running.window.isClosed())).toBe(true);
      expect(destroyedBeforeRelease).toBe(false);
      expect(JSON.parse(fs.readFileSync(first, 'utf8')).parts[0].features[0].label).toBe('Requested save');
    });

  test('N3 delayed Open Recent cannot orphan a newly edited cut inspector', async () => {
    await installGate('readFile', second);
    await sendNativeMenuCommand(running, 'open-recent', second);
    await expect.poll(async () => (await gateState()).entered).toBe(true);
    await editInspector();
    await release();
    await expect.poll(async () => (await gateState()).completed).toBe(true);
    await expect(running.window.getByLabel('Label (optional)', { exact: true })).toHaveValue('Unsaved inspector');
    expect(await running.window.evaluate(() => window.useProjectStore.getState().filePath)).toBe(first);
    expect(
      await running.window.evaluate(() => {
        const cut = window.usePartCutsEditingStore.getState();
        return (
          window.useProjectStore.getState().parts.some((part) => part.id === cut.sourcePartId) && cut.inspectorDirty
        );
      })
    ).toBe(true);
  });

  for (const choice of ['Save', "Don't Save", 'Cancel'] as const)
    test(`N4 actual Quit with unsaved inspector: ${choice}`, async () => {
      await editInspector();
      const proc = running.electronApp.process();
      await running.electronApp.evaluate(({ app }) => {
        app.quit();
      });
      const dialog = running.window.getByRole('alertdialog', { name: 'Unsaved Changes' });
      await dialog.getByRole('button', { name: choice, exact: true }).click();
      if (choice === 'Cancel') {
        await expect(running.window.getByLabel('Label (optional)', { exact: true })).toHaveValue('Unsaved inspector');
        expect(proc.exitCode).toBeNull();
        await closeWindow();
        await running.window.getByRole('alertdialog').getByRole('button', { name: "Don't Save" }).click();
        await expect.poll(() => running.window.isClosed()).toBe(true);
        // Ordinary macOS window close after canceled Quit must not quit the app.
        if (process.platform === 'darwin') expect(proc.exitCode).toBeNull();
        else await expect.poll(() => proc.exitCode).toBe(0);
      } else {
        await expect.poll(() => proc.exitCode, { timeout: 5000 }).toBe(0);
        expect(JSON.parse(fs.readFileSync(first, 'utf8')).parts[0].features[0].label).toBe(
          choice === 'Save' ? 'Unsaved inspector' : 'Original'
        );
      }
    });

  test('N4 rejected validation clears Quit intent before a later ordinary window discard', async () => {
    await editInspector();
    await running.window.getByRole('textbox', { name: /Hole Diameter/ }).fill('20');
    const proc = running.electronApp.process();
    await running.electronApp.evaluate(({ app }) => {
      app.quit();
    });
    const dialog = running.window.getByRole('alertdialog');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('Hole profile extends beyond the selected face.');
    await dialog.getByRole('button', { name: "Don't Save" }).click();
    await expect.poll(() => running.window.isClosed()).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (process.platform === 'darwin') expect(proc.exitCode).toBeNull();
    else await expect.poll(() => proc.exitCode).toBe(0);
  });
});
