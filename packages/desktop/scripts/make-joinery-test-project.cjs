/**
 * Build a test project carrying one station per joint the app can express.
 *
 * Every position here is computed from the parts' own extents rather than
 * eyeballed, and the project keeps overlap prevention switched ON, so the file
 * has to survive the same check the app applies while you drag.
 *
 * Two presentations, and the difference is deliberate:
 *
 *  - SEATED, where one piece goes into a housing the app understands -- a
 *    tenon in a mortise, a shelf in a dado, a dowel in its hole. The app knows
 *    these are assembly rather than collision, so they are shown home.
 *  - EXPLODED, everywhere else, with the pieces set a little apart. Pushing
 *    them together would be a genuine interpenetration, and drawing one to
 *    make a picture look right is the sort of thing this file exists to catch.
 *
 * Regenerate rather than hand-edit:
 *   node scripts/make-joinery-test-project.cjs "<path>.carvd"
 */
const { randomUUID } = require('crypto');
const { writeFileSync } = require('fs');

const id = () => randomUUID();
const MM = 1 / 25.4;
/** Enough daylight to read the joint, and to be plainly a gap. */
const EXPLODE = 0.75;

// ---------------------------------------------------------------- stock
// Three species, light, dark and pale, so the two halves of a joint and
// whatever goes between them are told apart at a glance. Contrasting woods
// are what a real sample board is made of, for exactly this reason.
const OAK = {
  id: id(),
  name: '4/4 White Oak',
  length: 96,
  width: 8,
  thickness: 0.75,
  grainDirection: 'length',
  pricingUnit: 'board_foot',
  pricePerUnit: 9,
  color: '#c9a978',
  form: 'board'
};
const OAK8 = {
  id: id(),
  name: '8/4 White Oak',
  length: 96,
  width: 6,
  thickness: 1.75,
  grainDirection: 'length',
  pricingUnit: 'board_foot',
  pricePerUnit: 14,
  color: '#c9a978',
  form: 'board'
};
const OAK12 = { ...OAK8, id: id(), name: '12/4 White Oak (surfaced)', thickness: 2.5, pricePerUnit: 18 };
const OAK_PANEL = { ...OAK, id: id(), name: 'White Oak Panel (purchased pre-glued)', width: 14 };
const WAL = {
  id: id(),
  name: '4/4 Black Walnut',
  length: 96,
  width: 8,
  thickness: 0.75,
  grainDirection: 'length',
  pricingUnit: 'board_foot',
  pricePerUnit: 16,
  color: '#4a3524',
  form: 'board'
};
const WAL8 = {
  id: id(),
  name: '8/4 Black Walnut',
  length: 96,
  width: 6,
  thickness: 1.75,
  grainDirection: 'length',
  pricingUnit: 'board_foot',
  pricePerUnit: 24,
  color: '#4a3524',
  form: 'board'
};
const MAP = {
  id: id(),
  name: '4/4 Hard Maple',
  length: 96,
  width: 8,
  thickness: 0.75,
  grainDirection: 'length',
  pricingUnit: 'board_foot',
  pricePerUnit: 11,
  color: '#efe2c2',
  form: 'board'
};
const MAP8 = {
  id: id(),
  name: '8/4 Hard Maple',
  length: 96,
  width: 6,
  thickness: 1.75,
  grainDirection: 'length',
  pricingUnit: 'board_foot',
  pricePerUnit: 18,
  color: '#efe2c2',
  form: 'board'
};
const PLY = {
  id: id(),
  name: '3/4" Baltic Birch Plywood',
  length: 96,
  width: 48,
  thickness: 0.71875,
  grainDirection: 'none',
  pricingUnit: 'per_item',
  pricePerUnit: 72,
  color: '#d8c39a',
  form: 'sheet'
};
const DOWEL38 = {
  id: id(),
  name: '3/8" Birch Dowel',
  length: 36,
  width: 0.375,
  thickness: 0.375,
  grainDirection: 'length',
  pricingUnit: 'per_item',
  pricePerUnit: 3.5,
  color: '#e8d9ae',
  form: 'rod'
};
const DOWEL14 = {
  id: id(),
  name: '1/4" Birch Dowel',
  length: 36,
  width: 0.25,
  thickness: 0.25,
  grainDirection: 'length',
  pricingUnit: 'per_item',
  pricePerUnit: 2.75,
  color: '#e8d9ae',
  form: 'rod'
};
const BISCUIT = {
  id: id(),
  name: '#20 Biscuit',
  length: 56 * MM,
  width: 23 * MM,
  thickness: 4 * MM,
  grainDirection: 'none',
  pricingUnit: 'per_item',
  pricePerUnit: 13.99,
  color: '#e6d7ad',
  form: 'insert',
  insertKind: 'biscuit',
  packSize: 100
};
const DOMINO = {
  id: id(),
  name: '6 × 20 × 40 mm Domino',
  length: 40 * MM,
  width: 20 * MM,
  thickness: 6 * MM,
  grainDirection: 'length',
  pricingUnit: 'per_item',
  pricePerUnit: 28,
  color: '#d9bd85',
  form: 'insert',
  insertKind: 'domino',
  packSize: 190
};
const THIN_PLY = {
  ...PLY,
  id: id(),
  name: '1/8" Baltic Birch Plywood',
  length: 24,
  width: 24,
  thickness: 0.125,
  pricePerUnit: 0 // Unpriced sample stock; obtain a supplier quote.
};
const stocks = [THIN_PLY, OAK, OAK8, OAK12, OAK_PANEL, WAL, WAL8, MAP, MAP8, PLY, DOWEL38, DOWEL14, BISCUIT, DOMINO];

/**
 * Which board a species comes out of, thin or thick.
 *
 * A part is given a species by the part it plays in its joint, and the stock
 * follows from how thick it has to be -- 8/4 for a leg, 4/4 for a rail.
 */
const SPECIES = {
  oak: [OAK, OAK8],
  walnut: [WAL, WAL8],
  maple: [MAP, MAP8]
};
/** First part of a joint, then its mate, then whatever goes between them. */
const ROLE_SPECIES = ['oak', 'walnut', 'maple'];

// ------------------------------------------------------------- features
const rect = (label, cutType, target, parameters, placement, reference) => ({
  id: id(),
  kind: 'rect_cut',
  version: 1,
  enabled: true,
  label,
  cutType,
  target,
  reference: reference ?? { primaryFrom: 'min' },
  parameters,
  placement
});
const face = (f) => ({ type: 'face', face: f });
const edge = (e) => ({ type: 'edge', edge: e });
const corner = (c) => ({ type: 'corner', corner: c });

const hole = (label, f, diameter, depth, primary, secondary) => ({
  id: id(),
  kind: 'circular_cut',
  version: 1,
  enabled: true,
  label,
  cutType: 'round_hole',
  target: face(f),
  reference: { primaryFrom: 'center', secondaryFrom: 'center' },
  placement: { primary, secondary, rotation: 0 },
  parameters:
    depth === null
      ? { diameter, depthMode: 'through', tilt: 0, direction: 0 }
      : { diameter, depthMode: 'blind', depth, tilt: 0, direction: 0 }
});

// A through bore may be drilled before the cheeks are sawn. Author the
// individual shoulder cuts so all operations remain in blank coordinates.
const sawnTenon = (length, width = 2, thickness = 0.25, blankLength = 12, blankWidth = 3, blankThickness = 0.75) => {
  const x = blankLength - length;
  const shoulder = (blankWidth - width) / 2;
  return [
    ...['top_face', 'bottom_face'].map((f) =>
      rect(
        'Tenon cheek',
        'cutout',
        face(f),
        { size: { length, width }, depthMode: 'blind', depth: (blankThickness - thickness) / 2 },
        { x, z: shoulder }
      )
    ),
    ...[0, blankWidth - shoulder].map((z) =>
      rect(
        'Tenon edge shoulder',
        'cutout',
        face('top_face'),
        { size: { length, width: shoulder }, depthMode: 'through' },
        { x, z }
      )
    )
  ];
};
const routerPass = (label, f, points, diameter, depth, bit = {}) => ({
  id: id(),
  kind: 'routed_path',
  version: 1,
  enabled: true,
  label,
  target: face(f),
  reference: { primaryFrom: 'center', secondaryFrom: 'center' },
  path: { points: points.map(([primary, secondary]) => ({ primary, secondary })) },
  bit: { profile: 'straight', diameter, ...bit },
  parameters: depth === null ? { depthMode: 'through' } : { depthMode: 'blind', depth }
});

const endCut = (label, f, horizontalAngle, horizontalFlip = false) => ({
  id: id(),
  kind: 'end_cut',
  version: 1,
  enabled: true,
  label,
  target: face(f),
  reference: { primaryFrom: f === 'left_end' ? 'min' : 'max' },
  cutType: 'mitre',
  lengthMode: 'long_point',
  parameters: { horizontalAngle, horizontalFlip }
});

/**
 * Close a mitred corner: two flat pieces meeting at a right angle, each
 * giving up half the square where they cross.
 *
 * The leg is turned a quarter about Y, which sends its length down -Z -- so
 * the end that reaches the corner is its *right*, not its left, and mitring
 * the left end puts the cut twelve inches away at the far end instead. The
 * two mitres must also lean opposite ways, or both pieces keep the same half
 * of the square and drive straight through each other.
 */
const mitreCorner = (rail, stile) => {
  stile.position.x = rail.position.x + ext(rail).x - ext(stile).x;
  stile.position.z = rail.position.z - ext(rail).z + ext(stile).z;
  return stile;
};

const slot = (label, f, length, width, depth, primary, secondary) => ({
  id: id(),
  kind: 'rounded_cut',
  version: 1,
  enabled: true,
  label,
  cutType: 'rounded_slot',
  target: face(f),
  reference: { primaryFrom: 'center', secondaryFrom: 'center' },
  parameters: { length, width, cornerRadius: width / 2, depthMode: 'blind', depth },
  placement: { primary, secondary, rotation: 0 }
});

/**
 * A groove run the length of one of a board's long edges, centred in its
 * thickness -- which is where a tongue, a spline or a panel actually goes.
 * A groove ploughed in the face instead would be a dado for a shelf.
 *
 * Placement on an edge face is measured from the near end and the near face,
 * never from the middle, so the centring is done here.
 */
/**
 * Half the stock out of one face, for a lap.
 *
 * The two halves of a lap are mirror images: the piece underneath gives up
 * its top, the piece on top gives up its underside, and the two finish flush
 * with one another. Cutting both on the top face leaves the upper piece
 * sitting on the lower one like a plank on a plank.
 */
const lapCut = (label, f, x, size = 3) =>
  rect(
    label,
    'half_lap',
    face(f),
    { size: { length: size, width: size }, depthMode: 'blind', depth: 0.375 },
    { x, z: 0 }
  );

const edgeGroove = (label, f, width, depth, thickness = 0.75, length = 12) =>
  rect(
    label,
    'groove',
    face(f),
    { size: { length, width }, depthMode: 'blind', depth },
    { x: 0, z: (thickness - width) / 2 }
  );

// ------------------------------------------------------------ placement
/**
 * Half extents in world axes. Only quarter turns are used here, so the local
 * length/thickness/width simply swap places rather than needing a matrix.
 */
function ext(p) {
  const [rx, ry, rz] = ['x', 'y', 'z'].map((k) => ((p.rotation?.[k] ?? 0) * Math.PI) / 180);
  const out = { x: 0, y: 0, z: 0 };
  for (const v of [
    [p.length / 2, 0, 0],
    [0, p.thickness / 2, 0],
    [0, 0, p.width / 2]
  ]) {
    const x1 = v[0] * Math.cos(rz) - v[1] * Math.sin(rz),
      y1 = v[0] * Math.sin(rz) + v[1] * Math.cos(rz);
    const x2 = x1 * Math.cos(ry) + v[2] * Math.sin(ry),
      z2 = -x1 * Math.sin(ry) + v[2] * Math.cos(ry);
    out.x += Math.abs(x2);
    out.y += Math.abs(y1 * Math.cos(rx) - z2 * Math.sin(rx));
    out.z += Math.abs(y1 * Math.sin(rx) + z2 * Math.cos(rx));
  }
  return out;
}
/** Stand a part on the ground. */
const onGround = (p) => {
  p.position.y = ext(p).y;
  return p;
};
/** Put b's low face against a's high face on one axis. */
const against = (a, b, axis) => {
  b.position[axis] = a.position[axis] + ext(a)[axis] + ext(b)[axis];
  return b;
};
/** The same, with a visible gap: pieces that would otherwise interpenetrate. */
const apartFrom = (a, b, axis, gap = EXPLODE) => {
  against(a, b, axis);
  b.position[axis] += gap;
  return b;
};
/**
 * Stand b clear of a on the named axis, on whichever side `dir` says.
 *
 * `against` only ever works toward +axis, so reaching the other side by
 * passing a negative gap has to travel the whole way back through a -- which
 * lands inside it unless the gap is guessed exactly right. Taking the side as
 * a sign instead makes the piece land clear by construction.
 */
