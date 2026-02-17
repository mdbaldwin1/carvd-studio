import { Wrench, HelpCircle, Mail } from "lucide-react";
import SEO from "../components/SEO";
import { createFAQSchema } from "../utils/jsonLd";
import TroubleshootingSection from "./support/TroubleshootingSection";
import FAQSection, { supportFAQs } from "./support/FAQSection";
import ContactSection from "./support/ContactSection";

const supportEmail = "support@carvd-studio.com";

export default function SupportPage() {
  return (
    <div className="page bg-gradient-radial">
      <SEO
        title="Support"
        description="Get help with Carvd Studio. Troubleshooting guides, frequently asked questions, and contact information for our support team."
        path="/support"
        jsonLd={createFAQSchema(supportFAQs)}
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
      <main className="page-content container">
        <div className="py-3xl">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold mb-lg text-center">
              How Can We Help?
            </h1>
            <p className="text-xl text-muted text-center mb-3xl max-w-2xl mx-auto">
              Find answers to common questions, troubleshoot issues, or get in
              touch with our support team.
            </p>

            {/* Quick Links */}
            <div className="grid grid-cols-3 gap-lg mb-3xl">
              <a href="#troubleshooting" className="support-card">
                <span className="support-card-icon">
                  <Wrench size={24} />
                </span>
                <span className="support-card-title">Troubleshooting</span>
                <span className="support-card-desc">Fix common issues</span>
              </a>
              <a href="#faq" className="support-card">
                <span className="support-card-icon">
                  <HelpCircle size={24} />
                </span>
                <span className="support-card-title">FAQ</span>
                <span className="support-card-desc">Quick answers</span>
              </a>
              <a href="#contact" className="support-card">
                <span className="support-card-icon">
                  <Mail size={24} />
                </span>
                <span className="support-card-title">Contact Us</span>
                <span className="support-card-desc">Get personal help</span>
              </a>
            </div>

            <TroubleshootingSection />
            <FAQSection />
            <ContactSection />

            {/* CTA */}
            <section className="cta-section">
              <h2 className="cta-title">Didn't find what you need?</h2>
              <p className="cta-description">
                Our support team is here to help. Reach out and we'll get back
                to you as soon as possible.
              </p>
              <a
                href={`mailto:${supportEmail}`}
                className="btn btn-highlight btn-lg"
              >
                Contact Support
              </a>
            </section>
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
