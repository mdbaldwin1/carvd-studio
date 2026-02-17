import { useProjectStore, captureCanvas } from '../../store/projectStore';
import { useClipboardStore } from '../../store/clipboardStore';
import { useUIStore } from '../../store/uiStore';
import { useCameraStore } from '../../store/cameraStore';

const menuItem =
  'block w-full py-2 px-3 bg-transparent border-none text-text text-[13px] text-left cursor-pointer transition-colors duration-100 enabled:hover:bg-surface-hover disabled:text-text-muted disabled:cursor-not-allowed';
const menuItemDanger = `${menuItem} !text-danger enabled:hover:!bg-danger enabled:hover:!text-white`;

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
      className="context-menu bg-surface border border-border rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.3)] min-w-[160px] py-1 overflow-visible"
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 1000
      }}
    >
      <button className={menuItem} onClick={handleResetView}>
        Reset View
      </button>
      <button className={menuItem} onClick={handleCenterViewHere} disabled={!worldPosition}>
        Center View Here
      </button>
      {hasClipboard && (
        <button className={menuItem} onClick={handlePasteHere}>
          Paste Here
        </button>
      )}
      <div className="h-px bg-border my-1" />
      <button className={menuItem} onClick={handleExportImage}>
        Export as Image
      </button>
      <button className={menuItem} onClick={handleCaptureThumbnail}>
        Capture Thumbnail
      </button>
      <div className="h-px bg-border my-1" />
      <div className="py-2 px-3 text-[11px] text-text-muted border-b border-border mb-1">Snap Guides</div>
      <button className={menuItem} onClick={handleAddXGuide} disabled={!worldPosition}>
        Add X Guide Here
      </button>
      <button className={menuItem} onClick={handleAddYGuide} disabled={!worldPosition}>
        Add Y Guide Here
      </button>
      <button className={menuItem} onClick={handleAddZGuide} disabled={!worldPosition}>
        Add Z Guide Here
      </button>
      {hasGuides && (
        <button className={menuItemDanger} onClick={handleClearGuides}>
          Clear All Guides ({snapGuides.length})
        </button>
      )}
    </div>
  );
}
