import { Hourglass, MinusCircle, PauseCircle, Plant, TrendUp } from '@phosphor-icons/react/dist/ssr';
import type { Icon } from '@phosphor-icons/react';
import type { VerdictKind } from '@/lib/verdict/types';

interface VerdictMeta {
  label: string;
  icon: Icon;
  /** Chip: tinted background, dark text (≥ 4.5:1), hairline ring. */
  chip: string;
  /** Solid accent for bars, dots and the verdict card edge. */
  accent: string;
}

export const VERDICT_META: Record<VerdictKind, VerdictMeta> = {
  too_early: { label: 'Too early', icon: Hourglass, chip: 'bg-slate-100 text-slate-700 ring-slate-300', accent: 'bg-slate-400' },
  working: { label: 'Working', icon: TrendUp, chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200', accent: 'bg-emerald-600' },
  give_it_time: { label: 'Give it time', icon: Plant, chip: 'bg-amber-50 text-amber-800 ring-amber-200', accent: 'bg-amber-500' },
  not_moving: { label: 'Not moving', icon: MinusCircle, chip: 'bg-zinc-100 text-zinc-700 ring-zinc-300', accent: 'bg-zinc-500' },
  pause: { label: 'Pause', icon: PauseCircle, chip: 'bg-rose-50 text-rose-800 ring-rose-200', accent: 'bg-rose-600' },
};

export function VerdictChip({ kind, size = 'sm' }: { kind: VerdictKind; size?: 'sm' | 'lg' }) {
  const { label, icon: Glyph, chip } = VERDICT_META[kind];
  const sizing = size === 'lg' ? 'gap-1.5 px-3 py-1.5 text-sm' : 'gap-1 px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full font-semibold ring-1 ring-inset ${sizing} ${chip}`}>
      <Glyph aria-hidden size={size === 'lg' ? 16 : 14} weight="bold" />
      {label}
    </span>
  );
}
