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
    expect(screen.getAllByText(/23 1\/2/)).not.toHaveLength(0);
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
          verticalAngle: 10,
          horizontalFlip: false
        })
      })
    ]);
  });

  it('shows anchored board-length measurements for end cuts', () => {
    render(
      <SinglePartFeaturesCard
        selectedPart={createTestPart({
          length: 24,
          width: 4,
          thickness: 0.75
        })}
        units="imperial"
        onFeaturesChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /End Cut/ }));
    fireEvent.change(screen.getByLabelText('Cut Style'), { target: { value: 'mitre' } });
    fireEvent.change(screen.getByLabelText('Mitre Angle'), { target: { value: '45' } });

    expect(screen.getByText(/Resulting Lengths/i)).toBeInTheDocument();
    expect(screen.getByText(/Long point stays locked to the board length/i)).toBeInTheDocument();
    expect(screen.getByText(/Blank 24"/)).toBeInTheDocument();
    expect(screen.getByText(/Long Point 24"/)).toBeInTheDocument();
    expect(screen.getByText(/Short Point 20"/)).toBeInTheDocument();
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

  it('limits cutout targets to top and bottom faces in the POC workflow', () => {
    render(<SinglePartFeaturesCard selectedPart={createTestPart()} units="imperial" onFeaturesChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Cutout/ }));

    expect(screen.getByRole('button', { name: 'Top Face' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bottom Face' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Front Face' })).not.toBeInTheDocument();
  });

  it('restricts blind edge notches to top/bottom targets', () => {
    render(
      <SinglePartFeaturesCard
        selectedPart={createTestPart({ thickness: 0.75 })}
        units="imperial"
        onFeaturesChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Edge Notch/ }));
    fireEvent.change(screen.getByLabelText('Depth'), { target: { value: 'blind' } });

    expect(screen.getByRole('button', { name: 'Top-Front Edge' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Front-Left Edge' })).not.toBeInTheDocument();
    expect(screen.getByText(/Blind notch previews currently support top or bottom targets/i)).toBeInTheDocument();
  });
});
