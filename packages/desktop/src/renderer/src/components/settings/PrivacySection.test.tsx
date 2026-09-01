import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analytics } from '../../utils/analytics';
import { PrivacySection } from './PrivacySection';

vi.mock('../../utils/analytics', () => ({
  analytics: { capture: vi.fn() }
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('PrivacySection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI = {
      getAnalyticsConsent: vi.fn().mockResolvedValue('denied'),
      setAnalyticsConsent: vi.fn().mockResolvedValue({ success: true })
    } as never;
  });

  it('loads the current choice when the Data & License tab becomes visible', async () => {
    const { rerender } = render(<PrivacySection isVisible={false} />);

    expect(window.electronAPI.getAnalyticsConsent).not.toHaveBeenCalled();

    rerender(<PrivacySection isVisible />);

    await waitFor(() => {
      expect(window.electronAPI.getAnalyticsConsent).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('switch', { name: 'Share anonymous usage data' })).toHaveAttribute(
        'aria-checked',
        'false'
      );
    });
  });

  it('persists a grant and captures the consent change only after success', async () => {
    const persisted = createDeferred<{ success: boolean }>();
    window.electronAPI.setAnalyticsConsent = vi.fn(() => persisted.promise);
    render(<PrivacySection isVisible />);

    const toggle = await screen.findByRole('switch', { name: 'Share anonymous usage data' });
    fireEvent.click(toggle);

    expect(window.electronAPI.setAnalyticsConsent).toHaveBeenCalledWith('granted', 'settings');
    expect(analytics.capture).not.toHaveBeenCalled();

    persisted.resolve({ success: true });

    await waitFor(() => {
      expect(analytics.capture).toHaveBeenCalledWith('analytics_consent_changed', {
        choice: 'granted',
        surface: 'settings'
      });
      expect(screen.getByRole('switch', { name: 'Share anonymous usage data' })).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });
  });

  it('starts only one settings request while a consent change is in flight', async () => {
    const persisted = createDeferred<{ success: boolean }>();
    window.electronAPI.setAnalyticsConsent = vi.fn(() => persisted.promise);
    render(<PrivacySection isVisible />);

    const toggle = await screen.findByRole('switch', { name: 'Share anonymous usage data' });
    act(() => {
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(window.electronAPI.setAnalyticsConsent).toHaveBeenCalledTimes(1);

    persisted.resolve({ success: true });
    await waitFor(() => expect(analytics.capture).toHaveBeenCalledTimes(1));
  });

  it('does not capture a grant when persistence reports failure', async () => {
    window.electronAPI.setAnalyticsConsent = vi.fn().mockResolvedValue({ success: false });
    render(<PrivacySection isVisible />);

    fireEvent.click(await screen.findByRole('switch', { name: 'Share anonymous usage data' }));

    await waitFor(() => {
      expect(window.electronAPI.setAnalyticsConsent).toHaveBeenCalledWith('granted', 'settings');
    });
    expect(analytics.capture).not.toHaveBeenCalled();
  });

  it('does not capture a denial event', async () => {
    window.electronAPI.getAnalyticsConsent = vi.fn().mockResolvedValue('granted');
    render(<PrivacySection isVisible />);

    const toggle = await screen.findByRole('switch', { name: 'Share anonymous usage data' });
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(window.electronAPI.setAnalyticsConsent).toHaveBeenCalledWith('denied', 'settings');
    });
    expect(analytics.capture).not.toHaveBeenCalled();
  });

  it('discloses the allowed anonymous categories and prohibited project data', () => {
    render(<PrivacySection isVisible={false} />);

    expect(screen.getByText('What Carvd collects')).toBeInTheDocument();
    expect(screen.getByText(/anonymous feature usage and reliability data/i)).toBeInTheDocument();
    expect(
      screen.getByText(/project names, filenames, paths, dimensions, notes, designs, email addresses, or license keys/i)
    ).toBeInTheDocument();
  });
});
