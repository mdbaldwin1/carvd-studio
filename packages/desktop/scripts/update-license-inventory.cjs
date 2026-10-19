// Keep the existing license reference text; regenerate only the direct-package inventory.
const fs = require('node:fs');
const path = require('node:path');
const desktop = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(desktop, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(desktop, '../../package-lock.json'), 'utf8'));
const file = path.join(desktop, 'resources/THIRD_PARTY_LICENSES.txt');
const original = fs.readFileSync(file, 'utf8');
const names = [...Object.keys(manifest.dependencies), 'electron'].sort();
const counts = new Map();
const rows = names.map((name) => {
  const entry = lock.packages[`packages/desktop/node_modules/${name}`] ?? lock.packages[`node_modules/${name}`];
  if (!entry?.version || !entry.license) throw new Error(`Missing locked version/license: ${name}`);
  counts.set(entry.license, (counts.get(entry.license) ?? 0) + 1);
  return `${name.padEnd(37)}${entry.version.padEnd(11)}${entry.license.padEnd(13)}${name === 'electron' ? 'devDependency (runtime binary)' : 'dependency'}`;
});
const header = original.match(/\nName[^\n]*\n-+\n/);
if (!header) throw new Error('License inventory header not found');
const start = header.index + header[0].length;
const end = original.indexOf('\nNotes:\n', start);
if (end < 0) throw new Error('License inventory boundaries not found');
const inventory =
  rows.join('\n') +
  '\n\nPackage pages:\n' +
  names.map((name) => `- https://www.npmjs.com/package/${name}`).join('\n') +
  '\n\n' +
  '='.repeat(80) +
  '\nLICENSE SUMMARY (DIRECT RUNTIME PACKAGES)\n' +
  '='.repeat(80) +
  '\n' +
  [...counts].map(([license, count]) => `${license}: ${count}`).join('\n') +
  '\n';
const updated = original.slice(0, start) + inventory + original.slice(end);
if (process.argv.includes('--check')) {
  if (updated !== original) {
    console.error('Runtime license inventory is stale. Run npm run licenses:update --workspace=@carvd/desktop.');
    process.exitCode = 1;
  }
} else {
  fs.writeFileSync(file, updated);
}
