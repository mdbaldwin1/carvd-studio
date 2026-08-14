#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const packageDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(packageDir, '..', '..');

function log(message) {
  console.log(`[dev-runtime] ${message}`);
}

function fileExists(targetPath) {
  try {
    fs.accessSync(targetPath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveFromRepo(request) {
  return require.resolve(request, { paths: [repoRoot] });
}

function loadJson(jsonPath) {
  return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
}

function getExpectedRolldownBinding() {
  const rolldownPackageJsonPath = resolveFromRepo('rolldown/package.json');
  const rolldownPackageJson = loadJson(rolldownPackageJsonPath);
  const optionalDeps = Object.keys(rolldownPackageJson.optionalDependencies ?? {});
  const platformPrefix = `@rolldown/binding-${process.platform}-${process.arch}`;
  const exactMatch = optionalDeps.find((name) => name === platformPrefix);

  if (exactMatch) {
    return {
      name: exactMatch,
      version: rolldownPackageJson.optionalDependencies[exactMatch],
    };
  }

  const familyMatch = optionalDeps.find((name) => name.startsWith(`${platformPrefix}-`));

  if (familyMatch) {
    return {
      name: familyMatch,
      version: rolldownPackageJson.optionalDependencies[familyMatch],
    };
  }

  return null;
}

function ensureRolldownBinding() {
  const expectedBinding = getExpectedRolldownBinding();

  if (!expectedBinding) {
    return;
  }

  try {
    resolveFromRepo(`${expectedBinding.name}/package.json`);
  } catch {
    log(`Installing missing ${expectedBinding.name} for ${process.platform}-${process.arch}`);
    execFileSync(
      'npm',
      ['install', '--no-save', `${expectedBinding.name}@${expectedBinding.version}`],
      {
        cwd: repoRoot,
        stdio: 'inherit',
      },
    );
  }
}

function getElectronDistTargets() {
  const electronPackageJsonPath = resolveFromRepo('electron/package.json');
  const electronDir = path.dirname(electronPackageJsonPath);
  const distDir = path.join(electronDir, 'dist');

  const platformTargets = {
    darwin: path.join(distDir, 'Electron.app'),
    win32: path.join(distDir, 'electron.exe'),
    linux: path.join(distDir, 'electron'),
  };

  return {
    distDir,
    installScript: path.join(electronDir, 'install.js'),
    expectedPath: platformTargets[process.platform] ?? distDir,
  };
}

function ensureElectronBinary() {
  const { distDir, installScript, expectedPath } = getElectronDistTargets();

  if (fileExists(expectedPath)) {
    return;
  }

  log(`Repairing Electron runtime assets in ${path.relative(repoRoot, distDir)}`);
  execFileSync(process.execPath, [installScript], {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  if (!fileExists(expectedPath)) {
    throw new Error(`Electron runtime assets are still missing at ${expectedPath}`);
  }
}

function main() {
  ensureRolldownBinding();
  ensureElectronBinary();
}

try {
  main();
} catch (error) {
  console.error('[dev-runtime] Failed to prepare desktop runtime.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
