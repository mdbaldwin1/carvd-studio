import type { AppSettings, Part, PartFeature } from '../types';

/**
 * Snapping for cuts inside the face they sit on.
 *
 * The part-level detectors solve a different problem: a part is a box moving
 * among other boxes in world space. A cut is a rectangle sliding inside one
 * face of one board, so its anchors are the face's own centre and quarters and
 * the other cuts already on that face. That is a small 2D problem and gets its
 * own resolver rather than a rotation of the 3D one.
 *
 * Everything here works in *face coordinates*: distance from the face's minimum
 * corner, so 0..length along the primary axis and 0..width across the secondary
 * one. Rect cuts are authored that way already; round and rounded cuts are
 * authored from a reference edge or the centre, so they are converted in and
 * back out.
 */

/** Where a cut starts, sits and ends on one axis of its face. */
export interface CutAxisExtent {
  min: number;
  center: number;
  max: number;
}

export interface CutFaceBox {
  primary: CutAxisExtent;
  secondary: CutAxisExtent;
}

export type CutSnapAxis = 'primary' | 'secondary';

export interface CutSnapGuide {
  axis: CutSnapAxis;
  /** Face coordinate the guide sits at. */
  position: number;
  label: string;
  source: 'face' | 'cut';
}

export interface CutSnapResult {
  primaryDelta: number;
  secondaryDelta: number;
  guides: CutSnapGuide[];
}

/** Which edge of the moving cut a candidate is compared against. */
const EDGES: Array<keyof CutAxisExtent> = ['min', 'center', 'max'];

const FRACTIONS: Array<{ at: number; label: string }> = [
  { at: 0, label: 'Start' },
  { at: 0.25, label: '1/4' },
  { at: 0.5, label: 'Centre' },
  { at: 0.75, label: '3/4' },
  { at: 1, label: 'End' }
];

const GOLDEN: Array<{ at: number; label: string }> = [
  { at: 0.382, label: '38.2%' },
  { at: 0.618, label: '61.8%' }
];

/** Face-frame sizes for the only faces a cut can be dragged on. */
export function getFaceSizes(part: Part): { primary: number; secondary: number } {
  return { primary: part.length, secondary: part.width };
}

function extentFrom(center: number, span: number): CutAxisExtent {
  return { min: center - span / 2, center, max: center + span / 2 };
}

/** A reference-relative offset expressed as a distance from the face minimum. */
export function referenceToFaceCoordinate(
  value: number,
  size: number,
  from: 'min' | 'center' | 'max' | undefined
): number {
  if (from === 'min') return value;
  if (from === 'max') return size - value;
  return value + size / 2;
}

/** The inverse, so a snapped face coordinate can be written back to the draft. */
export function faceCoordinateToReference(
  coordinate: number,
  size: number,
  from: 'min' | 'center' | 'max' | undefined
): number {
  if (from === 'min') return coordinate;
  if (from === 'max') return size - coordinate;
  return coordinate - size / 2;
}

/**
 * Where a feature sits on its face, or null when it is not a face cut that can
 * be dragged. Rotated rounded openings report the extent of their footprint,
 * which is what a maker is aligning to.
 */
export function getCutFaceBox(part: Part, feature: PartFeature): CutFaceBox | null {
  if (feature.target.type !== 'face') return null;
  if (feature.target.face !== 'top_face' && feature.target.face !== 'bottom_face') return null;
  const sizes = getFaceSizes(part);

  if (feature.kind === 'rect_cut') {
    const { length, width } = feature.parameters.size;
    return {
      primary: {
        min: feature.placement.x,
        center: feature.placement.x + length / 2,
        max: feature.placement.x + length
      },
      secondary: { min: feature.placement.z, center: feature.placement.z + width / 2, max: feature.placement.z + width }
    };
  }

  if (feature.kind === 'circular_cut') {
    const center = {
      primary: referenceToFaceCoordinate(feature.placement.primary, sizes.primary, feature.reference.primaryFrom),
      secondary: referenceToFaceCoordinate(
        feature.placement.secondary,
        sizes.secondary,
        feature.reference.secondaryFrom
      )
    };
    const span = feature.parameters.diameter;
    return { primary: extentFrom(center.primary, span), secondary: extentFrom(center.secondary, span) };
  }

  if (feature.kind === 'rounded_cut') {
    const center = {
      primary: referenceToFaceCoordinate(feature.placement.primary, sizes.primary, feature.reference.primaryFrom),
      secondary: referenceToFaceCoordinate(
        feature.placement.secondary,
        sizes.secondary,
        feature.reference.secondaryFrom
      )
    };
    const angle = ((feature.placement.rotation ?? 0) * Math.PI) / 180;
    const cos = Math.abs(Math.cos(angle));
    const sin = Math.abs(Math.sin(angle));
    const { length, width } = feature.parameters;
    return {
      primary: extentFrom(center.primary, length * cos + width * sin),
      secondary: extentFrom(center.secondary, length * sin + width * cos)
    };
  }

  return null;
}

