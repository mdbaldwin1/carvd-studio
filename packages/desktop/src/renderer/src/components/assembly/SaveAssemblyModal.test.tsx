import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SaveAssemblyModal } from './SaveAssemblyModal';
import { useProjectStore } from '../../store/projectStore';
import { useSelectionStore } from '../../store/selectionStore';

describe('SaveAssemblyModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn()
  };

  const mockAssembly = {
    id: 'assembly-1',
    name: 'Test Assembly',
    parts: [],
    groups: [],
    groupMembers: [],
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up store with some selected parts
    useSelectionStore.setState({
      selectedPartIds: ['part-1', 'part-2'],
      selectedGroupIds: []
    });
    useProjectStore.setState({
      createAssemblyFromSelection: vi.fn().mockReturnValue(mockAssembly)
    });
  });

  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(<SaveAssemblyModal {...defaultProps} />);

      expect(screen.getByText('Save as Assembly')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<SaveAssemblyModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Save as Assembly')).not.toBeInTheDocument();
    });

    it('shows modal description', () => {
      render(<SaveAssemblyModal {...defaultProps} />);

      expect(screen.getByText(/Save the current selection as a reusable assembly/)).toBeInTheDocument();
    });

    it('renders name input', () => {
      render(<SaveAssemblyModal {...defaultProps} />);

      expect(screen.getByPlaceholderText(/e.g., Drawer Assembly/)).toBeInTheDocument();
    });

    it('renders description textarea', () => {
      render(<SaveAssemblyModal {...defaultProps} />);

      expect(screen.getByPlaceholderText(/e.g., Standard drawer/)).toBeInTheDocument();
    });

    it('renders "Add to Library" checkbox', () => {
      render(<SaveAssemblyModal {...defaultProps} />);

      expect(screen.getByText('Also add to my Assembly Library')).toBeInTheDocument();
    });
  });

  describe('default name generation', () => {
    it('generates name based on part count', () => {
      useSelectionStore.setState({
        selectedPartIds: ['part-1', 'part-2', 'part-3'],
        selectedGroupIds: []
      });

      render(<SaveAssemblyModal {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText(/e.g., Drawer Assembly/) as HTMLInputElement;
      expect(nameInput.value).toBe('Assembly (3 parts)');
    });

    it('uses singular "part" for single part', () => {
      useSelectionStore.setState({
        selectedPartIds: ['part-1'],
        selectedGroupIds: []
      });

      render(<SaveAssemblyModal {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText(/e.g., Drawer Assembly/) as HTMLInputElement;
      expect(nameInput.value).toBe('Assembly (1 part)');
    });

    it('generates name based on group count when only groups selected', () => {
      useSelectionStore.setState({
        selectedPartIds: [],
        selectedGroupIds: ['group-1', 'group-2']
      });

      render(<SaveAssemblyModal {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText(/e.g., Drawer Assembly/) as HTMLInputElement;
      expect(nameInput.value).toBe('Assembly (2 groups)');
    });
  });

  describe('form validation', () => {
    it('shows warning when no selection', () => {
      useSelectionStore.setState({
        selectedPartIds: [],
        selectedGroupIds: []
      });

      render(<SaveAssemblyModal {...defaultProps} />);

      expect(screen.getByText('No parts or groups selected.')).toBeInTheDocument();
    });

    it('disables Save button when no selection', () => {
      useSelectionStore.setState({
        selectedPartIds: [],
        selectedGroupIds: []
      });

      render(<SaveAssemblyModal {...defaultProps} />);

      expect(screen.getByText('Save Assembly')).toBeDisabled();
    });

    it('shows error when name is empty and form is submitted', () => {
      render(<SaveAssemblyModal {...defaultProps} />);

      // Clear the name input
      const nameInput = screen.getByPlaceholderText(/e.g., Drawer Assembly/);
      fireEvent.change(nameInput, { target: { value: '' } });

      // Submit the form
      fireEvent.click(screen.getByText('Save Assembly'));

      expect(screen.getByText('Please enter a name')).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('calls onSave with assembly and addToLibrary flag', () => {
      const onSave = vi.fn();
      render(<SaveAssemblyModal {...defaultProps} onSave={onSave} />);

      // Fill in name
      const nameInput = screen.getByPlaceholderText(/e.g., Drawer Assembly/);
      fireEvent.change(nameInput, { target: { value: 'My Assembly' } });

      // Submit
      fireEvent.click(screen.getByText('Save Assembly'));

      expect(onSave).toHaveBeenCalledWith(mockAssembly, true);
    });

    it('calls onClose after successful save', () => {
      const onClose = vi.fn();
      render(<SaveAssemblyModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Save Assembly'));

      expect(onClose).toHaveBeenCalled();
    });

    it('includes description when provided', () => {
      render(<SaveAssemblyModal {...defaultProps} />);

      const descInput = screen.getByPlaceholderText(/e.g., Standard drawer/);
      fireEvent.change(descInput, { target: { value: 'Test description' } });

      fireEvent.click(screen.getByText('Save Assembly'));

      const createFn = useProjectStore.getState().createAssemblyFromSelection;
      expect(createFn).toHaveBeenCalledWith(expect.any(String), 'Test description');
    });

    it('respects addToLibrary checkbox state', () => {
      const onSave = vi.fn();
      render(<SaveAssemblyModal {...defaultProps} onSave={onSave} />);

      // Uncheck the checkbox
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      fireEvent.click(screen.getByText('Save Assembly'));

      expect(onSave).toHaveBeenCalledWith(mockAssembly, false);
    });
  });

  describe('close interactions', () => {
    it('calls onClose when Cancel is clicked', () => {
      const onClose = vi.fn();
      render(<SaveAssemblyModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when X button is clicked', () => {
      const onClose = vi.fn();
      render(<SaveAssemblyModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('×'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when overlay is clicked', () => {
      const onClose = vi.fn();
      const { container } = render(<SaveAssemblyModal {...defaultProps} onClose={onClose} />);

      const overlay = container.firstChild as HTMLElement;
      fireEvent.click(overlay);

      expect(onClose).toHaveBeenCalled();
    });

    it('does not close when modal content is clicked', () => {
      const onClose = vi.fn();
      render(<SaveAssemblyModal {...defaultProps} onClose={onClose} />);

      const modal = screen.getByRole('dialog');
      fireEvent.click(modal);

      expect(onClose).not.toHaveBeenCalled();
    });

    it('calls onClose when Escape is pressed', () => {
      const onClose = vi.fn();
      const { container } = render(<SaveAssemblyModal {...defaultProps} onClose={onClose} />);

      const overlay = container.firstChild as HTMLElement;
      fireEvent.keyDown(overlay, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });
  });
});
