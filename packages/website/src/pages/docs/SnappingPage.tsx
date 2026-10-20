import { Link } from "react-router-dom";
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
              <p className="font-bold mb-xs">Live Grid Snapping</p>
              <p className="text-muted">
                Enable Live Grid Snapping in App Settings to move in grid
                increments throughout a drag. With it off, grid placement is
                resolved on release. The toolbar’s Grid button shows or hides
                the grid; it is not the part-snapping switch.
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
                precise placement.
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

      <section
        id="drag-controls"
        className="site-section p-6 mt-xl scroll-mt-28"
      >
        <h3 className="text-2xl font-bold mb-4">Choose how a drag moves</h3>
        <ul className="list-disc pl-5 space-y-3 text-muted">
          <li>
            <strong>Snap in the toolbar:</strong> enables or disables
            part-to-part snapping.
          </li>
          <li>
            <strong>Alt/Option + drag:</strong> temporarily bypasses part
            snapping. Grid behavior is controlled separately by Live Grid
            Snapping.
          </li>
          <li>
            <strong>Shift + drag:</strong> constrains movement to the ground
            plane (X/Z), useful for sliding a part across the bench without
            lifting it.
          </li>
          <li>
            <strong>Ordinary drag:</strong> follows the camera-facing drag
            plane; for a rotated individual part, that plane follows its local
            orientation.
          </li>
        </ul>
        <p className="text-muted mt-4">
          Release the mouse to finish the move, then inspect the resulting
          position. When an exact final coordinate matters, enter it in
          Properties. Changing the camera view can make the direction you need
          easier to reach without changing the part’s rotation.
        </p>
      </section>
      <section
        id="joint-alignment"
        className="site-section p-6 mt-xl scroll-mt-28"
      >
        <h3 className="text-2xl font-bold mb-4">
          Joint alignment and rotated parts
        </h3>
        <p className="text-muted mb-4">
          Enable Snap when offering a cut part to its mate. Compatible tenons,
          housings, round inserts, and cut end faces can provide more useful
          alignment than the original blank’s outside edges. A snap places
          geometry; it does not make a socket wider or change a tenon’s angle.
        </p>
        <p className="text-muted mb-4">
          For a deliberate assembly, select two parts and use{" "}
          <Link
            className="text-text underline underline-offset-4 decoration-primary"
            to="/docs/joinery#assembly-placement"
          >
            Bring pieces together…
          </Link>
          . Choose the actual shoulder and opening, inspect registration and
          insertion, then place. This is especially helpful when several
          possible mating features are close together.
        </p>
        <p className="text-muted mb-4">
          Joint references follow the boards when they rotate, including
          non-right-angle and compound orientations. Rotate the complete
          selection or group to preserve an assembled joint. If only one member
          is tilted, first align its meeting face with the receiver: translation
          snapping cannot turn a crooked rectangular tenon into the correct
          orientation.
        </p>
        <h4 className="text-xl font-bold mb-3">A repeatable alignment check</h4>
        <ol className="list-decimal pl-5 space-y-3 text-muted mb-4">
          <li>
            Inspect the cuts separately. Compare the entering cross-section with
            the opening and check available depth.
          </li>
          <li>
            Choose the moving and receiving references in Bring pieces together.
            Use the shoulder for a tenon or tongue, and the opening for its
            socket.
          </li>
          <li>
            Set registration and insertion. Inspect the preview before placing,
            then use a second camera angle and Ghost or Wire to inspect
            concealed contact.
          </li>
          <li>
            Select every member of the completed joint before rotating it.
            Include loose pins, dowels, keys, and splines.
          </li>
          <li>
            After rotation, inspect the same shoulders and openings again.
            Rotating one member independently changes the joint; orbiting the
            camera only changes your view.
          </li>
        </ol>
        <p className="text-muted mb-4">
          If a drag keeps finding the wrong nearby feature, use explicit
          assembly references. If it catches an outside edge instead of seating
          a joint, check that the intended cut is enabled and that the parts
          actually have compatible orientations and dimensions. Increasing snap
          sensitivity cannot correct those geometry differences.
        </p>
        <p className="text-muted">
          Inspect the joint from two directions, and use Ghost or Wire for
          concealed surfaces. If it will not seat, check{" "}
          <Link
            className="text-text underline underline-offset-4 decoration-primary"
            to="/docs/joinery#troubleshooting"
          >
            fit and alignment troubleshooting
          </Link>
          . Use{" "}
          <Link
            className="text-text underline underline-offset-4 decoration-primary"
            to="/docs/parts"
          >
            part rotation controls
          </Link>{" "}
          for exact angles.
        </p>
      </section>
      <DocsPrevNext />
    </section>
  );
}
