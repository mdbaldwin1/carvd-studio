import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColorPicker } from './ColorPicker';

// Mock useCustomColors hook
vi.mock('../hooks/useCustomColors', () => ({
  useCustomColors: vi.fn()
}));

import { useCustomColors } from '../hooks/useCustomColors';

// Get the mocked function with proper typing
const mockUseCustomColors = vi.mocked(useCustomColors);

describe('ColorPicker', () => {
  const mockOnChange = vi.fn();
  const mockAddColor = vi.fn();
  const mockRemoveColor = vi.fn();
  const mockHasColor = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockHasColor.mockReturnValue(false);
    mockUseCustomColors.mockReturnValue({
      customColors: [],
      addColor: mockAddColor,
      removeColor: mockRemoveColor,
      hasColor: mockHasColor,
      isLoading: false
    });
  });

  describe('rendering', () => {
    it('renders color input element', () => {
      render(<ColorPicker value="#ff0000" onChange={mockOnChange} />);

      const colorInput = document.querySelector('input[type="color"]');
      expect(colorInput).toBeInTheDocument();
    });

    it('renders with the provided value', () => {
      render(<ColorPicker value="#ff0000" onChange={mockOnChange} />);

      const colorInput = document.querySelector('input[type="color"]') as HTMLInputElement;
      expect(colorInput.value).toBe('#ff0000');
    });

    it('renders preset color buttons', () => {
      render(<ColorPicker value="#ff0000" onChange={mockOnChange} />);

      // STOCK_COLORS has preset colors - check we have buttons
      const presetButtons = document.querySelectorAll('.color-preset');
      expect(presetButtons.length).toBeGreaterThan(0);
    });

    it('highlights selected preset color', () => {
      render(<ColorPicker value="#c4a574" onChange={mockOnChange} />);

      // #c4a574 is one of the STOCK_COLORS
      const selectedButton = document.querySelector('.color-preset.selected');
      expect(selectedButton).toBeInTheDocument();
    });
  });

  describe('color selection', () => {
    it('calls onChange when color input changes', () => {
      render(<ColorPicker value="#ff0000" onChange={mockOnChange} />);

      const colorInput = document.querySelector('input[type="color"]')!;
      fireEvent.change(colorInput, { target: { value: '#00ff00' } });

      expect(mockOnChange).toHaveBeenCalledWith('#00ff00');
    });

    it('calls onChange when preset button is clicked', () => {
      render(<ColorPicker value="#ff0000" onChange={mockOnChange} />);

      const presetButtons = document.querySelectorAll('.color-preset');
      fireEvent.click(presetButtons[0]);

      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  describe('custom colors', () => {
    it('shows custom colors section when there are custom colors', () => {
      mockUseCustomColors.mockReturnValue({
        customColors: ['#123456'],
        addColor: mockAddColor,
        removeColor: mockRemoveColor,
        hasColor: mockHasColor,
        isLoading: false
      });

      render(<ColorPicker value="#ff0000" onChange={mockOnChange} />);

      expect(screen.getByText('Custom Colors')).toBeInTheDocument();
    });

    it('hides custom colors section when showCustomColors is false', () => {
      mockUseCustomColors.mockReturnValue({
        customColors: ['#123456'],
        addColor: mockAddColor,
        removeColor: mockRemoveColor,
        hasColor: mockHasColor,
        isLoading: false
      });

      render(<ColorPicker value="#ff0000" onChange={mockOnChange} showCustomColors={false} />);

      expect(screen.queryByText('Custom Colors')).not.toBeInTheDocument();
    });

    it('renders custom color buttons', () => {
      mockUseCustomColors.mockReturnValue({
        customColors: ['#123456', '#abcdef'],
        addColor: mockAddColor,
        removeColor: mockRemoveColor,
        hasColor: mockHasColor,
        isLoading: false
      });

      render(<ColorPicker value="#ff0000" onChange={mockOnChange} />);

      const customColorWrappers = document.querySelectorAll('.custom-color-wrapper');
      expect(customColorWrappers).toHaveLength(2);
    });

    it('calls onChange when custom color is clicked', () => {
      mockUseCustomColors.mockReturnValue({
        customColors: ['#123456'],
        addColor: mockAddColor,
        removeColor: mockRemoveColor,
        hasColor: mockHasColor,
        isLoading: false
      });

      render(<ColorPicker value="#ff0000" onChange={mockOnChange} />);

      const customColorButton = document.querySelector('.custom-color-wrapper .color-preset')!;
      fireEvent.click(customColorButton);

      expect(mockOnChange).toHaveBeenCalledWith('#123456');
    });

    it('calls removeColor when remove button is clicked', () => {
      mockUseCustomColors.mockReturnValue({
        customColors: ['#123456'],
        addColor: mockAddColor,
        removeColor: mockRemoveColor,
        hasColor: mockHasColor,
        isLoading: false
      });

      render(<ColorPicker value="#ff0000" onChange={mockOnChange} />);

      const removeButton = document.querySelector('.remove-custom-color')!;
      fireEvent.click(removeButton);

      // The handler calls removeColor with just the color
      expect(mockRemoveColor).toHaveBeenCalledWith('#123456');
    });
  });

  describe('adding custom colors', () => {
    it('shows "Save Color" button for custom colors not in palette', () => {
      // A color that's not in STOCK_COLORS and not already saved
      mockHasColor.mockReturnValue(false);

      render(<ColorPicker value="#123456" onChange={mockOnChange} />);

      expect(screen.getByText('Save Color')).toBeInTheDocument();
    });

    it('does not show "Save Color" for preset colors', () => {
      // #c4a574 is a STOCK_COLOR
      render(<ColorPicker value="#c4a574" onChange={mockOnChange} />);

      expect(screen.queryByText('Save Color')).not.toBeInTheDocument();
    });

    it('does not show "Save Color" when color is already saved', () => {
      mockHasColor.mockReturnValue(true);
      mockUseCustomColors.mockReturnValue({
        customColors: ['#123456'],
        addColor: mockAddColor,
        removeColor: mockRemoveColor,
        hasColor: mockHasColor,
        isLoading: false
      });

      render(<ColorPicker value="#123456" onChange={mockOnChange} />);

      expect(screen.queryByText('Save Color')).not.toBeInTheDocument();
    });

    it('shows confirmation dialog when "Save Color" is clicked', () => {
      mockHasColor.mockReturnValue(false);

      render(<ColorPicker value="#123456" onChange={mockOnChange} />);

      fireEvent.click(screen.getByText('Save Color'));

      expect(screen.getByText('Save this color?')).toBeInTheDocument();
    });

    it('calls addColor when Save is confirmed', () => {
      mockHasColor.mockReturnValue(false);

      render(<ColorPicker value="#123456" onChange={mockOnChange} />);

      fireEvent.click(screen.getByText('Save Color'));
      fireEvent.click(screen.getByText('Save'));

      expect(mockAddColor).toHaveBeenCalledWith('#123456');
    });

    it('hides confirmation when Cancel is clicked', () => {
      mockHasColor.mockReturnValue(false);

      render(<ColorPicker value="#123456" onChange={mockOnChange} />);

      fireEvent.click(screen.getByText('Save Color'));
      expect(screen.getByText('Save this color?')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByText('Save this color?')).not.toBeInTheDocument();
    });
  });
});
