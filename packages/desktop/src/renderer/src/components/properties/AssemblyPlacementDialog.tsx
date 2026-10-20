import { DocsLink } from '../common/library/DocsLink';
import { useEffect, useMemo, useState } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { Bounds, OrbitControls } from '@react-three/drei';
import { MathUtils, Matrix4, Quaternion } from 'three';
import type { Part } from '@renderer/types';
import { useProjectStore } from '@renderer/store/projectStore';
import {
  getAssemblyReferences,
  planAssembly,
  suggestAssembly,
  type AssemblyReference,
  type AssemblyLayoutOptions
} from '@renderer/utils/assemblyLayout';
import { wouldTransformedPartsOverlap } from '@renderer/utils/overlapPolicy';
import { getPartShape } from '@renderer/utils/partShape';
import {
  getRodRenderGeometry,
  hasRenderablePartFeatures,
  getPartRenderGeometry
} from '@renderer/utils/partFeatureGeometry';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { FractionInput } from '../common/FractionInput';

function ReferenceMarker({ reference, color }: { reference: AssemblyReference; color: string }) {
  const orientation = new Quaternion().setFromRotationMatrix(
    new Matrix4().makeBasis(reference.along, reference.across, reference.normal)
  );
  return (
    <mesh
      position={reference.center.clone().addScaledVector(reference.normal, 0.008)}
      quaternion={orientation}
      renderOrder={100}
      raycast={() => {}}
    >
      <planeGeometry args={[Math.max(0.03, reference.width), Math.max(0.03, reference.height)]} />
      <meshBasicMaterial color={color} transparent opacity={0.42} depthTest={false} depthWrite={false} side={2} />
    </mesh>
  );
}

export function PreviewBoard({
  part,
  origin,
  moving,
  reference,
  onPickFace
}: {
  part: Part;
  origin: Part['position'];
  moving: boolean;
  reference?: AssemblyReference;
  onPickFace?: (face: string) => void;
}) {
  const stocks = useProjectStore((state) => state.stocks);
  const round = getPartShape(part, stocks) === 'round' && !hasRenderablePartFeatures(part);
  const geometry = useMemo(
    () => (round ? getRodRenderGeometry(part.length, part.thickness) : getPartRenderGeometry(part)),
    [part, round]
  );
  useEffect(
    () => () => {
      if (!round && !hasRenderablePartFeatures(part)) geometry.dispose();
    },
    [geometry, part, round]
  );
  const pick = (event: ThreeEvent<MouseEvent>) => {
    if (!onPickFace || !event.face || event.delta > 3) return;
    event.stopPropagation();
    const normal = event.face.normal;
    const face = getAssemblyReferences(part)
      .filter((candidate) => candidate.kind === 'face')
      .sort((a, b) => b.normal.dot(normal) - a.normal.dot(normal))[0];
    if (face) onPickFace(face.id);
  };
  return (
    <group
      position={[part.position.x - origin.x, part.position.y - origin.y, part.position.z - origin.z]}
      rotation={[part.rotation.x, part.rotation.y, part.rotation.z].map(MathUtils.degToRad) as [number, number, number]}
    >
      <mesh geometry={geometry} dispose={null} onClick={pick}>
        <meshStandardMaterial color={moving ? '#e8ae55' : '#a7b6c6'} transparent opacity={moving ? 0.8 : 1} />
      </mesh>
      {reference && <ReferenceMarker reference={reference} color={moving ? '#ffb83c' : '#51c8ff'} />}
    </group>
  );
}

