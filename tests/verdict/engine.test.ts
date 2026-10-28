import { addDays, parseISO } from 'date-fns';
import { computeVerdict } from '@/lib/verdict/engine';
import type { ConcernId } from '@/lib/verdict/concerns';
import type { Scan, Trial } from '@/lib/verdict/types';

const START = '2026-09-01';
let seq = 0;

function at(start: string, day: number, hour = 9): Date {
  const d = addDays(parseISO(start), day);
  d.setHours(hour);
  return d;
}

function scanAt(date: Date, scores: Partial<Record<ConcernId, number>>): Scan {
  return {
    id: `s${++seq}`,
    takenAt: date.toISOString(),
    source: 'camera',
    sourceHash: null,
    photoBlobId: 'p',
    overall: null,
    skinAge: null,
    scores: Object.fromEntries(Object.entries(scores).map(([k, raw]) => [k, { raw, ui: raw }])),
    maskBlobIds: {},
    skinType: null,
  };
}

const mk = (day: number, scores: Partial<Record<ConcernId, number>>) => scanAt(at(START, day), scores);

function trial(over: Partial<Trial> = {}): Trial {
  return {
    id: 't1',
    productName: 'Serum A',
    concerns: ['oiliness'],
    startDate: START,
    goal: null,
    createdAt: START,
    isSample: false,
    archived: false,
    ...over,
  };
}

function v(
  scans: Scan[],
  todayDay: number,
  concerns: ConcernId[] = ['oiliness'],
  goalScores?: Partial<Record<ConcernId, number>>,
  others: Trial[] = [],
) {
  const goal = goalScores ? { imageBlobId: 'g', scores: goalScores } : null;
  return computeVerdict(trial({ concerns, goal }), scans, others, at(START, todayDay, 12));
}

test('no scans → too_early', () =>
  expect(v([], 5)).toMatchObject({ kind: 'too_early', reason: 'Take a baseline scan to start.' }));

test('baseline only, day 5 → too_early with date', () =>
  expect(v([mk(0, { oiliness: 60 })], 5).reason).toBe('Too early to judge. First fair read on Sep 15.'));

test('day 20, one post scan → too_early after next check-in', () =>
  expect(v([mk(0, { oiliness: 60 }), mk(18, { oiliness: 61 })], 20).reason).toBe(
    'Too early to judge. Your first fair read comes after your next check-in.',
  ));

test('target worse on day 6 → pause before too_early', () => {
  const r = v([mk(0, { oiliness: 60 }), mk(6, { oiliness: 56 })], 6);
  expect(r.kind).toBe('pause');
  expect(r.reason).toMatch(/^Oiliness got worse by 4 pts since baseline\./);
});

test('non-target redness worse by ≥2×noise → pause', () => {
  const r = v([mk(0, { oiliness: 60, redness: 70 }), mk(10, { oiliness: 60, redness: 63 })], 10);
  expect(r.kind).toBe('pause');
  expect(r.reason).toBe(
    'Redness got worse by 7 pts since you started. Possible irritation. Consider pausing; see a dermatologist if it persists.',
  );
  expect(r.sideEffects).toContainEqual({ concern: 'redness', delta: -7, noise: 3 });
});

test('redness worse by 4 → side effect only', () => {
  const r = v([mk(0, { oiliness: 60, redness: 70 }), mk(10, { oiliness: 60, redness: 66 })], 10);
  expect(r.kind).toBe('too_early');
  expect(r.sideEffects.map(s => s.concern)).toEqual(['redness']);
});

test('working', () => {
  const r = v([mk(0, { oiliness: 60 }), mk(14, { oiliness: 63 }), mk(21, { oiliness: 66 })], 21);
  expect(r.kind).toBe('working');
  expect(r.reason).toBe('Oiliness improved 5 pts in 3 weeks, above normal scan noise (±3). Keep going.');
  expect(r.confidence).toBe('low');
  expect(r.daysIn).toBe(21);
});

test('give_it_time inside window', () => {
  const r = v([mk(0, { acne: 70 }), mk(14, { acne: 71 }), mk(21, { acne: 71 })], 21, ['acne']);
  expect(r.kind).toBe('give_it_time');
  expect(r.reason).toBe(
    'No clear change yet. Most products need about 6 weeks for breakouts — keep going until Oct 13.',
  );
});

