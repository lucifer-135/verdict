import { addDays, differenceInCalendarDays, format, startOfDay } from 'date-fns';
import type { Scan, Trial } from '@/lib/verdict/types';

/** Days between check-ins (plan decision; spec leaves the cadence open). */
export const CHECK_IN_DAYS = 7;

/** A real trial sees only real scans; the sample trial sees only sample scans. */
export function scansForTrial(trial: Trial, all: Scan[]): Scan[] {
  return all.filter(s => (trial.isSample ? s.source === 'sample' : s.source !== 'sample'));
}

/** "Today" when a check-in is due, else the due date ("Sep 8"); null before any scan. */
export function nextCheckIn(scans: Scan[], today: Date): string | null {
  if (scans.length === 0) return null;
  const last = scans.reduce((a, b) => (a.takenAt > b.takenAt ? a : b));
  const due = addDays(startOfDay(new Date(last.takenAt)), CHECK_IN_DAYS);
  return differenceInCalendarDays(due, today) <= 0 ? 'Today' : format(due, 'MMM d');
}

/** Non-archived trials, newest first, with the sample trial last. */
export function activeTrials(all: Trial[]): Trial[] {
  return all
    .filter(t => !t.archived)
    .sort((a, b) => Number(a.isSample) - Number(b.isSample) || b.createdAt.localeCompare(a.createdAt));
}
