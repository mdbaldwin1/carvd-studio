# Design System - Carvd Studio Desktop App

## CSS Variable Definitions

All colors and design tokens are defined as CSS variables in `packages/desktop/src/renderer/src/index.css`.

### Color Scheme (Dark Theme)

```css
:root {
  /* Background colors */
  --color-bg: #1a1a1a;           /* Main background */
  --color-surface: #242424;      /* Cards, panels, elevated surfaces */
  --color-border: #3a3a3a;       /* Borders, dividers */

  /* Text colors */
  --color-text: #e0e0e0;         /* Primary text */
  --color-text-muted: #888888;   /* Secondary text, hints */

  /* Accent colors */
  --color-accent: #4a90e2;       /* Primary action color */
  --color-accent-hover: #5ba3ff; /* Hover state */
  --color-danger: #e74c3c;       /* Delete, errors */
  --color-warning: #f39c12;      /* Warnings */
  --color-success: #27ae60;      /* Success states */

  /* Axis colors (3D workspace) */
  --color-axis-x: #ff4444;       /* X-axis (red) */
  --color-axis-y: #44ff44;       /* Y-axis (green) */
  --color-axis-z: #4444ff;       /* Z-axis (blue) */

  /* Snap line colors */
  --color-snap-center: #ffff00;  /* Center alignment (yellow) */
  --color-snap-equal: #da77f2;   /* Equal spacing (purple) */
  --color-snap-dimension: #ffa94d; /* Dimension match (orange) */
  --color-snap-distance: #00d9ff;  /* Distance indicators (cyan) */
}
```

### Stock Color Presets

8 wood-tone colors for parts (defined in `constants.ts`):

```typescript
STOCK_COLORS = [
  '#d4a574', // Natural wood
  '#8b5a2b', // Walnut
  '#deb887', // Birch
  '#f5deb3', // Wheat
  '#8b4513', // Saddle brown
  '#a0522d', // Sienna
  '#cd853f', // Peru
  '#daa520', // Goldenrod
]
```

## Button System

Composable button classes - always start with `.btn` base class.

### Base Class (Required)

```css
.btn {
  /* Common button properties */
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s ease;
}
```

### Size Modifiers

```css
.btn-xs   /* Extra small: 6px padding, 11px font */
.btn-sm   /* Small: 8px×12px padding, 13px font */
.btn-md   /* Medium: 10px×16px padding, 14px font */
.btn-lg   /* Large: 12px×20px padding, 16px font */
.btn-icon-sm  /* Icon button small: 24px square */
.btn-icon-md  /* Icon button medium: 32px square */
```

### Variant Modifiers

```css
.btn-filled   /* Solid background */
.btn-outlined /* Border with transparent bg */
.btn-ghost    /* No border, transparent bg */
```

### Color Modifiers

```css
.btn-primary    /* Accent color */
.btn-secondary  /* Muted gray */
.btn-danger     /* Red for destructive actions */
```

### Usage Examples

```tsx
// Primary filled button
<button className="btn btn-md btn-filled btn-primary">
  Save Project
</button>

// Small outlined danger button
<button className="btn btn-sm btn-outlined btn-danger">
  Delete
</button>

// Icon button
<button className="btn btn-icon-md btn-ghost">
  <Settings size={16} />
</button>
```

## Form Elements

### Text Inputs

```css
input[type="text"],
input[type="number"],
textarea {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  padding: 8px;
  font-family: inherit;
  font-size: 13px;
}

input:focus,
textarea:focus {
  outline: none;
  border-color: var(--color-accent);
}
```

### Select Dropdowns

```css
select {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  padding: 6px 8px;
  font-family: inherit;
  font-size: 13px;
}
```

### Color Pickers

```css
input[type="color"] {
  width: 40px;
  height: 32px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-bg);
  cursor: pointer;
}

/* Dark theme for native color picker */
:root {
  color-scheme: dark;
}
```

## Scrollbars (Custom Dark Theme)

```css
/* WebKit browsers */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--color-bg);
}

::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-muted);
}

/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) var(--color-bg);
}
```

## Modal Patterns

### Modal Structure

```tsx
<div className="modal-backdrop">
  <div className="modal">
    <div className="modal-header">
      <h2>Modal Title</h2>
      <button className="btn btn-icon-sm btn-ghost" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
    <div className="modal-body">
      {/* Content */}
    </div>
    <div className="modal-footer">
      <button className="btn btn-md btn-ghost">Cancel</button>
      <button className="btn btn-md btn-filled btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

### Modal CSS

```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
```

## Sidebar Patterns

### Collapsible Sections

```css
.section {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--color-border);
}

.section-header {
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.section-header:hover {
  background: rgba(255, 255, 255, 0.03);
}

.section-content {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 0.2s ease;
}

.section-content.collapsed {
  grid-template-rows: 0fr;
}

.section-content-inner {
  overflow: hidden;
}
```

### List Items

```css
.part-item,
.stock-item,
.composite-item {
  padding: 8px 16px;
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid var(--color-border);
}

.part-item:hover,
.stock-item:hover,
.composite-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.part-item.selected,
.stock-item.selected {
  background: rgba(74, 144, 226, 0.2);
  border-left: 3px solid var(--color-accent);
}
```

## Component Styling Examples

### Properties Panel

```css
.properties-panel {
  width: 280px;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.property-group {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}

.property-group label {
  display: block;
  color: var(--color-text-muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}
```

### Warning/Error Messages

```css
.warning-message {
  background: rgba(243, 156, 18, 0.1);
  border: 1px solid var(--color-warning);
  border-radius: 4px;
  padding: 8px 12px;
  margin: 8px 0;
  font-size: 13px;
  color: var(--color-warning);
}

.error-message {
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid var(--color-danger);
  border-radius: 4px;
  padding: 8px 12px;
  margin: 8px 0;
  font-size: 13px;
  color: var(--color-danger);
}
```

### Toast Notifications

```css
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 12px 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 2000;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translate(-50%, 100px);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}
```

## Print Styles

```css
@media print {
  .modal-backdrop {
    background: white;
  }

  .modal {
    border: none;
    box-shadow: none;
  }

  .modal-header button,
  .modal-footer {
    display: none;
  }

  .cut-list-tabs {
    display: none;
  }
}
```

## UI Patterns Summary

1. **Always use CSS variables** - Never hardcode colors
2. **Composable button system** - Start with `.btn`, add modifiers
3. **Consistent spacing** - 8px base unit (8px, 12px, 16px, 20px, 24px)
4. **Dark theme first** - Use `color-scheme: dark` for native controls
5. **Smooth transitions** - 0.15s-0.2s ease for most interactions
6. **Focus states** - Always show accent color border on focus
7. **Hover feedback** - Subtle background change (rgba(255, 255, 255, 0.03-0.05))

---

**Critical Reminder:** ALL desktop app styles MUST be in `index.css`. NO Tailwind, NO inline styles.
