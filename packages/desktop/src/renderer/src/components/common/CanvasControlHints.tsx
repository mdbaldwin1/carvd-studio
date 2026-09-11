/**
 * Mouse and view controls for a 3D viewport.
 *
 * Shared so the cuts preview advertises the same navigation as the project
 * canvas; they use the same OrbitControls configuration.
 */
export function CanvasControlHints() {
  const isMac = window.navigator.userAgent.toUpperCase().includes('MAC');
  const modKey = isMac ? '\u2318' : 'Ctrl';

  return (
    <div className="absolute bottom-3 left-3 flex flex-col gap-1 py-2 px-2.5 bg-surface opacity-70 hover:opacity-95 border border-border rounded-md backdrop-blur-[4px] z-50 pointer-events-none [&_kbd]:inline-block [&_kbd]:min-w-10 [&_kbd]:py-px [&_kbd]:px-1 [&_kbd]:bg-bg [&_kbd]:border [&_kbd]:border-border [&_kbd]:rounded-sm [&_kbd]:font-mono [&_kbd]:text-[9px] [&_kbd]:text-text [&_kbd]:text-center">
      <div className="flex items-center gap-2 text-[10px] text-text-muted whitespace-nowrap">
        <kbd>LMB</kbd> Orbit
      </div>
      <div className="flex items-center gap-2 text-[10px] text-text-muted whitespace-nowrap">
        <kbd>RMB</kbd> Pan
      </div>
      <div className="flex items-center gap-2 text-[10px] text-text-muted whitespace-nowrap">
        <kbd>Scroll</kbd> Zoom
      </div>
      <div className="flex items-center gap-2 text-[10px] text-text-muted whitespace-nowrap">
        <kbd>Home</kbd> Reset View
      </div>
      <div className="flex items-center gap-2 text-[10px] text-text-muted whitespace-nowrap">
        <kbd>F</kbd> Focus
      </div>
      <div className="flex items-center gap-2 text-[10px] text-text-muted whitespace-nowrap">
        <kbd>{modKey}+Z</kbd> Undo
      </div>
      <div className="flex items-center gap-2 text-[10px] text-text-muted whitespace-nowrap">
        <kbd>{modKey}+Shift+Z</kbd> Redo
      </div>
    </div>
  );
}
