import { addDays, parseISO } from 'date-fns';
import { chartData } from '@/lib/trials/chartData';
import { computeVerdict } from '@/lib/verdict/engine';
import type { Scan, Trial } from '@/lib/verdict/types';

const trial: Trial = {
  id: 't',
  productName: 'Serum',
  concerns: ['oiliness'],
  startDate: '2026-09-01',
  goal: { imageBlobId: 'g', scores: { oiliness: 70 } },
  createdAt: '2026-09-01',
  isSample: false,
  archived: false,
};

const scan = (day: number, raw: number): Scan => {
  const d = addDays(parseISO('2026-09-01'), day);
  d.setHours(9);
  return {
    id: `s${day}`,
    takenAt: d.toISOString(),
    source: 'camera',
    sourceHash: null,
    photoBlobId: 'p',
    overall: null,
    skinAge: null,
    scores: { oiliness: { raw, ui: raw } },
    maskBlobIds: {},
    skinType: null,
  };
};

test('chartData points by day with noise band and goal', () => {
  const scans = [scan(14, 64), scan(0, 60)];
  const v = computeVerdict(trial, scans, [], new Date(2026, 8, 15, 12));
  expect(chartData(trial, scans, v, 'oiliness')).toEqual({
    points: [
      { day: 0, raw: 60 },
      { day: 14, raw: 64 },
    ],
    baseline: 60,
    band: [57, 63],
    goal: 70,
  });
});

test('chartData with no scans for the concern', () => {
  const v = computeVerdict(trial, [], [], new Date(2026, 8, 15, 12));
  expect(chartData(trial, [], v, 'oiliness')).toEqual({ points: [], baseline: null, band: null, goal: 70 });
});
