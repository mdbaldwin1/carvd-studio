import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsConsentDialog } from './AnalyticsConsentDialog';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('AnalyticsConsentDialog', () => {
  const onResolved = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI = {
      setAnalyticsConsent: vi.fn().mockResolvedValue({ success: true })
    } as never;
  });

  it('uses the required privacy copy and explicit choices', () => {
    render(<AnalyticsConsentDialog onResolved={onResolved} />);

    expect(screen.getByRole('dialog', { name: 'Help improve Carvd Studio' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Share anonymous feature-usage and reliability data. Project names, dimensions, files, notes, and designs are never collected. Analytics is optional and Carvd always works offline.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share anonymous usage data' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Don't share" })).toBeInTheDocument();
  });

  it('persists an onboarding grant and closes when the setter resolves', async () => {
    render(<AnalyticsConsentDialog onResolved={onResolved} />);

    fireEvent.click(screen.getByRole('button', { name: 'Share anonymous usage data' }));

    await waitFor(() => {
      expect(window.electronAPI.setAnalyticsConsent).toHaveBeenCalledWith('granted', 'onboarding');
      expect(onResolved).toHaveBeenCalledTimes(1);
    });
  });

  it('starts only one persistence request while an onboarding choice is in flight', async () => {
    const persisted = createDeferred<{ success: boolean }>();
    window.electronAPI.setAnalyticsConsent = vi.fn(() => persisted.promise);
    render(<AnalyticsConsentDialog onResolved={onResolved} />);

    const grant = screen.getByRole('button', { name: 'Share anonymous usage data' });
    act(() => {
      grant.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      grant.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(window.electronAPI.setAnalyticsConsent).toHaveBeenCalledTimes(1);

    persisted.resolve({ success: true });
    await waitFor(() => expect(onResolved).toHaveBeenCalledTimes(1));
  });

  it('persists onboarding denial and closes when the setter resolves false', async () => {
    window.electronAPI.setAnalyticsConsent = vi.fn().mockResolvedValue({ success: false });
    render(<AnalyticsConsentDialog onResolved={onResolved} />);

    fireEvent.click(screen.getByRole('button', { name: "Don't share" }));

    await waitFor(() => {
      expect(window.electronAPI.setAnalyticsConsent).toHaveBeenCalledWith('denied', 'onboarding');
      expect(onResolved).toHaveBeenCalledTimes(1);
    });
  });

  it('does not choose consent when Escape or the backdrop is used', () => {
    render(<AnalyticsConsentDialog onResolved={onResolved} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.pointerDown(document.body);
    fireEvent.click(document.body);

    expect(window.electronAPI.setAnalyticsConsent).not.toHaveBeenCalled();
    expect(onResolved).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Help improve Carvd Studio' })).toBeInTheDocument();
  });
});
