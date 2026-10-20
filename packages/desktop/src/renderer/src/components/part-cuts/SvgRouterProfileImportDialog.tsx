import { useMemo, useState } from 'react';
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
import { Select } from '@renderer/components/ui/select';
import type { RouterProfileDefinition } from '@renderer/types';
import { useRouterProfileLibrary } from '@renderer/hooks/useRouterProfileLibrary';
import { parseSvgRouterProfile, type SvgProfileParseResult } from '@renderer/utils/routerProfileSvg';
import {
  mirrorRouterProfileContour,
  reverseRouterProfileContour,
  rotateRouterProfileContour,
  scaleRouterProfileContour,
  swapRouterProfileContourAxes,
  validateRouterProfileContour,
  type RouterProfileContour
} from '@renderer/utils/routerProfileDxf';
import { validateEdgeRouterProfileDefinition } from '@renderer/utils/routerProfiles';
import { RouterProfilePreview } from './RouterProfilePreview';
import { describeRouterImportError } from '@renderer/components/stock/RouterInterchangeHelpDialog';

const UNKNOWN_UNIT_SCALE = { inches: 1, millimeters: 1 / 25.4, centimeters: 1 / 2.54, points: 1 / 72, pixels: 1 / 96 };
const cloneSegment = (segment: RouterProfileContour['segments'][number]) =>
  segment.kind === 'cubicBezier'
    ? { ...segment, control1: { ...segment.control1 }, control2: { ...segment.control2 }, to: { ...segment.to } }
    : { ...segment, to: { ...segment.to } };

function definitionFromContour(
  contour: RouterProfileContour,
  name: string,
  fileName: string,
  family: string,
  result: SvgProfileParseResult
): RouterProfileDefinition {
  return {
    version: 1,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `router-profile-${Date.now()}`,
    name: name.trim() || fileName.replace(/\.svg$/i, '') || 'Imported SVG Profile',
    family: family.trim() || 'Custom',
    source: 'generic',
    parameters: { importedFrom: fileName, format: 'SVG', fidelity: result.fidelity },
    boundary: { start: { ...contour.start }, segments: contour.segments.map(cloneSegment) }
  };
}

