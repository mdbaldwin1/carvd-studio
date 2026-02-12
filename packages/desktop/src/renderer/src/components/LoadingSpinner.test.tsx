import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner, LoadingOverlay } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  describe('rendering', () => {
    it('renders with default props', () => {
      render(<LoadingSpinner />);

      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('renders with small size', () => {
      render(<LoadingSpinner size="small" />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('loading-spinner-small');
    });

    it('renders with medium size by default', () => {
      render(<LoadingSpinner />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('loading-spinner-medium');
    });

    it('renders with large size', () => {
      render(<LoadingSpinner size="large" />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('loading-spinner-large');
    });

    it('displays message when provided', () => {
      render(<LoadingSpinner message="Loading data..." />);

      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('does not display message when not provided', () => {
      render(<LoadingSpinner />);

      expect(screen.queryByText(/./)).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<LoadingSpinner className="custom-class" />);

      const container = screen.getByRole('status').parentElement;
      expect(container).toHaveClass('custom-class');
    });
  });
});

describe('LoadingOverlay', () => {
  it('renders with default message', () => {
    render(<LoadingOverlay />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingOverlay message="Please wait..." />);

    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  it('renders large spinner', () => {
    render(<LoadingOverlay />);

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('loading-spinner-large');
  });

  it('has overlay class for styling', () => {
    const { container } = render(<LoadingOverlay />);

    expect(container.querySelector('.loading-overlay')).toBeInTheDocument();
  });
});
