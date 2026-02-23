import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// Component that throws an error
const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Child content</div>;
};

describe('ErrorBoundary', () => {
  // Suppress console.error in tests since we're testing error handling
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  describe('normal rendering', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('renders multiple children', () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('catches error and renders default error UI', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.queryByText('Child content')).not.toBeInTheDocument();
    });

    it('renders custom fallback when provided', () => {
      render(
        <ErrorBoundary fallback={<div>Custom error message</div>}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('shows error details section', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error details')).toBeInTheDocument();
    });

    it('displays the error message', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Test error message/)).toBeInTheDocument();
    });

    it('logs error to console', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(console.error).toHaveBeenCalledWith('[ErrorBoundary] Caught error:', expect.any(Error));
    });
  });

  describe('recovery actions', () => {
    it('renders copy error icon button', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: 'Copy error details' })).toBeInTheDocument();
    });

    it('copies error details to clipboard when copy button is clicked', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(window.navigator, 'clipboard', {
        configurable: true,
        value: { writeText }
      });

      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Copy error details' }));

      await waitFor(() => {
        expect(writeText).toHaveBeenCalledTimes(1);
        expect(writeText.mock.calls[0][0]).toContain('Test error message');
      });
    });

    it('renders "Try Again" button', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('renders "Reload App" button', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Reload App')).toBeInTheDocument();
    });

    it('resets error state when "Try Again" is clicked', () => {
      // Use a state variable to control throwing behavior
      let shouldThrow = true;

      const DynamicThrowing = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div>Child content</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <DynamicThrowing />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Change the throwing behavior before clicking Try Again
      shouldThrow = false;

      // Click Try Again - this resets the error boundary state
      fireEvent.click(screen.getByText('Try Again'));

      // Force a re-render to pick up the state change
      rerender(
        <ErrorBoundary>
          <DynamicThrowing />
        </ErrorBoundary>
      );

      expect(screen.getByText('Child content')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('calls window.location.reload when "Reload App" is clicked', () => {
      const mockReload = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true
      });

      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('Reload App'));

      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('styling', () => {
    it('has fixed overlay styling on container', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(container.querySelector('.fixed')).toBeInTheDocument();
    });
  });
});
