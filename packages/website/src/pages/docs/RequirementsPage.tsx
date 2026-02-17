import SEO from "../../components/SEO";
import { createBreadcrumbSchema } from "../../utils/jsonLd";
import DocsPrevNext from "./DocsPrevNext";

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
        <div className="card">
          <h3 className="card-title">macOS</h3>
          <ul className="checklist text-sm">
            <li>
              <span>macOS 10.15 (Catalina) or later</span>
            </li>
            <li>
              <span>4 GB RAM minimum</span>
            </li>
            <li>
              <span>200 MB available disk space</span>
            </li>
            <li>
              <span>Intel or Apple Silicon processor</span>
            </li>
            <li>
              <span>1280&times;720 minimum display resolution</span>
            </li>
          </ul>
        </div>

        <div className="card">
          <h3 className="card-title">Windows</h3>
          <ul className="checklist text-sm">
            <li>
              <span>Windows 10 or Windows 11 (64-bit)</span>
            </li>
            <li>
              <span>4 GB RAM minimum</span>
            </li>
            <li>
              <span>200 MB available disk space</span>
            </li>
            <li>
              <span>Intel Core i3 or equivalent</span>
            </li>
            <li>
              <span>1280&times;720 minimum display resolution</span>
            </li>
          </ul>
        </div>
      </div>

      <DocsPrevNext />
    </section>
  );
}
