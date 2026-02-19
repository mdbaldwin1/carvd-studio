import { Outlet, NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
      <main id="main-content" className="page-content container">
        <div className="py-16 max-md:py-12 max-sm:py-8">
          {/* Page Header */}
          <div className="mb-12 text-center">
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
                className="sticky top-[100px] max-h-[calc(100vh-120px)] overflow-y-auto pb-8 [&::-webkit-scrollbar-thumb:hover]:bg-text-muted [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1"
                aria-label="Documentation"
              >
                {navSections.map((section) => (
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
                                "block rounded-sm px-2 py-1 text-sm text-text-muted transition-all duration-150",
                                "hover:bg-surface hover:text-text",
                                isActive && "bg-surface text-accent",
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
                <div className="mb-6">
                  <ul className="flex flex-col gap-1">
                    <li>
                      <a
                        href="/changelog"
                        className="block rounded-sm px-2 py-1 text-sm text-text-muted transition-all duration-150 hover:bg-surface hover:text-text"
                      >
                        Changelog
                      </a>
                    </li>
                  </ul>
                </div>
              </nav>
            </aside>

            {/* Main Content Area */}
            <div className="min-w-0 flex-1 max-w-[896px]">
              {/* Mobile TOC */}
              <nav
                className="mb-12 hidden rounded-lg bg-surface p-6 max-lg:block"
                aria-label="Table of contents"
              >
                <h2 className="mb-4 text-xl font-bold">Contents</h2>
                <div className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
                  {navSections.map((section) => (
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
                        {section.title === "Reference" && (
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
              </nav>

              <Outlet />

              {/* Support Section */}
              <section className="mt-16 mb-16 max-md:mt-12 max-md:mb-12 max-sm:mt-8 max-sm:mb-8">
                <div className="rounded-xl border-2 border-accent bg-gradient-to-br from-surface to-surface-elevated p-16 text-center max-md:p-12 max-sm:p-8">
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
              <div className="mt-16 rounded-lg border border-[rgba(174,164,191,0.4)] bg-gradient-to-br from-[rgba(174,164,191,0.15)] to-[rgba(174,164,191,0.05)] p-8 text-center max-md:mt-12 max-sm:mt-8 max-sm:p-6">
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
