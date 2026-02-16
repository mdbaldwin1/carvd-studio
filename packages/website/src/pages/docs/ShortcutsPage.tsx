import DocsPrevNext from "./DocsPrevNext";

export default function ShortcutsPage() {
  return (
    <section>
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
              <code>Cmd/Ctrl + D</code>
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
              <code>N</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Create Group</span>
              <code>G</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Rename</span>
              <code>F2</code>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">View Controls</h3>
          <div className="grid gap-sm text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Reset Camera</span>
              <code>R</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Toggle Grid</span>
              <code>Shift + G</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Focus Selected</span>
              <code>F</code>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Tools</h3>
          <div className="grid gap-sm text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Cut List</span>
              <code>Cmd/Ctrl + L</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Stock Library</span>
              <code>Cmd/Ctrl + M</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Project Settings</span>
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
              <span className="text-muted">Large Nudge</span>
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
