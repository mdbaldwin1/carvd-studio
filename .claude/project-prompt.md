# Carvd Studio

## Overview

Electron desktop app for designing furniture and cabinetry. Design in 3D → Get cut lists, cutting diagrams, and cost estimates.

**Tech Stack:** Electron + React 19 + TypeScript + Three.js (React Three Fiber) + Zustand + Tailwind CSS 4

**Status:** Production-ready core. UX polish in progress for 1.0 release.

## Roles

- **Claude:** Lead Developer - Make technical decisions, implement features, keep docs current
- **Michael:** Product Owner - Define requirements, approve major changes, UX direction

## Monorepo Structure

```
carvd-studio/
├── packages/
│   ├── desktop/     → Electron app
│   └── website/     → Marketing site
└── package.json     → Root workspace config
```

**Key Commands:**

```bash
npm run dev:desktop      # Run Electron app
npm run build:desktop    # Build production
npm run package:mac      # Create macOS DMG
npm run package:win      # Create Windows installer
npm run test             # Run all tests (2822 tests, ~92% coverage)
npm run test:coverage    # Run with coverage report
```

### Data Constraints

1. **Boxes only** - No curves, all parts are rectangular
2. **90° rotation** - Axis-aligned only
3. **Offline-only** - No cloud, no accounts
4. **Guillotine cuts** - Table saw workflow

## Trial & License System

### License Modes

- **trial** - 14-day full features (default for new users)
- **licensed** - Full features with valid license key
- **free** - Feature-limited mode after trial expires

### Trial Flow

1. First launch starts 14-day trial
2. Days 1-7: No banner, full features
3. Days 8-14: Trial banner shows days remaining
4. Day 15+: Trial expired modal, then free mode

### Free Mode Limits

- 10 parts max (grace mode: can open larger projects, can't add new)
- 5 stock items max
- No PDF export, optimizer, groups, assemblies, or custom templates

### Key Files

- `src/main/trial.ts` - Trial logic (main process)
- `src/renderer/src/utils/featureLimits.ts` - Limit definitions
- `src/renderer/src/hooks/useLicenseStatus.ts` - Combined hook
- `src/renderer/src/store/projectStore.ts` - Stores `licenseMode`, enforces limits

### Lemon Squeezy Integration

- **Lemon Squeezy API** - Online validation + 7-day offline cache
- **Activation limits** - Enforced by Lemon Squeezy
- **Purchase flow** - Opens browser to Lemon Squeezy checkout

## Multi-Session Workflow (Git Worktrees)

When multiple Claude Code sessions work on this repo simultaneously, **each session MUST use its own git worktree** to avoid branch-switching conflicts that discard uncommitted changes.

### Setup

```bash
# From the main repo directory, create a worktree for your branch:
git worktree add ../carvd-studio-<short-name> <branch-name>

# Examples:
git worktree add ../carvd-studio-downloads fix/website-download-links
git worktree add ../carvd-studio-security fix/security-vulnerabilities
```

### Rules

1. **Never run `git checkout` in a shared worktree** — it wipes other sessions' uncommitted work
2. **Create a worktree before starting work** if other sessions may be active
3. **Commit early and often** — uncommitted changes only exist in the working directory
4. **Clean up when done:** `git worktree remove ../carvd-studio-<short-name>`
5. **A branch can only be checked out in one worktree at a time** — git enforces this

### Directory Layout

```
/Users/mbaldwin/Carvd/
├── carvd-studio/                  # Main repo (keep on develop)
├── carvd-studio-<feature>/        # Worktree for feature work
└── carvd-studio-<fix>/            # Worktree for bug fixes
```

## CI/CD

- **test.yml** — Runs on all PRs to `main`/`develop`: unit tests, E2E tests (3 platforms), lint/typecheck/format (desktop + website), website unit tests, website E2E tests
- **release.yml** — Triggered by push to `main`: builds macOS (code-signed + notarized) + Windows, creates GitHub Release, bumps desktop patch version on `develop`
- **changelog-check.yml** — Fails PRs to `main` if CHANGELOG.md wasn't modified
- **sync-develop.yml** — Triggered by push to `main`: merges main back into develop via PR
- **website-version-bump.yml** — Triggered by push to `main` when website files change: deploys to Vercel, creates `website-v*` tag, bumps website version on `develop`
- **Auto-updater** — electron-updater via GitHub Releases
- **Pre-commit hooks** — husky + lint-staged runs `prettier --check` on staged files
- **Node version** — Pinned in `.nvmrc` (Node 22), all CI workflows use `node-version-file`

## Branch Protection

Both `develop` and `main` are protected:

- No direct pushes (even for admins — `enforce_admins: true`)
- All changes must go through pull requests
- All CI checks must pass before merging
- `develop` → `main` uses merge commit (preserves shared ancestry for sync-develop)
- Hotfix branches → `main` use squash merge

## Documentation

See `.claude/docs/` for:

- `design-patterns.md` — CSS variables, button system, React patterns, testing
- `features-roadmap.md` — What's built, keyboard shortcuts, test coverage
- `launch-checklist.md` — Pre-launch tasks (screenshots, Lemon Squeezy, etc.)
- `environment-setup.md` — Environment variables and secrets for CI/CD

See also:

- `CLAUDE.md` — Git workflow, versioning, commit conventions, changelog format
- `.github/pull_request_template.md` — PR checklist
- `.github/ISSUE_TEMPLATE/` — Bug report and feature request forms

---

**Styling:** Desktop uses Tailwind CSS 4 with CSS custom properties for theming. Styles split across `tailwind.css` (theme tokens + Tailwind import), `primitives.css` (base components), `layout.css` (layout), `domain.css` (domain-specific). Website uses Tailwind independently.
