export default function ValueComparison() {
  return (
    <div className="mb-3xl mt-3xl">
      <h2 className="text-4xl font-bold mb-xl text-center">
        The Break-Even Point? 6 Months.
      </h2>
      <p className="text-xl text-muted text-center mb-xl max-w-2xl mx-auto">
        If you think you'll use furniture design software for more than half a
        year, Carvd Studio is the smart choice.
      </p>
      <div className="grid grid-cols-2 gap-2xl">
        <div className="card">
          <h3 className="card-title text-center text-muted">
            Monthly Subscription
          </h3>
          <div className="text-center mb-md">
            <div className="text-4xl font-bold text-muted mb-sm">$10/mo</div>
            <div className="text-sm text-muted">pay every month</div>
          </div>
          <ul className="grid gap-sm text-muted text-sm">
            <li>6 months: $60</li>
            <li>1 year: $120</li>
            <li>2 years: $240</li>
            <li>5 years: $600</li>
            <li>Stop paying = lose access</li>
            <li>Your projects locked behind paywall</li>
          </ul>
        </div>
        <div
          className="card"
          style={{
            borderColor: "var(--color-primary)",
            borderWidth: "2px",
          }}
        >
          <h3 className="card-title text-center text-primary">Carvd Studio</h3>
          <div className="text-center mb-md">
            <div className="text-4xl font-bold text-primary mb-sm">$59.99</div>
            <div className="text-sm font-semibold text-primary">pay once</div>
          </div>
          <ul className="checklist text-sm">
            <li>
              <span>6 months: $59.99</span>
            </li>
            <li>
              <span>1 year: Still $59.99</span>
            </li>
            <li>
              <span>2 years: Still $59.99</span>
            </li>
            <li>
              <span>5 years: Still $59.99</span>
            </li>
            <li>
              <span>Own it forever, period</span>
            </li>
            <li>
              <span>Your projects always accessible</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="text-center mt-3xl">
        <div className="accent-box-highlight inline-block">
          <p className="text-2xl font-bold">Save $540 over 5 years</p>
          <p className="text-sm text-muted">
            That's enough for a premium table saw blade every year.
          </p>
        </div>
      </div>
    </div>
  );
}
