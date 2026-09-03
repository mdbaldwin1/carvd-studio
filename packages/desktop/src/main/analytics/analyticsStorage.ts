import { getAnalyticsQueue, setAnalyticsQueue } from '../store';
import type { AnalyticsQueueStore, QueuedAnalyticsEvent } from './analyticsQueue';

export const analyticsStorage: AnalyticsQueueStore = {
  read(): QueuedAnalyticsEvent[] {
    return getAnalyticsQueue();
  },

  write(events: QueuedAnalyticsEvent[]): void {
    setAnalyticsQueue(events);
  }
};
