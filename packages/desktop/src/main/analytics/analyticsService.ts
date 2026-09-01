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
  queue?: AnalyticsQueue;
  clock?: () => number;
  createInstallationId?: () => string;
}

let queue: AnalyticsQueue | null = null;
let transport: AnalyticsTransport | null = null;
let flushInterval: ReturnType<typeof setInterval> | null = null;
let inFlightFlush: Promise<void> | null = null;
let createInstallationId = randomUUID;

export function initializeAnalytics(options: AnalyticsServiceOptions = {}): void {
  if (flushInterval) clearInterval(flushInterval);

  queue = options.queue ?? createAnalyticsQueue(analyticsStorage, options.clock ?? Date.now);
  transport = Object.hasOwn(options, 'transport') ? (options.transport ?? null) : createPostHogTransport();
  createInstallationId = options.createInstallationId ?? randomUUID;

  queue.prune();
  if (transport) {
    flushInterval = setInterval(() => {
      void flushAnalytics();
    }, FLUSH_INTERVAL_MS);
  } else {
    flushInterval = null;
  }
}

export function getAnalyticsConsent(): AnalyticsConsent {
  return getAnalyticsConsentPreference();
}

export function setAnalyticsConsent(consent: AnalyticsConsent): void {
  setAnalyticsConsentPreference(consent);
}

export function captureAnalytics(input: unknown): void {
  try {
    if (!transport || getAnalyticsConsent() !== 'granted') return;

    const event = sanitizeDesktopAnalyticsEvent(input);
    if (!event) return;

    const distinctId = getAnalyticsInstallationId() ?? createInstallationId();
    if (typeof distinctId !== 'string' || distinctId.trim().length === 0) return;

    if (!getAnalyticsInstallationId()) setAnalyticsInstallationId(distinctId);
    queue?.enqueue(event, distinctId);
  } catch {
    // Analytics is strictly best-effort and must never disrupt the application.
  }
}

export function flushAnalytics(): Promise<void> {
  if (inFlightFlush) return inFlightFlush;

  inFlightFlush = flushReadyEvents().finally(() => {
    inFlightFlush = null;
  });
  return inFlightFlush;
}

export async function shutdownAnalytics(): Promise<void> {
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
  }

  const activeTransport = transport;
  const shutdown = (async () => {
    await flushAnalytics();
    await activeTransport?.shutdown();
  })();

  await waitAtMost(shutdown, SHUTDOWN_TIMEOUT_MS);
  queue = null;
  transport = null;
}

async function flushReadyEvents(): Promise<void> {
  const activeQueue = queue;
  const activeTransport = transport;
  if (!activeQueue || !activeTransport || getAnalyticsConsent() !== 'granted') return;

  let events;
  try {
    events = activeQueue.peekReady();
  } catch {
    return;
  }
  if (events.length === 0) return;

  const eventIds = events.map((event) => event.eventId);
  try {
    await activeTransport.send(events);
    activeQueue.acknowledge(eventIds);
  } catch {
    try {
      activeQueue.markFailed(eventIds);
    } catch {
      // A failed retry update still leaves the durable queue untouched.
    }
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
