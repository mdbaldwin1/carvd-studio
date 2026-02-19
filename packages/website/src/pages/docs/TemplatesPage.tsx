import { ClipboardList, Save } from "lucide-react";
import SEO from "../../components/SEO";
import { createBreadcrumbSchema } from "../../utils/jsonLd";
import DocsPrevNext from "./DocsPrevNext";

export default function TemplatesPage() {
  return (
    <section>
      <SEO
        title="Templates - Docs"
        description="Start projects from built-in or custom templates. Save your own furniture designs as reusable project templates."
        path="/docs/templates"
        jsonLd={createBreadcrumbSchema([
          { name: "Docs", path: "/docs" },
          { name: "Templates", path: "/docs/templates" },
        ])}
      />
      <h2 className="text-4xl font-bold mb-xl">Templates</h2>

      <p className="text-muted mb-xl">
        Templates are complete project starting points — full furniture designs
        with all parts, stocks, and settings pre-configured. Use built-in
        templates or create your own.
      </p>

      <div className="grid gap-xl">
        <div className="rounded-lg border border-[rgba(74,144,226,0.3)] bg-linear-to-br from-[rgba(74,144,226,0.1)] to-[rgba(74,144,226,0.05)] p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
            <ClipboardList size={20} /> Using Templates
          </h3>
          <div className="grid gap-md text-sm">
            <p>1. From the start screen, click "New from Template"</p>
            <p>2. Browse categories or search for specific designs</p>
            <p>3. Preview the template with part count and description</p>
            <p>
              4. Click "Create Project" to start a new project from the template
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-[rgba(74,144,226,0.3)] bg-linear-to-br from-[rgba(74,144,226,0.1)] to-[rgba(74,144,226,0.05)] p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
            <Save size={20} /> Creating Custom Templates
          </h3>
          <div className="grid gap-md text-sm">
            <p>1. Design your project with all parts, stocks, and settings</p>
            <p>2. File → "Save as Template"</p>
            <p>3. Add a name, description, and optional category</p>
            <p>
              4. Your template appears in the template browser for future
              projects
            </p>
          </div>
          <p className="text-sm text-muted mt-md">
            <strong>Note:</strong> Custom templates require a license. Built-in
            templates are available in all versions.
          </p>
        </div>
      </div>

      <DocsPrevNext />
    </section>
  );
}
