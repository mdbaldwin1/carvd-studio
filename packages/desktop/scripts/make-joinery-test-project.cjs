/**
 * Build a test project carrying one station per joint the app can express.
 *
 * Stations are laid out on a grid, each one its own group, each roughly
 * assembled so the fitting and transfer actions have something to work on.
 * Joints the app cannot model are still given a station, with the reason in
 * the part notes, so the file says what is missing rather than quietly
 * shipping a rectangle labelled "dovetail".
 */
const { randomUUID } = require('crypto');
const { writeFileSync } = require('fs');

const id = () => randomUUID();

// ---------------------------------------------------------------- stock
const OAK = { id: id(), name: '4/4 White Oak', length: 96, width: 8, thickness: 0.75, grainDirection: 'length', pricingUnit: 'board_foot', pricePerUnit: 9, color: '#c9a978', form: 'board' };
const OAK8 = { id: id(), name: '8/4 White Oak', length: 96, width: 6, thickness: 1.75, grainDirection: 'length', pricingUnit: 'board_foot', pricePerUnit: 14, color: '#b08f5f', form: 'board' };
const PLY = { id: id(), name: '3/4" Baltic Birch Plywood', length: 96, width: 48, thickness: 0.71875, grainDirection: 'none', pricingUnit: 'per_item', pricePerUnit: 72, color: '#d8c39a', form: 'sheet' };
const DOWEL38 = { id: id(), name: '3/8" Birch Dowel', length: 36, width: 0.375, thickness: 0.375, grainDirection: 'length', pricingUnit: 'per_item', pricePerUnit: 3.5, color: '#c89b5b', form: 'rod' };
const DOWEL14 = { id: id(), name: '1/4" Birch Dowel', length: 36, width: 0.25, thickness: 0.25, grainDirection: 'length', pricingUnit: 'per_item', pricePerUnit: 2.75, color: '#c89b5b', form: 'rod' };
const MM = 1 / 25.4;
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

const endCut = (label, f, cutType, horizontalAngle, verticalAngle) => ({
  id: id(), kind: 'end_cut', version: 1, enabled: true, label,
  target: face(f), reference: { primaryFrom: f === 'left_end' ? 'min' : 'max' },
  cutType, lengthMode: 'long_point',
  parameters: verticalAngle === undefined
    ? { horizontalAngle }
    : { horizontalAngle, verticalAngle, verticalFlip: false }
});

const slot = (label, f, length, width, depth, primary, secondary) => ({
  id: id(), kind: 'rounded_cut', version: 1, enabled: true, label, cutType: 'rounded_slot',
  target: face(f), reference: { primaryFrom: 'center', secondaryFrom: 'center' },
  parameters: { length, width, cornerRadius: width / 2, depthMode: 'blind', depth },
  placement: { primary, secondary, rotation: 0 }
});

// ---------------------------------------------------------------- parts
const parts = [];
const groups = [];
const groupMembers = [];

function station(name, note, build) {
  const group = { id: id(), name };
  groups.push(group);
  const made = build();
  for (const part of made) {
    if (note && !part.notes) part.notes = note;
    parts.push(part);
    groupMembers.push({ id: id(), groupId: group.id, memberType: 'part', memberId: part.id });
  }
}

let column = 0;
let row = 0;
const COLS = 6;
const DX = 26;
const DZ = 22;
function origin() {
  const o = { x: column * DX, z: row * DZ };
  column += 1;
  if (column >= COLS) { column = 0; row += 1; }
  return o;
}

const board = (name, o, dx, dy, dz, opts = {}) => ({
  id: id(), name,
  length: opts.length ?? 12, width: opts.width ?? 3, thickness: opts.thickness ?? 0.75,
  position: { x: o.x + dx, y: dy, z: o.z + dz },
  rotation: opts.rotation ?? { x: 0, y: 0, z: 0 },
  stockId: opts.stockId ?? OAK.id,
  grainSensitive: opts.grainSensitive ?? true,
  grainDirection: 'length',
  color: opts.color ?? OAK.color,
  features: opts.features ?? [],
  ...(opts.notes ? { notes: opts.notes } : {})
});

