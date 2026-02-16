# Performance Baselines

> Established as part of Epic 4 — Performance Optimization (ticket 4.1).
> These baselines serve as the "before" measurements for all optimization work in tickets 4.2–4.10.

## How to Reproduce

All measurements use the dev-only `window.carvdDev` tooling added in this ticket:

```bash
cd packages/desktop && npm run dev
```

1. Open DevTools console
2. Use `carvdDev.loadSeedProject()` for the 8-part baseline
3. Use `carvdDev.createParts(N)` to build larger test scenes
4. Use `carvdDev.perfBaseline()` for a one-shot summary
5. Use `carvdDev.measureUndoSnapshot()` for undo memory details
6. Use Chrome DevTools Performance tab for FPS during interactions
7. Use React DevTools Profiler for re-render counts

## Rendering Performance

| Metric | 8 parts (seed) | 50 parts | 100 parts | 200 parts |
|--------|:--------------:|:--------:|:---------:|:---------:|
| FPS (idle) | | | | |
| FPS (drag part) | | | | |
| FPS (box select) | | | | |
| FPS (orbit camera) | | | | |

## Three.js Renderer Info

| Metric | 8 parts (seed) | 50 parts | 100 parts | 200 parts |
|--------|:--------------:|:--------:|:---------:|:---------:|
| Draw calls | | | | |
| Triangles | | | | |
| Geometries | | | | |
| Textures | | | | |

## Memory

| Metric | 8 parts (seed) | 50 parts | 100 parts | 200 parts |
|--------|:--------------:|:--------:|:---------:|:---------:|
| JS Heap (MB) | | | | |
| Undo snapshot size (KB) | | | | |
| Undo history count | | | | |
| Est. total undo memory (KB) | | | | |

## React Re-renders (per drag frame)

| Component / area | 8 parts | 50 parts | 100 parts |
|-----------------|:-------:|:--------:|:---------:|
| Canvas tree | | | |
| HierarchicalPartsList | | | |
| Toolbar / panels | | | |

## Bundle Size

Run `npm run analyze` to regenerate.

| Chunk | Size (KB) | Gzipped (KB) |
|-------|:---------:|:------------:|
| **Total renderer** | | |
| three | | |
| react + react-dom | | |
| zustand + zundo | | |
| jspdf | | |
| lucide-react | | |
| @react-three/* | | |
| App code | | |

## Identified Bottlenecks (ranked)

<!-- Fill in after running all benchmarks. Rank by impact. -->

1. **TBD** —
2. **TBD** —
3. **TBD** —

## Notes

- All FPS measurements taken on: _machine spec TBD_
- Browser: Electron (Chromium) in dev mode
- `performance.memory` is Chrome-only and approximate
- Stats panel (drei) measures actual render-loop FPS, not vsync
