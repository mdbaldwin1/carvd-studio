const fs = require('node:fs');
const path = require('node:path');

const outputRoots = ['out/main', 'out/preload'];
const forbidden = [
  'analytics:test:set-mode',
  'analytics:test:get-state',
  'analytics:test:flush',
  'CARVD_E2E_ANALYTICS_MODE',
  'analyticsTestTransport',
  'registerAnalyticsTestControl',
  'recordedEvents'
];

function filesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(target) : [target];
  });
}

const violations = outputRoots.flatMap((root) =>
  filesUnder(root).flatMap((file) => {
    const contents = fs.readFileSync(file);
    return forbidden.filter((value) => contents.includes(Buffer.from(value))).map((value) => `${file}: ${value}`);
  })
);

if (violations.length > 0) {
  console.error(`Production analytics boundary failed:\n${violations.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('Production build excludes analytics E2E controls.');
}
