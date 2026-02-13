# Features & Roadmap

## Status: Production-Ready

Core features complete. UX polish in progress for 1.0 release.

## What's Built

### Core Features
- 3D workspace with parts, groups, and assemblies
- Multi-select, copy/paste, undo/redo (100 history)
- Stock library (app-level + project-level)
- Part-to-stock assignment with constraint validation
- Advanced snapping (parts, guides, equal spacing, dimension matching)
- Reference parts for precision alignment

### Cut List System
- Guillotine bin-packing optimization
- Cutting diagrams (SVG visualization)
- Shopping list with cost estimates
- Export to CSV and PDF

### File Management
- `.carvd` file format (JSON)
- Auto-recovery (2 min interval)
- Recent projects + favorites

### Start Screen & Templates
- Templates section (built-in + user templates)
- Template edit mode with save/discard
- Project thumbnails (auto-generated on save)
- Recents/Favorites tabs

### Trial & License System
- **14-day full-feature trial** - Starts on first launch
- **Trial banner** - Shows days remaining (appears after day 7)
- **Trial expired modal** - Options: Buy, Enter License, Continue Free
- **Feature-limited free mode** after trial expires:
  - 10 parts max per project
  - 5 stock items max
  - No PDF export
  - No cut list optimizer
  - No groups, assemblies, or custom templates
- **Grace mode** - Can open projects over limits, edit existing, but not add new
- **License activation** - Lemon Squeezy API integration

### Website
- Changelog page (auto-generated from `CHANGELOG.md` via Vite virtual module)
- Download page with platform-specific installers (version auto-updated from Vercel env var)
- Documentation, pricing, features, and support pages

### Infrastructure
- License system (Lemon Squeezy API + 7-day offline cache)
- Auto-updater (electron-updater + GitHub Releases)
- Post-update notification (shows what's new after an update)
- CI/CD: `test.yml` (unit + e2e on Ubuntu, macOS, Windows) + `release.yml` (automated builds & GitHub Releases)
- Release pipeline: macOS (code-signed + notarized via Developer ID Application cert) + Windows (unsigned)
- Website: SPA routing via `vercel.json`, deployed from main via Vercel (ignoreCommand skips non-main branches)
- Vercel version sync: Release workflow updates `VITE_APP_VERSION` env var and triggers production redeploy
- Dependabot: Weekly dependency updates targeting develop branch
- Welcome tutorial (3 steps)

### Recent Upgrades (v0.1.1)
- React 19 (from React 18)
- @react-three/fiber v9, @react-three/drei v10, three.js v0.182
- electron-builder v26
- Electron 35

## Keyboard Shortcuts

| Key                 | Action                |
| ------------------- | --------------------- |
| Cmd+N/O/S           | New/Open/Save         |
| Cmd+Z / Cmd+Shift+Z | Undo/Redo             |
| Cmd+C/V/A           | Copy/Paste/Select All |
| Shift+D             | Duplicate             |
| Delete              | Delete selected       |
| X/Y/Z               | Rotate on axis        |
| G                   | Create group          |
| Cmd+Shift+G         | Ungroup               |
| R                   | Toggle reference      |
| F                   | Focus camera          |
| Home                | Reset view            |
| Arrows              | Nudge                 |
| Cmd+Shift+F         | Add to Favorites      |

## Test Coverage

**Status:** ~85% statement coverage, ~76% branch coverage (1625 tests)

| Module | Coverage |
|--------|----------|
| Hooks | 100% |
| fileFormat.ts | 100% |
| logger.ts | 100% |
| fractions.ts | 99% |
| cutListOptimizer.ts | 98% |
| featureLimits.ts | 100% |
| templates/loader.ts | 90% |
| Trial components | 90%+ |
| Components | 85-97% |
| projectStore.ts | 76% |

## Known Issues

1. **Production build performance** - Three.js rendering is noticeably slower in the packaged app compared to dev mode. Needs investigation (GPU context, Vite bundling, or Electron hardened runtime).

## Known Limitations (By Design)

1. **Boxes only** - No curves, all parts are rectangular
2. **90° rotation** - Axis-aligned only
3. **Guillotine cuts** - Table saw workflow
4. **Offline-only** - No cloud, no accounts