const clearOf = (a, b, axis, dir, gap = EXPLODE) => {
  b.position[axis] = a.position[axis] + dir * (ext(a)[axis] + ext(b)[axis] + gap);
  return b;
};

/**
 * Bury a rail's tenon in a leg's mortise.
 *
 * The leg is stood up with a quarter turn about Z, which points its top face
 * along -X. The mortise therefore opens that way, and the rail comes from -X
 * with its leading end tenoned. The tenon's tip lands on the mortise floor.
 */
function seatTenon(leg, rail, { tenonLength, mortiseFromMin, mortiseLength }) {
  const legHalf = ext(leg);
  // The shoulder is what seats, not the tip. A mortise is chopped deeper than
  // its tenon is long so that glue and shavings have somewhere to go, and a
  // rail pushed until its tip touched that floor would stand its shoulders
  // proud of the leg by exactly the relief. Seat the shoulder on the leg's
  // face and let the relief be the air gap it is meant to be.
  const faceX = leg.position.x - legHalf.x;
  rail.position.x = faceX + tenonLength - ext(rail).x;
  rail.position.z = leg.position.z;
  // The mortise is placed from the leg's min end, and a quarter turn about Z
  // puts that end at the bottom -- so measure up, not down.
  rail.position.y = leg.position.y - legHalf.y + mortiseFromMin + mortiseLength / 2;
}

const parts = [];
const groups = [];
const groupMembers = [];

function station(name, note, build) {
  const status = note.includes('APPROXIMATE') ? ' (Approximate)' : note.startsWith('EXPLODED') ? ' (Exploded)' : '';
  const group = { id: id(), name: name + status };
  groups.push(group);
  let role = 0;
  for (const part of build()) {
    if (note && !part.notes) part.notes = note;
    if (!part.__chosen) {
      // Beyond the second piece everything is "the bit that goes between",
      // so the wedges of one joint all match rather than turning into a
      // rainbow.
      const species = part.__species ?? ROLE_SPECIES[Math.min(role, ROLE_SPECIES.length - 1)];
      const [thin, thick] = SPECIES[species];
      const stock = part.thickness > thin.thickness ? thick : thin;
      part.stockId = stock.id;
      part.color = stock.color;
      role += 1;
    }
    const assigned = stocks.find((stock) => stock.id === part.stockId);
    if (assigned?.form === 'rod' || assigned?.insertKind === 'dowel_pin') part.blankShape = 'round';
    delete part.__species;
    delete part.__chosen;
    parts.push(part);
    groupMembers.push({ id: id(), groupId: group.id, memberType: 'part', memberId: part.id });
  }
}

let column = 0,
  row = 0;
const COLS = 6,
  DX = 44,
  DZ = 40;
function origin() {
  const o = { x: column * DX, z: row * DZ };
  column += 1;
  if (column >= COLS) {
    column = 0;
    row += 1;
  }
  return o;
}

const board = (name, o, opts = {}) => {
  const p = {
    id: id(),
    name,
    length: opts.length ?? 12,
    width: opts.width ?? 3,
    thickness: opts.thickness ?? 0.75,
    position: { x: o.x + (opts.dx ?? 0), y: 0, z: o.z + (opts.dz ?? 0) },
    rotation: opts.rotation ?? { x: 0, y: 0, z: 0 },
    stockId: opts.stockId ?? null,
    grainSensitive: opts.grainSensitive ?? true,
    grainDirection: 'length',
    color: opts.color ?? null,
    // Filled in by the station unless the caller named a stock itself, which
    // it does for the pieces that are a particular thing: a dowel, a biscuit,
    // a sheet of ply.
    __species: opts.species ?? null,
    __chosen: opts.stockId !== undefined,
    features: opts.features ?? [],
    ...(opts.blankShape ? { blankShape: opts.blankShape } : {}),
    ...(opts.notes ? { notes: opts.notes } : {})
  };
  return onGround(p);
};

// 01 Butt — the two simply meet, so they touch exactly ------------------
station('01 Butt Joint', 'SEATED: no joinery at all, the end of one against the face of the other.', () => {
  const o = origin();
  const rail = board('Butt — Rail', o);
  const stile = board('Butt — Stile', o, { rotation: { x: 0, y: 90, z: 0 } });
  against(rail, stile, 'x');
  return [rail, stile];
});

// 02 Mitred butt — an L corner, both ends mitred ------------------------
station('02 Mitred Butt Joint', 'SEATED: an L corner with both ends cut at 45 degrees.', () => {
  const o = origin();
  const rail = board('Mitred Butt — Rail', o, { features: [endCut('Mitre', 'right_end', 45, true)] });
  const stile = board('Mitred Butt — Stile', o, {
    rotation: { x: 0, y: 90, z: 0 },
    features: [endCut('Mitre', 'right_end', 45)]
  });
  mitreCorner(rail, stile);
  return [rail, stile];
});

// 03 Dowel — assembled end to end so Transfer Holes has a joint line ----
station('03 Dowel Joint', 'SEATED and assembled: try Transfer Holes to Mating Part on either board.', () => {
  const o = origin();
  const holes = (f) => [hole('Dowel hole 1', f, 0.375, 0.5, -1, 0), hole('Dowel hole 2', f, 0.375, 0.5, 1, 0)];
  const rail = board('Dowel — Rail', o, { features: holes('right_end') });
  const stile = board('Dowel — Stile', o, { features: holes('left_end') });
  against(rail, stile, 'x');
  const joint = rail.position.x + ext(rail).x;
  const pin = (n, dz) => {
    const p = board(`Dowel — Pin ${n}`, o, {
      length: 1,
      width: 0.375,
      thickness: 0.375,
      stockId: DOWEL38.id,
      color: DOWEL38.color
    });
    p.position = { x: joint, y: rail.position.y, z: rail.position.z + dz };
    return p;
  };
  return [rail, stile, pin(1, -1), pin(2, 1)];
});

// 04 Biscuit — arc-ended slots in the meeting edges ----------------------
station('04 Biscuit Joint', 'SEATED: slots cut in the meeting edges, the biscuit floating in both.', () => {
  const o = origin();
  const T = 0.75;
  // A 100 mm circular blade leaves its arc in the board plane, with a 4 mm kerf.
  const biscuitSlot = (f) => {
    const feature = slot('Biscuit slot', f, 2 * Math.sqrt(2 * 50 * MM * 0.5 - 0.5 ** 2), 4 * MM, 0.5, 0, 0);
    feature.parameters.plateJoiner = true;
    return feature;
  };
  const a = board('Biscuit — Board A', o, { width: 6, features: [biscuitSlot('front_face')] });
  const b = board('Biscuit — Board B', o, { width: 6, features: [biscuitSlot('back_face')] });
  against(a, b, 'z');
  // 23mm across the seam into two 1/2" slots, so it floats at both ends --
  // which is what lets the boards still slide into line before the glue grabs.
  const biscuit = board('Biscuit — #20', o, {
    length: 56 * MM,
    width: 23 * MM,
    thickness: 4 * MM,
    stockId: BISCUIT.id,
    blankShape: 'biscuit',
    color: BISCUIT.color,
    grainSensitive: false
  });
  biscuit.position.x = a.position.x;
  biscuit.position.y = a.position.y;
  biscuit.position.z = a.position.z + ext(a).z;
  return [a, b, biscuit];
});

// 05 Dado — the shelf sits home in the housing -------------------------
station('05 Dado Joint', 'SEATED: real 23/32-inch plywood seated in a matching 23/32-inch housing.', () => {
  const o = origin();
  const side = board('Dado — Side', o, {
    species: 'walnut',
    length: 18,
    width: 8,
    features: [
      rect(
        'Shelf dado',
        'dado',
        face('top_face'),
        { size: { length: 0.71875, width: 8 }, depthMode: 'blind', depth: 0.25 },
        { x: 8, z: 0 }
      )
    ]
  });
  // Standing in the housing: down into the dado by its depth, centred on it.
  const shelf = board('Dado — Shelf', o, {
    length: 8,
    width: 8,
    thickness: 0.71875,
    stockId: PLY.id,
    color: PLY.color,
    grainSensitive: false,
    rotation: { x: 0, y: 0, z: 90 }
  });
  shelf.position.x = side.position.x - ext(side).x + 8 + 0.71875 / 2;
  shelf.position.z = side.position.z;
  shelf.position.y = side.position.y + ext(side).y - 0.25 + ext(shelf).y;
  return [side, shelf];
});

// 06 Rabbet — the back sits in the rabbet ------------------------------
station('06 Rabbet Joint', 'SEATED: a back panel standing in a rabbet run along the edge.', () => {
  const o = origin();
  const T = 0.75;
  const DEPTH = 0.375;
  // The rabbet is run the length of the side's back edge, as wide as the
  // panel is thick and half the side's thickness deep, which is what leaves
  // a step for the panel to stand in and hide its end grain.
  const side = board('Rabbet — Side', o, {
    length: 14,
    width: 6,
    features: [
      rect(
        'Back rabbet',
        'rabbet',
        edge('top_back_edge'),
        { size: { length: 14, width: T }, depthMode: 'blind', depth: DEPTH },
        { x: 0, z: 0 }
      )
    ]
  });
  // Stood on edge: a quarter turn about X puts the panel's width upright, so
  // its thickness fills the rabbet and its face carries on up.
  const back = board('Rabbet — Back', o, { length: 14, width: 6, thickness: T, rotation: { x: 90, y: 0, z: 0 } });
  back.position.x = side.position.x;
  // Standing on the floor of the rabbet, its outer face flush with the side.
  back.position.y = side.position.y - ext(side).y + (T - DEPTH) + ext(back).y;
  back.position.z = side.position.z - ext(side).z + T / 2;
  return [side, back];
});

// 07 Mortise & tenon — tenon home in the mortise -----------------------
station('07 Mortise & Tenon', 'SEATED: try Fit Tenon to Mortise on these two.', () => {
  const o = origin();
  const leg = board('M&T — Leg', o, {
    length: 16,
    width: 1.75,
    thickness: 1.75,
    rotation: { x: 0, y: 0, z: 90 },
    features: [
      rect(
        'Rail mortise',
        'mortise',
        face('top_face'),
        { size: { length: 2, width: 0.25 }, depthMode: 'blind', depth: 1.0625 },
        { x: 12, z: 0.75 }
      )
    ]
  });
  const rail = board('M&T — Rail', o, {
    rotation: { x: 90, y: 0, z: 0 },
    features: [
      rect(
        'Tenon',
        'tenon',
        face('right_end'),
        { size: { length: 1, width: 2 }, depthMode: 'blind', depth: 0.25 },
        { x: 0, z: 0.5 }
      )
    ]
  });
  // A quarter turn about Z puts the leg's top face toward -X, so the mortise
  // opens that way and the rail approaches from there, tenon leading.
  seatTenon(leg, rail, { tenonLength: 1, mortiseFromMin: 12, mortiseLength: 2 });
  return [leg, rail];
});

// 08 Box joint — fingers interleaved at a corner -----------------------
station(
  '08 Box Joint',
  'SEATED: fingers interleaved at a corner, laid out as matching fingers from the two boards’ actual thickness.',
  () => {
    const o = origin();
    const T = 0.75;
    // Each finger is as long as the other board is thick, so the two come
    // flush. Cut from the near end, alternating across the width.
    const fingers = (offsets) =>
      offsets.map((z, i) =>
        rect(
          `Finger ${i + 1}`,
          'cutout',
          face('top_face'),
          { size: { length: T, width: 0.75 }, depthMode: 'through' },
          { x: 0, z }
        )
      );
    const a = board('Box — Side A', o, { features: fingers([0, 1.5]) });
    const b = board('Box — Side B', o, { rotation: { x: 0, y: 0, z: 90 }, features: fingers([0.75, 2.25]) });
    // B stands up at A's near end, its fingers filling the gaps A left.
    b.position.x = a.position.x - ext(a).x + T / 2;
    b.position.y = a.position.y - ext(a).y + ext(b).y;
    b.position.z = a.position.z;
    return [a, b];
  }
);

