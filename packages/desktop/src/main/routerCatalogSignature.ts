import { createHash, createPublicKey, verify } from 'node:crypto';
import type { RouterCatalogSignatureVerification } from '../shared/electronAPI';
import { canonicalJson } from '../shared/canonicalJson';
import { findTrustedRouterPublisher, parseTrustedRouterPublishers } from '../shared/routerPublisherTrust';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

export function verifyRouterCatalogSignature(text: string, trustValue: unknown): RouterCatalogSignatureVerification {
  if (Buffer.byteLength(text, 'utf8') > MAX_FILE_BYTES)
    return { status: 'invalid', reason: 'Catalog exceeds signature verification limit.' };
  let wrapper: unknown;
  try {
    wrapper = JSON.parse(text);
  } catch {
    return { status: 'invalid', reason: 'Catalog is not valid JSON.' };
  }
  if (
    !isRecord(wrapper) ||
    wrapper.format !== 'carvd-router-catalog' ||
    wrapper.version !== 1 ||
    !isRecord(wrapper.catalog)
  )
    return { status: 'invalid', reason: 'Catalog wrapper is invalid.' };
  if (wrapper.signature === undefined) return { status: 'unsigned' };
  if (!isRecord(wrapper.signature)) return { status: 'invalid', reason: 'Signature envelope is malformed.' };
  const envelope = wrapper.signature;
  const keyId = typeof envelope.publisherKeyId === 'string' ? envelope.publisherKeyId : undefined;
  const fingerprint = typeof envelope.publicKeyFingerprint === 'string' ? envelope.publicKeyFingerprint : undefined;
  if (
    Object.keys(envelope).some(
      (key) =>
        ![
          'algorithm',
          'publisherKeyId',
          'publicKeySpki',
          'publicKeyFingerprint',
          'payloadHash',
          'signature',
          'signedAt',
          'certificate',
          'source'
        ].includes(key)
    )
  )
    return {
      status: 'invalid',
      publisherKeyId: keyId,
      fingerprint,
      reason: 'Signature envelope has unsupported properties.'
    };
  if (envelope.algorithm !== 'Ed25519')
    return {
      status: 'unsupported',
      publisherKeyId: keyId,
      fingerprint,
      reason: 'Only Ed25519 catalog signatures are supported.'
    };
  if (
    !keyId ||
    keyId.length > 200 ||
    !fingerprint ||
    !/^[0-9a-f]{64}$/.test(fingerprint) ||
    typeof envelope.publicKeySpki !== 'string' ||
    envelope.publicKeySpki.length > 2048 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(envelope.publicKeySpki) ||
    typeof envelope.payloadHash !== 'string' ||
    !/^[0-9a-f]{64}$/.test(envelope.payloadHash) ||
    typeof envelope.signature !== 'string' ||
    envelope.signature.length > 512 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(envelope.signature) ||
    typeof envelope.signedAt !== 'string' ||
    envelope.signedAt.length > 100 ||
    !/^\d{4}-\d{2}-\d{2}T/.test(envelope.signedAt) ||
    (envelope.certificate !== undefined &&
      (typeof envelope.certificate !== 'string' || envelope.certificate.length > 4096)) ||
    (envelope.source !== undefined && (typeof envelope.source !== 'string' || envelope.source.length > 1000))
  )
    return { status: 'invalid', publisherKeyId: keyId, fingerprint, reason: 'Signature envelope is malformed.' };
  try {
    const publicKeyDer = Buffer.from(envelope.publicKeySpki, 'base64');
    const signature = Buffer.from(envelope.signature, 'base64');
    if (
      signature.length !== 64 ||
      publicKeyDer.length === 0 ||
      publicKeyDer.length > 1024 ||
      digest(publicKeyDer) !== fingerprint
    )
      throw new Error('key');
    const payload = Buffer.from(
      canonicalJson({ format: wrapper.format, version: wrapper.version, catalog: wrapper.catalog }),
      'utf8'
    );
    if (digest(payload) !== envelope.payloadHash)
      return {
        status: 'invalid',
        publisherKeyId: keyId,
        fingerprint,
        reason: 'Signed payload hash does not match catalog content.'
      };
    const publicKey = createPublicKey({ key: publicKeyDer, format: 'der', type: 'spki' });
    if (publicKey.asymmetricKeyType !== 'ed25519' || !verify(null, payload, publicKey, signature))
      return { status: 'invalid', publisherKeyId: keyId, fingerprint, reason: 'Signature verification failed.' };
    const trusted = findTrustedRouterPublisher(
      parseTrustedRouterPublishers(trustValue),
      keyId,
      fingerprint,
      envelope.publicKeySpki
    );
    return {
      status: trusted ? 'verified-trusted' : 'verified-untrusted',
      publisherKeyId: keyId,
      fingerprint,
      publicKeySpki: envelope.publicKeySpki,
      signedAt: envelope.signedAt,
      payloadHash: envelope.payloadHash,
      source: typeof envelope.source === 'string' ? envelope.source : undefined
    };
  } catch {
    return { status: 'invalid', publisherKeyId: keyId, fingerprint, reason: 'Signature key or bytes are invalid.' };
  }
}
