# Testing Patterns & Guidelines

## Overview

Carvd Studio uses Vitest with v8 coverage for both renderer and main process tests. Tests are colocated with source files. As of Epic 5 completion:

- **2,509 total tests** (2,362 renderer + 147 main process)
- **105 renderer test files**, **4 main process test files**
- **1 integration test file** with 26 cross-store workflow tests

## Architecture

### Test Configurations

| Config                  | Environment | Scope           | Thresholds                                    |
| ----------------------- | ----------- | --------------- | --------------------------------------------- |
| `vitest.config.ts`      | happy-dom   | `src/renderer/` | stmts 80%, branches 72%, funcs 85%, lines 80% |
| `vitest.main.config.ts` | node        | `src/main/`     | stmts 73%, branches 70%, funcs 66%, lines 74% |
| `playwright.config.ts`  | chromium    | E2E             | N/A                                           |

### File Structure

```
packages/desktop/
  src/
    renderer/src/
      store/projectStore.ts          # Source file
      store/projectStore.test.ts     # Colocated test
      components/common/Toast.tsx
      components/common/Toast.test.tsx
      integration.test.ts            # Cross-store integration tests
    main/
      store.ts
      store.test.ts
  tests/
    setup.ts                         # Renderer test setup
    main-setup.ts                    # Main process test setup
    helpers/factories.ts             # Test factory functions
    e2e/                             # Playwright E2E tests
```

## Patterns

### Zustand Store Testing

```typescript
import { useProjectStore } from "./projectStore";

beforeEach(() => {
  // Reset to clean state before each test
  useProjectStore.setState({
    parts: [],
    stocks: [],
    groups: [],
    // ... relevant state fields
  });
});

it("adds a part", () => {
  const id = useProjectStore.getState().addPart();
  expect(useProjectStore.getState().parts).toHaveLength(1);
});
```

Key points:

- Always reset store state in `beforeEach` — state persists across tests in the same file
- Use `useStore.getState()` for reading/calling actions, `useStore.setState()` for direct state manipulation
- For undo/redo testing, access `useProjectStore.temporal.getState().undo()` / `.redo()`
- `newProject()` clears undo history via `setTimeout(..., 0)` — use `vi.useFakeTimers()` before calling it

### Component Testing

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useProjectStore } from '../store/projectStore';
import { MyComponent } from './MyComponent';

beforeEach(() => {
  useProjectStore.setState({ parts: [], toast: null });
});

it('renders correctly', () => {
  render(<MyComponent />);
  expect(screen.getByText('Expected Text')).toBeInTheDocument();
});

it('handles click', () => {
  render(<MyComponent />);
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect(useProjectStore.getState().parts).toHaveLength(1);
});
```

### Hook Testing

```typescript
import { renderHook, act } from "@testing-library/react";
import { useMyHook } from "./useMyHook";

it("returns expected value", () => {
  const { result } = renderHook(() => useMyHook());

  act(() => {
    result.current.doSomething();
  });

  expect(result.current.value).toBe("expected");
});
```

### Electron API Mocking

```typescript
beforeAll(() => {
  window.electronAPI = {
    getPreference: vi.fn(),
    setPreference: vi.fn(),
    showSaveDialog: vi.fn(),
    showOpenDialog: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    // Add only the methods your test needs
  };
});
```

### Factory Functions

Available in `tests/helpers/factories.ts`:

| Factory                                    | Creates                      |
| ------------------------------------------ | ---------------------------- |
| `createTestPart(overrides?)`               | Part with default dimensions |
| `createTestPartWithStock(overrides?)`      | Part with attached stock     |
| `createTestStock(overrides?)`              | Stock definition             |
| `createPlywoodStock(overrides?)`           | Plywood sheet stock          |
| `createBoardStock(overrides?)`             | Board/lumber stock           |
| `createTestGroup(overrides?)`              | Group definition             |
| `createTestGroupMember(overrides?)`        | Group member entry           |
| `createTestAssembly(overrides?)`           | Assembly definition          |
| `createTestProject(overrides?)`            | Complete project state       |
| `createProjectWithParts(count)`            | Project with N parts         |
| `createDefaultStockConstraints()`          | Default stock constraints    |
| `createTestCustomShoppingItem(overrides?)` | Custom shopping item         |
| `createSimpleCutListScenario()`            | Parts + stocks for cut list  |
| `createComplexCutListScenario()`           | Complex cut list scenario    |
| `createNestedGroupStructure()`             | Nested group hierarchy       |

### Main Process Testing

Main process tests use the `node` environment and mock Electron modules:

```typescript
// In tests/main-setup.ts — Electron APIs are mocked globally
// Tests can import main process modules directly

