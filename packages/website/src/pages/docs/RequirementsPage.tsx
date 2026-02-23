import SEO from "../../components/SEO";
import { createBreadcrumbSchema } from "../../utils/jsonLd";
import DocsPrevNext from "./DocsPrevNext";

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-[var(--space-md)] mb-[var(--space-md)]">
      <span className="shrink-0 text-xl font-bold text-success">✓</span>
      <span>{children}</span>
    </li>
  );
}

export default function RequirementsPage() {
  return (
    <section>
      <SEO
        title="System Requirements - Docs"
        description="Minimum system requirements for Carvd Studio on macOS and Windows. RAM, disk space, and display specs."
        path="/docs/requirements"
        jsonLd={createBreadcrumbSchema([
          { name: "Docs", path: "/docs" },
          { name: "System Requirements", path: "/docs/requirements" },
        ])}
      />
      <h2 className="text-4xl font-bold mb-xl">System Requirements</h2>

      <div className="grid grid-cols-2 gap-xl">
        <div className="rounded-lg border border-border bg-surface p-[var(--space-lg)] transition-all duration-250 hover:border-accent hover:shadow-[var(--shadow-md)]">
          <h3 className="text-xl font-bold mb-[var(--space-sm)]">macOS</h3>
          <ul className="text-sm">
            <CheckItem>macOS 10.15 (Catalina) or later</CheckItem>
            <CheckItem>4 GB RAM minimum</CheckItem>
            <CheckItem>200 MB available disk space</CheckItem>
            <CheckItem>Intel or Apple Silicon processor</CheckItem>
            <CheckItem>1280&times;720 minimum display resolution</CheckItem>
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-surface p-[var(--space-lg)] transition-all duration-250 hover:border-accent hover:shadow-[var(--shadow-md)]">
          <h3 className="text-xl font-bold mb-[var(--space-sm)]">Windows</h3>
          <ul className="text-sm">
            <CheckItem>Windows 10 or Windows 11 (64-bit)</CheckItem>
            <CheckItem>4 GB RAM minimum</CheckItem>
            <CheckItem>200 MB available disk space</CheckItem>
            <CheckItem>Intel Core i3 or equivalent</CheckItem>
            <CheckItem>1280&times;720 minimum display resolution</CheckItem>
          </ul>
        </div>
      </div>

      <DocsPrevNext />
    </section>
  );
}
