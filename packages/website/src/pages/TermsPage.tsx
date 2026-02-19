import SEO from "../components/SEO";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(ellipse_at_top,#2d2d2d_0%,#1a1a1a_50%,#0a0a0a_100%)]">
      <SEO
        title="Terms of Service"
        description="Carvd Studio terms of service. Simple, fair terms for using our woodworking design software."
        path="/terms"
      />
      <Header />

      {/* Main Content */}
      <main id="main-content" className="container flex-1">
        <div className="py-16 max-md:py-12 max-sm:py-8">
          <div className="mx-auto max-w-3xl">
            <h1 className="mb-6 text-5xl font-bold max-md:text-3xl max-sm:text-2xl">
              Terms of Service
            </h1>
            <p className="mb-16 text-text-muted max-md:mb-12 max-sm:mb-8">
              Last updated: February 2026
            </p>

            <div className="grid gap-12 max-md:gap-8">
              {/* Introduction */}
              <section>
                <h2 className="mb-4 text-2xl font-bold">Agreement to Terms</h2>
                <p className="mb-4 text-text-muted">
                  By purchasing, downloading, installing, or using Carvd Studio
                  ("the Software"), you agree to be bound by these Terms of
                  Service ("Terms"). If you do not agree to these Terms, do not
                  use the Software.
                </p>
                <p className="text-text-muted">
                  These Terms constitute a legal agreement between you and Carvd
                  Studio ("we," "us," or "our").
                </p>
              </section>

              {/* License Grant */}
              <section>
                <h2 className="mb-4 text-2xl font-bold">License Grant</h2>
                <p className="mb-4 text-text-muted">
                  Upon purchase, we grant you a non-exclusive, non-transferable,
                  perpetual license to:
                </p>
                <ul className="grid gap-2 text-text-muted">
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
                <p className="mt-4 text-text-muted">
                  This license is perpetual, meaning you own the right to use
                  the Software indefinitely, even if you later request deletion
                  of your account or purchase records.
                </p>
              </section>

              {/* Restrictions */}
              <section>
                <h2 className="mb-4 text-2xl font-bold">
                  License Restrictions
                </h2>
                <p className="mb-4 text-text-muted">You may not:</p>
                <ul className="grid gap-2 text-text-muted">
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
                <h2 className="mb-4 text-2xl font-bold">
                  Intellectual Property
                </h2>
                <p className="mb-4 text-text-muted">
                  The Software is protected by copyright and other intellectual
                  property laws. We retain all rights, title, and interest in
                  and to the Software, including all intellectual property
                  rights.
                </p>
                <p className="text-text-muted">
                  Your purchase grants you a license to use the Software, not
                  ownership of the Software itself.
                </p>
              </section>

              {/* Your Content */}
              <section>
                <h2 className="mb-4 text-2xl font-bold">
                  Your Designs and Content
                </h2>
                <p className="text-text-muted">
                  You retain full ownership of all designs, project files, and
                  other content you create using the Software. We claim no
                  rights to your work. Your files are stored locally on your
                  computer and are never transmitted to us.
                </p>
              </section>

              {/* Money-Back Guarantee */}
              <section>
                <h2 className="mb-4 text-2xl font-bold">
                  30-Day Money-Back Guarantee
                </h2>
                <p className="mb-4 text-text-muted">
                  We offer a 30-day, no-questions-asked money-back guarantee. If
                  you're not satisfied with Carvd Studio for any reason, contact
                  us within 30 days of your purchase for a full refund.
                </p>
                <p className="text-text-muted">
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
                <h2 className="mb-4 text-2xl font-bold">Software Updates</h2>
                <p className="text-text-muted">
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
                <h2 className="mb-4 text-2xl font-bold">
                  Disclaimer of Warranties
                </h2>
                <p className="mb-4 text-text-muted">
                  THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND,
                  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
                  WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
                  PURPOSE, AND NONINFRINGEMENT.
                </p>
                <p className="text-text-muted">
                  We do not warrant that the Software will meet your
                  requirements, operate without interruption, or be error-free.
                  You assume all responsibility for selecting the Software to
                  achieve your intended results and for the installation, use,
                  and results obtained from the Software.
                </p>
              </section>

              {/* Limitation of Liability */}
              <section>
                <h2 className="mb-4 text-2xl font-bold">
                  Limitation of Liability
                </h2>
                <p className="mb-4 text-text-muted">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL WE
                  BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
                  CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT
                  LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER
                  INTANGIBLE LOSSES.
                </p>
                <p className="text-text-muted">
                  Our total liability for any claims arising under these Terms
                  shall not exceed the amount you paid for the Software.
                </p>
              </section>

              {/* Termination */}
              <section>
                <h2 className="mb-4 text-2xl font-bold">Termination</h2>
                <p className="mb-4 text-text-muted">
                  We may terminate or suspend your license immediately if you
                  breach these Terms. Upon termination, you must cease all use
                  of the Software and destroy all copies in your possession.
                </p>
                <p className="text-text-muted">
                  Sections regarding intellectual property, disclaimer of
                  warranties, limitation of liability, and governing law shall
                  survive termination.
                </p>
              </section>

              {/* Governing Law */}
              <section>
                <h2 className="mb-4 text-2xl font-bold">Governing Law</h2>
                <p className="text-text-muted">
                  These Terms shall be governed by and construed in accordance
                  with the laws of the United States, without regard to conflict
                  of law principles. Any disputes arising under these Terms
                  shall be resolved in the courts of competent jurisdiction.
                </p>
              </section>

              {/* Changes */}
              <section>
                <h2 className="mb-4 text-2xl font-bold">Changes to Terms</h2>
                <p className="text-text-muted">
                  We reserve the right to modify these Terms at any time. We
                  will notify you of any material changes by posting the new
                  Terms on this page and updating the "Last updated" date. Your
                  continued use of the Software after such changes constitutes
                  your acceptance of the new Terms.
                </p>
              </section>

              {/* Contact */}
              <section>
                <h2 className="mb-4 text-2xl font-bold">Contact Us</h2>
                <p className="text-text-muted">
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
