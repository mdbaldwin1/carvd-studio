import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAnalyticsInstallationId, getAnalyticsQueue, setAnalyticsConsentPreference } from '../store';
import type { QueuedAnalyticsEvent } from './analyticsQueue';
import {
  captureAnalytics,
  flushAnalytics,
  getAnalyticsConsent,
  initializeAnalytics,
  setAnalyticsConsent,
  shutdownAnalytics
} from './analyticsService';
import type { AnalyticsTransport } from './posthogTransport';

class FakeTransport implements AnalyticsTransport {
  readonly sentBatches: QueuedAnalyticsEvent[][] = [];
  shouldFail = false;

  async send(events: QueuedAnalyticsEvent[]): Promise<void> {
    this.sentBatches.push(events);
    if (this.shouldFail) throw new Error('network unavailable');
  }

  async shutdown(): Promise<void> {}
}

describe('analytics service', () => {
  let transport: FakeTransport;

  beforeEach(() => {
    transport = new FakeTransport();
    setAnalyticsConsentPreference('unknown');
    initializeAnalytics({ transport, createInstallationId: () => 'anonymous-installation' });
  });

  afterEach(async () => {
    await shutdownAnalytics();
  });

  it('does not enqueue while consent is unknown', () => {
    captureAnalytics({ name: 'app_opened', properties: {} });

    expect(getAnalyticsConsent()).toBe('unknown');
    expect(getAnalyticsQueue()).toEqual([]);
    expect(getAnalyticsInstallationId()).toBeNull();
  });

  it('does not enqueue while consent is denied', () => {
    setAnalyticsConsent('denied');
    captureAnalytics({ name: 'app_opened', properties: {} });

    expect(getAnalyticsConsent()).toBe('denied');
    expect(getAnalyticsQueue()).toEqual([]);
    expect(getAnalyticsInstallationId()).toBeNull();
  });

  it('creates an anonymous installation ID only after grant', () => {
    setAnalyticsConsent('granted');

    expect(getAnalyticsInstallationId()).toBeNull();
    captureAnalytics({ name: 'app_opened', properties: {} });

    expect(getAnalyticsInstallationId()).toBe('anonymous-installation');
    expect(getAnalyticsQueue()).toHaveLength(1);
  });

  it('sanitizes renderer input before enqueue', () => {
    setAnalyticsConsent('granted');
    captureAnalytics({
      name: 'project_created',
      properties: { source: 'menu', units: 'metric', projectName: 'must not persist' }
    });

    expect(getAnalyticsQueue()).toMatchObject([
      { name: 'project_created', properties: { source: 'menu', units: 'metric' } }
    ]);
    expect(getAnalyticsQueue()[0].properties).not.toHaveProperty('projectName');
  });

  it('acknowledges a batch only after transport success', async () => {
    setAnalyticsConsent('granted');
    captureAnalytics({ name: 'app_opened', properties: {} });

    await flushAnalytics();

    expect(transport.sentBatches).toHaveLength(1);
    expect(transport.sentBatches[0]).toHaveLength(1);
    expect(getAnalyticsQueue()).toEqual([]);
  });

  it('retains and backs off a batch after transport failure', async () => {
    transport.shouldFail = true;
    setAnalyticsConsent('granted');
    captureAnalytics({ name: 'app_opened', properties: {} });

    await flushAnalytics();

    expect(getAnalyticsQueue()).toMatchObject([{ attemptCount: 1 }]);
    expect(getAnalyticsQueue()[0].nextAttemptAt).toBeGreaterThan(Date.now());
  });

  it('clears queue and identity immediately on revoke', () => {
    setAnalyticsConsent('granted');
    captureAnalytics({ name: 'app_opened', properties: {} });

    setAnalyticsConsent('denied');

    expect(getAnalyticsQueue()).toEqual([]);
    expect(getAnalyticsInstallationId()).toBeNull();
  });

  it('is a no-op when PostHog configuration is absent', async () => {
    await shutdownAnalytics();
    initializeAnalytics({ transport: null });
    setAnalyticsConsent('granted');

    captureAnalytics({ name: 'app_opened', properties: {} });
    await flushAnalytics();

    expect(getAnalyticsQueue()).toEqual([]);
    expect(getAnalyticsInstallationId()).toBeNull();
  });

  it('never throws from captureAnalytics', () => {
    setAnalyticsConsent('granted');
    const input = new Proxy(
      {},
      {
        get() {
          throw new Error('renderer object failed during inspection');
        }
      }
    );

    expect(() => captureAnalytics(input)).not.toThrow();
  });
});
