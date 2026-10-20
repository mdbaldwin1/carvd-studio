import { createHash } from 'node:crypto';

export interface RouterCatalogLibraryTransaction {
  profileLibrary: unknown[];
  toolLibrary: unknown[];
  expectedCurrent?: { profileLibraryHash: string; toolLibraryHash: string };
}
export type RouterCatalogTransactionResult =
  | { status: 'success'; current: { profileLibraryHash: string; toolLibraryHash: string } }
  | { status: 'conflict'; current: { profileLibraryHash: string; toolLibraryHash: string } }
  | { status: 'failure'; reason: 'invalid_payload' | 'persistence_failed' };

interface PreferenceStore {
  store: Record<string, unknown>;
}

const MAX_RECORDS = 512;
const MAX_SERIALIZED_BYTES = 10 * 1024 * 1024;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const nonBlank = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
const hashString = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const getRouterLibraryHashes = (profiles: unknown[], tools: unknown[]) => ({
  profileLibraryHash: hash(profiles),
  toolLibraryHash: hash(tools)
});
const onlyKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).every((key) => keys.includes(key));
const dimension = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1000;
function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .filter((key) => key !== 'revision' && value[key] !== undefined)
      .sort()
      .map((key) => [key, stableValue(value[key])])
  );
}
function contentRevision(value: unknown): string {
  const input = JSON.stringify(stableValue(value));
  let checksum = 0xcbf29ce484222325n;
  for (let index = 0; index < input.length; index += 1) {
    checksum ^= BigInt(input.charCodeAt(index));
    checksum = BigInt.asUintN(64, checksum * 0x100000001b3n);
  }
  return `fnv1a64:${checksum.toString(16).padStart(16, '0')}`;
}

function validProfile(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !onlyKeys(value, [
      'version',
      'revision',
      'id',
      'name',
      'family',
      'source',
      'manufacturer',
      'sku',
      'sourceUrl',
      'parameters',
      'boundary'
    ])
  )
    return false;
  if (
    !(
      value.version === 1 &&
      nonBlank(value.id) &&
      nonBlank(value.name) &&
      nonBlank(value.family) &&
      (value.source === 'generic' || value.source === 'manufacturer') &&
      isRecord(value.parameters) &&
      isRecord(value.boundary) &&
      onlyKeys(value.boundary, ['start', 'segments']) &&
      isRecord(value.boundary.start) &&
      onlyKeys(value.boundary.start, ['u', 'v']) &&
      dimension(value.boundary.start.u) &&
      dimension(value.boundary.start.v) &&
      Object.keys(value.parameters).length <= 256 &&
      Object.values(value.parameters).every((parameter) => typeof parameter === 'string' || dimension(parameter)) &&
      Array.isArray(value.boundary.segments) &&
      value.boundary.segments.length > 0 &&
      value.boundary.segments.length <= 2048
    )
  )
    return false;
  if (value.revision !== undefined && value.revision !== contentRevision(value)) return false;
  return value.boundary.segments.every((segment) => {
    if (
      !isRecord(segment) ||
      !isRecord(segment.to) ||
      !onlyKeys(segment.to, ['u', 'v']) ||
      !dimension(segment.to.u) ||
      !dimension(segment.to.v)
    )
      return false;
    const keys =
      segment.kind === 'line'
        ? ['kind', 'to']
        : segment.kind === 'arc'
          ? ['kind', 'to', 'radius', 'clockwise']
          : segment.kind === 'ellipseArc'
            ? ['kind', 'to', 'radiusU', 'radiusV', 'clockwise']
            : segment.kind === 'cubicBezier'
              ? ['kind', 'to', 'control1', 'control2']
              : [];
    if (!onlyKeys(segment, keys)) return false;
    if (segment.kind === 'arc')
      return dimension(segment.radius) && Number(segment.radius) > 0 && typeof segment.clockwise === 'boolean';
    if (segment.kind === 'ellipseArc')
      return (
        dimension(segment.radiusU) &&
        Number(segment.radiusU) > 0 &&
        dimension(segment.radiusV) &&
        Number(segment.radiusV) > 0 &&
        typeof segment.clockwise === 'boolean'
      );
    if (segment.kind === 'cubicBezier')
      return [segment.control1, segment.control2].every(
        (point) => isRecord(point) && onlyKeys(point, ['u', 'v']) && dimension(point.u) && dimension(point.v)
      );
    return segment.kind === 'line';
  });
}

