import type { Part, PartFeature, RectCutFeature } from '../types';
import { validateRectCutFeature } from './rectCutUtils';

export type JointLayoutKind =
  | 'box'
  | 'through_dovetail'
  | 'half_blind_dovetail'
  | 'mitred_blind_dovetail'
  | 'sliding_dovetail'
  | 'mortise_tenon'
  | 'twin_tenon'
  | 'haunched_tenon';
export interface JointLayoutOptions {
  kind: JointLayoutKind;
  count: number;
  slope: number;
  blindDepth: number;
  mitreLip?: number;
  tenonLength?: number;
  tenonThickness?: number;
  shoulder?: number;
  gap?: number;
  haunchLength?: number;
  receiverOffset?: number;
  receiverFace?: 'top_face' | 'front_face';
  housingDepth?: number;
  housingCenter?: number;
}
export interface JointLayoutPlan {
  first: PartFeature[];
  second: PartFeature[];
  error: string | null;
}

export interface SavedJointLayout extends JointLayoutOptions {
  key: string;
  firstPartId: string;
  secondPartId: string;
}

export function getSavedJointLayout(part: Part, mateId?: string): SavedJointLayout | undefined {
  for (const feature of part.features ?? []) {
    const value = feature.metadata?.jointLayout as Partial<SavedJointLayout> | undefined;
    if (
      feature.enabled &&
      value &&
      [
        'box',
        'through_dovetail',
        'half_blind_dovetail',
        'mitred_blind_dovetail',
        'sliding_dovetail',
        'mortise_tenon',
        'twin_tenon',
        'haunched_tenon'
      ].includes(value.kind ?? '') &&
      typeof value.key === 'string' &&
      typeof value.firstPartId === 'string' &&
      typeof value.secondPartId === 'string' &&
      Number.isInteger(value.count) &&
      Number.isFinite(value.slope) &&
      Number.isFinite(value.blindDepth) &&
      (!mateId || [value.firstPartId, value.secondPartId].includes(mateId))
    )
      return value as SavedJointLayout;
  }
}

export const isTenonLayout = (kind: JointLayoutKind) =>
  ['mortise_tenon', 'twin_tenon', 'haunched_tenon'].includes(kind);

export function tenonLayoutDimensions(first: Part, second: Part, options: JointLayoutOptions) {
  const shoulder = options.shoulder ?? Math.min(0.5, first.width / 6);
  const length = options.tenonLength ?? Math.min(1, second.width / 2);
  const thickness = options.tenonThickness ?? first.thickness / 3;
  const retainedWidth = first.width - shoulder * (options.kind === 'haunched_tenon' ? 1 : 2);
  return {
    shoulder,
    length,
    thickness,
    retainedWidth,
    gap: options.gap ?? Math.min(0.5, retainedWidth / 5),
    haunchLength: options.haunchLength ?? Math.min(0.375, length / 2),
    receiverOffset: options.receiverOffset ?? (second.length - retainedWidth) / 2,
    receiverFace: options.receiverFace ?? 'front_face'
  };
}

