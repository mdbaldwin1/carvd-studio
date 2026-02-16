import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrialExpiredModal } from './TrialExpiredModal';

// Mock window.electronAPI
beforeAll(() => {
  window.electronAPI = {
    openExternal: vi.fn()
  } as unknown as typeof window.electronAPI;
});

describe('TrialExpiredModal', () => {
  const defaultProps = {
    onActivateLicense: vi.fn(),
    onPurchase: vi.fn(),
    onContinueFree: vi.fn()
  };

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

  it('opens external URL when Buy Now is clicked', () => {
    const onPurchase = vi.fn();
    render(<TrialExpiredModal {...defaultProps} onPurchase={onPurchase} />);

    fireEvent.click(screen.getByText('Buy Now'));
    expect(window.electronAPI.openExternal).toHaveBeenCalledWith(expect.stringContaining('lemonsqueezy'));
    expect(onPurchase).toHaveBeenCalled();
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
    const { container } = render(<TrialExpiredModal {...defaultProps} />);
    expect(container.querySelector('.modal-backdrop')).toBeInTheDocument();
  });

  it('has modal class', () => {
    const { container } = render(<TrialExpiredModal {...defaultProps} />);
    expect(container.querySelector('.modal')).toBeInTheDocument();
  });
});
