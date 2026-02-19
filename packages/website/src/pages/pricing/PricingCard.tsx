import { Rocket, Lightbulb } from "lucide-react";
import BuyButton from "../../components/BuyButton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const accentBoxHighlightStyle = {
  background:
    "linear-gradient(135deg, rgba(174,164,191,0.15) 0%, rgba(174,164,191,0.05) 100%)",
  borderColor: "rgba(174,164,191,0.4)",
};

export default function PricingCard() {
  return (
    <div className="mx-auto mb-16 max-w-2xl">
      <Card
        className="p-16"
        style={{ borderColor: "var(--color-primary)", borderWidth: "2px" }}
      >
        <div className="mb-8 text-center">
          <Badge
            variant="outline"
            className="mx-auto mb-4 gap-1 border-warning bg-[rgba(255,210,31,0.2)] text-warning"
          >
            <Rocket size={16} /> Launch Special — Price increases to $99 soon
          </Badge>
          <h2 className="mb-4 text-4xl font-bold">Carvd Studio</h2>
          <div className="mb-4 flex items-center justify-center gap-4">
            <span className="text-6xl font-bold text-highlight">$59.99</span>
            <div className="text-left">
              <div className="text-lg font-bold">one-time payment</div>
              <div className="text-sm text-text-muted">yours forever</div>
            </div>
          </div>
          <div className="mb-6 text-sm text-text-muted">
            <span className="line-through">$99</span> — Early adopter pricing
          </div>
          <p className="mb-4 flex items-center justify-center gap-1 text-sm text-success">
            <Lightbulb size={16} /> The cut list optimizer alone typically saves
            more than $59 in wasted lumber on a single project
          </p>
          <div
            className="mb-8 rounded-lg border p-4"
            style={accentBoxHighlightStyle}
          >
            <p className="text-center text-lg font-semibold">
              Lock in launch pricing before it goes up
            </p>
          </div>
        </div>

        {/* What's Included */}
        <div className="mb-8">
          <h3 className="mb-4 text-center text-2xl font-bold">
            Everything Included
          </h3>
          <ul className="space-y-4 p-0">
            {[
              "Full 3D furniture design studio with real-time rendering",
              "Intelligent cut list optimizer that minimizes waste",
              "Real-time material cost tracking and project estimating",
              "Custom materials library with your supplier prices",
              "Reusable assembly library for common components",
              "Joinery allowances for extra material on tenons, dados, etc.",
              "Professional PDF export for cut sheets and presentations",
              "100% offline operation—no internet required ever",
              "Complete data privacy—your designs stay on your computer",
              "Free lifetime updates with new features",
              "Install on up to 3 devices (Mac & Windows)",
              "Email support with actual woodworkers",
            ].map((item) => (
              <li key={item} className="flex items-start gap-4">
                <span className="flex-shrink-0 text-xl font-bold text-success">
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Buttons */}
        <div className="mb-6 grid gap-4">
          <Button size="lg" className="w-full" asChild>
            <a href="#download">Download Free Trial</a>
          </Button>
          <BuyButton className="w-full" size="lg" />
        </div>

        {/* Trust Signals */}
        <div className="text-center">
          <p className="mb-2 text-sm text-text-muted">
            ✓ 30-day money-back guarantee &nbsp;•&nbsp; ✓ Instant download
            &nbsp;•&nbsp; ✓ Secure checkout
          </p>
          <p className="text-xs text-text-muted">
            You'll receive your license key via email within minutes of purchase
          </p>
        </div>
      </Card>
    </div>
  );
}
