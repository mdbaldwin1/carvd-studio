import SEO from "../../components/SEO";
import { createBreadcrumbSchema } from "../../utils/jsonLd";
import DocsPrevNext from "./DocsPrevNext";
import { Button } from "@/components/ui/button";

export default function QuickStartPage() {
  return (
    <section>
      <SEO
        title="Quick Start Guide - Docs"
        description="Get started with Carvd Studio in 5 minutes. Download, create a project, add parts, and generate your first cut list."
        path="/docs/quick-start"
        jsonLd={createBreadcrumbSchema([
          { name: "Docs", path: "/docs" },
          { name: "Quick Start Guide", path: "/docs/quick-start" },
        ])}
      />
      <h2 className="mb-8 text-4xl font-bold">Quick Start Guide</h2>

      <div className="mb-8 rounded-lg border border-[rgba(74,144,226,0.3)] bg-linear-to-br from-[rgba(74,144,226,0.1)] to-[rgba(74,144,226,0.05)] p-[var(--space-xl)]">
        <p className="mb-2 font-bold">Get building in 5 minutes:</p>
        <ol className="grid gap-4 text-sm">
          <li>
            <strong>1. Download & Install</strong> — Get Carvd Studio from the{" "}
            <a href="/download" className="text-accent">
              download page
            </a>
          </li>
          <li>
            <strong>2. Create a Project</strong> — Launch the app and click "New
            Project"
          </li>
          <li>
            <strong>3. Add Parts</strong> — Click the + button or press{" "}
            <code>N</code> to add your first piece of wood
          </li>
          <li>
            <strong>4. Set Dimensions</strong> — Enter width, height, and depth
            in the properties panel
          </li>
          <li>
            <strong>5. Assign Stock</strong> — Select a stock material (3/4"
            plywood, 1x6 pine, etc.)
          </li>
          <li>
            <strong>6. Generate Cut List</strong> — Press{" "}
            <code>Cmd/Ctrl + L</code> to see your optimized cut list
          </li>
        </ol>
      </div>

      <div className="rounded-lg border border-[rgba(174,164,191,0.4)] bg-linear-to-br from-[rgba(174,164,191,0.15)] to-[rgba(174,164,191,0.05)] p-[var(--space-xl)]">
        <p className="mb-2 text-lg font-bold">
          Your 14-Day Trial Includes Everything
        </p>
        <p className="mb-4 text-sm text-text-muted">
          Unlimited parts, cut list optimizer, PDF export, assemblies, groups,
          and custom templates. No credit card required.
        </p>
        <div className="flex gap-4">
          <Button
            asChild
            size="sm"
            className="bg-highlight text-bg hover:bg-highlight/90"
          >
            <a href="/download">Download Free Trial</a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href="/pricing">See Pricing</a>
          </Button>
        </div>
      </div>

      <DocsPrevNext />
    </section>
  );
}
