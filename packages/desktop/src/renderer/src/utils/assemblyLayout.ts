import { Euler, Matrix4, Quaternion, Vector3, MathUtils } from 'three';
import type { FaceTarget, Part } from '../types';
import { getRuleJointEdges, complementaryRuleJointEdges, type RuleJointEdge } from './ruleJoint';
import { getFaceFrame } from './roundCutUtils';
import { getPartStockPlanes } from './endCutUtils';
import { getRectCutPlanBounds } from './rectCutUtils';
import { getEdgeTongues, getEndTongues } from './edgeTongues';
import { getPartFeatureSockets } from './snapToPartsUtil';
import { getSavedJointLayout, isTenonLayout } from './jointLayout';

export interface AssemblyReference {
  id: string;
  label: string;
  center: Vector3;
  normal: Vector3;
  along: Vector3;
  across: Vector3;
  width: number;
  height: number;
  depth: number;
  kind: 'face' | 'socket' | 'shoulder' | 'profile';
  ruleJoint?: RuleJointEdge;
}

const faces: Array<[FaceTarget, string]> = [
  ['left_end', 'Left end'],
  ['right_end', 'Right end'],
  ['top_face', 'Top face'],
  ['bottom_face', 'Bottom face'],
  ['front_face', 'Front edge'],
  ['back_face', 'Back edge']
];
const vector = (v: { x: number; y: number; z: number }) => new Vector3(v.x, v.y, v.z);
const rotation = (part: Part) =>
  new Quaternion().setFromEuler(
    new Euler(
      MathUtils.degToRad(part.rotation.x),
      MathUtils.degToRad(part.rotation.y),
      MathUtils.degToRad(part.rotation.z),
      'XYZ'
    )
  );

