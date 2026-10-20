/**
 * The drill bits a shop owns.
 *
 * Bore diameter is not a free number. You bore 3/8" because you own a 3/8" bit
 * and 3/8" dowel, and the bit you reach for is the one in the case. The app
 * already models physical router tools down to their cutter, neck, shank and
 * bearing spans; this is the same idea at the size a drill index comes in.
 *
 * Kept deliberately thin. A bit is a diameter, a name, and what it is good
 * for -- anything more would be modelling the case rather than the cut.
 */

const MM = 1 / 25.4;

/**
 * What the bit leaves behind, which is the part that matters downstream.
 *
 * - `twist`     a plain round hole; the general-purpose case.
 * - `brad_point` also round, but it leaves a clean rim and a flat bottom,
 *   which is what a dowel wants.
 * - `forstner`  flat-bottomed and able to bore an overlapping or part-edge
 *   hole, for hinge cups and counterbores.
 */
export type DrillBitKind = 'twist' | 'brad_point' | 'forstner';

export const DRILL_BIT_KIND_LABELS: Record<DrillBitKind, string> = {
  twist: 'Twist',
  brad_point: 'Brad point',
  forstner: 'Forstner'
};

export interface DrillBit {
  id: string;
  name: string;
  diameter: number;
  kind: DrillBitKind;
  /** Usable depth of cut. A Forstner is far shallower than a long twist bit. */
  maxDepth: number;
}

function bit(id: string, name: string, diameter: number, kind: DrillBitKind, maxDepth: number): DrillBit {
  return { id, name, diameter, kind, maxDepth };
}

/**
 * A fractional brad-point set, which is the index most shops reach for when
 * boring for dowels: 1/8" to 1/2" by sixteenths.
 */
export const BRAD_POINT_BITS: DrillBit[] = Array.from({ length: 7 }, (_, index) => {
  const sixteenths = 2 + index * 2;
  const diameter = sixteenths / 16;
  return bit(`bit-brad-${sixteenths}-16`, `${formatInches(diameter)} Brad Point`, diameter, 'brad_point', 4);
});

/** The metric equivalents, for anyone working to 6, 8 and 10 mm dowel. */
export const METRIC_BRAD_POINT_BITS: DrillBit[] = [6, 8, 10, 12].map((mm) =>
  bit(`bit-brad-${mm}mm`, `${mm} mm Brad Point`, mm * MM, 'brad_point', 4)
);

/** Flat-bottomed, for hinge cups, counterbores and plugs. */
export const FORSTNER_BITS: DrillBit[] = [0.375, 0.5, 0.625, 0.75, 1, 1.25, 1.375].map((diameter) =>
  bit(`bit-forstner-${Math.round(diameter * 1000)}`, `${formatInches(diameter)} Forstner`, diameter, 'forstner', 1.5)
);

/** As the size is marked on the shank: reduced, so 8/16 reads as 1/2. */
function formatInches(value: number): string {
  const sixteenths = Math.round(value * 16);
  if (sixteenths % 16 === 0) return `${sixteenths / 16}"`;
  const divide = (a: number, b: number): number => (b === 0 ? a : divide(b, a % b));
  const factor = divide(sixteenths, 16);
  return `${sixteenths / factor}/${16 / factor}"`;
}

export const DRILL_BIT_CATALOG: DrillBit[] = [...BRAD_POINT_BITS, ...METRIC_BRAD_POINT_BITS, ...FORSTNER_BITS];

/** The bit that bores a hole this size, preferring the kind a dowel wants. */
export function findBitForDiameter(diameter: number, tolerance = 1e-6): DrillBit | undefined {
  const matches = DRILL_BIT_CATALOG.filter((candidate) => Math.abs(candidate.diameter - diameter) <= tolerance);
  return matches.find((candidate) => candidate.kind === 'brad_point') ?? matches[0];
}

/**
 * Whether a hole this deep is within the bit's reach.
 *
 * A Forstner runs out of flute long before a twist bit does, which is the
 * kind of thing you find out at the drill press rather than in a drawing.
 */
export function bitReachesDepth(bit: DrillBit, depth: number): boolean {
  return depth <= bit.maxDepth + 1e-9;
}
