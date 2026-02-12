import React from 'react';
import ScreenshotPlaceholder from '../components/ScreenshotPlaceholder';
import BuyButton from '../components/BuyButton';

export default function FeaturesPage() {
  return (
    <div className="page bg-gradient-radial">
      {/* Header */}
      <header className="header">
        <nav className="nav container">
          <a href="/" className="nav-brand">Carvd Studio</a>
          <div className="nav-links">
            <a href="/features" className="nav-link">Features</a>
            <a href="/pricing" className="nav-link">Pricing</a>
            <a href="/docs" className="nav-link">Docs</a>
            <a href="/download" className="btn btn-highlight btn-sm">Download</a>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="page-content container">
        <div className="py-3xl">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-6xl font-bold mb-lg text-center">
              Every Tool You Need.<br />
              <span className="text-primary">Nothing You Don't.</span>
            </h1>
            <p className="text-xl text-muted text-center mb-3xl max-w-2xl mx-auto">
              Designed by woodworkers who were tired of complicated software that gets in the way.
              Carvd Studio gives you powerful tools that actually make your work easier.
            </p>

            {/* Main Features - Detailed */}
            <div className="grid gap-3xl mb-3xl mt-3xl">
              {/* 3D Design */}
              <div className="accent-box">
                <div className="flex items-center gap-md mb-lg">
                  <span className="text-6xl">🎨</span>
                  <div>
                    <h2 className="text-3xl font-bold mb-sm">3D Design That Makes Sense</h2>
                    <p className="text-lg text-muted">Design furniture the way you think about it</p>
                  </div>
                </div>
                <div className="grid gap-md">
                  <div>
                    <h3 className="text-xl font-bold mb-sm">Real-Time 3D Visualization</h3>
                    <p className="text-muted mb-md">
                      Watch your design take shape as you work. Rotate 360°, zoom in to inspect joinery,
                      zoom out to see the complete piece. Every dimension, every material, every detail
                      rendered accurately in real-time.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-sm">Intuitive Interface</h3>
                    <p className="text-muted mb-md">
                      No CAD experience needed. If you can use a tape measure, you can use Carvd Studio.
                      Click, drag, dimension—it works the way you'd expect it to. Most users are designing
                      their first project within 10 minutes.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-sm">Catch Mistakes Before Cutting</h3>
                    <p className="text-muted">
                      See problems before they cost you money. Wrong dimensions? Fix it with a click.
                      Joinery doesn't line up? Adjust it on screen. No more measuring twice and cutting wrong.
                    </p>
                  </div>
                </div>
                <div className="mt-lg">
                  <ScreenshotPlaceholder
                    tooltip="Screenshot needed: 3D workspace showing furniture design with parts selected, dimension labels visible"
                    aspectRatio="16:9"
                  />
                </div>
              </div>

              {/* Cut List Optimization */}
              <div className="accent-box">
                <div className="flex items-center gap-md mb-lg">
                  <span className="text-6xl">📐</span>
                  <div>
                    <h2 className="text-3xl font-bold mb-sm">Smart Cut List Generation</h2>
                    <p className="text-lg text-muted">Stop wasting materials and money</p>
                  </div>
                </div>
                <div className="grid gap-md">
                  <div>
                    <h3 className="text-xl font-bold mb-sm">Automatic Optimization</h3>
                    <p className="text-muted mb-md">
                      Our algorithm analyzes hundreds of possible layouts to find the most efficient way
                      to cut your materials. Minimize waste, minimize cost. One click generates optimized
                      cutting diagrams that would take hours to calculate by hand.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-sm">Professional Cut Sheets</h3>
                    <p className="text-muted mb-md">
                      Get workshop-ready cutting diagrams with clear measurements and part labels.
                      Print them out or pull them up on your phone. Each diagram shows exactly where
                      to make every cut for maximum efficiency.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-sm">Material Shopping Lists</h3>
                    <p className="text-muted">
                      Know exactly what to buy before you go to the lumber yard. Get precise quantities
                      for every material in your project. No more buying extra "just in case" and ending
                      up with piles of expensive scraps.
                    </p>
                  </div>
                </div>
                <div className="mt-lg">
                  <ScreenshotPlaceholder
                    tooltip="Screenshot needed: Cut list modal showing optimized board layouts with color-coded parts"
                    aspectRatio="16:9"
                  />
                </div>
              </div>

              {/* Cost Tracking */}
              <div className="accent-box">
                <div className="flex items-center gap-md mb-lg">
                  <span className="text-6xl">💰</span>
                  <div>
                    <h2 className="text-3xl font-bold mb-sm">Real-Time Cost Tracking</h2>
                    <p className="text-lg text-muted">Quote with confidence, bid to win</p>
                  </div>
                </div>
                <div className="grid gap-md">
                  <div>
                    <h3 className="text-xl font-bold mb-sm">Live Material Costs</h3>
                    <p className="text-muted mb-md">
                      Set your material prices once, then watch project costs update automatically as you
                      design. Add a shelf? Cost updates instantly. Change to a premium wood? See the price
                      difference immediately. No spreadsheets, no calculators.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-sm">Accurate Client Quotes</h3>
                    <p className="text-muted mb-md">
                      Give clients precise estimates on the spot. Know your material costs down to the penny
                      before you commit. Add your labor markup and send professional quotes that win jobs.
                      Never underbid a project again.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-sm">Custom Materials Library</h3>
                    <p className="text-muted">
                      Build your own materials library with your actual supplier prices. Track different
                      grades, species, and sheet sizes. Update prices once and every project reflects the
                      current costs automatically.
                    </p>
                  </div>
                </div>
                <div className="mt-lg">
                  <ScreenshotPlaceholder
                    tooltip="Screenshot needed: Stock library modal showing materials with prices, or the properties panel with cost display"
                    aspectRatio="16:9"
                  />
                </div>
              </div>

              {/* Privacy & Offline */}
              <div className="accent-box-highlight">
                <div className="flex items-center gap-md mb-lg">
                  <span className="text-6xl">🔒</span>
                  <div>
                    <h2 className="text-3xl font-bold mb-sm">Your Work Stays Private</h2>
                    <p className="text-lg text-muted">No cloud. No tracking. No BS.</p>
                  </div>
                </div>
                <div className="grid gap-md">
                  <div>
                    <h3 className="text-xl font-bold mb-sm">100% Offline Operation</h3>
                    <p className="text-muted mb-md">
                      Work anywhere: in your shop, at job sites, on the road. No internet required, ever.
                      Everything runs locally on your computer. Fast, reliable, and always available when
                      you need it.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-sm">Complete Data Privacy</h3>
                    <p className="text-muted mb-md">
                      Your designs belong to you, not us. No cloud uploads, no data collection, no tracking.
                      We'll never see your designs or sell your information. Your intellectual property stays
                      on your computer where it belongs.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-sm">No Subscription Hostage</h3>
                    <p className="text-muted">
                      Pay once, own it forever. Your files stay accessible even if you stop updating. Unlike
                      subscription software that locks you out when you stop paying, Carvd Studio is yours
                      to keep and use indefinitely.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Features Grid */}
            <h2 className="text-4xl font-bold mb-3xl mt-3xl text-center">
              And There's More
            </h2>
            <div className="features-grid mb-3xl">
              <div className="card">
                <span className="feature-icon">⚡</span>
                <h3 className="card-title">Lightning Fast Performance</h3>
                <p className="card-description">
                  Launch in seconds, not minutes. Smooth interaction even with complex projects.
                  Auto-save keeps your work safe without interrupting your flow. Built for speed from
                  the ground up.
                </p>
              </div>

              <div className="card">
                <span className="feature-icon">🛠️</span>
                <h3 className="card-title">Reusable Assemblies</h3>
                <p className="card-description">
                  Save groups of parts as reusable assemblies. Design a drawer box once, save it
                  to your library, and drop it into any future project. Build faster with proven components.
                </p>
              </div>

              <div className="card">
                <span className="feature-icon">📏</span>
                <h3 className="card-title">Precision Measurements</h3>
                <p className="card-description">
                  Work in imperial or metric. Fractional inches or decimal. Dimensions accurate to
                  1/64" or 0.1mm. Snap to grid, align to edges, or enter exact measurements. Your choice.
                </p>
              </div>

              <div className="card">
                <span className="feature-icon">🎯</span>
                <h3 className="card-title">Joinery Allowances</h3>
                <p className="card-description">
                  Add extra material for joinery like tenons, dados, or rabbets. Set the extra
                  length or width in part properties, and the cut list includes this additional
                  material automatically.
                </p>
              </div>

              <div className="card">
                <span className="feature-icon">📤</span>
                <h3 className="card-title">Export Options</h3>
                <p className="card-description">
                  Export cut lists as PDF or print directly. Save 3D views as images for client
                  presentations. Share files with colleagues. Your data, your formats, your control.
                </p>
              </div>

              <div className="card">
                <span className="feature-icon">🔄</span>
                <h3 className="card-title">Free Updates Forever</h3>
                <p className="card-description">
                  Buy once, get all future features and improvements free. No upgrade fees, no
                  "premium" tiers. As we add new tools and capabilities, you get them automatically.
                </p>
              </div>

              <div className="card">
                <span className="feature-icon">🛡️</span>
                <h3 className="card-title">Your Work, Protected</h3>
                <p className="card-description">
                  Auto-recovery saves your work even if the app crashes. Corrupted files? Automatic
                  repair attempts to salvage your data. Moved a file? Click to relocate it from your
                  recent projects. Your designs are always safe.
                </p>
              </div>
            </div>

            {/* CTA Section */}
            <div className="cta-section mt-3xl">
              <h2 className="cta-title">
                Ready to Design Smarter?
              </h2>
              <p className="cta-description">
                See why woodworkers are switching to Carvd Studio. Download now and try it risk-free for 14 days.
              </p>
              <div className="flex gap-md justify-center mb-lg">
                <a href="#download" className="btn btn-highlight btn-lg">
                  Download Free Trial
                </a>
                <BuyButton />
              </div>
              <p className="text-sm text-muted">
                ✓ 30-day money-back guarantee &nbsp;•&nbsp; ✓ No subscription &nbsp;•&nbsp; ✓ Free updates forever
              </p>
            </div>

            {/* Back Link */}
            <a href="/" className="back-link mt-3xl block">
              ← Back to Home
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer container">
        <div className="mb-lg">
          <div className="flex justify-center gap-2xl mb-md">
            <a href="/features" className="nav-link">Features</a>
            <a href="/pricing" className="nav-link">Pricing</a>
            <a href="/docs" className="nav-link">Documentation</a>
            <a href="/support" className="nav-link">Support</a>
          </div>
          <div className="flex justify-center gap-xl text-sm text-muted">
            <a href="/privacy" className="nav-link">Privacy Policy</a>
            <a href="/terms" className="nav-link">Terms of Service</a>
          </div>
        </div>
        <p>&copy; 2026 Carvd Studio. All rights reserved.</p>
      </footer>
    </div>
  );
}
