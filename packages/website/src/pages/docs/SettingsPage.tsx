import SEO from "../../components/SEO";
import { createBreadcrumbSchema } from "../../utils/jsonLd";
import DocsPrevNext from "./DocsPrevNext";

export default function SettingsPage() {
  return (
    <section>
      <SEO
        title="Settings & Preferences - Docs"
        description="Configure app settings, project settings, backup and sync, units, grid size, auto-save, and license management."
        path="/docs/settings"
        jsonLd={createBreadcrumbSchema([
          { name: "Docs", path: "/docs" },
          { name: "Settings & Preferences", path: "/docs/settings" },
        ])}
      />
      <h2 className="text-4xl font-bold mb-xl">Settings & Preferences</h2>

      <div className="grid gap-xl">
        <div id="app-settings" className="accent-box">
          <h3 className="text-2xl font-bold mb-md">App Settings</h3>
          <p className="text-muted mb-md text-sm">
            Access via the gear icon or <code>Cmd/Ctrl + ,</code>
          </p>
          <div className="grid gap-md text-sm">
            <div>
              <p className="font-bold mb-xs">Default Units</p>
              <p className="text-muted">Imperial or Metric for new projects</p>
            </div>
            <div>
              <p className="font-bold mb-xs">Default Grid Size</p>
              <p className="text-muted">
                Snap grid for new projects (1/4", 1/2", 1", etc.)
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Auto-Save Interval</p>
              <p className="text-muted">
                How often to auto-save (1, 2, 5, or 10 minutes)
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Show Grid</p>
              <p className="text-muted">Toggle the 3D grid on/off by default</p>
            </div>
            <div>
              <p className="font-bold mb-xs">License Management</p>
              <p className="text-muted">
                Activate, deactivate, or view your license status
              </p>
            </div>
            <div>
              <p className="font-bold mb-xs">Check for Updates</p>
              <p className="text-muted">
                Manually check for new versions or enable automatic update
                checking
              </p>
            </div>
          </div>
        </div>

        <div id="backup-sync" className="accent-box">
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

        <div id="project-settings" className="accent-box">
          <h3 className="text-2xl font-bold mb-md">Project Settings</h3>
          <p className="text-muted mb-md text-sm">
            Access via File &rarr; Project Settings
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
              <p className="font-bold mb-xs">Grid Size</p>
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
                Enable/disable dimension, grain, color, and overlap constraints
              </p>
            </div>
          </div>
        </div>
      </div>

      <DocsPrevNext />
    </section>
  );
}
