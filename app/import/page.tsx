'use client';

import { Suspense, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Check, CircleNotch, Copy, Images, WarningCircle } from '@phosphor-icons/react';
import { Button, Card, PageHeader, buttonClass } from '@/components/ui';
import { buildQueue, runQueue, withDate, type ImportItem, type ImportStatus } from '@/lib/scan/importQueue';

/** SD skin analysis with all 16 concerns (docs/youcam-api-notes.md). */
const UNITS_PER_SCAN = 16;

const STATUS: Record<ImportStatus, { label: string; className: string }> = {
  needs_date: { label: 'Needs a date', className: 'bg-amber-50 text-amber-800' },
  ready: { label: 'Ready', className: 'bg-primary-soft text-primary' },
  duplicate: { label: 'Already imported — skipped', className: 'bg-muted text-ink-muted' },
  scanning: { label: 'Scanning…', className: 'bg-primary-soft text-primary' },
  done: { label: 'Added', className: 'bg-emerald-50 text-emerald-800' },
  failed: { label: 'Failed', className: 'bg-rose-50 text-rose-800' },
};

function Thumb({ file }: { file: Blob }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  // eslint-disable-next-line @next/next/no-img-element -- local object URL
  return <img src={url} alt="" className="size-14 shrink-0 rounded-xl object-cover" />;
}

function StatusIcon({ status }: { status: ImportStatus }) {
  if (status === 'scanning') return <CircleNotch aria-hidden size={12} weight="bold" className="animate-spin" />;
  if (status === 'done') return <Check aria-hidden size={12} weight="bold" />;
  if (status === 'failed') return <WarningCircle aria-hidden size={12} weight="bold" />;
  if (status === 'duplicate') return <Copy aria-hidden size={12} weight="bold" />;
  return null;
}

function ImportFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const trialId = params.get('trial');
  const then = params.get('then');
  const [items, setItems] = useState<ImportItem[]>([]);
  const [reading, setReading] = useState(false);
  const [phase, setPhase] = useState<'pick' | 'scanning' | 'finished'>('pick');

  const ready = items.filter(i => i.status === 'ready').length;
  const undated = items.filter(i => i.status === 'needs_date').length;
  const added = items.filter(i => i.status === 'done').length;
  const nextHref = trialId ? (then === 'goal' ? `/trial/${trialId}/goal` : `/trial/${trialId}`) : '/';

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    setReading(true);
    const queue = await buildQueue(files.map(file => ({ file, name: file.name })));
    // A photo picked again in a later batch is a duplicate of the earlier pick too.
    const known = new Set(items.map(i => i.hash));
    const fresh = queue.map(i => (known.has(i.hash) ? { ...i, status: 'duplicate' as const } : i));
    setItems(prev => [...prev, ...fresh].sort((a, b) => (a.takenAt ?? '9').localeCompare(b.takenAt ?? '9')));
    setReading(false);
  }

  async function scanAll() {
    setPhase('scanning');
    await runQueue(items, setItems);
    setPhase('finished');
  }

  return (
    <section className="animate-rise">
      <PageHeader
        back={{ href: trialId ? `/trial/${trialId}` : '/', label: trialId ? 'Trial' : 'Shelf' }}
        eyebrow={then === 'goal' ? 'Step 2 of 3 · Baseline' : 'Import'}
        title="Import past selfies"
        subtitle="Dated photos become check-ins on your timeline. We read the date from the photo when we can."
      />

      {phase === 'pick' && (
        <label className={buttonClass(items.length ? 'secondary' : 'primary', 'w-full has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-primary has-[:focus-visible]:outline-offset-2')}>
          {reading ? <CircleNotch aria-hidden size={20} weight="bold" className="animate-spin" /> : <Images aria-hidden size={20} weight="bold" />}
          {reading ? 'Reading photos…' : items.length ? 'Add more photos' : 'Choose photos'}
          <input type="file" accept="image/*" multiple className="sr-only" onChange={pick} disabled={reading} />
        </label>
      )}

      {items.length > 0 && (
        <Card className="mt-5 p-3">
          <ul className="divide-y divide-line" aria-live="polite">
            {items.map((item, idx) => {
              const s = STATUS[item.status];
              return (
                <li key={`${item.hash}-${idx}`} className="flex items-center gap-3 p-2">
                  <Thumb file={item.file} />
                  <div className="min-w-0 flex-1">
                    {item.status === 'needs_date' ? (
                      <label className="block text-sm">
                        <span className="mb-1 block font-medium">When was this taken? Choose the date, then tap outside the field.</span>
                        <input
                          type="date"
                          max={format(new Date(), 'yyyy-MM-dd')}
                          onBlur={e => {
                            const value = e.target.value;
                            if (value) setItems(list => list.map((x, j) => (j === idx ? withDate(x, value) : x)));
                          }}
                          className="min-h-11 w-full rounded-lg bg-surface px-3 text-base ring-1 ring-line ring-inset focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                      </label>
                    ) : (
                      <p className="font-medium">{item.takenAt ? format(new Date(item.takenAt), 'EEE, MMM d, yyyy') : item.name}</p>
                    )}
                    <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${s.className}`}>
                      <StatusIcon status={item.status} />
                      {s.label}
                    </span>
                    {item.error && <p className="mt-1 text-xs text-rose-700">{item.error}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {phase === 'pick' && items.length > 0 && (
        <div className="mt-5">
          {undated > 0 && (
            <p className="mb-2 text-sm text-ink-muted">
              Add a date to include {undated} more photo{undated > 1 ? 's' : ''}.
            </p>
          )}
          <Button className="w-full" disabled={ready === 0} onClick={scanAll}>
            Scan {ready} photo{ready === 1 ? '' : 's'} · {ready * UNITS_PER_SCAN} units
          </Button>
        </div>
      )}

      {phase === 'scanning' && (
        <p className="mt-5 flex items-center justify-center gap-2 text-sm text-ink-muted">
          <CircleNotch aria-hidden size={16} weight="bold" className="animate-spin" />
          Scanning one at a time — keep this page open.
        </p>
      )}

      {phase === 'finished' && (
        <div className="mt-5 space-y-3">
          <p className="text-center text-sm text-ink-muted" role="status">
            {added} photo{added === 1 ? '' : 's'} added to your timeline.
          </p>
          <Button className="w-full" onClick={() => router.push(nextHref)}>
            Continue
          </Button>
        </div>
      )}
    </section>
  );
}

export default function ImportPage() {
  return (
    <Suspense>
      <ImportFlow />
    </Suspense>
  );
}
