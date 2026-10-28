import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { ConcernId } from '@/lib/verdict/concerns';
import type { Scan, Trial, VerdictResult } from '@/lib/verdict/types';

export interface ChartData {
  points: { day: number; raw: number }[];
  baseline: number | null;
  /** Baseline ± noise: changes inside this band count as no change. */
  band: [number, number] | null;
  goal: number | null;
}

/** Trend-chart series for one concern of a trial: raw score by day since start. */
export function chartData(trial: Trial, scans: Scan[], v: VerdictResult, concern: ConcernId): ChartData {
  const start = parseISO(trial.startDate);
  const points = scans
    .filter(s => s.scores[concern])
    .sort((a, b) => a.takenAt.localeCompare(b.takenAt))
    .map(s => ({ day: differenceInCalendarDays(new Date(s.takenAt), start), raw: s.scores[concern]!.raw }));
  const c = v.perConcern.find(p => p.concern === concern);
  const baseline = c?.baseline ?? null;
  return {
    points,
    baseline,
    band: baseline !== null && c ? [baseline - c.noise, baseline + c.noise] : null,
    goal: c?.goal ?? trial.goal?.scores[concern] ?? null,
  };
}
