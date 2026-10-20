import { describe, expect, it, vi } from 'vitest';
import {
  getRouterLibraryHashes,
  transactRouterCatalogLibraries,
  validateRouterCatalogTransaction
} from './routerCatalogTransaction';

const profile = {
  version: 1,
  id: 'p',
  name: 'P',
  family: 'cove',
  source: 'generic',
  parameters: {},
  boundary: { start: { u: 0, v: 1 }, segments: [{ kind: 'line', to: { u: 1, v: 0 } }] }
};
const tool = {
  version: 1,
  id: 't',
  name: 'T',
  profileFamily: 'cove',
  source: 'generic',
  cutterDiameter: 1,
  shankDiameter: 0.5,
  cuttingHeight: 0.5
};
const payload = { profileLibrary: [profile], toolLibrary: [tool] };

describe('atomic router catalog preference transaction', () => {
  it('rejects malformed, oversized, and unauthorized payloads', () => {
    expect(validateRouterCatalogTransaction({ ...payload, arbitraryKey: [] })).toBe(false);
    expect(validateRouterCatalogTransaction({ profileLibrary: [], toolLibrary: [{ bad: true }] })).toBe(false);
    expect(
      validateRouterCatalogTransaction({ profileLibrary: Array.from({ length: 513 }, () => profile), toolLibrary: [] })
    ).toBe(false);
  });
  it('commits both values in one store assignment and notifies exactly once', async () => {
    let state: Record<string, unknown> = { routerProfileLibrary: [], routerToolLibrary: [], theme: 'dark' };
    let writes = 0;
    const store = {
      get store() {
        return state;
      },
      set store(value) {
        writes += 1;
        state = value;
      }
    };
    const notify = vi.fn();
    const result = await transactRouterCatalogLibraries(store, payload, notify);
    expect(result.status).toBe('success');
    expect(writes).toBe(1);
    expect(state).toMatchObject({ routerProfileLibrary: [profile], routerToolLibrary: [tool], theme: 'dark' });
    expect(notify).toHaveBeenCalledTimes(1);
  });
  it('returns conflict without writing when another window changed either library', async () => {
    const state = { routerProfileLibrary: [], routerToolLibrary: [] };
    const store = { store: state };
    const notify = vi.fn();
    const stale = getRouterLibraryHashes([profile], []);
    expect((await transactRouterCatalogLibraries(store, { ...payload, expectedCurrent: stale }, notify)).status).toBe(
      'conflict'
    );
    expect(notify).not.toHaveBeenCalled();
  });
  it('retains both prior values and suppresses notification when atomic persistence fails', async () => {
    const prior = { routerProfileLibrary: ['old-profile'], routerToolLibrary: ['old-tool'] };
    const store = {
      get store() {
        return prior;
      },
      set store(_value: Record<string, unknown>) {
        throw new Error('disk');
      }
    };
    const notify = vi.fn();
    expect(await transactRouterCatalogLibraries(store, payload, notify)).toEqual({
      status: 'failure',
      reason: 'persistence_failed'
    });
    expect(prior).toEqual({ routerProfileLibrary: ['old-profile'], routerToolLibrary: ['old-tool'] });
    expect(notify).not.toHaveBeenCalled();
  });
  it('serializes concurrent window requests so stale expected hashes conflict', async () => {
    const store = { store: { routerProfileLibrary: [], routerToolLibrary: [] } };
    const expectedCurrent = getRouterLibraryHashes([], []);
    const [first, second] = await Promise.all([
      transactRouterCatalogLibraries(store, { ...payload, expectedCurrent }, vi.fn()),
      transactRouterCatalogLibraries(
        store,
        { profileLibrary: [{ ...profile, id: 'p2' }], toolLibrary: [], expectedCurrent },
        vi.fn()
      )
    ]);
    expect(first.status).toBe('success');
    expect(second.status).toBe('conflict');
  });
  it('reads committed values after a simulated process restart', async () => {
    const firstStore = { store: { routerProfileLibrary: [], routerToolLibrary: [] } as Record<string, unknown> };
    await transactRouterCatalogLibraries(firstStore, payload, vi.fn());
    const restartedStore = { store: firstStore.store };
    const expectedCurrent = getRouterLibraryHashes([profile], [tool]);
    expect(
      (await transactRouterCatalogLibraries(restartedStore, { ...payload, expectedCurrent }, vi.fn())).status
    ).toBe('success');
  });
});
