'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Disclaimer } from '@/components/Disclaimer';
import { ScoreList } from '@/components/ScoreList';
import { Button, ButtonLink, Card, PageHeader } from '@/components/ui';
import { deleteScan, getScan } from '@/lib/store/db';
import { useBlobUrl } from '@/lib/store/useBlobUrl';
import { getConcern, type ConcernId } from '@/lib/verdict/concerns';
import type { Scan } from '@/lib/verdict/types';

const SOURCE: Record<Scan['source'], string> = { camera: 'Camera', import: 'Imported', sample: 'Sample' };

export default function ScanReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [scan, setScan] = useState<Scan | null | undefined>(undefined);
  const [selected, setSelected] = useState<ConcernId | null>(null);
  const photo = useBlobUrl(scan?.photoBlobId);
  const mask = useBlobUrl(selected ? scan?.maskBlobIds[selected] : null);

  useEffect(() => {
    getScan(id).then(
      s => setScan(s ?? null),
      () => setScan(null),
    );
  }, [id]);

  if (scan === undefined) return <div aria-busy="true" className="h-96 animate-pulse rounded-3xl bg-muted" />;
  if (scan === null) {
    return (
      <section>
        <PageHeader back={{ href: '/', label: 'Shelf' }} title="Scan not found" subtitle="It may have been cleared from this browser." />
      </section>
    );
  }

  const withMask = new Set(Object.keys(scan.maskBlobIds) as ConcernId[]);

  return (
    <section className="animate-rise">
      <PageHeader
        back={{ href: '/', label: 'Shelf' }}
        eyebrow={`${format(new Date(scan.takenAt), 'MMM d, yyyy')} · ${SOURCE[scan.source]}`}
        title="Skin report"
      />

      <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-muted shadow-lift">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL
          <img src={photo} alt="Your scan photo" className="h-full w-full object-cover" />
        )}
        {selected && mask && (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL
          <img
            src={mask}
            alt={`${getConcern(selected).label} map`}
            className="absolute inset-0 h-full w-full object-cover mix-blend-multiply"
          />
        )}
        {selected && (
          <p className="absolute inset-x-0 bottom-4 mx-auto w-fit rounded-full bg-ink/60 px-3 py-1.5 text-sm font-medium text-white backdrop-blur">
            Showing {getConcern(selected).label.toLowerCase()}
          </p>
        )}
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
        {[
          ['Overall', scan.overall !== null ? Math.round(scan.overall) : '—'],
          ['Skin age', scan.skinAge ?? '—'],
          ['Skin type', scan.skinType ?? '—'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-surface px-2 py-3 shadow-soft ring-1 ring-line/70">
            <dt className="text-xs text-ink-muted">{label}</dt>
            <dd
              className={`font-serif font-semibold tabular-nums ${
                typeof value === 'string' && value !== '—' ? 'mt-1 text-base leading-tight' : 'text-2xl'
              }`}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <Card className="mt-5">
        <h2 className="mb-1 font-serif text-xl font-semibold">By concern</h2>
        <p className="mb-3 text-sm text-ink-muted">Lowest first. Tap a row to see where it shows on your face.</p>
        <ScoreList
          scores={scan.scores}
          withMask={withMask}
          selected={selected}
          onSelect={c => setSelected(s => (s === c ? null : c))}
        />
      </Card>

      {scan.source !== 'sample' && (
        <Button
          variant="ghost"
          className="mt-6 w-full text-rose-700 hover:bg-rose-50"
          onClick={async () => {
            if (!window.confirm('Delete this scan? It will be removed from every trial. This cannot be undone.')) return;
            await deleteScan(scan.id);
            router.push('/');
          }}
        >
          Delete this scan
        </Button>
      )}

      <ButtonLink href="/" variant="secondary" className="mt-3 w-full">
        Back to shelf
      </ButtonLink>
      <Disclaimer />
    </section>
  );
}