/** Local reference surfaces. The moving board's existing pose is deliberately irrelevant. */
export function getAssemblyReferences(part: Part): AssemblyReference[] {
  const planes = getPartStockPlanes(part);
  const result: AssemblyReference[] = faces.map(([face, label]) => {
    const frame = getFaceFrame(part, face);
    const center = vector(frame.origin);
    const normal = vector(frame.inwardNormal).negate();
    const blankNormal = normal.clone();
    const primaryEdge = vector(frame.primaryAxis);
    const secondaryEdge = vector(frame.secondaryAxis);
    const planeIndex = ['left_end', 'right_end', 'front_face', 'back_face'].indexOf(face);
    const plane = planes[planeIndex];
    // Full-face mitres and bevels are actual mating planes, not the blank's ends.
    if (plane && !plane.band) {
      normal.copy(vector(plane.normal)).normalize();
      if (planeIndex < 2) center.x = plane.limit / plane.normal.x;
      else center.z = plane.limit / plane.normal.z;
      // Follow the real cut edge (intersection with the original adjacent
      // face), rather than orthogonally projecting the blank axis. Projection
      // adds an unintended roll when both mitre and bevel are nonzero.
      const normalComponent = blankNormal.dot(normal);
      primaryEdge.addScaledVector(blankNormal, -primaryEdge.dot(normal) / normalComponent);
      secondaryEdge.addScaledVector(blankNormal, -secondaryEdge.dot(normal) / normalComponent);
    }
    const along = primaryEdge.clone().normalize();
    const across = new Vector3().crossVectors(normal, along).normalize();
    return {
      id: face,
      label,
      center,
      normal,
      along,
      across,
      width:
        Math.abs(primaryEdge.dot(along)) * frame.primarySize + Math.abs(secondaryEdge.dot(along)) * frame.secondarySize,
      height:
        Math.abs(primaryEdge.dot(across)) * frame.primarySize +
        Math.abs(secondaryEdge.dot(across)) * frame.secondarySize,
      depth: 0,
      kind: 'face'
    };
  });
  for (const tongue of [...getEdgeTongues(part), ...getEndTongues(part)]) {
    const face = result.find((reference) => reference.id === tongue.face)!;
    result.push({
      ...face,
      id: tongue.id,
      label: `Tongue shoulder on ${tongue.face.replace('_face', ' edge').replace('_end', ' end')}`,
      center: face.center.clone().addScaledVector(face.normal, -tongue.projection).setY(tongue.centerY),
      height: tongue.thickness,
      kind: 'shoulder'
    });
  }
  const localPart = { ...part, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } };
  for (const cut of part.features ?? []) {
    if (
      !cut.enabled ||
      cut.kind !== 'rect_cut' ||
      cut.cutType !== 'stopped_dado' ||
      !cut.parameters.stoppedSpan ||
      cut.target.type !== 'face' ||
      !['top_face', 'bottom_face'].includes(cut.target.face)
    )
      continue;
    const top = cut.target.face === 'top_face';
    result.push({
      id: `housing:${cut.id}`,
      label: `${cut.label || 'Stopped dado'} — align board edges`,
      center: new Vector3(
        -part.length / 2 + cut.placement.x + cut.parameters.size.length / 2,
        ((top ? 1 : -1) * part.thickness) / 2,
        0
      ),
      normal: new Vector3(0, top ? 1 : -1, 0),
      along: new Vector3(1, 0, 0),
      across: new Vector3(0, 0, top ? -1 : 1),
      width: cut.parameters.size.length,
      height: part.width,
      depth: cut.parameters.depth ?? 0,
      kind: 'socket'
    });
  }
  for (const cut of part.features ?? []) {
    if (!cut.enabled || cut.kind !== 'rect_cut' || cut.cutType !== 'rabbet' || cut.target.type !== 'edge') continue;
    const bounds = getRectCutPlanBounds(cut, part);
    const top = cut.target.edge.startsWith('top_');
    result.push({
      id: `housing:${cut.id}`,
      label: `${cut.label || 'Rabbet'} ledge`,
      center: new Vector3(
        -part.length / 2 + (bounds.minX + bounds.maxX) / 2,
        ((top ? 1 : -1) * part.thickness) / 2,
        -part.width / 2 + (bounds.minZ + bounds.maxZ) / 2
      ),
      normal: new Vector3(0, top ? 1 : -1, 0),
      along: new Vector3(1, 0, 0),
      across: new Vector3(0, 0, top ? -1 : 1),
      width: bounds.maxX - bounds.minX,
      height: bounds.maxZ - bounds.minZ,
      depth: cut.parameters.depth ?? 0,
      kind: 'socket'
    });
  }
  for (const cut of part.features ?? []) {
    if (!cut.enabled || cut.kind !== 'rect_cut' || cut.cutType !== 'rabbet' || cut.target.type !== 'edge') continue;
    const ledge = result.find((reference) => reference.id === `housing:${cut.id}`)!;
    result.push({
      ...ledge,
      id: `rabbet-floor:${cut.id}`,
      label: `${cut.label || 'Rabbet'} seating face`,
      center: ledge.center.clone().addScaledVector(ledge.normal, -ledge.depth),
      depth: 0,
      kind: 'face'
    });
  }
  for (const cut of part.features ?? []) {
    if (!cut.enabled || cut.kind !== 'rect_cut' || cut.cutType !== 'half_lap' || cut.target.type !== 'face') continue;
    const bounds = getRectCutPlanBounds(cut, part);
    const top = cut.target.face === 'top_face';
    result.push({
      id: `lap:${cut.id}`,
      label: `${cut.label || 'Half lap'} seating face`,
      center: new Vector3(
        -part.length / 2 + (bounds.minX + bounds.maxX) / 2,
        0,
        -part.width / 2 + (bounds.minZ + bounds.maxZ) / 2
      ),
      normal: new Vector3(0, top ? 1 : -1, 0),
      along: new Vector3(1, 0, 0),
      across: new Vector3(0, 0, top ? -1 : 1),
      width: bounds.maxX - bounds.minX,
      height: bounds.maxZ - bounds.minZ,
      depth: 0,
      kind: 'face'
    });
  }
  // A through edge mortise reaching an end is a bridle opening. Its
  // shoulder reference is the open end, not the face used to saw the slot.
  for (const cut of part.features ?? []) {
    if (
      !cut.enabled ||
      cut.kind !== 'rect_cut' ||
      cut.cutType !== 'mortise' ||
      cut.parameters.depthMode !== 'through' ||
      cut.target.type !== 'face' ||
      !['front_face', 'back_face'].includes(cut.target.face)
    )
      continue;
    for (const end of ['left_end', 'right_end'] as const) {
      const open =
        end === 'left_end'
          ? cut.placement.x <= 1e-9
          : cut.placement.x + cut.parameters.size.length >= part.length - 1e-9;
      if (!open) continue;
      const face = result.find((ref) => ref.id === end)!;
      result.push({
        ...face,
        id: `housing:${cut.id}:${end}`,
        label: `Open mortise at ${end === 'left_end' ? 'left' : 'right'} end`,
        center: face.center.clone().setY(-part.thickness / 2 + cut.placement.z + cut.parameters.size.width / 2),
        height: cut.parameters.size.width,
        depth: cut.parameters.size.length,
        kind: 'socket'
      });
    }
  }
  const layout = getSavedJointLayout(part);
  const receivesPattern =
    layout &&
    part.id ===
      (['half_blind_dovetail', 'mitred_blind_dovetail', 'sliding_dovetail'].includes(layout.kind) ||
      isTenonLayout(layout.kind)
        ? layout.secondPartId
        : layout.firstPartId);
  if (receivesPattern) {
    const cut = part.features?.find(
      (feature) =>
        feature.enabled &&
        feature.kind === 'rect_cut' &&
        (feature.metadata?.jointLayout as { key?: string } | undefined)?.key === layout.key
    );
    if (cut?.kind === 'rect_cut' && layout.kind === 'sliding_dovetail') {
      result.push({
        id: `layout:${layout.key}`,
        label: 'Sliding dovetail housing',
        center: new Vector3(-part.length / 2 + cut.placement.x + cut.parameters.size.length / 2, part.thickness / 2, 0),
        normal: new Vector3(0, 1, 0),
        along: new Vector3(1, 0, 0),
        across: new Vector3(0, 0, -1),
        width: cut.parameters.size.length,
        height: part.width,
        depth: cut.parameters.depth ?? 0,
        kind: 'socket'
      });
    } else if (cut?.kind === 'rect_cut' && isTenonLayout(layout.kind)) {
      const frame = getFaceFrame(part, layout.receiverFace ?? 'front_face');
      const normal = vector(frame.inwardNormal).negate();
      const cuts = (part.features ?? []).filter(
        (feature) =>
          feature.enabled &&
          feature.kind === 'rect_cut' &&
          (feature.metadata?.jointLayout as { key?: string } | undefined)?.key === layout.key
      );
      const min = Math.min(...cuts.map((feature) => (feature.kind === 'rect_cut' ? feature.placement.x : 0)));
      const max = Math.max(
        ...cuts.map((feature) =>
          feature.kind === 'rect_cut' ? feature.placement.x + feature.parameters.size.length : 0
        )
      );
      const along = vector(frame.primaryAxis);
      result.push({
        id: `layout:${layout.key}`,
        label: 'Matching mortise shoulders',
        center: vector(frame.origin).addScaledVector(along, -frame.primarySize / 2 + (min + max) / 2),
        normal,
        along,
        across: new Vector3().crossVectors(normal, along),
        width: max - min,
        height: cut.parameters.size.width,
        depth: Math.max(...cuts.map((feature) => (feature.kind === 'rect_cut' ? (feature.parameters.depth ?? 0) : 0))),
        kind: 'socket'
      });
    } else if (cut?.kind === 'rect_cut')
      result.push({
        id: `layout:${layout.key}`,
        label: `${layout.kind === 'box' ? 'Box joint' : 'Dovetail'} matching corner`,
        center: new Vector3(
          -part.length / 2 +
            (layout.kind === 'mitred_blind_dovetail' ? part.thickness : cut.parameters.size.length) / 2,
          part.thickness / 2,
          0
        ),
        normal: new Vector3(0, 1, 0),
        along: new Vector3(1, 0, 0),
        across: new Vector3(0, 0, -1),
        width: layout.kind === 'mitred_blind_dovetail' ? part.thickness : cut.parameters.size.length,
        height: part.width,
        depth: layout.kind === 'half_blind_dovetail' ? layout.blindDepth : part.thickness,
        kind: 'socket'
      });
  }
  getPartFeatureSockets(localPart).forEach((socket, index) => {
    const feature = part.features?.find((candidate) => candidate.id === socket.featureId);
    const normal = vector(socket.openingNormal).normalize();
    const along = vector(socket.tangent1).normalize();
    // Rectangular and rounded socket extraction can choose opposite tangent
    // signs on the back face. Use the face's physical reference direction so
    // swapping a receiving board does not turn it end-for-end.
    if (
      feature?.target.type === 'face' &&
      along.dot(vector(getFaceFrame(part, feature.target.face).primaryAxis)) < -0.999
    )
      along.negate();
    result.push({
      id: `socket:${socket.featureId}:${index}`,
      label: `${feature?.label || socket.mateKind.replaceAll('_', ' ')} opening ${index + 1}`,
      center: vector(socket.openingCenter),
      normal,
      along,
      across: new Vector3().crossVectors(normal, along).normalize(),
      width: socket.halfExtent1 * 2,
      height: socket.halfExtent2 * 2,
      depth: socket.depth,
      kind: 'socket'
    });
  });
  for (const feature of part.features ?? []) {
    if (
      !feature.enabled ||
      feature.kind !== 'rect_cut' ||
      feature.cutType !== 'tenon' ||
      feature.target.type !== 'face'
    )
      continue;
    const sign = feature.target.face === 'left_end' ? -1 : 1;
    result.push({
      id: `shoulder:${feature.id}`,
      label: `${feature.label || 'Tenon'} shoulder`,
      center: new Vector3(
        sign * (part.length / 2 - feature.parameters.size.length),
        0,
        -part.width / 2 + feature.placement.z + feature.parameters.size.width / 2
      ),
      normal: new Vector3(sign, 0, 0),
      along: new Vector3(0, 0, 1),
      across: new Vector3(0, -sign, 0),
      width: feature.parameters.size.width,
      height: feature.parameters.depth ?? part.thickness,
      depth: 0,
      kind: 'shoulder'
    });
  }
  for (const edge of getRuleJointEdges(part)) {
    result.push({
      ...edge,
      label: `Rule joint ${edge.profile} — ${edge.top ? 'top' : 'bottom'} ${edge.side} edge`,
      across: new Vector3().crossVectors(edge.normal, edge.along),
      height: part.thickness,
      depth: 0,
      kind: 'profile',
      ruleJoint: edge
    });
  }
  return result;
}

