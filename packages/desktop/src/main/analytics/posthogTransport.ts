import { PostHog, type EventMessage } from 'posthog-node';
import type { PostHogFetchOptions, PostHogFetchResponse } from '@posthog/core';
import type { QueuedAnalyticsEvent } from './analyticsQueue';

export interface AnalyticsTransport {
  send(events: QueuedAnalyticsEvent[]): Promise<void>;
  shutdown(): Promise<void>;
}

export interface PostHogEnvironment {
  MAIN_VITE_POSTHOG_KEY?: string;
  MAIN_VITE_POSTHOG_HOST?: string;
}

export interface PostHogConfig {
  apiKey: string;
  host: string;
}

export interface PostHogClient {
  capture(event: EventMessage): void;
  flush(): Promise<void>;
  shutdown(timeoutMs?: number): Promise<void>;
}

export type AnalyticsFetch = (url: string, options: RequestInit) => Promise<Response>;

export type PostHogClientFactory = (
  apiKey: string,
  options: { host: string; fetchRetryCount: number; fetch: PostHogFetch }
) => PostHogClient;

export interface PostHogTransportOptions {
  createClient?: PostHogClientFactory;
  fetch?: AnalyticsFetch;
  context?: DesktopAnalyticsContext;
}

export interface DesktopAnalyticsContext {
  $os: 'macOS' | 'Windows' | 'Linux' | 'Other';
  app_version: string;
}

type PostHogFetch = (url: string, options: PostHogFetchOptions) => Promise<PostHogFetchResponse>;

export function getPostHogConfig(environment: PostHogEnvironment = import.meta.env): PostHogConfig | null {
  const apiKey = environment.MAIN_VITE_POSTHOG_KEY?.trim();
  const host = environment.MAIN_VITE_POSTHOG_HOST?.trim();

  return apiKey && host ? { apiKey, host } : null;
}

export function createPostHogTransport(
  config: PostHogConfig | null = getPostHogConfig(),
  options: PostHogTransportOptions = {}
): AnalyticsTransport | null {
  if (!config) return null;

  const controller = new AbortController();
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const fetch: PostHogFetch = (url, request) => {
    if (controller.signal.aborted || request.signal?.aborted) return Promise.reject(createAbortError());

    return fetchImplementation(url, {
      ...request,
      signal: combineAbortSignals(controller.signal, request.signal)
    }) as Promise<PostHogFetchResponse>;
  };
  const createClient = options.createClient ?? ((apiKey, clientOptions) => new PostHog(apiKey, clientOptions));
  const client = createClient(config.apiKey, { host: config.host, fetchRetryCount: 0, fetch });

  return {
    async send(events): Promise<void> {
      for (const event of events) {
        client.capture({
          event: event.name,
          distinctId: event.distinctId,
          properties: { ...event.properties, ...options.context },
          timestamp: new Date(event.occurredAt),
          uuid: event.eventId
        });
      }
      await client.flush();
    },

    async shutdown(): Promise<void> {
      controller.abort();
      await client.shutdown(1_000);
    }
  };
}

export function createDesktopAnalyticsContext(platform: string, appVersion: string): DesktopAnalyticsContext {
  const os: DesktopAnalyticsContext['$os'] =
    platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : platform === 'linux' ? 'Linux' : 'Other';
  return { $os: os, app_version: appVersion };
}

function combineAbortSignals(
  lifecycleSignal: AbortController['signal'],
  requestSignal?: AbortController['signal']
): AbortController['signal'] {
  if (!requestSignal) return lifecycleSignal;
  return globalThis.AbortSignal.any([lifecycleSignal, requestSignal]);
}

function createAbortError(): Error {
  const error = new Error('Analytics transport is shut down');
  error.name = 'AbortError';
  return error;
}
