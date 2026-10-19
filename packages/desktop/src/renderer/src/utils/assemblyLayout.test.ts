import { describe, expect, it, vi } from 'vitest';
import { Vector3, Euler, MathUtils, Quaternion } from 'three';
import { createTestPart } from '../../../../tests/helpers/factories';
import { getAssemblyReferences, planAssembly, suggestAssembly, type AssemblyLayoutOptions } from './assemblyLayout';
import { planJointLayout } from './jointLayout';
import { planHousingFit } from './fitHousing';
import { getPartFeatureConflicts } from './partFeatureConflicts';
import { getPartMaterialVolume, partsOverlapInMaterial } from './partFeatureGeometry';

vi.unmock('three');

const options: AssemblyLayoutOptions = {
  movingReference: 'right_end',
  fixedReference: 'left_end',
  quarterTurns: 0,
  insertion: 0,
  along: 'center',
  across: 'center'
};

describe('assembly by woodworking references', () => {
  it.each(['front', 'back'] as const)('seats a %s edge tongue at its shoulders with glue space', (edge) => {
    const host = createTestPart({
      id: 'host',
      length: 12,
      width: 5,
      thickness: 0.75,
      rotation: { x: 12, y: 27, z: 8 },
      features: [
        {
          id: 'groove',
          kind: 'rect_cut',
          version: 1,
          enabled: true,
          cutType: 'groove',
          target: { type: 'face', face: 'back_face' },
          reference: { primaryFrom: 'min' },
          parameters: { size: { length: 12, width: 0.25 }, depthMode: 'blind', depth: 0.375 },
          placement: { x: 0, z: 0.25 }
        }
      ]
    });
    const board = createTestPart({
      id: 'board',
      length: 12,
      width: 5,
      thickness: 0.75,
      features: (['top', 'bottom'] as const).map((side) => ({
        id: side,
        kind: 'rect_cut',
        version: 1,
        enabled: true,
        cutType: 'rabbet',
        target: { type: 'edge', edge: `${side}_${edge}_edge` },
        reference: { primaryFrom: 'min' },
        parameters: { size: { length: 12, width: 0.25 }, depthMode: 'blind', depth: 0.25 },
        placement: { x: 0, z: 0 }
      }))
    });
    for (const pair of [
      [host, board],
      [board, host]
    ] as [typeof host, typeof board][]) {
      const suggestion = suggestAssembly(pair);
      const fixed = pair[suggestion.swapped ? 0 : 1];
      const moving = pair[suggestion.swapped ? 1 : 0];
      expect(fixed.id).toBe('host');
      expect(suggestion.options.movingReference).toBe('tongue:top:bottom');
      expect(suggestion.options.insertion).toBe(0);
      const placed = planAssembly(moving, fixed, suggestion.options)!;
      expect(partsOverlapInMaterial(placed, fixed)).toBe(false);
      expect(partsOverlapInMaterial(placed, { ...fixed, features: [] })).toBe(true);
      expect(
        new Vector3()
          .subVectors(
            new Vector3(placed.position.x, placed.position.y, placed.position.z),
            new Vector3(fixed.position.x, fixed.position.y, fixed.position.z)
          )
          .length()
      ).toBeCloseTo(4.75);
      const fit = planHousingFit(placed, fixed)!;
      expect(fit.width).toBeCloseTo(0.25);
      expect(fit.usesTongue).toBe(true);
      expect(fit.changed).toBe(false);
    }
  });

  it.each(['left_end', 'right_end'] as const)('seats a bridle through the open %s in either selection order', (end) => {
    const host = createTestPart({
      id: 'host',
      length: 12,
      width: 4,
      thickness: 0.75,
      rotation: { x: 12, y: 27, z: 8 },
      features: [
        {
          id: 'slot',
          kind: 'rect_cut',
          version: 1,
          enabled: true,
          cutType: 'mortise',
          target: { type: 'face', face: 'front_face' },
          reference: { primaryFrom: 'min' },
          parameters: { size: { length: 1.5, width: 0.25 }, depthMode: 'through' },
          placement: { x: end === 'left_end' ? 0 : 10.5, z: 0.25 }
        }
      ]
    });
    const rail = createTestPart({
      id: 'rail',
      length: 12,
      width: 4,
      thickness: 0.75,
      features: [
        {
          id: 'tenon',
          kind: 'rect_cut',
          version: 1,
          enabled: true,
          cutType: 'tenon',
          target: { type: 'face', face: 'right_end' },
          reference: { primaryFrom: 'min' },
          parameters: { size: { length: 1.5, width: 3 }, depthMode: 'blind', depth: 0.25 },
          placement: { x: 0, z: 0.5 }
        }
      ]
    });
    for (const pair of [
      [host, rail],
      [rail, host]
    ] as [typeof host, typeof rail][]) {
      const suggestion = suggestAssembly(pair);
      const fixed = pair[suggestion.swapped ? 0 : 1];
      const moving = pair[suggestion.swapped ? 1 : 0];
      expect(fixed.id).toBe('host');
      expect(suggestion.options.fixedReference).toBe(`housing:slot:${end}`);
      const placed = planAssembly(moving, fixed, suggestion.options)!;
      expect(partsOverlapInMaterial(placed, fixed)).toBe(false);
      expect(partsOverlapInMaterial(placed, { ...fixed, features: [] })).toBe(true);
    }
  });

  it.each(['top_face', 'bottom_face'] as const)('registers both half-lap floors on %s', (face) => {
    const make = (id: string, target: 'top_face' | 'bottom_face') =>
      createTestPart({
        id,
        length: 12,
        width: 4,
        thickness: 0.75,
        rotation: { x: 12, y: 27, z: 8 },
        features: [
          {
            id: 'lap',
            kind: 'rect_cut',
            version: 1,
            enabled: true,
            cutType: 'half_lap',
            target: { type: 'face', face: target },
            reference: { primaryFrom: 'min' },
            parameters: { size: { length: 4, width: 4 }, depthMode: 'blind', depth: 0.375 },
            placement: { x: 4, z: 0 }
          }
        ]
      });
    const a = make('a', face);
    const b = make('b', face === 'top_face' ? 'bottom_face' : 'top_face');
    for (const pair of [
      [a, b],
      [b, a]
    ] as [typeof a, typeof b][]) {
      const suggestion = suggestAssembly(pair);
      expect(suggestion.options.movingReference).toBe('lap:lap');
      expect(suggestion.options.fixedReference).toBe('lap:lap');
      const placed = planAssembly(pair[0], pair[1], suggestion.options)!;
      expect(placed.position.x).toBeCloseTo(pair[1].position.x);
      expect(placed.position.y).toBeCloseTo(pair[1].position.y);
      expect(placed.position.z).toBeCloseTo(pair[1].position.z);
      expect(partsOverlapInMaterial(placed, pair[1])).toBe(false);
      expect(partsOverlapInMaterial({ ...placed, features: [] }, pair[1])).toBe(true);
    }
  });

  it.each([
    'top_front_edge',
    'top_back_edge',
    'top_left_edge',
    'top_right_edge',
    'bottom_front_edge',
    'bottom_back_edge',
    'bottom_left_edge',
    'bottom_right_edge'
  ] as const)('seats a panel in the %s rabbet in either selection order', (edge) => {
    const panel = createTestPart({ id: 'panel', length: 8, width: 8, thickness: 0.75 });
    const lengthwise = edge.includes('front') || edge.includes('back');
    const host = createTestPart({
      id: 'host',
      length: 18,
      width: 8,
      thickness: 0.75,
      rotation: { x: 12, y: 27, z: 8 },
      features: [
        {
          id: 'rabbet',
          kind: 'rect_cut',
          version: 1,
          enabled: true,
          cutType: 'rabbet',
          target: { type: 'edge', edge },
          reference: { primaryFrom: 'min' },
          parameters: {
            size: { length: lengthwise ? 18 : 0.75, width: lengthwise ? 0.75 : 8 },
            depthMode: 'blind',
            depth: 0.25
          },
          placement: { x: 0, z: 0 }
        }
      ]
    });
    for (const pair of [
      [host, panel],
      [panel, host]
    ] as [typeof host, typeof panel][]) {
      const suggestion = suggestAssembly(pair);
      const fixed = pair[suggestion.swapped ? 0 : 1];
      const moving = pair[suggestion.swapped ? 1 : 0];
      expect(fixed.id).toBe('host');
      expect(suggestion.options.fixedReference).toBe('housing:rabbet');
      const placed = planAssembly(moving, fixed, suggestion.options)!;
      expect(placed).not.toBeNull();
      expect(partsOverlapInMaterial(placed, fixed)).toBe(false);
      expect(partsOverlapInMaterial(placed, { ...fixed, features: [] })).toBe(true);
    }
  });

  it.each(['top_face', 'bottom_face'] as const)(
    'seats a relieved shelf in a stopped housing on %s in either selection order',
    (face) => {
      const shelf = createTestPart({
        id: 'shelf',
        length: 8,
        width: 8,
        thickness: 0.75,
        features: [
          {
            id: 'relief',
            kind: 'rect_cut',
            version: 1,
            enabled: true,
            target: { type: 'corner', corner: 'front_left_corner' },
            reference: { primaryFrom: 'min' },
            cutType: 'corner_notch',
            parameters: { size: { length: 0.25, width: 1.375 }, depthMode: 'through' },
            placement: { x: 0, z: 0 }
          }
        ]
      });
      const side = createTestPart({
        id: 'side',
        length: 18,
        width: 8,
        thickness: 0.75,
        rotation: { x: 12, y: 27, z: 8 },
        features: [
          {
            id: 'housing',
            kind: 'rect_cut',
            version: 1,
            enabled: true,
            target: { type: 'face', face },
            reference: { primaryFrom: 'min' },
            cutType: 'stopped_dado',
            parameters: {
              size: { length: 0.75, width: 7 },
              stoppedSpan: true,
              depthMode: 'blind',
              depth: 0.25,
              cornerRadius: 0.375
            },
            placement: { x: 8, z: 0 }
          }
        ]
      });
      for (const pair of [
        [shelf, side],
        [side, shelf]
      ] as [typeof shelf, typeof side][]) {
        const suggestion = suggestAssembly(pair);
        const fixed = pair[suggestion.swapped ? 0 : 1];
        const moving = pair[suggestion.swapped ? 1 : 0];
        expect(fixed.id).toBe('side');
        expect(suggestion.options.fixedReference).toBe('housing:housing');
        const placed = planAssembly(moving, fixed, suggestion.options)!;
        expect(partsOverlapInMaterial(placed, fixed)).toBe(false);
        expect(partsOverlapInMaterial({ ...placed, features: [] }, fixed)).toBe(true);
        const local = new Vector3(
          placed.position.x - fixed.position.x,
          placed.position.y - fixed.position.y,
          placed.position.z - fixed.position.z
        ).applyQuaternion(
          new Quaternion()
            .setFromEuler(new Euler(...([12, 27, 8].map(MathUtils.degToRad) as [number, number, number])))
            .invert()
        );
        expect(local.z).toBeCloseTo(0, 12);
        expect(local.x).toBeCloseTo(-0.625, 12);
      }
      const flat = { ...side, rotation: { x: 0, y: 0, z: 0 } };
      const placed = planAssembly(shelf, flat, suggestAssembly([shelf, flat]).options)!;
      expect(placed.position.z).toBeCloseTo(flat.position.z, 12);
    }
  );
  it.each([
    [0.125, 10],
    [0.2, 14],
    [0.375, 7],
    [0.375, 20]
  ])('retains the sliding shoulder at %s-inch depth and %s-degree slope', (housingDepth, slope) => {
    const shelf = createTestPart({ id: 'shelf', length: 8, width: 6, thickness: 0.75 });
    const side = createTestPart({ id: 'side', length: 18, width: 8, thickness: 0.75 });
    const plan = planJointLayout(shelf, side, {
      kind: 'sliding_dovetail',
      count: 2,
      slope,
      housingDepth,
      blindDepth: 0.5
    });
    expect(plan.error).toBeNull();
    const removed = housingDepth ** 2 * Math.tan(MathUtils.degToRad(slope)) * shelf.width;
    expect(getPartMaterialVolume({ ...shelf, features: plan.first })).toBeCloseTo(
      shelf.length * shelf.width * shelf.thickness - removed,
      5
    );
  });
  it.each([0.5, 0.75, 1])(
    'transfers a sliding dovetail from %s-inch shelf stock without coordinate arithmetic',
    (thickness) => {
      const shelf = createTestPart({ id: 'shelf', length: 8, width: 6, thickness });
      const side = createTestPart({
        id: 'side',
        length: 18,
        width: 8,
        thickness: 1.25,
        rotation: { x: 12, y: 27, z: 8 }
      });
      const result = planJointLayout(shelf, side, { kind: 'sliding_dovetail', count: 2, slope: 10, blindDepth: 0.5 });
      expect(result.error).toBeNull();
      const pair: [typeof shelf, typeof side] = [
        { ...shelf, features: result.first },
        { ...side, features: result.second }
      ];
      // The two triangular cheeks end at the shoulder. A V groove from each
      // broad face removes twice this volume by cutting behind that shoulder.
      const depth = thickness / 2;
      const removed = depth * depth * Math.tan(MathUtils.degToRad(10)) * shelf.width;
      expect(getPartMaterialVolume(pair[0])).toBeCloseTo(shelf.length * shelf.width * shelf.thickness - removed, 5);
      for (const part of pair)
        expect(
          getPartFeatureConflicts(part.features ?? [], part).filter((issue) => issue.severity === 'error')
        ).toEqual([]);
      for (const ordered of [pair, [pair[1], pair[0]] as typeof pair]) {
        const suggestion = suggestAssembly(ordered);
        const fixed = ordered[suggestion.swapped ? 0 : 1];
        const moving = ordered[suggestion.swapped ? 1 : 0];
        expect(fixed.id).toBe('side');
        const placed = planAssembly(moving, fixed, suggestion.options)!;
        expect(partsOverlapInMaterial(placed, fixed)).toBe(false);
        expect(partsOverlapInMaterial(placed, side)).toBe(true);
      }
    }
  );
  it('seats the lips and hidden tails of a mitred blind dovetail', () => {
    const a = createTestPart({ id: 'tails', length: 12, width: 3, thickness: 0.75 });
    const b = createTestPart({ id: 'pins', length: 10, width: 3, thickness: 0.75 });
    const layout = planJointLayout(a, b, { kind: 'mitred_blind_dovetail', count: 2, slope: 10, blindDepth: 0.5 });
    expect(layout.error).toBeNull();
    const pair: [typeof a, typeof b] = [
      { ...a, features: layout.first },
      { ...b, features: layout.second }
    ];
    for (const part of pair)
      expect(getPartFeatureConflicts(part.features ?? [], part).filter((issue) => issue.severity === 'error')).toEqual(
        []
      );
    const suggested = suggestAssembly(pair);
    const placed = planAssembly(pair[0], pair[1], suggested.options)!;
    expect(suggested.swapped).toBe(false);
    expect(placed.position.x).toBeCloseTo(-b.length / 2 + a.thickness / 2);
    expect(placed.position.y).toBeCloseTo(b.position.y - b.thickness / 2 + a.length / 2);
    expect(partsOverlapInMaterial(placed, pair[1])).toBe(false);
    expect(partsOverlapInMaterial(placed, b)).toBe(true);
  });
  it.each(['mortise_tenon', 'twin_tenon', 'haunched_tenon'] as const)(
    'transfers and seats %s shoulders on rotated stock',
    (kind) => {
      const a = createTestPart({ id: 'rail', length: 12, width: 4, thickness: 0.75 });
      const b = createTestPart({ id: 'stile', length: 16, width: 3, thickness: 1, rotation: { x: 12, y: 37, z: 8 } });
      const layout = planJointLayout(a, b, { kind, count: 2, slope: 10, blindDepth: 0.5 });
      expect(layout.error).toBeNull();
      const pair: [typeof a, typeof b] = [
        { ...a, features: layout.first },
        { ...b, features: layout.second }
      ];
      const suggestion = suggestAssembly(pair);
      expect(suggestion.swapped).toBe(false);
      expect(suggestion.options.insertion).toBe(0);
      const placed = planAssembly(pair[0], pair[1], suggestion.options)!;
      expect(partsOverlapInMaterial(placed, pair[1])).toBe(false);
      // Moving the seated rail into the stile proves this is contact, not a distant non-overlap.
      const normal = new Vector3(0, 0, -0.05).applyEuler(
        new Euler(...([12, 37, 8].map(MathUtils.degToRad) as [number, number, number]))
      );
      expect(
        partsOverlapInMaterial(
          {
            ...placed,
            position: {
              x: placed.position.x + normal.x,
              y: placed.position.y + normal.y,
              z: placed.position.z + normal.z
            }
          },
          pair[1]
        )
      ).toBe(true);
    }
  );
  it.each(['box', 'through_dovetail', 'half_blind_dovetail'] as const)(
    'seats a complete %s layout with no material interference',
    (kind) => {
      const a = createTestPart({ id: 'a', length: 12, width: 3, thickness: 0.75 });
      const b = createTestPart({ id: 'b', length: 10, width: 3, thickness: 0.625 });
      const layout = planJointLayout(a, b, { kind, count: 2, slope: 10, blindDepth: 0.4 });
      expect(layout.error).toBeNull();
      const pair: [typeof a, typeof b] = [
        { ...a, features: layout.first },
        { ...b, features: layout.second }
      ];
      for (const ordered of [pair, [pair[1], pair[0]] as typeof pair]) {
        const suggestion = suggestAssembly(ordered);
        const moving = ordered[suggestion.swapped ? 1 : 0];
        const fixed = ordered[suggestion.swapped ? 0 : 1];
        const placed = planAssembly(moving, fixed, suggestion.options)!;
        expect(placed).not.toBeNull();
        expect(placed.rotation.z).toBeCloseTo(90);
        expect(placed.position.x).toBeCloseTo(fixed.position.x - fixed.length / 2 + moving.thickness / 2);
        expect(placed.position.y).toBeCloseTo(
          fixed.position.y + fixed.thickness / 2 - suggestion.options.insertion + moving.length / 2
        );
        expect(partsOverlapInMaterial(placed, fixed)).toBe(false);
      }
    }
  );
  it('brings plain ends together without changing cuts or board sizes', () => {
    const moving = createTestPart({ length: 12, width: 3, thickness: 0.75 });
    const fixed = createTestPart({ length: 8, width: 3, thickness: 0.75, position: { x: 20, y: 2, z: 4 } });
    const result = planAssembly(moving, fixed, options)!;
    expect(result.position.x).toBeCloseTo(10);
    expect(result.position.y).toBeCloseTo(2);
    expect(result.position.z).toBeCloseTo(4);
    expect(result.rotation.x).toBeCloseTo(0);
    expect(result.length).toBe(moving.length);
    expect(result.features).toBe(moving.features);
  });

  it.each([0, 37, 90])('follows a receiving board rotated %s degrees', (y) => {
    const fixed = createTestPart({ length: 8, rotation: { x: 15, y, z: 10 }, position: { x: 20, y: 10, z: -4 } });
    const moving = createTestPart({ length: 12 });
    const result = planAssembly(moving, fixed, options)!;
    const euler = (part: typeof fixed) =>
      new Euler(
        ...([part.rotation.x, part.rotation.y, part.rotation.z].map(MathUtils.degToRad) as [number, number, number])
      );
    const movingEnd = new Vector3(6, 0, 0)
      .applyEuler(euler(result))
      .add(new Vector3(result.position.x, result.position.y, result.position.z));
    const fixedEnd = new Vector3(-4, 0, 0)
      .applyEuler(euler(fixed))
      .add(new Vector3(fixed.position.x, fixed.position.y, fixed.position.z));
    expect(movingEnd.distanceTo(fixedEnd)).toBeLessThan(1e-8);
  });

  it('seats a shelf to a housing floor and rejects excess insertion', () => {
    const fixed = createTestPart({
      length: 18,
      width: 8,
      thickness: 0.75,
      features: [
        {
          id: 'housing',
          kind: 'rect_cut',
          version: 1,
          enabled: true,
          cutType: 'dado',
          target: { type: 'face', face: 'top_face' },
          reference: { primaryFrom: 'min' },
          parameters: { size: { length: 0.75, width: 8 }, depthMode: 'blind', depth: 0.25 },
          placement: { x: 6, z: 0 }
        }
      ]
    });
    const moving = createTestPart({ length: 8, width: 8, thickness: 0.75 });
    const socket = getAssemblyReferences(fixed).find((reference) => reference.kind === 'socket')!;
    const setting = {
      ...options,
      movingReference: 'left_end',
      fixedReference: socket.id,
      insertion: 0.25,
      quarterTurns: 1
    };
    const result = planAssembly(moving, fixed, setting)!;
    const end = getAssemblyReferences(result)
      .find((reference) => reference.id === 'left_end')!
      .center.clone()
      .applyEuler(
        new Euler(
          MathUtils.degToRad(result.rotation.x),
          MathUtils.degToRad(result.rotation.y),
          MathUtils.degToRad(result.rotation.z)
        )
      )
      .add(new Vector3(result.position.x, result.position.y, result.position.z));
    const target = socket.center
      .clone()
      .add(new Vector3(fixed.position.x, fixed.position.y, fixed.position.z))
      .addScaledVector(socket.normal, -0.25);
    expect(end.distanceTo(target)).toBeLessThan(1e-8);
    expect(planAssembly(moving, fixed, { ...setting, insertion: 0.5 })).toBeNull();
  });

  it('uses the actual mitre plane instead of the uncut blank end', () => {
    const part = createTestPart({
      length: 12,
      width: 4,
      thickness: 0.75,
      features: [
        {
          id: 'mitre',
          kind: 'end_cut',
          version: 1,
          enabled: true,
          target: { type: 'face', face: 'right_end' },
          reference: { primaryFrom: 'max' },
          cutType: 'mitre',
          lengthMode: 'long_point',
          parameters: { horizontalAngle: 45 }
        }
      ]
    });
    const end = getAssemblyReferences(part).find((reference) => reference.id === 'right_end')!;
    expect(end.center.x).toBeCloseTo(4);
    expect(Math.abs(end.normal.x)).toBeCloseTo(Math.SQRT1_2);
    expect(Math.abs(end.normal.z)).toBeCloseTo(Math.SQRT1_2);
    expect(end.normal.dot(end.along)).toBeCloseTo(0);
  });
});

