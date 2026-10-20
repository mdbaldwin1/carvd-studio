import { useState } from 'react';

import { Button } from '@renderer/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog';
import { cn } from '@renderer/lib/utils';
import type { EdgeProfile, RouterProfileDefinition } from '@renderer/types';
import { getNormalizedEdgeProfileBoundary } from '@renderer/utils/edgeProfileShape';
import { useRouterProfileLibrary } from '@renderer/hooks/useRouterProfileLibrary';
import { DxfRouterProfileImportDialog } from './DxfRouterProfileImportDialog';
import { SvgRouterProfileImportDialog } from './SvgRouterProfileImportDialog';
import { RouterProfilePreview } from './RouterProfilePreview';
import { RouterProfileDefinitionDialog } from '@renderer/components/stock/RouterProfileDefinitionDialog';
import { parseRouterProfileFile } from '@renderer/utils/routerProfiles';

const OPTIONS: Array<{ profile: EdgeProfile; name: string; description: string }> = [
  { profile: 'roundover', name: 'Roundover', description: 'Rounds the sharp corner to a smooth radius.' },
  { profile: 'cove', name: 'Cove', description: 'Cuts a concave quarter-round into the edge.' },
  { profile: 'chamfer', name: 'Chamfer', description: 'Creates a straight beveled edge.' },
  { profile: 'rabbet', name: 'Rabbet', description: 'Cuts a square shoulder along the edge.' },
  { profile: 'bead', name: 'Bead', description: 'Forms a small rounded decorative edge.' },
  { profile: 'ogee', name: 'Ogee', description: 'Creates a flowing S-shaped decorative profile.' },
  { profile: 'thumbnail', name: 'Thumbnail', description: 'Makes a broad shallow tabletop edge.' }
];

function ProfilePreview({ profile }: { profile: EdgeProfile }) {
  const boundary = getNormalizedEdgeProfileBoundary(profile, 20);
  const mapped = boundary.map((point) => `${102 - point.x * 34} ${18 + point.y * 38}`).join(' L');
  const path = `M18 18 L${mapped} V70`;
  return (
    <svg viewBox="0 0 120 82" role="img" aria-label={`${profile} edge profile`} className="h-24 w-full">
      <path d="M8 8 H112 V74 H8 Z" fill="var(--color-surface-hover)" stroke="var(--color-border)" />
      <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth="4" strokeLinejoin="round" />
      <path d="M18 18 H102" stroke="var(--color-text-muted)" strokeDasharray="3 3" />
    </svg>
  );
}

export function EdgeProfileSelector({
  value,
  customProfileId,
  onSelect
}: {
  value: EdgeProfile;
  customProfileId?: string;
  onSelect: (value: EdgeProfile, customProfile?: RouterProfileDefinition) => void;
}) {
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [svgImportOpen, setSvgImportOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const { profiles, addProfile } = useRouterProfileLibrary();
  const selectedCustom = profiles.find((profile) => profile.id === customProfileId);
  const selected = OPTIONS.find((option) => option.profile === value) ?? OPTIONS[0];
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between"
        aria-label="Choose edge profile"
        onClick={() => setOpen(true)}
      >
        <span>{value === 'custom' ? (selectedCustom?.name ?? 'Custom Profile') : selected.name}</span>
        <span className="text-[11px] font-normal text-text-muted">View profiles…</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl" onClose={() => setOpen(false)}>
          <DialogHeader>
            <div>
              <DialogTitle>Choose Edge Profile</DialogTitle>
              <DialogDescription className="mt-1">
                Choose the finished cross-section that will run along the selected stock edge.
              </DialogDescription>
            </div>
            <DialogClose onClose={() => setOpen(false)} />
          </DialogHeader>
          <div className="grid gap-3 overflow-y-auto p-5 sm:grid-cols-2 lg:grid-cols-3">
            {OPTIONS.map((option) => {
              const active = option.profile === value;
              return (
                <button
                  key={option.profile}
                  type="button"
                  aria-label={`Select ${option.name} edge profile`}
                  aria-pressed={active}
                  onClick={() => {
                    onSelect(option.profile);
                    setOpen(false);
                  }}
                  className={cn(
                    'rounded-md border bg-surface p-3 text-left transition-colors hover:border-accent hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-accent',
                    active ? 'border-accent ring-1 ring-accent' : 'border-border'
                  )}
                >
                  <ProfilePreview profile={option.profile} />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="font-semibold text-text">{option.name}</span>
                    {active ? <span className="text-xs font-semibold text-accent">Selected</span> : null}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">{option.description}</p>
                </button>
              );
            })}
            {profiles.map((profile) => {
              const active = value === 'custom' && profile.id === customProfileId;
              return (
                <button
                  key={profile.id}
                  type="button"
                  aria-label={`Select ${profile.name} custom edge profile`}
                  aria-pressed={active}
                  onClick={() => {
                    onSelect('custom', profile);
                    setOpen(false);
                  }}
                  className={cn(
                    'rounded-md border bg-surface p-3 text-left transition-colors hover:border-accent hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-accent',
                    active ? 'border-accent ring-1 ring-accent' : 'border-border'
                  )}
                >
                  <RouterProfilePreview profile={profile} />
                  <div className="mt-2 font-semibold text-text">{profile.name}</div>
                  <p className="mt-1 text-xs text-text-muted">Custom · {profile.family}</p>
                </button>
              );
            })}
            <Button
              type="button"
              variant="outline"
              className="min-h-32"
              onClick={() => {
                setOpen(false);
                setEditorOpen(true);
              }}
            >
              Create Custom Profile…
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-32"
              onClick={async () => {
                const result = await window.electronAPI.showOpenDialog({
                  title: 'Import Router Profile',
                  properties: ['openFile'],
                  filters: [{ name: 'Carvd router profile', extensions: ['carvd-profile'] }]
                });
                if (!result.canceled && result.filePaths[0]) {
                  const profile = parseRouterProfileFile(await window.electronAPI.readFile(result.filePaths[0]));
                  profile.id =
                    typeof crypto !== 'undefined' && crypto.randomUUID
                      ? crypto.randomUUID()
                      : `router-profile-${Date.now()}`;
                  await addProfile(profile);
                  onSelect('custom', profile);
                  setOpen(false);
                }
              }}
            >
              Import Profile…
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-32"
              onClick={() => {
                setOpen(false);
                setImportOpen(true);
              }}
            >
              Import DXF Profile…
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-32"
              onClick={() => {
                setOpen(false);
                setSvgImportOpen(true);
              }}
            >
              Import SVG Profile…
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <DxfRouterProfileImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onApply={(profile) => {
          onSelect('custom', profile);
          setOpen(false);
        }}
      />
      <SvgRouterProfileImportDialog
        open={svgImportOpen}
        onOpenChange={setSvgImportOpen}
        onApply={(profile) => {
          onSelect('custom', profile);
          setOpen(false);
        }}
      />
      <RouterProfileDefinitionDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSave={async (profile) => {
          await addProfile(profile);
          onSelect('custom', profile);
        }}
      />
    </>
  );
}
