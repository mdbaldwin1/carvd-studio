import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScreenshotPlaceholder from './ScreenshotPlaceholder';

describe('ScreenshotPlaceholder', () => {
  it('renders tooltip text', () => {
    render(<ScreenshotPlaceholder tooltip="Test screenshot needed" />);
    expect(screen.getByText('Test screenshot needed')).toBeInTheDocument();
  });

  it('renders camera icon', () => {
    render(<ScreenshotPlaceholder tooltip="Test" />);
    expect(screen.getByLabelText('Camera')).toBeInTheDocument();
  });

  it('has title attribute for hover tooltip', () => {
    render(<ScreenshotPlaceholder tooltip="Hover text for tooltip" />);
    expect(screen.getByTitle('Hover text for tooltip')).toBeInTheDocument();
  });

  it('applies default 16:9 aspect ratio', () => {
    render(<ScreenshotPlaceholder tooltip="Test" />);
    const container = screen.getByTitle('Test');
    expect(container).toHaveStyle({ paddingTop: '56.25%' });
  });

  it('applies 4:3 aspect ratio when specified', () => {
    render(<ScreenshotPlaceholder tooltip="Test" aspectRatio="4:3" />);
    const container = screen.getByTitle('Test');
    expect(container).toHaveStyle({ paddingTop: '75%' });
  });

  it('applies 1:1 aspect ratio when specified', () => {
    render(<ScreenshotPlaceholder tooltip="Test" aspectRatio="1:1" />);
    const container = screen.getByTitle('Test');
    expect(container).toHaveStyle({ paddingTop: '100%' });
  });

  it('applies custom className', () => {
    render(<ScreenshotPlaceholder tooltip="Test" className="custom-class" />);
    const container = screen.getByTitle('Test');
    expect(container).toHaveClass('screenshot-placeholder');
    expect(container).toHaveClass('custom-class');
  });

  it('has correct base styles', () => {
    render(<ScreenshotPlaceholder tooltip="Test" />);
    const container = screen.getByTitle('Test');
    expect(container).toHaveStyle({
      position: 'relative',
      width: '100%',
    });
  });

  it('renders with descriptive text for different screenshot needs', () => {
    const tooltips = [
      'Screenshot needed: Main 3D workspace',
      'Screenshot needed: Cut list modal',
      'Screenshot needed: Cost tracking view',
    ];

    tooltips.forEach((tooltip) => {
      const { unmount } = render(<ScreenshotPlaceholder tooltip={tooltip} />);
      expect(screen.getByText(tooltip)).toBeInTheDocument();
      unmount();
    });
  });
});
