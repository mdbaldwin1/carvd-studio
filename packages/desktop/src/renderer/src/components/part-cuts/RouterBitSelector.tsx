import { useState } from 'react';

import { Button } from '@renderer/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog';
import { cn } from '@renderer/lib/utils';
import { RouterBit } from '@renderer/types';

type RouterBitProfile = RouterBit['profile'];

const BIT_OPTIONS: Array<{ profile: RouterBitProfile; name: string; description: string }> = [
  {
    profile: 'straight',
    name: 'Flat Bottom',
    description: 'Straight, mortising, spiral, compression, and surfacing bits make this same cut shape.'
  },
  {
    profile: 'core_box',
    name: 'Round Bottom',
    description: 'Core-box and ball-nose bits make this same rounded channel profile.'
  },
  {
    profile: 'v_bit',
    name: 'V-Groove',
    description: 'V and engraving bits make this tapered profile; angle controls its shape.'
  },
  { profile: 'dovetail', name: 'Dovetail', description: 'Tapered, undercut grooves for sliding joints.' },
  { profile: 't_slot', name: 'T-Slot', description: 'Wide buried channel beneath a narrow entry slot.' },
  { profile: 'keyhole', name: 'Keyhole', description: 'A hanging slot with a round entry pocket.' }
];

function CutProfilePreview({ profile }: { profile: RouterBitProfile }) {
  const wood = 'var(--color-surface-hover)';
  const cut = 'var(--color-background)';
  const stroke = 'var(--color-accent)';
  let path = 'M 42 20 L 42 64 L 78 64 L 78 20 Z';

  if (profile === 'core_box' || profile === 'ball_nose') path = 'M 42 20 L 42 48 Q 60 76 78 48 L 78 20 Z';
  if (profile === 'v_bit' || profile === 'engraving') path = 'M 38 20 L 60 68 L 82 20 Z';
  if (profile === 'dovetail') path = 'M 50 20 L 43 64 L 77 64 L 70 20 Z';
  if (profile === 't_slot') path = 'M 53 20 L 53 39 L 38 39 L 38 64 L 82 64 L 82 39 L 67 39 L 67 20 Z';
  if (profile === 'keyhole') path = 'M 53 20 L 53 42 L 43 48 A 19 19 0 1 0 77 48 L 67 42 L 67 20 Z';

  return (
    <svg
      viewBox="0 0 120 82"
      role="img"
      aria-label={`${profile.replace('_', ' ')} cut profile`}
      className="h-24 w-full"
    >
      <rect x="8" y="12" width="104" height="60" rx="3" fill={wood} stroke={stroke} />
      <path d={path} fill={cut} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      <path d="M 8 12 H 112" stroke="var(--color-text-muted)" strokeDasharray="3 3" />
    </svg>
  );
}

interface RouterBitSelectorProps {
  value: RouterBitProfile;
  onSelect: (profile: RouterBitProfile) => void;
}

export function RouterBitSelector({ value, onSelect }: RouterBitSelectorProps) {
  const [open, setOpen] = useState(false);
  const canonicalValue: RouterBitProfile = [
    'mortising',
    'spiral_upcut',
    'spiral_downcut',
    'compression',
    'surfacing'
  ].includes(value)
    ? 'straight'
    : value === 'ball_nose'
      ? 'core_box'
      : value === 'engraving'
        ? 'v_bit'
        : value;
  const selected = BIT_OPTIONS.find((option) => option.profile === canonicalValue) ?? BIT_OPTIONS[0];

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between"
        aria-label="Choose router bit"
        onClick={() => setOpen(true)}
      >
        <span>{selected.name}</span>
        <span className="text-[11px] font-normal text-text-muted">View profiles…</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl" onClose={() => setOpen(false)}>
          <DialogHeader>
            <div>
              <DialogTitle>Choose Router Bit</DialogTitle>
              <DialogDescription className="mt-1">
                The diagrams show a cross-section of the profile each bit cuts into the workpiece.
              </DialogDescription>
            </div>
            <DialogClose onClose={() => setOpen(false)} />
          </DialogHeader>
          <div className="grid gap-3 overflow-y-auto p-5 sm:grid-cols-2 lg:grid-cols-3">
            {BIT_OPTIONS.map((option) => {
              const isSelected = option.profile === canonicalValue;
              return (
                <button
                  key={option.profile}
                  type="button"
                  aria-label={`Select ${option.name} router bit`}
                  aria-pressed={isSelected}
                  onClick={() => {
                    onSelect(option.profile);
                    setOpen(false);
                  }}
                  className={cn(
                    'rounded-md border bg-surface p-3 text-left transition-colors',
                    'hover:border-accent hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-accent',
                    isSelected ? 'border-accent ring-1 ring-accent' : 'border-border'
                  )}
                >
                  <CutProfilePreview profile={option.profile} />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="font-semibold text-text">{option.name}</span>
                    {isSelected ? <span className="text-xs font-semibold text-accent">Selected</span> : null}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">{option.description}</p>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
