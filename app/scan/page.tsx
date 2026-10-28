'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowsClockwise, Check, CircleNotch, WarningCircle } from '@phosphor-icons/react';
import { CameraCapture } from '@/components/CameraCapture';
import { Button, Card, PageHeader } from '@/components/ui';
import { createGate } from '@/lib/scan/gate';
import { ScanError } from '@/lib/scan/poll';
import { resumeScan, runScan, type ScanStatus } from '@/lib/scan/runScan';
import { getTrial } from '@/lib/store/db';
import type { Trial } from '@/lib/verdict/types';

const STEPS: { status: ScanStatus; label: string }[] = [
  { status: 'preparing', label: 'Preparing photo…' },
  { status: 'uploading', label: 'Uploading…' },
  { status: 'analyzing', label: 'Analyzing your skin…' },
  { status: 'saving', label: 'Saving…' },
];

const TIPS = ['Face a window or soft light', 'Glasses off, hair off your forehead', 'Bare skin, neutral expression'];

type Phase =
  | { kind: 'capture' }
  | { kind: 'working'; status: ScanStatus }
  | { kind: 'error'; error: ScanError; file: Blob };

function Progress({ status }: { status: ScanStatus }) {
  const current = STEPS.findIndex(s => s.status === status);
  return (
    <Card className="animate-rise">
      <p className="sr-only" aria-live="polite">
        {STEPS[current].label}
      </p>
      <ol className="space-y-3">
        {STEPS.map((s, i) => (
          <li key={s.status} className={`flex items-center gap-3 ${i > current ? 'text-ink-muted/60' : ''}`}>
            <span className="grid size-7 place-items-center rounded-full bg-muted">
              {i < current ? (
                <Check aria-hidden size={14} weight="bold" className="text-primary" />
              ) : i === current ? (
                <CircleNotch aria-hidden size={16} weight="bold" className="animate-spin text-primary" />
              ) : null}
            </span>
            <span className={i === current ? 'font-semibold' : ''}>{s.label}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-ink-muted">Usually under 10 seconds.</p>
    </Card>
  );
}

function ScanFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const trialId = params.get('trial');
  const then = params.get('then');
  const [trial, setTrial] = useState<Trial | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'capture' });
  const gate = useRef(createGate());

  useEffect(() => {
    if (trialId) getTrial(trialId).then(t => setTrial(t ?? null));
  }, [trialId]);

  function run(file: Blob, resumeTaskId?: string) {
    return gate.current.run(() => scan(file, resumeTaskId));
  }

  async function scan(file: Blob, resumeTaskId?: string) {
    const opts = { source: 'camera' as const, onStatus: (status: ScanStatus) => setPhase({ kind: 'working', status }) };
    try {
      setPhase({ kind: 'working', status: resumeTaskId ? 'analyzing' : 'preparing' });
      const scan = resumeTaskId ? await resumeScan(resumeTaskId, file, opts) : await runScan(file, opts);
      if (trialId && then === 'goal') router.push(`/trial/${trialId}/goal`);
      else if (trialId) router.push(`/trial/${trialId}`);
      else router.push(`/scan/${scan.id}`);
    } catch (e) {
      setPhase({ kind: 'error', error: e instanceof ScanError ? e : new ScanError('unknown'), file });
    }
  }

  const baseline = then === 'goal';
  // These failures happen after the task was created, so the result may still arrive.
  const resumable = phase.kind === 'error' && !!phase.error.taskId && ['poll_timeout', 'network_error'].includes(phase.error.code);
  return (
    <section>
      <PageHeader
        back={{ href: trialId && !baseline ? `/trial/${trialId}` : '/', label: trialId && !baseline ? 'Trial' : 'Shelf' }}
        eyebrow={baseline ? 'Step 2 of 3 · Baseline' : trial ? `Check-in · ${trial.productName}` : 'Check-in'}
        title={baseline ? 'Baseline scan' : 'Weekly check-in'}
        subtitle="Same light and framing each time keeps the comparison fair."
      />

      {phase.kind === 'capture' && (
        <>
          <ul className="mb-4 flex flex-wrap gap-2">
            {TIPS.map(t => (
              <li key={t} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-ink-muted">
                {t}
              </li>
            ))}
          </ul>
          <CameraCapture onCapture={file => run(file)} />
        </>
      )}

      {phase.kind === 'working' && <Progress status={phase.status} />}

      {phase.kind === 'error' && (
        <Card className="animate-rise" role="alert">
          <div className="flex items-start gap-3">
            <WarningCircle aria-hidden size={24} weight="duotone" className="mt-0.5 shrink-0 text-rose-700" />
            <div>
              <p className="font-semibold">{phase.error.friendly}</p>
              <p className="mt-1 text-sm text-ink-muted">
                {resumable
                  ? 'Your scan may still be processing. You can keep waiting for it.'
                  : phase.error.code === 'save_failed'
                    ? 'The analysis may have used units. Check that this browser allows site storage, then retake.'
                    : 'Nothing was saved. Try again with the tips above.'}
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {resumable && (
              <Button className="w-full" onClick={() => run(phase.file, phase.error.taskId)}>
                <ArrowsClockwise aria-hidden size={18} weight="bold" />
                Keep waiting
              </Button>
            )}
            <Button
              variant={resumable ? 'secondary' : 'primary'}
              className="w-full"
              onClick={() => setPhase({ kind: 'capture' })}
            >
              Retake
            </Button>
          </div>
        </Card>
      )}
    </section>
  );
}

export default function ScanPage() {
  return (
    <Suspense>
      <ScanFlow />
    </Suspense>
  );
}
