import { useProjectStore } from '../../store/projectStore';

const menuItemDanger =
  'block w-full py-2 px-3 bg-transparent border-none text-danger text-[13px] text-left cursor-pointer transition-colors duration-100 enabled:hover:bg-danger enabled:hover:text-white disabled:text-text-muted disabled:cursor-not-allowed';

interface GuideContextMenuProps {
  menuRef: React.RefObject<HTMLDivElement>;
  x: number;
  y: number;
  onClose: () => void;
  guideId: string;
}

export function GuideContextMenu({ menuRef, x, y, onClose, guideId }: GuideContextMenuProps) {
  const snapGuides = useProjectStore((s) => s.snapGuides);
  const removeSnapGuide = useProjectStore((s) => s.removeSnapGuide);
  const clearSnapGuides = useProjectStore((s) => s.clearSnapGuides);

  const guide = snapGuides.find((g) => g.id === guideId);
  if (!guide) return null;

  const axisLabels = { x: 'X', y: 'Y', z: 'Z' };

  const handleDeleteGuide = () => {
    removeSnapGuide(guideId);
    onClose();
  };

  const handleClearAllGuides = () => {
    clearSnapGuides();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="context-menu bg-surface border border-border rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.3)] min-w-[160px] py-1 overflow-visible"
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 1000
      }}
    >
      <div className="py-2 px-3 text-[11px] text-text-muted border-b border-border mb-1">
        {axisLabels[guide.axis]} Guide at {guide.position.toFixed(2)}"
      </div>
      <button className={menuItemDanger} onClick={handleDeleteGuide}>
        Delete This Guide
      </button>
      {snapGuides.length > 1 && (
        <button className={menuItemDanger} onClick={handleClearAllGuides}>
          Clear All Guides ({snapGuides.length})
        </button>
      )}
    </div>
  );
}
