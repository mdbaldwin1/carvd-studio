import { describe, expect, it } from 'vitest';
import {
  addTrustedRouterPublisher,
  findTrustedRouterPublisher,
  getTrustedPublisherRevision,
  parseTrustedRouterPublishers,
  removeTrustedRouterPublisher,
  validateTrustedRouterPublisher
} from '../../../shared/routerPublisherTrust';

const publisher = () => ({
  version: 1 as const,
  keyId: 'test',
  displayName: 'Test',
  publicKeySpki: 'AAAA',
  fingerprint: 'a'.repeat(64),
  source: 'test',
  addedAt: '2026-09-15T00:00:00Z'
});
describe('trusted router publishers', () => {
  it('validates, revisions, clones, looks up, and removes public-only records', () => {
    const revised = { ...publisher(), revision: getTrustedPublisherRevision(publisher()) };
    expect(validateTrustedRouterPublisher(revised)).toBe(true);
    const parsed = parseTrustedRouterPublishers(JSON.parse(JSON.stringify([revised])));
    expect(findTrustedRouterPublisher(parsed, 'test', 'a'.repeat(64))).toBeDefined();
    expect(removeTrustedRouterPublisher(parsed, 'test')).toEqual([]);
  });
  it('rejects stale revisions, duplicate trust, private-looking fields, and oversized stores', () => {
    expect(validateTrustedRouterPublisher({ ...publisher(), revision: 'stale' })).toBe(false);
    expect(validateTrustedRouterPublisher({ ...publisher(), privateKey: 'secret' })).toBe(false);
    expect(() => addTrustedRouterPublisher([publisher()], publisher())).toThrow('duplicate');
    expect(parseTrustedRouterPublishers(Array.from({ length: 129 }, publisher))).toEqual([]);
  });
});
