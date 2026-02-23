import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplateEditingBanner } from './TemplateEditingBanner';

describe('TemplateEditingBanner', () => {
  const defaultProps = {
    templateName: 'Simple Desk',
    onSave: vi.fn(),
    onDiscard: vi.fn()
  };

  describe('rendering', () => {
    it('renders the banner', () => {
      render(<TemplateEditingBanner {...defaultProps} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('displays template name when editing', () => {
      render(<TemplateEditingBanner {...defaultProps} />);

      expect(screen.getByText('Simple Desk')).toBeInTheDocument();
      expect(screen.getByText(/Editing template:/)).toBeInTheDocument();
    });

    it('displays "Creating new template" when isCreatingNew is true', () => {
      render(<TemplateEditingBanner {...defaultProps} isCreatingNew={true} />);

      expect(screen.getByText(/Creating new template:/)).toBeInTheDocument();
    });

    it('displays "Untitled" when isCreatingNew is true and name is empty', () => {
      render(<TemplateEditingBanner {...defaultProps} templateName="" isCreatingNew={true} />);

      expect(screen.getByText('Untitled')).toBeInTheDocument();
    });

    it('displays banner icon', () => {
      render(<TemplateEditingBanner {...defaultProps} />);

      expect(screen.getByText('📐')).toBeInTheDocument();
    });

    it('renders Discard button', () => {
      render(<TemplateEditingBanner {...defaultProps} />);

      expect(screen.getByText('Discard')).toBeInTheDocument();
    });

    it('renders Save Template button', () => {
      render(<TemplateEditingBanner {...defaultProps} />);

      expect(screen.getByText('Save Template')).toBeInTheDocument();
    });

    it('Discard button has title attribute', () => {
      render(<TemplateEditingBanner {...defaultProps} />);

      expect(screen.getByTitle('Discard changes')).toBeInTheDocument();
    });

    it('Save button has title attribute', () => {
      render(<TemplateEditingBanner {...defaultProps} />);

      expect(screen.getByTitle('Save template')).toBeInTheDocument();
    });
  });

  describe('button interactions', () => {
    it('calls onDiscard when Discard button is clicked', () => {
      const onDiscard = vi.fn();
      render(<TemplateEditingBanner {...defaultProps} onDiscard={onDiscard} />);

      fireEvent.click(screen.getByText('Discard'));

      expect(onDiscard).toHaveBeenCalledTimes(1);
    });

    it('calls onSave when Save Template button is clicked', () => {
      const onSave = vi.fn();
      render(<TemplateEditingBanner {...defaultProps} onSave={onSave} />);

      fireEvent.click(screen.getByText('Save Template'));

      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });
});
