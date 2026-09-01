import { useEffect, useState } from 'react';
import type { AnalyticsConsent } from '../../../shared/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { cn } from '@renderer/lib/utils';
import { analytics } from '@renderer/utils/analytics';

interface PrivacySectionProps {
  isVisible: boolean;
}

export function PrivacySection({ isVisible }: PrivacySectionProps) {
  const [consent, setConsent] = useState<AnalyticsConsent>('unknown');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    let isCurrent = true;
    setIsLoading(true);
    void window.electronAPI
      .getAnalyticsConsent()
      .then((nextConsent) => {
        if (isCurrent) setConsent(nextConsent);
      })
      .catch(() => {
        if (isCurrent) setConsent('unknown');
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [isVisible]);

  const enabled = consent === 'granted';

  const toggleConsent = async () => {
    const nextConsent: AnalyticsConsent = enabled ? 'denied' : 'granted';
    setIsSaving(true);
    try {
      const result = await window.electronAPI.setAnalyticsConsent(nextConsent, 'settings');
      if (!result.success) return;

      setConsent(nextConsent);
      if (nextConsent === 'granted') {
        analytics.capture('analytics_consent_changed', { choice: 'granted', surface: 'settings' });
      }
    } catch {
      // Settings remain unchanged when consent persistence cannot be reached.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="settings-section mb-6 last:mb-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">Privacy</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="settings-row flex items-center justify-between gap-4 mb-4">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-text">Share anonymous usage data</span>
            <span className="text-xs text-text-muted">Optional anonymous feature-usage and reliability data.</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-label="Share anonymous usage data"
            aria-checked={enabled}
            disabled={isLoading || isSaving}
            onClick={() => void toggleConsent()}
            className={cn(
              'relative h-6 w-11 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              enabled ? 'bg-accent' : 'bg-border'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                enabled ? 'translate-x-5' : 'translate-x-0.5'
              )}
            />
          </button>
        </div>
        <details className="text-xs text-text-muted">
          <summary className="cursor-pointer text-text">What Carvd collects</summary>
          <div className="mt-2 space-y-2 leading-relaxed">
            <p>When enabled, Carvd collects anonymous feature usage and reliability data.</p>
            <p>
              It never collects project names, filenames, paths, dimensions, notes, designs, email addresses, or license
              keys.
            </p>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
