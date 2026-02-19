# Carvd Studio

## Overview

Electron desktop app for designing furniture and cabinetry. Design in 3D → Get cut lists, cutting diagrams, and cost estimates.

**Tech Stack:** Electron + React 19 + TypeScript + Three.js (React Three Fiber) + Zustand + Tailwind CSS 4

**Status:** Production-ready core. UX polish in progress for 1.0 release.

## Source Of Truth

- `AGENTS.md` is the primary source of truth for workflow, branch strategy, PR rules, changelog expectations, validation gates, security handling, and multi-session safety.
- This file is supplemental Claude context and should avoid duplicating stable policy from `AGENTS.md`.

## Roles

- **Claude:** Lead Developer - Make technical decisions, implement features, keep docs current
- **Michael:** Product Owner - Define requirements, approve major changes, UX direction

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

## Documentation

See `.claude/docs/` for:

- `design-patterns.md` — CSS variables, button system, React patterns, testing
- `features-roadmap.md` — What's built, keyboard shortcuts, test coverage
- `launch-checklist.md` — Pre-launch tasks (screenshots, Lemon Squeezy, etc.)
- `environment-setup.md` — Environment variables and secrets for CI/CD

See also:

- `AGENTS.md` — Primary workflow and quality policy for all agents
- `CLAUDE.md` — Supplemental deep technical guidance
- `.github/pull_request_template.md` — PR checklist
- `.github/ISSUE_TEMPLATE/` — Bug report and feature request forms

---

**Styling:** Desktop uses Tailwind CSS 4 with CSS custom properties for theming. Styles split across `tailwind.css` (theme tokens + Tailwind import), `primitives.css` (base components), `layout.css` (layout), `domain.css` (domain-specific). Website uses Tailwind independently.
