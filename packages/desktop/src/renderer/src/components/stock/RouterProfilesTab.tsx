import { useMemo, useState } from 'react';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Select } from '@renderer/components/ui/select';
import type { RouterProfileDefinition } from '@renderer/types';
import {
  cloneRouterProfileDefinition,
  parseRouterProfileFile,
  stringifyRouterProfileFile
} from '@renderer/utils/routerProfiles';
import { BUILT_IN_ROUTER_PROFILES } from '@renderer/utils/routerProfileBuiltins';
import { useRouterProfileLibrary } from '@renderer/hooks/useRouterProfileLibrary';
import { DxfRouterProfileImportDialog } from '@renderer/components/part-cuts/DxfRouterProfileImportDialog';
import { SvgRouterProfileImportDialog } from '@renderer/components/part-cuts/SvgRouterProfileImportDialog';
import { RouterProfilePreview } from '@renderer/components/part-cuts/RouterProfilePreview';
import { RouterProfileDefinitionDialog } from './RouterProfileDefinitionDialog';
import {
  describeRouterImportError,
  ImportDiagnostic,
  RouterInterchangeHelpDialog
} from './RouterInterchangeHelpDialog';
import { RouterCatalogImportDialog } from './RouterCatalogImportDialog';
import { RouterCatalogExportDialog } from './RouterCatalogExportDialog';
import { useRouterToolLibrary } from '@renderer/hooks/useRouterToolLibrary';

