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

      <p className="text-muted mb-xl">
        Use Cmd on macOS or Ctrl on Windows. While typing in a measurement or
        text field, finish the entry before using canvas shortcuts.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
        <div className="rounded-lg border border-border bg-surface p-[var(--space-lg)] transition-all duration-250 hover:border-accent hover:shadow-[var(--shadow-md)]">
          <h3 className="text-xl font-bold mb-[var(--space-sm)]">
            File Operations
          </h3>
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

        <div className="rounded-lg border border-border bg-surface p-[var(--space-lg)] transition-all duration-250 hover:border-accent hover:shadow-[var(--shadow-md)]">
          <h3 className="text-xl font-bold mb-[var(--space-sm)]">
            Edit Operations
          </h3>
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

        <div className="rounded-lg border border-border bg-surface p-[var(--space-lg)] transition-all duration-250 hover:border-accent hover:shadow-[var(--shadow-md)]">
          <h3 className="text-xl font-bold mb-[var(--space-sm)]">
            Part Operations
          </h3>
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

        <div className="rounded-lg border border-border bg-surface p-[var(--space-lg)] transition-all duration-250 hover:border-accent hover:shadow-[var(--shadow-md)]">
          <h3 className="text-xl font-bold mb-[var(--space-sm)]">
            View Controls
          </h3>
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
            <div className="flex justify-between">
              <span className="text-muted">Precise Rotate</span>
              <code>Properties → Rotation</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Set Custom Angle Snap Step</span>
              <code>Properties → Rotation → Step</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Fine Drag Rotate</span>
              <code>Shift + Drag Ring</code>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-[var(--space-lg)] transition-all duration-250 hover:border-accent hover:shadow-[var(--shadow-md)]">
          <h3 className="text-xl font-bold mb-[var(--space-sm)]">Tools</h3>
          <div className="grid gap-sm text-sm">
            <div className="flex justify-between">
              <span className="text-muted">App Settings</span>
              <code>Cmd/Ctrl + ,</code>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-[var(--space-lg)] transition-all duration-250 hover:border-accent hover:shadow-[var(--shadow-md)]">
          <h3 className="text-xl font-bold mb-[var(--space-sm)]">Movement</h3>
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

      <section id="part-cuts" className="site-section p-6 mt-xl scroll-mt-28">
        <h3 className="text-2xl font-bold mb-4">Inside Part Cuts</h3>
        <p className="text-muted mb-4">
          The cut editor has its own selection and undo history. These commands
          affect the cut being edited.
        </p>
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="font-bold">Cmd/Ctrl + Z / Cmd/Ctrl + Shift + Z</dt>
            <dd className="text-muted">Undo or redo a cut edit.</dd>
          </div>
          <div>
            <dt className="font-bold">Arrow keys / Shift + Arrow</dt>
            <dd className="text-muted">
              Nudge a supported selected cut by 1/4 inch / 1 inch along its
              editable directions. These are cut-editor steps; they do not use
              the project’s grid size.
            </dd>
          </div>
          <div>
            <dt className="font-bold">F or Home</dt>
            <dd className="text-muted">Frame the part in the preview.</dd>
          </div>
          <div>
            <dt className="font-bold">Delete / Backspace</dt>
            <dd className="text-muted">Remove the selected cut.</dd>
          </div>
          <div>
            <dt className="font-bold">Escape</dt>
            <dd className="text-muted">
              Deselect the cut first. With no cut selected, request exit from
              the editor.
            </dd>
          </div>
          <div>
            <dt className="font-bold">Cmd/Ctrl + S</dt>
            <dd className="text-muted">
              Apply cuts to the project. Save the project file after returning
              to the main editor.
            </dd>
          </div>
        </dl>
      </section>
      <section className="site-section p-6 mt-xl">
        <h3 className="text-2xl font-bold mb-4">Dragging modifiers</h3>
        <p className="text-muted">
          Alt/Option + drag temporarily bypasses part snapping. Shift + drag
          constrains part movement to the ground plane. Shift + drag on a
          rotation ring instead gives fine rotation control. These modifiers
          depend on the control you are using.
        </p>
      </section>
      <DocsPrevNext />
    </section>
  );
}
