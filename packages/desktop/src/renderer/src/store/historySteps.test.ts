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

  it('does not insert a timestamp-only undo step after marking an edited document dirty', () => {
    useProjectStore.setState({ modifiedAt: '2000-01-01T00:00:00.000Z' });
    useProjectStore.temporal.getState().clear();
    useProjectStore.getState().updatePart('p', { position: { x: 0, y: 0.375, z: 2 } });
    useProjectStore.getState().markDirty();
    useProjectStore.temporal.getState().undo();
    expect(useProjectStore.getState().parts[0].position.z).toBe(0);
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

describe('document savepoints across undo and redo', () => {
  beforeEach(() => {
    useProjectStore.getState().newProject();
    useProjectStore.setState({ parts: [createTestPart({ id: 'saved-part', position: { x: 0, y: 0.375, z: 0 } })] });
    useProjectStore.getState().markClean();
    useProjectStore.temporal.getState().clear();
  });
  const move = (z: number) => useProjectStore.getState().updatePart('saved-part', { position: { x: 0, y: 0.375, z } });
  it('marks Undo after Save dirty and clears it only when Redo returns to the saved content', () => {
    move(1);
    move(2);
    useProjectStore.getState().markClean();
    const history = useProjectStore.temporal.getState();
    expect(history.pastStates).toHaveLength(2);
    history.undo();
    expect(useProjectStore.getState().isDirty).toBe(true);
    expect(useProjectStore.getState().parts[0].position.z).toBe(1);
    history.undo();
    expect(useProjectStore.getState().isDirty).toBe(true);
    history.redo();
    expect(useProjectStore.getState().isDirty).toBe(true);
    history.redo();
    expect(useProjectStore.getState().isDirty).toBe(false);
    expect(useProjectStore.temporal.getState().pastStates).toHaveLength(2);
  });
  it('restores the original clean state and preserves history pause', () => {
    move(1);
    const history = useProjectStore.temporal.getState();
    history.pause();
    history.undo();
    expect(useProjectStore.getState().isDirty).toBe(false);
    expect(useProjectStore.temporal.getState().isTracking).toBe(false);
    history.redo();
    expect(useProjectStore.getState().isDirty).toBe(true);
    history.resume();
  });
  it('tracks a new savepoint on an undone branch and does not dirty a new document on empty undo', () => {
    move(1);
    move(2);
    const history = useProjectStore.temporal.getState();
    history.undo();
    useProjectStore.getState().markClean();
    history.redo();
    expect(useProjectStore.getState().isDirty).toBe(true);
    history.undo();
    expect(useProjectStore.getState().isDirty).toBe(false);
    useProjectStore.getState().newProject();
    history.clear();
    history.undo();
    expect(useProjectStore.getState().isDirty).toBe(false);
  });
});
