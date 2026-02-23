import changelogRaw from "virtual:changelog";
import { parseChangelog } from "../utils/changelogParser";
import SEO from "../components/SEO";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Badge } from "@/components/ui/badge";

const versions = parseChangelog(changelogRaw);

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getCategoryBadgeClasses(name: string): string {
  switch (name.toLowerCase()) {
    case "added":
      return "border-success bg-[rgba(76,175,80,0.2)] text-success";
    case "changed":
      return "border-primary bg-[rgba(7,113,135,0.2)] text-primary-text";
    case "fixed":
      return "border-warning bg-[rgba(255,210,31,0.2)] text-warning";
    case "removed":
      return "border-accent bg-[rgba(174,164,191,0.2)] text-accent";
    case "deprecated":
      return "border-warning bg-[rgba(255,210,31,0.2)] text-warning";
    case "security":
      return "border-primary bg-[rgba(7,113,135,0.2)] text-primary-text";
    default:
      return "";
  }
}

export default function ChangelogPage() {
  return (
    <div className="site-shell">
      <SEO
        title="Changelog"
        description="Latest updates and release notes for Carvd Studio. See what's new in each version."
        path="/changelog"
      />
      <Header />

      {/* Main Content */}
      <main id="main-content" className="container flex-1">
        <div className="py-16">
          <div className="mx-auto max-w-3xl">
            <h1 className="mb-6 text-5xl font-bold max-md:text-4xl max-sm:text-3xl">
              Changelog
            </h1>
            <p className="mb-16 text-text-muted">
              All notable changes to Carvd Studio are documented here. This
              project follows{" "}
              <a
                href="https://semver.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent transition-colors hover:text-accent-hover hover:underline"
              >
                Semantic Versioning
              </a>
              .
            </p>

            <div className="grid gap-16">
              {versions.map((version) => (
                <section
                  key={version.version}
                  id={`v${version.version}`}
                  className="border-l-[3px] border-accent pl-6"
                >
                  <div className="mb-6 flex items-center gap-4">
                    <Badge
                      variant="outline"
                      className="border-accent bg-[rgba(174,164,191,0.2)] text-accent"
                    >
                      v{version.version}
                    </Badge>
                    <span className="text-sm text-text-muted">
                      {formatDate(version.date)}
                    </span>
                  </div>

                  {version.categories.map((category) => (
                    <div key={category.name} className="mb-8">
                      <div className="mb-4">
                        <Badge
                          variant="outline"
                          className={getCategoryBadgeClasses(category.name)}
                        >
                          {category.name}
                        </Badge>
                      </div>
                      <ul className="m-0 flex list-none flex-col gap-2 p-0">
                        {category.entries.map((entry, i) => (
                          <li key={i} className="py-1 text-sm leading-relaxed">
                            {entry.description ? (
                              <>
                                <strong className="text-text">
                                  {entry.text}
                                </strong>
                                <span className="text-text-muted">
                                  {" "}
                                  — {entry.description}
                                </span>
                              </>
                            ) : (
                              <span>{entry.text}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              ))}
            </div>

            {/* Back Link */}
            <a
              href="/docs"
              className="mt-16 block inline-flex items-center gap-1 font-medium text-accent transition-colors hover:text-accent-hover hover:underline"
            >
              ← Back to Documentation
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
