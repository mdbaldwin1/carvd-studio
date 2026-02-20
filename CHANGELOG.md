# Changelog

All notable changes to Carvd Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Website: Tailwind CSS 4 + shadcn/ui foundation** — Installed `tailwindcss` and `@tailwindcss/vite` in the website package; configured `vite.config.ts` with the Tailwind Vite plugin and `@/` path alias; created `src/tailwind.css`, `src/lib/utils.ts` with `cn()`, `src/components/ui/` directory, and `components.json` for shadcn CLI; installed `tailwind-merge`, `clsx`, and `class-variance-authority` (bead carvd-studio-9.1)
- **shadcn/ui foundation** — Installed core utility dependencies (tailwind-merge, clsx, class-variance-authority), created `cn()` class merging utility, and configured `components.json` for the desktop app with `@renderer/` path aliases
- **Website: Twilight Studio theming** — Translated all website CSS custom properties into `src/tailwind.css` with full Twilight Studio dark/light theme support; mapped to shadcn/ui variable convention (`--background`, `--foreground`, `--primary`, etc.) and Tailwind tokens via `@theme inline`; added light theme (`[data-theme='light']`) with Papaya Whip backgrounds and Twilight Indigo text; mapped font families (Roboto → `font-sans`, Roboto Slab → `font-serif`, Monaco → `font-mono`) (bead carvd-studio-9.2)
- **Website: Core shadcn/ui components** — Added Button, Card, Badge, NavigationMenu, Accordion, and Separator components to `src/components/ui/`; installed `tw-animate-css` for animation utilities (`animate-in`, `animate-out`, `fade-in`, etc.) and added accordion open/close keyframes; installed Radix UI primitives (`@radix-ui/react-accordion`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-separator`, `@radix-ui/react-slot`) (bead carvd-studio-9.3)
- **Website: HomePage and FeaturesPage migration** — Migrated all custom CSS classes to Tailwind utilities and shadcn Card/Badge/Button; feature cards and use-case cards use shadcn Card with hover lift effects; hero/version badges use shadcn Badge; CTAs use shadcn Button with `asChild`; complex gradient backgrounds use inline styles; full responsive layout with Tailwind `max-*` breakpoint variants (bead carvd-studio-10.2)
- **Website: Shared component migration** — Migrated Header, BuyButton, Footer, and ScreenshotPlaceholder from custom CSS classes to Tailwind utilities and shadcn/ui components; Header now uses shadcn NavigationMenu with responsive mobile-first layout; BuyButton uses shadcn Button with `asChild`; Footer converted to Tailwind utilities with responsive stacking (bead carvd-studio-10.1)
- **Website: PricingPage migration** — Migrated PricingPage and all sub-components to Tailwind + shadcn; PricingCard uses shadcn Card with checklist items as explicit spans; PricingFAQ converted from card list to shadcn Accordion with `type="multiple"`; CompetitorComparison table migrated to Tailwind utilities; ValueComparison uses shadcn Card; ROISection uses Tailwind layout with inline style for gradient background (bead carvd-studio-10.3)
- **shadcn/ui theming bridge** — Mapped Twilight Studio CSS custom properties to shadcn conventions (`--background`, `--foreground`, `--primary`, `--destructive`, etc.) in both dark and light themes, with new Tailwind utility classes for non-conflicting tokens

- **Start screen Settings & Library buttons** — Added icon buttons in the start screen header for quick access to App Settings and Stock/Assembly Library without needing to open a project first
- **Assembly editing from start screen** — Can now enter assembly edit mode directly from the start screen's assembly library
- **Inline name editing on AssemblyEditingBanner** — Click the assembly name in the editing banner to rename it in-place

### Changed

- **Desktop Tabs migration (bead carvd-studio-5.1)** — Added shadcn/Radix Tabs primitive (`components/ui/tabs.tsx`) and migrated tabbed flows in StartScreen, CutListModal, and StockLibraryModal from local `activeTab` state to semantic `Tabs`/`TabsTrigger`/`TabsContent` patterns; updated affected component tests to role-based tab assertions compatible with Radix `data-state`.
- **Desktop Table migration (bead carvd-studio-5.2)** — Added shadcn-style table primitives (`components/ui/table.tsx`) and migrated cut-list parts rendering in `CutListPartsTab` from native table markup to `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell` while preserving existing column selectors (`col-*`) and Twilight Studio styling semantics.
- **Desktop Card migration (bead carvd-studio-5.3)** — Added shadcn-style Card primitives (`components/ui/card.tsx`) and migrated start-screen project rows (`RecentsTab`, `FavoritesTab`), template cards/details (`TemplateBrowserModal`), and App Settings section containers (`Appearance`, `Defaults`, `Behavior`, `Snapping`, `StockConstraints`, `License`, `DataManagement`) to `Card` composition while preserving existing interactions and selectors.
- **Desktop Collapsible/Accordion migration (bead carvd-studio-5.4)** — Added shadcn-style `Collapsible` and `Accordion` primitives, migrated sidebar section collapse behavior in `App.tsx` (Stock, Assemblies, Parts) from custom collapsed class/grid logic to Radix-backed collapsibles, and replaced properties panel `<details>` sections (Position, Notes, Joinery Adjustments) with accordion items; removed obsolete details-specific and collapsed-class CSS rules from `layout.css` and `domain.css`.
- **Desktop Progress/Skeleton migration (bead carvd-studio-5.5)** — Added shadcn-style `Progress` and `Skeleton` primitives, migrated `ProgressBar` to use Radix-backed progress rendering (`components/ui/progress.tsx`) while preserving sizing/color variants, and migrated `LoadingSpinner` to shadcn skeleton-based loading visuals (`components/ui/skeleton.tsx`) with updated component tests.
- **Desktop Stock Modal Dialog migration (bead carvd-studio-6.1)** — Migrated `AddStockModal`, `EditStockModal`, and `StockLibraryModal` from legacy custom modal wrappers/overlays to `ui/dialog` primitives (`Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`, `DialogClose`) while preserving form flows, stock/assembly interactions, and backdrop/Escape close semantics.
- **Desktop Assembly Modal Dialog migration (bead carvd-studio-6.2)** — Migrated `AddAssemblyModal` and `SaveAssemblyModal` from legacy custom overlay/modal markup to `ui/dialog` primitives and shadcn form controls (`Input`, `Textarea`, `Label`, `Checkbox`) while preserving assembly selection flows, default-name generation, save behavior, and close interactions.
- **Desktop Project Modal Dialog migration (bead carvd-studio-6.3)** — Migrated `NewProjectDialog`, `ProjectSettingsModal`, and `ImportAppStateModal` from custom overlay/backdrop implementations to `ui/dialog` primitives while preserving async defaults loading, project favorite handling, import preview/import flows, and existing form validation interactions.
- **Desktop App Settings Modal migration (bead carvd-studio-6.4)** — Migrated `AppSettingsModal` from custom overlay/backdrop/escape wiring to `ui/dialog` primitives while preserving all settings-section integrations (`Appearance`, `License`, `Defaults`, `Behavior`, `Snapping`, `Stock Constraints`, `Data Management`) and auto-save update behavior.
- **Desktop Cut List Modal migration (bead carvd-studio-6.5)** — Migrated `CutListModal` from custom overlay/backdrop/escape wiring to `ui/dialog` primitives while preserving cut-list generation/regeneration/export controls, stale/skipped-part warnings, and tabbed content (`Parts`, `Diagrams`, `Shopping`) behavior.
- **Desktop Template Browser Modal migration (bead carvd-studio-6.6)** — Migrated `TemplateBrowserModal` from custom overlay/backdrop/escape wiring to `ui/dialog` primitives while preserving built-in/user template selection, create-project flow, save-current-as-template flow, and delete-confirm overlay behavior.
- **Desktop license/trial/utility dialog migration (bead carvd-studio-6.7)** — Migrated `LicenseActivationModal`, `TrialExpiredModal`, `FileRecoveryModal`, and `ImportToLibraryDialog` from custom overlay/modal wrappers to `ui/dialog` primitives while preserving activation, upgrade, recovery, and library-import action flows.
- **Desktop Sidebar migration (bead carvd-studio-7.1)** — Added `components/ui/sidebar.tsx` primitives and migrated the app shell to use `SidebarProvider`, `Sidebar`, `SidebarContent`, `SidebarGroup`, `SidebarGroupLabel`, and `SidebarFooter` while preserving existing collapsible stock/assemblies/parts sections, search interactions, sidebar width, and bottom settings actions.
- **Desktop Header/Toolbar button migration (bead carvd-studio-7.2)** — Migrated display-toolbar buttons in `App.tsx` from custom button classes to shadcn `Button` variants/sizes (including active toggle states), and removed obsolete `.toolbar*`/`.header-divider` CSS rules from `layout.css` while preserving Electron drag/no-drag header behavior.
- **Desktop Properties Panel form-control migration (bead carvd-studio-7.3)** — Migrated `PropertiesPanel` form controls in `App.tsx` to shadcn primitives (`Input`, `Select`, `Label`, `Checkbox`, `Textarea`) while preserving FractionInput/ColorPicker behavior, and removed legacy `.property-group` input/select/checkbox/textarea rules from `domain.css`.
- **Desktop banner migration to shadcn Alert (bead carvd-studio-7.4)** — Added shadcn `Alert` primitives (`components/ui/alert.tsx`) and migrated `AssemblyEditingBanner`, `TemplateEditingBanner`, `TrialBanner`, `UpdateNotificationBanner`, and `UpgradePrompt` to `Alert`/`AlertTitle`/`AlertDescription`, preserving update/trial/upgrade action flows while aligning banner semantics and variant usage (`default` vs `destructive`).
- **Aesthetic redesign ("Twilight Studio" theme)** — Refreshed dark/light color palette with Twilight Indigo (#203864), Cerulean (#077187), Lilac Ash (#AEA4BF), Gold (#FFD21F), and Papaya Whip (#FFEECF); updated backgrounds, borders, text tones, sidebar, header, and button styles
- **Font update** — Switched to Nunito Sans for improved readability and warmth
- **Splash screen theming** — Splash screen now respects light/dark mode with theme-aware colors and font
- **3D scene theming** — Canvas background and grid colors now follow the active theme

### Fixed

- **New Template button text contrast** — Button text on gold background is now dark (Twilight Indigo) instead of invisible white
- **"Start Editing" from new template modal** — Creating a new template from the templates screen now correctly enters the 3D editor
- **Recents not opening after templates navigation** — Clicking a recent project after visiting the templates screen now reliably opens the project
- **Library icon inconsistency** — Start screen library button now uses the same `Library` icon as the editor header
- **Assembly thumbnail rendering** — Fixed missing `data:image/png;base64,` prefix in AssembliesTab causing broken thumbnail images

### Changed

- **Updated project documentation** — Corrected outdated coverage thresholds (91/82/90/91), test count (2675), Tailwind CSS 4 architecture, and store inventory across CLAUDE.md, project-prompt.md, design-patterns.md, features-roadmap.md, and launch-checklist.md
- **Store cleanup and architecture docs** — Extracted duplicate helper from `deleteGroup()`, added JSDoc to all exported helpers, created `STORES.md` architecture guide documenting all 9 stores (bead 3.9)
- **Extract licenseStore from projectStore** — Moved `licenseMode` state and `setLicenseMode` action into a dedicated `licenseStore`, updating 7 projectStore actions and 11 consumer files to read from the new store (bead 3.8)
- **Extract clipboardStore from projectStore** — Moved clipboard state and 3 clipboard actions (copy, paste, pasteAtPosition) into a dedicated `clipboardStore`, with cross-store coordination for paste operations (bead 3.7)
- **Extract assemblyEditingStore from projectStore** — Moved 4 assembly editing state fields and 5 orchestrator actions into a dedicated `assemblyEditingStore`, with cross-store coordination for project snapshot save/restore (bead 3.6)
- **Extract snapStore from projectStore** — Moved 4 transient snap state fields and 9 actions into a dedicated `snapStore`, with cross-store cleanup in delete actions and assembly editing (bead 3.5)
- **Extract selectionStore from projectStore** — Moved 8 selection/UI state fields and 18 actions into a dedicated `selectionStore`, with a subscription bridge for reference distance updates (bead 3.4)
- **Extract cameraStore from projectStore** — Moved 9 camera/viewport state fields and 10 actions into a dedicated `cameraStore`, reducing projectStore complexity and continuing the store decomposition (bead 3.3)

### Fixed

- **Update Notification Visibility** — Update toast now appears above all modals on the start screen (z-index increased from 1100 to 10003)
- **Automated PRs Now Trigger CI** — Version bump and sync PRs now use `WORKFLOW_PAT` instead of `GITHUB_TOKEN`, enabling CI checks on automated pull requests
- **Sync-Develop Workflow Detection** — Fixed bug where sync workflow checked file differences instead of commit history, causing it to miss merge commits from main

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
