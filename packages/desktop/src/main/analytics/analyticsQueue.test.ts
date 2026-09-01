import { describe, expect, it } from 'vitest';
import type { DesktopAnalyticsEvent } from '../../shared/analytics';
import { createAnalyticsQueue, type AnalyticsQueueStore, type QueuedAnalyticsEvent } from './analyticsQueue';

function createStore(initial: QueuedAnalyticsEvent[] = []): AnalyticsQueueStore & { writes: QueuedAnalyticsEvent[][] } {
  let events = initial;
  const writes: QueuedAnalyticsEvent[][] = [];

  return {
    writes,
    read: () => events,
    write: (next) => {
      events = next;
      writes.push(next);
    }
  };
}

function createEvent(): DesktopAnalyticsEvent<'app_opened'> {
  return { name: 'app_opened', properties: {} };
}

describe('analytics queue', () => {
  const now = Date.parse('2026-09-01T12:00:00.000Z');

  it('enqueues events in order with a UUID and initial retry state', () => {
    const store = createStore();
    let uuid = 0;
    const queue = createAnalyticsQueue(
      store,
      () => now,
      () => `00000000-0000-4000-8000-00000000000${++uuid}`
    );

    const first = queue.enqueue(createEvent(), 'installation-1');
    const second = queue.enqueue(createEvent(), 'installation-1');

    expect(first.eventId).toMatch(/^[0-9a-f-]{36}$/);
    expect(first.distinctId).toBe('installation-1');
    expect(first.occurredAt).toBe('2026-09-01T12:00:00.000Z');
    expect(first.attemptCount).toBe(0);
    expect(second.eventId).not.toBe(first.eventId);
    expect(queue.peekReady(10).map((event) => event.eventId)).toEqual([first.eventId, second.eventId]);
    expect(store.writes).toHaveLength(2);
  });

  it('keeps only the newest events at the queue cap', () => {
    const store = createStore();
    let nextId = 0;
    const queue = createAnalyticsQueue(
      store,
      () => now,
      () => `00000000-0000-4000-8000-${String(++nextId).padStart(12, '0')}`
    );

    for (let index = 0; index < 5_001; index += 1) {
      queue.enqueue(createEvent(), 'installation-1');
    }

    expect(queue.size()).toBe(5_000);
    expect(queue.peekReady(1)[0].eventId).toContain('000000000002');
  });

  it('prunes events older than the retention window', () => {
    const store = createStore([
      {
        eventId: 'expired',
        distinctId: 'installation-1',
        name: 'app_opened',
        properties: {},
        occurredAt: new Date(now - 30 * 24 * 60 * 60 * 1_000 - 1).toISOString(),
        attemptCount: 0,
        nextAttemptAt: now
      },
      {
        eventId: 'retained',
        distinctId: 'installation-1',
        name: 'app_opened',
        properties: {},
        occurredAt: new Date(now - 30 * 24 * 60 * 60 * 1_000).toISOString(),
        attemptCount: 0,
        nextAttemptAt: now
      }
    ]);
    const queue = createAnalyticsQueue(
      store,
      () => now,
      () => '00000000-0000-4000-8000-000000000001'
    );

    queue.prune(now);

    expect(queue.size()).toBe(1);
    expect(queue.peekReady(50)[0].eventId).toBe('retained');
    expect(store.writes).toHaveLength(1);
    expect(store.writes[0].map((event) => event.eventId)).toEqual(['retained']);
  });

  it('returns at most 50 ready events in enqueue order', () => {
    const store = createStore();
    let nextId = 0;
    const queue = createAnalyticsQueue(
      store,
      () => now,
      () => `00000000-0000-4000-8000-${String(++nextId).padStart(12, '0')}`
    );

    for (let index = 0; index < 55; index += 1) queue.enqueue(createEvent(), 'installation-1');

    expect(queue.peekReady(50)).toHaveLength(50);
    expect(queue.peekReady(50)[0].attemptCount).toBe(0);
  });

  it('does not return events whose retry time is in the future', () => {
    const store = createStore();
    const queue = createAnalyticsQueue(
      store,
      () => now,
      () => '00000000-0000-4000-8000-000000000001'
    );
    const event = queue.enqueue(createEvent(), 'installation-1');

    queue.markFailed([event.eventId], now);

    expect(queue.peekReady(50)).toEqual([]);
    expect(queue.peekReady(50, now + 30_000)).toHaveLength(1);
  });

  it('acknowledges only events matching the supplied UUIDs', () => {
    const store = createStore();
    let nextId = 0;
    const queue = createAnalyticsQueue(
      store,
      () => now,
      () => `00000000-0000-4000-8000-${String(++nextId).padStart(12, '0')}`
    );
    const first = queue.enqueue(createEvent(), 'installation-1');
    const second = queue.enqueue(createEvent(), 'installation-1');

    queue.acknowledge([first.eventId, 'missing-event-id']);

    expect(queue.size()).toBe(1);
    expect(queue.peekReady(50)[0].eventId).toBe(second.eventId);
  });

  it('increments attempts and applies exponential retry delays', () => {
    const store = createStore();
    const queue = createAnalyticsQueue(
      store,
      () => now,
      () => '00000000-0000-4000-8000-000000000001'
    );
    const event = queue.enqueue(createEvent(), 'installation-1');

    const firstFailure = queue.markFailed([event.eventId], now);
    expect(firstFailure?.attemptCount).toBe(1);
    expect(firstFailure?.nextAttemptAt).toBe(now + 30_000);

    const secondFailure = queue.markFailed([event.eventId], now + 30_000);
    expect(secondFailure?.attemptCount).toBe(2);
    expect(secondFailure?.nextAttemptAt).toBe(now + 30_000 + 2 * 30_000);
  });

  it('caps retry delay at six hours', () => {
    const store = createStore();
    const queue = createAnalyticsQueue(
      store,
      () => now,
      () => '00000000-0000-4000-8000-000000000001'
    );

    expect(queue.delayForAttempt(20)).toBe(6 * 60 * 60 * 1_000);
  });

  it('clears every queued event', () => {
    const store = createStore();
    const queue = createAnalyticsQueue(
      store,
      () => now,
      () => '00000000-0000-4000-8000-000000000001'
    );
    queue.enqueue(createEvent(), 'installation-1');

    queue.clear();

    expect(queue.size()).toBe(0);
    expect(store.writes.at(-1)).toEqual([]);
  });
});
