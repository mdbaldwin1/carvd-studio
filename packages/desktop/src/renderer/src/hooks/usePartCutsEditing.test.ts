import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPart } from '../../../../tests/helpers/factories';
import { usePartCutsEditing } from './usePartCutsEditing';
import { usePartCutsEditingStore } from '../store/partCutsEditingStore';
import { useProjectStore } from '../store/projectStore';
import { useSelectionStore } from '../store/selectionStore';
import { useUIStore } from '../store/uiStore';

const openPartOne = () => {
  const part = useProjectStore.getState().parts.find((p) => p.id === 'part-1')!;
  usePartCutsEditingStore.getState().startEditingPartCuts(part.id, part.name, part.features);
  useSelectionStore.getState().selectPart(part.id);
};

describe('usePartCutsEditing', () => {
  beforeEach(() => {
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
