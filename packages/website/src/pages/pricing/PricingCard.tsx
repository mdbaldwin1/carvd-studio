import { Rocket, Lightbulb } from "lucide-react";
import BuyButton from "../../components/BuyButton";

export default function PricingCard() {
  return (
    <div className="max-w-2xl mx-auto mb-3xl">
      <div
        className="card p-3xl"
        style={{
          borderColor: "var(--color-primary)",
          borderWidth: "2px",
        }}
      >
        <div className="text-center mb-xl">
          <div className="badge badge-warning mb-md mx-auto">
            <Rocket size={16} /> Launch Special — Price increases to $99 soon
          </div>
          <h2 className="text-4xl font-bold mb-md">Carvd Studio</h2>
          <div className="flex items-center justify-center gap-md mb-md">
            <span className="text-6xl font-bold text-highlight">$59.99</span>
            <div className="text-left">
              <div className="text-lg font-bold">one-time payment</div>
              <div className="text-sm text-muted">yours forever</div>
            </div>
          </div>
          <div className="text-sm text-muted mb-lg">
            <span className="line-through">$99</span> — Early adopter pricing
          </div>
          <p className="text-sm text-success mb-md">
            <Lightbulb size={16} /> The cut list optimizer alone typically saves
            more than $59 in wasted lumber on a single project
          </p>
          <div className="accent-box-highlight mb-xl">
            <p className="text-lg font-semibold text-center">
              Lock in launch pricing before it goes up
            </p>
          </div>
        </div>

        {/* What's Included */}
        <div className="mb-xl">
          <h3 className="text-2xl font-bold mb-md text-center">
            Everything Included
          </h3>
          <ul className="checklist">
            <li>
              <span>
                Full 3D furniture design studio with real-time rendering
              </span>
            </li>
            <li>
              <span>Intelligent cut list optimizer that minimizes waste</span>
            </li>
            <li>
              <span>
                Real-time material cost tracking and project estimating
              </span>
            </li>
            <li>
              <span>Custom materials library with your supplier prices</span>
            </li>
            <li>
              <span>Reusable assembly library for common components</span>
            </li>
            <li>
              <span>
                Joinery allowances for extra material on tenons, dados, etc.
              </span>
            </li>
            <li>
              <span>
                Professional PDF export for cut sheets and presentations
              </span>
            </li>
            <li>
              <span>100% offline operation—no internet required ever</span>
            </li>
            <li>
              <span>
                Complete data privacy—your designs stay on your computer
              </span>
            </li>
            <li>
              <span>Free lifetime updates with new features</span>
            </li>
            <li>
              <span>Install on up to 3 devices (Mac & Windows)</span>
            </li>
            <li>
              <span>Email support with actual woodworkers</span>
            </li>
          </ul>
        </div>

        {/* CTA Buttons */}
        <div className="grid gap-md mb-lg">
          <a href="#download" className="btn btn-highlight btn-lg w-full">
            Download Free Trial
          </a>
          <BuyButton className="btn btn-primary btn-lg w-full" />
        </div>

        {/* Trust Signals */}
        <div className="text-center">
          <p className="text-sm text-muted mb-sm">
            ✓ 30-day money-back guarantee &nbsp;•&nbsp; ✓ Instant download
            &nbsp;•&nbsp; ✓ Secure checkout
          </p>
          <p className="text-xs text-muted">
            You'll receive your license key via email within minutes of purchase
          </p>
        </div>
      </div>
    </div>
  );
}
