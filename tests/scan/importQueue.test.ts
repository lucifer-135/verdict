import { IDBFactory } from 'fake-indexeddb';
import { vi } from 'vitest';

vi.mock('@/lib/image/prep', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/image/prep')>()),
  readTakenAt: vi.fn(),
}));
vi.mock('@/lib/scan/runScan', () => ({ runScan: vi.fn() }));

import { readTakenAt } from '@/lib/image/prep';
import { buildQueue, runQueue, withDate, type ImportItem } from '@/lib/scan/importQueue';
import { ScanError } from '@/lib/scan/poll';
import { runScan } from '@/lib/scan/runScan';
import { saveScan } from '@/lib/store/db';
import type { Scan } from '@/lib/verdict/types';

const takenAt = vi.mocked(readTakenAt);
const scan = vi.mocked(runScan);
const photo = (byte: number) => ({ file: new Blob([new Uint8Array([byte])], { type: 'image/jpeg' }), name: `p${byte}.jpg` });
const fetchSpy = vi.fn();

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  takenAt.mockReset();
  scan.mockReset();
  vi.stubGlobal('fetch', fetchSpy);
});
afterEach(() => vi.unstubAllGlobals());

test('buildQueue marks missing EXIF as needs_date', async () => {
  takenAt.mockResolvedValueOnce('2026-09-01T09:00:00.000Z').mockResolvedValueOnce(null);
  const items = await buildQueue([photo(1), photo(2)]);
  expect(items.map(i => [i.name, i.status, i.takenAt])).toEqual([
    ['p1.jpg', 'ready', '2026-09-01T09:00:00.000Z'],
    ['p2.jpg', 'needs_date', null],
  ]);
});

test('buildQueue marks db and in-batch duplicates without calling fetch', async () => {
  takenAt.mockResolvedValue('2026-09-01T09:00:00.000Z');
  const [first] = await buildQueue([photo(1)]);
  await saveScan({ id: 's1', takenAt: first.takenAt!, source: 'import', sourceHash: first.hash } as Scan);
  const items = await buildQueue([photo(1), photo(2), photo(2)]);
  expect(items.map(i => i.status)).toEqual(['duplicate', 'ready', 'duplicate']);
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(scan).not.toHaveBeenCalled();
});

test('withDate sets takenAt at local noon and marks ready', () => {
  const item: ImportItem = { ...photo(1), hash: 'h', takenAt: null, status: 'needs_date' };
  const dated = withDate(item, '2026-08-20');
  expect(dated.status).toBe('ready');
  expect(dated.takenAt).toBe(new Date(2026, 7, 20, 12).toISOString());
});

test('runQueue scans only ready items, sequentially, passing takenAt and sourceHash', async () => {
  const order: string[] = [];
  scan.mockImplementation(async (_f, opts) => {
    order.push(opts.sourceHash!);
    return {} as Scan;
  });
  const items: ImportItem[] = [
    { ...photo(1), hash: 'a', takenAt: '2026-09-01T09:00:00.000Z', status: 'ready' },
    { ...photo(2), hash: 'b', takenAt: null, status: 'needs_date' },
    { ...photo(3), hash: 'c', takenAt: null, status: 'duplicate' },
    { ...photo(4), hash: 'd', takenAt: '2026-09-08T09:00:00.000Z', status: 'ready' },
  ];
  const updates: string[][] = [];
  const result = await runQueue(items, list => updates.push(list.map(i => i.status)));
  expect(order).toEqual(['a', 'd']);
  expect(scan).toHaveBeenCalledWith(items[0].file, { source: 'import', takenAt: '2026-09-01T09:00:00.000Z', sourceHash: 'a' });
  expect(result.map(i => i.status)).toEqual(['done', 'needs_date', 'duplicate', 'done']);
  expect(updates[0]).toEqual(['scanning', 'needs_date', 'duplicate', 'ready']);
});

test('runQueue marks a failed item and continues', async () => {
  scan.mockRejectedValueOnce(new ScanError('error_src_face_too_small')).mockResolvedValueOnce({} as Scan);
  const items: ImportItem[] = [
    { ...photo(1), hash: 'a', takenAt: '2026-09-01T09:00:00.000Z', status: 'ready' },
    { ...photo(2), hash: 'b', takenAt: '2026-09-02T09:00:00.000Z', status: 'ready' },
  ];
  const result = await runQueue(items, () => {});
  expect(result[0]).toMatchObject({ status: 'failed', error: 'Move closer so your face fills the oval.' });
  expect(result[1].status).toBe('done');
});

test('withDate rejects years before 2000 and future dates', () => {
  const item: ImportItem = { ...photo(1), hash: 'h', takenAt: null, status: 'needs_date' };
  const today = new Date(2026, 9, 29);
  for (const bad of ['0002-10-01', '1999-12-31', '2026-10-30']) {
    expect(withDate(item, bad, today)).toMatchObject({
      status: 'needs_date',
      takenAt: null,
      error: 'Choose a date between 2000 and today.',
    });
  }
  expect(withDate(item, '2026-10-29', today).status).toBe('ready');
});
