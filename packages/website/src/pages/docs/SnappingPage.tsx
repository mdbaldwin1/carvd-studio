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

      <div className="grid gap-xl">
        <div className="accent-box">
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

        <div className="accent-box">
          <h3 className="text-2xl font-bold mb-md flex items-center gap-md">
            <MapPin size={20} /> Part-to-Part Snapping
          </h3>
          <div className="grid gap-md text-sm">
            <div>
              <p className="font-bold mb-xs">Edge Snapping</p>
              <p className="text-muted">
                Parts automatically snap to the edges and faces of neighboring
                parts. Move a shelf near a side panel and it snaps flush.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Center Snapping</p>
              <p className="text-muted">
                Parts snap to the center of other parts for easy alignment.
                Green guide lines show alignment points.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Corner Snapping</p>
              <p className="text-muted">
                Snap to corners of other parts for precise joint positioning.
              </p>
            </div>
          </div>
        </div>

        <div className="accent-box">
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
