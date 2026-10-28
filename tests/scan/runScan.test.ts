import { IDBFactory } from 'fake-indexeddb';
import { vi } from 'vitest';

vi.mock('@/lib/image/prep', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/image/prep')>()),
  prepareImage: vi.fn(async (b: Blob) => b),
}));

import { runGoal } from '@/lib/scan/runGoal';
import { resumeScan, runScan } from '@/lib/scan/runScan';
import { getBlob, listScans } from '@/lib/store/db';
import type { Trial } from '@/lib/verdict/types';

const S3 = 'https://yce-us.s3-accelerate.amazonaws.com';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const img = () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/jpeg' } });

const analysis = {
  status: 'success',
  result: {
    overall: 80.8,
    skinAge: 21,
    skinType: 'Combination',
    scores: { oiliness: { raw: 72, ui: 77 }, pore: { raw: 58, ui: 71 } },
    maskUrls: { oiliness: `${S3}/m.jpg`, pore: '/fixtures/masks/pore.jpg' },
  },
};

type Route = (url: string, init?: RequestInit) => Response | undefined;
let calls: { url: string; init?: RequestInit }[];

function serve(route: Route) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      const res = route(url, init);
      if (!res) throw new Error(`unrouted ${url}`);
      return res;
    }),
  );
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(() => vi.unstubAllGlobals());

const photo = new Blob([new Uint8Array([7, 7])], { type: 'image/jpeg' });

test('runScan saves scan with scores, photo blob and mask blobs; statuses in order', async () => {
  serve(url => {
    if (url === '/api/scan') return json({ taskId: 't1' });
    if (url === '/api/scan/t1') return json(analysis);
    if (url === `/api/asset?u=${encodeURIComponent(`${S3}/m.jpg`)}`) return img();
    if (url === '/fixtures/masks/pore.jpg') return img();
  });
  const statuses: string[] = [];
  const scan = await runScan(photo, { source: 'camera', onStatus: s => statuses.push(s) });

  expect(statuses).toEqual(['preparing', 'uploading', 'analyzing', 'saving']);
  expect(await listScans()).toHaveLength(1);
  expect(scan).toMatchObject({ source: 'camera', overall: 80.8, skinAge: 21, skinType: 'Combination', sourceHash: null });
  expect(scan.scores.oiliness).toEqual({ raw: 72, ui: 77 });
  expect(scan.maskBlobIds.oiliness).toBeDefined();
  expect(scan.maskBlobIds.pore).toBeDefined();
  expect((await getBlob(scan.photoBlobId))?.size).toBe(2);
});

test('runScan uses the given takenAt and sourceHash', async () => {
  serve(url => {
    if (url === '/api/scan') return json({ taskId: 't1' });
    if (url === '/api/scan/t1') return json({ ...analysis, result: { ...analysis.result, maskUrls: {} } });
  });
  const scan = await runScan(photo, { source: 'import', takenAt: '2026-09-01T09:00:00.000Z', sourceHash: 'abc' });
  expect(scan).toMatchObject({ source: 'import', takenAt: '2026-09-01T09:00:00.000Z', sourceHash: 'abc' });
});

test('runScan keeps scan when a mask download fails', async () => {
  serve(url => {
    if (url === '/api/scan') return json({ taskId: 't1' });
    if (url === '/api/scan/t1') return json(analysis);
    if (url.startsWith('/api/asset')) return new Response('gone', { status: 502 });
    if (url === '/fixtures/masks/pore.jpg') return img();
  });
  const scan = await runScan(photo, { source: 'camera' });
  expect(scan.maskBlobIds.oiliness).toBeUndefined();
  expect(scan.maskBlobIds.pore).toBeDefined();
  expect(await listScans()).toHaveLength(1);
});

test('runScan surfaces an API error as ScanError and saves nothing', async () => {
  serve(url => {
    if (url === '/api/scan') return json({ taskId: 't1' });
    if (url === '/api/scan/t1') return json({ status: 'error', code: 'error_src_face_too_small', message: '' });
  });
  await expect(runScan(photo, { source: 'camera' })).rejects.toMatchObject({
    code: 'error_src_face_too_small',
    friendly: 'Move closer so your face fills the oval.',
  });
  expect(await listScans()).toHaveLength(0);
});

