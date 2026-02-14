import changelogRaw from "virtual:changelog";
import { parseChangelog } from "../utils/changelogParser";

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
      {/* Header */}
      <header className="header">
        <nav className="nav container">
          <a href="/" className="nav-brand">
            Carvd Studio
          </a>
          <div className="nav-links">
            <a href="/features" className="nav-link">
              Features
            </a>
            <a href="/pricing" className="nav-link">
              Pricing
            </a>
            <a href="/docs" className="nav-link">
              Docs
            </a>
            <a href="/download" className="btn btn-highlight btn-sm">
              Download
            </a>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="page-content container">
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

      {/* Footer */}
      <footer className="footer container">
        <div className="mb-lg">
          <div className="flex justify-center gap-2xl mb-md">
            <a href="/features" className="nav-link">
              Features
            </a>
            <a href="/pricing" className="nav-link">
              Pricing
            </a>
            <a href="/docs" className="nav-link">
              Documentation
            </a>
            <a href="/support" className="nav-link">
              Support
            </a>
          </div>
          <div className="flex justify-center gap-xl text-sm text-muted">
            <a href="/privacy" className="nav-link">
              Privacy Policy
            </a>
            <a href="/terms" className="nav-link">
              Terms of Service
            </a>
            <a href="/changelog" className="nav-link">
              Changelog
            </a>
          </div>
        </div>
        <p>&copy; 2026 Carvd Studio. All rights reserved.</p>
      </footer>
    </div>
  );
}