describe('loose spline assembly', () => {
  it.each(['front_face', 'back_face'] as const)(
    'seats a strip halfway into a %s groove in either selection order',
    (face) => {
      const host = createTestPart({
        id: 'spline-host',
        length: 12,
        width: 5,
        thickness: 0.75,
        position: { x: 4, y: 7, z: 9 },
        rotation: { x: 15, y: 37, z: 12 },
        features: [
          {
            id: 'spline-groove',
            kind: 'rect_cut',
            version: 1,
            enabled: true,
            cutType: 'groove',
            target: { type: 'face', face },
            reference: { primaryFrom: 'min' },
            parameters: { size: { length: 12, width: 0.25 }, depthMode: 'blind', depth: 0.375 },
            placement: { x: 0, z: 0.25 }
          }
        ]
      });
      const spline = createTestPart({ id: 'spline', length: 12, width: 0.7, thickness: 0.25 });
      for (const pair of [
        [spline, host],
        [host, spline]
      ] as [typeof host, typeof host][]) {
        const suggestion = suggestAssembly(pair);
        expect(pair[suggestion.swapped ? 1 : 0].id).toBe(spline.id);
        expect(suggestion.options.movingReference).toBe(face === 'front_face' ? 'back_face' : 'front_face');
        expect(suggestion.options.insertion).toBeCloseTo(0.35);
        const placed = planAssembly(spline, host, suggestion.options)!;
        expect(partsOverlapInMaterial(placed, host)).toBe(false);
        expect(partsOverlapInMaterial(placed, { ...host, features: [] })).toBe(true);
        const opening = getAssemblyReferences(host).find((ref) => ref.id === suggestion.options.fixedReference)!;
        const center = opening.center
          .clone()
          .applyEuler(new Euler(...([15, 37, 12].map(MathUtils.degToRad) as [number, number, number])))
          .add(new Vector3(4, 7, 9));
        expect(new Vector3(placed.position.x, placed.position.y, placed.position.z).distanceTo(center)).toBeLessThan(
          1e-8
        );
      }
    }
  );
});

