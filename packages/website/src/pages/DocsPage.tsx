import React from 'react';
import BuyButton from '../components/BuyButton';
import {
  Package, RefreshCw, Layers, Lock, FolderOpen, Pencil, MousePointer,
  Ruler, Settings, BarChart3, ShoppingCart, AlertTriangle, Upload,
  Save, Download, ClipboardList, Move, MapPin, Wrench,
} from 'lucide-react';

export default function DocsPage() {
  return (
    <div className="page bg-gradient-radial">
      {/* Header */}
      <header className="header">
        <nav className="nav container">
          <a href="/" className="nav-brand">Carvd Studio</a>
          <div className="nav-links">
            <a href="/features" className="nav-link">Features</a>
            <a href="/pricing" className="nav-link">Pricing</a>
            <a href="/docs" className="nav-link">Docs</a>
            <a href="/download" className="btn btn-highlight btn-sm">Download</a>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="page-content container">
        <div className="py-3xl">
          {/* Page Header */}
          <div className="text-center mb-2xl">
            <h1 className="text-6xl font-bold mb-lg">Documentation</h1>
            <p className="text-xl text-muted max-w-2xl mx-auto">
              Everything you need to design furniture like a pro.
            </p>
          </div>

          <div className="docs-layout">
            {/* Sidebar Navigation (Desktop) */}
            <aside className="docs-sidebar">
              <nav className="docs-sidebar-inner">
                <div className="docs-nav-section">
                  <h3 className="docs-nav-title">Getting Started</h3>
                  <ul className="docs-nav-list">
                    <li><a href="#quick-start" className="docs-nav-link">Quick Start Guide</a></li>
                    <li><a href="#interface" className="docs-nav-link">Interface Overview</a></li>
                    <li><a href="#first-project" className="docs-nav-link">Your First Project</a></li>
                  </ul>
                </div>
                <div className="docs-nav-section">
                  <h3 className="docs-nav-title">Core Features</h3>
                  <ul className="docs-nav-list">
                    <li><a href="#parts" className="docs-nav-link">Working with Parts</a></li>
                    <li><a href="#stock" className="docs-nav-link">Stock Materials</a></li>
                    <li><a href="#groups" className="docs-nav-link">Groups & Organization</a></li>
                    <li><a href="#cut-lists" className="docs-nav-link">Cut List Generation</a></li>
                  </ul>
                </div>
                <div className="docs-nav-section">
                  <h3 className="docs-nav-title">Advanced Features</h3>
                  <ul className="docs-nav-list">
                    <li><a href="#assemblies" className="docs-nav-link">Assemblies</a></li>
                    <li><a href="#templates" className="docs-nav-link">Templates</a></li>
                    <li><a href="#snapping" className="docs-nav-link">Snapping & Alignment</a></li>
                    <li><a href="#joinery" className="docs-nav-link">Joinery Allowances</a></li>
                  </ul>
                </div>
                <div className="docs-nav-section">
                  <h3 className="docs-nav-title">Reference</h3>
                  <ul className="docs-nav-list">
                    <li><a href="#shortcuts" className="docs-nav-link">Keyboard Shortcuts</a></li>
                    <li><a href="#settings" className="docs-nav-link">Settings & Preferences</a></li>
                    <li><a href="#requirements" className="docs-nav-link">System Requirements</a></li>
                    <li><a href="#troubleshooting" className="docs-nav-link">Troubleshooting</a></li>
                    <li><a href="#faq" className="docs-nav-link">FAQ</a></li>
                    <li><a href="/changelog" className="docs-nav-link">Changelog</a></li>
                  </ul>
                </div>
              </nav>
            </aside>

            {/* Main Content Area */}
            <div className="docs-content">
              {/* Mobile TOC */}
              <nav className="docs-mobile-toc">
                <h2 className="docs-mobile-toc-title">Contents</h2>
                <div className="docs-mobile-toc-grid">
                  <div>
                    <p className="font-bold mb-sm text-sm">Getting Started</p>
                    <ul className="text-muted grid gap-xs text-sm">
                      <li><a href="#quick-start" className="nav-link">Quick Start Guide</a></li>
                      <li><a href="#interface" className="nav-link">Interface Overview</a></li>
                      <li><a href="#first-project" className="nav-link">Your First Project</a></li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-bold mb-sm text-sm">Core Features</p>
                    <ul className="text-muted grid gap-xs text-sm">
                      <li><a href="#parts" className="nav-link">Working with Parts</a></li>
                      <li><a href="#stock" className="nav-link">Stock Materials</a></li>
                      <li><a href="#groups" className="nav-link">Groups & Organization</a></li>
                      <li><a href="#cut-lists" className="nav-link">Cut List Generation</a></li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-bold mb-sm text-sm">Advanced Features</p>
                    <ul className="text-muted grid gap-xs text-sm">
                      <li><a href="#assemblies" className="nav-link">Assemblies</a></li>
                      <li><a href="#templates" className="nav-link">Templates</a></li>
                      <li><a href="#snapping" className="nav-link">Snapping & Alignment</a></li>
                      <li><a href="#joinery" className="nav-link">Joinery Allowances</a></li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-bold mb-sm text-sm">Reference</p>
                    <ul className="text-muted grid gap-xs text-sm">
                      <li><a href="#shortcuts" className="nav-link">Keyboard Shortcuts</a></li>
                      <li><a href="#settings" className="nav-link">Settings & Preferences</a></li>
                      <li><a href="#troubleshooting" className="nav-link">Troubleshooting</a></li>
                      <li><a href="#faq" className="nav-link">FAQ</a></li>
                      <li><a href="/changelog" className="nav-link">Changelog</a></li>
                    </ul>
                  </div>
                </div>
              </nav>

              {/* Quick Start Guide */}
            <section id="quick-start" className="mb-3xl">
              <h2 className="text-4xl font-bold mb-xl">Quick Start Guide</h2>
              <div className="accent-box-highlight mb-lg">
                <p className="text-lg font-semibold mb-sm">From Download to First Design in Under 10 Minutes</p>
                <p className="text-muted">
                  Most users are designing their first project within minutes. Here's how to get started fast.
                </p>
              </div>

              <div className="grid gap-2xl">
                <div className="card">
                  <div className="flex items-center gap-md mb-md">
                    <div className="text-4xl font-bold text-primary">1</div>
                    <h3 className="card-title mb-0">Download & Install</h3>
                  </div>
                  <p className="card-description mb-md">
                    <strong>For macOS:</strong> Download the .dmg file, open it, and drag Carvd Studio to your
                    Applications folder. Double-click to launch.
                  </p>
                  <p className="card-description mb-md">
                    <strong>For Windows:</strong> Download the .exe installer, run it, and follow the prompts.
                    The installer handles everything automatically.
                  </p>
                  <div className="accent-box">
                    <p className="text-sm font-semibold mb-sm">First Launch Security Warning</p>
                    <p className="text-sm text-muted">
                      <strong>macOS:</strong> If you see "can't be opened because Apple cannot check it for malicious software",
                      right-click the app, select "Open", then click "Open" in the dialog.
                    </p>
                    <p className="text-sm text-muted mt-sm">
                      <strong>Windows:</strong> If SmartScreen appears, click "More info" then "Run anyway".
                    </p>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center gap-md mb-md">
                    <div className="text-4xl font-bold text-primary">2</div>
                    <h3 className="card-title mb-0">Start Your Free Trial</h3>
                  </div>
                  <p className="card-description mb-md">
                    On first launch, your <strong>14-day free trial</strong> starts automatically with full access to all features.
                    No credit card required. No account needed.
                  </p>
                  <p className="card-description">
                    After the trial, you can purchase a license to keep all features, or continue with the free version
                    (limited to 10 parts, no cut list optimizer).
                  </p>
                </div>

                <div className="card">
                  <div className="flex items-center gap-md mb-md">
                    <div className="text-4xl font-bold text-primary">3</div>
                    <h3 className="card-title mb-0">Create Your First Project</h3>
                  </div>
                  <p className="card-description mb-md">
                    Click <strong>"New Project"</strong> from the Start Screen. Choose your preferred units (imperial or metric)
                    and grid size, then click Create.
                  </p>
                  <ul className="grid gap-sm text-muted text-sm">
                    <li>• Press <code>P</code> to add a new part</li>
                    <li>• Click and drag parts to position them</li>
                    <li>• Select a part and use the side panel to edit dimensions</li>
                    <li>• Press <code>X</code>, <code>Y</code>, or <code>Z</code> to rotate 90°</li>
                    <li>• Use <code>Cmd/Ctrl + S</code> to save your project</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Interface Overview */}
            <section id="interface" className="mb-3xl mt-3xl">
              <h2 className="text-4xl font-bold mb-xl">Interface Overview</h2>

              <div className="accent-box mb-lg">
                <h3 className="text-xl font-bold mb-md">Main Workspace Layout</h3>
                <div className="grid gap-md text-sm">
                  <div>
                    <p className="font-bold mb-xs">3D Workspace (Center/Right)</p>
                    <p className="text-muted">
                      The main design area. Click and drag to rotate the view. Scroll to zoom. Hold Shift and drag
                      (or use middle mouse button) to pan. Click parts to select them.
                    </p>
                  </div>
                  <div>
                    <p className="font-bold mb-xs">Parts List (Left Sidebar)</p>
                    <p className="text-muted">
                      Hierarchical tree view of all parts and groups. Click to select, double-click groups to enter
                      them, drag to reorder. Shows part counts and group structure.
                    </p>
                  </div>
                  <div>
                    <p className="font-bold mb-xs">Properties Panel (Right Side)</p>
                    <p className="text-muted">
                      When a part is selected, edit its dimensions, position, rotation, stock assignment, color,
                      grain settings, and notes here.
                    </p>
                  </div>
                  <div>
                    <p className="font-bold mb-xs">Toolbar (Top)</p>
                    <p className="text-muted">
                      Quick access to add parts, manage stock, generate cut lists, adjust view settings,
                      and access project settings.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-lg">
                <div className="card">
                  <h3 className="card-title">Camera Controls</h3>
                  <ul className="text-muted text-sm grid gap-xs">
                    <li>• <strong>Rotate:</strong> Click and drag in empty space</li>
                    <li>• <strong>Zoom:</strong> Scroll wheel or pinch gesture</li>
                    <li>• <strong>Pan:</strong> Shift + drag, or middle mouse button</li>
                    <li>• <strong>Focus:</strong> Press <code>F</code> to center on selection</li>
                    <li>• <strong>Reset:</strong> Press <code>Home</code> to return to origin</li>
                  </ul>
                </div>
                <div className="card">
                  <h3 className="card-title">Selection</h3>
                  <ul className="text-muted text-sm grid gap-xs">
                    <li>• <strong>Select:</strong> Click any part</li>
                    <li>• <strong>Multi-select:</strong> Shift + click to add to selection</li>
                    <li>• <strong>Select All:</strong> <code>Cmd/Ctrl + A</code></li>
                    <li>• <strong>Deselect:</strong> Press <code>Escape</code> or click empty space</li>
                    <li>• <strong>Select from List:</strong> Click parts in the sidebar</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* First Project */}
            <section id="first-project" className="mb-3xl mt-3xl">
              <h2 className="text-4xl font-bold mb-xl">Your First Project</h2>

              <div className="grid gap-xl">
                <div className="accent-box">
                  <h3 className="text-xl font-bold mb-md">Step 1: Set Up Your Stock Materials</h3>
                  <p className="text-muted mb-md">
                    Before adding parts, set up the materials you'll be using. Click the <strong>Stock Library</strong> button
                    in the toolbar.
                  </p>
                  <ul className="text-muted text-sm grid gap-sm">
                    <li>• Click <strong>"Add Stock"</strong> to create a new material</li>
                    <li>• Enter the dimensions of your lumber (e.g., 96" × 11.25" × 0.75" for a 1×12 board)</li>
                    <li>• Set the grain direction (length, width, or none for plywood)</li>
                    <li>• Enter your price per board foot or per item</li>
                    <li>• Choose a color for visual identification</li>
                  </ul>
                  <p className="text-muted mt-md text-sm">
                    <strong>Pro tip:</strong> The library includes common lumber sizes. Click "Import from Library" to quickly add standard materials.
                  </p>
                </div>

                <div className="accent-box">
                  <h3 className="text-xl font-bold mb-md">Step 2: Add Parts</h3>
                  <p className="text-muted mb-md">
                    Press <code>P</code> or click <strong>"Add Part"</strong> in the toolbar. A new part appears at the origin.
                  </p>
                  <ul className="text-muted text-sm grid gap-sm">
                    <li>• Enter dimensions in the properties panel (length × width × thickness)</li>
                    <li>• Assign a stock material from the dropdown</li>
                    <li>• The part color automatically matches the assigned stock</li>
                    <li>• Give it a descriptive name (e.g., "Top Shelf", "Left Side")</li>
                  </ul>
                </div>

                <div className="accent-box">
                  <h3 className="text-xl font-bold mb-md">Step 3: Position & Arrange</h3>
                  <p className="text-muted mb-md">
                    Click and drag parts to move them. Parts snap to the grid and to each other for easy alignment.
                  </p>
                  <ul className="text-muted text-sm grid gap-sm">
                    <li>• <strong>Drag:</strong> Move parts in the horizontal plane</li>
                    <li>• <strong>Arrow keys:</strong> Nudge parts precisely (Shift for 1" increments)</li>
                    <li>• <strong>X/Y/Z keys:</strong> Rotate 90° around each axis</li>
                    <li>• <strong>Snapping:</strong> Parts automatically align to edges and centers</li>
                  </ul>
                </div>

                <div className="accent-box">
                  <h3 className="text-xl font-bold mb-md">Step 4: Generate Cut List</h3>
                  <p className="text-muted mb-md">
                    Once all parts have stock assigned, click <strong>"Generate Cut List"</strong> in the toolbar.
                  </p>
                  <ul className="text-muted text-sm grid gap-sm">
                    <li>• <strong>Parts Tab:</strong> View all parts grouped by dimensions</li>
                    <li>• <strong>Diagrams Tab:</strong> See optimized cutting layouts for each board</li>
                    <li>• <strong>Shopping Tab:</strong> Get a complete list of materials to buy with costs</li>
                    <li>• <strong>Export:</strong> Save as PDF for printing or CSV for spreadsheets</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Working with Parts */}
            <section id="parts" className="mb-3xl mt-3xl">
              <h2 className="text-4xl font-bold mb-xl">Working with Parts</h2>

              <div className="grid gap-2xl">
                <div className="accent-box">
                  <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
                    <Package size={24} /> Part Properties
                  </h3>
                  <div className="grid gap-md">
                    <div>
                      <h4 className="font-bold mb-sm">Dimensions</h4>
                      <p className="text-muted text-sm">
                        Every part has three dimensions: <strong>length</strong>, <strong>width</strong>, and <strong>thickness</strong>.
                        Enter values in inches (imperial) or millimeters (metric). Supports fractional inches like "2 3/4" or "2-3/4".
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold mb-sm">Position & Rotation</h4>
                      <p className="text-muted text-sm">
                        Parts are positioned in 3D space (X, Y, Z coordinates). Rotation is in 90° increments around each axis.
                        Parts cannot go below the ground plane (Y=0).
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold mb-sm">Stock Assignment</h4>
                      <p className="text-muted text-sm">
                        Assign a stock material to each part. The part inherits the stock's color and is included in cut list
                        calculations. Parts without stock are excluded from cut lists.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold mb-sm">Grain Direction</h4>
                      <p className="text-muted text-sm">
                        For wood parts, set whether the grain runs along the <strong>length</strong> or <strong>width</strong>.
                        Mark parts as <strong>grain-sensitive</strong> to prevent rotation during cut list optimization.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold mb-sm">Notes</h4>
                      <p className="text-muted text-sm">
                        Add fabrication or assembly notes to any part (e.g., "edge band front", "drill pocket holes").
                        Notes appear in the cut list for reference during building.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold mb-sm">Allow Overlap</h4>
                      <p className="text-muted text-sm">
                        When <strong>Prevent Overlap</strong> is enabled in project settings, parts normally cannot be dragged
                        through each other. Check <strong>"Allow Overlap"</strong> on a specific part to exempt it from
                        overlap prevention, useful for intentional intersections like mortise-and-tenon joints or decorative overlays.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="accent-box">
                  <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
                    <RefreshCw size={24} /> Part Operations
                  </h3>
                  <div className="grid grid-cols-2 gap-md text-sm">
                    <div>
                      <p className="font-bold mb-xs">Copy & Paste</p>
                      <p className="text-muted"><code>Cmd/Ctrl + C</code> to copy, <code>Cmd/Ctrl + V</code> to paste</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Duplicate</p>
                      <p className="text-muted"><code>Shift + D</code> creates an offset copy</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Delete</p>
                      <p className="text-muted"><code>Delete</code> or <code>Backspace</code> (with confirmation)</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Rotate</p>
                      <p className="text-muted"><code>X</code>, <code>Y</code>, <code>Z</code> for 90° rotation</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Move</p>
                      <p className="text-muted">Arrow keys (Shift for 1" nudge, normal for grid snap)</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Focus</p>
                      <p className="text-muted"><code>F</code> centers camera on selection</p>
                    </div>
                  </div>
                </div>

                <div className="accent-box">
                  <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
                    <Layers size={24} /> Glue-Up Panels
                  </h3>
                  <p className="text-muted mb-md">
                    Need a wide panel from narrow boards? Enable <strong>"Glue-Up Panel"</strong> in part properties.
                  </p>
                  <ul className="text-muted text-sm grid gap-sm">
                    <li>• The cut list optimizer automatically calculates how many strips you need</li>
                    <li>• Set your maximum board width, and strips are calculated accordingly</li>
                    <li>• Accounts for jointing loss between strips</li>
                    <li>• Perfect for tabletops, wide shelves, and panel construction</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Stock Materials */}
            <section id="stock" className="mb-3xl mt-3xl">
              <h2 className="text-4xl font-bold mb-xl">Stock Materials</h2>

              <div className="grid gap-2xl">
                <div className="accent-box">
                  <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
                    <Layers size={24} /> Managing Your Stock Library
                  </h3>
                  <p className="text-muted mb-md">
                    The stock library stores all your lumber and sheet goods. Set up your materials once,
                    and they're available for all your projects.
                  </p>
                  <div className="grid gap-md">
                    <div>
                      <h4 className="font-bold mb-sm">Stock Properties</h4>
                      <ul className="text-muted text-sm grid gap-xs">
                        <li>• <strong>Dimensions:</strong> Length × Width × Thickness (the actual board size you buy)</li>
                        <li>• <strong>Grain Direction:</strong> Length (solid wood), Width, or None (plywood/MDF)</li>
                        <li>• <strong>Pricing:</strong> Per board foot or per item (for sheet goods)</li>
                        <li>• <strong>Color:</strong> Visual identification in the 3D workspace</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold mb-sm">Built-in Library</h4>
                      <p className="text-muted text-sm">
                        Common lumber sizes are pre-configured. Click "Import from Library" to quickly add standard
                        materials like 1×4, 2×4, plywood sheets, etc.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="accent-box">
                  <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
                    <Lock size={24} /> Stock Constraints
                  </h3>
                  <p className="text-muted mb-md">
                    Stock constraints help prevent mistakes by enforcing rules about how parts relate to their assigned stock.
                  </p>
                  <div className="grid grid-cols-2 gap-md text-sm">
                    <div>
                      <p className="font-bold mb-xs">Dimension Constraints</p>
                      <p className="text-muted">Prevent parts from exceeding stock dimensions. Get warnings before cut list generation.</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Grain Constraints</p>
                      <p className="text-muted">Lock grain direction to match stock. Parts inherit grain settings from their stock.</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Color Constraints</p>
                      <p className="text-muted">Lock part colors to stock colors. Changing stock automatically updates part appearance.</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Overlap Prevention</p>
                      <p className="text-muted">Detect and warn when parts occupy the same space (unless intentionally flagged).</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Groups */}
            <section id="groups" className="mb-3xl mt-3xl">
              <h2 className="text-4xl font-bold mb-xl">Groups & Organization</h2>

              <div className="grid gap-2xl">
                <div className="accent-box">
                  <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
                    <FolderOpen size={24} /> Creating Groups
                  </h3>
                  <p className="text-muted mb-md">
                    Groups help organize complex projects. Select two or more parts and press <code>G</code> to group them.
                  </p>
                  <ul className="text-muted text-sm grid gap-sm">
                    <li>• Groups can contain parts and other groups (hierarchical nesting)</li>
                    <li>• Grouped parts move, rotate, and duplicate together</li>
                    <li>• The sidebar shows your group structure as an expandable tree</li>
                    <li>• Example: Cabinet → Drawer Assembly → Front, Sides, Bottom, Back</li>
                  </ul>
                </div>

                <div className="accent-box">
                  <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
                    <Pencil size={24} /> Editing Groups
                  </h3>
                  <div className="grid gap-md text-sm">
                    <div>
                      <p className="font-bold mb-xs">Enter Group (Edit Mode)</p>
                      <p className="text-muted">
                        Double-click a group in the <strong>3D view</strong> or <strong>sidebar</strong> to enter it.
                        Once inside, you can select and edit individual parts within the group.
                      </p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Exit Group</p>
                      <p className="text-muted">
                        <strong>Double-click</strong> on the background (ground or sky) to exit one level at a time.
                        For nested groups, double-click multiple times to exit each level.
                        You can also press <code>Escape</code> to exit one level.
                      </p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Select Within Groups</p>
                      <p className="text-muted">
                        <strong>Single-click</strong> on the background to deselect parts while staying inside the group.
                        Use <code>Shift + Click</code> to add parts or subgroups to your selection.
                      </p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Ungroup</p>
                      <p className="text-muted">Select a group and press <code>Cmd/Ctrl + Shift + G</code> to dissolve it.</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Rename</p>
                      <p className="text-muted">Right-click a group in the sidebar to rename it.</p>
                    </div>
                  </div>
                </div>

                <div className="accent-box">
                  <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
                    <MousePointer size={24} /> 3D Editor Selection
                  </h3>
                  <div className="grid gap-md text-sm">
                    <div>
                      <p className="font-bold mb-xs">Click</p>
                      <p className="text-muted">Select a single part or group. Clicking elsewhere deselects.</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Shift + Click</p>
                      <p className="text-muted">Add or remove items from your selection. Works with both parts and groups.</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Double-Click Part</p>
                      <p className="text-muted">If the part is in a group, enters that group for editing.</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Double-Click Background</p>
                      <p className="text-muted">Exits the current group editing mode (one level at a time).</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Click Outside Group (While Editing)</p>
                      <p className="text-muted">
                        When you're inside a group, clicking on parts in other groups or on the background just deselects —
                        it won't exit the group or select the clicked item. Double-click the background to exit the group first.
                      </p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Cmd/Ctrl + Drag</p>
                      <p className="text-muted">Box selection — drag a rectangle to select multiple parts at once.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Cut List Generation */}
            <section id="cut-lists" className="mb-3xl mt-3xl">
              <h2 className="text-4xl font-bold mb-xl">Cut List Generation</h2>

              <div className="grid gap-2xl">
                <div className="accent-box-highlight">
                  <p className="text-lg font-semibold mb-sm">The Heart of Carvd Studio</p>
                  <p className="text-muted">
                    The cut list optimizer analyzes your design and finds the most efficient way to cut your materials.
                    It minimizes waste, calculates costs, and generates workshop-ready cutting diagrams.
                  </p>
                </div>

                <div className="accent-box">
                  <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
                    <Ruler size={24} /> Generating a Cut List
                  </h3>
                  <ol className="text-muted text-sm grid gap-sm">
                    <li><strong>1. Assign stock to all parts</strong> — Parts without stock are excluded from the cut list.</li>
                    <li><strong>2. Click "Generate Cut List"</strong> — The optimizer runs and creates your cut list.</li>
                    <li><strong>3. Review validation warnings</strong> — Fix any issues (parts too large, grain mismatches, etc.).</li>
                    <li><strong>4. Explore the three tabs:</strong>
                      <ul className="mt-sm ml-lg">
                        <li>• <strong>Parts:</strong> All parts grouped by matching dimensions</li>
                        <li>• <strong>Diagrams:</strong> Visual cutting layouts for each board</li>
                        <li>• <strong>Shopping:</strong> Complete material list with costs</li>
                      </ul>
                    </li>
                    <li><strong>5. Export as PDF</strong> — Print diagrams for the workshop.</li>
                  </ol>
                </div>

                <div className="accent-box">
                  <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
                    <Settings size={24} /> Cut List Settings
                  </h3>
                  <div className="grid gap-md text-sm">
                    <div>
                      <p className="font-bold mb-xs">Kerf Width</p>
                      <p className="text-muted">
                        The width of your saw blade cut (default: 1/8"). The optimizer accounts for kerf when laying out parts,
                        ensuring pieces actually fit on your boards.
                      </p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Overage Factor</p>
                      <p className="text-muted">
                        Extra material padding (default: 10%). Accounts for defects, mistakes, and material variation.
                        A 10% overage on a project needing 9 boards means the shopping list shows 10.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="accent-box">
                  <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
                    <BarChart3 size={24} /> Understanding the Results
                  </h3>
                  <div className="grid gap-md text-sm">
                    <div>
                      <p className="font-bold mb-xs">Parts Tab</p>
                      <p className="text-muted">
                        Shows all parts grouped by matching cut dimensions. Multiple identical parts are consolidated
                        with a quantity count. Great for labeling and tracking during construction.
                      </p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Diagrams Tab</p>
                      <p className="text-muted">
                        Visual layouts showing exactly where to cut each part on each board. Color-coded parts match
                        your 3D view. Print these and take them to the workshop.
                      </p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Shopping Tab</p>
                      <p className="text-muted">
                        Complete material list: how many boards of each type, board feet needed, linear feet, cost per material,
                        total cost, waste percentage, and utilization efficiency.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="accent-box">
                  <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
                    <ShoppingCart size={24} /> Custom Shopping Items
                  </h3>
                  <p className="text-muted mb-md">
                    Add non-lumber items to your shopping list: hardware, screws, glue, finish, etc.
                  </p>
                  <ul className="text-muted text-sm grid gap-sm">
                    <li>• Click "Add Item" in the Shopping tab</li>
                    <li>• Enter name, quantity, and unit price</li>
                    <li>• Optional: add description and category</li>
                    <li>• Custom items persist when you regenerate the cut list</li>
                    <li>• Total project cost includes all custom items</li>
                  </ul>
                </div>

                <div className="accent-box">
                  <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
                    <AlertTriangle size={24} /> Validation Warnings
                  </h3>
                  <p className="text-muted mb-md">
                    The optimizer validates your design before generating cut lists. Here's what each warning means:
                  </p>
                  <div className="grid gap-sm text-sm">
                    <div>
                      <p className="font-bold text-warning">Part exceeds stock dimensions</p>
                      <p className="text-muted">The part is larger than the stock it's assigned to. Use larger stock or resize the part.</p>
                    </div>
                    <div>
                      <p className="font-bold text-warning">Thickness mismatch</p>
                      <p className="text-muted">Part thickness doesn't match stock thickness. Assign different stock or adjust thickness.</p>
                    </div>
                    <div>
                      <p className="font-bold text-warning">Grain direction mismatch</p>
                      <p className="text-muted">Part's grain orientation conflicts with stock. Rotate the part or adjust grain settings.</p>
                    </div>
                    <div>
                      <p className="font-bold text-warning">No stock assigned</p>
                      <p className="text-muted">Part has no stock material. Assign a stock to include it in the cut list.</p>
                    </div>
                  </div>
                </div>

                <div className="accent-box">
                  <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
                    <Upload size={24} /> Exporting Your Work
                  </h3>
                  <p className="text-muted mb-md">
                    Each tab has a Download dropdown with export options. Plus, use the "Download Project Report" button
                    to get everything in one comprehensive PDF.
                  </p>
                  <div className="grid gap-md text-sm">
                    <div>
                      <p className="font-bold mb-xs">Download Project Report</p>
                      <p className="text-muted">
                        One-click comprehensive PDF export that includes: a cover page with project thumbnail and summary,
                        the complete parts list, all cutting diagrams, and the full shopping list with costs. Perfect for
                        workshop reference or client presentations.
                      </p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Per-Tab Exports</p>
                      <p className="text-muted">
                        Each tab has its own download dropdown:
                      </p>
                      <ul className="text-muted ml-lg mt-sm">
                        <li>• <strong>Parts Tab:</strong> PDF (formatted table) or CSV (for spreadsheets)</li>
                        <li>• <strong>Diagrams Tab:</strong> PDF with visual cutting layouts for each board</li>
                        <li>• <strong>Shopping Tab:</strong> PDF or CSV with all materials and costs</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">PDF vs CSV</p>
                      <p className="text-muted">
                        <strong>PDF:</strong> Best for printing and taking to the workshop. Includes visual layouts, formatted tables,
                        and a "Generated by Carvd Studio" watermark. <strong>CSV:</strong> Best for importing into spreadsheets,
                        lumber calculators, or accounting software.
                      </p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">License Requirement</p>
                      <p className="text-muted">
                        PDF export requires a licensed version. CSV export is available in all versions including free mode.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Assemblies */}
            <section id="assemblies" className="mb-3xl mt-3xl">
              <h2 className="text-4xl font-bold mb-xl">Assemblies</h2>

              <div className="grid gap-2xl">
                <div className="accent-box-highlight">
                  <p className="text-lg font-semibold mb-sm">Reusable Multi-Part Templates</p>
                  <p className="text-muted">
                    Assemblies let you save groups of parts as reusable templates. Design a drawer box once,
                    save it as an assembly, and drop it into any project.
                  </p>
                </div>

                <div className="accent-box">
                  <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
                    <Save size={24} /> Creating an Assembly
                  </h3>
                  <ol className="text-muted text-sm grid gap-sm">
                    <li><strong>1.</strong> Create and arrange the parts you want in your assembly</li>
                    <li><strong>2.</strong> Select all the parts (Cmd/Ctrl + click or use grouping)</li>
                    <li><strong>3.</strong> Right-click and select "Save as Assembly"</li>
                    <li><strong>4.</strong> Give it a name and optional description</li>
                    <li><strong>5.</strong> The assembly is saved to your library</li>
                  </ol>
                  <p className="text-muted text-sm mt-md">
                    <strong>Note:</strong> Assemblies include embedded stock snapshots, so they work even if you change your project stocks later.
                  </p>
                </div>

                <div className="accent-box">
                  <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
                    <Download size={24} /> Using an Assembly
                  </h3>
                  <ol className="text-muted text-sm grid gap-sm">
                    <li><strong>1.</strong> Click "Add Assembly" in the toolbar</li>
                    <li><strong>2.</strong> Browse your assembly library and select one</li>
                    <li><strong>3.</strong> Map assembly stocks to your project stocks</li>
                    <li><strong>4.</strong> Click "Place" to add it to your project</li>
                    <li><strong>5.</strong> Position the assembly in your design</li>
                  </ol>
                  <p className="text-muted text-sm mt-md">
                    Placed assemblies become regular parts and groups—you can edit them freely.
                  </p>
                </div>

                <div className="accent-box">
                  <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
                    <Pencil size={24} /> Editing an Assembly
                  </h3>
                  <p className="text-muted mb-md">
                    You can edit assemblies directly in a 3D editing mode:
                  </p>
                  <ul className="text-muted text-sm grid gap-sm">
                    <li>• Open the assembly library and click "Edit" on any assembly</li>
                    <li>• The assembly opens in a dedicated editing workspace</li>
                    <li>• Make changes to parts, positions, or properties</li>
                    <li>• Click "Save" to update the assembly, or "Cancel" to discard changes</li>
                    <li>• Generate new thumbnail to update the preview image</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Templates */}
            <section id="templates" className="mb-3xl mt-3xl">
              <h2 className="text-4xl font-bold mb-xl">Templates</h2>

              <div className="grid gap-2xl">
                <div className="accent-box">
                  <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
                    <ClipboardList size={24} /> Built-in Templates
                  </h3>
                  <p className="text-muted mb-md">
                    Carvd Studio includes starter templates to help you learn and get started quickly:
                  </p>
                  <ul className="text-muted text-sm grid gap-sm">
                    <li>• <strong>Tutorial:</strong> A guided example to learn the basics</li>
                    <li>• <strong>Simple Desk:</strong> Basic desk design with common joinery</li>
                    <li>• <strong>Basic Bookshelf:</strong> Adjustable shelf bookcase</li>
                    <li>• <strong>End Table:</strong> Small side table with drawer</li>
                  </ul>
                  <p className="text-muted text-sm mt-md">
                    Access templates from the Start Screen or File → New from Template.
                  </p>
                </div>

                <div className="accent-box">
                  <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
                    <Save size={24} /> Custom Templates</h3>
                  <p className="text-muted mb-md">
                    Save your own projects as templates for future reuse. Great for standardized products or common starting points.
                  </p>
                  <ul className="text-muted text-sm grid gap-sm">
                    <li>• Create a project with parts, stocks, and settings you want to reuse</li>
                    <li>• Save as a template from File → Save as Template</li>
                    <li>• Templates include all project settings (units, kerf, overage, constraints)</li>
                    <li>• Start new projects from your custom templates</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Snapping & Alignment */}
            <section id="snapping" className="mb-3xl mt-3xl">
              <h2 className="text-4xl font-bold mb-xl">Snapping & Alignment</h2>

              <div className="grid gap-2xl">
                <div className="accent-box">
                  <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
                    <Move size={24} /> Smart Snapping</h3>
                  <p className="text-muted mb-md">
                    Parts automatically snap to helpful positions as you drag them:
                  </p>
                  <div className="grid grid-cols-2 gap-md text-sm">
                    <div>
                      <p className="font-bold mb-xs">Edge Snapping</p>
                      <p className="text-muted">Align part edges to other parts</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Center Snapping</p>
                      <p className="text-muted">Align part centers</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Face Snapping</p>
                      <p className="text-muted">Align opposite faces (butt joints)</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Equal Spacing</p>
                      <p className="text-muted">Detect and snap to equal gaps</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Dimension Matching</p>
                      <p className="text-muted">Snap to standard sizes (12", 24", etc.)</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Grid Snapping</p>
                      <p className="text-muted">Snap to the workspace grid</p>
                    </div>
                  </div>
                </div>

                <div className="accent-box">
                  <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
                    <MapPin size={24} /> Reference Parts</h3>
                  <p className="text-muted mb-md">
                    Mark specific parts as snap targets for precision alignment:
                  </p>
                  <ul className="text-muted text-sm grid gap-sm">
                    <li>• Select a part and press <code>R</code> to mark it as a reference</li>
                    <li>• Reference parts become priority snap targets</li>
                    <li>• Great for aligning multiple parts to a baseline</li>
                    <li>• Press <code>Escape</code> to clear reference parts</li>
                  </ul>

                  <p className="font-bold mt-lg mb-sm">Distance Indicators</p>
                  <p className="text-muted mb-sm">
                    When reference parts are set and you drag other parts, distance indicators appear:
                  </p>
                  <ul className="text-muted text-sm grid gap-sm">
                    <li>• <span style={{color: '#00d9ff'}}>Cyan lines</span> show edge-to-edge distances (gaps between parts)</li>
                    <li>• <span style={{color: '#ffcc00'}}>Yellow lines</span> show center-to-center distances</li>
                    <li>• Click on any distance label to edit it directly</li>
                    <li>• Enter a specific measurement and press <code>Enter</code> to move the part to that exact distance</li>
                    <li>• Perfect for precise spacing like "exactly 3/4 inch gap" or "centers 24 inches apart"</li>
                  </ul>
                </div>

                <div className="accent-box">
                  <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
                    <Ruler size={24} /> Snap Guides</h3>
                  <p className="text-muted mb-md">
                    Create persistent guide planes for complex alignments:
                  </p>
                  <ul className="text-muted text-sm grid gap-sm">
                    <li>• Right-click in the workspace and select "Add Guide"</li>
                    <li>• Choose the axis (X, Y, or Z) and position</li>
                    <li>• Optionally add a label (e.g., "Cabinet Top")</li>
                    <li>• Guides are saved with your project</li>
                    <li>• Parts snap to guides during dragging</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Joinery Allowances */}
            <section id="joinery" className="mb-3xl mt-3xl">
              <h2 className="text-4xl font-bold mb-xl">Joinery Allowances</h2>

              <div className="accent-box">
                <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
                  <Wrench size={24} /> Extra Material for Joinery</h3>
                <p className="text-muted mb-md">
                  When building with traditional joinery (tenons, dados, rabbets), you often need parts cut slightly
                  larger than their final assembled dimensions. Carvd Studio handles this with joinery allowances.
                </p>
                <div className="grid gap-md text-sm">
                  <div>
                    <p className="font-bold mb-xs">Extra Length</p>
                    <p className="text-muted">
                      Add material to the length for tenons or other joinery. Example: A 24" rail with 1" tenons on each
                      end needs to be cut at 26". Set Extra Length to 2".
                    </p>
                  </div>
                  <div>
                    <p className="font-bold mb-xs">Extra Width</p>
                    <p className="text-muted">
                      Add material to the width for dado insertion depth or rabbets. Example: A shelf that sits in a 1/4"
                      dado needs Extra Width of 1/4" on each side.
                    </p>
                  </div>
                  <div>
                    <p className="font-bold mb-xs">How It Works</p>
                    <p className="text-muted">
                      The 3D view shows the final assembled dimensions. The cut list includes the extra material.
                      You see the design intent in 3D, but the workshop cut list is accurate.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Complete Keyboard Shortcuts */}
            <section id="shortcuts" className="mb-3xl mt-3xl">
              <h2 className="text-4xl font-bold mb-xl">Keyboard Shortcuts</h2>

              <div className="grid grid-cols-2 gap-xl">
                <div className="card">
                  <h3 className="card-title">File Operations</h3>
                  <ul className="text-muted text-sm grid gap-xs">
                    <li><code>Cmd/Ctrl + N</code> — New project</li>
                    <li><code>Cmd/Ctrl + O</code> — Open project</li>
                    <li><code>Cmd/Ctrl + S</code> — Save project</li>
                    <li><code>Cmd/Ctrl + Shift + S</code> — Save as</li>
                  </ul>
                </div>

                <div className="card">
                  <h3 className="card-title">Edit Operations</h3>
                  <ul className="text-muted text-sm grid gap-xs">
                    <li><code>Cmd/Ctrl + Z</code> — Undo</li>
                    <li><code>Cmd/Ctrl + Shift + Z</code> — Redo</li>
                    <li><code>Cmd/Ctrl + Y</code> — Redo (Windows)</li>
                    <li><code>Cmd/Ctrl + C</code> — Copy</li>
                    <li><code>Cmd/Ctrl + V</code> — Paste</li>
                    <li><code>Cmd/Ctrl + A</code> — Select all</li>
                    <li><code>Shift + D</code> — Duplicate</li>
                    <li><code>Delete / Backspace</code> — Delete selected</li>
                  </ul>
                </div>

                <div className="card">
                  <h3 className="card-title">Part Manipulation</h3>
                  <ul className="text-muted text-sm grid gap-xs">
                    <li><code>P</code> — Add new part</li>
                    <li><code>X</code> — Rotate 90° around X axis</li>
                    <li><code>Y</code> — Rotate 90° around Y axis</li>
                    <li><code>Z</code> — Rotate 90° around Z axis</li>
                    <li><code>Arrow keys</code> — Nudge part (grid snap)</li>
                    <li><code>Shift + Arrow</code> — Nudge 1 inch</li>
                    <li><code>R</code> — Toggle reference part</li>
                  </ul>
                </div>

                <div className="card">
                  <h3 className="card-title">Grouping</h3>
                  <ul className="text-muted text-sm grid gap-xs">
                    <li><code>G</code> — Create group from selection</li>
                    <li><code>Cmd/Ctrl + Shift + G</code> — Ungroup</li>
                    <li><code>Double-click</code> — Enter group (in sidebar)</li>
                    <li><code>Escape</code> — Exit group editing</li>
                  </ul>
                </div>

                <div className="card">
                  <h3 className="card-title">View Controls</h3>
                  <ul className="text-muted text-sm grid gap-xs">
                    <li><code>F</code> — Focus on selection</li>
                    <li><code>Home</code> — Reset camera to origin</li>
                    <li><code>Escape</code> — Deselect all</li>
                    <li><code>Scroll</code> — Zoom in/out</li>
                    <li><code>Click + drag</code> — Rotate view</li>
                    <li><code>Shift + drag</code> — Pan view</li>
                    <li><code>Middle mouse drag</code> — Pan view</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Settings */}
            <section id="settings" className="mb-3xl mt-3xl">
              <h2 className="text-4xl font-bold mb-xl">Settings & Preferences</h2>

              <div className="grid gap-2xl">
                <div id="app-settings" className="accent-box">
                  <h3 className="text-2xl font-bold mb-md">App Settings</h3>
                  <p className="text-muted mb-md text-sm">
                    Access via the menu or <code>Cmd/Ctrl + ,</code>
                  </p>
                  <div className="grid gap-md text-sm">
                    <div>
                      <p className="font-bold mb-xs">Theme</p>
                      <p className="text-muted">Choose Dark, Light, or System (follows your OS preference)</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Default Units</p>
                      <p className="text-muted">Imperial (inches) or Metric (mm) for new projects</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Default Grid Size</p>
                      <p className="text-muted">The snap grid size for new projects</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Snap Sensitivity</p>
                      <p className="text-muted">Tight, Normal, or Loose — how close you need to be for snapping to activate</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Live Grid Snap</p>
                      <p className="text-muted">When on, parts snap to grid during dragging. When off, only snaps on release.</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Snap to Origin</p>
                      <p className="text-muted">Enable snapping to X=0, Y=0, Z=0 planes</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Confirm Before Delete</p>
                      <p className="text-muted">Show confirmation dialog when deleting parts</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Show Hotkey Hints</p>
                      <p className="text-muted">Display keyboard shortcuts in tooltips and menus</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Lighting Mode</p>
                      <p className="text-muted">Adjust 3D workspace lighting: Default (balanced), Bright (better for dark materials like walnut), Studio (soft, even lighting), or Dramatic (high contrast)</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Brightness</p>
                      <p className="text-muted">Fine-tune the workspace brightness (25% to 200%). Access quickly via the Sun icon in the toolbar, or through App Settings. Great for adjusting visibility based on your monitor or material colors.</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Auto-Save</p>
                      <p className="text-muted">
                        Automatically save your project 30 seconds after changes. If the project hasn't been saved to a file yet,
                        you'll be prompted to choose a save location. This works alongside the crash recovery feature for extra protection.
                      </p>
                    </div>
                  </div>
                </div>

                <div id="backup-sync" className="accent-box">
                  <h3 className="text-2xl font-bold mb-md">Backup & Sync</h3>
                  <p className="text-muted mb-md text-sm">
                    Access via App Settings → Data Management
                  </p>
                  <div className="grid gap-md text-sm">
                    <div>
                      <p className="font-bold mb-xs">Export App State</p>
                      <p className="text-muted">
                        Save your templates, assemblies, stock library, and custom colors to a <code>.carvd-backup</code> file.
                        Use this to sync your library between computers or create a backup before reinstalling.
                      </p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Import App State</p>
                      <p className="text-muted">
                        Restore from a backup file. Choose what to import (templates, assemblies, stocks, colors) and
                        how to handle duplicates — keep your existing items or replace them with the backup.
                      </p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">What's Included</p>
                      <p className="text-muted">
                        Backups include your custom templates, user-created assemblies, custom stock materials, and
                        saved colors. Built-in items (default stocks and assemblies) are not exported since they're
                        always available.
                      </p>
                    </div>
                  </div>
                </div>

                <div id="project-settings" className="accent-box">
                  <h3 className="text-2xl font-bold mb-md">Project Settings</h3>
                  <p className="text-muted mb-md text-sm">
                    Access via File → Project Settings
                  </p>
                  <div className="grid gap-md text-sm">
                    <div>
                      <p className="font-bold mb-xs">Project Name</p>
                      <p className="text-muted">The name shown in the title bar and file list</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Units</p>
                      <p className="text-muted">Imperial or Metric for this project</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Grid Size</p>
                      <p className="text-muted">Snap grid increment for this project</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Kerf Width</p>
                      <p className="text-muted">Saw blade width for cut list calculations (default: 1/8")</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Overage Factor</p>
                      <p className="text-muted">Extra material padding percentage (default: 10%)</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Project Notes</p>
                      <p className="text-muted">Free-form notes field for project documentation</p>
                    </div>
                    <div>
                      <p className="font-bold mb-xs">Stock Constraints</p>
                      <p className="text-muted">Enable/disable dimension, grain, color, and overlap constraints</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* System Requirements */}
            <section id="requirements" className="mb-3xl mt-3xl">
              <h2 className="text-4xl font-bold mb-xl">System Requirements</h2>
              <div className="grid grid-cols-2 gap-xl">
                <div className="card">
                  <h3 className="card-title">macOS</h3>
                  <ul className="checklist text-sm">
                    <li><span>macOS 10.15 (Catalina) or later</span></li>
                    <li><span>4 GB RAM minimum</span></li>
                    <li><span>200 MB available disk space</span></li>
                    <li><span>Intel or Apple Silicon processor</span></li>
                    <li><span>1280×720 minimum display resolution</span></li>
                  </ul>
                </div>

                <div className="card">
                  <h3 className="card-title">Windows</h3>
                  <ul className="checklist text-sm">
                    <li><span>Windows 10 or Windows 11 (64-bit)</span></li>
                    <li><span>4 GB RAM minimum</span></li>
                    <li><span>200 MB available disk space</span></li>
                    <li><span>Intel Core i3 or equivalent</span></li>
                    <li><span>1280×720 minimum display resolution</span></li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Troubleshooting */}
            <section id="troubleshooting" className="mb-3xl mt-3xl">
              <h2 className="text-4xl font-bold mb-xl">Troubleshooting</h2>

              <div className="grid gap-xl">
                <div className="card">
                  <h3 className="card-title">License Activation Issues</h3>
                  <p className="card-description mb-md">
                    <strong>Problem:</strong> License key not accepted or activation fails.
                  </p>
                  <ul className="text-muted text-sm grid gap-sm">
                    <li>• Make sure you're connected to the internet during activation</li>
                    <li>• Check that you copied the entire license key (no extra spaces)</li>
                    <li>• Verify the key in your purchase confirmation email</li>
                    <li>• If you've used all 3 device activations, deactivate one first (Settings → License)</li>
                    <li>• Contact support if issues persist: support@carvd-studio.com</li>
                  </ul>
                </div>

                <div className="card">
                  <h3 className="card-title">App Won't Launch</h3>
                  <p className="card-description mb-md">
                    <strong>Problem:</strong> Application doesn't open or crashes immediately.
                  </p>
                  <ul className="text-muted text-sm grid gap-sm">
                    <li>• <strong>macOS:</strong> Right-click the app and select "Open" to bypass Gatekeeper</li>
                    <li>• <strong>Windows:</strong> Run as administrator or check antivirus settings</li>
                    <li>• Ensure you meet the minimum system requirements</li>
                    <li>• Try restarting your computer</li>
                    <li>• Reinstall the application from a fresh download</li>
                  </ul>
                </div>

                <div className="card">
                  <h3 className="card-title">Recovering Lost Work</h3>
                  <p className="card-description mb-md">
                    <strong>Problem:</strong> Application crashed or closed unexpectedly.
                  </p>
                  <ul className="text-muted text-sm grid gap-sm">
                    <li>• Carvd Studio auto-saves your work periodically</li>
                    <li>• On next launch, you'll be prompted to recover unsaved changes</li>
                    <li>• Click "Recover" to restore your last auto-save</li>
                    <li>• For extra safety, save your work manually (<code>Cmd/Ctrl + S</code>) regularly</li>
                  </ul>
                </div>

                <div className="card">
                  <h3 className="card-title">Performance Issues</h3>
                  <p className="card-description mb-md">
                    <strong>Problem:</strong> Application running slowly or lagging.
                  </p>
                  <ul className="text-muted text-sm grid gap-sm">
                    <li>• Close other graphics-intensive applications</li>
                    <li>• For very large projects (100+ parts), group components to reduce rendering load</li>
                    <li>• Check that you have at least 4GB RAM available</li>
                    <li>• Update your graphics drivers to the latest version</li>
                    <li>• Restart the application if it's been running for a long time</li>
                  </ul>
                </div>

                <div className="card">
                  <h3 className="card-title">Cut List Generation Errors</h3>
                  <p className="card-description mb-md">
                    <strong>Problem:</strong> Cut list shows warnings or won't generate.
                  </p>
                  <ul className="text-muted text-sm grid gap-sm">
                    <li>• <strong>"Part exceeds stock dimensions":</strong> The part is larger than the stock. Use larger stock or resize the part.</li>
                    <li>• <strong>"No stock assigned":</strong> Assign a stock material in the part properties panel.</li>
                    <li>• <strong>"Grain direction mismatch":</strong> Part orientation conflicts with stock grain. Rotate the part or adjust grain settings.</li>
                    <li>• <strong>"Thickness mismatch":</strong> Part thickness doesn't match stock. Assign correct stock or adjust thickness.</li>
                  </ul>
                </div>

                <div className="card">
                  <h3 className="card-title">File Won't Open</h3>
                  <p className="card-description mb-md">
                    <strong>Problem:</strong> Project file (.carvd) won't open or shows errors.
                  </p>
                  <ul className="text-muted text-sm grid gap-sm">
                    <li>• Make sure you're using the latest version of Carvd Studio</li>
                    <li>• Try opening the file from File → Open (not double-clicking)</li>
                    <li>• Check if the file was created with a newer version of the software</li>
                    <li>• <strong>If the file is corrupted:</strong> Carvd Studio will detect the issue and offer to attempt automatic recovery. The recovery process will show you what data can be salvaged and let you accept or reject the recovered project.</li>
                    <li>• If automatic recovery fails, check for auto-recovery backups in your auto-save location</li>
                    <li>• Contact support with the file for manual recovery assistance</li>
                  </ul>
                </div>

                <div className="card">
                  <h3 className="card-title">Missing or Moved File</h3>
                  <p className="card-description mb-md">
                    <strong>Problem:</strong> A project in your recent or favorites list shows "Click to locate" or a warning icon.
                  </p>
                  <ul className="text-muted text-sm grid gap-sm">
                    <li>• This happens when a project file has been moved, renamed, or deleted from its original location</li>
                    <li>• <strong>To relocate:</strong> Click on the missing file in your recent projects or favorites list. A file browser will open asking you to locate the file in its new location.</li>
                    <li>• Once found, Carvd Studio updates your recent projects list with the new location automatically</li>
                    <li>• If the file was deleted, you can remove it from your recent list using the trash icon</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="mb-3xl mt-3xl">
              <h2 className="text-4xl font-bold mb-xl">Frequently Asked Questions</h2>

              <div className="grid gap-xl">
                <div className="card">
                  <h3 className="card-title">What's included in the free trial?</h3>
                  <p className="card-description">
                    Everything! For 14 days, you get full access to all features: unlimited parts, cut list optimizer,
                    PDF export, assemblies, groups, and custom templates. No credit card required.
                  </p>
                </div>

                <div className="card">
                  <h3 className="card-title">What happens after the trial expires?</h3>
                  <p className="card-description">
                    You can purchase a license to keep all features, or continue using the free version.
                    The free version is limited to 10 parts, 5 stock materials, and doesn't include the cut list
                    optimizer, PDF export, groups, assemblies, or custom templates.
                  </p>
                </div>

                <div className="card">
                  <h3 className="card-title">Can I open projects I made during the trial?</h3>
                  <p className="card-description">
                    Yes! You can always open and view your projects, even in free mode. You just can't add more parts
                    beyond the free limit (10 parts, 5 stocks). This "grace mode" ensures you never lose access to your work.
                  </p>
                </div>

                <div className="card">
                  <h3 className="card-title">Do I need an internet connection?</h3>
                  <p className="card-description">
                    No! Carvd Studio works 100% offline. Internet is only needed for license activation and checking
                    for updates. All your designs and data stay on your computer.
                  </p>
                </div>

                <div className="card">
                  <h3 className="card-title">Can I use it on multiple computers?</h3>
                  <p className="card-description">
                    Yes! Your license works on up to 3 devices—any combination of Mac and Windows. Use it in your
                    shop, office, and laptop simultaneously. Manage activations in Settings → License.
                  </p>
                </div>

                <div className="card">
                  <h3 className="card-title">What file format does Carvd Studio use?</h3>
                  <p className="card-description">
                    Projects are saved as .carvd files, which are JSON-based and human-readable. They include all
                    your parts, stocks, settings, cut lists, and even project thumbnails. Easy to back up and share.
                  </p>
                </div>

                <div className="card">
                  <h3 className="card-title">Can I export my cut lists?</h3>
                  <p className="card-description">
                    Yes! Use the "Download Project Report" button for a comprehensive PDF with everything—cover page,
                    cut list, cutting diagrams, and shopping list. Or export individual tabs as PDF or CSV.
                    Each export includes a "Generated by Carvd Studio" watermark. PDF export requires a license.
                  </p>
                </div>

                <div className="card">
                  <h3 className="card-title">Does it work with metric measurements?</h3>
                  <p className="card-description">
                    Yes! Carvd Studio fully supports metric (millimeters) and imperial (inches, including fractions
                    like 2-3/4"). You can set your preferred units per project or as a global default.
                  </p>
                </div>

                <div className="card">
                  <h3 className="card-title">How do I transfer my license to a new computer?</h3>
                  <p className="card-description">
                    Go to Settings → License on your old computer and click "Deactivate". Then activate on your new
                    computer using the same license key. You can also manage this if your old computer is no longer available.
                  </p>
                </div>

                <div className="card">
                  <h3 className="card-title">Are future updates included?</h3>
                  <p className="card-description">
                    Yes! All future updates are free forever. New features, improvements, and bug fixes are included
                    automatically. The app will notify you when updates are available.
                  </p>
                </div>
              </div>
            </section>

            {/* Support Section */}
            <section className="mb-3xl mt-3xl">
              <div className="cta-section">
                <h2 className="cta-title">Still Have Questions?</h2>
                <p className="cta-description mb-lg">
                  Email our support team. You'll get help from actual woodworkers who know the software inside and out.
                </p>
                <a href="mailto:support@carvd-studio.com" className="btn btn-primary btn-lg">
                  Email Support
                </a>
                <p className="text-sm text-muted mt-md">
                  Average response time: 24 hours or less
                </p>
              </div>
            </section>

            {/* CTA */}
            <div className="accent-box-highlight text-center mt-3xl">
              <h2 className="text-3xl font-bold mb-md">Ready to Get Started?</h2>
              <p className="text-lg text-muted mb-lg">
                Download Carvd Studio and design your first project today.
              </p>
              <div className="flex gap-md justify-center">
                <a href="/download" className="btn btn-highlight btn-lg">
                  Download Free Trial
                </a>
                <BuyButton />
              </div>
            </div>

            </div>{/* End docs-content */}
          </div>{/* End docs-layout */}

          {/* Back Link */}
          <a href="/" className="back-link mt-3xl block text-center">
            ← Back to Home
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer container">
        <div className="mb-lg">
          <div className="flex justify-center gap-2xl mb-md">
            <a href="/features" className="nav-link">Features</a>
            <a href="/pricing" className="nav-link">Pricing</a>
            <a href="/docs" className="nav-link">Documentation</a>
            <a href="/support" className="nav-link">Support</a>
          </div>
          <div className="flex justify-center gap-xl text-sm text-muted">
            <a href="/privacy" className="nav-link">Privacy Policy</a>
            <a href="/terms" className="nav-link">Terms of Service</a>
          </div>
        </div>
        <p>&copy; 2026 Carvd Studio. All rights reserved.</p>
      </footer>
    </div>
  );
}
