import { expect, test } from '@playwright/test';
import { closeElectronApp, launchElectronApp, seedProject } from './helpers/electron-app';

test('uninterrupted native quit is requested once and exits normally', async () => {
  const running = await launchElectronApp();
  const proc = running.electronApp.process();
  await seedProject(running.window, 'one-part');
  await running.electronApp.evaluate(({ app, BrowserWindow }) => {
    for (const event of ['before-quit', 'will-quit', 'quit'] as const) {
      app.on(event, () => process.stderr.write(`CARVD_QUIT_TRACE ${event} ${Date.now()}\n`));
    }
    for (const window of BrowserWindow.getAllWindows()) {
      window.on('closed', () => process.stderr.write(`CARVD_QUIT_TRACE closed ${Date.now()}\n`));
    }
  });
  try {
    await closeElectronApp(running);
  } finally {
    console.log(
      'Quit lifecycle:',
      running.consoleMessages.filter((message) => message.includes('CARVD_QUIT_TRACE')).join('')
    );
  }
  expect(proc.exitCode).toBe(0);
  expect(proc.signalCode).toBeNull();
  const trace = running.consoleMessages.join('');
  expect(trace.match(/CARVD_QUIT_TRACE before-quit/g)).toHaveLength(1);
  expect(trace).toContain('CARVD_QUIT_TRACE will-quit');
  expect(trace).toContain('CARVD_QUIT_TRACE quit');
});