// 1. Butt -------------------------------------------------------------
station('01 Butt Joint', 'Two pieces meeting with no joinery at all.', () => {
  const o = origin();
  return [board('Butt — Rail', o, 0, 0.375, 0), board('Butt — Stile', o, 6.375, 0.375, 6, { length: 12, rotation: { x: 0, y: 90, z: 0 } })];
});

// 2. Mitred butt ------------------------------------------------------
station('02 Mitred Butt Joint', 'Both ends cut at 45 degrees so the corner closes.', () => {
  const o = origin();
  return [
    board('Mitred Butt — Rail', o, 0, 0.375, 0, { features: [endCut('Mitre', 'right_end', 'mitre', 45)] }),
    board('Mitred Butt — Stile', o, 6, 0.375, 6, { rotation: { x: 0, y: 90, z: 0 }, features: [endCut('Mitre', 'left_end', 'mitre', 45)] })
  ];
});

// 3. Dowel ------------------------------------------------------------
station('03 Dowel Joint', 'Bored both halves; the dowels are cut from rod stock.', () => {
  const o = origin();
  const holes = (f) => [hole('Dowel hole 1', f, 0.375, 0.5, -1, 0), hole('Dowel hole 2', f, 0.375, 0.5, 1, 0)];
  return [
    board('Dowel — Rail', o, 0, 0.375, 0, { features: holes('right_end') }),
    board('Dowel — Stile', o, 6.375, 0.375, 6, { rotation: { x: 0, y: 90, z: 0 }, features: holes('left_end') }),
    board('Dowel — Pin 1', o, 6, 0.375, -1, { length: 1, width: 0.375, thickness: 0.375, stockId: DOWEL38.id, color: DOWEL38.color, rotation: { x: 0, y: 90, z: 0 } }),
    board('Dowel — Pin 2', o, 6, 0.375, 1, { length: 1, width: 0.375, thickness: 0.375, stockId: DOWEL38.id, color: DOWEL38.color, rotation: { x: 0, y: 90, z: 0 } })
  ];
});

// 4. Biscuit ----------------------------------------------------------
station('04 Biscuit Joint', 'APPROXIMATE: a rounded slot stands in for the arc a biscuit joiner cuts.', () => {
  const o = origin();
  return [
    board('Biscuit — Board A', o, 0, 0.375, 0, { width: 6, features: [slot('Biscuit slot', 'top_face', 56 * MM, 4 * MM, 0.4, 0, 2.9)] }),
    board('Biscuit — Board B', o, 0, 0.375, 6, { width: 6, features: [slot('Biscuit slot', 'top_face', 56 * MM, 4 * MM, 0.4, 0, -2.9)] }),
    board('Biscuit — #20', o, 0, 0.9, 3, { length: 56 * MM, width: 23 * MM, thickness: 4 * MM, stockId: BISCUIT.id, color: BISCUIT.color, grainSensitive: false })
  ];
});

// 5. Dado -------------------------------------------------------------
station('05 Dado Joint', 'Plywood shelf in a dado — try Fit Dado to Mating Part.', () => {
  const o = origin();
  return [
    board('Dado — Side', o, 0, 0.375, 0, { length: 18, width: 8, features: [rect('Shelf dado', 'dado', face('top_face'), { size: { length: 0.75, width: 8 }, depthMode: 'blind', depth: 0.25 }, { x: 8, z: 0 })] }),
    board('Dado — Shelf', o, -0.64, 4.2, 0, { length: 8, width: 8, thickness: 0.71875, stockId: PLY.id, color: PLY.color, grainSensitive: false, rotation: { x: 0, y: 0, z: 90 } })
  ];
});

