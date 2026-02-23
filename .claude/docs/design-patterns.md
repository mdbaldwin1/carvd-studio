# Design Patterns

Workflow and policy source of truth: see `AGENTS.md` for branch strategy, commit conventions, PR/changelog rules, security handling, and validation gates. This file is implementation/reference guidance.

## CSS & Tailwind

Desktop uses **Tailwind CSS 4** with CSS custom properties for theming. Styles are in `packages/desktop/src/renderer/src/`:

- `tailwind.css` — Tailwind import, `:root` / `[data-theme='light']` CSS variables, `@theme inline` mappings
- `primitives.css` — Base component styles (buttons, inputs, modals, fonts)
- `layout.css` — Layout styles (sidebar, header, panels)
- `domain.css` — Domain-specific styles (3D workspace, cut list)

### Colors

```css
/* Backgrounds */
--color-bg: #1a1a1a;
--color-bg-alt: #222222;
--color-surface: #242424;
--color-border: #333;

/* Text */
--color-text: #ffeecf;
--color-text-muted: #a89f8f;

/* Accent (lavender) */
--color-accent: #aea4bf;
--color-accent-hover: #c4bcd0;

/* Primary (teal) */
--color-primary: #077187;
--color-primary-hover: #09a2bc;

/* Semantic */
--color-danger: #c45454;
--color-warning: #ffd21f;
--color-success: #2a9d6a;

/* Spacing */
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
```

### Stock Colors (Wood Tones)

```typescript
STOCK_COLORS = [
  "#d4a574",
  "#8b5a2b",
  "#deb887",
  "#f5deb3",
  "#8b4513",
  "#a0522d",
  "#cd853f",
  "#daa520",
];
```

## Button System

Always use `.btn` base + modifiers:

```tsx
// Size
<button className="btn btn-sm btn-filled btn-primary">Small</button>
<button className="btn btn-md btn-filled btn-primary">Medium</button>
<button className="btn btn-icon-sm btn-ghost"><Icon /></button>

// Variants
<button className="btn btn-md btn-filled btn-primary">Filled</button>
<button className="btn btn-md btn-outlined btn-primary">Outlined</button>
<button className="btn btn-md btn-ghost btn-secondary">Ghost</button>

// Colors
btn-primary   // Teal - main actions
btn-secondary // Muted - secondary actions
btn-danger    // Red - destructive actions
```

## Styling Rules

**Do:**

```tsx
// Tailwind utilities with theme tokens
<div className="flex p-4 bg-surface text-text border border-border rounded-md">

// CSS custom properties in custom CSS
.my-component {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}
```

**Don't:**

```tsx
// No hardcoded Tailwind colors — use theme tokens
<div className="bg-gray-800 text-white">

// No inline styles
<div style={{ padding: '16px' }}>

// No hardcoded hex values in CSS
.my-component { background: #242424; }
```

## React Patterns

### Component Structure

```tsx
import { useState } from "react";
import { useProjectStore } from "../store/projectStore";

interface Props {
  title: string;
}

export function MyComponent({ title }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const parts = useProjectStore((s) => s.parts);

  const handleClick = () => {};

  return <div className="my-component">{title}</div>;
}
```

### Zustand Selectors

```tsx
// Good - selective subscription
const parts = useProjectStore((s) => s.parts);

// Bad - re-renders on any change
const store = useProjectStore();
```

### Naming

```typescript
// Variables: camelCase
const selectedPartIds = [];

// Constants: SCREAMING_SNAKE_CASE
const MAX_HISTORY_ENTRIES = 100;

// Booleans: is/has/should prefix
const isOpen = false;
const hasStock = true;

// Handlers: handle prefix
const handleClick = () => {};
```

## File Organization

```
components/   → One component per file (PascalCase.tsx)
hooks/        → One hook per file (useCamelCase.ts)
store/        → Zustand stores (projectStore, uiStore, selectionStore, cameraStore, etc.)
utils/        → Pure functions (camelCase.ts)
templates/    → Template definitions, loaders, built-in assemblies
types.ts      → All interfaces
tailwind.css  → Theme tokens + Tailwind import
primitives.css → Base component styles
layout.css    → Layout styles
domain.css    → Domain-specific styles
```

## Website Patterns

### Icons

The website uses **lucide-react** for UI icons and custom SVG components in `BrandIcons.tsx` for brand logos (Apple, Windows, GitHub). No emojis in the website — all visual indicators use proper icons.

