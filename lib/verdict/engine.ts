import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { TARGETABLE, getConcern, type ConcernId } from './concerns';
import type { ConcernVerdict, Scan, SideEffect, Trial, VerdictKind, VerdictResult } from './types';

export const NOISE_DEFAULT = 3;
/** Scans up to this many days after the start date count as baseline. */
const BASELINE_LAST_DAY = 3;
/** No verdict other than Pause before this many days. */
const MIN_DAYS = 14;
const PAUSE_ADVICE = 'Possible irritation. Consider pausing; see a dermatologist if it persists.';

interface Point {
  day: number;
  raw: number;
}

interface Series {
  concern: ConcernId;
  hasData: boolean;
  baseline: number | null;
  noise: number;
  delta: number | null;
  slope: number | null;
  postCount: number;
  /** Day of the fallback baseline scan when no scan falls inside the baseline window. */
  lateDay: number | null;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const pts = (delta: number) => Math.round(Math.abs(delta));
const fmtNoise = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const fmtDate = (d: Date) => format(d, 'MMM d');

function leastSquaresSlope(points: Point[]): number | null {
  if (new Set(points.map(p => p.day)).size < 2) return null;
  const mx = mean(points.map(p => p.day));
  const my = mean(points.map(p => p.raw));
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.day - mx) * (p.raw - my);
    den += (p.day - mx) ** 2;
  }
  return num / den;
}

function analyze(concern: ConcernId, scans: Scan[], start: Date): Series {
  const points = scans
    .filter(s => s.scores[concern])
    .sort((a, b) => a.takenAt.localeCompare(b.takenAt))
    .map(s => ({ day: differenceInCalendarDays(new Date(s.takenAt), start), raw: s.scores[concern]!.raw }));

  if (points.length === 0) {
    return { concern, hasData: false, baseline: null, noise: NOISE_DEFAULT, delta: null, slope: null, postCount: 0, lateDay: null };
  }

  let base = points.filter(p => p.day <= BASELINE_LAST_DAY);
  let post = points.filter(p => p.day > BASELINE_LAST_DAY);
  let lateDay: number | null = null;
  if (base.length === 0) {
    base = [points[0]];
    post = points.slice(1);
    lateDay = points[0].day;
  }

  const baseRaws = base.map(p => p.raw);
  const baseline = mean(baseRaws);
  const noise = base.length >= 2 ? Math.max(NOISE_DEFAULT, Math.max(...baseRaws) - Math.min(...baseRaws)) : NOISE_DEFAULT;
  const lastTwo = post.slice(-2).map(p => p.raw);
  const delta = lastTwo.length ? mean(lastTwo) - baseline : null;

  return {
    concern,
    hasData: true,
    baseline,
    noise,
    delta,
    slope: leastSquaresSlope([...base, ...post]),
    postCount: post.length,
    lateDay,
  };
}

/** Rules 3–5 of spec §4.5 for one target, once Pause and Too early are ruled out. */
function settledKind(s: Series, daysIn: number): { kind: VerdictKind; trendingDown: boolean } {
  const window = getConcern(s.concern).windowDays ?? MIN_DAYS;
  const delta = s.delta ?? 0;
  if (delta >= s.noise && (s.slope ?? 0) > 0) return { kind: 'working', trendingDown: false };
  if (daysIn < window) return { kind: 'give_it_time', trendingDown: false };
  if (delta >= s.noise) return { kind: 'give_it_time', trendingDown: true };
  return { kind: 'not_moving', trendingDown: false };
}

function findOverlap(trial: Trial, otherTrials: Trial[], start: Date): string | null {
  for (const other of otherTrials) {
    if (other.archived || other.isSample || other.id === trial.id) continue;
    const gap = Math.abs(differenceInCalendarDays(parseISO(other.startDate), start));
    const shared = trial.concerns.find(c => {
      const window = getConcern(c).windowDays;
      return other.concerns.includes(c) && window !== null && gap < window;
    });
    if (shared) return `Overlaps with ${other.productName}; their effects can't be separated.`;
  }
  return null;
}

/**
 * Judge whether a trial's product is working. `scans` must be the scans that
 * belong to this trial (see `scansForTrial`); `today` is the evaluation date.
 */
