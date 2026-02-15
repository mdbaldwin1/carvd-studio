import { useProjectStore } from '../../store/projectStore';

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
      className="context-menu"
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 1000
      }}
    >
      <div className="context-menu-header">
        {axisLabels[guide.axis]} Guide at {guide.position.toFixed(2)}"
      </div>
      <button className="context-menu-item context-menu-item-danger" onClick={handleDeleteGuide}>
        Delete This Guide
      </button>
      {snapGuides.length > 1 && (
        <button className="context-menu-item context-menu-item-danger" onClick={handleClearAllGuides}>
          Clear All Guides ({snapGuides.length})
        </button>
      )}
    </div>
  );
}
