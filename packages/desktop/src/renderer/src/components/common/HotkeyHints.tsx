import { useClipboardStore } from '@renderer/store/clipboardStore';
import { useSelectionStore } from '@renderer/store/selectionStore';

export function HotkeyHints({ show }: { show: boolean }) {
  const selectedPartIds = useSelectionStore((s) => s.selectedPartIds);
  const selectedGroupIds = useSelectionStore((s) => s.selectedGroupIds);
  const clipboard = useClipboardStore((s) => s.clipboard);

  const isMac = window.navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  if (!show) return null;

  let hints: { key: string; action: string }[] = [];
  const hasSelection = selectedPartIds.length > 0 || selectedGroupIds.length > 0;
  const totalSelected = selectedPartIds.length + selectedGroupIds.length;

  if (!hasSelection) {
    hints = [
      { key: `${modKey}+A`, action: 'Select All' },
      { key: `${modKey}+Drag`, action: 'Box Select' },
      { key: 'Shift+Click', action: 'Multi-select' }
    ];
    if (clipboard.parts.length > 0) {
      hints.push({ key: `${modKey}+V`, action: 'Paste' });
    }
  } else if (totalSelected === 1) {
    hints = [
      { key: 'Arrows', action: 'Nudge' },
      { key: 'X / Y / Z', action: 'Rotate' },
      { key: `${modKey}+C`, action: 'Copy' },
      { key: 'Shift+D', action: 'Duplicate' },
      { key: 'R', action: 'Reference' },
      { key: 'Del', action: 'Delete' },
      { key: 'F', action: 'Focus' },
      { key: 'Esc', action: 'Deselect' }
    ];
  } else {
    hints = [
      { key: 'Arrows', action: 'Nudge' },
      { key: 'X / Y / Z', action: 'Rotate' },
      { key: `${modKey}+C`, action: 'Copy' },
      { key: 'Shift+D', action: 'Duplicate' },
      { key: 'G', action: 'Group' },
      { key: `${modKey}+Shift+G`, action: 'Ungroup' },
      { key: 'R', action: 'Reference' },
      { key: 'Del', action: 'Delete' },
      { key: 'Esc', action: 'Deselect' }
    ];
  }

  const cameraHints: { key: string; action: string }[] = [
    { key: 'Drag', action: 'Orbit' },
    { key: 'Scroll', action: 'Zoom' },
    { key: 'Home', action: 'Reset' },
    { key: `${modKey}+Z`, action: 'Undo' },
    { key: `${modKey}+Shift+Z`, action: 'Redo' }
  ];

  return (
    <div className="hotkey-hints-container">
      <div className="hotkey-hints">
        {hints.map((hint, index) => (
          <span key={index} className="hotkey-hint">
            <kbd>{hint.key}</kbd>
            <span>{hint.action}</span>
          </span>
        ))}
      </div>
      <div className="hotkey-hints hotkey-hints-camera">
        {cameraHints.map((hint, index) => (
          <span key={index} className="hotkey-hint">
            <kbd>{hint.key}</kbd>
            <span>{hint.action}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
