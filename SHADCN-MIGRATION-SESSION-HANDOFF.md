# shadcn/ui Migration — Session Handoff

> **Purpose**: This document must be read at the start of every bead execution session.
> It provides the context needed to execute any bead in the shadcn migration plan autonomously.

---

## Execution Modes

This migration supports two execution modes:

- **Solo mode**: One agent works through beads sequentially. Read `BEAD-EXECUTION-WORKFLOW.md`.
- **Team mode**: An orchestrator assigns beads to parallel teammates. The orchestrator reads `ORCHESTRATOR-INSTRUCTIONS.md`. Teammates read this file + `BEAD-EXECUTION-WORKFLOW.md`.

If you are a **teammate in team mode**: your orchestrator has assigned you a specific bead. Read sections relevant to your bead (theming, component mapping, testing patterns, constraints) then follow `BEAD-EXECUTION-WORKFLOW.md` to execute it. Message the orchestrator when done or if blocked.

---

## Table of Contents

1. [Migration Overview](#migration-overview)
2. [What is shadcn/ui](#what-is-shadcnui)
3. [Project Architecture](#project-architecture)
4. [Desktop App — Current State](#desktop-app--current-state)
5. [Website — Current State](#website--current-state)
6. [Theming Bridge — CSS Variable Mapping](#theming-bridge--css-variable-mapping)
7. [Component Mapping — Desktop](#component-mapping--desktop)
8. [Component Mapping — Website](#component-mapping--website)
9. [shadcn Installation & Configuration](#shadcn-installation--configuration)
10. [Testing Patterns for shadcn Components](#testing-patterns-for-shadcn-components)
11. [Critical Constraints & Gotchas](#critical-constraints--gotchas)
12. [Dependency Graph](#dependency-graph)
13. [Per-Bead Checklist](#per-bead-checklist)

---

## Migration Overview

**Goal**: Migrate both the desktop Electron app (`packages/desktop`) and the marketing website (`packages/website`) from hand-rolled CSS components to **shadcn/ui** with **Tailwind CSS 4**.

**Why shadcn/ui**:

- Accessible by default (built on Radix UI primitives)
- Full keyboard navigation on all interactive components
- Copy-paste component model — you own the code, full customization
- Consistent with Tailwind CSS (already used in desktop app)
- Professional, production-ready component patterns
- No runtime CSS-in-JS — all Tailwind utilities

**Scope**:

- **Desktop**: ~95 UI components, 4 CSS files (~600 lines total), 17+ modals
- **Website**: ~49 components, 1 CSS file (~2165 lines), no Tailwind currently
- **NOT in scope**: Three.js/R3F 3D workspace components (Part, Workspace, SnapGuides, etc.) — these render to WebGL canvas, not DOM

**Bead structure**: 11 epics, ~56 sub-beads tracked in `.beads/issues.jsonl`

---

## What is shadcn/ui

shadcn/ui is **not** a component library you install as a dependency. It's a collection of re-usable components you **copy into your project** and customize.

**Key technologies**:

- **Radix UI** — Unstyled, accessible UI primitives (Dialog, Popover, Select, etc.)
- **Tailwind CSS** — Utility-first CSS framework (already in desktop app)
- **class-variance-authority (cva)** — Type-safe variant management for components
- **clsx + tailwind-merge** — The `cn()` utility for conditional class merging
- **cmdk** — Command palette (optional)
- **sonner** — Toast notifications

**How it works**:

1. Run `npx shadcn@latest add <component>` to copy component source into your project
2. Components land in `src/components/ui/<component>.tsx`
3. You own the code — modify styling, behavior, variants as needed
4. Components use `cn()` for class merging and `cva()` for variants

**Example — Button component**:

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
```

---

## Project Architecture

```
carvd-studio/
├── packages/
│   ├── desktop/                    # Electron + React 19 + TypeScript + Three.js
│   │   ├── src/
│   │   │   ├── main/               # Electron main process
│   │   │   └── renderer/
│   │   │       └── src/
│   │   │           ├── components/  # React components (~95 files)
│   │   │           │   ├── common/  # Shared: Modal, Toast, Button, Form controls
│   │   │           │   │   └── form/  # Input, Select, Checkbox, RadioGroup, etc.
│   │   │           │   ├── context-menus/
│   │   │           │   ├── settings/
│   │   │           │   ├── workspace/  # 3D canvas (NOT migrated)
│   │   │           │   └── ...
│   │   │           ├── hooks/       # Custom hooks
│   │   │           ├── store/       # Zustand stores (8 stores)
│   │   │           ├── utils/       # Utilities
│   │   │           ├── lib/         # utils.ts with cn() (created in bead 2.3)
│   │   │           ├── tailwind.css # Theme + imports
│   │   │           ├── primitives.css # Button system, form elements
│   │   │           ├── layout.css   # App shell, sidebar, header
│   │   │           └── domain.css   # Property inputs, joinery, print
│   │   ├── electron.vite.config.ts
│   │   ├── vitest.config.ts        # Renderer tests
│   │   ├── vitest.main.config.ts   # Main process tests
│   │   └── package.json
│   │
│   └── website/                    # React + TypeScript + Vite (marketing site)
│       ├── src/
│       │   ├── components/         # Shared components (~9 files)
│       │   ├── pages/              # Page components (~38 files)
│       │   │   ├── docs/           # Documentation pages (~20 files)
│       │   │   ├── pricing/        # Pricing sub-components
│       │   │   └── support/        # Support sub-components
│       │   ├── lib/                # CREATE: utils.ts with cn()
│       │   └── index.css           # ALL styles (~2165 lines, NO Tailwind)
│       ├── vite.config.ts
│       └── package.json
│
├── .beads/                         # Bead issue tracker
│   ├── issues.jsonl                # All migration beads
│   └── config.yaml
├── BEAD-EXECUTION-WORKFLOW.md      # Per-bead execution loop
├── CLAUDE.md                       # Project guidelines
└── SHADCN-MIGRATION-SESSION-HANDOFF.md  # THIS FILE
```

---

## Desktop App — Current State

### CSS Architecture (4 files)

| File             | Lines | Purpose                                               | Migration Impact                                       |
| ---------------- | ----- | ----------------------------------------------------- | ------------------------------------------------------ |
| `tailwind.css`   | ~325  | Theme variables, `@theme inline`, animations          | **Keep & modify** — becomes shadcn theme               |
| `primitives.css` | ~600  | Button system, form elements, tooltips, hotkeys       | **Remove** — fully replaced by shadcn                  |
| `layout.css`     | ~305  | App shell, header, sidebar, toolbar, properties panel | **Simplify** — keep Electron-specific, replace generic |
| `domain.css`     | ~355  | Property inputs, joinery, collapsibles, print styles  | **Simplify** — keep domain-specific, replace generic   |

### Button System (primitives.css)

Current composable CSS class system:

```
.btn           — base (required)
.btn-xs/sm/md/lg — sizes
.btn-icon-xs/sm/md — icon button sizes
.btn-filled/outlined/ghost — variants
.btn-primary/secondary/danger — colors
.btn-block, .btn.active, .btn-group — modifiers
```

**Maps to shadcn Button**:
| Current | shadcn Equivalent |
|---------|------------------|
| `.btn.btn-sm.btn-filled.btn-primary` | `<Button size="sm">` (default variant = primary) |
| `.btn.btn-md.btn-outlined.btn-secondary` | `<Button size="default" variant="outline">` |
| `.btn.btn-sm.btn-ghost.btn-secondary` | `<Button size="sm" variant="ghost">` |
| `.btn.btn-sm.btn-filled.btn-danger` | `<Button size="sm" variant="destructive">` |
| `.btn.btn-icon-sm.btn-ghost` | `<Button size="icon" variant="ghost">` |
| `.btn.btn-lg.btn-filled.btn-primary` | `<Button size="lg">` |

### Form System (primitives.css)

Current form CSS classes:

```
.form-group    — container (flex col, gap, margin)
.form-row      — horizontal form layout
.form-actions  — button row at bottom of forms
.field-error   — error message styling
.field-help    — help text styling
.checkbox-label — checkbox + label layout
.radio-group   — radio button group
.input-with-suffix — input + unit label
```

**Maps to shadcn form components**:
| Current | shadcn Equivalent |
|---------|------------------|
| `.form-group` with `<label>` + `<input>` | `<div>` with `<Label>` + `<Input>` |
| `.form-group select` | `<Select><SelectTrigger><SelectContent>` |
| `.form-group textarea` | `<Textarea>` |
| `.checkbox-label` | `<Checkbox>` + `<Label>` |
| `.radio-group` | `<RadioGroup><RadioGroupItem>` |
| `.field-error` | `<p className="text-sm text-destructive">` |
| `.form-actions` | `<div className="flex justify-end gap-3 mt-6 pt-5 border-t">` |

### Existing Components (src/renderer/src/components/common/)

| Component            | File                     | shadcn Replacement                                    |
| -------------------- | ------------------------ | ----------------------------------------------------- |
| `Modal.tsx`          | Base modal with backdrop | `Dialog`                                              |
| `ConfirmDialog.tsx`  | Yes/No/Cancel dialog     | `AlertDialog`                                         |
| `Toast.tsx`          | Notification toasts      | `Sonner`                                              |
| `LoadingSpinner.tsx` | Spinner animation        | Keep custom or use `Skeleton`                         |
| `ProgressBar.tsx`    | Progress indicator       | `Progress`                                            |
| `ColorPicker.tsx`    | Native color input       | Keep native, optionally wrap in `Popover`             |
| `DropdownButton.tsx` | Button + dropdown menu   | `DropdownMenu`                                        |
| `ErrorBoundary.tsx`  | Error boundary           | Keep (React pattern, not UI)                          |
| `FractionInput.tsx`  | Fraction dimension input | Keep (domain-specific), use shadcn `Input` internally |
| `HelpTooltip.tsx`    | Info icon + popover      | `Tooltip` (simple) or `Popover` (rich content)        |
| `IconButton.tsx`     | Icon-only button         | `Button size="icon"`                                  |

### Form Components (src/renderer/src/components/common/form/)

| Component         | shadcn Replacement                       |
| ----------------- | ---------------------------------------- |
| `Input.tsx`       | `Input` from shadcn                      |
| `TextArea.tsx`    | `Textarea` from shadcn                   |
| `Select.tsx`      | `Select` from shadcn (Radix-based)       |
| `Checkbox.tsx`    | `Checkbox` from shadcn                   |
| `RadioGroup.tsx`  | `RadioGroup` from shadcn                 |
| `FormField.tsx`   | Compose with `Label` + component + error |
| `FormSection.tsx` | Keep or replace with `Card`              |

### Modal Inventory (17+ modals using Modal.tsx)

All modals currently use the custom `Modal.tsx` base. After Dialog migration:

| Modal                    | Complexity | Notes                                |
| ------------------------ | ---------- | ------------------------------------ |
| `AboutModal`             | Low        | Version info display                 |
| `AddAssemblyModal`       | Low        | Name + notes form                    |
| `AddStockModal`          | Medium     | Stock form with dimensions           |
| `AppSettingsModal`       | **High**   | 7 sections, most complex modal       |
| `CutListModal`           | **High**   | 4 tabs, tables, diagrams, PDF export |
| `EditStockModal`         | Medium     | Stock form with dimensions           |
| `FileRecoveryModal`      | Low        | Recovery options                     |
| `ImportAppStateModal`    | Low        | JSON import                          |
| `ImportToLibraryDialog`  | Low        | Confirmation                         |
| `LicenseActivationModal` | Low        | License key input                    |
| `NewProjectDialog`       | Medium     | Template selection + name            |
| `ProjectSettingsModal`   | Medium     | Project properties form              |
| `RecoveryDialog`         | Low        | Recovery options                     |
| `SaveAssemblyModal`      | Low        | Name + notes form                    |
| `StockLibraryModal`      | Medium     | List + search + CRUD                 |
| `TemplateBrowserModal`   | Medium     | Grid + search + categories           |
| `TrialExpiredModal`      | Low        | Info + upgrade CTA                   |
| `UnsavedChangesDialog`   | Low        | Save/Discard/Cancel                  |

---

## Website — Current State

### CSS Architecture

**Single file**: `packages/website/src/index.css` (~2165 lines)

- **No Tailwind CSS** — all custom CSS with CSS custom properties
- Design tokens (colors, spacing, typography, shadows, transitions)
- Component styles (cards, buttons, sections, hero, pricing, docs)
- Layout utilities and responsive breakpoints
- Font imports (Roboto, Roboto Slab, Monaco)

**Icon library**: `lucide-react` (shared with desktop)

### Component Inventory

| Category    | Count | Components                                                                           |
| ----------- | ----- | ------------------------------------------------------------------------------------ |
| Shared      | 9     | Header, Footer, BrandIcons, BuyButton, ScreenshotPlaceholder, ScrollToHash, SEO, App |
| Main pages  | 9     | Home, Features, Pricing, Download, Support, Changelog, Privacy, Terms, 404           |
| Docs        | 20    | DocsLayout, DocsIndex, DocsPrevNext, 17 content pages                                |
| Pricing sub | 5     | PricingCard, PricingFAQ, CompetitorComparison, ValueComparison, ROISection           |
| Support sub | 3     | ContactSection, FAQSection, TroubleshootingSection                                   |

---

## Theming Bridge — CSS Variable Mapping

The desktop app uses `--color-*` prefixed CSS variables. shadcn uses unprefixed variables. During migration, **both conventions must coexist** until all components are migrated.

### Desktop Theme Mapping

Add these to `tailwind.css` alongside existing variables:

```css
:root {
  /* === EXISTING (keep during migration) === */
  --color-bg: #1a1a1a;
  --color-surface: #242424;
  --color-text: #ffeecf;
  --color-accent: #077187;
  /* ... all existing vars ... */

  /* === SHADCN CONVENTION (add for new components) === */
  --background: var(--color-bg);
  --foreground: var(--color-text);
  --card: var(--color-surface);
  --card-foreground: var(--color-text);
  --popover: var(--color-surface);
  --popover-foreground: var(--color-text);
  --primary: var(--color-accent); /* Cerulean — main interactive color */
  --primary-foreground: var(--color-accent-foreground);
  --secondary: var(--color-secondary); /* Twilight Indigo */
  --secondary-foreground: var(--color-secondary-foreground);
  --muted: var(--color-bg-alt);
  --muted-foreground: var(--color-text-muted);
  --accent: var(--color-surface-hover); /* shadcn "accent" = hover bg */
  --accent-foreground: var(--color-text);
  --destructive: var(--color-danger);
  --destructive-foreground: #ffffff;
  --border: var(--color-border);
  --input: var(--color-border);
  --ring: var(--color-accent);
  --radius: var(--radius-md);

  /* Chart colors (if using shadcn charts) */
  --chart-1: var(--color-accent);
  --chart-2: var(--color-primary);
  --chart-3: var(--color-success);
  --chart-4: var(--color-warning);
  --chart-5: var(--color-danger);
}
```

### IMPORTANT: shadcn "primary" vs project "primary"

There is a naming collision:

- **Project convention**: `--color-primary` = **Gold** (#ffd21f) — used for CTAs
- **shadcn convention**: `--primary` = the main interactive color

**Resolution**: Map shadcn `--primary` to the project's `--color-accent` (Cerulean #077187), which is the actual interactive/focus color. The Gold CTA color can be added as a custom variant.

### Light Theme

The `[data-theme='light']` block needs equivalent shadcn variable overrides pointing to the light theme's existing `--color-*` values. Same pattern — aliases pointing to existing vars.

---

## Component Mapping — Desktop

### Priority Order for Migration

```
Foundation (Epic 2) → Core Primitives (Epic 3) → Overlays (Epic 4) + Complex (Epic 5)
                                                 ↓                        ↓
                                           Modals (Epic 6)          Layout (Epic 7)
                                                 ↓                        ↓
                                              CSS Cleanup (Epic 8) ←———————
```

### shadcn Components Needed (Desktop)

Install these via `npx shadcn@latest add <name>`:

| Component       | Used For                               | Priority |
| --------------- | -------------------------------------- | -------- |
| `button`        | All buttons (replaces .btn system)     | P0       |
| `input`         | Text/number inputs                     | P0       |
| `textarea`      | Multi-line inputs                      | P0       |
| `label`         | Form labels                            | P0       |
| `dialog`        | All modals (replaces Modal.tsx)        | P0       |
| `select`        | Dropdown selects                       | P0       |
| `checkbox`      | Checkboxes                             | P1       |
| `radio-group`   | Radio buttons                          | P1       |
| `alert-dialog`  | Confirmations (replaces ConfirmDialog) | P1       |
| `context-menu`  | Right-click menus                      | P1       |
| `dropdown-menu` | Button dropdown menus                  | P1       |
| `tooltip`       | Simple tooltips                        | P1       |
| `popover`       | Rich tooltip content                   | P1       |
| `sonner`        | Toast notifications                    | P1       |
| `tabs`          | Tab navigation                         | P1       |
| `table`         | Data tables                            | P1       |
| `card`          | Content cards                          | P1       |
| `collapsible`   | Sidebar sections                       | P1       |
| `accordion`     | Collapsible sections                   | P1       |
| `badge`         | Status indicators                      | P2       |
| `separator`     | Dividers                               | P2       |
| `scroll-area`   | Custom scrollbars                      | P2       |
| `progress`      | Progress bars                          | P2       |
| `skeleton`      | Loading placeholders                   | P2       |
| `alert`         | Banners/notices                        | P2       |
| `sidebar`       | App sidebar                            | P2       |
| `switch`        | Toggle switches (settings)             | P2       |

---

## Component Mapping — Website

### shadcn Components Needed (Website)

| Component         | Used For                                    |
| ----------------- | ------------------------------------------- |
| `button`          | CTAs, nav links, download buttons           |
| `card`            | Pricing cards, feature cards, project cards |
| `navigation-menu` | Header navigation                           |
| `accordion`       | FAQ sections                                |
| `table`           | Comparison tables                           |
| `badge`           | Version badges, category tags               |
| `separator`       | Section dividers                            |
| `sidebar`         | Docs navigation                             |

---

## shadcn Installation & Configuration

### Desktop App (packages/desktop)

**Dependencies to install**:

```bash
cd packages/desktop
npm install tailwind-merge clsx class-variance-authority
npm install @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-checkbox
npm install @radix-ui/react-radio-group @radix-ui/react-popover @radix-ui/react-tooltip
npm install @radix-ui/react-context-menu @radix-ui/react-dropdown-menu
npm install @radix-ui/react-alert-dialog @radix-ui/react-tabs @radix-ui/react-accordion
npm install @radix-ui/react-collapsible @radix-ui/react-scroll-area @radix-ui/react-separator
npm install @radix-ui/react-label @radix-ui/react-progress @radix-ui/react-switch
npm install @radix-ui/react-navigation-menu @radix-ui/react-toggle @radix-ui/react-toggle-group
npm install sonner
```

> **Note**: Some Radix packages may already be indirect dependencies. The `npx shadcn@latest add` command handles dependency installation automatically. Prefer using the CLI when possible.

**Create `components.json`** in `packages/desktop/`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/renderer/src/tailwind.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@renderer/components",
    "utils": "@renderer/lib/utils",
    "ui": "@renderer/components/ui",
    "lib": "@renderer/lib",
    "hooks": "@renderer/hooks"
  }
}
```

> **Important**: The desktop app uses `@renderer/` as the path alias (configured in electron.vite.config.ts), not `@/`. Verify this before running `shadcn add`.

**Create `src/renderer/src/lib/utils.ts`**:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Website (packages/website)

**New dependencies**:

```bash
cd packages/website
npm install tailwindcss @tailwindcss/vite
npm install tailwind-merge clsx class-variance-authority
# Then use npx shadcn@latest add for specific components
```

**Update `vite.config.ts`**:

```typescript
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**Create `components.json`** in `packages/website/`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/tailwind.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

---

## Testing Patterns for shadcn Components

### Key Differences from Current Patterns

**1. Radix Dialog renders in a portal**

```typescript
// BEFORE (custom Modal)
const modal = container.querySelector(".modal");

// AFTER (shadcn Dialog)
const dialog = screen.getByRole("dialog");
// Content is in a portal — use screen queries, not container queries
```

**2. Radix Select is NOT a native `<select>`**

```typescript
// BEFORE (native select)
fireEvent.change(screen.getByRole("combobox"), {
  target: { value: "plywood" },
});

// AFTER (Radix Select)
// 1. Click the trigger to open
fireEvent.click(screen.getByRole("combobox"));
// 2. Click the option
fireEvent.click(screen.getByRole("option", { name: "Plywood" }));
```

**3. Radix Checkbox uses data-state, not checked attribute**

```typescript
// BEFORE
expect(checkbox).toBeChecked();

// AFTER (still works with Radix)
expect(checkbox).toHaveAttribute("data-state", "checked");
// OR use aria role
expect(screen.getByRole("checkbox")).toBeChecked(); // This also works
```

**4. Button no longer has .btn classes**

```typescript
// BEFORE
const button = container.querySelector(".btn.btn-primary.btn-filled");

// AFTER — use role-based queries (preferred)
const button = screen.getByRole("button", { name: "Save" });
```

**5. Dialog close via Escape or backdrop click**

```typescript
// BEFORE (custom Modal with useBackdropClose)
fireEvent.click(backdrop);

// AFTER (Radix Dialog)
fireEvent.keyDown(dialog, { key: "Escape" });
// OR click the overlay
fireEvent.click(screen.getByTestId("dialog-overlay"));
```

**6. ContextMenu requires right-click**

```typescript
// Radix ContextMenu needs onContextMenu
fireEvent.contextMenu(targetElement);
// Then menu items are available
fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
```

### General Testing Rules

1. **Prefer role-based queries**: `getByRole('button')`, `getByRole('dialog')`, `getByRole('combobox')`
2. **Use `screen` not `container`**: Radix portals render outside the container
3. **Await async state**: Some Radix components animate — use `waitFor` if needed
4. **Reset portal root**: Add cleanup in `afterEach` if portals leak between tests
5. **Keep existing factory functions**: `createTestPart()`, `createTestStock()`, etc. are unchanged
6. **Keep existing store patterns**: `useStore.setState()` in `beforeEach` is unchanged

---

## Critical Constraints & Gotchas

### 1. Electron-Specific CSS Must Be Preserved

```css
/* These are NOT replaceable by shadcn */
-webkit-app-region: drag; /* Title bar drag area */
-webkit-app-region: no-drag; /* Clickable buttons in title bar */
.platform-darwin {
  padding-left: 80px;
} /* macOS traffic lights */
.platform-win32 {
  padding-right: 140px;
} /* Windows controls */
```

### 2. Path Alias Differences

- **Desktop**: `@renderer/` → `src/renderer/src/` (configured in electron.vite.config.ts)
- **Website**: `@/` → `src/` (standard Vite alias)

When running `npx shadcn@latest add`, the CLI may generate imports with `@/`. For the desktop app, you must either:

- Configure `components.json` aliases correctly (see above), OR
- Manually fix imports to use `@renderer/` after adding components

### 3. Tailwind CSS 4 Differences

Tailwind v4 uses `@theme inline` instead of `tailwind.config.js`. The desktop app already uses this. Key differences:

- No `tailwind.config.ts` — configuration is in CSS via `@theme`
- `@import 'tailwindcss'` instead of `@tailwind base; @tailwind components; @tailwind utilities;`
- Custom properties are mapped via `@theme inline { --color-*: var(--color-*); }`

### 4. Do NOT Touch 3D Components

The `workspace/` directory contains Three.js/React Three Fiber components that render to WebGL canvas. These use `useFrame`, `useThree`, geometry pools, and shader materials. They have NO CSS or DOM — shadcn is irrelevant. Do not modify:

- `Workspace.tsx`, `Part.tsx`, `InstancedParts.tsx`, `PartsRenderer.tsx`
- `SnapGuides.tsx`, `SnapAlignmentLines.tsx`, `DimensionLabel.tsx`
- `ResizeHandle.tsx`, `RotationHandle.tsx`, `GrainDirectionArrow.tsx`
- `CameraController.tsx`, `AxisIndicator.tsx`
- `partGeometry.ts`, `workspaceUtils.ts`, `usePartDrag.ts`, `usePartResize.ts`

### 5. Coverage Thresholds Are Enforced

CI will fail if coverage drops below:

- **Renderer**: statements 91%, branches 82%, functions 90%, lines 91%
- **Main process**: statements 73%, branches 70%, functions 66%, lines 74%

Every bead must pass `npm test` before creating a PR. If migrating a component breaks its tests, fix the tests in the same bead.

### 6. Dual CSS During Migration

During the migration, both old CSS classes and new shadcn components will coexist. This is intentional — we cannot migrate everything atomically. Each bead migrates a specific set of components and removes the corresponding CSS. By the CSS Cleanup epic, all old classes should be eliminated.

### 7. Bundle Size

Radix UI primitives add JavaScript. Rough estimates:

- Each Radix primitive: 2-8 KB gzipped
- Total for all primitives used: ~30-50 KB gzipped
- Offset: removing custom CSS and JavaScript for custom overlay positioning, scroll handling, etc.
- Net impact should be minimal. Verify with `npm run analyze`.

### 8. Lazy Loading

Modals are currently lazy-loaded with `React.lazy()` + `<Suspense>`. After migration:

- The `Dialog` wrapper imports Radix — this is a shared dependency across all modals
- Individual modal content can still be lazy-loaded
- Verify code splitting with `npm run analyze` after modal migrations

### 9. Known Test Gotchas (from MEMORY.md)

These existing gotchas remain relevant during migration:

- Use `toBeCloseTo()` for float assertions (part positions)
- Groups auto-expand on creation — collapse first before testing toggle
- `pendingDeletePartIds` is `null` not empty array
- Use `fireEvent.submit(form)` over `fireEvent.click(submitButton)`
- Use `td.col-qty` to target table data cells
- Mock `window.confirm`/`window.alert` in `beforeAll`
- Set `filePath: null` in `beforeEach` for ProjectSettingsModal tests
- Use `getAllByText()` when multiple elements have the same text

### 10. Print Styles

The `@media print` block in `domain.css` is used for PDF export of cutting diagrams. These styles must be preserved regardless of shadcn migration. They target specific class names — if those class names change during migration, update the print styles accordingly.

---

## Dependency Graph

```
carvd-studio-2  (Desktop Foundation)
       │
       ▼
carvd-studio-3  (Core Primitives)
       │
       ├──────────────────┐
       ▼                  ▼
carvd-studio-4         carvd-studio-5
(Overlays)             (Complex Components)
       │                  │
       ├──────────────────┤
       ▼                  ▼
carvd-studio-6         carvd-studio-7
(Modals)               (Layout)
       │                  │
       └──────────────────┘
                │
                ▼
       carvd-studio-8
       (Desktop Cleanup)
                │
                ▼
       carvd-studio-12                carvd-studio-9  (Website Foundation)
       (Final Integration)                   │
                ▲                            ▼
                │                    carvd-studio-10  (Website Migration)
                │                            │
                │                            ▼
                └─────────────────── carvd-studio-11  (Website Cleanup)
```

---

## Per-Bead Checklist

Before starting any bead, verify:

- [ ] Read this handoff document
- [ ] Read `BEAD-EXECUTION-WORKFLOW.md` for the execution loop
- [ ] Read `CLAUDE.md` for project conventions
- [ ] Check `.beads/issues.jsonl` for current bead status and dependencies
- [ ] Verify all blocking dependencies are complete

For each bead:

1. [ ] Create worktree: `git worktree add ../carvd-studio-<bead-id> -b <prefix>/<bead-id> develop`
2. [ ] Plan the implementation (review affected files)
3. [ ] Implement changes
4. [ ] Update tests for all modified components
5. [ ] Run `npm test` — all tests must pass
6. [ ] Run `npm run lint` — no lint errors
7. [ ] Run `npm run typecheck` — no type errors
8. [ ] Update bead status to closed in `.beads/issues.jsonl`
9. [ ] Update `CHANGELOG.md` under `[Unreleased]` if functionality changed
10. [ ] Commit with conventional message prefix
11. [ ] Push and create PR targeting `develop`
12. [ ] Verify CI passes
13. [ ] Squash merge the PR
14. [ ] Clean up: `git worktree remove ../carvd-studio-<bead-id>`

---

## Team Mode — Coordination Notes

If you are executing this migration using Agent Teams, keep these additional points in mind:

### Develop Branch Drift

Multiple agents merging PRs into `develop` means the branch advances frequently. **Always pull latest develop before creating a worktree**:

```bash
cd /Users/mbaldwin/Carvd/carvd-studio
git checkout develop && git pull origin develop
git worktree add ../carvd-studio-<bead-id> -b <prefix>/<bead-id> develop
```

### Merge Conflict Prevention

The orchestrator sequences beads to avoid conflicts, but if you encounter one:

1. Pull latest develop into your worktree branch: `git merge develop`
2. Resolve conflicts, favoring the merged code (it's from a completed bead)
3. If the conflict is complex, message the orchestrator for guidance

### File Ownership Rules

To prevent conflicts, these files have implicit ownership during migration:

- `tailwind.css` — Only one agent modifies at a time (Foundation and Cleanup beads)
- `primitives.css` — Only one agent modifies at a time (sequential by bead)
- `layout.css` — Only modified by Layout epic beads
- `domain.css` — Only modified by Layout/Cleanup epic beads
- `packages/website/src/index.css` — Only modified by Website track agents

### Communication with Orchestrator

When messaging the orchestrator upon bead completion, include:

1. **PR URL** — So the orchestrator can verify CI and merge
2. **Files changed** — Brief summary (e.g., "Modified 12 components, added Button to ui/, removed .btn from primitives.css")
3. **Tests status** — Pass/fail and any notes
4. **Discovered work** — Any new issues found that need separate beads
5. **Next bead readiness** — "Ready for next assignment" or "Need to resolve X first"

### Key Files Reference

| File                                  | Purpose                        | Who Reads It                    |
| ------------------------------------- | ------------------------------ | ------------------------------- |
| `ORCHESTRATOR-INSTRUCTIONS.md`        | How to coordinate the team     | Orchestrator only               |
| `BEAD-EXECUTION-WORKFLOW.md`          | How to execute a single bead   | All teammates                   |
| `SHADCN-MIGRATION-SESSION-HANDOFF.md` | Migration context and mappings | All teammates                   |
| `CLAUDE.md`                           | Project conventions            | Everyone (loaded automatically) |
| `.beads/issues.jsonl`                 | Bead statuses and dependencies | Orchestrator + teammates        |

---

_Last updated: 2026-02-19_
_Total beads: 11 epics, ~56 sub-beads_
_Estimated total effort: ~4500 minutes (~75 hours)_
