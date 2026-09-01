import { PostHog } from 'posthog-node';
import type { QueuedAnalyticsEvent } from './analyticsQueue';

export interface AnalyticsTransport {
  send(events: QueuedAnalyticsEvent[]): Promise<void>;
  shutdown(): Promise<void>;
}

export function createPostHogTransport(environment: NodeJS.ProcessEnv = process.env): AnalyticsTransport | null {
  const apiKey = environment.MAIN_VITE_POSTHOG_KEY?.trim();
  const host = environment.MAIN_VITE_POSTHOG_HOST?.trim();

  if (!apiKey || !host) return null;

  const client = new PostHog(apiKey, { host });

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
