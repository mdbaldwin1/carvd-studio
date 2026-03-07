import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PartCutsEditingExitDialog } from './PartCutsEditingExitDialog';

describe('PartCutsEditingExitDialog', () => {
  const defaultProps = {
    isOpen: true,
    partName: 'Side',
    onSave: vi.fn(),
    onDiscard: vi.fn(),
    onCancel: vi.fn()
  };

  it('renders part name copy', () => {
    render(<PartCutsEditingExitDialog {...defaultProps} />);
    expect(screen.getByText('Save Part Cuts?')).toBeInTheDocument();
    expect(screen.getByText(/You have unsaved cut edits for/i)).toBeInTheDocument();
    expect(screen.getByText('Side')).toBeInTheDocument();
  });

  it('calls action handlers', () => {
    const onSave = vi.fn();
    const onDiscard = vi.fn();
    const onCancel = vi.fn();
    render(<PartCutsEditingExitDialog {...defaultProps} onSave={onSave} onDiscard={onDiscard} onCancel={onCancel} />);

    fireEvent.click(screen.getByText('Save'));
    fireEvent.click(screen.getByText('Discard'));
    fireEvent.click(screen.getByText('Keep Editing'));

    expect(onSave).toHaveBeenCalled();
    expect(onDiscard).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });
});
