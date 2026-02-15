import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AboutModal } from './AboutModal';

describe('AboutModal', () => {
  const mockOnClose = vi.fn();

  beforeAll(() => {
    window.electronAPI = {
      getAppVersion: vi.fn(),
      openExternal: vi.fn(),
      getPreference: vi.fn(),
      setPreference: vi.fn(),
      onMenuCommand: vi.fn(),
      removeMenuCommandListener: vi.fn(),
      onUpdaterEvent: vi.fn(),
      removeUpdaterEventListener: vi.fn()
    } as unknown as typeof window.electronAPI;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(window.electronAPI.getAppVersion).mockResolvedValue('1.0.0');
    vi.mocked(window.electronAPI.openExternal).mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(<AboutModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('About Carvd Studio')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<AboutModal isOpen={false} onClose={mockOnClose} />);

      expect(screen.queryByText('About Carvd Studio')).not.toBeInTheDocument();
    });

    it('displays app name', () => {
      render(<AboutModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Carvd Studio')).toBeInTheDocument();
    });

    it('displays app description', () => {
      render(<AboutModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/Professional woodworking design software/)).toBeInTheDocument();
    });

    it('displays version from electronAPI', async () => {
      render(<AboutModal isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/Version 1.0.0/)).toBeInTheDocument();
      });
    });

    it('displays copyright with current year', () => {
      render(<AboutModal isOpen={true} onClose={mockOnClose} />);

      const currentYear = new Date().getFullYear();
      expect(screen.getByText(new RegExp(`${currentYear}`))).toBeInTheDocument();
    });

    it('displays disclaimer text', () => {
      render(<AboutModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/provided "as is" without warranty/)).toBeInTheDocument();
    });
  });

  describe('link buttons', () => {
    it('renders Website link button', () => {
      render(<AboutModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Website')).toBeInTheDocument();
    });

    it('renders Documentation link button', () => {
      render(<AboutModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Documentation')).toBeInTheDocument();
    });

    it('renders Privacy Policy link button', () => {
      render(<AboutModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    });

    it('renders Terms of Service link button', () => {
      render(<AboutModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    });

    it('opens website when Website button is clicked', async () => {
      render(<AboutModal isOpen={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('Website'));

      await waitFor(() => {
        expect(window.electronAPI.openExternal).toHaveBeenCalledWith('https://carvd-studio.com');
      });
    });

    it('opens docs when Documentation button is clicked', async () => {
      render(<AboutModal isOpen={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('Documentation'));

      await waitFor(() => {
        expect(window.electronAPI.openExternal).toHaveBeenCalledWith('https://carvd-studio.com/docs');
      });
    });
  });

  describe('close interactions', () => {
    it('calls onClose when Close button is clicked', () => {
      render(<AboutModal isOpen={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('Close'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when X button is clicked', () => {
      render(<AboutModal isOpen={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('×'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed', () => {
      render(<AboutModal isOpen={true} onClose={mockOnClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not respond to Escape when closed', () => {
      render(<AboutModal isOpen={false} onClose={mockOnClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('calls onClose when backdrop is clicked', () => {
      render(<AboutModal isOpen={true} onClose={mockOnClose} />);

      const backdrop = document.querySelector('.modal-backdrop')!;
      fireEvent.mouseDown(backdrop);
      fireEvent.click(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when modal content is clicked', () => {
      render(<AboutModal isOpen={true} onClose={mockOnClose} />);

      const modal = document.querySelector('.modal')!;
      fireEvent.mouseDown(modal);
      fireEvent.click(modal);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('removes keydown listener on unmount', () => {
      const { unmount } = render(<AboutModal isOpen={true} onClose={mockOnClose} />);

      unmount();

      fireEvent.keyDown(window, { key: 'Escape' });
      // The mock was not called because listener was removed
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });
});
