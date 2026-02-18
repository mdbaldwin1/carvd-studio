import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DefaultsSection } from './DefaultsSection';
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

const gridOptions = [
  { value: 0.0625, label: '1/16"' },
  { value: 0.125, label: '1/8"' },
  { value: 0.25, label: '1/4"' },
  { value: 0.5, label: '1/2"' },
  { value: 1, label: '1"' }
];

function getSettingControl(labelText: string): HTMLElement {
  const label = screen.getByText(labelText);
  const row = label.closest('.settings-row')!;
  return row.querySelector('select, input') as HTMLElement;
}

describe('DefaultsSection', () => {
  it('renders section heading', () => {
    render(
      <DefaultsSection
        formData={defaultFormData}
        onSettingChange={vi.fn()}
        gridOptions={gridOptions}
        displayGridValue={0.0625}
        onUnitsChange={vi.fn()}
      />
    );
    expect(screen.getByText('Defaults for New Projects')).toBeInTheDocument();
  });

  it('renders units selector with current value', () => {
    render(
      <DefaultsSection
        formData={defaultFormData}
        onSettingChange={vi.fn()}
        gridOptions={gridOptions}
        displayGridValue={0.0625}
        onUnitsChange={vi.fn()}
      />
    );
    const select = getSettingControl('Units') as HTMLSelectElement;
    expect(select.value).toBe('imperial');
  });

  it('calls onUnitsChange when units change', () => {
    const onUnitsChange = vi.fn();
    render(
      <DefaultsSection
        formData={defaultFormData}
        onSettingChange={vi.fn()}
        gridOptions={gridOptions}
        displayGridValue={0.0625}
        onUnitsChange={onUnitsChange}
      />
    );
    fireEvent.change(getSettingControl('Units'), { target: { value: 'metric' } });
    expect(onUnitsChange).toHaveBeenCalledWith('metric');
  });

  it('renders grid snap size selector with display value', () => {
    render(
      <DefaultsSection
        formData={defaultFormData}
        onSettingChange={vi.fn()}
        gridOptions={gridOptions}
        displayGridValue={0.25}
        onUnitsChange={vi.fn()}
      />
    );
    const select = getSettingControl('Grid Snap Size') as HTMLSelectElement;
    expect(select.value).toBe('0.25');
  });

  it('calls onSettingChange with parsed float when grid size changes', () => {
    const onChange = vi.fn();
    render(
      <DefaultsSection
        formData={defaultFormData}
        onSettingChange={onChange}
        gridOptions={gridOptions}
        displayGridValue={0.0625}
        onUnitsChange={vi.fn()}
      />
    );
    fireEvent.change(getSettingControl('Grid Snap Size'), { target: { value: '0.5' } });
    expect(onChange).toHaveBeenCalledWith('defaultGridSize', 0.5);
  });

  it('renders all grid options', () => {
    render(
      <DefaultsSection
        formData={defaultFormData}
        onSettingChange={vi.fn()}
        gridOptions={gridOptions}
        displayGridValue={0.0625}
        onUnitsChange={vi.fn()}
      />
    );
    expect(screen.getByText('1/16"')).toBeInTheDocument();
    expect(screen.getByText('1/8"')).toBeInTheDocument();
    expect(screen.getByText('1/4"')).toBeInTheDocument();
    expect(screen.getByText('1/2"')).toBeInTheDocument();
    expect(screen.getByText('1"')).toBeInTheDocument();
  });

  it('renders units options', () => {
    render(
      <DefaultsSection
        formData={defaultFormData}
        onSettingChange={vi.fn()}
        gridOptions={gridOptions}
        displayGridValue={0.0625}
        onUnitsChange={vi.fn()}
      />
    );
    expect(screen.getByText('Imperial (inches)')).toBeInTheDocument();
    expect(screen.getByText('Metric (mm)')).toBeInTheDocument();
  });
});
