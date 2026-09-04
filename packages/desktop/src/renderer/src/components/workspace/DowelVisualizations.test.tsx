import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DowelVisualizations } from './DowelVisualizations';

vi.unmock('three');

describe('DowelVisualizations', () => {
  it('renders derived non-part solids and marks misaligned dowels', () => {
    const { container } = render(
      <DowelVisualizations
        visualizations={[
          {
            jointId: 'joint-1',
            memberIndex: 0,
            center: { x: 0, y: 0.5, z: 0 },
            axis: { x: 0, y: -1, z: 0 },
            diameter: 0.375,
            length: 0.75,
            aligned: true
          },
          {
            jointId: 'joint-1',
            memberIndex: 1,
            center: { x: 2, y: 0.5, z: 0 },
            axis: { x: 0, y: -1, z: 0 },
            diameter: 0.375,
            length: 0.75,
            aligned: false
          }
        ]}
      />
    );

    expect(container.querySelectorAll('mesh')).toHaveLength(2);
    expect(container.querySelector('[name="dowel-joint-1-1"]')).toHaveAttribute('data-aligned', 'false');
  });
});
