import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { EdgeProfileDraft } from '@renderer/components/part-features/partFeatureEditorState';
import { buildFeatureFromDraft } from '@renderer/components/part-features/partFeatureEditorState';
import { getEdgeProfileFeatureBoundary } from '@renderer/utils/edgeProfileShape';
import { EdgeProfileCrossSectionInspector, getEdgeProfileOrientationLabel } from './EdgeProfileCrossSectionInspector';

const draft = (profile: EdgeProfileDraft['profile'] = 'roundover', size = 0.5): EdgeProfileDraft => ({
  mode: 'edge_profile',
  featureId: 'edge',
  label: 'Edge',
  enabled: true,
  edgeTarget: 'top_front_edge',
  profile,
  size,
  depth: 0.25
});
const part = { length: 8, width: 4, thickness: 0.75 };

function renderedBoundary(): unknown {
  return JSON.parse(
    screen.getByRole('img', { name: /edge profile cross-section/ }).getAttribute('data-boundary') ?? '[]'
  );
}

describe('EdgeProfileCrossSectionInspector', () => {
  it('draws the exact canonical geometry-adapter boundary', () => {
    const value = draft('roundover');
    render(<EdgeProfileCrossSectionInspector draft={value} units="imperial" part={part} />);
    const feature = buildFeatureFromDraft(value);
    expect(feature.kind).toBe('edge_profile');
    expect(renderedBoundary()).toEqual(feature.kind === 'edge_profile' ? getEdgeProfileFeatureBoundary(feature) : []);
  });

  it('visually distinguishes Roundover, Ogee, and custom canonical boundaries', () => {
    const view = render(<EdgeProfileCrossSectionInspector draft={draft('roundover')} units="imperial" part={part} />);
    const roundover = renderedBoundary();
    view.rerender(<EdgeProfileCrossSectionInspector draft={draft('ogee')} units="imperial" part={part} />);
    const ogee = renderedBoundary();
    const custom = draft('custom');
    custom.routerProfileId = 'custom';
    custom.routerProfileSnapshot = {
      version: 1,
      id: 'custom',
      name: 'Shop Sweep',
      family: 'Decorative',
      source: 'generic',
      parameters: { fidelity: 'approximated' },
      boundary: {
        start: { u: 0, v: 0.25 },
        segments: [
          { kind: 'cubicBezier', control1: { u: 0.05, v: 0.2 }, control2: { u: 0.4, v: 0.05 }, to: { u: 0.5, v: 0 } }
        ]
      }
    };
    view.rerender(<EdgeProfileCrossSectionInspector draft={custom} units="imperial" part={part} />);
    const customBoundary = renderedBoundary();
    expect(ogee).not.toEqual(roundover);
    expect(customBoundary).not.toEqual(ogee);
    expect(screen.getByText('Shop Sweep')).toBeInTheDocument();
    expect(screen.getByText(/approximated custom profile/i)).toBeInTheDocument();
  });

  it('updates live when profile size changes', () => {
    const view = render(
      <EdgeProfileCrossSectionInspector draft={draft('roundover', 0.25)} units="imperial" part={part} />
    );
    const before = renderedBoundary();
    view.rerender(<EdgeProfileCrossSectionInspector draft={draft('roundover', 0.75)} units="imperial" part={part} />);
    expect(renderedBoundary()).not.toEqual(before);
    expect(screen.getByText('3/4"')).toBeInTheDocument();
  });

  it('describes representative edge orientations in plain language', () => {
    expect(getEdgeProfileOrientationLabel('top_front_edge')).toContain('running along the part length');
    expect(getEdgeProfileOrientationLabel('top_left_edge')).toContain('running across the part width');
    expect(getEdgeProfileOrientationLabel('front_left_edge')).toContain('running through the part thickness');
  });
});
