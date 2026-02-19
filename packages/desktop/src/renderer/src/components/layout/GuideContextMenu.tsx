import { useProjectStore } from '../../store/projectStore';
import { MenuPanel, MenuItemButton, MenuLabel } from '../ui/context-menu';

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
    <MenuPanel ref={menuRef} x={x} y={y}>
      <MenuLabel>
        {axisLabels[guide.axis]} Guide at {guide.position.toFixed(2)}&quot;
      </MenuLabel>
      <MenuItemButton variant="danger" onClick={handleDeleteGuide}>
        Delete This Guide
      </MenuItemButton>
      {snapGuides.length > 1 && (
        <MenuItemButton variant="danger" onClick={handleClearAllGuides}>
          Clear All Guides ({snapGuides.length})
        </MenuItemButton>
      )}
    </MenuPanel>
  );
}