/** A one-time shared layout, measured on the left ends of both boards. */
export function planJointLayout(first: Part, second: Part, options: JointLayoutOptions): JointLayoutPlan {
  const fail = (error: string): JointLayoutPlan => ({ first: [], second: [], error });
  if (options.kind === 'sliding_dovetail') {
    const depth = options.housingDepth ?? Math.min(first.thickness, second.thickness) / 2;
    const cheekDepth = depth * Math.tan((options.slope * Math.PI) / 180);
    const neck = first.thickness - 2 * cheekDepth;
    const offset =
      options.housingCenter !== undefined
        ? options.housingCenter - neck / 2
        : (options.receiverOffset ?? (second.length - neck) / 2);
    if (
      ![depth, options.slope, offset].every(Number.isFinite) ||
      depth <= 0 ||
      depth >= second.thickness ||
      depth * 2 >= first.length ||
      options.slope <= 0 ||
      options.slope > 30 ||
      neck <= 0 ||
      offset < 0 ||
      offset + neck > second.length
    )
      return fail(
        'Leave wood below the housing and a positive tongue neck; keep the housing within the receiving board.'
      );
    const key = `joint-layout:${[first.id, second.id].sort().join(':')}`;
    const metadata = {
      jointLayout: {
        key,
        ...options,
        housingDepth: depth,
        housingCenter: offset + neck / 2,
        receiverOffset: offset,
        firstPartId: first.id,
        secondPartId: second.id
      }
    };
    const keep = (part: Part) =>
      (part.features ?? []).filter(
        (feature) => (feature.metadata?.jointLayout as { key?: string } | undefined)?.key !== key
      );
    const housing: RectCutFeature = {
      id: `${key}:housing`,
      kind: 'rect_cut',
      version: 1,
      enabled: true,
      label: 'Sliding dovetail housing',
      metadata,
      target: { type: 'face', face: 'top_face' },
      reference: { primaryFrom: 'min', secondaryFrom: 'min' },
      cutType: 'dado',
      parameters: { size: { length: neck, width: second.width }, depthMode: 'blind', depth, wallAngle: options.slope },
      placement: { x: offset, z: 0 }
    };
    const issue = validateRectCutFeature(housing, second);
    if (issue) return fail(issue);
    // Machine the end grain with a dovetail cutter. Cutting V grooves from
    // the broad faces also removes wood behind the shoulder and is not a tongue.
    const shankDiameter = 0.25;
    const shoulders: PartFeature[] = (['top_face', 'bottom_face'] as const).map((face) => ({
      id: `${key}:shoulder:${face}`,
      kind: 'routed_path',
      version: 1,
      enabled: true,
      label: 'Sliding dovetail shoulder',
      metadata,
      target: { type: 'face', face: 'left_end' },
      reference: { primaryFrom: 'center', secondaryFrom: 'center' },
      path: {
        points: [
          {
            primary: -first.width / 2 - 0.5,
            secondary: ((face === 'top_face' ? 1 : -1) * (first.thickness + shankDiameter)) / 2
          },
          {
            primary: first.width / 2 + 0.5,
            secondary: ((face === 'top_face' ? 1 : -1) * (first.thickness + shankDiameter)) / 2
          }
        ]
      },
      bit: {
        profile: 'dovetail',
        diameter: shankDiameter + 2 * cheekDepth,
        shankDiameter,
        includedAngle: 2 * options.slope
      },
      parameters: { depthMode: 'blind', depth }
    }));
    return { first: [...keep(first), ...shoulders], second: [...keep(second), housing], error: null };
  }
  if (options.kind === 'mitred_blind_dovetail') {
    const lip = options.mitreLip ?? first.thickness / 3;
    const behind = first.thickness - lip;
    if (
      !Number.isFinite(lip) ||
      lip <= 0 ||
      behind <= 0 ||
      Math.abs(first.thickness - second.thickness) > 1e-8 ||
      Math.abs(first.width - second.width) > 1e-8
    )
      return fail('Use matching board thickness and width for a 45° secret mitre, with a lip thinner than the stock.');
    const base = planJointLayout(first, second, { ...options, kind: 'half_blind_dovetail', blindDepth: behind });
    if (base.error) return base;
    const key = `joint-layout:${[first.id, second.id].sort().join(':')}`;
    const metadata = {
      jointLayout: { key, ...options, mitreLip: lip, firstPartId: first.id, secondPartId: second.id }
    };
    const modify = (features: PartFeature[], tails: boolean): PartFeature[] =>
      features.map((feature) => {
        if (feature.kind !== 'rect_cut' || (feature.metadata?.jointLayout as { key?: string } | undefined)?.key !== key)
          return feature;
        return {
          ...feature,
          metadata,
          target: { type: 'face', face: tails ? 'bottom_face' : 'top_face' },
          parameters: {
            ...feature.parameters,
            size: { ...feature.parameters.size, length: behind },
            depthMode: 'blind',
            depth: behind
          },
          placement: { ...feature.placement, x: lip }
        };
      });
    const addLip = (features: PartFeature[], tails: boolean): PartFeature[] => [
      ...features,
      {
        id: `${key}:${tails ? 'tail' : 'pin'}-lip-housing`,
        kind: 'rect_cut',
        version: 1,
        enabled: true,
        label: tails ? 'Lap housing' : 'Lip housing',
        metadata,
        target: { type: 'face', face: tails ? 'bottom_face' : 'top_face' },
        reference: { primaryFrom: 'min', secondaryFrom: 'min' },
        cutType: 'cutout',
        parameters: { size: { length: lip, width: first.width }, depthMode: 'blind', depth: behind },
        placement: { x: 0, z: 0 }
      },
      {
        id: `${key}:${tails ? 'tail' : 'pin'}-mitred-lip`,
        kind: 'end_cut',
        version: 1,
        enabled: true,
        label: 'Mitred lip',
        metadata,
        target: { type: 'face', face: 'left_end' },
        reference: { primaryFrom: 'min' },
        cutType: 'bevel',
        lengthMode: 'long_point',
        parameters: {
          horizontalAngle: 0,
          verticalAngle: 45,
          verticalFlip: tails,
          band: tails ? { from: behind, to: first.thickness } : { from: 0, to: lip }
        }
      }
    ];
    return {
      first: addLip(modify(base.first, true), true),
      second: addLip(modify(base.second, false), false),
      error: null
    };
  }
  if (isTenonLayout(options.kind)) {
    const dims = tenonLayoutDimensions(first, second, options);
    options = { ...options, ...dims, tenonLength: dims.length, tenonThickness: dims.thickness };
  }
  if (!Number.isInteger(options.count) || options.count < 1 || options.count > 32)
    return fail('Choose between 1 and 32 fingers or tails.');
  if (!Number.isFinite(options.slope) || options.slope < 0 || options.slope > 30)
    return fail('Choose a dovetail slope between 0° and 30°.');
  if (options.kind === 'half_blind_dovetail' && !(options.blindDepth > 0 && options.blindDepth < second.thickness))
    return fail('Socket depth must leave wood behind the second board’s face.');
  const key = `joint-layout:${[first.id, second.id].sort().join(':')}`;
  const width = Math.min(first.width, second.width);
  const firstStart = (first.width - width) / 2;
  const secondStart = (second.width - width) / 2;
  const a: RectCutFeature[] = [];
  const b: RectCutFeature[] = [];
  const cut = (
    role: string,
    index: number,
    length: number,
    width: number,
    z: number,
    shape: Partial<RectCutFeature['parameters']> = {}
  ): RectCutFeature => ({
    id: `${key}:${role}:${index}`,
    kind: 'rect_cut',
    version: 1,
    enabled: true,
    label: `${role} ${index + 1}`,
    metadata: { jointLayout: { key, ...options, firstPartId: first.id, secondPartId: second.id } },
    cutType: options.kind === 'half_blind_dovetail' && role === 'Tail socket' ? 'mortise' : 'cutout',
    target: { type: 'face', face: 'top_face' },
    reference: { primaryFrom: 'min', secondaryFrom: 'min' },
    parameters: { size: { length, width }, depthMode: 'through', ...shape },
    placement: { x: 0, z }
  });
  if (isTenonLayout(options.kind)) {
    const dims = tenonLayoutDimensions(first, second, options);
    const { shoulder, length, thickness, retainedWidth, gap, haunchLength, receiverOffset, receiverFace } = dims;
    const faceDepth = receiverFace === 'top_face' ? second.thickness : second.width;
    const crossWidth = receiverFace === 'top_face' ? second.width : second.thickness;
    if (
      ![shoulder, length, thickness, retainedWidth, gap, haunchLength, receiverOffset].every(Number.isFinite) ||
      shoulder < 0 ||
      length <= 0 ||
      length >= first.length ||
      thickness <= 0 ||
      thickness >= first.thickness ||
      thickness > crossWidth ||
      retainedWidth <= 0 ||
      length >= faceDepth ||
      receiverOffset < 0 ||
      receiverOffset + retainedWidth > second.length
    )
      return fail('The tenon and shoulders must fit the rail, and the mortise must fit inside the receiving board.');
    if (options.kind === 'twin_tenon' && (gap <= 0 || gap >= retainedWidth - 0.25))
      return fail('Leave at least 1/8 inch for each tenon on either side of the gap.');
    if (options.kind === 'haunched_tenon' && (shoulder <= 0 || haunchLength <= 0 || haunchLength >= length))
      return fail('The haunch must be shorter than the tenon and have a positive width.');
    const tongue = cut('Tenon', 0, length, retainedWidth, shoulder, { depthMode: 'blind', depth: thickness });
    tongue.cutType = 'tenon';
    tongue.target = { type: 'face', face: 'left_end' };
    a.push(tongue);
    const socket = (index: number, offset: number, span: number, depth: number) => {
      const feature = cut('Mortise', index, span, thickness, (crossWidth - thickness) / 2, {
        depthMode: 'blind',
        depth
      });
      feature.cutType = 'mortise';
      feature.target = { type: 'face', face: receiverFace };
      feature.placement.x = receiverOffset + offset;
      b.push(feature);
    };
    if (options.kind === 'twin_tenon') {
      const each = (retainedWidth - gap) / 2;
      a.push(cut('Between tenons', 0, length, gap, (first.width - gap) / 2));
      socket(0, 0, each, length);
      socket(1, each + gap, each, length);
    } else if (options.kind === 'haunched_tenon') {
      a.push(cut('Haunch shoulder', 0, length - haunchLength, shoulder, first.width - shoulder));
      socket(0, shoulder, retainedWidth - shoulder, length);
      socket(1, 0, shoulder, haunchLength);
      b[1].label = 'Haunch recess';
    } else socket(0, 0, retainedWidth, length);
  } else if (options.kind === 'box') {
    const finger = width / (2 * options.count);
    if (finger < 0.125) return fail('The chosen count leaves fingers narrower than 1/8 inch. Reduce the count.');
    for (let index = 0; index < options.count; index++) {
      a.push(cut('First board socket', index, second.thickness, finger, firstStart + index * 2 * finger));
      b.push(cut('Mating socket', index, first.thickness, finger, secondStart + (index * 2 + 1) * finger));
    }
  } else {
    const pin = width / (options.count * 3.25 + 1);
    const tail = pin * 2.25;
    const depth = options.kind === 'half_blind_dovetail' ? options.blindDepth : second.thickness;
    const flare = depth * Math.tan((options.slope * Math.PI) / 180);
    if (pin < 0.125 || tail - 2 * flare < 0.125)
      return fail('The tails become too narrow at the baseline. Reduce the count or slope.');
    for (let index = 0; index <= options.count; index++)
      a.push(cut('Pin socket', index, depth, pin, firstStart + index * (pin + tail), { taperAngle: options.slope }));
    for (let index = 0; index < options.count; index++) {
      const blind = options.kind === 'half_blind_dovetail';
      b.push(
        cut(
          'Tail socket',
          index,
          first.thickness,
          tail - (blind ? 2 * flare : 0),
          secondStart + pin + index * (pin + tail) + (blind ? flare : 0),
          {
            depthMode: blind ? 'blind' : 'through',
            depth: blind ? depth : undefined,
            sideWallAngle: blind ? options.slope : -options.slope
          }
        )
      );
    }
  }
  for (const [part, cuts] of [
    [first, a],
    [second, b]
  ] as const) {
    for (const feature of cuts) {
      const issue = validateRectCutFeature(feature, part);
      if (issue) return fail(`${part.name}: ${issue}`);
    }
  }
  const keep = (part: Part) =>
    (part.features ?? []).filter((feature) => {
      const layout = feature.metadata?.jointLayout as { key?: string } | undefined;
      return layout?.key !== key;
    });
  return { first: [...keep(first), ...a], second: [...keep(second), ...b], error: null };
}
