import { Button } from '@renderer/components/ui/button';
import { useProjectStore } from '@renderer/store/projectStore';
import { Redo2, Undo2 } from 'lucide-react';
import { useStore } from 'zustand';

export function UndoRedoButtons() {
  const undo = useStore(useProjectStore.temporal, (state) => state.undo);
  const redo = useStore(useProjectStore.temporal, (state) => state.redo);
  const pastStates = useStore(useProjectStore.temporal, (state) => state.pastStates);
  const futureStates = useStore(useProjectStore.temporal, (state) => state.futureStates);

  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

  return (
    <div className="undo-redo-buttons">
      <Button variant="outline" size="icon" onClick={() => undo()} disabled={!canUndo} title="Undo (Cmd+Z)">
        <Undo2 size={18} />
      </Button>
      <Button variant="outline" size="icon" onClick={() => redo()} disabled={!canRedo} title="Redo (Cmd+Shift+Z)">
        <Redo2 size={18} />
      </Button>
    </div>
  );
}
