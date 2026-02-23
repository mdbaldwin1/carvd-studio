import { useSelectionStore } from '@renderer/store/selectionStore';

export function SelectionBox() {
  const selectionBox = useSelectionStore((s) => s.selectionBox);

  if (!selectionBox) return null;

  const { start, end } = selectionBox;
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return (
    <div
      className="fixed border border-dashed border-primary bg-primary-bg pointer-events-none z-[100]"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`
      }}
    />
  );
}