it('keeps a seated spline fixed while bringing the other grooved board onto its exposed half', () => {
  const board = (id: string, face: 'front_face' | 'back_face', z: number) =>
    createTestPart({
      id,
      length: 12,
      width: 5,
      thickness: 0.75,
      position: { x: 0, y: 0.375, z },
      features: [
        {
          id: `${id}-groove`,
          kind: 'rect_cut',
          version: 1,
          enabled: true,
          cutType: 'groove',
          target: { type: 'face', face },
          reference: { primaryFrom: 'min' },
          parameters: { size: { length: 12, width: 0.25 }, depthMode: 'blind', depth: 0.375 },
          placement: { x: 0, z: 0.25 }
        }
      ]
    });
  const first = board('first', 'back_face', 0);
  const second = board('second', 'front_face', -10);
  const spline = createTestPart({
    id: 'spline',
    length: 12,
    width: 0.7,
    thickness: 0.25,
    position: { x: 0, y: 0.375, z: -2.5 }
  });
  for (const pair of [
    [spline, second],
    [second, spline]
  ] as [typeof spline, typeof spline][]) {
    const suggestion = suggestAssembly(pair, [first, second, spline]);
    expect(pair[suggestion.swapped ? 1 : 0].id).toBe('second');
    const placed = planAssembly(second, spline, suggestion.options)!;
    expect(placed.position.z).toBeCloseTo(-5);
    expect(placed.position.y).toBeCloseTo(0.375);
    expect(partsOverlapInMaterial(placed, spline)).toBe(false);
    expect(partsOverlapInMaterial(placed, first)).toBe(false);
  }
});

