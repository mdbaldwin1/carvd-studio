import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAnalyticsInstallationId, getAnalyticsQueue, setAnalyticsConsentPreference, store } from '../store';
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

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(reason: unknown): void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

class DeferredTransport implements AnalyticsTransport {
  readonly sentBatches: QueuedAnalyticsEvent[][] = [];
  readonly sendDeferred = createDeferred<void>();
  shutdownCalls = 0;

  send(events: QueuedAnalyticsEvent[]): Promise<void> {
    this.sentBatches.push(events);
    return this.sendDeferred.promise;
  }

  async shutdown(): Promise<void> {
    this.shutdownCalls += 1;
  }
}

describe('analytics service', () => {
  let transport: FakeTransport;

  beforeEach(() => {
    transport = new FakeTransport();
    setAnalyticsConsentPreference('unknown');
    initializeAnalytics({ transport, createInstallationId: () => 'anonymous-installation' });
  });

  afterEach(async () => {
    vi.useRealTimers();
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

  it('invalidates an in-flight send and disables transport immediately on revoke', async () => {
    await shutdownAnalytics();
    const deferredTransport = new DeferredTransport();
    initializeAnalytics({ transport: deferredTransport, createInstallationId: () => 'anonymous-installation' });
    setAnalyticsConsent('granted');
    captureAnalytics({ name: 'app_opened', properties: {} });
    const inFlightFlush = flushAnalytics();

    try {
      expect(deferredTransport.sentBatches).toHaveLength(1);
      expect(setAnalyticsConsent('denied')).toEqual({ success: true });
      expect(deferredTransport.shutdownCalls).toBe(1);
      expect(getAnalyticsQueue()).toEqual([]);
      expect(getAnalyticsInstallationId()).toBeNull();

      captureAnalytics({ name: 'app_opened', properties: {} });
      await flushAnalytics();

      expect(deferredTransport.sentBatches).toHaveLength(1);
      expect(getAnalyticsQueue()).toEqual([]);
    } finally {
      deferredTransport.sendDeferred.resolve();
      await inFlightFlush;
    }
  });

  it('contains consent read and partial clearing failures', () => {
    const originalGet = store.get.bind(store);
    const getSpy = vi.spyOn(store, 'get').mockImplementation((key, defaultValue) => {
      if (key === 'analyticsConsent') throw new Error('preferences unavailable');
      return originalGet(key, defaultValue);
    });

    try {
      expect(getAnalyticsConsent()).toBe('unknown');
      expect(() => captureAnalytics({ name: 'app_opened', properties: {} })).not.toThrow();
    } finally {
      getSpy.mockRestore();
    }

    setAnalyticsConsent('granted');
    const originalDelete = store.delete.bind(store);
    const deleteSpy = vi.spyOn(store, 'delete').mockImplementation((key) => {
      if (key === 'analyticsQueue') throw new Error('queue deletion failed');
      return originalDelete(key);
    });

    try {
      expect(() => setAnalyticsConsent('denied')).not.toThrow();
      expect(setAnalyticsConsent('denied')).toEqual({ success: false });
    } finally {
      deleteSpy.mockRestore();
    }
  });

  it('contains initialization prune failures and interval flush failures', async () => {
    await shutdownAnalytics();
    vi.useFakeTimers();
    const originalGet = store.get.bind(store);
    let queueReadCount = 0;
    const getSpy = vi.spyOn(store, 'get').mockImplementation((key, defaultValue) => {
      if (key === 'analyticsQueue') {
        queueReadCount += 1;
        throw new Error('queue read failed');
      }
      return originalGet(key, defaultValue);
    });
    const intervalTransport = new FakeTransport();

    try {
      expect(() => initializeAnalytics({ transport: intervalTransport })).not.toThrow();
      setAnalyticsConsent('granted');
      const readsAfterInitialization = queueReadCount;
      await vi.advanceTimersByTimeAsync(60_000);
      expect(queueReadCount).toBeGreaterThan(readsAfterInitialization);
    } finally {
      getSpy.mockRestore();
    }
  });

  it('initiates shutdown without waiting for an unsettled flush and returns within one second', async () => {
    await shutdownAnalytics();
    const deferredTransport = new DeferredTransport();
    initializeAnalytics({ transport: deferredTransport, createInstallationId: () => 'anonymous-installation' });
    setAnalyticsConsent('granted');
    captureAnalytics({ name: 'app_opened', properties: {} });
    vi.useFakeTimers();

    const shutdown = shutdownAnalytics();

    try {
      expect(deferredTransport.sentBatches).toHaveLength(1);
      expect(deferredTransport.shutdownCalls).toBe(1);
      await vi.advanceTimersByTimeAsync(1_000);
      await shutdown;
    } finally {
      deferredTransport.sendDeferred.resolve();
      await shutdown;
    }
  });

  it('gives reinitialized services a fresh transport and flush mutex', async () => {
    await shutdownAnalytics();
    const oldTransport = new DeferredTransport();
    initializeAnalytics({ transport: oldTransport, createInstallationId: () => 'old-installation' });
    setAnalyticsConsent('granted');
    captureAnalytics({ name: 'app_opened', properties: {} });
    const oldFlush = flushAnalytics();

    const newTransport = new FakeTransport();
    initializeAnalytics({ transport: newTransport, createInstallationId: () => 'new-installation' });
    captureAnalytics({ name: 'app_opened', properties: {} });
    await flushAnalytics();

    try {
      expect(oldTransport.shutdownCalls).toBe(1);
      expect(newTransport.sentBatches).toHaveLength(1);
      expect(getAnalyticsQueue()).toEqual([]);
    } finally {
      oldTransport.sendDeferred.resolve();
      await oldFlush;
    }
    expect(getAnalyticsQueue()).toEqual([]);
  });

  it('does not let a stale failed send back off the new lifecycle queue', async () => {
    await shutdownAnalytics();
    const oldTransport = new DeferredTransport();
    initializeAnalytics({ transport: oldTransport, createInstallationId: () => 'old-installation' });
    setAnalyticsConsent('granted');
    captureAnalytics({ name: 'app_opened', properties: {} });
    const oldFlush = flushAnalytics();

    const newTransport = new FakeTransport();
    initializeAnalytics({ transport: newTransport });
    oldTransport.sendDeferred.reject(new Error('old transport failed'));
    await oldFlush;
    await flushAnalytics();

    expect(newTransport.sentBatches).toHaveLength(1);
    expect(getAnalyticsQueue()).toEqual([]);
  });

  it('does not let a stale successful send acknowledge the reinitialized queue', async () => {
    await shutdownAnalytics();
    const oldTransport = new DeferredTransport();
    initializeAnalytics({ transport: oldTransport, createInstallationId: () => 'old-installation' });
    setAnalyticsConsent('granted');
    captureAnalytics({ name: 'app_opened', properties: {} });
    const oldFlush = flushAnalytics();

    const newTransport = new FakeTransport();
    initializeAnalytics({ transport: newTransport });
    oldTransport.sendDeferred.resolve();
    await oldFlush;
    await flushAnalytics();

    expect(newTransport.sentBatches).toHaveLength(1);
    expect(getAnalyticsQueue()).toEqual([]);
  });

  it('reactivates a fresh lifecycle when consent changes from denied to granted', () => {
    const createdTransports: FakeTransport[] = [];
    initializeAnalytics({
      createTransport: () => {
        const nextTransport = new FakeTransport();
        createdTransports.push(nextTransport);
        return nextTransport;
      },
      createInstallationId: () => 'reactivated-installation'
    });

    expect(setAnalyticsConsent('denied')).toEqual({ success: true });
    expect(setAnalyticsConsent('granted')).toEqual({ success: true });
    captureAnalytics({ name: 'app_opened', properties: {} });

    expect(createdTransports).toHaveLength(2);
    expect(getAnalyticsInstallationId()).toBe('reactivated-installation');
    expect(getAnalyticsQueue()).toHaveLength(1);
  });

  it('reports failed reactivation when the transport factory throws', () => {
    initializeAnalytics({
      createTransport: () => {
        throw new Error('transport factory failed');
      }
    });
    setAnalyticsConsent('denied');

    let result: ReturnType<typeof setAnalyticsConsent> | undefined;
    expect(() => {
      result = setAnalyticsConsent('granted');
    }).not.toThrow();
    expect(result).toEqual({ success: false });
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
