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
import { createDowelJoint } from '@renderer/utils/dowelJointUtils';
import { FACE_LABELS } from '@renderer/utils/partFeatureSummary';
import { useState } from 'react';

interface DowelJointDialogProps {
  open: boolean;
  firstPart: Part;
  candidateParts: Part[];
  onClose: () => void;
  onCreate: (input: AddDowelJointInput) => string | null;
}

const FACES = Object.keys(FACE_LABELS) as FaceTarget[];

export function DowelJointDialog({ open, firstPart, candidateParts, onClose, onCreate }: DowelJointDialogProps) {
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
  const [firstPrimary, setFirstPrimary] = useState(-1);
  const [firstSecondary, setFirstSecondary] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const secondPart = candidateParts.find((part) => part.id === secondPartId) ?? null;

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
          )}

          {step === 3 && (
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
                <Label>Spacing</Label>
                <FractionInput value={spacing} onChange={setSpacing} min={0.001} />
              </div>
              <div>
                <Label>First Hole Along Face</Label>
                <FractionInput value={firstPrimary} onChange={setFirstPrimary} />
              </div>
              <div>
                <Label>First Hole Across Face</Label>
                <FractionInput value={firstSecondary} onChange={setFirstSecondary} />
              </div>
            </div>
          )}

          {step === 4 && secondPart && (
            <div className="rounded-md border border-border bg-bg-secondary p-4 text-sm text-text-secondary">
              Create {count} matching dowel holes between{' '}
              <span className="font-medium text-text">{firstPart.name}</span> and{' '}
              <span className="font-medium text-text">{secondPart.name}</span>. Each uses a {diameter}" dowel,
              {` ${dowelLength}"`} long.
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
            >
              Next
            </Button>
          ) : (
            <Button onClick={handleCreate}>Create Dowel Joint</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
