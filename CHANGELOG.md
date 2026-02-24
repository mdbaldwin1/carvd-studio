# Changelog

All notable changes to Carvd Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Website SEO automation + docs-search schema** — Added build-time sitemap generation (`npm run generate:sitemap` via website `prebuild`), introduced `WebSite` JSON-LD `SearchAction` targeting `/docs?search={search_term_string}`, and documented SEO operations/manual search engine submission steps in `packages/website/SEO.md`.
- **Start screen Settings & Library buttons** — Added icon buttons in the start screen header for quick access to App Settings and Stock/Assembly Library without needing to open a project first
- **Assembly editing from start screen** — Can now enter assembly edit mode directly from the start screen's assembly library
- **Inline name editing on AssemblyEditingBanner** — Click the assembly name in the editing banner to rename it in-place
- **Cut diagram detail modal** — Cutting diagrams in the Cut List modal are now clickable to open a larger detail view with zoom controls and per-part inspection.
- **Error fallback copy action** — Added an icon-only copy button on the crash fallback screen to copy full error details to clipboard for easier bug reporting.
- **Website download redirect tracking endpoint** — Added a Vercel API redirect (`/api/download`) that resolves latest GitHub release assets by platform and logs structured download-click events for analytics.

### Changed

- **Sync workflow sequencing hardening** — `sync-develop` now runs after the `Release` workflow completes (instead of directly on `main` push), uses workflow-level concurrency, reuses an existing open sync PR branch when present, and auto-closes redundant zero-diff sync PRs to reduce release-race churn.
- **Website social preview image hardening** — Switched OG/Twitter metadata to a dedicated `1200x630` PNG (`/branding/og-image-1200x630.png`) for better social crawler compatibility and more consistent preview rendering across platforms.
- **Docs search URL state** — Documentation search now syncs with `?search=` query params so results are shareable, crawlable, and aligned with structured search metadata.
- **Hotkey hint layout simplification** — Consolidated editor shortcut hints by moving view/undo hints into the bottom-left navigation helper, reducing duplicate hint blocks and improving readability on narrow windows with right-aligned stacked hints.
- **PDF diagram label routing readability** — Improved small-part callout routing in cut-diagram PDFs with collision-aware lane placement, side-biased part anchors, and label-lane-aligned targets to reduce crossed/ambiguous leader lines.
- **Website download links now use tracked redirects** — Home and Download page platform buttons now route through `/api/download` before forwarding to GitHub assets, enabling per-source/per-platform click tracking in Vercel logs.
- **Download toasts now include file-manager actions** — Export/download success toasts now include a contextual `Show in Finder`/`Show in File Explorer` button, and CSV exports in Cut List tabs now use native save dialogs so the saved file can always be revealed.
- **New Project material seeding now uses App Library** — Removed hardcoded starter stock definitions from the New Project dialog flow; selected materials now clone directly from the persisted app `stockLibrary`, so project defaults always reflect the user’s current library.
- **Stock-to-part visual highlighting** — Selecting a stock row in the sidebar now highlights all matching parts in the 3D workspace for quick material-based scanning.
- **Cut diagram detail UX** — Enlarged the diagram detail modal, switched zoom to uniform scaling across both axes, and added selected-part overlays/metadata (dimensions plus group-chain context).
- **Website visual-system overhaul** — Refined website design tokens (surfaces, borders, contrast, radii, and shadows), updated shared shadcn primitives (`Button`, `Card`, `Badge`, `NavigationMenu`), and applied consistent desktop-aligned styling across header/footer, marketing pages, and docs navigation/content containers for a more cohesive Carvd Studio brand experience.
- **Modal UX consistency pass (desktop)** — Standardized sizing, spacing, and section surfaces across major dialogs (`Stock Library`, `Add/Edit Stock`, `Add/Save Assembly`, `Import App State`, `Import to Library`, `File Recovery`, and `Template Browser`) to match the App/Project Settings visual system and improve readability on varied screen sizes.
- **App Settings modal UX refresh** — Reorganized App Settings into focused tabs (`General`, `Snapping & Constraints`, `Data & License`), widened the dialog for better readability, and improved section scannability without changing existing setting behavior.
- **App Settings tutorial cleanup** — Removed the `Reset Tutorial` action from App Settings now that tutorial access/reset is available from the start screen flow.
- **Project Settings visual alignment** — Updated Project Settings sections to use the same card-style containers as App Settings for more consistent contrast and grouping.
- **Properties panel UX refresh** — Increased panel width, added card-style grouping for key editing sections, and added toast feedback when position edits are blocked by overlap prevention.
- **Properties panel advanced controls** — Consolidated `Allow Overlap`, `Glue-Up Panel`, and `Joinery Adjustments` under a collapsed `Advanced Settings` section to reduce noise in the main editing flow.
- **Edit-mode header UX** — Replaced template/assembly editing banners with header-integrated mode chips (`Template`/`Assembly`) and inline editable name controls in the existing title area for project/template/assembly workflows.
- **Library modal edit-flow hardening** — Added unsaved-change confirmation when switching selections during stock/assembly edits, ensured `Esc` cancels in-panel edits before closing the modal, and improved list keyboard accessibility (Enter/Space selection).
- **Desktop library componentization and reuse pass** — Extracted shared library UI building blocks (`LibrarySidebar`, `LibraryDetailPane`, `LibraryDetailHeader`, `LibraryDetailRow`, `LibraryEmptyState`, `DocsLink`) plus reusable domain components (`StockFormFields`, `StockListItem`, `AssemblyListItem`, `AssemblyDetails`, `AssemblyPartsList`), and refactored stock/assembly tabs and add-modals to consume them for cleaner one-component-per-file structure and reduced duplicate markup.
- **Desktop dialog + styling alignment pass** — Reworked the shared desktop `Dialog` wrapper to use Radix dialog primitives with preserved legacy close semantics, reduced per-screen tab style overrides on Start Screen/Cut List/Library flows, and migrated high-traffic desktop forms/actions (stock/assembly search bars, project/template dialogs, recents/favorites actions, template manager actions, and shopping-item forms) from custom/raw controls to shared ShadCN primitives (`Button`, `IconButton`, `Input`, `Textarea`, `Tabs`).
- **Cross-app theme consistency alignment (bead carvd-studio-12.1)** — Aligned website typography and core theme semantics with desktop Twilight Studio conventions: website now uses Nunito Sans, maps `primary` to Gold CTA tokens, maps `accent`/`ring` to Cerulean interaction tokens, and maps `secondary` to Twilight Indigo to match desktop shadcn usage.
- **Migrated UI component library to shadcn/ui with Radix UI primitives** across both desktop and website surfaces.
- **Desktop migration completion** — Replaced custom button/form/overlay/layout primitives with shadcn components (`Button`, `Input`, `Select`, `Dialog`, `AlertDialog`, `Tabs`, `Table`, `Card`, `Accordion`, `Sidebar`, `Alert`, etc.), removed obsolete `primitives.css`, and simplified `layout.css`/`domain.css` to keep only Electron/domain-specific rules.
- **Website migration completion** — Migrated all shared/page/docs/legal views to Tailwind + shadcn, removed legacy `packages/website/src/index.css`, and consolidated styling into `tailwind.css` with Twilight Studio dark/light theme token mapping.
- **Accessibility and test modernization** — Shifted tests to role-based + Radix-compatible patterns, including portal-aware queries and state assertions (`data-state`/`data-disabled`), with desktop coverage thresholds maintained (`91/82/90/91`).
- **Performance and bundle validation** — Completed desktop and website bundle audits; desktop net payload improved slightly post-migration, and website CSS dropped substantially (`-25.5%` raw, `-22.6%` gzip) with JS effectively flat.
- **Migration documentation alignment** — Updated `CLAUDE.md` and migration handoff docs to reflect final shadcn architecture, component inventory, testing guidance, and bundle-impact expectations.
- **Aesthetic redesign ("Twilight Studio" theme)** — Refreshed dark/light color palette with Twilight Indigo (#203864), Cerulean (#077187), Lilac Ash (#AEA4BF), Gold (#FFD21F), and Papaya Whip (#FFEECF); updated backgrounds, borders, text tones, sidebar, header, and button styles
- **Font update** — Switched to Nunito Sans for improved readability and warmth
- **Splash screen theming** — Splash screen now respects light/dark mode with theme-aware colors and font
- **3D scene theming** — Canvas background and grid colors now follow the active theme
- **Group actions in Properties panel** — Expanded group-focused controls in the Properties panel to mirror context-menu capabilities (center view, save as assembly, reference toggles, merge/group operations, add/remove group membership, and delete actions for single/multi/mixed selections).
- **Cut diagram PDF readability overhaul** — Diagram exports now prioritize one board per page with orientation/scale tuned for legibility, plus improved callout labeling and larger text to better match real shop-floor usage.
- **Website/docs screenshot refresh** — Replaced placeholder and stale captures across Home/Features/docs with current desktop screenshots and updated capture scripts for repeatable, dock-safe framing and timed interactive shots.
- **Documentation alignment pass** — Updated docs for current template entry points (`File → New from Template...` and templates screen flow), cut-list diagram detail/export behavior, app-library stock save flow, and Project Settings favorites guidance.

### Fixed

- **Updater restart crash in packaged app** — Ensured desktop production dependencies are included in packaged artifacts by including `package.json` and `node_modules` in electron-builder `files`, resolving `ERR_MODULE_NOT_FOUND` for `electron-log` after auto-update restart.
- **Crawler handling for website API redirects** — Added `X-Robots-Tag: noindex, nofollow, noarchive` and `Disallow: /api/` policy for website API endpoints to reduce accidental indexing of non-content URLs.
- **Start screen overlap in short windows** — Prevented the `Recents`/`Favorites` section from overlapping template tiles by allowing the start screen content column to scroll when vertical space is constrained.
- **Packaged app header logo loading** — Fixed editor/header branding images not rendering in packaged desktop builds by switching renderer logo paths from absolute (`/branding/...`) to relative (`./branding/...`) URLs.
- **Website link target fixes** — Corrected broken website navigation links by replacing invalid in-page `#download` anchors on Features/Pricing flows with `/download`, and added a missing `id="requirements"` anchor on the Download page for Support deep links.
- **3D part visibility during orbit** — Disabled frustum culling for instanced part meshes to prevent parts disappearing at certain camera angles.
- **Stock highlight dismissal** — Clicking empty workspace space now clears sidebar stock highlighting along with part selection.
- **Desktop app icon color update** — Updated the branded app icon artwork to use the Carvd yellow beaver treatment and regenerated desktop icon assets (`icon.png`, `icon.icns`, `icon.ico`).
- **Assembly thumbnail rendering** — Fixed missing `data:image/png;base64,` prefix in AssembliesTab causing broken thumbnail images
- **Library icon inconsistency** — Start screen library button now uses the same `Library` icon as the editor header
- **New Template button text contrast** — Button text on gold background is now dark (Twilight Indigo) instead of invisible white
- **"Start Editing" from new template modal** — Creating a new template from the templates screen now correctly enters the 3D editor
- **Recents not opening after templates navigation** — Clicking a recent project after visiting the templates screen now reliably opens the project
- **Update Notification Visibility** — Update toast now appears above all modals on the start screen (z-index increased from 1100 to 10003)
- **Automated PRs Now Trigger CI** — Version bump and sync PRs now use `WORKFLOW_PAT` instead of `GITHUB_TOKEN`, enabling CI checks on automated pull requests
- **Sync-Develop Workflow Detection** — Fixed bug where sync workflow checked file differences instead of commit history, causing it to miss merge commits from main
- **Keyboard ungroup parity** — `Ctrl/Cmd+Shift+G` now also ungroup selected groups (not only groups inferred from selected parts).
- **PDF watermark logo distortion** — Watermark logo now preserves intrinsic image aspect ratio when rendered into exported PDFs.
- **Assembly stock duplication on add** — Adding an assembly to a project now reuses equivalent existing project stock entries instead of creating duplicate stock rows when the same material already exists.

## [0.1.11] - 2026-02-14

### Changed

- **Standalone Sync-Develop Workflow** — Separated main-to-develop sync into its own workflow that runs on every push to main, decoupled from the release pipeline
- **Merge Strategy Convention** — Documented merge commit (not squash) for develop-to-main PRs to preserve shared ancestry and prevent sync conflicts

### Fixed

- **Vercel Build Failure** — Fixed `husky` command not found (exit 127) during `npm ci` in Vercel's build environment by making the prepare script resilient (`husky || true`)

## [0.1.10] - 2026-02-14

### Added

- **Group Bounding Box Dimensions** — When a group is selected, only the group's overall dimensions are shown instead of cluttering the view with every child part's individual measurements
- **PR Template** — Added `.github/pull_request_template.md` with checklist and Claude instructions for consistent PR quality
- **Changelog CI Check** — PRs to main now fail if CHANGELOG.md hasn't been updated
- **CLAUDE.md** — Added project-level development guidelines covering git workflow, branch naming, commit conventions, and testing
- **Pre-commit Hooks** — Added husky + lint-staged to auto-check formatting on commit
- **Issue Templates** — Added GitHub issue templates for bug reports and feature requests
- **Dependabot Config** — Configured Dependabot for automated dependency update PRs with grouped packages

### Changed

- **Decoupled Website & Desktop Deployments** — Website and desktop app now have independent versioning and deployment pipelines; website fetches the latest version dynamically from GitHub Releases API
- **Vercel Ignore Script** — Moved ignoreCommand logic to a shell script to stay within Vercel's 256-character limit
- **Branch Protection** — Both `develop` and `main` are now fully protected; all 7 CI checks must pass, no direct pushes even for admins
- **Website Auto-Versioning** — Website version bumps are automated via GitHub Actions after each deployment
- **Website Icons** — Replaced all emojis across the website with proper SVG icons (Apple logo, Windows logo) and lucide-react icons for a more professional appearance
- **CI Checks** — Added website lint, typecheck, and format checks to CI; all workflows now use `.nvmrc` for consistent Node.js version
- **Website Code Quality** — Removed unused React imports (React 19), added `typecheck` and `format:check` scripts, excluded test files from typecheck, auto-formatted all source files
- **Versioning Standards** — Documented semver conventions and version management in CLAUDE.md

### Fixed

- **Release Version Comparison** — Replaced fragile `HEAD~1` version comparisons with durable artifact checks (GitHub Releases for desktop, `website-v*` git tags for website) to prevent skipped releases on squash merges
- **Website Deployment Gate** — Website version tagging now waits for Vercel deployment to succeed before creating the `website-v*` tag
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
