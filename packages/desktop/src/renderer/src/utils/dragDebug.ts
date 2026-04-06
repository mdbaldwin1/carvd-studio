export type DragDebugEntry = {
  ts: string;
  event: string;
  payload?: unknown;
};

declare global {
  interface Window {
    __dragDebugEnabled?: boolean;
    __dragDebugLogs?: DragDebugEntry[];
    __dragDebugToolsInstalled?: boolean;
    enableDragDebug?: () => void;
    disableDragDebug?: () => void;
    clearDragDebugLogs?: () => void;
    dumpDragDebugLogs?: () => DragDebugEntry[];
  }
}

const MAX_DRAG_DEBUG_LOGS = 5000;

export function dragDebug(event: string, payload?: unknown): void {
  if (typeof window === 'undefined' || !window.__dragDebugEnabled) return;
  const entry: DragDebugEntry = { ts: new Date().toISOString(), event, payload };
  const current = window.__dragDebugLogs ?? [];
  current.push(entry);
  if (current.length > MAX_DRAG_DEBUG_LOGS) {
    current.splice(0, current.length - MAX_DRAG_DEBUG_LOGS);
  }
  window.__dragDebugLogs = current;
  console.info('[DragDebug]', event, payload ?? '');
}

export function installDragDebugTools(): void {
  if (typeof window === 'undefined' || window.__dragDebugToolsInstalled) return;
  window.__dragDebugToolsInstalled = true;
  window.__dragDebugEnabled = window.__dragDebugEnabled ?? false;
  window.__dragDebugLogs = window.__dragDebugLogs ?? [];

  window.enableDragDebug = () => {
    window.__dragDebugEnabled = true;
    console.info('[DragDebug] enabled');
  };
  window.disableDragDebug = () => {
    window.__dragDebugEnabled = false;
    console.info('[DragDebug] disabled');
  };
  window.clearDragDebugLogs = () => {
    window.__dragDebugLogs = [];
    console.info('[DragDebug] logs cleared');
  };
  window.dumpDragDebugLogs = () => {
    const logs = window.__dragDebugLogs ?? [];
    console.info('[DragDebug] log count:', logs.length);
    return logs;
  };
}
