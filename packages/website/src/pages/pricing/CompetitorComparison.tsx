export default function CompetitorComparison() {
  return (
    <div className="mb-3xl mt-3xl">
      <h2 className="text-4xl font-bold mb-xl text-center">
        How We Compare to Other Software
      </h2>
      <p className="text-xl text-muted text-center mb-xl max-w-2xl mx-auto">
        We researched the competition so you don't have to. Here's how Carvd
        Studio stacks up.
      </p>
      <div className="comparison-table-wrapper">
        <table className="comparison-table">
          <thead>
            <tr>
              <th className="text-left">Software</th>
              <th className="text-center">Price</th>
              <th className="text-center">Offline</th>
              <th className="text-center">Cut Lists</th>
              <th className="text-center">Woodworking Focus</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-bold">SketchUp Pro</td>
              <td className="text-center text-muted">$399/year</td>
              <td className="text-center text-muted">Limited</td>
              <td className="text-center text-muted">No</td>
              <td className="text-center text-muted">Moderate</td>
            </tr>
            <tr>
              <td className="font-bold">Fusion 360</td>
              <td className="text-center text-muted">$680/year</td>
              <td className="text-center text-muted">Limited</td>
              <td className="text-center text-muted">No</td>
              <td className="text-center text-muted">Moderate</td>
            </tr>
            <tr>
              <td className="font-bold">Cabinet Vision</td>
              <td className="text-center text-muted">$99+/month</td>
              <td className="text-center text-muted">Unknown</td>
              <td className="text-center text-muted">✓ Yes</td>
              <td className="text-center text-muted">✓ Yes</td>
            </tr>
            <tr>
              <td className="font-bold">SketchList 3D</td>
              <td className="text-center text-muted">$79.99/month</td>
              <td className="text-center text-muted">Unknown</td>
              <td className="text-center text-muted">✓ Yes</td>
              <td className="text-center text-muted">✓ Yes</td>
            </tr>
            <tr>
              <td className="font-bold">Flatma</td>
              <td className="text-center text-muted">$10/month</td>
              <td className="text-center text-muted">No</td>
              <td className="text-center text-muted">✓ Yes</td>
              <td className="text-center text-muted">✓ Yes</td>
            </tr>
            <tr
              style={{
                backgroundColor: "var(--color-surface-elevated)",
              }}
            >
              <td className="font-bold text-primary">Carvd Studio</td>
              <td className="text-center font-bold text-primary">
                $59.99 once
              </td>
              <td className="text-center font-bold text-success">✓ Yes</td>
              <td className="text-center font-bold text-success">✓ Yes</td>
              <td className="text-center font-bold text-success">✓ Yes</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-2 gap-lg mt-xl">
        <div className="accent-box">
          <h3 className="text-xl font-bold mb-sm">
            Why pay $399-680/year for general CAD?
          </h3>
          <p className="text-muted text-sm">
            SketchUp and Fusion 360 are powerful, but they're designed for
            architects and engineers—not woodworkers. You'll spend hours
            learning features you don't need, and you still won't get optimized
            cut lists.
          </p>
        </div>
        <div className="accent-box">
          <h3 className="text-xl font-bold mb-sm">
            Why pay $80-100/month for niche tools?
          </h3>
          <p className="text-muted text-sm">
            Cabinet Vision and SketchList 3D are woodworking-focused, but their
            subscription costs add up fast. In one year, you'd pay more than 10x
            the cost of Carvd Studio.
          </p>
        </div>
      </div>
    </div>
  );
}
