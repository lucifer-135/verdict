import { shareCardContent, wrapLines } from '@/lib/share/verdictCard';
import type { Trial, VerdictResult } from '@/lib/verdict/types';

const trial: Trial = {
  id: 't',
  productName: 'Salicylic acid 2% cleanser',
  concerns: ['acne', 'redness'],
  startDate: '2026-09-14',
  goal: null,
  createdAt: '',
  isSample: true,
  archived: false,
  cost: { price: 14, weeksPerUnit: 6 },
};

const verdict: VerdictResult = {
  kind: 'working',
  reason: 'Breakouts improved 24 pts in 6 weeks, above normal scan noise (±3). Keep going.',
  confidence: 'high',
  perConcern: [],
  sideEffects: [],
  goalProgress: 0.81,
  overlapWarning: null,
  lateBaseline: false,
  daysIn: 42,
};

test('shareCardContent holds the verdict, never a photo', () => {
  const c = shareCardContent(trial, verdict, 'verdict-delta-seven.vercel.app');
  expect(c).toEqual({
    product: 'Salicylic acid 2% cleanser',
    concerns: 'Breakouts · Redness',
    verdictLabel: 'Working',
    verdictKind: 'working',
    reason: verdict.reason,
    meta: 'Day 42 · Confidence: high',
    goalPercent: 81,
    costLine: 'It costs about $10 a month, and it is working.',
    sampleNote: 'Simulated sample. The photos behind it are AI-generated.',
    footer: 'Skin analysis by YouCam API · verdict-delta-seven.vercel.app',
  });
});

test('shareCardContent leaves out what a trial does not have', () => {
  const c = shareCardContent({ ...trial, isSample: false, cost: undefined }, { ...verdict, goalProgress: null }, 'x.app');
  expect(c.goalPercent).toBeNull();
  expect(c.costLine).toBeNull();
  expect(c.sampleNote).toBeNull();
});

test('wrapLines breaks on spaces to fit the width, and caps the line count', () => {
  const measure = (s: string) => s.length * 10;
  expect(wrapLines('one two three four', 100, measure)).toEqual(['one two', 'three four']);
  expect(wrapLines('a b c d e f g h', 30, measure, 2)).toEqual(['a b', 'c d…']);
  expect(wrapLines('', 100, measure)).toEqual([]);
});
