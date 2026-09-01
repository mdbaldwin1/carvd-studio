import { describe, expect, it } from 'vitest';
import {
  createPostHogTransport,
  getPostHogConfig,
  type PostHogClient,
  type PostHogClientFactory
} from './posthogTransport';

describe('PostHog transport configuration', () => {
  it('constructs a client from packaged main-process configuration', () => {
    const construction: Array<{ apiKey: string; host: string }> = [];
    const client: PostHogClient = {
      capture() {},
      async flush() {},
      async shutdown() {}
    };
    const createClient: PostHogClientFactory = (apiKey, options) => {
      construction.push({ apiKey, host: options.host });
      return client;
    };

    const config = getPostHogConfig({
      MAIN_VITE_POSTHOG_KEY: 'phc_public_project_key',
      MAIN_VITE_POSTHOG_HOST: 'https://analytics.example.test'
    });
    const transport = createPostHogTransport(config, createClient);

    expect(transport).not.toBeNull();
    expect(construction).toEqual([{ apiKey: 'phc_public_project_key', host: 'https://analytics.example.test' }]);
  });

  it.each([
    { MAIN_VITE_POSTHOG_KEY: '', MAIN_VITE_POSTHOG_HOST: 'https://analytics.example.test' },
    { MAIN_VITE_POSTHOG_KEY: 'phc_public_project_key', MAIN_VITE_POSTHOG_HOST: '   ' }
  ])('does not construct a client for blank packaged config', (environment) => {
    let constructionCount = 0;
    const config = getPostHogConfig(environment);
    const transport = createPostHogTransport(config, () => {
      constructionCount += 1;
      throw new Error('blank config must not construct a client');
    });

    expect(transport).toBeNull();
    expect(constructionCount).toBe(0);
  });
});
