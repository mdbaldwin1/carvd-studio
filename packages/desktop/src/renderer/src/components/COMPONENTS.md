# Component Architecture & Guidelines

## Directory Structure

```
components/
├── assembly/       Domain: Assembly editing (modals, banners)
├── common/         Shared reusable primitives (Modal, Toast, form/)
│   └── form/       Form inputs with barrel export (import from 'common/form')
├── layout/         Context menus and file menu
├── licensing/      Trial, license activation, upgrade prompts
├── parts-list/     Parts list panel and library import
├── project/        Project management (start screen, settings, dialogs)
├── settings/       Settings modal section panels
├── stock/          Stock/material management and cut list
├── template/       Template browsing and editing
├── tutorial/       Tutorial system (overlay, tooltips, welcome)
├── update/         Update notification banner
└── workspace/      3D canvas, parts, drag/resize, snap guides
```

Each directory groups components by **business domain**, not by component type.

## Component Conventions

### File Naming

- One component per file: `ComponentName.tsx`
- Colocated tests: `ComponentName.test.tsx`
- Colocated CSS (legacy, migrating to Tailwind): `ComponentName.css`
- Hooks: `useHookName.ts` (colocated with consuming component)
- Types: `types.ts` or `componentTypes.ts` (when shared across files in a directory)
- Utilities: `componentUtils.ts` (when shared across files in a directory)

### Exports

- Use **named exports** exclusively (no default exports)
- Export component function and its props interface
- Only barrel-export (`index.ts`) for tightly related sets (e.g., `common/form/`)
- Import individual files directly for everything else

```tsx
// Good: named export
export function AddStockModal({ ... }: AddStockModalProps) { ... }

// Good: barrel import for form components
import { Input, Select, Checkbox } from '../common/form';

// Good: direct import for other components
import { Modal } from '../common/Modal';
```

### Component Size

- **Target**: < 300 lines per component file
- **Hard limit**: 500 lines — if a component exceeds this, it should be broken down
- Extract sub-components into the same directory (not exported publicly)
- Extract hooks into `useHookName.ts` when logic exceeds ~50 lines

### Props

- Define a `Props` interface exported alongside the component
- Use `ComponentNameProps` naming (e.g., `ModalProps`, `InputProps`)
- Prefer simple types over complex generics
- Use `Omit<React.HTMLAttributes, 'onChange'>` + spread for native element wrappers

```tsx
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  value: string | number;
  onChange: (value: string) => void; // Simplified — not ChangeEvent
  error?: string | null;
}
```

### Accessibility

All interactive components must include:

- `role` attributes where semantic HTML is insufficient
- `aria-label` or `aria-labelledby` for non-text content
- `aria-required` on required form fields
- `aria-invalid` when validation errors are present
- `role="alert"` on error messages (announces to screen readers)
- `aria-modal="true"` on modal dialogs
- Keyboard support: Escape to close, Tab navigation

### CSS & Styling

The codebase is migrating from standalone CSS files to Tailwind CSS:

- **Shared primitives** are defined in `primitives.css` using `@apply` (buttons, forms, scrollbars)
- **New components** should use Tailwind utility classes directly or reference `primitives.css` classes
- **Legacy CSS files** will be migrated incrementally (Epic 1)
- Avoid creating new `.css` files — use existing primitive classes or inline Tailwind

### Testing

Every component must have colocated tests covering:

1. **Renders correctly** — key elements visible
2. **User interactions** — clicks, input changes fire correct callbacks
3. **Conditional rendering** — error states, disabled states, empty states
4. **Accessibility** — ARIA attributes, roles, keyboard behavior

```tsx
import { render, screen, fireEvent } from '@testing-library/react';

it('fires onChange with selected value', () => {
  const handleChange = vi.fn();
  render(<Select label="Units" value="imperial" onChange={handleChange} options={options} />);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'metric' } });
  expect(handleChange).toHaveBeenCalledWith('metric');
});
```

## Shared Components Reference

### common/Modal

Base modal dialog. All modals should use this as their foundation.

```tsx
<Modal isOpen={isOpen} onClose={onClose} title="Add Stock">
  <div className="modal-body">{/* form content */}</div>
  <div className="form-actions">
    <button className="btn btn-sm btn-secondary btn-outlined" onClick={onClose}>
      Cancel
    </button>
    <button className="btn btn-sm btn-primary btn-filled" onClick={handleSave}>
      Save
    </button>
  </div>
</Modal>
```

Props: `isOpen`, `onClose`, `title`, `className?`, `role?`, `children`, `footer?`, `showCloseButton?`, `closeOnEscape?`, `closeOnBackdrop?`

### common/form/\*

Form inputs with consistent label, error, and help text rendering. Import from barrel:

```tsx
import { Input, Select, Checkbox, RadioGroup, TextArea, FormField, FormSection } from '../common/form';
```

| Component     | Use case                                                        |
| ------------- | --------------------------------------------------------------- |
| `FormField`   | Wrap custom inputs that aren't covered by other form components |
| `Input`       | Text and number inputs                                          |
| `TextArea`    | Multi-line text input                                           |
| `Select`      | Dropdown select with `SelectOption[]`                           |
| `Checkbox`    | Boolean toggle with inline label                                |
| `RadioGroup`  | Mutually exclusive options                                      |
| `FormSection` | Group related fields under a heading                            |

All form components use simplified `onChange` signatures (string or boolean values, not events).

### common/HelpTooltip

Contextual help icon that shows a popover with text and optional documentation link.

```tsx
<HelpTooltip text="Explanation text" docsSection="settings" />
```

### common/Toast

Notification toast rendered by the app shell. Triggered via `useProjectStore.getState().showToast()`.

### common/ConfirmDialog

Confirmation dialog for destructive actions. Uses `Modal` internally.

### common/FractionInput

Specialized input for fractional measurements (e.g., `3 1/2`). Domain-specific to woodworking.

## Refactoring Guide

When breaking down a large component:

1. **Identify boundaries**: Look for self-contained JSX blocks, independent state, or reusable logic
2. **Extract sub-components** into the same directory — they don't need to be publicly exported
3. **Extract hooks** for stateful logic (drag, resize, keyboard shortcuts)
4. **Extract types** into a shared types file when multiple files in the directory need them
5. **Extract utilities** for pure functions (geometry calculations, formatting)
6. **Keep the parent thin**: It should be an orchestrator that imports sub-components, not a monolith

Example from the Part.tsx refactor (2,057 → 391 lines):

```
workspace/
├── Part.tsx              Orchestrator (391 lines)
├── partTypes.ts          Shared types
├── partGeometry.ts       Geometry singletons + helpers
├── DimensionLabel.tsx    Sub-component
├── GrainDirectionArrow.tsx
├── ResizeHandle.tsx
├── RotationHandle.tsx
├── usePartDrag.ts        Drag/snap hook
└── usePartResize.ts      Resize hook
```

The parent (`Part.tsx`) imports everything and wires it together. Sub-components receive only the props they need.
