# Carvd Studio - Project Context

## Project Overview

Carvd Studio is an offline-only Electron desktop application for designing custom furniture and cabinetry. It generates accurate cut lists, optimized cutting diagrams, shopping lists, and cost estimates from 3D designs. Built with Electron + React + TypeScript + Three.js (React Three Fiber) + Zustand.

**Core Promise:** Design furniture in 3D → Get shopping list, cut diagrams, and cost estimate automatically.

**Current Status:** Phase 9 Complete (Comprehensive Testing & CI/CD)

## Roles & Responsibilities

**Claude (AI Assistant):** Lead Developer & Architect
- Make technical decisions and architecture choices
- Implement features and write code
- Keep all documentation current (proactively, without prompting)
- Maintain code quality and consistency
- Flag blockers, technical risks, or decisions that need product owner input
- Suggest technical improvements and optimizations

**User (Michael):** Product Owner
- Define product requirements and priorities
- Make product and business decisions
- Provide direction on features and scope
- Approve major changes or new directions
- Make final calls on user experience and design direction

**Communication Protocol:**
- Claude should **take initiative** on technical implementation details
- Claude should **ask Michael** for product requirements, priorities, and direction when needed
- Claude should **proactively update documentation** without waiting to be asked
- Michael provides the "what" and "why" (product goals)
- Claude provides the "how" (technical implementation)

## Critical Styling Rules

**MUST FOLLOW - Non-negotiable:**

1. **NO Tailwind CSS** in desktop app (`packages/desktop/`)
   - Desktop uses custom CSS in `packages/desktop/src/renderer/src/index.css`
   - Website package CAN use Tailwind (`packages/website/`)

2. **Use `index.css` for all styling**
   - All desktop app styles go in `packages/desktop/src/renderer/src/index.css`
   - Use CSS variables defined in `:root`
   - NO inline styles, NO styled-components

3. **Use CSS Variables for colors**
   - Reference: `--color-bg`, `--color-border`, `--color-text`, etc.
   - See "Color Scheme" section below for complete list

4. **Button System**
   - Base class: `.btn` (required on ALL buttons)
   - Sizes: `.btn-xs`, `.btn-sm`, `.btn-md`, `.btn-lg`, `.btn-icon-sm`, `.btn-icon-md`
   - Variants: `.btn-filled`, `.btn-outlined`, `.btn-ghost`
   - Colors: `.btn-primary`, `.btn-secondary`, `.btn-danger`
   - Example: `<button className="btn btn-sm btn-filled btn-primary">Save</button>`

## Color Scheme (CSS Variables)

```css
/* Main colors */
--color-bg: #1a1a1a
--color-surface: #242424
--color-border: #333
--color-text: #e0e0e0
--color-text-muted: #888

/* Accent colors */
--color-accent: #f4f754       /* Yellow (primary accent) */
--color-accent-hover: #c3c543
--color-primary: #3b82f6      /* Blue */
--color-danger: #c45454       /* Red */
--color-warning: #f59e0b      /* Orange */
--color-success: #22c55e      /* Green */
```

See `.claude/docs/01-design-system.md` for complete design system details.

## Monorepo Structure

```
carvd-studio/  (root)
├── packages/
│   ├── desktop/        → @carvd/desktop (Electron app - NO Tailwind)
│   ├── webhook/        → @carvd/webhook (Vercel serverless)
│   └── website/        → @carvd/website (Marketing site - CAN use Tailwind)
├── package.json        → Root workspace config
└── license-private-key.pem  → RSA-2048 private key (gitignored)
```

**Key Commands:**
- `npm run dev:desktop` - Run Electron app
- `npm run build:desktop` - Build desktop app
- `npm run package:mac` - Create macOS DMG
- `npm run package:win` - Create Windows installer

## Documentation Maintenance

**CRITICAL RESPONSIBILITY:** You (Claude) are responsible for keeping ALL documentation in `.claude/docs/` accurate and up-to-date at all times. This includes:

1. **When completing features:**
   - Update `.claude/docs/04-features-status.md` to mark phases complete
   - Move completed items from "Up Next" to the completed section
   - Update "Current Focus" and "What's Working Now" sections

2. **When changing architecture:**
   - Update `.claude/docs/02-architecture.md` with new patterns or structure
   - Document new packages, directories, or major file additions

3. **When adding UI components or styles:**
   - Update `.claude/docs/01-design-system.md` with new patterns
   - Document new CSS classes, component conventions, or styling patterns

4. **When establishing new coding patterns:**
   - Update `.claude/docs/03-coding-standards.md` with new standards
   - Document conventions, anti-patterns, and best practices

5. **When project status changes:**
   - Update this file (`.claude/project-prompt.md`) "Current Status" line
   - Keep the quick reference sections accurate

**DO NOT WAIT for the user to ask you to update docs.** Proactively update documentation as you make changes to the codebase. Documentation drift is unacceptable.

## Documentation Links

For detailed information, see:

- **Design System** → `.claude/docs/01-design-system.md`
  - Complete CSS variable reference
  - UI patterns and component styles
  - Button system, form elements, modals

- **Architecture** → `.claude/docs/02-architecture.md`
  - Monorepo package details
  - Tech stack breakdown
  - File organization and key files

- **Coding Standards** → `.claude/docs/03-coding-standards.md`
  - Styling rules (MUST use index.css, no Tailwind, no inline styles)
  - TypeScript/React patterns
  - State management conventions

- **Features & Status** → `.claude/docs/04-features-status.md`
  - Current phase and completed features
  - What's working now
  - Upcoming work

## Quick Reference: Key Constraints

1. **Boxes only** - No curves, all parts are rectangular boxes
2. **Axis-aligned** - 90° rotation increments only
3. **Guillotine cuts** - Table saw workflow assumed
4. **Offline-only** - No accounts, no cloud sync
5. **Desktop app uses index.css ONLY** - No Tailwind, no inline styles

## Data Model Essentials

```typescript
// Core types (see types.ts for complete definitions)
interface Part {
  id: string;
  name: string;
  length: number;  // inches
  width: number;
  thickness: number;
  position: { x: number; y: number; z: number };
  rotation: Rotation3D;  // 90° increments
  stockId: string | null;
  grainSensitive: boolean;
  grainDirection: 'length' | 'width';
  color: string;
  notes?: string;
  extraLength?: number;  // for joinery
  extraWidth?: number;
  glueUpPanel?: boolean;
}

interface Stock {
  id: string;
  name: string;
  length: number;
  width: number;
  thickness: number;
  grainDirection: 'length' | 'width' | 'none';
  pricingUnit: 'board_foot' | 'per_item';
  pricePerUnit: number;
  color: string;
}
```

## State Management

- **Zustand** for global state (`projectStore.ts`)
- **zundo middleware** for undo/redo (Cmd+Z, Cmd+Shift+Z)
- **electron-store** for persistence (app-level settings, libraries)
- **Cross-instance sync** via file watching

## File Format

- Extension: `.carvd`
- Format: Plain JSON (version 1)
- Contains: project metadata, parts, stocks, groups, cut list, settings

---

**Remember:** When working on the desktop app, ALWAYS use `index.css` for styling. Never suggest Tailwind or inline styles. CSS variables are your friend.