// Dovetails — tapered tails and angled socket walls -------------------
//
// Tapered cuts and angled socket walls express the dovetail's splay.

// 09 Through dovetail — matching splayed tails and pins ----------------
station(
  '09 Through Dovetail',
  'SEATED: tails and pins with the splay that holds them — 10 degrees, cut right through.',
  () => {
    const o = origin();
    const T = 0.75;
    const SPLAY = 10;
    // The flare is the whole joint -- square-walled, this is a box joint and
    // pulls apart -- but the two boards are sawn differently and so the same
    // flare is described differently on each. The tail board is cut along its
    // length, so its sockets open out across the face toward the shoulder. The
    // pin board's sockets go through its thickness, so the flare runs down
    // their depth instead. Both are given at the outer face of the corner,
    // the one plane the two patterns share, where they must agree exactly.
    //
    // Across three inches: half pin, tail, pin, tail, half pin. The two edge
    // sockets flare off the end of the board, which is what takes the corner
    // off a half pin.
    const a = board('Through DT — Tail Board', o, {
      features: [0, 1.3, 2.6].map((z, i) =>
        rect(
          `Pin socket ${i + 1}`,
          'cutout',
          face('top_face'),
          { size: { length: T, width: 0.4 }, depthMode: 'through', taperAngle: SPLAY },
          { x: 0, z }
        )
      )
    });
    const b = board('Through DT — Pin Board', o, {
      rotation: { x: 0, y: 0, z: 90 },
      features: [0.4, 1.7].map((z, i) =>
        rect(
          `Tail socket ${i + 1}`,
          'cutout',
          face('top_face'),
          { size: { length: T, width: 0.9 }, depthMode: 'through', sideWallAngle: -SPLAY },
          { x: 0, z }
        )
      )
    });
    b.position.x = a.position.x - ext(a).x + T / 2;
    b.position.y = a.position.y - ext(a).y + ext(b).y;
    b.position.z = a.position.z;
    return [a, b];
  }
);

// 10 Half-blind dovetail — the sockets stop short of the outer face ---
station(
  '10 Half-Blind Dovetail',
  "SEATED: blind sockets, undercut to take the flare of the tails — nothing shows on the front's outer face.",
  () => {
    const o = origin();
    const T = 0.75;
    const SOCKET_DEPTH = 0.5;
    const SPLAY = 10;
    // Same layout as the through dovetail next door, with one difference, and
    // it is the difference the joint is named for: the sockets stop half an
    // inch into a three-quarter board, so the outer face stays whole.
    //
    // Which also moves where the two patterns have to agree. A through
    // dovetail is laid out at the outer face; here the tails disappear into
    // the front, so the shared plane is the front's top face -- the tails at
    // their narrowest -- and each socket opens out from there to its floor,
    // where the tail is at full width.
    const flare = Math.tan((SPLAY * Math.PI) / 180) * SOCKET_DEPTH;
    const front = board('Half-Blind DT — Front', o, {
      features: [0.4, 1.7].map((z, i) =>
        rect(
          `Tail socket ${i + 1}`,
          'mortise',
          face('top_face'),
          {
            size: { length: T, width: 0.9 - 2 * flare },
            depthMode: 'blind',
            depth: SOCKET_DEPTH,
            sideWallAngle: SPLAY
          },
          { x: 0, z: z + flare }
        )
      )
    });
    const side = board('Half-Blind DT — Side', o, {
      rotation: { x: 0, y: 0, z: 90 },
      features: [0, 1.3, 2.6].map((z, i) =>
        rect(
          `Between tails ${i + 1}`,
          'cutout',
          face('top_face'),
          { size: { length: SOCKET_DEPTH, width: 0.4 }, depthMode: 'through', taperAngle: SPLAY },
          { x: 0, z }
        )
      )
    });
    side.position.x = front.position.x - ext(front).x + T / 2;
    // Down into the sockets by their depth, and no further.
    side.position.y = front.position.y + ext(front).y - SOCKET_DEPTH + ext(side).y;
    side.position.z = front.position.z;
    return [front, side];
  }
);

// 11 Sliding dovetail — matching flared tongue and undercut housing -----------------
station(
  '11 Sliding Dovetail',
  'SEATED: a flared tongue slides into a matching 10-degree undercut housing. The tongue is wider at its tip than at the mouth, so it cannot lift out.',
  () => {
    const o = origin();
    const T = 0.75;
    const HOUSING = 0.375;
    const neck = T - 2 * HOUSING * Math.tan((10 * Math.PI) / 180);
    const side = board('Sliding DT — Side', o, {
      length: 18,
      width: 8,
      features: [
        rect(
          'Sliding housing',
          'dado',
          face('top_face'),
          { size: { length: neck, width: 8 }, depthMode: 'blind', depth: HOUSING, wallAngle: 10 },
          { x: 8, z: 0 }
        )
      ]
    });
    const shelf = board('Sliding DT — Shelf', o, {
      length: 8,
      width: 8,
      rotation: { x: 0, y: 0, z: 90 },
      features: [-1, 1].map((direction) =>
        routerPass(
          'Dovetail shoulder',
          'left_end',
          [
            [-4.5, (direction * (T + 0.25)) / 2],
            [4.5, (direction * (T + 0.25)) / 2]
          ],
          0.25 + 2 * HOUSING * Math.tan((10 * Math.PI) / 180),
          HOUSING,
          { profile: 'dovetail', shankDiameter: 0.25, includedAngle: 20 }
        )
      )
    });
    shelf.position.x = side.position.x - ext(side).x + 8 + neck / 2;
    shelf.position.z = side.position.z;
    shelf.position.y = side.position.y + ext(side).y - HOUSING + ext(shelf).y;
    return [side, shelf];
  }
);

// 15 Mitred blind dovetail — a mitre outside, dovetails behind it -----
station(
  '15 Mitred Blind Dovetail',
  'SEATED: the hardest joint there is. Outside, a mitre and nothing else; behind it, half-blind dovetails nobody will ever see.',
  () => {
    const o = origin();
    const T = 0.75;
    // The mitred lip, and the depth of everything hidden behind it.
    const LAP = 0.25;
    const BEHIND = T - LAP;
    const SPLAY = 10;
    const flare = Math.tan((SPLAY * Math.PI) / 180) * BEHIND;

    // The mitre is a bevel across the thickness, taken in a band. A 45
    // degree bevel leans an inch in for every inch of height, so a band a
    // quarter-inch tall is a quarter-inch mitre and the rest of the end
    // stays square -- which is the whole joint: a lip mitred at the corner,
    // and the dovetails hidden underneath it.
    const mitre = (flip, from, to) => ({
      id: id(),
      kind: 'end_cut',
      version: 1,
      enabled: true,
      label: 'Mitre',
      target: face('left_end'),
      reference: { primaryFrom: 'min' },
      cutType: 'bevel',
      lengthMode: 'long_point',
      parameters: { horizontalAngle: 0, verticalAngle: 45, verticalFlip: flip, band: { from, to } }
    });

    // The socket board lies flat. Its end carries a rebate the other board's
    // mitred lip drops into, and behind that the tail sockets, undercut so
    // they are wider at the floor than at the mouth.
    const front = board('Mitred Blind DT — Front', o, {
      features: [
        rect(
          'Lip housing',
          'cutout',
          face('top_face'),
          { size: { length: LAP, width: 3 }, depthMode: 'blind', depth: BEHIND },
          { x: 0, z: 0 }
        ),
        ...[0.4, 1.7].map((z, n) =>
          rect(
            `Tail socket ${n + 1}`,
            'mortise',
            face('top_face'),
            {
              size: { length: BEHIND, width: 0.9 - 2 * flare },
              depthMode: 'blind',
              depth: BEHIND,
              sideWallAngle: SPLAY
            },
            { x: LAP, z: z + flare }
          )
        ),
        // Inset 0 at the underside, a quarter-inch by the top of the band.
        mitre(false, 0, LAP)
      ]
    });

    // The tail board stands on it. Its outer quarter-inch runs on past the
    // tails as an unbroken lip -- that is what hides them -- and is mitred
    // to meet the other. Everything else is cut away for the lap to pass.
    const side = board('Mitred Blind DT — Side', o, {
      rotation: { x: 0, y: 0, z: 90 },
      features: [
        rect(
          'Lap housing',
          'cutout',
          face('bottom_face'),
          { size: { length: LAP, width: 3 }, depthMode: 'blind', depth: BEHIND },
          { x: 0, z: 0 }
        ),
        ...[0, 1.3, 2.6].map((z, n) =>
          rect(
            `Between tails ${n + 1}`,
            'cutout',
            face('bottom_face'),
            { size: { length: BEHIND, width: 0.4 }, depthMode: 'blind', depth: BEHIND, taperAngle: SPLAY },
            { x: LAP, z }
          )
        ),
        // Flipped: inset 0 at the outer face, a quarter-inch in from there.
        mitre(true, BEHIND, T)
      ]
    });
    side.position.x = front.position.x - ext(front).x + T / 2;
    // Standing so its lip reaches the underside of the other board, where
    // the two mitres meet at the corner.
    side.position.y = front.position.y - ext(front).y + ext(side).y;
    side.position.z = front.position.z;
    return [front, side];
  }
);

// 12 End lap — half out of each, so they close flush --------------------
station('12 Half Lap (T-Lap)', 'SEATED: a lapped end let into the face of a rail, half the stock out of each.', () => {
  const o = origin();
  // Notched across the middle of the rail, and at the very end of the stile.
  const rail = board('T-Lap — Rail', o, { features: [lapCut('Half lap', 'top_face', 4.5)] });
  const stile = board('T-Lap — Stile', o, {
    rotation: { x: 0, y: 90, z: 0 },
    features: [lapCut('Half lap', 'bottom_face', 0)]
  });
  // A quarter turn about Y sends the stile's length down -Z, so its min end --
  // the lapped one -- ends up at +Z. Sit that end over the rail's notch.
  stile.position.x = rail.position.x;
  stile.position.z = rail.position.z - ext(stile).z + ext(rail).z;
  // Interlocking, not stacked: both pieces finish level.
  stile.position.y = rail.position.y;
  return [rail, stile];
});

// 13 Bridle — the tenon sits in the open mortise ------------------------
station(
  '13 Bridle Joint',
  "SEATED: an open mortise sawn down the post's end, through its width, and a tenon dropped in.",
  () => {
    const o = origin();
    const T = 0.75;
    const SLOT = 0.25;
    const DEPTH = 1.5;
    // A bridle's mortise is open on three sides: sawn down from the end and
    // right through the width, leaving a cheek either side. Taken in the long
    // edge, the cut's own depth runs across the board's width, which is what
    // carries it out of the far face.
    const post = board('Bridle — Post', o, {
      features: [
        rect(
          'Open mortise',
          'mortise',
          face('front_face'),
          { size: { length: DEPTH, width: SLOT }, depthMode: 'through' },
          { x: 0, z: (T - SLOT) / 2 }
        )
      ]
    });
    const rail = board('Bridle — Rail', o, {
      features: [
        rect(
          'Tenon',
          'tenon',
          face('right_end'),
          { size: { length: DEPTH, width: 3 }, depthMode: 'blind', depth: (T - SLOT) / 2 },
          { x: 0, z: 0 }
        )
      ]
    });
    // The rail comes from -X, shoulders closing on the post's end.
    rail.position.z = post.position.z;
    rail.position.y = post.position.y;
    rail.position.x = post.position.x - ext(post).x - ext(rail).x + DEPTH;
    return [post, rail];
  }
);

// 14 Tongue & groove — the tongue runs home in the groove ---------------
station('14 Tongue & Groove', 'SEATED: a groove in one edge, two rabbets leaving a tongue on the other.', () => {
  const o = origin();
  const T = 0.75;
  const TONGUE = 0.25;
  const GROOVE_DEPTH = 0.375;
  const grooved = board('T&G — Grooved Board', o, {
    width: 5,
    features: [edgeGroove('Groove', 'back_face', TONGUE, GROOVE_DEPTH, T)]
  });
  const shoulder = (e) =>
    rect(
      `Tongue shoulder — ${e}`,
      'rabbet',
      edge(`${e}_front_edge`),
      { size: { length: 12, width: TONGUE }, depthMode: 'blind', depth: (T - TONGUE) / 2 },
      { x: 0, z: 0 }
    );
  const tongued = board('T&G — Tongued Board', o, { width: 5, features: [shoulder('top'), shoulder('bottom')] });
  // Shoulders closed on the grooved board's edge, which leaves the tongue
  // standing clear of the groove's floor -- a tongue that bottoms out holds
  // the shoulders open and the joint shows a line.
  tongued.position.z = grooved.position.z - ext(grooved).z - ext(tongued).z + TONGUE;
  return [grooved, tongued];
});

