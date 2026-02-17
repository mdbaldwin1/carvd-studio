# Performance Optimization Results — Epic 4

> Final benchmarking and documentation for Epic 4 (Performance Optimization).
> Covers beads 4.1–4.9, completed February 2026.

## Summary

Epic 4 addressed performance across four categories: **rendering** (reducing draw calls, re-renders, and allocations), **loading** (code splitting, lazy loading, bundle size reduction), **runtime** (debouncing, throttling, undo/redo optimization), and **measurement** (profiling tooling and baselines).

### Optimization Overview

| Bead | Category | What It Did | Key Impact |
|------|----------|-------------|------------|
| 4.1 | Measurement | Profiling tooling + baselines | `carvdDev` helpers, PerfMonitor component, `npm run analyze` |
| 4.2 | Rendering | React.memo + useCallback on sub-components | Eliminated unnecessary re-renders in Part children |
| 4.3 | Rendering | Geometry/material pooling at module level | Shared BufferGeometry and MeshStandardMaterial instances across all parts |
| 4.4 | Rendering | Eliminated allocations in hot render paths | Removed per-frame Vector3/Color/array allocations in useFrame and render |
| 4.5 | Runtime | Debouncing and throttling expensive operations | Throttled drag updates, debounced search/filter inputs |
| 4.6 | Loading | Code splitting + lazy loading for 11 modals | Modals load on-demand via React.lazy; main bundle shrinks |
| 4.7 | Runtime | Undo/redo snapshot optimization | Addressed by Epic 3 store split — transient state excluded from zundo |
| 4.8 | Rendering | Scene optimization (conditional Edges, grain LOD, sky simplification) | Draw calls reduced; distant grain arrows culled; sky sphere 2048→96 triangles |
| 4.9 | Loading | Bundle size reduction | Removed 386 KB dead code; deferred PDF to button click; removed dead import |

### Bundle Size Before/After

| Metric | Before (pre-4.6) | After (post-4.9) | Change |
|--------|:-----------------:|:-----------------:|:------:|
| Total renderer JS (raw) | ~4,984 KB | 4,506 KB | -478 KB (-9.6%) |
| Total renderer JS (gzip) | ~992 KB | 904 KB | -88 KB (-8.9%) |
| html2canvas chunk | 341 KB | 0 KB | Removed (dead code) |
| DOMPurify chunk | 45 KB | 0 KB | Removed (dead code) |
| CutListModalWrapper | 677 KB | 72 KB | -605 KB (deferred to click) |
| pdfExport (new deferred chunk) | — | 623 KB | Loads only on PDF export |

### Current Bundle Breakdown (post-optimization)

| Chunk | Raw (KB) | Gzipped (KB) | Notes |
|-------|:--------:|:------------:|-------|
| three | 1,650 | 300 | Core 3D library |
| r3f (fiber + drei) | 937 | 180 | React Three Fiber ecosystem |
| index (main app) | 773 | 168 | App code + React + Zustand |
| pdfExport (deferred) | 623 | 152 | Loads on "Export PDF" click only |
| jspdf (index.es) | 360 | 76 | PDF library (deferred with pdfExport) |
| CSS (Tailwind) | 101 | 15 | Single stylesheet |
| CutListModalWrapper | 72 | 13 | Cut list modal (PDF code removed) |
| StockLibraryModal | 47 | 7 | Lazy-loaded modal |
| AppSettingsModal | 31 | 5 | Lazy-loaded modal |
| ImportAppStateModal | 26 | 4 | Lazy-loaded modal |
| ProjectSettingsModal | 21 | 4 | Lazy-loaded modal |
| TemplatesScreen | 20 | 4 | Lazy-loaded modal |
| TemplateBrowserModal | 18 | 4 | Lazy-loaded modal |
| WelcomeTutorial | 14 | 4 | Lazy-loaded modal |
| LicenseActivationModal | 8 | 2 | Lazy-loaded modal |
| SaveAssemblyModalWrapper | 8 | 2 | Lazy-loaded modal |
| AboutModal | 5 | 1 | Lazy-loaded modal |
| Icon chunks (3) | ~1 | ~1 | Lucide icon re-exports |
| empty-module stub | 0.06 | 0.1 | jsPDF optional dep stub |
| **Total JS** | **4,506** | **904** | |