test('not_moving after window', () => {
  const r = v([mk(0, { oiliness: 60 }), mk(21, { oiliness: 61 }), mk(30, { oiliness: 59 })], 30);
  expect(r.kind).toBe('not_moving');
  expect(r.reason).toBe('No measurable change after 4 weeks. Consider stopping — save your money.');
});

test('noise widens from baseline spread', () => {
  const r = v(
    [mk(0, { oiliness: 60 }), mk(2, { oiliness: 66 }), mk(20, { oiliness: 67 }), mk(27, { oiliness: 68 })],
    27,
  );
  expect(r.perConcern[0].noise).toBe(6);
  expect(r.perConcern[0].baseline).toBe(63);
  expect(r.kind).toBe('give_it_time');
});

test('late baseline', () => {
  const r = v([mk(10, { oiliness: 60 }), mk(20, { oiliness: 64 }), mk(27, { oiliness: 65 })], 27);
  expect(r).toMatchObject({ kind: 'working', lateBaseline: true, confidence: 'low' });
  expect(r.reason.endsWith(' Late baseline (day 10); earlier changes not counted.')).toBe(true);
});

test('multi-target: working beats give_it_time', () => {
  const s = [
    mk(0, { oiliness: 60, pore: 50 }),
    mk(14, { oiliness: 64, pore: 50 }),
    mk(21, { oiliness: 66, pore: 51 }),
  ];
  const r = v(s, 21, ['pore', 'oiliness']);
  expect(r.kind).toBe('working');
  expect(r.reason).toMatch(/^Oiliness improved/);
});

test('improved but slope ≤ 0 past window → give_it_time (trending down)', () => {
  const s = [
    mk(0, { oiliness: 60 }),
    mk(4, { oiliness: 80 }),
    mk(8, { oiliness: 80 }),
    mk(12, { oiliness: 80 }),
    mk(28, { oiliness: 64 }),
    mk(30, { oiliness: 64 }),
  ];
  const r = v(s, 30);
  expect(r.kind).toBe('give_it_time');
  expect(r.reason).toBe("Oiliness improved, but it's trending down lately. Check again in a week.");
});

test('confidence medium at 3 post scans, high at 5', () => {
  const three = [mk(0, { oiliness: 60 }), mk(14, { oiliness: 64 }), mk(18, { oiliness: 65 }), mk(21, { oiliness: 66 })];
  expect(v(three, 21).confidence).toBe('medium');
  const five = [
    mk(0, { oiliness: 60 }),
    mk(10, { oiliness: 62 }),
    mk(14, { oiliness: 64 }),
    mk(16, { oiliness: 65 }),
    mk(18, { oiliness: 65 }),
    mk(21, { oiliness: 66 }),
  ];
  expect(v(five, 21).confidence).toBe('high');
});

test('goal progress', () => {
  const s = [mk(0, { oiliness: 60 }), mk(14, { oiliness: 64 }), mk(21, { oiliness: 66 })];
  expect(v(s, 21, ['oiliness'], { oiliness: 70 }).goalProgress).toBeCloseTo(0.5);
  expect(v(s, 21, ['oiliness'], { oiliness: 62 }).goalProgress).toBeNull();
});

test('overlap warning; archived and sample trials ignored', () => {
  const s = [mk(0, { oiliness: 60 })];
  const other = trial({ id: 't2', productName: 'Serum B', startDate: '2026-09-10' });
  expect(v(s, 5, ['oiliness'], undefined, [other]).overlapWarning).toBe(
    "Overlaps with Serum B; their effects can't be separated.",
  );
  expect(v(s, 5, ['oiliness'], undefined, [{ ...other, archived: true }]).overlapWarning).toBeNull();
  expect(v(s, 5, ['oiliness'], undefined, [{ ...other, isSample: true }]).overlapWarning).toBeNull();
});

test('future start date → too_early', () => {
  const t = trial({ startDate: '2026-09-10' });
  const scan = scanAt(at('2026-09-05', 0), { oiliness: 60 });
  expect(computeVerdict(t, [scan], [], at('2026-09-05', 0, 12)).reason).toBe(
    'Too early to judge. First fair read on Sep 24.',
  );
});
