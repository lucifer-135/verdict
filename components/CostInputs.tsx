'use client';

const INPUT =
  'min-h-12 w-full rounded-xl bg-surface px-4 text-base ring-1 ring-line ring-inset focus:ring-2 focus:ring-primary focus:outline-none';

/** The two optional price fields, shared by the new-trial form and the trial page. */
export function CostInputs({
  price,
  weeks,
  onPrice,
  onWeeks,
  error,
}: {
  price: string;
  weeks: string;
  onPrice: (v: string) => void;
  onWeeks: (v: string) => void;
  error: string | null;
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Price ($)</span>
          <input
            inputMode="decimal"
            value={price}
            onChange={e => onPrice(e.target.value)}
            placeholder="e.g. 24"
            className={INPUT}
            aria-invalid={!!error}
            aria-describedby="cost-help"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">One bottle lasts about (weeks)</span>
          <input
            inputMode="numeric"
            value={weeks}
            onChange={e => onWeeks(e.target.value)}
            className={INPUT}
            aria-invalid={!!error}
            aria-describedby="cost-help"
          />
        </label>
      </div>
      <p id="cost-help" className={`mt-1.5 text-sm ${error ? 'text-rose-700' : 'text-ink-muted'}`}>
        {error ?? 'Optional. Used to show the monthly cost and how much stopping would save.'}
      </p>
    </div>
  );
}
