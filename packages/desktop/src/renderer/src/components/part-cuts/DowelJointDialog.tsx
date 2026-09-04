import { FractionInput } from '@renderer/components/common/FractionInput';
import { Button } from '@renderer/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Select } from '@renderer/components/ui/select';
import type { AddDowelJointInput } from '@renderer/store/projectStore';
import type { FaceTarget, Part } from '@renderer/types';
import { formatMeasurementWithUnit } from '@renderer/utils/fractions';
import { createDowelJoint, validateDowelJointFaces } from '@renderer/utils/dowelJointUtils';
import { FACE_LABELS } from '@renderer/utils/partFeatureSummary';
import { getFaceFrame } from '@renderer/utils/roundCutUtils';
import { useState } from 'react';

interface DowelJointDialogProps {
  open: boolean;
  firstPart: Part;
  candidateParts: Part[];
  onClose: () => void;
  onCreate: (input: AddDowelJointInput) => string | null;
  onAlignRequested?: (selection: {
    firstPartId: string;
    firstFace: FaceTarget;
    secondPartId: string;
    secondFace: FaceTarget;
  }) => void;
}

const FACES = Object.keys(FACE_LABELS) as FaceTarget[];

export function DowelJointDialog({
  open,
  firstPart,
  candidateParts,
  onClose,
  onCreate,
  onAlignRequested
}: DowelJointDialogProps) {
  const [step, setStep] = useState(1);
  const [secondPartId, setSecondPartId] = useState(candidateParts[0]?.id ?? '');
  const [firstFace, setFirstFace] = useState<FaceTarget>('top_face');
  const [secondFace, setSecondFace] = useState<FaceTarget>('bottom_face');
  const [diameter, setDiameter] = useState(0.375);
  const [dowelLength, setDowelLength] = useState(0.75);
  const [firstEmbedmentDepth, setFirstEmbedmentDepth] = useState(0.375);
  const [secondEmbedmentDepth, setSecondEmbedmentDepth] = useState(0.375);
  const [count, setCount] = useState(2);
  const [spacing, setSpacing] = useState(2);
  const initialFrame = getFaceFrame(firstPart, 'top_face');
  const [firstPrimaryEdge, setFirstPrimaryEdge] = useState(1);
  const [firstSecondaryEdge, setFirstSecondaryEdge] = useState(initialFrame.secondarySize / 2);
  const [error, setError] = useState<string | null>(null);
  const secondPart = candidateParts.find((part) => part.id === secondPartId) ?? null;
  const firstFrame = getFaceFrame(firstPart, firstFace);
  const firstPrimary = firstPrimaryEdge - firstFrame.primarySize / 2;
  const firstSecondary = firstSecondaryEdge - firstFrame.secondarySize / 2;

  const input: AddDowelJointInput | null = secondPart
    ? {
        firstPartId: firstPart.id,
        firstFace,
        secondPartId: secondPart.id,
        secondFace,
        diameter,
        dowelLength,
        firstEmbedmentDepth,
        secondEmbedmentDepth,
        count,
        spacing,
        firstPrimary,
        firstSecondary
      }
    : null;

  let validationError: string | null = null;
  let previewFeatures: ReturnType<typeof createDowelJoint> | null = null;
  if (input && secondPart) {
    try {
      previewFeatures = createDowelJoint({ ...input, firstPart, secondPart });
    } catch (cause) {
      validationError = cause instanceof Error ? cause.message : 'Unable to validate the dowel joint.';
    }
  }
  let faceValidationError: string | null = null;
  if (secondPart) {
    try {
      validateDowelJointFaces({ firstPart, firstFace, secondPart, secondFace });
    } catch (cause) {
      faceValidationError = cause instanceof Error ? cause.message : 'Unable to validate the selected faces.';
    }
  }

  const handleCreate = () => {
    if (!input || !secondPart) {
      setError('Choose a mating part first.');
      return;
    }
    try {
      createDowelJoint({ ...input, firstPart, secondPart });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to validate the dowel joint.');
      return;
    }
    if (!onCreate(input)) {
      setError('Carvd could not add the dowel joint. Your selections have been kept.');
      return;
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="w-[620px] max-w-[94vw]" onClose={onClose}>
        <DialogHeader>
          <div>
            <DialogTitle>Create Dowel Joint</DialogTitle>
            <DialogDescription>Step {step} of 4</DialogDescription>
          </div>
          <DialogClose onClose={onClose} />
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          {step === 1 && (
            <div>
              <Label htmlFor="dowel-mating-part">Mating Part</Label>
              <Select
                id="dowel-mating-part"
                value={secondPartId}
                onChange={(event) => setSecondPartId(event.target.value)}
              >
                <option value="">Choose a part</option>
                {candidateParts.map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {step === 2 && secondPart && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dowel-first-face">Face on {firstPart.name}</Label>
                  <Select
                    id="dowel-first-face"
                    value={firstFace}
                    onChange={(event) => setFirstFace(event.target.value as FaceTarget)}
                  >
                    {FACES.map((face) => (
                      <option key={face} value={face}>
                        {FACE_LABELS[face]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dowel-second-face">Face on {secondPart.name}</Label>
                  <Select
                    id="dowel-second-face"
                    value={secondFace}
                    onChange={(event) => setSecondFace(event.target.value as FaceTarget)}
                  >
                    {FACES.map((face) => (
                      <option key={face} value={face}>
                        {FACE_LABELS[face]}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              {faceValidationError && (
                <div className="space-y-3 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
                  <p>{faceValidationError}</p>
                  {onAlignRequested && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        onAlignRequested({
                          firstPartId: firstPart.id,
                          firstFace,
                          secondPartId: secondPart.id,
                          secondFace
                        })
                      }
                    >
                      Back to Project &amp; Align Parts
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <svg
                role="img"
                aria-label={`Dowel placement on ${firstPart.name} ${FACE_LABELS[firstFace]}`}
                viewBox="0 0 360 150"
                className="w-full rounded-md border border-border bg-bg-secondary"
              >
                <rect x="35" y="25" width="290" height="100" rx="3" fill="none" stroke="currentColor" opacity="0.45" />
                {Array.from({ length: Math.max(0, Math.min(count, 12)) }, (_, index) => {
                  const usableWidth = 250;
                  const x = 55 + (count === 1 ? usableWidth / 2 : (index * usableWidth) / (count - 1));
                  return <circle key={index} cx={x} cy="75" r="7" fill="none" stroke="currentColor" strokeWidth="2" />;
                })}
                <text x="35" y="143" fontSize="11" fill="currentColor">
                  left edge → along face
                </text>
                <text x="206" y="143" fontSize="11" fill="currentColor">
                  near edge → across face
                </text>
              </svg>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Dowel Diameter</Label>
                  <FractionInput value={diameter} onChange={setDiameter} min={0.001} />
                </div>
                <div>
                  <Label>Dowel Length</Label>
                  <FractionInput value={dowelLength} onChange={setDowelLength} min={0.001} />
                </div>
                <div>
                  <Label>Depth into {firstPart.name}</Label>
                  <FractionInput value={firstEmbedmentDepth} onChange={setFirstEmbedmentDepth} min={0.001} />
                </div>
                <div>
                  <Label>Depth into {secondPart?.name ?? 'mate'}</Label>
                  <FractionInput value={secondEmbedmentDepth} onChange={setSecondEmbedmentDepth} min={0.001} />
                </div>
                <div>
                  <Label htmlFor="dowel-count">Dowel Count</Label>
                  <Input
                    id="dowel-count"
                    type="number"
                    min={1}
                    max={128}
                    value={count}
                    onChange={(event) => setCount(Number(event.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="dowel-spacing">Distance between dowels</Label>
                  <FractionInput id="dowel-spacing" value={spacing} onChange={setSpacing} min={0.001} />
                </div>
                <div>
                  <Label htmlFor="dowel-left-edge">Distance from left edge</Label>
                  <FractionInput id="dowel-left-edge" value={firstPrimaryEdge} onChange={setFirstPrimaryEdge} min={0} />
                </div>
                <div>
                  <Label htmlFor="dowel-near-edge">Distance from near edge</Label>
                  <FractionInput
                    id="dowel-near-edge"
                    value={firstSecondaryEdge}
                    onChange={setFirstSecondaryEdge}
                    min={0}
                  />
                </div>
              </div>
              {validationError && (
                <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
                  {validationError}
                </div>
              )}
            </div>
          )}

          {step === 4 && secondPart && (
            <div className="space-y-3 rounded-md border border-border bg-bg-secondary p-4 text-sm text-text-secondary">
              <p className="font-medium text-text">Drilling setup</p>
              <p>{count} matching dowel holes</p>
              <div>
                <p className="font-medium text-text">
                  {firstPart.name} — {FACE_LABELS[firstFace]}
                </p>
                <p>
                  {formatMeasurementWithUnit(diameter, 'imperial')} diameter ×{' '}
                  {formatMeasurementWithUnit(firstEmbedmentDepth, 'imperial')} deep
                </p>
              </div>
              <div>
                <p className="font-medium text-text">
                  {secondPart.name} — {FACE_LABELS[secondFace]}
                </p>
                <p>
                  {formatMeasurementWithUnit(diameter, 'imperial')} diameter ×{' '}
                  {formatMeasurementWithUnit(secondEmbedmentDepth, 'imperial')} deep
                </p>
              </div>
              <p>
                {count} holes, {formatMeasurementWithUnit(spacing, 'imperial')} apart; first center{' '}
                {formatMeasurementWithUnit(firstPrimaryEdge, 'imperial')} from the left edge and{' '}
                {formatMeasurementWithUnit(firstSecondaryEdge, 'imperial')} from the near edge.
              </p>
              <p>
                Dowel: {formatMeasurementWithUnit(diameter, 'imperial')} diameter ×{' '}
                {formatMeasurementWithUnit(dowelLength, 'imperial')} long.
              </p>
              {previewFeatures && <p className="text-success">All holes fit within both boards.</p>}
            </div>
          )}

          {error && (
            <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</div>
          )}
        </div>

        <DialogFooter>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((current) => current - 1)}>
              Back
            </Button>
          )}
          {step < 4 ? (
            <Button
              onClick={() => {
                setError(null);
                setStep((current) => current + 1);
              }}
              disabled={step === 1 && !secondPart}
              {...(step === 2
                ? { disabled: !!faceValidationError }
                : step === 3
                  ? { disabled: !!validationError }
                  : {})}
            >
              Next
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={!!validationError}>
              Create Dowel Joint
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
