/**
 * Dev-only performance monitoring overlay for the 3D workspace.
 * Periodically logs renderer.info to console.
 * Only active when import.meta.env.DEV is true.
 */

import { RendererInfoLogger } from './RendererInfoLogger';
import { useEffect, useRef } from 'react';
import { useSnapStore } from '../../store/snapStore';

export function PerfMonitor() {
  const snapPerf = useSnapStore((s) => s.snapPerf);
  const lastLoggedSamplesRef = useRef(0);

  useEffect(() => {
    if (snapPerf.sampleCount < 60) return;
    if (snapPerf.sampleCount === lastLoggedSamplesRef.current) return;
    if (snapPerf.sampleCount - lastLoggedSamplesRef.current < 60) return;
    lastLoggedSamplesRef.current = snapPerf.sampleCount;

    const overBudgetRate = snapPerf.overBudgetCount / Math.max(1, snapPerf.sampleCount);
    if (overBudgetRate > 0.2) {
      // Dev-only visibility into snap-loop performance regressions.
      console.warn(
        `[SnapPerf] avg=${snapPerf.avgMs.toFixed(2)}ms max=${snapPerf.maxMs.toFixed(2)}ms over-budget=${(
          overBudgetRate * 100
        ).toFixed(1)}% budget=${snapPerf.budgetMs}ms samples=${snapPerf.sampleCount}`
      );
    }
  }, [snapPerf]);

  if (!import.meta.env.DEV) return null;

  return <RendererInfoLogger />;
}
