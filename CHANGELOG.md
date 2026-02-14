# Changelog

All notable changes to Carvd Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Group Bounding Box Dimensions** — When a group is selected, only the group's overall dimensions are shown instead of cluttering the view with every child part's individual measurements
- **PR Template** — Added `.github/pull_request_template.md` with checklist and Claude instructions for consistent PR quality
- **Changelog CI Check** — PRs to main now fail if CHANGELOG.md hasn't been updated
- **CLAUDE.md** — Added project-level development guidelines covering git workflow, branch naming, commit conventions, and testing

### Changed

- **Decoupled Website & Desktop Deployments** — Website and desktop app now have independent versioning and deployment pipelines; website fetches the latest version dynamically from GitHub Releases API
- **Vercel Ignore Script** — Moved ignoreCommand logic to a shell script to stay within Vercel's 256-character limit
- **Branch Protection** — Both `develop` and `main` are now fully protected; all 7 CI checks must pass, no direct pushes even for admins
- **Website Auto-Versioning** — Website version bumps are automated via GitHub Actions after each deployment
- **Website Icons** — Replaced all emojis across the website with proper SVG icons (Apple logo, Windows logo) and lucide-react icons for a more professional appearance

### Fixed

- **Vercel Deployment Failure** — Fixed `ignoreCommand` exceeding Vercel's 256-character schema limit, which caused all deployments to fail

## [0.1.8] - 2026-02-13

### Fixed

- **Update Toast Z-Index** — Update notification toast was hidden behind the StartScreen overlay due to z-index conflict
- **Release Workflow** — Improved version comparison to skip releases when the desktop version is unchanged; fixed sync-develop step

## [0.1.6] - 2026-02-13

### Fixed

- **Auto-Update 404** — Resolved issue where the auto-updater returned 404 errors when checking for updates
- **Update Notification UX** — Converted update notification from a banner to a toast for less intrusive presentation

## [0.1.4] - 2026-02-13

### Changed

- **React Rendering Performance** — Added React.memo to Part component, memoized Zustand selectors and AABB calculations, implemented code splitting for modals
- **GPU Performance** — Capped device pixel ratio, reused Vector3 objects, removed unused shadow maps
- **Production GPU Optimization** — Optimized Three.js rendering pipeline for production builds

### Fixed

- **Download URLs** — Fixed website download links to match actual GitHub Release filenames
- **Vercel Deployment** — Fixed ignoreCommand and redeploy triggering for the marketing website

## [0.1.1] - 2026-02-13

### Added

- **Changelog Page** — New page on the website showing release history
- **Post-Update Notification** — Desktop app shows what's new after an update
- **Windows E2E Tests** — Playwright end-to-end tests now run on Windows in CI

### Changed

- **React 19** — Upgraded from React 18 to React 19
- **Three.js Ecosystem** — Upgraded to @react-three/fiber v9, drei v10, three.js v0.182
- **CI Pipeline** — Streamlined test matrix; cross-platform E2E on Ubuntu, macOS, and Windows

### Fixed

- **macOS Notarization** — App is now signed with a Developer ID Application certificate and notarized by Apple, so macOS no longer blocks it on first launch
- **electron-builder v26 Compatibility** — Removed deprecated `publisherName` config
- **Flaky E2E Tests** — Resolved timing issues in macOS Playwright tests
- **Website Download Links** — URLs now match actual GitHub Release filenames
- **Security Vulnerabilities** — Resolved 14 Dependabot alerts

## [0.1.0] - 2025-02-12

### Added

- **3D Furniture Design Editor** - Interactive workspace with real-time 3D visualization using Three.js
- **Part Management** - Create, edit, duplicate, and organize rectangular parts with precise dimensions
- **Stock/Material System** - Define lumber and sheet goods with pricing, grain direction, and board foot calculations
- **Groups & Assemblies** - Organize parts into logical groups and reusable assembly templates
- **Snap-to-Part Alignment** - Intelligent snapping system for precise part positioning (edge, center, flush)
- **Cut List Optimizer** - Automatic cut list generation with material optimization and waste calculation
- **PDF Export** - Export cut lists as formatted PDF documents
- **Project Templates** - Built-in starter templates (Bookshelf, End Table, Simple Desk) and tutorial project
- **Custom Templates** - Save and load your own project and assembly templates
- **Stock Library** - Persistent material library with common lumber and plywood presets
- **Undo/Redo** - Full history support for all design operations
- **Auto-Save & Recovery** - Automatic project backup with crash recovery
- **Keyboard Shortcuts** - Comprehensive shortcuts for common operations
- **Project File Format** - Save/load projects as `.carvd` files with full version migration support
- **Start Screen** - Quick access to recent projects, favorites, and templates
- **Welcome Tutorial** - Interactive onboarding tutorial for new users
- **Trial System** - 14-day full-feature trial with graceful degradation to free tier
- **License Activation** - License key validation and activation via LemonSqueezy
- **Auto-Updates** - Built-in update checking and notification system
- **Cross-Platform** - macOS and Windows desktop application
- **Marketing Website** - Product website with features, pricing, documentation, and download pages

[Unreleased]: https://github.com/mdbaldwin1/carvd-studio/compare/v0.1.8...HEAD
[0.1.8]: https://github.com/mdbaldwin1/carvd-studio/compare/v0.1.6...v0.1.8
[0.1.6]: https://github.com/mdbaldwin1/carvd-studio/compare/v0.1.4...v0.1.6
[0.1.4]: https://github.com/mdbaldwin1/carvd-studio/compare/v0.1.1...v0.1.4
[0.1.1]: https://github.com/mdbaldwin1/carvd-studio/releases/tag/v0.1.1
[0.1.0]: https://github.com/mdbaldwin1/carvd-studio/releases/tag/v0.1.0
