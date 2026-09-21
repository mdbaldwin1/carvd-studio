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
const OAK = { id: id(), name: '4/4 White Oak', length: 96, width: 8, thickness: 0.75, grainDirection: 'length', pricingUnit: 'board_foot', pricePerUnit: 9, color: '#c9a978', form: 'board' };
const OAK8 = { id: id(), name: '8/4 White Oak', length: 96, width: 6, thickness: 1.75, grainDirection: 'length', pricingUnit: 'board_foot', pricePerUnit: 14, color: '#b08f5f', form: 'board' };
const PLY = { id: id(), name: '3/4" Baltic Birch Plywood', length: 96, width: 48, thickness: 0.71875, grainDirection: 'none', pricingUnit: 'per_item', pricePerUnit: 72, color: '#d8c39a', form: 'sheet' };
const DOWEL38 = { id: id(), name: '3/8" Birch Dowel', length: 36, width: 0.375, thickness: 0.375, grainDirection: 'length', pricingUnit: 'per_item', pricePerUnit: 3.5, color: '#c89b5b', form: 'rod' };
const DOWEL14 = { id: id(), name: '1/4" Birch Dowel', length: 36, width: 0.25, thickness: 0.25, grainDirection: 'length', pricingUnit: 'per_item', pricePerUnit: 2.75, color: '#c89b5b', form: 'rod' };
const BISCUIT = { id: id(), name: '#20 Biscuit', length: 56 * MM, width: 23 * MM, thickness: 4 * MM, grainDirection: 'none', pricingUnit: 'per_item', pricePerUnit: 13.99, color: '#d9c49a', form: 'insert', insertKind: 'biscuit', packSize: 100 };
const DOMINO = { id: id(), name: '6 × 20 × 40 mm Domino', length: 40 * MM, width: 20 * MM, thickness: 6 * MM, grainDirection: 'length', pricingUnit: 'per_item', pricePerUnit: 28, color: '#9a6b45', form: 'insert', insertKind: 'domino', packSize: 190 };
const stocks = [OAK, OAK8, PLY, DOWEL38, DOWEL14, BISCUIT, DOMINO];

// ------------------------------------------------------------- features
const rect = (label, cutType, target, parameters, placement, reference) => ({
  id: id(), kind: 'rect_cut', version: 1, enabled: true, label, cutType, target,
  reference: reference ?? { primaryFrom: 'min' }, parameters, placement
});
const face = (f) => ({ type: 'face', face: f });
const edge = (e) => ({ type: 'edge', edge: e });
const corner = (c) => ({ type: 'corner', corner: c });

const hole = (label, f, diameter, depth, primary, secondary) => ({
  id: id(), kind: 'circular_cut', version: 1, enabled: true, label, cutType: 'round_hole',
  target: face(f), reference: { primaryFrom: 'center', secondaryFrom: 'center' },
  placement: { primary, secondary, rotation: 0 },
  parameters: depth === null
    ? { diameter, depthMode: 'through', tilt: 0, direction: 0 }
    : { diameter, depthMode: 'blind', depth, tilt: 0, direction: 0 }
});

