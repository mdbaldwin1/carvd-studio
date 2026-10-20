import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

export interface TestElectronRuntime {
  executablePath: string;
  directory: string;
  bundleId: string;
  loaderPath: string;
}

/** Isolate AppKit as well as Chromium. Never modify the installed Electron.app. */
export function createTestElectronRuntime(): TestElectronRuntime | undefined {
  if (process.platform !== 'darwin') return undefined;
  const require = createRequire(import.meta.url);
  const installedExecutable = require('electron') as string;
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'carvd-e2e-runtime-'));
  const bundleId = `com.carvd-studio.e2e.${randomUUID()}`;
  const bundle = path.join(directory, 'Carvd E2E.app');
  try {
    // APFS copy-on-write: a separate bundle without copying hundreds of MB per
    // test. Electron's linker signature does not bind this development plist.
    fs.cpSync(path.resolve(installedExecutable, '../../..'), bundle, {
      recursive: true,
      verbatimSymlinks: true,
      mode: fs.constants.COPYFILE_FICLONE
    });
    for (const entry of fs.readdirSync(bundle, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile() || entry.name !== 'Info.plist') continue;
      const plistPath = path.join(entry.parentPath, entry.name);
      const plist = fs.readFileSync(plistPath, 'utf8');
      if (!plist.includes('com.github.Electron')) continue;
      fs.writeFileSync(
        plistPath,
        plist
          .replaceAll('com.github.Electron', bundleId)
          .replace(/(<key>CFBundleDisplayName<\/key>\s*<string>)Electron/g, '$1Carvd E2E')
      );
    }
    // Playwright injects its loader only when executablePath is omitted; retain
    // that exact protocol when selecting our isolated development runtime.
    const loaderPath = path.join(
      path.dirname(require.resolve('playwright-core/package.json')),
      'lib/server/electron/loader.js'
    );
    return { directory, bundleId, executablePath: path.join(bundle, 'Contents/MacOS/Electron'), loaderPath };
  } catch (error) {
    fs.rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}

export async function removeTestElectronRuntime(runtime: TestElectronRuntime | undefined): Promise<void> {
  if (!runtime) return;
  // Only this launch's UUID-scoped artifacts. Generic Electron / Carvd / global
  // defaults are deliberately outside the cleanup scope.
  for (const artifact of [
    path.join(os.homedir(), 'Library/Saved Application State', `${runtime.bundleId}.savedState`),
    path.join(os.homedir(), 'Library/Preferences', `${runtime.bundleId}.plist`),
    runtime.directory
  ]) {
    await fs.promises.rm(artifact, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
}
