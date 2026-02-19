import SEO from "../components/SEO";
import Header from "../components/Header";
import Footer from "../components/Footer";

const highlightBoxStyle = {
  background:
    "linear-gradient(135deg, rgba(174,164,191,0.15) 0%, rgba(174,164,191,0.05) 100%)",
  borderColor: "rgba(174,164,191,0.4)",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(ellipse_at_top,#2d2d2d_0%,#1a1a1a_50%,#0a0a0a_100%)]">
      <SEO
        title="Privacy Policy"
        description="Carvd Studio privacy policy. Learn how we handle your data — spoiler: your designs stay on your computer."
        path="/privacy"
      />
      <Header />

      {/* Main Content */}
      <main id="main-content" className="container flex-1">
        <div className="py-16 max-md:py-12 max-sm:py-8">
          <div className="mx-auto max-w-3xl">
            <h1 className="mb-6 text-5xl font-bold max-md:text-3xl max-sm:text-2xl">
              Privacy Policy
            </h1>
            <p className="mb-16 text-text-muted max-md:mb-12 max-sm:mb-8">
              Last updated: February 2026
            </p>

            <div className="grid gap-12 max-md:gap-8">
              {/* Introduction */}
              <section>
                <h2 className="mb-4 text-2xl font-bold">
                  Our Commitment to Your Privacy
                </h2>
                <p className="mb-4 text-text-muted">
                  Carvd Studio is designed with privacy as a core principle.
                  Unlike most modern software, we don't collect your data, track
                  your usage, or require an internet connection to function.
                  Your designs, your data, and your privacy belong to you.
                </p>
                <div
                  className="rounded-lg border p-8 max-sm:p-6"
                  style={highlightBoxStyle}
                >
                  <p className="font-semibold">
                    TL;DR: We don't collect your data. Carvd Studio runs
                    entirely on your computer. We can't see your designs, and we
                    don't want to.
                  </p>
                </div>
              </section>

              {/* Data Collection */}
              <section>
                <h2 className="mb-4 text-2xl font-bold">
                  Data We Don't Collect
                </h2>
                <p className="mb-4 text-text-muted">
                  Carvd Studio is an offline-first desktop application. We do
                  not collect:
                </p>
                <ul className="grid gap-2 text-text-muted">
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
                <h2 className="mb-4 text-2xl font-bold">
                  Data Stored on Your Computer
                </h2>
                <p className="mb-4 text-text-muted">
                  All Carvd Studio data is stored locally on your computer:
                </p>
                <ul className="grid gap-2 text-text-muted">
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
                <h2 className="mb-4 text-2xl font-bold">
                  License Verification
                </h2>
                <p className="mb-4 text-text-muted">
                  The only time Carvd Studio connects to the internet is for
                  license verification:
                </p>
                <ul className="grid gap-2 text-text-muted">
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
                <p className="mt-4 text-text-muted">
                  During license verification, we transmit only your license
                  key. We do not transmit any information about your designs or
                  how you use the software.
                </p>
              </section>

              {/* Purchase Information */}
              <section>
                <h2 className="mb-4 text-2xl font-bold">
                  Purchase Information
                </h2>
                <p className="mb-4 text-text-muted">
                  When you purchase Carvd Studio, your payment is processed by
                  Lemon Squeezy, our payment processor. They collect standard
                  purchase information (name, email, payment details) as
                  necessary to complete your transaction.
                </p>
                <p className="text-text-muted">
                  We receive your email address and name from Lemon Squeezy to
                  provide customer support and deliver your license key. We do
                  not receive or store your payment card details.
                </p>
              </section>

              {/* Third Parties */}
              <section>
                <h2 className="mb-4 text-2xl font-bold">
                  Third-Party Services
                </h2>
                <p className="mb-4 text-text-muted">
                  Carvd Studio uses the following third-party services:
                </p>
                <ul className="grid gap-2 text-text-muted">
                  <li>
                    <strong>Lemon Squeezy:</strong> Payment processing and
                    license management.
                    <a
                      href="https://www.lemonsqueezy.com/privacy"
                      className="ml-2 text-accent"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View their privacy policy →
                    </a>
                  </li>
                </ul>
                <p className="mt-4 text-text-muted">
                  We do not use analytics services, advertising networks, or any
                  other third-party tracking within the Carvd Studio
                  application.
                </p>
              </section>

              {/* Your Rights */}
              <section>
                <h2 className="mb-4 text-2xl font-bold">Your Rights</h2>
                <p className="mb-4 text-text-muted">
                  Since we don't collect your data, there's not much to manage.
                  However, you have the right to:
                </p>
                <ul className="grid gap-2 text-text-muted">
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
                <h2 className="mb-4 text-2xl font-bold">Contact Us</h2>
                <p className="text-text-muted">
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
                <h2 className="mb-4 text-2xl font-bold">
                  Changes to This Policy
                </h2>
                <p className="text-text-muted">
                  We may update this privacy policy from time to time. We will
                  notify you of any significant changes by posting the new
                  policy on this page and updating the "Last updated" date. We
                  encourage you to review this policy periodically.
                </p>
              </section>
            </div>

            {/* Back Link */}
            <a
              href="/"
              className="mt-16 inline-flex items-center gap-1 font-medium text-accent transition-colors hover:text-accent-hover hover:underline max-md:mt-12 max-sm:mt-8"
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
