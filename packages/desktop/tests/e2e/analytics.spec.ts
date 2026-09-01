import { expect, test, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import {
  closeElectronApp,
  createBlankProject,
  launchElectronApp,
  queueSavePath,
  seedProject,
  type RunningElectronApp
} from './helpers/electron-app';

type AnalyticsMode = 'success' | 'offline' | 'timeout';
type AnalyticsSnapshot = {
  consent: 'unknown' | 'granted' | 'denied';
  installationId: string | null;
  queue: Array<{ eventId: string; name: string; distinctId: string; properties: Record<string, unknown> }>;
  recordedEvents: Array<{ eventId: string; name: string; distinctId: string; properties: Record<string, unknown> }>;
};

type AnalyticsTestApi = Window['electronAPI'] & {
  analyticsTestSetMode(mode: AnalyticsMode): Promise<void>;
  analyticsTestGetState(): Promise<AnalyticsSnapshot>;
  analyticsTestFlush(): Promise<void>;
};

const analyticsApi = (page: Page) => ({
  setMode: (mode: AnalyticsMode) =>
    page.evaluate((nextMode) => (window.electronAPI as AnalyticsTestApi).analyticsTestSetMode(nextMode), mode),
  state: () => page.evaluate(() => (window.electronAPI as AnalyticsTestApi).analyticsTestGetState()),
  flush: () => page.evaluate(() => (window.electronAPI as AnalyticsTestApi).analyticsTestFlush())
});

async function performProductWorkflows(running: RunningElectronApp, suffix: string) {
  const { window, userDataDir } = running;
  await createBlankProject(window, `Analytics ${suffix}`);
  await seedProject(window, 'stocked-one-part');
  const projectPath = path.join(userDataDir, `${suffix}.carvd`);
  await queueSavePath(window, projectPath);
  await window.keyboard.press(process.platform === 'darwin' ? 'Meta+s' : 'Control+s');
  await expect.poll(() => fs.existsSync(projectPath), { timeout: 5000 }).toBe(true);
  const importDialog = window.getByRole('dialog', { name: /Import to Library/i });
  await expect(importDialog).toBeVisible();
  await importDialog.getByRole('button', { name: 'Skip' }).click();

  await window.getByRole('button', { name: /Generate Cut List|View Cut List/ }).click();
  const dialog = window.getByRole('dialog').filter({ has: window.getByRole('heading', { name: 'Cut List' }) });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Generate Cut List' }).click();
  await expect(dialog.getByRole('tab', { name: /Parts List/ })).toBeVisible();
  const reportPath = path.join(userDataDir, `${suffix}-report.pdf`);
  await queueSavePath(window, reportPath);
  await dialog.getByRole('button', { name: 'Download Project Report' }).click();
  await expect
    .poll(() => (fs.existsSync(reportPath) ? fs.statSync(reportPath).size : 0), { timeout: 5000 })
    .toBeGreaterThan(0);
}

test.describe.serial('privacy-safe desktop analytics', () => {
  let running: RunningElectronApp | undefined;

  test.afterEach(async () => {
    await closeElectronApp(running);
    running = undefined;
  });

  test('unknown consent appears only after tutorial resolution and records nothing', async () => {
    running = await launchElectronApp();
    const { window } = running;
    const api = analyticsApi(window);

    await expect(window.getByTestId('tutorial-tooltip')).toBeVisible();
    await expect(window.getByRole('dialog', { name: /anonymous usage data/i })).toHaveCount(0);
    await window.getByTitle('Skip tutorial (Esc)').click();

    await expect(window.getByRole('dialog', { name: /help improve carvd studio/i })).toBeVisible();
    const state = await api.state();
    expect(state.consent).toBe('unknown');
    expect(state.queue).toEqual([]);
    expect(state.recordedEvents).toEqual([]);
  });

  test('denied consent never queues product outcome events', async () => {
    running = await launchElectronApp();
    const { window } = running;
    const api = analyticsApi(window);
    await window.evaluate(() => window.electronAPI.setAnalyticsConsent('denied', 'onboarding'));
    await performProductWorkflows(running, 'denied');
    await api.flush();
    expect(await api.state()).toMatchObject({ consent: 'denied', queue: [], recordedEvents: [] });
  });

  test('offline events survive restart once, keep UUIDs, sanitize properties, and revoke synchronously', async () => {
    running = await launchElectronApp({ analyticsMode: 'offline' });
    let api = analyticsApi(running.window);
    await running.window.evaluate(() => window.electronAPI.setAnalyticsConsent('granted', 'onboarding'));
    await performProductWorkflows(running, 'offline');
    const offline = await api.state();
    expect(offline.queue.length).toBeGreaterThanOrEqual(4);
    expect(offline.recordedEvents).toEqual([]);
    expect(offline.installationId).toBeTruthy();
    for (const outcome of ['project_created', 'project_saved', 'cut_list_generated', 'export_completed']) {
      expect(offline.queue.map(({ name }) => name)).toContain(outcome);
    }
    const queuedIds = offline.queue.map(({ eventId }) => eventId).sort();
    const userDataDir = running.userDataDir;

    const firstProcess = running.electronApp.process();
    await closeElectronApp(running, { removeUserData: false });
    expect(firstProcess.exitCode !== null || firstProcess.signalCode !== null).toBe(true);
    running = await launchElectronApp({ analyticsMode: 'success', userDataDir });
    api = analyticsApi(running.window);
    await api.flush();
    await api.flush();
    const flushed = await api.state();
    expect(flushed.queue).toEqual([]);
    for (const queuedId of queuedIds) {
      expect(flushed.recordedEvents.filter(({ eventId }) => eventId === queuedId)).toHaveLength(1);
    }
    expect(flushed.recordedEvents.filter(({ name }) => name === 'app_opened')).toHaveLength(1);
    expect(new Set(flushed.recordedEvents.map(({ eventId }) => eventId)).size).toBe(flushed.recordedEvents.length);
    expect(new Set(flushed.recordedEvents.map(({ distinctId }) => distinctId))).toEqual(
      new Set([offline.installationId as string])
    );

    await running.window.evaluate(() => {
      const unsafe = {
        name: 'project_saved',
        properties: { save_kind: 'manual', part_count_bucket: '0', project_name: 'SECRET' }
      };
      window.electronAPI.captureAnalytics(unsafe as never);
    });
    await api.flush();
    const sanitized = (await api.state()).recordedEvents.filter(({ name }) => name === 'project_saved').at(-1);
    expect(sanitized?.properties).not.toHaveProperty('project_name');

    await api.setMode('offline');
    await running.window.evaluate(() => window.electronAPI.captureAnalytics({ name: 'app_opened', properties: {} }));
    expect((await api.state()).queue.length).toBe(1);
    await running.window.evaluate(() => window.electronAPI.setAnalyticsConsent('denied', 'settings'));
    expect(await api.state()).toMatchObject({ consent: 'denied', installationId: null, queue: [] });
  });
});
