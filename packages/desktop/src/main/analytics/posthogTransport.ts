import { PostHog, type EventMessage } from 'posthog-node';
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

export type PostHogClientFactory = (apiKey: string, options: { host: string }) => PostHogClient;

export function getPostHogConfig(environment: PostHogEnvironment = import.meta.env): PostHogConfig | null {
  const apiKey = environment.MAIN_VITE_POSTHOG_KEY?.trim();
  const host = environment.MAIN_VITE_POSTHOG_HOST?.trim();

  return apiKey && host ? { apiKey, host } : null;
}

export function createPostHogTransport(
  config: PostHogConfig | null = getPostHogConfig(),
  createClient: PostHogClientFactory = (apiKey, options) => new PostHog(apiKey, options)
): AnalyticsTransport | null {
  if (!config) return null;

  const client = createClient(config.apiKey, { host: config.host });

  return {
    async send(events): Promise<void> {
      for (const event of events) {
        client.capture({
          event: event.name,
          distinctId: event.distinctId,
          properties: event.properties,
          timestamp: new Date(event.occurredAt),
          uuid: event.eventId
        });
      }
      await client.flush();
    },

    async shutdown(): Promise<void> {
      await client.shutdown(1_000);
    }
  };
}
