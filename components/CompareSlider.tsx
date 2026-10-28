'use client';

import { useState } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

export interface CompareSide {
  src: string | null;
  label: string;
  /** Optional concern mask drawn over this side (white background, multiplied). */
  mask?: string | null;
}

function Layer({ side }: { side: CompareSide }) {
  return (
    <>
      {side.src && (
        // eslint-disable-next-line @next/next/no-img-element -- local object URL
        <img src={side.src} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      )}
      {side.mask && (
        // eslint-disable-next-line @next/next/no-img-element -- local object URL
        <img src={side.mask} alt="" className="absolute inset-0 h-full w-full object-cover mix-blend-multiply" draggable={false} />
      )}
    </>
  );
}

/** Before/after reveal. The range input gives pointer, touch and keyboard control in one element. */
export function CompareSlider({ left, right }: { left: CompareSide; right: CompareSide }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative aspect-[3/4] select-none overflow-hidden rounded-3xl bg-muted shadow-lift">
      <Layer side={right} />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <Layer side={left} />
      </div>

      <div aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/90" style={{ left: `${pos}%` }}>
        <span className="absolute top-1/2 left-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-lift">
          <span className="flex">
            <CaretLeft size={14} weight="bold" />
            <CaretRight size={14} weight="bold" />
          </span>
        </span>
      </div>

      <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-ink/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
        {left.label}
      </span>
      <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-ink/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
        {right.label}
      </span>

      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={e => setPos(Number(e.target.value))}
        aria-label={`Compare ${left.label} and ${right.label}`}
        aria-valuetext={`${pos}% ${left.label}`}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