const endCut = (label, f, horizontalAngle, horizontalFlip = false) => ({
  id: id(), kind: 'end_cut', version: 1, enabled: true, label,
  target: face(f), reference: { primaryFrom: f === 'left_end' ? 'min' : 'max' },
  cutType: 'mitre', lengthMode: 'long_point', parameters: { horizontalAngle, horizontalFlip }
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
  id: id(), kind: 'rounded_cut', version: 1, enabled: true, label, cutType: 'rounded_slot',
  target: face(f), reference: { primaryFrom: 'center', secondaryFrom: 'center' },
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
const edgeGroove = (label, f, width, depth, thickness = 0.75, length = 12) =>
  rect(label, 'groove', face(f), { size: { length, width }, depthMode: 'blind', depth }, { x: 0, z: (thickness - width) / 2 });

// ------------------------------------------------------------ placement
/**
 * Half extents in world axes. Only quarter turns are used here, so the local
 * length/thickness/width simply swap places rather than needing a matrix.
 */
function ext(p) {
  const turn = (a) => ((((a ?? 0) % 360) + 360) % 360);
  const rx = turn(p.rotation?.x), ry = turn(p.rotation?.y), rz = turn(p.rotation?.z);
  let e = { x: p.length / 2, y: p.thickness / 2, z: p.width / 2 };
  // Three.js reads these as Euler XYZ, which is R = Rx * Ry * Rz, so Z turns
  // first and X last. Doing them in any other order transposes the part.
  if (rz === 90 || rz === 270) e = { x: e.y, y: e.x, z: e.z };
  if (ry === 90 || ry === 270) e = { x: e.z, y: e.y, z: e.x };
  if (rx === 90 || rx === 270) e = { x: e.x, y: e.z, z: e.y };
  return e;
}
/** Stand a part on the ground. */
const onGround = (p) => { p.position.y = ext(p).y; return p; };
/** Put b's low face against a's high face on one axis. */
const against = (a, b, axis) => { b.position[axis] = a.position[axis] + ext(a)[axis] + ext(b)[axis]; return b; };
/** The same, with a visible gap: pieces that would otherwise interpenetrate. */
const apartFrom = (a, b, axis, gap = EXPLODE) => { against(a, b, axis); b.position[axis] += gap; return b; };
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
  const group = { id: id(), name };
  groups.push(group);
  for (const part of build()) {
    if (note && !part.notes) part.notes = note;
    parts.push(part);
    groupMembers.push({ id: id(), groupId: group.id, memberType: 'part', memberId: part.id });
  }
}

let column = 0, row = 0;
const COLS = 6, DX = 44, DZ = 40;
function origin() {
  const o = { x: column * DX, z: row * DZ };
  column += 1;
  if (column >= COLS) { column = 0; row += 1; }
  return o;
}

const board = (name, o, opts = {}) => {
  const p = {
    id: id(), name,
    length: opts.length ?? 12, width: opts.width ?? 3, thickness: opts.thickness ?? 0.75,
    position: { x: o.x + (opts.dx ?? 0), y: 0, z: o.z + (opts.dz ?? 0) },
    rotation: opts.rotation ?? { x: 0, y: 0, z: 0 },
    stockId: opts.stockId ?? OAK.id,
    grainSensitive: opts.grainSensitive ?? true,
    grainDirection: 'length',
    color: opts.color ?? OAK.color,
    features: opts.features ?? [],
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
    const p = board(`Dowel — Pin ${n}`, o, { length: 1, width: 0.375, thickness: 0.375, stockId: DOWEL38.id, color: DOWEL38.color });
    p.position = { x: joint, y: rail.position.y, z: rail.position.z + dz };
    return p;
  };
  return [rail, stile, pin(1, -1), pin(2, 1)];
});

// 04 Biscuit — arc-ended slots in the meeting edges ----------------------
station('04 Biscuit Joint', 'SEATED: slots cut in the meeting edges, the biscuit floating in both.', () => {
  const o = origin();
  const T = 0.75;
  // A plate joiner is run along the edge the boards meet on, with its fence
  // registered off the face, and the blade being round leaves an arc at each
  // end -- which is why this is a rounded slot and not a squared-off mortise.
  const biscuitSlot = (f) => slot('Biscuit slot', f, 56 * MM, 4 * MM, 0.5, 0, 0);
  const a = board('Biscuit — Board A', o, { width: 6, features: [biscuitSlot('front_face')] });
  const b = board('Biscuit — Board B', o, { width: 6, features: [biscuitSlot('back_face')] });
  against(a, b, 'z');
  // 23mm across the seam into two 1/2" slots, so it floats at both ends --
  // which is what lets the boards still slide into line before the glue grabs.
  const biscuit = board('Biscuit — #20', o, {
    length: 56 * MM, width: 23 * MM, thickness: 4 * MM,
    stockId: BISCUIT.id, color: BISCUIT.color, grainSensitive: false
  });
  biscuit.position.x = a.position.x;
  biscuit.position.y = a.position.y;
  biscuit.position.z = a.position.z + ext(a).z;
  return [a, b, biscuit];
});

