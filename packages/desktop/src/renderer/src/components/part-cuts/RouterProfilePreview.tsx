import type { RouterProfileDefinition } from '@renderer/types';
import { evaluateRouterProfileBoundary } from '@renderer/utils/edgeProfileShape';

export function RouterProfilePreview({ profile, label }: { profile: RouterProfileDefinition; label?: string }) {
  const points = evaluateRouterProfileBoundary(profile);
  if (points.length < 2) return <div className="text-xs text-text-muted">Preview unavailable</div>;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(maxX - minX, 1e-6);
  const height = Math.max(maxY - minY, 1e-6);
  const path = points
    .map((point, index) => {
      const x = 12 + ((point.x - minX) / width) * 96;
      const y = 70 - ((point.y - minY) / height) * 58;
      return `${index === 0 ? 'M' : 'L'}${x} ${y}`;
    })
    .join(' ');
  return (
    <svg
      viewBox="0 0 120 82"
      role="img"
      aria-label={label ?? `${profile.name} profile preview`}
      className="h-24 w-full"
    >
      <rect x="8" y="8" width="104" height="66" fill="var(--color-surface-hover)" stroke="var(--color-border)" />
      <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}
