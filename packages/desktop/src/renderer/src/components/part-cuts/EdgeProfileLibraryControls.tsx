import { useState } from 'react';
import { DocsLink } from '../common/library/DocsLink';
import { useRouterProfileLibrary } from '@renderer/hooks/useRouterProfileLibrary';
import { useRouterToolLibrary } from '@renderer/hooks/useRouterToolLibrary';
import { Button } from '@renderer/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog';
import { Label } from '@renderer/components/ui/label';
import { Select } from '@renderer/components/ui/select';
import type { EdgeProfileDraft } from '@renderer/components/part-features/partFeatureEditorState';
import type { Part, PartFeature } from '@renderer/types';
import {
  cloneRouterProfileDefinition,
  getEdgeProfileLibraryStatus,
  getRouterProfileRevision
} from '@renderer/utils/routerProfiles';
import {
  cloneRouterToolDefinition,
  getEdgeProfileToolLibraryStatus,
  getRouterToolProfileCompatibility,
  getRouterToolRevision
} from '@renderer/utils/routerTools';
import { RouterProfilePreview } from './RouterProfilePreview';
import {
  buildRouterProfileBatchUpdate,
  type RouterProfileUpdateTarget
} from '@renderer/utils/routerProfileBatchUpdate';
import { RouterToolFeasibilitySummary } from './RouterToolFeasibilitySummary';

