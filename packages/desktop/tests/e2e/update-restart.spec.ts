import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  addPartFromSidebar,
  closeElectronApp,
  createBlankProject,
  launchElectronApp,
  queueSavePath
} from './helpers/electron-app';

test('Mac update restart enters the native installer only after Cancel, retry, and Save', async () => {
  test.skip(
    process.platform !== 'darwin',
    'Exercises the MacUpdater native handoff; coordinator tests cover all platforms.'
  );
  const running = await launchElectronApp();
  const proc = running.electronApp.process();
  const filePath = path.join(running.userDataDir, 'restart-safe.carvd');
  try {
    await createBlankProject(running.window, 'Update restart');
    await addPartFromSidebar(running.window);
    await running.electronApp.evaluate(({ app, autoUpdater }) => {
      // Keep the real main-process IPC, document guards and MacUpdater path.
      // Replace only the final OS installer to avoid a real install in CI.
      autoUpdater.quitAndInstall = () => {
        process.stderr.write('CARVD_NATIVE_UPDATE_INSTALL\n');
        app.quit();
      };
      autoUpdater.emit('update-downloaded');
    });
    const installCalls = () => running.consoleMessages.join('').match(/CARVD_NATIVE_UPDATE_INSTALL/g) ?? [];
    await running.window.evaluate(() => window.electronAPI.quitAndInstall());
    const guard = running.window.getByRole('alertdialog', { name: 'Unsaved Changes' });
    await expect(guard).toBeVisible();
    expect(installCalls()).toHaveLength(0);
    await guard.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(guard).not.toBeVisible();
    expect(proc.exitCode).toBeNull();
    expect(installCalls()).toHaveLength(0);

    const blockedParent = path.join(running.userDataDir, 'not-a-directory');
    fs.writeFileSync(blockedParent, 'test fixture');
    await queueSavePath(running.window, path.join(blockedParent, 'cannot-save.carvd'));
    await running.window.evaluate(() => window.electronAPI.quitAndInstall());
    await expect(guard).toBeVisible();
    expect(installCalls()).toHaveLength(0);
    await guard.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(guard.getByText(/Error saving:/)).toBeVisible();
    expect(proc.exitCode).toBeNull();
    expect(installCalls()).toHaveLength(0);
    await queueSavePath(running.window, filePath);
    await guard.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => proc.exitCode, { timeout: 30000 }).toBe(0);
    expect(proc.signalCode).toBeNull();
    expect(installCalls()).toHaveLength(1);
    expect(JSON.parse(fs.readFileSync(filePath, 'utf8')).parts).toHaveLength(1);
  } finally {
    await closeElectronApp(running);
  }
});
