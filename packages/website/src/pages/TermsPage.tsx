import SEO from "../components/SEO";

export default function TermsPage() {
  return (
    <div className="page bg-gradient-radial">
      <SEO
        title="Terms of Service"
        description="Carvd Studio terms of service. Simple, fair terms for using our woodworking design software."
        path="/terms"
      />
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
      <main id="main-content" className="page-content container">
        <div className="py-3xl">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-5xl font-bold mb-lg">Terms of Service</h1>
            <p className="text-muted mb-3xl">Last updated: February 2026</p>

            <div className="grid gap-2xl">
              {/* Introduction */}
              <section>
                <h2 className="text-2xl font-bold mb-md">Agreement to Terms</h2>
                <p className="text-muted mb-md">
                  By purchasing, downloading, installing, or using Carvd Studio
                  ("the Software"), you agree to be bound by these Terms of
                  Service ("Terms"). If you do not agree to these Terms, do not
                  use the Software.
                </p>
                <p className="text-muted">
                  These Terms constitute a legal agreement between you and Carvd
                  Studio ("we," "us," or "our").
                </p>
              </section>

              {/* License Grant */}
              <section>
                <h2 className="text-2xl font-bold mb-md">License Grant</h2>
                <p className="text-muted mb-md">
                  Upon purchase, we grant you a non-exclusive, non-transferable,
                  perpetual license to:
                </p>
                <ul className="grid gap-sm text-muted">
                  <li>
                    - Install and use the Software on up to three (3) devices
                    that you own or control
                  </li>
                  <li>
                    - Use the Software for personal or commercial purposes
                  </li>
                  <li>
                    - Receive all future updates to the Software at no
                    additional cost
                  </li>
                </ul>
                <p className="text-muted mt-md">
                  This license is perpetual, meaning you own the right to use
                  the Software indefinitely, even if you later request deletion
                  of your account or purchase records.
                </p>
              </section>

              {/* Restrictions */}
              <section>
                <h2 className="text-2xl font-bold mb-md">
                  License Restrictions
                </h2>
                <p className="text-muted mb-md">You may not:</p>
                <ul className="grid gap-sm text-muted">
                  <li>
                    - Share, distribute, or sell your license key to others
                  </li>
                  <li>
                    - Reverse engineer, decompile, or disassemble the Software
                  </li>
                  <li>
                    - Modify, adapt, or create derivative works based on the
                    Software
                  </li>
                  <li>
                    - Remove or alter any proprietary notices or labels on the
                    Software
                  </li>
                  <li>
                    - Use the Software in any way that violates applicable laws
                  </li>
                  <li>
                    - Circumvent or disable any license verification mechanisms
                  </li>
                </ul>
              </section>

              {/* Ownership */}
              <section>
                <h2 className="text-2xl font-bold mb-md">
                  Intellectual Property
                </h2>
                <p className="text-muted mb-md">
                  The Software is protected by copyright and other intellectual
                  property laws. We retain all rights, title, and interest in
                  and to the Software, including all intellectual property
                  rights.
                </p>
                <p className="text-muted">
                  Your purchase grants you a license to use the Software, not
                  ownership of the Software itself.
                </p>
              </section>

              {/* Your Content */}
              <section>
                <h2 className="text-2xl font-bold mb-md">
                  Your Designs and Content
                </h2>
                <p className="text-muted">
                  You retain full ownership of all designs, project files, and
                  other content you create using the Software. We claim no
                  rights to your work. Your files are stored locally on your
                  computer and are never transmitted to us.
                </p>
              </section>

              {/* Money-Back Guarantee */}
              <section>
                <h2 className="text-2xl font-bold mb-md">
                  30-Day Money-Back Guarantee
                </h2>
                <p className="text-muted mb-md">
                  We offer a 30-day, no-questions-asked money-back guarantee. If
                  you're not satisfied with Carvd Studio for any reason, contact
                  us within 30 days of your purchase for a full refund.
                </p>
                <p className="text-muted">
                  To request a refund, email us at{" "}
                  <a
                    href="mailto:support@carvd-studio.com"
                    className="text-accent"
                  >
                    support@carvd-studio.com
                  </a>{" "}
                  with your order number. Refunds are typically processed within
                  5-7 business days.
                </p>
              </section>

              {/* Updates */}
              <section>
                <h2 className="text-2xl font-bold mb-md">Software Updates</h2>
                <p className="text-muted">
                  We may release updates to the Software from time to time.
                  These updates may include bug fixes, new features, or security
                  improvements. All updates are provided free of charge to
                  licensed users. You are not required to install updates, but
                  we recommend keeping your Software up to date for the best
                  experience.
                </p>
              </section>

              {/* Disclaimer */}
              <section>
                <h2 className="text-2xl font-bold mb-md">
                  Disclaimer of Warranties
                </h2>
                <p className="text-muted mb-md">
                  THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND,
                  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
                  WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
                  PURPOSE, AND NONINFRINGEMENT.
                </p>
                <p className="text-muted">
                  We do not warrant that the Software will meet your
                  requirements, operate without interruption, or be error-free.
                  You assume all responsibility for selecting the Software to
                  achieve your intended results and for the installation, use,
                  and results obtained from the Software.
                </p>
              </section>

              {/* Limitation of Liability */}
              <section>
                <h2 className="text-2xl font-bold mb-md">
                  Limitation of Liability
                </h2>
                <p className="text-muted mb-md">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL WE
                  BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
                  CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT
                  LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER
                  INTANGIBLE LOSSES.
                </p>
                <p className="text-muted">
                  Our total liability for any claims arising under these Terms
                  shall not exceed the amount you paid for the Software.
                </p>
              </section>

              {/* Termination */}
              <section>
                <h2 className="text-2xl font-bold mb-md">Termination</h2>
                <p className="text-muted mb-md">
                  We may terminate or suspend your license immediately if you
                  breach these Terms. Upon termination, you must cease all use
                  of the Software and destroy all copies in your possession.
                </p>
                <p className="text-muted">
                  Sections regarding intellectual property, disclaimer of
                  warranties, limitation of liability, and governing law shall
                  survive termination.
                </p>
              </section>

              {/* Governing Law */}
              <section>
                <h2 className="text-2xl font-bold mb-md">Governing Law</h2>
                <p className="text-muted">
                  These Terms shall be governed by and construed in accordance
                  with the laws of the United States, without regard to conflict
                  of law principles. Any disputes arising under these Terms
                  shall be resolved in the courts of competent jurisdiction.
                </p>
              </section>

              {/* Changes */}
              <section>
                <h2 className="text-2xl font-bold mb-md">Changes to Terms</h2>
                <p className="text-muted">
                  We reserve the right to modify these Terms at any time. We
                  will notify you of any material changes by posting the new
                  Terms on this page and updating the "Last updated" date. Your
                  continued use of the Software after such changes constitutes
                  your acceptance of the new Terms.
                </p>
              </section>

              {/* Contact */}
              <section>
                <h2 className="text-2xl font-bold mb-md">Contact Us</h2>
                <p className="text-muted">
                  If you have any questions about these Terms, please contact us
                  at{" "}
                  <a
                    href="mailto:support@carvd-studio.com"
                    className="text-accent"
                  >
                    support@carvd-studio.com
                  </a>
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
