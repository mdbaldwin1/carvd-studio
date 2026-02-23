import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DollarSign,
  Lock,
  Palette,
  RefreshCw,
  Ruler,
  Shield,
  Target,
  Upload,
  Wrench,
  Zap,
} from "lucide-react";
import BuyButton from "../components/BuyButton";
import Footer from "../components/Footer";
import Header from "../components/Header";
import SEO from "../components/SEO";

const accentBoxStyle = {
  background: "rgba(74,144,226,0.10)",
  borderColor: "rgba(74,144,226,0.3)",
};

const accentBoxHighlightStyle = {
  background: "rgba(174,164,191,0.12)",
  borderColor: "rgba(174,164,191,0.4)",
};

export default function FeaturesPage() {
  return (
    <div className="site-shell">
      <SEO
        title="Features"
        description="3D furniture design, cut list optimization, stock management, cost tracking, and more. All the tools woodworkers need, nothing they don't."
        path="/features"
      />
      <Header />

      <main id="main-content" className="container flex-1">
        <div className="py-16">
          <div className="mx-auto max-w-4xl">
            <h1 className="mb-6 text-center text-6xl font-bold">
              Every Tool You Need.
              <br />
              <span className="text-highlight">Nothing You Don't.</span>
            </h1>
            <p className="mx-auto mb-16 max-w-2xl text-center text-xl text-text-muted">
              Designed by woodworkers who were tired of complicated software
              that gets in the way. Carvd Studio gives you powerful tools that
              actually make your work easier.
            </p>

            {/* Main Features - Detailed */}
            <div className="mb-16 mt-16 grid gap-16">
              {/* 3D Design */}
              <div
                className="site-section p-8 max-sm:p-6"
                style={accentBoxStyle}
              >
                <div className="mb-6 flex items-center gap-4">
                  <span className="text-6xl">
                    <Palette size={48} />
                  </span>
                  <div>
                    <h2 className="mb-2 text-3xl font-bold">
                      3D Design That Makes Sense
                    </h2>
                    <p className="text-lg text-text-muted">
                      Design furniture the way you think about it
                    </p>
                  </div>
                </div>
                <div className="grid gap-4">
                  <div>
                    <h3 className="mb-2 text-xl font-bold">
                      Real-Time 3D Visualization
                    </h3>
                    <p className="mb-4 text-text-muted">
                      Watch your design take shape as you work. Rotate 360°,
                      zoom in to inspect joinery, zoom out to see the complete
                      piece. Every dimension, every material, every detail
                      rendered accurately in real-time.
                    </p>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-bold">
                      Intuitive Interface
                    </h3>
                    <p className="mb-4 text-text-muted">
                      No CAD experience needed. If you can use a tape measure,
                      you can use Carvd Studio. Click, drag, dimension—it works
                      the way you'd expect it to. Most users are designing their
                      first project within 10 minutes.
                    </p>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-bold">
                      Catch Mistakes Before Cutting
                    </h3>
                    <p className="text-text-muted">
                      See problems before they cost you money. Wrong dimensions?
                      Fix it with a click. Joinery doesn't line up? Adjust it on
                      screen. No more measuring twice and cutting wrong.
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  <img
                    src="/screenshots/features-3d-workspace.png"
                    alt="3D workspace with selected parts and dimensions"
                    className="w-full rounded-xl border border-border shadow-lg"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Cut List Optimization */}
              <div
                className="site-section p-8 max-sm:p-6"
                style={accentBoxStyle}
              >
                <div className="mb-6 flex items-center gap-4">
                  <span className="text-6xl">
                    <Ruler size={48} />
                  </span>
                  <div>
                    <h2 className="mb-2 text-3xl font-bold">
                      Smart Cut List Generation
                    </h2>
                    <p className="text-lg text-text-muted">
                      Stop wasting materials and money
                    </p>
                  </div>
                </div>
                <div className="grid gap-4">
                  <div>
                    <h3 className="mb-2 text-xl font-bold">
                      Automatic Optimization
                    </h3>
                    <p className="mb-4 text-text-muted">
                      Our algorithm analyzes hundreds of possible layouts to
                      find the most efficient way to cut your materials.
                      Minimize waste, minimize cost. One click generates
                      optimized cutting diagrams that would take hours to
                      calculate by hand.
                    </p>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-bold">
                      Professional Cut Sheets
                    </h3>
                    <p className="mb-4 text-text-muted">
                      Get workshop-ready cutting diagrams with clear
                      measurements and part labels. Print them out or pull them
                      up on your phone. Each diagram shows exactly where to make
                      every cut for maximum efficiency.
                    </p>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-bold">
                      Material Shopping Lists
                    </h3>
                    <p className="text-text-muted">
                      Know exactly what to buy before you go to the lumber yard.
                      Get precise quantities for every material in your project.
                      No more buying extra "just in case" and ending up with
                      piles of expensive scraps.
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  <img
                    src="/screenshots/features-cut-list.png"
                    alt="Cut list modal with optimized board layouts"
                    className="w-full rounded-xl border border-border shadow-lg"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Cost Tracking */}
              <div
                className="site-section p-8 max-sm:p-6"
                style={accentBoxStyle}
              >
                <div className="mb-6 flex items-center gap-4">
                  <span className="text-6xl">
                    <DollarSign size={48} />
                  </span>
                  <div>
                    <h2 className="mb-2 text-3xl font-bold">
                      Real-Time Cost Tracking
                    </h2>
                    <p className="text-lg text-text-muted">
                      Quote with confidence, bid to win
                    </p>
                  </div>
                </div>
                <div className="grid gap-4">
                  <div>
                    <h3 className="mb-2 text-xl font-bold">
                      Live Material Costs
                    </h3>
                    <p className="mb-4 text-text-muted">
                      Set your material prices once, then watch project costs
                      update automatically as you design. Add a shelf? Cost
                      updates instantly. Change to a premium wood? See the price
                      difference immediately. No spreadsheets, no calculators.
                    </p>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-bold">
                      Accurate Client Quotes
                    </h3>
                    <p className="mb-4 text-text-muted">
                      Give clients precise estimates on the spot. Know your
                      material costs down to the penny before you commit. Add
                      your labor markup and send professional quotes that win
                      jobs. Never underbid a project again.
                    </p>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-bold">
                      Custom Materials Library
                    </h3>
                    <p className="text-text-muted">
                      Build your own materials library with your actual supplier
                      prices. Track different grades, species, and sheet sizes.
                      Update prices once and every project reflects the current
                      costs automatically.
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  <img
                    src="/screenshots/features-cost-tracking.png"
                    alt="Stock library and cost tracking interface"
                    className="w-full rounded-xl border border-border shadow-lg"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Privacy & Offline */}
              <div
                className="site-section p-8 max-sm:p-6"
                style={accentBoxHighlightStyle}
              >
                <div className="mb-6 flex items-center gap-4">
                  <span className="text-6xl">
                    <Lock size={48} />
                  </span>
                  <div>
                    <h2 className="mb-2 text-3xl font-bold">
                      Your Work Stays Private
                    </h2>
                    <p className="text-lg text-text-muted">
                      No cloud. No tracking. No BS.
                    </p>
                  </div>
                </div>
                <div className="grid gap-4">
                  <div>
                    <h3 className="mb-2 text-xl font-bold">
                      100% Offline Operation
                    </h3>
                    <p className="mb-4 text-text-muted">
                      Work anywhere: in your shop, at job sites, on the road. No
                      internet required, ever. Everything runs locally on your
                      computer. Fast, reliable, and always available when you
                      need it.
                    </p>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-bold">
                      Complete Data Privacy
                    </h3>
                    <p className="mb-4 text-text-muted">
                      Your designs belong to you, not us. No cloud uploads, no
                      data collection, no tracking. We'll never see your designs
                      or sell your information. Your intellectual property stays
                      on your computer where it belongs.
                    </p>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-bold">
                      No Subscription Hostage
                    </h3>
                    <p className="text-text-muted">
                      Pay once, own it forever. Your files stay accessible even
                      if you stop updating. Unlike subscription software that
                      locks you out when you stop paying, Carvd Studio is yours
                      to keep and use indefinitely.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Features Grid */}
            <h2 className="mb-16 mt-16 text-center text-4xl font-bold">
              And There's More
            </h2>
            <div className="mb-16 mt-16 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-8 max-md:gap-6">
              <Card className="feature-card p-8 max-md:p-6">
                <span className="mb-4 block">
                  <Zap size={28} />
                </span>
                <h3 className="mb-2 text-xl font-bold max-md:text-lg">
                  Lightning Fast Performance
                </h3>
                <p className="leading-relaxed text-text-muted">
                  Launch in seconds, not minutes. Smooth interaction even with
                  complex projects. Auto-save keeps your work safe without
                  interrupting your flow. Built for speed from the ground up.
                </p>
              </Card>

              <Card className="feature-card p-8 max-md:p-6">
                <span className="mb-4 block">
                  <Wrench size={28} />
                </span>
                <h3 className="mb-2 text-xl font-bold max-md:text-lg">
                  Reusable Assemblies
                </h3>
                <p className="leading-relaxed text-text-muted">
                  Save groups of parts as reusable assemblies. Design a drawer
                  box once, save it to your library, and drop it into any future
                  project. Build faster with proven components.
                </p>
              </Card>

              <Card className="feature-card p-8 max-md:p-6">
                <span className="mb-4 block">
                  <Ruler size={28} />
                </span>
                <h3 className="mb-2 text-xl font-bold max-md:text-lg">
                  Precision Measurements
                </h3>
                <p className="leading-relaxed text-text-muted">
                  Work in imperial or metric. Fractional inches or decimal.
                  Dimensions accurate to 1/64" or 0.1mm. Snap to grid, align to
                  edges, or enter exact measurements. Your choice.
                </p>
              </Card>

              <Card className="feature-card p-8 max-md:p-6">
                <span className="mb-4 block">
                  <Target size={28} />
                </span>
                <h3 className="mb-2 text-xl font-bold max-md:text-lg">
                  Joinery Allowances
                </h3>
                <p className="leading-relaxed text-text-muted">
                  Add extra material for joinery like tenons, dados, or rabbets.
                  Set the extra length or width in part properties, and the cut
                  list includes this additional material automatically.
                </p>
              </Card>

              <Card className="feature-card p-8 max-md:p-6">
                <span className="mb-4 block">
                  <Upload size={28} />
                </span>
                <h3 className="mb-2 text-xl font-bold max-md:text-lg">
                  Export Options
                </h3>
                <p className="leading-relaxed text-text-muted">
                  Export cut lists as PDF or print directly. Save 3D views as
                  images for client presentations. Share files with colleagues.
                  Your data, your formats, your control.
                </p>
              </Card>

              <Card className="feature-card p-8 max-md:p-6">
                <span className="mb-4 block">
                  <RefreshCw size={28} />
                </span>
                <h3 className="mb-2 text-xl font-bold max-md:text-lg">
                  Free Updates Forever
                </h3>
                <p className="leading-relaxed text-text-muted">
                  Buy once, get all future features and improvements free. No
                  upgrade fees, no "premium" tiers. As we add new tools and
                  capabilities, you get them automatically.
                </p>
              </Card>

              <Card className="feature-card p-8 max-md:p-6">
                <span className="mb-4 block">
                  <Shield size={28} />
                </span>
                <h3 className="mb-2 text-xl font-bold max-md:text-lg">
                  Your Work, Protected
                </h3>
                <p className="leading-relaxed text-text-muted">
                  Auto-recovery saves your work even if the app crashes.
                  Corrupted files? Automatic repair attempts to salvage your
                  data. Moved a file? Click to relocate it from your recent
                  projects. Your designs are always safe.
                </p>
              </Card>
            </div>

            {/* CTA Section */}
            <div className="site-section my-16 p-16 text-center max-md:p-12 max-sm:my-8 max-sm:p-8">
              <h2 className="mb-4 text-4xl font-bold max-md:text-2xl max-sm:text-xl">
                Ready to Design Smarter?
              </h2>
              <p className="mx-auto mb-8 max-w-[600px] text-xl text-text-muted max-md:text-lg max-sm:text-base">
                See why woodworkers are switching to Carvd Studio. Download now
                and try it risk-free for 14 days.
              </p>
              <div className="mb-6 flex justify-center gap-4 max-sm:flex-col max-sm:items-center">
                <Button size="lg" asChild>
                  <a href="/download">Download Free Trial</a>
                </Button>
                <BuyButton />
              </div>
              <p className="text-sm text-text-muted">
                ✓ 30-day money-back guarantee &nbsp;•&nbsp; ✓ No subscription
                &nbsp;•&nbsp; ✓ Free updates forever
              </p>
            </div>

            {/* Back Link */}
            <a
              href="/"
              className="mt-6 block inline-flex items-center gap-1 font-medium text-accent transition-colors hover:text-accent-hover hover:underline"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
