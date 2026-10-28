'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowRight, Camera, Check, Images } from '@phosphor-icons/react';
import { Button, PageHeader } from '@/components/ui';
import { saveTrial } from '@/lib/store/db';
import { TARGETABLE, type ConcernId } from '@/lib/verdict/concerns';
import type { Trial } from '@/lib/verdict/types';

const MAX_NAME = 60;
const MAX_CONCERNS = 3;

function DetailsStep({ onSaved }: { onSaved: (t: Trial) => void }) {
  const [name, setName] = useState('');
  const [concerns, setConcerns] = useState<ConcernId[]>([]);
  const [startDate, setStartDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const nameError = !name.trim() ? 'Name the product you are testing.' : null;
  const concernError = concerns.length === 0 ? 'Pick at least one thing it should improve.' : null;

  const toggle = (id: ConcernId) =>
    setConcerns(cs => (cs.includes(id) ? cs.filter(c => c !== id) : cs.length < MAX_CONCERNS ? [...cs, id] : cs));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (nameError) return document.getElementById('product')?.focus();
    if (concernError) return document.querySelector<HTMLButtonElement>('[aria-pressed]')?.focus();
    if (!startDate) return document.getElementById('start')?.focus();
    setSaving(true);
    const trial: Trial = {
      id: crypto.randomUUID(),
      productName: name.trim(),
      concerns,
      startDate,
      goal: null,
      createdAt: new Date().toISOString(),
      isSample: false,
      archived: false,
    };
    await saveTrial(trial);
    onSaved(trial);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-7">
      <div>
        <label htmlFor="product" className="mb-1.5 block font-semibold">
          Product
        </label>
        <input
          id="product"
          value={name}
          onChange={e => setName(e.target.value.slice(0, MAX_NAME))}
          placeholder="e.g. Niacinamide 10% serum"
          autoComplete="off"
          aria-invalid={submitted && !!nameError}
          aria-describedby="product-help"
          className="min-h-12 w-full rounded-xl bg-surface px-4 text-base ring-1 ring-line ring-inset placeholder:text-ink-muted/70 focus:ring-2 focus:ring-primary focus:outline-none"
        />
        <p id="product-help" className={`mt-1.5 text-sm ${submitted && nameError ? 'text-rose-700' : 'text-ink-muted'}`}>
          {submitted && nameError ? nameError : `${MAX_NAME - name.length} characters left`}
        </p>
      </div>

      <fieldset>
        <legend className="mb-1 font-semibold">What should it improve?</legend>
        <p id="concern-help" className={`mb-3 text-sm ${submitted && concernError ? 'text-rose-700' : 'text-ink-muted'}`}>
          {submitted && concernError ? concernError : `Pick up to ${MAX_CONCERNS}. Weeks shown are how long a fair verdict takes.`}
        </p>
        <div className="flex flex-wrap gap-2" aria-describedby="concern-help">
          {TARGETABLE.map(c => {
            const on = concerns.includes(c.id);
            const full = !on && concerns.length >= MAX_CONCERNS;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                disabled={full}
                onClick={() => toggle(c.id)}
                className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45 ${
                  on ? 'bg-primary text-on-primary' : 'bg-surface ring-1 ring-line ring-inset hover:bg-muted'
                }`}
              >
                {on && <Check aria-hidden size={14} weight="bold" />}
                {c.label}
                <span className={on ? 'text-on-primary/80' : 'text-ink-muted'}>· {c.windowDays! / 7} wk</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="start" className="mb-1.5 block font-semibold">
          Start date
        </label>
        <input
          id="start"
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          aria-describedby="start-help"
          className="min-h-12 w-full rounded-xl bg-surface px-4 text-base ring-1 ring-line ring-inset focus:ring-2 focus:ring-primary focus:outline-none"
        />
        <p id="start-help" className="mt-1.5 text-sm text-ink-muted">
          Already using it? Pick the day you began.
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        Continue
        <ArrowRight aria-hidden size={18} weight="bold" />
      </Button>
    </form>
  );
}

function BaselineStep({ trial }: { trial: Trial }) {
  const options = [
    {
      href: `/scan?trial=${trial.id}&then=goal`,
      icon: Camera,
      title: 'Scan now',
      body: 'A selfie in even light, glasses off. About 10 seconds.',
    },
    {
      href: `/import?trial=${trial.id}&then=goal`,
      icon: Images,
      title: 'Import past selfies',
      body: 'Started a while ago? Add dated photos from before or around day one.',
    },
  ];
  return (
    <div className="space-y-3">
      {options.map(({ href, icon: Glyph, title, body }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center gap-4 rounded-2xl bg-surface p-5 shadow-soft ring-1 ring-line/70 transition duration-200 hover:shadow-lift active:scale-[0.99]"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <Glyph aria-hidden size={24} weight="duotone" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{title}</span>
            <span className="block text-sm text-ink-muted">{body}</span>
          </span>
          <ArrowRight aria-hidden size={18} className="text-ink-muted" />
        </Link>
      ))}
    </div>
  );
}

export default function NewTrialPage() {
  const [trial, setTrial] = useState<Trial | null>(null);
  return (
    <section className="animate-rise">
      {trial ? (
        <>
          <PageHeader
            eyebrow="Step 2 of 3 · Baseline"
            title="Capture your starting point"
            subtitle={`Every verdict for ${trial.productName} is measured against this.`}
          />
          <BaselineStep trial={trial} />
        </>
      ) : (
        <>
          <PageHeader
            back={{ href: '/', label: 'Shelf' }}
            eyebrow="Step 1 of 3 · Details"
            title="Start a trial"
            subtitle="One product, the concerns it promises to fix."
          />
          <DetailsStep onSaved={setTrial} />
        </>
      )}
    </section>
  );
}
