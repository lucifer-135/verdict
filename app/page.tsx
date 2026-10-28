'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarCheck, Camera, Scales } from '@phosphor-icons/react';
import { Disclaimer } from '@/components/Disclaimer';
import { TrialCard } from '@/components/TrialCard';
import { Button, ButtonLink, PageHeader } from '@/components/ui';
import { VerdictChip } from '@/components/VerdictChip';
import { hasSampleJourney, loadSampleJourney } from '@/lib/sample/load';
import { listScans, listTrials } from '@/lib/store/db';
import { activeTrials, evaluationDate, nextCheckIn, scansForTrial } from '@/lib/trials/view';
import { computeVerdict } from '@/lib/verdict/engine';
import type { Scan, Trial } from '@/lib/verdict/types';

const STEPS = [
  { icon: Camera, title: 'Scan a baseline', body: 'One selfie when you start a product.' },
  { icon: CalendarCheck, title: 'Check in weekly', body: 'A quick scan each week, same light.' },
  { icon: Scales, title: 'Get a verdict', body: 'Keep going, give it time, or stop.' },
];

function EmptyShelf() {
  return (
    <section className="animate-rise">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">Skincare, judged by your skin</p>
      <h1 className="font-serif text-[2.4rem] leading-[1.08] font-semibold text-balance">
        Is your skincare actually working?
      </h1>
      <p className="mt-3 text-base leading-relaxed text-ink-muted">
        Verdict measures the concern a product promises to fix, scan after scan, and tells you when the change is real —
        or when to stop paying for it.
      </p>

      <figure className="mt-6 rounded-2xl bg-surface p-4 shadow-lift ring-1 ring-line/70" aria-label="Example verdict">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-serif text-lg font-semibold">Niacinamide serum</p>
            <p className="text-sm text-ink-muted">Oiliness · Pores</p>
          </div>
          <VerdictChip kind="working" />
        </div>
        <figcaption className="mt-3 border-t border-line pt-3 text-sm leading-relaxed">
          Oiliness improved 6 pts in 5 weeks, above normal scan noise (±3). Keep going.
          <span className="ml-1 text-xs text-ink-muted">— example</span>
        </figcaption>
      </figure>

      <ol className="mt-8 space-y-3">
        {STEPS.map(({ icon: Glyph, title, body }, i) => (
          <li key={title} className="flex items-center gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <Glyph aria-hidden size={22} weight="duotone" />
            </span>
            <div>
              <p className="font-semibold">
                <span className="sr-only">Step {i + 1}: </span>
                {title}
              </p>
              <p className="text-sm text-ink-muted">{body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 space-y-3">
        <ButtonLink href="/trial/new" className="w-full">
          Start a trial
        </ButtonLink>
        <SampleButton variant="secondary" />
      </div>
      <Disclaimer />
    </section>
  );
}

function SampleButton({ variant }: { variant: 'secondary' | 'ghost' }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!hasSampleJourney()) return null;
  return (
    <>
      <Button
        variant={variant}
        className="w-full"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setFailed(false);
          try {
            router.push(`/trial/${await loadSampleJourney()}`);
          } catch {
            setLoading(false);
            setFailed(true);
          }
        }}
      >
        {loading ? 'Loading sample…' : 'View sample journey'}
      </Button>
      {failed && (
        <p role="alert" className="text-center text-sm text-rose-700">
          The sample could not be loaded. Please check your connection and try again.
        </p>
      )}
    </>
  );
}

function ShelfSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your shelf" className="space-y-4 pt-2">
      <div className="h-9 w-2/3 animate-pulse rounded-lg bg-muted" />
      {[0, 1].map(i => (
        <div key={i} className="h-36 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}

export default function ShelfPage() {
  const [data, setData] = useState<{ trials: Trial[]; scans: Scan[] } | null>(null);

  useEffect(() => {
    Promise.all([listTrials(), listScans()])
      .then(([trials, scans]) => setData({ trials, scans }))
      .catch(() => setData({ trials: [], scans: [] }));
  }, []);

  if (!data) return <ShelfSkeleton />;
  const trials = activeTrials(data.trials);
  if (trials.length === 0) return <EmptyShelf />;

  const today = new Date();
  const hasRealTrial = trials.some(t => !t.isSample);

  return (
    <section>
      <PageHeader eyebrow="Your shelf" title="What you're testing" />
      <ul className="space-y-4">
        {trials.map((trial, i) => {
          const scans = scansForTrial(trial, data.scans);
          return (
            <li key={trial.id} className="animate-rise" style={{ animationDelay: `${i * 40}ms` }}>
              <TrialCard
                trial={trial}
                verdict={computeVerdict(trial, scans, data.trials, evaluationDate(trial, scans, today))}
                nextCheckIn={nextCheckIn(scans, today)}
              />
            </li>
          );
        })}
      </ul>
      <div className="mt-8 space-y-3">
        {hasRealTrial && (
          <ButtonLink href="/scan" className="w-full">
            <Camera aria-hidden size={20} weight="bold" />
            Check in now
          </ButtonLink>
        )}
        <ButtonLink href="/trial/new" variant={hasRealTrial ? 'secondary' : 'primary'} className="w-full">
          Start {hasRealTrial ? 'another' : 'a'} trial
        </ButtonLink>
        {!trials.some(t => t.isSample) && <SampleButton variant="ghost" />}
      </div>
      <Disclaimer />
    </section>
  );
}