import { createStore } from "../store";

it("stores a preference", () => {
  const store = createStore();
  store.set("theme", "dark");
  expect(store.get("theme")).toBe("dark");
});
```

### Integration Tests

Cross-store workflow tests in `src/renderer/src/integration.test.ts` validate multi-step user workflows:

```typescript
it("part creation → stock assignment → cut list generation", () => {
  // 1. Create parts
  const partId = useProjectStore.getState().addPart();

  // 2. Create and assign stock
  const stockId = useProjectStore.getState().addStock({
    /* ... */
  });
  useProjectStore.getState().updatePart(partId, { stockId });

  // 3. Generate cut list
  const result = generateOptimizedCutList(
    useProjectStore.getState().parts,
    useProjectStore.getState().stocks,
  );

  expect(result.boards).toHaveLength(1);
});
```

## Common Gotchas

### Floating Point Precision

```typescript
// BAD: May fail due to floating point
expect(part.position.y).toBe(0.75);

// GOOD: Use toBeCloseTo
expect(part.position.y).toBeCloseTo(0.75);
```

### Group Auto-Expansion

```typescript
// Groups auto-expand when created — collapse first before testing toggle
const groupId = store.createGroup("Test", members);
store.toggleGroupExpansion(groupId); // Collapse
store.toggleGroupExpansion(groupId); // Now tests expand behavior
```

### pendingDeletePartIds

```typescript
// It's null, not an empty array
expect(useUIStore.getState().pendingDeletePartIds).toBeNull();
```

### Form Submission

```typescript
// Prefer submit over click for reliable form handling
fireEvent.submit(screen.getByRole("form"));
```

### Table Cell Selectors

```typescript
// Both th and td may have the same class — be specific
const cells = container.querySelectorAll("td.col-qty");
```

### window.confirm / window.alert

```typescript
// Define in beforeAll before using mockReturnValue
beforeAll(() => {
  window.confirm = vi.fn();
  window.alert = vi.fn();
});

it("shows confirm dialog", () => {
  (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
  // ... test code
});
```

### Undo History with newProject()

```typescript
// Enable fake timers BEFORE calling newProject()
vi.useFakeTimers();
useProjectStore.getState().newProject();
vi.advanceTimersByTime(1); // Trigger the setTimeout clear
vi.useRealTimers();
expect(useProjectStore.temporal.getState().pastStates).toHaveLength(0);
```

### ESLint and DOM Types

```typescript
// HTMLSelectElement triggers ESLint no-undef — use HTMLInputElement instead
// Both have .value, which is usually all you need
const select = screen.getByLabelText("Theme") as HTMLInputElement;
```

## Test Categories

### Priority 1 (Must Test)

- Store actions and state transitions
- Revenue-critical features (PDF export, cut list generation, license validation)
- Data integrity (save/load, undo/redo, project migration)
- Feature limit enforcement (trial/free/licensed modes)

### Priority 2 (Should Test)

- Component rendering and user interactions
- Hook behavior and side effects
- Error handling and edge cases

### Priority 3 (Nice to Have)

- Visual rendering details (Three.js scene, CSS transitions)
- Uncommon error paths
- Performance characteristics

## Running Tests

```bash
# All tests (renderer + main + e2e)
npm test

# Renderer only
npx vitest run

# Main process only
npm run test:main

# With coverage report
npm run test:coverage

# Watch mode (renderer)
npm run test:watch

# E2E only
npm run test:e2e
```
