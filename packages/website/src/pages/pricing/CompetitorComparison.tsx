const accentBoxStyle = {
  background:
    "linear-gradient(135deg, rgba(74,144,226,0.1) 0%, rgba(74,144,226,0.05) 100%)",
  borderColor: "rgba(74,144,226,0.3)",
};

export default function CompetitorComparison() {
  return (
    <div className="mb-16 mt-16">
      <h2 className="mb-8 text-center text-4xl font-bold">
        How We Compare to Other Software
      </h2>
      <p className="mx-auto mb-8 max-w-2xl text-center text-xl text-text-muted">
        We researched the competition so you don't have to. Here's how Carvd
        Studio stacks up.
      </p>
      <div className="w-full overflow-x-auto [-webkit-overflow-scrolling:touch]">
        <table className="my-8 w-full border-collapse">
          <thead>
            <tr>
              <th className="border-b border-border bg-surface p-4 text-left font-bold text-text max-md:p-2 max-md:text-sm">
                Software
              </th>
              <th className="border-b border-border bg-surface p-4 text-center font-bold text-text max-md:p-2 max-md:text-sm">
                Price
              </th>
              <th className="border-b border-border bg-surface p-4 text-center font-bold text-text max-md:p-2 max-md:text-sm">
                Offline
              </th>
              <th className="border-b border-border bg-surface p-4 text-center font-bold text-text max-md:p-2 max-md:text-sm">
                Cut Lists
              </th>
              <th className="border-b border-border bg-surface p-4 text-center font-bold text-text max-md:p-2 max-md:text-sm">
                Woodworking Focus
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-surface">
              <td className="border-b border-border p-4 font-bold max-md:p-2 max-md:text-sm">
                SketchUp Pro
              </td>
              <td className="border-b border-border p-4 text-center text-text-muted max-md:p-2 max-md:text-sm">
                $399/year
              </td>
              <td className="border-b border-border p-4 text-center text-text-muted max-md:p-2 max-md:text-sm">
                Limited
              </td>
              <td className="border-b border-border p-4 text-center text-text-muted max-md:p-2 max-md:text-sm">
                No
              </td>
              <td className="border-b border-border p-4 text-center text-text-muted max-md:p-2 max-md:text-sm">
                Moderate
              </td>
            </tr>
            <tr className="hover:bg-surface">
              <td className="border-b border-border p-4 font-bold max-md:p-2 max-md:text-sm">
                Fusion 360
              </td>
              <td className="border-b border-border p-4 text-center text-text-muted max-md:p-2 max-md:text-sm">
                $680/year
              </td>
              <td className="border-b border-border p-4 text-center text-text-muted max-md:p-2 max-md:text-sm">
                Limited
              </td>
              <td className="border-b border-border p-4 text-center text-text-muted max-md:p-2 max-md:text-sm">
                No
              </td>
              <td className="border-b border-border p-4 text-center text-text-muted max-md:p-2 max-md:text-sm">
                Moderate
              </td>
            </tr>
            <tr className="hover:bg-surface">
              <td className="border-b border-border p-4 font-bold max-md:p-2 max-md:text-sm">
                Cabinet Vision
              </td>
              <td className="border-b border-border p-4 text-center text-text-muted max-md:p-2 max-md:text-sm">
                $99+/month
              </td>
              <td className="border-b border-border p-4 text-center text-text-muted max-md:p-2 max-md:text-sm">
                Unknown
              </td>
              <td className="border-b border-border p-4 text-center text-text-muted max-md:p-2 max-md:text-sm">
                ✓ Yes
              </td>
              <td className="border-b border-border p-4 text-center text-text-muted max-md:p-2 max-md:text-sm">
                ✓ Yes
              </td>
            </tr>
            <tr className="hover:bg-surface">
              <td className="border-b border-border p-4 font-bold max-md:p-2 max-md:text-sm">
                SketchList 3D
              </td>
              <td className="border-b border-border p-4 text-center text-text-muted max-md:p-2 max-md:text-sm">
                $79.99/month
              </td>
              <td className="border-b border-border p-4 text-center text-text-muted max-md:p-2 max-md:text-sm">
                Unknown
              </td>
              <td className="border-b border-border p-4 text-center text-text-muted max-md:p-2 max-md:text-sm">
                ✓ Yes
              </td>
              <td className="border-b border-border p-4 text-center text-text-muted max-md:p-2 max-md:text-sm">
                ✓ Yes
              </td>
            </tr>
            <tr className="hover:bg-surface">
              <td className="border-b border-border p-4 font-bold max-md:p-2 max-md:text-sm">
                Flatma
              </td>
              <td className="border-b border-border p-4 text-center text-text-muted max-md:p-2 max-md:text-sm">
                $10/month
              </td>
              <td className="border-b border-border p-4 text-center text-text-muted max-md:p-2 max-md:text-sm">
                No
              </td>
              <td className="border-b border-border p-4 text-center text-text-muted max-md:p-2 max-md:text-sm">
                ✓ Yes
              </td>
              <td className="border-b border-border p-4 text-center text-text-muted max-md:p-2 max-md:text-sm">
                ✓ Yes
              </td>
            </tr>
            <tr className="bg-surface-elevated">
              <td className="border-b border-border p-4 font-bold text-primary-text max-md:p-2 max-md:text-sm">
                Carvd Studio
              </td>
              <td className="border-b border-border p-4 text-center font-bold text-primary-text max-md:p-2 max-md:text-sm">
                $59.99 once
              </td>
              <td className="border-b border-border p-4 text-center font-bold text-success max-md:p-2 max-md:text-sm">
                ✓ Yes
              </td>
              <td className="border-b border-border p-4 text-center font-bold text-success max-md:p-2 max-md:text-sm">
                ✓ Yes
              </td>
              <td className="border-b border-border p-4 text-center font-bold text-success max-md:p-2 max-md:text-sm">
                ✓ Yes
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-6 max-md:grid-cols-1">
        <div
          className="rounded-lg border p-6"
          style={accentBoxStyle}
        >
          <h3 className="mb-2 text-xl font-bold">
            Why pay $399-680/year for general CAD?
          </h3>
          <p className="text-sm text-text-muted">
            SketchUp and Fusion 360 are powerful, but they're designed for
            architects and engineers—not woodworkers. You'll spend hours
            learning features you don't need, and you still won't get optimized
            cut lists.
          </p>
        </div>
        <div
          className="rounded-lg border p-6"
          style={accentBoxStyle}
        >
          <h3 className="mb-2 text-xl font-bold">
            Why pay $80-100/month for niche tools?
          </h3>
          <p className="text-sm text-text-muted">
            Cabinet Vision and SketchList 3D are woodworking-focused, but their
            subscription costs add up fast. In one year, you'd pay more than 10x
            the cost of Carvd Studio.
          </p>
        </div>
      </div>
    </div>
  );
}
