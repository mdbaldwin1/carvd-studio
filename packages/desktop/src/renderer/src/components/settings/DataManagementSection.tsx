import { Download, Upload } from 'lucide-react';
import { HelpTooltip } from '../common/HelpTooltip';

interface DataManagementSectionProps {
  isExporting: boolean;
  onExport: () => void;
  onImport: () => void;
}

export function DataManagementSection({ isExporting, onExport, onImport }: DataManagementSectionProps) {
  return (
    <div className="settings-section">
      <h3>Data Management</h3>
      <div className="settings-row settings-row-data-management">
        <div className="settings-label-block">
          <div className="label-with-help">
            <label>Backup & Sync</label>
            <HelpTooltip
              text="Export your templates, assemblies, and stock library to sync with another machine or create a backup."
              docsSection="backup-sync"
            />
          </div>
        </div>
        <div className="settings-actions">
          <button className="btn btn-sm btn-outlined btn-secondary" onClick={onExport} disabled={isExporting}>
            <Download size={14} />
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
          <button className="btn btn-sm btn-outlined btn-secondary" onClick={onImport}>
            <Upload size={14} />
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
