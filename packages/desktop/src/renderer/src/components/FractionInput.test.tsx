import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FractionInput } from './FractionInput';
import { useProjectStore } from '../store/projectStore';

describe('FractionInput', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
    // Reset to imperial units
    useProjectStore.setState({ units: 'imperial' });
  });

  describe('rendering', () => {
    it('renders an input element', () => {
      render(<FractionInput value={12} onChange={mockOnChange} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('displays value formatted as fraction in imperial mode', () => {
      render(<FractionInput value={12.5} onChange={mockOnChange} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      // formatMeasurement returns fraction without unit suffix
      expect(input.value).toBe('12 1/2');
    });

    it('displays value formatted in metric mode', () => {
      useProjectStore.setState({ units: 'metric' });
      render(<FractionInput value={1} onChange={mockOnChange} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      // 1 inch = 25.4mm, formatMeasurement returns number without 'mm' suffix
      expect(input.value).toBe('25.4');
    });

    it('applies custom className', () => {
      render(<FractionInput value={10} onChange={mockOnChange} className="custom-class" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
    });
  });

  describe('user input', () => {
    it('allows typing in the input', () => {
      render(<FractionInput value={10} onChange={mockOnChange} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '24' } });

      expect(input.value).toBe('24');
    });

    it('calls onChange with parsed value on blur', () => {
      render(<FractionInput value={10} onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '24' } });
      fireEvent.blur(input);

      expect(mockOnChange).toHaveBeenCalledWith(24);
    });

    it('parses fractional input correctly', () => {
      render(<FractionInput value={10} onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '12 1/2' } });
      fireEvent.blur(input);

      expect(mockOnChange).toHaveBeenCalledWith(12.5);
    });

    it('reverts to original value on invalid input', () => {
      render(<FractionInput value={10} onChange={mockOnChange} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'invalid' } });
      fireEvent.blur(input);

      expect(mockOnChange).not.toHaveBeenCalled();
      // Value should revert to formatted original (no unit suffix)
      expect(input.value).toBe('10');
    });

    it('submits on Enter key', () => {
      render(<FractionInput value={10} onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '20' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      // The component calls blur() on Enter, but we need to manually fire blur in tests
      fireEvent.blur(input);

      expect(mockOnChange).toHaveBeenCalledWith(20);
    });
  });

  describe('min value constraint', () => {
    it('accepts values greater than or equal to min', () => {
      render(<FractionInput value={10} onChange={mockOnChange} min={5} />);

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '5' } });
      fireEvent.blur(input);

      expect(mockOnChange).toHaveBeenCalledWith(5);
    });

    it('rejects values less than min', () => {
      render(<FractionInput value={10} onChange={mockOnChange} min={5} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '3' } });
      fireEvent.blur(input);

      // Should not call onChange with invalid value
      expect(mockOnChange).not.toHaveBeenCalled();
      // Should revert to original value (no unit suffix)
      expect(input.value).toBe('10');
    });

    it('defaults min to 0', () => {
      render(<FractionInput value={10} onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '0' } });
      fireEvent.blur(input);

      expect(mockOnChange).toHaveBeenCalledWith(0);
    });

    it('rejects negative values with default min', () => {
      render(<FractionInput value={10} onChange={mockOnChange} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '-5' } });
      fireEvent.blur(input);

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('unit changes', () => {
    it('updates display when units change', () => {
      const { rerender } = render(<FractionInput value={1} onChange={mockOnChange} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('1');

      // Change to metric
      useProjectStore.setState({ units: 'metric' });
      rerender(<FractionInput value={1} onChange={mockOnChange} />);

      // Should now show mm value (1 inch = 25.4mm)
      expect(input.value).toBe('25.4');
    });
  });

  describe('onChange callback capture', () => {
    it('calls the captured onChange even when callback prop changes during editing', () => {
      const mockOnChangePartA = vi.fn();
      const mockOnChangePartB = vi.fn();

      const { rerender } = render(<FractionInput value={10} onChange={mockOnChangePartA} />);

      const input = screen.getByRole('textbox');

      // Start editing (captures mockOnChangePartA)
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '20' } });

      // Simulate entity change (user switched to different part - new callback)
      rerender(<FractionInput value={5} onChange={mockOnChangePartB} />);

      // Blur should call the CAPTURED onChange (part A's handler)
      fireEvent.blur(input);

      // Part A's handler should be called with the edited value
      expect(mockOnChangePartA).toHaveBeenCalledWith(20);
      // Part B's handler should NOT be called
      expect(mockOnChangePartB).not.toHaveBeenCalled();
    });

    it('uses current onChange when no callback was captured', () => {
      render(<FractionInput value={10} onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '15' } });
      fireEvent.blur(input);

      expect(mockOnChange).toHaveBeenCalledWith(15);
    });

    it('commits value on unmount if still editing (no blur event)', () => {
      const mockOnChangePartA = vi.fn();

      const { unmount } = render(<FractionInput value={10} onChange={mockOnChangePartA} />);

      const input = screen.getByRole('textbox');

      // Start editing
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '25' } });

      // Unmount without blurring (simulates user clicking away to another part)
      unmount();

      // The captured onChange should be called with the edited value
      expect(mockOnChangePartA).toHaveBeenCalledWith(25);
    });

    it('does not commit on unmount if not editing', () => {
      const { unmount } = render(<FractionInput value={10} onChange={mockOnChange} />);

      // Never focus the input, just unmount
      unmount();

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('does not commit invalid value on unmount', () => {
      const { unmount } = render(<FractionInput value={10} onChange={mockOnChange} min={5} />);

      const input = screen.getByRole('textbox');

      // Start editing with invalid value (below min)
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '2' } });

      // Unmount
      unmount();

      // Should not call onChange with invalid value
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });
});
