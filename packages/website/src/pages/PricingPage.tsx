import React from 'react';
import BuyButton from '../components/BuyButton';

export default function PricingPage() {
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
          <div className="max-w-4xl mx-auto text-center">
            <div className="badge badge-highlight mb-lg">
              <span>💸</span> Less Than 6 Months of Subscription Software
            </div>
            <h1 className="text-6xl font-bold mb-lg">
              Pay Once.<br />
              <span className="text-primary">Own It Forever.</span>
            </h1>
            <p className="text-xl text-muted text-center mb-3xl max-w-2xl mx-auto">
              Even the cheapest furniture design subscriptions start at $10/month. That's $60 after 6 months.
              Carvd Studio costs $59.99 once—and you own it forever.
            </p>

            {/* Main Pricing Card */}
            <div className="max-w-2xl mx-auto mb-3xl">
              <div className="card p-3xl" style={{borderColor: 'var(--color-primary)', borderWidth: '2px'}}>
                <div className="text-center mb-xl">
                  <div className="badge badge-warning mb-md mx-auto">
                    <span>🚀</span> Launch Special — Price increases to $99 soon
                  </div>
                  <h2 className="text-4xl font-bold mb-md">Carvd Studio</h2>
                  <div className="flex items-center justify-center gap-md mb-md">
                    <span className="text-6xl font-bold text-highlight">$59.99</span>
                    <div className="text-left">
                      <div className="text-lg font-bold">one-time payment</div>
                      <div className="text-sm text-muted">yours forever</div>
                    </div>
                  </div>
                  <div className="text-sm text-muted mb-lg">
                    <span className="line-through">$99</span> — Early adopter pricing
                  </div>
                  <p className="text-sm text-success mb-md">
                    💡 The cut list optimizer alone typically saves more than $59 in wasted lumber on a single project
                  </p>
                  <div className="accent-box-highlight mb-xl">
                    <p className="text-lg font-semibold text-center">
                      Lock in launch pricing before it goes up
                    </p>
                  </div>
                </div>

                {/* What's Included */}
                <div className="mb-xl">
                  <h3 className="text-2xl font-bold mb-md text-center">Everything Included</h3>
                  <ul className="checklist">
                    <li>
                      <span>Full 3D furniture design studio with real-time rendering</span>
                    </li>
                    <li>
                      <span>Intelligent cut list optimizer that minimizes waste</span>
                    </li>
                    <li>
                      <span>Real-time material cost tracking and project estimating</span>
                    </li>
                    <li>
                      <span>Custom materials library with your supplier prices</span>
                    </li>
                    <li>
                      <span>Reusable assembly library for common components</span>
                    </li>
                    <li>
                      <span>Joinery allowances for extra material on tenons, dados, etc.</span>
                    </li>
                    <li>
                      <span>Professional PDF export for cut sheets and presentations</span>
                    </li>
                    <li>
                      <span>100% offline operation—no internet required ever</span>
                    </li>
                    <li>
                      <span>Complete data privacy—your designs stay on your computer</span>
                    </li>
                    <li>
                      <span>Free lifetime updates with new features</span>
                    </li>
                    <li>
                      <span>Install on up to 3 devices (Mac & Windows)</span>
                    </li>
                    <li>
                      <span>Email support with actual woodworkers</span>
                    </li>
                  </ul>
                </div>

                {/* CTA Buttons */}
                <div className="grid gap-md mb-lg">
                  <a href="#download" className="btn btn-highlight btn-lg w-full">
                    Download Free Trial
                  </a>
                  <BuyButton className="btn btn-primary btn-lg w-full" />
                </div>

                {/* Trust Signals */}
                <div className="text-center">
                  <p className="text-sm text-muted mb-sm">
                    ✓ 30-day money-back guarantee &nbsp;•&nbsp; ✓ Instant download &nbsp;•&nbsp; ✓ Secure checkout
                  </p>
                  <p className="text-xs text-muted">
                    You'll receive your license key via email within minutes of purchase
                  </p>
                </div>
              </div>
            </div>

            {/* Value Comparison */}
            <div className="mb-3xl mt-3xl">
              <h2 className="text-4xl font-bold mb-xl text-center">
                The Break-Even Point? 6 Months.
              </h2>
              <p className="text-xl text-muted text-center mb-xl max-w-2xl mx-auto">
                If you think you'll use furniture design software for more than half a year, Carvd Studio is the smart choice.
              </p>
              <div className="grid grid-cols-2 gap-2xl">
                <div className="card">
                  <h3 className="card-title text-center text-muted">Monthly Subscription</h3>
                  <div className="text-center mb-md">
                    <div className="text-4xl font-bold text-muted mb-sm">$10/mo</div>
                    <div className="text-sm text-muted">pay every month</div>
                  </div>
                  <ul className="grid gap-sm text-muted text-sm">
                    <li>❌ 6 months: $60</li>
                    <li>❌ 1 year: $120</li>
                    <li>❌ 2 years: $240</li>
                    <li>❌ 5 years: $600</li>
                    <li>❌ Stop paying = lose access</li>
                    <li>❌ Your projects locked behind paywall</li>
                  </ul>
                </div>
                <div className="card" style={{borderColor: 'var(--color-primary)', borderWidth: '2px'}}>
                  <h3 className="card-title text-center text-primary">Carvd Studio</h3>
                  <div className="text-center mb-md">
                    <div className="text-4xl font-bold text-primary mb-sm">$59.99</div>
                    <div className="text-sm font-semibold text-primary">pay once</div>
                  </div>
                  <ul className="checklist text-sm">
                    <li><span>6 months: $59.99</span></li>
                    <li><span>1 year: Still $59.99</span></li>
                    <li><span>2 years: Still $59.99</span></li>
                    <li><span>5 years: Still $59.99</span></li>
                    <li><span>Own it forever, period</span></li>
                    <li><span>Your projects always accessible</span></li>
                  </ul>
                </div>
              </div>
              <div className="text-center mt-3xl">
                <div className="accent-box-highlight inline-block">
                  <p className="text-2xl font-bold">
                    Save $540 over 5 years
                  </p>
                  <p className="text-sm text-muted">That's enough for a premium table saw blade every year.</p>
                </div>
              </div>
            </div>

            {/* ROI Calculator */}
            <div className="accent-box mb-3xl mt-3xl">
              <h2 className="text-3xl font-bold mb-md text-center">
                How It Could Pay For Itself
              </h2>
              <p className="text-lg text-muted text-center mb-xl">
                Here's a hypothetical example for a typical cabinet project:
              </p>
              <div className="grid grid-cols-3 gap-lg">
                <div className="text-center">
                  <div className="text-5xl mb-md">🪵</div>
                  <div className="text-3xl font-bold text-highlight mb-sm">$80</div>
                  <div className="text-sm text-muted">
                    Potential material savings from optimized cuts
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-5xl mb-md">⏱️</div>
                  <div className="text-3xl font-bold text-highlight mb-sm">$125</div>
                  <div className="text-sm text-muted">
                    Potential time savings (5 hrs at $25/hr)
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-5xl mb-md">✂️</div>
                  <div className="text-3xl font-bold text-highlight mb-sm">$200</div>
                  <div className="text-sm text-muted">
                    Avoided cost of one mis-cut premium sheet
                  </div>
                </div>
              </div>
              <div className="divider"></div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-sm">
                  <span className="text-muted">Potential Value:</span> <span className="text-highlight">$405</span>
                </div>
                <p className="text-sm text-muted">
                  *Hypothetical example. Your results will vary based on project complexity and workflow.
                </p>
              </div>
            </div>

            {/* Competitor Comparison */}
            <div className="mb-3xl mt-3xl">
              <h2 className="text-4xl font-bold mb-xl text-center">
                How We Compare to Other Software
              </h2>
              <p className="text-xl text-muted text-center mb-xl max-w-2xl mx-auto">
                We researched the competition so you don't have to. Here's how Carvd Studio stacks up.
              </p>
              <div className="comparison-table-wrapper">
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th className="text-left">Software</th>
                      <th className="text-center">Price</th>
                      <th className="text-center">Offline</th>
                      <th className="text-center">Cut Lists</th>
                      <th className="text-center">Woodworking Focus</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="font-bold">SketchUp Pro</td>
                      <td className="text-center text-muted">$399/year</td>
                      <td className="text-center text-muted">Limited</td>
                      <td className="text-center text-muted">❌ No</td>
                      <td className="text-center text-muted">Moderate</td>
                    </tr>
                    <tr>
                      <td className="font-bold">Fusion 360</td>
                      <td className="text-center text-muted">$680/year</td>
                      <td className="text-center text-muted">Limited</td>
                      <td className="text-center text-muted">❌ No</td>
                      <td className="text-center text-muted">Moderate</td>
                    </tr>
                    <tr>
                      <td className="font-bold">Cabinet Vision</td>
                      <td className="text-center text-muted">$99+/month</td>
                      <td className="text-center text-muted">Unknown</td>
                      <td className="text-center text-muted">✓ Yes</td>
                      <td className="text-center text-muted">✓ Yes</td>
                    </tr>
                    <tr>
                      <td className="font-bold">SketchList 3D</td>
                      <td className="text-center text-muted">$79.99/month</td>
                      <td className="text-center text-muted">Unknown</td>
                      <td className="text-center text-muted">✓ Yes</td>
                      <td className="text-center text-muted">✓ Yes</td>
                    </tr>
                    <tr>
                      <td className="font-bold">Flatma</td>
                      <td className="text-center text-muted">$10/month</td>
                      <td className="text-center text-muted">❌ No</td>
                      <td className="text-center text-muted">✓ Yes</td>
                      <td className="text-center text-muted">✓ Yes</td>
                    </tr>
                    <tr style={{backgroundColor: 'var(--color-surface-elevated)'}}>
                      <td className="font-bold text-primary">Carvd Studio</td>
                      <td className="text-center font-bold text-primary">$59.99 once</td>
                      <td className="text-center font-bold text-success">✓ Yes</td>
                      <td className="text-center font-bold text-success">✓ Yes</td>
                      <td className="text-center font-bold text-success">✓ Yes</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-2 gap-lg mt-xl">
                <div className="accent-box">
                  <h3 className="text-xl font-bold mb-sm">Why pay $399-680/year for general CAD?</h3>
                  <p className="text-muted text-sm">
                    SketchUp and Fusion 360 are powerful, but they're designed for architects and engineers—not woodworkers.
                    You'll spend hours learning features you don't need, and you still won't get optimized cut lists.
                  </p>
                </div>
                <div className="accent-box">
                  <h3 className="text-xl font-bold mb-sm">Why pay $80-100/month for niche tools?</h3>
                  <p className="text-muted text-sm">
                    Cabinet Vision and SketchList 3D are woodworking-focused, but their subscription costs add up fast.
                    In one year, you'd pay more than 10x the cost of Carvd Studio.
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="mb-3xl mt-3xl">
              <h2 className="text-4xl font-bold mb-xl text-center">
                Your Questions, Answered
              </h2>
              <div className="grid gap-xl">
                <div className="card">
                  <h3 className="card-title">Is this really a one-time payment?</h3>
                  <p className="card-description">
                    Yes. $59.99 once, and you own Carvd Studio forever. No monthly fees, no annual renewals,
                    no surprise charges. We hate subscriptions as much as you do.
                  </p>
                </div>

                <div className="card">
                  <h3 className="card-title">Do I get future updates?</h3>
                  <p className="card-description">
                    All future updates are included free forever. New features, improvements, bug fixes—
                    you get them all automatically. No "upgrade" fees, no "pro" tiers, no games.
                  </p>
                </div>

                <div className="card">
                  <h3 className="card-title">What if I'm not satisfied?</h3>
                  <p className="card-description">
                    We offer a 30-day, no-questions-asked money-back guarantee. If Carvd Studio doesn't
                    save you time and money, email us for a full refund. You risk nothing.
                  </p>
                </div>

                <div className="card">
                  <h3 className="card-title">Can I use it on multiple computers?</h3>
                  <p className="card-description">
                    Your license works on up to 3 devices—any combination of Mac and Windows. Use it in
                    your shop, office, and on your laptop. All three at the same time if you want.
                  </p>
                </div>

                <div className="card">
                  <h3 className="card-title">Will it work offline?</h3>
                  <p className="card-description">
                    Yes. Carvd Studio works 100% offline. Take your laptop to job sites, work in your shop
                    without WiFi, design anywhere. No internet required, ever.
                  </p>
                </div>

                <div className="card">
                  <h3 className="card-title">What if I need help?</h3>
                  <p className="card-description">
                    Email us anytime at support@carvd-studio.com. You'll get help from actual woodworkers
                    who know the software inside and out. Most questions answered within 24 hours.
                  </p>
                </div>

                <div className="card">
                  <h3 className="card-title">What if my business grows and I need more licenses?</h3>
                  <p className="card-description">
                    Great question. Contact us at support@carvd-studio.com for team pricing on 5+ licenses.
                    We offer volume discounts for shops and schools.
                  </p>
                </div>
              </div>
            </div>

            {/* Final CTA */}
            <div className="cta-section mt-3xl">
              <h2 className="cta-title">
                Stop Wasting Money on Subscriptions
              </h2>
              <p className="cta-description">
                Buy once. Use forever. Save thousands.
              </p>
              <div className="flex gap-md justify-center mb-lg">
                <a href="#download" className="btn btn-highlight btn-lg">
                  Download Free Trial
                </a>
                <BuyButton />
              </div>
              <p className="text-sm text-muted">
                ✓ 30-day money-back guarantee &nbsp;•&nbsp; ✓ 3-device license &nbsp;•&nbsp; ✓ Free updates forever
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