export function SvgRouterProfileImportDialog({
  open,
  onOpenChange,
  onApply
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply?: (profile: RouterProfileDefinition) => void;
}) {
  const { addProfile } = useRouterProfileLibrary();
  const [result, setResult] = useState<SvgProfileParseResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [name, setName] = useState('');
  const [family, setFamily] = useState('Custom');
  const [selected, setSelected] = useState<number | null>(null);
  const [contour, setContour] = useState<RouterProfileContour | null>(null);
  const [message, setMessage] = useState('');
  const definition = useMemo(
    () => (contour && result ? definitionFromContour(contour, name, fileName, family, result) : null),
    [contour, family, fileName, name, result]
  );
  const contourValidation = contour ? validateRouterProfileContour(contour) : null;
  const applicationErrors = definition ? validateEdgeRouterProfileDefinition(definition) : [];
  const valid = !!contourValidation?.valid && applicationErrors.length === 0;

  const chooseFile = async () => {
    setMessage('');
    setResult(null);
    setContour(null);
    setSelected(null);
    let chosenFileName = 'SVG file';
    try {
      const choice = await window.electronAPI.showOpenDialog({
        title: 'Import Router Profile SVG',
        properties: ['openFile'],
        filters: [{ name: 'SVG drawings', extensions: ['svg'] }]
      });
      if (choice.canceled || !choice.filePaths[0]) return;
      const path = choice.filePaths[0];
      chosenFileName = path.split(/[\\/]/).pop() ?? 'profile.svg';
      setFileName(chosenFileName);
      const parsed = parseSvgRouterProfile(await window.electronAPI.readFile(path));
      const nextFileName = path.split(/[\\/]/).pop() ?? 'profile.svg';
      setResult(parsed);
      setFileName(nextFileName);
      setName(nextFileName.replace(/\.svg$/i, ''));
      const openContours = parsed.contours
        .map((candidate, index) => ({ candidate, index }))
        .filter(({ candidate }) => !candidate.closed);
      if (parsed.contours.length === 1 && openContours.length === 1) {
        setSelected(0);
        setContour(openContours[0].candidate);
      } else if (!openContours.length)
        setMessage('No open contour can be used. Closed contours must be opened in the source drawing.');
    } catch (error) {
      const diagnostic = describeRouterImportError(error, chosenFileName);
      setMessage(`${diagnostic.category}: ${diagnostic.message} ${diagnostic.action}`);
    }
  };
  const finish = async (mode: 'library' | 'apply' | 'both') => {
    if (!definition || !valid) return;
    if (mode !== 'apply') await addProfile(definition);
    if (mode !== 'library') onApply?.(definition);
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[860px] max-w-[96vw]" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <div>
            <DialogTitle>Import Router Profile from SVG</DialogTitle>
            <p className="mt-1 text-sm text-text-muted">
              SVG is parsed as inert vector geometry. Choose an open contour, confirm scale, then review its removal
              boundary.
            </p>
          </div>
          <DialogClose onClose={() => onOpenChange(false)} />
        </DialogHeader>
        <div className="grid max-h-[68vh] gap-5 overflow-y-auto p-5 md:grid-cols-[260px_1fr]">
          <div className="space-y-4">
            <Button variant="outline" onClick={chooseFile}>
              Choose SVG File…
            </Button>
            {fileName && <p className="text-xs text-text-muted">{fileName}</p>}
            {result && (
              <div>
                <Label>Discovered Contour</Label>
                <div className="mt-1 space-y-1" role="list" aria-label="SVG contours">
                  {result.contours.map((candidate, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="outline"
                      active={selected === index}
                      disabled={candidate.closed}
                      className="w-full justify-start"
                      onClick={() => {
                        setSelected(index);
                        setContour(candidate);
                        setMessage('');
                      }}
                    >
                      Contour {index + 1} · {candidate.segments.length} segments{candidate.closed ? ' · closed' : ''}
                    </Button>
                  ))}
                </div>
                {result.contours.length > 1 && selected === null && (
                  <p role="alert" className="mt-1 text-xs text-warning">
                    Multiple contours were found. Explicitly choose one open contour.
                  </p>
                )}
              </div>
            )}
            {result?.units === 'unknown' ? (
              <div>
                <Label htmlFor="svg-units">SVG Units</Label>
                <Select
                  id="svg-units"
                  defaultValue="inches"
                  onChange={(event) => {
                    if (!contour) return;
                    const nextScale = UNKNOWN_UNIT_SCALE[event.target.value as keyof typeof UNKNOWN_UNIT_SCALE];
                    setContour(scaleRouterProfileContour(contour, nextScale));
                  }}
                >
                  <option value="inches">Inches</option>
                  <option value="millimeters">Millimeters</option>
                  <option value="centimeters">Centimeters</option>
                  <option value="points">Points</option>
                  <option value="pixels">Pixels (96 dpi)</option>
                </Select>
                <p className="mt-1 text-xs text-warning">
                  This SVG has no physical size. Confirm its units before saving.
                </p>
              </div>
            ) : result ? (
              <p className="text-xs text-text-muted">Source units: {result.units}; converted to inches.</p>
            ) : null}
          </div>
          <div className="space-y-4">
            {definition ? (
              <div className="rounded-md border border-border bg-bg-secondary p-3">
                <RouterProfilePreview profile={definition} label="Imported SVG profile material-removal preview" />
                <p className="text-center text-xs text-text-muted">
                  Shared profile evaluator preview · SVG {result?.fidelity} fidelity
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-text-muted">
                Choose an SVG and an open contour to preview it.
              </div>
            )}
            {contour && (
              <>
                <div className="flex flex-wrap gap-2" aria-label="SVG profile orientation controls">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setContour(rotateRouterProfileContour(contour, Math.PI / 2))}
                  >
                    Rotate 90°
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setContour(mirrorRouterProfileContour(contour, 'u'))}
                  >
                    Mirror Horizontal
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setContour(mirrorRouterProfileContour(contour, 'v'))}
                  >
                    Mirror Vertical
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setContour(swapRouterProfileContourAxes(contour))}>
                    Swap Axes
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setContour(reverseRouterProfileContour(contour))}>
                    Reverse Direction
                  </Button>
                </div>
                <div>
                  <Label htmlFor="svg-profile-name">Profile Name</Label>
                  <Input id="svg-profile-name" value={name} onChange={(event) => setName(event.target.value)} />
                </div>
                <div>
                  <Label htmlFor="svg-profile-family">Family</Label>
                  <Input id="svg-profile-family" value={family} onChange={(event) => setFamily(event.target.value)} />
                </div>
              </>
            )}
            {result?.fidelity === 'exact' && contour && (
              <p role="status" className="text-xs text-success">
                Exact SVG line, quadratic/cubic Bézier, and axis-aligned arc geometry is preserved canonically.
              </p>
            )}
            {result?.fidelity === 'approximated' && contour && (
              <div role="status" className="rounded-md border border-warning/50 p-2 text-xs text-warning">
                Fidelity notice: rotated or skewed SVG arcs were approximated deterministically as cubic Bézier
                segments. Review before Save or Apply.
              </div>
            )}
            {result?.warnings.map((warning) => (
              <p key={warning} role="status" className="text-xs text-warning">
                {warning}
              </p>
            ))}
            {result?.errors.map((error) => (
              <p key={error} role="alert" className="text-xs text-warning">
                {error}
              </p>
            ))}
            {contourValidation && !valid && (
              <div role="alert" className="text-sm text-danger">
                This contour cannot be used: {[...contourValidation.errors, ...applicationErrors].join('; ')}
              </div>
            )}
            {message && (
              <div role="alert" className="text-sm text-danger">
                {message}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="outline" disabled={!definition || !valid} onClick={() => finish('library')}>
            Save to Library
          </Button>
          {onApply && (
            <>
              <Button variant="outline" disabled={!definition || !valid} onClick={() => finish('apply')}>
                Apply Once
              </Button>
              <Button disabled={!definition || !valid} onClick={() => finish('both')}>
                Save &amp; Apply
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