// 6. Rabbet -----------------------------------------------------------
station('06 Rabbet Joint', 'A back panel let into a rabbet along the edge.', () => {
  const o = origin();
  return [
    board('Rabbet — Side', o, 0, 0.375, 0, { length: 14, width: 6, features: [rect('Back rabbet', 'rabbet', edge('top_back_edge'), { size: { length: 14, width: 0.5 }, depthMode: 'blind', depth: 0.375 }, { x: 0, z: 0 })] }),
    board('Rabbet — Back', o, 0, 0.56, 3.25, { length: 14, width: 4, thickness: 0.375 })
  ];
});

// 7. Mortise & tenon --------------------------------------------------
station('07 Mortise & Tenon', 'Try Fit Tenon to Mortise on these two.', () => {
  const o = origin();
  return [
    board('M&T — Leg', o, 0, 0.875, 0, { length: 16, width: 1.75, thickness: 1.75, stockId: OAK8.id, color: OAK8.color, rotation: { x: 0, y: 0, z: 90 }, features: [rect('Rail mortise', 'mortise', face('top_face'), { size: { length: 2, width: 0.25 }, depthMode: 'blind', depth: 1.0625 }, { x: 12, z: 0.75 })] }),
    board('M&T — Rail', o, 5, 6, 0, { length: 12, width: 3, features: [rect('Tenon', 'tenon', face('left_end'), { size: { length: 1.5, width: 1 }, depthMode: 'blind', depth: 0.375 }, { x: 0, z: 1 })] })
  ];
});

// 8. Box joint --------------------------------------------------------
station('08 Box Joint', 'Alternating fingers, cut one at a time — the app has no repeat for rectangular cuts.', () => {
  const o = origin();
  const fingers = (offsets) => offsets.map((z, i) => rect(`Finger ${i + 1}`, 'cutout', face('top_face'), { size: { length: 0.75, width: 0.75 }, depthMode: 'through' }, { x: 0, z }));
  return [
    board('Box — Side A', o, 0, 0.375, 0, { width: 3, features: fingers([0, 1.5]) }),
    board('Box — Side B', o, 0, 0.375, 6, { width: 3, features: fingers([0.75, 2.25]) })
  ];
});

// 9-12. Dovetails: not expressible -----------------------------------
for (const [n, label, why] of [
  ['09', 'Through Dovetail', 'NOT MODELLED: tails and pins need angled cuts; every rectangular cut in Carvd is an axis-aligned prism.'],
  ['10', 'Half-Blind Dovetail', 'NOT MODELLED: needs angled cuts, and a socket that stops short of the face.'],
  ['11', 'Sliding Dovetail', 'NOT MODELLED: the socket could be routed with a dovetail bit, but the male half needs an angled tenon.'],
  ['15', 'Mitred Blind Dovetail', 'NOT MODELLED: needs angled cuts behind a mitre.']
]) {
  station(`${n} ${label}`, why, () => {
    const o = origin();
    return [board(`${label} — Board A`, o, 0, 0.375, 0), board(`${label} — Board B`, o, 6.375, 0.375, 6, { rotation: { x: 0, y: 90, z: 0 } })];
  });
}

// 12. Half lap --------------------------------------------------------
station('12 Half Lap (End Lap)', 'Each half is half the stock, derived from the board.', () => {
  const o = origin();
  const lap = (x) => rect('Half lap', 'half_lap', face('top_face'), { size: { length: 3, width: 3 }, depthMode: 'blind', depth: 0.375 }, { x, z: 0 });
  return [
    board('End Lap — Rail', o, 0, 0.375, 0, { features: [lap(9)] }),
    board('End Lap — Stile', o, 9, 1.125, 0, { rotation: { x: 0, y: 90, z: 0 }, features: [lap(0)] })
  ];
});

