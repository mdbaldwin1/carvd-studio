import { randomUUID } from 'node:crypto';
import type { DesktopAnalyticsEvent, DesktopAnalyticsEventName } from '../../shared/analytics';

export const ANALYTICS_QUEUE_MAX_EVENTS = 5_000;
export const ANALYTICS_QUEUE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1_000;
export const ANALYTICS_QUEUE_READY_BATCH_SIZE = 50;
export const ANALYTICS_QUEUE_RETRY_BASE_DELAY_MS = 30 * 1_000;
export const ANALYTICS_QUEUE_RETRY_MAX_DELAY_MS = 6 * 60 * 60 * 1_000;

export interface QueuedAnalyticsEvent {
  eventId: string;
  distinctId: string;
  name: DesktopAnalyticsEventName;
  properties: Record<string, string | number | boolean>;
  occurredAt: string;
  attemptCount: number;
  nextAttemptAt: number;
}

export interface AnalyticsQueueStore {
  read(): QueuedAnalyticsEvent[];
  write(events: QueuedAnalyticsEvent[]): void;
}

export interface AnalyticsQueue {
  enqueue(event: DesktopAnalyticsEvent, distinctId: string): QueuedAnalyticsEvent;
  peekReady(limit?: number, now?: number): QueuedAnalyticsEvent[];
  acknowledge(eventIds: readonly string[]): void;
  markFailed(eventIds: readonly string[], now?: number): QueuedAnalyticsEvent | undefined;
  prune(now?: number): void;
  size(): number;
  clear(): void;
  delayForAttempt(attemptCount: number): number;
}

export function createAnalyticsQueue(
  storage: AnalyticsQueueStore,
  clock: () => number,
  createEventId: () => string = randomUUID
): AnalyticsQueue {
  const readEvents = (): QueuedAnalyticsEvent[] => storage.read().map(cloneEvent);

  const writeEvents = (events: QueuedAnalyticsEvent[]): void => {
    storage.write(events.map(cloneEvent));
  };

  const delayForAttempt = (attemptCount: number): number => {
    const normalizedAttempt = Math.max(0, Math.floor(attemptCount));
    return Math.min(ANALYTICS_QUEUE_RETRY_BASE_DELAY_MS * 2 ** normalizedAttempt, ANALYTICS_QUEUE_RETRY_MAX_DELAY_MS);
  };

  const pruneEvents = (events: QueuedAnalyticsEvent[], now: number): QueuedAnalyticsEvent[] => {
    const cutoff = now - ANALYTICS_QUEUE_MAX_AGE_MS;
    return events.filter((event) => {
      const occurredAt = Date.parse(event.occurredAt);
      return !Number.isNaN(occurredAt) && occurredAt >= cutoff;
    });
  };

  return {
    enqueue(event, distinctId): QueuedAnalyticsEvent {
      if (typeof distinctId !== 'string' || distinctId.trim().length === 0) {
        throw new Error('Analytics queue requires a non-empty distinctId');
      }
      const now = clock();
      const queuedEvent: QueuedAnalyticsEvent = {
        eventId: createEventId(),
        distinctId,
        name: event.name,
        properties: { ...event.properties } as Record<string, string | number | boolean>,
        occurredAt: new Date(now).toISOString(),
        attemptCount: 0,
        nextAttemptAt: now
      };
      const nextEvents = [...pruneEvents(readEvents(), now), queuedEvent].slice(-ANALYTICS_QUEUE_MAX_EVENTS);
      writeEvents(nextEvents);
      return cloneEvent(queuedEvent);
    },

    peekReady(limit = ANALYTICS_QUEUE_READY_BATCH_SIZE, now = clock()): QueuedAnalyticsEvent[] {
      if (limit <= 0) return [];
      return readEvents()
        .filter((event) => event.nextAttemptAt <= now)
        .slice(0, Math.min(Math.floor(limit), ANALYTICS_QUEUE_READY_BATCH_SIZE))
        .map(cloneEvent);
    },

    acknowledge(eventIds): void {
      if (eventIds.length === 0) return;
      const ids = new Set(eventIds);
      const events = readEvents();
      const nextEvents = events.filter((event) => !ids.has(event.eventId));
      if (nextEvents.length !== events.length) writeEvents(nextEvents);
    },

    markFailed(eventIds, now = clock()): QueuedAnalyticsEvent | undefined {
      if (eventIds.length === 0) return undefined;
      const ids = new Set(eventIds);
      const events = readEvents();
      let firstUpdated: QueuedAnalyticsEvent | undefined;
      const nextEvents = events.map((event) => {
        if (!ids.has(event.eventId)) return event;
        const updated: QueuedAnalyticsEvent = {
          ...event,
          attemptCount: event.attemptCount + 1,
          nextAttemptAt: now + delayForAttempt(event.attemptCount)
        };
        firstUpdated ??= updated;
        return updated;
      });
      if (firstUpdated) writeEvents(nextEvents);
      return firstUpdated ? cloneEvent(firstUpdated) : undefined;
    },

    prune(now = clock()): void {
      const events = readEvents();
      const nextEvents = pruneEvents(events, now);
      if (nextEvents.length !== events.length) writeEvents(nextEvents);
    },

    size(): number {
      return readEvents().length;
    },

    clear(): void {
      writeEvents([]);
    },

    delayForAttempt
  };
}

function cloneEvent(event: QueuedAnalyticsEvent): QueuedAnalyticsEvent {
  return { ...event, properties: { ...event.properties } };
}
