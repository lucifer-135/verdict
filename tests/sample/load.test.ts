import { IDBFactory } from 'fake-indexeddb';
import { vi } from 'vitest';
import { hasSampleJourney, loadSampleJourney, type SampleJourney } from '@/lib/sample/load';
import { getBlob, getTrial, listScans, listTrials } from '@/lib/store/db';

const journey: SampleJourney = {
  trial: { productName: 'Niacinamide serum', concerns: ['oiliness'], startDate: '2026-08-01' },
  goal: { image: '/sample/goal.jpg', scores: { oiliness: 90 } },
  scans: [
    {
      takenAt: '2026-08-01T09:00:00.000Z',
      photo: '/sample/photos/1.jpg',
      overall: 70,
      skinAge: 30,
      skinType: 'Oily',
      scores: { oiliness: { raw: 60, ui: 72 } },
      masks: { oiliness: '/sample/masks/1-oiliness.jpg' },
    },
    {
      takenAt: '2026-08-29T09:00:00.000Z',
      photo: '/sample/photos/2.jpg',
      overall: 74,
      skinAge: 29,
      skinType: 'Oily',
      scores: { oiliness: { raw: 68, ui: 78 } },
      masks: {},
    },
  ],
};

const fetchMock = vi.fn(async (url: string) =>
  url.startsWith('/sample/')
    ? new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/jpeg' } })
    : new Response('missing', { status: 404 }),
);

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

test('loadSampleJourney saves sample trial and scans', async () => {
  const id = await loadSampleJourney(journey);
  const trial = await getTrial(id);
  expect(trial).toMatchObject({ isSample: true, productName: 'Niacinamide serum', concerns: ['oiliness'], startDate: '2026-08-01' });
  expect(trial!.goal!.scores).toEqual({ oiliness: 90 });
  expect((await getBlob(trial!.goal!.imageBlobId))?.size).toBe(3);

  const scans = await listScans();
  expect(scans).toHaveLength(2);
  expect(scans.every(s => s.source === 'sample')).toBe(true);
  expect(scans[0].scores.oiliness).toEqual({ raw: 60, ui: 72 });
  expect(scans[0].maskBlobIds.oiliness).toBeDefined();
  expect((await getBlob(scans[1].photoBlobId))?.size).toBe(3);
});

test('loadSampleJourney is idempotent', async () => {
  const a = await loadSampleJourney(journey);
  const b = await loadSampleJourney(journey);
  expect(b).toBe(a);
  expect(await listTrials()).toHaveLength(1);
  expect(await listScans()).toHaveLength(2);
});

test('hasSampleJourney is false for an empty journey', () => {
  expect(hasSampleJourney(journey)).toBe(true);
  expect(hasSampleJourney({ ...journey, scans: [] })).toBe(false);
});

test('a load that fails partway can be retried without duplicate scans', async () => {
  fetchMock.mockImplementationOnce(async () => new Response(new Uint8Array([1]), { headers: { 'Content-Type': 'image/jpeg' } }));
  fetchMock.mockImplementationOnce(async () => new Response(new Uint8Array([1]), { headers: { 'Content-Type': 'image/jpeg' } }));
  fetchMock.mockImplementationOnce(async () => new Response('gone', { status: 404 }));
  await expect(loadSampleJourney(journey)).rejects.toThrow();
  await loadSampleJourney(journey);
  expect(await listScans()).toHaveLength(2);
  expect(await listTrials()).toHaveLength(1);
});
