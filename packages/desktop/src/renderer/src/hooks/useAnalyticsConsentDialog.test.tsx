import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnalyticsConsentDialog } from './useAnalyticsConsentDialog';

function ConsentGate({
  isLicenseLoading,
  isWelcomeResolved,
  isTutorialOpen
}: {
  isLicenseLoading: boolean;
  isWelcomeResolved: boolean;
  isTutorialOpen: boolean;
}) {
  const { shouldShowDialog, resolveDialog } = useAnalyticsConsentDialog({
    isLicenseLoading,
    isWelcomeResolved,
    isTutorialOpen
  });

  return (
    <>
      <span>{shouldShowDialog ? 'consent dialog visible' : 'consent dialog hidden'}</span>
      <button type="button" onClick={resolveDialog}>
        resolve consent dialog
      </button>
    </>
  );
}

describe('useAnalyticsConsentDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI = {
      getAnalyticsConsent: vi.fn().mockResolvedValue('unknown')
    } as never;
  });

  it('loads unknown consent only after license status and welcome flow resolve', async () => {
    const { rerender } = render(<ConsentGate isLicenseLoading isWelcomeResolved={false} isTutorialOpen={false} />);

    expect(window.electronAPI.getAnalyticsConsent).not.toHaveBeenCalled();

    rerender(<ConsentGate isLicenseLoading={false} isWelcomeResolved={false} isTutorialOpen={false} />);
    expect(window.electronAPI.getAnalyticsConsent).not.toHaveBeenCalled();

    rerender(<ConsentGate isLicenseLoading={false} isWelcomeResolved isTutorialOpen={false} />);

    await waitFor(() => {
      expect(window.electronAPI.getAnalyticsConsent).toHaveBeenCalledTimes(1);
      expect(screen.getByText('consent dialog visible')).toBeInTheDocument();
    });
  });

  it('never overlays the welcome tutorial and stays closed after a resolved choice', async () => {
    const { rerender } = render(<ConsentGate isLicenseLoading={false} isWelcomeResolved isTutorialOpen />);

    expect(window.electronAPI.getAnalyticsConsent).not.toHaveBeenCalled();
    expect(screen.getByText('consent dialog hidden')).toBeInTheDocument();

    rerender(<ConsentGate isLicenseLoading={false} isWelcomeResolved isTutorialOpen={false} />);
    await screen.findByText('consent dialog visible');

    fireEvent.click(screen.getByRole('button', { name: 'resolve consent dialog' }));

    expect(screen.getByText('consent dialog hidden')).toBeInTheDocument();
  });
});
