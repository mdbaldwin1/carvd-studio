import { useProjectStore, captureCanvas } from '../../store/projectStore';
import { useClipboardStore } from '../../store/clipboardStore';
import { useUIStore } from '../../store/uiStore';
import { useCameraStore } from '../../store/cameraStore';

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
      <button className="context-menu-item" onClick={handleResetView}>
        Reset View
      </button>
      <button className="context-menu-item" onClick={handleCenterViewHere} disabled={!worldPosition}>
        Center View Here
      </button>
      {hasClipboard && (
        <button className="context-menu-item" onClick={handlePasteHere}>
          Paste Here
        </button>
      )}
      <div className="context-menu-divider" />
      <button className="context-menu-item" onClick={handleExportImage}>
        Export as Image
      </button>
      <button className="context-menu-item" onClick={handleCaptureThumbnail}>
        Capture Thumbnail
      </button>
      <div className="context-menu-divider" />
      <div className="context-menu-header">Snap Guides</div>
      <button className="context-menu-item" onClick={handleAddXGuide} disabled={!worldPosition}>
        Add X Guide Here
      </button>
      <button className="context-menu-item" onClick={handleAddYGuide} disabled={!worldPosition}>
        Add Y Guide Here
      </button>
      <button className="context-menu-item" onClick={handleAddZGuide} disabled={!worldPosition}>
        Add Z Guide Here
      </button>
      {hasGuides && (
        <button className="context-menu-item context-menu-item-danger" onClick={handleClearGuides}>
          Clear All Guides ({snapGuides.length})
        </button>
      )}
    </div>
  );
}