## Detailed Bead Results

### 4.1: Profile & Establish Performance Baselines

**What:** Added dev-only profiling tooling accessible via `window.carvdDev`:
- `carvdDev.loadSeedProject()` — Load the 8-part seed project
- `carvdDev.createParts(N)` — Generate N test parts for benchmarking
- `carvdDev.perfBaseline()` — One-shot summary of renderer stats
- `carvdDev.measureUndoSnapshot()` — Undo memory details

Added `PerfMonitor` component that renders a Stats (FPS/MS/MB) overlay and logs draw calls, triangles, geometries, textures, and scene object count every 5 seconds.

Added `npm run analyze` script using `rollup-plugin-visualizer` for bundle treemap analysis.

**Files:** `PerfMonitor.tsx`, `electron.vite.config.ts`, `package.json`

### 4.2: Memoize Sub-Components and Event Handlers

**What:** Wrapped Part child components in React.memo. Converted inline event handler arrow functions to useCallback to prevent child re-renders when parent state changes that don't affect children.

**Key pattern:** Any component rendered inside a `.map()` loop or passed as a child to a Three.js group should be memoized.

### 4.3: Optimize Geometry and Material Reuse

**What:** Moved BufferGeometry and MeshStandardMaterial creation from per-instance (inside component render) to module-level singletons in `partGeometry.ts`. All Part instances now share the same geometry and material objects instead of each creating their own.

**Key files:** `partGeometry.ts` (pooled geometries + materials), `Part.tsx`, `GrainDirectionArrow.tsx`

**Key pattern:** Three.js geometries and materials should be created once at module scope and shared via import. Use per-instance `scale`, `rotation`, and `color` props for variation.

### 4.4: Reduce Object Allocations in Hot Render Paths

**What:** Eliminated `new THREE.Vector3()`, `new THREE.Color()`, and temporary array allocations inside `useFrame` callbacks and render functions. Replaced with module-level reusable instances or direct property access.

**Key pattern:** Never allocate objects inside `useFrame` — the garbage collector runs on the main thread and causes frame drops. Pre-allocate at module scope and reuse with `.set()` / `.copy()`.

### 4.5: Add Debouncing and Throttling

**What:** Added throttling to high-frequency drag operations and debouncing to search/filter inputs. Prevents unnecessary computation during continuous user input.

**Key pattern:** Throttle continuous operations (drag, resize) at 16ms (60fps). Debounce discrete operations (search, filter) at 150–300ms.

### 4.6: Code Splitting and Lazy Loading

**What:** Converted 11 modal components from static imports to `React.lazy()` with `<Suspense>` boundaries. Each modal now loads as a separate chunk on first open rather than being included in the main bundle.

**Modals lazy-loaded:** AboutModal, AppSettingsModal, CutListModalWrapper, ImportAppStateModal, LicenseActivationModal, ProjectSettingsModal, SaveAssemblyModalWrapper, StockLibraryModal, TemplateBrowserModal, TemplatesScreen, WelcomeTutorial

**Key pattern:** Any component that isn't visible on initial render (modals, dialogs, secondary screens) should be lazy-loaded.

### 4.7: Undo/Redo Snapshot Optimization

**What:** Already addressed by Epic 3 (State Management Split). The store split moved all transient state (hover, selection, snap, camera, drag, toast, contextMenu) out of the undo-tracked projectStore into separate stores. This means undo/redo snapshots only capture the 18 domain-relevant fields, dramatically reducing snapshot size.

### 4.8: Scene Optimization

**What:** Three targeted Three.js scene graph optimizations:

1. **Conditional Edges mounting:** Changed `<Edges>` from always-mounted with `visible` prop to conditionally mounted only when selected/hovered/wireframe. Removes the component from the scene graph entirely when not needed.

2. **Distance-based grain arrow LOD:** Grain direction arrows skip rendering when camera is more than 150 units away (using squared distance for fast comparison). Reduces draw calls for large scenes.

3. **Simplified sky sphere:** Reduced sky mesh from `[500, 32, 32]` (2,048 triangles) to `[500, 8, 6]` (96 triangles). A solid-color sky doesn't need high tessellation.

**Key files:** `Part.tsx`, `GrainDirectionArrow.tsx`, `partGeometry.ts`, `partTypes.ts`, `Workspace.tsx`

