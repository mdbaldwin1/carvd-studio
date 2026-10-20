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
import { describeRouterImportError } from '@renderer/components/stock/RouterInterchangeHelpDialog';
import type { RouterProfileDefinition } from '@renderer/types';
import {
  mirrorRouterProfileContour,
  parseAsciiDxfRouterProfile,
  reverseRouterProfileContour,
  rotateRouterProfileContour,
  scaleRouterProfileContour,
  swapRouterProfileContourAxes,
  validateRouterProfileContour,
  type DxfProfileParseResult,
  type RouterProfileContour
} from '@renderer/utils/routerProfileDxf';
import { useRouterProfileLibrary } from '@renderer/hooks/useRouterProfileLibrary';
import { validateEdgeRouterProfileDefinition } from '@renderer/utils/routerProfiles';
import { RouterProfilePreview } from './RouterProfilePreview';

const UNIT_SCALE = { inches: 1, feet: 12, millimeters: 1 / 25.4, centimeters: 1 / 2.54, meters: 100 / 2.54 };

function profileFromContour(
  contour: RouterProfileContour,
  name: string,
  fileName: string,
  family: string,
  manufacturer: string,
  sku: string
): RouterProfileDefinition {
  return {
    version: 1,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `router-profile-${Date.now()}`,
    name: name.trim() || fileName.replace(/\.dxf$/i, '') || 'Imported Router Profile',
    family: family.trim() || 'Custom',
    source: manufacturer.trim() ? 'manufacturer' : 'generic',
    manufacturer: manufacturer.trim() || undefined,
    sku: sku.trim() || undefined,
    parameters: { importedFrom: fileName, format: 'DXF' },
    boundary: {
      start: { ...contour.start },
      segments: contour.segments.map((segment) => ({ ...segment, to: { ...segment.to } }))
    }
  };
}

