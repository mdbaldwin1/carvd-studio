import { useMemo, useState } from 'react';
import { Button } from '@renderer/components/ui/button';
import { Checkbox } from '@renderer/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Select } from '@renderer/components/ui/select';
import { useRouterProfileLibrary } from '@renderer/hooks/useRouterProfileLibrary';
import { useRouterToolLibrary } from '@renderer/hooks/useRouterToolLibrary';
import { useUIStore } from '@renderer/store/uiStore';
import type { RouterCatalogDefinition, RouterProfileDefinition, RouterToolDefinition } from '@renderer/types';
import { parseRouterCatalogFileWithVerification, planRouterCatalogImport } from '@renderer/utils/routerCatalogs';
import type { RouterCatalogSignatureVerification } from '../../../../shared/electronAPI';
import { addTrustedRouterPublisher, parseTrustedRouterPublishers } from '../../../../shared/routerPublisherTrust';
import { buildRouterCatalogLibraries, installRouterCatalogLibraries } from '@renderer/utils/routerCatalogInstall';
import {
  cloneRouterProfileDefinition,
  parseRouterProfileLibrary,
  withRouterProfileRevision
} from '@renderer/utils/routerProfiles';
import { cloneRouterToolDefinition, parseRouterToolLibrary } from '@renderer/utils/routerTools';
import { describeRouterImportError, ImportDiagnostic } from './RouterInterchangeHelpDialog';

