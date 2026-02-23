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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function PricingPage() {
  return (
    <div className="site-shell">
      <SEO
        title="Pricing"
        description="One-time purchase, no subscription. Carvd Studio woodworking design software for $59.99. Own it forever with free updates."
        path="/pricing"
        jsonLd={createFAQSchema(pricingFAQs)}
      />
      <Header />

      <main id="main-content" className="container flex-1">
        <div className="py-16">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="outline" className="hero-kicker mx-auto mb-6 gap-1">
              <Coins size={16} /> Less Than 6 Months of Subscription Software
            </Badge>
            <h1 className="mb-6 text-6xl font-bold">
              Pay Once.
              <br />
              <span className="text-highlight">Own It Forever.</span>
            </h1>
            <p className="mx-auto mb-16 max-w-2xl text-center text-xl text-text-muted">
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
            <div className="site-section my-16 p-16 text-center max-md:p-12 max-sm:my-8 max-sm:p-8">
              <h2 className="mb-4 text-4xl font-bold max-md:text-2xl max-sm:text-xl">
                Stop Wasting Money on Subscriptions
              </h2>
              <p className="mx-auto mb-8 max-w-[600px] text-xl text-text-muted max-md:text-lg max-sm:text-base">
                Buy once. Use forever. Save thousands.
              </p>
              <div className="mb-6 flex justify-center gap-4 max-sm:flex-col max-sm:items-center">
                <Button size="lg" asChild>
                  <a href="/download">Download Free Trial</a>
                </Button>
                <BuyButton />
              </div>
              <p className="text-sm text-text-muted">
                ✓ 30-day money-back guarantee &nbsp;•&nbsp; ✓ 3-device license
                &nbsp;•&nbsp; ✓ Free updates forever
              </p>
            </div>

            {/* Back Link */}
            <a
              href="/"
              className="mt-16 block inline-flex items-center gap-1 font-medium text-accent transition-colors hover:text-accent-hover hover:underline"
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