export function EdgeProfileLibraryControls({
  draft,
  features,
  part,
  onChange,
  onBatchChange
}: {
  draft: EdgeProfileDraft;
  features: PartFeature[];
  part: Part;
  onChange: (draft: EdgeProfileDraft) => void;
  onBatchChange: (features: PartFeature[]) => void;
}) {
  const { profiles } = useRouterProfileLibrary();
  const { tools } = useRouterToolLibrary();
  const [compareOpen, setCompareOpen] = useState(false);
  const [confirmTargets, setConfirmTargets] = useState<RouterProfileUpdateTarget[] | null>(null);
  const [batchResult, setBatchResult] = useState<string | null>(null);
  const [linkedChange, setLinkedChange] = useState<{
    tool: (typeof tools)[number];
    link: NonNullable<(typeof tools)[number]['producedProfiles']>[number];
  } | null>(null);
  const profileStatus = getEdgeProfileLibraryStatus(draft, profiles);
  const latestProfile = profiles.find((profile) => profile.id === draft.routerProfileId);
  const toolStatus = getEdgeProfileToolLibraryStatus(draft, tools);
  const latestTool = tools.find((tool) => tool.id === draft.routerToolId);
  const assignedTool = draft.routerToolSnapshot;
  const profileForCompatibility = draft.routerProfileSnapshot ?? latestProfile;
  const assignedCompatibility =
    assignedTool && profileForCompatibility
      ? getRouterToolProfileCompatibility(assignedTool, profileForCompatibility)
      : undefined;
  const assignedCompatible = !assignedCompatibility || assignedCompatibility.quality !== 'mismatch';
  const compatibilityLabel = (quality: ReturnType<typeof getRouterToolProfileCompatibility>['quality']) =>
    ({
      exact: 'Exact certified',
      geometrically_equivalent: 'Geometry equivalent',
      scalable: 'Manufacturer-certified scalable',
      family_compatible: 'Family-only unverified',
      missing_linkage: 'Family-only unverified',
      mismatch: 'Incompatible'
    })[quality];
  const rankedTools = [...tools].sort((left, right) => {
    if (!profileForCompatibility) return left.name.localeCompare(right.name);
    const rank = {
      exact: 0,
      geometrically_equivalent: 1,
      scalable: 2,
      family_compatible: 3,
      missing_linkage: 4,
      mismatch: 5
    };
    return (
      rank[getRouterToolProfileCompatibility(left, profileForCompatibility).quality] -
        rank[getRouterToolProfileCompatibility(right, profileForCompatibility).quality] ||
      left.name.localeCompare(right.name)
    );
  });
  const matchingCuts = latestProfile
    ? features.filter(
        (feature) =>
          feature.kind === 'edge_profile' &&
          feature.profile === 'custom' &&
          feature.routerProfileId === latestProfile.id &&
          feature.routerProfileRevision !== getRouterProfileRevision(latestProfile)
      )
    : [];

  return (
    <>
      <DocsLink section="router-profiles">Profile and physical tool guide</DocsLink>
      {draft.profile === 'custom' && draft.routerProfileSnapshot && (
        <div className="property-group rounded-md border border-border p-3">
          {profileStatus === 'current' && <p className="text-xs text-success">Library profile is current.</p>}
          {profileStatus === 'changed' && (
            <>
              <p className="text-xs text-warning">
                The library profile has changed. This cut is keeping its embedded project version.
              </p>
              <Button className="mt-2" size="xs" variant="outline" onClick={() => setCompareOpen(true)}>
                Compare Versions…
              </Button>
            </>
          )}
          {profileStatus === 'missing' && (
            <p role="alert" className="text-xs text-warning">
              The library profile is missing. This cut will continue using its embedded project version.
            </p>
          )}
        </div>
      )}
      <div className="property-group">
        <Label htmlFor="edge-profile-router-tool">Physical Router Tool</Label>
        <Select
          id="edge-profile-router-tool"
          value={draft.routerToolId ?? ''}
          onChange={(event) => {
            const tool = tools.find((candidate) => candidate.id === event.target.value);
            onChange({
              ...draft,
              routerToolId: tool?.id,
              routerToolRevision: tool ? getRouterToolRevision(tool) : undefined,
              routerToolSnapshot: tool ? cloneRouterToolDefinition(tool) : undefined
            });
          }}
        >
          <option value="">Generic profile — no tool assigned</option>
          {rankedTools.map((tool) => {
            const compatibility = profileForCompatibility
              ? getRouterToolProfileCompatibility(tool, profileForCompatibility)
              : undefined;
            return (
              <option key={tool.id} value={tool.id} disabled={compatibility?.quality === 'mismatch'}>
                {tool.name}
                {compatibility ? ` — ${compatibilityLabel(compatibility.quality)}` : ''}
              </option>
            );
          })}
        </Select>
        <p className="mt-1 text-[11px] text-text-muted">
          The profile defines geometry. The assigned tool records the physical cutter for fabrication.
        </p>
        {profileForCompatibility &&
          rankedTools.flatMap((tool) =>
            getRouterToolProfileCompatibility(tool, profileForCompatibility).quality === 'mismatch'
              ? (tool.producedProfiles?.slice(0, 1).map((link) => (
                  <Button
                    key={`${tool.id}-${link.profileId}`}
                    className="mt-2 mr-2"
                    size="xs"
                    variant="outline"
                    onClick={() => setLinkedChange({ tool, link })}
                  >
                    Use {tool.name} and linked profile {link.profileSnapshot.name}…
                  </Button>
                )) ?? [])
              : []
          )}
        <RouterToolFeasibilitySummary draft={draft} part={part} />
        {toolStatus === 'changed' && (
          <div className="mt-2 rounded-md border border-warning/50 p-2 text-xs text-warning">
            The library tool changed; this cut keeps its assigned snapshot.{' '}
            <Button
              size="xs"
              variant="outline"
              className="ml-2"
              onClick={() =>
                latestTool &&
                onChange({
                  ...draft,
                  routerToolRevision: getRouterToolRevision(latestTool),
                  routerToolSnapshot: cloneRouterToolDefinition(latestTool)
                })
              }
            >
              Update Assigned Tool
            </Button>
          </div>
        )}
        {toolStatus === 'missing' && (
          <p role="alert" className="mt-2 text-xs text-warning">
            The assigned tool was deleted from the library. Its project snapshot is preserved.
          </p>
        )}
        {!assignedCompatible && (
          <p role="alert" className="mt-2 text-xs text-warning">
            This tool’s profile family does not match the selected edge profile. Geometry is unchanged, but verify the
            cutter before fabrication.
          </p>
        )}
        {assignedCompatibility?.quality === 'family_compatible' && (
          <p role="status" className="mt-2 text-xs text-warning">
            Family-only unverified: this legacy tool has no immutable certified profile link.
          </p>
        )}
        {assignedCompatibility?.quality === 'scalable' && (
          <p role="status" className="mt-2 text-xs text-warning">
            Manufacturer-certified scalable geometry. Confirm feeds, bearing contact, setup, and safe operating speed
            separately.
          </p>
        )}
      </div>
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-3xl" onClose={() => setCompareOpen(false)}>
          <DialogHeader>
            <div>
              <DialogTitle>Compare Router Profile Versions</DialogTitle>
              <p className="mt-1 text-sm text-text-muted">
                Updating is explicit. Keeping the project version leaves this cut unchanged.
              </p>
            </div>
            <DialogClose onClose={() => setCompareOpen(false)} />
          </DialogHeader>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {draft.routerProfileSnapshot && (
              <section aria-label="Project profile version" className="rounded-md border border-border p-3">
                <h3 className="font-semibold">Project version</h3>
                <RouterProfilePreview profile={draft.routerProfileSnapshot} label="Project profile preview" />
                <p className="text-xs text-text-muted">
                  Revision {draft.routerProfileRevision ?? getRouterProfileRevision(draft.routerProfileSnapshot)}
                </p>
                <p className="text-xs">
                  {draft.routerProfileSnapshot.name} · {draft.routerProfileSnapshot.family}
                </p>
              </section>
            )}
            {latestProfile && (
              <section aria-label="Library profile version" className="rounded-md border border-border p-3">
                <h3 className="font-semibold">Latest library version</h3>
                <RouterProfilePreview profile={latestProfile} label="Latest library profile preview" />
                <p className="text-xs text-text-muted">Revision {getRouterProfileRevision(latestProfile)}</p>
                <p className="text-xs">
                  {latestProfile.name} · {latestProfile.family}
                </p>
              </section>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompareOpen(false)}>
              Keep Project Version
            </Button>
            {matchingCuts.length > 1 && (
              <Button
                variant="outline"
                onClick={() =>
                  setConfirmTargets(
                    matchingCuts.map((feature) => ({
                      featureId: feature.id,
                      expectedRevision: feature.kind === 'edge_profile' ? feature.routerProfileRevision : undefined
                    }))
                  )
                }
              >
                Update All {matchingCuts.length} Cuts…
              </Button>
            )}
            <Button
              disabled={!latestProfile}
              onClick={() => {
                if (latestProfile)
                  onChange({
                    ...draft,
                    routerProfileRevision: getRouterProfileRevision(latestProfile),
                    routerProfileSnapshot: cloneRouterProfileDefinition(latestProfile)
                  });
                setCompareOpen(false);
              }}
            >
              Update This Cut
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={linkedChange !== null}
        onOpenChange={(open) => {
          if (!open) setLinkedChange(null);
        }}
      >
        <DialogContent className="max-w-3xl" onClose={() => setLinkedChange(null)}>
          <DialogHeader>
            <div>
              <DialogTitle>Change Profile and Physical Tool?</DialogTitle>
              <p className="mt-1 text-sm text-text-muted">
                This deliberate combined action changes the modeled edge geometry and assigns the tool’s immutable
                certified snapshots.
              </p>
            </div>
            <DialogClose onClose={() => setLinkedChange(null)} />
          </DialogHeader>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {profileForCompatibility && (
              <section aria-label="Current edge profile">
                <h3 className="font-semibold">Before: {profileForCompatibility.name}</h3>
                <RouterProfilePreview profile={profileForCompatibility} label="Current profile before tool change" />
              </section>
            )}
            {linkedChange && (
              <section aria-label="Linked edge profile">
                <h3 className="font-semibold">After: {linkedChange.link.profileSnapshot.name}</h3>
                <RouterProfilePreview
                  profile={linkedChange.link.profileSnapshot}
                  label="Linked profile after tool change"
                />
                <p className="text-xs text-text-muted">
                  Tool: {linkedChange.tool.name} · certified revision {linkedChange.link.profileRevision.slice(0, 8)}
                </p>
              </section>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkedChange(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!linkedChange) return;
                onChange({
                  ...draft,
                  profile: 'custom',
                  routerProfileId: linkedChange.link.profileId,
                  routerProfileRevision: linkedChange.link.profileRevision,
                  routerProfileSnapshot: cloneRouterProfileDefinition(linkedChange.link.profileSnapshot),
                  routerToolId: linkedChange.tool.id,
                  routerToolRevision: getRouterToolRevision(linkedChange.tool),
                  routerToolSnapshot: cloneRouterToolDefinition(linkedChange.tool)
                });
                setLinkedChange(null);
              }}
            >
              Use Tool and Linked Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={confirmTargets !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmTargets(null);
        }}
      >
        <DialogContent className="max-w-lg" onClose={() => setConfirmTargets(null)}>
          <DialogHeader>
            <div>
              <DialogTitle>Update All Matching Cuts?</DialogTitle>
              <p className="mt-1 text-sm text-text-muted">
                Scope: current part, “{part.name}”. This is one undoable change.
              </p>
            </div>
            <DialogClose onClose={() => setConfirmTargets(null)} />
          </DialogHeader>
          <div className="p-5">
            <p className="text-sm">{confirmTargets?.length ?? 0} cuts will use the latest library snapshot:</p>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {confirmTargets?.map((target) => {
                const feature = features.find((candidate) => candidate.id === target.featureId);
                return (
                  <li key={target.featureId}>
                    {feature?.label?.trim() || `Edge profile ${features.indexOf(feature!) + 1}`}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-text-muted">
              Cuts changed or removed before confirmation are skipped. Size, depth, edge placement, and compatible tool
              assignments are preserved.
            </p>
            {batchResult && (
              <p role="status" className="mt-3 text-sm">
                {batchResult}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTargets(null)}>
              Cancel
            </Button>
            <Button
              disabled={!latestProfile || !confirmTargets?.length}
              onClick={() => {
                if (!latestProfile || !confirmTargets) return;
                try {
                  const result = buildRouterProfileBatchUpdate(features, latestProfile, confirmTargets);
                  if (result.updatedFeatureIds.length) onBatchChange(result.features);
                  const details = [
                    `Updated ${result.updatedFeatureIds.length} cut${result.updatedFeatureIds.length === 1 ? '' : 's'}.`
                  ];
                  if (result.skippedFeatureIds.length)
                    details.push(
                      `Skipped ${result.skippedFeatureIds.length} stale cut${result.skippedFeatureIds.length === 1 ? '' : 's'}.`
                    );
                  if (result.clearedToolFeatureIds.length)
                    details.push(
                      `Cleared ${result.clearedToolFeatureIds.length} incompatible tool assignment${result.clearedToolFeatureIds.length === 1 ? '' : 's'}.`
                    );
                  setBatchResult(details.join(' '));
                  if (!result.skippedFeatureIds.length) {
                    setConfirmTargets(null);
                    setCompareOpen(false);
                  }
                } catch (error) {
                  setBatchResult(error instanceof Error ? error.message : 'No cuts were updated.');
                }
              }}
            >
              Confirm Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
