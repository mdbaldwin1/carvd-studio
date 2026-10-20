import { useState } from 'react';
import { Button } from '@renderer/components/ui/button';
import type { RouterToolDefinition } from '@renderer/types';
import { useRouterToolLibrary } from '@renderer/hooks/useRouterToolLibrary';
import { cloneRouterToolDefinition, parseRouterToolFile, stringifyRouterToolFile } from '@renderer/utils/routerTools';
import { RouterToolDialog } from './RouterToolDialog';
import {
  describeRouterImportError,
  ImportDiagnostic,
  RouterInterchangeHelpDialog
} from './RouterInterchangeHelpDialog';
import { useRouterProfileLibrary } from '@renderer/hooks/useRouterProfileLibrary';
import { RouterCatalogExportDialog } from './RouterCatalogExportDialog';

export function RouterToolsTab() {
  const { tools, isLoading, addTool, updateTool, deleteTool } = useRouterToolLibrary();
  const { profiles } = useRouterProfileLibrary();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RouterToolDefinition>();
  const [helpOpen, setHelpOpen] = useState(false);
  const [importDiagnostic, setImportDiagnostic] = useState<ReturnType<typeof describeRouterImportError>>();
  const [exportOpen, setExportOpen] = useState(false);
  const newId = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `router-tool-${Date.now()}`;
  const duplicate = async (source: RouterToolDefinition) => {
    const copy = cloneRouterToolDefinition(source);
    copy.id = newId();
    copy.name += ' Copy';
    copy.revision = undefined;
    await addTool(copy);
  };
  const importTool = async () => {
    const choice = await window.electronAPI.showOpenDialog({
      title: 'Import Router Tool',
      properties: ['openFile'],
      filters: [{ name: 'Carvd router tool', extensions: ['carvd-tool'] }]
    });
    if (choice.canceled || !choice.filePaths[0]) return;
    const path = choice.filePaths[0];
    const fileName = path.split(/[\\/]/).pop() ?? path;
    try {
      const tool = parseRouterToolFile(await window.electronAPI.readFile(path));
      tool.id = newId();
      tool.revision = undefined;
      await addTool(tool);
      setImportDiagnostic(undefined);
    } catch (error) {
      setImportDiagnostic(describeRouterImportError(error, fileName));
    }
  };
  const exportTool = async (tool: RouterToolDefinition) => {
    const choice = await window.electronAPI.showSaveDialog({
      title: 'Export Router Tool',
      defaultPath: `${tool.name}.carvd-tool`,
      filters: [{ name: 'Carvd router tool', extensions: ['carvd-tool'] }]
    });
    if (!choice.canceled && choice.filePath)
      await window.electronAPI.writeFile(choice.filePath, stringifyRouterToolFile(tool));
  };
  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          onClick={() => {
            setEditing(undefined);
            setOpen(true);
          }}
        >
          Create Router Tool…
        </Button>
        <Button variant="outline" onClick={importTool}>
          Import Tool…
        </Button>
        <Button variant="outline" onClick={() => setExportOpen(true)}>
          Export Catalog…
        </Button>
        <Button variant="ghost" onClick={() => setHelpOpen(true)}>
          Formats &amp; examples
        </Button>
      </div>
      {importDiagnostic && (
        <div className="mb-4">
          <ImportDiagnostic diagnostic={importDiagnostic} />
        </div>
      )}
      {isLoading ? (
        <p>Loading router tools…</p>
      ) : tools.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center">
          <p className="font-medium">No physical router tools saved</p>
          <p className="text-sm text-text-muted">Profiles describe geometry; tools record the cutter in your shop.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <article key={tool.id} className="rounded-md border border-border p-3">
              <h3 className="font-semibold">{tool.name}</h3>
              <p className="text-xs text-text-muted">
                {tool.manufacturer ? `${tool.manufacturer} ${tool.sku ?? ''}` : 'Generic'} · {tool.profileFamily}
              </p>
              <dl className="mt-2 text-xs">
                <dt>Shank / cutter</dt>
                <dd>
                  {tool.shankDiameter}″ / {tool.cutterDiameter}″
                </dd>
                <dt>Cutting height</dt>
                <dd>{tool.cuttingHeight}″</dd>
              </dl>
              {tool.producedProfiles?.length ? (
                <div className="mt-2 text-xs">
                  <p className="font-medium">
                    Produces {tool.producedProfiles.length} certified profile
                    {tool.producedProfiles.length === 1 ? '' : 's'}
                  </p>
                  <ul className="text-text-muted">
                    {tool.producedProfiles.map((link) => (
                      <li key={link.profileId}>
                        {link.profileSnapshot.name} · revision {link.profileRevision.slice(0, 8)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-2 text-xs text-warning">Family-only match; no certified profile link</p>
              )}
              <p className="mt-1 text-[10px] text-text-muted">
                Format v{tool.version}
                {tool.revision ? ` · revision ${tool.revision.slice(0, 8)}` : ' · revision assigned on save'}
              </p>
              <div className="mt-3 flex gap-1">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    setEditing(tool);
                    setOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button size="xs" variant="outline" onClick={() => duplicate(tool)}>
                  Duplicate
                </Button>
                <Button size="xs" variant="outline" onClick={() => exportTool(tool)}>
                  Export
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  aria-label={`Delete ${tool.name}`}
                  onClick={() => deleteTool(tool.id)}
                >
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      <RouterToolDialog
        open={open}
        initialTool={editing}
        onOpenChange={setOpen}
        onSave={(tool) => (editing ? updateTool(editing.id, tool) : addTool(tool))}
      />
      <RouterInterchangeHelpDialog open={helpOpen} onOpenChange={setHelpOpen} initialSection="tool" />
      {exportOpen && (
        <RouterCatalogExportDialog
          open
          onOpenChange={setExportOpen}
          profiles={profiles}
          tools={tools}
          initialScope="tools"
        />
      )}
    </div>
  );
}
