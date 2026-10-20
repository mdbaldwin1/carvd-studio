import SEO from "../components/SEO";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Button } from "@/components/ui/button";

export default function Release130Page() {
  return (
    <div className="site-shell">
      <SEO
        title="Carvd Studio 1.3.0: Cuts, Joinery & Shop Reports"
        description="Model part cuts, preview matching joints, plan drilling and router profiles, and carry per-cut instructions into your shop reports with Carvd Studio 1.3.0."
        path="/updates/1-3-0"
      />
      <Header />
      <main id="main-content" className="container flex-1 py-16 max-sm:py-8">
        <article className="mx-auto max-w-5xl">
          <header className="mb-12 max-w-3xl">
            <p className="mb-4 font-semibold uppercase tracking-widest text-highlight">
              Carvd Studio · Version 1.3.0
            </p>
            <h1 className="mb-6 text-5xl font-bold leading-tight max-md:text-4xl max-sm:text-3xl">
              Plan the joinery. Shape the parts. Take the details to the shop.
            </h1>
            <p className="text-xl leading-relaxed text-text-muted">
              Carvd Studio 1.3.0 is here, with new tools for planning how your
              woodworking projects fit together. Model the cuts in each board,
              lay out matching joints, and carry the details into your
              fabrication reports.
            </p>
          </header>
          <section className="site-section mb-8 p-8 max-sm:p-5">
            <h2 className="mb-4 text-3xl font-bold max-sm:text-2xl">
              Model the cuts that make the joint
            </h2>
            <p className="leading-relaxed text-text-muted">
              The new Part Cuts workspace lets you shape individual boards with
              dados, grooves, rabbets, mortises, tenons, half laps, mitres,
              bevels, holes, and routed profiles. Edit the dimensions, inspect
              the result in 3D, and copy cuts to other parts when a project
              calls for repeats.
            </p>
          </section>
          <section className="site-section mb-8 p-8 max-sm:p-5">
            <h2 className="mb-4 text-3xl font-bold max-sm:text-2xl">
              Lay out both sides together
            </h2>
            <p className="mb-6 leading-relaxed text-text-muted">
              Preview matching box joints, dovetails, and mortise-and-tenon
              layouts before applying cuts to both boards. Fit a dado to the
              actual mating part or a tenon to its mortise, then use assembly
              references to bring the pieces together. Plan around the stock
              dimensions you actually have.
            </p>
            <figure>
              <a
                href="/screenshots/docs-joinery-layout.jpg"
                aria-label="View matching joint preview at full size"
              >
                <img
                  src="/screenshots/docs-joinery-layout.jpg"
                  alt="Matching joint dialog with a box-joint preview showing complementary cuts on two boards"
                  width="1415"
                  height="768"
                  className="w-full rounded-xl border border-border"
                />
              </a>
              <figcaption className="mt-3 text-sm text-text-muted">
                Preview complementary cuts on both boards before applying the
                layout.
              </figcaption>
            </figure>
            <a
              href="/docs/joinery"
              className="mt-5 inline-block text-accent underline underline-offset-4"
            >
              Explore matching layouts and assembly →
            </a>
          </section>
          <section className="site-section mb-8 p-8 max-sm:p-5">
            <h2 className="mb-4 text-3xl font-bold max-sm:text-2xl">
              Plan the drilling and routing
            </h2>
            <p className="mb-6 leading-relaxed text-text-muted">
              Create linear, grid, and circular hole patterns for repeated
              drilling. Model dowels and purchased inserts, including biscuits
              and Domino tenons, with matching socket layouts. Explore built-in
              edge profiles or create and import custom router profiles, then
              inspect their cross-sections and assign physical router tools.
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              <figure>
                <a
                  href="/screenshots/docs-hole-pattern.jpg"
                  aria-label="View drilling pattern at full size"
                >
                  <img
                    src="/screenshots/docs-hole-pattern.jpg"
                    alt="A two-row shelf-pin hole pattern being edited in the Part Cuts workspace"
                    width="1415"
                    height="768"
                    loading="lazy"
                    className="w-full rounded-xl border border-border"
                  />
                </a>
                <figcaption className="mt-3 text-sm text-text-muted">
                  Lay out repeated holes with editable spacing.
                </figcaption>
              </figure>
              <figure>
                <a
                  href="/screenshots/docs-edge-profile.jpg"
                  aria-label="View router profile at full size"
                >
                  <img
                    src="/screenshots/docs-edge-profile.jpg"
                    alt="A bead edge profile on a board with its cross-section visible in the inspector"
                    width="1415"
                    height="768"
                    loading="lazy"
                    className="w-full rounded-xl border border-border"
                  />
                </a>
                <figcaption className="mt-3 text-sm text-text-muted">
                  Inspect the profile and cross-section while editing.
                </figcaption>
              </figure>
            </div>
          </section>
          <section className="site-section mb-8 p-8 max-sm:p-5">
            <h2 className="mb-4 text-3xl font-bold max-sm:text-2xl">
              Take more detail into the shop
            </h2>
            <p className="leading-relaxed text-text-muted">
              Cut lists and PDF/CSV reports now carry per-cut fabrication
              instructions alongside blank dimensions. Operations can be grouped
              by machine setup, while shopping lists account for rods and
              purchased inserts. Updated guides include worked joint recipes and
              real app screenshots to help you get started.
            </p>
            <a
              href="/docs/cut-lists"
              className="mt-5 inline-block text-accent underline underline-offset-4"
            >
              See what goes into your reports →
            </a>
          </section>
          <section className="py-8 text-center">
            <h2 className="mb-4 text-3xl font-bold">Start with one board</h2>
            <p className="mx-auto mb-6 max-w-2xl leading-relaxed text-text-muted">
              Open a project, select a board, and choose{" "}
              <strong>Edit Part Cuts</strong>. Add a cut, inspect it, and apply
              it. Then explore matching layouts when you are ready to work on a
              pair of parts.
            </p>
            <p className="mb-6 text-text-muted">
              Available for macOS, Windows, and Linux.
            </p>
            <Button size="lg" asChild>
              <a href="/download">Download Carvd Studio</a>
            </Button>
            <div className="mt-6 flex flex-wrap justify-center gap-6">
              <a
                href="/docs/part-cuts"
                className="text-accent underline underline-offset-4"
              >
                Part Cuts guide
              </a>
              <a
                href="/changelog#v1.3.0"
                className="text-accent underline underline-offset-4"
              >
                Full 1.3.0 release notes
              </a>
            </div>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
}