export function RouterProfilesTab() {
  const { profiles, isLoading, addProfile, updateProfile, deleteProfile } = useRouterProfileLibrary();
  const { tools } = useRouterToolLibrary();
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('all');
  const [importOpen, setImportOpen] = useState(false);
  const [svgImportOpen, setSvgImportOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<RouterProfileDefinition | undefined>();
  const [helpOpen, setHelpOpen] = useState(false);
  const [importDiagnostic, setImportDiagnostic] = useState<ReturnType<typeof describeRouterImportError>>();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const families = useMemo(() => [...new Set(profiles.map((profile) => profile.family))].sort(), [profiles]);
  const visible = profiles.filter(
    (profile) =>
      (family === 'all' || profile.family === family) &&
      `${profile.name} ${profile.family} ${profile.manufacturer ?? ''} ${profile.sku ?? ''}`
        .toLowerCase()
        .includes(query.toLowerCase())
  );

  const duplicate = async (profile: RouterProfileDefinition) => {
    const copy = cloneRouterProfileDefinition(profile);
    copy.id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `router-profile-${Date.now()}`;
    copy.name = `${profile.name} Copy`;
    await addProfile(copy);
  };
  const exportProfile = async (profile: RouterProfileDefinition) => {
    const result = await window.electronAPI.showSaveDialog({
      title: 'Export Router Profile',
      defaultPath: `${profile.name.replace(/[^a-z0-9-_]+/gi, '-')}.carvd-profile`,
      filters: [{ name: 'Carvd router profile', extensions: ['carvd-profile'] }]
    });
    if (!result.canceled && result.filePath)
      await window.electronAPI.writeFile(result.filePath, stringifyRouterProfileFile(profile));
  };
  const importProfile = async () => {
    const result = await window.electronAPI.showOpenDialog({
      title: 'Import Router Profile',
      properties: ['openFile'],
      filters: [{ name: 'Carvd router profile', extensions: ['carvd-profile'] }]
    });
    if (result.canceled || !result.filePaths[0]) return;
    const path = result.filePaths[0];
    const fileName = path.split(/[\\/]/).pop() ?? path;
    try {
      const imported = parseRouterProfileFile(await window.electronAPI.readFile(path));
      imported.id =
        typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `router-profile-${Date.now()}`;
      await addProfile(imported);
      setImportDiagnostic(undefined);
    } catch (error) {
      setImportDiagnostic(describeRouterImportError(error, fileName));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col p-5">
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
        <Input
          aria-label="Search router profiles"
          placeholder="Search profiles…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-xs"
        />
        <Select
          aria-label="Filter router profiles by family"
          value={family}
          onChange={(event) => setFamily(event.target.value)}
          className="max-w-48"
        >
          <option value="all">All families</option>
          {families.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <Button
          className="ml-auto"
          onClick={() => {
            setEditing(undefined);
            setEditorOpen(true);
          }}
        >
          Create Profile…
        </Button>
        <Button variant="outline" onClick={importProfile}>
          Import Profile…
        </Button>
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          Import DXF…
        </Button>
        <Button variant="outline" onClick={() => setSvgImportOpen(true)}>
          Import SVG…
        </Button>
        <Button variant="ghost" onClick={() => setHelpOpen(true)}>
          Formats &amp; examples
        </Button>
        <Button variant="outline" onClick={() => setCatalogOpen(true)}>
          Import Catalog…
        </Button>
        <Button variant="outline" onClick={() => setExportOpen(true)}>
          Export Catalog…
        </Button>
      </div>
      {importDiagnostic && (
        <div className="pt-3">
          <ImportDiagnostic diagnostic={importDiagnostic} />
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto py-4">
        <section aria-labelledby="built-in-router-profiles">
          <h2 id="built-in-router-profiles" className="mb-2 text-sm font-semibold text-text">
            Built-in profiles
          </h2>
          <div className="mb-5 flex flex-wrap gap-2">
            {BUILT_IN_ROUTER_PROFILES.map(({ profile, definition }) => (
              <Button
                key={profile}
                size="sm"
                variant="outline"
                onClick={() => {
                  const copy = cloneRouterProfileDefinition(definition);
                  copy.id =
                    typeof crypto !== 'undefined' && crypto.randomUUID
                      ? crypto.randomUUID()
                      : `router-profile-${Date.now()}`;
                  copy.name = `${definition.name} Custom`;
                  setEditing(copy);
                  setEditorOpen(true);
                }}
              >
                Duplicate {definition.name}
              </Button>
            ))}
          </div>
        </section>
        {isLoading ? (
          <p className="text-sm text-text-muted">Loading router profiles…</p>
        ) : visible.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-10 text-center">
            <p className="font-medium text-text">No custom router profiles found</p>
            <p className="mt-1 text-sm text-text-muted">
              Create one numerically, import a .carvd-profile, or import an SVG or DXF cross-section.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((profile) => (
              <article key={profile.id} className="rounded-md border border-border bg-surface p-3">
                <RouterProfilePreview profile={profile} />
                <h3 className="mt-2 font-semibold text-text">{profile.name}</h3>
                <p className="text-xs text-text-muted">
                  {profile.family}
                  {profile.manufacturer ? ` · ${profile.manufacturer}` : ''}
                  {profile.sku ? ` · ${profile.sku}` : ''}
                </p>
                <p className="mt-1 text-[10px] text-text-muted">
                  Format v{profile.version}
                  {profile.revision ? ` · revision ${profile.revision.slice(0, 8)}` : ' · revision assigned on save'}
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => {
                      setEditing(profile);
                      setEditorOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button size="xs" variant="outline" onClick={() => duplicate(profile)}>
                    Duplicate
                  </Button>
                  <Button size="xs" variant="outline" onClick={() => exportProfile(profile)}>
                    Export
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    aria-label={`Delete ${profile.name}`}
                    onClick={() => deleteProfile(profile.id)}
                  >
                    Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <DxfRouterProfileImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <SvgRouterProfileImportDialog open={svgImportOpen} onOpenChange={setSvgImportOpen} />
      <RouterProfileDefinitionDialog
        open={editorOpen}
        initialProfile={editing}
        onOpenChange={setEditorOpen}
        onSave={(profile) =>
          editing && profiles.some((candidate) => candidate.id === editing.id)
            ? updateProfile(editing.id, profile)
            : addProfile(profile)
        }
      />
      <RouterInterchangeHelpDialog open={helpOpen} onOpenChange={setHelpOpen} initialSection="profile" />
      <RouterCatalogImportDialog open={catalogOpen} onOpenChange={setCatalogOpen} />
      {exportOpen && (
        <RouterCatalogExportDialog
          open
          onOpenChange={setExportOpen}
          profiles={profiles}
          tools={tools}
          initialScope="profiles"
        />
      )}
    </div>
  );
}
