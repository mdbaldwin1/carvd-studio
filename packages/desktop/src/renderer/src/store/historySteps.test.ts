import { describe, expect, it, beforeEach, vi } from 'vitest';
import { useProjectStore } from './projectStore';
import { useSelectionStore } from './selectionStore';
import { createTestPart } from '../../../../tests/helpers/factories';
vi.unmock('three');

describe('undoing a rotation', () => {
  beforeEach(() => {
    useProjectStore.setState({
      parts: [createTestPart({ id: 'p', position: { x: 0, y: 0.375, z: 0 }, rotation: { x: 0, y: 0, z: 0 } })],
      stockConstraints: {
        constrainDimensions: false,
        constrainGrain: false,
        constrainColor: false,
        preventOverlap: false
      }
    });
    useSelectionStore.setState({ selectedPartIds: ['p'], selectedGroupIds: [], editingGroupId: null });
    useProjectStore.temporal.getState().clear();
  });

  const rot = () => useProjectStore.getState().parts[0].rotation.y;

  it('undoes a dragged move', () => {
    const move = (z: number) => useProjectStore.getState().updatePart('p', { position: { x: 0, y: 0.375, z } });
    useProjectStore.getState().beginHistoryStep();
    for (let i = 1; i <= 20; i += 1) move(i * 0.1);
    useProjectStore.getState().endHistoryStep();
    expect(useProjectStore.getState().parts[0].position.z).toBeCloseTo(2, 3);
    useProjectStore.temporal.getState().undo();
    expect(useProjectStore.getState().parts[0].position.z).toBeCloseTo(0, 3);
  });

  it('undoes a single quarter turn', () => {
    useProjectStore.getState().rotateSelectedParts('y', 90, { x: 0, y: 0, z: 0 });
    expect(rot()).toBeCloseTo(90, 3);
    useProjectStore.temporal.getState().undo();
    expect(rot()).toBeCloseTo(0, 3);
  });

  it('undoes a free rotation dragged in many steps', () => {
    // A gizmo drag calls rotateSelectedParts once per frame. If each call is
    // its own history entry, one undo steps back a fraction of a degree and
    // the rotation looks impossible to undo.
    useProjectStore.getState().beginHistoryStep();
    for (let i = 0; i < 20; i += 1) {
      useProjectStore.getState().rotateSelectedParts('y', 1.5, { x: 0, y: 0, z: 0 });
    }
    useProjectStore.getState().endHistoryStep();
    expect(rot()).toBeCloseTo(30, 3);
    useProjectStore.temporal.getState().undo();
    expect(rot()).toBeCloseTo(0, 3);
  });
});