// 13. Bridle ----------------------------------------------------------
station('13 Bridle Joint', 'An open mortise: a groove run out through the end.', () => {
  const o = origin();
  return [
    board('Bridle — Post', o, 0, 0.375, 0, { features: [rect('Open mortise', 'stopped_groove', face('top_face'), { size: { length: 1.5, width: 0.25 }, depthMode: 'blind', depth: 0.749 }, { x: 0, z: 1.375 })] }),
    board('Bridle — Rail', o, 8, 0.375, 0, { features: [rect('Tenon', 'tenon', face('left_end'), { size: { length: 1.5, width: 3 }, depthMode: 'blind', depth: 0.25 }, { x: 0, z: 0 })] })
  ];
});

// 14. Tongue & groove -------------------------------------------------
station('14 Tongue & Groove', 'A groove one side, two rabbets leaving a tongue the other.', () => {
  const o = origin();
  return [
    board('T&G — Grooved Board', o, 0, 0.375, 0, { width: 5, features: [rect('Groove', 'groove', face('top_face'), { size: { length: 12, width: 0.25 }, depthMode: 'blind', depth: 0.375 }, { x: 0, z: 4.75 })] }),
    board('T&G — Tongued Board', o, 0, 0.375, 5.25, { width: 5, features: [
      rect('Tongue shoulder — top', 'rabbet', edge('top_front_edge'), { size: { length: 12, width: 0.25 }, depthMode: 'blind', depth: 0.25 }, { x: 0, z: 0 }),
      rect('Tongue shoulder — bottom', 'rabbet', edge('bottom_front_edge'), { size: { length: 12, width: 0.25 }, depthMode: 'blind', depth: 0.25 }, { x: 0, z: 0 })
    ] })
  ];
});

// 16. Edge joint ------------------------------------------------------
station('16 Edge Joint', 'Two boards glued edge to edge — no joinery, just a straight edge.', () => {
  const o = origin();
  return [board('Edge — Board A', o, 0, 0.375, 0, { width: 5 }), board('Edge — Board B', o, 0, 0.375, 5, { width: 5 })];
});

// 17. Tambour ---------------------------------------------------------
station('17 Tambour Joint', 'APPROXIMATE: slats running in a groove; the canvas backing is not modelled.', () => {
  const o = origin();
  const made = [board('Tambour — Side', o, 0, 0.375, 0, { length: 14, width: 4, features: [rect('Tambour groove', 'groove', face('top_face'), { size: { length: 14, width: 0.25 }, depthMode: 'blind', depth: 0.25 }, { x: 0, z: 1.875 })] })];
  for (let i = 0; i < 4; i += 1) made.push(board(`Tambour — Slat ${i + 1}`, o, 1 + i * 0.85, 1.2, 2, { length: 0.75, width: 6, thickness: 0.25 }));
  return made;
});

// 18. Scarf -----------------------------------------------------------
station('18 Scarf Joint', 'A long shallow overlap — an end cut at 8 to 1, which eats 24 inches of a 3 inch board.', () => {
  const o = origin();
  return [
    board('Scarf — Board A', o, 0, 0.375, 0, { length: 30, features: [endCut('Scarf', 'right_end', 'mitre', 82.9)] }),
    board('Scarf — Board B', o, 6, 0.375, 0, { length: 30, features: [endCut('Scarf', 'left_end', 'mitre', 82.9)] })
  ];
});

// 19. Spline ----------------------------------------------------------
station('19 Spline Joint', 'A groove in each edge and a loose spline between them.', () => {
  const o = origin();
  const groove = (z) => rect('Spline groove', 'groove', face('top_face'), { size: { length: 12, width: 0.25 }, depthMode: 'blind', depth: 0.375 }, { x: 0, z });
  return [
    board('Spline — Board A', o, 0, 0.375, 0, { width: 5, features: [groove(4.75)] }),
    board('Spline — Board B', o, 0, 0.375, 5.25, { width: 5, features: [groove(0) ] }),
    board('Spline — Spline', o, 0, 0.375, 5, { length: 12, width: 0.7, thickness: 0.25 })
  ];
});

