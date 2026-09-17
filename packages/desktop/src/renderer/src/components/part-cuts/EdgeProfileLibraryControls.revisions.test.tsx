import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EdgeProfileDraft } from '@renderer/components/part-features/partFeatureEditorState';
import type { EdgeProfileFeature, Part, RouterProfileDefinition, RouterToolDefinition } from '@renderer/types';
import { getRouterProfileRevision } from '@renderer/utils/routerProfiles';
import { getRouterToolRevision } from '@renderer/utils/routerTools';
import { EdgeProfileLibraryControls } from './EdgeProfileLibraryControls';

const original: RouterProfileDefinition = {
  version: 1,
  id: 'shop-cove',
  name: 'Shop Cove',
  family: 'cove',
  source: 'generic',
  parameters: {},
  boundary: { start: { u: 0, v: 0.5 }, segments: [{ kind: 'line', to: { u: 0.5, v: 0 } }] }
};
// The library copy has been edited since these cuts embedded their snapshots.
const edited: RouterProfileDefinition = {
  ...original,
  boundary: { start: { u: 0, v: 0.75 }, segments: [{ kind: 'line', to: { u: 0.75, v: 0 } }] }
};

const libraryProfiles: RouterProfileDefinition[] = [edited];
vi.mock('@renderer/hooks/useRouterProfileLibrary', () => ({
  useRouterProfileLibrary: () => ({ profiles: libraryProfiles })
}));
const libraryTools: RouterToolDefinition[] = [];
vi.mock('@renderer/hooks/useRouterToolLibrary', () => ({ useRouterToolLibrary: () => ({ tools: libraryTools }) }));

const part: Part = {
  id: 'part',
  name: 'Side Panel',
  length: 8,
  width: 4,
  thickness: 0.75,
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  stockId: 'stock',
  grainSensitive: false,
  grainDirection: 'length',
  color: '#888888'
};

const staleFeature = (id: string, label: string): EdgeProfileFeature =>
  ({
    id,
    kind: 'edge_profile',
    version: 1,
    enabled: true,
    label,
    target: { type: 'edge', edge: 'top_front_edge' },
    reference: { primaryFrom: 'min' },
    profile: 'custom',
    routerProfileId: original.id,
    routerProfileRevision: getRouterProfileRevision(original),
    routerProfileSnapshot: original,
    parameters: { size: 0.5, depth: 0.5 }
  }) as EdgeProfileFeature;

const draft: EdgeProfileDraft = {
  mode: 'edge_profile',
  featureId: 'edge-1',
  label: 'Edge 1',
  enabled: true,
  edgeTarget: 'top_front_edge',
  profile: 'custom',
  size: 0.5,
  depth: 0.5,
  routerProfileId: original.id,
  routerProfileRevision: getRouterProfileRevision(original),
  routerProfileSnapshot: original
};

const setup = (features: EdgeProfileFeature[] = [staleFeature('edge-1', 'Edge 1')]) => {
  const onChange = vi.fn();
  const onBatchChange = vi.fn();
  render(
    <EdgeProfileLibraryControls
      draft={draft}
      features={features}
      part={part}
      onChange={onChange}
      onBatchChange={onBatchChange}
    />
  );
  return { onChange, onBatchChange };
};

