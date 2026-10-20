import { useEffect, useMemo, useState } from 'react';
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
import type { RouterToolAxialSection, RouterToolDefinition, RouterToolSectionRole } from '@renderer/types';
import { cloneRouterToolDefinition, validateRouterToolDefinition } from '@renderer/utils/routerTools';
import { useRouterProfileLibrary } from '@renderer/hooks/useRouterProfileLibrary';
import { cloneRouterProfileDefinition, getRouterProfileRevision } from '@renderer/utils/routerProfiles';
import { RouterProfilePreview } from '@renderer/components/part-cuts/RouterProfilePreview';

const ROLES: RouterToolSectionRole[] = ['cutter', 'neck', 'shank', 'bearing'];
const ROLE_COLOR: Record<RouterToolSectionRole, string> = {
  cutter: '#d97706',
  neck: '#0ea5e9',
  shank: '#64748b',
  bearing: '#8b5cf6'
};

export function blankRouterTool(): RouterToolDefinition {
  return {
    version: 1,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `router-tool-${Date.now()}`,
    name: 'New Router Tool',
    source: 'generic',
    profileFamily: 'Custom',
    cutterDiameter: 0.5,
    shankDiameter: 0.25,
    cuttingHeight: 0.5
  };
}

export function generateRouterToolSections(tool: RouterToolDefinition): RouterToolAxialSection[] {
  const sections: RouterToolAxialSection[] = [
    { role: 'cutter', start: 0, end: tool.cuttingHeight, diameter: tool.cutterDiameter }
  ];
  let offset = tool.cuttingHeight;
  if (tool.neckDiameter) {
    sections.push({ role: 'neck', start: offset, end: offset + tool.cuttingHeight / 2, diameter: tool.neckDiameter });
    offset += tool.cuttingHeight / 2;
  }
  sections.push({
    role: 'shank',
    start: offset,
    end: offset + Math.max(tool.cuttingHeight, tool.shankDiameter * 2),
    diameter: tool.shankDiameter
  });
  return sections;
}

