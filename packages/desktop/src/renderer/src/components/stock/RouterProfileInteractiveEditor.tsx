import { useMemo, useRef, useState } from 'react';
import { Label } from '@renderer/components/ui/label';
import { Select } from '@renderer/components/ui/select';
import type { RouterProfileDefinition } from '@renderer/types';
import { evaluateRouterProfileBoundary } from '@renderer/utils/edgeProfileShape';
import { cloneRouterProfileDefinition } from '@renderer/utils/routerProfiles';
import {
  analyzeRouterProfileContinuity,
  enforceRouterProfileJoinTangent
} from '@renderer/utils/routerProfileContinuity';

type Point = { u: number; v: number };
type Kind = 'start' | 'end' | 'control1' | 'control2';
type Handle = { kind: Kind; segment?: number; point: Point };
export type ProfileSnapGrid = 0 | 0.015625 | 0.03125 | 0.0625 | 0.125;
const W = 320,
  H = 240,
  PAD = 28;
export function snapProfilePoint(
  raw: Point,
  grid: ProfileSnapGrid,
  candidates: readonly Point[],
  shift = false,
  origin?: Point,
  alt = false
) {
  if (shift) return { point: raw, target: 'Snap temporarily off' };
  const point = grid ? { u: Math.round(raw.u / grid) * grid, v: Math.round(raw.v / grid) * grid } : { ...raw };
  let target = grid ? `${grid} in grid` : 'Free';
  const tolerance = grid ? Math.min(grid / 4, 0.01) : 0.01;
  if (Math.abs(point.u) <= tolerance) {
    point.u = 0;
    target = 'U stock axis';
  }
  if (Math.abs(point.v) <= tolerance) {
    point.v = 0;
    target = 'V stock axis';
  }
  for (const p of candidates) {
    if (Math.abs(point.u - p.u) <= tolerance) {
      point.u = p.u;
      target = 'U handle alignment';
    }
    if (Math.abs(point.v - p.v) <= tolerance) {
      point.v = p.v;
      target = 'V handle alignment';
    }
  }
  if (alt && origin) {
    if (Math.abs(point.u - origin.u) >= Math.abs(point.v - origin.v)) {
      point.v = origin.v;
      target = 'Horizontal constraint';
    } else {
      point.u = origin.u;
      target = 'Vertical constraint';
    }
  }
  return { point, target };
}
function getHandles(profile: RouterProfileDefinition): Handle[] {
  const result: Handle[] = [{ kind: 'start', point: profile.boundary.start }];
  profile.boundary.segments.forEach((s, segment) => {
    if (s.kind === 'cubicBezier')
      result.push({ kind: 'control1', segment, point: s.control1 }, { kind: 'control2', segment, point: s.control2 });
    result.push({ kind: 'end', segment, point: s.to });
  });
  return result;
}
function replace(profile: RouterProfileDefinition, handle: Handle, point: Point) {
  const next = cloneRouterProfileDefinition(profile);
  if (handle.kind === 'start') next.boundary.start = point;
  else {
    const s = next.boundary.segments[handle.segment!]!;
    if (handle.kind === 'end') s.to = point;
    else if (s.kind === 'cubicBezier') s[handle.kind] = point;
  }
  return next;
}

