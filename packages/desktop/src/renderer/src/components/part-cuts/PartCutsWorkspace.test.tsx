import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../../tests/helpers/factories';
import { PartCutsWorkspace } from './PartCutsWorkspace';

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
    expect(screen.getByText(/board length stays fixed/i)).toBeInTheDocument();
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

    fireEvent.change(screen.getByLabelText('Removal Type'), { target: { value: 'rabbet' } });
    expect(screen.getByText(/Rabbet runs the full edge length/i)).toBeInTheDocument();
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
});
