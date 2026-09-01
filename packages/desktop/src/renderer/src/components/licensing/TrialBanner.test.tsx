import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrialBanner } from './TrialBanner';
import { analytics } from '@renderer/utils/analytics';

vi.mock('@renderer/utils/analytics', () => ({ analytics: { capture: vi.fn() } }));

// Mock window.electronAPI
beforeAll(() => {
  window.electronAPI = {
    openExternal: vi.fn().mockResolvedValue(undefined)
  } as unknown as typeof window.electronAPI;
});

describe('TrialBanner', () => {
  const defaultProps = {
    daysRemaining: 7,
    onActivateLicense: vi.fn(),
    onPurchase: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(window.electronAPI.openExternal).mockResolvedValue(undefined);
  });

  it('renders days remaining text', () => {
    render(<TrialBanner {...defaultProps} />);
    expect(screen.getByText('7 days left in your trial')).toBeInTheDocument();
  });

  it('shows singular day text for 1 day remaining', () => {
    render(<TrialBanner {...defaultProps} daysRemaining={1} />);
    expect(screen.getByText('1 day left in your trial')).toBeInTheDocument();
  });

  it('renders Enter License button', () => {
    render(<TrialBanner {...defaultProps} />);
    expect(screen.getByText('Enter License')).toBeInTheDocument();
  });

  it('renders Buy Now button', () => {
    render(<TrialBanner {...defaultProps} />);
    expect(screen.getByText('Buy Now')).toBeInTheDocument();
  });

  it('calls onActivateLicense when Enter License is clicked', () => {
    const onActivateLicense = vi.fn();
    render(<TrialBanner {...defaultProps} onActivateLicense={onActivateLicense} />);

    fireEvent.click(screen.getByText('Enter License'));
    expect(onActivateLicense).toHaveBeenCalled();
  });

  it('records a checkout only after Buy Now opens the external URL', async () => {
    const onPurchase = vi.fn();
    let resolveOpen: (() => void) | undefined;
    vi.mocked(window.electronAPI.openExternal).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveOpen = resolve;
        })
    );
    render(<TrialBanner {...defaultProps} onPurchase={onPurchase} />);

    fireEvent.click(screen.getByText('Buy Now'));
    expect(window.electronAPI.openExternal).toHaveBeenCalledWith(expect.stringContaining('lemonsqueezy'));
    expect(onPurchase).not.toHaveBeenCalled();
    expect(analytics.capture).not.toHaveBeenCalled();

    resolveOpen?.();

    await waitFor(() => {
      expect(onPurchase).toHaveBeenCalledTimes(1);
      expect(analytics.capture).toHaveBeenCalledTimes(1);
      expect(analytics.capture).toHaveBeenCalledWith('checkout_opened', { surface: 'trial', license_mode: 'trial' });
    });
  });

  it('does not record checkout but preserves its callback when opening the external URL fails', async () => {
    const onPurchase = vi.fn();
    vi.mocked(window.electronAPI.openExternal).mockRejectedValueOnce(new Error('browser unavailable'));
    render(<TrialBanner {...defaultProps} onPurchase={onPurchase} />);

    fireEvent.click(screen.getByText('Buy Now'));

    await waitFor(() => expect(window.electronAPI.openExternal).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onPurchase).toHaveBeenCalledTimes(1));
    expect(analytics.capture).not.toHaveBeenCalled();
  });

  it('applies normal styling when days > 3', () => {
    render(<TrialBanner {...defaultProps} daysRemaining={7} />);
    expect(screen.getByRole('alert')).toHaveAttribute('data-variant', 'default');
  });

  it('applies urgent styling when days <= 3', () => {
    render(<TrialBanner {...defaultProps} daysRemaining={3} />);
    expect(screen.getByRole('alert')).toHaveAttribute('data-variant', 'destructive');
  });

  it('applies urgent styling when 1 day remaining', () => {
    render(<TrialBanner {...defaultProps} daysRemaining={1} />);
    expect(screen.getByRole('alert')).toHaveAttribute('data-variant', 'destructive');
  });
});
