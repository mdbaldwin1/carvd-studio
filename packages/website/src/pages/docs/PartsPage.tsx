import { Package, RefreshCw, Layers } from "lucide-react";
import SEO from "../../components/SEO";
import { createBreadcrumbSchema } from "../../utils/jsonLd";
import DocsPrevNext from "./DocsPrevNext";

export default function PartsPage() {
  return (
    <section>
      <SEO
        title="Working with Parts - Docs"
        description="Learn part properties, dimensions, stock assignments, grain direction, colors, and operations like duplicate and copy/paste."
        path="/docs/parts"
        jsonLd={createBreadcrumbSchema([
          { name: "Docs", path: "/docs" },
          { name: "Working with Parts", path: "/docs/parts" },
        ])}
      />
      <h2 className="text-4xl font-bold mb-xl">Working with Parts</h2>

      <p className="text-muted mb-xl">
        Parts are the building blocks of your furniture design. Each part
        represents a piece of wood with specific dimensions and properties.
      </p>

      <div className="site-section p-[var(--space-md)] mb-xl">
        <img
          src="/screenshots/docs-properties-panel.png"
          alt="Part properties panel in Carvd Studio"
          className="w-full rounded-xl border border-border shadow-lg"
          loading="lazy"
        />
      </div>

      <div className="grid gap-xl">
        <div className="site-section p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md">
            <Package size={20} className="inline-block" /> Part Properties
          </h3>
          <div className="grid gap-md text-sm">
            <div>
              <p className="font-bold mb-xs">Name</p>
              <p className="text-muted">
                A descriptive label for the part (e.g., "Top Shelf", "Side
                Panel")
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">
                Dimensions (Width × Height × Depth)
              </p>
              <p className="text-muted">
                The actual dimensions of the part in your chosen units. Enter
                values directly or use fractions (e.g., 2-3/4").
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Position (X, Y, Z)</p>
              <p className="text-muted">
                Where the part is placed in 3D space. Move parts by dragging in
                the viewport or entering exact coordinates.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Stock Material</p>
              <p className="text-muted">
                The material this part will be cut from. Used for cut list
                calculations and cost estimates.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Color</p>
              <p className="text-muted">
                Visual color for the 3D preview. Choose from presets, enter hex
                values, or use the color picker.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Grain Direction</p>
              <p className="text-muted">
                Set the wood grain orientation (lengthwise or widthwise).
                Affects cut list optimization and visual appearance.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Allow Overlap</p>
              <p className="text-muted">
                Mark intentional overlaps so they don&apos;t trigger overlap
                warnings in validation and cut list workflows.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Joinery Adjustments</p>
              <p className="text-muted">
                Add extra length/width for tenons, dados, and similar joinery.
                These values affect cut list dimensions, not the 3D preview
                size.
              </p>
            </div>
          </div>
        </div>

        <div className="site-section p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md">
            <RefreshCw size={20} className="inline-block" /> Part Operations
          </h3>
          <div className="grid grid-cols-2 gap-md text-sm">
            <div>
              <p className="font-bold mb-xs">Duplicate</p>
              <p className="text-muted">
                <code>Shift + D</code> — Creates an exact copy of the selected
                part(s)
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Delete</p>
              <p className="text-muted">
                <code>Delete</code> or <code>Backspace</code> — Removes selected
                parts
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Copy / Paste</p>
              <p className="text-muted">
                <code>Cmd/Ctrl + C</code> / <code>Cmd/Ctrl + V</code> — Copy and
                paste parts
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Undo / Redo</p>
              <p className="text-muted">
                <code>Cmd/Ctrl + Z</code> / <code>Cmd/Ctrl + Shift + Z</code> —
                Full undo/redo history
              </p>
            </div>
          </div>
        </div>

        <div className="site-section p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md">
            <Layers size={20} className="inline-block" /> Glue-Up Panels
          </h3>
          <p className="text-sm text-muted mb-md">
            For wide panels that require multiple boards glued together (like
            tabletops):
          </p>
          <div className="grid gap-md text-sm">
            <p>1. Create the part with your desired final dimensions</p>
            <p>
              2. Assign a board stock (e.g., 1×6 pine) — the app automatically
              calculates how many boards you need
            </p>
            <p>
              3. The cut list shows individual boards needed for the glue-up
            </p>
          </div>
        </div>
      </div>

      <DocsPrevNext />
    </section>
  );
}
