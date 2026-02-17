import { Wrench } from "lucide-react";
import SEO from "../../components/SEO";
import { createBreadcrumbSchema } from "../../utils/jsonLd";
import DocsPrevNext from "./DocsPrevNext";

export default function JoineryPage() {
  return (
    <section>
      <SEO
        title="Joinery Allowances - Docs"
        description="Add extra material for dados, rabbets, and mortise and tenon joints. Cut lists reflect actual cut dimensions."
        path="/docs/joinery"
        jsonLd={createBreadcrumbSchema([
          { name: "Docs", path: "/docs" },
          { name: "Joinery Allowances", path: "/docs/joinery" },
        ])}
      />
      <h2 className="text-4xl font-bold mb-xl">Joinery Allowances</h2>

      <div className="accent-box">
        <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
          <Wrench size={20} /> Accounting for Joints
        </h3>
        <p className="text-muted mb-md text-sm">
          When building furniture with joinery (dados, rabbets, mortise &
          tenon), parts often need extra length or width for the joint. Carvd
          Studio lets you account for this:
        </p>
        <div className="grid gap-md text-sm">
          <div>
            <p className="font-bold mb-xs">Joinery Allowance</p>
            <p className="text-muted">
              Add extra material to specific dimensions of a part. For example,
              add 3/8" to a shelf length for dado joints on each end.
            </p>
          </div>
          <div>
            <p className="font-bold mb-xs">How It Works</p>
            <p className="text-muted">
              The 3D view shows the visual (finished) dimensions. The cut list
              uses the actual cut dimensions including joinery allowances. This
              means your cutting diagrams show the real size you need to cut.
            </p>
          </div>
          <div>
            <p className="font-bold mb-xs">Setting Allowances</p>
            <p className="text-muted">
              Select a part, open the properties panel, and find the "Joinery"
              section. Add allowances to width, height, or depth independently.
            </p>
          </div>
        </div>
      </div>

      <DocsPrevNext />
    </section>
  );
}
