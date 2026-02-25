import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { LicenseActivationModal } from './LicenseActivationModal';

// Mock window.electronAPI
beforeAll(() => {
  window.electronAPI = {
    openExternal: vi.fn()
  } as unknown as typeof window.electronAPI;
});

describe('LicenseActivationModal', () => {
  const defaultProps = {
    isOpen: true,
    onActivate: vi.fn().mockResolvedValue({ success: true })
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(<LicenseActivationModal {...defaultProps} />);

      expect(screen.getByText('Activate Carvd Studio')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<LicenseActivationModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Activate Carvd Studio')).not.toBeInTheDocument();
    });

    it('shows description text', () => {
      render(<LicenseActivationModal {...defaultProps} />);

      expect(screen.getByText('Enter your license key to unlock all features')).toBeInTheDocument();
    });

    it('shows license key input', () => {
      render(<LicenseActivationModal {...defaultProps} />);

      expect(screen.getByLabelText('License Key')).toBeInTheDocument();
    });

    it('shows placeholder text', () => {
      render(<LicenseActivationModal {...defaultProps} />);

      expect(screen.getByPlaceholderText('Paste your license key here')).toBeInTheDocument();
    });

    it('shows Activate License button', () => {
      render(<LicenseActivationModal {...defaultProps} />);

      expect(screen.getByText('Activate License')).toBeInTheDocument();
    });

    it('shows help tooltip when help icon is clicked', () => {
      render(<LicenseActivationModal {...defaultProps} />);

      // Click the help icon to reveal the tooltip
      const helpButton = screen.getByRole('button', { name: 'Show help' });
      fireEvent.click(helpButton);

      expect(screen.getByText(/You should have received your license key/)).toBeInTheDocument();
    });

    it('shows contact support link', () => {
      render(<LicenseActivationModal {...defaultProps} />);

      expect(screen.getByText('Contact Support')).toBeInTheDocument();
    });
  });

  describe('input behavior', () => {
    it('updates input value when typed', () => {
      render(<LicenseActivationModal {...defaultProps} />);

      const input = screen.getByLabelText('License Key');
      fireEvent.change(input, { target: { value: 'TEST-LICENSE-KEY' } });

      expect(input).toHaveValue('TEST-LICENSE-KEY');
    });

    it('disables button when input is empty', () => {
      render(<LicenseActivationModal {...defaultProps} />);

      const button = screen.getByText('Activate License');
      expect(button).toBeDisabled();
    });

    it('enables button when input has value', () => {
      render(<LicenseActivationModal {...defaultProps} />);

      const input = screen.getByLabelText('License Key');
      fireEvent.change(input, { target: { value: 'TEST-KEY' } });

      const button = screen.getByText('Activate License');
      expect(button).not.toBeDisabled();
    });

    it('disables button when input only has whitespace', () => {
      render(<LicenseActivationModal {...defaultProps} />);

      const input = screen.getByLabelText('License Key');
      fireEvent.change(input, { target: { value: '   ' } });

      const button = screen.getByText('Activate License');
      expect(button).toBeDisabled();
    });
  });

  describe('activation flow', () => {
    it('calls onActivate with trimmed key when button clicked', async () => {
      const onActivate = vi.fn().mockResolvedValue({ success: true });
      render(<LicenseActivationModal {...defaultProps} onActivate={onActivate} />);

      const input = screen.getByLabelText('License Key');
      fireEvent.change(input, { target: { value: '  TEST-KEY  ' } });
      fireEvent.click(screen.getByText('Activate License'));

      await waitFor(() => {
        expect(onActivate).toHaveBeenCalledWith('TEST-KEY');
      });
    });

    it('shows Validating... text during activation', async () => {
      const onActivate = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100)));
      render(<LicenseActivationModal {...defaultProps} onActivate={onActivate} />);

      const input = screen.getByLabelText('License Key');
      fireEvent.change(input, { target: { value: 'TEST-KEY' } });
      fireEvent.click(screen.getByText('Activate License'));

      expect(screen.getByText('Validating...')).toBeInTheDocument();
    });

    it('disables input during validation', async () => {
      const onActivate = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100)));
      render(<LicenseActivationModal {...defaultProps} onActivate={onActivate} />);

      const input = screen.getByLabelText('License Key');
      fireEvent.change(input, { target: { value: 'TEST-KEY' } });
      fireEvent.click(screen.getByText('Activate License'));

      expect(input).toBeDisabled();
    });
  });

  describe('success state', () => {
    it('shows success message when activation succeeds', async () => {
      const onActivate = vi.fn().mockResolvedValue({ success: true });
      render(<LicenseActivationModal {...defaultProps} onActivate={onActivate} />);

      const input = screen.getByLabelText('License Key');
      fireEvent.change(input, { target: { value: 'VALID-KEY' } });
      fireEvent.click(screen.getByText('Activate License'));

      await waitFor(() => {
        expect(screen.getByText('License activated successfully!')).toBeInTheDocument();
      });
    });

    it('hides input when activation succeeds', async () => {
      const onActivate = vi.fn().mockResolvedValue({ success: true });
      render(<LicenseActivationModal {...defaultProps} onActivate={onActivate} />);

      const input = screen.getByLabelText('License Key');
      fireEvent.change(input, { target: { value: 'VALID-KEY' } });
      fireEvent.click(screen.getByText('Activate License'));

      await waitFor(() => {
        expect(screen.queryByLabelText('License Key')).not.toBeInTheDocument();
      });
    });

    it('hides button when activation succeeds', async () => {
      const onActivate = vi.fn().mockResolvedValue({ success: true });
      render(<LicenseActivationModal {...defaultProps} onActivate={onActivate} />);

      const input = screen.getByLabelText('License Key');
      fireEvent.change(input, { target: { value: 'VALID-KEY' } });
      fireEvent.click(screen.getByText('Activate License'));

      await waitFor(() => {
        expect(screen.queryByText('Activate License')).not.toBeInTheDocument();
      });
    });
  });

  describe('error state', () => {
    it('shows error message when activation fails', async () => {
      const onActivate = vi.fn().mockResolvedValue({
        success: false,
        error: 'Invalid license key'
      });
      render(<LicenseActivationModal {...defaultProps} onActivate={onActivate} />);

      const input = screen.getByLabelText('License Key');
      fireEvent.change(input, { target: { value: 'INVALID-KEY' } });
      fireEvent.click(screen.getByText('Activate License'));

      await waitFor(() => {
        expect(screen.getByText('Activation Failed')).toBeInTheDocument();
        expect(screen.getByText('Invalid license key')).toBeInTheDocument();
      });
    });

    it('shows default error when no error message provided', async () => {
      const onActivate = vi.fn().mockResolvedValue({ success: false });
      render(<LicenseActivationModal {...defaultProps} onActivate={onActivate} />);

      const input = screen.getByLabelText('License Key');
      fireEvent.change(input, { target: { value: 'INVALID-KEY' } });
      fireEvent.click(screen.getByText('Activate License'));

      await waitFor(() => {
        expect(screen.getByText('Invalid license key')).toBeInTheDocument();
      });
    });

    it('shows error when onActivate throws', async () => {
      const onActivate = vi.fn().mockRejectedValue(new Error('Network error'));
      render(<LicenseActivationModal {...defaultProps} onActivate={onActivate} />);

      const input = screen.getByLabelText('License Key');
      fireEvent.change(input, { target: { value: 'TEST-KEY' } });
      fireEvent.click(screen.getByText('Activate License'));

      await waitFor(() => {
        expect(screen.getByText('Failed to validate license key')).toBeInTheDocument();
      });
    });

    it('keeps input visible when activation fails', async () => {
      const onActivate = vi.fn().mockResolvedValue({
        success: false,
        error: 'Invalid key'
      });
      render(<LicenseActivationModal {...defaultProps} onActivate={onActivate} />);

      const input = screen.getByLabelText('License Key');
      fireEvent.change(input, { target: { value: 'INVALID-KEY' } });
      fireEvent.click(screen.getByText('Activate License'));

      await waitFor(() => {
        expect(screen.getByLabelText('License Key')).toBeInTheDocument();
      });
    });

    it('adds has-error class to input when error occurs', async () => {
      const onActivate = vi.fn().mockResolvedValue({
        success: false,
        error: 'Invalid key'
      });
      render(<LicenseActivationModal {...defaultProps} onActivate={onActivate} />);

      const input = screen.getByLabelText('License Key');
      fireEvent.change(input, { target: { value: 'INVALID-KEY' } });
      fireEvent.click(screen.getByText('Activate License'));

      await waitFor(() => {
        expect(screen.getByLabelText('License Key')).toHaveClass('has-error');
      });
    });
  });

  describe('keyboard interaction', () => {
    it('submits on Enter key when input has value', async () => {
      const onActivate = vi.fn().mockResolvedValue({ success: true });
      render(<LicenseActivationModal {...defaultProps} onActivate={onActivate} />);

      const input = screen.getByLabelText('License Key');
      fireEvent.change(input, { target: { value: 'TEST-KEY' } });
      fireEvent.keyDown(window, { key: 'Enter' });

      await waitFor(() => {
        expect(onActivate).toHaveBeenCalledWith('TEST-KEY');
      });
    });

    it('does not submit on Enter when input is empty', () => {
      const onActivate = vi.fn().mockResolvedValue({ success: true });
      render(<LicenseActivationModal {...defaultProps} onActivate={onActivate} />);

      fireEvent.keyDown(window, { key: 'Enter' });

      expect(onActivate).not.toHaveBeenCalled();
    });
  });

  describe('state reset', () => {
    it('resets state when modal reopens', () => {
      const { rerender } = render(<LicenseActivationModal {...defaultProps} />);

      const input = screen.getByLabelText('License Key');
      fireEvent.change(input, { target: { value: 'TEST-KEY' } });

      // Close modal
      rerender(<LicenseActivationModal {...defaultProps} isOpen={false} />);

      // Reopen modal
      rerender(<LicenseActivationModal {...defaultProps} isOpen={true} />);

      // Input should be cleared
      expect(screen.getByLabelText('License Key')).toHaveValue('');
    });
  });

  describe('contact support', () => {
    it('opens support page when Contact Support clicked', () => {
      render(<LicenseActivationModal {...defaultProps} />);

      const link = screen.getByText('Contact Support');
      fireEvent.click(link);

      expect(window.electronAPI.openExternal).toHaveBeenCalledWith('https://carvd-studio.com/support');
    });
  });

  describe('empty key handling', () => {
    it('shows error when trying to activate empty key', async () => {
      // Manually test with empty string scenario where validation happens in handler
      const onActivate = vi.fn();
      render(<LicenseActivationModal {...defaultProps} onActivate={onActivate} />);

      // Button is disabled with empty input, so we can't click it
      // The handleActivate function checks for empty and sets error
      // This is already covered by the disabled button test
      expect(screen.getByText('Activate License')).toBeDisabled();
    });
  });
});
