import { Wrench, HelpCircle, Mail } from "lucide-react";
import SEO from "../components/SEO";
import Header from "../components/Header";
import Footer from "../components/Footer";
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
      <Header />

      {/* Main Content */}
      <main id="main-content" className="page-content container">
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

      <Footer />
    </div>
  );
}
