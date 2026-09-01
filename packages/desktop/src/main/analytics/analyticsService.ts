import { randomUUID } from 'node:crypto';
import { sanitizeDesktopAnalyticsEvent, type AnalyticsConsent } from '../../shared/analytics';
import {
  getAnalyticsConsentPreference,
  getAnalyticsInstallationId,
  setAnalyticsConsentPreference,
  setAnalyticsInstallationId
} from '../store';
import { createAnalyticsQueue, type AnalyticsQueue } from './analyticsQueue';
import { analyticsStorage } from './analyticsStorage';
import { createPostHogTransport, type AnalyticsTransport } from './posthogTransport';

const FLUSH_INTERVAL_MS = 60_000;
const SHUTDOWN_TIMEOUT_MS = 1_000;

export interface AnalyticsServiceOptions {
  transport?: AnalyticsTransport | null;
  createTransport?: () => AnalyticsTransport | null;
  queue?: AnalyticsQueue;
  clock?: () => number;
  createInstallationId?: () => string;
}

export interface AnalyticsConsentResult {
  success: boolean;
}

interface AnalyticsLifecycle {
  generation: number;
  queue: AnalyticsQueue;
  transport: AnalyticsTransport | null;
  active: boolean;
  flushInterval: ReturnType<typeof setInterval> | null;
  flushPromise: Promise<void> | null;
}

let lifecycle: AnalyticsLifecycle | null = null;
let nextGeneration = 0;
let createInstallationId = randomUUID;
let restartOptions: AnalyticsServiceOptions | null = null;

export function initializeAnalytics(options: AnalyticsServiceOptions = {}): void {
  restartOptions = options;
  initializeLifecycle(options);
}

function initializeLifecycle(options: AnalyticsServiceOptions): boolean {
  if (lifecycle) invalidateLifecycle(lifecycle);

  const transportResult = resolveTransport(options);
  if (!transportResult.success) return false;

  const nextLifecycle: AnalyticsLifecycle = {
    generation: ++nextGeneration,
    queue: options.queue ?? createAnalyticsQueue(analyticsStorage, options.clock ?? Date.now),
    transport: transportResult.transport,
    active: true,
    flushInterval: null,
    flushPromise: null
  };
  createInstallationId = options.createInstallationId ?? randomUUID;
  lifecycle = nextLifecycle;

  try {
    nextLifecycle.queue.prune();
  } catch {
    // Durable storage is best-effort; a later capture or launch can retry maintenance.
  }

  if (nextLifecycle.transport) {
    nextLifecycle.flushInterval = setInterval(() => {
      void flushLifecycle(nextLifecycle).catch(() => undefined);
    }, FLUSH_INTERVAL_MS);
  }

  return transportResult.success;
}

export function getAnalyticsConsent(): AnalyticsConsent {
  try {
    return getAnalyticsConsentPreference();
  } catch {
    return 'unknown';
  }
}

export function setAnalyticsConsent(consent: AnalyticsConsent): AnalyticsConsentResult {
  if (consent !== 'granted' && lifecycle) invalidateLifecycle(lifecycle);

  try {
    const persisted = setAnalyticsConsentPreference(consent);
    if (!persisted) return { success: false };
    if (consent === 'granted' && !lifecycle && restartOptions && !initializeLifecycle(restartOptions)) {
      return { success: false };
    }
    return { success: true };
  } catch {
    return { success: false };
  }
}

export function captureAnalytics(input: unknown): void {
  try {
    const activeLifecycle = lifecycle;
    if (!isCurrentLifecycle(activeLifecycle) || !activeLifecycle.transport || getAnalyticsConsent() !== 'granted')
      return;

    const event = sanitizeDesktopAnalyticsEvent(input);
    if (!event || !isCurrentLifecycle(activeLifecycle) || getAnalyticsConsent() !== 'granted') return;

    const distinctId = getAnalyticsInstallationId() ?? createInstallationId();
    if (typeof distinctId !== 'string' || distinctId.trim().length === 0) return;

    if (!isCurrentLifecycle(activeLifecycle) || getAnalyticsConsent() !== 'granted') return;
    if (!getAnalyticsInstallationId()) setAnalyticsInstallationId(distinctId);
    activeLifecycle.queue.enqueue(event, distinctId);
  } catch {
    // Analytics is strictly best-effort and must never disrupt the application.
  }
}

