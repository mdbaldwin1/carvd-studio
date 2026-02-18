import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StockConstraintsSection } from './StockConstraintsSection';
import { AppSettings } from '../../types';

const defaultFormData: AppSettings = {
  defaultUnits: 'imperial',
  defaultGridSize: 0.0625,
  theme: 'dark',
  confirmBeforeDelete: true,
  showHotkeyHints: true,
  stockConstraints: {
    constrainDimensions: true,
    constrainGrain: true,
    constrainColor: true,
    preventOverlap: true
  },
  liveGridSnap: false,
  snapSensitivity: 'normal',
  snapToOrigin: true,
  dimensionSnapSameTypeOnly: false
};

function getSettingControl(labelText: string): HTMLElement {
  const label = screen.getByText(labelText);
  const row = label.closest('.settings-row')!;
  return row.querySelector('select, input') as HTMLElement;
}

describe('StockConstraintsSection', () => {
  it('renders section heading', () => {
    render(<StockConstraintsSection formData={defaultFormData} onSettingChange={vi.fn()} />);
    expect(screen.getByText('Stock Constraints (Defaults)')).toBeInTheDocument();
  });

  it('renders constrain dimensions checkbox', () => {
    render(<StockConstraintsSection formData={defaultFormData} onSettingChange={vi.fn()} />);
    const checkbox = getSettingControl('Constrain Dimensions') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('calls onSettingChange with spread constraints when toggling constrain dimensions', () => {
    const onChange = vi.fn();
    render(<StockConstraintsSection formData={defaultFormData} onSettingChange={onChange} />);
    fireEvent.click(getSettingControl('Constrain Dimensions'));
    expect(onChange).toHaveBeenCalledWith('stockConstraints', {
      constrainDimensions: false,
      constrainGrain: true,
      constrainColor: true,
      preventOverlap: true
    });
  });

  it('renders constrain grain direction checkbox', () => {
    render(<StockConstraintsSection formData={defaultFormData} onSettingChange={vi.fn()} />);
    const checkbox = getSettingControl('Constrain Grain Direction') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('calls onSettingChange when toggling constrain grain', () => {
    const onChange = vi.fn();
    render(<StockConstraintsSection formData={defaultFormData} onSettingChange={onChange} />);
    fireEvent.click(getSettingControl('Constrain Grain Direction'));
    expect(onChange).toHaveBeenCalledWith(
      'stockConstraints',
      expect.objectContaining({
        constrainGrain: false
      })
    );
  });

  it('renders auto-sync color checkbox', () => {
    render(<StockConstraintsSection formData={defaultFormData} onSettingChange={vi.fn()} />);
    const checkbox = getSettingControl('Auto-sync Color') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('calls onSettingChange when toggling auto-sync color', () => {
    const onChange = vi.fn();
    render(<StockConstraintsSection formData={defaultFormData} onSettingChange={onChange} />);
    fireEvent.click(getSettingControl('Auto-sync Color'));
    expect(onChange).toHaveBeenCalledWith(
      'stockConstraints',
      expect.objectContaining({
        constrainColor: false
      })
    );
  });

  it('renders prevent overlap checkbox', () => {
    render(<StockConstraintsSection formData={defaultFormData} onSettingChange={vi.fn()} />);
    const checkbox = getSettingControl('Prevent Overlap') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('calls onSettingChange when toggling prevent overlap', () => {
    const onChange = vi.fn();
    render(<StockConstraintsSection formData={defaultFormData} onSettingChange={onChange} />);
    fireEvent.click(getSettingControl('Prevent Overlap'));
    expect(onChange).toHaveBeenCalledWith(
      'stockConstraints',
      expect.objectContaining({
        preventOverlap: false
      })
    );
  });

  it('defaults to true when stockConstraints is undefined', () => {
    const formData = { ...defaultFormData, stockConstraints: undefined as never };
    render(<StockConstraintsSection formData={formData} onSettingChange={vi.fn()} />);
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((checkbox) => {
      expect((checkbox as HTMLInputElement).checked).toBe(true);
    });
  });
});
