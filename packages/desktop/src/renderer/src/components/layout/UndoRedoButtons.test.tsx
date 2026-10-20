import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { RectCutFeature } from '@renderer/types';
import { usePartCutsEditingStore } from '@renderer/store/partCutsEditingStore';
import { useProjectStore } from '@renderer/store/projectStore';
import { createTestPart } from '../../../../../tests/helpers/factories';
import { UndoRedoButtons } from './UndoRedoButtons';

const mortise = (id: string): RectCutFeature => ({
  id,
  kind: 'rect_cut',
  version: 1 as const,
  enabled: true,
  cutType: 'mortise',
  target: { type: 'face', face: 'top_face' },
  reference: { primaryFrom: 'min' },
  parameters: { size: { length: 2, width: 0.75 }, depthMode: 'blind', depth: 0.25 },
  placement: { x: 4, z: 3 }
});

function seedDraftHistory() {
  const store = usePartCutsEditingStore.getState();
  store.startEditingPartCuts('p1', 'Panel', []);
  store.setDraftFeatures([mortise('first')]);
  store.setDraftFeatures([mortise('first'), mortise('second')]);
}

describe('UndoRedoButtons', () => {
  beforeEach(() => {
    usePartCutsEditingStore.setState({
      isEditingPartCuts: false,
      draftFeatures: [],
      draftHistory: [],
      draftFuture: []
    });
    useProjectStore.temporal.getState().clear();
  });

  it('drives the cut draft history while the cuts workspace is open', () => {
    seedDraftHistory();
    render(<UndoRedoButtons />);

    fireEvent.click(screen.getByRole('button', { name: /Undo cut change/ }));
    expect(usePartCutsEditingStore.getState().draftFeatures.map((f) => f.id)).toEqual(['first']);

    fireEvent.click(screen.getByRole('button', { name: /Redo cut change/ }));
    expect(usePartCutsEditingStore.getState().draftFeatures.map((f) => f.id)).toEqual(['first', 'second']);
  });

  it('never reaches the project history while the cuts workspace is open', () => {
    // The source part stays selected behind the workspace, so a project undo
    // here would silently edit it instead of the cut on screen.
    useProjectStore.getState().addPart(createTestPart({ id: 'behind', name: 'Behind' }));
    const partsBefore = useProjectStore.getState().parts.length;
    seedDraftHistory();
    render(<UndoRedoButtons />);

    fireEvent.click(screen.getByRole('button', { name: /Undo cut change/ }));

    expect(useProjectStore.getState().parts).toHaveLength(partsBefore);
  });

  it('disables each direction when its history is empty', () => {
    render(<UndoRedoButtons />);
    expect(screen.getByRole('button', { name: 'Undo (Cmd+Z)' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo (Cmd+Shift+Z)' })).toBeDisabled();
  });

  it('reports the project history outside cuts mode', () => {
    render(<UndoRedoButtons />);
    // Titles name no subject outside cuts mode, so the label itself proves
    // which history the pair is pointed at.
    expect(screen.getByRole('button', { name: 'Undo (Cmd+Z)' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Undo cut change/ })).not.toBeInTheDocument();
  });
});
