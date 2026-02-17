import changelogRaw from "virtual:changelog";
import { parseChangelog } from "../utils/changelogParser";
import SEO from "../components/SEO";
import Header from "../components/Header";
import Footer from "../components/Footer";

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

function getCategoryBadgeClass(name: string): string {
  switch (name.toLowerCase()) {
    case "added":
      return "badge-success";
    case "changed":
      return "badge-primary";
    case "fixed":
      return "badge-warning";
    case "removed":
      return "badge-highlight";
    case "deprecated":
      return "badge-warning";
    case "security":
      return "badge-primary";
    default:
      return "";
  }
}

export default function ChangelogPage() {
  return (
    <div className="page bg-gradient-radial">
      <SEO
        title="Changelog"
        description="Latest updates and release notes for Carvd Studio. See what's new in each version."
        path="/changelog"
      />
      <Header />

      {/* Main Content */}
      <main id="main-content" className="page-content container">
        <div className="py-3xl">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-5xl font-bold mb-lg">Changelog</h1>
            <p className="text-muted mb-3xl">
              All notable changes to Carvd Studio are documented here. This
              project follows{" "}
              <a
                href="https://semver.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent"
              >
                Semantic Versioning
              </a>
              .
            </p>

            <div className="grid gap-3xl">
              {versions.map((version) => (
                <section
                  key={version.version}
                  id={`v${version.version}`}
                  className="changelog-version"
                >
                  <div className="flex items-center gap-md mb-lg">
                    <span className="badge badge-highlight">
                      v{version.version}
                    </span>
                    <span className="text-muted text-sm">
                      {formatDate(version.date)}
                    </span>
                  </div>

                  {version.categories.map((category) => (
                    <div key={category.name} className="mb-xl">
                      <div className="mb-md">
                        <span
                          className={`badge ${getCategoryBadgeClass(category.name)}`}
                        >
                          {category.name}
                        </span>
                      </div>
                      <ul className="changelog-entries">
                        {category.entries.map((entry, i) => (
                          <li key={i} className="changelog-entry">
                            {entry.description ? (
                              <>
                                <strong>{entry.text}</strong>
                                <span className="text-muted">
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
            <a href="/docs" className="back-link mt-3xl block">
              ← Back to Documentation
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
