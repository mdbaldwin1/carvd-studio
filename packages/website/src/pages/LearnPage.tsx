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
        "Assign stock to every part. Enter the actual board or panel dimensions and your local material price. Unassigned parts block generation; the free shelf project starts with stock assigned and its price unset.",
      ],
      [
        "Account for the saw cut",
        "Check Kerf Width in your cut-list settings against your blade. The shelf example starts at 1/8 inch. Check the Overage Factor too: it adds purchasing allowance for defects and mistakes.",
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
  const shelf = pathname === "/learn/desktop-shelf";
  const title =
    tutorial?.title ??
    (shelf ? "Free desktop shelf plan" : "Small projects. Useful skills.");
  const description =
    tutorial?.description ??
    "Download a free desktop shelf project and printable plan, then learn to plan joints and generate cutting diagrams in Carvd Studio.";
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
                src="/screenshots/desktop-shelf-plan.svg"
                alt="Illustrated four-part desktop shelf with a top, two sides and rear rail"
                width="1000"
                height="520"
                className="w-full"
              />
              <div className="p-8 max-sm:p-5">
                <h2 className="mb-3 text-3xl font-bold">
                  Make room for the little things.
                </h2>
                <p className="mb-5 text-text-muted">
                  A compact shelf for notebooks and desk supplies: 24 inches
                  wide, 8 inches deep and 8 inches high. Four plywood parts, an
                  editable model and a two-page printable guide. Free to
                  download, adapt and share with credit to Carvd Studio. No
                  email signup.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <a href="/downloads/desktop-shelf-guide.pdf" download>
                      Download printable plan (PDF)
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href="/downloads/desktop-shelf.carvd" download>
                      Download editable project
                    </a>
                  </Button>
                </div>
                {!shelf && (
                  <p className="mt-5">
                    <Link
                      to="/learn/desktop-shelf"
                      className="text-highlight underline"
                    >
                      See the cut list and project details →
                    </Link>
                  </p>
                )}
              </div>
            </section>
          )}
          {shelf && (
            <section className="site-section mb-8 p-8 max-sm:p-5">
              <h2 className="mb-4 text-2xl font-bold">
                Four parts. One small panel.
              </h2>
              <div className="overflow-x-auto">
                <table className="mb-6 w-full text-left text-sm [&_th]:p-3 [&_td]:p-3 [&_tr]:border-b [&_tr]:border-border">
                  <caption className="mb-3 text-left text-text-muted">
                    Cut dimensions in inches, assuming actual 3/4-inch plywood.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Part</th>
                      <th scope="col">Quantity</th>
                      <th scope="col">Length × width × thickness</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">Top</th>
                      <td>1</td>
                      <td>24 × 8 × 3/4</td>
                    </tr>
                    <tr>
                      <th scope="row">Sides</th>
                      <td>2</td>
                      <td>7 1/4 × 8 × 3/4</td>
                    </tr>
                    <tr>
                      <th scope="row">Back rail</th>
                      <td>1</td>
                      <td>22 1/2 × 2 × 3/4</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mb-4 text-text-muted">
                Start with a 24 × 48-inch plywood panel. The PDF includes a
                suggested layout allowing 1/8-inch kerf, assembly guidance and a
                front view. Measure your plywood first: if its thickness is t,
                the sides become 8 − t inches long and the rail becomes 24 − 2t.
                Update the model dimensions and positions to match.
              </p>
              <p className="mb-4 text-text-muted">
                Use the PDF on its own, or open the .carvd file in Carvd Studio
                to explore the model and make your own cut list. Stock pricing
                is unset so you can enter your local cost. Hardware is not
                modeled.
              </p>
              <p className="text-sm text-text-muted">
                This is a planning example for light desktop storage, not a
                physically tested or load-rated design. Check your material,
                joints and fasteners before building.
              </p>
            </section>
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
                <Link to={tutorial ? "/learn/desktop-shelf" : "/pricing"}>
                  {tutorial ? "Get the free shelf project" : "See pricing"}
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