// 20. Cross lap -------------------------------------------------------
station('20 Cross Lap Joint', 'Half out of each, in the middle, so the two cross flush.', () => {
  const o = origin();
  const lap = (x) => rect('Cross lap', 'half_lap', face('top_face'), { size: { length: 3, width: 3 }, depthMode: 'blind', depth: 0.375 }, { x, z: 0 });
  return [
    board('Cross Lap — Rail', o, 0, 0.375, 0, { features: [lap(4.5)] }),
    board('Cross Lap — Stile', o, 0, 1.125, 0, { rotation: { x: 0, y: 90, z: 0 }, features: [lap(4.5)] })
  ];
});

// 21. Full lap --------------------------------------------------------
station('21 Full Lap Joint', 'All of one piece let into the other; the crossing piece is untouched.', () => {
  const o = origin();
  return [
    board('Full Lap — Housed Rail', o, 0, 0.375, 0, { features: [rect('Full lap housing', 'dado', face('top_face'), { size: { length: 3, width: 3 }, depthMode: 'blind', depth: 0.749 }, { x: 4.5, z: 0 })] }),
    board('Full Lap — Crossing Rail', o, 0, 1.125, 0, { rotation: { x: 0, y: 90, z: 0 } })
  ];
});

// 22. Groove joint ----------------------------------------------------
station('22 Groove Joint', 'A panel captured in a groove — watch the seasonal movement note.', () => {
  const o = origin();
  return [
    board('Groove — Frame Rail', o, 0, 0.375, 0, { width: 2.5, features: [rect('Panel groove', 'groove', face('top_face'), { size: { length: 12, width: 0.25 }, depthMode: 'blind', depth: 0.375 }, { x: 0, z: 2.25 })] }),
    board('Groove — Panel', o, 0, 0.375, 2.6, { length: 12, width: 7, thickness: 0.25 })
  ];
});

// 23. Loose tenon -----------------------------------------------------
station('23 Loose Tenon Joint', 'Edge to edge, because Carvd will not mortise an end — see the project notes.', () => {
  const o = origin();
  const mortise = (f) => rect('Loose tenon mortise', 'mortise', f, { size: { length: 2, width: 0.25 }, depthMode: 'blind', depth: 0.6 }, { x: 5, z: 0.25 });
  return [
    board('Loose Tenon — Board A', o, 0, 0.375, 0, { width: 4, features: [mortise(face('front_face'))] }),
    board('Loose Tenon — Board B', o, 0, 0.375, 4.1, { width: 4, features: [mortise(face('back_face'))] }),
    board('Loose Tenon — Tenon', o, -1, 0.375, 2, { length: 2, width: 1.1, thickness: 0.25, rotation: { x: 0, y: 90, z: 0 } })
  ];
});

// 24. Domino ----------------------------------------------------------
station('24 Domino Joint', 'The same idea bought in a box, shown edge to edge for the same reason.', () => {
  const o = origin();
  const mortise = (f) => rect('Domino mortise', 'mortise', f, { size: { length: 20 * MM, width: 6 * MM }, depthMode: 'blind', depth: 22 * MM }, { x: 6 - 10 * MM, z: (0.75 - 6 * MM) / 2 });
  return [
    board('Domino — Board A', o, 0, 0.375, 0, { width: 4, features: [mortise(face('front_face'))] }),
    board('Domino — Board B', o, 0, 0.375, 4.1, { width: 4, features: [mortise(face('back_face'))] }),
    board('Domino — 6 × 20 × 40', o, -1, 0.375, 2, { length: 40 * MM, width: 20 * MM, thickness: 6 * MM, stockId: DOMINO.id, color: DOMINO.color, rotation: { x: 0, y: 90, z: 0 } })
  ];
});

