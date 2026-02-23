import { Save, Download, Pencil } from "lucide-react";
import SEO from "../../components/SEO";
import { createBreadcrumbSchema } from "../../utils/jsonLd";
import DocsPrevNext from "./DocsPrevNext";

export default function AssembliesPage() {
  return (
    <section>
      <SEO
        title="Assemblies - Docs"
        description="Save reusable component groups like drawers and doors to your library. Insert assemblies into any project."
        path="/docs/assemblies"
        jsonLd={createBreadcrumbSchema([
          { name: "Docs", path: "/docs" },
          { name: "Assemblies", path: "/docs/assemblies" },
        ])}
      />
      <h2 className="text-4xl font-bold mb-xl">Assemblies</h2>

      <p className="text-muted mb-xl">
        Assemblies are reusable component groups — like a drawer, door, or shelf
        unit — that you can save to your library and insert into any project.
        Think of them as "smart groups" with memory.
      </p>

      <div className="grid gap-xl">
        <div className="site-section p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
            <Save size={20} /> Creating Assemblies
          </h3>
          <div className="grid gap-md text-sm">
            <p>1. Select one or more parts that form a reusable component</p>
            <p>2. Right-click → "Save as Assembly" (or use the menu)</p>
            <p>3. Name your assembly and optionally add a description</p>
            <p>
              4. The assembly is saved to your library with all part dimensions,
              positions, stock assignments, and colors
            </p>
          </div>
        </div>

        <div className="site-section p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
            <Download size={20} /> Using Assemblies
          </h3>
          <div className="grid gap-md text-sm">
            <p>1. Open the Library from the header and switch to Assemblies</p>
            <p>2. Browse your saved assemblies and built-in examples</p>
            <p>3. Drag an assembly into the canvas to place it</p>
            <p>
              4. All parts are added as a group — move, resize, or modify as
              needed
            </p>
          </div>
        </div>

        <div className="site-section p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
            <Pencil size={20} /> Editing Assemblies
          </h3>
          <div className="grid gap-md text-sm">
            <div>
              <p className="font-bold mb-xs">Edit in Place</p>
              <p className="text-muted">
                After inserting, assemblies become regular groups. Modify any
                part freely — changes only affect this instance.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Update Library Version</p>
              <p className="text-muted">
                Use "Edit in 3D" from the library, make improvements, then save
                to update it for future use.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Delete from Library</p>
              <p className="text-muted">
                Remove assemblies you no longer need. Already-inserted instances
                in projects are not affected.
              </p>
            </div>
          </div>
        </div>
      </div>

      <DocsPrevNext />
    </section>
  );
}