// 16 Edge joint — two boards simply meet --------------------------------
station('16 Edge Joint', 'SEATED: two boards glued edge to edge, no joinery at all.', () => {
  const o = origin();
  const a = board('Edge — Board A', o, { width: 5 });
  const b = board('Edge — Board B', o, { width: 5 });
  against(a, b, 'z');
  return [a, b];
});

// 17 Tambour — shiplapped slats running in a track --------------------
station(
  '17 Tambour Joint',
  'SEATED: shiplapped slats sit in opposing tracks. Glue a 3-1/4 × 5-1/2-inch canvas backing to their undersides; canvas and adhesive are shopping-list supplies, omitted from 3D. Shown straight; bending is not simulated.',
  () => {
    const o = origin();
    const SLAT_W = 0.75;
    const SLAT_T = 0.25;
    const LAP = SLAT_T / 2;
    const TRACK = 0.25;
    const SIDE_T = 0.75;
    // Each slat loses half its thickness off one edge above and the other edge
    // below, so consecutive slats lap into one another and the run still bends.
    const shiplap = (e, edgeName) =>
      rect(
        `Shiplap — ${e}`,
        'rabbet',
        edge(`${e}_${edgeName}_edge`),
        { size: { length: 6, width: LAP }, depthMode: 'blind', depth: LAP },
        { x: 0, z: 0 }
      );
    // The track is ploughed in the side's inner edge, which is the face the
    // slats run past. In its top it would be a groove the slats sit down in,
    // and they would have to pass through the side to reach it.
    const side = board('Tambour — Side', o, {
      length: 14,
      width: 4,
      features: [edgeGroove('Tambour track', 'back_face', TRACK, TRACK, SIDE_T)]
    });
    const made = [side];
    for (let i = 0; i < 5; i += 1) {
      const slat = board(`Tambour — Slat ${i + 1}`, o, {
        length: 6,
        width: SLAT_W,
        thickness: SLAT_T,
        rotation: { x: 0, y: 90, z: 0 },
        species: i % 2 === 0 ? 'walnut' : 'maple',
        features: [shiplap('top', 'front'), shiplap('bottom', 'back')]
      });
      slat.position.x = side.position.x - 4 + i * (SLAT_W - LAP);
      // Its end standing in the track, its thickness centred in the side's.
      slat.position.z = side.position.z - ext(side).z + TRACK - ext(slat).z;
      slat.position.y = side.position.y;
      made.push(slat);
    }
    const opposite = board('Tambour — Opposite Guide', o, {
      length: 14,
      width: 4,
      features: [edgeGroove('Tambour track', 'front_face', TRACK, TRACK, SIDE_T)]
    });
    opposite.position = { ...side.position, z: side.position.z - 9.5 };
    return [...made, opposite];
  }
);

// 18 Scarf — the two slopes face each other ---------------------------
station('18 Scarf Joint', 'SEATED: an 8 to 1 slope, which eats 24 inches of a 3 inch board.', () => {
  const o = origin();
  const ANGLE = 82.9;
  const LENGTH = 30;
  // The slope runs 3 inches across the board in 24 along it. The two boards
  // overlap by exactly that run, so the sloping faces lie on one another --
  // and the two cuts must lean opposite ways or the slopes face the same way
  // and the boards pass straight through each other.
  const run = 3 * Math.tan((ANGLE * Math.PI) / 180);
  const a = board('Scarf — Board A', o, { length: LENGTH, features: [endCut('Scarf', 'right_end', ANGLE, true)] });
  const b = board('Scarf — Board B', o, { length: LENGTH, features: [endCut('Scarf', 'left_end', ANGLE)] });
  b.position.x = a.position.x + LENGTH - run;
  return [a, b];
});

// 19 Spline — the spline sits in both grooves ---------------------------
station('19 Spline Joint', 'SEATED: a groove in each meeting edge and a loose spline between them.', () => {
  const o = origin();
  const T = 0.75;
  const W = 0.25;
  const DEPTH = 0.375;
  const a = board('Spline — Board A', o, {
    width: 5,
    features: [edgeGroove('Spline groove', 'front_face', W, DEPTH, T)]
  });
  const b = board('Spline — Board B', o, {
    width: 5,
    features: [edgeGroove('Spline groove', 'back_face', W, DEPTH, T)]
  });
  against(a, b, 'z');
  // 0.7 across a pair of 3/8" grooves, so it floats at both ends.
  const spline = board('Spline — Spline', o, { length: 12, width: 0.7, thickness: W });
  spline.position.x = a.position.x;
  spline.position.y = a.position.y;
  spline.position.z = a.position.z + ext(a).z;
  return [a, b, spline];
});

// 20 Cross lap — half out of each, crossing flush ------------------------
station('20 Cross Lap Joint', 'SEATED: half out of each in the middle, so the two cross flush.', () => {
  const o = origin();
  const rail = board('Cross Lap — Rail', o, { features: [lapCut('Cross lap', 'top_face', 4.5)] });
  const stile = board('Cross Lap — Stile', o, {
    rotation: { x: 0, y: 90, z: 0 },
    features: [lapCut('Cross lap', 'bottom_face', 4.5)]
  });
  stile.position.y = rail.position.y;
  return [rail, stile];
});

// 21 Full lap — one piece let in whole, not halved --------------------
station(
  '21 Full Lap Joint',
  'SEATED: the crossing rail is let in whole and is not cut at all — that is what makes it full rather than half.',
  () => {
    const o = origin();
    const CROSSING_T = 0.75;
    // A half lap takes half out of each piece. A full lap takes the whole of
    // one piece out of the other and leaves that piece untouched, which only
    // makes sense when the housing member has thickness to spare -- so this one
    // is 8/4 stock and the crossing rail is ordinary 4/4.
    const housed = board('Full Lap — Housed Rail', o, {
      thickness: 1.75,
      features: [
        rect(
          'Full lap housing',
          'dado',
          face('top_face'),
          { size: { length: 3, width: 3 }, depthMode: 'blind', depth: CROSSING_T },
          { x: 4.5, z: 0 }
        )
      ]
    });
    const crossing = board('Full Lap — Crossing Rail', o, { rotation: { x: 0, y: 90, z: 0 } });
    crossing.position.y = housed.position.y + ext(housed).y - CROSSING_T + ext(crossing).y;
    return [housed, crossing];
  }
);

// 22 Groove — the panel floats in the groove ----------------------------
station(
  '22 Groove Joint',
  'SEATED: a panel floating in a groove — read the seasonal movement note in the cut list.',
  () => {
    const o = origin();
    const T = 0.75;
    const W = 0.25;
    const rail = board('Groove — Frame Rail', o, {
      width: 2.5,
      features: [edgeGroove('Panel groove', 'back_face', W, 0.375, T)]
    });
    const panel = board('Groove — Panel', o, { length: 12, width: 7, thickness: W });
    panel.position.x = rail.position.x;
    panel.position.y = rail.position.y;
    // Standing in the groove but off its floor, which is the whole reason a
    // panel is never glued in: it has to be free to move across the seasons.
    panel.position.z = rail.position.z - ext(rail).z - ext(panel).z + 0.25;
    return [rail, panel];
  }
);

// 23 Loose tenon — edge to edge, since Carvd will not mortise an end ----
station(
  '23 Loose Tenon Joint',
  'SEATED: edge to edge, because Carvd will not mortise an end — see the project notes.',
  () => {
    const o = origin();
    const mortise = (f) =>
      rect(
        'Loose tenon mortise',
        'mortise',
        f,
        { size: { length: 2, width: 0.25 }, depthMode: 'blind', depth: 0.6 },
        { x: 5, z: 0.25 }
      );
    const a = board('Loose Tenon — Board A', o, { width: 4, features: [mortise(face('front_face'))] });
    const b = board('Loose Tenon — Board B', o, { width: 4, features: [mortise(face('back_face'))] });
    against(a, b, 'z');
    const tenon = board('Loose Tenon — Tenon', o, {
      length: 1.1,
      width: 2,
      thickness: 0.25,
      rotation: { x: 0, y: 90, z: 0 }
    });
    // Home in both mortises, floating clear of each floor the way a loose tenon
    // does. Its own length runs across the seam once it is turned a quarter.
    tenon.position.x = a.position.x - ext(a).x + 5 + 1;
    tenon.position.y = a.position.y - ext(a).y + 0.25 + 0.125;
    tenon.position.z = a.position.z + ext(a).z;

    return [a, b, tenon];
  }
);

// 24 Domino — the same, bought in a box ---------------------------------
station('24 Domino Joint', 'SEATED: the same idea bought in a box, edge to edge for the same reason.', () => {
  const o = origin();
  const mortise = (f) =>
    rect(
      'Domino mortise',
      'mortise',
      f,
      { size: { length: 20 * MM, width: 6 * MM }, depthMode: 'blind', depth: 22 * MM, cornerRadius: 3 * MM },
      { x: 6 - 10 * MM, z: (0.75 - 6 * MM) / 2 }
    );
  const a = board('Domino — Board A', o, { width: 4, features: [mortise(face('front_face'))] });
  const b = board('Domino — Board B', o, { width: 4, features: [mortise(face('back_face'))] });
  against(a, b, 'z');
  const domino = board('Domino — 6 × 20 × 40', o, {
    length: 40 * MM,
    width: 20 * MM,
    thickness: 6 * MM,
    stockId: DOMINO.id,
    blankShape: 'domino',
    color: DOMINO.color,
    rotation: { x: 0, y: 90, z: 0 }
  });
  domino.position.x = a.position.x - ext(a).x + 6;
  domino.position.y = a.position.y - ext(a).y + (0.75 - 6 * MM) / 2 + 3 * MM;
  domino.position.z = a.position.z + ext(a).z;
  return [a, b, domino];
});

// 25 Pin — a through pin holding a lap ----------------------------------
station('25 Pin Joint', 'SEATED: a through pin holding a lap — a pinned joint, not dovetail pins.', () => {
  const o = origin();
  const rail = board('Pin — Rail', o, {
    features: [lapCut('Half lap', 'top_face', 4.5), hole('Pin hole', 'top_face', 0.25, null, 0, 0)]
  });
  const stile = board('Pin — Stile', o, {
    rotation: { x: 0, y: 90, z: 0 },
    features: [lapCut('Half lap', 'bottom_face', 4.5), hole('Pin hole', 'top_face', 0.25, null, 0, 0)]
  });
  stile.position.y = rail.position.y;
  // Driven right through the lap: the rail's lower half and the stile's,
  // which together are one board's thickness once the two halves close.
  const peg = board('Pin — Peg', o, {
    length: 0.75,
    width: 0.25,
    thickness: 0.25,
    stockId: DOWEL14.id,
    color: DOWEL14.color,
    rotation: { x: 0, y: 0, z: 90 }
  });
  peg.position.x = rail.position.x;
  peg.position.z = rail.position.z;
  peg.position.y = rail.position.y;
  return [rail, stile, peg];
});

// 26 Pegged M&T — assembled, so Bore Through Assembly has a stack -------
station(
  '26 Pegged Mortise & Tenon',
  'SEATED: a quarter-inch peg passes through both mortise cheeks and the middle of the tenon. The tenon bore is drilled before sawing its cheeks.',
  () => {
    const o = origin();
    const leg = board('Pegged — Leg', o, {
      length: 16,
      width: 1.75,
      thickness: 1.75,
      rotation: { x: 0, y: 0, z: 90 },
      features: [
        rect(
          'Rail mortise',
          'mortise',
          face('top_face'),
          { size: { length: 2, width: 0.25 }, depthMode: 'blind', depth: 1.0625 },
          { x: 12, z: 0.75 }
        ),
        // Bored through the mortise, because a peg that misses the tenon holds
        // nothing. Five inches up from the leg's middle is where the mortise is.
        hole('Peg hole', 'front_face', 0.25, null, 5, 0.375)
      ]
    });
    const rail = board('Pegged — Rail', o, {
      rotation: { x: 90, y: 0, z: 0 },
      features: [hole('Tenon peg bore — drill before cheek cuts', 'top_face', 0.25, null, 5.5, 0), ...sawnTenon(1)]
    });
    seatTenon(leg, rail, { tenonLength: 1, mortiseFromMin: 12, mortiseLength: 2 });
    // The peg goes through the leg's width, so it lies along Z at the hole.
    const peg = board('Pegged — Peg', o, {
      length: 2.5,
      width: 0.25,
      thickness: 0.25,
      stockId: DOWEL14.id,
      color: DOWEL14.color,
      rotation: { x: 0, y: 90, z: 0 }
    });
    // Center the peg halfway along the one-inch tenon, clear of its tip.
    peg.position.x = rail.position.x + rail.length / 2 - 0.5;
    peg.position.y = leg.position.y + 5;
    peg.position.z = leg.position.z;
    return [leg, rail, peg];
  }
);