export interface AssemblyLayoutOptions {
  movingReference: string;
  fixedReference: string;
  quarterTurns: number;
  insertion: number;
  along: 'center' | 'start' | 'end';
  across: 'center' | 'start' | 'end';
}

export function suggestAssembly(
  parts: [Part, Part],
  contextParts: readonly Part[] = []
): { swapped: boolean; options: AssemblyLayoutOptions } {
  for (const [moving, fixed] of [
    [parts[0], parts[1]],
    [parts[1], parts[0]]
  ]) {
    const feature = fixed.features?.find(
      (cut) =>
        cut.enabled && (cut.metadata?.insertSocket as { insertPartId?: string } | undefined)?.insertPartId === moving.id
    );
    const socket = feature?.metadata?.insertSocket as { insertion: number; matingFace: string } | undefined;
    const reference = feature && getAssemblyReferences(fixed).find((ref) => ref.id.startsWith(`socket:${feature.id}:`));
    if (socket && reference) {
      const keepInsertFixed = contextParts.some(
        (part) =>
          part.id !== fixed.id &&
          part.id !== moving.id &&
          part.features?.some(
            (cut) =>
              cut.enabled &&
              (cut.metadata?.insertSocket as { insertPartId?: string } | undefined)?.insertPartId === moving.id
          )
      );
      return {
        swapped: (keepInsertFixed ? fixed.id : moving.id) !== parts[0].id,
        options: {
          movingReference: keepInsertFixed ? reference.id : socket.matingFace,
          fixedReference: keepInsertFixed ? socket.matingFace : reference.id,
          insertion: socket.insertion,
          quarterTurns: 0,
          along: 'center',
          across: 'center'
        }
      };
    }
  }
  const rulePairs = getRuleJointEdges(parts[0]).flatMap((a) =>
    getRuleJointEdges(parts[1])
      .filter((b) => complementaryRuleJointEdges(a, b))
      .map((b) => ({ a, b }))
  );
  if (rulePairs.length === 1) {
    const { a, b } = rulePairs[0];
    // Keep the rounded tabletop fixed and bring its coved leaf to it.
    const swapped = a.profile === 'roundover';
    return {
      swapped,
      options: {
        movingReference: swapped ? b.id : a.id,
        fixedReference: swapped ? a.id : b.id,
        quarterTurns: 0,
        insertion: 0,
        along: 'center',
        across: 'center'
      }
    };
  }
  const layout = getSavedJointLayout(parts[0], parts[1].id);
  const mateLayout = getSavedJointLayout(parts[1], parts[0].id);
  const tenon = layout && isTenonLayout(layout.kind);
  const receiverId =
    layout && (['half_blind_dovetail', 'mitred_blind_dovetail', 'sliding_dovetail'].includes(layout.kind) || tenon)
      ? layout.secondPartId
      : layout?.firstPartId;
  const paired = layout && mateLayout?.key === layout.key;
  // A relief notch is not the receiving joint. Prefer a deliberate housing
  // or mortise, independent of the order in which the boards were selected.
  const receiverScore = (part: Part) =>
    Math.max(
      0,
      ...(part.features ?? []).map((feature) =>
        !feature.enabled ||
        feature.kind !== 'rect_cut' ||
        (feature.cutType === 'rabbet' &&
          (getEdgeTongues(part).length > 0 ||
            (getEndTongues(part).length > 0 &&
              parts.some(
                (other) =>
                  other.id !== part.id &&
                  other.features?.some(
                    (cut) =>
                      cut.enabled &&
                      cut.kind === 'rect_cut' &&
                      ['dado', 'stopped_dado', 'groove', 'stopped_groove', 'mortise'].includes(cut.cutType)
                  )
              ))))
          ? 0
          : ['dado', 'stopped_dado', 'groove', 'stopped_groove', 'mortise', 'rabbet'].includes(feature.cutType)
            ? 2
            : 0
      )
    );
  const swapped = paired ? parts[0].id === receiverId : receiverScore(parts[0]) > receiverScore(parts[1]);
  const moving = parts[swapped ? 1 : 0];
  const fixed = parts[swapped ? 0 : 1];
  const from = getAssemblyReferences(moving);
  const to = getAssemblyReferences(fixed);
  const corner = paired && to.find((reference) => reference.id === `layout:${layout.key}`);
  const movingLap = from.find((reference) => reference.id.startsWith('lap:'));
  const fixedLap = to.find((reference) => reference.id.startsWith('lap:'));
  if (!paired && movingLap && fixedLap)
    return {
      swapped,
      options: {
        movingReference: movingLap.id,
        fixedReference: fixedLap.id,
        quarterTurns: 1,
        insertion: 0,
        along: 'center',
        across: 'center'
      }
    };
  const movingRabbets = from.filter((reference) => reference.id.startsWith('rabbet-floor:'));
  const fixedRabbets = to.filter((reference) => reference.id.startsWith('rabbet-floor:'));
  const movingRabbet = movingRabbets[0];
  const fixedRabbet = fixedRabbets[0];
  if (
    !paired &&
    movingRabbets.length === 1 &&
    fixedRabbets.length === 1 &&
    movingRabbet.normal.dot(fixedRabbet.normal) < -0.999 &&
    Math.abs(movingRabbet.width - fixedRabbet.width) < 1e-6 &&
    Math.abs(movingRabbet.height - fixedRabbet.height) < 1e-6 &&
    movingRabbet.center.x * fixedRabbet.center.x + movingRabbet.center.z * fixedRabbet.center.z < 0
  ) {
    return {
      swapped,
      options: {
        movingReference: movingRabbet.id,
        fixedReference: fixedRabbet.id,
        quarterTurns: 2,
        insertion: 0,
        along: 'center',
        across: 'center'
      }
    };
  }
  const shoulder = from.find((reference) => reference.kind === 'shoulder');
  const socket =
    to.find((reference) => reference.id.startsWith('housing:')) ?? to.find((reference) => reference.kind === 'socket');
  // A thin, uncut strip fitting a long-edge groove is a loose spline.
  // Seat half its width so its other half can enter the second board.
  const splineGroove =
    !paired && !shoulder && !(moving.features ?? []).some((cut) => cut.enabled)
      ? fixed.features?.find(
          (cut) =>
            cut.enabled &&
            cut.kind === 'rect_cut' &&
            cut.cutType === 'groove' &&
            cut.target.type === 'face' &&
            ['front_face', 'back_face'].includes(cut.target.face) &&
            moving.length > moving.width &&
            moving.length <= fixed.length + 1e-9 &&
            Math.abs(moving.thickness - cut.parameters.size.width) < 1e-6 &&
            moving.width <= 2 * (cut.parameters.depth ?? 0) + 1e-9
        )
      : undefined;
  if (splineGroove?.target.type === 'face') {
    const opening = to.find((reference) => reference.id.startsWith(`socket:${splineGroove.id}:`));
    if (opening) {
      const seatedOpening = contextParts.flatMap((part) => {
        if (part.id === fixed.id || part.id === moving.id) return [];
        return getAssemblyReferences(part)
          .filter((ref) => {
            const cut = part.features?.find((feature) => ref.id.startsWith(`socket:${feature.id}:`));
            return (
              cut?.kind === 'rect_cut' &&
              cut.cutType === 'groove' &&
              Math.abs(ref.height - moving.thickness) < 1e-6 &&
              ref.width >= moving.length - 1e-6 &&
              ref.depth >= moving.width / 2 - 1e-6 &&
              ref.center
                .clone()
                .applyQuaternion(rotation(part))
                .add(vector(part.position))
                .distanceTo(vector(moving.position)) < 1e-6 &&
              Math.abs(
                ref.normal
                  .clone()
                  .applyQuaternion(rotation(part))
                  .dot(new Vector3(0, 0, 1).applyQuaternion(rotation(moving)))
              ) >
                1 - 1e-6
            );
          })
          .map((ref) => ref.normal.clone().applyQuaternion(rotation(part)));
      })[0];
      const exposedEdge =
        seatedOpening &&
        from.find(
          (ref) =>
            ['front_face', 'back_face'].includes(ref.id) &&
            ref.normal.clone().applyQuaternion(rotation(moving)).dot(seatedOpening) > 1 - 1e-6
        );
      return {
        swapped: exposedEdge ? !swapped : swapped,
        options: {
          movingReference: exposedEdge
            ? opening.id
            : splineGroove.target.face === 'back_face'
              ? 'front_face'
              : 'back_face',
          fixedReference: exposedEdge ? exposedEdge.id : opening.id,
          quarterTurns: 0,
          insertion: moving.width / 2,
          along: 'center',
          across: 'center'
        }
      };
    }
  }
  const end = from.find((reference) => reference.id === (socket ? 'left_end' : 'right_end'))!;
  const movingSurface = shoulder ?? end;
  const turn =
    socket &&
    (!shoulder || shoulder.id.startsWith('end-tongue:')) &&
    Math.abs(movingSurface.height - socket.width) + Math.abs(movingSurface.width - socket.height) <
      Math.abs(movingSurface.width - socket.width) + Math.abs(movingSurface.height - socket.height)
      ? socket.normal.y < -0.999
        ? 3
        : 1
      : 0;
  return {
    swapped,
    options: {
      movingReference: corner && !tenon ? 'left_end' : movingSurface.id,
      fixedReference: corner ? corner.id : (socket?.id ?? 'left_end'),
      quarterTurns: corner && !tenon ? 1 : turn,
      insertion: corner && !tenon ? corner.depth : !shoulder && socket ? socket.depth : 0,
      along: 'center',
      across: 'center'
    }
  };
}

