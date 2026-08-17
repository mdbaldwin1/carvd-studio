import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentProps } from 'react';
import { describe, expect, it, vi, type Mock } from 'vitest';
import { createTestPart } from '../../../../../tests/helpers/factories';
import type { EndCutFeature, RectCutFeature } from '@renderer/types';
import { usePartCutsEditingStore } from '@renderer/store/partCutsEditingStore';
import { PartCutsWorkspace } from './PartCutsWorkspace';

type WorkspaceProps = ComponentProps<typeof PartCutsWorkspace>;

function renderWorkspace(overrides: Partial<WorkspaceProps> = {}) {
  const props: WorkspaceProps = {
    part: createTestPart({ name: 'Panel', length: 24, width: 12, thickness: 0.75 }),
    draftFeatures: [],
    units: 'imperial',
    selectedFeatureId: null,
    hoveredTarget: null,
    pendingTarget: null,
    onSelectFeature: vi.fn(),
    onDraftFeaturesChange: vi.fn(),
    onHoveredTargetChange: vi.fn(),
    onPendingTargetChange: vi.fn(),
    onExit: vi.fn(),
    onSave: vi.fn(),
    hasUnsavedChanges: false,
    ...overrides
  };
  const view = render(<PartCutsWorkspace {...props} />);
  return { ...view, props };
}

function createMortiseFeature(overrides: Partial<RectCutFeature> = {}): RectCutFeature {
  return {
    id: 'rect-1',
    kind: 'rect_cut',
    version: 1,
    enabled: true,
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'min' },
    cutType: 'mortise',
    parameters: { size: { length: 2, width: 0.75 }, depthMode: 'blind', depth: 0.25 },
    placement: { x: 4, z: 3 },
    ...overrides
  };
}

function createEndCutFeature(overrides: Partial<EndCutFeature> = {}): EndCutFeature {
  return {
    id: 'end-1',
    kind: 'end_cut',
    version: 1,
    enabled: true,
    target: { type: 'face', face: 'left_end' },
    reference: { primaryFrom: 'min' },
    cutType: 'mitre',
    lengthMode: 'long_point',
    parameters: { horizontalAngle: 45 },
    ...overrides
  };
}

