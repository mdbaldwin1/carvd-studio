import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RouterCatalogDefinition, RouterProfileDefinition, RouterToolDefinition } from '../types';
import { getRouterProfileRevision } from './routerProfiles';
import { buildRouterCatalogLibraries, installRouterCatalogLibraries } from './routerCatalogInstall';

const profile = (name = 'Profile'): RouterProfileDefinition => ({
  version: 1,
  id: 'p',
  name,
  family: 'cove',
  source: 'generic',
  parameters: {},
  boundary: { start: { u: 0, v: 0.5 }, segments: [{ kind: 'line', to: { u: 0.5, v: 0 } }] }
});
const tool = (): RouterToolDefinition => ({
  version: 1,
  id: 't',
  name: 'Tool',
  source: 'generic',
  profileFamily: 'cove',
  cutterDiameter: 1,
  shankDiameter: 0.5,
  cuttingHeight: 0.5
});
const catalog = (): RouterCatalogDefinition => ({
  version: 1,
  id: 'c',
  name: 'Catalog',
  source: 'generic',
  profiles: [profile()],
  tools: [tool()]
});

describe('router catalog library installation helper', () => {
  beforeEach(() => {
    window.electronAPI = {
      transactRouterCatalogLibraries: vi
        .fn()
        .mockResolvedValue({ status: 'success', current: { profileLibraryHash: 'p', toolLibraryHash: 't' } })
    } as never;
  });
  it('builds final libraries without mutating inputs', () => {
    const current = [profile('Old')];
    const result = buildRouterCatalogLibraries(catalog(), current, []);
    expect(result.plan.map(({ action }) => action)).toEqual(['update', 'add']);
    expect(result.profiles[0].name).toBe('Profile');
    expect(current[0].name).toBe('Old');
  });
  it('invokes only the narrow bridge with both validated libraries and concurrency hashes', async () => {
    const libraries = buildRouterCatalogLibraries(catalog(), [], []);
    const expectedCurrent = { profileLibraryHash: getRouterProfileRevision(profile()), toolLibraryHash: 'tools' };
    await installRouterCatalogLibraries(libraries, expectedCurrent);
    expect(window.electronAPI.transactRouterCatalogLibraries).toHaveBeenCalledWith({
      profileLibrary: libraries.profiles,
      toolLibrary: libraries.tools,
      expectedCurrent
    });
  });
  it('fails closed on an older bridge without the transaction method', async () => {
    window.electronAPI = {} as never;
    expect(await installRouterCatalogLibraries(buildRouterCatalogLibraries(catalog(), [], []))).toEqual({
      status: 'failure',
      reason: 'persistence_failed'
    });
  });
  it('blocks invalid or unsupported signed catalogs before persistence planning', () => {
    expect(() => buildRouterCatalogLibraries(catalog(), [], [], { status: 'invalid' })).toThrow('signature');
    expect(window.electronAPI.transactRouterCatalogLibraries).not.toHaveBeenCalled();
    expect(buildRouterCatalogLibraries(catalog(), [], [], { status: 'verified-untrusted' }).verification?.status).toBe(
      'verified-untrusted'
    );
  });
});
