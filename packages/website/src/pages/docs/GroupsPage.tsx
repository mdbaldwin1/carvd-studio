import { FolderOpen, Pencil, MousePointer } from "lucide-react";
import SEO from "../../components/SEO";
import { createBreadcrumbSchema } from "../../utils/jsonLd";
import DocsPrevNext from "./DocsPrevNext";

export default function GroupsPage() {
  return (
    <section>
      <SEO
        title="Groups & Organization - Docs"
        description="Organize parts into groups and nested groups. Create, rename, merge, and dissolve groups for complex furniture projects."
        path="/docs/groups"
        jsonLd={createBreadcrumbSchema([
          { name: "Docs", path: "/docs" },
          { name: "Groups & Organization", path: "/docs/groups" },
        ])}
      />
      <h2 className="text-4xl font-bold mb-xl">Groups & Organization</h2>

      <p className="text-muted mb-xl">
        Groups help you organize complex projects by bundling related parts
        together. Think of them as folders for your furniture components.
      </p>

      <div className="grid gap-xl">
        <div className="site-section p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md">
            <FolderOpen size={20} className="inline-block" /> Creating Groups
          </h3>
          <div className="grid gap-md text-sm">
            <div>
              <p className="font-bold mb-xs">From Selection</p>
              <p className="text-muted">
                Select multiple parts and press <code>G</code> or right-click →
                "Create Group". The group is named automatically (you can rename
                it).
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Empty Group</p>
              <p className="text-muted">
                Create an empty group and drag parts into it from the sidebar
                list.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Nested Groups</p>
              <p className="text-muted">
                Groups can contain other groups for deep organization (e.g.,
                "Cabinet → Drawer 1 → Front, Back, Sides").
              </p>
            </div>
          </div>
        </div>

        <div className="site-section p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md">
            <Pencil size={20} className="inline-block" /> Editing Groups
          </h3>
          <div className="grid gap-md text-sm">
            <div>
              <p className="font-bold mb-xs">Rename</p>
              <p className="text-muted">
                Double-click the group name in the sidebar to rename it
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Color</p>
              <p className="text-muted">
                Set a group color that applies to all parts inside (parts can
                still have individual overrides)
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Collapse / Expand</p>
              <p className="text-muted">
                Click the arrow to toggle visibility in the sidebar. Collapsed
                groups still appear in the 3D view.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Add / Remove Parts</p>
              <p className="text-muted">
                Drag parts in/out of groups in the sidebar, or right-click a
                part → "Move to Group"
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Dissolve Group</p>
              <p className="text-muted">
                Right-click a group → "Ungroup" to release all parts back to the
                top level
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Merge Groups</p>
              <p className="text-muted">
                Select multiple groups and merge them into one
              </p>
            </div>
          </div>
        </div>

        <div className="site-section p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md">Group Properties Panel</h3>
          <p className="text-sm text-muted mb-md">
            When a group is selected, the Properties panel includes the same
            core actions available from context menus and shortcuts.
          </p>
          <div className="grid gap-md text-sm">
            <div>
              <p className="font-bold mb-xs">Quick Actions</p>
              <p className="text-muted">
                Center view on selection, save group as assembly, and common
                group management actions are available directly in the panel.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Membership Actions</p>
              <p className="text-muted">
                Add selected parts to a group, remove items from groups, and
                merge/ungroup without leaving the panel.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Advanced Controls</p>
              <p className="text-muted">
                Less-common options are grouped under collapsed advanced
                sections to keep the default editing flow cleaner.
              </p>
            </div>
          </div>
        </div>

        <div className="site-section p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md">
            <MousePointer size={20} className="inline-block" /> 3D Selection &
            Groups
          </h3>
          <div className="grid gap-md text-sm">
            <p>
              <strong>Click a grouped part</strong> — Selects the individual
              part within the group
            </p>
            <p>
              <strong>Click the group in the sidebar</strong> — Selects all
              parts in the group
            </p>
            <p>
              <strong>Move a group</strong> — Select all group members, then
              drag or use arrow keys. All parts move together.
            </p>
            <p>
              <strong>Drill into nested groups</strong> — Double-click to step
              into child groups for focused editing, then double-click
              background to step back out one level at a time.
            </p>
          </div>
        </div>

        <div className="site-section p-[var(--space-xl)]">
          <p className="text-lg font-bold mb-sm">
            Pro Tip: Use Groups for Repeated Components
          </p>
          <p className="text-sm text-muted">
            If your project has identical sub-assemblies (like 4 matching
            drawers), create one group, perfect it, then duplicate the entire
            group. All dimensions and stock assignments are preserved.
          </p>
        </div>
      </div>

      <DocsPrevNext />
    </section>
  );
}