// 27 Birdsmouth — horizontal seat and vertical heel on a 45-degree rafter.
station(
  '27 Birdsmouth Joint',
  'SEATED: a 45-degree rafter has a horizontal bearing seat and a vertical heel against the wall plate. The notch is less than one third of the rafter depth.',
  () => {
    const o = origin();
    const depth = 0.5,
      pitch = Math.PI / 4,
      run = depth * Math.sqrt(2);
    const rafter = board('Birdsmouth — Rafter', o, {
      length: 14,
      width: 3,
      thickness: 1.75,
      rotation: { x: 0, y: 0, z: 45 },
      features: [
        routerPass(
          'Seat and heel',
          'bottom_face',
          [
            [-3, -1.6],
            [-3, 1.6]
          ],
          1,
          depth,
          { profile: 'v_bit', includedAngle: 90 }
        )
      ]
    });
    const plate = board('Birdsmouth — Wall Plate', o, {
      length: 10,
      width: run,
      thickness: 1.5,
      rotation: { x: 0, y: 90, z: 0 }
    });
    // The V apex becomes the right-hand heel/seat corner after the pitch rotation.
    const x = -3,
      y = -1.75 / 2 + depth;
    const heelX = rafter.position.x + x * Math.cos(pitch) - y * Math.sin(pitch);
    const seatY = rafter.position.y + x * Math.sin(pitch) + y * Math.cos(pitch);
    plate.position = { x: heelX + run / 2, y: seatY - 0.75, z: rafter.position.z };
    return [rafter, plate];
  }
);

// Modern cove-and-pin construction: rounded fingers, matching circular
// sockets, and separate dowels drilled through the assembled corner.
station(
  '28 Scallop & Dowel',
  'SEATED: three rounded fingers enter matching scalloped sockets at a right-angle corner. Separate dowels pin the fingers after assembly, following the modern cove-and-pin method.',
  () => {
    const o = origin(),
      centers = [-1.5, 0, 1.5];
    const front = board('Scallop — Front', o, {
      width: 4,
      features: centers.flatMap((z, i) => [
        hole(`Scallop socket ${i + 1}`, 'top_face', 1, 0.5, -5.5, z),
        hole(`Pin bore ${i + 1}`, 'top_face', 0.25, null, -5.5, z)
      ])
    });
    const side = board('Scallop — Side', o, {
      width: 4,
      thickness: 1,
      rotation: { x: 0, y: 0, z: 90 },
      features: [
        ...centers.map((z, i) =>
          routerPass(
            `Rounded finger ${i + 1}`,
            'left_end',
            Array.from({ length: 33 }, (_, k) => [
              z + 0.625 * Math.cos((k * Math.PI) / 16),
              0.625 * Math.sin((k * Math.PI) / 16)
            ]),
            0.28,
            0.502
          )
        ),
        ...[1, 2.5].map((z) =>
          rect(
            'Between fingers',
            'cutout',
            face('top_face'),
            { size: { length: 0.5, width: 0.5 }, depthMode: 'through' },
            { x: 0, z }
          )
        ),
        ...centers.map((z, i) => hole(`Pin bore ${i + 1}`, 'left_end', 0.25, 1, z, 0))
      ]
    });
    side.position = { x: front.position.x - 5.5, y: front.position.y + 0.375 - 0.5 + 6 + 0.005, z: front.position.z };
    const pins = centers.map((z, i) => {
      const pin = board(`Scallop — Pin ${i + 1}`, o, {
        length: 1.25,
        width: 0.25,
        thickness: 0.25,
        stockId: DOWEL14.id,
        color: DOWEL14.color,
        rotation: { x: 0, y: 0, z: 90 }
      });
      pin.position = { x: front.position.x - 5.5, y: front.position.y - 0.375 + 0.625, z: front.position.z + z };
      return pin;
    });
    return [front, side, ...pins];
  }
);

// 29 Cross dowel — a bolt into a barrel nut set across the rail -------
station(
  '29 Cross Dowel Joint',
  'SEATED: wood prepared for a purchased joint bolt and matching cross-dowel barrel nut. Hardware is listed for purchase and omitted from 3D. The bolt enters through the post; the barrel sits across the rail. Select matching threads and check engagement before drilling.',
  () => {
    const o = origin();
    const FROM_END = 1.5;
    // Knock-down hardware: a bolt passes through the post and threads into a
    // barrel nut dropped into a bore across the rail, at right angles to it.
    const post = board('Cross Dowel — Post', o, {
      length: 3,
      features: [hole('Bolt clearance', 'left_end', 0.25, null, 0, 0)]
    });
    const rail = board('Cross Dowel — Rail', o, {
      features: [
        hole('Barrel bore', 'top_face', 0.375, null, -6 + FROM_END, 0),
        hole('Bolt passage', 'left_end', 0.25, FROM_END + 0.1875, 0, 0)
      ]
    });
    rail.position.x = post.position.x + ext(post).x + ext(rail).x;
    return [post, rail];
  }
);

function keyedCorner(o, prefix, offsets) {
  const a = board(`${prefix} — Board A`, o, { features: [endCut('Mitre', 'right_end', 45, true)] });
  const b = board(`${prefix} — Board B`, o, {
    rotation: { x: 0, y: 90, z: 0 },
    features: [endCut('Mitre', 'right_end', 45)]
  });
  mitreCorner(a, b);
  const depth = 0.5;
  const length = 1.8;
  const keys = offsets.map((offset, i) => {
    const cx = 4.5 + offset / Math.sqrt(2),
      cz = -offset / Math.sqrt(2);
    const h = length / (2 * Math.sqrt(2));
    const points = [
      [cx - h, cz - h],
      [cx + h, cz + h]
    ];
    a.features.push(routerPass(`Key kerf ${i + 1}`, 'top_face', points, 0.125, depth));
    b.features.push(
      routerPass(
        `Key kerf ${i + 1}`,
        'top_face',
        points.map(([x, z]) => [4.5 - z, x - 4.5]),
        0.125,
        depth
      )
    );
    const key = board(`${prefix} — Key ${i + 1}`, o, {
      length,
      width: 0.125,
      thickness: depth,
      species: 'maple',
      rotation: { x: 0, y: -45, z: 0 }
    });
    key.position = { x: a.position.x + cx, y: a.position.y + 0.375 - depth / 2, z: a.position.z + cz };
    return key;
  });
  return [a, b, ...keys];
}
station(
  '30 Keyed Joint',
  'SEATED: a maple key crosses the mitre at right angles in matching kerfs cut through both boards.',
  () => keyedCorner(origin(), 'Keyed', [0])
);

// 32 End lap — two lapped ends form a flush splice ---------------------
station('32 End Lap Joint', 'SEATED: both ends lapped, closing flush in an end-to-end splice.', () => {
  const o = origin();
  const rail = board('End Lap — Rail', o, { features: [lapCut('End lap', 'top_face', 9)] });
  const stile = board('End Lap — Stile', o, { features: [lapCut('End lap', 'bottom_face', 0)] });
  // The lapped ends cover each other; each gave up half its thickness, so the
  // pair finishes one board thick, not two.
  stile.position.x = rail.position.x + ext(rail).x + ext(stile).x - 3;
  stile.position.y = rail.position.y;
  return [rail, stile];
});

// 31 Fox wedge: pre-assembly view exposes the blind undercut and starting wedges.
station(
  '31 Fox Wedge Mortise & Tenon',
  'EXPLODED, before driving: an undercut blind mortise faces a kerfed tenon with 1/4-inch-wide tapered wedges started in 1/8-inch saw kerfs. Only the narrow tips enter. Driving the wider heads requires wood deformation, which is not simulated; establish wedge travel, socket relief and a shop process separately.',
  () => {
    const o = origin(),
      L = 0.9375,
      KERF = 0.125;
    const leg = board('Fox Wedge — Leg', o, {
      length: 14,
      width: 1.75,
      thickness: 1.75,
      rotation: { x: 0, y: 0, z: 90 },
      features: [
        rect(
          'Undercut mortise',
          'mortise',
          face('top_face'),
          { size: { length: 2, width: 0.25 }, depthMode: 'blind', depth: 1, wallAngle: 5 },
          { x: 10, z: 0.75 }
        )
      ]
    });
    const rail = board('Fox Wedge — Rail', o, {
      rotation: { x: 90, y: 0, z: 0 },
      features: [
        ...sawnTenon(L),
        ...[0.95, 1.925].map((z, i) =>
          rect(
            `Wedge kerf ${i + 1}`,
            'cutout',
            face('top_face'),
            { size: { length: 0.8, width: KERF }, depthMode: 'through' },
            { x: 11.2, z }
          )
        )
      ]
    });
    seatTenon(leg, rail, { tenonLength: L, mortiseFromMin: 10, mortiseLength: 2 });
    rail.position.x -= L + EXPLODE;
    const wedges = [0.95, 1.925].map((z, i) => {
      const w = board(`Fox Wedge — Wedge ${i + 1}`, o, {
        length: 0.75,
        width: 2 * KERF,
        thickness: 0.25,
        species: 'maple',
        rotation: { x: 90, y: 0, z: 0 },
        features: [endCut('Wedge taper', 'left_end', (Math.atan(0.74 / (2 * KERF)) * 180) / Math.PI)]
      });
      w.position = {
        x: rail.position.x + 6 + 0.375 - 0.1875,
        y: rail.position.y + 1.5 - z,
        z: rail.position.z
      };
      return w;
    });
    return [leg, rail, ...wedges];
  }
);

// A concealed plywood spline spans the mitre in centered end-grain slots.
station(
  '33 Splined Mitre',
  'SEATED: a concealed plywood spline bridges the mitre inside matching slots centered in the board thickness. Ghost view exposes the insert. Slot coordinates and depth use the original square end, not the mitred face; they describe geometry, not a router plunge setting. Establish an appropriate slotting process separately.',
  () => {
    const o = origin();
    const groove = () =>
      routerPass(
        'Internal spline slot',
        'right_end',
        [
          [-0.75, 0],
          [0.75, 0]
        ],
        0.125,
        2.25
      );
    const a = board('Splined Mitre — Board A', o, { features: [endCut('Mitre', 'right_end', 45, true), groove()] });
    const b = board('Splined Mitre — Board B', o, {
      rotation: { x: 0, y: 90, z: 0 },
      features: [endCut('Mitre', 'right_end', 45), groove()]
    });
    mitreCorner(a, b);
    const spline = board('Splined Mitre — Spline', o, {
      length: 1.5,
      width: 1.5,
      thickness: 0.125,
      stockId: THIN_PLY.id,
      color: THIN_PLY.color,
      grainSensitive: false
    });
    spline.position = { x: a.position.x + 4.5, y: a.position.y, z: a.position.z };
    return [a, b, spline];
  }
);

// 34 Pocket hole — a screw driven in on the slant ----------------------
station(
  '34 Pocket Hole',
  'SEATED: a butt joint prepared for two pocket screws, drilled 15 degrees above the face. Screws are shopping-list hardware, omitted from 3D.',
  () => {
    const o = origin();
    const T = 0.75;
    // The jig bores at fifteen degrees off the face and steps the hole part
    // way down for the screw head to pull against, which is the whole point:
    // the head bears on a flat shoulder inside the rail, not on end grain.
    const pocket = (secondary) => ({
      id: id(),
      kind: 'circular_cut',
      version: 1,
      enabled: true,
      label: 'Pocket',
      cutType: 'counterbore',
      target: face('top_face'),
      reference: { primaryFrom: 'center', secondaryFrom: 'center' },
      placement: { primary: -4.5, secondary, rotation: 0 },
      parameters: {
        diameter: 5 / 32,
        depthMode: 'through',
        // Tilt is measured from the face normal, not from the face.
        tilt: 75,
        direction: 180,
        counterbore: { diameter: 3 / 8, depth: 0.9 }
      }
    });
    const rail = board('Pocket — Rail', o, { features: [pocket(-0.75), pocket(0.75)] });
    const stile = board('Pocket — Stile', o, { rotation: { x: 0, y: 90, z: 0 } });
    stile.position.x = rail.position.x - ext(rail).x - ext(stile).x;
    stile.position.z = rail.position.z;
    return [rail, stile];
  }
);

