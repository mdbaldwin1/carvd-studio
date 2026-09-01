import { expect, test, type Page } from '@playwright/test';
import {
  closeElectronApp,
  createBlankProject,
  launchElectronApp,
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

    const tutorial = window.getByTestId('tutorial-tooltip');
    if (await tutorial.isVisible()) {
      await expect(window.getByRole('dialog', { name: /anonymous usage data/i })).toHaveCount(0);
      await window.getByTitle('Skip tutorial (Esc)').click();
    }

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
    await createBlankProject(window, 'Denied analytics');
    await window.evaluate(() => {
      window.electronAPI.captureAnalytics({
        name: 'project_saved',
        properties: { save_kind: 'manual', part_count_bucket: '0' }
      });
      window.electronAPI.captureAnalytics({
        name: 'cut_list_generated',
        properties: { part_count_bucket: '0', stock_count_bucket: '0', success: true }
      });
      window.electronAPI.captureAnalytics({
        name: 'export_completed',
        properties: { export_type: 'project_pdf', success: true }
      });
    });
    await api.flush();
    expect(await api.state()).toMatchObject({ consent: 'denied', queue: [], recordedEvents: [] });
  });

  test('offline events survive restart once, keep UUIDs, sanitize properties, and revoke synchronously', async () => {
    running = await launchElectronApp({ analyticsMode: 'offline' });
    let api = analyticsApi(running.window);
    await running.window.evaluate(() => window.electronAPI.setAnalyticsConsent('granted', 'onboarding'));
    await createBlankProject(running.window, 'Offline analytics');
    await running.window.evaluate(() => {
      const unsafe = {
        name: 'project_saved',
        properties: { save_kind: 'manual', part_count_bucket: '0', project_name: 'SECRET' }
      };
      window.electronAPI.captureAnalytics(unsafe as never);
      window.electronAPI.captureAnalytics({
        name: 'cut_list_generated',
        properties: { part_count_bucket: '0', stock_count_bucket: '0', success: true }
      });
      window.electronAPI.captureAnalytics({
        name: 'export_completed',
        properties: { export_type: 'project_pdf', success: true }
      });
    });
    const offline = await api.state();
    expect(offline.queue.length).toBeGreaterThanOrEqual(4);
    expect(offline.recordedEvents).toEqual([]);
    expect(offline.installationId).toBeTruthy();
    expect(offline.queue.find(({ name }) => name === 'project_saved')?.properties).not.toHaveProperty('project_name');
    const queuedIds = offline.queue.map(({ eventId }) => eventId).sort();
    const userDataDir = running.userDataDir;

    await closeElectronApp(running, { removeUserData: false });
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

    await api.setMode('offline');
    await running.window.evaluate(() => window.electronAPI.captureAnalytics({ name: 'app_opened', properties: {} }));
    expect((await api.state()).queue.length).toBe(1);
    await running.window.evaluate(() => window.electronAPI.setAnalyticsConsent('denied', 'settings'));
    expect(await api.state()).toMatchObject({ consent: 'denied', installationId: null, queue: [] });
  });
});
