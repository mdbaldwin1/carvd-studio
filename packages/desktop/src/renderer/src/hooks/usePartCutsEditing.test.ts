import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import { usePartCutsEditing } from './usePartCutsEditing';
import { usePartCutsEditingStore } from '../store/partCutsEditingStore';
import { useProjectStore } from '../store/projectStore';
import { useSelectionStore } from '../store/selectionStore';
import { useUIStore } from '../store/uiStore';
import type { PartFeature } from '../types';

const { captureAnalytics } = vi.hoisted(() => ({ captureAnalytics: vi.fn() }));
vi.mock('../utils/analytics', () => ({ analytics: { capture: captureAnalytics } }));
vi.unmock('three');

const openPartOne = () => {
  const part = useProjectStore.getState().parts.find((p) => p.id === 'part-1')!;
  usePartCutsEditingStore.getState().startEditingPartCuts(part.id, part.name, part.features);
  useSelectionStore.getState().selectPart(part.id);
};

describe('usePartCutsEditing', () => {
  it.each(['Q9', 'Q10'])('%s blocks final save using the complete unsaved operation set', (kind) => {
    const circular: PartFeature = {
      id: 'hole',
      kind: 'circular_cut',
      version: 1,
      enabled: true,
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'center', secondaryFrom: 'center' },
      cutType: 'round_hole',
      placement: { primary: 4, secondary: -1, rotation: 0 },
      parameters: { diameter: 0.25, depthMode: 'blind', depth: 0.25, tilt: 0, direction: 0 }
    };
    const first: PartFeature = {
      id: 'a',
      kind: 'rect_cut',
      version: 1,
      enabled: true,
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'min' },
      cutType: 'cutout',
      placement: { x: 0, z: 0 },
      parameters: { size: { length: 5, width: 4 }, depthMode: 'through' }
    };
    const end: PartFeature = {
      id: 'end',
      kind: 'end_cut',
      version: 1,
      enabled: true,
      target: { type: 'face', face: 'right_end' },
      reference: { primaryFrom: 'min' },
      cutType: 'mitre',
      lengthMode: 'long_point',
      parameters: { horizontalAngle: 45 }
    };
    const original = kind === 'Q9' ? [circular] : [first];
    useProjectStore.setState({
      parts: [createTestPart({ id: 'part-1', length: 10, width: 4, thickness: 1, features: original })]
    });
    const { result } = renderHook(() => usePartCutsEditing());
    act(openPartOne);
    act(() =>
      result.current.setDraftFeatures(
        kind === 'Q9' ? [circular, end] : [first, { ...first, id: 'b', placement: { x: 5, z: 0 } }]
      )
    );
    let saved = true;
    act(() => {
      saved = result.current.saveAndExit();
    });
    expect(saved).toBe(false);
    expect(useProjectStore.getState().updatePart).not.toHaveBeenCalled();
    expect(usePartCutsEditingStore.getState().isEditingPartCuts).toBe(true);
  });
  it('Q3 blocks final save of an authored tenon made wider than resized stock', () => {
    useProjectStore.setState({
      parts: [
        createTestPart({
          id: 'part-1',
          length: 10,
          width: 2,
          thickness: 1,
          features: [
            {
              id: 'tenon',
              kind: 'rect_cut',
              version: 1,
              enabled: true,
              target: { type: 'face', face: 'left_end' },
              reference: { primaryFrom: 'min' },
              cutType: 'tenon',
              parameters: { size: { length: 1, width: 3 }, depthMode: 'blind', depth: 0.5 },
              placement: { x: 0, z: 1 }
            }
          ]
        })
      ]
    });
    const { result } = renderHook(() => usePartCutsEditing());
    act(openPartOne);
    let saved = true;
    act(() => {
      saved = result.current.saveAndExit();
    });
    expect(saved).toBe(false);
    expect(usePartCutsEditingStore.getState().isEditingPartCuts).toBe(true);
  });
  it('R5 blocks final saving of an end cut whose angle exceeds stock length', () => {
    const cut: PartFeature = {
      id: 'end',
      kind: 'end_cut',
      version: 1,
      enabled: true,
      target: { type: 'face', face: 'left_end' },
      reference: { primaryFrom: 'min' },
      cutType: 'mitre',
      lengthMode: 'long_point',
      parameters: { horizontalAngle: 80 }
    };
    useProjectStore.setState({
      parts: [createTestPart({ id: 'part-1', length: 10, width: 4, thickness: 1, features: [cut] })]
    });
    const { result } = renderHook(() => usePartCutsEditing());
    act(openPartOne);
    let saved = true;
    act(() => {
      saved = result.current.saveAndExit();
    });
    expect(saved).toBe(false);
    expect(usePartCutsEditingStore.getState().isEditingPartCuts).toBe(true);
  });
  beforeEach(() => {
    captureAnalytics.mockClear();
    usePartCutsEditingStore.getState().finishEditing();
    useProjectStore.setState({
      parts: [
        createTestPart({
          id: 'part-1',
          name: 'Side',
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
            }
          ]
        })
      ],
      updatePart: vi.fn(() => true)
    });
    useSelectionStore.setState({ selectedPartIds: [], selectedGroupIds: [] });
    useUIStore.setState({ showToast: vi.fn() });
  });

  it('opens cuts editing for a part and syncs selection', () => {
    const { result } = renderHook(() => usePartCutsEditing());

    act(() => {
      openPartOne();
    });

    expect(result.current.isEditingPartCuts).toBe(true);
    expect(result.current.sourcePartName).toBe('Side');
    expect(useSelectionStore.getState().selectedPartIds).toEqual(['part-1']);
  });

  it('keeps editing and shows an error when the store rejects the save', () => {
    const updatePart = vi.fn(() => false);
    const showToast = vi.fn();
    useProjectStore.setState({ updatePart });
    useUIStore.setState({ showToast });
    const { result } = renderHook(() => usePartCutsEditing());

    act(() => {
      openPartOne();
    });

    let saved = true;
    act(() => {
      saved = result.current.saveAndExit();
    });

    expect(saved).toBe(false);
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('overlap'), 'error');
    expect(usePartCutsEditingStore.getState().isEditingPartCuts).toBe(true);
  });

  it('saves draft features back to the project store', () => {
    const updatePart = vi.fn(() => true);
    useProjectStore.setState({ updatePart });
    const { result } = renderHook(() => usePartCutsEditing());

    act(() => {
      openPartOne();
    });

    act(() => {
      result.current.setDraftFeatures([
        {
          id: 'feature-2',
          kind: 'end_cut',
          version: 1,
          enabled: true,
          target: { type: 'face', face: 'right_end' },
          reference: { primaryFrom: 'max' },
          cutType: 'bevel',
          lengthMode: 'centerline',
          parameters: { horizontalAngle: 0, verticalAngle: 15 }
        }
      ]);
    });

    act(() => {
      result.current.saveAndExit();
    });

    expect(updatePart).toHaveBeenCalledWith(
      'part-1',
      expect.objectContaining({
        features: [
          expect.objectContaining({
            id: 'feature-2',
            target: { type: 'face', face: 'right_end' }
          })
        ]
      })
    );
    expect(usePartCutsEditingStore.getState().isEditingPartCuts).toBe(false);
    expect(captureAnalytics).toHaveBeenCalledWith('part_cuts_saved', { operation_count_bucket: '1-5' });
  });

  it('blocks save when the draft contains duplicate enabled end cuts on the same end', () => {
    const updatePart = vi.fn(() => true);
    const showToast = vi.fn();
    useProjectStore.setState({ updatePart });
    useUIStore.setState({ showToast });
    const { result } = renderHook(() => usePartCutsEditing());

    act(() => {
      openPartOne();
    });

    act(() => {
      result.current.setDraftFeatures([
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
      ]);
    });

    act(() => {
      result.current.saveAndExit();
    });

    expect(updatePart).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Only one enabled cut per end or edge'), 'error');
    expect(usePartCutsEditingStore.getState().isEditingPartCuts).toBe(true);
  });

  it('blocks saving an invalid circular cut already present in the draft', () => {
    const updatePart = vi.fn(() => true);
    const showToast = vi.fn();
    useProjectStore.setState({ updatePart });
    useUIStore.setState({ showToast });
    const { result } = renderHook(() => usePartCutsEditing());
    const oversizedHole: PartFeature = {
      id: 'oversized-hole',
      kind: 'circular_cut',
      version: 1,
      enabled: true,
      label: 'Oversized hole',
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'center', secondaryFrom: 'center' },
      cutType: 'round_hole',
      parameters: { diameter: 50, depthMode: 'through', tilt: 0, direction: 0 },
      placement: { primary: 0, secondary: 0, rotation: 0 }
    };

    act(() => {
      openPartOne();
      result.current.setDraftFeatures([oversizedHole]);
    });

    let saved = true;
    act(() => {
      saved = result.current.saveAndExit();
    });

    expect(saved).toBe(false);
    expect(updatePart).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Resolve "Oversized hole" before saving part cuts', 'error');
    expect(usePartCutsEditingStore.getState().isEditingPartCuts).toBe(true);
  });

  it('prompts on exit when draft changes exist', () => {
    const { result } = renderHook(() => usePartCutsEditing());

    act(() => {
      openPartOne();
    });

    act(() => {
      result.current.setDraftFeatures([]);
      result.current.requestExit();
    });

    expect(usePartCutsEditingStore.getState().showExitDialog).toBe(true);
  });

  it('discards draft changes and keeps the part selected', () => {
    const { result } = renderHook(() => usePartCutsEditing());

    act(() => {
      openPartOne();
    });

    act(() => {
      result.current.setDraftFeatures([]);
      result.current.discardAndExit();
    });

    expect(usePartCutsEditingStore.getState().isEditingPartCuts).toBe(false);
    expect(useSelectionStore.getState().selectedPartIds).toEqual(['part-1']);
  });
});
