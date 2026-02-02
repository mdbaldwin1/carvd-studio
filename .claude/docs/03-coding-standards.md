# Coding Standards - Carvd Studio

## Critical Styling Rules (Desktop App)

### Rule #1: NO Tailwind CSS

**NEVER use Tailwind in the desktop app** (`packages/desktop/`)

❌ **Wrong:**
```tsx
<div className="flex items-center justify-between p-4 bg-gray-800">
```

✅ **Correct:**
```tsx
<div className="modal-header">
```

**Exception:** Website package (`packages/website/`) CAN use Tailwind.

### Rule #2: ALL Styles in index.css

**ALL desktop app styles MUST go in:**
`packages/desktop/src/renderer/src/index.css`

❌ **Wrong:**
```tsx
// Inline styles
<div style={{ padding: '16px', background: '#242424' }}>

// Styled-components
const StyledDiv = styled.div`
  padding: 16px;
  background: #242424;
`;
```

✅ **Correct:**
```css
/* In index.css */
.modal-header {
  padding: 16px;
  background: var(--color-surface);
}
```

```tsx
// In component
<div className="modal-header">
```

### Rule #3: Use CSS Variables

**Always use CSS variables for colors, spacing, etc.**

❌ **Wrong:**
```css
.button {
  background: #4a90e2;
  color: #e0e0e0;
  border: 1px solid #3a3a3a;
}
```

✅ **Correct:**
```css
.button {
  background: var(--color-accent);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}
```

## TypeScript Patterns

### Interface Definitions

**Location:** `packages/desktop/src/renderer/src/types.ts`

**Naming Convention:**
- PascalCase for interfaces
- Descriptive, domain-specific names
- Avoid generic names like "Item" or "Data"

```typescript
// Good
interface Part {
  id: string;
  name: string;
  length: number;
  // ...
}

interface Stock {
  id: string;
  name: string;
  // ...
}

// Avoid
interface Item {
  id: string;
  data: any;
}
```

### Optional Properties

Use `?` for truly optional fields:

```typescript
interface Part {
  id: string;              // Required
  name: string;            // Required
  notes?: string;          // Optional (can be undefined)
  extraLength?: number;    // Optional (for joinery)
  glueUpPanel?: boolean;   // Optional (defaults to false)
}
```

### Type Safety

**Never use `any`** - use proper types or `unknown`

❌ **Wrong:**
```typescript
function processData(data: any) {
  return data.someProperty;
}
```

✅ **Correct:**
```typescript
function processData(data: Part) {
  return data.name;
}

// If type truly unknown:
function processData(data: unknown) {
  if (typeof data === 'object' && data !== null && 'name' in data) {
    return (data as Part).name;
  }
}
```

## React Patterns

### Component Structure

**Order:**
1. Imports
2. Type definitions (if local to component)
3. Component function
4. Hooks (useState, useEffect, custom hooks)
5. Event handlers
6. Helper functions
7. JSX return

```tsx
import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';

interface MyComponentProps {
  title: string;
  onSave: () => void;
}

export function MyComponent({ title, onSave }: MyComponentProps) {
  // Hooks
  const [isOpen, setIsOpen] = useState(false);
  const parts = useProjectStore(state => state.parts);

  // Effects
  useEffect(() => {
    // ...
  }, []);

  // Event handlers
  const handleClick = () => {
    // ...
  };

  // JSX
  return (
    <div className="my-component">
      <h2>{title}</h2>
      <button onClick={handleClick}>Click</button>
    </div>
  );
}
```

### Hooks Usage

**Custom Hook Naming:** Always prefix with `use`

```typescript
// Good
export function useKeyboardShortcuts() { }
export function useFileOperations() { }
export function useStockLibrary() { }

// Bad
export function keyboardShortcuts() { }
export function fileOps() { }
```

**Hook Dependencies:** Always include all dependencies

```typescript
// Correct
useEffect(() => {
  console.log(selectedPartId);
}, [selectedPartId]);  // Include dependency

// Wrong - will cause stale closure bugs
useEffect(() => {
  console.log(selectedPartId);
}, []);  // Missing dependency
```

### State Management (Zustand)

**Store Actions:** Use descriptive action names

```typescript
// Good
setPartPosition(id: string, position: Vector3)
assignStockToSelectedParts(stockId: string)
createGroup(name: string, memberIds: string[])

// Avoid
updatePart(id: string, data: any)
doThing()
```

**Immutable Updates:** Always create new objects

```typescript
// Correct - immutable update
setParts(parts.map(p =>
  p.id === id ? { ...p, name: newName } : p
))

// Wrong - mutates state
const part = parts.find(p => p.id === id);
part.name = newName;  // NEVER do this
```

### Component Props

**Destructure props in function signature:**

```tsx
// Good
function MyComponent({ title, isOpen, onClose }: MyComponentProps) {
  return <div>{title}</div>;
}

// Avoid
function MyComponent(props: MyComponentProps) {
  return <div>{props.title}</div>;
}
```

## File Organization

### Directory Structure

```
packages/desktop/src/renderer/src/
├── components/          → React components (one file per component)
├── hooks/              → Custom hooks (one hook per file)
├── store/              → Zustand stores (one store per file)
├── utils/              → Pure utility functions
├── types.ts            → All TypeScript interfaces
├── constants.ts        → App constants
├── index.css           → ALL STYLES
└── App.tsx             → Main app component
```

### File Naming

- Components: PascalCase (e.g., `StockLibraryModal.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useKeyboardShortcuts.ts`)
- Utils: camelCase (e.g., `fractions.ts`, `snapToPartsUtil.ts`)
- Types: singular (e.g., `types.ts` not `types.d.ts`)

### Import Order

