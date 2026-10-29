'use client';

import Link from 'next/link';
import { ArrowCounterClockwise } from '@phosphor-icons/react';
import { getConcern } from '@/lib/verdict/concerns';
import type { Trial } from '@/lib/verdict/types';

/** Trials taken off the shelf. Each one still opens, and can be put back on the shelf. */
export function ArchivedTrials({ trials, onRestore }: { trials: Trial[]; onRestore: (trial: Trial) => Promise<void> }) {
  if (trials.length === 0) return null;
  return (
    <section aria-labelledby="archived-heading" className="mt-10">
      <h2 id="archived-heading" className="font-serif text-xl font-semibold">
        Archived
      </h2>
      <ul className="mt-3 divide-y divide-line rounded-2xl bg-surface px-4 ring-1 ring-line/70">
        {trials.map(trial => (
          <li key={trial.id} className="flex min-h-14 items-center gap-3 py-2">
            <div className="min-w-0 flex-1">
              <Link href={`/trial/${trial.id}`} className="block truncate font-medium hover:text-primary">
                {trial.productName}
              </Link>
              <span className="block text-xs text-ink-muted">{trial.concerns.map(c => getConcern(c).label).join(' · ')}</span>
            </div>
            <button
              type="button"
              onClick={() => onRestore(trial)}
              aria-label={`Put ${trial.productName} back on shelf`}
              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-primary"
            >
              <ArrowCounterClockwise aria-hidden size={16} weight="bold" />
              Restore
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