/** Focus, type into, and blur a FractionInput identified by its label text. */
function setMeasurementField(labelText: string, value: string) {
  const label = screen.getByText(labelText);
  const input = within(label.parentElement as HTMLElement).getByRole('textbox');
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

/** Open the add-cut flow and choose an operation preset. */
function startCut(presetLabel: string) {
  fireEvent.click(screen.getByRole('button', { name: '+ Add Cut' }));
  fireEvent.click(screen.getByText(presetLabel));
}

/** Click a target button in the inspector (not the preview fallback's target list). */
function clickInspectorTarget(name: string) {
  const previewSection = screen.queryByText('Preview Targets')?.parentElement ?? null;
  const button = screen
    .getAllByRole('button', { name })
    .find((candidate) => !previewSection || !previewSection.contains(candidate));
  expect(button).toBeDefined();
  fireEvent.click(button as HTMLElement);
}

function lastFeatures(onDraftFeaturesChange: WorkspaceProps['onDraftFeaturesChange']) {
  const mock = onDraftFeaturesChange as Mock;
  expect(mock).toHaveBeenCalled();
  return mock.mock.calls[mock.mock.calls.length - 1][0] as RectCutFeature[];
}

describe('PartCutsWorkspace', () => {
  it('shows the cuts list with an add button by default', () => {
    render(
      <PartCutsWorkspace
        part={createTestPart({ name: 'Side' })}
        draftFeatures={[]}
        units="imperial"
        selectedFeatureId={null}
        hoveredTarget={null}
        pendingTarget={null}
        onSelectFeature={vi.fn()}
        onDraftFeaturesChange={vi.fn()}
        onHoveredTargetChange={vi.fn()}
        onPendingTargetChange={vi.fn()}
        onExit={vi.fn()}
        onSave={vi.fn()}
        hasUnsavedChanges={false}
      />
    );

    expect(screen.getByText('Cuts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add Cut' })).toBeInTheDocument();
    expect(screen.getByText(/No cuts yet/i)).toBeInTheDocument();
  });

  it('walks through choosing a cut type before adding a cut', () => {
    const onDraftFeaturesChange = vi.fn();
    const onSelectFeature = vi.fn();

    render(
      <PartCutsWorkspace
        part={createTestPart({ name: 'Side' })}
        draftFeatures={[]}
        units="imperial"
        selectedFeatureId={null}
        hoveredTarget={null}
        pendingTarget={null}
        onSelectFeature={onSelectFeature}
        onDraftFeaturesChange={onDraftFeaturesChange}
        onHoveredTargetChange={vi.fn()}
        onPendingTargetChange={vi.fn()}
        onExit={vi.fn()}
        onSave={vi.fn()}
        hasUnsavedChanges={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '+ Add Cut' }));

    expect(screen.getByText(/What kind of cut/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('End Cut'));
    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));

    expect(onDraftFeaturesChange).toHaveBeenCalledWith([
      expect.objectContaining({
        kind: 'end_cut',
        target: { type: 'face', face: 'left_end' },
        parameters: expect.objectContaining({
          horizontalAngle: 45,
          horizontalFlip: false
        })
      })
    ]);
    expect(onSelectFeature).toHaveBeenCalled();
  });

  it('opens a cut card into focused edit mode', () => {
    const part = createTestPart({
      name: 'Rail',
      features: [
        {
          id: 'feature-1',
          kind: 'end_cut',
          version: 1,
          enabled: true,
          target: { type: 'face', face: 'left_end' },
          reference: { primaryFrom: 'min' },
          cutType: 'mitre',
          lengthMode: 'long_point',
          parameters: { horizontalAngle: 45 }
        }
      ]
    });

    render(
      <PartCutsWorkspace
        part={part}
        draftFeatures={part.features ?? []}
        units="imperial"
        selectedFeatureId={null}
        hoveredTarget={null}
        pendingTarget={null}
        onSelectFeature={vi.fn()}
        onDraftFeaturesChange={vi.fn()}
        onHoveredTargetChange={vi.fn()}
        onPendingTargetChange={vi.fn()}
        onExit={vi.fn()}
        onSave={vi.fn()}
        hasUnsavedChanges={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Mitre 45° on Left End/i }));

    expect(screen.getByText('Edit Cut')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Cuts' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Cut' })).toBeInTheDocument();
    expect(screen.getByLabelText('Long Point On')).toBeInTheDocument();
  });

  it('retargets the active draft through the preview fallback controls', () => {
    render(
      <PartCutsWorkspace
        part={createTestPart({ name: 'Stretcher' })}
        draftFeatures={[]}
        units="imperial"
        selectedFeatureId={null}
        hoveredTarget={null}
        pendingTarget={{ type: 'face', face: 'left_end' }}
        onSelectFeature={vi.fn()}
        onDraftFeaturesChange={vi.fn()}
        onHoveredTargetChange={vi.fn()}
        onPendingTargetChange={vi.fn()}
        onExit={vi.fn()}
        onSave={vi.fn()}
        hasUnsavedChanges={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '+ Add Cut' }));
    fireEvent.click(screen.getByText('End Cut'));
    fireEvent.click(
      within(screen.getByText('Preview Targets').parentElement as HTMLElement).getByRole('button', {
        name: 'Right End'
      })
    );

    expect(screen.getAllByText(/Target:/i)[0]).toHaveTextContent('Right End');
  });

  it('supports dado and rabbet operation types in the editor workflow', () => {
    render(
      <PartCutsWorkspace
        part={createTestPart({ name: 'Panel', width: 8 })}
        draftFeatures={[]}
        units="imperial"
        selectedFeatureId={null}
        hoveredTarget={null}
        pendingTarget={null}
        onSelectFeature={vi.fn()}
        onDraftFeaturesChange={vi.fn()}
        onHoveredTargetChange={vi.fn()}
        onPendingTargetChange={vi.fn()}
        onExit={vi.fn()}
        onSave={vi.fn()}
        hasUnsavedChanges={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '+ Add Cut' }));
    fireEvent.click(screen.getByText('Dado'));
    expect(screen.getByText(/Dado spans the full board width/i)).toBeInTheDocument();
  });

  it('normalizes blind-only operations when switching from a through cut', () => {
    const onDraftFeaturesChange = vi.fn();

    render(
      <PartCutsWorkspace
        part={createTestPart({ name: 'Panel', length: 24, width: 8, thickness: 0.75 })}
        draftFeatures={[]}
        units="imperial"
        selectedFeatureId={null}
        hoveredTarget={null}
        pendingTarget={null}
        onSelectFeature={vi.fn()}
        onDraftFeaturesChange={onDraftFeaturesChange}
        onHoveredTargetChange={vi.fn()}
        onPendingTargetChange={vi.fn()}
        onExit={vi.fn()}
        onSave={vi.fn()}
        hasUnsavedChanges={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '+ Add Cut' }));
    fireEvent.click(screen.getByText('Rabbet'));

    expect(screen.getByText('Blind only')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));

    expect(onDraftFeaturesChange).toHaveBeenCalledWith([
      expect.objectContaining({
        cutType: 'rabbet',
        target: { type: 'edge', edge: 'top_front_edge' },
        parameters: expect.objectContaining({ depthMode: 'blind' })
      })
    ]);
  });

  it('lets users flip end-cut direction in edit mode', () => {
    render(
      <PartCutsWorkspace
        part={createTestPart({ name: 'Panel', length: 24, width: 8 })}
        draftFeatures={[]}
        units="imperial"
        selectedFeatureId={null}
        hoveredTarget={null}
        pendingTarget={null}
        onSelectFeature={vi.fn()}
        onDraftFeaturesChange={vi.fn()}
        onHoveredTargetChange={vi.fn()}
        onPendingTargetChange={vi.fn()}
        onExit={vi.fn()}
        onSave={vi.fn()}
        hasUnsavedChanges={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '+ Add Cut' }));
    fireEvent.click(screen.getByText('End Cut'));

    expect(screen.getByLabelText('Long Point On')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Long Point On'), { target: { value: 'back' } });
    expect(screen.getAllByText(/Long point on Back/i).length).toBeGreaterThan(0);
  });

  it('lets users flip bevel direction in edit mode', () => {
    render(
      <PartCutsWorkspace
        part={createTestPart({ name: 'Panel', length: 24, width: 8, thickness: 1 })}
        draftFeatures={[]}
        units="imperial"
        selectedFeatureId={null}
        hoveredTarget={null}
        pendingTarget={null}
        onSelectFeature={vi.fn()}
        onDraftFeaturesChange={vi.fn()}
        onHoveredTargetChange={vi.fn()}
        onPendingTargetChange={vi.fn()}
        onExit={vi.fn()}
        onSave={vi.fn()}
        hasUnsavedChanges={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '+ Add Cut' }));
    fireEvent.click(screen.getByText('End Cut'));
    fireEvent.change(screen.getByLabelText('Cut Style'), { target: { value: 'compound' } });
    fireEvent.change(screen.getByLabelText('Bevel Angle'), { target: { value: '10' } });

    expect(screen.getByLabelText('High Point On')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('High Point On'), { target: { value: 'top' } });
    expect(screen.getAllByText(/High point on Top/i).length).toBeGreaterThan(0);
  });

  it('shows conflict feedback in the list state', () => {
    const part = createTestPart({
      name: 'Leg',
      features: [
        {
          id: 'feature-1',
          kind: 'end_cut',
          version: 1,
          enabled: true,
          target: { type: 'face', face: 'left_end' },
          reference: { primaryFrom: 'min' },
          cutType: 'mitre',
          lengthMode: 'long_point',
          parameters: { horizontalAngle: 45 }
        },
        {
          id: 'feature-2',
          kind: 'end_cut',
          version: 1,
          enabled: true,
          target: { type: 'face', face: 'left_end' },
          reference: { primaryFrom: 'min' },
          cutType: 'bevel',
          lengthMode: 'centerline',
          parameters: { horizontalAngle: 0, verticalAngle: 15 }
        }
      ]
    });

    render(
      <PartCutsWorkspace
        part={part}
        draftFeatures={part.features ?? []}
        units="imperial"
        selectedFeatureId={null}
        hoveredTarget={null}
        pendingTarget={null}
        onSelectFeature={vi.fn()}
        onDraftFeaturesChange={vi.fn()}
        onHoveredTargetChange={vi.fn()}
        onPendingTargetChange={vi.fn()}
        onExit={vi.fn()}
        onSave={vi.fn()}
        hasUnsavedChanges={true}
      />
    );

    expect(screen.getByText('Cut Conflicts')).toBeInTheDocument();
    expect(screen.getAllByText('Conflict').length).toBeGreaterThan(0);
  });

  it('keeps the part-level footer actions in list state', () => {
    render(
      <PartCutsWorkspace
        part={createTestPart({ name: 'Side' })}
        draftFeatures={[]}
        units="imperial"
        selectedFeatureId={null}
        hoveredTarget={null}
        pendingTarget={null}
        onSelectFeature={vi.fn()}
        onDraftFeaturesChange={vi.fn()}
        onHoveredTargetChange={vi.fn()}
        onPendingTargetChange={vi.fn()}
        onExit={vi.fn()}
        onSave={vi.fn()}
        hasUnsavedChanges
      />
    );

    expect(screen.getByRole('button', { name: 'Back to Project' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Part' })).toBeInTheDocument();
  });

  it('walks every operation preset into its step-2 editor', () => {
    const cases: Array<[string, RegExp]> = [
      ['End Cut', /Pick the end and set the angle/],
      ['Corner Notch', /Pick the corner and size the notch/],
      ['Edge Notch', /Pick the edge and size the notch/],
      ['Cutout', /Pick the face and place the cutout/],
      ['Dado', /Pick the face and lay out the dado/],
      ['Stopped Dado', /Pick the face and lay out the dado/],
      ['Rabbet', /Pick the edge and size the rabbet/],
      ['Groove', /Pick the face and lay out the groove/],
      ['Stopped Groove', /Pick the face and lay out the groove/],
      ['Mortise', /Pick the face and place the mortise/]
    ];

    for (const [label, stepTitle] of cases) {
      const { unmount } = renderWorkspace();
      startCut(label);
      expect(screen.getByText(stepTitle)).toBeInTheDocument();
      unmount();
    }
  });

  it('edits an existing cut, updates its fields, and saves it back', () => {
    const feature = createMortiseFeature();
    const { props } = renderWorkspace({ draftFeatures: [feature] });

    fireEvent.click(screen.getByRole('button', { name: /Target: Top Face/ }));

    expect(screen.getByText('Edit Cut')).toBeInTheDocument();
    expect(screen.getByText('Editing')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Label (optional)'), { target: { value: 'Tenon pocket' } });
    setMeasurementField('Offset Along Length', '3');
    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features).toHaveLength(1);
    expect(features[0]).toMatchObject({
      id: 'rect-1',
      label: 'Tenon pocket',
      placement: { x: 3, z: 3 }
    });
    expect(props.onSelectFeature).toHaveBeenCalledWith('rect-1');
    expect(screen.getByText('Cuts')).toBeInTheDocument();
  });

  it('cancels the editor back to the cut list', () => {
    const { props } = renderWorkspace();

    startCut('Mortise');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByText('Cuts')).toBeInTheDocument();
    expect(props.onSelectFeature).toHaveBeenLastCalledWith(null);
    expect(props.onPendingTargetChange).toHaveBeenLastCalledWith(null);
    expect(props.onDraftFeaturesChange).not.toHaveBeenCalled();
  });

  it('toggles a cut enabled state from the list', () => {
    const feature = createMortiseFeature();
    const { props } = renderWorkspace({ draftFeatures: [feature] });

    fireEvent.click(screen.getByRole('checkbox'));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features[0]).toMatchObject({ id: 'rect-1', enabled: false });
  });

  it('reorders cuts through the actions menu', async () => {
    const user = userEvent.setup();
    const first = createMortiseFeature();
    const second = createEndCutFeature();
    const { props } = renderWorkspace({ draftFeatures: [first, second], hasUnsavedChanges: true });

    await user.click(screen.getByRole('button', { name: 'Actions for cut 1' }));
    expect(screen.getByRole('menuitem', { name: 'Move Up' })).toHaveAttribute('aria-disabled', 'true');
    await user.click(screen.getByRole('menuitem', { name: 'Move Down' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features.map((feature) => feature.id)).toEqual(['end-1', 'rect-1']);
  });

  it('moves a later cut up through the actions menu', async () => {
    const user = userEvent.setup();
    const first = createMortiseFeature();
    const second = createEndCutFeature();
    const { props } = renderWorkspace({ draftFeatures: [first, second] });

    await user.click(screen.getByRole('button', { name: 'Actions for cut 2' }));
    expect(screen.getByRole('menuitem', { name: 'Move Down' })).toHaveAttribute('aria-disabled', 'true');
    await user.click(screen.getByRole('menuitem', { name: 'Move Up' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features.map((feature) => feature.id)).toEqual(['end-1', 'rect-1']);
  });

  it('duplicates a cut and opens the duplicate for editing', async () => {
    const user = userEvent.setup();
    const feature = createMortiseFeature();
    const { props } = renderWorkspace({ draftFeatures: [feature] });

    await user.click(screen.getByRole('button', { name: 'Actions for cut 1' }));
    await user.click(screen.getByRole('menuitem', { name: 'Duplicate' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features).toHaveLength(2);
    expect(features[1].id).not.toBe('rect-1');
    expect(features[1]).toMatchObject({ cutType: 'mortise' });
    expect(props.onSelectFeature).toHaveBeenCalledWith(features[1].id);
    expect(screen.getByText('Edit Cut')).toBeInTheDocument();
  });

  it('mirrors an end cut to the opposite end', async () => {
    const user = userEvent.setup();
    const feature = createEndCutFeature({ label: 'Left mitre' });
    const { props } = renderWorkspace({ draftFeatures: [feature] });

    await user.click(screen.getByRole('button', { name: 'Actions for cut 1' }));
    await user.click(screen.getByRole('menuitem', { name: 'Mirror to Opposite End' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features).toHaveLength(2);
    expect(features[1]).toMatchObject({
      kind: 'end_cut',
      target: { type: 'face', face: 'right_end' },
      label: 'Left mitre (Opposite End)'
    });
    expect(screen.getByText('Edit Cut')).toBeInTheDocument();
  });

  it('mirrors a rect cut across the length', async () => {
    const user = userEvent.setup();
    const feature = createMortiseFeature();
    const { props } = renderWorkspace({ draftFeatures: [feature] });

    await user.click(screen.getByRole('button', { name: 'Actions for cut 1' }));
    await user.click(screen.getByRole('menuitem', { name: 'Mirror Across Length' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features).toHaveLength(2);
    expect(features[1].id).not.toBe('rect-1');
  });

  it('deletes a cut and clears its selection', async () => {
    const user = userEvent.setup();
    const feature = createMortiseFeature();
    const { props } = renderWorkspace({ draftFeatures: [feature], selectedFeatureId: 'rect-1' });

    await user.click(screen.getByRole('button', { name: 'Actions for cut 1' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));

    expect(lastFeatures(props.onDraftFeaturesChange)).toEqual([]);
    expect(props.onSelectFeature).toHaveBeenCalledWith(null);
  });

  it('builds a corner notch on a chosen corner', () => {
    const { props } = renderWorkspace();

    startCut('Corner Notch');
    clickInspectorTarget('Back-Right Corner');
    setMeasurementField('Cross-Cut Width', '1 1/2');
    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features[0]).toMatchObject({
      cutType: 'corner_notch',
      target: { type: 'corner', corner: 'back_right_corner' },
      parameters: expect.objectContaining({ size: { length: 0.75, width: 1.5 } }),
      placement: { x: 0, z: 0 }
    });
  });

  it('builds an edge notch with per-side offsets', () => {
    const { props } = renderWorkspace();

    startCut('Edge Notch');
    expect(screen.getByText('Offset Along Length')).toBeInTheDocument();
    setMeasurementField('Offset Along Length', '1');

    clickInspectorTarget('Left');
    expect(screen.getByText('Offset Across Width')).toBeInTheDocument();
    setMeasurementField('Offset Across Width', '2');
    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features[0]).toMatchObject({
      cutType: 'edge_notch',
      target: { type: 'edge', edge: 'top_left_edge' },
      placement: { x: 0, z: 2 }
    });
  });

  it('builds a rabbet and derives the cross width from the edge direction', () => {
    const { props } = renderWorkspace();

    startCut('Rabbet');
    expect(screen.getByText('Blind only')).toBeInTheDocument();

    // Default edge runs along the length: shoulder maps to width
    setMeasurementField('Shoulder Width', '1');

    // Switch to an edge running across the width: shoulder maps to length
    clickInspectorTarget('Top-Left Edge');
    setMeasurementField('Shoulder Width', '2');
    setMeasurementField('Blind Depth', '3/8');
    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features[0]).toMatchObject({
      cutType: 'rabbet',
      target: { type: 'edge', edge: 'top_left_edge' },
      parameters: expect.objectContaining({
        size: { length: 2, width: 12 },
        depthMode: 'blind',
        depth: 0.375
      })
    });
  });

  it('switches a cutout between through and blind depth', () => {
    const { props } = renderWorkspace();

    startCut('Cutout');
    expect((screen.getByLabelText('Depth') as HTMLSelectElement).value).toBe('through');

    fireEvent.change(screen.getByLabelText('Depth'), { target: { value: 'blind' } });
    expect(screen.getByText('Blind Depth')).toBeInTheDocument();
    setMeasurementField('Blind Depth', '1/2');
    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features[0]).toMatchObject({
      cutType: 'cutout',
      parameters: expect.objectContaining({ depthMode: 'blind', depth: 0.5 })
    });
  });

  it('keeps grooves pinned to the full board length', () => {
    const { props } = renderWorkspace();

    startCut('Groove');
    expect(screen.getByText(/Grooves always run the full board length/i)).toBeInTheDocument();

    // Editing the run keeps the derived full-length value
    setMeasurementField('Full Board Run', '5');
    setMeasurementField('Groove Width', '1');
    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features[0]).toMatchObject({
      cutType: 'groove',
      parameters: expect.objectContaining({ size: { length: 24, width: 1 } }),
      placement: { x: 0, z: 0 }
    });
  });

  it('builds a stopped dado with a limited run and fixed cross width', () => {
    const { props } = renderWorkspace();

    startCut('Stopped Dado');
    expect(screen.getByText(/Stopped dados span the full board width/i)).toBeInTheDocument();
    setMeasurementField('Run Along Blank', '5');
    setMeasurementField('Offset Along Length', '2');
    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features[0]).toMatchObject({
      cutType: 'stopped_dado',
      parameters: expect.objectContaining({ size: { length: 5, width: 12 } }),
      placement: { x: 2, z: 0 }
    });
  });

  it('surfaces validation errors and blocks saving until fixed', () => {
    const { props } = renderWorkspace();

    startCut('Mortise');
    setMeasurementField('Run Along Blank', '30');

    expect(screen.getByText(/runs past the blank/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Cut' })).toBeDisabled();

    setMeasurementField('Run Along Blank', '2');
    expect(screen.queryByText(/runs past the blank/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));
    expect(props.onDraftFeaturesChange).toHaveBeenCalled();
  });

  it('flips end-cut directions when angles go negative', () => {
    renderWorkspace();

    startCut('End Cut');
    fireEvent.change(screen.getByLabelText('Mitre Angle'), { target: { value: '-30' } });
    expect(screen.getAllByText(/Long point on Back/i).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText('Cut Style'), { target: { value: 'compound' } });
    fireEvent.change(screen.getByLabelText('Bevel Angle'), { target: { value: '-15' } });

    expect((screen.getByLabelText('High Point On') as HTMLSelectElement).value).toBe('top');
  });

  it('retargets an end cut to the right end before saving', () => {
    const { props } = renderWorkspace();

    startCut('End Cut');
    clickInspectorTarget('Right End');
    expect(screen.getByText('Resulting Lengths')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features[0]).toMatchObject({
      kind: 'end_cut',
      target: { type: 'face', face: 'right_end' },
      reference: { primaryFrom: 'max' }
    });
  });

  it('notes when a saved end cut keeps a non-default reference', () => {
    const feature = createEndCutFeature({
      lengthMode: 'short_point',
      parameters: { horizontalAngle: 45, reference: { mode: 'short_point', value: 22 } }
    });
    renderWorkspace({ draftFeatures: [feature] });

    fireEvent.click(screen.getByRole('button', { name: /Target: Left End/ }));

    expect(screen.getByText(/keeps its saved short_point reference/i)).toBeInTheDocument();
  });

  it('drives rect drafts through the preview fallback handles', () => {
    const { props } = renderWorkspace();

    startCut('Mortise');
    const handlesSection = screen.getByText('Preview Handles').parentElement as HTMLElement;
    expect(within(handlesSection).getByText('mortise')).toBeInTheDocument();

    fireEvent.click(within(handlesSection).getByRole('button', { name: 'Extend Run' }));
    fireEvent.click(within(handlesSection).getByRole('button', { name: 'Widen' }));
    fireEvent.click(within(handlesSection).getByRole('button', { name: 'Move Right' }));
    fireEvent.click(within(handlesSection).getByRole('button', { name: 'Move Right' }));
    fireEvent.click(within(handlesSection).getByRole('button', { name: 'Move Left' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Cut' }));

    const features = lastFeatures(props.onDraftFeaturesChange);
    expect(features[0]).toMatchObject({
      cutType: 'mortise',
      parameters: expect.objectContaining({ size: { length: 2.25, width: 1 } }),
      placement: { x: 0.25, z: 0.25 }
    });
  });

  it('omits the widen handle for stopped dados in the preview fallback', () => {
    renderWorkspace();

    startCut('Stopped Dado');
    const handlesSection = screen.getByText('Preview Handles').parentElement as HTMLElement;

    expect(within(handlesSection).getByRole('button', { name: 'Extend Run' })).toBeInTheDocument();
    expect(within(handlesSection).queryByRole('button', { name: 'Widen' })).not.toBeInTheDocument();
  });

  it('tells end-cut editors to use the inspector instead of handles', () => {
    renderWorkspace();

    startCut('End Cut');

    expect(screen.getByText(/Adjust this operation in the inspector/i)).toBeInTheDocument();
  });

  it('retargets rect drafts through preview target activation', () => {
    renderWorkspace();

    startCut('Mortise');
    fireEvent.click(
      within(screen.getByText('Preview Targets').parentElement as HTMLElement).getByRole('button', {
        name: 'Bottom Face'
      })
    );

    expect(screen.getAllByText(/Target:/i)[0]).toHaveTextContent('Bottom Face');
  });

  it('retargets rect drafts through the inspector face buttons', () => {
    renderWorkspace();

    startCut('Cutout');
    clickInspectorTarget('Bottom Face');

    expect(screen.getAllByText(/Target:/i)[0]).toHaveTextContent('Bottom Face');
  });

  it('forwards the hovered target to the preview', () => {
    // The workspace no longer restates the hovered pick itself — the preview
    // overlay owns that feedback, so assert the target reaches the preview.
    renderWorkspace({ hoveredTarget: { type: 'face', face: 'top_face' } });

    expect(screen.getByText(/Active target:/i)).toHaveTextContent('Top Face');
  });

  it('wires the footer actions to exit and save', () => {
    const { props } = renderWorkspace({ hasUnsavedChanges: true });

    fireEvent.click(screen.getByRole('button', { name: 'Back to Project' }));
    expect(props.onExit).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Save Part' }));
    expect(props.onSave).toHaveBeenCalled();
  });

  it('disables saving the part while blocking conflicts exist', () => {
    const conflictingFeatures = [
      createEndCutFeature(),
      createEndCutFeature({ id: 'end-2', cutType: 'bevel', parameters: { horizontalAngle: 0, verticalAngle: 15 } })
    ];
    renderWorkspace({ draftFeatures: conflictingFeatures, hasUnsavedChanges: true });

    expect(screen.getByRole('button', { name: 'Save Part' })).toBeDisabled();
  });
  describe('draft keyboard shortcuts', () => {
    const seedDraftHistory = () => {
      const store = usePartCutsEditingStore.getState();
      store.startEditingPartCuts('p1', 'Panel', []);
      store.setDraftFeatures([createMortiseFeature({ id: 'first' })]);
      store.setDraftFeatures([createMortiseFeature({ id: 'first' }), createMortiseFeature({ id: 'second' })]);
    };

    it('steps the cut draft back and forward with the platform shortcuts', () => {
      seedDraftHistory();
      renderWorkspace();

      fireEvent.keyDown(window, { key: 'z', metaKey: true });
      expect(usePartCutsEditingStore.getState().draftFeatures.map((f) => f.id)).toEqual(['first']);

      fireEvent.keyDown(window, { key: 'z', metaKey: true, shiftKey: true });
      expect(usePartCutsEditingStore.getState().draftFeatures.map((f) => f.id)).toEqual(['first', 'second']);

      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      expect(usePartCutsEditingStore.getState().draftFeatures.map((f) => f.id)).toEqual(['first']);

      fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
      expect(usePartCutsEditingStore.getState().draftFeatures.map((f) => f.id)).toEqual(['first', 'second']);
    });

    it('ignores unmodified keys and keystrokes aimed at text fields', () => {
      seedDraftHistory();
      renderWorkspace();
      const before = usePartCutsEditingStore.getState().draftFeatures.length;

      // No modifier: plain "z" must not undo.
      fireEvent.keyDown(window, { key: 'z' });
      expect(usePartCutsEditingStore.getState().draftFeatures).toHaveLength(before);

      // Typing the same shortcut inside a text field must not undo either.
      startCut('Mortise');
      const label = screen.getByPlaceholderText('Face-frame left stile');
      fireEvent.keyDown(label, { key: 'z', metaKey: true });
      expect(usePartCutsEditingStore.getState().draftFeatures).toHaveLength(before);
    });

    it('drives undo and redo from the header buttons', () => {
      seedDraftHistory();
      renderWorkspace();

      fireEvent.click(screen.getByRole('button', { name: 'Undo cut change' }));
      expect(usePartCutsEditingStore.getState().draftFeatures.map((f) => f.id)).toEqual(['first']);

      fireEvent.click(screen.getByRole('button', { name: 'Redo cut change' }));
      expect(usePartCutsEditingStore.getState().draftFeatures.map((f) => f.id)).toEqual(['first', 'second']);
    });
  });

  describe('target-aware field labels', () => {
    it('labels tenon fields by tongue dimensions and hides the controls it forces', () => {
      renderWorkspace();
      startCut('Tenon');

      expect(screen.getByText('Tenon Length')).toBeInTheDocument();
      expect(screen.getByText('Tenon Width')).toBeInTheDocument();
      expect(screen.getByText('Tenon Thickness')).toBeInTheDocument();
      expect(screen.getByText('Shoulder Offset')).toBeInTheDocument();
      // A tenon has no through/blind choice and no along-length offset.
      expect(screen.queryByText('Depth')).not.toBeInTheDocument();
      expect(screen.queryByText('Offset Along Length')).not.toBeInTheDocument();
    });

    it('labels side-face pockets across the thickness', () => {
      renderWorkspace();
      startCut('Mortise');

      expect(screen.getByText('Cross-Cut Width')).toBeInTheDocument();
      expect(screen.getByText('Blind Depth')).toBeInTheDocument();

      clickInspectorTarget('Front Face');

      expect(screen.getByText('Height Across Thickness')).toBeInTheDocument();
      expect(screen.getByText('Depth Into Width')).toBeInTheDocument();
      expect(screen.getByText('Offset Up From Bottom')).toBeInTheDocument();
      expect(screen.getByText(/recess into the board width/i)).toBeInTheDocument();
    });
  });

  describe('cut picker layout', () => {
    it('lets an odd trailing tile fill its row so groups have no gap', () => {
      renderWorkspace();
      fireEvent.click(screen.getByRole('button', { name: '+ Add Cut' }));

      // Ends & Edges holds three tiles, so Tenon is the odd one out.
      const tenon = screen.getByRole('button', { name: /^Tenon/ });
      expect(tenon.className).toContain('col-span-2');
      // Pockets & Openings holds two, so neither spans.
      expect(screen.getByRole('button', { name: /^Mortise/ }).className).not.toContain('col-span-2');
    });
  });
});
