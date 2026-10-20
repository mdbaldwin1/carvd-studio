// The API contract lives in src/shared/electronAPI.ts, shared with the preload
// implementation that actually exposes it, so the two cannot drift apart.
import type { ElectronAPI } from '../../shared/electronAPI';

export type { ElectronAPI };

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
