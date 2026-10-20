import { Card } from "@/components/ui/card";

const accentBoxHighlightStyle = {
  background: "rgba(174,164,191,0.12)",
  borderColor: "rgba(174,164,191,0.4)",
};

export default function ValueComparison() {
  return (
    <div className="mb-16 mt-16">
      <h2 className="mb-8 text-center text-4xl font-bold">
        One Payment. Long-Term Value.
      </h2>
      <p className="mx-auto mb-8 max-w-2xl text-center text-xl text-text-muted">
        Compared with a $10/month subscription, Carvd Studio costs less after 10
        months. Your license stays yours.
      </p>
      <div className="grid grid-cols-2 gap-12 max-md:grid-cols-1">
        <Card className="p-6">
          <h3 className="mb-4 text-center text-xl font-bold text-text-muted">
            Example Subscription
          </h3>
          <div className="mb-4 text-center">
            <div className="mb-2 text-4xl font-bold text-text-muted">
              $10/mo
            </div>
            <div className="text-sm text-text-muted">pay every month</div>
          </div>
          <ul className="space-y-2 p-0 text-sm text-text-muted">
            <li>6 months: $60</li>
            <li>1 year: $120</li>
            <li>2 years: $240</li>
            <li>5 years: $600</li>
            <li>Stop paying = lose access</li>
            <li>Your projects locked behind paywall</li>
          </ul>
        </Card>
        <Card
          className="p-6"
          style={{ borderColor: "var(--color-primary)", borderWidth: "2px" }}
        >
          <h3 className="mb-4 text-center text-xl font-bold text-primary">
            Carvd Studio
          </h3>
          <div className="mb-4 text-center">
            <div className="mb-2 text-4xl font-bold text-primary">$99.99</div>
            <div className="text-sm font-semibold text-primary">pay once</div>
          </div>
          <ul className="space-y-2 p-0 text-sm">
            {[
              "6 months: $99.99",
              "1 year: Still $99.99",
              "2 years: Still $99.99",
              "5 years: Still $99.99",
              "Own it forever, period",
              "Your projects always accessible",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="flex-shrink-0 font-bold text-success">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="mt-16 text-center">
        <div
          className="inline-block rounded-lg border p-8"
          style={accentBoxHighlightStyle}
        >
          <p className="text-2xl font-bold">Save $500 over 5 years</p>
          <p className="text-sm text-text-muted">
            Compared with paying $10 per month for 60 months.
          </p>
        </div>
      </div>
    </div>
  );
}
