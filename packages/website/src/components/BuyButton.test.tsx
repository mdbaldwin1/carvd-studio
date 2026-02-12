import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BuyButton from './BuyButton';

// Helper to render with router
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe('BuyButton', () => {
  beforeEach(() => {
    vi.resetModules();
    (window.open as ReturnType<typeof vi.fn>).mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('rendering', () => {
    it('renders with default button text', () => {
      renderWithRouter(<BuyButton />);
      expect(screen.getByText('Buy License - $59.99')).toBeInTheDocument();
    });

    it('renders with custom children', () => {
      renderWithRouter(<BuyButton>Custom Purchase Text</BuyButton>);
      expect(screen.getByText('Custom Purchase Text')).toBeInTheDocument();
    });

    it('applies default className', () => {
      renderWithRouter(<BuyButton />);
      const button = screen.getByRole('link');
      expect(button).toHaveClass('btn');
      expect(button).toHaveClass('btn-primary');
      expect(button).toHaveClass('btn-lg');
    });

    it('applies custom className', () => {
      renderWithRouter(<BuyButton className="custom-btn-class" />);
      const button = screen.getByRole('link');
      expect(button).toHaveClass('custom-btn-class');
    });

    it('has href pointing to /pricing', () => {
      renderWithRouter(<BuyButton />);
      const button = screen.getByRole('link');
      expect(button).toHaveAttribute('href', '/pricing');
    });

    it('is an anchor element', () => {
      renderWithRouter(<BuyButton />);
      const button = screen.getByRole('link');
      expect(button.tagName).toBe('A');
    });
  });

  describe('click behavior', () => {
    it('navigates to /pricing when checkout URL is not configured', async () => {
      vi.stubEnv('VITE_LEMON_SQUEEZY_CHECKOUT_URL', '');

      // Re-import to pick up new env
      const { default: BuyButtonFresh } = await import('./BuyButton');

      renderWithRouter(<BuyButtonFresh />);
      const button = screen.getByRole('link');

      // Click should not call window.open when not configured
      fireEvent.click(button);

      // window.open should not be called
      expect(window.open).not.toHaveBeenCalled();
    });

    it('opens checkout in new tab when URL is configured', async () => {
      const checkoutUrl = 'https://store.lemonsqueezy.com/checkout/buy/123';
      vi.stubEnv('VITE_LEMON_SQUEEZY_CHECKOUT_URL', checkoutUrl);

      // Re-import to pick up new env
      const { default: BuyButtonFresh } = await import('./BuyButton');

      renderWithRouter(<BuyButtonFresh />);
      const button = screen.getByRole('link');

      fireEvent.click(button);

      expect(window.open).toHaveBeenCalledWith(checkoutUrl, '_blank');
    });

    it('prevents default navigation when opening checkout', async () => {
      vi.stubEnv('VITE_LEMON_SQUEEZY_CHECKOUT_URL', 'https://store.lemonsqueezy.com/checkout/buy/123');

      const { default: BuyButtonFresh } = await import('./BuyButton');

      renderWithRouter(<BuyButtonFresh />);
      const button = screen.getByRole('link');

      const clickEvent = new MouseEvent('click', { bubbles: true });
      const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');

      button.dispatchEvent(clickEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('is focusable', () => {
      renderWithRouter(<BuyButton />);
      const button = screen.getByRole('link');
      button.focus();
      expect(document.activeElement).toBe(button);
    });

    it('has accessible name', () => {
      renderWithRouter(<BuyButton />);
      expect(screen.getByRole('link', { name: /buy license/i })).toBeInTheDocument();
    });

    it('custom children become accessible name', () => {
      renderWithRouter(<BuyButton>Get Full Version</BuyButton>);
      expect(screen.getByRole('link', { name: /get full version/i })).toBeInTheDocument();
    });
  });
});
