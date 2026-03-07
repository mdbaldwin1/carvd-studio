import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../../tests/helpers/factories';
import { PartCutsWorkspace } from './PartCutsWorkspace';

describe('PartCutsWorkspace', () => {
  it('adds a new operation from the workspace inspector', () => {
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

    fireEvent.click(screen.getByText('End Cut'));
    fireEvent.click(screen.getByRole('button', { name: 'Add Operation' }));

    expect(onDraftFeaturesChange).toHaveBeenCalledWith([
      expect.objectContaining({
        kind: 'end_cut',
        target: { type: 'face', face: 'left_end' }
      })
    ]);
    expect(onSelectFeature).toHaveBeenCalled();
  });

  it('adds a paired preset operation group from the left rail', () => {
    const onDraftFeaturesChange = vi.fn();
    const onSelectFeature = vi.fn();

    render(
      <PartCutsWorkspace
        part={createTestPart({ name: 'Rail' })}
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

    fireEvent.click(screen.getByText('Mitre Both Ends'));

    expect(onDraftFeaturesChange).toHaveBeenCalledWith([
      expect.objectContaining({ kind: 'end_cut', target: { type: 'face', face: 'left_end' } }),
      expect.objectContaining({ kind: 'end_cut', target: { type: 'face', face: 'right_end' } })
    ]);
    expect(onSelectFeature).toHaveBeenCalled();
  });

  it('adds richer preset groups and constrained joinery starters from the left rail', () => {
    const onDraftFeaturesChange = vi.fn();

    render(
      <PartCutsWorkspace
        part={createTestPart({ name: 'Rail' })}
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

    fireEvent.click(screen.getByText('Top Front Corners'));
    expect(onDraftFeaturesChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        kind: 'rect_cut',
        cutType: 'corner_notch',
        target: { type: 'corner', corner: 'front_top_left_corner' }
      }),
      expect.objectContaining({
        kind: 'rect_cut',
        cutType: 'corner_notch',
        target: { type: 'corner', corner: 'front_top_right_corner' }
      })
    ]);
  });

  it('reorders operations in the workspace stack', () => {
    const onDraftFeaturesChange = vi.fn();
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
        },
        {
          id: 'feature-2',
          kind: 'rect_cut',
          version: 1,
          enabled: true,
          target: { type: 'corner', corner: 'front_bottom_left_corner' },
          reference: { primaryFrom: 'min', secondaryFrom: 'min' },
          cutType: 'corner_notch',
          parameters: {
            size: { length: 0.75, width: 0.75 },
            depthMode: 'through'
          },
          placement: { x: 0, z: 0 }
        }
      ]
    });

    render(
      <PartCutsWorkspace
        part={part}
        draftFeatures={part.features ?? []}
        units="imperial"
        selectedFeatureId="feature-1"
        hoveredTarget={null}
        pendingTarget={null}
        onSelectFeature={vi.fn()}
        onDraftFeaturesChange={onDraftFeaturesChange}
        onHoveredTargetChange={vi.fn()}
        onPendingTargetChange={vi.fn()}
        onExit={vi.fn()}
        onSave={vi.fn()}
        hasUnsavedChanges={true}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Move Down' })[0]);

    expect(onDraftFeaturesChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'feature-2' }),
      expect.objectContaining({ id: 'feature-1' })
    ]);
  });

  it('mirrors an operation from the workspace stack', () => {
    const onDraftFeaturesChange = vi.fn();
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
        selectedFeatureId="feature-1"
        hoveredTarget={null}
        pendingTarget={null}
        onSelectFeature={vi.fn()}
        onDraftFeaturesChange={onDraftFeaturesChange}
        onHoveredTargetChange={vi.fn()}
        onPendingTargetChange={vi.fn()}
        onExit={vi.fn()}
        onSave={vi.fn()}
        hasUnsavedChanges
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mirror to Opposite End' }));

    expect(onDraftFeaturesChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'feature-1' }),
      expect.objectContaining({
        kind: 'end_cut',
        target: { type: 'face', face: 'right_end' }
      })
    ]);
  });

  it('shows selected-operation preview feedback and same-part conflicts', () => {
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
        selectedFeatureId="feature-1"
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

    expect(screen.getAllByText('Selected Operation').length).toBeGreaterThan(0);
    expect(screen.getByText('Inspector Target')).toBeInTheDocument();
    expect(screen.getByText('Same-Part Feedback')).toBeInTheDocument();
    expect(screen.getByText('Draft Status')).toBeInTheDocument();
    expect(screen.getByText('Workflow')).toBeInTheDocument();
    expect(screen.getAllByText('Conflict').length).toBeGreaterThan(0);
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

    fireEvent.click(screen.getByText('End Cut'));
    fireEvent.click(
      within(screen.getByText('Preview Targets').parentElement as HTMLElement).getByRole('button', {
        name: 'Right End'
      })
    );

    expect(screen.getByText('Selected target:', { exact: false })).toHaveTextContent('Right End');
  });

  it('filters preview fallback targets to the supported cutout faces', () => {
    render(
      <PartCutsWorkspace
        part={createTestPart({ name: 'Panel' })}
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

    fireEvent.click(screen.getByText('Cutout'));

    const previewTargets = within(screen.getByText('Preview Targets').parentElement as HTMLElement);
    expect(previewTargets.getByRole('button', { name: 'Top Face' })).toBeInTheDocument();
    expect(previewTargets.getByRole('button', { name: 'Bottom Face' })).toBeInTheDocument();
    expect(previewTargets.queryByRole('button', { name: 'Front Face' })).not.toBeInTheDocument();
  });

  it('supports dado and rabbet operation types in the inspector', () => {
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

    fireEvent.click(screen.getByText('Dado'));
    expect(screen.getByText(/Dado runs full board width/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Removal Type'), { target: { value: 'rabbet' } });
    expect(screen.getByText(/Rabbet runs full edge length/i)).toBeInTheDocument();
  });

  it('uses explicit part-level footer actions', () => {
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
});
