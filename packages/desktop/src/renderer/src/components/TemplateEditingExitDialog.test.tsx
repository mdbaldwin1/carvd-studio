import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplateSetupDialog, TemplateSaveDialog, TemplateDiscardDialog } from './TemplateEditingExitDialog';

describe('TemplateSetupDialog', () => {
  const defaultProps = {
    isOpen: true,
    onConfirm: vi.fn(),
    onCancel: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(<TemplateSetupDialog {...defaultProps} />);

      expect(screen.getByText('Create New Template')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<TemplateSetupDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Create New Template')).not.toBeInTheDocument();
    });

    it('shows name and description inputs', () => {
      render(<TemplateSetupDialog {...defaultProps} />);

      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Description (optional)')).toBeInTheDocument();
    });

    it('shows description text', () => {
      render(<TemplateSetupDialog {...defaultProps} />);

      expect(screen.getByText(/Templates let you save reusable project layouts/)).toBeInTheDocument();
    });
  });

  describe('form interactions', () => {
    it('enables Start Editing button when name is entered', () => {
      render(<TemplateSetupDialog {...defaultProps} />);

      const nameInput = screen.getByLabelText('Name');
      const submitButton = screen.getByText('Start Editing');

      expect(submitButton).toBeDisabled();

      fireEvent.change(nameInput, { target: { value: 'My Template' } });

      expect(submitButton).not.toBeDisabled();
    });

    it('calls onConfirm with name and description when submitted', () => {
      const onConfirm = vi.fn();
      render(<TemplateSetupDialog {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'My Template' } });
      fireEvent.change(screen.getByLabelText('Description (optional)'), {
        target: { value: 'A nice description' }
      });
      fireEvent.click(screen.getByText('Start Editing'));

      expect(onConfirm).toHaveBeenCalledWith('My Template', 'A nice description');
    });

    it('trims whitespace from name and description', () => {
      const onConfirm = vi.fn();
      render(<TemplateSetupDialog {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.change(screen.getByLabelText('Name'), { target: { value: '  My Template  ' } });
      fireEvent.change(screen.getByLabelText('Description (optional)'), {
        target: { value: '  Description  ' }
      });
      fireEvent.click(screen.getByText('Start Editing'));

      expect(onConfirm).toHaveBeenCalledWith('My Template', 'Description');
    });

    it('calls onCancel when Cancel is clicked', () => {
      const onCancel = vi.fn();
      render(<TemplateSetupDialog {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('keyboard interactions', () => {
    it('submits on Enter when name is filled', () => {
      const onConfirm = vi.fn();
      render(<TemplateSetupDialog {...defaultProps} onConfirm={onConfirm} />);

      const nameInput = screen.getByLabelText('Name');
      fireEvent.change(nameInput, { target: { value: 'Test' } });
      fireEvent.keyDown(nameInput, { key: 'Enter' });

      expect(onConfirm).toHaveBeenCalled();
    });

    it('cancels on Escape', () => {
      const onCancel = vi.fn();
      render(<TemplateSetupDialog {...defaultProps} onCancel={onCancel} />);

      const nameInput = screen.getByLabelText('Name');
      fireEvent.keyDown(nameInput, { key: 'Escape' });

      expect(onCancel).toHaveBeenCalled();
    });
  });
});

describe('TemplateSaveDialog', () => {
  const defaultProps = {
    isOpen: true,
    templateName: 'Existing Template',
    templateDescription: 'Existing description',
    onSave: vi.fn(),
    onCancel: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(<TemplateSaveDialog {...defaultProps} />);

      expect(screen.getByRole('heading', { name: 'Save Template' })).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<TemplateSaveDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('heading', { name: 'Save Template' })).not.toBeInTheDocument();
    });

    it('shows "Save New Template" title when creating new', () => {
      render(<TemplateSaveDialog {...defaultProps} isCreatingNew={true} />);

      expect(screen.getByRole('heading', { name: 'Save New Template' })).toBeInTheDocument();
    });

    it('pre-fills name and description', () => {
      render(<TemplateSaveDialog {...defaultProps} />);

      const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
      const descInput = screen.getByLabelText('Description (optional)') as HTMLTextAreaElement;

      expect(nameInput.value).toBe('Existing Template');
      expect(descInput.value).toBe('Existing description');
    });
  });

  describe('form interactions', () => {
    it('calls onSave with name and description', () => {
      const onSave = vi.fn();
      render(<TemplateSaveDialog {...defaultProps} onSave={onSave} />);

      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Name' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save Template' }));

      expect(onSave).toHaveBeenCalledWith('New Name', 'Existing description');
    });

    it('disables save when name is empty', () => {
      render(<TemplateSaveDialog {...defaultProps} />);

      fireEvent.change(screen.getByLabelText('Name'), { target: { value: '' } });
      const saveButton = screen.getByRole('button', { name: 'Save Template' });

      expect(saveButton).toBeDisabled();
    });

    it('calls onCancel when Cancel is clicked', () => {
      const onCancel = vi.fn();
      render(<TemplateSaveDialog {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(onCancel).toHaveBeenCalled();
    });
  });
});

describe('TemplateDiscardDialog', () => {
  const defaultProps = {
    isOpen: true,
    templateName: 'My Template',
    onDiscard: vi.fn(),
    onCancel: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(<TemplateDiscardDialog {...defaultProps} />);

      expect(screen.getByText('Discard Changes?')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<TemplateDiscardDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Discard Changes?')).not.toBeInTheDocument();
    });

    it('shows template name in message when editing', () => {
      render(<TemplateDiscardDialog {...defaultProps} />);

      expect(screen.getByText('My Template')).toBeInTheDocument();
      expect(screen.getByText(/discard changes to/)).toBeInTheDocument();
    });

    it('shows generic message when creating new', () => {
      render(<TemplateDiscardDialog {...defaultProps} isCreatingNew={true} />);

      expect(screen.getByText(/discard this new template/)).toBeInTheDocument();
    });
  });

  describe('button interactions', () => {
    it('calls onDiscard when Discard Changes is clicked', () => {
      const onDiscard = vi.fn();
      render(<TemplateDiscardDialog {...defaultProps} onDiscard={onDiscard} />);

      fireEvent.click(screen.getByText('Discard Changes'));

      expect(onDiscard).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when Keep Editing is clicked', () => {
      const onCancel = vi.fn();
      render(<TemplateDiscardDialog {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByText('Keep Editing'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });
});
