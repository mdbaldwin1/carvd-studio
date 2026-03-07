import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../../tests/helpers/factories';
import { SinglePartCutsSummaryCard } from './SinglePartCutsSummaryCard';

describe('SinglePartCutsSummaryCard', () => {
  it('shows empty state and edit entry', () => {
    const onEditCuts = vi.fn();
    render(<SinglePartCutsSummaryCard selectedPart={createTestPart()} units="imperial" onEditCuts={onEditCuts} />);

    expect(screen.getByText('No operations authored yet.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Cuts Workspace' }));
    expect(onEditCuts).toHaveBeenCalled();
  });

  it('shows conflict copy when feature conflicts exist', () => {
    render(
      <SinglePartCutsSummaryCard
        selectedPart={createTestPart({
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
        })}
        units="imperial"
        onEditCuts={vi.fn()}
      />
    );

    expect(screen.getByText(/Conflict:/)).toBeInTheDocument();
  });
});