type Resolution = 'keep' | 'new';
type Hashes = { profileLibraryHash: string; toolLibraryHash: string };
const keyOf = (kind: 'profile' | 'tool', id: string) => `${kind}-${id}`;
async function sha256(value: unknown): Promise<string> {
  const bytes = new window.TextEncoder().encode(JSON.stringify(value));
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
async function hashes(
  profiles: readonly RouterProfileDefinition[],
  tools: readonly RouterToolDefinition[]
): Promise<Hashes> {
  return { profileLibraryHash: await sha256(profiles), toolLibraryHash: await sha256(tools) };
}

export function buildResolvedCatalog(
  catalog: RouterCatalogDefinition,
  plan: ReturnType<typeof planRouterCatalogImport>,
  resolutions: Record<string, Resolution>
): RouterCatalogDefinition {
  const remappedProfiles = new Map<string, RouterProfileDefinition>();
  const profiles = catalog.profiles.flatMap((source) => {
    const item = plan.find((entry) => entry.kind === 'profile' && entry.id === source.id);
    if (item?.action === 'conflict' && resolutions[keyOf('profile', source.id)] === 'keep') return [];
    const profile = cloneRouterProfileDefinition(source);
    if (item?.action === 'conflict') profile.id = `${source.id}-import-${catalog.id}`;
    const revised = withRouterProfileRevision(profile);
    remappedProfiles.set(source.id, revised);
    return [revised];
  });
  const tools = catalog.tools.flatMap((source) => {
    const item = plan.find((entry) => entry.kind === 'tool' && entry.id === source.id);
    if (item?.action === 'conflict' && resolutions[keyOf('tool', source.id)] === 'keep') return [];
    const tool = cloneRouterToolDefinition(source);
    if (item?.action === 'conflict') tool.id = `${source.id}-import-${catalog.id}`;
    tool.producedProfiles = tool.producedProfiles?.map((link) => {
      const profile = remappedProfiles.get(link.profileId);
      return profile
        ? {
            ...link,
            profileId: profile.id,
            profileRevision: profile.revision!,
            profileSnapshot: cloneRouterProfileDefinition(profile)
          }
        : link;
    });
    tool.revision = undefined;
    return [tool];
  });
  return { ...catalog, profiles, tools };
}

export function RouterCatalogImportDialog({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  useRouterProfileLibrary();
  useRouterToolLibrary();
  const showToast = useUIStore((state) => state.showToast);
  const [catalog, setCatalog] = useState<RouterCatalogDefinition>();
  const [reviewProfiles, setReviewProfiles] = useState<RouterProfileDefinition[]>([]);
  const [reviewTools, setReviewTools] = useState<RouterToolDefinition[]>([]);
  const [expectedCurrent, setExpectedCurrent] = useState<Hashes>();
  const [fileName, setFileName] = useState('');
  const [diagnostic, setDiagnostic] = useState<ReturnType<typeof describeRouterImportError>>();
  const [message, setMessage] = useState('');
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({});
  const [verification, setVerification] = useState<RouterCatalogSignatureVerification>();
  const [acknowledged, setAcknowledged] = useState(false);
  const [trustOpen, setTrustOpen] = useState(false);
  const [trustName, setTrustName] = useState('');
  const [trustSource, setTrustSource] = useState('');
  const [fingerprintConfirmed, setFingerprintConfirmed] = useState(false);
  const plan = useMemo(
    () => (catalog ? planRouterCatalogImport(catalog, reviewProfiles, reviewTools) : []),
    [catalog, reviewProfiles, reviewTools]
  );
  const conflicts = plan.filter((item) => item.action === 'conflict');
  const unresolved = conflicts.filter((item) => !resolutions[keyOf(item.kind, item.id)]);
  const counts = (action: 'add' | 'update' | 'skip') =>
    plan.filter((item) => item.action === action).length +
    (action === 'skip'
      ? conflicts.filter((item) => resolutions[keyOf(item.kind, item.id)] === 'keep').length
      : action === 'add'
        ? conflicts.filter((item) => resolutions[keyOf(item.kind, item.id)] === 'new').length
        : 0);
  const chooseFile = async () => {
    const choice = await window.electronAPI.showOpenDialog({
      title: 'Import Router Catalog',
      properties: ['openFile'],
      filters: [{ name: 'Carvd router catalog', extensions: ['carvd-router-catalog'] }]
    });
    if (choice.canceled || !choice.filePaths[0]) return;
    const path = choice.filePaths[0];
    const name = path.split(/[\\/]/).pop() ?? path;
    setFileName(name);
    try {
      const text = await window.electronAPI.readFile(path);
      const parsed = await parseRouterCatalogFileWithVerification(text);
      const currentProfiles = parseRouterProfileLibrary(await window.electronAPI.getPreference('routerProfileLibrary'));
      const currentTools = parseRouterToolLibrary(await window.electronAPI.getPreference('routerToolLibrary'));
      setCatalog(parsed.catalog);
      setVerification(parsed.verification);
      setAcknowledged(false);
      setReviewProfiles(currentProfiles);
      setReviewTools(currentTools);
      setExpectedCurrent(await hashes(currentProfiles, currentTools));
      setDiagnostic(undefined);
      setResolutions({});
      setMessage('');
    } catch (error) {
      setCatalog(undefined);
      setDiagnostic(describeRouterImportError(error, name));
    }
  };
  const trustPublisher = async () => {
    if (
      !verification?.publisherKeyId ||
      !verification.fingerprint ||
      !verification.publicKeySpki ||
      !fingerprintConfirmed ||
      !trustName.trim()
    )
      return;
    try {
      const current = parseTrustedRouterPublishers(await window.electronAPI.getPreference('trustedRouterPublishers'));
      const next = addTrustedRouterPublisher(current, {
        version: 1,
        keyId: verification.publisherKeyId,
        displayName: trustName.trim(),
        publicKeySpki: verification.publicKeySpki,
        fingerprint: verification.fingerprint,
        source: trustSource.trim() || verification.source,
        addedAt: new Date().toISOString()
      });
      await window.electronAPI.setPreference('trustedRouterPublishers', next);
      setVerification({ ...verification, status: 'verified-trusted' });
      setTrustOpen(false);
      setAcknowledged(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Publisher trust could not be saved.');
    }
  };
  const blockedVerification = verification?.status === 'invalid' || verification?.status === 'unsupported';
  const needsAcknowledgement = verification?.status === 'unsigned' || verification?.status === 'verified-untrusted';
  const signatureReady = verification?.status === 'verified-trusted' || (needsAcknowledgement && acknowledged);
  const verificationLabel = verification
    ? (
        {
          unsigned: 'Unsigned',
          'verified-untrusted': 'Signature valid, publisher untrusted',
          'verified-trusted': 'Verified trusted publisher',
          invalid: 'Invalid or modified',
          unsupported: 'Unsupported signature'
        } as const
      )[verification.status]
    : '';
  const install = async () => {
    if (!catalog || !expectedCurrent || unresolved.length) return;
    if (typeof window.electronAPI.transactRouterCatalogLibraries !== 'function') {
      setMessage('This older app bridge cannot install catalogs atomically. Update Carvd Studio and try again.');
      return;
    }
    try {
      const resolved = buildResolvedCatalog(catalog, plan, resolutions);
      const libraries = buildRouterCatalogLibraries(resolved, reviewProfiles, reviewTools);
      const result = await installRouterCatalogLibraries(libraries, expectedCurrent);
      if (result.status === 'success') {
        const summary = `Imported router catalog: ${counts('add')} added, ${counts('update')} updated, ${counts('skip')} skipped.`;
        showToast(summary, 'success');
        onOpenChange(false);
        return;
      }
      if (result.status === 'conflict') {
        const currentProfiles = parseRouterProfileLibrary(
          await window.electronAPI.getPreference('routerProfileLibrary')
        );
        const currentTools = parseRouterToolLibrary(await window.electronAPI.getPreference('routerToolLibrary'));
        setReviewProfiles(currentProfiles);
        setReviewTools(currentTools);
        setExpectedCurrent(result.current);
        setResolutions({});
        setMessage(
          'The router libraries changed after review. The plan was refreshed; review and resolve conflicts again.'
        );
        return;
      }
      setMessage(
        'reason' in result && result.reason === 'invalid_payload'
          ? 'Catalog installation failed final validation. Both libraries remain unchanged.'
          : 'Catalog persistence failed. Both libraries remain unchanged; try again.'
      );
    } catch (error) {
      setMessage(
        (error instanceof Error ? error.message : 'Catalog installation failed.') + ' Both libraries remain unchanged.'
      );
    }
  };
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[760px] max-w-[96vw]" onClose={() => onOpenChange(false)}>
          <DialogHeader>
            <div>
              <DialogTitle>Review Router Catalog Import</DialogTitle>
              <p className="mt-1 text-sm text-text-muted">
                Nothing changes until every conflict is resolved and the full catalog is confirmed atomically.
              </p>
            </div>
            <DialogClose onClose={() => onOpenChange(false)} />
          </DialogHeader>
          <div className="max-h-[68vh] space-y-4 overflow-y-auto p-5">
            <Button variant="outline" onClick={chooseFile}>
              Choose .carvd-router-catalog…
            </Button>
            {fileName && <p className="text-xs text-text-muted">{fileName}</p>}
            {diagnostic && <ImportDiagnostic diagnostic={diagnostic} />}
            {catalog && (
              <>
                <section
                  aria-label="Catalog signature"
                  role={blockedVerification ? 'alert' : 'status'}
                  className="rounded-md border border-border p-3"
                >
                  <h3 className="font-semibold">{verificationLabel}</h3>
                  <p className="text-sm text-text-muted">
                    {verification?.reason ??
                      (verification?.status === 'verified-trusted'
                        ? 'The signature matches a key in your trusted publisher list.'
                        : verification?.status === 'verified-untrusted'
                          ? 'The signature is intact, but trust in this publisher has not been established.'
                          : 'This catalog has no cryptographic publisher identity.')}
                  </p>
                  {verification?.fingerprint && (
                    <details className="mt-2 text-xs">
                      <summary>Signature details</summary>
                      <dl className="mt-1 space-y-1 break-all">
                        <dt>Key ID</dt>
                        <dd>{verification.publisherKeyId}</dd>
                        <dt>Fingerprint</dt>
                        <dd>{verification.fingerprint.match(/.{1,4}/g)?.join(' ')}</dd>
                        {verification.signedAt && (
                          <>
                            <dt>Signed at</dt>
                            <dd>{verification.signedAt}</dd>
                          </>
                        )}
                        {verification.payloadHash && (
                          <>
                            <dt>Payload hash</dt>
                            <dd>{verification.payloadHash}</dd>
                          </>
                        )}
                        {verification.source && (
                          <>
                            <dt>Source metadata (not identity)</dt>
                            <dd>{verification.source}</dd>
                          </>
                        )}
                      </dl>
                    </details>
                  )}
                  {verification?.status === 'verified-untrusted' && (
                    <Button
                      className="mt-2"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTrustName('');
                        setTrustSource(verification.source ?? '');
                        setFingerprintConfirmed(false);
                        setTrustOpen(true);
                      }}
                    >
                      Trust publisher key…
                    </Button>
                  )}
                  {needsAcknowledgement && (
                    <Label className="mt-3 flex items-start gap-2">
                      <Checkbox checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
                      <span>
                        I understand this{' '}
                        {verification?.status === 'unsigned' ? 'catalog is unsigned' : 'publisher is not trusted'} and
                        want to import it.
                      </span>
                    </Label>
                  )}
                </section>
                <section aria-label="Catalog metadata" className="rounded-md border border-border p-3">
                  <h3 className="font-semibold">{catalog.name}</h3>
                  <p className="text-sm">
                    Format version {catalog.version} · Catalog-declared source (not identity):{' '}
                    {catalog.source === 'manufacturer' ? catalog.manufacturer : 'Generic source'}
                  </p>
                  <p className="text-xs text-text-muted">
                    {catalog.profiles.length} profiles · {catalog.tools.length} tools ·{' '}
                    {catalog.tools.reduce((count, tool) => count + (tool.producedProfiles?.length ?? 0), 0)} certified
                    links
                  </p>
                </section>
                {(['add', 'update', 'skip', 'conflict'] as const).map((action) => {
                  const items = plan.filter((item) => item.action === action);
                  return items.length ? (
                    <section key={action} aria-label={`${action} records`}>
                      <h3 className="font-semibold capitalize">
                        {action} ({items.length})
                      </h3>
                      <ul className="mt-1 space-y-1">
                        {items.map((item) => (
                          <li key={keyOf(item.kind, item.id)} className="rounded border border-border p-2 text-sm">
                            <span className="font-medium">
                              {item.kind}: {item.id}
                            </span>
                            <span className="ml-2 text-text-muted">{item.reason}</span>
                            {action === 'conflict' && (
                              <Select
                                className="mt-2"
                                aria-label={`Resolve ${item.kind} ${item.id}`}
                                value={resolutions[keyOf(item.kind, item.id)] ?? ''}
                                onChange={(event) =>
                                  setResolutions({
                                    ...resolutions,
                                    [keyOf(item.kind, item.id)]: event.target.value as Resolution
                                  })
                                }
                              >
                                <option value="">Choose resolution…</option>
                                <option value="keep">Keep existing</option>
                                <option value="new">Import as new record</option>
                              </Select>
                            )}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null;
                })}
                <section aria-label="Final import summary" className="rounded-md border border-border p-3 text-sm">
                  <strong>Confirmation summary</strong>
                  <p>
                    {counts('add')} add · {counts('update')} update · {counts('skip')} skip
                    {unresolved.length ? ` · ${unresolved.length} unresolved` : ''}
                  </p>
                </section>
              </>
            )}
            {message && (
              <p role="alert" className="rounded-md border border-warning/50 p-3 text-sm text-warning">
                {message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={!catalog || !expectedCurrent || unresolved.length > 0 || !signatureReady}
              onClick={install}
            >
              Import Catalog Atomically
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={trustOpen} onOpenChange={setTrustOpen}>
        <DialogContent className="w-[560px] max-w-[95vw]" onClose={() => setTrustOpen(false)}>
          <DialogHeader>
            <DialogTitle>Trust publisher key</DialogTitle>
            <DialogClose onClose={() => setTrustOpen(false)} />
          </DialogHeader>
          <div className="space-y-3 p-5 text-sm">
            <p>
              Verify this full fingerprint with the publisher through a separate trusted channel. Catalog manufacturer
              text is not proof of identity.
            </p>
            <p className="break-all font-mono">{verification?.fingerprint?.match(/.{1,4}/g)?.join(' ')}</p>
            <Label>
              Publisher name (your label)
              <Input value={trustName} onChange={(event) => setTrustName(event.target.value)} />
            </Label>
            <Label>
              Verification source (optional)
              <Input value={trustSource} onChange={(event) => setTrustSource(event.target.value)} />
            </Label>
            <Label className="flex items-start gap-2">
              <Checkbox
                checked={fingerprintConfirmed}
                onChange={(event) => setFingerprintConfirmed(event.target.checked)}
              />
              <span>I compared the full fingerprint out of band.</span>
            </Label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrustOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!trustName.trim() || !fingerprintConfirmed} onClick={trustPublisher}>
              Trust this public key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