// 35 Haunched mortise & tenon — the corner of a panelled door ---------
station(
  '35 Haunched Mortise & Tenon',
  'SEATED: a door corner. The panel groove runs out at the top of the stile, and a stub of the tenon fills it.',
  () => {
    const o = origin();
    const T = 0.75;
    const TENON = 1;
    const HAUNCH = 0.375;
    const CHEEK = 0.1875;
    const TONGUE = T - 2 * CHEEK;
    const inThickness = { x: 0, z: (T - TONGUE) / 2 };
    // The groove that carries the panel is ploughed the whole length of the
    // stile, which means it runs out at the top and would leave a slot open
    // in the corner. The haunch fills it: a stub of the tenon, as long as
    // the groove is deep and no longer.
    const stile = board('Haunched — Stile', o, {
      length: 16,
      features: [
        rect(
          'Panel groove',
          'groove',
          face('front_face'),
          { size: { length: 16, width: TONGUE }, depthMode: 'blind', depth: HAUNCH },
          inThickness
        ),
        rect(
          'Mortise',
          'mortise',
          face('front_face'),
          { size: { length: 2, width: TONGUE }, depthMode: 'blind', depth: TENON },
          { x: 13.5, z: inThickness.z }
        )
      ]
    });
    const rail = board('Haunched — Rail', o, {
      rotation: { x: 0, y: 90, z: 0 },
      features: [
        // Two cheeks leave a tongue centred in the thickness.
        rect(
          'Cheek (top)',
          'cutout',
          face('top_face'),
          { size: { length: TENON, width: 3 }, depthMode: 'blind', depth: CHEEK },
          { x: 12 - TENON, z: 0 }
        ),
        rect(
          'Cheek (under)',
          'cutout',
          face('bottom_face'),
          { size: { length: TENON, width: 3 }, depthMode: 'blind', depth: CHEEK },
          { x: 12 - TENON, z: 0 }
        ),
        // Two shoulders narrow it. The one on the haunch side starts further
        // along, and the stub it leaves behind is the haunch.
        rect(
          'Shoulder',
          'cutout',
          face('top_face'),
          { size: { length: TENON, width: 0.5 }, depthMode: 'through' },
          { x: 12 - TENON, z: 0 }
        ),
        rect(
          'Haunch shoulder',
          'cutout',
          face('top_face'),
          { size: { length: TENON - HAUNCH, width: 0.5 }, depthMode: 'through' },
          { x: 12 - TENON + HAUNCH, z: 2.5 }
        )
      ]
    });
    // A quarter turn about Y sends the rail's length down -Z and its width
    // along +X, so its far end is the one that reaches the stile.
    rail.position.x = stile.position.x + 6.5;
    rail.position.z = stile.position.z + 6.5;
    rail.position.y = stile.position.y;
    return [stile, rail];
  }
);

// 38 Stopped dado — the housing that does not show at the front --------
station(
  '38 Stopped Dado',
  'SEATED: the housing stops short of the front edge so nothing shows. Routed, so it stops round, and the shelf is notched to clear it.',
  () => {
    const o = origin();
    const T = 0.75;
    const STOP = 1;
    const DEPTH = 0.25;
    const side = board('Stopped Dado — Side', o, {
      length: 18,
      width: 8,
      features: [
        rect(
          'Stopped housing',
          'stopped_dado',
          face('top_face'),
          {
            size: { length: T, width: 8 - STOP },
            stoppedSpan: true,
            depthMode: 'blind',
            depth: DEPTH,
            cornerRadius: T / 2
          },
          { x: 8, z: 0 }
        )
      ]
    });
    const shelf = board('Stopped Dado — Shelf', o, {
      length: 8,
      width: 8,
      rotation: { x: 0, y: 0, z: 90 },
      features: [
        // Notched at the front corner so the shelf can still come forward
        // flush, past the inch of housing that was never cut.
        rect(
          'Notch',
          'corner_notch',
          corner('front_left_corner'),
          { size: { length: DEPTH, width: STOP + T / 2 }, depthMode: 'through' },
          { x: 0, z: 0 }
        )
      ]
    });
    shelf.position.x = side.position.x - ext(side).x + 8 + T / 2;
    shelf.position.z = side.position.z;
    shelf.position.y = side.position.y + ext(side).y - DEPTH + ext(shelf).y;
    return [side, shelf];
  }
);

// 39 Rabbeted dado — the tongue-and-dado of plywood casework ----------
station(
  '39 Rabbeted Dado',
  'SEATED: a narrow housing and a tongue rabbeted to fit it, which is how a plywood carcase goes together without a wide dado.',
  () => {
    const o = origin();
    const T = 0.75;
    const TONGUE = 0.25;
    const side = board('Rabbeted Dado — Side', o, {
      length: 18,
      width: 8,
      features: [
        rect(
          'Housing',
          'dado',
          face('top_face'),
          { size: { length: TONGUE, width: 8 }, depthMode: 'blind', depth: TONGUE },
          { x: 8, z: 0 }
        )
      ]
    });
    const shelf = board('Rabbeted Dado — Shelf', o, {
      length: 8,
      width: 8,
      rotation: { x: 0, y: 0, z: 90 },
      features: [
        // A rabbet at the end leaves a tongue a quarter thick, which is all
        // that goes in: the shoulder lands on the face and hides the housing.
        rect(
          'Rabbet',
          'cutout',
          face('bottom_face'),
          { size: { length: TONGUE, width: 8 }, depthMode: 'blind', depth: T - TONGUE },
          { x: 0, z: 0 }
        )
      ]
    });
    shelf.position.x = side.position.x - ext(side).x + 8 + T / 2;
    shelf.position.z = side.position.z;
    shelf.position.y = side.position.y + ext(side).y - TONGUE + ext(shelf).y;
    return [side, shelf];
  }
);

// 40 Shiplap — two rabbets that lie over one another -------------------
station(
  '40 Shiplap',
  'SEATED: each board rabbeted on the opposite face, so the two lie over one another and can still move.',
  () => {
    const o = origin();
    const LAP = 0.5;
    const a = board('Shiplap — Board A', o, {
      features: [
        rect(
          'Lap',
          'rabbet',
          edge('top_front_edge'),
          { size: { length: 12, width: LAP }, depthMode: 'blind', depth: 0.375 },
          { x: 0, z: 0 }
        )
      ]
    });
    const b = board('Shiplap — Board B', o, {
      features: [
        rect(
          'Lap',
          'rabbet',
          edge('bottom_back_edge'),
          { size: { length: 12, width: LAP }, depthMode: 'blind', depth: 0.375 },
          { x: 0, z: 0 }
        )
      ]
    });
    // Set over by a board's width less the lap, so the two rabbets coincide.
    b.position.z = a.position.z + 3 - LAP;
    return [a, b];
  }
);

// 41 Mitred half lap — a mitre on the face, a lap behind it ------------
station(
  '41 Mitred Half Lap',
  'SEATED: the show face reads as a mitre; behind it the two halves lap, which is what actually holds.',
  () => {
    const o = origin();
    const T = 0.75;
    const HALF = T / 2;
    // Only the upper half is mitred. Underneath, one piece keeps the whole
    // square and the other gives it up entirely -- an ordinary lap, hidden.
    const topMitre = (flip) => {
      const cut = endCut('Mitre', 'right_end', 45, flip);
      cut.parameters.band = { from: HALF, to: T };
      return cut;
    };
    const rail = board('Mitred Lap — Rail', o, { features: [topMitre(true)] });
    const stile = board('Mitred Lap — Stile', o, {
      rotation: { x: 0, y: 90, z: 0 },
      features: [
        topMitre(false),
        rect(
          'Lap',
          'half_lap',
          face('bottom_face'),
          { size: { length: 3, width: 3 }, depthMode: 'blind', depth: HALF },
          { x: 9, z: 0 }
        )
      ]
    });
    mitreCorner(rail, stile);
    return [rail, stile];
  }
);

// 42 Dovetailed lap splice — two boards lapped end to end --------------
station(
  '42 Dovetailed Lap Splice',
  'SEATED: a lap splice whose tongue is cut on the slant, so the two boards cannot be drawn apart along their length.',
  () => {
    const o = origin();
    const T = 0.75;
    const LAP = 1.5;
    const SPLAY = 10;
    // The tongue and socket are widest at the tongue tip and narrow toward
    // its shoulder. Lower the tongue into the open top of the socket;
    // the sloping cheeks prevent withdrawal along the boards' length.
    const b = board('Dovetail Splice — Board B', o, {
      features: [
        rect(
          'Socket',
          'mortise',
          face('top_face'),
          { size: { length: LAP, width: 2 }, depthMode: 'blind', depth: T / 2, taperAngle: -SPLAY },
          { x: 12 - LAP, z: 0.5 }
        )
      ]
    });
    const a = board('Dovetail Splice — Board A', o, {
      features: [
        rect(
          'Lap',
          'half_lap',
          face('bottom_face'),
          { size: { length: LAP, width: 3 }, depthMode: 'blind', depth: T / 2 },
          { x: 0, z: 0 }
        ),
        // Sawn in from both edges, on the slant, to leave the tongue.
        rect(
          'Waste (near)',
          'cutout',
          face('top_face'),
          { size: { length: LAP, width: 0.5 }, depthMode: 'blind', depth: T / 2, taperAngle: SPLAY },
          { x: 0, z: 0 }
        ),
        rect(
          'Waste (far)',
          'cutout',
          face('top_face'),
          { size: { length: LAP, width: 0.5 }, depthMode: 'blind', depth: T / 2, taperAngle: SPLAY },
          { x: 0, z: 2.5 }
        )
      ]
    });
    a.position.x = b.position.x + 12 - LAP;
    a.position.z = b.position.z;
    a.position.y = b.position.y;
    return [b, a];
  }
);

// 44 Compound mitre — a corner that leans as well as turns -------------
station(
  '44 Compound Mitre',
  'SEATED: matching compound cuts that turn 45 degrees and lean 15 degrees. The flat samples demonstrate the mating cut planes, rather than a complete canted box.',
  () => {
    const o = origin();
    const compound = (flip) => ({
      id: id(),
      kind: 'end_cut',
      version: 1,
      enabled: true,
      label: 'Compound mitre',
      target: face('right_end'),
      reference: { primaryFrom: 'max' },
      cutType: 'compound',
      lengthMode: 'long_point',
      parameters: { horizontalAngle: 45, verticalAngle: 15, horizontalFlip: flip, verticalFlip: flip }
    });
    const rail = board('Compound — Rail', o, { features: [compound(true)] });
    const stile = board('Compound — Stile', o, { rotation: { x: 0, y: 90, z: 0 }, features: [compound(false)] });
    mitreCorner(rail, stile);
    // Long-point dimensions include the bevel's inset as well as the mitre.
    // Ordinary mitre placement leaves this much daylight between the planes.
    // Share the correction across the corner axes so the two cut-face
    // centers coincide, rather than leaving one face shifted along the seam.
    const halfBevelInset = (rail.thickness * Math.tan((15 * Math.PI) / 180)) / 2;
    stile.position.x -= halfBevelInset;
    stile.position.z -= halfBevelInset;
    return [rail, stile];
  }
);

// 46 Rule joint — the drop-leaf hinge that stays closed ----------------
station(
  '46 Rule Joint',
  'SEATED: complementary quarter-round drop-leaf edges, with a full-thickness roundover and matching underside cove. Drop-leaf hinges and their mounting screws are a shopping-list kit; hardware and motion are not modeled.',
  () => {
    const o = origin();
    const T = 0.75;
    const R = T;
    const profile = (label, e, kind) => ({
      id: id(),
      kind: 'edge_profile',
      version: 1,
      enabled: true,
      label,
      target: edge(e),
      reference: { primaryFrom: 'min' },
      profile: kind,
      parameters: { size: R, depth: R }
    });
    const top = board('Rule — Table Top', o, {
      width: 8,
      features: [profile('Roundover', 'top_front_edge', 'roundover')]
    });
    const leaf = board('Rule — Leaf', o, { width: 8, features: [profile('Cove', 'bottom_back_edge', 'cove')] });
    leaf.position.z = top.position.z + 8 - R;
    return [top, leaf];
  }
);