// 05 Dado — the shelf sits home in the housing -------------------------
station('05 Dado Joint', 'SEATED: real 23/32 plywood in a dado typed 3/4 — try Fit Dado to Mating Part.', () => {
  const o = origin();
  const side = board('Dado — Side', o, { length: 18, width: 8, features: [rect('Shelf dado', 'dado', face('top_face'), { size: { length: 0.75, width: 8 }, depthMode: 'blind', depth: 0.25 }, { x: 8, z: 0 })] });
  // Standing in the housing: down into the dado by its depth, centred on it.
  const shelf = board('Dado — Shelf', o, { length: 8, width: 8, thickness: 0.71875, stockId: PLY.id, color: PLY.color, grainSensitive: false, rotation: { x: 0, y: 0, z: 90 } });
  shelf.position.x = side.position.x - ext(side).x + 8 + 0.375;
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
    length: 14, width: 6,
    features: [rect('Back rabbet', 'rabbet', edge('top_back_edge'), { size: { length: 14, width: T }, depthMode: 'blind', depth: DEPTH }, { x: 0, z: 0 })]
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
  const leg = board('M&T — Leg', o, { length: 16, width: 1.75, thickness: 1.75, stockId: OAK8.id, color: OAK8.color, rotation: { x: 0, y: 0, z: 90 }, features: [rect('Rail mortise', 'mortise', face('top_face'), { size: { length: 2, width: 0.25 }, depthMode: 'blind', depth: 1.0625 }, { x: 12, z: 0.75 })] });
  const rail = board('M&T — Rail', o, { rotation: { x: 90, y: 0, z: 0 }, features: [rect('Tenon', 'tenon', face('right_end'), { size: { length: 1, width: 2 }, depthMode: 'blind', depth: 0.25 }, { x: 0, z: 0.5 })] });
  // A quarter turn about Z puts the leg's top face toward -X, so the mortise
  // opens that way and the rail approaches from there, tenon leading.
  seatTenon(leg, rail, { tenonLength: 1, mortiseFromMin: 12, mortiseLength: 2 });
  return [leg, rail];
});

// 08 Box joint — fingers interleave, so show it open --------------------
station('08 Box Joint', 'EXPLODED: fingers cut one at a time; Carvd has no repeat for rectangular cuts.', () => {
  const o = origin();
  const fingers = (offsets) => offsets.map((z, i) => rect(`Finger ${i + 1}`, 'cutout', face('top_face'), { size: { length: 0.75, width: 0.75 }, depthMode: 'through' }, { x: 0, z }));
  const a = board('Box — Side A', o, { features: fingers([0, 1.5]) });
  const b = board('Box — Side B', o, { features: fingers([0.75, 2.25]) });
  apartFrom(a, b, 'z');
  return [a, b];
});

// Dovetails — not expressible at all -----------------------------------
for (const [n, label, why] of [
  ['09', 'Through Dovetail', 'NOT MODELLED: tails and pins need angled cuts; every rectangular cut in Carvd is an axis-aligned prism.'],
  ['10', 'Half-Blind Dovetail', 'NOT MODELLED: needs angled cuts, and a socket that stops short of the face.'],
  ['11', 'Sliding Dovetail', 'NOT MODELLED: the socket could be routed with a dovetail bit, but the male half needs an angled tenon.'],
  ['15', 'Mitred Blind Dovetail', 'NOT MODELLED: needs angled cuts hidden behind a mitre.']
]) {
  station(`${n} ${label}`, why, () => {
    const o = origin();
    const a = board(`${label} — Board A`, o);
    const b = board(`${label} — Board B`, o, { rotation: { x: 0, y: 90, z: 0 } });
    apartFrom(a, b, 'x');
    return [a, b];
  });
}

