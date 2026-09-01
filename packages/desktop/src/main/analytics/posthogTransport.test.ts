import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createPostHogTransport,
  getPostHogConfig,
  type AnalyticsFetch,
  type PostHogClient,
  type PostHogClientFactory
} from './posthogTransport';

function createDeferred<T>(): { promise: Promise<T>; resolve(value: T): void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('PostHog transport configuration', () => {
  it('constructs a client from packaged main-process configuration', () => {
    const construction: Array<{ apiKey: string; host: string; fetchRetryCount: number }> = [];
    const client: PostHogClient = {
      capture() {},
      async flush() {},
      async shutdown() {}
    };
    const createClient: PostHogClientFactory = (apiKey, options) => {
      construction.push({ apiKey, host: options.host, fetchRetryCount: options.fetchRetryCount });
      return client;
    };

    const config = getPostHogConfig({
      MAIN_VITE_POSTHOG_KEY: 'phc_public_project_key',
      MAIN_VITE_POSTHOG_HOST: 'https://analytics.example.test'
    });
    const transport = createPostHogTransport(config, { createClient });

    expect(transport).not.toBeNull();
    expect(construction).toEqual([
      { apiKey: 'phc_public_project_key', host: 'https://analytics.example.test', fetchRetryCount: 0 }
    ]);
  });

  it.each([
    { MAIN_VITE_POSTHOG_KEY: '', MAIN_VITE_POSTHOG_HOST: 'https://analytics.example.test' },
    { MAIN_VITE_POSTHOG_KEY: 'phc_public_project_key', MAIN_VITE_POSTHOG_HOST: '   ' }
  ])('does not construct a client for blank packaged config', (environment) => {
    let constructionCount = 0;
    const config = getPostHogConfig(environment);
    const transport = createPostHogTransport(config, {
      createClient: () => {
        constructionCount += 1;
        throw new Error('blank config must not construct a client');
      }
    });

    expect(transport).toBeNull();
    expect(constructionCount).toBe(0);
  });

  it('aborts an active request and does not retry after shutdown', async () => {
    vi.useFakeTimers();
    const requestStarted = createDeferred<void>();
    let requestCount = 0;
    let aborted = false;
    const fetch: AnalyticsFetch = async (_url, options) => {
      requestCount += 1;
      requestStarted.resolve();
      return new Promise((_, reject) => {
        options.signal?.addEventListener('abort', () => {
          aborted = true;
          reject(new Error('request aborted'));
        });
      });
    };
    const transport = createPostHogTransport(
      { apiKey: 'phc_public_project_key', host: 'https://analytics.example.test' },
      { fetch }
    );

    const send = transport!.send([
      {
        eventId: '8d4f0c37-9839-4cb9-8bbb-3c2dba7e45f2',
        distinctId: 'anonymous-installation',
        name: 'app_opened',
        properties: {},
        occurredAt: '2026-09-01T12:00:00.000Z',
        attemptCount: 0,
        nextAttemptAt: 0
      }
    ]);

    await requestStarted.promise;
    await transport!.shutdown();
    await Promise.allSettled([send]);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(aborted).toBe(true);
    expect(requestCount).toBe(1);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
