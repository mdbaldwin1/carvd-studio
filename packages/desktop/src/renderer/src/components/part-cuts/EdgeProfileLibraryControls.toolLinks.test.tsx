import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { EdgeProfileDraft } from '@renderer/components/part-features/partFeatureEditorState';
import type { RouterProfileDefinition, RouterToolDefinition } from '@renderer/types';
import { getRouterProfileRevision } from '@renderer/utils/routerProfiles';
import { EdgeProfileLibraryControls } from './EdgeProfileLibraryControls';

const profile: RouterProfileDefinition = {
  version: 1,
  id: 'cove-profile',
  name: 'Certified Cove',
  family: 'cove',
  source: 'generic',
  parameters: {},
  boundary: { start: { u: 0, v: 0.5 }, segments: [{ kind: 'line', to: { u: 0.5, v: 0 } }] }
};
const other: RouterProfileDefinition = { ...profile, id: 'ogee-profile', name: 'Certified Ogee', family: 'ogee' };
const link = (value: RouterProfileDefinition) => ({
  profileId: value.id,
  profileRevision: getRouterProfileRevision(value),
  profileSnapshot: value
});
const tools: RouterToolDefinition[] = [
  {
    version: 1,
    id: 'family',
    name: 'Family Tool',
    source: 'generic',
    profileFamily: 'cove',
    cutterDiameter: 1,
    shankDiameter: 0.25,
    cuttingHeight: 0.5
  },
  {
    version: 1,
    id: 'exact',
    name: 'Exact Tool',
    source: 'generic',
    profileFamily: 'cove',
    cutterDiameter: 1,
    shankDiameter: 0.25,
    cuttingHeight: 0.5,
    producedProfiles: [link(profile)]
  },
  {
    version: 1,
    id: 'other',
    name: 'Ogee Tool',
    source: 'generic',
    profileFamily: 'ogee',
    cutterDiameter: 1,
    shankDiameter: 0.25,
    cuttingHeight: 0.5,
    producedProfiles: [link(other)]
  }
];
vi.mock('@renderer/hooks/useRouterProfileLibrary', () => ({
  useRouterProfileLibrary: () => ({ profiles: [profile, other] })
}));
vi.mock('@renderer/hooks/useRouterToolLibrary', () => ({ useRouterToolLibrary: () => ({ tools }) }));

const draft: EdgeProfileDraft = {
  mode: 'edge_profile',
  featureId: 'edge',
  label: 'Edge',
  enabled: true,
  edgeTarget: 'top_front_edge',
  profile: 'custom',
  size: 0.5,
  depth: 0.5,
  routerProfileId: profile.id,
  routerProfileRevision: getRouterProfileRevision(profile),
  routerProfileSnapshot: profile
};

describe('EdgeProfileLibraryControls certified tools', () => {
  it('labels ranked choices, prevents incompatible direct selection, and confirms linked-profile replacement', () => {
    const onChange = vi.fn();
    render(
      <EdgeProfileLibraryControls
        draft={draft}
        features={[]}
        part={{
          id: 'part',
          name: 'Part',
          length: 8,
          width: 4,
          thickness: 0.75,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          stockId: 'stock',
          grainSensitive: false,
          grainDirection: 'length',
          color: '#888888'
        }}
        onChange={onChange}
        onBatchChange={vi.fn()}
      />
    );
    const select = screen.getByLabelText('Physical Router Tool');
    expect(select).toHaveTextContent('Exact Tool — Exact certified');
    expect(select).toHaveTextContent('Family Tool — Family-only unverified');
    expect(screen.getByRole('option', { name: 'Ogee Tool — Incompatible' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Use Ogee Tool and linked profile Certified Ogee/ }));
    expect(screen.getByRole('dialog', { name: 'Change Profile and Physical Tool?' })).toHaveTextContent(
      'Before: Certified Cove'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Use Tool and Linked Profile' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ routerProfileId: 'ogee-profile', routerToolId: 'other' })
    );
  });
});
