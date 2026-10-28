import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { getConcern } from '@/lib/verdict/concerns';
import type { Trial, VerdictResult } from '@/lib/verdict/types';
import { SampleBadge } from './SampleBadge';
import { ProgressBar } from './ui';
import { VERDICT_META, VerdictChip } from './VerdictChip';

export function TrialCard({
  trial,
  verdict,
  nextCheckIn,
}: {
  trial: Trial;
  verdict: VerdictResult;
  nextCheckIn: string | null;
}) {
  const started = verdict.daysIn >= 0;
  return (
    <Link
      href={`/trial/${trial.id}`}
      className="block rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-line/70 transition duration-200 hover:shadow-lift active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-xl leading-snug font-semibold [overflow-wrap:anywhere]">{trial.productName}</h2>
            {trial.isSample && <SampleBadge />}
          </div>
          <p className="mt-0.5 text-sm text-ink-muted">{trial.concerns.map(c => getConcern(c).label).join(' · ')}</p>
        </div>
        <VerdictChip kind={verdict.kind} />
      </div>

      {verdict.goalProgress !== null && (
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs text-ink-muted">
            <span>Toward realistic goal</span>
            <span className="tabular-nums">{Math.round(verdict.goalProgress * 100)}%</span>
          </div>
          <ProgressBar value={verdict.goalProgress} label="Progress toward goal" tone={VERDICT_META[verdict.kind].accent} />
        </div>
      )}

      <dl className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 text-sm">
        <div>
          <dt className="sr-only">Progress</dt>
          <dd className="font-medium tabular-nums">
            {started ? `Day ${verdict.daysIn}` : `Starts ${format(parseISO(trial.startDate), 'MMM d')}`}
          </dd>
        </div>
        {trial.isSample ? (
          <div>
            <dt className="sr-only">Type</dt>
            <dd className="text-ink-muted">Read-only journey</dd>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <dt className="text-ink-muted">Next check-in</dt>
            <dd className={nextCheckIn === 'Today' ? 'font-semibold text-primary' : 'font-medium'}>
              {nextCheckIn ?? 'Add a baseline'}
            </dd>
          </div>
        )}
      </dl>
    </Link>
  );
}
