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

      <div className="grid gap-2xl">
        <div className="rounded-lg border border-[rgba(174,164,191,0.4)] bg-linear-to-br from-[rgba(174,164,191,0.15)] to-[rgba(174,164,191,0.05)] p-[var(--space-xl)]">
          <p className="text-lg font-semibold mb-sm">
            The Heart of Carvd Studio
          </p>
          <p className="text-muted">
            The cut list optimizer analyzes your design and finds the most
            efficient way to cut your materials. It minimizes waste, calculates
            costs, and generates workshop-ready cutting diagrams.
          </p>
        </div>

        <div className="rounded-lg border border-[rgba(74,144,226,0.3)] bg-linear-to-br from-[rgba(74,144,226,0.1)] to-[rgba(74,144,226,0.05)] p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
            <Ruler size={24} /> Generating a Cut List
          </h3>
          <ol className="text-muted text-sm grid gap-sm">
            <li>
              <strong>1. Assign stock to all parts</strong> — Parts without
              stock are excluded from the cut list.
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
                  • <strong>Shopping:</strong> Complete material list with costs
                </li>
              </ul>
            </li>
            <li>
              <strong>5. Export as PDF</strong> — Print diagrams for the
              workshop.
            </li>
          </ol>
        </div>

        <div className="rounded-lg border border-[rgba(74,144,226,0.3)] bg-linear-to-br from-[rgba(74,144,226,0.1)] to-[rgba(74,144,226,0.05)] p-[var(--space-xl)]">
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

        <div className="rounded-lg border border-[rgba(74,144,226,0.3)] bg-linear-to-br from-[rgba(74,144,226,0.1)] to-[rgba(74,144,226,0.05)] p-[var(--space-xl)]">
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
                board. Color-coded parts match your 3D view. Print these and
                take them to the workshop.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Shopping Tab</p>
              <p className="text-muted">
                Complete material list: how many boards of each type, board feet
                needed, linear feet, cost per material, total cost, waste
                percentage, and utilization efficiency.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[rgba(74,144,226,0.3)] bg-linear-to-br from-[rgba(74,144,226,0.1)] to-[rgba(74,144,226,0.05)] p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
            <ShoppingCart size={24} /> Custom Shopping Items
          </h3>
          <p className="text-muted mb-md">
            Add non-lumber items to your shopping list: hardware, screws, glue,
            finish, etc.
          </p>
          <ul className="text-muted text-sm grid gap-sm">
            <li>• Click "Add Item" in the Shopping tab</li>
            <li>• Enter name, quantity, and unit price</li>
            <li>• Optional: add description and category</li>
            <li>• Custom items persist when you regenerate the cut list</li>
            <li>• Total project cost includes all custom items</li>
          </ul>
        </div>

        <div className="rounded-lg border border-[rgba(74,144,226,0.3)] bg-linear-to-br from-[rgba(74,144,226,0.1)] to-[rgba(74,144,226,0.05)] p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
            <AlertTriangle size={24} /> Validation Warnings
          </h3>
          <p className="text-muted mb-md">
            The optimizer validates your design before generating cut lists.
            Here's what each warning means:
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

        <div className="rounded-lg border border-[rgba(74,144,226,0.3)] bg-linear-to-br from-[rgba(74,144,226,0.1)] to-[rgba(74,144,226,0.05)] p-[var(--space-xl)]">
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

      <DocsPrevNext />
    </section>
  );
}
