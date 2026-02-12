import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    onConfirm: vi.fn(),
    onCancel: vi.fn()
  };

  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<ConfirmDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
    });

    it('renders default button labels', () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(screen.getByText('Confirm')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('renders custom button labels', () => {
      render(<ConfirmDialog {...defaultProps} confirmLabel="Delete" cancelLabel="Keep" />);

      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Keep')).toBeInTheDocument();
    });

    it('shows warning icon for danger variant', () => {
      render(<ConfirmDialog {...defaultProps} variant="danger" />);

      expect(screen.getByText('⚠️')).toBeInTheDocument();
    });

    it('does not show warning icon for primary variant', () => {
      render(<ConfirmDialog {...defaultProps} variant="primary" />);

      expect(screen.queryByText('⚠️')).not.toBeInTheDocument();
    });

    it('applies danger class to confirm button for danger variant', () => {
      render(<ConfirmDialog {...defaultProps} variant="danger" />);

      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton).toHaveClass('btn-danger');
    });

    it('applies primary class to confirm button by default', () => {
      render(<ConfirmDialog {...defaultProps} />);

      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton).toHaveClass('btn-primary');
    });
  });

  describe('button interactions', () => {
    it('calls onConfirm when confirm button is clicked', () => {
      const onConfirm = vi.fn();
      render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByText('Confirm'));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn();
      render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when close button is clicked', () => {
      const onCancel = vi.fn();
      render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByText('×'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('keyboard interactions', () => {
    it('calls onCancel when Escape is pressed', () => {
      const onCancel = vi.fn();
      render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onConfirm when Enter is pressed', () => {
      const onConfirm = vi.fn();
      render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.keyDown(window, { key: 'Enter' });

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('does not respond to keyboard when closed', () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();
      render(<ConfirmDialog {...defaultProps} isOpen={false} onConfirm={onConfirm} onCancel={onCancel} />);

      fireEvent.keyDown(window, { key: 'Escape' });
      fireEvent.keyDown(window, { key: 'Enter' });

      expect(onConfirm).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe('backdrop interactions', () => {
    it('calls onCancel when backdrop is clicked (mousedown + click on same element)', () => {
      const onCancel = vi.fn();
      render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

      const backdrop = screen.getByText('Confirm Action').closest('.modal-backdrop');
      // Simulate proper backdrop click (mousedown then click on backdrop)
      fireEvent.mouseDown(backdrop!);
      fireEvent.click(backdrop!);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('does not close when clicking inside modal content', () => {
      const onCancel = vi.fn();
      render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

      const modalContent = screen.getByText('Confirm Action').closest('.modal');
      fireEvent.mouseDown(modalContent!);
      fireEvent.click(modalContent!);

      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('removes keyboard listener on unmount', () => {
      const onConfirm = vi.fn();
      const { unmount } = render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

      unmount();

      // After unmount, keyboard events should not trigger callbacks
      fireEvent.keyDown(window, { key: 'Enter' });
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });
});