export function RouterProfileInteractiveEditor({
  profile,
  onChange
}: {
  profile: RouterProfileDefinition;
  onChange: (profile: RouterProfileDefinition) => void;
}) {
  const [grid, setGrid] = useState<ProfileSnapGrid>(0.03125);
  const [preview, setPreview] = useState<RouterProfileDefinition>();
  const [status, setStatus] = useState('Drag a handle, or focus it and use arrow keys.');
  const [showContinuity, setShowContinuity] = useState(true);
  const [preferSmooth, setPreferSmooth] = useState(false);
  const [locks, setLocks] = useState<Record<number, 'off' | 'aligned' | 'mirrored'>>({});
  const drag = useRef<{ handle: Handle; start: RouterProfileDefinition; pointerId: number } | undefined>(undefined);
  const shown = preview ?? profile;
  const hs = getHandles(shown);
  const domain = useMemo(() => {
    const values = [
      ...evaluateRouterProfileBoundary(shown).map((p) => ({ u: p.x, v: p.y })),
      ...getHandles(shown).map((h) => h.point),
      { u: 0, v: 0 }
    ];
    const minU = Math.min(...values.map((p) => p.u)),
      minV = Math.min(...values.map((p) => p.v));
    const span = Math.max(Math.max(...values.map((p) => p.u)) - minU, Math.max(...values.map((p) => p.v)) - minV, 0.25);
    return { minU: minU - span * 0.15, minV: minV - span * 0.15, span: span * 1.3 };
  }, [shown]);
  const xy = (p: Point) => ({
    x: PAD + ((p.u - domain.minU) / domain.span) * (W - PAD * 2),
    y: H - PAD - ((p.v - domain.minV) / domain.span) * (H - PAD * 2)
  });
  const uv = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W,
      y = ((e.clientY - r.top) / r.height) * H;
    return {
      u: domain.minU + ((x - PAD) / (W - PAD * 2)) * domain.span,
      v: domain.minV + ((H - PAD - y) / (H - PAD * 2)) * domain.span
    };
  };
  const enforce = (
    source: RouterProfileDefinition,
    join: number,
    mode: 'aligned' | 'mirrored',
    anchor: 'left' | 'right'
  ) => {
    const next = cloneRouterProfileDefinition(source),
      leftFrom = join === 0 ? next.boundary.start : next.boundary.segments[join - 1].to,
      joinPoint = next.boundary.segments[join].to;
    const result = enforceRouterProfileJoinTangent(
      { from: leftFrom, segment: next.boundary.segments[join] },
      { from: joinPoint, segment: next.boundary.segments[join + 1] },
      { mode, anchor }
    );
    if (result.changed) {
      next.boundary.segments[join] = result.left.segment;
      next.boundary.segments[join + 1] = result.right.segment;
    }
    return { next, result };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const raw = uv(e),
      snapped = snapProfilePoint(
        raw,
        grid,
        getHandles(d.start)
          .filter((h) => h.kind !== d.handle.kind || h.segment !== d.handle.segment)
          .map((h) => h.point),
        e.shiftKey,
        d.handle.point,
        e.altKey
      );
    let next = replace(d.start, d.handle, snapped.point);
    const join =
        d.handle.kind === 'control2'
          ? (d.handle.segment ?? -1)
          : d.handle.kind === 'control1'
            ? (d.handle.segment ?? 0) - 1
            : -1,
      mode = locks[join];
    if (join >= 0 && mode && mode !== 'off')
      next = enforce(next, join, mode, d.handle.kind === 'control2' ? 'left' : 'right').next;
    setPreview(next);
    const du = snapped.point.u - d.handle.point.u,
      dv = snapped.point.v - d.handle.point.v;
    setStatus(
      `U ${snapped.point.u.toFixed(4)}, V ${snapped.point.v.toFixed(4)} · Δ ${du.toFixed(4)}, ${dv.toFixed(4)} · distance ${Math.hypot(du, dv).toFixed(4)} · angle ${((Math.atan2(dv, du) * 180) / Math.PI).toFixed(1)}° · ${snapped.target}${mode && mode !== 'off' ? ` · ${mode} tangent lock` : ''}`
    );
  };
  const finish = (e: React.PointerEvent, commit: boolean) => {
    if (!drag.current) return;
    e.currentTarget.releasePointerCapture?.(drag.current.pointerId);
    if (commit && preview) onChange(preview);
    setPreview(undefined);
    drag.current = undefined;
  };
  const key = (handle: Handle, e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setPreview(undefined);
      drag.current = undefined;
      setStatus('Edit canceled; the drag-start values were restored.');
      return;
    }
    if (!e.key.startsWith('Arrow')) return;
    e.preventDefault();
    const step = (grid || 0.001) * (e.shiftKey ? 10 : 1),
      p = { ...handle.point };
    if (e.key === 'ArrowLeft') p.u -= step;
    if (e.key === 'ArrowRight') p.u += step;
    if (e.key === 'ArrowDown') p.v -= step;
    if (e.key === 'ArrowUp') p.v += step;
    onChange(replace(profile, handle, p));
    setStatus(`${handle.kind} moved to U ${p.u.toFixed(4)}, V ${p.v.toFixed(4)}.`);
  };
  const evaluated = evaluateRouterProfileBoundary(shown),
    path = evaluated.map((p, i) => `${i ? 'L' : 'M'}${xy({ u: p.x, v: p.y }).x} ${xy({ u: p.x, v: p.y }).y}`).join(' '),
    joins = analyzeRouterProfileContinuity(shown);
  const names = {
    disconnected: 'Disconnected / error',
    g0_corner: 'Sharp corner',
    g1_tangent: 'Tangent smooth',
    g2_curvature: 'Curvature smooth'
  } as const;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Label>
          Interactive editor snap
          <Select
            aria-label="Profile editor snap grid"
            value={grid}
            onChange={(e) => setGrid(Number(e.target.value) as ProfileSnapGrid)}
          >
            <option value="0">Off</option>
            <option value="0.015625">1/64 in</option>
            <option value="0.03125">1/32 in</option>
            <option value="0.0625">1/16 in</option>
            <option value="0.125">1/8 in</option>
          </Select>
        </Label>
        <div className="space-y-1 text-xs">
          <Label>
            <input type="checkbox" checked={showContinuity} onChange={(e) => setShowContinuity(e.target.checked)} />{' '}
            Show continuity markers
          </Label>
          <Label>
            <input type="checkbox" checked={preferSmooth} onChange={(e) => setPreferSmooth(e.target.checked)} /> Prefer
            smooth joins
          </Label>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="group"
        aria-label="Interactive custom router profile editor"
        className="h-64 w-full touch-none rounded border border-border bg-bg"
        onPointerMove={move}
        onPointerUp={(e) => finish(e, true)}
        onPointerCancel={(e) => finish(e, false)}
      >
        <line x1={0} y1={xy({ u: 0, v: 0 }).y} x2={W} y2={xy({ u: 0, v: 0 }).y} stroke="var(--color-text-muted)" />
        <line x1={xy({ u: 0, v: 0 }).x} y1={0} x2={xy({ u: 0, v: 0 }).x} y2={H} stroke="var(--color-text-muted)" />
        {shown.boundary.segments.map((s, i) =>
          s.kind === 'cubicBezier' ? (
            <polyline
              key={i}
              points={[i ? shown.boundary.segments[i - 1].to : shown.boundary.start, s.control1, s.control2, s.to]
                .map((p) => `${xy(p).x},${xy(p).y}`)
                .join(' ')}
              fill="none"
              stroke="var(--color-text-muted)"
              strokeDasharray="4 3"
            />
          ) : null
        )}
        <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth="3" />
        {showContinuity &&
          joins.map((j) => {
            const p = xy(j.point);
            return (
              <g key={`join-${j.joinIndex}`} role="img" aria-label={`Join ${j.joinIndex + 1}: ${names[j.continuity]}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="10"
                  fill={
                    j.continuity === 'disconnected' || (preferSmooth && j.continuity === 'g0_corner')
                      ? 'var(--color-danger)'
                      : 'var(--color-bg-secondary)'
                  }
                  stroke="var(--color-accent)"
                />
                <text x={p.x} y={p.y + 3} textAnchor="middle" fontSize="9" fill="var(--color-text)">
                  {j.joinIndex + 1}
                </text>
              </g>
            );
          })}
        {hs.map((h) => {
          const p = xy(h.point),
            label =
              h.kind === 'start'
                ? 'Profile start point'
                : `Segment ${h.segment! + 1} ${h.kind === 'end' ? 'endpoint' : h.kind === 'control1' ? 'cubic control 1' : 'cubic control 2'}`;
          return (
            <circle
              key={`${h.kind}-${h.segment ?? 's'}`}
              cx={p.x}
              cy={p.y}
              r={h.kind.startsWith('control') ? 5 : 6}
              fill={h.kind.startsWith('control') ? 'var(--color-warning)' : 'var(--color-accent)'}
              tabIndex={0}
              role="button"
              aria-label={`${label}, U ${h.point.u}, V ${h.point.v}`}
              onKeyDown={(e) => key(h, e)}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);
                drag.current = { handle: h, start: cloneRouterProfileDefinition(profile), pointerId: e.pointerId };
                setStatus(`${label} selected. Shift disables snap; Alt constrains horizontal or vertical.`);
              }}
            />
          );
        })}
      </svg>
      {showContinuity && (
        <div aria-label="Profile join continuity" className="space-y-1">
          {joins.map((j) => {
            const left = shown.boundary.segments[j.joinIndex],
              right = shown.boundary.segments[j.joinIndex + 1],
              supported = left.kind === 'cubicBezier' || right.kind === 'cubicBezier',
              arc = [left.kind, right.kind].some((k) => k === 'arc' || k === 'ellipseArc');
            return (
              <details
                key={j.joinIndex}
                className={`rounded border p-2 text-xs ${preferSmooth && j.continuity === 'g0_corner' ? 'border-warning' : 'border-border'}`}
              >
                <summary>
                  {j.joinIndex + 1}. {names[j.continuity]}
                  {j.continuity === 'g0_corner' && !preferSmooth ? ' · intentional corners are allowed' : ''}
                </summary>
                <p>{j.message}</p>
                <p>
                  Angle mismatch:{' '}
                  {j.angleDiscontinuity === null
                    ? 'unavailable'
                    : `${((j.angleDiscontinuity * 180) / Math.PI).toFixed(3)}°`}{' '}
                  · curvature mismatch:{' '}
                  {j.normalizedCurvatureDiscontinuity === null
                    ? 'unavailable'
                    : j.normalizedCurvatureDiscontinuity.toPrecision(4)}
                </p>
                {arc ? (
                  <p>Convert adjacent curve to cubic to edit tangency; Carvd will not silently change its radius.</p>
                ) : supported ? (
                  <Label>
                    Tangent lock
                    <Select
                      aria-label={`Join ${j.joinIndex + 1} tangent lock`}
                      value={locks[j.joinIndex] ?? 'off'}
                      onChange={(e) => {
                        const mode = e.target.value as 'off' | 'aligned' | 'mirrored';
                        setLocks({ ...locks, [j.joinIndex]: mode });
                        if (mode !== 'off') {
                          const applied = enforce(
                            profile,
                            j.joinIndex,
                            mode,
                            right.kind === 'cubicBezier' ? 'left' : 'right'
                          );
                          if (applied.result.changed) onChange(applied.next);
                          else setStatus(applied.result.recommendation ?? 'This join cannot be locked.');
                        }
                      }}
                    >
                      <option value="off">Off</option>
                      <option value="aligned">Aligned</option>
                      <option value="mirrored">Mirrored</option>
                    </Select>
                  </Label>
                ) : null}
              </details>
            );
          })}
        </div>
      )}
      <p role="status" aria-live="polite" className="min-h-10 text-xs text-text-muted">
        {status}
      </p>
    </div>
  );
}
