import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { EdgeProfileDraft } from '@renderer/components/part-features/partFeatureEditorState';
import type { RouterToolDefinition } from '@renderer/types';
import { RouterToolFeasibilitySummary } from './RouterToolFeasibilitySummary';

const part = { length: 8, width: 4, thickness: 0.75 };
const tool = (updates: Partial<RouterToolDefinition> = {}): RouterToolDefinition => ({
  version: 1,
  id: 'tool',
  name: 'Cove Tool',
  source: 'generic',
  profileFamily: 'cove',
  cutterDiameter: 1,
  shankDiameter: 0.25,
  cuttingHeight: 0.5,
  bearingDiameter: 0.5,
  ...updates
});
const draft = (updates: Partial<EdgeProfileDraft> = {}): EdgeProfileDraft => ({
  mode: 'edge_profile',
  featureId: 'edge',
  label: 'Edge',
  enabled: true,
  edgeTarget: 'top_front_edge',
  profile: 'cove',
  size: 0.5,
  depth: 0.5,
  ...updates
});

describe('RouterToolFeasibilitySummary', () => {
  it('keeps a generic profile neutral and invites physical-tool assignment', () => {
    render(<RouterToolFeasibilitySummary draft={draft()} part={part} />);
    expect(screen.getByRole('status')).toHaveTextContent('Generic profile');
    expect(screen.getByRole('status')).toHaveTextContent('Assign a physical router tool');
    expect(screen.queryByRole('group', { name: /Errors/ })).not.toBeInTheDocument();
  });

  it('shows Ready when analyzer findings have no errors or cautions', () => {
    render(
      <RouterToolFeasibilitySummary draft={draft({ routerToolId: 'tool', routerToolSnapshot: tool() })} part={part} />
    );
    expect(screen.getByRole('status')).toHaveTextContent('Ready');
    expect(screen.getByText('No modeled feasibility issues found.')).toBeInTheDocument();
  });

  it('groups analyzer errors and actionable remedy text accessibly', () => {
    render(
      <RouterToolFeasibilitySummary
        draft={draft({ routerToolId: 'tool', routerToolSnapshot: tool({ cuttingHeight: 0.25 }) })}
        part={part}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent('Not feasible');
    expect(screen.getByRole('group', { name: 'Errors (1)' })).toHaveTextContent(
      'use a longer cutting edge or reduce profile depth'
    );
    expect(screen.getByText('Analysis assumptions')).toBeInTheDocument();
  });

  it('shows cautions separately and expands compact details', () => {
    const value = draft({
      routerToolId: 'tool',
      routerToolSnapshot: tool({ shankDiameter: 1.25, cutterDiameter: 1.5 })
    });
    render(<RouterToolFeasibilitySummary draft={value} part={part} compact />);
    expect(screen.getByRole('group', { name: 'Compact feasibility status' })).toHaveTextContent('Needs attention');
    expect(screen.queryByRole('group', { name: /Cautions/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(screen.getByRole('group', { name: /Cautions/ })).toHaveTextContent('shank envelope may contact');
  });

  it('updates analyzer status live when size changes', () => {
    const assigned = { routerToolId: 'tool', routerToolSnapshot: tool() };
    const view = render(<RouterToolFeasibilitySummary draft={draft(assigned)} part={part} />);
    expect(screen.getByRole('status')).toHaveTextContent('Ready');
    view.rerender(<RouterToolFeasibilitySummary draft={draft({ ...assigned, depth: 0.8 })} part={part} />);
    expect(screen.getByRole('status')).toHaveTextContent('Not feasible');
  });

  it('distinguishes conservative basic estimates from verified detailed envelopes', () => {
    const legacy = tool({ cutterDiameter: 1.5, shankDiameter: 1.25, cuttingHeight: 0.6, bearingDiameter: undefined });
    const view = render(
      <RouterToolFeasibilitySummary draft={draft({ routerToolId: 'tool', routerToolSnapshot: legacy })} part={part} />
    );
    expect(screen.getByRole('status')).toHaveTextContent('Needs attention');
    expect(screen.getByRole('status')).toHaveTextContent('Estimated from basic dimensions');
    view.rerender(
      <RouterToolFeasibilitySummary
        draft={draft({
          routerToolId: 'tool',
          routerToolSnapshot: tool({
            cutterDiameter: 1.5,
            shankDiameter: 1.25,
            cuttingHeight: 0.6,
            bearingDiameter: undefined,
            envelopeVersion: 1,
            sections: [
              { role: 'cutter', start: 0, end: 0.6, diameter: 1.5 },
              { role: 'shank', start: 0.7, end: 1, diameter: 1.25 }
            ]
          })
        })}
        part={part}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent('Ready');
    expect(screen.getByRole('status')).toHaveTextContent('Verified from detailed envelope');
  });
});