function validTool(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !onlyKeys(value, [
      'version',
      'revision',
      'id',
      'name',
      'source',
      'manufacturer',
      'sku',
      'sourceUrl',
      'profileFamily',
      'routerProfileId',
      'producedProfiles',
      'cutterDiameter',
      'shankDiameter',
      'cuttingHeight',
      'neckDiameter',
      'bearingDiameter',
      'envelopeVersion',
      'sections',
      'overallLength',
      'safeColletInsertion'
    ]) ||
    value.version !== 1 ||
    !nonBlank(value.id) ||
    !nonBlank(value.name) ||
    !nonBlank(value.profileFamily) ||
    (value.source !== 'generic' && value.source !== 'manufacturer') ||
    !dimension(value.cutterDiameter) ||
    value.cutterDiameter <= 0 ||
    !dimension(value.shankDiameter) ||
    value.shankDiameter <= 0 ||
    !dimension(value.cuttingHeight) ||
    value.cuttingHeight <= 0
  )
    return false;
  if (value.source === 'manufacturer' && (!nonBlank(value.manufacturer) || !nonBlank(value.sku))) return false;
  if (value.revision !== undefined && value.revision !== contentRevision(value)) return false;
  if (
    value.producedProfiles !== undefined &&
    (!Array.isArray(value.producedProfiles) ||
      value.producedProfiles.length > 32 ||
      value.producedProfiles.some(
        (link) =>
          !isRecord(link) ||
          !onlyKeys(link, ['profileId', 'profileRevision', 'profileSnapshot', 'nominalSize', 'applicability']) ||
          !nonBlank(link.profileId) ||
          !nonBlank(link.profileRevision) ||
          !validProfile(link.profileSnapshot) ||
          link.profileRevision !== contentRevision(link.profileSnapshot)
      ))
  )
    return false;
  return (
    value.sections === undefined ||
    (Array.isArray(value.sections) &&
      value.sections.length > 0 &&
      value.sections.length <= 64 &&
      value.sections.every(
        (section) =>
          isRecord(section) &&
          onlyKeys(section, ['role', 'start', 'end', 'diameter', 'stackable']) &&
          ['cutter', 'neck', 'shank', 'bearing'].includes(String(section.role)) &&
          dimension(section.start) &&
          dimension(section.end) &&
          Number(section.end) > Number(section.start) &&
          dimension(section.diameter) &&
          Number(section.diameter) > 0
      ))
  );
}

export function validateRouterCatalogTransaction(value: unknown): value is RouterCatalogLibraryTransaction {
  if (
    !isRecord(value) ||
    Object.keys(value).some((key) => !['profileLibrary', 'toolLibrary', 'expectedCurrent'].includes(key))
  )
    return false;
  if (
    !Array.isArray(value.profileLibrary) ||
    value.profileLibrary.length > MAX_RECORDS ||
    value.profileLibrary.some((item) => !validProfile(item))
  )
    return false;
  if (
    !Array.isArray(value.toolLibrary) ||
    value.toolLibrary.length > MAX_RECORDS ||
    value.toolLibrary.some((item) => !validTool(item))
  )
    return false;
  if (
    value.expectedCurrent !== undefined &&
    (!isRecord(value.expectedCurrent) ||
      Object.keys(value.expectedCurrent).some((key) => !['profileLibraryHash', 'toolLibraryHash'].includes(key)) ||
      !hashString(value.expectedCurrent.profileLibraryHash) ||
      !hashString(value.expectedCurrent.toolLibraryHash))
  )
    return false;
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8') <= MAX_SERIALIZED_BYTES;
  } catch {
    return false;
  }
}

let transactionQueue: Promise<void> = Promise.resolve();

export function transactRouterCatalogLibraries(
  preferenceStore: PreferenceStore,
  payload: unknown,
  notify: (changes: { routerProfileLibrary: unknown[]; routerToolLibrary: unknown[] }) => void
): Promise<RouterCatalogTransactionResult> {
  const execute = async (): Promise<RouterCatalogTransactionResult> => {
    if (!validateRouterCatalogTransaction(payload)) return { status: 'failure', reason: 'invalid_payload' };
    const profiles = (preferenceStore.store.routerProfileLibrary as unknown[] | undefined) ?? [];
    const tools = (preferenceStore.store.routerToolLibrary as unknown[] | undefined) ?? [];
    const current = getRouterLibraryHashes(profiles, tools);
    if (
      payload.expectedCurrent &&
      (payload.expectedCurrent.profileLibraryHash !== current.profileLibraryHash ||
        payload.expectedCurrent.toolLibraryHash !== current.toolLibraryHash)
    )
      return { status: 'conflict', current };
    try {
      preferenceStore.store = {
        ...preferenceStore.store,
        routerProfileLibrary: payload.profileLibrary,
        routerToolLibrary: payload.toolLibrary
      };
    } catch {
      return { status: 'failure', reason: 'persistence_failed' };
    }
    notify({ routerProfileLibrary: payload.profileLibrary, routerToolLibrary: payload.toolLibrary });
    return { status: 'success', current: getRouterLibraryHashes(payload.profileLibrary, payload.toolLibrary) };
  };
  const result = transactionQueue.then(execute, execute);
  transactionQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}
