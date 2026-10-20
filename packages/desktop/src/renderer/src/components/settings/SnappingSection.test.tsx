import { describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
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
  dimensionSnapSameTypeOnly: false,
  lightingMode: 'default'
};

/** The input or select in the same row as a given label. */
function control(labelText: string): HTMLInputElement {
  const label = screen.getByText(labelText);
  const row = label.closest('.settings-row')!;
  return row.querySelector('select, input') as HTMLInputElement;
}

/** What a preset set a given key to, from the recorded calls. */
function settingFrom(onChange: ReturnType<typeof vi.fn>, key: string): unknown {
  const call = [...onChange.mock.calls].reverse().find(([name]) => name === key);
  return call?.[1];
}

function renderSection(overrides: Partial<AppSettings> = {}) {
  const onChange = vi.fn();
  render(<SnappingSection formData={{ ...defaultFormData, ...overrides }} onSettingChange={onChange} />);
  return onChange;
}

describe('SnappingSection', () => {
  it('renders the section', () => {
    renderSection();
    expect(screen.getByText('Snapping')).toBeInTheDocument();
  });

  it('shows the sensitivity currently in force', () => {
    renderSection({ snapSensitivity: 'tight' });
    expect(control('Snap Sensitivity').value).toBe('tight');
  });

  it.each(['tight', 'normal', 'loose'] as const)('changes the sensitivity to %s', (value) => {
    const onChange = renderSection();
    fireEvent.change(control('Snap Sensitivity'), { target: { value } });
    expect(onChange).toHaveBeenCalledWith('snapSensitivity', value);
  });

  /** Every toggle in the panel, with the setting it writes. */
  const TOGGLES: Array<[string, keyof AppSettings]> = [
    ['Live Grid Snapping', 'liveGridSnap'],
    ['Snap to Origin', 'snapToOrigin'],
    ['Surface Anchors', 'enableSurfaceAnchors'],
    ['Fractional Face Anchors', 'enableFractionalAnchors'],
    ['Show Candidate Indicators', 'showSnapCandidates'],
    ['Golden Ratio Anchors', 'enableGoldenRatioAnchors'],
    ['Feature Anchors', 'enableFeatureAnchors'],
    ['Layout Snaps', 'enableLayoutSnaps'],
    ['Equal Spacing Snaps', 'enableEqualSpacingSnap'],
    ['Distribution Snaps', 'enableDistributionSnap'],
    ['Pattern Snaps', 'enablePatternSnap'],
    ['Axis Edge/Center Snaps', 'enableAxisLegacySnaps'],
    ['Match Same Dimensions Only', 'dimensionSnapSameTypeOnly']
  ];

  it.each(TOGGLES)('%s writes its own setting and no other', (label, key) => {
    // Each row is wired by hand, so the thing worth checking is that every
    // one of them reaches for the right key.
    const onChange = renderSection({ [key]: false } as Partial<AppSettings>);
    fireEvent.click(control(label));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(key, true);
  });

  it.each(TOGGLES)('%s can be turned off again', (label, key) => {
    const onChange = renderSection({ [key]: true } as Partial<AppSettings>);
    fireEvent.click(control(label));
    expect(onChange).toHaveBeenCalledWith(key, false);
  });

  it('falls back to sensible defaults when a setting has never been chosen', () => {
    // An older preferences file will not have these keys at all, and the
    // panel must still show what the app is actually doing.
    renderSection({ snapToOrigin: undefined, liveGridSnap: undefined });
    expect(control('Snap to Origin').checked).toBe(true);
    expect(control('Live Grid Snapping').checked).toBe(false);
  });

  describe('the presets', () => {
    it('records which preset was chosen', () => {
      const onChange = renderSection();
      fireEvent.change(control('Advanced Snap Preset'), { target: { value: 'layout' } });
      expect(onChange).toHaveBeenCalledWith('advancedSnapPreset', 'layout');
    });

    it('simple keeps the everyday anchors and puts the rest away', () => {
      // Someone who has not asked for layout tooling should not be met with
      // guides appearing from everywhere.
      const onChange = renderSection();
      fireEvent.change(control('Advanced Snap Preset'), { target: { value: 'simple' } });

      expect(settingFrom(onChange, 'enableSurfaceAnchors')).toBe(true);
      expect(settingFrom(onChange, 'enableFractionalAnchors')).toBe(true);
      expect(settingFrom(onChange, 'enableGoldenRatioAnchors')).toBe(false);
      expect(settingFrom(onChange, 'enableFeatureAnchors')).toBe(false);
      expect(settingFrom(onChange, 'enableLayoutSnaps')).toBe(false);
      expect(settingFrom(onChange, 'showSnapCandidates')).toBe(false);
    });

    it('layout turns everything on, indicators included', () => {
      const onChange = renderSection();
      fireEvent.change(control('Advanced Snap Preset'), { target: { value: 'layout' } });

      for (const key of [
        'enableSurfaceAnchors',
        'enableFractionalAnchors',
        'enableGoldenRatioAnchors',
        'enableFeatureAnchors',
        'enableLayoutSnaps',
        'enableEqualSpacingSnap',
        'enableDistributionSnap',
        'enablePatternSnap',
        'enableAxisLegacySnaps',
        'showSnapCandidates'
      ]) {
        expect(settingFrom(onChange, key)).toBe(true);
      }
    });

    it('precision keeps the measured anchors and drops the decorative ones', () => {
      const onChange = renderSection();
      fireEvent.change(control('Advanced Snap Preset'), { target: { value: 'precision' } });

      expect(settingFrom(onChange, 'enableFeatureAnchors')).toBe(true);
      expect(settingFrom(onChange, 'enableLayoutSnaps')).toBe(true);
      expect(settingFrom(onChange, 'enableEqualSpacingSnap')).toBe(true);
      // A golden-ratio line is a composition aid, not a measurement.
      expect(settingFrom(onChange, 'enableGoldenRatioAnchors')).toBe(false);
      expect(settingFrom(onChange, 'enableDistributionSnap')).toBe(false);
      expect(settingFrom(onChange, 'enablePatternSnap')).toBe(false);
    });

    it('leaves the legacy axis snaps on whichever preset is chosen', () => {
      // They are what plain axis-aligned dragging rests on, so no preset may
      // quietly take them away.
      for (const preset of ['simple', 'precision', 'layout'] as const) {
        const onChange = renderSection();
        fireEvent.change(control('Advanced Snap Preset'), { target: { value: preset } });
        expect(settingFrom(onChange, 'enableAxisLegacySnaps')).toBe(true);
        cleanup();
      }
    });
  });
});
