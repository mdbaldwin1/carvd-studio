import { Move, MapPin, Ruler } from "lucide-react";
import SEO from "../../components/SEO";
import { createBreadcrumbSchema } from "../../utils/jsonLd";
import DocsPrevNext from "./DocsPrevNext";

export default function SnappingPage() {
  return (
    <section>
      <SEO
        title="Snapping & Alignment - Docs"
        description="Position parts precisely with grid snapping, edge-to-edge snapping, center alignment, and exact coordinate entry."
        path="/docs/snapping"
        jsonLd={createBreadcrumbSchema([
          { name: "Docs", path: "/docs" },
          { name: "Snapping & Alignment", path: "/docs/snapping" },
        ])}
      />
      <h2 className="text-4xl font-bold mb-xl">Snapping & Alignment</h2>

      <p className="text-muted mb-xl">
        Carvd Studio includes powerful snapping tools to help you position parts
        precisely. Parts automatically snap to grid points, edges, and other
        parts.
      </p>

      <div className="site-section p-[var(--space-md)] mb-xl">
        <img
          src="/screenshots/docs-snap-lines.png"
          alt="Snapping alignment lines in the 3D editor"
          className="w-full rounded-xl border border-border shadow-lg"
          loading="lazy"
        />
      </div>

      <div className="grid gap-xl">
        <div className="site-section p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
            <Move size={20} /> Grid Snapping
          </h3>
          <div className="grid gap-md text-sm">
            <div>
              <p className="font-bold mb-xs">Grid Size</p>
              <p className="text-muted">
                Parts snap to a configurable grid. Default: 1/4" (imperial) or
                5mm (metric). Change in Project Settings.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Toggle Grid Snap</p>
              <p className="text-muted">
                Hold <code>Shift</code> while dragging to temporarily disable
                grid snapping for free placement.
              </p>
            </div>
          </div>
        </div>

        <div className="site-section p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
            <MapPin size={20} /> Part-to-Part Snapping
          </h3>
          <div className="grid gap-md text-sm">
            <div>
              <p className="font-bold mb-xs">Edge Snapping</p>
              <p className="text-muted">
                Parts automatically snap to compatible faces and edges of
                neighboring parts, including rotated parts that are not aligned
                to world axes.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Center Snapping</p>
              <p className="text-muted">
                Parts can snap center-to-center in one axis or two axes while
                staying face-latched, so you can slide across a surface and
                still get deterministic alignment.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Surface Anchors</p>
              <p className="text-muted">
                Surface anchor snaps include centerline, midline, and
                quarterline alignment on compatible faces. This is ideal for
                quickly finding centered or 25%/75% placements on larger panels.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Fractional Face Anchors</p>
              <p className="text-muted">
                Fractional anchors evaluate 0/25/50/75/100 face positions and
                support both one-axis and two-axis combinations for precise
                layout work.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Feature Snapping</p>
              <p className="text-muted">
                In addition to face snap, Carvd can snap edge-to-edge and
                vertex-to-face for precise joinery placement when parts are
                tilted or rotated.
              </p>
            </div>
          </div>
        </div>

        <div className="site-section p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
            <Ruler size={20} /> Precision Positioning
          </h3>
          <div className="grid gap-md text-sm">
            <div>
              <p className="font-bold mb-xs">Exact Coordinates</p>
              <p className="text-muted">
                Enter exact X, Y, Z coordinates in the properties panel for
                pixel-perfect positioning.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Arrow Keys</p>
              <p className="text-muted">
                Use arrow keys to nudge selected parts by one grid unit. Hold{" "}
                <code>Shift</code> to nudge in fixed 1-inch steps.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Camera-Aware Drag Planes</p>
              <p className="text-muted">
                For rotated parts, drag movement now follows the most
                camera-facing local plane, which keeps movement and snapping
                more predictable from different viewing angles.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Snap Presets</p>
              <p className="text-muted">
                App Settings include snapping presets:
                <strong> Simple</strong>, <strong>Precision</strong>, and
                <strong> Layout</strong>, plus toggles for surface anchors,
                fractional anchors, and candidate indicators.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Real-time Measurements</p>
              <p className="text-muted">
                The 3D view shows measurements and distances as you move parts,
                so you can see exact positions.
              </p>
            </div>
          </div>
        </div>
      </div>

      <DocsPrevNext />
    </section>
  );
}
