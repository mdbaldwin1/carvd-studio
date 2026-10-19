import { DocsLink } from '../common/library/DocsLink';
import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, OrbitControls } from '@react-three/drei';
import type { Part, Stock } from '@renderer/types';
import { useProjectStore } from '@renderer/store/projectStore';
import { getAssemblyReferences } from '@renderer/utils/assemblyLayout';
import { getFaceFrame } from '@renderer/utils/roundCutUtils';
import {
  defaultInsertSocketOptions,
  insertDimensions,
  planInsertSocket,
  type InsertSocketOptions
} from '@renderer/utils/insertSocket';
import { getPartFeatureConflicts } from '@renderer/utils/partFeatureConflicts';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { FractionInput } from '../common/FractionInput';
import { PreviewBoard } from './AssemblyPlacementDialog';

export function InsertSocketDialog({
  board,
  insert,
  stocks,
  onClose
}: {
  board: Part;
  insert: Part;
  stocks: Stock[];
  onClose: () => void;
}) {
  const dims = insertDimensions(insert, stocks);
  const [options, setOptions] = useState<InsertSocketOptions>(() => {
    const saved = board.features?.find(
      (cut) => (cut.metadata?.insertSocket as { insertPartId?: string } | undefined)?.insertPartId === insert.id
    )?.metadata?.insertSocket as InsertSocketOptions | undefined;
    return saved ?? defaultInsertSocketOptions(board, insert, stocks, useProjectStore.getState().parts);
  });
  const updatePart = useProjectStore((state) => state.updatePart);
  const plan = useMemo(() => planInsertSocket(board, insert, stocks, options), [board, insert, stocks, options]);
  const conflict =
    plan.error ?? getPartFeatureConflicts(plan.features, board).find((issue) => issue.severity === 'error')?.message;
  const preview = useMemo(() => ({ ...board, features: plan.features }), [board, plan.features]);
  const set = (patch: Partial<InsertSocketOptions>) => setOptions((current) => ({ ...current, ...patch }));
  const span = Math.max(board.length, board.width, 1);
  const referenceEdges = {
    front_face: ['left end', 'bottom face'],
    back_face: ['right end', 'bottom face'],
    top_face: ['left end', 'back edge'],
    bottom_face: ['left end', 'front edge'],
    left_end: ['back edge', 'bottom face'],
    right_end: ['front edge', 'bottom face']
  }[options.face];
  const chooseFace = (face: InsertSocketOptions['face']) => {
    const frame = getFaceFrame(board, face);
    set({ face, fromStart: frame.primarySize / 2, fromNearEdge: frame.secondarySize / 2 });
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-3xl overflow-y-auto p-4">
        <DialogTitle>Cut a socket for the insert</DialogTitle>
        <DialogDescription>
          Use {insert.name} as the pattern for {board.name}. Measurements locate the socket’s center on the selected
          face. Click the receiving face in the preview to change it.
        </DialogDescription>
        <DocsLink section="insert-sockets">Insert and socket guide</DocsLink>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <div>
              <Label htmlFor="insert-mating-end">End of insert entering this board</Label>
              <Select
                id="insert-mating-end"
                value={options.matingFace ?? dims.matingFace}
                onChange={(event) => set({ matingFace: event.target.value as InsertSocketOptions['matingFace'] })}
              >
                <option value={dims.matingFace}>{dims.biscuit ? 'Front half' : 'Right end'}</option>
                <option value={dims.biscuit ? 'back_face' : 'left_end'}>
                  {dims.biscuit ? 'Back half' : 'Left end'}
                </option>
              </Select>
            </div>
            <div>
              <Label htmlFor="insert-socket-face">Receiving face</Label>
              <Select
                id="insert-socket-face"
                value={options.face}
                onChange={(event) => {
                  const face = event.target.value as InsertSocketOptions['face'];
                  chooseFace(face);
                }}
              >
                <option value="front_face">Front edge</option>
                <option value="back_face">Back edge</option>
                {!dims.biscuit && <option value="top_face">Top face</option>}
                {!dims.biscuit && <option value="bottom_face">Bottom face</option>}
                {dims.round && (
                  <>
                    <option value="left_end">Left end</option>
                    <option value="right_end">Right end</option>
                  </>
                )}
              </Select>
            </div>
            {(
              [
                ['fromStart', `Center from ${referenceEdges[0]}`],
                ['fromNearEdge', `Center from ${referenceEdges[1]}`],
                ['insertion', 'Insert depth'],
                ['clearance', 'Total width clearance'],
                ['bottomSpace', 'Extra depth for glue']
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label>{label}</Label>
                <FractionInput
                  ariaLabel={label}
                  value={options[key]}
                  min={0}
                  onChange={(value) => set({ [key]: value })}
                />
              </div>
            ))}
            <p className="text-xs text-text-muted">
              Clearance enlarges the opening’s full width and thickness. The insert keeps its stock dimensions. After
              cutting, use Bring pieces together to seat it.
            </p>
          </div>
          <div className="min-h-64 rounded border border-border" aria-label="Insert socket preview">
            {!plan.error && (
              <Canvas camera={{ position: [span, span, span], fov: 45 }}>
                <ambientLight intensity={1.2} />
                <directionalLight position={[10, 20, 10]} intensity={2} />
                <Bounds fit clip observe margin={1.3}>
                  <PreviewBoard
                    part={preview}
                    origin={board.position}
                    moving={false}
                    reference={getAssemblyReferences(board).find((reference) => reference.id === options.face)}
                    onPickFace={(face) => {
                      if (
                        dims.biscuit
                          ? ['front_face', 'back_face'].includes(face)
                          : dims.round || !['left_end', 'right_end'].includes(face)
                      )
                        chooseFace(face as InsertSocketOptions['face']);
                    }}
                  />
                </Bounds>
                <OrbitControls makeDefault />
              </Canvas>
            )}
          </div>
        </div>
        <p role="status" className="text-sm">
          {conflict ?? 'The socket fits within the receiving board.'}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={Boolean(conflict)}
            onClick={() => {
              if (updatePart(board.id, { features: plan.features })) onClose();
            }}
          >
            Apply socket
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
