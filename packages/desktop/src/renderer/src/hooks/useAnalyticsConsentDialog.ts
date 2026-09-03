import { useEffect, useState } from 'react';
import type { AnalyticsConsent } from '../../shared/analytics';

interface UseAnalyticsConsentDialogOptions {
  isLicenseLoading: boolean;
  isWelcomeResolved: boolean;
  isTutorialOpen: boolean;
}

export function useAnalyticsConsentDialog({
  isLicenseLoading,
  isWelcomeResolved,
  isTutorialOpen
}: UseAnalyticsConsentDialogOptions) {
  const [consent, setConsent] = useState<AnalyticsConsent | null>(null);
  const [isResolved, setIsResolved] = useState(false);

  useEffect(() => {
    if (isLicenseLoading || !isWelcomeResolved || isTutorialOpen) return;

    let isCurrent = true;
    void window.electronAPI
      .getAnalyticsConsent()
      .then((nextConsent) => {
        if (isCurrent) setConsent(nextConsent);
      })
      .catch(() => {
        if (isCurrent) setConsent(null);
      });

    return () => {
      isCurrent = false;
    };
  }, [isLicenseLoading, isTutorialOpen, isWelcomeResolved]);

  return {
    shouldShowDialog: !isLicenseLoading && isWelcomeResolved && !isTutorialOpen && !isResolved && consent === 'unknown',
    resolveDialog: () => setIsResolved(true)
  };
}
