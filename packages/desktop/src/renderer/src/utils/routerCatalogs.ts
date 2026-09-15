import type { RouterCatalogDefinition, RouterProfileDefinition, RouterToolDefinition } from '../types';
import {
  cloneRouterProfileDefinition,
  getRouterProfileRevision,
  validateEdgeRouterProfileDefinition,
  withRouterProfileRevision
} from './routerProfiles';
import {
  cloneRouterToolDefinition,
  getRouterToolRevision,
  validateRouterToolDefinition,
  withRouterToolRevision
} from './routerTools';
import type { RouterCatalogSignatureVerification } from '../../../shared/electronAPI';

const FORMAT = 'carvd-router-catalog';
const MAX_RECORDS = 512;
const MAX_CATALOG_FILE_BYTES = 2 * 1024 * 1024;
const CATALOG_KEYS = new Set(['version', 'id', 'name', 'source', 'manufacturer', 'sourceUrl', 'profiles', 'tools']);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const nonBlank = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export function validateRouterCatalogDefinition(value: unknown, path = 'catalog'): string[] {
  if (!isRecord(value)) return [`${path} is invalid`];
  const errors: string[] = [];
  if (Object.keys(value).some((key) => !CATALOG_KEYS.has(key))) errors.push(`${path} has unsupported properties`);
  if (value.version !== 1) errors.push(`${path}.version is invalid`);
  for (const key of ['id', 'name'] as const) if (!nonBlank(value[key])) errors.push(`${path}.${key} is invalid`);
  if (value.source !== 'generic' && value.source !== 'manufacturer') errors.push(`${path}.source is invalid`);
  if (value.source === 'manufacturer' && !nonBlank(value.manufacturer)) errors.push(`${path}.manufacturer is required`);
  if (value.manufacturer !== undefined && !nonBlank(value.manufacturer)) errors.push(`${path}.manufacturer is invalid`);
  if (value.sourceUrl !== undefined && !nonBlank(value.sourceUrl)) errors.push(`${path}.sourceUrl is invalid`);
  if (!Array.isArray(value.profiles) || value.profiles.length > MAX_RECORDS) errors.push(`${path}.profiles is invalid`);
  if (!Array.isArray(value.tools) || value.tools.length > MAX_RECORDS) errors.push(`${path}.tools is invalid`);
  if (!Array.isArray(value.profiles) || !Array.isArray(value.tools)) return errors;
  const profiles = new Map<string, RouterProfileDefinition>();
  value.profiles.forEach((profile, index) => {
    errors.push(...validateEdgeRouterProfileDefinition(profile, `${path}.profiles[${index}]`));
    if (!isRecord(profile) || !nonBlank(profile.id)) return;
    if (profiles.has(profile.id)) errors.push(`${path}.profiles has duplicate id ${profile.id}`);
    else profiles.set(profile.id, profile as unknown as RouterProfileDefinition);
  });
  const toolIds = new Set<string>();
  value.tools.forEach((tool, index) => {
    errors.push(...validateRouterToolDefinition(tool, `${path}.tools[${index}]`));
    if (!isRecord(tool) || !nonBlank(tool.id)) return;
    if (toolIds.has(tool.id)) errors.push(`${path}.tools has duplicate id ${tool.id}`);
    toolIds.add(tool.id);
    if (!Array.isArray(tool.producedProfiles)) return;
    tool.producedProfiles.forEach((link, linkIndex) => {
      if (!isRecord(link) || !nonBlank(link.profileId)) return;
      const catalogProfile = profiles.get(link.profileId);
      const linkPath = `${path}.tools[${index}].producedProfiles[${linkIndex}]`;
      if (!catalogProfile) errors.push(`${linkPath} has dangling profile reference ${link.profileId}`);
      else if (getRouterProfileRevision(catalogProfile) !== link.profileRevision)
        errors.push(`${linkPath} conflicts with catalog profile snapshot`);
    });
  });
  return errors;
}

