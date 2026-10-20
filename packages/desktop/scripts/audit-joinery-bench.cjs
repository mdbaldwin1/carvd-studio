#!/usr/bin/env node
/**
 * Check the joinery bench says what it does.
 *
 * Every station opens its note with SEATED, EXPLODED or NOT MODELLED. Those
 * words are the point of the bench: SEATED means the joint is assembled and
 * can be picked up, dragged and re-seated; the other two mean it is held
 * apart on purpose, because the app either cannot close it or cannot express
 * the cut at all. A station that claims one and does the other is worse than
 * useless -- it reads as a bug in the app when it is a bug in the fixture,
 * which is how six of them went unnoticed.
 *
 * What this does not check is whether the app will open the file at all.
 * That needs the app's own validator, which is TypeScript and lives in the
 * renderer, so the guard for it is a test instead:
 * src/renderer/src/utils/joineryBench.test.ts.
 *
 * Run with the bench path:  node scripts/audit-joinery-bench.cjs bench.carvd
 */
const { readFileSync } = require('fs');

const file = JSON.parse(readFileSync(process.argv[2], 'utf-8'));
const groupOf = new Map(file.groupMembers.map((m) => [m.memberId, m.groupId]));
const members = new Map();
for (const part of file.parts) {
  const g = groupOf.get(part.id);
  if (!g) continue;
  members.set(g, [...(members.get(g) ?? []), part]);
}

/** Half extents in world axes, for the quarter turns the bench uses. */
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

/** Closest approach between two parts' boxes; zero means they touch. */
function gap(a, b) {
  const ea = ext(a),
    eb = ext(b);
  let total = 0;
  for (const axis of ['x', 'y', 'z']) {
    const d = Math.abs(a.position[axis] - b.position[axis]) - ea[axis] - eb[axis];
    if (d > 0) total += d * d;
  }
  return Math.sqrt(total);
}

let bad = 0;
for (const group of file.groups) {
  const parts = members.get(group.id) ?? [];
  const noted = parts.find((p) => p.notes);
  const note = noted ? noted.notes : '';
  const claim = note.startsWith('SEATED')
    ? 'SEATED'
    : note.startsWith('EXPLODED')
      ? 'EXPLODED'
      : note.startsWith('NOT MODELLED')
        ? 'NOT MODELLED'
        : 'UNMARKED';
  let worst = 0;
  for (const p of parts) {
    const others = parts.filter((o) => o.id !== p.id);
    if (others.length === 0) continue;
    worst = Math.max(worst, Math.min(...others.map((o) => gap(p, o))));
  }
  const touching = worst < 1e-6;
  // NOT MODELLED makes no claim about placement: the joint is not
  // represented, whether or not the parts happen to touch. Station 15 is the
  // case in point -- its mitre closes and everything behind the mitre, which
  // is the joint proper, is missing.
  const wrong = claim === 'UNMARKED' || (claim !== 'NOT MODELLED' && (claim === 'SEATED') !== touching);
  if (wrong) bad += 1;
  const state = touching ? 'touching' : `apart by ${worst.toFixed(3)}"`;
  console.log(`${wrong ? 'XX' : '  '} ${group.name.padEnd(34)} says ${claim.padEnd(9)} is ${state}`);
}

console.log(
  bad === 0 ? `\nAll ${file.groups.length} stations say what they do.` : `\n${bad} station(s) disagree with their note.`
);
process.exit(bad === 0 ? 0 : 1);
