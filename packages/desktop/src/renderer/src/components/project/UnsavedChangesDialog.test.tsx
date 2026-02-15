import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';
import { useProjectStore } from '../../store/projectStore';

describe('UnsavedChangesDialog', () => {
  const defaultProps = {
    isOpen: true,
    action: 'new' as const,
    onSave: vi.fn(),
    onDiscard: vi.fn(),
    onCancel: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useProjectStore.setState({ projectName: 'Test Project' });
  });

  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(<UnsavedChangesDialog {...defaultProps} />);

      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<UnsavedChangesDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
    });

    it('shows the warning message', () => {
      render(<UnsavedChangesDialog {...defaultProps} />);

      expect(screen.getByText("Your changes will be lost if you don't save them.")).toBeInTheDocument();
    });

    it('renders all three action buttons', () => {
      render(<UnsavedChangesDialog {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText("Don't Save")).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });

  describe('action messages', () => {
    it('shows correct message for "new" action', () => {
      render(<UnsavedChangesDialog {...defaultProps} action="new" />);

      expect(screen.getByText(/save changes to "Test Project" before creating a new project/)).toBeInTheDocument();
    });

    it('shows correct message for "open" action', () => {
      render(<UnsavedChangesDialog {...defaultProps} action="open" />);

      expect(screen.getByText(/save changes to "Test Project" before opening another project/)).toBeInTheDocument();
    });

    it('shows correct message for "close" action', () => {
      render(<UnsavedChangesDialog {...defaultProps} action="close" />);

      expect(screen.getByText(/save changes to "Test Project" before closing/)).toBeInTheDocument();
    });

    it('shows default message for "custom" action without customMessage', () => {
      render(<UnsavedChangesDialog {...defaultProps} action="custom" />);

      expect(screen.getByText(/save changes to "Test Project"/)).toBeInTheDocument();
    });

    it('shows custom message when provided', () => {
      render(<UnsavedChangesDialog {...defaultProps} action="custom" customMessage="Custom warning message" />);

      expect(screen.getByText('Custom warning message')).toBeInTheDocument();
    });
  });

  describe('discard button label', () => {
    it('shows "Don\'t Save" for new action', () => {
      render(<UnsavedChangesDialog {...defaultProps} action="new" />);

      expect(screen.getByText("Don't Save")).toBeInTheDocument();
    });

    it('shows "Don\'t Save" for open action', () => {
      render(<UnsavedChangesDialog {...defaultProps} action="open" />);

      expect(screen.getByText("Don't Save")).toBeInTheDocument();
    });

    it('shows "Don\'t Save" for close action', () => {
      render(<UnsavedChangesDialog {...defaultProps} action="close" />);

      expect(screen.getByText("Don't Save")).toBeInTheDocument();
    });

    it('shows "Discard" for custom action', () => {
      render(<UnsavedChangesDialog {...defaultProps} action="custom" />);

      expect(screen.getByText('Discard')).toBeInTheDocument();
    });
  });

  describe('button interactions', () => {
    it('calls onSave when Save button is clicked', () => {
      const onSave = vi.fn();
      render(<UnsavedChangesDialog {...defaultProps} onSave={onSave} />);

      fireEvent.click(screen.getByText('Save'));

      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('calls onDiscard when discard button is clicked', () => {
      const onDiscard = vi.fn();
      render(<UnsavedChangesDialog {...defaultProps} onDiscard={onDiscard} />);

      fireEvent.click(screen.getByText("Don't Save"));

      expect(onDiscard).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when Cancel button is clicked', () => {
      const onCancel = vi.fn();
      render(<UnsavedChangesDialog {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when clicking the overlay', () => {
      const onCancel = vi.fn();
      render(<UnsavedChangesDialog {...defaultProps} onCancel={onCancel} />);

      const overlay = document.querySelector('.modal-overlay')!;
      fireEvent.click(overlay);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('does not call onCancel when clicking the modal content', () => {
      const onCancel = vi.fn();
      render(<UnsavedChangesDialog {...defaultProps} onCancel={onCancel} />);

      const modal = document.querySelector('.modal')!;
      fireEvent.click(modal);

      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe('uses project name from store', () => {
    it('displays the current project name', () => {
      useProjectStore.setState({ projectName: 'My Custom Project' });
      render(<UnsavedChangesDialog {...defaultProps} />);

      expect(screen.getByText(/My Custom Project/)).toBeInTheDocument();
    });
  });
});
