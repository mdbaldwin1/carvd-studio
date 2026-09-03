import type { IpcMain } from 'electron';
import type { AnalyticsConsent } from '../../shared/analytics';

export interface AnalyticsIpcDependencies {
  capture(input: unknown): void;
  getConsent(): AnalyticsConsent;
  setConsent(consent: AnalyticsConsent): { success: boolean };
}

type AnalyticsConsentSurface = 'onboarding' | 'settings';

export function registerAnalyticsIpcHandlers(
  ipcMain: Pick<IpcMain, 'handle'>,
  analytics: AnalyticsIpcDependencies
): void {
  ipcMain.handle('analytics:capture', (_event, input: unknown) => {
    try {
      analytics.capture(input);
    } catch {
      // Analytics is best-effort and must never affect renderer control flow.
    }
  });

  ipcMain.handle('analytics:get-consent', () => analytics.getConsent());

  ipcMain.handle('analytics:set-consent', (_event, consent: unknown, surface: unknown) => {
    if (!isAnalyticsConsent(consent) || !isAnalyticsConsentSurface(surface)) return { success: false };

    return analytics.setConsent(consent);
  });
}

function isAnalyticsConsent(value: unknown): value is AnalyticsConsent {
  return value === 'unknown' || value === 'granted' || value === 'denied';
}

function isAnalyticsConsentSurface(value: unknown): value is AnalyticsConsentSurface {
  return value === 'onboarding' || value === 'settings';
}
