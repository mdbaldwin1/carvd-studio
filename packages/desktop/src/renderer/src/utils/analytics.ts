import type { DesktopAnalyticsEventMap, DesktopAnalyticsEventName } from '../../../shared/analytics';

export const analytics = Object.freeze({
  capture<N extends DesktopAnalyticsEventName>(name: N, properties: DesktopAnalyticsEventMap[N]): void {
    try {
      window.electronAPI.captureAnalytics({ name, properties });
    } catch {
      // Analytics cannot affect product control flow.
    }
  }
});
