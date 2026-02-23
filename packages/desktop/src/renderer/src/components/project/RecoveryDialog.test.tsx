import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecoveryDialog } from './RecoveryDialog';

describe('RecoveryDialog', () => {
  const mockRecoveryInfo = {
    projectName: 'My Project',
    modifiedAt: '2024-01-15T10:30:00.000Z',
    fileName: 'my-project-recovery.carvd'
  };

  const defaultProps = {
    isOpen: true,
    recoveryInfo: mockRecoveryInfo,
    onRestore: vi.fn(),
    onDiscard: vi.fn()
  };

  describe('rendering', () => {
    it('renders when isOpen is true and recoveryInfo is provided', () => {
      render(<RecoveryDialog {...defaultProps} />);

      expect(screen.getByText('Recover Unsaved Work')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<RecoveryDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Recover Unsaved Work')).not.toBeInTheDocument();
    });

    it('does not render when recoveryInfo is null', () => {
      render(<RecoveryDialog {...defaultProps} recoveryInfo={null} />);

      expect(screen.queryByText('Recover Unsaved Work')).not.toBeInTheDocument();
    });

    it('displays recovery message', () => {
      render(<RecoveryDialog {...defaultProps} />);

      expect(screen.getByText(/recovery file was found/)).toBeInTheDocument();
    });

    it('displays project name', () => {
      render(<RecoveryDialog {...defaultProps} />);

      expect(screen.getByText('My Project')).toBeInTheDocument();
    });

    it('displays formatted date', () => {
      render(<RecoveryDialog {...defaultProps} />);

      // The date will be formatted according to locale
      // Just check that something appears for "Last Modified"
      expect(screen.getByText('Last Modified:')).toBeInTheDocument();
    });

    it('displays recovery question', () => {
      render(<RecoveryDialog {...defaultProps} />);

      expect(screen.getByText('Would you like to restore this work?')).toBeInTheDocument();
    });

    it('renders Restore button', () => {
      render(<RecoveryDialog {...defaultProps} />);

      expect(screen.getByText('Restore')).toBeInTheDocument();
    });

    it('renders Discard button', () => {
      render(<RecoveryDialog {...defaultProps} />);

      expect(screen.getByText('Discard')).toBeInTheDocument();
    });

    it('renders with alertdialog role', () => {
      render(<RecoveryDialog {...defaultProps} />);

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });
  });

  describe('button interactions', () => {
    it('calls onRestore when Restore button is clicked', () => {
      const onRestore = vi.fn();
      render(<RecoveryDialog {...defaultProps} onRestore={onRestore} />);

      fireEvent.click(screen.getByText('Restore'));

      expect(onRestore).toHaveBeenCalledTimes(1);
    });

    it('calls onDiscard when Discard button is clicked', () => {
      const onDiscard = vi.fn();
      render(<RecoveryDialog {...defaultProps} onDiscard={onDiscard} />);

      fireEvent.click(screen.getByText('Discard'));

      expect(onDiscard).toHaveBeenCalledTimes(1);
    });
  });
});
