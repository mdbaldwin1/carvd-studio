import { Button } from '@renderer/components/ui/button';
import { usePartCutsEditingStore } from '@renderer/store/partCutsEditingStore';
import { useProjectStore } from '@renderer/store/projectStore';
import { Redo2, Undo2 } from 'lucide-react';
import { useStore } from 'zustand';

/**
 * One Undo/Redo pair for the whole app, dispatched to whichever history the
 * active mode owns.
 *
 * The stacks stay separate on purpose. While the Part Cuts workspace is open
 * the source part is still selected behind it, so reaching the project's
 * temporal store here would silently edit that part instead of the cut the
 * user is looking at.
 */
export function UndoRedoButtons() {
  const isEditingPartCuts = usePartCutsEditingStore((s) => s.isEditingPartCuts);

  const undoProject = useStore(useProjectStore.temporal, (state) => state.undo);
  const redoProject = useStore(useProjectStore.temporal, (state) => state.redo);
  const pastStates = useStore(useProjectStore.temporal, (state) => state.pastStates);
  const futureStates = useStore(useProjectStore.temporal, (state) => state.futureStates);

  const undoDraft = usePartCutsEditingStore((s) => s.undoDraft);
  const redoDraft = usePartCutsEditingStore((s) => s.redoDraft);
  const draftHistory = usePartCutsEditingStore((s) => s.draftHistory);
  const draftFuture = usePartCutsEditingStore((s) => s.draftFuture);

  const undo = isEditingPartCuts ? undoDraft : undoProject;
  const redo = isEditingPartCuts ? redoDraft : redoProject;
  const canUndo = isEditingPartCuts ? draftHistory.length > 0 : pastStates.length > 0;
  const canRedo = isEditingPartCuts ? draftFuture.length > 0 : futureStates.length > 0;

  const subject = isEditingPartCuts ? 'cut change' : '';
  const undoTitle = subject ? `Undo ${subject} (Cmd+Z)` : 'Undo (Cmd+Z)';
  const redoTitle = subject ? `Redo ${subject} (Cmd+Shift+Z)` : 'Redo (Cmd+Shift+Z)';

  return (
    <div className="undo-redo-buttons">
      <Button variant="outline" size="icon" onClick={() => undo()} disabled={!canUndo} title={undoTitle}>
        <Undo2 size={18} />
      </Button>
      <Button variant="outline" size="icon" onClick={() => redo()} disabled={!canRedo} title={redoTitle}>
        <Redo2 size={18} />
      </Button>
    </div>
  );
}