export function computeVerdict(trial: Trial, scans: Scan[], otherTrials: Trial[], today: Date): VerdictResult {
  const start = parseISO(trial.startDate);
  const daysIn = differenceInCalendarDays(today, start);
  const targets = trial.concerns.map(c => analyze(c, scans, start));

  const sideEffects: SideEffect[] = TARGETABLE.filter(c => !trial.concerns.includes(c.id))
    .map(c => analyze(c.id, scans, start))
    .filter(s => s.delta !== null && s.delta <= -s.noise)
    .map(s => ({ concern: s.concern, delta: s.delta!, noise: s.noise }));

  const postCount = Math.max(0, ...targets.map(t => t.postCount));
  const late = targets.find(t => t.lateDay !== null);
  const lateBaseline = late !== undefined;
  const confidence: VerdictResult['confidence'] =
    lateBaseline || postCount <= 2 ? 'low' : postCount <= 4 ? 'medium' : 'high';

  const tooEarly = daysIn < MIN_DAYS || postCount < 2;
  const isPauseTarget = (t: Series) => t.delta !== null && t.delta <= -t.noise;

  const settled = targets.map(t => settledKind(t, daysIn));
  const perConcern: ConcernVerdict[] = targets.map((t, i) => {
    const goal = trial.goal?.scores[t.concern] ?? null;
    const span = goal !== null && t.baseline !== null ? goal - t.baseline : null;
    return {
      concern: t.concern,
      kind: isPauseTarget(t) ? 'pause' : tooEarly ? 'too_early' : settled[i].kind,
      baseline: t.baseline,
      delta: t.delta,
      slope: t.slope,
      noise: t.noise,
      goal,
      goalProgress: span !== null && t.delta !== null && span > t.noise ? clamp01(t.delta / span) : null,
    };
  });

  const progressValues = perConcern.map(c => c.goalProgress).filter((p): p is number => p !== null);
  const goalProgress = progressValues.length ? mean(progressValues) : null;

  let kind: VerdictKind;
  let reason: string;
  const pauseTarget = targets.find(isPauseTarget);
  const pauseSide = sideEffects.find(
    s => (s.concern === 'redness' || s.concern === 'acne') && s.delta <= -2 * s.noise,
  );

  if (!targets.some(t => t.hasData)) {
    kind = 'too_early';
    reason = 'Take a baseline scan to start.';
  } else if (pauseTarget) {
    kind = 'pause';
    reason = `${getConcern(pauseTarget.concern).label} got worse by ${pts(pauseTarget.delta!)} pts since baseline. ${PAUSE_ADVICE}`;
  } else if (pauseSide) {
    kind = 'pause';
    reason = `${getConcern(pauseSide.concern).label} got worse by ${pts(pauseSide.delta)} pts since you started. ${PAUSE_ADVICE}`;
  } else if (tooEarly) {
    kind = 'too_early';
    reason =
      daysIn < MIN_DAYS
        ? `Too early to judge. First fair read on ${fmtDate(addDays(start, MIN_DAYS))}.`
        : 'Too early to judge. Your first fair read comes after your next check-in.';
  } else {
    const kinds = settled.map(s => s.kind);
    kind = kinds.includes('working') ? 'working' : kinds.includes('give_it_time') ? 'give_it_time' : 'not_moving';
    const i = kinds.indexOf(kind);
    const t = targets[i];
    const info = getConcern(t.concern);
    const weeks = Math.floor(daysIn / 7);
    if (kind === 'working') {
      reason = `${info.label} improved ${pts(t.delta!)} pts in ${weeks} weeks, above normal scan noise (±${fmtNoise(t.noise)}). Keep going.`;
    } else if (kind === 'give_it_time' && settled[i].trendingDown) {
      reason = `${info.label} improved, but it's trending down lately. Check again in a week.`;
    } else if (kind === 'give_it_time') {
      const window = info.windowDays ?? MIN_DAYS;
      reason = `No clear change yet. Most products need about ${window / 7} weeks for ${info.label.toLowerCase()} — keep going until ${fmtDate(addDays(start, window))}.`;
    } else {
      reason = `No measurable change after ${weeks} weeks. Consider stopping — save your money.`;
    }
  }

  if (late && targets.some(t => t.hasData)) {
    reason += ` Late baseline (day ${late.lateDay}); earlier changes not counted.`;
  }

  return {
    kind,
    reason,
    confidence,
    perConcern,
    sideEffects,
    goalProgress,
    overlapWarning: findOverlap(trial, otherTrials, start),
    lateBaseline,
    daysIn,
  };
}
