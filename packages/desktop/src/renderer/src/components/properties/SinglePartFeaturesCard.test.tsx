import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SinglePartFeaturesCard } from './SinglePartFeaturesCard';
import { createTestPart } from '../../../../../tests/helpers/factories';
import { useProjectStore } from '@renderer/store/projectStore';

describe('SinglePartFeaturesCard', () => {
  beforeEach(() => {
    useProjectStore.getState().newProject();
  });

  it('shows the blank size and existing operations in woodworking language', () => {
    render(
      <SinglePartFeaturesCard
        selectedPart={createTestPart({
          length: 23.5,
          width: 3,
          thickness: 0.75,
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
        })}
        units="imperial"
        onFeaturesChange={vi.fn()}
      />
    );

    expect(screen.getByText('Blank Size')).toBeInTheDocument();
    expect(screen.getByText(/23 1\/2/)).toBeInTheDocument();
    expect(screen.getByText(/Mitre 45° on Left End/)).toBeInTheDocument();
  });

  it('filters targets based on the selected operation', () => {
    render(<SinglePartFeaturesCard selectedPart={createTestPart()} units="imperial" onFeaturesChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Corner Notch/ }));

    expect(screen.getByRole('button', { name: 'Back-Bottom-Left Corner' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Left End' })).not.toBeInTheDocument();
  });

  it('creates a new end-cut feature from the guided workflow', () => {
    const onFeaturesChange = vi.fn();

    render(
      <SinglePartFeaturesCard selectedPart={createTestPart()} units="imperial" onFeaturesChange={onFeaturesChange} />
    );

    fireEvent.click(screen.getByRole('button', { name: /End Cut/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Right End' }));
    fireEvent.change(screen.getByLabelText('Cut Style'), { target: { value: 'compound' } });
    fireEvent.change(screen.getByLabelText('Mitre Angle'), { target: { value: '22.5' } });
    fireEvent.change(screen.getByLabelText('Bevel Angle'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Operation' }));

    expect(onFeaturesChange).toHaveBeenCalledTimes(1);
    expect(onFeaturesChange).toHaveBeenCalledWith([
      expect.objectContaining({
        kind: 'end_cut',
        target: { type: 'face', face: 'right_end' },
        cutType: 'compound',
        parameters: expect.objectContaining({
          horizontalAngle: 22.5,
          verticalAngle: 10
        })
      })
    ]);
  });

  it('can disable an existing operation without removing it', () => {
    const onFeaturesChange = vi.fn();

    render(
      <SinglePartFeaturesCard
        selectedPart={createTestPart({
          features: [
            {
              id: 'feature-1',
              kind: 'rect_cut',
              version: 1,
              enabled: true,
              target: { type: 'corner', corner: 'back_bottom_left_corner' },
              reference: { primaryFrom: 'min', secondaryFrom: 'min' },
              cutType: 'corner_notch',
              parameters: {
                size: { length: 0.75, width: 0.75 },
                depthMode: 'through'
              },
              placement: { x: 0, z: 0 }
            }
          ]
        })}
        units="imperial"
        onFeaturesChange={onFeaturesChange}
      />
    );

    fireEvent.click(screen.getByLabelText('Enable operation 1'));

    expect(onFeaturesChange).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'feature-1',
        enabled: false
      })
    ]);
  });
});