### Styling

The website uses **Tailwind CSS** independently from the desktop app.

## Code Quality

### Pre-commit Hooks

husky + lint-staged runs `prettier --check` on all staged `.ts`, `.tsx`, `.json`, `.css`, and `.md` files. Fix formatting issues with `npx prettier --write <file>`.

### Format Checking

Both packages have `format:check` scripts for CI:

- Desktop: `npm run format:check --workspace=@carvd/desktop`
- Website: `npm run format:check --workspace=@carvd/website`

## Testing

### Overview

- **Framework:** Vitest + React Testing Library
- **Coverage:** ~92% statements, ~82% branches (2822 tests: 2675 renderer + 147 main)
- **Location:** Tests colocated with source files (`*.test.ts`, `*.test.tsx`)
- **Helpers:** `/packages/desktop/tests/helpers/factories.ts`

### Commands

```bash
npm run test              # Run all tests
npm run test:coverage     # Run with coverage report
npm run test -- -t "pattern"  # Run tests matching pattern
npm run test -- --watch   # Watch mode
```

### Factory Functions

```typescript
// Part factories
createTestPart(overrides?)
createTestPartWithStock(stockId, overrides?)

// Stock factories
createTestStock(overrides?)
createPlywoodStock(overrides?)
createBoardStock(overrides?)

// Group factories
createTestGroup(overrides?)
createTestGroupMember(groupId, memberId, memberType?)

// Assembly factory
createTestAssembly(overrides?)

// Project factories
createTestProject(overrides?)
createProjectWithParts(partCount)

// Scenario factories
createSimpleCutListScenario()
createComplexCutListScenario()
createNestedGroupStructure()
```

### Zustand Store Testing

```typescript
import { useProjectStore } from "../store/projectStore";

beforeEach(() => {
  useProjectStore.setState({
    parts: [],
    stocks: [],
    // ... reset to known state
  });
});

it("adds a part", () => {
  const addPart = vi.fn();
  useProjectStore.setState({ addPart });
  // test...
});
```

### Electron API Mocking

```typescript
beforeAll(() => {
  window.electronAPI = {
    getPreference: vi.fn(),
    setPreference: vi.fn(),
    resetWelcomeTutorial: vi.fn().mockResolvedValue(undefined),
    // ... other methods
  } as unknown as typeof window.electronAPI;
});
```

### window.confirm/alert Mocking

```typescript
beforeAll(() => {
  window.confirm = vi.fn();
  window.alert = vi.fn();
});

// In tests:
(window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
```

### Hook Testing

```typescript
import { renderHook, act } from "@testing-library/react";

const { result, rerender } = renderHook(() => useMyHook());
act(() => {
  result.current.doSomething();
});
```

### Known Gotchas

1. **Table cell selectors:** Use `td.col-qty` to target data cells, not headers with same class
2. **Form submission:** Prefer `fireEvent.submit(form)` over `fireEvent.click(submitButton)`
3. **Multiple elements with same text:** Use CSS class selectors or `getAllByText()`
4. **Floating point precision:** Use `toBeCloseTo()` for position assertions
5. **Group expansion:** Groups auto-expand on creation; collapse first before testing toggle
6. **pendingDeletePartIds:** Value is `null` when no pending deletes, not empty array
7. **ProjectSettingsModal:** Set `filePath: null` in beforeEach to avoid async state updates
8. **appSettingsStore listener:** Module-level singleton makes cross-instance sync hard to test

### License/Trial Testing

```typescript
// Mock trial status in tests
beforeAll(() => {
  window.electronAPI = {
    getTrialStatus: vi.fn().mockResolvedValue({
      isTrialActive: true,
      isTrialExpired: false,
      daysRemaining: 14,
      shouldShowBanner: false,
      trialStartDate: Date.now(),
      trialEndDate: Date.now() + 14 * 24 * 60 * 60 * 1000,
    }),
    getLicenseData: vi.fn().mockResolvedValue(null),
    acknowledgeTrialExpired: vi.fn(),
    openExternal: vi.fn(),
  } as unknown as typeof window.electronAPI;
});

// Test license mode in projectStore
beforeEach(() => {
  useProjectStore.setState({
    licenseMode: "trial", // or 'free' to test limits
    parts: [],
    stocks: [],
  });
});
```