/** Seat references without changing stock dimensions or authored operations. */
export function planAssembly(moving: Part, fixed: Part, options: AssemblyLayoutOptions): Part | null {
  const from = getAssemblyReferences(moving).find((reference) => reference.id === options.movingReference);
  const to = getAssemblyReferences(fixed).find((reference) => reference.id === options.fixedReference);
  if (
    !from ||
    !to ||
    !Number.isFinite(options.insertion) ||
    options.insertion < 0 ||
    !Number.isInteger(options.quarterTurns)
  )
    return null;
  if (options.insertion > Math.max(to.depth, from.kind === 'socket' ? from.depth : 0) + 1e-9) return null;
  if (from.ruleJoint || to.ruleJoint) {
    if (
      !from.ruleJoint ||
      !to.ruleJoint ||
      !complementaryRuleJointEdges(from.ruleJoint, to.ruleJoint) ||
      options.quarterTurns % 4 !== 0 ||
      options.across !== 'center'
    )
      return null;
  }
  const fixedRotation = rotation(fixed);
  const normal = to.normal.clone().applyQuaternion(fixedRotation);
  const along = to.along.clone().applyQuaternion(fixedRotation);
  const across = to.across.clone().applyQuaternion(fixedRotation);
  const destinationAlong = along
    .clone()
    .negate()
    .applyAxisAngle(normal, (options.quarterTurns * Math.PI) / 2);
  const destinationNormal = normal.clone().negate();
  const destinationAcross = new Vector3().crossVectors(destinationNormal, destinationAlong);
  const sourceBasis = new Matrix4().makeBasis(from.along, from.across, from.normal);
  const targetBasis = new Matrix4().makeBasis(destinationAlong, destinationAcross, destinationNormal);
  const orientation = new Quaternion().setFromRotationMatrix(targetBasis.multiply(sourceBasis.transpose()));
  const swapped = Math.abs(options.quarterTurns % 2) === 1;
  const offset = (mode: 'center' | 'start' | 'end', host: number, guest: number) =>
    mode === 'center' ? 0 : ((mode === 'start' ? -1 : 1) * (host - guest)) / 2;
  const center = to.center
    .clone()
    .applyQuaternion(fixedRotation)
    .add(vector(fixed.position))
    .addScaledVector(normal, -options.insertion)
    .addScaledVector(along, offset(options.along, to.width, swapped ? from.height : from.width))
    .addScaledVector(across, offset(options.across, to.height, swapped ? from.width : from.height));
  const position = center.sub(from.center.clone().applyQuaternion(orientation));
  const angles = new Euler().setFromQuaternion(orientation, 'XYZ');
  return {
    ...moving,
    position: { x: position.x, y: position.y, z: position.z },
    rotation: { x: MathUtils.radToDeg(angles.x), y: MathUtils.radToDeg(angles.y), z: MathUtils.radToDeg(angles.z) }
  };
}
