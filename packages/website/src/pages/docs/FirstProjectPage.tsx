import SEO from "../../components/SEO";
import { createBreadcrumbSchema } from "../../utils/jsonLd";
import DocsPrevNext from "./DocsPrevNext";

export default function FirstProjectPage() {
  return (
    <section>
      <SEO
        title="Your First Project - Docs"
        description="Build a simple bookshelf step by step. Learn to create parts, assign stock materials, and generate a cut list."
        path="/docs/first-project"
        jsonLd={createBreadcrumbSchema([
          { name: "Docs", path: "/docs" },
          { name: "Your First Project", path: "/docs/first-project" },
        ])}
      />
      <h2 className="text-4xl font-bold mb-xl">Your First Project</h2>

      <p className="text-muted mb-xl">
        Let's build a simple bookshelf to learn the basics. You'll create parts,
        assign stock materials, and generate a cut list.
      </p>

      <div className="grid gap-xl">
        <div className="accent-box">
          <h3 className="text-2xl font-bold mb-md">
            Step 1: Create a New Project
          </h3>
          <div className="grid gap-md text-sm">
            <p>
              1. Open Carvd Studio and click <strong>"New Project"</strong> on
              the start screen
            </p>
            <p>
              2. Name your project "My Bookshelf" and choose your preferred
              units
            </p>
            <p>3. You'll see an empty 3D workspace — ready to design!</p>
          </div>
        </div>

        <div className="accent-box">
          <h3 className="text-2xl font-bold mb-md">Step 2: Add the Shelves</h3>
          <div className="grid gap-md text-sm">
            <p>
              1. Press <code>P</code> or click the + button to add a part
            </p>
            <p>2. In the properties panel, set dimensions: 24" × 3/4" × 10"</p>
            <p>3. Name it "Shelf" and assign 3/4" plywood as the stock</p>
            <p>
              4. Duplicate it (<code>Shift + D</code>) to create more shelves
            </p>
            <p>5. Position each shelf vertically using the Y coordinate</p>
          </div>
        </div>

        <div className="accent-box">
          <h3 className="text-2xl font-bold mb-md">Step 3: Add the Sides</h3>
          <div className="grid gap-md text-sm">
            <p>1. Add a new part: 36" × 3/4" × 10" for the side panels</p>
            <p>2. Name it "Side Panel" and assign the same stock</p>
            <p>3. Rotate or position it vertically</p>
            <p>4. Duplicate and position the second side</p>
          </div>
        </div>

        <div className="accent-box">
          <h3 className="text-2xl font-bold mb-md">
            Step 4: Generate Your Cut List
          </h3>
          <div className="grid gap-md text-sm">
            <p>
              1. Click <strong>"Generate Cut List"</strong> in the sidebar to
              open the cut list
            </p>
            <p>
              2. Review the optimized cutting diagrams showing how to cut your
              parts from standard sheets
            </p>
            <p>3. Check the shopping list to see how much material you need</p>
            <p>
              4. Export as PDF to take to the workshop or share with your lumber
              supplier
            </p>
          </div>
        </div>
      </div>

      <DocsPrevNext />
    </section>
  );
}
