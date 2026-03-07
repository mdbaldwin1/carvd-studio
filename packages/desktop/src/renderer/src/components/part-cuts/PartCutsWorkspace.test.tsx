import { fireEvent, render, screen } from '@testing-library/react';
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
        onSelectFeature={onSelectFeature}
        onDraftFeaturesChange={onDraftFeaturesChange}
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
        onSelectFeature={vi.fn()}
        onDraftFeaturesChange={onDraftFeaturesChange}
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
});
