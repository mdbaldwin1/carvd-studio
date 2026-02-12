# Carvd Studio

## Overview

Electron desktop app for designing furniture and cabinetry. Design in 3D → Get cut lists, cutting diagrams, and cost estimates.

**Tech Stack:** Electron + React + TypeScript + Three.js (React Three Fiber) + Zustand

**Status:** Production-ready core. UX polish in progress for 1.0 release.

## Roles

- **Claude:** Lead Developer - Make technical decisions, implement features, keep docs current
- **Michael:** Product Owner - Define requirements, approve major changes, UX direction

## Monorepo Structure

```
carvd-studio/
├── packages/
│   ├── desktop/     → Electron app (NO Tailwind)
│   └── website/     → Marketing site (CAN use Tailwind)
└── package.json     → Root workspace config
```

**Key Commands:**
```bash
npm run dev:desktop      # Run Electron app
npm run build:desktop    # Build production
npm run package:mac      # Create macOS DMG
npm run package:win      # Create Windows installer
npm run test             # Run all tests (1625 tests, ~85% coverage)
npm run test:coverage    # Run with coverage report
```

## Desktop App Key Files

```
packages/desktop/src/
├── main/
│   ├── index.ts           # Window, IPC, menu
│   ├── store.ts           # electron-store config
│   ├── license.ts         # License verification
│   ├── trial.ts           # Trial system logic
│   ├── lemonsqueezy-api.ts # Lemon Squeezy API client
│   └── updater.ts         # Auto-update system
├── preload/
│   └── index.ts           # Safe API bridge
└── renderer/src/
    ├── App.tsx            # Main component
    ├── store/projectStore.ts  # Zustand state + undo/redo + license mode
    ├── components/        # React components
    │   ├── TrialBanner.tsx       # Days remaining banner
    │   ├── TrialExpiredModal.tsx # Expired prompt modal
    │   └── UpgradePrompt.tsx     # Inline upgrade prompt
    ├── hooks/
    │   └── useLicenseStatus.ts   # Combined license/trial hook
    ├── utils/
    │   └── featureLimits.ts      # Limit definitions & helpers
    ├── templates/         # Project templates
    ├── types.ts           # All TypeScript interfaces
    └── index.css          # ALL STYLES (no Tailwind)
```

## Critical Rules

### Styling (Desktop App)

1. **NO Tailwind** - Use CSS classes in `index.css` only
2. **NO inline styles** - All styles in `index.css`
3. **Use CSS variables** - `var(--color-bg)`, `var(--color-text)`, etc.
4. **Button system** - Always use `.btn` base class + modifiers

### Data Constraints

1. **Boxes only** - No curves, all parts are rectangular
2. **90° rotation** - Axis-aligned only
3. **Offline-only** - No cloud, no accounts
4. **Guillotine cuts** - Table saw workflow

## Core Data Model

```typescript
interface Part {
  id: string;
  name: string;
  length: number;        // inches
  width: number;
  thickness: number;
  position: { x, y, z };
  rotation: Rotation3D;  // 90° increments
  stockId: string | null;
  color: string;
  notes?: string;
}

interface Stock {
  id: string;
  name: string;
  length: number;
  width: number;
  thickness: number;
  grainDirection: 'length' | 'width' | 'none';
  pricePerUnit: number;
  color: string;
}
```

## State Management

- **Zustand** - Global state in `projectStore.ts`
- **zundo** - Undo/redo middleware (Cmd+Z, Cmd+Shift+Z)
- **electron-store** - Persistence (settings, libraries)

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

## CI/CD

- **test.yml** - Runs on all PRs (unit, E2E, lint)
- **release.yml** - Triggered by version tags (v*)
- **Auto-updater** - electron-updater via GitHub Releases

## Documentation

See `.claude/docs/` for:
- `design-patterns.md` - CSS variables, button system, React patterns, testing
- `features-roadmap.md` - What's built, keyboard shortcuts, test coverage
- `launch-checklist.md` - Pre-launch tasks (screenshots, Lemon Squeezy, etc.)
- `environment-setup.md` - Environment variables and secrets for CI/CD

---

**Remember:** Desktop app = `index.css` only. No Tailwind, no inline styles.
