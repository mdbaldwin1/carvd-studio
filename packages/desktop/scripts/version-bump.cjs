#!/usr/bin/env node

/**
 * Version Bump Script
 *
 * Usage:
 *   npm run version:bump -- patch   # 1.0.0 -> 1.0.1
 *   npm run version:bump -- minor   # 1.0.0 -> 1.1.0
 *   npm run version:bump -- major   # 1.0.0 -> 2.0.0
 *   npm run version:bump -- 1.2.3   # Set specific version
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function exec(command) {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: 'inherit' });
  } catch (error) {
    console.error(`Error executing: ${command}`);
    process.exit(1);
  }
}

function getCurrentVersion() {
  const packagePath = path.join(__dirname, '../package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  return pkg.version;
}

function setVersion(newVersion) {
  const packagePath = path.join(__dirname, '../package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  pkg.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
}

function bumpVersion(type) {
  const current = getCurrentVersion();
  const parts = current.split('.').map(Number);

  if (type === 'patch') {
    parts[2]++;
  } else if (type === 'minor') {
    parts[1]++;
    parts[2] = 0;
  } else if (type === 'major') {
    parts[0]++;
    parts[1] = 0;
    parts[2] = 0;
  } else {
    // Assume it's a specific version
    return type;
  }

  return parts.join('.');
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: npm run version:bump -- <patch|minor|major|x.y.z>');
    process.exit(1);
  }

  const type = args[0];
  const currentVersion = getCurrentVersion();
  const newVersion = bumpVersion(type);

  console.log(`\n📦 Bumping version: ${currentVersion} → ${newVersion}\n`);

  // Update package.json
  setVersion(newVersion);
  console.log('✅ Updated package.json');

  // Stage the change
  exec('git add package.json');
  console.log('✅ Staged package.json');

  // Commit the version bump
  exec(`git commit -m "chore(release): bump version to ${newVersion}"`);
  console.log('✅ Committed version bump');

  // Create git tag
  const tag = `v${newVersion}`;
  exec(`git tag ${tag}`);
  console.log(`✅ Created tag: ${tag}`);

  console.log(`\n✨ Version bumped successfully!\n`);
  console.log(`Next steps:`);
  console.log(`  1. Push changes: git push origin main`);
  console.log(`  2. Push tag: git push origin ${tag}`);
  console.log(`  3. GitHub Actions will automatically build and release\n`);
}

main();
