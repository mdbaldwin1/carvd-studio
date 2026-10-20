import type { RouterCatalogDefinition, RouterProfileDefinition, RouterToolDefinition } from '../types';
import type { RouterCatalogTransactionResult } from '../../../shared/electronAPI';
import type { RouterCatalogSignatureVerification } from '../../../shared/electronAPI';
import { planRouterCatalogImport, type RouterCatalogImportPlanItem } from './routerCatalogs';
import { cloneRouterProfileDefinition, validateEdgeRouterProfileDefinition } from './routerProfiles';
import { cloneRouterToolDefinition, validateRouterToolDefinition } from './routerTools';

export interface PlannedRouterLibraries {
  profiles: RouterProfileDefinition[];
  tools: RouterToolDefinition[];
  plan: RouterCatalogImportPlanItem[];
  verification?: RouterCatalogSignatureVerification;
}

export function buildRouterCatalogLibraries(
  catalog: RouterCatalogDefinition,
  currentProfiles: readonly RouterProfileDefinition[],
  currentTools: readonly RouterToolDefinition[],
  verification?: RouterCatalogSignatureVerification
): PlannedRouterLibraries {
  if (verification?.status === 'invalid' || verification?.status === 'unsupported')
    throw new Error('Catalog signature is invalid or unsupported.');
  const plan = planRouterCatalogImport(catalog, currentProfiles, currentTools);
  if (plan.some(({ action }) => action === 'conflict'))
    throw new Error('Catalog conflicts must be resolved before installation.');
  const merge = <T extends { id: string }>(current: readonly T[], incoming: readonly T[], kind: 'profile' | 'tool') => {
    const next = current.map((item) => item);
    for (const item of incoming) {
      const action = plan.find((entry) => entry.kind === kind && entry.id === item.id)?.action;
      if (action === 'skip') continue;
      const index = next.findIndex((candidate) => candidate.id === item.id);
      if (index < 0) next.push(item);
      else next[index] = item;
    }
    return next;
  };
  const profiles = merge(currentProfiles, catalog.profiles, 'profile').map(cloneRouterProfileDefinition);
  const tools = merge(currentTools, catalog.tools, 'tool').map(cloneRouterToolDefinition);
  if (profiles.some((profile) => validateEdgeRouterProfileDefinition(profile).length))
    throw new Error('Final profile library is invalid.');
  if (tools.some((tool) => validateRouterToolDefinition(tool).length))
    throw new Error('Final tool library is invalid.');
  return { profiles, tools, plan, verification };
}

export async function installRouterCatalogLibraries(
  libraries: PlannedRouterLibraries,
  expectedCurrent?: { profileLibraryHash: string; toolLibraryHash: string }
): Promise<RouterCatalogTransactionResult> {
  const transact = window.electronAPI?.transactRouterCatalogLibraries;
  if (typeof transact !== 'function') return { status: 'failure', reason: 'persistence_failed' };
  return transact({ profileLibrary: libraries.profiles, toolLibrary: libraries.tools, expectedCurrent });
}
