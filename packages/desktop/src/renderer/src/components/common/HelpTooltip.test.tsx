import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { HelpTooltip } from './HelpTooltip';

// Mock electronAPI
beforeAll(() => {
  window.electronAPI = {
    openExternal: vi.fn()
  } as unknown as typeof window.electronAPI;
});

describe('HelpTooltip', () => {
  describe('rendering', () => {
    it('renders a help button', () => {
      render(<HelpTooltip text="Test help text" />);

      const button = screen.getByRole('button', { name: 'Show help' });
      expect(button).toBeInTheDocument();
    });

    it('does not show tooltip by default', () => {
      render(<HelpTooltip text="Test help text" />);

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('shows tooltip when clicked', () => {
      render(<HelpTooltip text="Test help text" />);

      const button = screen.getByRole('button', { name: 'Show help' });
      fireEvent.click(button);

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      expect(screen.getByText('Test help text')).toBeInTheDocument();
    });

    it('hides tooltip when clicked again', () => {
      render(<HelpTooltip text="Test help text" />);

      const button = screen.getByRole('button', { name: 'Show help' });
      fireEvent.click(button);
      fireEvent.click(button);

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('hides tooltip when clicking outside', async () => {
      vi.useFakeTimers();
      render(
        <div>
          <HelpTooltip text="Test help text" />
          <button>Outside</button>
        </div>
      );

      const helpButton = screen.getByRole('button', { name: 'Show help' });
      fireEvent.click(helpButton);
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      // Radix DismissableLayer registers its pointerdown listener via setTimeout(fn, 0).
      // Flush the timer so the listener is active before we dispatch the outside click.
      await act(async () => {
        vi.advanceTimersByTime(1);
      });

      const outsideButton = screen.getByRole('button', { name: 'Outside' });
      fireEvent.pointerDown(outsideButton, { pointerId: 1, pointerType: 'mouse' });

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      vi.useRealTimers();
    });

    it('hides tooltip on Escape key', () => {
      render(<HelpTooltip text="Test help text" />);

      const button = screen.getByRole('button', { name: 'Show help' });
      fireEvent.click(button);
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('docs link', () => {
    it('shows docs link when docsSection is provided', () => {
      render(<HelpTooltip text="Test help text" docsSection="parts" />);

      const button = screen.getByRole('button', { name: 'Show help' });
      fireEvent.click(button);

      expect(screen.getByText(/Learn more in docs/)).toBeInTheDocument();
    });

    it('does not show docs link when docsSection is not provided', () => {
      render(<HelpTooltip text="Test help text" />);

      const button = screen.getByRole('button', { name: 'Show help' });
      fireEvent.click(button);

      expect(screen.queryByText(/Learn more in docs/)).not.toBeInTheDocument();
    });

    it('opens external link when docs link is clicked', () => {
      render(<HelpTooltip text="Test help text" docsSection="parts" />);

      const button = screen.getByRole('button', { name: 'Show help' });
      fireEvent.click(button);

      const link = screen.getByText(/Learn more in docs/);
      fireEvent.click(link);

      expect(window.electronAPI?.openExternal).toHaveBeenCalledWith('https://carvd-studio.com/docs#parts');
    });

    it('uses custom link text when provided', () => {
      render(<HelpTooltip text="Test help text" docsSection="parts" linkText="Read the documentation" />);

      const button = screen.getByRole('button', { name: 'Show help' });
      fireEvent.click(button);

      expect(screen.getByText(/Read the documentation/)).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies inline class when inline prop is true', () => {
      render(<HelpTooltip text="Test help text" inline />);

      const wrapper = screen.getByRole('button', { name: 'Show help' }).parentElement;
      expect(wrapper).toHaveClass('ml-1');
    });

    it('does not apply inline class when inline prop is false', () => {
      render(<HelpTooltip text="Test help text" />);

      const wrapper = screen.getByRole('button', { name: 'Show help' }).parentElement;
      expect(wrapper).not.toHaveClass('ml-1');
    });
  });
});
