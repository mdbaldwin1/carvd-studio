import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AssemblyPartsList } from './AssemblyPartsList';

describe('AssemblyPartsList', () => {
  it('shows operation badges and summaries for feature-bearing assembly parts', () => {
    render(
      <AssemblyPartsList
        units="imperial"
        parts={[
          {
            id: 'part-1',
            name: 'Front Rail',
            length: 24,
            width: 2,
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
                parameters: {
                  horizontalAngle: 45
                }
              }
            ]
          },
          {
            id: 'part-2',
            name: 'Back Rail',
            length: 24,
            width: 2,
            thickness: 0.75
          }
        ]}
      />
    );

    expect(screen.getByText('Ops 1')).toBeInTheDocument();
    expect(screen.getByText('Mitre 45° on Left End · Long point on Front')).toBeInTheDocument();
    expect(screen.getByText('Back Rail')).toBeInTheDocument();
  });
});