export function flushAnalytics(): Promise<void> {
  return lifecycle ? flushLifecycle(lifecycle) : Promise.resolve();
}

export async function shutdownAnalytics(): Promise<void> {
  const activeLifecycle = lifecycle;
  if (!activeLifecycle) return;

  const finalFlush = flushLifecycle(activeLifecycle);
  invalidateLifecycle(activeLifecycle);
  await waitAtMost(finalFlush, SHUTDOWN_TIMEOUT_MS);
}

function resolveTransport(options: AnalyticsServiceOptions): {
  transport: AnalyticsTransport | null;
  success: boolean;
} {
  try {
    if (Object.hasOwn(options, 'transport')) return { transport: options.transport ?? null, success: true };
    if (options.createTransport) return { transport: options.createTransport(), success: true };
    return { transport: createPostHogTransport(), success: true };
  } catch {
    return { transport: null, success: false };
  }
}

function flushLifecycle(activeLifecycle: AnalyticsLifecycle): Promise<void> {
  if (activeLifecycle.flushPromise) return activeLifecycle.flushPromise;

  let flushPromise!: Promise<void>;
  flushPromise = flushReadyEvents(activeLifecycle).finally(() => {
    if (activeLifecycle.flushPromise === flushPromise) activeLifecycle.flushPromise = null;
  });
  activeLifecycle.flushPromise = flushPromise;
  return flushPromise;
}

async function flushReadyEvents(activeLifecycle: AnalyticsLifecycle): Promise<void> {
  if (!isCurrentLifecycle(activeLifecycle) || !activeLifecycle.transport || getAnalyticsConsent() !== 'granted') return;

  let events;
  try {
    events = activeLifecycle.queue.peekReady();
  } catch {
    return;
  }
  if (events.length === 0) return;

  const eventIds = events.map((event) => event.eventId);
  try {
    await activeLifecycle.transport.send(events);
    if (!isCurrentLifecycle(activeLifecycle) || getAnalyticsConsent() !== 'granted') return;
    activeLifecycle.queue.acknowledge(eventIds);
  } catch {
    if (!isCurrentLifecycle(activeLifecycle) || getAnalyticsConsent() !== 'granted') return;
    try {
      activeLifecycle.queue.markFailed(eventIds);
    } catch {
      // A failed retry update still leaves the durable queue untouched.
    }
  }
}

function invalidateLifecycle(activeLifecycle: AnalyticsLifecycle): void {
  activeLifecycle.active = false;
  if (activeLifecycle.flushInterval) {
    clearInterval(activeLifecycle.flushInterval);
    activeLifecycle.flushInterval = null;
  }
  if (lifecycle === activeLifecycle) lifecycle = null;
  shutdownTransport(activeLifecycle.transport);
}

function isCurrentLifecycle(candidate: AnalyticsLifecycle | null): candidate is AnalyticsLifecycle {
  return (
    candidate !== null && candidate.active && lifecycle === candidate && lifecycle.generation === candidate.generation
  );
}

function shutdownTransport(transport: AnalyticsTransport | null): void {
  if (!transport) return;
  try {
    void transport.shutdown().catch(() => undefined);
  } catch {
    // Transport teardown must not affect product shutdown or consent changes.
  }
}

async function waitAtMost(promise: Promise<void>, timeoutMs: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    promise.catch(() => undefined),
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, timeoutMs);
    })
  ]);
  if (timer) clearTimeout(timer);
}
