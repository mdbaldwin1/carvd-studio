import DocsPrevNext from "./DocsPrevNext";

export default function QuickStartPage() {
  return (
    <section>
      <h2 className="text-4xl font-bold mb-xl">Quick Start Guide</h2>

      <div className="accent-box mb-xl">
        <p className="font-bold mb-sm">Get building in 5 minutes:</p>
        <ol className="grid gap-md text-sm">
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

      <div className="accent-box-highlight">
        <p className="text-lg font-bold mb-sm">
          Your 14-Day Trial Includes Everything
        </p>
        <p className="text-sm text-muted mb-md">
          Unlimited parts, cut list optimizer, PDF export, assemblies, groups,
          and custom templates. No credit card required.
        </p>
        <div className="flex gap-md">
          <a href="/download" className="btn btn-highlight btn-sm">
            Download Free Trial
          </a>
          <a href="/pricing" className="btn btn-outline btn-sm">
            See Pricing
          </a>
        </div>
      </div>

      <DocsPrevNext />
    </section>
  );
}
