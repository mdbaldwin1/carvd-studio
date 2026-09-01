import type { IpcMain } from 'electron';
import { getAnalyticsConsentPreference, getAnalyticsInstallationId, getAnalyticsQueue } from '../store';
import type { QueuedAnalyticsEvent } from './analyticsQueue';
import type { AnalyticsTransport } from './posthogTransport';

export type AnalyticsTestMode = 'success' | 'offline' | 'timeout';

let mode: AnalyticsTestMode = isAnalyticsTestMode(process.env.CARVD_E2E_ANALYTICS_MODE)
  ? process.env.CARVD_E2E_ANALYTICS_MODE
  : 'success';
const recordedEvents: QueuedAnalyticsEvent[] = [];

export const analyticsTestTransport: AnalyticsTransport = {
  async send(events): Promise<void> {
    if (mode === 'offline') throw new Error('E2E analytics transport offline');
    if (mode === 'timeout') await new Promise<void>(() => undefined);
    recordedEvents.push(...cloneEvents(events));
  },
  async shutdown(): Promise<void> {
    // No external resources: timeout behavior is intentionally controlled by send().
  }
};

export function registerAnalyticsTestControl(
  ipcMain: Pick<IpcMain, 'handle'>,
  enabled: boolean,
  flush: () => Promise<void>
): void {
  if (!enabled) return;
  ipcMain.handle('analytics:test:set-mode', (_event, nextMode: unknown) => {
    if (!isAnalyticsTestMode(nextMode)) throw new Error('Invalid analytics test mode');
    mode = nextMode;
  });
  ipcMain.handle('analytics:test:get-state', () => ({
    consent: getAnalyticsConsentPreference(),
    installationId: getAnalyticsInstallationId(),
    queue: getAnalyticsQueue(),
    recordedEvents: cloneEvents(recordedEvents)
  }));
  ipcMain.handle('analytics:test:flush', () => flush());
}

function isAnalyticsTestMode(value: unknown): value is AnalyticsTestMode {
  return value === 'success' || value === 'offline' || value === 'timeout';
}

function cloneEvents(events: QueuedAnalyticsEvent[]): QueuedAnalyticsEvent[] {
  return events.map((event) => ({ ...event, properties: { ...event.properties } }));
}