// 12 End lap — half out of each, so they close flush --------------------
station('12 Half Lap (T-Lap)', 'SEATED: a lapped end let into the face of a rail, half the stock out of each.', () => {
  const o = origin();
  const lap = (x) => rect('Half lap', 'half_lap', face('top_face'), { size: { length: 3, width: 3 }, depthMode: 'blind', depth: 0.375 }, { x, z: 0 });
  // Notched across the middle of the rail, and at the very end of the stile.
  const rail = board('T-Lap — Rail', o, { features: [lap(4.5)] });
  const stile = board('T-Lap — Stile', o, { rotation: { x: 0, y: 90, z: 0 }, features: [lap(0)] });
  // A quarter turn about Y sends the stile's length down -Z, so its min end --
  // the lapped one -- ends up at +Z. Sit that end over the rail's notch.
  stile.position.x = rail.position.x;
  stile.position.z = rail.position.z - ext(stile).z + ext(rail).z;
  stile.position.y = rail.position.y + 0.375;
  return [rail, stile];
});

// 13 Bridle — the tenon sits in the open mortise ------------------------
station('13 Bridle Joint', 'EXPLODED and APPROXIMATE: a bridle\'s open mortise is cut into the end, and Carvd will not cut an end — the slot here stands in for it.', () => {
  const o = origin();
  const post = board('Bridle — Post', o, { features: [rect('Open mortise', 'stopped_groove', face('top_face'), { size: { length: 1.5, width: 0.25 }, depthMode: 'blind', depth: 0.749 }, { x: 0, z: 1.375 })] });
  const rail = board('Bridle — Rail', o, { features: [rect('Tenon', 'tenon', face('left_end'), { size: { length: 1.5, width: 3 }, depthMode: 'blind', depth: 0.25 }, { x: 0, z: 0 })] });
  clearOf(post, rail, 'x', -1);
  return [post, rail];
});

