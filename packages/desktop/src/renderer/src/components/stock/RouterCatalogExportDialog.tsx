import { useMemo, useRef, useState } from 'react';
import { Button } from '@renderer/components/ui/button';
import { Checkbox } from '@renderer/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Select } from '@renderer/components/ui/select';
import type { RouterProfileDefinition, RouterToolDefinition } from '@renderer/types';
import { buildRouterCatalogExport } from '@renderer/utils/routerCatalogExport';

const catalogId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `router-catalog-${Date.now()}`;
export function RouterCatalogExportDialog({
  open,
  onOpenChange,
  profiles,
  tools,
  initialScope = 'profiles'
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profiles: RouterProfileDefinition[];
  tools: RouterToolDefinition[];
  initialScope?: 'profiles' | 'tools';
}) {
  const reviewSignature = useRef(
    JSON.stringify({
      profiles: profiles.map(({ id, revision }) => [id, revision]),
      tools: tools.map(({ id, revision }) => [id, revision])
    })
  );
  const [name, setName] = useState('Router Library Backup');
  const [id, setId] = useState(catalogId);
  const [source, setSource] = useState<'generic' | 'manufacturer'>('generic');
  const [manufacturer, setManufacturer] = useState('');
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('all');
  const [maker, setMaker] = useState('all');
  const [profileIds, setProfileIds] = useState<string[]>(
    initialScope === 'profiles' ? profiles.map(({ id }) => id) : []
  );
  const [toolIds, setToolIds] = useState<string[]>(initialScope === 'tools' ? tools.map(({ id }) => id) : []);
  const [message, setMessage] = useState('');
  const stale =
    reviewSignature.current !==
    JSON.stringify({
      profiles: profiles.map(({ id: profileId, revision }) => [profileId, revision]),
      tools: tools.map(({ id: toolId, revision }) => [toolId, revision])
    });
  const requiredIds = useMemo(
    () =>
      new Set(
        tools
          .filter((tool) => toolIds.includes(tool.id))
          .flatMap((tool) => tool.producedProfiles?.map((link) => link.profileId) ?? [])
      ),
    [toolIds, tools]
  );
  const families = [
    ...new Set([...profiles.map((profile) => profile.family), ...tools.map((tool) => tool.profileFamily)])
  ].sort();
  const makers = [
    ...new Set(
      [...profiles.map((profile) => profile.manufacturer), ...tools.map((tool) => tool.manufacturer)].filter(
        (value): value is string => !!value
      )
    )
  ].sort();
  const matches = (nameValue: string, familyValue: string, makerValue?: string) =>
    `${nameValue} ${familyValue} ${makerValue ?? ''}`.toLowerCase().includes(query.toLowerCase()) &&
    (family === 'all' || family === familyValue) &&
    (maker === 'all' || maker === makerValue);
  const result = useMemo(() => {
    try {
      return {
        value: buildRouterCatalogExport(
          { id, name, source, manufacturer: source === 'manufacturer' ? manufacturer : undefined },
          profiles,
          tools,
          { profileIds, toolIds }
        )
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'The catalog cannot be exported.' };
    }
  }, [id, manufacturer, name, profileIds, profiles, source, toolIds, tools]);
  const toggle = (values: string[], value: string, checked: boolean) =>
    checked ? [...new Set([...values, value])] : values.filter((candidate) => candidate !== value);
  const save = async () => {
    if (!result.value) return;
    try {
      const choice = await window.electronAPI.showSaveDialog({
        title: 'Export Router Catalog',
        defaultPath: `${name.replace(/[^a-z0-9-_]+/gi, '-') || 'router-catalog'}.carvd-router-catalog`,
        filters: [{ name: 'Carvd router catalog', extensions: ['carvd-router-catalog'] }]
      });
      if (choice.canceled || !choice.filePath) return;
      await window.electronAPI.writeFile(choice.filePath, result.value.text);
      onOpenChange(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message.slice(0, 500) : 'The catalog could not be saved.');
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[820px] max-w-[96vw]" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <div>
            <DialogTitle>Export Router Catalog</DialogTitle>
            <p className="mt-1 text-sm text-text-muted">
              Select only the records to share. Certified dependencies are included automatically.
            </p>
          </div>
          <DialogClose onClose={() => onOpenChange(false)} />
        </DialogHeader>
        <div className="max-h-[68vh] space-y-4 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="catalog-export-name">Catalog Name</Label>
              <Input id="catalog-export-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="catalog-export-id">Catalog ID</Label>
              <Input id="catalog-export-id" value={id} onChange={(event) => setId(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="catalog-export-source">Source</Label>
              <Select
                id="catalog-export-source"
                value={source}
                onChange={(event) => setSource(event.target.value as typeof source)}
              >
                <option value="generic">Generic</option>
                <option value="manufacturer">Manufacturer</option>
              </Select>
            </div>
            {source === 'manufacturer' && (
              <div>
                <Label htmlFor="catalog-export-maker">Manufacturer</Label>
                <Input
                  id="catalog-export-maker"
                  value={manufacturer}
                  onChange={(event) => setManufacturer(event.target.value)}
                />
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setProfileIds(profiles.map(({ id: profileId }) => profileId));
                setToolIds(tools.map(({ id: toolId }) => toolId));
                setName('Complete Router Data Backup');
              }}
            >
              Back up all router data…
            </Button>
            <Input
              aria-label="Search catalog records"
              placeholder="Search profiles and tools…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="max-w-xs"
            />
            <Select
              aria-label="Filter export by family"
              value={family}
              onChange={(event) => setFamily(event.target.value)}
            >
              <option value="all">All families</option>
              {families.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </Select>
            <Select
              aria-label="Filter export by manufacturer"
              value={maker}
              onChange={(event) => setMaker(event.target.value)}
            >
              <option value="all">All manufacturers</option>
              {makers.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <section aria-labelledby="export-profiles">
              <h3 id="export-profiles" className="font-semibold">
                Profiles
              </h3>
              <ul className="mt-2 space-y-2">
                {profiles
                  .filter((profile) => matches(profile.name, profile.family, profile.manufacturer))
                  .map((profile) => (
                    <li key={profile.id}>
                      <Label className="flex items-start gap-2">
                        <Checkbox
                          checked={profileIds.includes(profile.id) || requiredIds.has(profile.id)}
                          disabled={requiredIds.has(profile.id)}
                          onChange={(event) => setProfileIds(toggle(profileIds, profile.id, event.target.checked))}
                        />
                        <span>
                          {profile.name}
                          <small className="block text-text-muted">
                            {profile.family} · revision {profile.revision?.slice(0, 8) ?? 'computed on export'}
                            {requiredIds.has(profile.id) ? ' · Required by selected tool' : ''}
                          </small>
                        </span>
                      </Label>
                    </li>
                  ))}
              </ul>
              {[...requiredIds]
                .filter((profileId) => !profiles.some((profile) => profile.id === profileId))
                .map((profileId) => (
                  <p key={profileId} className="mt-2 text-xs text-warning">
                    {profileId} · Included from immutable tool-linked snapshot because it is missing from the library.
                  </p>
                ))}
            </section>
            <section aria-labelledby="export-tools">
              <h3 id="export-tools" className="font-semibold">
                Physical Router Tools
              </h3>
              <ul className="mt-2 space-y-2">
                {tools
                  .filter((tool) => matches(tool.name, tool.profileFamily, tool.manufacturer))
                  .map((tool) => (
                    <li key={tool.id}>
                      <Label className="flex items-start gap-2">
                        <Checkbox
                          checked={toolIds.includes(tool.id)}
                          onChange={(event) => setToolIds(toggle(toolIds, tool.id, event.target.checked))}
                        />
                        <span>
                          {tool.name}
                          <small className="block text-text-muted">
                            {tool.profileFamily} · {tool.manufacturer ?? 'Generic'} ·{' '}
                            {tool.producedProfiles?.length ?? 0} dependencies
                          </small>
                        </span>
                      </Label>
                    </li>
                  ))}
              </ul>
            </section>
          </div>
          <section aria-label="Export scope summary" className="rounded-md border border-border p-3 text-sm">
            <strong>Export scope</strong>
            {result.value ? (
              <p>
                {result.value.catalog.profiles.length} profiles ({result.value.dependencyProfileIds.length} automatic
                dependencies) · {result.value.catalog.tools.length} tools · format version 1 · .carvd-router-catalog
              </p>
            ) : (
              <p className="text-danger">{result.error}</p>
            )}
            <p className="mt-1 text-xs text-warning">
              This catalog is data interchange, not proof of manufacturer authenticity or safe operating parameters.
            </p>
          </section>
          {stale && (
            <p role="alert" className="text-sm text-warning">
              The router libraries changed during review. Close and reopen Export Catalog to use a fresh snapshot.
            </p>
          )}
          {message && (
            <p role="alert" className="text-sm text-danger">
              Save failed: {message}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={stale || !result.value || (!profileIds.length && !toolIds.length)} onClick={save}>
            Save Catalog…
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