it.each(['front', 'back', 'left', 'right'] as const)(
  'registers opposite %s shiplap seating faces without interference',
  (side) => {
    const opposite = { front: 'back', back: 'front', left: 'right', right: 'left' } as const;
    const board = (
      id: string,
      edge:
        | 'top_front_edge'
        | 'top_back_edge'
        | 'top_left_edge'
        | 'top_right_edge'
        | 'bottom_front_edge'
        | 'bottom_back_edge'
        | 'bottom_left_edge'
        | 'bottom_right_edge'
    ) =>
      createTestPart({
        id,
        length: 12,
        width: 3,
        thickness: 0.75,
        position: { x: 0, y: 4, z: 0 },
        rotation: { x: 15, y: 30, z: 10 },
        features: [
          {
            id: `${id}-rabbet`,
            kind: 'rect_cut',
            version: 1,
            enabled: true,
            cutType: 'rabbet',
            target: { type: 'edge', edge },
            reference: { primaryFrom: 'min' },
            parameters: { size: { length: 0.5, width: 0.5 }, depthMode: 'blind', depth: 0.375 },
            placement: { x: 0, z: 0 }
          }
        ]
      });
    const a = board('a', `top_${side}_edge`);
    const b = board('b', `bottom_${opposite[side]}_edge`);
    for (const pair of [
      [a, b],
      [b, a]
    ] as [typeof a, typeof a][]) {
      const { swapped, options: settings } = suggestAssembly(pair);
      const moving = pair[swapped ? 1 : 0];
      const fixed = pair[swapped ? 0 : 1];
      expect(settings.movingReference).toContain('rabbet-floor:');
      expect(settings.fixedReference).toContain('rabbet-floor:');
      expect(settings.insertion).toBe(0);
      const placed = planAssembly(moving, fixed, settings)!;
      expect(partsOverlapInMaterial(placed, fixed)).toBe(false);
      expect(partsOverlapInMaterial({ ...placed, features: [] }, { ...fixed, features: [] })).toBe(true);
      const distance = new Vector3(placed.position.x, placed.position.y, placed.position.z).distanceTo(
        new Vector3(fixed.position.x, fixed.position.y, fixed.position.z)
      );
      expect(distance).toBeCloseTo((side === 'front' || side === 'back' ? 3 : 12) - 0.5);
    }
  }
);

