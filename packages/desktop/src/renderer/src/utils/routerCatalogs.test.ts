import { describe, expect, it } from 'vitest';
import type { RouterCatalogDefinition, RouterProfileDefinition, RouterToolDefinition } from '../types';
import { getRouterProfileRevision } from './routerProfiles';
import {
  parseRouterCatalogFile,
  parseRouterCatalogFileWithVerification,
  planRouterCatalogImport,
  stringifyRouterCatalogFile,
  validateRouterCatalogDefinition
} from './routerCatalogs';

const profile = (id = 'profile-1'): RouterProfileDefinition => ({
  version: 1,
  id,
  name: 'Cove',
  family: 'cove',
  source: 'generic',
  parameters: {},
  boundary: { start: { u: 0, v: 0.5 }, segments: [{ kind: 'line', to: { u: 0.5, v: 0 } }] }
});
const tool = (p = profile()): RouterToolDefinition => ({
  version: 1,
  id: 'tool-1',
  name: 'Cove tool',
  source: 'generic',
  profileFamily: 'cove',
  cutterDiameter: 1,
  shankDiameter: 0.5,
  cuttingHeight: 0.5,
  producedProfiles: [{ profileId: p.id, profileRevision: getRouterProfileRevision(p), profileSnapshot: p }]
});
const catalog = (): RouterCatalogDefinition => ({
  version: 1,
  id: 'vendor-1',
  name: 'Vendor',
  source: 'manufacturer',
  manufacturer: 'Vendor',
  profiles: [profile()],
  tools: [tool()]
});

describe('router catalog interchange', () => {
  it('validates and round-trips atomically with immutable linkage', () => {
    expect(validateRouterCatalogDefinition(catalog())).toEqual([]);
    const restored = parseRouterCatalogFile(stringifyRouterCatalogFile(catalog()));
    expect(restored.profiles[0].id).toBe('profile-1');
    restored.tools[0].producedProfiles![0].profileSnapshot.boundary.start.v = 9;
    expect(restored.profiles[0].boundary.start.v).toBe(0.5);
  });
  it('rejects duplicate, dangling, conflicting, oversized, and future catalogs', () => {
    expect(validateRouterCatalogDefinition({ ...catalog(), profiles: [profile(), profile()] }).join('\n')).toContain(
      'duplicate'
    );
    expect(validateRouterCatalogDefinition({ ...catalog(), profiles: [] }).join('\n')).toContain('dangling');
    expect(
      validateRouterCatalogDefinition({ ...catalog(), profiles: [{ ...profile(), name: 'Changed' }] }).join('\n')
    ).toContain('conflicts');
    expect(
      validateRouterCatalogDefinition({
        ...catalog(),
        profiles: Array.from({ length: 513 }, (_, i) => profile(`p-${i}`))
      }).join('\n')
    ).toContain('profiles');
    expect(() =>
      parseRouterCatalogFile(JSON.stringify({ format: 'carvd-router-catalog', version: 2, catalog: catalog() }))
    ).toThrow('version 2');
  });
  it('creates a deterministic add/update/skip plan without mutation', () => {
    const incoming = catalog();
    const plan = planRouterCatalogImport(incoming, [{ ...profile(), name: 'Old' }], []);
    expect(plan.map(({ kind, action }) => `${kind}:${action}`)).toEqual(['profile:update', 'tool:add']);
    expect(
      planRouterCatalogImport(incoming, incoming.profiles, incoming.tools).every(({ action }) => action === 'skip')
    ).toBe(true);
    expect(
      planRouterCatalogImport(incoming, [{ ...profile(), source: 'manufacturer', manufacturer: 'Other' }], [])[0].action
    ).toBe('conflict');
  });
  it('integrates offline signature status without changing catalog parsing', async () => {
    const unsigned = stringifyRouterCatalogFile(catalog());
    expect((await parseRouterCatalogFileWithVerification(unsigned)).verification.status).toBe('unsigned');
    window.electronAPI = {
      verifyRouterCatalogSignature: async () => ({ status: 'verified-untrusted', publisherKeyId: 'test' })
    } as never;
    const wrapper = JSON.parse(unsigned);
    wrapper.signature = { algorithm: 'Ed25519' };
    expect((await parseRouterCatalogFileWithVerification(JSON.stringify(wrapper))).verification).toMatchObject({
      status: 'verified-untrusted',
      publisherKeyId: 'test'
    });
  });
});
