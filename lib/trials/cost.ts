import type { TrialCost, VerdictKind } from '@/lib/verdict/types';

const WEEKS_PER_MONTH = 52 / 12;
const MAX_PRICE = 10_000;
const PRICE_ERROR = 'Enter a price greater than $0.';
const WEEKS_ERROR = 'Enter how many weeks one bottle lasts, from 1 to 52.';

export function monthlyCost(cost: TrialCost): number {
  return (cost.price / cost.weeksPerUnit) * WEEKS_PER_MONTH;
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function formatUsd(amount: number): string {
  return amount < 1 ? 'under $1' : usd.format(Math.round(amount));
}

/** One sentence about money that matches the verdict: savings when stopping makes sense. */
export function costLine(kind: VerdictKind, cost: TrialCost): string {
  const perMonth = formatUsd(monthlyCost(cost));
  if (kind === 'not_moving' || kind === 'pause') return `Stopping saves about ${perMonth} a month.`;
  if (kind === 'working') return `It costs about ${perMonth} a month, and it is working.`;
  return `It costs about ${perMonth} a month while you wait for a fair verdict.`;
}

/** Read the two form fields. The price is optional; when it is empty there is no cost. */
export function parseCost(price: string, weeks: string): { cost: TrialCost | null; error: string | null } {
  if (!price.trim()) return { cost: null, error: null };
  const amount = Number(price.trim());
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_PRICE) return { cost: null, error: PRICE_ERROR };
  const weeksPerUnit = Number(weeks.trim());
  if (!Number.isInteger(weeksPerUnit) || weeksPerUnit < 1 || weeksPerUnit > 52) return { cost: null, error: WEEKS_ERROR };
  return { cost: { price: amount, weeksPerUnit }, error: null };
}
