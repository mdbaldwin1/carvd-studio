import { useEffect, useRef, useState } from 'react';
import { Button } from '@renderer/components/ui/button';
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
import type { RouterProfileDefinition, RouterToolDefinition } from '@renderer/types';
import { stringifyRouterProfileFile } from '@renderer/utils/routerProfiles';
import { stringifyRouterToolFile } from '@renderer/utils/routerTools';
import {
  getTrustedPublisherRevision,
  parseTrustedRouterPublishers,
  removeTrustedRouterPublisher,
  type TrustedRouterPublisher
} from '../../../../shared/routerPublisherTrust';

export const EXAMPLE_CUBIC_PROFILE: RouterProfileDefinition = {
  version: 1,
  id: 'example-cubic-profile',
  name: 'Example Cubic Edge',
  family: 'Custom',
  source: 'generic',
  parameters: { units: 'inches' },
  boundary: {
    start: { u: 0, v: 0.25 },
    segments: [
      { kind: 'cubicBezier', control1: { u: 0.08, v: 0.25 }, control2: { u: 0.25, v: 0.08 }, to: { u: 0.25, v: 0 } }
    ]
  }
};

export const EXAMPLE_DETAILED_TOOL: RouterToolDefinition = {
  version: 1,
  id: 'example-bearing-tool',
  name: 'Example Detailed Bearing Tool',
  source: 'manufacturer',
  manufacturer: 'Example Manufacturer',
  sku: 'EX-100',
  profileFamily: 'Custom',
  cutterDiameter: 0.5,
  shankDiameter: 0.25,
  cuttingHeight: 0.5,
  bearingDiameter: 0.375,
  envelopeVersion: 1,
  sections: [
    { role: 'bearing', start: -0.125, end: 0, diameter: 0.375 },
    { role: 'cutter', start: 0, end: 0.5, diameter: 0.5 },
    { role: 'shank', start: 0.5, end: 1.5, diameter: 0.25 }
  ],
  overallLength: 2,
  safeColletInsertion: 0.5
};

async function saveExample(kind: 'profile' | 'tool') {
  const profile = kind === 'profile';
  const result = await window.electronAPI.showSaveDialog({
    title: profile ? 'Save Example Router Profile' : 'Save Example Router Tool',
    defaultPath: profile ? 'example-cubic.carvd-profile' : 'example-bearing.carvd-tool',
    filters: [
      {
        name: profile ? 'Carvd router profile' : 'Carvd router tool',
        extensions: [profile ? 'carvd-profile' : 'carvd-tool']
      }
    ]
  });
  if (!result.canceled && result.filePath)
    await window.electronAPI.writeFile(
      result.filePath,
      profile ? stringifyRouterProfileFile(EXAMPLE_CUBIC_PROFILE) : stringifyRouterToolFile(EXAMPLE_DETAILED_TOOL)
    );
}

