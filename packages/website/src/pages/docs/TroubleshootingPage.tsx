import DocsPrevNext from "./DocsPrevNext";

export default function TroubleshootingPage() {
  return (
    <section>
      <h2 className="text-4xl font-bold mb-xl">Troubleshooting</h2>

      <div className="grid gap-xl">
        <div className="card">
          <h3 className="card-title">License Activation Issues</h3>
          <p className="card-description mb-md">
            <strong>Problem:</strong> License key not accepted or activation
            fails.
          </p>
          <ul className="text-muted text-sm grid gap-sm">
            <li>
              • Make sure you're connected to the internet during activation
            </li>
            <li>
              • Check that you copied the entire license key (no extra spaces)
            </li>
            <li>• Verify the key in your purchase confirmation email</li>
            <li>
              • If you've used all 3 device activations, deactivate one first
              (Settings &rarr; License)
            </li>
            <li>
              • Contact support if issues persist: support@carvd-studio.com
            </li>
          </ul>
        </div>

        <div className="card">
          <h3 className="card-title">App Won't Launch</h3>
          <p className="card-description mb-md">
            <strong>Problem:</strong> Application doesn't open or crashes
            immediately.
          </p>
          <ul className="text-muted text-sm grid gap-sm">
            <li>
              • <strong>macOS:</strong> Right-click the app and select "Open" to
              bypass Gatekeeper
            </li>
            <li>
              • <strong>Windows:</strong> Run as administrator or check
              antivirus settings
            </li>
            <li>• Ensure you meet the minimum system requirements</li>
            <li>• Try restarting your computer</li>
            <li>• Reinstall the application from a fresh download</li>
          </ul>
        </div>

        <div className="card">
          <h3 className="card-title">Recovering Lost Work</h3>
          <p className="card-description mb-md">
            <strong>Problem:</strong> Application crashed or closed
            unexpectedly.
          </p>
          <ul className="text-muted text-sm grid gap-sm">
            <li>• Carvd Studio auto-saves your work periodically</li>
            <li>
              • On next launch, you'll be prompted to recover unsaved changes
            </li>
            <li>• Click "Recover" to restore your last auto-save</li>
            <li>
              • For extra safety, save your work manually (
              <code>Cmd/Ctrl + S</code>) regularly
            </li>
          </ul>
        </div>

        <div className="card">
          <h3 className="card-title">Performance Issues</h3>
          <p className="card-description mb-md">
            <strong>Problem:</strong> Application running slowly or lagging.
          </p>
          <ul className="text-muted text-sm grid gap-sm">
            <li>• Close other graphics-intensive applications</li>
            <li>
              • For very large projects (100+ parts), group components to reduce
              rendering load
            </li>
            <li>• Check that you have at least 4GB RAM available</li>
            <li>• Update your graphics drivers to the latest version</li>
            <li>
              • Restart the application if it's been running for a long time
            </li>
          </ul>
        </div>

        <div className="card">
          <h3 className="card-title">Cut List Generation Errors</h3>
          <p className="card-description mb-md">
            <strong>Problem:</strong> Cut list shows warnings or won't generate.
          </p>
          <ul className="text-muted text-sm grid gap-sm">
            <li>
              • <strong>"Part exceeds stock dimensions":</strong> The part is
              larger than the stock. Use larger stock or resize the part.
            </li>
            <li>
              • <strong>"No stock assigned":</strong> Assign a stock material in
              the part properties panel.
            </li>
            <li>
              • <strong>"Grain direction mismatch":</strong> Part orientation
              conflicts with stock grain. Rotate the part or adjust grain
              settings.
            </li>
            <li>
              • <strong>"Thickness mismatch":</strong> Part thickness doesn't
              match stock. Assign correct stock or adjust thickness.
            </li>
          </ul>
        </div>

        <div className="card">
          <h3 className="card-title">File Won't Open</h3>
          <p className="card-description mb-md">
            <strong>Problem:</strong> Project file (.carvd) won't open or shows
            errors.
          </p>
          <ul className="text-muted text-sm grid gap-sm">
            <li>• Make sure you're using the latest version of Carvd Studio</li>
            <li>
              • Try opening the file from File &rarr; Open (not double-clicking)
            </li>
            <li>
              • Check if the file was created with a newer version of the
              software
            </li>
            <li>
              • <strong>If the file is corrupted:</strong> Carvd Studio will
              detect the issue and offer to attempt automatic recovery. The
              recovery process will show you what data can be salvaged and let
              you accept or reject the recovered project.
            </li>
            <li>
              • If automatic recovery fails, check for auto-recovery backups in
              your auto-save location
            </li>
            <li>
              • Contact support with the file for manual recovery assistance
            </li>
          </ul>
        </div>

        <div className="card">
          <h3 className="card-title">Missing or Moved File</h3>
          <p className="card-description mb-md">
            <strong>Problem:</strong> A project in your recent or favorites list
            shows "Click to locate" or a warning icon.
          </p>
          <ul className="text-muted text-sm grid gap-sm">
            <li>
              • This happens when a project file has been moved, renamed, or
              deleted from its original location
            </li>
            <li>
              • <strong>To relocate:</strong> Click on the missing file in your
              recent projects or favorites list. A file browser will open asking
              you to locate the file in its new location.
            </li>
            <li>
              • Once found, Carvd Studio updates your recent projects list with
              the new location automatically
            </li>
            <li>
              • If the file was deleted, you can remove it from your recent list
              using the trash icon
            </li>
          </ul>
        </div>
      </div>

      <DocsPrevNext />
    </section>
  );
}
