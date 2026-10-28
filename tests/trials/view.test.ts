import { activeTrials, nextCheckIn, scansForTrial } from '@/lib/trials/view';
import type { Scan, ScanSource, Trial } from '@/lib/verdict/types';

const scan = (source: ScanSource, takenAt = '2026-09-01T09:00:00.000Z'): Scan => ({
  id: `${source}-${takenAt}`,
  takenAt,
  source,
  sourceHash: null,
  photoBlobId: 'p',
  overall: null,
  skinAge: null,
  scores: {},
  maskBlobIds: {},
  skinType: null,
});

const scanOn = (date: string) => scan('camera', new Date(`${date}T09:00:00`).toISOString());

const trial = (over: Partial<Trial> = {}): Trial => ({
  id: 't',
  productName: 'Serum',
  concerns: ['oiliness'],
  startDate: '2026-09-01',
  goal: null,
  createdAt: '2026-09-01T09:00:00.000Z',
  isSample: false,
  archived: false,
  ...over,
});

const camera = scan('camera');
const imported = scan('import');
const sample = scan('sample');

test('scansForTrial isolates sample scans', () => {
  expect(scansForTrial(trial(), [camera, imported, sample]).map(s => s.source)).toEqual(['camera', 'import']);
  expect(scansForTrial(trial({ isSample: true }), [camera, imported, sample]).map(s => s.source)).toEqual(['sample']);
});

test('nextCheckIn is last scan + 7 days, Today when due', () => {
  expect(nextCheckIn([scanOn('2026-09-01')], new Date(2026, 8, 3))).toBe('Sep 8');
  expect(nextCheckIn([scanOn('2026-08-20'), scanOn('2026-09-01')], new Date(2026, 8, 3))).toBe('Sep 8');
  expect(nextCheckIn([scanOn('2026-09-01')], new Date(2026, 8, 8))).toBe('Today');
  expect(nextCheckIn([scanOn('2026-09-01')], new Date(2026, 8, 9))).toBe('Today');
  expect(nextCheckIn([], new Date())).toBeNull();
});

test('activeTrials drops archived, newest first, sample last', () => {
  const list = activeTrials([
    trial({ id: 'sample', isSample: true, createdAt: '2026-10-01T00:00:00.000Z' }),
    trial({ id: 'old', createdAt: '2026-09-01T00:00:00.000Z' }),
    trial({ id: 'gone', archived: true, createdAt: '2026-09-15T00:00:00.000Z' }),
    trial({ id: 'new', createdAt: '2026-09-20T00:00:00.000Z' }),
  ]);
  expect(list.map(t => t.id)).toEqual(['new', 'old', 'sample']);
});
