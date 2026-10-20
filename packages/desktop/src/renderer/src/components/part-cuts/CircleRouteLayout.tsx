import { useState } from 'react';
import { FractionInput } from '@renderer/components/common/FractionInput';
import { Button } from '@renderer/components/ui/button';

/** A circle jig lays out the cutter centerline; the bit supplies the cut width. */
export function CircleRouteLayout({
  onApply
}: {
  onApply: (points: { primary: number; secondary: number; cornerRadius: number }[]) => void;
}) {
  const [radius, setRadius] = useState(1);
  const [along, setAlong] = useState(0);
  const [across, setAcross] = useState(0);
  return (
    <details className="property-group">
      <summary className="cursor-pointer text-sm font-medium">Circle jig</summary>
      <p className="mt-1 text-xs text-text-muted">
        Set the pivot and the distance from pivot to bit center. Applying replaces this route with a closed circle.
      </p>
      <label>Radius to bit center</label>
      <FractionInput ariaLabel="Circle route radius" value={radius} min={0.001} onChange={setRadius} />
      <label>Pivot along face</label>
      <FractionInput ariaLabel="Circle pivot along face" value={along} min={-Infinity} onChange={setAlong} />
      <label>Pivot across face</label>
      <FractionInput ariaLabel="Circle pivot across face" value={across} min={-Infinity} onChange={setAcross} />
      <Button
        type="button"
        size="xs"
        variant="outline"
        onClick={() =>
          onApply(
            Array.from({ length: 32 }, (_, index) => {
              const angle = (index * Math.PI * 2) / 32;
              return {
                primary: along + radius * Math.cos(angle),
                secondary: across + radius * Math.sin(angle),
                cornerRadius: 0
              };
            })
          )
        }
      >
        Apply circle
      </Button>
    </details>
  );
}
