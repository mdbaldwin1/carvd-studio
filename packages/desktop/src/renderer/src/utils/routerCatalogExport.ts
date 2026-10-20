import type { RouterCatalogDefinition, RouterProfileDefinition, RouterToolDefinition } from '../types';
import { cloneRouterProfileDefinition, getRouterProfileRevision } from './routerProfiles';
import { cloneRouterToolDefinition } from './routerTools';
import { parseRouterCatalogFile, stringifyRouterCatalogFile, validateRouterCatalogDefinition } from './routerCatalogs';

export interface RouterCatalogExportSelection {
  profileIds: readonly string[];
  toolIds: readonly string[];
}

export function buildRouterCatalogExport(
  metadata: Pick<RouterCatalogDefinition, 'id' | 'name' | 'source' | 'manufacturer' | 'sourceUrl'>,
  profiles: readonly RouterProfileDefinition[],
  tools: readonly RouterToolDefinition[],
  selection: RouterCatalogExportSelection
): { catalog: RouterCatalogDefinition; text: string; dependencyProfileIds: string[] } {
  const selectedTools = tools.filter((tool) => selection.toolIds.includes(tool.id)).map(cloneRouterToolDefinition);
  const byId = new Map<string, RouterProfileDefinition>();
  const dependencies = new Set<string>();
  for (const id of [...selection.profileIds].sort()) {
    const profile = profiles.find((candidate) => candidate.id === id);
    if (!profile) throw new Error(`Selected profile ${id} changed or was removed; refresh the export review.`);
    byId.set(id, cloneRouterProfileDefinition(profile));
  }
  for (const tool of selectedTools) {
    for (const link of tool.producedProfiles ?? []) {
      const existing = byId.get(link.profileId);
      if (existing && getRouterProfileRevision(existing) !== link.profileRevision)
        throw new Error(`Profile ${link.profileId} has conflicting revisions across the export selection.`);
      if (!existing) {
        byId.set(link.profileId, cloneRouterProfileDefinition(link.profileSnapshot));
        dependencies.add(link.profileId);
      }
    }
  }
  const catalog: RouterCatalogDefinition = {
    version: 1,
    ...metadata,
    profiles: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id)),
    tools: selectedTools.sort((a, b) => a.id.localeCompare(b.id))
  };
  const errors = validateRouterCatalogDefinition(catalog);
  if (errors.length) throw new Error(errors.join('; '));
  const text = stringifyRouterCatalogFile(catalog);
  parseRouterCatalogFile(text);
  return { catalog, text, dependencyProfileIds: [...dependencies].sort() };
}
