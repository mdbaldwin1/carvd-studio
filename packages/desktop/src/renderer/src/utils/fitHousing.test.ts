import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPart, createTestStock } from '../../../../tests/helpers/factories';
import type { Part, RectCutFeature } from '../types';
import { getHousings, planHousingFit, resolveHousingRoles } from './fitHousing';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';

vi.unmock('three');

/** A dado in a cabinet side, nominally 3/4" but typed rather than fitted. */
function dado(id = 'dado-1', width = 0.75, x = 12): RectCutFeature {
  return {
    id,
    kind: 'rect_cut',
    version: 1,
    enabled: true,
    cutType: 'dado',
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'min' },
    parameters: { size: { length: width, width: 0 }, depthMode: 'blind', depth: 0.25 },
    placement: { x, z: 0 }
  };
}

/** A cabinet side lying flat, dadoes cut into its top face. */
const side = (features: RectCutFeature[]): Part =>
  createTestPart({ id: 'side', length: 36, width: 12, thickness: 0.75, position: { x: 0, y: 0, z: 0 }, features });

/**
 * A shelf standing on edge above the dado, the way it enters: its thickness
 * lies along the host's length, which is the axis the channel is measured on.
 */
const shelf = (thickness: number, overrides: Partial<Part> = {}): Part =>
  createTestPart({
    id: 'shelf',
    length: 11,
    width: 12,
    thickness,
    position: { x: -6, y: 6, z: 0 },
    rotation: { x: 0, y: 0, z: 90 },
    features: [],
    ...overrides
  });

describe('cutting a housing to the piece that goes in it', () => {
  it('takes the piece’s real thickness, not a nominal one', () => {
    // Nominal 3/4" plywood is nearer 23/32", which is why a typed 3/4" dado
    // is loose every time.
    const plan = planHousingFit(shelf(0.71875), side([dado()]))!;
    expect(plan.currentWidth).toBeCloseTo(0.75);
    expect(plan.width).toBeCloseTo(0.71875);
    expect(plan.changed).toBe(true);
  });

  it('writes the width into the field that cut type keeps it in', () => {
    // A dado's channel width lives in size.length, not size.width.
    expect(planHousingFit(shelf(0.5), side([dado()]))!.field).toBe('length');
  });

  it('reports nothing to do when the dado already fits', () => {
    expect(planHousingFit(shelf(0.75), side([dado()]))!.changed).toBe(false);
  });

  it('picks the dado the shelf is actually at, out of several', () => {
    const cabinet = side([dado('low', 0.75, 6), dado('mid', 0.75, 18), dado('high', 0.75, 30)]);
    // Sitting above the middle dado.
    const plan = planHousingFit(shelf(0.5, { position: { x: 0, y: 6, z: 0 } }), cabinet)!;
    expect(plan.housingFeatureId).toBe('mid');
  });

  it('ignores a channel the piece is not square-on to', () => {
    // Lying flat, the shelf never enters the dado at all.
    const flat = shelf(0.5, { rotation: { x: 0, y: 0, z: 0 } });
    expect(planHousingFit(flat, side([dado()]))).toBeNull();
  });

  it('works before the two are assembled, not only after', () => {
    // Held well clear of the cabinet: still the dado it is heading for.
    const held = shelf(0.5, { position: { x: -6, y: 20, z: 0 } });
    expect(planHousingFit(held, side([dado()]))!.housingFeatureId).toBe('dado-1');
  });

  it('finds the channels on a part, and skips disabled ones', () => {
    expect(getHousings(side([dado(), { ...dado('off'), enabled: false }]))).toHaveLength(1);
    expect(getHousings(shelf(0.75))).toHaveLength(0);
  });

  it('works out which part is the housing, whichever order they came in', () => {
    const cabinet = side([dado()]);
    const board = shelf(0.5);
    expect(resolveHousingRoles(board, cabinet)).toMatchObject({ shelfPart: board, housingPart: cabinet });
    expect(resolveHousingRoles(cabinet, board)).toMatchObject({ shelfPart: board, housingPart: cabinet });
  });

  it('declines when neither part carries a channel', () => {
    expect(resolveHousingRoles(shelf(0.5), shelf(0.75, { id: 'other' }))).toBeNull();
    expect(planHousingFit(shelf(0.5), side([]))).toBeNull();
  });
});

describe('fitting a housing from the store', () => {
  beforeEach(() => {
    useUIStore.setState({ toast: null });
    useProjectStore.setState({ parts: [shelf(0.71875), side([dado()])], isDirty: false });
  });

  const dadoWidth = () => {
    const cut = useProjectStore.getState().parts.find((part) => part.id === 'side')!.features![0] as RectCutFeature;
    return cut.parameters.size.length;
  };

  it('cuts the dado to the shelf', () => {
    expect(useProjectStore.getState().fitHousingToPart('shelf', 'side')).toBe(true);
    expect(dadoWidth()).toBeCloseTo(0.71875);
    expect(useProjectStore.getState().isDirty).toBe(true);
  });

  it('leaves the shelf alone — its thickness is the stock you bought', () => {
    useProjectStore.getState().fitHousingToPart('shelf', 'side');
    const board = useProjectStore.getState().parts.find((part) => part.id === 'shelf')!;
    expect(board.thickness).toBeCloseTo(0.71875);
    expect(board.features ?? []).toHaveLength(0);
  });

  it('says so when the housing already fits', () => {
    useProjectStore.getState().fitHousingToPart('shelf', 'side');
    expect(useProjectStore.getState().fitHousingToPart('shelf', 'side')).toBe(false);
    expect(useUIStore.getState().toast?.message).toMatch(/already fits/i);
  });

  it('asks for the right pair when there is no housing between them', () => {
    useProjectStore.setState({ parts: [shelf(0.5), shelf(0.75, { id: 'other' })] });
    expect(useProjectStore.getState().fitHousingToPart('shelf', 'other')).toBe(false);
    expect(useUIStore.getState().toast?.message).toMatch(/dado or groove/i);
  });
});

describe('housing-fit applicability', () => {
  it.each(['rod', 'insert'] as const)('does not cut a half lap to a %s mate', (form) => {
    const host = side([{ ...dado(), cutType: 'half_lap' }]);
    const pin = shelf(0.375, { stockId: 'pin-stock' });
    const stocks = [createTestStock({ id: 'pin-stock', form, length: 1, width: 0.375, thickness: 0.375 })];
    expect(planHousingFit(pin, host, stocks)).toBeNull();
    expect(resolveHousingRoles(pin, host, stocks)).toBeNull();
    expect(resolveHousingRoles(host, pin, stocks)).toBeNull();
    useProjectStore.setState({ parts: [host, pin], stocks });
    expect(useProjectStore.getState().fitHousingToPart(pin.id, host.id)).toBe(false);
    expect(useProjectStore.getState().parts[0]).toEqual(host);
  });
  it('rejects explicit insert shapes even if stock has been unassigned', () => {
    const host = side([dado()]);
    expect(planHousingFit(shelf(0.375, { blankShape: 'round' }), host)).toBeNull();
  });
  it('still offers the half-lap recipe for two boards', () => {
    const host = side([{ ...dado(), cutType: 'half_lap' }]);
    expect(resolveHousingRoles(shelf(0.375), host)).not.toBeNull();
  });
});
