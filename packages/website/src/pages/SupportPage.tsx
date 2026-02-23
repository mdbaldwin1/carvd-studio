import { Wrench, HelpCircle, Mail } from "lucide-react";
import SEO from "../components/SEO";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { createFAQSchema } from "../utils/jsonLd";
import { Button } from "@/components/ui/button";
import TroubleshootingSection from "./support/TroubleshootingSection";
import FAQSection, { supportFAQs } from "./support/FAQSection";
import ContactSection from "./support/ContactSection";

const supportEmail = "support@carvd-studio.com";

export default function SupportPage() {
  return (
    <div className="site-shell">
      <SEO
        title="Support"
        description="Get help with Carvd Studio. Troubleshooting guides, frequently asked questions, and contact information for our support team."
        path="/support"
        jsonLd={createFAQSchema(supportFAQs)}
      />
      <Header />

      {/* Main Content */}
      <main id="main-content" className="container flex-1">
        <div className="py-16">
          <div className="mx-auto max-w-4xl">
            <h1 className="mb-6 text-center text-5xl font-bold max-md:text-4xl max-sm:text-3xl">
              How Can We Help?
            </h1>
            <p className="mx-auto mb-16 max-w-2xl text-center text-xl text-text-muted max-md:text-lg max-sm:text-base">
              Find answers to common questions, troubleshoot issues, or get in
              touch with our support team.
            </p>

            {/* Quick Links */}
            <div className="mb-16 grid grid-cols-3 gap-6 max-md:grid-cols-1">
              <a
                href="#troubleshooting"
                className="flex flex-col items-center feature-card p-8 text-center text-text no-underline max-md:p-6 max-sm:p-4"
              >
                <span className="mb-4 max-md:mb-3 max-sm:mb-2">
                  <Wrench size={24} />
                </span>
                <span className="mb-1 text-xl font-bold max-md:text-lg max-sm:text-base">
                  Troubleshooting
                </span>
                <span className="text-sm text-text-muted">
                  Fix common issues
                </span>
              </a>
              <a
                href="#faq"
                className="flex flex-col items-center feature-card p-8 text-center text-text no-underline max-md:p-6 max-sm:p-4"
              >
                <span className="mb-4 max-md:mb-3 max-sm:mb-2">
                  <HelpCircle size={24} />
                </span>
                <span className="mb-1 text-xl font-bold max-md:text-lg max-sm:text-base">
                  FAQ
                </span>
                <span className="text-sm text-text-muted">Quick answers</span>
              </a>
              <a
                href="#contact"
                className="flex flex-col items-center feature-card p-8 text-center text-text no-underline max-md:p-6 max-sm:p-4"
              >
                <span className="mb-4 max-md:mb-3 max-sm:mb-2">
                  <Mail size={24} />
                </span>
                <span className="mb-1 text-xl font-bold max-md:text-lg max-sm:text-base">
                  Contact Us
                </span>
                <span className="text-sm text-text-muted">
                  Get personal help
                </span>
              </a>
            </div>

            <TroubleshootingSection />
            <FAQSection />
            <ContactSection />

            {/* CTA */}
            <div className="site-section my-16 p-16 text-center max-md:p-12 max-sm:my-8 max-sm:p-8">
              <h2 className="mb-4 text-4xl font-bold max-md:text-2xl max-sm:text-xl">
                Didn't find what you need?
              </h2>
              <p className="mx-auto mb-8 max-w-[600px] text-xl text-text-muted max-md:text-lg max-sm:text-base">
                Our support team is here to help. Reach out and we'll get back
                to you as soon as possible.
              </p>
              <Button size="lg" asChild>
                <a href={`mailto:${supportEmail}`}>Contact Support</a>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
