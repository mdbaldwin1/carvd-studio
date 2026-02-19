import { useProjectStore, captureCanvas } from '../../store/projectStore';
import { useClipboardStore } from '../../store/clipboardStore';
import { useUIStore } from '../../store/uiStore';
import { useCameraStore } from '../../store/cameraStore';
import { MenuPanel, MenuItemButton, MenuSeparator, MenuLabel } from '../ui/context-menu';

interface BackgroundContextMenuProps {
  menuRef: React.RefObject<HTMLDivElement>;
  x: number;
  y: number;
  onClose: () => void;
  worldPosition?: { x: number; y: number; z: number };
}

export function BackgroundContextMenu({ menuRef, x, y, onClose, worldPosition }: BackgroundContextMenuProps) {
  const clipboard = useClipboardStore((s) => s.clipboard);
  const requestCenterCameraAtOrigin = useCameraStore((s) => s.requestCenterCameraAtOrigin);
  const requestCenterCameraAtPosition = useCameraStore((s) => s.requestCenterCameraAtPosition);
  const pasteAtPosition = useClipboardStore((s) => s.pasteAtPosition);
  const addSnapGuide = useProjectStore((s) => s.addSnapGuide);
  const snapGuides = useProjectStore((s) => s.snapGuides);
  const clearSnapGuides = useProjectStore((s) => s.clearSnapGuides);
  const captureManualThumbnail = useUIStore((s) => s.captureManualThumbnail);

  const hasClipboard = clipboard.parts.length > 0;
  const hasGuides = snapGuides.length > 0;

  const handleResetView = () => {
    requestCenterCameraAtOrigin();
    onClose();
  };

  const handleExportImage = async () => {
    await captureCanvas();
    onClose();
  };

  const handleCenterViewHere = () => {
    if (worldPosition) {
      requestCenterCameraAtPosition(worldPosition);
    }
    onClose();
  };

  const handlePasteHere = () => {
    if (worldPosition) {
      pasteAtPosition(worldPosition);
    }
    onClose();
  };

  const handleAddXGuide = () => {
    if (worldPosition) {
      addSnapGuide('x', worldPosition.x);
    }
    onClose();
  };

  const handleAddYGuide = () => {
    if (worldPosition) {
      addSnapGuide('y', worldPosition.y);
    }
    onClose();
  };

  const handleAddZGuide = () => {
    if (worldPosition) {
      addSnapGuide('z', worldPosition.z);
    }
    onClose();
  };

  const handleClearGuides = () => {
    clearSnapGuides();
    onClose();
  };

  const handleCaptureThumbnail = async () => {
    await captureManualThumbnail();
    onClose();
  };

  return (
    <MenuPanel ref={menuRef} x={x} y={y}>
      <MenuItemButton onClick={handleResetView}>Reset View</MenuItemButton>
      <MenuItemButton onClick={handleCenterViewHere} disabled={!worldPosition}>
        Center View Here
      </MenuItemButton>
      {hasClipboard && <MenuItemButton onClick={handlePasteHere}>Paste Here</MenuItemButton>}
      <MenuSeparator />
      <MenuItemButton onClick={handleExportImage}>Export as Image</MenuItemButton>
      <MenuItemButton onClick={handleCaptureThumbnail}>Capture Thumbnail</MenuItemButton>
      <MenuSeparator />
      <MenuLabel>Snap Guides</MenuLabel>
      <MenuItemButton onClick={handleAddXGuide} disabled={!worldPosition}>
        Add X Guide Here
      </MenuItemButton>
      <MenuItemButton onClick={handleAddYGuide} disabled={!worldPosition}>
        Add Y Guide Here
      </MenuItemButton>
      <MenuItemButton onClick={handleAddZGuide} disabled={!worldPosition}>
        Add Z Guide Here
      </MenuItemButton>
      {hasGuides && (
        <MenuItemButton variant="danger" onClick={handleClearGuides}>
          Clear All Guides ({snapGuides.length})
        </MenuItemButton>
      )}
    </MenuPanel>
  );
}
