import SEO from "../../components/SEO";
import { createBreadcrumbSchema } from "../../utils/jsonLd";
import DocsPrevNext from "./DocsPrevNext";

export default function SettingsPage() {
  return (
    <section>
      <SEO
        title="Settings & Preferences - Docs"
        description="Configure app settings, project settings, backup and sync, units, cut list preferences, and license management."
        path="/docs/settings"
        jsonLd={createBreadcrumbSchema([
          { name: "Docs", path: "/docs" },
          { name: "Settings & Preferences", path: "/docs/settings" },
        ])}
      />
      <h2 className="text-4xl font-bold mb-xl">Settings & Preferences</h2>

      <div className="grid gap-xl">
        <div id="app-settings" className="site-section p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md">App Settings</h3>
          <p className="text-muted mb-md text-sm">
            Access via the gear icon or <code>Cmd/Ctrl + ,</code>
          </p>
          <p className="text-muted mb-md text-sm">
            Organized into three tabs: <strong>General</strong>,{" "}
            <strong>New Project Defaults</strong>, and{" "}
            <strong>Data &amp; License</strong>.
          </p>
          <div className="grid gap-md text-sm">
            <div>
              <p className="font-bold mb-xs">Appearance</p>
              <p className="text-muted">
                Theme, hotkey hints, and 3D lighting mode
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Behavior</p>
              <p className="text-muted">
                Auto-save toggle and confirm-before-delete preference
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Snapping</p>
              <p className="text-muted">
                Snap sensitivity and snap-to-grid defaults
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">New Project Defaults</p>
              <p className="text-muted">
                Default units, grid size, and stock constraints for newly
                created projects
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Data Management</p>
              <p className="text-muted">
                Export and import your app-level backup (templates, assemblies,
                stocks, and colors)
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">License</p>
              <p className="text-muted">
                View status and activate/deactivate your license
              </p>
            </div>
          </div>
        </div>

        <div id="backup-sync" className="site-section p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md">Backup & Sync</h3>
          <p className="text-muted mb-md text-sm">
            Access via Settings → Backup & Sync
          </p>
          <div className="grid gap-md text-sm">
            <div>
              <p className="font-bold mb-xs">Export App State</p>
              <p className="text-muted">
                Save your templates, assemblies, stock library, and custom
                colors to a <code>.carvd-backup</code> file. Use this to sync
                your library between computers or create a backup before
                reinstalling.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Import App State</p>
              <p className="text-muted">
                Restore from a backup file. Choose what to import (templates,
                assemblies, stocks, colors) and how to handle duplicates — keep
                your existing items or replace them with the backup.
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">What's Included</p>
              <p className="text-muted">
                Backups include your custom templates, user-created assemblies,
                custom stock materials, and saved colors. Built-in items
                (default stocks and assemblies) are not exported since they're
                always available.
              </p>
            </div>
          </div>
        </div>

        <div id="project-settings" className="site-section p-[var(--space-xl)]">
          <h3 className="text-2xl font-bold mb-md">Project Settings</h3>
          <p className="text-muted mb-md text-sm">
            Access via File &rarr; Project Settings
          </p>
          <p className="text-muted mb-md text-sm">
            Organized into <strong>Details</strong> (name, notes, favorite) and{" "}
            <strong>Preferences</strong> (units, cut list, constraints).
          </p>
          <p className="text-muted mb-md text-sm">
            Use the star icon in the Project Settings header to add/remove the
            current project from favorites.
          </p>
          <div className="grid gap-md text-sm">
            <div>
              <p className="font-bold mb-xs">Project Name</p>
              <p className="text-muted">
                The name shown in the title bar and file list
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Units</p>
              <p className="text-muted">Imperial or Metric for this project</p>
            </div>
            <div>
              <p className="font-bold mb-xs">Grid Snap Size</p>
              <p className="text-muted">Snap grid increment for this project</p>
            </div>
            <div>
              <p className="font-bold mb-xs">Kerf Width</p>
              <p className="text-muted">
                Saw blade width for cut list calculations (default: 1/8")
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Overage Factor</p>
              <p className="text-muted">
                Extra material padding percentage (default: 10%)
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Project Notes</p>
              <p className="text-muted">
                Free-form notes field for project documentation
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Stock Constraints</p>
              <p className="text-muted">
                Toggle dimension, grain, color sync, and overlap constraints
              </p>
            </div>
          </div>
        </div>
      </div>

      <DocsPrevNext />
    </section>
  );
}
