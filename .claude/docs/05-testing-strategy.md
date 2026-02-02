# Testing Strategy - Carvd Studio

## Overview

Comprehensive automated testing strategy for Carvd Studio to ensure quality, prevent regressions, and enable confident refactoring.

**Goal:** 100% automation - tests should catch issues before users do.

## Testing Pyramid

```
           /\
          /E2E\          (Few - Slow - High Value)
         /------\
        /Integration\    (Some - Medium - Medium Value)
       /------------\
      /  Unit Tests  \   (Many - Fast - High Value)
     /----------------\
```

### 1. Unit Tests (70% of tests)

**Framework:** Vitest + Testing Library
**Speed:** Very fast (<1s per test suite)
**Focus:** Pure functions, utilities, business logic

**What to test:**
- `utils/fractions.ts` - Fraction parsing and conversion
- `utils/snapDetection.ts` - Snap calculation logic
- `utils/binPacking.ts` - Guillotine bin-packing algorithm
- `utils/dimensionHelpers.ts` - Dimension calculations
- `utils/validation.ts` - Input validation
- `utils/export.ts` - CSV/PDF export logic
- Store selectors and computed values
- Pure calculation functions

**Characteristics:**
- No dependencies on React, DOM, or Electron
- Fast execution (entire suite < 5 seconds)
- Test one thing at a time
- High code coverage (aim for 90%+)

### 2. Integration Tests (20% of tests)

**Framework:** Vitest + Testing Library + userEvent
**Speed:** Medium (5-10s per test suite)
**Focus:** Component interactions, state management, user flows

**What to test:**
- Zustand store actions and state updates
- Component interactions (button click → state change → UI update)
- Form submissions and validation
- Modal workflows (open → fill → submit → close)
- Multi-component interactions (sidebar → canvas → properties panel)
- File operations (save/load state)
- Undo/redo functionality

**Characteristics:**
- Tests multiple units working together
- Simulates user interactions
- Tests state management flows
- Mocks external dependencies (Electron APIs, file system)

### 3. E2E Tests (10% of tests)

**Framework:** Playwright
**Speed:** Slow (30-60s per test)
**Focus:** Critical user workflows end-to-end

**What to test:**
- **Happy path workflow:** New project → Add part → Assign stock → Generate cut list → Export
- **File management:** Save project → Close → Reopen → Verify state
- **License activation:** Enter key → Validate → Access app
- **Tutorial flow:** First run → Complete tutorial → Dismiss
- **Cut list workflow:** Create parts → Generate → Review diagrams → Export PDF/CSV
- **Library management:** Create composite → Save to library → Use in new project
- **Error handling:** Invalid inputs → Show errors → Recover gracefully

**Characteristics:**
- Tests full Electron app (main + renderer processes)
- Real file system operations
- Tests actual user experience
- Catches integration issues between processes
- Slower but highest confidence

## Test Organization

```
packages/desktop/
├── src/
│   ├── renderer/src/
│   │   ├── utils/
│   │   │   ├── fractions.ts
│   │   │   └── fractions.test.ts          ← Unit tests next to source
│   │   ├── store/
│   │   │   ├── projectStore.ts
│   │   │   └── projectStore.test.ts       ← Integration tests
│   │   └── components/
│   │       ├── Part.tsx
│   │       └── Part.test.tsx              ← Component tests
│   └── main/
│       ├── license.ts
│       └── license.test.ts                ← Main process tests
├── tests/
│   ├── e2e/
│   │   ├── happy-path.spec.ts             ← E2E tests
│   │   ├── file-management.spec.ts
│   │   └── cut-list-workflow.spec.ts
│   ├── fixtures/
│   │   ├── sample-project.json
│   │   └── test-license-key.txt
│   └── helpers/
│       ├── test-utils.tsx                 ← Test utilities
│       └── mock-electron.ts               ← Electron API mocks
├── vitest.config.ts                       ← Vitest configuration
└── playwright.config.ts                   ← Playwright configuration
```

## Testing Tools & Frameworks

### Core Testing Stack

1. **Vitest** - Unit and integration test runner
   - Fast (Vite-powered)
   - Modern API (Jest-compatible)
   - First-class TypeScript support
   - Built-in code coverage