// 25. Pin joint -------------------------------------------------------
station('25 Pin Joint', 'A through pin holding a lapped joint — read as a pinned joint, not dovetail pins.', () => {
  const o = origin();
  return [
    board('Pin — Rail', o, 0, 0.375, 0, { features: [hole('Pin hole', 'top_face', 0.25, null, 4.5, 0)] }),
    board('Pin — Stile', o, 0, 1.125, 0, { rotation: { x: 0, y: 90, z: 0 }, features: [hole('Pin hole', 'top_face', 0.25, null, 1.5, 0)] }),
    board('Pin — Peg', o, 4.5, 0.75, 0, { length: 2, width: 0.25, thickness: 0.25, stockId: DOWEL14.id, color: DOWEL14.color, rotation: { x: 0, y: 0, z: 90 } })
  ];
});

// 26. Pegged M&T ------------------------------------------------------
station('26 Pegged Mortise & Tenon', 'A drawbored peg through the cheek — try Bore Through Assembly.', () => {
  const o = origin();
  return [
    board('Pegged — Leg', o, 0, 0.875, 0, { length: 16, width: 1.75, thickness: 1.75, stockId: OAK8.id, color: OAK8.color, rotation: { x: 0, y: 0, z: 90 }, features: [
      rect('Rail mortise', 'mortise', face('top_face'), { size: { length: 2, width: 0.25 }, depthMode: 'blind', depth: 1.0625 }, { x: 12, z: 0.75 }),
      hole('Peg hole', 'front_face', 0.25, null, 0, 0)
    ] }),
    board('Pegged — Rail', o, 5, 6, 0, { features: [rect('Tenon', 'tenon', face('left_end'), { size: { length: 1, width: 2 }, depthMode: 'blind', depth: 0.25 }, { x: 0, z: 0.5 })] }),
    board('Pegged — Peg', o, 0, 6, 0, { length: 2.5, width: 0.25, thickness: 0.25, stockId: DOWEL14.id, color: DOWEL14.color })
  ];
});

// 27. Birdsmouth ------------------------------------------------------
station('27 Birdsmouth Joint', 'APPROXIMATE: a square notch stands in for the seat and heel of a rafter cut.', () => {
  const o = origin();
  return [
    board('Birdsmouth — Rafter', o, 0, 0.375, 0, { length: 14, features: [rect('Birdsmouth', 'corner_notch', corner('front_left_corner'), { size: { length: 1.5, width: 1.5 }, depthMode: 'through' }, { x: 0, z: 0 }, { primaryFrom: 'min', secondaryFrom: 'min' })] }),
    board('Birdsmouth — Wall Plate', o, -1, 0.375, -2, { length: 10, width: 3, rotation: { x: 0, y: 90, z: 0 } })
  ];
});

// 28. Scallop & dowel -------------------------------------------------
station('28 Scallop & Dowel', 'APPROXIMATE: a rounded recess and a dowel; the scallop is a stadium, not a curve.', () => {
  const o = origin();
  return [
    board('Scallop — Board A', o, 0, 0.375, 0, { width: 4, features: [slot('Scallop', 'top_face', 2, 1, 0.25, 0, 0), hole('Dowel hole', 'top_face', 0.375, 0.375, 0, 0)] }),
    board('Scallop — Board B', o, 0, 0.375, 5, { width: 4, features: [hole('Dowel hole', 'bottom_face', 0.375, 0.375, 0, 0)] }),
    board('Scallop — Dowel', o, 0, 1, 2.5, { length: 0.75, width: 0.375, thickness: 0.375, stockId: DOWEL38.id, color: DOWEL38.color, rotation: { x: 0, y: 0, z: 90 } })
  ];
});

// 29. Cross dowel -----------------------------------------------------
station('29 Cross Dowel Joint', 'APPROXIMATE: the bolt hole and the barrel pocket; the barrel nut cross bore is not modelled.', () => {
  const o = origin();
  return [
    board('Cross Dowel — Rail', o, 0, 0.375, 0, { features: [hole('Bolt clearance', 'left_end', 0.25, null, 0, 0)] }),
    board('Cross Dowel — Post', o, 7, 0.375, 0, { width: 3, features: [hole('Barrel pocket', 'top_face', 0.4375, 0.749, -2.5, 0)] }),
    board('Cross Dowel — Barrel', o, 4.5, 0.375, 0, { length: 0.75, width: 0.375, thickness: 0.375, stockId: DOWEL38.id, color: '#8a8a8a', grainSensitive: false, rotation: { x: 0, y: 0, z: 90 } })
  ];
});

