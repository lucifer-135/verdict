import { vi } from 'vitest';

vi.mock('exifr', () => ({ default: { parse: vi.fn() } }));

import exifr from 'exifr';
import { computeTargetSize, meanLuminance, readTakenAt, sha256Hex } from '@/lib/image/prep';

const parse = vi.mocked(exifr.parse);

test('computeTargetSize never upscales', () =>
  expect(computeTargetSize(1080, 1920)).toEqual({ width: 1080, height: 1920 }));

test('computeTargetSize caps long side at 2560', () =>
  expect(computeTargetSize(3024, 4032)).toEqual({ width: 1920, height: 2560 }));

test('computeTargetSize throws below 480 short side', () =>
  expect(() => computeTargetSize(400, 900)).toThrow(expect.objectContaining({ code: 'below_min_image_size' })));

test('computeTargetSize throws when capping would push short side below 480', () =>
  expect(() => computeTargetSize(500, 4000)).toThrow(expect.objectContaining({ code: 'below_min_image_size' })));

test('meanLuminance', () => {
  expect(meanLuminance(new Uint8ClampedArray([255, 255, 255, 255]))).toBeCloseTo(255);
  expect(meanLuminance(new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]))).toBeCloseTo(127.5);
});

test('readTakenAt returns ISO from EXIF DateTimeOriginal', async () => {
  const d = new Date(2026, 8, 1, 9);
  parse.mockResolvedValueOnce({ DateTimeOriginal: d });
  expect(await readTakenAt(new Blob(['x']))).toBe(d.toISOString());
});

test('readTakenAt returns null when EXIF is absent or unreadable', async () => {
  parse.mockResolvedValueOnce(undefined);
  expect(await readTakenAt(new Blob(['x']))).toBeNull();
  parse.mockRejectedValueOnce(new Error('not a jpeg'));
  expect(await readTakenAt(new Blob(['x']))).toBeNull();
});

test('sha256Hex hashes blob bytes', async () =>
  expect(await sha256Hex(new Blob(['abc']))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'));
