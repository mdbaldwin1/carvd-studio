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
- CI/CD: `test.yml` (desktop unit + e2e, website unit + e2e, lint/typecheck/format) + `release.yml` (automated builds & GitHub Releases) + `changelog-check.yml` (enforces CHANGELOG.md updates on PRs to main)
- Release pipeline: macOS (code-signed + notarized via Developer ID Application cert) + Windows (unsigned)
- Branch protection: Both `develop` and `main` protected — no direct pushes (even admins), all CI must pass
- Pre-commit hooks: husky + lint-staged runs `prettier --check` on staged files
- Node version pinning: `.nvmrc` (Node 22), all CI workflows use `node-version-file`
- `.editorconfig` for consistent editor settings
- GitHub Issue Templates: Bug report and feature request (YAML form-based)
- PR template with checklist (tests, lint, typecheck, format, changelog)
- Website: SPA routing via `vercel.json`, deployed from main via Vercel (ignoreCommand skips non-main branches)
- Website uses lucide-react icons and custom brand SVGs (no emojis)
- Vercel version sync: Release workflow updates `VITE_APP_VERSION` env var and triggers production redeploy
- Dependabot: Weekly dependency updates for desktop and website, targeting develop branch
- Welcome tutorial (3 steps)

### Recent Upgrades (through v0.1.14)

- React 19 (from React 18)
- @react-three/fiber v9, @react-three/drei v10, three.js v0.182
- electron-builder v26
- Electron 35
- Tailwind CSS 4 migration (from plain CSS)
- macOS notarization (Developer ID Application cert + Apple notarytool)
- Website emoji replacement with lucide-react icons + custom brand SVGs
- Pre-commit hooks, issue templates, PR template, changelog CI check
- Website CI integration (typecheck + format checks)
- Comprehensive test coverage push (1625 → 2675 tests)

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

**Status:** ~92% statement coverage, ~82% branch coverage (2675 tests)

| Module              | Coverage |
| ------------------- | -------- |
| Hooks               | 100%     |
| fileFormat.ts       | 100%     |
| logger.ts           | 100%     |
| featureLimits.ts    | 100%     |
| seedData.ts         | 100%     |
| fractions.ts        | 99%      |
| cutListOptimizer.ts | 98%      |
| templates/loader.ts | ~90%     |
| Components          | 88-97%   |
| Trial components    | ~90%     |
| projectStore.ts     | ~76%     |
| appSettingsStore.ts | ~76%     |

## Known Issues

None currently.

## Resolved Issues

1. ~~**Production build performance**~~ — Three.js rendering was sluggish in the packaged app. Resolved through optimization work.

## Known Limitations (By Design)

1. **Boxes only** - No curves, all parts are rectangular
2. **90° rotation** - Axis-aligned only
3. **Guillotine cuts** - Table saw workflow
4. **Offline-only** - No cloud, no accounts
