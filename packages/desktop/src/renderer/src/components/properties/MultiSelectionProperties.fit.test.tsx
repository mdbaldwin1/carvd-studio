import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTestPart, createTestStock } from '../../../../../tests/helpers/factories';
import type { RectCutFeature } from '../../types';
import { MultiSelectionProperties } from './MultiSelectionProperties';
vi.unmock('three');

const lap: RectCutFeature = {
  id: 'lap',
  version: 1,
  enabled: true,
  kind: 'rect_cut',
  cutType: 'half_lap',
  target: { type: 'face', face: 'top_face' },
  reference: { primaryFrom: 'min' },
  placement: { x: 12, z: 0 },
  parameters: { size: { length: 0.75, width: 0 }, depthMode: 'blind', depth: 0.375 }
};

it.each(['board', 'rod', 'insert'] as const)(
  'offers a half-lap board recipe only for a board mate, not %s stock',
  (form) => {
    const host = createTestPart({ id: 'host', length: 36, width: 12, thickness: 0.75, features: [lap] });
    const mate = createTestPart({
      id: 'mate',
      stockId: 'stock',
      length: 11,
      width: 12,
      thickness: 0.375,
      rotation: { x: 0, y: 0, z: 90 },
      position: { x: -6, y: 6, z: 0 }
    });
    render(
      <MultiSelectionProperties
        selectedPartIds={['host', 'mate']}
        selectedGroupIds={[]}
        parts={[host, mate]}
        stocks={[createTestStock({ id: 'stock', form })]}
        units="imperial"
        isCreateStockModalOpen={false}
        onOpenCreateStockModal={vi.fn()}
        onCloseCreateStockModal={vi.fn()}
        onAssignStockToSelectedParts={vi.fn()}
        onDuplicateSelectedParts={vi.fn()}
        onRequestDeleteParts={vi.fn()}
        onCreateStockAndAssign={vi.fn()}
      />
    );
    const button = screen.queryByRole('button', { name: 'Fit Half Lap to Mating Part' });
    if (form === 'board') expect(button).toBeInTheDocument();
    else expect(button).not.toBeInTheDocument();
  }
);
