import SEO from "../../components/SEO";
import { createBreadcrumbSchema } from "../../utils/jsonLd";
import DocsPrevNext from "./DocsPrevNext";

export default function InterfacePage() {
  return (
    <section>
      <SEO
        title="Interface Overview - Docs"
        description="Learn the Carvd Studio interface: 3D viewport, parts sidebar, properties panel, camera controls, and selection tools."
        path="/docs/interface"
        jsonLd={createBreadcrumbSchema([
          { name: "Docs", path: "/docs" },
          { name: "Interface Overview", path: "/docs/interface" },
        ])}
      />
      <h2 className="text-4xl font-bold mb-xl">Interface Overview</h2>

      <div className="grid gap-xl mb-xl">
        <div className="accent-box">
          <h3 className="text-2xl font-bold mb-md">Main Workspace</h3>
          <div className="grid gap-md text-sm">
            <p>
              <strong>3D Viewport</strong> — The central area where you design.
              Rotate, zoom, and pan to view your project from any angle.
            </p>
            <p>
              <strong>Parts Sidebar</strong> — Left panel showing all your parts
              organized in a hierarchical list. Drag to reorder, click to
              select.
            </p>
            <p>
              <strong>Properties Panel</strong> — Right panel showing
              dimensions, position, stock material, and other settings for the
              selected part.
            </p>
            <p>
              <strong>Toolbar</strong> — Top bar with common actions: add part,
              undo/redo, view controls, and project settings.
            </p>
          </div>
        </div>

        <div className="accent-box">
          <h3 className="text-2xl font-bold mb-md">Camera Controls</h3>
          <div className="grid grid-cols-2 gap-md text-sm">
            <div>
              <p className="font-bold mb-xs">Orbit (Rotate)</p>
              <p className="text-muted">Left-click + drag on the 3D view</p>
            </div>
            <div>
              <p className="font-bold mb-xs">Pan</p>
              <p className="text-muted">
                Right-click + drag, or middle-click + drag
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Zoom</p>
              <p className="text-muted">Scroll wheel up/down</p>
            </div>
            <div>
              <p className="font-bold mb-xs">Reset View</p>
              <p className="text-muted">
                Press <code>R</code> to reset to the default camera angle
              </p>
            </div>
          </div>
        </div>

        <div className="accent-box">
          <h3 className="text-2xl font-bold mb-md">Selection</h3>
          <div className="grid gap-md text-sm">
            <div>
              <p className="font-bold mb-xs">Select Part</p>
              <p className="text-muted">
                Click a part in the 3D view or in the sidebar
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Multi-Select</p>
              <p className="text-muted">
                Hold <code>Cmd/Ctrl</code> and click to add/remove from
                selection
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Select All</p>
              <p className="text-muted">
                Press <code>Cmd/Ctrl + A</code> to select all parts
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Deselect</p>
              <p className="text-muted">
                Press <code>Escape</code> or click empty space
              </p>
            </div>
          </div>
        </div>
      </div>

      <DocsPrevNext />
    </section>
  );
}