2. **@testing-library/react** - Component testing
   - User-centric queries (getByRole, getByLabelText)
   - Encourages accessible markup
   - Async utilities for testing updates

3. **@testing-library/user-event** - User interaction simulation
   - Realistic event simulation
   - Async by default (matches real user behavior)
   - Better than fireEvent for integration tests

4. **Playwright** - E2E testing
   - Cross-platform (macOS, Windows, Linux)
   - Built-in test runner and assertions
   - Screenshots and video recording on failure
   - Electron support out of the box

### Additional Tools

- **happy-dom** - Fast DOM implementation for Vitest
- **@vitest/ui** - Visual test UI for debugging
- **@vitest/coverage-v8** - Code coverage reports
- **msw** (if needed) - Mock service worker for API mocking

## Test Coverage Goals

### Minimum Coverage Targets

- **Overall:** 80% line coverage
- **Critical utilities:** 95% coverage
  - fractions.ts
  - snapDetection.ts
  - binPacking.ts
  - dimensionHelpers.ts
- **Store actions:** 90% coverage
- **Components:** 70% coverage (focus on critical components)

### Coverage Exemptions

- Type definitions (types.ts)
- Constants (constants.ts)
- Style files (index.css)
- Electron main process boilerplate

## Continuous Integration

### GitHub Actions Workflow

The CI pipeline runs tests on multiple platforms (Ubuntu, macOS, Windows) for every push and pull request.

**Workflow file:** `.github/workflows/test.yml`

Key features:
- **Multi-platform testing:** Ubuntu, macOS, Windows
- **Parallel job execution:** Unit tests, E2E tests, and linting run simultaneously
- **License key injection:** Private key loaded from GitHub Secrets for test license generation
- **Automatic retries:** E2E tests retry twice on failure (flaky test resilience)
- **Artifact uploads:** Test reports and screenshots saved on failure
- **Code coverage:** Uploaded to Codecov (Ubuntu only)

The workflow includes three jobs:
1. **unit-tests:** Runs Vitest unit and integration tests
2. **e2e-tests:** Runs Playwright E2E tests with Electron
3. **lint:** Runs ESLint, TypeScript type checking, and Prettier format check

### License Key Management in CI/CD

The license system requires `license-private-key.pem` to generate test licenses. Since this private key is gitignored (for security), we use GitHub Secrets to make it available during CI runs.

**Setup Instructions:**

1. **Add the private key to GitHub Secrets:**
   - Go to your GitHub repository
   - Navigate to **Settings → Secrets and variables → Actions**
   - Click **New repository secret**
   - Name: `LICENSE_PRIVATE_KEY`
   - Value: Paste the contents of `license-private-key.pem`
   - Click **Add secret**

2. **How it works in CI:**
   ```yaml
   - name: Setup test license key
     run: echo "${{ secrets.LICENSE_PRIVATE_KEY }}" > license-private-key.pem
     working-directory: packages/desktop
   ```
   - The workflow retrieves the private key from GitHub Secrets
   - Writes it to `license-private-key.pem` in the packages/desktop directory
   - Tests can now use `generate-test-license` and license verification
   - The key file is only in memory during the test run and is never committed

3. **Security considerations:**
   - The private key is never exposed in logs or build artifacts
   - Only repository collaborators with appropriate permissions can access secrets
   - The key is encrypted at rest in GitHub's infrastructure
   - Each workflow run gets a fresh environment that's destroyed after completion

**Local Development:**
- Your local `license-private-key.pem` is used for local testing
- The key remains gitignored and never pushed to the repository
- Only the GitHub Secret is used in CI/CD

### Pre-commit Hooks

Use `husky` + `lint-staged` to run tests before commits:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run test:unit"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "vitest related --run"]
  }
}
```

## Test Writing Guidelines

### Unit Test Example

```typescript
// fractions.test.ts
import { describe, it, expect } from 'vitest';
import { parseFraction, toDecimal } from './fractions';