interface Candidate {
  position: number;
  label: string;
  source: 'face' | 'cut';
}

function faceCandidates(
  size: number,
  settings: Pick<AppSettings, 'enableFractionalAnchors' | 'enableSurfaceAnchors' | 'enableGoldenRatioAnchors'>
): Candidate[] {
  const candidates: Candidate[] = [];
  // Surface anchors are the centre and quarter lines; the fractional set adds
  // the two face edges. Either toggle alone still offers the centre, because a
  // maker reaching for "dead centre" should not have to know which is which.
  if (settings.enableSurfaceAnchors !== false || settings.enableFractionalAnchors !== false) {
    for (const fraction of FRACTIONS) {
      const isEdge = fraction.at === 0 || fraction.at === 1;
      if (isEdge && settings.enableFractionalAnchors === false) continue;
      if (!isEdge && settings.enableSurfaceAnchors === false && settings.enableFractionalAnchors === false) continue;
      candidates.push({ position: size * fraction.at, label: fraction.label, source: 'face' });
    }
  }
  if (settings.enableGoldenRatioAnchors) {
    for (const golden of GOLDEN) {
      candidates.push({ position: size * golden.at, label: golden.label, source: 'face' });
    }
  }
  return candidates;
}

function cutCandidates(boxes: CutFaceBox[], axis: CutSnapAxis): Candidate[] {
  const candidates: Candidate[] = [];
  boxes.forEach((box, index) => {
    const extent = box[axis];
    candidates.push({ position: extent.center, label: `Centre of cut ${index + 1}`, source: 'cut' });
    candidates.push({ position: extent.min, label: `Edge of cut ${index + 1}`, source: 'cut' });
    candidates.push({ position: extent.max, label: `Edge of cut ${index + 1}`, source: 'cut' });
  });
  return candidates;
}

function bestForAxis(
  moving: CutAxisExtent,
  candidates: Candidate[],
  threshold: number,
  edges: Array<keyof CutAxisExtent>
): { delta: number; guide: CutSnapGuide } | null {
  let best: { delta: number; guide: CutSnapGuide; distance: number } | null = null;
  for (const candidate of candidates) {
    for (const edge of edges) {
      const distance = Math.abs(candidate.position - moving[edge]);
      if (distance > threshold) continue;
      // A tie goes to the cut's own centre: lining middles up is what a maker
      // means far more often than catching an edge in passing.
      const rank = edge === 'center' ? distance - 1e-9 : distance;
      if (best && rank >= best.distance) continue;
      best = {
        distance: rank,
        delta: candidate.position - moving[edge],
        guide: { axis: 'primary', position: candidate.position, label: candidate.label, source: candidate.source }
      };
    }
  }
  return best ? { delta: best.delta, guide: best.guide } : null;
}

export interface CutSnapInput {
  part: Part;
  /** The cut being dragged, already carrying the pointer's raw position. */
  moving: CutFaceBox;
  /**
   * Which parts of the moving cut may catch an anchor. A pocket aligns by its
   * edges as readily as its middle, but a hole's rim catching a centreline is
   * rarely what anyone meant, so round cuts offer their centre alone.
   */
  movingEdges?: Array<keyof CutAxisExtent>;
  /** Every other enabled cut on the same face. */
  others: CutFaceBox[];
  settings: Pick<AppSettings, 'enableFractionalAnchors' | 'enableSurfaceAnchors' | 'enableGoldenRatioAnchors'>;
  threshold: number;
}

/**
 * How far the dragged cut has to move to land on its nearest anchor, and the
 * guides that explain why. Each axis is resolved on its own, so a cut can lock
 * to the face centre one way while still sliding freely the other.
 */
export function resolveCutSnap({
  part,
  moving,
  others,
  settings,
  threshold,
  movingEdges = EDGES
}: CutSnapInput): CutSnapResult {
  if (!(threshold > 0)) return { primaryDelta: 0, secondaryDelta: 0, guides: [] };
  const sizes = getFaceSizes(part);
  const guides: CutSnapGuide[] = [];

  const primary = bestForAxis(
    moving.primary,
    [...faceCandidates(sizes.primary, settings), ...cutCandidates(others, 'primary')],
    threshold,
    movingEdges
  );
  const secondary = bestForAxis(
    moving.secondary,
    [...faceCandidates(sizes.secondary, settings), ...cutCandidates(others, 'secondary')],
    threshold,
    movingEdges
  );

  if (primary) guides.push({ ...primary.guide, axis: 'primary' });
  if (secondary) guides.push({ ...secondary.guide, axis: 'secondary' });

  return {
    primaryDelta: primary?.delta ?? 0,
    secondaryDelta: secondary?.delta ?? 0,
    guides
  };
}

/** How close a drag has to be before it snaps, in inches. */
export function getCutSnapThreshold(part: Part, sensitivity: AppSettings['snapSensitivity']): number {
  const span = Math.max(part.length, part.width, 1);
  const fraction = sensitivity === 'loose' ? 0.02 : sensitivity === 'tight' ? 0.005 : 0.01;
  return span * fraction;
}
