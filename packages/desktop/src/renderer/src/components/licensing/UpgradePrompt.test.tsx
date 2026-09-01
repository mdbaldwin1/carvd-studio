import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UpgradePrompt } from './UpgradePrompt';
import { analytics } from '@renderer/utils/analytics';

vi.mock('@renderer/utils/analytics', () => ({ analytics: { capture: vi.fn() } }));

// Mock window.electronAPI
beforeAll(() => {
  window.electronAPI = {
    openExternal: vi.fn().mockResolvedValue(undefined)
  } as unknown as typeof window.electronAPI;
});

describe('UpgradePrompt', () => {
  const defaultProps = {
    message: 'Part limit reached (10). Upgrade to add more parts.'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(window.electronAPI.openExternal).mockResolvedValue(undefined);
  });

  it('renders the message', () => {
    render(<UpgradePrompt {...defaultProps} />);
    expect(screen.getByText(defaultProps.message)).toBeInTheDocument();
  });

  it('renders Upgrade button', () => {
    render(<UpgradePrompt {...defaultProps} />);
    expect(screen.getByText('Upgrade')).toBeInTheDocument();
  });

  it('records a checkout only after Upgrade opens the external URL', async () => {
    const onUpgrade = vi.fn();
    let resolveOpen: (() => void) | undefined;
    vi.mocked(window.electronAPI.openExternal).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveOpen = resolve;
        })
    );
    render(<UpgradePrompt {...defaultProps} onUpgrade={onUpgrade} />);

    fireEvent.click(screen.getByText('Upgrade'));
    expect(window.electronAPI.openExternal).toHaveBeenCalledWith(expect.stringContaining('lemonsqueezy'));
    expect(onUpgrade).not.toHaveBeenCalled();
    expect(analytics.capture).not.toHaveBeenCalled();

    resolveOpen?.();

    await waitFor(() => {
      expect(onUpgrade).toHaveBeenCalledTimes(1);
      expect(analytics.capture).toHaveBeenCalledTimes(1);
      expect(analytics.capture).toHaveBeenCalledWith('checkout_opened', {
        surface: 'pricing_prompt',
        license_mode: 'free'
      });
    });
  });

  it('does not record checkout but preserves its callback when opening the external URL fails', async () => {
    const onUpgrade = vi.fn();
    vi.mocked(window.electronAPI.openExternal).mockRejectedValueOnce(new Error('browser unavailable'));
    render(<UpgradePrompt {...defaultProps} onUpgrade={onUpgrade} />);

    fireEvent.click(screen.getByText('Upgrade'));

    await waitFor(() => expect(window.electronAPI.openExternal).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onUpgrade).toHaveBeenCalledTimes(1));
    expect(analytics.capture).not.toHaveBeenCalled();
  });

  it('does not render Dismiss button when onDismiss is not provided', () => {
    render(<UpgradePrompt {...defaultProps} />);
    expect(screen.queryByText('Dismiss')).not.toBeInTheDocument();
  });

  it('renders Dismiss button when onDismiss is provided', () => {
    render(<UpgradePrompt {...defaultProps} onDismiss={() => {}} />);
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('calls onDismiss when Dismiss is clicked', () => {
    const onDismiss = vi.fn();
    render(<UpgradePrompt {...defaultProps} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByText('Dismiss'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('has border-primary styling', () => {
    render(<UpgradePrompt {...defaultProps} />);
    expect(screen.getByRole('alert')).toHaveClass('border-primary');
  });

  it('displays custom messages correctly', () => {
    const customMessage = 'PDF export requires a license.';
    render(<UpgradePrompt message={customMessage} />);
    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });
});