export function RouterToolSilhouette({ sections }: { sections: RouterToolAxialSection[] }) {
  const bounds = useMemo(
    () => ({
      min: Math.min(0, ...sections.map((section) => section.start)),
      max: Math.max(1, ...sections.map((section) => section.end)),
      diameter: Math.max(...sections.map((section) => section.diameter), 1)
    }),
    [sections]
  );
  const y = (offset: number) => 170 - ((offset - bounds.min) / (bounds.max - bounds.min)) * 140;
  const width = (diameter: number) => (diameter / bounds.diameter) * 100;
  return (
    <figure aria-label="Detailed tool envelope preview" className="rounded-md border border-border p-3">
      <svg
        viewBox="0 0 240 190"
        className="h-44 w-full"
        role="img"
        aria-label="Axial router bit silhouette"
        aria-describedby="tool-silhouette-desc"
      >
        <title id="tool-silhouette-title">Axial router bit silhouette</title>
        <desc id="tool-silhouette-desc">
          The cutter tip is the zero datum. Sections extend upward toward the collet.
        </desc>
        <defs>
          <pattern id="bearing-pattern" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M0 6L6 0" stroke="#fff" strokeOpacity=".45" />
          </pattern>
        </defs>
        <line x1="120" y1="12" x2="120" y2="178" stroke="currentColor" strokeOpacity=".25" strokeDasharray="3 3" />
        {sections.map((section, index) => {
          const w = width(section.diameter);
          const top = y(section.end);
          const height = Math.max(2, y(section.start) - top);
          return (
            <g key={`${section.role}-${index}`}>
              <rect x={120 - w / 2} y={top} width={w} height={height} fill={ROLE_COLOR[section.role]} opacity=".8" />
              <rect
                x={120 - w / 2}
                y={top}
                width={w}
                height={height}
                fill={section.role === 'bearing' ? 'url(#bearing-pattern)' : 'none'}
              />
              <text x={126 + w / 2} y={top + height / 2 + 3} fontSize="9" fill="currentColor">
                {section.role} · Ø{section.diameter}
              </text>
            </g>
          );
        })}
        <line x1="16" y1={y(0)} x2="224" y2={y(0)} stroke="currentColor" strokeWidth="1.5" />
        <text x="16" y={y(0) - 4} fontSize="9" fill="currentColor">
          Tip / zero datum
        </text>
      </svg>
      <figcaption className="sr-only">
        <ul>
          {sections.map((section, index) => (
            <li key={index}>
              {section.role}: offset {section.start} to {section.end}, diameter {section.diameter}
              {section.stackable ? ', stackable' : ''}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}

export function RouterToolDialog({
  open,
  initialTool,
  onOpenChange,
  onSave
}: {
  open: boolean;
  initialTool?: RouterToolDefinition;
  onOpenChange: (open: boolean) => void;
  onSave: (tool: RouterToolDefinition) => Promise<void> | void;
}) {
  const [tool, setTool] = useState(() => (initialTool ? cloneRouterToolDefinition(initialTool) : blankRouterTool()));
  const [detailed, setDetailed] = useState(!!initialTool?.sections?.length);
  const [inferred, setInferred] = useState(false);
  const [linkProfileId, setLinkProfileId] = useState('');
  const { profiles } = useRouterProfileLibrary();
  useEffect(() => {
    if (open) {
      setTool(initialTool ? cloneRouterToolDefinition(initialTool) : blankRouterTool());
      setDetailed(!!initialTool?.sections?.length);
      setInferred(false);
    }
  }, [initialTool, open]);
  const errors = validateRouterToolDefinition({ ...tool, revision: undefined });
  const dimension = (
    key: 'cutterDiameter' | 'shankDiameter' | 'cuttingHeight' | 'neckDiameter' | 'bearingDiameter',
    label: string,
    optional = false
  ) => (
    <div>
      <Label htmlFor={`tool-${key}`}>
        {label}
        {optional ? ' (optional)' : ''}
      </Label>
      <Input
        id={`tool-${key}`}
        type="number"
        min="0"
        step="any"
        value={tool[key] ?? ''}
        onChange={(event) =>
          setTool({ ...tool, [key]: event.target.value === '' && optional ? undefined : Number(event.target.value) })
        }
      />
    </div>
  );
  const updateSection = (index: number, update: Partial<RouterToolAxialSection>) =>
    setTool({
      ...tool,
      sections: tool.sections?.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, ...update } : section
      )
    });
  const removeSection = (index: number) =>
    setTool({ ...tool, sections: tool.sections?.filter((_, sectionIndex) => sectionIndex !== index) });
  const moveSection = (index: number, direction: -1 | 1) => {
    const sections = [...(tool.sections ?? [])];
    const destination = index + direction;
    if (destination < 0 || destination >= sections.length) return;
    [sections[index], sections[destination]] = [sections[destination], sections[index]];
    setTool({ ...tool, sections });
  };
  const toggleDetailed = (checked: boolean) => {
    setDetailed(checked);
    if (!checked)
      setTool(
        ({
          sections: _sections,
          envelopeVersion: _version,
          overallLength: _overall,
          safeColletInsertion: _insertion,
          ...rest
        }) => rest
      );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[860px] max-w-[95vw]" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <div>
            <DialogTitle>{initialTool ? 'Edit Router Tool' : 'Create Router Tool'}</DialogTitle>
            <p className="mt-1 text-sm text-text-muted">
              Record the physical cutter used to make a profile. Geometry remains defined by the profile snapshot.
            </p>
          </div>
          <DialogClose onClose={() => onOpenChange(false)} />
        </DialogHeader>
        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="tool-name">Name</Label>
              <Input id="tool-name" value={tool.name} onChange={(e) => setTool({ ...tool, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="tool-family">Profile Family</Label>
              <Input
                id="tool-family"
                value={tool.profileFamily}
                onChange={(e) => setTool({ ...tool, profileFamily: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="tool-source">Source</Label>
              <Select
                id="tool-source"
                value={tool.source}
                onChange={(e) =>
                  setTool({
                    ...tool,
                    source: e.target.value as RouterToolDefinition['source'],
                    manufacturer: e.target.value === 'generic' ? undefined : (tool.manufacturer ?? ''),
                    sku: e.target.value === 'generic' ? undefined : (tool.sku ?? '')
                  })
                }
              >
                <option value="generic">Generic / shop tool</option>
                <option value="manufacturer">Manufacturer / catalog tool</option>
              </Select>
            </div>
            {tool.source === 'manufacturer' && (
              <>
                <div>
                  <Label htmlFor="tool-maker">Manufacturer (required)</Label>
                  <Input
                    id="tool-maker"
                    value={tool.manufacturer ?? ''}
                    onChange={(e) => setTool({ ...tool, manufacturer: e.target.value })}
                  />
                  <p className="text-[11px] text-text-muted">Brand or cutter manufacturer.</p>
                </div>
                <div>
                  <Label htmlFor="tool-sku">SKU / Model (required)</Label>
                  <Input
                    id="tool-sku"
                    value={tool.sku ?? ''}
                    onChange={(e) => setTool({ ...tool, sku: e.target.value })}
                  />
                  <p className="text-[11px] text-text-muted">Catalog SKU, model, or part number.</p>
                </div>
                <div>
                  <Label htmlFor="tool-source-url">Product Source URL (optional)</Label>
                  <Input
                    id="tool-source-url"
                    value={tool.sourceUrl ?? ''}
                    onChange={(e) => setTool({ ...tool, sourceUrl: e.target.value || undefined })}
                  />
                </div>
              </>
            )}
            {dimension('shankDiameter', 'Shank Diameter')}
            {dimension('cutterDiameter', 'Cutter Diameter')}
            {dimension('neckDiameter', 'Neck Diameter', true)}
            {dimension('bearingDiameter', 'Bearing Diameter', true)}
            {dimension('cuttingHeight', 'Cutting Height')}
          </div>
          <section aria-labelledby="produced-profiles-heading" className="rounded-md border border-border p-4">
            <h3 id="produced-profiles-heading" className="font-semibold">
              Produced profiles
            </h3>
            <p className="text-xs text-text-muted">
              Link immutable profile snapshots this exact physical tool is certified to produce.
            </p>
            <div className="mt-3 flex gap-2">
              <Select
                aria-label="Library profile to link"
                value={linkProfileId}
                onChange={(event) => setLinkProfileId(event.target.value)}
              >
                <option value="">Choose a library profile…</option>
                {profiles
                  .filter((profile) => !tool.producedProfiles?.some((link) => link.profileId === profile.id))
                  .map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} · {profile.family}
                    </option>
                  ))}
              </Select>
              <Button
                variant="outline"
                disabled={!linkProfileId}
                onClick={() => {
                  const profile = profiles.find((candidate) => candidate.id === linkProfileId);
                  if (!profile) return;
                  setTool({
                    ...tool,
                    producedProfiles: [
                      ...(tool.producedProfiles ?? []),
                      {
                        profileId: profile.id,
                        profileRevision: getRouterProfileRevision(profile),
                        profileSnapshot: cloneRouterProfileDefinition(profile)
                      }
                    ]
                  });
                  setLinkProfileId('');
                }}
              >
                Link profile
              </Button>
            </div>
            {tool.producedProfiles?.length ? (
              <ul className="mt-3 space-y-3" aria-label="Linked produced profiles">
                {tool.producedProfiles.map((link, index) => (
                  <li
                    key={link.profileId}
                    className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[100px_1fr]"
                  >
                    <RouterProfilePreview
                      profile={link.profileSnapshot}
                      label={`${link.profileSnapshot.name} linked profile preview`}
                    />
                    <div>
                      <div className="flex justify-between gap-2">
                        <p className="font-medium">{link.profileSnapshot.name}</p>
                        <Button
                          size="xs"
                          variant="ghost"
                          aria-label={`Remove ${link.profileSnapshot.name} link`}
                          onClick={() =>
                            setTool({
                              ...tool,
                              producedProfiles:
                                tool.producedProfiles?.filter((_, candidateIndex) => candidateIndex !== index) ||
                                undefined
                            })
                          }
                        >
                          Remove
                        </Button>
                      </div>
                      <p className="text-xs text-text-muted">
                        Exact snapshot · revision {link.profileRevision.slice(0, 8)}
                      </p>
                      <Label htmlFor={`profile-nominal-${index}`}>Nominal Size (optional)</Label>
                      <Input
                        id={`profile-nominal-${index}`}
                        type="number"
                        min="0"
                        step="any"
                        value={link.nominalSize ?? ''}
                        onChange={(event) => {
                          const value = event.target.value ? Number(event.target.value) : undefined;
                          setTool({
                            ...tool,
                            producedProfiles: tool.producedProfiles?.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, nominalSize: value } : item
                            )
                          });
                        }}
                      />
                      <Label className="mt-2 flex items-center gap-2">
                        <Checkbox
                          checked={!!link.applicability?.scalable}
                          onChange={(event) =>
                            setTool({
                              ...tool,
                              producedProfiles: tool.producedProfiles?.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      applicability: event.target.checked
                                        ? { scalable: true, minScale: 0.5, maxScale: 2 }
                                        : undefined
                                    }
                                  : item
                              )
                            })
                          }
                        />
                        Manufacturer-certified uniform scaling
                      </Label>
                      {link.applicability?.scalable && (
                        <>
                          <p role="alert" className="my-1 text-xs text-warning">
                            Geometry scaling certification does not certify feeds, bearing contact, router setup, or
                            safe operating speed.
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label htmlFor={`profile-min-scale-${index}`}>Minimum Scale</Label>
                              <Input
                                id={`profile-min-scale-${index}`}
                                type="number"
                                min="0"
                                step="any"
                                value={link.applicability.minScale ?? ''}
                                onChange={(event) =>
                                  setTool({
                                    ...tool,
                                    producedProfiles: tool.producedProfiles?.map((item, itemIndex) =>
                                      itemIndex === index
                                        ? {
                                            ...item,
                                            applicability: {
                                              ...item.applicability!,
                                              minScale: event.target.value ? Number(event.target.value) : undefined
                                            }
                                          }
                                        : item
                                    )
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label htmlFor={`profile-max-scale-${index}`}>Maximum Scale</Label>
                              <Input
                                id={`profile-max-scale-${index}`}
                                type="number"
                                min="0"
                                step="any"
                                value={link.applicability.maxScale ?? ''}
                                onChange={(event) =>
                                  setTool({
                                    ...tool,
                                    producedProfiles: tool.producedProfiles?.map((item, itemIndex) =>
                                      itemIndex === index
                                        ? {
                                            ...item,
                                            applicability: {
                                              ...item.applicability!,
                                              maxScale: event.target.value ? Number(event.target.value) : undefined
                                            }
                                          }
                                        : item
                                    )
                                  })
                                }
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-text-muted">
                No certified profile links. Family-only matching remains unverified.
              </p>
            )}
          </section>
          <section aria-labelledby="detailed-envelope-heading" className="rounded-md border border-border p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="detailed-envelope"
                checked={detailed}
                onChange={(event) => toggleDetailed(event.target.checked)}
              />
              <div>
                <Label id="detailed-envelope-heading" htmlFor="detailed-envelope">
                  Detailed tool envelope
                </Label>
                <p className="text-xs text-text-muted">
                  Optional measured axial sections improve reach and clearance analysis. Offsets start at the cutter tip
                  and increase toward the collet.
                </p>
              </div>
            </div>
            {detailed && (
              <div className="mt-4 space-y-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTool({ ...tool, envelopeVersion: 1, sections: generateRouterToolSections(tool) });
                    setInferred(true);
                  }}
                >
                  Generate sections from simple dimensions
                </Button>
                {inferred && (
                  <p role="status" className="text-xs text-warning">
                    Inferred starting values — review every offset before relying on feasibility results. Bearing
                    position is never inferred.
                  </p>
                )}
                {(tool.sections?.length ?? 0) > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <caption className="sr-only">Axial tool envelope sections</caption>
                        <thead>
                          <tr>
                            <th>Role</th>
                            <th>Start offset</th>
                            <th>End offset</th>
                            <th>Diameter</th>
                            <th>Options</th>
                            <th>Order</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tool.sections?.map((section, index) => (
                            <tr key={index}>
                              <td>
                                <Select
                                  aria-label={`Section ${index + 1} role`}
                                  value={section.role}
                                  onChange={(e) =>
                                    updateSection(index, {
                                      role: e.target.value as RouterToolSectionRole,
                                      stackable: e.target.value === 'bearing' ? section.stackable : undefined
                                    })
                                  }
                                >
                                  {ROLES.map((role) => (
                                    <option key={role} value={role}>
                                      {role}
                                    </option>
                                  ))}
                                </Select>
                              </td>
                              <td>
                                <Input
                                  aria-label={`Section ${index + 1} start offset`}
                                  type="number"
                                  step="any"
                                  value={section.start}
                                  onChange={(e) => updateSection(index, { start: Number(e.target.value) })}
                                />
                              </td>
                              <td>
                                <Input
                                  aria-label={`Section ${index + 1} end offset`}
                                  type="number"
                                  step="any"
                                  value={section.end}
                                  onChange={(e) => updateSection(index, { end: Number(e.target.value) })}
                                />
                              </td>
                              <td>
                                <Input
                                  aria-label={`Section ${index + 1} diameter`}
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={section.diameter}
                                  onChange={(e) => updateSection(index, { diameter: Number(e.target.value) })}
                                />
                              </td>
                              <td>
                                {section.role === 'bearing' && (
                                  <Label className="flex items-center gap-1">
                                    <Checkbox
                                      checked={!!section.stackable}
                                      onChange={(event) =>
                                        updateSection(index, { stackable: event.target.checked || undefined })
                                      }
                                    />
                                    Stackable
                                  </Label>
                                )}
                              </td>
                              <td className="whitespace-nowrap">
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  aria-label={`Move section ${index + 1} up`}
                                  disabled={index === 0}
                                  onClick={() => moveSection(index, -1)}
                                >
                                  ↑
                                </Button>
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  aria-label={`Move section ${index + 1} down`}
                                  disabled={index === (tool.sections?.length ?? 0) - 1}
                                  onClick={() => moveSection(index, 1)}
                                >
                                  ↓
                                </Button>
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  aria-label={`Delete section ${index + 1}`}
                                  onClick={() => removeSection(index)}
                                >
                                  Delete
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <Button
                        className="mt-2"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setTool({
                            ...tool,
                            envelopeVersion: 1,
                            sections: [
                              ...(tool.sections ?? []),
                              {
                                role: 'bearing',
                                start: 0,
                                end: Math.max(0.125, tool.cuttingHeight / 4),
                                diameter: tool.bearingDiameter ?? tool.shankDiameter,
                                stackable: true
                              }
                            ]
                          })
                        }
                      >
                        Add section
                      </Button>
                    </div>
                    <RouterToolSilhouette sections={tool.sections ?? []} />
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">
                    Generate a reviewable starting envelope or add a measured section.
                  </p>
                )}
                {tool.source === 'manufacturer' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="tool-overall-length">Overall Length (optional)</Label>
                      <Input
                        id="tool-overall-length"
                        type="number"
                        min="0"
                        step="any"
                        value={tool.overallLength ?? ''}
                        onChange={(e) =>
                          setTool({ ...tool, overallLength: e.target.value ? Number(e.target.value) : undefined })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="tool-collet-insertion">Safe Collet Insertion (optional)</Label>
                      <Input
                        id="tool-collet-insertion"
                        type="number"
                        min="0"
                        step="any"
                        value={tool.safeColletInsertion ?? ''}
                        onChange={(e) =>
                          setTool({ ...tool, safeColletInsertion: e.target.value ? Number(e.target.value) : undefined })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
        {errors.length > 0 && (
          <div role="alert" className="mx-5 rounded-md border border-danger/40 p-3 text-sm text-danger">
            <p className="font-semibold">Fix these structural envelope issues before saving:</p>
            <ul className="mt-1 list-disc pl-5">
              {errors.map((error) => (
                <li key={error}>{error.replace(/^routerTool\./, '').replaceAll('sections', 'Detailed envelope')}</li>
              ))}
            </ul>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={errors.length > 0 || (detailed && !tool.sections?.length)}
            onClick={async () => {
              await onSave(cloneRouterToolDefinition(tool));
              onOpenChange(false);
            }}
          >
            Save Tool
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
