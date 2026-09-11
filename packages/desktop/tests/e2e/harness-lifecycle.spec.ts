import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { closeElectronApp, createBlankProject, launchElectronApp } from './helpers/electron-app';

function digest(file: string): string | null {
  return fs.existsSync(file) ? createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null;
}

test('isolated runtime launches and gracefully exits without touching generic Electron restoration state', async () => {
  const require = createRequire(import.meta.url);
  const genericPreferences = path.join(os.homedir(), 'Library/Preferences/com.github.Electron.plist');
  const installedPlist = path.resolve(require('electron') as string, '../../Info.plist');
  const before = process.platform === 'darwin' ? [digest(genericPreferences), digest(installedPlist)] : [];
  const reports = path.join(os.homedir(), 'Library/Logs/DiagnosticReports');
  const previousReports = process.platform === 'darwin' ? new Set(fs.readdirSync(reports)) : new Set<string>();
  const running = await launchElectronApp();
  const proc = running.electronApp.process();
  try {
    await createBlankProject(running.window, 'Isolated Graceful Shutdown');
    if (process.platform === 'darwin') {
      expect(running.runtime?.bundleId).toMatch(/^com\.carvd-studio\.e2e\./);
      expect(fs.realpathSync(await running.electronApp.evaluate(({ app }) => app.getPath('exe')))).toBe(
        fs.realpathSync(running.runtime!.executablePath)
      );
      expect(fs.readFileSync(path.resolve(running.runtime!.executablePath, '../../Info.plist'), 'utf8')).toContain(
        running.runtime!.bundleId
      );
    }
  } finally {
    await closeElectronApp(running);
  }
  expect(proc.exitCode).toBe(0);
  expect(proc.signalCode).toBeNull();
  expect(
    running.consoleMessages.filter((message) => /FATAL|GPU process exited unexpectedly|SIGSEGV|SIGTRAP/.test(message))
  ).toEqual([]);
  expect(fs.existsSync(running.userDataDir)).toBe(false);
  if (process.platform === 'darwin') {
    expect([digest(genericPreferences), digest(installedPlist)]).toEqual(before);
    expect(fs.existsSync(running.runtime!.directory)).toBe(false);
    const newReports = fs
      .readdirSync(reports)
      .filter((name) => name.startsWith('Electron') && name.endsWith('.ips') && !previousReports.has(name));
    expect(
      newReports.filter((name) => fs.readFileSync(path.join(reports, name), 'utf8').includes(running.runtime!.bundleId))
    ).toEqual([]);
  }
});