export function RouterInterchangeHelpDialog({
  open,
  onOpenChange,
  initialSection = 'profile'
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSection?: 'profile' | 'tool';
}) {
  const [message, setMessage] = useState('');
  const [publishers, setPublishers] = useState<TrustedRouterPublisher[]>([]);
  const [editingKey, setEditingKey] = useState('');
  const [publisherName, setPublisherName] = useState('');
  const [removingKey, setRemovingKey] = useState('');
  const wasOpen = useRef(false);
  const opener = useRef<HTMLElement | null>(null);
  if (open && !wasOpen.current)
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  wasOpen.current = open;
  useEffect(() => {
    const getPreference = window.electronAPI?.getPreference;
    if (open && typeof getPreference === 'function')
      void getPreference('trustedRouterPublishers').then((value) => setPublishers(parseTrustedRouterPublishers(value)));
  }, [open]);
  const persistPublishers = async (next: TrustedRouterPublisher[]) => {
    await window.electronAPI.setPreference('trustedRouterPublishers', next);
    setPublishers(next);
  };
  const renamePublisher = async (publisher: TrustedRouterPublisher) => {
    if (!publisherName.trim()) return;
    const changed: TrustedRouterPublisher = { ...publisher, displayName: publisherName.trim(), revision: undefined };
    changed.revision = getTrustedPublisherRevision(changed);
    await persistPublishers(publishers.map((item) => (item.keyId === publisher.keyId ? changed : item)));
    setEditingKey('');
  };
  const runSave = async (kind: 'profile' | 'tool') => {
    try {
      await saveExample(kind);
      setMessage('Example saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The example could not be saved.');
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[720px] max-w-[95vw]"
        onClose={() => onOpenChange(false)}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          opener.current?.focus();
        }}
      >
        <DialogHeader>
          <div>
            <DialogTitle>Router interchange formats & examples</DialogTitle>
            <p className="mt-1 text-sm text-text-muted">What Carvd reads, preserves, and intentionally rejects.</p>
          </div>
          <DialogClose onClose={() => onOpenChange(false)} />
        </DialogHeader>
        <div className="max-h-[68vh] space-y-4 overflow-y-auto p-5 text-sm">
          <section aria-labelledby="carvd-profile-format">
            <h3 id="carvd-profile-format" className="font-semibold">
              .carvd-profile — version 1
            </h3>
            <p>
              Lossless JSON for one canonical edge profile. Coordinates are inches: U and V begin at the stock corner
              and endpoints must finish on its two incident face axes. Lines, circular arcs, ellipse arcs, and cubic
              Bézier segments are supported. Embedded project snapshots remain immutable; library revisions never update
              cuts automatically.
            </p>
            <Button
              className="mt-2"
              size="sm"
              variant="outline"
              autoFocus={initialSection === 'profile'}
              onClick={() => runSave('profile')}
            >
              Save cubic profile example…
            </Button>
          </section>
          <section aria-labelledby="carvd-tool-format">
            <h3 id="carvd-tool-format" className="font-semibold">
              .carvd-tool — version 1
            </h3>
            <p>
              Lossless JSON for one physical cutter. Basic dimensions are conservative estimates. Optional detailed
              axial sections use offsets from the tip toward the collet; negative offsets are allowed for below-tip
              bearings. Project assignments preserve an immutable tool snapshot and revision.
            </p>
            <Button
              className="mt-2"
              size="sm"
              variant="outline"
              autoFocus={initialSection === 'tool'}
              onClick={() => runSave('tool')}
            >
              Save detailed bearing tool example…
            </Button>
          </section>
          <section aria-labelledby="dxf-format">
            <h3 id="dxf-format" className="font-semibold">
              DXF
            </h3>
            <p>
              ASCII planar LINE, ARC, CIRCLE, LWPOLYLINE/POLYLINE, and supported SPLINE contours. Declared insertion
              units are converted to inches; unknown units require confirmation. Lines and supported curves stay exact,
              while rational or higher-degree splines may be bounded approximations. Blocks, binary data, excessive
              entities, and unbounded coordinates are rejected.
            </p>
          </section>
          <section aria-labelledby="svg-format">
            <h3 id="svg-format" className="font-semibold">
              SVG
            </h3>
            <p>
              Inert path geometry only, with explicit unit/scale review. Lines and cubic/quadratic paths import exactly
              where canonical representation permits; unsupported arcs are bounded approximations. Scripts, event
              handlers, external references, embedded content, styles, and unsafe URLs are rejected.
            </p>
          </section>
          <section aria-labelledby="catalog-format">
            <h3 id="catalog-format" className="font-semibold">
              .carvd-router-catalog — version 1
            </h3>
            <p>
              A deterministic validated bundle of selected profiles, physical tools, immutable certified dependencies,
              and manufacturer provenance. Carvd exports catalogs unsigned; external signing is a separate publisher
              workflow. Import clearly distinguishes unsigned, valid-untrusted, trusted, modified, and unsupported
              signatures. Manufacturer/source metadata is descriptive and never establishes publisher identity. Import
              review plans additions, updates, identical skips, and ID conflicts before one atomic two-library
              transaction.
            </p>
          </section>
          <section aria-labelledby="trusted-publishers">
            <h3 id="trusted-publishers" className="font-semibold">
              Trusted publishers
            </h3>
            <p className="text-text-muted">
              Only public verification keys are stored. Carvd never imports or generates private signing keys.
            </p>
            {publishers.length === 0 ? (
              <p className="mt-2">No publisher keys trusted.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {publishers.map((publisher) => (
                  <li key={publisher.keyId} className="rounded-md border border-border p-3">
                    <strong>{publisher.displayName}</strong>
                    <p className="text-xs">Key ID: {publisher.keyId}</p>
                    <p className="break-all text-xs">
                      Fingerprint: {publisher.fingerprint.match(/.{1,4}/g)?.join(' ')}
                    </p>
                    <p className="text-xs text-text-muted">
                      Added {new Date(publisher.addedAt).toLocaleDateString()}
                      {publisher.source ? ` · ${publisher.source}` : ''}
                    </p>
                    {editingKey === publisher.keyId ? (
                      <div className="mt-2 flex gap-2">
                        <Label className="flex-1">
                          Publisher name
                          <Input value={publisherName} onChange={(event) => setPublisherName(event.target.value)} />
                        </Label>
                        <Button
                          size="sm"
                          disabled={!publisherName.trim()}
                          onClick={() => void renamePublisher(publisher)}
                        >
                          Save name
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingKey('')}>
                          Cancel
                        </Button>
                      </div>
                    ) : removingKey === publisher.keyId ? (
                      <div className="mt-2" role="alert">
                        <p>Remove trust for this publisher? Signed catalogs will return to untrusted status.</p>
                        <Button
                          className="mr-2 mt-2"
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            void persistPublishers(removeTrustedRouterPublisher(publishers, publisher.keyId)).then(() =>
                              setRemovingKey('')
                            )
                          }
                        >
                          Confirm removal
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRemovingKey('')}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingKey(publisher.keyId);
                            setPublisherName(publisher.displayName);
                          }}
                        >
                          Rename
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRemovingKey(publisher.keyId)}>
                          Remove trust…
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <aside className="rounded-md border border-border bg-bg p-3">
            <strong>Import correction tips</strong>
            <p className="mt-1 text-text-muted">
              Version errors require export from a compatible Carvd release. Schema errors name the affected JSON path.
              Geometry errors require a connected, non-self-intersecting corner-removal contour. Never paste an entire
              source file into an error report.
            </p>
          </aside>
          {message && <p role="status">{message}</p>}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function describeRouterImportError(error: unknown, fileName: string) {
  const raw = error instanceof Error ? error.message : 'The file could not be read.';
  const message = raw.slice(0, 600);
  const lower = message.toLowerCase();
  const category = lower.includes('version')
    ? 'Version mismatch'
    : lower.includes('script') ||
        lower.includes('external') ||
        lower.includes('unsafe') ||
        lower.includes('binary') ||
        lower.includes('limit')
      ? 'Security restriction'
      : lower.includes('json') || lower.includes('carvd router') || lower.includes('group code')
        ? 'Format error'
        : lower.includes('profile.') ||
            lower.includes('tool.') ||
            lower.includes('sections') ||
            lower.includes('boundary')
          ? 'Schema or semantic error'
          : 'Import error';
  const action =
    category === 'Version mismatch'
      ? 'Export the file from a compatible Carvd release.'
      : category === 'Security restriction'
        ? 'Remove active, external, binary, or excessively large content and try again.'
        : category === 'Format error'
          ? 'Choose the matching file type and verify the file is complete.'
          : 'Correct the named field, contour, or tool section and import again.';
  return { category, message: `${fileName}: ${message}`, action };
}

export function ImportDiagnostic({ diagnostic }: { diagnostic: ReturnType<typeof describeRouterImportError> }) {
  return (
    <div role="alert" className="rounded-md border border-danger/40 p-3 text-sm">
      <p className="font-semibold text-danger">{diagnostic.category}</p>
      <p className="mt-1 break-words text-text">{diagnostic.message}</p>
      <p className="mt-1 text-text-muted">{diagnostic.action}</p>
    </div>
  );
}
