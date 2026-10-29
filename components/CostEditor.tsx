'use client';

import { useState } from 'react';
import { CurrencyDollar } from '@phosphor-icons/react';
import { costLine, parseCost } from '@/lib/trials/cost';
import type { TrialCost, VerdictKind } from '@/lib/verdict/types';
import { CostInputs } from './CostInputs';
import { Button } from './ui';

export const DEFAULT_WEEKS_PER_UNIT = '8';

/** Shows what the product costs for this verdict, and lets the user add or change the price. */
export function CostEditor({
  cost,
  verdict,
  onSave,
  readOnly = false,
}: {
  cost: TrialCost | null;
  verdict: VerdictKind;
  onSave: (cost: TrialCost | null) => Promise<void>;
  /** The sample journey shows its cost but cannot be edited. */
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState('');
  const [weeks, setWeeks] = useState(DEFAULT_WEEKS_PER_UNIT);
  const [error, setError] = useState<string | null>(null);

  const open = () => {
    setPrice(cost ? String(cost.price) : '');
    setWeeks(cost ? String(cost.weeksPerUnit) : DEFAULT_WEEKS_PER_UNIT);
    setError(null);
    setEditing(true);
  };

  if (editing) {
    return (
      <div className="mt-4 rounded-2xl bg-surface p-4 shadow-soft ring-1 ring-line/70">
        <CostInputs price={price} weeks={weeks} onPrice={setPrice} onWeeks={setWeeks} error={error} />
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={async () => {
              const parsed = parseCost(price, weeks);
              if (parsed.error) return setError(parsed.error);
              await onSave(parsed.cost);
              setEditing(false);
            }}
          >
            Save price
          </Button>
        </div>
      </div>
    );
  }

  if (!cost) {
    return (
      <Button variant="ghost" className="mt-2 w-full" onClick={open}>
        <CurrencyDollar aria-hidden size={18} weight="bold" />
        Add product price
      </Button>
    );
  }

  return (
    <div className="mt-4 flex items-center gap-3 rounded-2xl bg-primary-soft px-4 py-3">
      <CurrencyDollar aria-hidden size={20} weight="bold" className="shrink-0 text-primary" />
      <p className="flex-1 text-sm font-medium text-ink">{costLine(verdict, cost)}</p>
      {!readOnly && (
        <button type="button" onClick={open} className="min-h-11 cursor-pointer rounded-lg px-2 text-sm font-semibold text-primary">
          Edit price
        </button>
      )}
    </div>
  );
}
