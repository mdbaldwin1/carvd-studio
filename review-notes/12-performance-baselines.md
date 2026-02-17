# Performance Baselines

> Established as part of Epic 4 — Performance Optimization (ticket 4.1).
> Bundle sizes measured post-optimization (4.9). Runtime metrics require manual measurement with the dev tooling below.

## How to Reproduce

All measurements use the dev-only `window.carvdDev` tooling added in ticket 4.1:

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

> Fill in by running `npm run dev`, loading a scene, and reading the Stats overlay (FPS) and Chrome Performance tab.

| Metric | 8 parts (seed) | 50 parts | 100 parts | 200 parts |
|--------|:--------------:|:--------:|:---------:|:---------:|
| FPS (idle) | | | | |
| FPS (drag part) | | | | |
| FPS (box select) | | | | |
| FPS (orbit camera) | | | | |

## Three.js Renderer Info

> Fill in by running `npm run dev` and reading PerfMonitor console output (logs every 5s).

| Metric | 8 parts (seed) | 50 parts | 100 parts | 200 parts |
|--------|:--------------:|:--------:|:---------:|:---------:|
| Draw calls | | | | |
| Triangles | | | | |
| Geometries | | | | |
| Textures | | | | |

## Memory

> Fill in using `carvdDev.measureUndoSnapshot()` and Chrome DevTools Memory tab.

| Metric | 8 parts (seed) | 50 parts | 100 parts | 200 parts |
|--------|:--------------:|:--------:|:---------:|:---------:|
| JS Heap (MB) | | | | |
| Undo snapshot size (KB) | | | | |
| Undo history count | | | | |
| Est. total undo memory (KB) | | | | |

## React Re-renders (per drag frame)

> Fill in using React DevTools Profiler while dragging a part.

| Component / area | 8 parts | 50 parts | 100 parts |
|-----------------|:-------:|:--------:|:---------:|
| Canvas tree | | | |
| HierarchicalPartsList | | | |
| Toolbar / panels | | | |

## Bundle Size

Measured 2026-02-17 with `npm run analyze`. See `13-performance-optimization-results.md` for before/after comparison.

| Chunk | Size (KB) | Gzipped (KB) |
|-------|:---------:|:------------:|
| **Total renderer JS** | **4,506** | **904** |
| three | 1,650 | 300 |
| r3f (fiber + drei) | 937 | 180 |
| index (app code + React) | 773 | 168 |
| pdfExport (deferred) | 623 | 152 |
| jspdf (deferred) | 360 | 76 |
| CSS (Tailwind) | 101 | 15 |
| CutListModalWrapper | 72 | 13 |
| StockLibraryModal | 47 | 7 |
| AppSettingsModal | 31 | 5 |
| ImportAppStateModal | 26 | 4 |
| ProjectSettingsModal | 21 | 4 |
| TemplatesScreen | 20 | 4 |
| TemplateBrowserModal | 18 | 4 |
| WelcomeTutorial | 14 | 4 |
| LicenseActivationModal | 8 | 2 |
| SaveAssemblyModalWrapper | 8 | 2 |
| AboutModal | 5 | 1 |

## Identified Bottlenecks (addressed by Epic 4)

1. **Per-instance geometry/material allocation** — Each Part created its own BufferGeometry and Material. Fixed in 4.3 with module-level pooling.
2. **Per-frame object allocation** — Vector3, Color, and arrays allocated inside useFrame. Fixed in 4.4 with pre-allocated reusable instances.
3. **Unused bundle weight** — html2canvas (341 KB) + DOMPurify (45 KB) bundled as dead code. Fixed in 4.9 with empty module stubs.
4. **Eager PDF loading** — pdfExport.ts (623 KB) loaded when cut list modal opened, not when user clicks export. Fixed in 4.9 with dynamic imports.
5. **Always-mounted Edges** — `<Edges>` component mounted on every part even when not selected. Fixed in 4.8 with conditional mounting.
6. **Monolithic store undo snapshots** — All state (including transient UI) captured in undo history. Fixed by Epic 3 store split.
7. **No code splitting** — All modals loaded eagerly on startup. Fixed in 4.6 with React.lazy for 11 modals.

## Notes

- Bundle sizes measured with production build (`electron-vite build`)
- FPS measurements should use Electron dev mode with Stats overlay (drei)
- `performance.memory` is Chrome-only and approximate
- Stats panel (drei) measures actual render-loop FPS, not vsync
- PerfMonitor only active in dev mode (`import.meta.env.DEV`)
