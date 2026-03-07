import { beforeEach, describe, expect, it } from 'vitest';
import { usePartCutsEditingStore } from './partCutsEditingStore';

describe('partCutsEditingStore', () => {
  beforeEach(() => {
    usePartCutsEditingStore.getState().finishEditing();
  });

  it('starts editing with cloned draft features', () => {
    const feature = {
      id: 'feature-1',
      kind: 'end_cut' as const,
      version: 1 as const,
      enabled: true,
      target: { type: 'face' as const, face: 'left_end' as const },
      reference: { primaryFrom: 'min' as const },
      cutType: 'mitre' as const,
      lengthMode: 'long_point' as const,
      parameters: { horizontalAngle: 45 }
    };

    usePartCutsEditingStore.getState().startEditingPartCuts('part-1', 'Leg', [feature]);

    const state = usePartCutsEditingStore.getState();
    expect(state.isEditingPartCuts).toBe(true);
    expect(state.sourcePartId).toBe('part-1');
    expect(state.sourcePartName).toBe('Leg');
    expect(state.draftFeatures).toEqual([feature]);
    expect(state.draftFeatures).not.toBe([feature]);
    expect(state.selectedFeatureId).toBe('feature-1');
  });

  it('shows exit dialog only when draft differs from source', () => {
    const feature = {
      id: 'feature-1',
      kind: 'end_cut' as const,
      version: 1 as const,
      enabled: true,
      target: { type: 'face' as const, face: 'left_end' as const },
      reference: { primaryFrom: 'min' as const },
      cutType: 'mitre' as const,
      lengthMode: 'long_point' as const,
      parameters: { horizontalAngle: 45 }
    };

    usePartCutsEditingStore.getState().startEditingPartCuts('part-1', 'Leg', [feature]);
    usePartCutsEditingStore.getState().requestExit([feature]);
    expect(usePartCutsEditingStore.getState().isEditingPartCuts).toBe(false);

    usePartCutsEditingStore.getState().startEditingPartCuts('part-1', 'Leg', [feature]);
    usePartCutsEditingStore.getState().setDraftFeatures([
      {
        ...feature,
        parameters: { horizontalAngle: 30 }
      }
    ]);
    usePartCutsEditingStore.getState().requestExit([feature]);
    expect(usePartCutsEditingStore.getState().showExitDialog).toBe(true);
  });
});
