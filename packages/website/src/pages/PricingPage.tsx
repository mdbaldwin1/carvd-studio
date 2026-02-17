import { Coins } from "lucide-react";
import BuyButton from "../components/BuyButton";
import SEO from "../components/SEO";
import Header from "../components/Header";
import Footer from "../components/Footer";
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
      <Header />

      {/* Main Content */}
      <main id="main-content" className="page-content container">
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

      <Footer />
    </div>
  );
}
