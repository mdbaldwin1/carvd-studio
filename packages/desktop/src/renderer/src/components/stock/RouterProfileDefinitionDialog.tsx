import { useEffect, useMemo, useRef, useState, type ComponentProps, type SetStateAction } from 'react';
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
import type { RouterProfileDefinition, RouterProfileSegment } from '@renderer/types';
import { cloneRouterProfileDefinition, validateEdgeRouterProfileDefinition } from '@renderer/utils/routerProfiles';
import { evaluateRouterProfileBoundary } from '@renderer/utils/edgeProfileShape';
import { validateRouterProfileContour } from '@renderer/utils/routerProfileDxf';
import { RouterProfilePreview } from '@renderer/components/part-cuts/RouterProfilePreview';
import { RouterProfileInteractiveEditor } from './RouterProfileInteractiveEditor';
import {
  analyzeRouterProfileContinuity,
  enforceRouterProfileJoinTangent
} from '@renderer/utils/routerProfileContinuity';

export function createBlankRouterProfile(): RouterProfileDefinition {
  return {
    version: 1,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `router-profile-${Date.now()}`,
    name: 'New Router Profile',
    family: 'Custom',
    source: 'generic',
    parameters: {},
    boundary: { start: { u: 0, v: 0.25 }, segments: [{ kind: 'line', to: { u: 0.25, v: 0 } }] }
  };
}

const number = (value: string) => (Number.isFinite(Number(value)) ? Number(value) : 0);
/** Keep exact canonical values in state while presenting shop-friendly decimal precision. */
export const formatProfileEditorNumber = (value: number) => Number(value.toFixed(4)).toString();

function ProfileNumberInput({ value, onChange, ...props }: ComponentProps<typeof Input>) {
  const [text, setText] = useState(String(value ?? ''));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(String(value ?? ''));
  }, [value]);
  return (
    <Input
      {...props}
      value={text}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(event) => {
        setText(event.target.value);
        // Preserve intermediate decimal and negative input instead of replacing it with zero.
        if (event.target.value.trim() && Number.isFinite(Number(event.target.value))) onChange?.(event);
      }}
      onBlur={() => {
        focused.current = false;
        setText(String(value ?? ''));
      }}
    />
  );
}

