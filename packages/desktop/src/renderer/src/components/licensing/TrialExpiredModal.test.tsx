import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrialExpiredModal } from './TrialExpiredModal';
import { analytics } from '@renderer/utils/analytics';

vi.mock('@renderer/utils/analytics', () => ({ analytics: { capture: vi.fn() } }));

// Mock window.electronAPI
beforeAll(() => {
  window.electronAPI = {
    openExternal: vi.fn().mockResolvedValue(undefined)
  } as unknown as typeof window.electronAPI;
});

describe('TrialExpiredModal', () => {
  const defaultProps = {
    onActivateLicense: vi.fn(),
    onPurchase: vi.fn(),
    onContinueFree: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(window.electronAPI.openExternal).mockResolvedValue(undefined);
  });

  it('renders trial expired title', () => {
    render(<TrialExpiredModal {...defaultProps} />);
    expect(screen.getByText('Your 14-Day Trial Has Ended')).toBeInTheDocument();
  });

  it('renders feature list', () => {
    render(<TrialExpiredModal {...defaultProps} />);
    expect(screen.getByText(/Unlimited parts/)).toBeInTheDocument();
    expect(screen.getByText(/PDF export & cut list/)).toBeInTheDocument();
    expect(screen.getByText(/Groups, assemblies/)).toBeInTheDocument();
    expect(screen.getByText(/Lifetime updates/)).toBeInTheDocument();
  });

  it('renders Buy Now button', () => {
    render(<TrialExpiredModal {...defaultProps} />);
    expect(screen.getByText('Buy Now')).toBeInTheDocument();
  });

  it('renders license key button', () => {
    render(<TrialExpiredModal {...defaultProps} />);
    expect(screen.getByText('I Already Have a License Key')).toBeInTheDocument();
  });

  it('renders continue free button', () => {
    render(<TrialExpiredModal {...defaultProps} />);
    expect(screen.getByText('Continue with Limited Features')).toBeInTheDocument();
  });

  it('shows free mode limitations note', () => {
    render(<TrialExpiredModal {...defaultProps} />);
    expect(screen.getByText(/10 parts/)).toBeInTheDocument();
    expect(screen.getByText(/no PDF export/)).toBeInTheDocument();
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
    render(<TrialExpiredModal {...defaultProps} onPurchase={onPurchase} />);

    fireEvent.click(screen.getByText('Buy Now'));
    expect(window.electronAPI.openExternal).toHaveBeenCalledWith(expect.stringContaining('lemonsqueezy'));
    expect(onPurchase).not.toHaveBeenCalled();
    expect(analytics.capture).not.toHaveBeenCalled();

    resolveOpen?.();

    await waitFor(() => {
      expect(onPurchase).toHaveBeenCalledTimes(1);
      expect(analytics.capture).toHaveBeenCalledTimes(1);
      expect(analytics.capture).toHaveBeenCalledWith('checkout_opened', {
        surface: 'pricing_prompt',
        license_mode: 'free'
      });
    });
  });

  it('does not record or continue checkout when opening the external URL fails', async () => {
    const onPurchase = vi.fn();
    vi.mocked(window.electronAPI.openExternal).mockRejectedValueOnce(new Error('browser unavailable'));
    render(<TrialExpiredModal {...defaultProps} onPurchase={onPurchase} />);

    fireEvent.click(screen.getByText('Buy Now'));

    await waitFor(() => expect(window.electronAPI.openExternal).toHaveBeenCalledTimes(1));
    expect(onPurchase).not.toHaveBeenCalled();
    expect(analytics.capture).not.toHaveBeenCalled();
  });

  it('calls onActivateLicense when license button is clicked', () => {
    const onActivateLicense = vi.fn();
    render(<TrialExpiredModal {...defaultProps} onActivateLicense={onActivateLicense} />);

    fireEvent.click(screen.getByText('I Already Have a License Key'));
    expect(onActivateLicense).toHaveBeenCalled();
  });

  it('calls onContinueFree when continue button is clicked', () => {
    const onContinueFree = vi.fn();
    render(<TrialExpiredModal {...defaultProps} onContinueFree={onContinueFree} />);

    fireEvent.click(screen.getByText('Continue with Limited Features'));
    expect(onContinueFree).toHaveBeenCalled();
  });

  it('has modal backdrop', () => {
    render(<TrialExpiredModal {...defaultProps} />);
    expect(document.querySelector('[data-state="open"][class*="bg-overlay"]')).toBeInTheDocument();
  });

  it('has modal class', () => {
    render(<TrialExpiredModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
