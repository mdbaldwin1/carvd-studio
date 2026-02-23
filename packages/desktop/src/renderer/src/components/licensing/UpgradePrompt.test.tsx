import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpgradePrompt } from './UpgradePrompt';

// Mock window.electronAPI
beforeAll(() => {
  window.electronAPI = {
    openExternal: vi.fn()
  } as unknown as typeof window.electronAPI;
});

describe('UpgradePrompt', () => {
  const defaultProps = {
    message: 'Part limit reached (10). Upgrade to add more parts.'
  };

  it('renders the message', () => {
    render(<UpgradePrompt {...defaultProps} />);
    expect(screen.getByText(defaultProps.message)).toBeInTheDocument();
  });

  it('renders Upgrade button', () => {
    render(<UpgradePrompt {...defaultProps} />);
    expect(screen.getByText('Upgrade')).toBeInTheDocument();
  });

  it('opens external URL when Upgrade is clicked', () => {
    const onUpgrade = vi.fn();
    render(<UpgradePrompt {...defaultProps} onUpgrade={onUpgrade} />);

    fireEvent.click(screen.getByText('Upgrade'));
    expect(window.electronAPI.openExternal).toHaveBeenCalledWith(expect.stringContaining('lemonsqueezy'));
    expect(onUpgrade).toHaveBeenCalled();
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
