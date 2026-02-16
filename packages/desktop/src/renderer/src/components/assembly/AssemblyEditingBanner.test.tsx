import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssemblyEditingBanner } from './AssemblyEditingBanner';

describe('AssemblyEditingBanner', () => {
  const defaultProps = {
    assemblyName: 'Bookshelf',
    onSave: vi.fn(),
    onCancel: vi.fn()
  };

  describe('rendering', () => {
    it('renders the banner', () => {
      const { container } = render(<AssemblyEditingBanner {...defaultProps} />);

      expect(container.querySelector('.bg-accent')).toBeInTheDocument();
    });

    it('displays assembly name when editing', () => {
      render(<AssemblyEditingBanner {...defaultProps} />);

      expect(screen.getByText('Bookshelf')).toBeInTheDocument();
      expect(screen.getByText(/Editing assembly:/)).toBeInTheDocument();
    });

    it('displays "Creating new assembly" when isCreatingNew is true', () => {
      render(<AssemblyEditingBanner {...defaultProps} isCreatingNew={true} />);

      expect(screen.getByText(/Creating new assembly:/)).toBeInTheDocument();
    });

    it('displays banner icon', () => {
      render(<AssemblyEditingBanner {...defaultProps} />);

      expect(screen.getByText('📦')).toBeInTheDocument();
    });

    it('renders Cancel button', () => {
      render(<AssemblyEditingBanner {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('renders Save to Library button', () => {
      render(<AssemblyEditingBanner {...defaultProps} />);

      expect(screen.getByText('Save to Library')).toBeInTheDocument();
    });

    it('Cancel button has title attribute', () => {
      render(<AssemblyEditingBanner {...defaultProps} />);

      expect(screen.getByTitle('Cancel editing')).toBeInTheDocument();
    });

    it('Save button has title attribute', () => {
      render(<AssemblyEditingBanner {...defaultProps} />);

      expect(screen.getByTitle('Save changes to library')).toBeInTheDocument();
    });
  });

  describe('button interactions', () => {
    it('calls onCancel when Cancel button is clicked', () => {
      const onCancel = vi.fn();
      render(<AssemblyEditingBanner {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onSave when Save to Library button is clicked', () => {
      const onSave = vi.fn();
      render(<AssemblyEditingBanner {...defaultProps} onSave={onSave} />);

      fireEvent.click(screen.getByText('Save to Library'));

      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });

  describe('different assembly names', () => {
    it('displays custom assembly name', () => {
      render(<AssemblyEditingBanner {...defaultProps} assemblyName="Coffee Table" />);

      expect(screen.getByText('Coffee Table')).toBeInTheDocument();
    });

    it('displays name with special characters', () => {
      render(<AssemblyEditingBanner {...defaultProps} assemblyName="Table & Chairs (Set)" />);

      expect(screen.getByText('Table & Chairs (Set)')).toBeInTheDocument();
    });
  });
});
