import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppearanceSection } from './AppearanceSection';
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
  lightingMode: 'default'
};

// Helper: find the input/select sibling of a label text
function getSettingControl(labelText: string): HTMLElement {
  const label = screen.getByText(labelText);
  const row = label.closest('.settings-row')!;
  const control = row.querySelector('select, input') as HTMLElement;
  return control;
}

describe('AppearanceSection', () => {
  it('renders section heading', () => {
    render(<AppearanceSection formData={defaultFormData} onSettingChange={vi.fn()} />);
    expect(screen.getByText('Appearance')).toBeInTheDocument();
  });

  it('renders theme selector with current value', () => {
    render(<AppearanceSection formData={defaultFormData} onSettingChange={vi.fn()} />);
    const select = getSettingControl('Theme') as HTMLSelectElement;
    expect(select.value).toBe('dark');
  });

  it('calls onSettingChange when theme changes', () => {
    const onChange = vi.fn();
    render(<AppearanceSection formData={defaultFormData} onSettingChange={onChange} />);
    fireEvent.change(getSettingControl('Theme'), { target: { value: 'light' } });
    expect(onChange).toHaveBeenCalledWith('theme', 'light');
  });

  it('renders hotkey hints checkbox with current value', () => {
    render(<AppearanceSection formData={defaultFormData} onSettingChange={vi.fn()} />);
    const checkbox = getSettingControl('Show Hotkey Hints') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('calls onSettingChange when hotkey hints toggled', () => {
    const onChange = vi.fn();
    render(<AppearanceSection formData={defaultFormData} onSettingChange={onChange} />);
    fireEvent.click(getSettingControl('Show Hotkey Hints'));
    expect(onChange).toHaveBeenCalledWith('showHotkeyHints', false);
  });

  it('renders lighting mode selector with current value', () => {
    render(<AppearanceSection formData={defaultFormData} onSettingChange={vi.fn()} />);
    const select = getSettingControl('Lighting Mode') as HTMLSelectElement;
    expect(select.value).toBe('default');
  });

  it('calls onSettingChange when lighting mode changes', () => {
    const onChange = vi.fn();
    render(<AppearanceSection formData={defaultFormData} onSettingChange={onChange} />);
    fireEvent.change(getSettingControl('Lighting Mode'), { target: { value: 'bright' } });
    expect(onChange).toHaveBeenCalledWith('lightingMode', 'bright');
  });

  it('defaults lighting mode to "default" when undefined', () => {
    const formData = { ...defaultFormData, lightingMode: undefined };
    render(<AppearanceSection formData={formData} onSettingChange={vi.fn()} />);
    const select = getSettingControl('Lighting Mode') as HTMLSelectElement;
    expect(select.value).toBe('default');
  });

  it('renders all theme options', () => {
    render(<AppearanceSection formData={defaultFormData} onSettingChange={vi.fn()} />);
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('renders all lighting mode options', () => {
    render(<AppearanceSection formData={defaultFormData} onSettingChange={vi.fn()} />);
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText('Bright')).toBeInTheDocument();
    expect(screen.getByText('Studio')).toBeInTheDocument();
    expect(screen.getByText('Dramatic')).toBeInTheDocument();
  });
});
