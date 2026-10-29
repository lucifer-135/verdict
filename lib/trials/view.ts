import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns';
import { BASELINE_LAST_DAY, BASELINE_LOOKBACK_DAYS } from '@/lib/verdict/engine';
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

/** Archived trials, newest first. They stay stored so they can be put back on the shelf. */
export function archivedTrials(all: Trial[]): Trial[] {
  return all.filter(t => t.archived).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * The scan that represents this trial's starting point: the latest one in
 * [start − 14 days, start + 3 days], else the first one after that window.
 * Scans belong to the person, so the oldest scan overall may predate the trial.
 */
export function baselineScan(trial: Trial, scans: Scan[]): Scan | null {
  const start = parseISO(trial.startDate);
  const dated = [...scans]
    .sort((a, b) => a.takenAt.localeCompare(b.takenAt))
    .map(s => ({ s, day: differenceInCalendarDays(new Date(s.takenAt), start) }))
    .filter(x => x.day >= -BASELINE_LOOKBACK_DAYS);
  const inWindow = dated.filter(x => x.day <= BASELINE_LAST_DAY);
  return (inWindow.length ? inWindow[inWindow.length - 1] : dated[0])?.s ?? null;
}

/** The date a trial is judged at: the sample stays frozen at its last scan; real trials use now. */
export function evaluationDate(trial: Trial, scans: Scan[], now: Date): Date {
  if (!trial.isSample || scans.length === 0) return now;
  return new Date(scans.reduce((a, b) => (a.takenAt > b.takenAt ? a : b)).takenAt);
}

/** The newest real (camera or imported) scan: the photo the camera guide lines up against. */
export function latestRealScan(scans: Scan[]): Scan | null {
  return scans.filter(s => s.source !== 'sample').reduce<Scan | null>((a, b) => (!a || b.takenAt > a.takenAt ? b : a), null);
}
