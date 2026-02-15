import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar, ProgressOverlay } from './ProgressBar';

describe('ProgressBar', () => {
  describe('rendering', () => {
    it('renders with required progress prop', () => {
      render(<ProgressBar progress={50} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeInTheDocument();
    });

    it('displays percentage by default', () => {
      render(<ProgressBar progress={75} />);

      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('hides percentage when showPercentage is false', () => {
      render(<ProgressBar progress={75} showPercentage={false} />);

      expect(screen.queryByText('75%')).not.toBeInTheDocument();
    });

    it('displays message when provided', () => {
      render(<ProgressBar progress={50} message="Uploading..." />);

      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });

    it('does not display message when not provided', () => {
      const { container } = render(<ProgressBar progress={50} />);

      expect(container.querySelector('.progress-bar-message')).not.toBeInTheDocument();
    });
  });

  describe('progress clamping', () => {
    it('clamps progress to 0 when negative', () => {
      render(<ProgressBar progress={-10} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '0');
    });

    it('clamps progress to 100 when over 100', () => {
      render(<ProgressBar progress={150} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '100');
    });

    it('rounds percentage to nearest integer', () => {
      render(<ProgressBar progress={33.7} />);

      expect(screen.getByText('34%')).toBeInTheDocument();
    });

    it('sets width style based on progress', () => {
      render(<ProgressBar progress={60} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveStyle({ width: '60%' });
    });
  });

  describe('sizes', () => {
    it('applies small size class', () => {
      render(<ProgressBar progress={50} size="small" />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveClass('progress-bar-small');
    });

    it('applies medium size class by default', () => {
      render(<ProgressBar progress={50} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveClass('progress-bar-medium');
    });

    it('applies large size class', () => {
      render(<ProgressBar progress={50} size="large" />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveClass('progress-bar-large');
    });
  });

  describe('colors', () => {
    it('applies blue color class by default', () => {
      render(<ProgressBar progress={50} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveClass('progress-bar-blue');
    });

    it('applies green color class', () => {
      render(<ProgressBar progress={50} color="green" />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveClass('progress-bar-green');
    });

    it('applies yellow color class', () => {
      render(<ProgressBar progress={50} color="yellow" />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveClass('progress-bar-yellow');
    });

    it('applies red color class', () => {
      render(<ProgressBar progress={50} color="red" />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveClass('progress-bar-red');
    });
  });

  describe('accessibility', () => {
    it('has correct aria attributes', () => {
      render(<ProgressBar progress={45} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '45');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('custom className', () => {
    it('applies custom className to container', () => {
      const { container } = render(<ProgressBar progress={50} className="my-custom-class" />);

      expect(container.querySelector('.my-custom-class')).toBeInTheDocument();
    });
  });
});

describe('ProgressOverlay', () => {
  it('renders with default message', () => {
    render(<ProgressOverlay progress={50} />);

    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<ProgressOverlay progress={50} message="Saving project..." />);

    expect(screen.getByText('Saving project...')).toBeInTheDocument();
  });

  it('displays progress percentage', () => {
    render(<ProgressOverlay progress={75} />);

    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('has overlay class for styling', () => {
    const { container } = render(<ProgressOverlay progress={50} />);

    expect(container.querySelector('.progress-overlay')).toBeInTheDocument();
  });
});
