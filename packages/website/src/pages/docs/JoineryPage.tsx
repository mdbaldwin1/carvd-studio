import { Wrench } from "lucide-react";
import SEO from "../../components/SEO";
import { createBreadcrumbSchema } from "../../utils/jsonLd";
import DocsPrevNext from "./DocsPrevNext";

export default function JoineryPage() {
  return (
    <section>
      <SEO
        title="Custom Cuts & Joinery - Docs"
        description="Model rectangular and round woodworking operations, rounded profiles, and paired dowel joints directly on parts."
        path="/docs/joinery"
        jsonLd={createBreadcrumbSchema([
          { name: "Docs", path: "/docs" },
          { name: "Custom Cuts & Joinery", path: "/docs/joinery" },
        ])}
      />
      <h2 className="text-4xl font-bold mb-xl">Custom Cuts & Joinery</h2>

      <div className="site-section p-[var(--space-xl)]">
        <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
          <Wrench size={20} /> Accounting for Joints
        </h3>
        <p className="text-muted mb-md text-sm">
          Model the operations that turn a rectangular blank into the finished
          part, then carry those instructions into the cut list.
        </p>
        <div className="grid gap-md text-sm">
          <div>
            <p className="font-bold mb-xs">Open the Part Cuts workspace</p>
            <p className="text-muted">
              Select one part and choose <strong>Edit Part Cuts</strong> in
              Properties, or right-click it and choose{" "}
              <strong>Edit Part Cuts</strong>.
            </p>
          </div>
          <div>
            <p className="font-bold mb-xs">Choose and place each operation</p>
            <p className="text-muted">
              Add end cuts, tenons, dados, grooves, rabbets, mortises, face
              cutouts, edge notches, corner notches, round holes, countersinks,
              counterbores, or rounded openings. Linear, grid, and circular hole
              patterns keep repeated drilling editable as one operation. Use the
              3D preview for placement and the editor fields for exact
              measurements. Cuts are applied in list order, so resolve any
              conflict shown before saving.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-xs">Round cuts and dowel joints</h4>
            <p className="text-muted">
              Create a paired dowel joint by choosing two mating parts and
              opposing faces, then set the dowel diameter, length, embedment,
              count, spacing, and first-hole position. Carvd adds matching blind
              holes to both parts in one undoable action and highlights dowels
              that fall out of alignment after a part moves.
            </p>
          </div>
          <div>
            <p className="font-bold mb-xs">Save and fabricate</p>
            <p className="text-muted">
              Choose <strong>Save Part</strong> to return to the project. The
              cut list reports the rectangular blank first, followed by numbered
              cut instructions in the same order you authored them. Project
              files with custom cuts require Carvd Studio 1.3 or newer.
            </p>
          </div>
          <div>
            <p className="font-bold mb-xs">Allowances are still available</p>
            <p className="text-muted">
              Use joinery allowances when you only need extra stock in a blank
              dimension. Use Custom Cuts when you want the finished shape and
              fabrication steps represented in the model.
            </p>
          </div>
          <div>
            <p className="font-bold mb-xs">
              Woodworking plans, not machine control
            </p>
            <p className="text-muted">
              Custom Cuts describes finished geometry and shop instructions. It
              does not generate CNC or G-code, and it is not a free-form CAD
              modeler.
            </p>
          </div>
        </div>
      </div>

      <DocsPrevNext />
    </section>
  );
}
