import { Link } from "react-router-dom";
import {
  Ruler,
  Settings,
  BarChart3,
  ShoppingCart,
  AlertTriangle,
  Upload,
} from "lucide-react";
import SEO from "../../components/SEO";
import { createBreadcrumbSchema } from "../../utils/jsonLd";
import DocsPrevNext from "./DocsPrevNext";

export default function CutListsPage() {
  return (
    <section>
      <SEO
        title="Cut List Generation - Docs"
        description="Generate optimized cut lists with cutting diagrams, shopping lists, and cost estimates. Export as PDF or CSV."
        path="/docs/cut-lists"
        jsonLd={createBreadcrumbSchema([
          { name: "Docs", path: "/docs" },
          { name: "Cut List Generation", path: "/docs/cut-lists" },
        ])}
      />
      <h2 className="text-4xl font-bold mb-xl">Cut List Generation</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg mb-xl">
        <div className="site-section p-[var(--space-md)]">
          <img
            src="/screenshots/docs-parts-tab.png"
            alt="Cut list parts tab"
            className="w-full rounded-xl border border-border shadow-lg"
            loading="lazy"
          />
        </div>
        <div className="site-section p-[var(--space-md)]">
          <img
            src="/screenshots/cut-list-diagrams.png"
            alt="Cut list diagrams tab"
            className="w-full rounded-xl border border-border shadow-lg"
            loading="lazy"
          />
        </div>
      </div>

      <div className="grid gap-2xl">
        <div className="site-section p-[var(--space-xl)]">
          <p className="text-lg font-semibold mb-sm">
            The Heart of Carvd Studio
          </p>
          <p className="text-muted">
            The cut list optimizer analyzes your design and finds the most
            efficient way to cut your materials. It minimizes waste, calculates
            costs, and generates workshop-ready cutting diagrams.
          </p>
        </div>

        <div className="site-section p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
            <Ruler size={24} /> Generating a Cut List
          </h3>
          <ol className="text-muted text-sm grid gap-sm">
            <li>
              <strong>1. Assign stock to all parts</strong> — Parts without
              stock produce a blocking error; assign the correct material before
              generating.
            </li>
            <li>
              <strong>2. Click "Generate Cut List"</strong> — The optimizer runs
              and creates your cut list.
            </li>
            <li>
              <strong>3. Review validation warnings</strong> — Fix any issues
              (parts too large, grain mismatches, etc.).
            </li>
            <li>
              <strong>4. Explore the three tabs:</strong>
              <ul className="mt-sm ml-lg">
                <li>
                  • <strong>Parts:</strong> All parts grouped by matching
                  dimensions
                </li>
                <li>
                  • <strong>Diagrams:</strong> Visual cutting layouts for each
                  board
                </li>
                <li>
                  • <strong>Shopping:</strong> Stock and entered supplies with
                  costs
                </li>
              </ul>
            </li>
            <li>
              <strong>5. Export as PDF</strong> — Print diagrams for the
              workshop.
            </li>
          </ol>
        </div>

        <div className="site-section p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
            <Settings size={24} /> Cut List Settings
          </h3>
          <div className="grid gap-md text-sm">
            <div>
              <p className="font-bold mb-xs">Kerf Width</p>
              <p className="text-muted">
                The width of your saw blade cut (default: 1/8"). The optimizer
                accounts for kerf when laying out parts, ensuring pieces
                actually fit on your boards.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Overage Factor</p>
              <p className="text-muted">
                Extra material padding (default: 10%). Accounts for defects,
                mistakes, and material variation. A 10% overage on a project
                needing 9 boards means the shopping list shows 10.
              </p>
            </div>
          </div>
        </div>

        <div className="site-section p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
            <BarChart3 size={24} /> Understanding the Results
          </h3>
          <div className="grid gap-md text-sm">
            <div>
              <p className="font-bold mb-xs">Parts Tab</p>
              <p className="text-muted">
                Shows all parts grouped by matching cut dimensions. Multiple
                identical parts are consolidated with a quantity count. Great
                for labeling and tracking during construction.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Diagrams Tab</p>
              <p className="text-muted">
                Visual layouts showing exactly where to cut each part on each
                board. Color-coded parts match your 3D view. Click a diagram to
                open a larger detailed view, zoom in/out, and inspect selected
                part dimensions before exporting.
              </p>
              <ul className="text-muted mt-sm ml-lg">
                <li>
                  • Scroll and pinch-to-zoom are supported in expanded view
                </li>
                <li>• Selecting a part shows clearer dimension indicators</li>
                <li>
                  • Selected-part details include a group path for nested
                  structures
                </li>
              </ul>
            </div>
            <div>
              <p className="font-bold mb-xs">Shopping Tab</p>
              <p className="text-muted">
                Stock purchase summary: how many boards of each type, board feet
                needed, linear feet, cost per material, total cost, waste
                percentage, and utilization efficiency. Waste and utilization
                measure the length-by-width nesting layout. They do not measure
                volume removed by thicknessing, joinery, or routing. A board
                with no unused area can still lose material during those steps.
                Material totals use entered prices and quantities; add supplies
                separately and account for labor, delivery, tax, and finishing
                when preparing a complete project budget.
              </p>
            </div>
          </div>
        </div>

        <div className="site-section p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
            <ShoppingCart size={24} /> Custom Shopping Items
          </h3>
          <p className="text-muted mb-md">
            Add non-lumber items to your shopping list: hardware, screws, glue,
            finish, etc.
          </p>
          <p className="text-muted mb-md">
            Buy a bolt with its head as one complete item, and list a matching
            nut separately or as part of a kit. Count shelf pins, screws, and
            hinges as purchased pieces or kits; do not create dowel-stock parts
            to stand in for them. Custom shopping items do not enter cutting
            diagrams or receive lumber overage. Include canvas dimensions and
            cutting instructions in the item description, rather than treating
            cloth as plywood.
          </p>
          <p className="text-muted mb-md">
            Add hardware and supplies explicitly: holes and recesses do not
            automatically create purchases. Replace sample prices with supplier
            quotes. A zero entered for an unpriced item contributes nothing to
            the estimate; the total is incomplete until you price it. The app
            cannot tell a free item from one whose price has not been entered.
          </p>
          <p className="text-muted mb-md">
            Custom items belong to the project, not to a particular assembly.
            Duplicating a drawer or inserting another cabinet does not multiply
            its manually entered slides, hinges, or screws. Recount those items
            after changing the number of assemblies. Match thread, diameter,
            length, head style, and mating components against the supplier’s
            specification; the shopping list does not check hardware
            compatibility.
          </p>
          <ul className="text-muted text-sm grid gap-sm">
            <li>• Click "Add Item" in the Shopping tab</li>
            <li>• Enter name, quantity, and unit price</li>
            <li>• Optional: add description and category</li>
            <li>• Custom items persist when you regenerate the cut list</li>
            <li>• Total project cost includes all custom items</li>
          </ul>
        </div>

        <div className="site-section p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
            <AlertTriangle size={24} /> Validation Warnings
          </h3>
          <p className="text-muted mb-md">
            The optimizer validates your design before generating cut lists.
            Blocking errors must be corrected before generation or export.
            Warnings remain available for review. Imported cuts can be opened
            for repair even when their dimensions prevent report generation.
            Here are common issues:
          </p>
          <div className="grid gap-sm text-sm">
            <div>
              <p className="font-bold text-warning">
                Part exceeds stock dimensions
              </p>
              <p className="text-muted">
                The part is larger than the stock it's assigned to. Use larger
                stock or resize the part.
              </p>
            </div>
            <div>
              <p className="font-bold text-warning">Thickness mismatch</p>
              <p className="text-muted">
                Part thickness doesn't match stock thickness. Assign different
                stock or adjust thickness.
              </p>
            </div>
            <div>
              <p className="font-bold text-warning">Grain direction mismatch</p>
              <p className="text-muted">
                Part's grain orientation conflicts with stock. Rotate the part
                or adjust grain settings.
              </p>
            </div>
            <div>
              <p className="font-bold text-warning">No stock assigned</p>
              <p className="text-muted">
                Part has no stock material. Assign a stock to include it in the
                cut list.
              </p>
            </div>
          </div>
        </div>

        <div className="site-section p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
            <Upload size={24} /> Exporting Your Work
          </h3>
          <p className="text-muted mb-md">
            Each tab has a Download dropdown with export options. Plus, use the
            "Download Project Report" button to get everything in one
            comprehensive PDF.
          </p>
          <div className="grid gap-md text-sm">
            <div>
              <p className="font-bold mb-xs">Download Project Report</p>
              <p className="text-muted">
                One-click comprehensive PDF export that includes: a cover page
                with project thumbnail and summary, the complete parts list, all
                cutting diagrams, and the full shopping list with costs. Perfect
                for workshop reference or client presentations.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Per-Tab Exports</p>
              <p className="text-muted">
                Each tab has its own download dropdown:
              </p>
              <ul className="text-muted ml-lg mt-sm">
                <li>
                  • <strong>Parts Tab:</strong> PDF (formatted table) or CSV
                  (for spreadsheets)
                </li>
                <li>
                  • <strong>Diagrams Tab:</strong> PDF with visual cutting
                  layouts for each board
                </li>
                <li>
                  • <strong>Shopping Tab:</strong> PDF or CSV with all materials
                  and costs
                </li>
              </ul>
            </div>
            <div>
              <p className="font-bold mb-xs">After Download</p>
              <p className="text-muted">
                Successful exports show a toast with a{" "}
                <strong>Show in Finder / File Explorer</strong> action so you
                can jump directly to the saved file.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">PDF vs CSV</p>
              <p className="text-muted">
                <strong>PDF:</strong> Best for printing and taking to the
                workshop. Includes visual layouts, formatted tables, and a
                "Generated by Carvd Studio" watermark. <strong>CSV:</strong>{" "}
                Best for importing into spreadsheets, lumber calculators, or
                accounting software.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">License Requirement</p>
              <p className="text-muted">
                Cut list generation and all exports (PDF and CSV) require a
                licensed version. Free users can design parts and assign stock,
                but generating the optimized cut list is a paid feature.
              </p>
            </div>
          </div>
        </div>
      </div>

      <section
        id="part-cut-instructions"
        className="site-section p-6 mt-xl scroll-mt-28"
      >
        <h3 className="text-2xl font-bold mb-4">Part-cut instructions</h3>
        <p className="text-muted mb-4">
          The blank dimensions and cutting diagrams describe the material
          required for a part. Custom-cut instructions describe the operations
          that turn that blank into the finished shape. Review both; a
          rectangular blank diagram alone does not describe a mortise, tenon, or
          routed profile.
        </p>
        <p className="text-muted mb-4">
          Operation summaries are not complete machining drawings. A routed path
          summary includes its point count and first and last coordinates, not
          every intermediate point. A custom edge-profile summary identifies the
          profile and dimensions, not its complete boundary. Keep the saved
          .carvd project with the report, inspect those layouts in Part Cuts,
          and supply the full layout or template needed to reproduce them.
        </p>
        <ol className="list-decimal pl-5 space-y-3 text-muted">
          <li>
            Save the Part Cuts edits and open View Cut List after changing the
            model. Outdated results must be regenerated before export.
          </li>
          <li>
            Review the listed operations and plan their machining order. Check
            the named target face and reference edges, the opening dimensions,
            and blind depth or Through. Through is an intentional opening
            through the material, not a zero-depth operation.
          </li>
          <li>
            Resolve blocking errors in the affected parts. A blocked or outdated
            result cannot be exported. Read Review before fabrication for
            remaining warnings; generating a report does not dismiss them.
          </li>
          <li>
            Review inserts and their stock assignments, then export the current
            report. Verify the fabrication instructions and any warnings before
            using it in the shop.
          </li>
        </ol>
        <p className="text-muted mt-4">
          Stock blanks describes work on individual pieces. After glue-up —
          finished panels contains operations on the assembled panel, rather
          than repeating them on each strip. After purchase — component
          machining lists cuts you added to purchased inserts; the inserts are
          counted in Shopping and are not nested as raw lumber. Operations by
          setup groups compatible operations within these stages. It helps
          organize setups but does not decide their execution order.
        </p>
        <p className="text-muted mt-4">
          For oversized blanks, Finished modeled envelope gives the original
          modeled dimensions alongside the blank size. Allowance is unassigned
          to edges: establish that envelope and its reference edges before
          locating the cuts. Do not measure a modeled offset from an oversized
          blank edge. Do not add a second tenon allowance when the intended
          blank already includes that material. See{" "}
          <Link
            className="text-text underline underline-offset-4 decoration-primary"
            to="/docs/joinery#fabrication"
          >
            From model to shop
          </Link>{" "}
          and{" "}
          <Link
            className="text-text underline underline-offset-4 decoration-primary"
            to="/docs/part-cuts"
          >
            Part Cuts
          </Link>
          .
        </p>
      </section>
      <p className="text-muted mt-4">
        Disabled operations are omitted from fabrication instructions. Named
        cuts include their labels, so a label such as “Left shelf housing” helps
        distinguish otherwise similar operations. Edge profiles can add TOOL
        ERROR, Tool warning, or Tool note lines for the assigned cutter. These
        are findings to review, not extra machining passes. For their meaning,
        see{" "}
        <Link
          className="text-text underline underline-offset-4 decoration-primary"
          to="/docs/part-cuts#router-profiles"
        >
          profiles and physical router tools
        </Link>
        .
      </p>
      <DocsPrevNext />
    </section>
  );
}