describe('compound-cut face registration', () => {
  it.each([
    { x: 0, y: 0, z: 0 },
    { x: 23, y: 37, z: 11 }
  ])('preserves the cut edge direction at arbitrary assembly pose %j', (rotation) => {
    const make = (id: string, flip: boolean) =>
      createTestPart({
        id,
        length: 12,
        width: 3,
        thickness: 0.75,
        features: [
          {
            id: 'cut-' + id,
            kind: 'end_cut',
            version: 1,
            enabled: true,
            target: { type: 'face', face: 'right_end' },
            reference: { primaryFrom: 'max' },
            cutType: 'compound',
            lengthMode: 'long_point',
            parameters: { horizontalAngle: 45, verticalAngle: 15, horizontalFlip: flip, verticalFlip: flip }
          }
        ]
      });
    const fixed = { ...make('fixed', false), rotation, position: { x: 7, y: 3, z: 9 } };
    const moving = make('moving', true);
    const placed = planAssembly(moving, fixed, { ...options, fixedReference: 'right_end' })!;
    const quaternion = (part: typeof placed) =>
      new Quaternion().setFromEuler(
        new Euler(
          MathUtils.degToRad(part.rotation.x),
          MathUtils.degToRad(part.rotation.y),
          MathUtils.degToRad(part.rotation.z),
          'XYZ'
        )
      );
    const movingQ = quaternion(placed),
      fixedQ = quaternion(fixed);
    // Complementary 45/15 right-end cuts can seat with board tops coplanar.
    // Projecting the blank axis into the compound plane introduced a 20.7deg twist.
    expect(new Vector3(0, 1, 0).applyQuaternion(movingQ).dot(new Vector3(0, 1, 0).applyQuaternion(fixedQ))).toBeCloseTo(
      1,
      8
    );
    const a = getAssemblyReferences(moving).find((ref) => ref.id === 'right_end')!;
    const b = getAssemblyReferences(fixed).find((ref) => ref.id === 'right_end')!;
    expect(a.along.y).toBeCloseTo(0, 8);
    expect(a.normal.clone().applyQuaternion(movingQ).dot(b.normal.clone().applyQuaternion(fixedQ))).toBeCloseTo(-1, 8);
    expect(
      a.center
        .clone()
        .applyQuaternion(movingQ)
        .add(new Vector3(placed.position.x, placed.position.y, placed.position.z))
        .distanceTo(
          b.center
            .clone()
            .applyQuaternion(fixedQ)
            .add(new Vector3(fixed.position.x, fixed.position.y, fixed.position.z))
        )
    ).toBeLessThan(1e-8);
    expect(partsOverlapInMaterial(placed, fixed)).toBe(false);
    expect(a.width).toBeGreaterThan(moving.width);
  });
});
