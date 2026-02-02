# Features & Status - Carvd Studio

## Current Phase

**Phase 8.1 Complete** - License System & Monorepo Structure

**Status:** Ready for Phase 8.2 (UI Polish)

## Completed Features

### Phase 1: Project Foundation ✓

- Electron + React + TypeScript scaffolding
- electron-vite for build/dev workflow
- electron-store for preferences
- electron-builder configuration
- Basic app shell with 3D canvas placeholder

### Phase 2: 3D Workspace ✓

**Core 3D Editing:**
- Zustand store for project state
- Part component with 3D box rendering
- Click-to-select with visual highlighting
- Custom move (click-drag) and resize (directional handles)
- Snap-to-grid positioning (1/16" increments, snaps on release)
- 90° rotation support (X, Y, Z axes via keyboard shortcuts)
- Parts list sidebar with add/duplicate/delete
- Properties panel with fraction input for dimensions

**Keyboard Shortcuts:**
- X/Y/Z = Rotate on respective axes
- Shift+D = Duplicate
- Delete = Delete selected
- Escape = Deselect/exit mode

### Phase 2.1: Multi-select & Copy/Paste ✓

- Multi-select parts (Shift+click, Ctrl/Cmd+drag for box selection)
- Copy/paste shortcuts (Ctrl/Cmd+C, Ctrl/Cmd+V, Ctrl/Cmd+A)
- Move/delete multiple selected parts at once
- Resize/rotation handles only shown for single selection
- Dimension labels shown for all selected parts

### Phase 2.2: Precision & Polish ✓

- Arrow key nudging with view-relative movement
- Position editing in properties panel (X, Y, Z coordinates)
- Smart copy naming (incremental, e.g., "Part 1", "Part 1 (copy)", "Part 1 (copy 2)")
- Keyboard shortcuts for camera (F = focus, Home = reset view)
- Camera control hints in hotkey bar
- Toast notifications
- Context menus for parts and background
- Grain direction arrows (toggleable)
- Rotation handles with directional indicators
- Multi-select in Parts List sidebar (Cmd/Ctrl+click, Shift+click range)
- Tooltips on parts list items
- **Undo/Redo system** (zundo middleware, Cmd+Z, Cmd+Shift+Z)

### Phase 3: Stock System & Part Assignment ✓

**Stock Management:**
- App-level stock library persisted via electron-store
- Project-level stock list in sidebar
- "Add Stock" modal with click-to-select library interface
- Stock Library Management modal (add/edit/delete stocks)
- Project-level stock editing
- Part-to-stock assignment dropdown
- Parts inherit stock color and grain direction
- Drag stock onto canvas to create new part

### Phase 3.1: UI Polish ✓

- Composable button CSS system (.btn + modifiers)
- Custom dark-theme scrollbars (WebKit + Firefox)
- Dark-theme color pickers (color-scheme: dark)
- Consistent form styling (selects, inputs)

### Phase 3.2: Stock System Enhancements ✓

- Bulk stock assignment (assign to multiple selected parts)
- Stock usage indicator (part count per stock in sidebar)
- Delete confirmation for stocks with assigned parts

### Phase 3.3: Settings System ✓

**App-Level Settings:**
- Theme (dark/light/system)
- Default units, default grid size
- Confirm before delete, show hotkey hints

**Project-Level Settings:**
- Units (imperial/metric)
- Grid size (stored in project file)

**Display Mode Toolbar:**
- Solid/wireframe/translucent view modes
- Grid toggle, grain direction toggle

### Phase 3.4: Platform Polish & Cross-Instance Sync ✓

- Custom VS Code-style title bar (macOS and Windows)
- Dynamic title bar overlay theme updates (Windows)
- Cross-instance settings sync via electron-store file watching
- Layout flex fixes (sidebar/panel shrinking issues)
- Metric-appropriate grid size options (1mm, 2mm, 5mm, 10mm, 25mm)
- Automatic grid size conversion when switching units

### Phase 3.5: Smart Proximity Snapping ✓

**Snap-to-Parts:**
- Snap-to-part edge/center alignment during drag
- Visual alignment lines (dashed) showing active snaps
- Zoom-relative snap threshold (closer zoom = tighter precision)
- Performance optimized: limits checks to N nearest parts
- Toggle button in DisplayToolbar
- Works independently on X, Y, Z axes
- Distance indicators showing measurements

### Phase 3.6: Reference Parts (Precision Mode) ✓

- Mark parts as "reference" for targeted snapping (R key or context menu)
- Visual indicator on reference parts (cyan outline)
- When references exist, snapping ONLY considers reference parts
- Clear references via context menu, Escape key, or toolbar button
- Toolbar indicator shows reference count with click-to-clear

### Phase 3.7: Advanced Snapping ✓

**Equal Spacing Snap:**
- Detect and snap to equal gaps between parts
- Purple/magenta visual feedback

**Dimension Matching:**
- Snap to match reference part dimensions during resize
- Orange visual feedback

**Persistent Snap Guides:**
- Like Illustrator guide lines
- Context menu to add X/Y/Z guides at clicked position
- Visual rendering as semi-transparent planes with dashed edges
- Individual guide deletion, "Clear All Guides"

### Phase 4: Part & Group Management ✓

**Hierarchical Grouping:**
- Groups can contain parts or nested groups
- Figma-style interaction (single-click selects group, double-click enters)
- Group creation via context menu or G keyboard shortcut
- Ungroup via context menu or Cmd+Shift+G
- Grouped parts move together
- Hierarchical parts list in sidebar with expand/collapse
- Visual feedback when inside a group (cyan border)

### Phase 4.1: Pre-Cut List Features ✓

- Dimension annotations in 3D view (bounding box dimensions)
- Part notes field for assembly/fabrication notes
- Kerf/blade width project setting (default 1/8")
- Material overage factor project setting (default 10%)
- Project-level notes field

### Phase 4.2: Joinery Adjustments ✓

- Extra length/width fields for cut list adjustments
- NOT shown in 3D view (cut list only)
- Collapsible "Joinery Adjustments" section in properties panel
- Visual indicator when adjustments are set

### Phase 4.3: Composite Stock ✓

**Reusable Assemblies:**
- Save selections as reusable composite assemblies
- Dual storage: project-level and app-level library
- Drag-to-place composites from sidebar
- Group structure preserved when placing composites

### Phase 4.4: Library Management UI & Stock Constraints ✓

**Tabbed Library Modal:**
- Stocks tab: existing stock library functionality
- Composites tab: view/delete library composites

**Stock Constraint Settings:**
- App-level defaults, project-level overrides
- Three toggles: Constrain Dimensions, Constrain Grain, Constrain Color
- Constraint warnings in PropertiesPanel when violated

### Phase 5: Cut List Generation ✓

**Validation & Planning:**
- Part validation with warning icons (error/warning severity)
- Glue-up panel support (oversized panels needing edge-gluing)
- Guillotine bin-packing algorithm
- Best Fit Decreasing strategy
- Kerf width support
- Rotation for non-grain-sensitive parts

**Cut List Modal:**
- Parts List tab: sortable table with cut dimensions, stock, notes
- Cutting Diagrams tab: SVG visualizations per stock board
- Statistics display (board feet, waste %, estimated cost)
- Export to CSV and Print
- Stale detection (marked outdated when parts change)
- Multi-select stock from library (checkboxes)

### Phase 6: Shopping List & Cost Estimate ✓

- Shopping list tab in cut list modal with per-stock breakdown
- Board feet calculation for dimensional lumber pricing
- Line item costs (board_foot and per_item pricing)
- Total project cost estimate with waste cost breakdown
- Export shopping list to CSV
- Export cutting diagrams to PDF (jsPDF)
- Actual vs recommended board counts with overage display

### Phase 7: File Management ✓

**.carvd File Format:**
- Plain JSON with versioning for schema migrations
- Contains: project metadata, parts, stocks, groups, settings

**File Operations:**
- File menu with New/Open/Save/Save As/Recent Projects
- Keyboard shortcuts: Cmd+N, Cmd+O, Cmd+S, Cmd+Shift+S
- Unsaved changes dialog (prompts before destructive actions)
- Window title with project name and dirty indicator (•)
- Recent projects list (up to 10)
- Project name editing in Project Settings modal
- File validation and migration support

**Auto-Recovery:**
- Saves every 2 minutes when dirty
- Prompts to restore on startup if orphaned recovery file found
- Recovery file deleted on successful save

### Phase 7.1: Library Import & Edit ✓

**Import to Library:**
- Detects stocks/composites not in library when loading project
- Offers to import them to app-level library

**Edit Composite in 3D:**
- Edit library composites in 3D workspace
- "Edit Layout in 3D" button in Library modal
- Save/cancel workflow with unsaved changes dialog
- Restores previous project state after editing

**Create New Composite:**
- "+ New" button in Library modal
- Creates composite from scratch in 3D workspace

### Phase 7.2: Cut List Persistence & Bug Fixes ✓

**Cut List Persistence:**
- Cut list saved with project file
- No need to regenerate on every open

**Custom Shopping Items:**
- Add hardware, fasteners, etc. to shopping list
- Persists through cut list regeneration

**Dynamic Cut List Button:**
- "Generate Cut List" when none exists
- "Regenerate Cut List" when stale
- "View Cut List" when current

**Bug Fixes:**
- "Add New Stock" from dropdown properly assigns stock
- EventEmitter memory leak fixed (singleton pattern)
- Modal backdrop no longer closes when dragging to select text
- Kerf handling for parts matching stock dimensions

### Phase 8.1: License System & Monorepo Structure ✓

**Monorepo Conversion:**
- Three packages: desktop, webhook, website
- npm workspaces configured
- Convenience scripts at root level

**License Verification System:**
- Offline JWT-based licensing
- RSA-2048 asymmetric cryptography
- LicenseActivationModal component
- License status in AppSettingsModal
- License check on app launch (blocks if invalid)
- Deactivation support for license transfers

**Webhook Service:**
- Automated license key generation on Lemon Squeezy purchases
- Vercel serverless function
- Webhook signature verification
- License key returned to Lemon Squeezy for email delivery

**Code Signing Configuration:**
- macOS notarization setup ready
- Windows signing configuration prepared

**Documentation:**
- Comprehensive READMEs for all packages
- MONOREPO-MIGRATION.md guide
- Webhook QUICKSTART.md for 5-minute deployment

### Phase 8.2: UI Polish ✓

**Components:**
- LoadingSpinner component with three sizes (small, medium, large)
- ProgressBar component with color variants (blue, green, yellow, red)
- Empty state messages throughout (parts list, stock library, assemblies)
- Theme transition improvements (smooth 200ms transitions)
- Confirmation dialog enhancements (danger variant, keyboard shortcuts)

**Styling:**
- All components use CSS variables from index.css
- No Tailwind classes (removed during Phase 8.2 completion)
- Consistent icon usage with Lucide React
- `.placeholder-text` class for empty states

### Phase 8.3: Welcome Tutorial & First-Run Experience ✓

**First-Run System:**
- First-run detection via electron-store preference
- Sample desk project (60"W x 30"D x 30"H with drawers)
- Tutorial auto-starts after license validation on first launch
- Tutorial completion persisted

**Tutorial Components:**
- TutorialOverlay with spotlight effect and dark backdrop
- TutorialTooltip with progress bar and step counter
- Interactive navigation (Next, Previous, Skip)
- Keyboard shortcuts (Enter, Escape, Arrow keys)

**Tutorial Steps (8 total):**
1. Welcome introduction
2. 3D Workspace controls (orbit, pan, zoom, focus)
3. Parts list (select, multi-select, grouping)
4. Stock materials (assignment, drag to create)
5. Properties panel (dimensions, stock, multi-edit)
6. Cut list generation
7. Keyboard shortcuts reference
8. Final encouragement

**Styling:**
- All tutorial components use CSS classes from index.css
- Uses `--color-accent` for highlights and borders
- Smooth animations and transitions

### Phase 9: Testing ✓

**Test Infrastructure:**
- Vitest configured for unit/integration tests
- Testing Library for component testing
- Playwright for E2E tests
- GitHub Actions CI/CD pipeline
- Coverage reporting (80% threshold)

**Test Coverage:**
- Unit tests: fractions.ts (44 tests), snapToPartsUtil.ts (19 tests)
- Component tests: Mock setup for Three.js and Electron APIs
- E2E tests: Happy path workflow, license verification
- Total: 63 tests passing

**CI/CD Pipeline:**
- Automated testing on push/PR (Ubuntu, macOS, Windows)
- Unit tests run on all platforms
- E2E tests run on Ubuntu and macOS
- Lint and type checking
- Code coverage upload to Codecov

**Test Commands:**
- `npm run test` - Run all tests
- `npm run test:unit` - Unit/integration tests
- `npm run test:watch` - Watch mode
- `npm run test:coverage` - Coverage report
- `npm run test:e2e` - E2E tests with Playwright

## What's Working Now

### End-to-End Workflow

1. **Design:** Create parts in 3D, assign stocks, group assemblies
2. **Precision:** Use snapping, guides, and references for accurate placement
3. **Optimize:** Generate cut list with bin-packing algorithm
4. **Plan:** Review cutting diagrams and shopping list
5. **Export:** Print or export cut list/diagrams to PDF/CSV
6. **Save:** Save project to .carvd file for later
7. **Reuse:** Save composites to library for future projects

### Key Features Available

- Full 3D workspace with camera controls
- Part creation, editing, duplication, deletion
- Multi-select and bulk operations
- Undo/redo (100 history entries)
- Stock library management (app-level + project-level)
- Composite assemblies (reusable templates)
- Advanced snapping (parts, guides, equal spacing, dimensions)
- Reference parts for precision mode
- Hierarchical grouping with Figma-style interaction
- Cut list generation with optimized layouts
- Shopping list with cost estimates
- File save/load with auto-recovery
- License verification for distribution
- Welcome tutorial for first-time users

### Keyboard Shortcuts Summary

| Shortcut | Action |
|----------|--------|
| Cmd+N | New project |
| Cmd+O | Open project |
| Cmd+S | Save |
| Cmd+Shift+S | Save As |
| Cmd+Z | Undo |
| Cmd+Shift+Z / Cmd+Y | Redo |
| Cmd+C | Copy |
| Cmd+V | Paste |
| Cmd+A | Select All |
| Cmd+D / Shift+D | Duplicate |
| Delete / Backspace | Delete selected |
| Escape | Deselect / exit mode / clear references |
| X / Y / Z | Rotate on axis |
| G | Create group |
| Cmd+Shift+G | Ungroup |
| R | Toggle reference mode |
| F | Focus camera on selection |
| Home | Reset camera view |
| Arrow keys | Nudge selected parts |

## Up Next

### Phase 10: Starter Templates & Sample Projects

- [ ] Built-in project templates (table, bookshelf, cabinet, workbench, desk)
- [ ] Template browser UI
- [ ] "New from Template" workflow

## Feature Highlights

### What Makes Carvd Studio Unique

1. **Offline-Only** - No accounts, no cloud, your data stays local
2. **Furniture-Focused** - Terminology and workflow designed for woodworkers
3. **Optimized Cut Lists** - Guillotine bin-packing reduces waste
4. **Reusable Composites** - Build once, place multiple times
5. **Advanced Snapping** - Equal spacing, dimension matching, persistent guides
6. **Reference Parts** - Mark parts for precision alignment
7. **License System** - Offline verification with no server dependency

### Performance Optimizations

- Snap detection limited to N nearest parts
- Undo/redo limited to 100 entries
- Debounced auto-recovery (2 minute interval)
- Cross-instance sync via file watching (not polling)
- Part meshes reused when possible

## Known Limitations (By Design)

These are intentional constraints for v1:

1. **Boxes only** - No curves, splines, or organic shapes
2. **Axis-aligned** - 90° rotation increments only
3. **Guillotine cuts** - Table saw workflow, no nested cuts
4. **No joinery modeling** - Joinery adjustments for cut list only
5. **No CNC export** - Focused on hand/table saw workflows
6. **No cloud features** - Offline-only, no collaboration
7. **No photorealistic rendering** - Functional 3D view only

---

**Current Focus:** Preparing starter templates and polishing for 1.0 release.
