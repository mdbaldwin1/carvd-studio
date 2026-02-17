import { Coins } from "lucide-react";
import BuyButton from "../components/BuyButton";
import SEO from "../components/SEO";
import { createFAQSchema } from "../utils/jsonLd";
import PricingCard from "./pricing/PricingCard";
import ValueComparison from "./pricing/ValueComparison";
import ROISection from "./pricing/ROISection";
import CompetitorComparison from "./pricing/CompetitorComparison";
import PricingFAQ, { pricingFAQs } from "./pricing/PricingFAQ";

export default function PricingPage() {
  return (
    <div className="page bg-gradient-radial">
      <SEO
        title="Pricing"
        description="One-time purchase, no subscription. Carvd Studio woodworking design software for $59.99. Own it forever with free updates."
        path="/pricing"
        jsonLd={createFAQSchema(pricingFAQs)}
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
          <div className="max-w-4xl mx-auto text-center">
            <div className="badge badge-highlight mb-lg">
              <Coins size={16} /> Less Than 6 Months of Subscription Software
            </div>
            <h1 className="text-6xl font-bold mb-lg">
              Pay Once.
              <br />
              <span className="text-primary">Own It Forever.</span>
            </h1>
            <p className="text-xl text-muted text-center mb-3xl max-w-2xl mx-auto">
              Even the cheapest furniture design subscriptions start at
              $10/month. That's $60 after 6 months. Carvd Studio costs $59.99
              once—and you own it forever.
            </p>

            <PricingCard />
            <ValueComparison />
            <ROISection />
            <CompetitorComparison />
            <PricingFAQ />

            {/* Final CTA */}
            <div className="cta-section mt-3xl">
              <h2 className="cta-title">Stop Wasting Money on Subscriptions</h2>
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
                ✓ 30-day money-back guarantee &nbsp;•&nbsp; ✓ 3-device license
                &nbsp;•&nbsp; ✓ Free updates forever
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
