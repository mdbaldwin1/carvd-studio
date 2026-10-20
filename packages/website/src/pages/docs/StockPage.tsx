import { Link } from "react-router-dom";
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
                — defined by width × length × thickness. Dowel stock is round
                material cut to length. Insert stock represents discrete
                biscuits, dominos, dowel pins, or loose tenons.
              </p>
            </div>
          </div>
        </div>

        <div className="site-section p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md">
            <Lock size={20} className="inline-block" /> Stock Constraints
          </h3>
          <p className="text-sm text-muted mb-md">
            Control stock assignments and checks in the project:
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
                Inherit the stock’s grain direction when assigning it to a part
                and respect that direction when placing parts on stock. Plywood
                face grain can still constrain orientation; it does not make
                plywood behave like solid wood.
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
                Prevent modeled parts from occupying the same space during
                placement; inspect reported overlaps in the assembly
              </p>
            </div>
          </div>
        </div>
      </div>

      <section
        id="prepared-stock"
        className="site-section p-6 mt-xl scroll-mt-28"
      >
        <h3 className="text-2xl font-bold mb-4">
          Prepared stock and joint inserts
        </h3>
        <p className="text-muted mb-4">
          In the stock form, choose{" "}
          <strong>Dowel (round, cut to length)</strong> for rod stock, or{" "}
          <strong>Insert (biscuit, domino, dowel pin)</strong> for individual
          inserts. For an insert, choose its Insert Type and catalog Size, or
          enter loose-tenon dimensions. Use the stock’s actual shape and
          dimensions for dowels, biscuits, loose tenons, and other prepared
          inserts. Create the insert as a part, then use it as the pattern for
          its receiving socket. Changing socket clearance does not change the
          insert’s stock dimensions.
        </p>
        <p className="text-muted mb-4">
          For dowel rod, enter the purchased rod’s Diameter and Length; the part
          represents the piece you need from it. Its round cross-section must
          match the rod diameter; extra width is not a rod-cutting allowance. A
          catalog insert’s Size defines its manufactured shape. Modeled
          dimensions and factory shape must match the purchased insert, with
          extra length and width allowances set to zero. A smaller model is not
          treated as a piece to cut from a larger insert. After changing catalog
          stock, review the bound part and its sockets. Reset to Stock
          explicitly adopts the stock’s dimensions and factory shape, and clears
          extra blank allowances; recheck receiving cuts afterward. Choose a
          different catalog size to change a biscuit, domino, or dowel pin; use
          the separate length, width, and thickness fields for a custom loose
          tenon.
        </p>
        <p className="text-muted mb-4">
          Check Pricing Unit before entering Price: the form distinguishes Per
          Rod, Per Box, and Per Tenon. For boxed inserts, read the displayed
          quantity sold to the box and enter the box price, not the price of one
          pin or biscuit. Review the resulting quantities and costs in the
          shopping list.
        </p>
        <p className="text-muted mb-4">
          Bolts, barrel nuts, shelf supports, hinges, and screws are purchased
          hardware. Add them as custom shopping items, with the quantity and
          specification for the complete item or kit. Naming a dowel stock
          “steel bolt” does not change its cutting behavior. Keep fabric and
          adhesives in the supplies list as well; they do not belong in lumber
          cutting diagrams.
        </p>
        <p className="text-muted mb-4">
          Use sheet stock with the actual finished thickness: a thin plywood
          spline cannot be nested on thick plywood. Thinner solid-wood parts can
          use thicker lumber, but their cut instructions include a stock
          preparation step. The layout reserves one full-thickness footprint per
          blank and does not claim extra yield from resawing. For already
          prepared material, enter its prepared dimensions as stock.
        </p>
        <p className="text-muted mb-4">
          Seasonal movement estimates assume stock explicitly set to Board is
          solid wood. They are planning estimates, not species-specific material
          calculations. Sheet, rod, insert, and older stock without an explicit
          form do not receive that numeric estimate. Grain orientation controls
          nesting and appearance separately from this material assumption.
        </p>
        <p className="text-muted mb-4">
          A project can carry stock that is not in your personal library. Import
          that stock when you want to reuse it in future projects, or skip the
          import to keep it only in the current project. The project’s
          assignments remain available either way.
        </p>
        <p className="text-muted">
          Follow{" "}
          <Link
            className="text-text underline underline-offset-4 decoration-primary"
            to="/docs/joinery#inserts"
          >
            the insert and socket workflow
          </Link>{" "}
          for placement, embedment, and glue space. Review stock quantities in
          the cut list after adding inserts.
        </p>
      </section>
      <p className="text-muted mt-6">
        Router profiles and physical router tools describe the cut and cutter,
        rather than the board material. Read{" "}
        <Link
          className="text-text underline underline-offset-4 decoration-primary"
          to="/docs/part-cuts#router-profiles"
        >
          the profile and tool guide
        </Link>{" "}
        for assignment, compatibility checks, SVG imports, and project versions.
      </p>
      <DocsPrevNext />
    </section>
  );
}
