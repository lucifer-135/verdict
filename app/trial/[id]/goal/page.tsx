'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CircleNotch, Sparkle, Target, WarningCircle } from '@phosphor-icons/react';
import { CompareSlider } from '@/components/CompareSlider';
import { Button, ButtonLink, Card, PageHeader } from '@/components/ui';
import { ScanError } from '@/lib/scan/poll';
import { GOAL_INTENSITY, runGoal } from '@/lib/scan/runGoal';
import { getBlob, saveTrial } from '@/lib/store/db';
import { useBlobUrl } from '@/lib/store/useBlobUrl';
import { useTrialData } from '@/lib/trials/useTrialData';
import { baselineScan } from '@/lib/trials/view';
import { getConcern } from '@/lib/verdict/concerns';
import type { Trial, TrialGoal } from '@/lib/verdict/types';

/** One goal build per trial, even if the effect runs twice (StrictMode) — each build spends units. */
const inflight = new Map<string, Promise<TrialGoal | null>>();
function buildGoal(trial: Trial, photo: Blob): Promise<TrialGoal | null> {
  let p = inflight.get(trial.id);
  if (!p) {
    p = runGoal(trial, photo).finally(() => inflight.delete(trial.id));
    inflight.set(trial.id, p);
  }
  return p;
}

type Phase = 'loading' | 'building' | 'ready' | 'unsupported' | 'no-baseline' | 'error';

export default function GoalPage() {
  const { id } = useParams<{ id: string }>();
  const { data, reload } = useTrialData(id);
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<ScanError | null>(null);
  const [attempt, setAttempt] = useState(0);

  const baseline = data ? baselineScan(data.trial, data.scans) : null;
  const before = useBlobUrl(baseline?.photoBlobId);
  const goalImage = useBlobUrl(data?.trial.goal?.imageBlobId);

  useEffect(() => {
    if (!data) return;
    const { trial } = data;
    if (trial.goal) return setPhase('ready');
    if (!trial.concerns.some(c => getConcern(c).simulable)) return setPhase('unsupported');
    if (!baseline) return setPhase('no-baseline');
    setPhase('building');
    (async () => {
      try {
        const photo = await getBlob(baseline.photoBlobId);
        if (!photo) throw new ScanError('missing_photo');
        const goal = await buildGoal(trial, photo);
        if (!goal) return setPhase('unsupported');
        await saveTrial({ ...trial, goal });
        await reload();
      } catch (e) {
        setError(e instanceof ScanError ? e : new ScanError('unknown'));
        setPhase('error');
      }
    })();
    // Re-run only when the trial loads/changes or the user retries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.trial.id, data?.trial.goal, attempt]);

  if (data === null) {
    return <PageHeader back={{ href: '/', label: 'Shelf' }} title="Trial not found" />;
  }
  const trial = data?.trial;
  const targets = trial?.concerns.filter(c => getConcern(c).simulable) ?? [];
  const continueLink = (
    <ButtonLink href={`/trial/${id}`} className="w-full">
      Continue
    </ButtonLink>
  );

  return (
    <section className="animate-rise">
      <PageHeader
        eyebrow="Step 3 of 3 · Goal"
        title="Your realistic goal"
        subtitle={
          trial
            ? `What ${targets.map(c => getConcern(c).label.toLowerCase()).join(' and ') || 'your skin'} could look like if ${trial.productName} works — simulated, not promised.`
            : undefined
        }
      />

      {(phase === 'loading' || phase === 'building') && (
        <Card aria-busy="true">
          <div className="flex items-center gap-3">
            <CircleNotch aria-hidden size={22} weight="bold" className="animate-spin text-primary" />
            <p className="font-semibold" aria-live="polite">
              {phase === 'building' ? 'Building your realistic goal…' : 'Loading…'}
            </p>
          </div>
          {phase === 'building' && (
            <p className="mt-2 text-sm text-ink-muted">
              YouCam Skin Simulation renders the improvement, then Skin Analysis scores it. About 15 seconds.
            </p>
          )}
        </Card>
      )}

      {phase === 'ready' && trial?.goal && (
        <>
          <CompareSlider left={{ src: before, label: 'Before' }} right={{ src: goalImage, label: 'Goal' }} />
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
            <Sparkle aria-hidden size={14} />
            Realistic goal at {GOAL_INTENSITY} intensity, simulated by YouCam Skin Simulation
          </p>
          <Card className="mt-5">
            <h2 className="mb-3 font-serif text-lg font-semibold">What we&apos;ll measure against</h2>
            <ul className="space-y-2.5">
              {targets.map(c => {
                const goal = trial.goal!.scores[c];
                const start = baseline?.scores[c]?.raw;
                return (
                  <li key={c} className="flex items-center gap-3">
                    <Target aria-hidden size={18} className="text-accent" weight="duotone" />
                    <span className="flex-1 font-medium">{getConcern(c).label}</span>
                    <span className="tabular-nums text-ink-muted">
                      {start !== undefined ? start.toFixed(0) : '—'} → <strong className="text-ink">{goal !== undefined ? goal.toFixed(0) : '—'}</strong>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-ink-muted">Raw skin scores, higher is healthier.</p>
          </Card>
          <div className="mt-6">{continueLink}</div>
        </>
      )}

      {phase === 'unsupported' && (
        <Card>
          <p className="font-semibold">No goal preview for these concerns</p>
          <p className="mt-1 mb-5 text-sm text-ink-muted">
            Skin Simulation doesn&apos;t cover hydration, firmness or tear trough. Your verdict still works without it.
          </p>
          {continueLink}
        </Card>
      )}

      {phase === 'no-baseline' && (
        <Card>
          <p className="font-semibold">Add a baseline first</p>
          <p className="mt-1 mb-5 text-sm text-ink-muted">The goal is simulated from your starting photo.</p>
          <ButtonLink href={`/scan?trial=${id}&then=goal`} className="w-full">
            Scan now
          </ButtonLink>
        </Card>
      )}

      {phase === 'error' && (
        <Card role="alert">
          <div className="flex items-start gap-3">
            <WarningCircle aria-hidden size={24} weight="duotone" className="mt-0.5 shrink-0 text-rose-700" />
            <div>
              <p className="font-semibold">{error?.friendly}</p>
              <p className="mt-1 text-sm text-ink-muted">You can try again or skip the goal preview.</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <Button className="w-full" onClick={() => setAttempt(a => a + 1)}>
              Try again
            </Button>
            <ButtonLink href={`/trial/${id}`} variant="secondary" className="w-full">
              Skip for now
            </ButtonLink>
          </div>
        </Card>
      )}
    </section>
  );
}