// 30. Keyed mitre -----------------------------------------------------
station('30 Keyed Joint', 'A mitred corner reinforced with keys let into saw kerfs.', () => {
  const o = origin();
  return [
    board('Keyed — Board A', o, 0, 0.375, 0, { features: [endCut('Mitre', 'right_end', 'mitre', 45), rect('Key kerf', 'stopped_groove', face('top_face'), { size: { length: 0.75, width: 0.125 }, depthMode: 'blind', depth: 0.6 }, { x: 7.5, z: 1 })] }),
    board('Keyed — Board B', o, 6, 0.375, 6, { rotation: { x: 0, y: 90, z: 0 }, features: [endCut('Mitre', 'left_end', 'mitre', 45)] }),
    board('Keyed — Key', o, 7.5, 1, 1, { length: 0.75, width: 1.5, thickness: 0.125 })
  ];
});

// 31. Fox wedge M&T ---------------------------------------------------
station('31 Fox Wedge Mortise & Tenon', 'APPROXIMATE: a blind mortise and tenon plus wedges; the flared mortise cannot be modelled.', () => {
  const o = origin();
  return [
    board('Fox Wedge — Leg', o, 0, 0.875, 0, { length: 14, width: 1.75, thickness: 1.75, stockId: OAK8.id, color: OAK8.color, rotation: { x: 0, y: 0, z: 90 }, features: [rect('Flared mortise', 'mortise', face('top_face'), { size: { length: 2, width: 0.25 }, depthMode: 'blind', depth: 1 }, { x: 10, z: 0.75 })] }),
    board('Fox Wedge — Rail', o, 5, 5.5, 0, { features: [rect('Tenon', 'tenon', face('left_end'), { size: { length: 0.9375, width: 2 }, depthMode: 'blind', depth: 0.25 }, { x: 0, z: 0.5 })] }),
    board('Fox Wedge — Wedge 1', o, 4, 5.5, -0.5, { length: 0.9, width: 0.5, thickness: 0.09 }),
    board('Fox Wedge — Wedge 2', o, 4, 5.5, 0.5, { length: 0.9, width: 0.5, thickness: 0.09 })
  ];
});

// -------------------------------------------------------------- output
const now = new Date().toISOString();
const file = {
  version: 3,
  project: {
    name: 'Joinery Test Bench',
    createdAt: now,
    modifiedAt: now,
    units: 'imperial',
    gridSize: 1,
    kerfWidth: 0.125,
    overageFactor: 0.1,
    projectNotes: [
      'One station per joint, each its own group, laid out on a grid.',
      '',
      'Stations marked APPROXIMATE carry the nearest shape Carvd can express;',
      'the note on each part says what is standing in for what.',
      '',
      'Stations marked NOT MODELLED are present as plain boards only. Every',
      'rectangular cut in Carvd is an axis-aligned prism, so no dovetail of any',
      'kind can be expressed -- through, half-blind, sliding or mitred blind.',
      '',
      'Carvd will not cut a mortise into an end, only into a face, so the loose',
      'tenon and Domino stations are shown edge to edge instead of rail into',
      'stile. Both are real uses of those joints; the rail-into-stile version',
      'is simply not expressible.',
      '',
      'Things worth trying: Fit Tenon to Mortise on station 07, Fit Dado to',
      'Mating Part on 05, Transfer Holes to Mating Part on 03, and Bore Through',
      'Assembly on 26.'
    ].join('\n'),
    stockConstraints: { constrainDimensions: true, constrainGrain: true, constrainColor: true, preventOverlap: false }
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
