import { canonicalJson } from './canonicalJson';

export interface TrustedRouterPublisher {
  version: 1;
  revision?: string;
  keyId: string;
  displayName: string;
  publicKeySpki: string;
  fingerprint: string;
  source?: string;
  addedAt: string;
}

const MAX_PUBLISHERS = 128;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
export function getTrustedPublisherRevision(publisher: TrustedRouterPublisher): string {
  const input = canonicalJson(publisher, ['revision']);
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}
export function validateTrustedRouterPublisher(value: unknown): value is TrustedRouterPublisher {
  if (
    !isRecord(value) ||
    Object.keys(value).some(
      (key) =>
        !['version', 'revision', 'keyId', 'displayName', 'publicKeySpki', 'fingerprint', 'source', 'addedAt'].includes(
          key
        )
    )
  )
    return false;
  const text = (key: string, max: number) =>
    typeof value[key] === 'string' && value[key].trim().length > 0 && value[key].length <= max;
  if (
    value.version !== 1 ||
    !text('keyId', 200) ||
    !text('displayName', 200) ||
    !text('publicKeySpki', 2048) ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(String(value.publicKeySpki)) ||
    !/^[0-9a-f]{64}$/.test(String(value.fingerprint)) ||
    !text('addedAt', 100) ||
    !/^\d{4}-\d{2}-\d{2}T/.test(String(value.addedAt))
  )
    return false;
  if (value.source !== undefined && !text('source', 1000)) return false;
  return (
    value.revision === undefined ||
    value.revision === getTrustedPublisherRevision(value as unknown as TrustedRouterPublisher)
  );
}
export function parseTrustedRouterPublishers(value: unknown): TrustedRouterPublisher[] {
  if (!Array.isArray(value) || value.length > MAX_PUBLISHERS) return [];
  const seen = new Set<string>();
  const fingerprints = new Set<string>();
  return value.flatMap((publisher) => {
    if (
      !validateTrustedRouterPublisher(publisher) ||
      seen.has(publisher.keyId) ||
      fingerprints.has(publisher.fingerprint)
    )
      return [];
    seen.add(publisher.keyId);
    fingerprints.add(publisher.fingerprint);
    return [{ ...publisher, revision: getTrustedPublisherRevision(publisher) }];
  });
}
export function addTrustedRouterPublisher(
  current: readonly TrustedRouterPublisher[],
  publisher: TrustedRouterPublisher
): TrustedRouterPublisher[] {
  if (
    !validateTrustedRouterPublisher(publisher) ||
    current.length >= MAX_PUBLISHERS ||
    current.some((item) => item.keyId === publisher.keyId || item.fingerprint === publisher.fingerprint)
  )
    throw new Error('Trusted publisher is invalid, duplicate, or the trust store is full.');
  return [...current.map((item) => ({ ...item })), { ...publisher, revision: getTrustedPublisherRevision(publisher) }];
}
export const removeTrustedRouterPublisher = (current: readonly TrustedRouterPublisher[], keyId: string) =>
  current.filter((publisher) => publisher.keyId !== keyId).map((publisher) => ({ ...publisher }));
export const findTrustedRouterPublisher = (
  current: readonly TrustedRouterPublisher[],
  keyId: string,
  fingerprint: string,
  publicKeySpki?: string
) =>
  current.find(
    (publisher) =>
      publisher.keyId === keyId &&
      publisher.fingerprint === fingerprint &&
      (publicKeySpki === undefined || publisher.publicKeySpki === publicKeySpki)
  );
