import { DocsLink } from '../common/library/DocsLink';
import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, OrbitControls } from '@react-three/drei';
import type { Part } from '@renderer/types';
import { useProjectStore } from '@renderer/store/projectStore';
import {
  getSavedJointLayout,
  isTenonLayout,
  tenonLayoutDimensions,
  planJointLayout,
  type JointLayoutOptions
} from '@renderer/utils/jointLayout';
import { getPartFeatureConflicts } from '@renderer/utils/partFeatureConflicts';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { FractionInput } from '../common/FractionInput';
import { PreviewBoard } from './AssemblyPlacementDialog';

export function JointLayoutDialog({ parts, onClose }: { parts: [Part, Part]; onClose: () => void }) {
  const [saved] = useState(() => getSavedJointLayout(parts[0], parts[1].id));
  const [options, setOptions] = useState<JointLayoutOptions>(
    saved ?? {
      kind: 'box',
      count: 2,
      slope: 10,
      blindDepth: (parts[1].thickness * 2) / 3
    }
  );
  const [swap, setSwap] = useState(saved ? saved.firstPartId !== parts[0].id : false);
  const first = parts[swap ? 1 : 0];
  const second = parts[swap ? 0 : 1];
  const tenon = isTenonLayout(options.kind);
  const sliding = options.kind === 'sliding_dovetail';
  const slidingNeck =
    first.thickness -
    2 *
      (options.housingDepth ?? Math.min(first.thickness, second.thickness) / 2) *
      Math.tan((options.slope * Math.PI) / 180);
  const dims = tenonLayoutDimensions(first, second, options);
  const batchUpdate = useProjectStore((state) => state.batchUpdateParts);
  const plan = useMemo(() => planJointLayout(first, second, options), [first, second, options]);
  const conflict = useMemo(() => {
    if (plan.error) return plan.error;
    for (const [part, features] of [
      [first, plan.first],
      [second, plan.second]
    ] as const) {
      const issue = getPartFeatureConflicts(features, part).find((candidate) => candidate.severity === 'error');
      if (issue) return `${part.name}: ${issue.message}`;
    }
    return null;
  }, [first, second, plan]);
  const set = (patch: Partial<JointLayoutOptions>) => setOptions((current) => ({ ...current, ...patch }));
  const width = first.width + second.width + 1;
  const span = Math.max(first.length, second.length, width);
  const previewFirst = useMemo(
    () => ({
      ...first,
      features: plan.first,
      position: { x: 0, y: 0, z: -(second.width + 1) / 2 },
      rotation: { x: 0, y: 0, z: 0 }
    }),
    [first, second.width, plan.first]
  );
  const previewSecond = useMemo(
    () => ({
      ...second,
      features: plan.second,
      position: { x: (second.length - first.length) / 2, y: 0, z: (first.width + 1) / 2 },
      rotation: { x: 0, y: 0, z: 0 }
    }),
    [second, first.length, first.width, plan.second]
  );

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-3xl overflow-y-auto p-4">
        <DialogTitle>Lay out a matching joint</DialogTitle>
        <DialogDescription>
          {sliding
            ? 'Mark the housing center on the receiving board and shape the shelf’s left end to match.'
            : tenon
              ? 'Mark the rail’s left end and transfer it to the receiving board.'
              : 'Mark both left ends from one layout.'}{' '}
          Cuts use actual stock dimensions. The preview lays the boards flat for inspection.
        </DialogDescription>
        <DocsLink section="matching-cuts">Matching joint guide</DocsLink>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm">
              {sliding ? 'Shelf / tongue' : tenon ? 'Rail / tenon' : 'First / tails'}: <strong>{first.name}</strong>
              <br />
              {tenon || sliding ? 'Receiving board' : 'Mating / pins'}: <strong>{second.name}</strong>
            </p>
            <Button size="sm" variant="outline" onClick={() => setSwap(!swap)}>
              Swap boards
            </Button>
            <div>
              <Label htmlFor="joint-layout-kind">Joint</Label>
              <Select
                id="joint-layout-kind"
                value={options.kind}
                onChange={(event) => set({ kind: event.target.value as JointLayoutOptions['kind'] })}
              >
                <option value="box">Box joint</option>
                <option value="through_dovetail">Through dovetail</option>
                <option value="half_blind_dovetail">Half-blind dovetail</option>
                <option value="mitred_blind_dovetail">Mitred blind dovetail</option>
                <option value="sliding_dovetail">Sliding dovetail</option>
                <option value="mortise_tenon">Mortise and tenon</option>
                <option value="twin_tenon">Twin tenon</option>
                <option value="haunched_tenon">Haunched tenon</option>
              </Select>
            </div>
            {!tenon && !sliding && (
              <div>
                <Label htmlFor="joint-layout-count">
                  {options.kind === 'box' ? 'Fingers per board' : 'Tail count'}
                </Label>
                <Input
                  id="joint-layout-count"
                  type="number"
                  min={1}
                  max={32}
                  value={options.count}
                  onChange={(event) => set({ count: Number(event.target.value) })}
                />
              </div>
            )}
            {!tenon && options.kind !== 'box' && (
              <div>
                <Label htmlFor="joint-layout-slope">
                  {sliding ? 'Dovetail slope (degrees)' : 'Tail slope (degrees)'}
                </Label>
                <Input
                  id="joint-layout-slope"
                  type="number"
                  min={0}
                  max={30}
                  value={options.slope}
                  onChange={(event) => set({ slope: Number(event.target.value) })}
                />
              </div>
            )}
            {options.kind === 'mitred_blind_dovetail' && (
              <div>
                <Label>Mitred lip thickness</Label>
                <FractionInput
                  ariaLabel="Mitred lip thickness"
                  value={options.mitreLip ?? first.thickness / 3}
                  min={0.001}
                  onChange={(mitreLip) => set({ mitreLip })}
                />
              </div>
            )}
            {sliding && (
              <>
                <div>
                  <Label>Housing depth</Label>
                  <FractionInput
                    ariaLabel="Housing depth"
                    value={options.housingDepth ?? Math.min(first.thickness, second.thickness) / 2}
                    min={0.001}
                    onChange={(housingDepth) => set({ housingDepth })}
                  />
                </div>
                <div>
                  <Label>Housing center from receiving board’s left end</Label>
                  <FractionInput
                    ariaLabel="Housing center from receiving board’s left end"
                    value={
                      options.housingCenter ??
                      (options.receiverOffset !== undefined
                        ? options.receiverOffset + slidingNeck / 2
                        : second.length / 2)
                    }
                    min={0}
                    onChange={(housingCenter) => set({ housingCenter, receiverOffset: undefined })}
                  />
                </div>
                <p className="text-xs text-text-muted">
                  The tongue and housing share the same slope and depth. Assemble by sliding in from an open edge.
                </p>
              </>
            )}
            {options.kind === 'half_blind_dovetail' && (
              <div>
                <Label>Socket depth in {second.name}</Label>
                <FractionInput
                  ariaLabel="Socket depth"
                  value={options.blindDepth}
                  min={0.001}
                  onChange={(blindDepth) => set({ blindDepth })}
                />
              </div>
            )}
            {tenon && (
              <>
                <div>
                  <Label htmlFor="joint-receiver-face">Mortise face</Label>
                  <Select
                    id="joint-receiver-face"
                    value={dims.receiverFace}
                    onChange={(event) => set({ receiverFace: event.target.value as 'top_face' | 'front_face' })}
                  >
                    <option value="front_face">Front edge</option>
                    <option value="top_face">Top face</option>
                  </Select>
                </div>
                {(
                  [
                    ['tenonLength', 'Tenon length', dims.length],
                    ['tenonThickness', 'Tenon thickness', dims.thickness],
                    ['shoulder', 'Shoulder width', dims.shoulder],
                    ['receiverOffset', 'Layout from receiving board’s left end', dims.receiverOffset],
                    ...(options.kind === 'twin_tenon' ? [['gap', 'Gap between tenons', dims.gap] as const] : []),
                    ...(options.kind === 'haunched_tenon'
                      ? [['haunchLength', 'Haunch length', dims.haunchLength] as const]
                      : [])
                  ] as const
                ).map(([key, label, value]) => (
                  <div key={key}>
                    <Label>{label}</Label>
                    <FractionInput ariaLabel={label} value={value} min={0} onChange={(next) => set({ [key]: next })} />
                  </div>
                ))}
              </>
            )}
            <p className="text-xs text-text-muted">
              Existing cuts from this pair’s layout are replaced. Other cuts remain. After applying, each cut can be
              edited separately; later board edits do not silently change its mate.
            </p>
          </div>
          <div className="min-h-64 rounded border border-border" aria-label="Joint layout preview">
            {!plan.error && (
              <Canvas camera={{ position: [-span, span, span], fov: 45 }}>
                <ambientLight intensity={1.2} />
                <directionalLight position={[-10, 20, 10]} intensity={2} />
                <Bounds fit clip observe margin={1.3}>
                  <PreviewBoard part={previewFirst} origin={{ x: 0, y: 0, z: 0 }} moving />
                  <PreviewBoard part={previewSecond} origin={{ x: 0, y: 0, z: 0 }} moving={false} />
                </Bounds>
                <OrbitControls makeDefault />
              </Canvas>
            )}
          </div>
        </div>
        <p role="status" className="text-sm">
          {conflict ?? 'The complementary cuts fit within both boards. Inspect the preview before applying.'}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={Boolean(conflict)}
            onClick={() => {
              batchUpdate([
                { id: first.id, changes: { features: plan.first } },
                { id: second.id, changes: { features: plan.second } }
              ]);
              onClose();
            }}
          >
            Apply matching cuts
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