describe('EdgeProfileLibraryControls profile revisions', () => {
  it('reports a changed library profile without altering the cut', () => {
    const { onChange } = setup();
    expect(screen.getByText(/library profile has changed/i)).toBeInTheDocument();
    expect(screen.getByText(/keeping its embedded project version/i)).toBeInTheDocument();
    // Reporting a change must never silently re-cut the part.
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps the project version when the comparison is dismissed', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Compare Versions/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep Project Version' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('updates just this cut to the latest library snapshot', () => {
    const { onChange, onBatchChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Compare Versions/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Update This Cut' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as EdgeProfileDraft;
    expect(next.routerProfileRevision).toBe(getRouterProfileRevision(edited));
    expect(next.routerProfileSnapshot?.boundary.start.v).toBe(0.75);
    expect(onBatchChange).not.toHaveBeenCalled();
  });

  it('offers a batch update only when more than one cut is stale', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Compare Versions/ }));
    expect(screen.queryByRole('button', { name: /Update All/ })).not.toBeInTheDocument();
  });

  it('names every affected cut and scopes the batch to this part', () => {
    setup([staleFeature('edge-1', 'Edge 1'), staleFeature('edge-2', 'Front Edge')]);
    fireEvent.click(screen.getByRole('button', { name: /Compare Versions/ }));
    fireEvent.click(screen.getByRole('button', { name: /Update All 2 Cuts/ }));
    const dialog = screen.getByRole('dialog', { name: 'Update All Matching Cuts?' });
    expect(dialog).toHaveTextContent('Scope: current part, “Side Panel”');
    expect(dialog).toHaveTextContent('one undoable change');
    expect(dialog).toHaveTextContent('Edge 1');
    expect(dialog).toHaveTextContent('Front Edge');
  });

  it('applies the batch as a single change and leaves it cancellable', () => {
    const { onBatchChange } = setup([staleFeature('edge-1', 'Edge 1'), staleFeature('edge-2', 'Front Edge')]);
    fireEvent.click(screen.getByRole('button', { name: /Compare Versions/ }));
    fireEvent.click(screen.getByRole('button', { name: /Update All 2 Cuts/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onBatchChange).not.toHaveBeenCalled();

    // Cancelling closes the comparison as well, so reopen it to confirm.
    fireEvent.click(screen.getByRole('button', { name: /Compare Versions/ }));
    fireEvent.click(screen.getByRole('button', { name: /Update All 2 Cuts/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Update' }));
    expect(onBatchChange).toHaveBeenCalledTimes(1);
    const updated = onBatchChange.mock.calls[0][0] as EdgeProfileFeature[];
    expect(updated).toHaveLength(2);
    for (const feature of updated) {
      expect(feature.routerProfileRevision).toBe(getRouterProfileRevision(edited));
    }
  });
});

describe('EdgeProfileLibraryControls tool assignment', () => {
  const baseTool: RouterToolDefinition = {
    version: 1,
    id: 'cove-bit',
    name: 'Cove Bit',
    source: 'generic',
    profileFamily: 'cove',
    cutterDiameter: 1,
    shankDiameter: 0.25,
    cuttingHeight: 0.5
  };

  beforeEach(() => {
    libraryTools.length = 0;
  });

  const renderWith = (draftOverrides: Partial<EdgeProfileDraft>) => {
    const onChange = vi.fn();
    render(
      <EdgeProfileLibraryControls
        draft={{ ...draft, ...draftOverrides }}
        features={[]}
        part={part}
        onChange={onChange}
        onBatchChange={vi.fn()}
      />
    );
    return onChange;
  };

  it('assigns a physical tool and records its snapshot', () => {
    libraryTools.push(baseTool);
    const onChange = renderWith({});
    fireEvent.change(screen.getByLabelText('Physical Router Tool'), { target: { value: baseTool.id } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as EdgeProfileDraft;
    expect(next.routerToolId).toBe(baseTool.id);
    expect(next.routerToolRevision).toBe(getRouterToolRevision(baseTool));
    expect(next.routerToolSnapshot).toMatchObject({ id: baseTool.id, name: 'Cove Bit' });
  });

  it('clears the assignment back to a generic profile', () => {
    libraryTools.push(baseTool);
    const onChange = renderWith({
      routerToolId: baseTool.id,
      routerToolRevision: getRouterToolRevision(baseTool),
      routerToolSnapshot: baseTool
    });
    fireEvent.change(screen.getByLabelText('Physical Router Tool'), { target: { value: '' } });
    const next = onChange.mock.calls[0][0] as EdgeProfileDraft;
    expect(next.routerToolId).toBeUndefined();
    expect(next.routerToolSnapshot).toBeUndefined();
  });

  it('keeps the assigned snapshot when the library tool changes, until asked', () => {
    // The library copy has been reground since this cut was authored.
    const edited: RouterToolDefinition = { ...baseTool, cuttingHeight: 0.75 };
    libraryTools.push(edited);
    const onChange = renderWith({
      routerToolId: baseTool.id,
      routerToolRevision: getRouterToolRevision(baseTool),
      routerToolSnapshot: baseTool
    });
    expect(screen.getByText(/library tool changed/i)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Update Assigned Tool' }));
    const next = onChange.mock.calls[0][0] as EdgeProfileDraft;
    expect(next.routerToolRevision).toBe(getRouterToolRevision(edited));
    expect(next.routerToolSnapshot?.cuttingHeight).toBe(0.75);
  });
});
