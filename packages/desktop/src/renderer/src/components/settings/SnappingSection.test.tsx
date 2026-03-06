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

  it('renders advanced preset control with precision default', () => {
    render(<SnappingSection formData={defaultFormData} onSettingChange={vi.fn()} />);
    const select = getSettingControl('Advanced Snap Preset') as HTMLInputElement;
    expect(select.value).toBe('precision');
  });

  it('calls onSettingChange when advanced preset changes', () => {
    const onChange = vi.fn();
    render(<SnappingSection formData={defaultFormData} onSettingChange={onChange} />);
    fireEvent.change(getSettingControl('Advanced Snap Preset'), { target: { value: 'layout' } });
    expect(onChange).toHaveBeenCalledWith('advancedSnapPreset', 'layout');
    expect(onChange).toHaveBeenCalledWith('enableGoldenRatioAnchors', true);
  });

  it('calls onSettingChange when surface anchors toggled', () => {
    const onChange = vi.fn();
    render(<SnappingSection formData={defaultFormData} onSettingChange={onChange} />);
    fireEvent.click(getSettingControl('Surface Anchors'));
    expect(onChange).toHaveBeenCalledWith('enableSurfaceAnchors', false);
  });

  it('calls onSettingChange when fractional anchors toggled', () => {
    const onChange = vi.fn();
    render(<SnappingSection formData={defaultFormData} onSettingChange={onChange} />);
    fireEvent.click(getSettingControl('Fractional Face Anchors'));
    expect(onChange).toHaveBeenCalledWith('enableFractionalAnchors', false);
  });

  it('calls onSettingChange when candidate indicators toggled', () => {
    const onChange = vi.fn();
    render(<SnappingSection formData={defaultFormData} onSettingChange={onChange} />);
    fireEvent.click(getSettingControl('Show Candidate Indicators'));
    expect(onChange).toHaveBeenCalledWith('showSnapCandidates', true);
  });

  it('calls onSettingChange when golden ratio anchors toggled', () => {
    const onChange = vi.fn();
    render(<SnappingSection formData={defaultFormData} onSettingChange={onChange} />);
    fireEvent.click(getSettingControl('Golden Ratio Anchors'));
    expect(onChange).toHaveBeenCalledWith('enableGoldenRatioAnchors', true);
  });

  it('calls onSettingChange when feature anchors toggled', () => {
    const onChange = vi.fn();
    render(<SnappingSection formData={defaultFormData} onSettingChange={onChange} />);
    fireEvent.click(getSettingControl('Feature Anchors'));
    expect(onChange).toHaveBeenCalledWith('enableFeatureAnchors', false);
  });

  it('calls onSettingChange when layout snaps toggled', () => {
    const onChange = vi.fn();
    render(<SnappingSection formData={defaultFormData} onSettingChange={onChange} />);
    fireEvent.click(getSettingControl('Layout Snaps'));
    expect(onChange).toHaveBeenCalledWith('enableLayoutSnaps', false);
  });

  it('calls onSettingChange when equal spacing snaps toggled', () => {
    const onChange = vi.fn();
    render(<SnappingSection formData={defaultFormData} onSettingChange={onChange} />);
    fireEvent.click(getSettingControl('Equal Spacing Snaps'));
    expect(onChange).toHaveBeenCalledWith('enableEqualSpacingSnap', false);
  });

  it('calls onSettingChange when distribution snaps toggled', () => {
    const onChange = vi.fn();
    render(<SnappingSection formData={defaultFormData} onSettingChange={onChange} />);
    fireEvent.click(getSettingControl('Distribution Snaps'));
    expect(onChange).toHaveBeenCalledWith('enableDistributionSnap', false);
  });

  it('calls onSettingChange when pattern snaps toggled', () => {
    const onChange = vi.fn();
    render(<SnappingSection formData={defaultFormData} onSettingChange={onChange} />);
    fireEvent.click(getSettingControl('Pattern Snaps'));
    expect(onChange).toHaveBeenCalledWith('enablePatternSnap', false);
  });

  it('calls onSettingChange when axis edge/center snaps toggled', () => {
    const onChange = vi.fn();
    render(<SnappingSection formData={defaultFormData} onSettingChange={onChange} />);
    fireEvent.click(getSettingControl('Axis Edge/Center Snaps'));
    expect(onChange).toHaveBeenCalledWith('enableAxisLegacySnaps', false);
  });
});