describe('parseFraction', () => {
  it('parses whole numbers', () => {
    expect(parseFraction('5')).toEqual({ whole: 5, numerator: 0, denominator: 1 });
  });

  it('parses fractions', () => {
    expect(parseFraction('1/2')).toEqual({ whole: 0, numerator: 1, denominator: 2 });
  });

  it('parses mixed fractions', () => {
    expect(parseFraction('3 1/4')).toEqual({ whole: 3, numerator: 1, denominator: 4 });
  });

  it('handles invalid input', () => {
    expect(parseFraction('invalid')).toBeNull();
  });
});
```

### Component Test Example

```typescript
// Part.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Part } from './Part';

describe('Part', () => {
  it('renders part with correct dimensions', () => {
    const part = { id: '1', name: 'Shelf', length: 24, width: 12, thickness: 0.75 };
    render(<Part part={part} selected={false} />);

    expect(screen.getByText('Shelf')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const part = { id: '1', name: 'Shelf', length: 24, width: 12, thickness: 0.75 };
    render(<Part part={part} selected={false} onClick={handleClick} />);

    await userEvent.click(screen.getByText('Shelf'));
    expect(handleClick).toHaveBeenCalledWith('1');
  });
});
```

### E2E Test Example

```typescript
// happy-path.spec.ts
import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';

test('complete workflow: create part → generate cut list → export', async () => {
  // Launch Electron app
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();

  // Skip tutorial (if first run)
  const skipButton = window.getByRole('button', { name: /skip tutorial/i });
  if (await skipButton.isVisible()) {
    await skipButton.click();
  }

  // Create a new part
  await window.getByRole('button', { name: /add part/i }).click();
  await window.getByLabel(/name/i).fill('Shelf');
  await window.getByLabel(/length/i).fill('24');
  await window.getByLabel(/width/i).fill('12');
  await window.getByLabel(/thickness/i).fill('0.75');

  // Verify part appears in sidebar
  await expect(window.getByText('Shelf')).toBeVisible();

  // Generate cut list
  await window.getByRole('button', { name: /generate cut list/i }).click();

  // Verify cut list modal opens
  await expect(window.getByRole('dialog')).toBeVisible();
  await expect(window.getByText(/parts list/i)).toBeVisible();

  // Export to CSV
  await window.getByRole('button', { name: /export csv/i }).click();

  // Verify file was created (check downloads)
  // ... file system assertions

  await app.close();
});
```

## Testing Best Practices

### DO ✅

- Test behavior, not implementation details
- Use semantic queries (getByRole, getByLabelText)
- Write descriptive test names
- Keep tests small and focused
- Mock external dependencies (Electron, file system)
- Test error states and edge cases
- Use async utilities for async operations
- Clean up after tests (reset state, close windows)

### DON'T ❌

- Test internal component state directly
- Use implementation-specific selectors (class names, data attributes)
- Write tests that depend on other tests
- Skip error cases ("happy path only" testing)
- Leave console errors unhandled
- Use setTimeout for waiting (use waitFor instead)
- Test third-party library internals

## Running Tests

### Commands

```bash
# Run all unit & integration tests
npm run test:unit

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests in headed mode (see the app)
npm run test:e2e:headed

# Run all tests (unit + integration + E2E)
npm test
```

### Watch Mode

During development, keep `npm run test:watch` running:
- Auto-reruns tests when files change
- Only runs tests related to changed files
- Fast feedback loop

## Debugging Tests

### Vitest UI

```bash
npm run test:ui
```

Opens visual test interface at http://localhost:51204
- View test results
- See code coverage
- Debug failing tests
- Inspect console logs

### Playwright Debugging

```bash
# Run with headed browser
npm run test:e2e:headed

# Run with Playwright Inspector
PWDEBUG=1 npm run test:e2e

# Generate trace
npm run test:e2e -- --trace on
```

## Next Steps

1. ✅ Install test dependencies
2. ✅ Configure Vitest and Playwright
3. ⏳ Write tests for critical utilities (fractions, snap detection, bin packing)
4. ⏳ Write store tests (state management, undo/redo)
5. ⏳ Write component tests (Part, sidebar, modals)
6. ⏳ Write E2E tests (happy path, file management)
7. ⏳ Set up CI/CD pipeline
8. ⏳ Add coverage reporting
9. ⏳ Add pre-commit hooks

---

**Updated:** 2026-02-02
**Status:** Phase 9 - Testing in progress
