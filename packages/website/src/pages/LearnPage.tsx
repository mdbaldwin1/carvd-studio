import { Link, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { Button } from "@/components/ui/button";

const tutorials = [
  {
    slug: "matching-joints",
    title: "Plan both halves of a joint",
    description:
      "Lay out complementary cuts together, then check the assembled fit.",
    image: "docs-joinery-layout.jpg",
    alt: "Matching cuts dialog with a box joint layout and two board roles",
    steps: [
      [
        "Start with the real boards",
        "Set the actual dimensions and stock for both parts. Name them clearly, such as Drawer front and Drawer side. Thickness matters: measure your material before entering a joint layout.",
      ],
      [
        "Select the pair",
        "Select exactly two parts with Shift-click or their checkboxes. In Properties, choose Lay out matching cuts…. Check the board roles at the top; use Swap boards if they are reversed.",
      ],
      [
        "Inspect one shared layout",
        "Choose your joint and enter its layout. The box-joint example shown here previews complementary fingers. The boards are laid flat in this preview so you can inspect the cuts; this is not their final assembled orientation.",
      ],
      [
        "Apply and check the assembly",
        "Resolve any message that prevents applying, then choose Apply matching cuts. Bring the boards together and inspect the assembled fit. Test the fit in scrap before committing your project material.",
      ],
    ],
    more: "/docs/joinery#matching-cuts",
  },
  {
    slug: "printable-cut-list",
    title: "Take a cutting plan to the shop",
    description:
      "Turn a model into a parts list, material layout and printable PDF.",
    image: "cut-list-diagrams.png",
    alt: "Carvd Studio cut-list diagrams showing parts arranged on stock",
    steps: [
      [
        "Match the stock to your material",
        "Assign stock to every part. Enter the actual board or panel dimensions and your local material price. Unassigned parts block generation; Heron starts with stock assigned. Its library prices are placeholders, not a quote.",
      ],
      [
        "Account for the saw cut",
        "Check Kerf Width in your cut-list settings against your blade. Heron starts at 1/8 inch. Check the Overage Factor too: it adds purchasing allowance for defects and mistakes.",
      ],
      [
        "Generate and review",
        "Choose Generate Cut List and resolve validation issues. Use Parts to check quantities and dimensions, Diagrams to inspect placement on each board, and Shopping to review material quantities and entered costs.",
      ],
      [
        "Print the plan",
        "Export as PDF for the workshop. Before cutting, compare the printed dimensions with your actual stock, grain direction and blade kerf. After changing the model, generate a fresh cut list so your printout matches it.",
      ],
    ],
    more: "/docs/cut-lists",
  },
];

export default function LearnPage() {
  const { pathname } = useLocation();
  const tutorial = tutorials.find((item) => pathname === `/learn/${item.slug}`);
  const heron = pathname === "/learn/heron-wall-cabinet";
  const title =
    tutorial?.title ??
    (heron
      ? "Heron: an oak-and-walnut wall cabinet"
      : "Small projects. Useful skills.");
  const description =
    tutorial?.description ??
    "Explore Heron, a free editable wall cabinet design with dovetails, a fluted oak door and a downloadable cut-list report. Built in Carvd Studio.";
  return (
    <div className="site-shell">
      <SEO title={title} description={description} path={pathname} />
      <Header />
      <main id="main-content" className="container flex-1 py-16 max-sm:py-8">
        <article className="mx-auto max-w-5xl">
          <header className="mb-10">
            <Link to="/learn" className="text-sm font-semibold text-highlight">
              CARVD STUDIO / LEARN & BUILD
            </Link>
            <h1 className="mt-4 mb-5 text-5xl font-bold tracking-tight max-sm:text-4xl">
              {title}
            </h1>
            <p className="max-w-3xl text-lg text-text-muted">{description}</p>
          </header>
          {!tutorial && (
            <section className="site-section mb-8 overflow-hidden">
              <img
                src="/screenshots/heron-front.png"
                alt="Heron in Carvd Studio: an oak wall cabinet with open shelves, a walnut-framed fluted door and two walnut drawer fronts"
                width="3024"
                height="1742"
                className="w-full"
              />
              <div className="p-8 max-sm:p-5">
                <p className="mb-3 text-sm font-semibold tracking-widest text-highlight">
                  HERON / FREE DESIGN STUDY
                </p>
                <h2 className="mb-3 text-3xl font-bold">
                  A small cabinet. Plenty to explore.
                </h2>
                <p className="mb-5 text-text-muted">
                  Warm white oak, dark walnut and an asymmetric arrangement of
                  open shelves and closed storage. Heron brings together 29
                  parts and 92 cut operations in a 36 × 24 × 10-inch cabinet.
                  Every board and cut is editable. No email signup.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <a href="/downloads/heron-wall-cabinet.carvd" download>
                      Download the Carvd project
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href="/downloads/heron-design-report.pdf" download>
                      Download cut-list report (PDF)
                    </a>
                  </Button>
                </div>
                <p className="mt-5 text-sm text-text-muted">
                  An editable design study, not a shop-tested construction plan.
                  Hardware and mounting details need to be specified before
                  fabrication. Free to download, adapt and share with credit to
                  Carvd Studio.
                </p>
                {!heron && (
                  <p className="mt-5">
                    <Link
                      to="/learn/heron-wall-cabinet"
                      className="text-highlight underline"
                    >
                      Explore the joinery and walkthrough →
                    </Link>
                  </p>
                )}
              </div>
            </section>
          )}
          {heron && (
            <>
              <section className="site-section mb-8 p-8 max-sm:p-5">
                <h2 className="mb-4 text-2xl font-bold">
                  Designed board by board in Carvd.
                </h2>
                <p className="mb-4 text-text-muted">
                  Heron was created by interacting with the desktop app: naming
                  stock, placing boards, laying out cuts and inspecting the
                  assembly. The contrast comes from a light oak case and panel
                  against the walnut door frame and drawer fronts.
                </p>
                <ul className="list-disc space-y-2 pl-5 text-text-muted">
                  <li>Through-dovetailed case corners and housed shelves.</li>
                  <li>
                    A mortise-and-tenon door frame with a floating,
                    shallow-fluted oak panel.
                  </li>
                  <li>
                    Half-blind drawer dovetails, captured plywood bottoms and
                    recessed finger pulls.
                  </li>
                  <li>
                    Complementary 45-degree French cleats and a lower wall
                    spacer.
                  </li>
                </ul>
              </section>
              <figure className="site-section mb-8 overflow-hidden">
                <img
                  src="/screenshots/heron-ghost.png"
                  alt="Heron in Ghost view, revealing case dovetails, shelves and the drawer boxes through the assembled cabinet"
                  width="3024"
                  height="1742"
                  loading="lazy"
                  className="w-full"
                />
                <figcaption className="p-4 text-sm text-text-muted">
                  Ghost view exposes the arrangement of the internal parts
                  without changing the model.
                </figcaption>
              </figure>
              <section className="site-section mb-8 p-8 max-sm:p-5">
                <h2 className="mb-5 text-2xl font-bold">
                  Explore the model in four steps.
                </h2>
                <ol className="list-decimal space-y-4 pl-5 text-text-muted">
                  <li>
                    <strong>Open the project.</strong> Use Carvd Studio 1.3 or
                    later. The file contains named stock and separate cabinet,
                    door and drawer groups. Keep Prevent Overlap enabled in
                    Project Settings.
                  </li>
                  <li>
                    <strong>Inspect the assembly.</strong> Orbit the cabinet,
                    switch to Ghost view and select an individual part. Check
                    the door reveals, drawer clearances and the orientation of
                    the cleat halves.
                  </li>
                  <li>
                    <strong>Explore a joint.</strong> Select a drawer side and
                    open Edit Part Cuts. Inspect the dovetail profile, bottom
                    groove and rear housing. The cuts remain editable; use a
                    copy of the project to try variations.
                  </li>
                  <li>
                    <strong>Make your own cutting plan.</strong> Enter your
                    actual stock sizes, prices and saw kerf, then generate a
                    fresh cut list. Start with the blanks, then review the
                    listed secondary operations. The included report is a
                    snapshot of this model.
                  </li>
                </ol>
              </section>
              <figure className="site-section mb-8 overflow-hidden">
                <img
                  src="/screenshots/heron-drawer-cuts.png"
                  alt="Carvd Part Cuts workspace showing the maple drawer side with dovetail cuts, bottom groove and back housing"
                  width="3024"
                  height="1742"
                  loading="lazy"
                  className="w-full"
                />
                <figcaption className="p-4 text-sm text-text-muted">
                  A drawer side in the Part Cuts workspace. Each operation can
                  be inspected individually.
                </figcaption>
              </figure>
              <section className="site-section mb-8 p-8 max-sm:p-5">
                <h2 className="mb-4 text-2xl font-bold">
                  Dimensions and review notes.
                </h2>
                <div className="overflow-x-auto">
                  <table className="mb-5 w-full text-left text-sm [&_th]:p-3 [&_td]:p-3 [&_tr]:border-b [&_tr]:border-border">
                    <caption className="mb-3 text-left text-text-muted">
                      Nominal model dimensions, in inches. These describe the
                      design, not machining tolerances.
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Detail</th>
                        <th scope="col">Dimensions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th scope="row">Case</th>
                        <td>36 wide × 24 high × 10 deep; pull adds 1/2</td>
                      </tr>
                      <tr>
                        <th scope="row">Door / opening</th>
                        <td>21 1/2 × 17 / 21 3/4 × 17 1/4</td>
                      </tr>
                      <tr>
                        <th scope="row">Drawer fronts / openings</th>
                        <td>16 5/8 × 4 1/4 / 16 7/8 × 4 1/2</td>
                      </tr>
                      <tr>
                        <th scope="row">Door and drawer-front reveals</th>
                        <td>1/8 on each side</td>
                      </tr>
                      <tr>
                        <th scope="row">Oak panel / groove span</th>
                        <td>18 3/4 × 14 3/8 / 19 × 14 1/2</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mb-4 text-text-muted">
                  Fit the nominal joints to your actual material and cutters on
                  scrap. The solid oak panel must float in the frame; verify
                  seasonal movement for the wood and environment. Glue the
                  panel's central seam, not its edges into the grooves. Some
                  thin parts require preparation from thicker stock.
                </p>
                <p className="text-text-muted">
                  Before building, specify inset-door hinges and a catch, drawer
                  runners and stops, back attachment, and a structural
                  connection from the cabinet cleat to the solid case. Do not
                  rely on the 1/4-inch back alone to carry the cabinet. Hardware
                  and fastener holes are not modeled; no load rating is
                  assigned. Report prices are library placeholders.
                </p>
              </section>
            </>
          )}
          {tutorial && (
            <>
              <figure className="site-section mb-8 overflow-hidden">
                <a href={`/screenshots/${tutorial.image}`}>
                  <img
                    src={`/screenshots/${tutorial.image}`}
                    alt={tutorial.alt}
                    className="w-full"
                  />
                </a>
                <figcaption className="p-4 text-sm text-text-muted">
                  {tutorial.alt}. Select the image to inspect it at full size.
                </figcaption>
              </figure>
              <ol className="mb-8 grid gap-5">
                {tutorial.steps.map(([heading, body], index) => (
                  <li key={heading} className="site-section p-6">
                    <h2 className="mb-3 text-2xl font-semibold">
                      {index + 1}. {heading}
                    </h2>
                    <p className="text-text-muted">{body}</p>
                  </li>
                ))}
              </ol>
              <p className="mb-8">
                <Link to={tutorial.more} className="text-highlight underline">
                  Read the full guide →
                </Link>
              </p>
            </>
          )}
          {!tutorial && (
            <section
              aria-label="Visual tutorials"
              className="mb-8 grid gap-6 md:grid-cols-2"
            >
              {tutorials.map((item) => (
                <Link
                  key={item.slug}
                  to={`/learn/${item.slug}`}
                  className="site-section overflow-hidden transition-colors hover:border-highlight"
                >
                  <img
                    src={`/screenshots/${item.image}`}
                    alt={item.alt}
                    loading="lazy"
                    className="aspect-video w-full object-contain bg-black/10"
                  />
                  <div className="p-6">
                    <p className="mb-2 text-sm text-highlight">
                      VISUAL TUTORIAL
                    </p>
                    <h2 className="mb-3 text-2xl font-bold">{item.title}</h2>
                    <p className="text-text-muted">{item.description}</p>
                  </div>
                </Link>
              ))}
            </section>
          )}
          <aside className="site-section p-8 max-sm:p-5">
            <h2 className="mb-3 text-2xl font-bold">
              Try it with your next project.
            </h2>
            <p className="mb-5 text-text-muted">
              Carvd Studio brings 3D woodworking design, joint planning and cut
              lists together on Mac and Windows.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/download">Try Carvd Studio</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={tutorial ? "/learn/heron-wall-cabinet" : "/pricing"}>
                  {tutorial ? "Get the free Heron project" : "See pricing"}
                </Link>
              </Button>
            </div>
          </aside>
        </article>
      </main>
      <Footer />
    </div>
  );
}
