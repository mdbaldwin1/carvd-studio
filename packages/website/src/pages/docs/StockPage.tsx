import { Layers, Lock } from "lucide-react";
import SEO from "../../components/SEO";
import { createBreadcrumbSchema } from "../../utils/jsonLd";
import DocsPrevNext from "./DocsPrevNext";

export default function StockPage() {
  return (
    <section>
      <SEO
        title="Stock Materials - Docs"
        description="Manage your stock library with plywood, dimensional lumber, and custom materials. Configure stock constraints for cut lists."
        path="/docs/stock"
        jsonLd={createBreadcrumbSchema([
          { name: "Docs", path: "/docs" },
          { name: "Stock Materials", path: "/docs/stock" },
        ])}
      />
      <h2 className="text-4xl font-bold mb-xl">Stock Materials</h2>

      <p className="text-muted mb-xl">
        Stock materials represent the raw lumber, plywood, or other sheet goods
        you'll cut your parts from. Carvd Studio includes common sizes and lets
        you add your own. Open the <strong>Library</strong> from the header to
        manage stocks and assemblies in one place.
      </p>

      <div className="site-section p-[var(--space-md)] mb-xl">
        <img
          src="/screenshots/docs-stock-library.png"
          alt="Stock library modal showing available materials"
          className="w-full rounded-xl border border-border shadow-lg"
          loading="lazy"
        />
      </div>

      <div className="grid gap-xl">
        <div className="site-section p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md">
            <Layers size={20} className="inline-block" /> Managing Your Stock
            Library
          </h3>
          <div className="grid gap-md text-sm">
            <div>
              <p className="font-bold mb-xs">Built-in Stock</p>
              <p className="text-muted">
                Common sizes pre-loaded: 4×8 plywood sheets, dimensional lumber
                (1×4, 1×6, 2×4, etc.) in various species
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Custom Stock</p>
              <p className="text-muted">
                Click the <strong>+</strong> button in the Stocks tab to open
                the stock form on the right side. Add your own stock with exact
                dimensions, grain, and pricing info, then use the modal footer{" "}
                <strong>Create/Save</strong> action to commit changes.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Edit, Import, Export</p>
              <p className="text-muted">
                Select a stock from the left list to view details and edit.
                Import and export are available from the stock list and detail
                actions.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Selection Highlighting</p>
              <p className="text-muted">
                Selecting a stock in the sidebar highlights all parts currently
                assigned to that stock in the 3D editor. Click empty space or a
                different item to clear the highlight.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Stock Types</p>
              <p className="text-muted">
                <strong>Sheet goods</strong> (plywood, MDF) — defined by width ×
                length × thickness. <strong>Dimensional lumber</strong> (boards)
                — defined by width × length × thickness.
              </p>
            </div>
          </div>
        </div>

        <div className="site-section p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md">
            <Lock size={20} className="inline-block" /> Stock Constraints
          </h3>
          <p className="text-sm text-muted mb-md">
            Control how strictly the cut list optimizer matches parts to stock:
          </p>
          <div className="grid gap-md text-sm">
            <div>
              <p className="font-bold mb-xs">Dimension Constraints</p>
              <p className="text-muted">
                Parts must fit within stock dimensions (enabled by default)
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Grain Constraints</p>
              <p className="text-muted">
                Respect grain direction when placing parts on stock
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Color Constraints</p>
              <p className="text-muted">
                Match part color to stock material color
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Overlap Constraints</p>
              <p className="text-muted">
                Prevent parts from overlapping on the same stock piece
              </p>
            </div>
          </div>
        </div>
      </div>

      <DocsPrevNext />
    </section>
  );
}
