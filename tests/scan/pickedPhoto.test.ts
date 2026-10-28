import { IDBFactory } from 'fake-indexeddb';
import { vi } from 'vitest';

vi.mock('@/lib/image/prep', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/image/prep')>()),
  readTakenAt: vi.fn(),
}));

import { readTakenAt } from '@/lib/image/prep';
import { checkPickedPhoto } from '@/lib/scan/pickedPhoto';
import { saveScan } from '@/lib/store/db';
import type { Scan } from '@/lib/verdict/types';

const photo = new Blob([new Uint8Array([5, 6, 7])], { type: 'image/jpeg' });
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  vi.mocked(readTakenAt).mockReset();
});

test('a picked photo keeps its EXIF date and hash', async () => {
  vi.mocked(readTakenAt).mockResolvedValue('2026-09-01T09:00:00.000Z');
  const info = await checkPickedPhoto(photo);
  expect(info.takenAt).toBe('2026-09-01T09:00:00.000Z');
  expect(info.sourceHash).toMatch(/^[a-f0-9]{64}$/);
});

test('a picked photo without EXIF is dated now (undefined takenAt)', async () => {
  vi.mocked(readTakenAt).mockResolvedValue(null);
  expect((await checkPickedPhoto(photo)).takenAt).toBeUndefined();
});

test('a photo that was already scanned is refused before any upload', async () => {
  vi.mocked(readTakenAt).mockResolvedValue(null);
  const { sourceHash } = await checkPickedPhoto(photo);
  await saveScan({ id: 's1', takenAt: '2026-09-01T09:00:00.000Z', source: 'camera', sourceHash } as Scan);
  await expect(checkPickedPhoto(photo)).rejects.toMatchObject({ code: 'duplicate_photo' });
});