export function AssemblyPlacementDialog({ parts, onClose }: { parts: [Part, Part]; onClose: () => void }) {
  const [initial] = useState(() => suggestAssembly(parts, useProjectStore.getState().parts));
  const [swapped, setSwapped] = useState(initial.swapped);
  const moving = parts[swapped ? 1 : 0];
  const fixed = parts[swapped ? 0 : 1];
  const movingReferences = useMemo(() => getAssemblyReferences(moving), [moving]);
  const fixedReferences = useMemo(() => getAssemblyReferences(fixed), [fixed]);
  const [options, setOptions] = useState<AssemblyLayoutOptions>(initial.options);
  const [error, setError] = useState<string | null>(null);
  const allParts = useProjectStore((state) => state.parts);
  const updatePart = useProjectStore((state) => state.updatePart);
  const proposed = useMemo(() => planAssembly(moving, fixed, options), [moving, fixed, options]);
  const collision = useMemo(
    () => (proposed ? wouldTransformedPartsOverlap(allParts, new Map([[moving.id, proposed]])) : false),
    [allParts, moving.id, proposed]
  );
  const receiver = fixedReferences.find((reference) => reference.id === options.fixedReference);
  const movingReference = movingReferences.find((reference) => reference.id === options.movingReference);
  const socketReference =
    receiver?.kind === 'socket' ? receiver : movingReference?.kind === 'socket' ? movingReference : undefined;
  const set = (patch: Partial<AssemblyLayoutOptions>) => {
    setOptions((current) => ({ ...current, ...patch }));
    setError(null);
  };
  const span = Math.max(moving.length, moving.width, fixed.length, fixed.width, 1);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-3xl overflow-y-auto p-4">
        <DialogTitle>Bring the pieces together</DialogTitle>
        <DialogDescription>
          Click the faces in the preview or choose a surface below. Highlighted surfaces meet; orange moves and blue
          stays in place.
        </DialogDescription>
        <DocsLink section="assembly-placement">Assembly placement guide</DocsLink>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm">
              Move <strong>{moving.name}</strong> to <strong>{fixed.name}</strong>.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSwapped(!swapped);
                set({
                  movingReference: options.fixedReference,
                  fixedReference: options.movingReference,
                  along: 'center',
                  across: 'center'
                });
              }}
            >
              Swap boards
            </Button>
            <div>
              <Label htmlFor="assembly-moving-reference">Moving surface or shoulder</Label>
              <Select
                id="assembly-moving-reference"
                value={options.movingReference}
                onChange={(event) => set({ movingReference: event.target.value })}
              >
                {movingReferences.map((reference) => (
                  <option key={reference.id} value={reference.id}>
                    {reference.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="assembly-fixed-reference">Receiving surface or opening</Label>
              <Select
                id="assembly-fixed-reference"
                value={options.fixedReference}
                onChange={(event) => set({ fixedReference: event.target.value, insertion: 0 })}
              >
                {fixedReferences.map((reference) => (
                  <option key={reference.id} value={reference.id}>
                    {reference.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="assembly-turn">Turn around the joint</Label>
              <Select
                id="assembly-turn"
                value={options.quarterTurns}
                onChange={(event) => set({ quarterTurns: Number(event.target.value) })}
              >
                {[0, 1, 2, 3].map((turn) => (
                  <option key={turn} value={turn}>
                    {turn * 90}°
                  </option>
                ))}
              </Select>
            </div>
            {(['along', 'across'] as const).map((axis) => (
              <div key={axis}>
                <Label htmlFor={`assembly-${axis}`}>Register {axis} the receiving surface</Label>
                <Select
                  id={`assembly-${axis}`}
                  value={options[axis]}
                  onChange={(event) => set({ [axis]: event.target.value })}
                >
                  <option value="center">Center</option>
                  <option value="start">Flush with first edge</option>
                  <option value="end">Flush with opposite edge</option>
                </Select>
              </div>
            ))}
            {socketReference && (
              <div>
                <Label>Insertion past the opening</Label>
                <FractionInput
                  ariaLabel="Insertion past the opening"
                  value={options.insertion}
                  min={0}
                  max={socketReference.depth}
                  onChange={(insertion) => set({ insertion })}
                />
                <p className="text-xs text-text-muted">
                  Use zero for a tenon shoulder. For a plain shelf end, use the housing depth. For a dowel or insert,
                  enter the length going into this opening; leave bottom clearance in a blind socket.
                </p>
              </div>
            )}
          </div>
          <div className="min-h-64 rounded border border-border" aria-label="Assembly preview">
            {proposed && (
              <Canvas camera={{ position: [span * 1.5, span, span * 1.5], fov: 45 }}>
                <ambientLight intensity={1.2} />
                <directionalLight position={[10, 20, 10]} intensity={2} />
                <Bounds fit clip observe margin={1.3}>
                  <PreviewBoard
                    part={fixed}
                    origin={fixed.position}
                    moving={false}
                    reference={receiver}
                    onPickFace={(fixedReference) => set({ fixedReference, insertion: 0 })}
                  />
                  <PreviewBoard
                    part={proposed}
                    origin={fixed.position}
                    moving
                    reference={movingReferences.find((ref) => ref.id === options.movingReference)}
                    onPickFace={(movingReference) => set({ movingReference })}
                  />
                </Bounds>
                <OrbitControls makeDefault />
              </Canvas>
            )}
          </div>
        </div>
        <p role="status" className="text-sm">
          {error ??
            (!proposed
              ? 'Choose valid references and an insertion depth within the receiving cut.'
              : collision
                ? 'These pieces interfere with existing material. Change the reference, turn, or insertion depth.'
                : 'The preview fits without new material interference.')}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!proposed || collision}
            onClick={() => {
              if (!proposed) return;
              if (updatePart(moving.id, { position: proposed.position, rotation: proposed.rotation })) onClose();
              else setError('The assembly could not be applied. Check the fit against the other parts.');
            }}
          >
            Place the piece
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
