import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import type { ElectronApplication } from 'playwright';
import { closeElectronApp, launchElectronApp, type RunningElectronApp } from '../../tests/e2e/helpers/electron-app';
import { createTestElectronRuntime, removeTestElectronRuntime } from '../../tests/e2e/helpers/electron-runtime';

const { launch } = vi.hoisted(() => ({ launch: vi.fn() }));
vi.mock('@playwright/test', () => ({ expect: {}, _electron: { launch } }));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function fakeRunning(exitDelay = 0) {
  const calls: string[] = [];
  const proc = Object.assign(new EventEmitter(), {
    exitCode: null as number | null,
    signalCode: null as string | null,
    pid: 123,
    kill: vi.fn(() => {
      calls.push('kill');
      return true;
    })
  });
  const nativeWindow = {
    removeAllListeners: () => calls.push('approve-test-close'),
    close: () => calls.push('window-close'),
    destroy: () => calls.push('destroy')
  };
  const quit = () => {
    calls.push('quit');
    setTimeout(() => {
      proc.exitCode = 0;
      proc.emit('exit', 0, null);
    }, exitDelay);
  };
  const electronApp = {
    process: () => proc,
    evaluate: async (callback: (electron: unknown) => void) =>
      callback({ BrowserWindow: { getAllWindows: () => [nativeWindow] }, app: { quit } }),
    close: async () => {
      quit();
      await new Promise<void>((resolve) => proc.once('exit', resolve));
    }
  } as unknown as ElectronApplication;
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'carvd-harness-unit-'));
  return { running: { electronApp, userDataDir } as RunningElectronApp, proc, calls };
}

test('teardown gracefully closes test windows without destroying them or force-killing a slow quit', async () => {
  vi.useFakeTimers();
  const { running, proc, calls } = fakeRunning(6000);
  const closing = closeElectronApp(running);
  await vi.advanceTimersByTimeAsync(5100);
  expect(calls).not.toContain('destroy');
  expect(proc.kill).not.toHaveBeenCalled();
  expect(fs.existsSync(running.userDataDir)).toBe(true);
  await vi.advanceTimersByTimeAsync(1000);
  await closing;
  expect(calls).toContain('approve-test-close');
  expect(proc.exitCode).toBe(0);
  expect(fs.existsSync(running.userDataDir)).toBe(false);
});

test('macOS launches use a dedicated test bundle identity, leaving the installed runtime untouched', async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'carvd-harness-unit-'));
  launch.mockImplementationOnce(async (options: { executablePath?: string }) => {
    if (process.platform !== 'darwin') {
      expect(options.executablePath).toBeUndefined();
      throw new Error('Intentional launch boundary stop; no Electron process created');
    }
    expect(options.executablePath).toContain('Carvd E2E.app/Contents/MacOS/Electron');
    const plist = fs.readFileSync(path.resolve(options.executablePath!, '../../Info.plist'), 'utf8');
    expect(plist).toMatch(/com\.carvd-studio\.e2e\.[a-zA-Z0-9-]+/);
    expect(plist).not.toContain('<string>com.github.Electron</string>');
    throw new Error('Intentional launch boundary stop; no Electron process created');
  });
  try {
    await expect(launchElectronApp({ userDataDir: profile })).rejects.toThrow('Intentional launch boundary stop');
  } finally {
    fs.rmSync(profile, { recursive: true, force: true });
  }
});

test('a stuck quit fails visibly and preserves the process and profile without killing it', async () => {
  vi.useFakeTimers();
  const { running, proc } = fakeRunning(60000);
  const closing = closeElectronApp(running);
  const assertion = expect(closing).rejects.toThrow('no force-kill performed');
  await vi.advanceTimersByTimeAsync(30001);
  await assertion;
  expect(proc.kill).not.toHaveBeenCalled();
  expect(proc.exitCode).toBeNull();
  expect(fs.existsSync(running.userDataDir)).toBe(true);
  fs.rmSync(running.userDataDir, { recursive: true, force: true });
});

test('an already exited application only removes its test profile', async () => {
  const { running, proc, calls } = fakeRunning();
  proc.exitCode = 0;
  await closeElectronApp(running);
  expect(calls).toEqual([]);
  expect(fs.existsSync(running.userDataDir)).toBe(false);
});

test('teardown uses the retained exit handle after Playwright disposes its application wrapper', async () => {
  const { running, proc, calls } = fakeRunning();
  Object.assign(running, { processHandle: proc });
  proc.exitCode = 0;
  vi.spyOn(running.electronApp, 'process').mockImplementation(() => {
    throw new TypeError('disposed wrapper');
  });
  try {
    await expect(closeElectronApp(running)).resolves.toBeUndefined();
    expect(calls).toEqual([]);
    expect(fs.existsSync(running.userDataDir)).toBe(false);
  } finally {
    fs.rmSync(running.userDataDir, { recursive: true, force: true });
  }
});

test('the isolated runtime keeps framework resources and helper identities inside its own bundle', async () => {
  const runtime = createTestElectronRuntime();
  if (!runtime) {
    expect(process.platform).not.toBe('darwin');
    return;
  }
  try {
    const frameworks = path.resolve(runtime.executablePath, '../../Frameworks');
    expect(fs.realpathSync(path.join(frameworks, 'Electron Framework.framework/Resources'))).toContain(
      runtime.directory
    );
    for (const helper of fs.readdirSync(frameworks).filter((name) => name.endsWith('.app'))) {
      const plist = fs.readFileSync(path.join(frameworks, helper, 'Contents/Info.plist'), 'utf8');
      expect(plist).toContain(`${runtime.bundleId}.helper`);
      expect(plist).not.toContain('com.github.Electron');
    }
  } finally {
    await removeTestElectronRuntime(runtime);
  }
});
