import { describe, expect, it } from 'vitest';
import type { RouterProfileDefinition, RouterToolDefinition } from '../types';
import { getRouterProfileRevision, withRouterProfileRevision } from './routerProfiles';
import { parseRouterCatalogFile } from './routerCatalogs';
import { buildRouterCatalogExport } from './routerCatalogExport';

const profile = (id: string, name = id): RouterProfileDefinition =>
  withRouterProfileRevision({
    version: 1,
    id,
    name,
    family: 'cove',
    source: 'generic',
    parameters: {},
    boundary: { start: { u: 0, v: 0.25 }, segments: [{ kind: 'line', to: { u: 0.25, v: 0 } }] }
  });
const tool = (linked: RouterProfileDefinition): RouterToolDefinition => ({
  version: 1,
  id: 'tool-z',
  name: 'Tool',
  source: 'generic',
  profileFamily: 'cove',
  cutterDiameter: 0.5,
  shankDiameter: 0.25,
  cuttingHeight: 0.25,
  producedProfiles: [
    { profileId: linked.id, profileRevision: getRouterProfileRevision(linked), profileSnapshot: linked }
  ]
});
const metadata = { id: 'backup', name: 'Backup', source: 'generic' as const };

describe('router catalog export closure', () => {
  it('includes linked immutable snapshots once even when missing from the library', () => {
    const linked = profile('p-linked');
    const result = buildRouterCatalogExport(metadata, [], [tool(linked)], { profileIds: [], toolIds: ['tool-z'] });
    expect(result.dependencyProfileIds).toEqual(['p-linked']);
    expect(result.catalog.profiles).toHaveLength(1);
    expect(parseRouterCatalogFile(result.text).tools[0].producedProfiles?.[0].profileSnapshot).toEqual(linked);
  });

  it('is byte deterministic regardless of library order', () => {
    const a = profile('a');
    const b = profile('b');
    const first = buildRouterCatalogExport(metadata, [b, a], [tool(b)], { profileIds: ['a'], toolIds: ['tool-z'] });
    const second = buildRouterCatalogExport(metadata, [a, b], [tool(b)], { profileIds: ['a'], toolIds: ['tool-z'] });
    expect(first.text).toBe(second.text);
    expect(first.catalog.profiles.map(({ id }) => id)).toEqual(['a', 'b']);
  });

  it('blocks stale selections and conflicting dependency revisions', () => {
    expect(() => buildRouterCatalogExport(metadata, [], [], { profileIds: ['gone'], toolIds: [] })).toThrow(
      'changed or was removed'
    );
    const linked = profile('p');
    expect(() =>
      buildRouterCatalogExport(metadata, [profile('p', 'Different')], [tool(linked)], {
        profileIds: ['p'],
        toolIds: ['tool-z']
      })
    ).toThrow('conflicting revisions');
  });
});
