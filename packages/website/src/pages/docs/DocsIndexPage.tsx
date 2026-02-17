import SEO from "../../components/SEO";
import { getNavSections } from "./docsNavConfig";

const navSections = getNavSections();

export default function DocsIndexPage() {
  return (
    <div>
      <SEO
        title="Documentation"
        description="Comprehensive documentation for Carvd Studio. Guides, tutorials, and reference for all features."
        path="/docs"
      />
      <h2 className="text-3xl font-bold mb-xl">Welcome to the Docs</h2>
      <p className="text-muted mb-2xl">
        Browse the sections below or use the sidebar to jump to a specific
        topic.
      </p>
      <div className="grid gap-xl">
        {navSections.map((section) => (
          <div key={section.title}>
            <h3 className="text-xl font-bold mb-md">{section.title}</h3>
            <div className="grid grid-cols-2 gap-md">
              {section.pages.map((page) => (
                <a key={page.slug} href={`/docs/${page.slug}`} className="card">
                  <h4 className="card-title">{page.title}</h4>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
