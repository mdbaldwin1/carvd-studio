import posthog from "posthog-js";

let initialized = false;

export function initializeWebsiteAnalytics(): void {
  if (initialized) return;

  const key = import.meta.env.VITE_POSTHOG_KEY?.trim();
  const host = import.meta.env.VITE_POSTHOG_HOST?.trim();
  if (!key || !host) return;

  try {
    posthog.init(key, {
      api_host: host,
      autocapture: false,
      disable_session_recording: true,
      capture_pageview: false,
      advanced_disable_flags: true,
      persistence: "localStorage",
      request_batching: import.meta.env.VITE_ANALYTICS_E2E !== "true",
    });
    initialized = true;
  } catch {
    // Analytics configuration must never interrupt website rendering.
  }
}

export const websiteAnalytics = {
  capture(event: string, properties: Record<string, string>): void {
    if (!initialized) return;

    try {
      posthog.capture(event, properties);
    } catch {
      // Analytics delivery must never interrupt navigation or interaction.
    }
  },
};
