import SEO from "../../components/SEO";
import { createBreadcrumbSchema } from "../../utils/jsonLd";
import DocsPrevNext from "./DocsPrevNext";

export default function ShortcutsPage() {
  return (
    <section>
      <SEO
        title="Keyboard Shortcuts - Docs"
        description="Complete keyboard shortcut reference for Carvd Studio. File, edit, part, view, and movement shortcuts."
        path="/docs/shortcuts"
        jsonLd={createBreadcrumbSchema([
          { name: "Docs", path: "/docs" },
          { name: "Keyboard Shortcuts", path: "/docs/shortcuts" },
        ])}
      />
      <h2 className="text-4xl font-bold mb-xl">Keyboard Shortcuts</h2>

      <div className="grid grid-cols-2 gap-xl">
        <div className="card">
          <h3 className="card-title">File Operations</h3>
          <div className="grid gap-sm text-sm">
            <div className="flex justify-between">
              <span className="text-muted">New Project</span>
              <code>Cmd/Ctrl + N</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Open Project</span>
              <code>Cmd/Ctrl + O</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Save</span>
              <code>Cmd/Ctrl + S</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Save As</span>
              <code>Cmd/Ctrl + Shift + S</code>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Edit Operations</h3>
          <div className="grid gap-sm text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Undo</span>
              <code>Cmd/Ctrl + Z</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Redo</span>
              <code>Cmd/Ctrl + Shift + Z</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Copy</span>
              <code>Cmd/Ctrl + C</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Paste</span>
              <code>Cmd/Ctrl + V</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Duplicate</span>
              <code>Shift + D</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Delete</span>
              <code>Delete / Backspace</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Select All</span>
              <code>Cmd/Ctrl + A</code>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Part Operations</h3>
          <div className="grid gap-sm text-sm">
            <div className="flex justify-between">
              <span className="text-muted">New Part</span>
              <code>P</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Create Group</span>
              <code>G</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Ungroup</span>
              <code>Cmd/Ctrl + Shift + G</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Toggle References</span>
              <code>R</code>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">View Controls</h3>
          <div className="grid gap-sm text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Reset Camera</span>
              <code>Home</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Focus Selected</span>
              <code>F</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Rotate 90°</span>
              <code>X / Y / Z</code>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Tools</h3>
          <div className="grid gap-sm text-sm">
            <div className="flex justify-between">
              <span className="text-muted">App Settings</span>
              <code>Cmd/Ctrl + ,</code>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Movement</h3>
          <div className="grid gap-sm text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Nudge</span>
              <code>Arrow Keys</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Nudge 1 Inch</span>
              <code>Shift + Arrow</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Deselect</span>
              <code>Escape</code>
            </div>
          </div>
        </div>
      </div>

      <DocsPrevNext />
    </section>
  );
}