1. React imports
2. Third-party libraries
3. Local stores
4. Local hooks
5. Local components
6. Local utils/types
7. CSS (if any - though should be in index.css)

```tsx
import React, { useState } from 'react';
import { X, Settings } from 'lucide-react';

import { useProjectStore } from '../store/projectStore';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { Modal } from './Modal';
import { formatFraction } from '../utils/fractions';
import type { Part, Stock } from '../types';
```

## Naming Conventions

### Variables

- camelCase for local variables
- SCREAMING_SNAKE_CASE for constants
- Descriptive names (avoid single letters except loop indices)

```typescript
// Good
const selectedPartIds = [];
const MAX_HISTORY_ENTRIES = 100;

// Avoid
const x = [];
const maxEntries = 100;  // constant should be SCREAMING_SNAKE_CASE
```

### Functions

- camelCase
- Verb-first naming (e.g., `getPartById`, `calculateBounds`, `validatePart`)

```typescript
// Good
function getPartById(id: string): Part | undefined { }
function calculateBoardFeet(stock: Stock): number { }
function validatePartDimensions(part: Part): boolean { }

// Avoid
function part(id: string) { }  // noun, unclear
function check(part: Part) { }  // too vague
```

### Boolean Variables

- Prefix with `is`, `has`, `should`, `can`

```typescript
// Good
const isOpen = false;
const hasStock = true;
const shouldValidate = true;
const canDelete = false;

// Avoid
const open = false;
const stock = true;
const validate = true;
```

## Event Handlers

**Naming:** Prefix with `handle`

```typescript
// Component
function MyComponent() {
  const handleClick = () => { };
  const handleSubmit = (e: FormEvent) => { };
  const handleInputChange = (value: string) => { };

  return (
    <div>
      <button onClick={handleClick}>Click</button>
      <form onSubmit={handleSubmit}>
        <input onChange={(e) => handleInputChange(e.target.value)} />
      </form>
    </div>
  );
}
```

**Prevent Default:** Be explicit when needed

```typescript
const handleFormSubmit = (e: FormEvent) => {
  e.preventDefault();  // Explicit
  // ...
};
```

## Comments

### When to Comment

✅ **Do comment:**
- Complex algorithms (e.g., bin-packing, quaternion math)
- Non-obvious business logic
- Workarounds for bugs/limitations
- Public API functions (JSDoc)

❌ **Don't comment:**
- Obvious code
- What code does (code should be self-documenting)

```typescript
// Good - explains WHY
// Use quaternion math because Euler angles don't compose correctly
const rotation = new THREE.Quaternion();

// Bad - explains WHAT (obvious from code)
// Set the rotation to a new quaternion
const rotation = new THREE.Quaternion();
```

### JSDoc for Utilities

```typescript
/**
 * Converts a decimal number to a mixed fraction string.
 * @param value - The decimal number to convert
 * @returns A string like "1 3/4" or "3/4" or "2"
 */
export function formatFraction(value: number): string {
  // ...
}
```

## Error Handling

### User-Facing Errors

Show helpful messages via toast/dialog:

```typescript
try {
  await saveProject(filePath);
} catch (error) {
  showToast('Failed to save project. Please try again.', 'error');
  console.error('Save error:', error);
}
```

### Developer Errors

Use console.error for debugging:

```typescript
if (!part) {
  console.error('Part not found:', partId);
  return;
}
```

## Performance Best Practices

### Zustand Selectors

**Use selective subscriptions** to avoid unnecessary re-renders:

```typescript
// Good - only re-renders when parts change
const parts = useProjectStore(state => state.parts);

// Bad - re-renders on ANY store change
const store = useProjectStore();
const parts = store.parts;
```

### useEffect Dependencies

**Keep dependency arrays minimal:**

```typescript
// Good - specific dependency
useEffect(() => {
  updateTitle(projectName);
}, [projectName]);

// Bad - too broad, will run too often
useEffect(() => {
  updateTitle(projectName);
}, [projectStore]);
```

### Memoization

Use `useMemo` for expensive calculations:

```typescript
const sortedParts = useMemo(() => {
  return parts.sort((a, b) => a.name.localeCompare(b.name));
}, [parts]);
```

Use `useCallback` for functions passed as props:

```typescript
const handleDelete = useCallback((id: string) => {
  deletePart(id);
}, [deletePart]);
```

## Testing Patterns (When Adding Tests)

### Test File Naming

- Same name as file being tested
- Add `.test.ts` or `.test.tsx` suffix
- Place next to source file or in `__tests__` folder

```
fractions.ts
fractions.test.ts
```

### Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { formatFraction } from './fractions';

describe('formatFraction', () => {
  it('converts decimal to mixed fraction', () => {
    expect(formatFraction(1.75)).toBe('1 3/4');
  });

  it('returns whole number without fraction', () => {
    expect(formatFraction(2.0)).toBe('2');
  });
});
```

## Git Commit Messages

**Format:** `<type>: <description>`

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `style`: Formatting, CSS changes
- `docs`: Documentation only
- `chore`: Build config, dependencies

**Examples:**
```
feat: add dimension matching snap during resize
fix: kerf not applied correctly for parts matching stock size
refactor: extract snap detection to separate utility
style: update button styles to use composable classes
docs: add architecture documentation
```

## Code Review Checklist

Before submitting changes:

- [ ] No Tailwind CSS in desktop app
- [ ] All styles in index.css
- [ ] CSS variables used for colors
- [ ] No `any` types
- [ ] No inline styles
- [ ] Proper TypeScript types
- [ ] useEffect dependencies correct
- [ ] No console.log (use console.error for errors)
- [ ] Descriptive variable/function names
- [ ] Comments for complex logic only

---

**Remember:** Write code for humans to read. The computer will figure it out.