export function DxfRouterProfileImportDialog({
  open,
  onOpenChange,
  onApply
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply?: (profile: RouterProfileDefinition) => void;
}) {
  const { addProfile } = useRouterProfileLibrary();
  const [result, setResult] = useState<DxfProfileParseResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [name, setName] = useState('');
  const [family, setFamily] = useState('Custom');
  const [manufacturer, setManufacturer] = useState('');
  const [sku, setSku] = useState('');
  const [selected, setSelected] = useState(0);
  const [contour, setContour] = useState<RouterProfileContour | null>(null);
  const [unitScale, setUnitScale] = useState(1);
  const [knownDistance, setKnownDistance] = useState('');
  const [message, setMessage] = useState('');

  const definition = useMemo(
    () =>
      contour
        ? profileFromContour(scaleRouterProfileContour(contour, unitScale), name, fileName, family, manufacturer, sku)
        : null,
    [contour, family, fileName, manufacturer, name, sku, unitScale]
  );
  const contourValidation = contour ? validateRouterProfileContour(contour) : null;
  const applicationErrors = definition ? validateEdgeRouterProfileDefinition(definition) : [];
  const validation = contourValidation
    ? {
        ...contourValidation,
        valid: contourValidation.valid && applicationErrors.length === 0,
        errors: [...contourValidation.errors, ...applicationErrors]
      }
    : null;
  const cubicCount = contour?.segments.filter((segment) => segment.kind === 'cubicBezier').length ?? 0;
  const hasSplineApproximation =
    result?.warnings.some((warning) => warning.startsWith('Approximated degree-')) ?? false;

  const chooseFile = async () => {
    setMessage('');
    let chosenFileName = 'DXF file';
    try {
      const choice = await window.electronAPI.showOpenDialog({
        title: 'Import Router Profile DXF',
        properties: ['openFile'],
        filters: [{ name: 'DXF drawings', extensions: ['dxf'] }]
      });
      if (choice.canceled || !choice.filePaths[0]) return;
      const path = choice.filePaths[0];
      chosenFileName = path.split(/[\\/]/).pop() ?? 'profile.dxf';
      setFileName(chosenFileName);
      const parsed = parseAsciiDxfRouterProfile(await window.electronAPI.readFile(path));
      setResult(parsed);
      setFileName(path.split(/[\\/]/).pop() ?? 'profile.dxf');
      setName((path.split(/[\\/]/).pop() ?? '').replace(/\.dxf$/i, ''));
      setSelected(0);
      setContour(parsed.contours[0] ?? null);
      setUnitScale(parsed.unitScaleToInches ?? 1);
      setMessage(parsed.contours.length ? '' : 'No connected LINE, ARC, CIRCLE, or polyline contours were found.');
    } catch (error) {
      const diagnostic = describeRouterImportError(error, chosenFileName);
      setMessage(`${diagnostic.category}: ${diagnostic.message} ${diagnostic.action}`);
    }
  };

  const chooseContour = (index: number) => {
    setSelected(index);
    setContour(result?.contours[index] ?? null);
  };
  const transform = (next: RouterProfileContour) => setContour(next);
  const applyKnownDistance = () => {
    if (!contour) return;
    const points = [contour.start, ...contour.segments.map((segment) => segment.to)];
    const width = Math.max(...points.map((point) => point.u)) - Math.min(...points.map((point) => point.u));
    const distance = Number(knownDistance);
    if (distance > 0 && width > 0) setUnitScale(distance / width);
  };
  const finish = async (mode: 'library' | 'apply' | 'both') => {
    if (!definition || !validation?.valid) return;
    if (mode !== 'apply') await addProfile(definition);
    if (mode !== 'library') onApply?.(definition);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[860px] max-w-[96vw]" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <div>
            <DialogTitle>Import Router Profile from DXF</DialogTitle>
            <p className="mt-1 text-sm text-text-muted">
              Choose a connected contour, confirm its scale, then orient the material-removal boundary.
            </p>
          </div>
          <DialogClose onClose={() => onOpenChange(false)} />
        </DialogHeader>
        <div className="grid max-h-[68vh] gap-5 overflow-y-auto p-5 md:grid-cols-[260px_1fr]">
          <div className="space-y-4">
            <Button type="button" variant="outline" onClick={chooseFile}>
              Choose DXF File…
            </Button>
            {fileName && <p className="text-xs text-text-muted">{fileName}</p>}
            {result && (
              <div>
                <Label>Connected Contour</Label>
                <div className="mt-1 space-y-1" role="list" aria-label="DXF contours">
                  {result.contours.map((candidate, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="outline"
                      active={index === selected}
                      className="w-full justify-start"
                      onClick={() => chooseContour(index)}
                    >
                      Contour {index + 1} · {candidate.segments.length} segments
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {result?.units === 'unknown' ? (
              <div>
                <Label htmlFor="dxf-units">Drawing Units</Label>
                <Select
                  id="dxf-units"
                  defaultValue="inches"
                  onChange={(event) => setUnitScale(UNIT_SCALE[event.target.value as keyof typeof UNIT_SCALE])}
                >
                  <option value="inches">Inches</option>
                  <option value="millimeters">Millimeters</option>
                  <option value="centimeters">Centimeters</option>
                  <option value="feet">Feet</option>
                  <option value="meters">Meters</option>
                </Select>
                <p className="mt-1 text-xs text-warning">
                  This DXF does not declare units. Confirm them before saving.
                </p>
              </div>
            ) : result ? (
              <p className="text-xs text-text-muted">Drawing units: {result.units}</p>
            ) : null}
            {contour && (
              <div>
                <Label htmlFor="known-distance">Known contour width (inches)</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="known-distance"
                    inputMode="decimal"
                    value={knownDistance}
                    onChange={(event) => setKnownDistance(event.target.value)}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={applyKnownDistance}>
                    Set Scale
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-4">
            {definition ? (
              <div className="rounded-md border border-border bg-bg-secondary p-3">
                <RouterProfilePreview profile={definition} label="Imported profile material-removal preview" />
                <p className="text-center text-xs text-text-muted">
                  Accent line is the boundary left after material removal.
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-text-muted">
                Choose a DXF to preview its contours.
              </div>
            )}
            {contour && (
              <>
                <div className="flex flex-wrap gap-2" aria-label="Profile orientation controls">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => transform(rotateRouterProfileContour(contour, Math.PI / 2))}
                  >
                    Rotate 90°
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => transform(mirrorRouterProfileContour(contour, 'u'))}
                  >
                    Mirror Horizontal
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => transform(mirrorRouterProfileContour(contour, 'v'))}
                  >
                    Mirror Vertical
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => transform(swapRouterProfileContourAxes(contour))}>
                    Swap Axes
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => transform(reverseRouterProfileContour(contour))}>
                    Reverse Direction
                  </Button>
                </div>
                <div>
                  <Label htmlFor="router-profile-name">Profile Name</Label>
                  <Input id="router-profile-name" value={name} onChange={(event) => setName(event.target.value)} />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="router-profile-family">Family</Label>
                    <Input
                      id="router-profile-family"
                      value={family}
                      onChange={(event) => setFamily(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="router-profile-manufacturer">Manufacturer (optional)</Label>
                    <Input
                      id="router-profile-manufacturer"
                      value={manufacturer}
                      onChange={(event) => setManufacturer(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="router-profile-sku">SKU (optional)</Label>
                    <Input id="router-profile-sku" value={sku} onChange={(event) => setSku(event.target.value)} />
                  </div>
                </div>
              </>
            )}
            {result?.unsupportedEntities.length ? (
              <p role="status" className="text-xs text-warning">
                Ignored unsupported entities: {result.unsupportedEntities.join(', ')}.
              </p>
            ) : null}
            {result?.warnings.map((warning) => (
              <p key={warning} role="status" className="text-xs text-warning">
                {warning}
              </p>
            ))}
            {cubicCount > 0 && !hasSplineApproximation ? (
              <p role="status" className="text-xs text-success">
                Exact cubic Bézier controls will be preserved in the saved profile ({cubicCount}{' '}
                {cubicCount === 1 ? 'segment' : 'segments'}).
              </p>
            ) : null}
            {cubicCount > 0 && hasSplineApproximation ? (
              <div role="status" className="rounded-md border border-warning/50 p-2 text-xs text-warning">
                Fidelity notice: rational or higher-degree SPLINE geometry was approximated as bounded cubic Bézier
                segments. Review the preview before Save or Apply; the resulting cubic controls will then be stored
                losslessly.
              </div>
            ) : null}
            {validation && !validation.valid ? (
              <div role="alert" className="text-sm text-danger">
                This contour cannot be used: {validation.errors.join('; ')}. Repair the source drawing and import it
                again.
              </div>
            ) : null}
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
          <Button variant="outline" disabled={!definition || !validation?.valid} onClick={() => finish('library')}>
            Save to Library
          </Button>
          {onApply && (
            <>
              <Button variant="outline" disabled={!definition || !validation?.valid} onClick={() => finish('apply')}>
                Apply Once
              </Button>
              <Button disabled={!definition || !validation?.valid} onClick={() => finish('both')}>
                Save &amp; Apply
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
