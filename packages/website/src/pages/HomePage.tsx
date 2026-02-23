import BuyButton from "../components/BuyButton";
import SEO from "../components/SEO";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { getDownloadHref, useDownloadInfo } from "../utils/downloads";
import { AppleIcon, WindowsIcon } from "../components/BrandIcons";
import {
  createOrganizationSchema,
  createSoftwareAppSchema,
  createWebsiteSchema,
} from "../utils/jsonLd";
import {
  Sparkles,
  Palette,
  Ruler,
  DollarSign,
  Lock,
  Zap,
  Wrench,
  Building2,
  Armchair,
  Home,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const accentBoxHighlightStyle = {
  background: "rgba(174,164,191,0.12)",
  borderColor: "rgba(174,164,191,0.4)",
};

const surfaceGradientStyle = {
  background: "var(--color-surface)",
};

export default function HomePage() {
  const {
    version: appVersion,
    macDownload,
    windowsDownload,
  } = useDownloadInfo();

  return (
    <div className="site-shell">
      <SEO
        path="/"
        jsonLd={[
          createOrganizationSchema(),
          createSoftwareAppSchema(),
          createWebsiteSchema(),
        ]}
      />
      <Header />

      <main id="main-content" className="flex-1">
        {/* Hero Section */}
        <section className="container py-16 text-center max-md:py-12 max-sm:py-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 flex justify-center">
              <img
                src="/branding/CarvdStudio-Vertical-WHT.svg"
                alt="Carvd Studio"
                className="h-56 w-auto max-md:h-48 max-sm:h-40"
              />
            </div>
            <Badge variant="outline" className="hero-kicker mx-auto mb-6 gap-1">
              <Sparkles size={16} /> Now Available for macOS &amp; Windows
            </Badge>
            <h1 className="mb-6 break-words text-6xl font-bold leading-tight max-md:text-4xl max-sm:text-3xl">
              Stop Wasting Wood.
              <br />
              <span className="text-highlight">Start Building Smarter.</span>
            </h1>
            <p className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-text-muted max-md:text-lg max-sm:mb-8 max-sm:text-base">
              Professional furniture design software that helps you waste less
              material. Design in 3D, get optimized cut lists, and track every
              penny—all without an internet connection.
            </p>
            <div className="flex flex-wrap justify-center gap-4 max-md:flex-col max-md:items-center">
              <Button size="lg" asChild>
                <a href="/download">Download Free Trial</a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="/pricing">See Pricing →</a>
              </Button>
            </div>
            <p className="mt-4 text-sm text-text-muted">
              14-day free trial. One-time payment. No subscription.
            </p>
          </div>

          {/* Hero Screenshot */}
          <div className="mx-auto mt-16 max-w-5xl">
            <img
              src="/screenshots/hero-workspace.png"
              alt="Carvd Studio workspace showing a furniture project in 3D"
              className="w-full rounded-xl border border-border shadow-lg"
              loading="eager"
            />
          </div>
        </section>

        {/* Stats Section */}
        <section className="container">
          <div className="site-section my-16 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 p-4 max-md:my-12 max-md:gap-3">
            <div className="rounded-lg border border-border/70 bg-surface/65 p-8 text-center max-md:p-6">
              <span className="mb-2 block text-5xl font-bold text-highlight max-md:text-3xl max-sm:text-2xl">
                Less
              </span>
              <span className="text-lg text-text-muted max-md:text-base max-sm:text-sm">
                Material Waste
              </span>
            </div>
            <div className="rounded-lg border border-border/70 bg-surface/65 p-8 text-center max-md:p-6">
              <span className="mb-2 block text-5xl font-bold text-highlight max-md:text-3xl max-sm:text-2xl">
                Faster
              </span>
              <span className="text-lg text-text-muted max-md:text-base max-sm:text-sm">
                Project Planning
              </span>
            </div>
            <div className="rounded-lg border border-border/70 bg-surface/65 p-8 text-center max-md:p-6">
              <span className="mb-2 block text-5xl font-bold text-highlight max-md:text-3xl max-sm:text-2xl">
                100%
              </span>
              <span className="text-lg text-text-muted max-md:text-base max-sm:text-sm">
                Offline &amp; Private
              </span>
            </div>
          </div>
        </section>

        {/* Problem/Solution Section */}
        <section className="container mt-16">
          <div className="mx-auto max-w-4xl">
            <div
              className="mb-16 rounded-lg border p-8 max-sm:p-6"
              style={accentBoxHighlightStyle}
            >
              <h2 className="mb-4 text-3xl font-bold">
                You're Losing Money on Every Project
              </h2>
              <p className="mb-4 text-lg text-text-muted">
                Every furniture maker knows the pain: you buy a full sheet of
                plywood, make your cuts, and end up with a pile of expensive
                scraps. You spend hours with a calculator, tape measure, and
                graph paper trying to optimize layouts—only to realize you
                miscalculated halfway through cutting.
              </p>
              <p className="text-lg font-semibold text-highlight">
                That stops today.
              </p>
            </div>

            <h2 className="mt-16 mb-8 text-center text-4xl font-bold">
              Design. Optimize. Build. Profit.
            </h2>
            <p className="mx-auto mb-16 max-w-2xl text-center text-xl text-text-muted">
              Carvd Studio does the math so you don't have to. Design your
              furniture in 3D, and get cutting diagrams that minimize waste and
              maximize your profit margins.
            </p>

            {/* Feature Screenshots */}
            <div className="mt-16 grid grid-cols-2 gap-6">
              <img
                src="/screenshots/cut-list-diagrams.png"
                alt="Cut list diagrams showing optimized board layouts"
                className="w-full rounded-xl border border-border shadow-lg"
                loading="lazy"
              />
              <img
                src="/screenshots/shopping-list.png"
                alt="Shopping list and project cost breakdown"
                className="w-full rounded-xl border border-border shadow-lg"
                loading="lazy"
              />
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container mt-16">
          <div className="mt-16 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-8 max-md:mt-12 max-md:gap-6">
            <Card className="feature-card p-8 max-md:p-6">
              <span className="mb-4 block">
                <Palette size={28} />
              </span>
              <h3 className="mb-2 text-xl font-bold max-md:text-lg">
                See It Before You Build It
              </h3>
              <p className="leading-relaxed text-text-muted">
                Design in real-time 3D with tools that actually make sense. No
                engineering degree required. Rotate, zoom, and perfect every
                detail before touching your saw. Catch mistakes on-screen, not
                in your shop.
              </p>
            </Card>
            <Card className="feature-card p-8 max-md:p-6">
              <span className="mb-4 block">
                <Ruler size={28} />
              </span>
              <h3 className="mb-2 text-xl font-bold max-md:text-lg">
                Cut Lists That Save You Money
              </h3>
              <p className="leading-relaxed text-text-muted">
                Our optimization engine finds the most efficient way to cut your
                materials. Stop buying extra sheets "just in case." Get precise
                cutting diagrams that minimize waste and stretch your material
                budget further.
              </p>
            </Card>
            <Card className="feature-card p-8 max-md:p-6">
              <span className="mb-4 block">
                <DollarSign size={28} />
              </span>
              <h3 className="mb-2 text-xl font-bold max-md:text-lg">
                Know Your Costs Before You Quote
              </h3>
              <p className="leading-relaxed text-text-muted">
                Set your material prices once, then watch costs update in
                real-time as you design. Give accurate quotes to clients
                instantly. Never underbid a project again. Track every board
                foot and every dollar.
              </p>
            </Card>
            <Card className="feature-card p-8 max-md:p-6">
              <span className="mb-4 block">
                <Lock size={28} />
              </span>
              <h3 className="mb-2 text-xl font-bold max-md:text-lg">
                Your Designs Stay Yours
              </h3>
              <p className="leading-relaxed text-text-muted">
                No cloud. No subscriptions. No data mining. Everything stays on
                your computer where it belongs. Work in your shop, at job sites,
                or anywhere—even without internet. Complete privacy guaranteed.
              </p>
            </Card>
            <Card className="feature-card p-8 max-md:p-6">
              <span className="mb-4 block">
                <Zap size={28} />
              </span>
              <h3 className="mb-2 text-xl font-bold max-md:text-lg">
                Lightning Fast, Zero Bloat
              </h3>
              <p className="leading-relaxed text-text-muted">
                Built for speed by woodworkers, for woodworkers. Launch
                instantly, design smoothly, save quickly. No waiting, no loading
                screens, no frustration. Just a powerful tool that gets out of
                your way and lets you work.
              </p>
            </Card>
            <Card className="feature-card p-8 max-md:p-6">
              <span className="mb-4 block">
                <Wrench size={28} />
              </span>
              <h3 className="mb-2 text-xl font-bold max-md:text-lg">
                Professional-Grade Tools
              </h3>
              <p className="leading-relaxed text-text-muted">
                Custom materials library, reusable assemblies, precise
                measurements, grain direction tracking, and hierarchical part
                grouping. Everything you need to design like a pro. No
                subscriptions required.
              </p>
            </Card>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="container mt-16">
          <h2 className="mb-8 text-center text-4xl font-bold">
            Built for Every Type of Woodworker
          </h2>
          <div className="grid grid-cols-3 gap-8 max-md:grid-cols-1 max-md:gap-6">
            <Card className="feature-card p-8 max-md:p-6">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-md bg-surface-elevated max-md:h-12 max-md:w-12">
                <Building2 size={36} />
              </div>
              <h3 className="mb-2 text-xl font-bold max-md:text-lg">
                Custom Cabinet Shops
              </h3>
              <p className="leading-relaxed text-text-muted">
                Quote faster, cut smarter, profit more. Design custom cabinets
                with precision, generate optimized cut lists, and give clients
                accurate estimates on the spot.
              </p>
            </Card>
            <Card className="feature-card p-8 max-md:p-6">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-md bg-surface-elevated max-md:h-12 max-md:w-12">
                <Armchair size={36} />
              </div>
              <h3 className="mb-2 text-xl font-bold max-md:text-lg">
                Furniture Makers
              </h3>
              <p className="leading-relaxed text-text-muted">
                From tables to chairs to built-ins. Design complex pieces with
                confidence, visualize joinery, and minimize expensive mistakes
                before you touch the wood.
              </p>
            </Card>
            <Card className="feature-card p-8 max-md:p-6">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-md bg-surface-elevated max-md:h-12 max-md:w-12">
                <Home size={36} />
              </div>
              <h3 className="mb-2 text-xl font-bold max-md:text-lg">
                DIY Enthusiasts
              </h3>
              <p className="leading-relaxed text-text-muted">
                Turn your weekend project dreams into reality. Get professional
                results without professional headaches. Design it right the
                first time, every time.
              </p>
            </Card>
          </div>
        </section>

        {/* Comparison Section */}
        <section className="container mt-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-8 text-center text-4xl font-bold">
              The Math Is Simple
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-center text-xl text-text-muted">
              Most furniture design software charges $10/month. That's $60 after
              6 months, $120 per year. Carvd Studio?{" "}
              <span className="font-bold text-highlight">$59.99 once.</span> Own
              it forever.
            </p>
            <div className="w-full overflow-x-auto [-webkit-overflow-scrolling:touch]">
              <table className="my-8 w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border-b border-border bg-surface p-4 text-left font-bold text-text first:min-w-[100px] first:whitespace-normal max-md:p-2 max-md:text-sm max-sm:p-1 max-sm:text-xs first:max-sm:min-w-[80px]">
                      <span className="sr-only">Time Period</span>
                    </th>
                    <th className="whitespace-nowrap border-b border-border bg-surface p-4 text-left font-bold text-text max-md:p-2 max-md:text-sm max-sm:p-1 max-sm:text-xs">
                      Monthly Subscription
                    </th>
                    <th className="whitespace-nowrap border-b border-border bg-surface p-4 text-left font-bold text-text max-md:p-2 max-md:text-sm max-sm:p-1 max-sm:text-xs">
                      Carvd Studio
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-surface">
                    <td className="border-b border-border p-4 font-bold text-text-muted first:min-w-[100px] first:whitespace-normal max-md:p-2 max-md:text-sm max-sm:p-1 max-sm:text-xs first:max-sm:min-w-[80px]">
                      After 6 months
                    </td>
                    <td className="whitespace-nowrap border-b border-border p-4 text-text-muted max-md:p-2 max-md:text-sm max-sm:p-1 max-sm:text-xs">
                      $60
                    </td>
                    <td className="whitespace-nowrap border-b border-border p-4 font-bold text-highlight max-md:p-2 max-md:text-sm max-sm:p-1 max-sm:text-xs">
                      $59.99 ✓
                    </td>
                  </tr>
                  <tr className="hover:bg-surface">
                    <td className="border-b border-border p-4 font-bold text-text-muted first:min-w-[100px] first:whitespace-normal max-md:p-2 max-md:text-sm max-sm:p-1 max-sm:text-xs first:max-sm:min-w-[80px]">
                      After 1 year
                    </td>
                    <td className="whitespace-nowrap border-b border-border p-4 text-text-muted max-md:p-2 max-md:text-sm max-sm:p-1 max-sm:text-xs">
                      $120
                    </td>
                    <td className="whitespace-nowrap border-b border-border p-4 font-bold text-highlight max-md:p-2 max-md:text-sm max-sm:p-1 max-sm:text-xs">
                      $59.99 ✓
                    </td>
                  </tr>
                  <tr className="hover:bg-surface">
                    <td className="border-b border-border p-4 font-bold text-text-muted first:min-w-[100px] first:whitespace-normal max-md:p-2 max-md:text-sm max-sm:p-1 max-sm:text-xs first:max-sm:min-w-[80px]">
                      After 2 years
                    </td>
                    <td className="whitespace-nowrap border-b border-border p-4 text-text-muted max-md:p-2 max-md:text-sm max-sm:p-1 max-sm:text-xs">
                      $240
                    </td>
                    <td className="whitespace-nowrap border-b border-border p-4 font-bold text-highlight max-md:p-2 max-md:text-sm max-sm:p-1 max-sm:text-xs">
                      $59.99 ✓
                    </td>
                  </tr>
                  <tr className="hover:bg-surface">
                    <td className="border-b border-border p-4 font-bold text-text-muted first:min-w-[100px] first:whitespace-normal max-md:p-2 max-md:text-sm max-sm:p-1 max-sm:text-xs first:max-sm:min-w-[80px]">
                      After 5 years
                    </td>
                    <td className="whitespace-nowrap border-b border-border p-4 text-text-muted max-md:p-2 max-md:text-sm max-sm:p-1 max-sm:text-xs">
                      $600
                    </td>
                    <td className="whitespace-nowrap border-b border-border p-4 font-bold text-highlight max-md:p-2 max-md:text-sm max-sm:p-1 max-sm:text-xs">
                      $59.99 ✓
                    </td>
                  </tr>
                  <tr className="hover:bg-surface">
                    <td className="border-b border-border p-4 font-bold text-text-muted first:min-w-[100px] first:whitespace-normal max-md:p-2 max-md:text-sm max-sm:p-1 max-sm:text-xs first:max-sm:min-w-[80px]">
                      If you stop paying
                    </td>
                    <td className="whitespace-nowrap border-b border-border p-4 text-text-muted max-md:p-2 max-md:text-sm max-sm:p-1 max-sm:text-xs">
                      Lose access
                    </td>
                    <td className="whitespace-nowrap border-b border-border p-4 font-bold text-success max-md:p-2 max-md:text-sm max-sm:p-1 max-sm:text-xs">
                      ✓ Keep it forever
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-16 text-center">
              <div
                className="inline-block rounded-lg border p-8 max-sm:p-6"
                style={accentBoxHighlightStyle}
              >
                <p className="text-2xl font-bold">
                  If you'll use this software for more than 6 months
                  <br />
                  (and you will), Carvd Studio is the obvious choice.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Download Section */}
        <section id="download" className="container mt-16">
          <div
            className="rounded-xl border-2 border-highlight p-16 text-center max-md:p-12 max-sm:p-8"
            style={surfaceGradientStyle}
          >
            <h2 className="mb-4 text-4xl font-bold">Download Carvd Studio</h2>
            <p className="mx-auto mb-6 max-w-2xl text-xl text-text-muted">
              Free to download. Try everything for 14 days. Then decide.
            </p>
            <p className="mb-8 text-center">
              <Badge variant="outline" className="hero-kicker border-accent">
                Version {appVersion}
              </Badge>
            </p>
            <div className="flex flex-wrap justify-center gap-8 max-sm:flex-col max-sm:items-center">
              <a
                href={getDownloadHref(macDownload, "home-hero-card")}
                className="flex min-w-[200px] flex-col items-center gap-2 feature-card px-8 py-8 text-text no-underline max-sm:w-full max-sm:max-w-[280px] max-sm:px-6 max-sm:py-6"
              >
                <span>
                  <AppleIcon size={32} />
                </span>
                <span className="text-xl font-bold">macOS</span>
                <span className="text-sm text-text-muted">
                  {macDownload.fileExtension} installer
                </span>
                <span className="mt-1 text-xs text-accent">
                  {macDownload.minOsVersion}
                </span>
              </a>
              <a
                href={getDownloadHref(windowsDownload, "home-hero-card")}
                className="flex min-w-[200px] flex-col items-center gap-2 feature-card px-8 py-8 text-text no-underline max-sm:w-full max-sm:max-w-[280px] max-sm:px-6 max-sm:py-6"
              >
                <span>
                  <WindowsIcon size={32} />
                </span>
                <span className="text-xl font-bold">Windows</span>
                <span className="text-sm text-text-muted">
                  {windowsDownload.fileExtension} installer
                </span>
                <span className="mt-1 text-xs text-accent">
                  {windowsDownload.minOsVersion}
                </span>
              </a>
            </div>
            <div className="mt-8 border-t border-border pt-8">
              <p className="text-center text-text-muted">
                <strong>What happens after the trial?</strong>
                <br />
                After 14 days, you can purchase a license to unlock all
                features,
                <br />
                or continue using the free version with basic functionality.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="container mt-16">
          <div
            className="my-16 rounded-xl border-2 border-accent p-16 text-center max-md:p-12 max-sm:my-8 max-sm:p-8"
            style={surfaceGradientStyle}
          >
            <h2 className="mb-4 text-4xl font-bold max-md:text-2xl max-sm:text-xl">
              Ready to Build Smarter?
            </h2>
            <p className="mx-auto mb-8 max-w-[600px] text-xl text-text-muted max-md:text-lg max-sm:text-base">
              Join woodworkers who are saving money and building better
              furniture.
            </p>
            <div className="mb-6 flex justify-center gap-4 max-sm:flex-col max-sm:items-center">
              <BuyButton />
            </div>
            <p className="text-sm text-text-muted">
              ✓ 14-day free trial &nbsp;•&nbsp; ✓ No subscription required
              &nbsp;•&nbsp; ✓ Free updates forever
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
