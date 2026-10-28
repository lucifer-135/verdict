'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { Camera, CaretRight, Sparkle, Warning } from '@phosphor-icons/react';
import { CompareSlider } from '@/components/CompareSlider';
import { Disclaimer } from '@/components/Disclaimer';
import { SampleBadge } from '@/components/SampleBadge';
import { TrendChart } from '@/components/TrendChart';
import { ButtonLink, Card, PageHeader } from '@/components/ui';
import { VerdictCard } from '@/components/VerdictCard';
import { useBlobUrl } from '@/lib/store/useBlobUrl';
import { chartData } from '@/lib/trials/chartData';
import { useTrialData } from '@/lib/trials/useTrialData';
import { baselineScan, evaluationDate } from '@/lib/trials/view';
import { getConcern, type ConcernId } from '@/lib/verdict/concerns';
import { computeVerdict } from '@/lib/verdict/engine';

type Pair = 'before-now' | 'now-goal';

function Section({ title, children, hint }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card className="mt-5">
      <h2 className="font-serif text-xl font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 mb-3 text-sm text-ink-muted">{hint}</p>}
      <div className={hint ? '' : 'mt-3'}>{children}</div>
    </Card>
  );
}

export default function TrialPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useTrialData(id);
  const [picked, setPicked] = useState<ConcernId | null>(null);
  const [pair, setPair] = useState<Pair>('before-now');
  const [showMask, setShowMask] = useState(false);

  const trial = data?.trial;
  const scans = data?.scans ?? [];
  const concern = picked ?? trial?.concerns[0] ?? null;
  const first = (trial && baselineScan(trial, scans)) ?? scans[0];
  const latest = scans[scans.length - 1];

  const firstPhoto = useBlobUrl(first?.photoBlobId);
  const latestPhoto = useBlobUrl(latest?.photoBlobId);
  const goalImage = useBlobUrl(trial?.goal?.imageBlobId);
  const firstMask = useBlobUrl(showMask && concern ? first?.maskBlobIds[concern] : null);
  const latestMask = useBlobUrl(showMask && concern ? latest?.maskBlobIds[concern] : null);

  if (data === undefined) return <div aria-busy="true" className="h-96 animate-pulse rounded-3xl bg-muted" />;
  if (data === null || !trial || !concern) {
    return <PageHeader back={{ href: '/', label: 'Shelf' }} title="Trial not found" subtitle="It may have been cleared from this browser." />;
  }

  const verdict = computeVerdict(trial, scans, data.allTrials, evaluationDate(trial, scans, new Date()));
  const series = chartData(trial, scans, verdict, concern);
  const canSimulate = trial.concerns.some(c => getConcern(c).simulable);
  const pairs: { key: Pair; label: string }[] = [
    { key: 'before-now', label: 'Before · Now' },
    ...(trial.goal ? [{ key: 'now-goal' as const, label: 'Now · Goal' }] : []),
  ];
  const compare =
    pair === 'now-goal' && trial.goal
      ? { left: { src: latestPhoto, label: 'Now', mask: latestMask }, right: { src: goalImage, label: 'Goal' } }
      : { left: { src: firstPhoto, label: 'Before', mask: firstMask }, right: { src: latestPhoto, label: 'Now', mask: latestMask } };

  return (
    <section className="animate-rise">
      <PageHeader
        back={{ href: '/', label: 'Shelf' }}
        eyebrow={
          verdict.daysIn >= 0
            ? `Day ${verdict.daysIn} · started ${format(parseISO(trial.startDate), 'MMM d')}`
            : `Starts ${format(parseISO(trial.startDate), 'MMM d')}`
        }
        title={
          <span className="inline-flex flex-wrap items-center gap-2 [overflow-wrap:anywhere]">
            {trial.productName}
            {trial.isSample && <SampleBadge />}
          </span>
        }
        subtitle={trial.concerns.map(c => getConcern(c).label).join(' · ')}
      />

      <VerdictCard verdict={verdict} />

      {!trial.isSample && (
        <ButtonLink href={`/scan?trial=${trial.id}&then=detail`} className="mt-4 w-full">
          <Camera aria-hidden size={20} weight="bold" />
          Check in now
        </ButtonLink>
      )}

      <Section title="Trend" hint="Raw scores from each scan. Moves inside the shaded band are normal scan noise.">
        {trial.concerns.length > 1 && (
          <div role="tablist" aria-label="Concern" className="mb-4 flex gap-1 rounded-xl bg-muted p-1">
            {trial.concerns.map(c => (
              <button
                key={c}
                role="tab"
                aria-selected={c === concern}
                onClick={() => setPicked(c)}
                className={`min-h-10 flex-1 cursor-pointer rounded-lg px-2 text-sm font-semibold transition-colors duration-150 ${
                  c === concern ? 'bg-surface text-ink shadow-soft' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {getConcern(c).label}
              </button>
            ))}
          </div>
        )}
        <TrendChart data={series} label={getConcern(concern).label} />
      </Section>

      {scans.length > 0 && (
        <Section title="Compare" hint="Drag the handle, or use the arrow keys.">
          <div className="mb-3 flex flex-col gap-2">
            <div role="radiogroup" aria-label="Photos to compare" className="flex gap-1 rounded-xl bg-muted p-1">
              {pairs.map(p => (
                <button
                  key={p.key}
                  role="radio"
                  aria-checked={pair === p.key}
                  onClick={() => setPair(p.key)}
                  className={`min-h-10 flex-1 cursor-pointer rounded-lg px-3 text-sm font-semibold whitespace-nowrap transition-colors duration-150 ${
                    pair === p.key ? 'bg-surface text-ink shadow-soft' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={showMask}
                onChange={e => setShowMask(e.target.checked)}
                className="size-5 cursor-pointer accent-[var(--color-primary)]"
              />
              Show {getConcern(concern).label.toLowerCase()}
            </label>
          </div>
          <CompareSlider left={compare.left} right={compare.right} />
          {!trial.goal && canSimulate && !trial.isSample && (
            <Link
              href={`/trial/${trial.id}/goal`}
              className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-semibold text-primary"
            >
              <Sparkle aria-hidden size={16} weight="bold" />
              Build your realistic goal
            </Link>
          )}
        </Section>
      )}

      {verdict.sideEffects.length > 0 && (
        <Section title="Side-effect watch" hint="Other concerns that got worse beyond normal scan noise since you started.">
          <ul className="space-y-2">
            {verdict.sideEffects.map(s => (
              <li key={s.concern} className="flex items-center gap-3 rounded-xl bg-rose-50 px-3 py-2.5 text-rose-900">
                <Warning aria-hidden size={18} weight="bold" />
                <span className="flex-1 font-medium">{getConcern(s.concern).label}</span>
                <span className="font-semibold tabular-nums">−{Math.round(Math.abs(s.delta))} pts</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Check-ins">
        {scans.length === 0 ? (
          <p className="text-sm text-ink-muted">No scans yet. Your first scan becomes the baseline.</p>
        ) : (
          <ol className="divide-y divide-line">
            {[...scans].reverse().map((s, i) => (
              <li key={s.id}>
                <Link href={`/scan/${s.id}`} className="flex min-h-12 items-center gap-3 py-2 hover:text-primary">
                  <span className="flex-1">
                    <span className="block font-medium">{format(new Date(s.takenAt), 'EEE, MMM d')}</span>
                    <span className="block text-xs text-ink-muted">
                      {i === scans.length - 1 ? 'Baseline' : s.source === 'import' ? 'Imported' : s.source === 'sample' ? 'Sample' : 'Check-in'}
                    </span>
                  </span>
                  {s.scores[concern] && (
                    <span className="text-sm tabular-nums text-ink-muted">
                      {getConcern(concern).label} {s.scores[concern]!.raw.toFixed(0)}
                    </span>
                  )}
                  <CaretRight aria-hidden size={16} className="text-ink-muted" />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Disclaimer />
    </section>
  );
}
