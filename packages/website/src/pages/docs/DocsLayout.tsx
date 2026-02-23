import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import BuyButton from "../../components/BuyButton";
import Footer from "../../components/Footer";
import Header from "../../components/Header";
import { getNavSections, matchesDocSearch } from "./docsNavConfig";

const navSections = getNavSections();

export default function DocsLayout() {
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredNavSections = useMemo(() => {
    if (!normalizedQuery) return navSections;

    return navSections
      .map((section) => ({
        ...section,
        pages: section.pages.filter((page) =>
          matchesDocSearch(page, normalizedQuery),
        ),
      }))
      .filter((section) => section.pages.length > 0);
  }, [normalizedQuery]);

  const showChangelogLink =
    !normalizedQuery ||
    "changelog release notes updates".includes(normalizedQuery);
  const hasResults = filteredNavSections.length > 0 || showChangelogLink;

  return (
    <div className="site-shell">
      <Header />

      {/* Main Content */}
      <main id="main-content" className="page-content container">
        <div className="py-16 max-md:py-12 max-sm:py-8">
          {/* Page Header */}
          <div className="site-section mb-12 p-8 text-center flex flex-col justify-center">
            <img
              src="/branding/CarvdStudio-Horizontal-Words.svg"
              alt=""
              aria-hidden="true"
              className="h-20 w-auto sm:h-20"
            />
            <h1 className="mb-6 text-6xl font-bold max-md:text-4xl max-sm:text-3xl max-[380px]:text-lg max-[320px]:text-base">
              Documentation
            </h1>
            <p className="mx-auto max-w-2xl text-xl text-text-muted max-md:max-w-full">
              Everything you need to design furniture like a pro.
            </p>
          </div>

          <div className="mx-auto flex max-w-[1200px] gap-12 max-lg:flex-col max-lg:gap-8">
            {/* Sidebar Navigation (Desktop) */}
            <aside className="w-[250px] shrink-0 max-lg:hidden">
              <nav
                className="site-section sticky top-[96px] max-h-[calc(100vh-112px)] overflow-y-auto px-4 py-5 pb-6 [&::-webkit-scrollbar-thumb:hover]:bg-text-muted [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1"
                aria-label="Documentation"
              >
                <div className="mb-5">
                  <div className="relative">
                    <Search
                      size={14}
                      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search docs..."
                      className="h-9 w-full rounded-md border border-border bg-bg px-3 pl-8 pr-8 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-accent"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-text-muted transition-colors hover:bg-surface hover:text-text"
                        onClick={() => setSearchQuery("")}
                        aria-label="Clear search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
                {filteredNavSections.map((section) => (
                  <div key={section.title} className="mb-6">
                    <p className="mb-2 text-sm font-bold uppercase tracking-[0.05em] text-text">
                      {section.title}
                    </p>
                    <ul className="flex flex-col gap-1">
                      {section.pages.map((page) => (
                        <li key={page.slug}>
                          <NavLink
                            to={`/docs/${page.slug}`}
                            className={({ isActive }) =>
                              cn(
                                "block rounded-md px-2 py-1 text-sm text-text-muted transition-all duration-150",
                                "hover:bg-surface hover:text-text",
                                isActive &&
                                  "bg-surface-elevated text-highlight",
                              )
                            }
                          >
                            {page.title}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {showChangelogLink && (
                  <div className="mb-6">
                    <ul className="flex flex-col gap-1">
                      <li>
                        <a
                          href="/changelog"
                          className="block rounded-md px-2 py-1 text-sm text-text-muted transition-all duration-150 hover:bg-surface hover:text-text"
                        >
                          Changelog
                        </a>
                      </li>
                    </ul>
                  </div>
                )}
                {!hasResults && (
                  <p className="px-2 py-1 text-sm text-text-muted">
                    No matching docs.
                  </p>
                )}
              </nav>
            </aside>

            {/* Main Content Area */}
            <div className="min-w-0 flex-1 max-w-[896px]">
              {/* Mobile TOC */}
              <nav
                className="site-section mb-12 hidden p-6 max-lg:block"
                aria-label="Table of contents"
              >
                <h2 className="mb-4 text-xl font-bold">Contents</h2>
                <div className="relative mb-4">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search docs..."
                    className="h-10 w-full rounded-md border border-border bg-bg px-3 pl-8 pr-8 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-accent"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-text-muted transition-colors hover:bg-surface hover:text-text"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
                  {filteredNavSections.map((section) => (
                    <div key={section.title}>
                      <p className="mb-2 text-sm font-bold">{section.title}</p>
                      <ul className="grid gap-1 text-sm text-text-muted">
                        {section.pages.map((page) => (
                          <li key={page.slug}>
                            <a
                              href={`/docs/${page.slug}`}
                              className="inline-flex min-h-11 items-center px-2 py-1 font-medium text-text transition-colors hover:text-highlight"
                            >
                              {page.title}
                            </a>
                          </li>
                        ))}
                        {section.title === "Reference" && showChangelogLink && (
                          <li>
                            <a
                              href="/changelog"
                              className="inline-flex min-h-11 items-center px-2 py-1 font-medium text-text transition-colors hover:text-highlight"
                            >
                              Changelog
                            </a>
                          </li>
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
                {!hasResults && (
                  <p className="mt-2 text-sm text-text-muted">
                    No matching docs.
                  </p>
                )}
              </nav>

              <Outlet />

              {/* Support Section */}
              <section className="mt-16 mb-16 max-md:mt-12 max-md:mb-12 max-sm:mt-8 max-sm:mb-8">
                <div className="site-section p-16 text-center max-md:p-12 max-sm:p-8">
                  <h2 className="mb-4 text-4xl font-bold max-md:text-2xl max-sm:text-xl">
                    Still Have Questions?
                  </h2>
                  <p className="mx-auto mb-8 max-w-[600px] text-xl text-text-muted max-md:text-lg max-sm:text-base">
                    Email our support team. You'll get help from actual
                    woodworkers who know the software inside and out.
                  </p>
                  <Button asChild size="lg">
                    <a href="mailto:support@carvd-studio.com">Email Support</a>
                  </Button>
                  <p className="mt-4 text-sm text-text-muted">
                    Average response time: 24 hours or less
                  </p>
                </div>
              </section>

              {/* CTA */}
              <div className="site-section mt-16 p-8 text-center max-md:mt-12 max-sm:mt-8 max-sm:p-6">
                <h2 className="mb-4 text-3xl font-bold max-md:text-xl max-sm:text-lg">
                  Ready to Get Started?
                </h2>
                <p className="mb-6 text-lg text-text-muted">
                  Download Carvd Studio and design your first project today.
                </p>
                <div className="flex justify-center gap-4 max-sm:flex-col max-sm:items-center">
                  <Button
                    asChild
                    size="lg"
                    className="bg-highlight text-bg hover:bg-highlight/90"
                  >
                    <a href="/download">Download Free Trial</a>
                  </Button>
                  <BuyButton />
                </div>
              </div>
            </div>
            {/* End docs-content */}
          </div>
          {/* End docs-layout */}

          {/* Back Link */}
          <a
            href="/"
            className="mt-16 block text-center text-accent font-medium hover:text-accent-hover hover:underline max-md:mt-12 max-sm:mt-8"
          >
            &larr; Back to Home
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