export function RouterProfileDefinitionDialog({
  open,
  initialProfile,
  onOpenChange,
  onSave
}: {
  open: boolean;
  initialProfile?: RouterProfileDefinition;
  onOpenChange: (open: boolean) => void;
  onSave: (profile: RouterProfileDefinition) => Promise<void> | void;
}) {
  const [profile, setProfileRaw] = useState<RouterProfileDefinition>(() =>
    initialProfile ? cloneRouterProfileDefinition(initialProfile) : createBlankRouterProfile()
  );
  const [past, setPast] = useState<RouterProfileDefinition[]>([]);
  const [future, setFuture] = useState<RouterProfileDefinition[]>([]);
  const [batchMode, setBatchMode] = useState<'aligned' | 'mirrored'>();
  const lastEdit = useRef(0);
  const applyProfile = (action: SetStateAction<RouterProfileDefinition>, semantic = false) => {
    const next = typeof action === 'function' ? action(profile) : action;
    if (JSON.stringify(next) === JSON.stringify(profile)) return;
    const now = Date.now(),
      coalesce = !semantic && now - lastEdit.current < 500;
    if (!coalesce) setPast((items) => [...items.slice(-99), cloneRouterProfileDefinition(profile)]);
    setFuture([]);
    setProfileRaw(next);
    lastEdit.current = now;
  };
  const setProfile = (action: SetStateAction<RouterProfileDefinition>) => applyProfile(action);
  const commitProfile = (next: RouterProfileDefinition) => applyProfile(next, true);
  const undo = () => {
    const previous = past.at(-1);
    if (!previous) return;
    setPast(past.slice(0, -1));
    setFuture([cloneRouterProfileDefinition(profile), ...future].slice(0, 100));
    setProfileRaw(cloneRouterProfileDefinition(previous));
    lastEdit.current = 0;
  };
  const redo = () => {
    const next = future[0];
    if (!next) return;
    setFuture(future.slice(1));
    setPast([...past.slice(-99), cloneRouterProfileDefinition(profile)]);
    setProfileRaw(cloneRouterProfileDefinition(next));
    lastEdit.current = 0;
  };
  useEffect(() => {
    if (open) {
      setProfileRaw(initialProfile ? cloneRouterProfileDefinition(initialProfile) : createBlankRouterProfile());
      setPast([]);
      setFuture([]);
      lastEdit.current = 0;
    }
  }, [initialProfile, open]);
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.matches('input, textarea, select, [contenteditable="true"]') ||
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== 'z'
      )
        return;
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });
  const points = useMemo(() => evaluateRouterProfileBoundary(profile), [profile]);
  const errors = useMemo(() => {
    const definitionErrors = validateEdgeRouterProfileDefinition(profile);
    const contour = validateRouterProfileContour({
      start: profile.boundary.start,
      segments: profile.boundary.segments,
      closed: false
    });
    return [...definitionErrors, ...contour.errors];
  }, [profile]);
  const bounds = points.length
    ? {
        width: Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x)),
        height: Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y))
      }
    : null;
  const updateSegment = (index: number, update: Partial<RouterProfileSegment>) =>
    setProfile((current) => ({
      ...current,
      boundary: {
        ...current.boundary,
        segments: current.boundary.segments.map((segment, i) =>
          i === index ? ({ ...segment, ...update } as RouterProfileSegment) : segment
        )
      }
    }));
  const changeKind = (index: number, kind: RouterProfileSegment['kind']) => {
    const current = profile.boundary.segments[index];
    const to = current.to;
    const from = index === 0 ? profile.boundary.start : profile.boundary.segments[index - 1].to;
    const replacement: RouterProfileSegment =
      kind === 'line'
        ? { kind, to }
        : kind === 'cubicBezier'
          ? current.kind === 'cubicBezier'
            ? current
            : {
                kind,
                control1: { u: from.u + (to.u - from.u) / 3, v: from.v + (to.v - from.v) / 3 },
                control2: { u: from.u + ((to.u - from.u) * 2) / 3, v: from.v + ((to.v - from.v) * 2) / 3 },
                to
              }
          : kind === 'arc'
            ? { kind, to, radius: 0.25, clockwise: false }
            : { kind, to, radiusU: 0.25, radiusV: 0.125, clockwise: false };
    setProfile((value) => ({
      ...value,
      boundary: {
        ...value.boundary,
        segments: value.boundary.segments.map((segment, segmentIndex) =>
          segmentIndex === index ? replacement : segment
        )
      }
    }));
  };
  const move = (index: number, direction: -1 | 1) =>
    setProfile((current) => {
      const segments = [...current.boundary.segments];
      const target = index + direction;
      if (target < 0 || target >= segments.length) return current;
      [segments[index], segments[target]] = [segments[target], segments[index]];
      return { ...current, boundary: { ...current.boundary, segments } };
    });
  const continuity = analyzeRouterProfileContinuity(profile);
  const eligibleJoins = continuity.filter(({ joinIndex }) => {
    const left = profile.boundary.segments[joinIndex],
      right = profile.boundary.segments[joinIndex + 1];
    return (
      ![left.kind, right.kind].some((kind) => kind === 'arc' || kind === 'ellipseArc') &&
      (left.kind === 'cubicBezier' || right.kind === 'cubicBezier')
    );
  });
  const smoothAll = (mode: 'aligned' | 'mirrored') => {
    let next = cloneRouterProfileDefinition(profile);
    let changed = 0;
    for (const { joinIndex } of eligibleJoins) {
      const leftFrom = joinIndex === 0 ? next.boundary.start : next.boundary.segments[joinIndex - 1].to;
      const join = next.boundary.segments[joinIndex].to,
        left = next.boundary.segments[joinIndex],
        right = next.boundary.segments[joinIndex + 1];
      const result = enforceRouterProfileJoinTangent(
        { from: leftFrom, segment: left },
        { from: join, segment: right },
        { mode, anchor: right.kind === 'cubicBezier' ? 'left' : 'right' }
      );
      if (result.changed) {
        next.boundary.segments[joinIndex] = result.left.segment;
        next.boundary.segments[joinIndex + 1] = result.right.segment;
        changed += 1;
      }
    }
    const invalid = [
      ...validateEdgeRouterProfileDefinition(next),
      ...validateRouterProfileContour({ start: next.boundary.start, segments: next.boundary.segments, closed: false })
        .errors
    ];
    if (!invalid.length && changed) commitProfile(next);
    setBatchMode(undefined);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[980px] max-w-[97vw]" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <div>
            <DialogTitle>{initialProfile ? 'Edit Router Profile' : 'Create Router Profile'}</DialogTitle>
            <p className="mt-1 text-sm text-text-muted">
              Shape the finished edge with lines and curves. Drag the points in the preview or enter exact measurements.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!past.length}
              aria-label="Undo last profile edit"
              onClick={undo}
            >
              Undo
            </Button>
            <Button size="sm" variant="outline" disabled={!future.length} aria-label="Redo profile edit" onClick={redo}>
              Redo
            </Button>
          </div>
          <DialogClose onClose={() => onOpenChange(false)} />
        </DialogHeader>
        <div className="grid max-h-[70vh] gap-5 overflow-y-auto p-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="profile-editor-name">Name</Label>
                <Input
                  id="profile-editor-name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="profile-editor-family">Family</Label>
                <Input
                  id="profile-editor-family"
                  value={profile.family}
                  onChange={(e) => setProfile({ ...profile, family: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="profile-editor-source">Source</Label>
                <Select
                  id="profile-editor-source"
                  value={profile.source}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      source: e.target.value as RouterProfileDefinition['source'],
                      manufacturer: e.target.value === 'generic' ? undefined : (profile.manufacturer ?? 'Unknown')
                    })
                  }
                >
                  <option value="generic">Generic / shop-made</option>
                  <option value="manufacturer">Manufacturer</option>
                </Select>
              </div>
            </div>
            {profile.source === 'manufacturer' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="profile-editor-manufacturer">Manufacturer</Label>
                  <Input
                    id="profile-editor-manufacturer"
                    value={profile.manufacturer ?? ''}
                    onChange={(e) => setProfile({ ...profile, manufacturer: e.target.value || undefined })}
                  />
                </div>
                <div>
                  <Label htmlFor="profile-editor-sku">SKU</Label>
                  <Input
                    id="profile-editor-sku"
                    value={profile.sku ?? ''}
                    onChange={(e) => setProfile({ ...profile, sku: e.target.value || undefined })}
                  />
                </div>
              </div>
            )}
            <fieldset className="rounded-md border border-border p-3">
              <legend className="px-1 text-sm font-semibold">Start Point</legend>
              <p className="mb-2 text-xs text-text-muted">
                Measure inward from the stock corner along its two faces, in inches. Drag the profile in the preview to
                shape the edge.
              </p>
              <svg
                viewBox="0 0 220 78"
                role="img"
                aria-label="Profile width and depth measured inward from the stock corner"
                className="mb-2 h-20 w-full"
              >
                <path d="M25 15 H190 V65 H25 Z" fill="currentColor" opacity=".12" />
                <path d="M25 65 V15 H190 M25 15 L90 55" fill="none" stroke="currentColor" strokeWidth="2" />
                <text x="82" y="11" fill="currentColor" fontSize="11">
                  In from edge →
                </text>
                <text x="32" y="75" fill="currentColor" fontSize="11">
                  ↓ Depth from face
                </text>
              </svg>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="profile-start-u">In from edge</Label>
                  <ProfileNumberInput
                    id="profile-start-u"
                    type="number"
                    step="any"
                    value={profile.boundary.start.u}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        boundary: {
                          ...profile.boundary,
                          start: { ...profile.boundary.start, u: number(e.target.value) }
                        }
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="profile-start-v">Depth from face</Label>
                  <ProfileNumberInput
                    id="profile-start-v"
                    type="number"
                    step="any"
                    value={profile.boundary.start.v}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        boundary: {
                          ...profile.boundary,
                          start: { ...profile.boundary.start, v: number(e.target.value) }
                        }
                      })
                    }
                  />
                </div>
              </div>
            </fieldset>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="mb-2 text-left font-semibold">Connected profile segments</caption>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Kind</th>
                    <th scope="col">End inset</th>
                    <th scope="col">End depth</th>
                    <th scope="col">Curve</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.boundary.segments.map((segment, index) => (
                    <tr key={index}>
                      <th scope="row">{index + 1}</th>
                      <td>
                        <Select
                          aria-label={`Segment ${index + 1} kind`}
                          value={segment.kind}
                          onChange={(e) => changeKind(index, e.target.value as RouterProfileSegment['kind'])}
                        >
                          <option value="line">Line</option>
                          <option value="cubicBezier">Cubic Bézier</option>
                          <option value="arc">Circular arc</option>
                          <option value="ellipseArc">Ellipse arc</option>
                        </Select>
                      </td>
                      <td>
                        <ProfileNumberInput
                          aria-label={`Segment ${index + 1} endpoint inset`}
                          type="number"
                          step="any"
                          value={segment.to.u}
                          onChange={(e) => updateSegment(index, { to: { ...segment.to, u: number(e.target.value) } })}
                        />
                      </td>
                      <td>
                        <ProfileNumberInput
                          aria-label={`Segment ${index + 1} endpoint depth`}
                          type="number"
                          step="any"
                          value={segment.to.v}
                          onChange={(e) => updateSegment(index, { to: { ...segment.to, v: number(e.target.value) } })}
                        />
                      </td>
                      <td>
                        {segment.kind === 'cubicBezier' ? (
                          <div className="grid min-w-52 grid-cols-2 gap-1">
                            <ProfileNumberInput
                              aria-label={`Segment ${index + 1} control 1 inset`}
                              type="number"
                              step="any"
                              value={formatProfileEditorNumber(segment.control1.u)}
                              onChange={(e) =>
                                updateSegment(index, { control1: { ...segment.control1, u: number(e.target.value) } })
                              }
                            />
                            <ProfileNumberInput
                              aria-label={`Segment ${index + 1} control 1 depth`}
                              type="number"
                              step="any"
                              value={formatProfileEditorNumber(segment.control1.v)}
                              onChange={(e) =>
                                updateSegment(index, { control1: { ...segment.control1, v: number(e.target.value) } })
                              }
                            />
                            <ProfileNumberInput
                              aria-label={`Segment ${index + 1} control 2 inset`}
                              type="number"
                              step="any"
                              value={formatProfileEditorNumber(segment.control2.u)}
                              onChange={(e) =>
                                updateSegment(index, { control2: { ...segment.control2, u: number(e.target.value) } })
                              }
                            />
                            <ProfileNumberInput
                              aria-label={`Segment ${index + 1} control 2 depth`}
                              type="number"
                              step="any"
                              value={formatProfileEditorNumber(segment.control2.v)}
                              onChange={(e) =>
                                updateSegment(index, { control2: { ...segment.control2, v: number(e.target.value) } })
                              }
                            />
                            <span className="col-span-2 text-[10px] text-text-muted">
                              Control 1 inset/depth · Control 2 inset/depth
                            </span>
                            <Button
                              className="col-span-2"
                              size="xs"
                              variant="outline"
                              onClick={() => {
                                const from =
                                  index === 0 ? profile.boundary.start : profile.boundary.segments[index - 1].to;
                                updateSegment(index, {
                                  control1: {
                                    u: from.u + (segment.to.u - from.u) / 3,
                                    v: from.v + (segment.to.v - from.v) / 3
                                  },
                                  control2: {
                                    u: from.u + ((segment.to.u - from.u) * 2) / 3,
                                    v: from.v + ((segment.to.v - from.v) * 2) / 3
                                  }
                                });
                              }}
                            >
                              Reset cubic controls to straight
                            </Button>
                          </div>
                        ) : segment.kind === 'arc' ? (
                          <>
                            <ProfileNumberInput
                              aria-label={`Segment ${index + 1} radius`}
                              type="number"
                              min="0"
                              step="any"
                              value={segment.radius}
                              onChange={(e) => updateSegment(index, { radius: number(e.target.value) })}
                            />
                            <Label>
                              <Checkbox
                                checked={segment.clockwise}
                                onChange={(e) => updateSegment(index, { clockwise: e.target.checked })}
                              />{' '}
                              Clockwise
                            </Label>
                          </>
                        ) : segment.kind === 'ellipseArc' ? (
                          <>
                            <ProfileNumberInput
                              aria-label={`Segment ${index + 1} horizontal radius`}
                              type="number"
                              min="0"
                              step="any"
                              value={segment.radiusU}
                              onChange={(e) => updateSegment(index, { radiusU: number(e.target.value) })}
                            />
                            <ProfileNumberInput
                              aria-label={`Segment ${index + 1} depth radius`}
                              type="number"
                              min="0"
                              step="any"
                              value={segment.radiusV}
                              onChange={(e) => updateSegment(index, { radiusV: number(e.target.value) })}
                            />
                            <Label>
                              <Checkbox
                                checked={segment.clockwise}
                                onChange={(e) => updateSegment(index, { clockwise: e.target.checked })}
                              />{' '}
                              Clockwise
                            </Label>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <Button
                            size="xs"
                            variant="ghost"
                            aria-label={`Move segment ${index + 1} up`}
                            disabled={index === 0}
                            onClick={() => move(index, -1)}
                          >
                            ↑
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            aria-label={`Move segment ${index + 1} down`}
                            disabled={index === profile.boundary.segments.length - 1}
                            onClick={() => move(index, 1)}
                          >
                            ↓
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            aria-label={`Delete segment ${index + 1}`}
                            disabled={profile.boundary.segments.length === 1}
                            onClick={() =>
                              setProfile({
                                ...profile,
                                boundary: {
                                  ...profile.boundary,
                                  segments: profile.boundary.segments.filter((_, i) => i !== index)
                                }
                              })
                            }
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const last = profile.boundary.segments.at(-1)!.to;
                  setProfile({
                    ...profile,
                    boundary: {
                      ...profile.boundary,
                      segments: [...profile.boundary.segments, { kind: 'line', to: { u: last.u + 0.25, v: last.v } }]
                    }
                  });
                }}
              >
                Add Segment
              </Button>
            </div>
          </div>
          <aside className="space-y-3">
            <RouterProfileInteractiveEditor profile={profile} onChange={commitProfile} />
            <Button
              size="sm"
              variant="outline"
              disabled={!eligibleJoins.length}
              onClick={() => setBatchMode('aligned')}
            >
              Smooth eligible joins…
            </Button>
            {batchMode && (
              <section
                role="dialog"
                aria-label="Confirm smooth eligible joins"
                className="rounded-md border border-border p-3 text-sm"
              >
                <p>
                  <strong>
                    Smooth {eligibleJoins.length} eligible {eligibleJoins.length === 1 ? 'join' : 'joins'}?
                  </strong>
                </p>
                <p>
                  Joins: {eligibleJoins.map(({ joinIndex }) => joinIndex + 1).join(', ')}. Intentional corners in this
                  explicit list will be changed. {continuity.length - eligibleJoins.length} unsupported or degenerate
                  joins will be skipped.
                </p>
                <Label>
                  Lock style
                  <Select
                    aria-label="Batch tangent lock mode"
                    value={batchMode}
                    onChange={(event) => setBatchMode(event.target.value as 'aligned' | 'mirrored')}
                  >
                    <option value="aligned">Aligned</option>
                    <option value="mirrored">Mirrored</option>
                  </Select>
                </Label>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={() => smoothAll(batchMode)}>
                    Confirm smooth joins
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setBatchMode(undefined)}>
                    Cancel
                  </Button>
                </div>
              </section>
            )}
            <div className="rounded-md border border-border bg-bg-secondary p-3">
              <RouterProfilePreview profile={profile} label="Custom router profile live preview" />
            </div>
            {bounds && (
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-text-muted">Width</dt>
                  <dd>{bounds.width.toFixed(4)} in</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Height</dt>
                  <dd>{bounds.height.toFixed(4)} in</dd>
                </div>
              </dl>
            )}
            <p className="text-xs text-text-muted">
              Each segment starts where the previous segment ends, so the stored definition remains connected.
            </p>
            {errors.length ? (
              <div role="alert" className="rounded-md border border-danger/40 p-3 text-sm text-danger">
                <p className="font-semibold">Profile needs attention</p>
                <ul className="mt-1 list-disc pl-5">
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p role="status" className="text-sm text-success">
                Profile is valid and ready to save.
              </p>
            )}
          </aside>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={errors.length > 0}
            onClick={async () => {
              await onSave(cloneRouterProfileDefinition(profile));
              onOpenChange(false);
            }}
          >
            Save Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
