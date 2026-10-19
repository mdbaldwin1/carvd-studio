import { setImmediate } from 'node:timers';

interface QuitEvent {
  preventDefault(): void;
}

/** Let document close/save guards finish before entering a native installer. */
export function createUpdateRestart({
  requestQuit,
  install,
  defer = (callback: () => void) => setImmediate(callback)
}: {
  requestQuit: () => void;
  install: () => void;
  defer?: (callback: () => void) => void;
}) {
  let phase: 'idle' | 'confirming' | 'handoff' = 'idle';
  let attempt = 0;

  return {
    request() {
      if (phase !== 'idle') return;
      phase = 'confirming';
      requestQuit();
    },
    cancel() {
      phase = 'idle';
      attempt++;
    },
    onWillQuit(event: QuitEvent) {
      if (phase === 'idle') return;
      // Electron emits will-quit only after all document windows have closed.
      // Cancel this normal quit, then let the updater own installation/relaunch.
      event.preventDefault();
      if (phase === 'handoff') return;
      phase = 'handoff';
      const currentAttempt = ++attempt;
      defer(() => {
        if (phase !== 'handoff' || attempt !== currentAttempt) return;
        phase = 'idle';
        install();
      });
    }
  };
}
