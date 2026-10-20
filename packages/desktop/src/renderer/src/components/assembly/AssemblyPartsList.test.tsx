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
            name: 'Front Rail',
            length: 24,
            width: 2,
            thickness: 0.75,
            relativePosition: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            stockId: null,
            grainSensitive: false,
            grainDirection: 'length',
            color: '#c4a574',
            features: [
              {
                id: 'feature-1',
                kind: 'end_cut',
                version: 1 as const,
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
            name: 'Back Rail',
            length: 24,
            width: 2,
            thickness: 0.75,
            relativePosition: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            stockId: null,
            grainSensitive: false,
            grainDirection: 'length',
            color: '#c4a574'
          }
        ]}
      />
    );

    expect(screen.getByText('Ops 1')).toBeInTheDocument();
    expect(screen.getByText('Mitre 45° on Left End · Long point on Front')).toBeInTheDocument();
    expect(screen.getByText('Back Rail')).toBeInTheDocument();
  });
});
