import { Info } from '@phosphor-icons/react/dist/ssr';
import type { VerdictResult } from '@/lib/verdict/types';
import { ProgressBar } from './ui';
import { VERDICT_META, VerdictChip } from './VerdictChip';

export function VerdictCard({ verdict }: { verdict: VerdictResult }) {
  const meta = VERDICT_META[verdict.kind];
  return (
    <article className="relative overflow-hidden rounded-2xl bg-surface p-5 pl-6 shadow-lift ring-1 ring-line/70">
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${meta.accent}`} />
      <div className="flex items-center justify-between gap-3">
        <VerdictChip kind={verdict.kind} size="lg" />
        <span className="text-xs font-medium text-ink-muted">Confidence: {verdict.confidence}</span>
      </div>
      <p className="mt-3 font-serif text-xl leading-snug text-pretty">{verdict.reason}</p>

      {verdict.goalProgress !== null && (
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="text-ink-muted">Toward realistic goal</span>
            <span className="font-semibold tabular-nums">{Math.round(verdict.goalProgress * 100)}%</span>
          </div>
          <ProgressBar value={verdict.goalProgress} label="Progress toward goal" tone={meta.accent} />
        </div>
      )}

      {verdict.overlapWarning && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm">
          <Info aria-hidden size={18} className="mt-0.5 shrink-0 text-ink-muted" />
          <span>{verdict.overlapWarning}</span>
        </p>
      )}
    </article>
  );
}
