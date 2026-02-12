import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssemblyEditingExitDialog } from './AssemblyEditingExitDialog';

describe('AssemblyEditingExitDialog', () => {
  const defaultProps = {
    isOpen: true,
    assemblyName: 'Bookshelf',
    onSave: vi.fn(),
    onDiscard: vi.fn(),
    onCancel: vi.fn()
  };

  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(<AssemblyEditingExitDialog {...defaultProps} />);

      expect(screen.getByText('Save Changes?')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<AssemblyEditingExitDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Save Changes?')).not.toBeInTheDocument();
    });

    it('displays assembly name', () => {
      render(<AssemblyEditingExitDialog {...defaultProps} />);

      expect(screen.getByText('Bookshelf')).toBeInTheDocument();
    });

    it('shows "Save Assembly?" title when creating new', () => {
      render(<AssemblyEditingExitDialog {...defaultProps} isCreatingNew={true} />);

      expect(screen.getByText('Save Assembly?')).toBeInTheDocument();
    });

    it('shows message about new assembly when creating', () => {
      render(<AssemblyEditingExitDialog {...defaultProps} isCreatingNew={true} />);

      expect(screen.getByText(/unsaved changes to your new assembly/)).toBeInTheDocument();
    });

    it('shows message about changes when editing', () => {
      render(<AssemblyEditingExitDialog {...defaultProps} isCreatingNew={false} />);

      expect(screen.getByText(/unsaved changes to/)).toBeInTheDocument();
    });
  });

  describe('button labels', () => {
    it('shows "Keep Editing" button', () => {
      render(<AssemblyEditingExitDialog {...defaultProps} />);

      expect(screen.getByText('Keep Editing')).toBeInTheDocument();
    });

    it('shows "Save to Library" button', () => {
      render(<AssemblyEditingExitDialog {...defaultProps} />);

      expect(screen.getByText('Save to Library')).toBeInTheDocument();
    });

    it('shows "Discard Changes" when editing existing', () => {
      render(<AssemblyEditingExitDialog {...defaultProps} isCreatingNew={false} />);

      expect(screen.getByText('Discard Changes')).toBeInTheDocument();
    });

    it('shows "Discard" when creating new', () => {
      render(<AssemblyEditingExitDialog {...defaultProps} isCreatingNew={true} />);

      expect(screen.getByText('Discard')).toBeInTheDocument();
    });
  });

  describe('button interactions', () => {
    it('calls onSave when "Save to Library" is clicked', () => {
      const onSave = vi.fn();
      render(<AssemblyEditingExitDialog {...defaultProps} onSave={onSave} />);

      fireEvent.click(screen.getByText('Save to Library'));

      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('calls onDiscard when discard button is clicked', () => {
      const onDiscard = vi.fn();
      render(<AssemblyEditingExitDialog {...defaultProps} onDiscard={onDiscard} />);

      fireEvent.click(screen.getByText('Discard Changes'));

      expect(onDiscard).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when "Keep Editing" is clicked', () => {
      const onCancel = vi.fn();
      render(<AssemblyEditingExitDialog {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByText('Keep Editing'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('question text', () => {
    it('asks about saving assembly when creating new', () => {
      render(<AssemblyEditingExitDialog {...defaultProps} isCreatingNew={true} />);

      expect(screen.getByText(/save this assembly to the library/)).toBeInTheDocument();
    });

    it('asks about saving changes when editing', () => {
      render(<AssemblyEditingExitDialog {...defaultProps} isCreatingNew={false} />);

      expect(screen.getByText(/save your changes to the library/)).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('has modal-overlay class on container', () => {
      const { container } = render(<AssemblyEditingExitDialog {...defaultProps} />);

      expect(container.querySelector('.modal-overlay')).toBeInTheDocument();
    });

    it('has assembly-exit-dialog class on modal', () => {
      const { container } = render(<AssemblyEditingExitDialog {...defaultProps} />);

      expect(container.querySelector('.assembly-exit-dialog')).toBeInTheDocument();
    });
  });
});
