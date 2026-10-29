import { IDBFactory } from 'fake-indexeddb';
import {
  clearAllData,
  deleteScan,
  findScanByHash,
  getBlob,
  getScan,
  getTrial,
  isStorageAvailable,
  listScans,
  listTrials,
  putBlob,
  saveScan,
  saveTrial,
} from '@/lib/store/db';
import type { Scan, Trial } from '@/lib/verdict/types';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

const scan = (id: string, takenAt: string, sourceHash: string | null = null): Scan => ({
  id,
  takenAt,
  source: 'camera',
  sourceHash,
  photoBlobId: 'p',
  overall: 70,
  skinAge: 30,
  scores: { oiliness: { raw: 60, ui: 75 } },
  maskBlobIds: {},
  skinType: null,
});

const trial: Trial = {
  id: 't1',
  productName: 'Serum A',
  concerns: ['oiliness'],
  startDate: '2026-09-01',
  goal: null,
  createdAt: '2026-09-01T09:00:00.000Z',
  isSample: false,
  archived: false,
};

test('db round-trips scans sorted by takenAt and finds by hash', async () => {
  await saveScan(scan('b', '2026-09-10T09:00:00.000Z'));
  await saveScan(scan('a', '2026-09-01T09:00:00.000Z', 'abc'));
  expect((await listScans()).map(s => s.id)).toEqual(['a', 'b']);
  expect((await getScan('b'))?.scores.oiliness?.raw).toBe(60);
  expect((await findScanByHash('abc'))?.id).toBe('a');
  expect(await findScanByHash('nope')).toBeUndefined();
});

test('db round-trips trials and blobs', async () => {
  await saveTrial(trial);
  expect(await getTrial('t1')).toEqual(trial);
  expect(await listTrials()).toHaveLength(1);
  const id = await putBlob(new Blob(['hello'], { type: 'image/jpeg' }));
  const back = await getBlob(id);
  expect(back?.size).toBe(5);
  expect(back?.type).toBe('image/jpeg');
  expect(await back?.text()).toBe('hello');
});

test('isStorageAvailable is true when IndexedDB works', async () =>
  expect(await isStorageAvailable()).toBe(true));

test('deleteScan removes the scan, its photo and its masks', async () => {
  const photoId = await putBlob(new Blob(['p']));
  const maskId = await putBlob(new Blob(['m']));
  await saveScan({ ...scan('a', '2026-09-01T09:00:00.000Z'), photoBlobId: photoId, maskBlobIds: { oiliness: maskId } });
  await deleteScan('a');
  expect(await getScan('a')).toBeUndefined();
  expect(await getBlob(photoId)).toBeUndefined();
  expect(await getBlob(maskId)).toBeUndefined();
});

test('connections are closed after each call, so a newer schema version can open', async () => {
  await saveScan(scan('a', '2026-09-01T09:00:00.000Z'));
  const { openDB } = await import('idb');
  const upgraded = await Promise.race([
    openDB('verdict', 2).then(db => (db.close(), 'opened')),
    new Promise(r => setTimeout(() => r('blocked'), 500)),
  ]);
  expect(upgraded).toBe('opened');
});

test('clearAllData removes every scan, trial and stored image', async () => {
  const photoId = await putBlob(new Blob(['p']));
  await saveScan({ ...scan('a', '2026-09-01T09:00:00.000Z'), photoBlobId: photoId });
  await saveTrial(trial);
  await clearAllData();
  expect(await listScans()).toEqual([]);
  expect(await listTrials()).toEqual([]);
  expect(await getBlob(photoId)).toBeUndefined();
});