**Key pattern:** Prefer conditional mounting (`{condition && <Component />}`) over `visible={false}` for complex Three.js objects — unmounted components don't consume draw calls or scene traversal time.

### 4.9: Bundle Size Optimization

**What:** Three changes:

1. **Stubbed unused jsPDF dependencies:** html2canvas (341 KB) and DOMPurify (45 KB) are jsPDF optional deps only needed for its `.html()` method. Since `pdfExport.ts` uses `.text()/.line()/.rect()` exclusively, these were replaced with an empty module stub via Vite `resolve.alias`. Saved 386 KB raw.

2. **Deferred PDF export to button click:** Changed all 4 files that statically imported from `pdfExport.ts` (CutListModal, CutListDiagramsTab, CutListPartsTab, ShoppingListTab) to use dynamic `await import()` inside click handlers. This moved pdfExport + jsPDF from the CutListModalWrapper chunk to a separate deferred chunk that only loads when the user clicks "Export PDF" or "Download CSV".

3. **Removed dead dynamic import:** App.tsx had a redundant dynamic import of `useAssemblyLibrary` that was already statically imported. Removed the dead code.

**Key files:** `electron.vite.config.ts`, `stubs/empty-module.ts`, `CutListModal.tsx`, `CutListDiagramsTab.tsx`, `CutListPartsTab.tsx`, `ShoppingListTab.tsx`, `App.tsx`

## What Was NOT Optimized (and Why)

| Candidate | Reason Skipped |
|-----------|---------------|
| Three.js tree-shaking (`import * as THREE` in 14 files) | Large refactor; Vite/Rollup handles unused exports; uncertain savings for high effort |
| Drei component optimization | Only 6 components imported (Grid, OrbitControls, Html, Line, Edges, Stats); tree-shaking already handles this |
| Lucide-react icon audit | 81 icon imports, but Lucide tree-shakes by individual entry points — already optimal |
| Electron build target | electron-vite v5 auto-detects Chrome version from installed Electron |
| InstancedMesh for parts | Parts have different dimensions/colors; instancing only helps identical geometry |

## Performance Monitoring Tooling

### Dev-Only Tooling (available in `npm run dev`)

| Tool | Access | Purpose |
|------|--------|---------|
| `carvdDev.loadSeedProject()` | DevTools console | Load 8-part test scene |
| `carvdDev.createParts(N)` | DevTools console | Generate N parts for stress testing |
| `carvdDev.perfBaseline()` | DevTools console | One-shot renderer stats summary |
| `carvdDev.measureUndoSnapshot()` | DevTools console | Undo memory analysis |
| PerfMonitor | Automatic in dev | FPS/MS/MB overlay + console logging every 5s |
| React DevTools Profiler | Browser extension | Component re-render analysis |
| Chrome Performance tab | Browser DevTools | Frame-level profiling |

### Build Analysis

| Tool | Command | Output |
|------|---------|--------|
| Bundle visualizer | `npm run analyze` | `bundle-analysis.html` treemap with gzip sizes |
| Build output | `electron-vite build` | Chunk sizes printed to console |

## Lessons Learned

1. **Module-level pooling is the highest-impact Three.js optimization.** Moving geometry/material creation from components to module scope eliminates per-instance allocations and lets the GPU batch draw calls.

2. **Conditional mounting beats visibility toggling.** `{show && <Edges />}` is cheaper than `<Edges visible={show} />` because unmounted components don't exist in the scene graph at all.

3. **Dynamic imports require ALL consumers to be dynamic.** When converting a static import to dynamic, check for other files that statically import the same module — Vite won't split the chunk if any static import remains.

4. **Optional dependencies can be significant.** jsPDF's html2canvas + DOMPurify added 386 KB for functionality we never use. Always audit `optionalDependencies` when adding large libraries.

5. **Store architecture affects undo/redo performance.** Splitting transient state (UI, camera, selection) into separate stores means undo snapshots only track domain data, reducing snapshot size dramatically.

6. **Lazy loading modals is free performance.** 11 modals moved to React.lazy with zero UX impact — modals already have a visual transition that masks the async load.

7. **Dev tooling pays for itself.** The `carvdDev` helpers and PerfMonitor make it trivial to measure the impact of changes during development.
