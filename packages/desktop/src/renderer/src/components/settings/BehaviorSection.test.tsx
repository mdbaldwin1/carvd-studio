import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BehaviorSection } from './BehaviorSection';
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
  dimensionSnapSameTypeOnly: false,
  autoSave: true
};

function getSettingControl(labelText: string): HTMLElement {
  const label = screen.getByText(labelText);
  const row = label.closest('.settings-row')!;
  return row.querySelector('select, input[type="checkbox"]') as HTMLElement;
}

describe('BehaviorSection', () => {
  it('renders section heading', () => {
    render(<BehaviorSection formData={defaultFormData} onSettingChange={vi.fn()} />);
    expect(screen.getByText('Behavior')).toBeInTheDocument();
  });

  it('renders auto-save checkbox with current value', () => {
    render(<BehaviorSection formData={defaultFormData} onSettingChange={vi.fn()} />);
    const checkbox = getSettingControl('Auto-Save') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('calls onSettingChange when auto-save toggled', () => {
    const onChange = vi.fn();
    render(<BehaviorSection formData={defaultFormData} onSettingChange={onChange} />);
    fireEvent.click(getSettingControl('Auto-Save'));
    expect(onChange).toHaveBeenCalledWith('autoSave', false);
  });

  it('defaults auto-save to false when undefined', () => {
    const formData = { ...defaultFormData, autoSave: undefined };
    render(<BehaviorSection formData={formData} onSettingChange={vi.fn()} />);
    const checkbox = getSettingControl('Auto-Save') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it('renders confirm before delete checkbox', () => {
    render(<BehaviorSection formData={defaultFormData} onSettingChange={vi.fn()} />);
    const checkbox = getSettingControl('Confirm Before Delete') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('calls onSettingChange when confirm before delete toggled', () => {
    const onChange = vi.fn();
    render(<BehaviorSection formData={defaultFormData} onSettingChange={onChange} />);
    fireEvent.click(getSettingControl('Confirm Before Delete'));
    expect(onChange).toHaveBeenCalledWith('confirmBeforeDelete', false);
  });
});
