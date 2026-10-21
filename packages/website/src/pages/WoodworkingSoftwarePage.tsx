import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { Button } from "@/components/ui/button";

export default function WoodworkingSoftwarePage() {
  return (
    <div className="site-shell">
      <SEO
        title="Woodworking design software for Mac: choosing your workflow"
        description="Compare Carvd Studio, SketchUp and Woodcraft for furniture design on a Mac. Check joinery, cut lists, device support and the output you need in the shop."
        path="/learn/woodworking-software-for-mac"
      />
      <Header />
      <main id="main-content" className="container flex-1 py-16 max-sm:py-8">
        <article className="mx-auto max-w-5xl">
          <header className="mb-10">
            <Link to="/learn" className="text-sm font-semibold text-highlight">
              CARVD STUDIO / LEARN & BUILD
            </Link>
            <h1 className="mt-4 mb-5 text-5xl font-bold tracking-tight max-sm:text-4xl">
              Choose software that gets your furniture into the shop.
            </h1>
            <p className="max-w-3xl text-lg text-text-muted">
              A practical guide to woodworking design software for Mac: start
              with the project, then compare the model, the joints and the
              paperwork.
            </p>
            <p className="mt-4 text-sm text-text-muted">
              Written by the maker of Carvd Studio. Competitor details checked
              October 20, 2026 against the official sources linked below. This
              is a workflow comparison, not a hands-on performance ranking.
            </p>
          </header>
          <figure className="site-section mb-10 overflow-hidden">
            <img
              src="/screenshots/heron-front.png"
              alt="Heron wall cabinet designed in Carvd Studio, with a framed door and two drawers"
              width="1512"
              height="982"
              className="w-full h-auto"
            />
            <figcaption className="p-5 text-sm text-text-muted">
              Heron is a 29-part cabinet design study. Download its editable
              model and PDF report to see the output before choosing a tool.
            </figcaption>
          </figure>
          <section className="site-section mb-8 p-8 max-sm:p-5">
            <h2 className="mb-4 text-2xl font-bold">
              What do you need to take to the workshop?
            </h2>
            <p className="mb-5 text-text-muted">
              For a cabinet, start with actual board thickness, overall
              dimensions and assembly clearances. A convincing picture alone
              will not tell you what to buy or where to cut. Try these checks
              with one small project in each app:
            </p>
            <ol className="list-decimal space-y-3 pl-6 text-text-muted">
              <li>
                <strong className="text-text">Change a dimension.</strong> Make
                the cabinet wider, then inspect every affected part and joint.
                Check which changes the tool handles and which you must make
                yourself.
              </li>
              <li>
                <strong className="text-text">Inspect the joinery.</strong> Look
                at both halves of a dado, rabbet or dovetail and check the
                assembled orientation. Test physical fit in scrap before cutting
                project stock.
              </li>
              <li>
                <strong className="text-text">Plan the material.</strong> A
                parts list, a cutting diagram and a purchase list answer
                different questions. Check stock sizes, grain direction, saw
                kerf and allowance for defects.
              </li>
              <li>
                <strong className="text-text">Print the result.</strong> Read
                the PDF at normal size. Confirm dimensions and part names are
                usable at the bench, and regenerate it after changing the model.
              </li>
            </ol>
          </section>
          <section className="site-section mb-8 p-8 max-sm:p-5">
            <h2 className="mb-4 text-2xl font-bold">
              Carvd Studio, SketchUp or Woodcraft?
            </h2>
            <p className="mb-5 text-text-muted">
              These tools overlap, but the right choice depends on your devices
              and the work around the furniture model.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm [&_th]:p-4 [&_td]:p-4 [&_tr]:border-b [&_tr]:border-border [&_td]:align-top">
                <caption className="sr-only">
                  Workflow comparison of three design tools for Mac users
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Tool</th>
                    <th scope="col">Consider it when…</th>
                    <th scope="col">Check before choosing</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Carvd Studio</th>
                    <td>
                      You want to design furniture and cabinets with joinery
                      tools, optimized cut lists and PDF shop reports in one
                      app.
                    </td>
                    <td>
                      Mac download supports macOS 12 or later, Intel and Apple
                      Silicon. $99.99 one-time, with a 14-day trial. No iPad app
                      or SketchUp plugin compatibility.
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">SketchUp</th>
                    <td>
                      You need general-purpose modeling, an extension ecosystem
                      or documentation with LayOut.
                    </td>
                    <td>
                      The official plans distinguish Go (web and iPad) from Pro,
                      which includes the desktop modeler, LayOut and extensions.
                      Choose the edition that supports the workflow you actually
                      need.
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">Woodcraft 2</th>
                    <td>
                      You want a woodworking-focused workflow on Mac or iPad,
                      with tools modeled after shop operations.
                    </td>
                    <td>
                      The developer lists automatic joinery, cut lists and AR
                      export. Its site specifies macOS 26+ or iPadOS 26+ and a
                      one-time purchase; Mac and iPad editions are purchased
                      separately.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-5 text-sm text-text-muted">
              Sources:{" "}
              <a
                className="text-highlight underline"
                href="https://sketchup.trimble.com/en/plans-and-pricing"
              >
                SketchUp plans
              </a>
              ,{" "}
              <a
                className="text-highlight underline"
                href="https://www.woodcraft2.app/features.html"
              >
                Woodcraft features
              </a>{" "}
              and{" "}
              <a
                className="text-highlight underline"
                href="https://www.woodcraft2.app/support.html"
              >
                Woodcraft requirements and purchase details
              </a>
              . Features and prices can change; check each vendor before buying.
            </p>
          </section>
          <section className="site-section mb-8 p-8 max-sm:p-5">
            <h2 className="mb-4 text-2xl font-bold">
              Is Carvd a SketchUp replacement?
            </h2>
            <p className="mb-4 text-text-muted">
              It can be an alternative for a new furniture or cabinet project
              when built-in woodworking tools and a one-time purchase are your
              priorities. It is a separate design workflow: do not choose it
              expecting your SketchUp plugins or SKP projects to carry over.
            </p>
            <p className="text-text-muted">
              If your work depends on architecture, an existing SketchUp
              library, LayOut documents or specialist extensions, evaluate those
              requirements first. For CNC work, confirm the complete route from
              design to your machine’s required files; a printable shop report
              is not a machine toolpath.
            </p>
          </section>
          <section className="site-section p-8 max-sm:p-5">
            <h2 className="mb-4 text-2xl font-bold">
              Try the output before learning the whole app.
            </h2>
            <p className="mb-6 text-text-muted">
              The free Heron example includes an editable cabinet with
              dovetailed casework and drawers, a fluted framed door and French
              cleats, plus a 13-page design report. It is a design study, not a
              shop-tested plan; hardware and structural mounting details still
              need to be specified.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/learn/heron-wall-cabinet">
                  Explore the free Heron project
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/download">Try Carvd Studio for 14 days</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm">
              <Link
                className="text-highlight underline"
                to="/learn/printable-cut-list"
              >
                How to generate a printable cut list →
              </Link>
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
}
