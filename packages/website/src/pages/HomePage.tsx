import React from 'react';
import ScreenshotPlaceholder from '../components/ScreenshotPlaceholder';
import BuyButton from '../components/BuyButton';
import { getMacDownloadInfo, getWindowsDownloadInfo, getAppVersion } from '../utils/downloads';

export default function HomePage() {
  const macDownload = getMacDownloadInfo();
  const windowsDownload = getWindowsDownloadInfo();
  const appVersion = getAppVersion();

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
      <main className="page-content">
        {/* Hero Section */}
        <section className="hero container">
          <div className="max-w-4xl mx-auto">
            <div className="badge badge-highlight mb-lg mx-auto">
              <span>🎉</span> Now Available for macOS & Windows
            </div>
            <h1 className="hero-title">
              Stop Wasting Wood.<br />
              <span className="text-primary">Start Building Smarter.</span>
            </h1>
            <p className="hero-subtitle max-w-2xl mx-auto">
              Professional furniture design software that helps you waste less material.
              Design in 3D, get optimized cut lists, and track every penny—all without an internet connection.
            </p>
            <div className="hero-actions">
              <a href="/download" className="btn btn-highlight btn-lg">
                Download Free Trial
              </a>
              <a href="/pricing" className="btn btn-outline btn-lg">
                See Pricing →
              </a>
            </div>
            <p className="text-sm text-muted mt-md">
              14-day free trial. One-time payment. No subscription.
            </p>
          </div>

          {/* Hero Screenshot */}
          <div className="mt-3xl max-w-5xl mx-auto">
            <ScreenshotPlaceholder
              tooltip="Screenshot needed: Main 3D workspace showing a furniture project (e.g., a cabinet or bookshelf with multiple parts visible)"
              aspectRatio="16:9"
            />
          </div>
        </section>

        {/* Stats Section */}
        <section className="container mt-3xl">
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-number">Less</span>
              <span className="stat-label">Material Waste</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">Faster</span>
              <span className="stat-label">Project Planning</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">100%</span>
              <span className="stat-label">Offline & Private</span>
            </div>
          </div>
        </section>

        {/* Problem/Solution Section */}
        <section className="container mt-3xl">
          <div className="max-w-4xl mx-auto">
            <div className="accent-box-highlight mb-3xl">
              <h2 className="text-3xl font-bold mb-md">You're Losing Money on Every Project</h2>
              <p className="text-lg text-muted mb-md">
                Every furniture maker knows the pain: you buy a full sheet of plywood, make your cuts,
                and end up with a pile of expensive scraps. You spend hours with a calculator, tape measure,
                and graph paper trying to optimize layouts—only to realize you miscalculated halfway through cutting.
              </p>
              <p className="text-lg font-semibold text-primary">
                That stops today.
              </p>
            </div>

            <h2 className="text-4xl font-bold mb-xl mt-3xl text-center">
              Design. Optimize. Build. Profit.
            </h2>
            <p className="text-xl text-muted text-center mb-3xl max-w-2xl mx-auto">
              Carvd Studio does the math so you don't have to. Design your furniture in 3D,
              and get cutting diagrams that minimize waste and maximize your profit margins.
            </p>

            {/* Feature Screenshots */}
            <div className="grid grid-cols-2 gap-lg mt-3xl">
              <ScreenshotPlaceholder
                tooltip="Screenshot needed: Cut list modal showing optimized board layouts with parts labeled"
                aspectRatio="4:3"
              />
              <ScreenshotPlaceholder
                tooltip="Screenshot needed: Shopping list / cost estimate view showing material quantities and prices"
                aspectRatio="4:3"
              />
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container mt-3xl">
          <div className="features-grid">
            <div className="feature-card">
              <span className="feature-icon">🎨</span>
              <h3 className="feature-title">See It Before You Build It</h3>
              <p className="feature-description">
                Design in real-time 3D with tools that actually make sense. No engineering degree required.
                Rotate, zoom, and perfect every detail before touching your saw. Catch mistakes on-screen,
                not in your shop.
              </p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">📐</span>
              <h3 className="feature-title">Cut Lists That Save You Money</h3>
              <p className="feature-description">
                Our optimization engine finds the most efficient way to cut your materials. Stop buying
                extra sheets "just in case." Get precise cutting diagrams that minimize waste and
                stretch your material budget further.
              </p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">💰</span>
              <h3 className="feature-title">Know Your Costs Before You Quote</h3>
              <p className="feature-description">
                Set your material prices once, then watch costs update in real-time as you design.
                Give accurate quotes to clients instantly. Never underbid a project again. Track every
                board foot and every dollar.
              </p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">🔒</span>
              <h3 className="feature-title">Your Designs Stay Yours</h3>
              <p className="feature-description">
                No cloud. No subscriptions. No data mining. Everything stays on your computer where it belongs.
                Work in your shop, at job sites, or anywhere—even without internet. Complete privacy guaranteed.
              </p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">⚡</span>
              <h3 className="feature-title">Lightning Fast, Zero Bloat</h3>
              <p className="feature-description">
                Built for speed by woodworkers, for woodworkers. Launch instantly, design smoothly, save quickly.
                No waiting, no loading screens, no frustration. Just a powerful tool that gets out of your way
                and lets you work.
              </p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">🛠️</span>
              <h3 className="feature-title">Professional-Grade Tools</h3>
              <p className="feature-description">
                Custom materials library, reusable assemblies, precise measurements, grain direction
                tracking, and hierarchical part grouping. Everything you need to design like a pro.
                No subscriptions required.
              </p>
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="container mt-3xl">
          <h2 className="text-4xl font-bold mb-xl text-center">
            Built for Every Type of Woodworker
          </h2>
          <div className="grid grid-cols-3 gap-xl">
            <div className="use-case-card">
              <div className="use-case-icon">🏢</div>
              <h3 className="use-case-title">Custom Cabinet Shops</h3>
              <p className="use-case-description">
                Quote faster, cut smarter, profit more. Design custom cabinets with precision,
                generate optimized cut lists, and give clients accurate estimates on the spot.
              </p>
            </div>
            <div className="use-case-card">
              <div className="use-case-icon">🪑</div>
              <h3 className="use-case-title">Furniture Makers</h3>
              <p className="use-case-description">
                From tables to chairs to built-ins. Design complex pieces with confidence,
                visualize joinery, and minimize expensive mistakes before you touch the wood.
              </p>
            </div>
            <div className="use-case-card">
              <div className="use-case-icon">🏡</div>
              <h3 className="use-case-title">DIY Enthusiasts</h3>
              <p className="use-case-description">
                Turn your weekend project dreams into reality. Get professional results without
                professional headaches. Design it right the first time, every time.
              </p>
            </div>
          </div>
        </section>

        {/* Comparison Section */}
        <section className="container mt-3xl">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-xl text-center">
              The Math Is Simple
            </h2>
            <p className="text-xl text-muted text-center mb-xl max-w-2xl mx-auto">
              Most furniture design software charges $10/month. That's $60 after 6 months, $120 per year.
              Carvd Studio? <span className="font-bold text-highlight">$59.99 once.</span> Own it forever.
            </p>
            <div className="comparison-table-wrapper">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th><span className="sr-only">Time Period</span></th>
                    <th>Monthly Subscription</th>
                    <th>Carvd Studio</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-bold">After 6 months</td>
                    <td>$60</td>
                    <td className="font-bold text-highlight">$59.99 ✓</td>
                  </tr>
                  <tr>
                    <td className="font-bold">After 1 year</td>
                    <td>$120</td>
                    <td className="font-bold text-highlight">$59.99 ✓</td>
                  </tr>
                  <tr>
                    <td className="font-bold">After 2 years</td>
                    <td>$240</td>
                    <td className="font-bold text-highlight">$59.99 ✓</td>
                  </tr>
                  <tr>
                    <td className="font-bold">After 5 years</td>
                    <td>$600</td>
                    <td className="font-bold text-highlight">$59.99 ✓</td>
                  </tr>
                  <tr>
                    <td className="font-bold">If you stop paying</td>
                    <td>❌ Lose access</td>
                    <td className="font-bold text-success">✓ Keep it forever</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="text-center mt-3xl">
              <div className="accent-box-highlight inline-block">
                <p className="text-2xl font-bold">
                  If you'll use this software for more than 6 months<br />
                  (and you will), Carvd Studio is the obvious choice.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Download Section */}
        <section id="download" className="container mt-3xl">
          <div className="download-section">
            <h2 className="text-4xl font-bold mb-md text-center">
              Download Carvd Studio
            </h2>
            <p className="text-xl text-muted text-center mb-lg max-w-2xl mx-auto">
              Free to download. Try everything for 14 days. Then decide.
            </p>
            <p className="text-center mb-xl">
              <span className="badge badge-highlight">Version {appVersion}</span>
            </p>
            <div className="download-buttons">
              <a
                href={macDownload.url}
                className="download-card"
              >
                <span className="download-icon">🍎</span>
                <span className="download-platform">macOS</span>
                <span className="download-file">{macDownload.fileExtension} installer</span>
                <span className="download-req">{macDownload.minOsVersion}</span>
              </a>
              <a
                href={windowsDownload.url}
                className="download-card"
              >
                <span className="download-icon">🪟</span>
                <span className="download-platform">Windows</span>
                <span className="download-file">{windowsDownload.fileExtension} installer</span>
                <span className="download-req">{windowsDownload.minOsVersion}</span>
              </a>
            </div>
            <div className="download-info">
              <p className="text-muted text-center mt-xl">
                <strong>What happens after the trial?</strong><br />
                After 14 days, you can purchase a license to unlock all features,<br />
                or continue using the free version with basic functionality.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="container mt-3xl">
          <div className="cta-section">
            <h2 className="cta-title">
              Ready to Build Smarter?
            </h2>
            <p className="cta-description">
              Join woodworkers who are saving money and building better furniture.
            </p>
            <div className="flex gap-md justify-center mb-lg">
              <BuyButton />
            </div>
            <p className="text-sm text-muted">
              ✓ 14-day free trial &nbsp;•&nbsp; ✓ No subscription required &nbsp;•&nbsp; ✓ Free updates forever
            </p>
          </div>
        </section>
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
