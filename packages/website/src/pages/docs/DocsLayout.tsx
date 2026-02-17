import { Outlet, NavLink } from "react-router-dom";
import BuyButton from "../../components/BuyButton";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { getNavSections } from "./docsNavConfig";

const navSections = getNavSections();

export default function DocsLayout() {
  return (
    <div className="page bg-gradient-radial">
      <Header />

      {/* Main Content */}
      <main className="page-content container">
        <div className="py-3xl">
          {/* Page Header */}
          <div className="text-center mb-2xl">
            <h1 className="text-6xl font-bold mb-lg">Documentation</h1>
            <p className="text-xl text-muted max-w-2xl mx-auto">
              Everything you need to design furniture like a pro.
            </p>
          </div>

          <div className="docs-layout">
            {/* Sidebar Navigation (Desktop) */}
            <aside className="docs-sidebar">
              <nav className="docs-sidebar-inner" aria-label="Documentation">
                {navSections.map((section) => (
                  <div key={section.title} className="docs-nav-section">
                    <p className="docs-nav-title">{section.title}</p>
                    <ul className="docs-nav-list">
                      {section.pages.map((page) => (
                        <li key={page.slug}>
                          <NavLink
                            to={`/docs/${page.slug}`}
                            className={({ isActive }) =>
                              `docs-nav-link${isActive ? " active" : ""}`
                            }
                          >
                            {page.title}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <div className="docs-nav-section">
                  <ul className="docs-nav-list">
                    <li>
                      <a href="/changelog" className="docs-nav-link">
                        Changelog
                      </a>
                    </li>
                  </ul>
                </div>
              </nav>
            </aside>

            {/* Main Content Area */}
            <div className="docs-content">
              {/* Mobile TOC */}
              <nav className="docs-mobile-toc" aria-label="Table of contents">
                <h2 className="docs-mobile-toc-title">Contents</h2>
                <div className="docs-mobile-toc-grid">
                  {navSections.map((section) => (
                    <div key={section.title}>
                      <p className="font-bold mb-sm text-sm">{section.title}</p>
                      <ul className="text-muted grid gap-xs text-sm">
                        {section.pages.map((page) => (
                          <li key={page.slug}>
                            <a href={`/docs/${page.slug}`} className="nav-link">
                              {page.title}
                            </a>
                          </li>
                        ))}
                        {section.title === "Reference" && (
                          <li>
                            <a href="/changelog" className="nav-link">
                              Changelog
                            </a>
                          </li>
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              </nav>

              <Outlet />

              {/* Support Section */}
              <section className="mb-3xl mt-3xl">
                <div className="cta-section">
                  <h2 className="cta-title">Still Have Questions?</h2>
                  <p className="cta-description mb-lg">
                    Email our support team. You'll get help from actual
                    woodworkers who know the software inside and out.
                  </p>
                  <a
                    href="mailto:support@carvd-studio.com"
                    className="btn btn-primary btn-lg"
                  >
                    Email Support
                  </a>
                  <p className="text-sm text-muted mt-md">
                    Average response time: 24 hours or less
                  </p>
                </div>
              </section>

              {/* CTA */}
              <div className="accent-box-highlight text-center mt-3xl">
                <h2 className="text-3xl font-bold mb-md">
                  Ready to Get Started?
                </h2>
                <p className="text-lg text-muted mb-lg">
                  Download Carvd Studio and design your first project today.
                </p>
                <div className="flex gap-md justify-center">
                  <a href="/download" className="btn btn-highlight btn-lg">
                    Download Free Trial
                  </a>
                  <BuyButton />
                </div>
              </div>
            </div>
            {/* End docs-content */}
          </div>
          {/* End docs-layout */}

          {/* Back Link */}
          <a href="/" className="back-link mt-3xl block text-center">
            &larr; Back to Home
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
