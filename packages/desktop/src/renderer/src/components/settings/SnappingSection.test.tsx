import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SnappingSection } from './SnappingSection';
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

describe('SnappingSection', () => {
  it('renders section heading', () => {
    render(<SnappingSection formData={defaultFormData} onSettingChange={vi.fn()} />);
    expect(screen.getByText('Snapping')).toBeInTheDocument();
  });

  it('renders snap sensitivity with current value', () => {
    render(<SnappingSection formData={defaultFormData} onSettingChange={vi.fn()} />);
    const select = getSettingControl('Snap Sensitivity') as HTMLInputElement;
    expect(select.value).toBe('normal');
  });

  it('calls onSettingChange when snap sensitivity changes', () => {
    const onChange = vi.fn();
    render(<SnappingSection formData={defaultFormData} onSettingChange={onChange} />);
    fireEvent.change(getSettingControl('Snap Sensitivity'), { target: { value: 'tight' } });
    expect(onChange).toHaveBeenCalledWith('snapSensitivity', 'tight');
  });

  it('renders live grid snapping checkbox', () => {
    render(<SnappingSection formData={defaultFormData} onSettingChange={vi.fn()} />);
    const checkbox = getSettingControl('Live Grid Snapping') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it('calls onSettingChange when live grid snapping toggled', () => {
    const onChange = vi.fn();
    render(<SnappingSection formData={defaultFormData} onSettingChange={onChange} />);
    fireEvent.click(getSettingControl('Live Grid Snapping'));
    expect(onChange).toHaveBeenCalledWith('liveGridSnap', true);
  });

  it('renders snap to origin checkbox', () => {
    render(<SnappingSection formData={defaultFormData} onSettingChange={vi.fn()} />);
    const checkbox = getSettingControl('Snap to Origin') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('calls onSettingChange when snap to origin toggled', () => {
    const onChange = vi.fn();
    render(<SnappingSection formData={defaultFormData} onSettingChange={onChange} />);
    fireEvent.click(getSettingControl('Snap to Origin'));
    expect(onChange).toHaveBeenCalledWith('snapToOrigin', false);
  });

  it('renders match same dimensions only checkbox', () => {
    render(<SnappingSection formData={defaultFormData} onSettingChange={vi.fn()} />);
    const checkbox = getSettingControl('Match Same Dimensions Only') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it('calls onSettingChange when match same dimensions toggled', () => {
    const onChange = vi.fn();
    render(<SnappingSection formData={defaultFormData} onSettingChange={onChange} />);
    fireEvent.click(getSettingControl('Match Same Dimensions Only'));
    expect(onChange).toHaveBeenCalledWith('dimensionSnapSameTypeOnly', true);
  });

  it('defaults snap sensitivity to "normal" when undefined', () => {
    const formData = { ...defaultFormData, snapSensitivity: undefined as never };
    render(<SnappingSection formData={formData} onSettingChange={vi.fn()} />);
    const select = getSettingControl('Snap Sensitivity') as HTMLInputElement;
    expect(select.value).toBe('normal');
  });

  it('renders all sensitivity options', () => {
    render(<SnappingSection formData={defaultFormData} onSettingChange={vi.fn()} />);
    expect(screen.getByText('Tight (precise)')).toBeInTheDocument();
    expect(screen.getByText('Normal')).toBeInTheDocument();
    expect(screen.getByText('Loose (easier)')).toBeInTheDocument();
  });
});
