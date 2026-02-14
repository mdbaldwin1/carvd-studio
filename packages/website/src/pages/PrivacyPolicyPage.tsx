export default function PrivacyPolicyPage() {
  return (
    <div className="page bg-gradient-radial">
      {/* Header */}
      <header className="header">
        <nav className="nav container">
          <a href="/" className="nav-brand">
            Carvd Studio
          </a>
          <div className="nav-links">
            <a href="/features" className="nav-link">
              Features
            </a>
            <a href="/pricing" className="nav-link">
              Pricing
            </a>
            <a href="/docs" className="nav-link">
              Docs
            </a>
            <a href="/download" className="btn btn-highlight btn-sm">
              Download
            </a>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="page-content container">
        <div className="py-3xl">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-5xl font-bold mb-lg">Privacy Policy</h1>
            <p className="text-muted mb-3xl">Last updated: February 2026</p>

            <div className="grid gap-2xl">
              {/* Introduction */}
              <section>
                <h2 className="text-2xl font-bold mb-md">
                  Our Commitment to Your Privacy
                </h2>
                <p className="text-muted mb-md">
                  Carvd Studio is designed with privacy as a core principle.
                  Unlike most modern software, we don't collect your data, track
                  your usage, or require an internet connection to function.
                  Your designs, your data, and your privacy belong to you.
                </p>
                <div className="accent-box-highlight">
                  <p className="font-semibold">
                    TL;DR: We don't collect your data. Carvd Studio runs
                    entirely on your computer. We can't see your designs, and we
                    don't want to.
                  </p>
                </div>
              </section>

              {/* Data Collection */}
              <section>
                <h2 className="text-2xl font-bold mb-md">
                  Data We Don't Collect
                </h2>
                <p className="text-muted mb-md">
                  Carvd Studio is an offline-first desktop application. We do
                  not collect:
                </p>
                <ul className="grid gap-sm text-muted">
                  <li>- Your furniture designs or project files</li>
                  <li>- Usage analytics or telemetry data</li>
                  <li>
                    - Personal information beyond what you provide at purchase
                  </li>
                  <li>- Browsing history or behavior tracking</li>
                  <li>- Device fingerprints or hardware information</li>
                  <li>- Location data</li>
                </ul>
              </section>

              {/* Local Storage */}
              <section>
                <h2 className="text-2xl font-bold mb-md">
                  Data Stored on Your Computer
                </h2>
                <p className="text-muted mb-md">
                  All Carvd Studio data is stored locally on your computer:
                </p>
                <ul className="grid gap-sm text-muted">
                  <li>
                    <strong>Project files (.carvd):</strong> Saved wherever you
                    choose on your filesystem. These files contain your designs
                    and are never transmitted to us.
                  </li>
                  <li>
                    <strong>Application preferences:</strong> Your settings
                    (units, grid size, theme, etc.) are stored locally in your
                    operating system's standard application data folder.
                  </li>
                  <li>
                    <strong>License information:</strong> Your license key and
                    activation status are stored locally to enable offline use.
                  </li>
                  <li>
                    <strong>Auto-recovery data:</strong> Temporary backups of
                    your work are stored locally to protect against crashes.
                  </li>
                </ul>
              </section>

              {/* License Verification */}
              <section>
                <h2 className="text-2xl font-bold mb-md">
                  License Verification
                </h2>
                <p className="text-muted mb-md">
                  The only time Carvd Studio connects to the internet is for
                  license verification:
                </p>
                <ul className="grid gap-sm text-muted">
                  <li>
                    <strong>Initial activation:</strong> When you first activate
                    your license, we verify it with our licensing provider
                    (Lemon Squeezy).
                  </li>
                  <li>
                    <strong>Periodic re-validation:</strong> Approximately once
                    every 7 days when connected to the internet, your license is
                    re-validated. This helps us prevent piracy while minimizing
                    disruption to you.
                  </li>
                  <li>
                    <strong>Offline grace period:</strong> If you're offline,
                    your license remains valid for 7 days since the last
                    successful validation. After that, you'll need to connect to
                    the internet once to re-validate.
                  </li>
                </ul>
                <p className="text-muted mt-md">
                  During license verification, we transmit only your license
                  key. We do not transmit any information about your designs or
                  how you use the software.
                </p>
              </section>

              {/* Purchase Information */}
              <section>
                <h2 className="text-2xl font-bold mb-md">
                  Purchase Information
                </h2>
                <p className="text-muted mb-md">
                  When you purchase Carvd Studio, your payment is processed by
                  Lemon Squeezy, our payment processor. They collect standard
                  purchase information (name, email, payment details) as
                  necessary to complete your transaction.
                </p>
                <p className="text-muted">
                  We receive your email address and name from Lemon Squeezy to
                  provide customer support and deliver your license key. We do
                  not receive or store your payment card details.
                </p>
              </section>

              {/* Third Parties */}
              <section>
                <h2 className="text-2xl font-bold mb-md">
                  Third-Party Services
                </h2>
                <p className="text-muted mb-md">
                  Carvd Studio uses the following third-party services:
                </p>
                <ul className="grid gap-sm text-muted">
                  <li>
                    <strong>Lemon Squeezy:</strong> Payment processing and
                    license management.
                    <a
                      href="https://www.lemonsqueezy.com/privacy"
                      className="text-accent ml-sm"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View their privacy policy →
                    </a>
                  </li>
                </ul>
                <p className="text-muted mt-md">
                  We do not use analytics services, advertising networks, or any
                  other third-party tracking within the Carvd Studio
                  application.
                </p>
              </section>

              {/* Your Rights */}
              <section>
                <h2 className="text-2xl font-bold mb-md">Your Rights</h2>
                <p className="text-muted mb-md">
                  Since we don't collect your data, there's not much to manage.
                  However, you have the right to:
                </p>
                <ul className="grid gap-sm text-muted">
                  <li>
                    - Request information about any data we hold about you
                    (purchase records)
                  </li>
                  <li>- Request deletion of your purchase records</li>
                  <li>- Deactivate your license from your devices</li>
                  <li>
                    - Contact us with any privacy-related questions or concerns
                  </li>
                </ul>
              </section>

              {/* Contact */}
              <section>
                <h2 className="text-2xl font-bold mb-md">Contact Us</h2>
                <p className="text-muted">
                  If you have any questions about this privacy policy or our
                  privacy practices, please contact us at{" "}
                  <a
                    href="mailto:support@carvd-studio.com"
                    className="text-accent"
                  >
                    support@carvd-studio.com
                  </a>
                </p>
              </section>

              {/* Changes */}
              <section>
                <h2 className="text-2xl font-bold mb-md">
                  Changes to This Policy
                </h2>
                <p className="text-muted">
                  We may update this privacy policy from time to time. We will
                  notify you of any significant changes by posting the new
                  policy on this page and updating the "Last updated" date. We
                  encourage you to review this policy periodically.
                </p>
              </section>
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
            <a href="/features" className="nav-link">
              Features
            </a>
            <a href="/pricing" className="nav-link">
              Pricing
            </a>
            <a href="/docs" className="nav-link">
              Documentation
            </a>
            <a href="/support" className="nav-link">
              Support
            </a>
          </div>
          <div className="flex justify-center gap-xl text-sm text-muted">
            <a href="/privacy" className="nav-link">
              Privacy Policy
            </a>
            <a href="/terms" className="nav-link">
              Terms of Service
            </a>
            <a href="/changelog" className="nav-link">
              Changelog
            </a>
          </div>
        </div>
        <p>&copy; 2026 Carvd Studio. All rights reserved.</p>
      </footer>
    </div>
  );
}
