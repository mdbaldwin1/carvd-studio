import type { FaceTarget, Part, PartFeature, Stock } from '../types';
import { isRoundStock } from '../../../shared/stock';
import { getFaceFrame, validateCircularCut, validateRoundedCut } from './roundCutUtils';
import { validateRectCutFeature } from './rectCutUtils';

export interface InsertSocketOptions {
  face: FaceTarget;
  matingFace?: FaceTarget;
  fromStart: number;
  fromNearEdge: number;
  insertion: number;
  clearance: number;
  bottomSpace: number;
}

export function defaultInsertSocketOptions(
  board: Part,
  insert: Part,
  stocks: readonly Stock[],
  parts: readonly Part[]
): InsertSocketOptions {
  const dims = insertDimensions(insert, stocks);
  const opposite: FaceTarget = dims.biscuit ? 'back_face' : 'left_end';
  const other = parts
    .filter((part) => part.id !== board.id)
    .flatMap((part) => part.features ?? [])
    .find(
      (cut) =>
        cut.enabled && (cut.metadata?.insertSocket as { insertPartId?: string } | undefined)?.insertPartId === insert.id
    )?.metadata?.insertSocket as (InsertSocketOptions & { matingFace?: FaceTarget }) | undefined;
  return {
    face: 'front_face',
    matingFace: other?.matingFace === dims.matingFace ? opposite : dims.matingFace,
    fromStart: board.length / 2,
    fromNearEdge: board.thickness / 2,
    insertion:
      other && other.insertion > 0 && other.insertion < dims.length ? dims.length - other.insertion : dims.length / 2,
    clearance: other?.clearance ?? 0,
    bottomSpace: other?.bottomSpace ?? 0.04
  };
}

export function isJoineryInsert(part: Part, stocks: readonly Stock[]): boolean {
  const stock = stocks.find((candidate) => candidate.id === part.stockId);
  return Boolean(
    stock &&
    (isRoundStock(stock) ||
      (stock.form === 'insert' && ['domino', 'biscuit', 'loose_tenon'].includes(stock.insertKind ?? '')))
  );
}

export function insertDimensions(insert: Part, stocks: readonly Stock[]) {
  const stock = stocks.find((candidate) => candidate.id === insert.stockId);
  const round = Boolean(stock && isRoundStock(stock));
  const biscuit = insert.blankShape === 'biscuit';
  return {
    round,
    rounded: insert.blankShape === 'domino' || biscuit,
    biscuit,
    length: biscuit ? insert.width : insert.length,
    width: round ? insert.thickness : biscuit ? insert.length : insert.width,
    thickness: insert.thickness,
    matingFace: (biscuit ? 'front_face' : 'right_end') as FaceTarget
  };
}

/** Cut one receiving board from a real insert. The second socket can be laid out on its mate separately. */
export function planInsertSocket(
  board: Part,
  insert: Part,
  stocks: readonly Stock[],
  options: InsertSocketOptions
): {
  features: PartFeature[];
  error: string | null;
} {
  const fail = (error: string) => ({ features: [], error });
  if (!isJoineryInsert(insert, stocks))
    return fail('Choose dowel, Domino, biscuit, or loose-tenon stock for the insert.');
  const dims = insertDimensions(insert, stocks);
  const matingFace = options.matingFace ?? dims.matingFace;
  if (!(dims.biscuit ? ['front_face', 'back_face'] : ['left_end', 'right_end']).includes(matingFace))
    return fail('Choose one of the insert’s two insertion ends.');
  if (
    ![options.fromStart, options.fromNearEdge, options.insertion, options.clearance, options.bottomSpace].every(
      Number.isFinite
    )
  )
    return fail('All socket measurements must be finite.');
  if (options.clearance < 0 || options.bottomSpace < 0 || options.insertion <= 0 || options.insertion > dims.length)
    return fail('Insertion must fit the insert; clearance and bottom space cannot be negative.');
  const key = `insert-socket:${board.id}:${insert.id}`;
  const width = dims.width + options.clearance;
  const height = dims.thickness + options.clearance;
  const depth = options.insertion + options.bottomSpace;
  const frame = getFaceFrame(board, options.face);
  const base = {
    id: key,
    version: 1 as const,
    enabled: true,
    label: `${insert.name} socket`,
    target: { type: 'face' as const, face: options.face },
    reference: { primaryFrom: 'min' as const, secondaryFrom: 'min' as const },
    metadata: { insertSocket: { insertPartId: insert.id, ...options, matingFace } }
  };
  let feature: PartFeature;
  let error: string | null;
  if (dims.round) {
    feature = {
      ...base,
      kind: 'circular_cut',
      cutType: 'round_hole',
      parameters: { diameter: height, depthMode: 'blind', depth, tilt: 0, direction: 0 },
      placement: { primary: options.fromStart, secondary: options.fromNearEdge, rotation: 0 }
    };
    error = validateCircularCut(feature, board);
  } else if (dims.rounded) {
    feature = {
      ...base,
      kind: 'rounded_cut',
      cutType: 'rounded_slot',
      parameters: {
        length: dims.biscuit
          ? Math.max(width, 2 * Math.sqrt(Math.max(0, 2 * (50 / 25.4) * depth - depth * depth)))
          : width,
        width: height,
        cornerRadius: height / 2,
        depthMode: 'blind',
        depth,
        ...(dims.biscuit ? { plateJoiner: true } : {})
      },
      placement: { primary: options.fromStart, secondary: options.fromNearEdge, rotation: 0 }
    };
    error = validateRoundedCut(feature, board);
  } else {
    // Rectangular pockets use the physical negative-X edge on both long faces.
    const center = options.face === 'back_face' ? frame.primarySize - options.fromStart : options.fromStart;
    const across = options.face === 'bottom_face' ? frame.secondarySize - options.fromNearEdge : options.fromNearEdge;
    feature = {
      ...base,
      kind: 'rect_cut',
      cutType: 'mortise',
      parameters: { size: { length: width, width: height }, depthMode: 'blind', depth },
      placement: { x: center - width / 2, z: across - height / 2 }
    };
    error = validateRectCutFeature(feature, board);
  }
  if (error) return fail(error);
  return {
    features: [
      ...(board.features ?? []).filter(
        (cut) => (cut.metadata?.insertSocket as { insertPartId?: string } | undefined)?.insertPartId !== insert.id
      ),
      feature
    ],
    error: null
  };
}
