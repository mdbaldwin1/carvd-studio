import { beforeEach, describe, expect, it } from 'vitest';
import type { PartFeature } from '../types';
import { useCameraStore } from './cameraStore';
import { usePartCutsEditingStore } from './partCutsEditingStore';

function createFeature(id = 'feature-1', horizontalAngle = 45): PartFeature {
  return {
    id,
    kind: 'end_cut' as const,
    version: 1 as const,
    enabled: true,
    target: { type: 'face' as const, face: 'left_end' as const },
    reference: { primaryFrom: 'min' as const },
    cutType: 'mitre' as const,
    lengthMode: 'long_point' as const,
    parameters: { horizontalAngle }
  };
}

describe('partCutsEditingStore', () => {
  beforeEach(() => {
    usePartCutsEditingStore.getState().finishEditing();
    useCameraStore.setState({ cameraState: null, pendingCameraRestore: false });
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

  it('keeps editing when an exit request is cancelled', () => {
    const feature = createFeature();
    usePartCutsEditingStore.getState().startEditingPartCuts('part-1', 'Leg', [feature]);
    usePartCutsEditingStore.getState().setDraftFeatures([createFeature('feature-1', 30)]);
    usePartCutsEditingStore.getState().requestExit([feature]);
    expect(usePartCutsEditingStore.getState().showExitDialog).toBe(true);

    usePartCutsEditingStore.getState().cancelExit();
    const state = usePartCutsEditingStore.getState();
    expect(state.showExitDialog).toBe(false);
    expect(state.isEditingPartCuts).toBe(true);
    expect(state.draftFeatures[0]).toMatchObject({ parameters: { horizontalAngle: 30 } });
  });

  it('treats requestExit with no source features as clean when the draft is empty', () => {
    usePartCutsEditingStore.getState().startEditingPartCuts('part-1', 'Leg');
    usePartCutsEditingStore.getState().requestExit();
    expect(usePartCutsEditingStore.getState().isEditingPartCuts).toBe(false);
    expect(usePartCutsEditingStore.getState().showExitDialog).toBe(false);
  });

  it('reports unsaved draft changes only when the draft differs from the source', () => {
    const feature = createFeature();
    usePartCutsEditingStore.getState().startEditingPartCuts('part-1', 'Leg', [feature]);
    expect(usePartCutsEditingStore.getState().hasUnsavedDraftChanges([feature])).toBe(false);

    usePartCutsEditingStore.getState().setDraftFeatures([createFeature('feature-1', 30)]);
    expect(usePartCutsEditingStore.getState().hasUnsavedDraftChanges([feature])).toBe(true);
    expect(usePartCutsEditingStore.getState().hasUnsavedDraftChanges()).toBe(true);
  });

  it('resets state and requests a camera restore when finishing with saved camera state', () => {
    useCameraStore.setState({
      cameraState: {
        position: { x: 1, y: 2, z: 3 },
        target: { x: 0, y: 0, z: 0 }
      }
    });
    usePartCutsEditingStore.getState().startEditingPartCuts('part-1', 'Leg', [createFeature()]);
    usePartCutsEditingStore.getState().finishEditing();

    const state = usePartCutsEditingStore.getState();
    expect(state.isEditingPartCuts).toBe(false);
    expect(state.sourcePartId).toBeNull();
    expect(state.sourcePartName).toBe('');
    expect(state.draftFeatures).toEqual([]);
    expect(state.selectedFeatureId).toBeNull();
    expect(useCameraStore.getState().pendingCameraRestore).toBe(true);
  });

  it('does not request a camera restore when no camera state is saved', () => {
    usePartCutsEditingStore.getState().startEditingPartCuts('part-1', 'Leg');
    usePartCutsEditingStore.getState().finishEditing();
    expect(useCameraStore.getState().pendingCameraRestore).toBe(false);
  });

  it('keeps the selection when the selected feature survives a draft update', () => {
    const featureA = createFeature('feature-a');
    const featureB = createFeature('feature-b', 30);
    usePartCutsEditingStore.getState().startEditingPartCuts('part-1', 'Leg', [featureA, featureB]);
    usePartCutsEditingStore.getState().selectFeature('feature-b');

    usePartCutsEditingStore.getState().setDraftFeatures([featureA, featureB]);
    expect(usePartCutsEditingStore.getState().selectedFeatureId).toBe('feature-b');

    usePartCutsEditingStore.getState().setDraftFeatures([featureA]);
    expect(usePartCutsEditingStore.getState().selectedFeatureId).toBe('feature-a');
  });

  it('resets draft features and clears targets', () => {
    const feature = createFeature();
    usePartCutsEditingStore.getState().startEditingPartCuts('part-1', 'Leg', [feature]);
    usePartCutsEditingStore.getState().setHoveredTarget({ type: 'face', face: 'top_face' });
    usePartCutsEditingStore.getState().setPendingTarget({ type: 'edge', edge: 'top_front_edge' });
    expect(usePartCutsEditingStore.getState().hoveredTarget).toEqual({ type: 'face', face: 'top_face' });
    expect(usePartCutsEditingStore.getState().pendingTarget).toEqual({ type: 'edge', edge: 'top_front_edge' });

    const replacement = createFeature('feature-2', 15);
    usePartCutsEditingStore.getState().resetDraftFeatures([replacement]);
    const state = usePartCutsEditingStore.getState();
    expect(state.draftFeatures).toEqual([replacement]);
    expect(state.selectedFeatureId).toBe('feature-2');
    expect(state.hoveredTarget).toBeNull();
    expect(state.pendingTarget).toBeNull();

    usePartCutsEditingStore.getState().resetDraftFeatures();
    expect(usePartCutsEditingStore.getState().draftFeatures).toEqual([]);
    expect(usePartCutsEditingStore.getState().selectedFeatureId).toBeNull();
  });
});
