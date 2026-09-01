import type { DesktopAnalyticsEvent } from '../../shared/analytics';

export interface ElectronAnalyticsLifecycle {
  whenReady(): Promise<void>;
  on(event: 'before-quit', listener: () => void): unknown;
}

export interface AnalyticsLifecycleDependencies {
  initialize(): void;
  capture(event: DesktopAnalyticsEvent<'app_opened'>): void;
  shutdown(): Promise<void>;
}

export function registerAnalyticsLifecycle(
  app: ElectronAnalyticsLifecycle,
  analytics: AnalyticsLifecycleDependencies
): void {
  void app
    .whenReady()
    .then(() => {
      analytics.initialize();
      analytics.capture({ name: 'app_opened', properties: {} });
    })
    .catch(() => undefined);

  app.on('before-quit', () => {
    try {
      void analytics.shutdown().catch(() => undefined);
    } catch {
      // Analytics shutdown cannot affect Electron's quit lifecycle.
    }
  });
}
