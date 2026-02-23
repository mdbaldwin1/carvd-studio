import { Download, Upload } from 'lucide-react';
import { HelpTooltip } from '../common/HelpTooltip';
import { Button } from '@renderer/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';

interface DataManagementSectionProps {
  isExporting: boolean;
  onExport: () => void;
  onImport: () => void;
}

export function DataManagementSection({ isExporting, onExport, onImport }: DataManagementSectionProps) {
  return (
    <Card className="settings-section mb-6 last:mb-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">Data Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="settings-row flex flex-col items-start gap-3 mb-3">
          <div className="flex flex-col gap-1">
            <div className="inline-flex items-center gap-1">
              <label className="text-[13px] text-text">Backup & Sync</label>
              <HelpTooltip
                text="Export your templates, assemblies, and stock library to sync with another machine or create a backup."
                docsSection="backup-sync"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onExport} disabled={isExporting}>
              <Download size={14} />
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
            <Button variant="outline" size="sm" onClick={onImport}>
              <Upload size={14} />
              Import
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
