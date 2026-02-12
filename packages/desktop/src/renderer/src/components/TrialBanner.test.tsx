import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrialBanner } from './TrialBanner';

// Mock window.electronAPI
beforeAll(() => {
  window.electronAPI = {
    openExternal: vi.fn()
  } as unknown as typeof window.electronAPI;
});

describe('TrialBanner', () => {
  const defaultProps = {
    daysRemaining: 7,
    onActivateLicense: vi.fn(),
    onPurchase: vi.fn()
  };

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

  it('opens external URL when Buy Now is clicked', () => {
    const onPurchase = vi.fn();
    render(<TrialBanner {...defaultProps} onPurchase={onPurchase} />);

    fireEvent.click(screen.getByText('Buy Now'));
    expect(window.electronAPI.openExternal).toHaveBeenCalledWith(expect.stringContaining('lemonsqueezy'));
    expect(onPurchase).toHaveBeenCalled();
  });

  it('applies normal styling when days > 3', () => {
    const { container } = render(<TrialBanner {...defaultProps} daysRemaining={7} />);
    expect(container.querySelector('.trial-banner--normal')).toBeInTheDocument();
  });

  it('applies urgent styling when days <= 3', () => {
    const { container } = render(<TrialBanner {...defaultProps} daysRemaining={3} />);
    expect(container.querySelector('.trial-banner--urgent')).toBeInTheDocument();
  });

  it('applies urgent styling when 1 day remaining', () => {
    const { container } = render(<TrialBanner {...defaultProps} daysRemaining={1} />);
    expect(container.querySelector('.trial-banner--urgent')).toBeInTheDocument();
  });
});