// 14 Tongue & groove — the tongue runs home in the groove ---------------
station('14 Tongue & Groove', 'SEATED: a groove in one edge, two rabbets leaving a tongue on the other.', () => {
  const o = origin();
  const T = 0.75;
  const TONGUE = 0.25;
  const GROOVE_DEPTH = 0.375;
  const grooved = board('T&G — Grooved Board', o, { width: 5, features: [edgeGroove('Groove', 'back_face', TONGUE, GROOVE_DEPTH, T)] });
  const shoulder = (e) => rect(`Tongue shoulder — ${e}`, 'rabbet', edge(`${e}_front_edge`), { size: { length: 12, width: TONGUE }, depthMode: 'blind', depth: (T - TONGUE) / 2 }, { x: 0, z: 0 });
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

// 17 Tambour — the slats ride in the groove -----------------------------
station('17 Tambour Joint', 'EXPLODED and APPROXIMATE: slats above their groove; the canvas backing is not modelled.', () => {
  const o = origin();
  const side = board('Tambour — Side', o, { length: 14, width: 4, features: [rect('Tambour groove', 'groove', face('top_face'), { size: { length: 14, width: 0.25 }, depthMode: 'blind', depth: 0.25 }, { x: 0, z: 1.875 })] });
  const made = [side];
  let previous = null;
  for (let i = 0; i < 4; i += 1) {
    const slat = board(`Tambour — Slat ${i + 1}`, o, { length: 0.75, width: 6, thickness: 0.25 });
    slat.position.x = side.position.x - 3 + i * 1.5;
    slat.position.z = side.position.z + ext(side).z + EXPLODE + 3;
    slat.position.y = ext(slat).y;
    previous = slat;
    made.push(slat);
  }
  void previous;
  return made;
});

// 18 Scarf — the tapers interleave, so show them apart ------------------
station('18 Scarf Joint', 'EXPLODED: an 8 to 1 slope, which eats 24 inches of a 3 inch board.', () => {
  const o = origin();
  const a = board('Scarf — Board A', o, { length: 30, features: [endCut('Scarf', 'right_end', 82.9)] });
  const b = board('Scarf — Board B', o, { length: 30, features: [endCut('Scarf', 'left_end', 82.9)] });
  apartFrom(a, b, 'x');
  return [a, b];
});

// 19 Spline — the spline sits in both grooves ---------------------------
station('19 Spline Joint', 'SEATED: a groove in each meeting edge and a loose spline between them.', () => {
  const o = origin();
  const T = 0.75;
  const W = 0.25;
  const DEPTH = 0.375;
  const a = board('Spline — Board A', o, { width: 5, features: [edgeGroove('Spline groove', 'front_face', W, DEPTH, T)] });
  const b = board('Spline — Board B', o, { width: 5, features: [edgeGroove('Spline groove', 'back_face', W, DEPTH, T)] });
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
  const lap = (x) => rect('Cross lap', 'half_lap', face('top_face'), { size: { length: 3, width: 3 }, depthMode: 'blind', depth: 0.375 }, { x, z: 0 });
  const rail = board('Cross Lap — Rail', o, { features: [lap(4.5)] });
  const stile = board('Cross Lap — Stile', o, { rotation: { x: 0, y: 90, z: 0 }, features: [lap(4.5)] });
  stile.position.y = rail.position.y + 0.375;
  return [rail, stile];
});

// 21 Full lap — all of one piece let into the other ---------------------
station('21 Full Lap Joint', 'SEATED: all of one piece let into the other; the crossing rail is untouched.', () => {
  const o = origin();
  const housed = board('Full Lap — Housed Rail', o, { features: [rect('Full lap housing', 'dado', face('top_face'), { size: { length: 3, width: 3 }, depthMode: 'blind', depth: 0.749 }, { x: 4.5, z: 0 })] });
  const crossing = board('Full Lap — Crossing Rail', o, { rotation: { x: 0, y: 90, z: 0 } });
  crossing.position.y = housed.position.y + ext(housed).y - 0.749 + ext(crossing).y;
  return [housed, crossing];
});

// 22 Groove — the panel floats in the groove ----------------------------
station('22 Groove Joint', 'SEATED: a panel floating in a groove — read the seasonal movement note in the cut list.', () => {
  const o = origin();
  const T = 0.75;
  const W = 0.25;
  const rail = board('Groove — Frame Rail', o, { width: 2.5, features: [edgeGroove('Panel groove', 'back_face', W, 0.375, T)] });
  const panel = board('Groove — Panel', o, { length: 12, width: 7, thickness: W });
  panel.position.x = rail.position.x;
  panel.position.y = rail.position.y;
  // Standing in the groove but off its floor, which is the whole reason a
  // panel is never glued in: it has to be free to move across the seasons.
  panel.position.z = rail.position.z - ext(rail).z - ext(panel).z + 0.25;
  return [rail, panel];
});

// 23 Loose tenon — edge to edge, since Carvd will not mortise an end ----
station('23 Loose Tenon Joint', 'SEATED: edge to edge, because Carvd will not mortise an end — see the project notes.', () => {
  const o = origin();
  const mortise = (f) => rect('Loose tenon mortise', 'mortise', f, { size: { length: 2, width: 0.25 }, depthMode: 'blind', depth: 0.6 }, { x: 5, z: 0.25 });
  const a = board('Loose Tenon — Board A', o, { width: 4, features: [mortise(face('front_face'))] });
  const b = board('Loose Tenon — Board B', o, { width: 4, features: [mortise(face('back_face'))] });
  against(a, b, 'z');
  const tenon = board('Loose Tenon — Tenon', o, { length: 1.1, width: 2, thickness: 0.25, rotation: { x: 0, y: 90, z: 0 } });
  // Home in both mortises, floating clear of each floor the way a loose tenon
  // does. Its own length runs across the seam once it is turned a quarter.
  tenon.position.x = a.position.x - ext(a).x + 5 + 1;
  tenon.position.y = a.position.y - ext(a).y + 0.25 + 0.125;
  tenon.position.z = a.position.z + ext(a).z;
  
  return [a, b, tenon];
});

// 24 Domino — the same, bought in a box ---------------------------------
station('24 Domino Joint', 'SEATED: the same idea bought in a box, edge to edge for the same reason.', () => {
  const o = origin();
  const mortise = (f) => rect('Domino mortise', 'mortise', f, { size: { length: 20 * MM, width: 6 * MM }, depthMode: 'blind', depth: 22 * MM }, { x: 6 - 10 * MM, z: (0.75 - 6 * MM) / 2 });
  const a = board('Domino — Board A', o, { width: 4, features: [mortise(face('front_face'))] });
  const b = board('Domino — Board B', o, { width: 4, features: [mortise(face('back_face'))] });
  against(a, b, 'z');
  const domino = board('Domino — 6 × 20 × 40', o, { length: 40 * MM, width: 20 * MM, thickness: 6 * MM, stockId: DOMINO.id, color: DOMINO.color, rotation: { x: 0, y: 90, z: 0 } });
  domino.position.x = a.position.x - ext(a).x + 6;
  domino.position.y = a.position.y - ext(a).y + (0.75 - 6 * MM) / 2 + 3 * MM;
  domino.position.z = a.position.z + ext(a).z;
  return [a, b, domino];
});

// 25 Pin — a through pin holding a lap ----------------------------------
station('25 Pin Joint', 'SEATED: a through pin holding a lap — a pinned joint, not dovetail pins.', () => {
  const o = origin();
  const lap = (x) => rect('Half lap', 'half_lap', face('top_face'), { size: { length: 3, width: 3 }, depthMode: 'blind', depth: 0.375 }, { x, z: 0 });
  const rail = board('Pin — Rail', o, { features: [lap(4.5), hole('Pin hole', 'top_face', 0.25, null, 0, 0)] });
  const stile = board('Pin — Stile', o, { rotation: { x: 0, y: 90, z: 0 }, features: [lap(4.5), hole('Pin hole', 'top_face', 0.25, null, 0, 0)] });
  stile.position.y = rail.position.y + 0.375;
  // Driven right through the lap: the rail's lower half and the stile's,
  // which together are one board's thickness once the two halves close.
  const peg = board('Pin — Peg', o, { length: 0.75, width: 0.25, thickness: 0.25, stockId: DOWEL14.id, color: DOWEL14.color, rotation: { x: 0, y: 0, z: 90 } });
  peg.position.x = rail.position.x;
  peg.position.z = rail.position.z;
  peg.position.y = rail.position.y;
  return [rail, stile, peg];
});

// 26 Pegged M&T — assembled, so Bore Through Assembly has a stack -------
station('26 Pegged Mortise & Tenon', 'SEATED and assembled: try Bore Through Assembly on the leg.', () => {
  const o = origin();
  const leg = board('Pegged — Leg', o, { length: 16, width: 1.75, thickness: 1.75, stockId: OAK8.id, color: OAK8.color, rotation: { x: 0, y: 0, z: 90 }, features: [
    rect('Rail mortise', 'mortise', face('top_face'), { size: { length: 2, width: 0.25 }, depthMode: 'blind', depth: 1.0625 }, { x: 12, z: 0.75 }),
    hole('Peg hole', 'front_face', 0.25, null, 0, 0)
  ] });
  const rail = board('Pegged — Rail', o, { rotation: { x: 90, y: 0, z: 0 }, features: [rect('Tenon', 'tenon', face('right_end'), { size: { length: 1, width: 2 }, depthMode: 'blind', depth: 0.25 }, { x: 0, z: 0.5 })] });
  seatTenon(leg, rail, { tenonLength: 1, mortiseFromMin: 12, mortiseLength: 2 });
  // The peg goes through the leg's width, so it lies along Z at the hole.
  const peg = board('Pegged — Peg', o, { length: 2.5, width: 0.25, thickness: 0.25, stockId: DOWEL14.id, color: DOWEL14.color, rotation: { x: 0, y: 90, z: 0 } });
  peg.position.x = leg.position.x;
  peg.position.y = leg.position.y;
  peg.position.z = leg.position.z - ext(leg).z + 1.25;
  return [leg, rail, peg];
});

// 27 Birdsmouth — the notch sits on the plate ---------------------------
station('27 Birdsmouth Joint', 'EXPLODED and APPROXIMATE: a square notch stands in for the seat and heel of a rafter.', () => {
  const o = origin();
  const rafter = board('Birdsmouth — Rafter', o, { length: 14, features: [rect('Birdsmouth', 'corner_notch', corner('front_left_corner'), { size: { length: 1.5, width: 1.5 }, depthMode: 'through' }, { x: 0, z: 0 }, { primaryFrom: 'min', secondaryFrom: 'min' })] });
  const plate = board('Birdsmouth — Wall Plate', o, { length: 10, width: 3, rotation: { x: 0, y: 90, z: 0 } });
  apartFrom(rafter, plate, 'x');
  return [rafter, plate];
});

// 28 Scallop & dowel — the dowel sits in both bores ---------------------
station('28 Scallop & Dowel', 'SEATED and APPROXIMATE: the scallop is a stadium, not a curve.', () => {
  const o = origin();
  const a = board('Scallop — Board A', o, { width: 4, features: [slot('Scallop', 'top_face', 2, 1, 0.25, 0, 0), hole('Dowel hole', 'top_face', 0.375, 0.375, 0, 0)] });
  const b = board('Scallop — Board B', o, { width: 4, features: [hole('Dowel hole', 'bottom_face', 0.375, 0.375, 0, 0)] });
  // Face to face, with the dowel standing in the bore of each.
  b.position.z = a.position.z;
  b.position.y = a.position.y + ext(a).y + ext(b).y;
  const dowel = board('Scallop — Dowel', o, { length: 0.75, width: 0.375, thickness: 0.375, stockId: DOWEL38.id, color: DOWEL38.color, rotation: { x: 0, y: 0, z: 90 } });
  dowel.position.x = a.position.x;
  dowel.position.z = a.position.z;
  dowel.position.y = a.position.y + ext(a).y;
  return [a, b, dowel];
});

// 29 Cross dowel — the barrel sits in its pocket ------------------------
station('29 Cross Dowel Joint', 'SEATED and APPROXIMATE: the barrel nut cross bore is not modelled.', () => {
  const o = origin();
  const rail = board('Cross Dowel — Rail', o, { features: [hole('Bolt clearance', 'left_end', 0.25, null, 0, 0)] });
  // Bored to the barrel, not to a nominal size: a barrel nut is a push fit.
  const post = board('Cross Dowel — Post', o, { width: 3, features: [hole('Barrel pocket', 'top_face', 0.375, 0.749, -2.5, 0)] });
  post.position.x = rail.position.x - ext(rail).x - ext(post).x;
  const barrel = board('Cross Dowel — Barrel', o, { length: 0.749, width: 0.375, thickness: 0.375, stockId: DOWEL38.id, color: '#8a8a8a', grainSensitive: false, rotation: { x: 0, y: 0, z: 90 } });
  barrel.position.x = post.position.x - 2.5;
  barrel.position.z = post.position.z;
  barrel.position.y = post.position.y + ext(post).y - 0.749 / 2;
  return [rail, post, barrel];
});

// 30 Keyed mitre — the key is sawn in after assembly, so show it apart --
station('30 Keyed Joint', 'EXPLODED: a mitred corner reinforced with a key; the kerf is sawn after assembly.', () => {
  const o = origin();
  const a = board('Keyed — Board A', o, { features: [endCut('Mitre', 'right_end', 45, true), rect('Key kerf', 'stopped_groove', face('top_face'), { size: { length: 0.75, width: 0.125 }, depthMode: 'blind', depth: 0.6 }, { x: 7.5, z: 1 })] });
  const b = board('Keyed — Board B', o, { rotation: { x: 0, y: 90, z: 0 }, features: [endCut('Mitre', 'right_end', 45)] });
  mitreCorner(a, b);
  const key = board('Keyed — Key', o, { length: 0.75, width: 1.5, thickness: 0.125 });
  key.position.x = a.position.x - ext(a).x + 7.5 + 0.375;
  key.position.z = a.position.z;
  key.position.y = a.position.y + ext(a).y + EXPLODE + ext(key).y;
  return [a, b, key];
});

// 32 End lap — the corner case of a half lap ---------------------------
station('32 End Lap Joint', 'SEATED: both ends lapped, closing flush at a corner.', () => {
  const o = origin();
  const lap = (x) => rect('End lap', 'half_lap', face('top_face'), { size: { length: 3, width: 3 }, depthMode: 'blind', depth: 0.375 }, { x, z: 0 });
  const rail = board('End Lap — Rail', o, { features: [lap(9)] });
  const stile = board('End Lap — Stile', o, { features: [lap(0)] });
  // The lapped ends cover each other; each gave up half its thickness.
  stile.position.x = rail.position.x + ext(rail).x + ext(stile).x - 3;
  stile.position.y = rail.position.y + 0.375;
  return [rail, stile];
});

// 31 Fox wedge — the wedges go in blind, so show them beside ------------
station('31 Fox Wedge Mortise & Tenon', 'EXPLODED and APPROXIMATE: the flared mortise cannot be modelled.', () => {
  const o = origin();
  const leg = board('Fox Wedge — Leg', o, { length: 14, width: 1.75, thickness: 1.75, stockId: OAK8.id, color: OAK8.color, rotation: { x: 0, y: 0, z: 90 }, features: [rect('Flared mortise', 'mortise', face('top_face'), { size: { length: 2, width: 0.25 }, depthMode: 'blind', depth: 1 }, { x: 10, z: 0.75 })] });
  const rail = board('Fox Wedge — Rail', o, { features: [rect('Tenon', 'tenon', face('left_end'), { size: { length: 0.9375, width: 2 }, depthMode: 'blind', depth: 0.25 }, { x: 0, z: 0.5 })] });
  clearOf(leg, rail, 'x', -1);
  rail.position.y = leg.position.y + ext(leg).y - 4;
  rail.position.z = leg.position.z;
  const wedges = [1, 2].map((n) => {
    const w = board(`Fox Wedge — Wedge ${n}`, o, { length: 0.9, width: 0.5, thickness: 0.09 });
    w.position.x = rail.position.x + 3;
    w.position.z = rail.position.z + (n === 1 ? -1 : 1);
    return w;
  });
  return [leg, rail, ...wedges];
});

// -------------------------------------------------------------- output
const now = new Date().toISOString();
const file = {
  version: 3,
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
      'understands. EXPLODED stations are set a little apart, because pushing',
      'those together would be a real interpenetration rather than a joint.',
      '',
      'APPROXIMATE stations carry the nearest shape Carvd can express; the note',
      'on each part says what is standing in for what.',
      '',
      'NOT MODELLED stations are plain boards only. Every rectangular cut in',
      'Carvd is an axis-aligned prism, so no dovetail of any kind can be',
      'expressed -- through, half-blind, sliding or mitred blind.',
      '',
      'Carvd will not cut a mortise into an end, only into a face, so the loose',
      'tenon and Domino stations are shown edge to edge rather than rail into',
      'stile. Both are real uses of those joints; the rail-into-stile version is',
      'simply not expressible.',
      '',
      'Worth trying: Fit Tenon to Mortise on 07, Fit Dado to Mating Part on 05,',
      'Transfer Holes to Mating Part on 03, Bore Through Assembly on 26.'
    ].join('\n'),
    stockConstraints: { constrainDimensions: true, constrainGrain: true, constrainColor: true, preventOverlap: true }
  },
  parts,
  stocks,
  groups,
  groupMembers,
  assemblies: [],
  customShoppingItems: [],
  cutList: null,
  thumbnail: null,
  cameraState: null
};

const out = process.argv[2];
writeFileSync(out, JSON.stringify(file, null, 2));
console.log(`${groups.length} stations · ${parts.length} parts · ${stocks.length} stocks -> ${out}`);
