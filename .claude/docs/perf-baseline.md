# Performance Baseline

Status: Baseline procedure defined; numbers captured per session
Date initiated: 2026-05-18
Phase: P0.5 (gates Tier 0 work)
Companion docs:

- [`interaction-architecture-execution-plan.md`](./interaction-architecture-execution-plan.md)
- [`interaction-test-strategy.md`](./interaction-test-strategy.md)

## Why this exists

Every phase commit must demonstrate it didn't regress workspace performance. The baseline is captured **before** Phase §11 work begins (state of the branch at commit `ea0bfab`) and stored here. Every subsequent phase-end commit compares against this baseline.

The interaction architecture redesign moves a lot of code; some moves will incidentally improve perf, some will incidentally cost. Either is fine **as long as we know about it**. Silent regression is the failure mode.

## What we measure

### M1 — Per-frame drag cost (snap detection)

Already instrumented via `useSnapStore.snapPerf`. The `PerfMonitor` component logs:

```
[SnapPerf] avg=X.XXms max=X.XXms over-budget=X.X% budget=Yms samples=N
```

after every 60 samples during a drag. Budget is `useSnapStore.snapPerf.budgetMs` (default 8 ms = 120 FPS frame budget; 16 ms = 60 FPS).

**Capture procedure:**

1. Build & run packaged app (not dev server — dev has React strict mode + sourcemap overhead that taints numbers).
2. Load fixture project (see procedures per scene below).
3. Open DevTools console.
4. Run `carvdDev.perfBaseline()` to snapshot scene + memory.
5. Drag one part for ~3 seconds across the workspace; release.
6. Watch the `[SnapPerf]` console log for the latest summary; that's the run.
7. Record `avg` and `max` and `over-budget` for each scene.

### M2 — Re-render cost on selection change

Captured via React DevTools Profiler. Procedure:

1. Open DevTools → React → Profiler tab.
2. Click "record."
3. Click a part to select it; click another part to switch selection; shift-click a third.
4. Stop recording. Note the longest commit's "render duration" (top of Flamegraph).
5. Record per scene.

Optional automated version (preferred for repeatability): use a Vitest+`@testing-library/react` integration test that wraps the `Workspace` render with `Profiler` and records render counts. To be added in CC1.

### M3 — Initial scene render

Procedure:

1. Hard-reload the renderer (Cmd+R).
2. Load fixture immediately.
3. Note Three.js draw-calls + geometry-count from `[Perf]` console log (PerfMonitor logs every 5 s).
4. Note first-meaningful-paint time from `performance.now()` printed by `carvdDev.perfBaseline()` if available.

### M4 — Memory after fixture load

From `carvdDev.perfBaseline()` "Used JS heap" reading after ~10 seconds of idle, after fixture load.

## Scenes (will reference P0.6 fixtures once built)

| Scene ID | Parts | Groups | Description                        |
| -------- | ----- | ------ | ---------------------------------- |
| S0       | 0     | 0      | Empty project                      |
| S1       | 5     | 0      | Simple 5-part assembly             |
| S2       | 50    | 6      | Mid-size project with groups       |
| S3       | 500   | 30     | Stress scene                       |
| S4       | 30    | 8      | Nested groups (3 levels deep)      |
| S5       | 20    | 0      | Mixed custom rotation/angled parts |

## Baseline table

Fill these in by running the capture procedure on the current branch state. Re-run after each Tier and append a column; do not overwrite the baseline column.

| Scene | M1 avg (ms) | M1 max (ms) | M1 over-budget % | M2 max commit (ms) | M3 draw calls | M3 geometries | M4 heap (MB) |
| ----- | ----------- | ----------- | ---------------- | ------------------ | ------------- | ------------- | ------------ |
| S0    |             |             |                  |                    |               |               |              |
| S1    |             |             |                  |                    |               |               |              |
| S2    |             |             |                  |                    |               |               |              |
| S3    |             |             |                  |                    |               |               |              |
| S4    |             |             |                  |                    |               |               |              |
| S5    |             |             |                  |                    |               |               |              |

> **Capture status:** numbers not yet populated. First capture pending: requires P0.6 fixtures + a manual run on the host machine. Until populated, phase-end commits should note "perf comparison pending baseline capture" in the commit body and the work should not merge to develop until the baseline is filled and per-phase comparisons exist.

## Regression policy

Per phase-end commit on this branch:

1. Re-run the capture procedure for **at least** scenes S1 and S2.
2. Run S3 if the phase touched anything that scales with part count (hit-test, snap, rendering, overlay layout).
3. Compare against baseline.
4. Allowed tolerances:
   - M1 avg ≤ baseline × 1.10
   - M1 max ≤ baseline × 1.20
   - M1 over-budget % ≤ baseline + 5 percentage points
   - M2 max commit ≤ baseline × 1.10
   - M3 draw calls ≤ baseline + 2 (small perturbation OK for new debug primitives etc.)
   - M4 heap ≤ baseline × 1.15
5. Any tolerance miss blocks the commit. Investigate, fix, or open a follow-up bead with explicit justification before relaxing.

A measured improvement is recorded but does not become the new baseline automatically — that resets only at the end of a tier when we re-snapshot.

## Tooling gaps

- **Automated capture:** captures today are manual. CC1 should add a `npm run perf:capture` script that builds the packaged app, runs a Playwright spec that loads each fixture and drives a synthetic drag, and writes captured numbers to `tests/perf-results/<commit-sha>.json`.
- **Tracing:** for deep dives, use Chrome DevTools Performance tab while running the app in dev with `CARVD_REMOTE_DEBUG=1`. Profile a drag, look for long tasks > 16 ms.

## References

- Existing instrumentation: [`packages/desktop/src/renderer/src/components/workspace/PerfMonitor.tsx`](../../packages/desktop/src/renderer/src/components/workspace/PerfMonitor.tsx)
- Console helper: [`packages/desktop/src/renderer/src/hooks/useDevTools.ts`](../../packages/desktop/src/renderer/src/hooks/useDevTools.ts) `perfBaseline()`
- Snap perf data: [`packages/desktop/src/renderer/src/store/snapStore.ts`](../../packages/desktop/src/renderer/src/store/snapStore.ts) `snapPerf`
