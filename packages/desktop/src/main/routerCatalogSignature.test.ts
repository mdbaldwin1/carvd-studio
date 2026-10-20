import fs from 'node:fs';
import path from 'node:path';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyRouterCatalogSignature } from './routerCatalogSignature';
import { canonicalJson } from '../shared/canonicalJson';

const fixturePath = path.resolve(
  process.cwd(),
  '../../docs/schemas/router-interchange/examples/valid/signed-test-only.carvd-catalog.json'
);
const text = fs.readFileSync(fixturePath, 'utf8');
const parsed = JSON.parse(text) as Record<string, unknown>;
const fingerprint = 'ead7b7fca9a8db5ed12024cbe819e2856cbcb45235b35a5d605d54ab530e14e0';
const trusted = [
  {
    version: 1,
    keyId: 'carvd-test-only-2026',
    displayName: 'Test Publisher',
    publicKeySpki: 'MCowBQYDK2VwAyEAhIr8GzpyWEjSVqHQWcCoY71xr7ufM6h2OdLORXVq8dE=',
    fingerprint,
    source: 'test only',
    addedAt: '2026-09-15T00:00:00Z'
  }
];
interface MutableFixture {
  catalog: { name: string; profiles: unknown[]; tools: unknown[] };
}

describe('offline router catalog signatures', () => {
  it('verifies the deterministic fixture as untrusted or trusted', () => {
    expect(verifyRouterCatalogSignature(text, [])).toMatchObject({ status: 'verified-untrusted', fingerprint });
    expect(verifyRouterCatalogSignature(text, trusted)).toMatchObject({ status: 'verified-trusted', fingerprint });
  });
  it('keeps the published canonical payload bytes deterministic', () => {
    const payload = { ...parsed };
    delete payload.signature;
    expect(canonicalJson(payload)).toBe(
      '{"catalog":{"id":"signed-test-catalog","name":"Signed Test Catalog","profiles":[],"source":"generic","tools":[],"version":1},"format":"carvd-router-catalog","version":1}'
    );
  });
  it('is insensitive to wrapper whitespace and key order', () => {
    const reordered = {
      signature: parsed.signature,
      catalog: parsed.catalog,
      version: 1,
      format: 'carvd-router-catalog'
    };
    expect(verifyRouterCatalogSignature(JSON.stringify(reordered), [])).toMatchObject({ status: 'verified-untrusted' });
  });
  it.each([
    [
      'metadata',
      (value: MutableFixture) => {
        value.catalog.name = 'Tampered';
      }
    ],
    [
      'profiles',
      (value: MutableFixture) => {
        value.catalog.profiles.push({ id: 'tampered' });
      }
    ],
    [
      'tools',
      (value: MutableFixture) => {
        value.catalog.tools.push({ id: 'tampered' });
      }
    ]
  ])('detects tampering in %s', (_name, mutate) => {
    const value = JSON.parse(text) as MutableFixture;
    mutate(value);
    expect(verifyRouterCatalogSignature(JSON.stringify(value), []).status).toBe('invalid');
  });
  it('classifies unsigned, unsupported, wrong-key, and malformed envelopes', () => {
    const unsigned = JSON.parse(text);
    delete unsigned.signature;
    expect(verifyRouterCatalogSignature(JSON.stringify(unsigned), []).status).toBe('unsigned');
    const unsupported = JSON.parse(text);
    unsupported.signature.algorithm = 'RSA';
    expect(verifyRouterCatalogSignature(JSON.stringify(unsupported), []).status).toBe('unsupported');
    const wrongKey = JSON.parse(text);
    const otherDer = generateKeyPairSync('ed25519').publicKey.export({ format: 'der', type: 'spki' });
    wrongKey.signature.publicKeySpki = otherDer.toString('base64');
    wrongKey.signature.publicKeyFingerprint = createHash('sha256').update(otherDer).digest('hex');
    expect(verifyRouterCatalogSignature(JSON.stringify(wrongKey), []).status).toBe('invalid');
    const oversized = JSON.parse(text);
    oversized.signature.signature = 'A'.repeat(513);
    expect(verifyRouterCatalogSignature(JSON.stringify(oversized), []).status).toBe('invalid');
  });
});