// 36 Wedged through tenon — driven right through and spread -----------
station(
  '36 Wedged Through Tenon',
  'SEATED, before driving: the through tenon stands proud, with the narrow tips of 1/4-inch-wide tapered wedges started in 1/8-inch saw kerfs. The wider heads remain outside. Driving them requires wood deformation, which is not simulated; establish wedge travel, socket relief and a shop process separately.',
  () => {
    const o = origin();
    const LEG = 1.75;
    const PROUD = 0.375;
    const KERF = 0.125;
    const leg = board('Wedged — Leg', o, {
      length: 16,
      width: LEG,
      thickness: LEG,
      rotation: { x: 0, y: 0, z: 90 },
      features: [
        rect(
          'Through mortise',
          'mortise',
          face('top_face'),
          { size: { length: 2, width: 0.375 }, depthMode: 'through', wallAngle: 3 },
          { x: 12, z: (LEG - 0.375) / 2 }
        )
      ]
    });
    const rail = board('Wedged — Rail', o, {
      rotation: { x: 90, y: 0, z: 0 },
      features: [
        rect(
          'Tenon',
          'tenon',
          face('right_end'),
          { size: { length: LEG + PROUD, width: 2 }, depthMode: 'blind', depth: 0.375 },
          { x: 0, z: 0.5 }
        ),
        // Two saw kerfs down the length of the tenon, for the wedges to open.
        ...[1, 1.875].map((z, n) =>
          rect(
            `Kerf ${n + 1}`,
            'cutout',
            face('top_face'),
            { size: { length: LEG + PROUD, width: KERF }, depthMode: 'through' },
            { x: 12 - (LEG + PROUD), z }
          )
        )
      ]
    });
    seatTenon(leg, rail, { tenonLength: LEG + PROUD, mortiseFromMin: 12, mortiseLength: 2 });
    // The rail is turned a quarter about X, which stands its width upright:
    // the kerfs are therefore spaced in Y, and the wedges with them.
    const wedge = (n, dy) => {
      const w = board(`Wedged — Wedge ${n}`, o, {
        length: 1,
        width: 2 * KERF,
        thickness: 0.375,
        rotation: { x: 90, y: 0, z: 0 },
        features: [endCut('Wedge taper', 'left_end', (Math.atan(0.99 / (2 * KERF)) * 180) / Math.PI)]
      });
      // Start only the narrow quarter-inch tip; the wider head stays outside.
      w.position.x = leg.position.x + ext(leg).x + PROUD + ext(w).x - 0.25;
      w.position.y = rail.position.y + dy + KERF / 2;
      w.position.z = rail.position.z;
      return w;
    };
    return [leg, rail, wedge(1, 0.4375), wedge(2, -0.4375)];
  }
);

// 37 Twin tenon — one wide tenon split in two -------------------------
station(
  '37 Twin Tenon',
  'SEATED: a tenon too wide to trust as one, split in two with a stub of shoulder between them.',
  () => {
    const o = origin();
    const LEG = 2.5;
    const TENON = 1;
    const leg = board('Twin — Leg', o, {
      stockId: OAK12.id,
      color: OAK12.color,
      length: 16,
      width: LEG,
      thickness: LEG,
      rotation: { x: 0, y: 0, z: 90 },
      features: [
        ...[0.5, 1.75].map((z, n) =>
          rect(
            `Mortise ${n + 1}`,
            'mortise',
            face('top_face'),
            { size: { length: 1, width: 0.375 }, depthMode: 'blind', depth: TENON + 0.0625 },
            { x: 11.5 + n * 1.5, z: (LEG - 0.375) / 2 }
          )
        )
      ]
    });
    const rail = board('Twin — Rail', o, {
      species: 'walnut',
      width: 4,
      rotation: { x: 90, y: 0, z: 0 },
      features: [
        rect(
          'Tenon',
          'tenon',
          face('right_end'),
          { size: { length: TENON, width: 2.5 }, depthMode: 'blind', depth: 0.375 },
          { x: 0, z: 0.75 }
        ),
        // The waste between the two, taken back to the shoulder line.
        rect(
          'Between tenons',
          'cutout',
          face('top_face'),
          { size: { length: TENON, width: 0.5 }, depthMode: 'through' },
          { x: 12 - TENON, z: 1.75 }
        )
      ]
    });
    // Seated on the midpoint of the pair, which is where the rail's centre
    // lands -- measuring from the first mortise puts it out by half the gap.
    seatTenon(leg, rail, { tenonLength: TENON, mortiseFromMin: 12.25, mortiseLength: 1 });
    return [leg, rail];
  }
);

// 47 Screwed cleat — countersunk, and the same hole three times -------
station(
  '47 Screwed Cleat',
  'SEATED: a cleat prepared for three countersunk screws. The holes repeat along the cleat; screws are shopping-list hardware, omitted from 3D.',
  () => {
    const o = origin();
    const panel = board('Screwed — Panel', o, { width: 8 });
    const cleat = board('Screwed — Cleat', o, {
      length: 10,
      width: 2,
      features: [
        {
          id: id(),
          kind: 'circular_cut',
          version: 1,
          enabled: true,
          label: 'Screw',
          cutType: 'countersink',
          target: face('top_face'),
          reference: { primaryFrom: 'center', secondaryFrom: 'center' },
          placement: { primary: -3, secondary: 0, rotation: 0 },
          parameters: {
            diameter: 5 / 32,
            depthMode: 'through',
            tilt: 0,
            direction: 0,
            countersink: { majorDiameter: 3 / 8, includedAngle: 82 }
          },
          pattern: { type: 'linear', count: 3, spacing: 3, direction: 0 }
        }
      ]
    });
    cleat.position.x = panel.position.x;
    cleat.position.z = panel.position.z;
    cleat.position.y = panel.position.y + ext(panel).y + ext(cleat).y;
    return [panel, cleat];
  }
);

// 48 Egg-crate divider — two panels notched into one another ----------
station(
  '48 Egg-Crate Divider',
  'SEATED: each panel notched half its width, one from the top and one from the bottom, and slid together.',
  () => {
    const o = origin();
    const T = 0.75;
    const W = 6;
    const notch = (e) =>
      rect(
        'Notch',
        'edge_notch',
        edge(e),
        { size: { length: T, width: W / 2 }, depthMode: 'through' },
        { x: 6 - T / 2, z: 0 }
      );
    // Stood on edge, length along X; the second turned so its length runs
    // along Z instead, which is the crossing.
    const a = board('Egg Crate — Panel A', o, {
      width: W,
      rotation: { x: 90, y: 0, z: 0 },
      features: [notch('top_front_edge')]
    });
    const b = board('Egg Crate — Panel B', o, {
      width: W,
      rotation: { x: 90, y: 0, z: 90 },
      features: [notch('top_back_edge')]
    });
    b.position.x = a.position.x;
    b.position.y = a.position.y;
    b.position.z = a.position.z;
    return [a, b];
  }
);

// 49 Hinge mortise — the shallow recess a leaf sits in ---------------
station(
  '49 Hinge Mortise',
  'EXPLODED: matching square-cornered hinge-leaf recesses open onto the facing edges, shown face up and one leaf deep. The hinge and its mounting screws are a shopping-list kit; hardware is omitted from 3D.',
  () => {
    const o = origin();
    const LEAF = 0.09;
    const recess = (z) =>
      rect(
        'Hinge recess',
        'cutout',
        face('top_face'),
        { size: { length: 2.5, width: 1.25 }, depthMode: 'blind', depth: LEAF },
        { x: 4.75, z }
      );
    const jamb = board('Hinge — Jamb', o, { width: 4, features: [recess(2.75)] });
    const door = board('Hinge — Door', o, { width: 4, features: [recess(0)] });
    clearOf(jamb, door, 'z', 1);
    return [jamb, door];
  }
);

// 51 T-slot — a wooden runner in a routed track -------------------
station(
  '51 T-Slot Joint',
  'SEATED: a track routed with a T-slot cutter, and a shop-made wooden bar running in the undercut that no straight bit could have made. The left end is open for inserting the bar.',
  () => {
    const o = origin();
    const T = 0.75;
    const SLOT = 0.25;
    const HEAD = 0.5;
    const HEAD_HEIGHT = 0.1875;
    const rail = board('T-Slot — Rail', o, {
      width: 3,
      features: [
        {
          id: id(),
          kind: 'routed_path',
          version: 1,
          enabled: true,
          label: 'T-slot',
          target: face('top_face'),
          reference: { primaryFrom: 'center', secondaryFrom: 'center' },
          path: {
            points: [
              { primary: -6, secondary: 0 },
              { primary: 5, secondary: 0 }
            ]
          },
          bit: { profile: 't_slot', diameter: HEAD, shankDiameter: SLOT, cutterHeight: HEAD_HEIGHT },
          parameters: { depthMode: 'blind', depth: 0.4375 }
        }
      ]
    });
    // The bar lives in the wide part of the track and cannot be lifted out.
    const bar = board('T-Slot — Bar', o, {
      length: 4,
      width: HEAD - 0.03,
      thickness: HEAD_HEIGHT - 0.02,
      grainSensitive: true
    });
    bar.position.x = rail.position.x;
    bar.position.z = rail.position.z;
    bar.position.y = rail.position.y + ext(rail).y - 0.4375 + ext(bar).y;
    return [rail, bar];
  }
);

// 52 Beaded board — a bead and a chamfer on a tongued edge ------------
station(
  '52 Beaded Board',
  'SEATED: tongued and grooved boards with a bead worked on one edge and the other chamfered, so the seam reads as a line and not a gap.',
  () => {
    const o = origin();
    const T = 0.75;
    const TONGUE = 0.25;
    const profile = (label, e, kind, size) => ({
      id: id(),
      kind: 'edge_profile',
      version: 1,
      enabled: true,
      label,
      target: edge(e),
      reference: { primaryFrom: 'min' },
      profile: kind,
      parameters: { size, depth: size }
    });
    const a = board('Beaded — Board A', o, {
      features: [
        rect(
          'Groove',
          'groove',
          face('front_face'),
          { size: { length: 12, width: TONGUE }, depthMode: 'blind', depth: 0.375 },
          { x: 0, z: (T - TONGUE) / 2 }
        ),
        profile('Bead', 'top_front_edge', 'bead', 0.125)
      ]
    });
    const b = board('Beaded — Board B', o, {
      features: [
        rect(
          'Tongue shoulder (top)',
          'cutout',
          face('top_face'),
          { size: { length: 12, width: 0.375 }, depthMode: 'blind', depth: (T - TONGUE) / 2 },
          { x: 0, z: 0 }
        ),
        rect(
          'Tongue shoulder (under)',
          'cutout',
          face('bottom_face'),
          { size: { length: 12, width: 0.375 }, depthMode: 'blind', depth: (T - TONGUE) / 2 },
          { x: 0, z: 0 }
        ),
        // The back arris of the blank has already been removed to leave
        // the tongue. Run a V-bit at the new shoulder instead; an edge
        // profile on the old arris would cut only air.
        {
          id: id(),
          kind: 'routed_path',
          version: 1,
          enabled: true,
          label: 'Shoulder chamfer',
          target: face('top_face'),
          reference: { primaryFrom: 'center', secondaryFrom: 'center' },
          path: {
            points: [
              { primary: -6, secondary: -1.125 },
              { primary: 6, secondary: -1.125 }
            ]
          },
          bit: { profile: 'v_bit', diameter: 0.25, includedAngle: 90 },
          parameters: { depthMode: 'blind', depth: 0.125 }
        }
      ]
    });
    b.position.z = a.position.z + 3 - 0.375;
    return [a, b];
  }
);

