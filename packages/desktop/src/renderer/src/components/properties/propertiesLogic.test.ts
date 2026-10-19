import { describe, expect, it } from 'vitest';
import { buildStockDataFromUpdates } from './propertiesLogic';

describe('stock creation from part properties', () => {
  it('retains insert identity, prepared dimensions, packaging and a zero price', () => {
    expect(
      buildStockDataFromUpdates(
        {
          form: 'insert',
          insertKind: 'loose_tenon',
          packSize: 1,
          length: 2,
          width: 0.75,
          thickness: 0.25,
          pricePerUnit: 0
        },
        0
      )
    ).toMatchObject({
      form: 'insert',
      insertKind: 'loose_tenon',
      packSize: 1,
      length: 2,
      width: 0.75,
      thickness: 0.25,
      pricePerUnit: 0
    });
  });
});
