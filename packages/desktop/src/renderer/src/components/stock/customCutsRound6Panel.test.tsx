import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { CutListPartsTab } from './CutListPartsTab';
import { createTestPart, createTestStock } from '../../../../../tests/helpers/factories';
import { generateOptimizedCutList } from '../../utils/cutListOptimizer';
import type { RoundedCutFeature } from '../../types';

describe('K4 panel machining UI', () => {
  it('separates finished-panel operations from stock strips with a clear sequence', () => {
    const stock = createTestStock({ length: 48, width: 4, thickness: 1 });
    const cut: RoundedCutFeature = {
      id: 'slot',
      kind: 'rounded_cut',
      version: 1,
      enabled: true,
      label: 'Centered handhold',
      cutType: 'rounded_slot',
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'center', secondaryFrom: 'center' },
      placement: { primary: 0, secondary: 0, rotation: 0 },
      parameters: { length: 4, width: 2, cornerRadius: 1, depthMode: 'through' }
    };
    const part = createTestPart({
      name: 'Panel',
      length: 20,
      width: 12,
      thickness: 1,
      glueUpPanel: true,
      stockId: stock.id,
      features: [cut]
    });
    const cuts = generateOptimizedCutList([part], [stock], 0.125, 0, '', []);
    render(<CutListPartsTab cutList={cuts} units="imperial" projectName="Panel" canExportPDF />);
    const section = screen.getByRole('region', { name: 'After glue-up — finished panels' });
    expect(within(section).getByText(/Centered handhold/)).toBeInTheDocument();
    expect(within(section).getByText(/20.*12.*1/)).toBeInTheDocument();
    expect(within(section).getByText(/not additional stock blanks/)).toBeInTheDocument();
    expect(screen.getAllByText(/Centered handhold/)).toHaveLength(1);
  });
});