test('resumeScan does not POST /api/scan', async () => {
  serve(url => {
    if (url === '/api/scan/t9') return json({ ...analysis, result: { ...analysis.result, maskUrls: {} } });
  });
  await resumeScan('t9', photo, { source: 'camera' });
  expect(calls.map(c => c.url)).toEqual(['/api/scan/t9']);
  expect(await listScans()).toHaveLength(1);
});

const trial = (concerns: Trial['concerns']): Trial => ({
  id: 't1',
  productName: 'Serum A',
  concerns,
  startDate: '2026-09-01',
  goal: null,
  createdAt: '2026-09-01',
  isSample: false,
  archived: false,
});

test('runGoal returns null when no simulable target (moisture only)', async () => {
  serve(() => undefined);
  expect(await runGoal(trial(['moisture']), photo)).toBeNull();
  expect(calls).toHaveLength(0);
});

test('runGoal chains simulate → analyze with intensity 0.4', async () => {
  serve(url => {
    if (url === '/api/simulate') return json({ taskId: 's1' });
    if (url === '/api/simulate/s1') return json({ status: 'success', result: { imageUrl: `${S3}/sim.jpg` } });
    if (url === `/api/asset?u=${encodeURIComponent(`${S3}/sim.jpg`)}`) return img();
    if (url === '/api/scan') return json({ taskId: 'g1' });
    if (url === '/api/scan/g1')
      return json({
        status: 'success',
        result: { overall: null, skinAge: null, skinType: null, scores: { oiliness: { raw: 96.5, ui: 94 } }, maskUrls: {} },
      });
  });
  const goal = await runGoal(trial(['oiliness', 'moisture']), photo);

  const simBody = calls.find(c => c.url === '/api/simulate')!.init!.body as FormData;
  expect(JSON.parse(simBody.get('concerns') as string)).toEqual([{ concern: 'oiliness', intensity: 0.4 }]);
  const scanBody = calls.find(c => c.url === '/api/scan')!.init!.body as FormData;
  expect(scanBody.get('actions')).toBe('oiliness');
  expect(goal?.scores).toEqual({ oiliness: 96.5 });
  expect((await getBlob(goal!.imageBlobId))?.size).toBe(3);
});

describe('final-review fixes', () => {
  const broken = {
    open: () => {
      throw new Error('storage blocked');
    },
  } as unknown as IDBFactory;

  test('a failed create POST is not retried (no second paid task)', async () => {
    serve(url => (url === '/api/scan' ? new Response('', { status: 503 }) : undefined));
    await expect(runScan(photo, { source: 'camera' })).rejects.toBeInstanceOf(Error);
    expect(calls.filter(c => c.url === '/api/scan')).toHaveLength(1);
  });

  test('a failed simulate POST is not retried', async () => {
    serve(url => (url === '/api/simulate' ? new Response('', { status: 503 }) : undefined));
    await expect(runGoal(trial(['oiliness']), photo)).rejects.toBeInstanceOf(Error);
    expect(calls.filter(c => c.url === '/api/simulate')).toHaveLength(1);
  });

  test('a storage failure after analysis keeps the taskId and says so', async () => {
    serve(url => {
      if (url === '/api/scan') return json({ taskId: 't1' });
      if (url === '/api/scan/t1') {
        globalThis.indexedDB = broken;
        return json({ ...analysis, result: { ...analysis.result, maskUrls: {} } });
      }
    });
    await expect(runScan(photo, { source: 'camera' })).rejects.toMatchObject({ code: 'save_failed', taskId: 't1' });
  });

  test('runScan refuses to upload when storage is unavailable', async () => {
    globalThis.indexedDB = broken;
    serve(() => json({ taskId: 't1' }));
    await expect(runScan(photo, { source: 'camera' })).rejects.toMatchObject({ code: 'storage_unavailable' });
    expect(calls).toHaveLength(0);
  });
});