export function cloneRouterCatalogDefinition(catalog: RouterCatalogDefinition): RouterCatalogDefinition {
  return {
    ...catalog,
    profiles: catalog.profiles.map(cloneRouterProfileDefinition),
    tools: catalog.tools.map(cloneRouterToolDefinition)
  };
}

export function stringifyRouterCatalogFile(catalog: RouterCatalogDefinition): string {
  const normalized: RouterCatalogDefinition = {
    ...cloneRouterCatalogDefinition(catalog),
    profiles: catalog.profiles.map(withRouterProfileRevision),
    tools: catalog.tools.map(withRouterToolRevision)
  };
  const errors = validateRouterCatalogDefinition(normalized);
  if (errors.length) throw new Error(errors.join('; '));
  return JSON.stringify({ format: FORMAT, version: 1, catalog: normalized }, null, 2);
}

export function parseRouterCatalogFile(text: string): RouterCatalogDefinition {
  if (text.length > MAX_CATALOG_FILE_BYTES) throw new Error('Router catalog file exceeds the 2 MiB limit.');
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('This is not valid JSON.');
  }
  if (
    !isRecord(value) ||
    Object.keys(value).some((key) => !['format', 'version', 'catalog', 'signature'].includes(key)) ||
    value.format !== FORMAT
  )
    throw new Error('This is not a Carvd router catalog file.');
  if (value.version !== 1) throw new Error(`Router catalog file version ${String(value.version)} is not supported.`);
  const errors = validateRouterCatalogDefinition(value.catalog);
  if (errors.length) throw new Error(errors.join('; '));
  return cloneRouterCatalogDefinition(value.catalog as unknown as RouterCatalogDefinition);
}

export async function parseRouterCatalogFileWithVerification(
  text: string
): Promise<{ catalog: RouterCatalogDefinition; verification: RouterCatalogSignatureVerification }> {
  const catalog = parseRouterCatalogFile(text);
  const parsed = JSON.parse(text) as { signature?: unknown };
  if (parsed.signature === undefined) return { catalog, verification: { status: 'unsigned' } };
  const verify = window.electronAPI?.verifyRouterCatalogSignature;
  const verification =
    typeof verify === 'function'
      ? await verify(text)
      : { status: 'unsupported' as const, reason: 'This app bridge cannot verify signed catalogs.' };
  return { catalog, verification };
}

export type CatalogImportAction = 'add' | 'update' | 'skip' | 'conflict';
export interface RouterCatalogImportPlanItem {
  kind: 'profile' | 'tool';
  id: string;
  action: CatalogImportAction;
  reason: string;
}

export function planRouterCatalogImport(
  catalog: RouterCatalogDefinition,
  currentProfiles: readonly RouterProfileDefinition[],
  currentTools: readonly RouterToolDefinition[]
): RouterCatalogImportPlanItem[] {
  const plan = <T extends { id: string; version: number; source: string; manufacturer?: string }>(
    kind: 'profile' | 'tool',
    incoming: readonly T[],
    current: readonly T[],
    revision: (item: T) => string
  ) =>
    incoming.map((item): RouterCatalogImportPlanItem => {
      const existing = current.find((candidate) => candidate.id === item.id);
      if (!existing) return { kind, id: item.id, action: 'add', reason: 'ID is not present in the library' };
      if (revision(existing) === revision(item))
        return { kind, id: item.id, action: 'skip', reason: 'Identical revision is already present' };
      const sameAuthority = existing.source === item.source && existing.manufacturer === item.manufacturer;
      return {
        kind,
        id: item.id,
        action: existing.version === item.version && sameAuthority ? 'update' : 'conflict',
        reason:
          existing.version !== item.version
            ? 'Definition versions conflict'
            : sameAuthority
              ? 'Same-authority content differs'
              : 'ID is owned by different provenance'
      };
    });
  return [
    ...plan('profile', catalog.profiles, currentProfiles, getRouterProfileRevision),
    ...plan('tool', catalog.tools, currentTools, getRouterToolRevision)
  ].sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
}
