import { goalPhase } from '@/lib/trials/goalPhase';
import type { Trial } from '@/lib/verdict/types';

const trial = (over: Partial<Trial> = {}): Trial => ({
  id: 't',
  productName: 'Serum',
  concerns: ['oiliness'],
  startDate: '2026-09-01',
  goal: null,
  createdAt: '2026-09-01',
  isSample: false,
  archived: false,
  ...over,
});

test('goalPhase decides whether a goal may be built (and spend units)', () => {
  expect(goalPhase(trial(), true)).toBe('build');
  expect(goalPhase(trial(), false)).toBe('no-baseline');
  expect(goalPhase(trial({ concerns: ['moisture'] }), true)).toBe('unsupported');
  expect(goalPhase(trial({ goal: { imageBlobId: 'g', scores: {} } }), true)).toBe('ready');
  expect(goalPhase(trial({ isSample: true }), true)).toBe('sample');
  expect(goalPhase(trial({ isSample: true, goal: { imageBlobId: 'g', scores: {} } }), true)).toBe('ready');
});
