import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { useAppSettingsStore } from '../../store/appSettingsStore';

// Mock sonner so we can inspect props passed to Toaster
const MockSonnerToaster = vi.fn(() => <div data-testid="sonner-toaster" />);
vi.mock('sonner', () => ({
  Toaster: (props: Record<string, unknown>) => MockSonnerToaster(props),
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn()
  })
}));

import { Toaster } from './sonner';

describe('Toaster', () => {
  beforeEach(() => {
    MockSonnerToaster.mockClear();
    useAppSettingsStore.setState({ theme: 'dark' });
  });

  it('renders the sonner Toaster', () => {
    const { getByTestId } = render(<Toaster />);

    expect(getByTestId('sonner-toaster')).toBeInTheDocument();
  });

  it('passes dark theme from app settings', () => {
    useAppSettingsStore.setState({ theme: 'dark' });

    render(<Toaster />);

    expect(MockSonnerToaster).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'dark' })
    );
  });

  it('passes light theme from app settings', () => {
    useAppSettingsStore.setState({ theme: 'light' });

    render(<Toaster />);

    expect(MockSonnerToaster).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'light' })
    );
  });

  it('uses bottom-center position with offset', () => {
    render(<Toaster />);

    expect(MockSonnerToaster).toHaveBeenCalledWith(
      expect.objectContaining({
        position: 'bottom-center',
        offset: 60
      })
    );
  });

  it('enables rich colors and sets 2s duration', () => {
    render(<Toaster />);

    expect(MockSonnerToaster).toHaveBeenCalledWith(
      expect.objectContaining({
        richColors: true,
        duration: 2000
      })
    );
  });
});
