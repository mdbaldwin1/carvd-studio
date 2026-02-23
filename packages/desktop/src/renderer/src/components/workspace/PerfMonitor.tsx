/**
 * Dev-only performance monitoring overlay for the 3D workspace.
 * Periodically logs renderer.info to console.
 * Only active when import.meta.env.DEV is true.
 */

import { RendererInfoLogger } from './RendererInfoLogger';

export function PerfMonitor() {
  if (!import.meta.env.DEV) return null;

  return <RendererInfoLogger />;
}
