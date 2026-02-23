import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import SEO from "../../components/SEO";
import { createBreadcrumbSchema } from "../../utils/jsonLd";
import { getNavSections } from "./docsNavConfig";

const navSections = getNavSections();

export default function DocsIndexPage() {
  return (
    <div>
      <SEO
        title="Documentation"
        description="Comprehensive documentation for Carvd Studio. Guides, tutorials, and reference for all features."
        path="/docs"
        jsonLd={createBreadcrumbSchema([
          { name: "Documentation", path: "/docs" },
        ])}
      />
      <h2 className="mb-8 text-3xl font-bold max-md:text-xl max-sm:text-lg">
        Welcome to the Docs
      </h2>
      <div className="site-section mb-12 p-5">
        <p className="text-text-muted">
          Browse the sections below or use the sidebar to jump to a specific
          topic.
        </p>
      </div>
      <div className="grid gap-8">
        {navSections.map((section) => (
          <div key={section.title}>
            <h3 className="mb-4 text-xl font-bold">{section.title}</h3>
            <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
              {section.pages.map((page) => (
                <a
                  key={page.slug}
                  href={`/docs/${page.slug}`}
                  className="no-underline"
                >
                  <Card className="feature-card">
                    <CardHeader>
                      <CardTitle className="text-xl">{page.title}</CardTitle>
                    </CardHeader>
                  </Card>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