// 53 Shelf pin holes — a grid of them, and a shelf sitting on it ------
station(
  '53 Shelf Pin Holes',
  'SEATED: a cabinet-side sample with two columns of 5mm holes at 32mm vertical spacing. Two purchased pins support the shelf edge at the lowest setting; pins and the opposite cabinet side are omitted from 3D. Buy the pins from the shopping list.',
  () => {
    const o = origin();
    const T = 0.75;
    const side = board('Shelf Pins — Side', o, {
      length: 18,
      width: 8,
      rotation: { x: 0, y: 0, z: 90 },
      features: [
        {
          id: id(),
          kind: 'circular_cut',
          version: 1,
          enabled: true,
          label: 'Pin hole',
          cutType: 'round_hole',
          target: face('top_face'),
          reference: { primaryFrom: 'center', secondaryFrom: 'center' },
          placement: { primary: -3, secondary: -1.5, rotation: 0 },
          parameters: {
            diameter: 5 * MM,
            depthMode: 'blind',
            depth: 0.375,
            tilt: 0,
            direction: 0
          },
          // Local X stands vertically; local Z runs front to back.
          pattern: { type: 'grid', rows: 2, columns: 5, rowSpacing: 3, columnSpacing: 32 * MM, rotation: 0 }
        }
      ]
    });
    const shelf = board('Shelf Pins — Shelf', o, { length: 8, width: 8 });
    const faceX = side.position.x - T / 2;
    shelf.position.x = faceX - ext(shelf).x;
    shelf.position.z = side.position.z;
    const pinHeight = side.position.y - 3;
    shelf.position.y = pinHeight + (5 * MM) / 2 + ext(shelf).y;
    return [side, shelf];
  }
);

// 54 Cutter sampler — every other bit and profile, on two boards ------
station(
  '54 Cutter Sampler',
  'EXPLODED: not a joint at all. One board carries a pass of every remaining router bit, the other every remaining edge profile. The stopped dovetail route has a separate 1/2-inch-diameter, 3/8-inch-deep entry pocket at its start. The keyhole route includes its entry opening automatically. Establish the actual tooling and machining sequence separately.',
  () => {
    const o = origin();
    const T = 0.75;
    const pass = (label, bit, secondary, depth = 0.1875) => ({
      id: id(),
      kind: 'routed_path',
      version: 1,
      enabled: true,
      label,
      target: face('top_face'),
      reference: { primaryFrom: 'center', secondaryFrom: 'center' },
      path: {
        points: [
          { primary: -5, secondary },
          { primary: 5, secondary }
        ]
      },
      bit,
      parameters: { depthMode: 'blind', depth }
    });
    const bits = board('Sampler — Router Bits', o, {
      stockId: OAK_PANEL.id,
      color: OAK_PANEL.color,
      width: 14,
      features: [
        pass('Straight', { profile: 'straight', diameter: 0.25 }, -6.5),
        pass('Mortising', { profile: 'mortising', diameter: 0.5 }, -5.5),
        pass('Spiral upcut', { profile: 'spiral_upcut', diameter: 0.25 }, -4.5),
        pass('Spiral downcut', { profile: 'spiral_downcut', diameter: 0.25 }, -3.5),
        pass('Compression', { profile: 'compression', diameter: 0.25 }, -2.5),
        pass('Surfacing', { profile: 'surfacing', diameter: 1 }, -1.5, 0.0625),
        pass('Core box', { profile: 'core_box', diameter: 0.5 }, -0.5),
        pass('Ball nose', { profile: 'ball_nose', diameter: 0.375 }, 0.5),
        pass('V bit', { profile: 'v_bit', diameter: 0.5, includedAngle: 90 }, 1.5),
        pass('Engraving', { profile: 'engraving', diameter: 0.125, includedAngle: 60 }, 2.5, 0.0625),
        // The two that undercut, and so cut a shape no straight bit can.
        // The complete tapered cutter must fit inside the plunge depth.
        // A 1/4-inch neck with a 14-degree included angle needs over an
        // inch of depth and is silently omitted by the geometry renderer.
        hole('Dovetail cutter entry pocket', 'top_face', 0.5, 0.375, -5, 3.5),
        pass(
          'Dovetail (14° sides)',
          { profile: 'dovetail', diameter: 0.5, shankDiameter: 0.375, includedAngle: 28 },
          3.5,
          0.375
        ),
        pass('Keyhole', { profile: 'keyhole', diameter: 0.5, shankDiameter: 0.25, cutterHeight: 0.125 }, 4.5, 0.375)
      ]
    });
    const profile = (label, e, kind, size) => ({
      id: id(),
      kind: 'edge_profile',
      version: 1,
      enabled: true,
      label,
      target: edge(e),
      reference: { primaryFrom: 'min' },
      profile: kind,
      parameters: { size, depth: size }
    });
    // A profile of one's own: the boundary a cutter leaves, given outright as
    // coordinates from the arris instead of picked from the standard list.
    const steppedId = id();
    const stepped = {
      version: 1,
      id: steppedId,
      name: 'Stepped bead',
      family: 'custom',
      source: 'generic',
      parameters: {},
      boundary: {
        start: { u: 0.375, v: 0 },
        segments: [
          { kind: 'line', to: { u: 0.375, v: 0.1875 } },
          { kind: 'line', to: { u: 0.1875, v: 0.1875 } },
          { kind: 'line', to: { u: 0.1875, v: 0.375 } },
          { kind: 'line', to: { u: 0, v: 0.375 } }
        ]
      }
    };
    const profiles = board('Sampler — Edge Profiles', o, {
      species: 'walnut',
      width: 6,
      features: [
        profile('Ogee', 'top_front_edge', 'ogee', 0.25),
        profile('Thumbnail', 'top_back_edge', 'thumbnail', 0.25),
        profile('Rabbet', 'bottom_front_edge', 'rabbet', 0.25),
        {
          ...profile('Stepped bead', 'bottom_back_edge', 'custom', 0.375),
          // A custom profile has to name the definition it was cut from as
          // well as carry it, so the file can still be read if the library
          // entry is edited or thrown away.
          routerProfileId: steppedId,
          routerProfileSnapshot: stepped
        },
        {
          id: id(),
          kind: 'circular_cut',
          version: 1,
          enabled: true,
          label: 'Bolt circle',
          cutType: 'round_hole',
          target: face('top_face'),
          reference: { primaryFrom: 'center', secondaryFrom: 'center' },
          placement: { primary: 0, secondary: 0, rotation: 0 },
          // Set out round a centre rather than along a line, the way a
          // bearing or a lazy susan is bolted down.
          parameters: {
            diameter: 0.25,
            depthMode: 'through',
            tilt: 0,
            direction: 0
          },
          pattern: { type: 'circular', count: 6, radius: 1.75, startAngle: 0 }
        }
      ]
    });
    clearOf(bits, profiles, 'z', 1);
    return [bits, profiles];
  }
);

const now = new Date().toISOString();
const file = {
  version: 4,
  project: {
    // Stamped so the title bar says which build of the bench is open. The
    // stations change as the app does, and a stale copy is otherwise
    // indistinguishable from a fresh one.
    name: process.env.BENCH_NAME || 'Joinery Test Bench',
    createdAt: now,
    modifiedAt: now,
    units: 'imperial',
    gridSize: 1,
    kerfWidth: 0.125,
    overageFactor: 0.1,
    projectNotes: [
      'One station per joint, each its own group, laid out on a grid.',
      'Overlap prevention is ON: nothing here is jammed through anything else.',
      '',
      'SEATED stations are assembled, with one piece home in a housing the app',
      'understands. EXPLODED stations expose their cuts or show an assembly step.',
      '',
      'Use Ghost view to inspect buried tenons, pins and inserts.',
      'Dowels and purchased inserts use their physical shapes for fit checks.',
      '',
      'Through, half-blind and mitred blind dovetails use tapered cuts and',
      'angled socket walls. The sliding dovetail has a matching flared tongue.',
      'Fox wedges are shown started before assembly; through wedges are shown',
      'before driving. Elastic spreading is not modeled.',
      'Purchased metal hardware and canvas are shopping-list items, not wood stock.',
      'They are omitted from 3D; wood cuts remain visible. Match purchased hardware',
      'to the hole/recess dimensions before fabrication. No thread model is supplied.',
      'Zero-priced shopping items and thin plywood are UNPRICED, not free.',
      'Other prices are illustrative; replace them with supplier quotes.',
      'The router sampler uses a purchased pre-glued panel, not a generated glue-up.',
      'Thin solid-wood parts require the thickness preparation printed in the cut list.',
      'Glue bonded joints as appropriate; keep floating panels and moving joints free.',
      'Finish is optional for this sample bench and is not included.',
      '',
      'Carvd will not cut a mortise into an end, only into a face, so the loose',
      'tenon and Domino stations are shown edge to edge rather than rail into',
      'stile. Both are real uses of those joints; the rail-into-stile version is',
      'simply not expressible.',
      '',
      'Worth trying: Fit Tenon to Mortise on 07, Fit Dado to Mating Part on 05,',
      'Transfer Holes to Mating Part on 03, Bore Through Assembly on 26.',
      'Station 05 is fitted to the actual 23/32-inch plywood thickness.',
      'To demonstrate Fit Dado to Mating Part, widen its housing temporarily.'
    ].join('\n'),
    stockConstraints: { constrainDimensions: true, constrainGrain: true, constrainColor: true, preventOverlap: true }
  },
  parts,
  stocks,
  groups,
  groupMembers,
  assemblies: [],
  customShoppingItems: [
    {
      id: id(),
      name: '29 Cross Dowel — joint bolt and matching barrel nut set',
      quantity: 1,
      unitPrice: 0,
      category: 'Hardware',
      description:
        'One complete bolt (head included) plus one matching threaded barrel nut. Demo envelope: 1/4-inch bolt clearance, 4-1/2-inch under-head reach to barrel center; barrel 3/8-inch diameter × 3/4-inch long. Select compatible threads and sufficient engagement, then adjust the demo bores to the actual hardware. Price not entered.'
    },
    {
      id: id(),
      name: '53 Shelf Pins — 5 mm shelf support pin',
      quantity: 2,
      unitPrice: 0,
      category: 'Hardware',
      description:
        'Two pins for the one cabinet-side sample shown. Bore depth 3/8 inch; select matching insertion length and support geometry. The opposite cabinet side and its supports are omitted. Price not entered.'
    },
    {
      id: id(),
      name: '34 Pocket Hole — screws for 3/4-inch hardwood',
      quantity: 2,
      unitPrice: 0,
      category: 'Hardware',
      description:
        'Select pocket-hole screws compatible with the actual jig, hardwood and material thickness; confirm length and head fit before drilling. Price not entered.'
    },
    {
      id: id(),
      name: '47 Screwed Cleat — countersunk wood screws',
      quantity: 3,
      unitPrice: 0,
      category: 'Hardware',
      description:
        'Fasten a 3/4-inch cleat to the 3/4-inch panel. Select head diameter, pilot diameter and penetration to match the stock and avoid breaking through the panel. Price not entered.'
    },
    {
      id: id(),
      name: '46 Rule Joint — drop-leaf hinge kit with mounting screws',
      quantity: 1,
      unitPrice: 0,
      category: 'Hardware',
      description:
        'One kit sufficient for the 12-inch sample leaf. Choose hinges for the actual rule-joint profile; follow the kit instructions for hinge count, pivot location, recesses and screws. No hinge motion or mounting recesses are modeled. Price not entered.'
    },
    {
      id: id(),
      name: '49 Hinge Mortise — hinge with matching mounting screws',
      quantity: 1,
      unitPrice: 0,
      category: 'Hardware',
      description:
        'One hinge for the two mating leaf recesses shown. Match leaf dimensions and thickness to the recesses, or update the recesses to the purchased hinge; use its specified screws. Price not entered.'
    },
    {
      id: id(),
      name: '17 Tambour — canvas backing piece',
      quantity: 1,
      unitPrice: 0,
      category: 'Supplies',
      description:
        'Cut a 3-1/4 × 5-1/2-inch piece of flexible canvas with scissors or a knife; no woodworking saw kerf or board-foot allowance. Attach to the slat undersides with a compatible flexible adhesive. Price not entered.'
    },
    {
      id: id(),
      name: '17 Tambour — flexible wood-to-canvas adhesive',
      quantity: 1,
      unitPrice: 0,
      category: 'Supplies',
      description:
        'One container suitable for the 3-1/4 × 5-1/2-inch backing area; select a product intended for flexible tambour backing and follow its application instructions. Price not entered.'
    },
    {
      id: id(),
      name: 'Woodworking glue for bonded sample joints',
      quantity: 1,
      unitPrice: 0,
      category: 'Supplies',
      description:
        'One container for the sample bench. Select a suitable wood adhesive and package coverage. Do not glue floating panels, moving tracks, or joints intended to be disassembled. Price not entered.'
    }
  ],
  cutList: null,
  thumbnail: null,
  cameraState: null
};

const out = process.argv[2];
writeFileSync(out, JSON.stringify(file, null, 2));
console.log(`${groups.length} stations · ${parts.length} parts · ${stocks.length} stocks -> ${out}`);
