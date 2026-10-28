// @vitest-environment node
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { vi } from 'vitest';
import type { YouCamClient } from '@/lib/youcam/client';
import { withDevCache } from '@/lib/youcam/devCache';

function fakeClient(): YouCamClient {
  return {
    createSkinAnalysis: vi.fn(async () => ({ taskId: 'real-1' })),
    getSkinAnalysis: vi.fn(async () => ({
      status: 'success' as const,
      result: { overall: 80, skinAge: 21, skinType: null, scores: { oiliness: { raw: 72, ui: 77 } }, maskUrls: {} },
    })),
    createSkinSimulation: vi.fn(async () => ({ taskId: 'sim-1' })),
    getSkinSimulation: vi.fn(async () => ({ status: 'success' as const, result: { imageUrl: 'https://x/y.jpg' } })),
  };
}

test('second analysis of the same bytes and actions is served from disk', async () => {
  const inner = fakeClient();
  const client = withDevCache(inner, mkdtempSync(join(tmpdir(), 'yc-')));
  const bytes = new Uint8Array([9, 9, 9]);

  const first = await client.createSkinAnalysis({ bytes }, ['oiliness']);
  expect(first.taskId).toMatch(/^real-1~/);
  await client.getSkinAnalysis(first.taskId);

  const second = await client.createSkinAnalysis({ bytes }, ['oiliness']);
  expect(second.taskId).toMatch(/^cached:/);
  const s = await client.getSkinAnalysis(second.taskId);
  expect(s.status).toBe('success');
  expect(inner.createSkinAnalysis).toHaveBeenCalledTimes(1);
  expect(inner.getSkinAnalysis).toHaveBeenCalledTimes(1);
});

test('different actions miss the cache', async () => {
  const inner = fakeClient();
  const client = withDevCache(inner, mkdtempSync(join(tmpdir(), 'yc-')));
  const bytes = new Uint8Array([1]);
  await client.getSkinAnalysis((await client.createSkinAnalysis({ bytes }, ['oiliness'])).taskId);
  await client.createSkinAnalysis({ bytes }, ['pore']);
  expect(inner.createSkinAnalysis).toHaveBeenCalledTimes(2);
});

test('cached ids that are not a sha256 key are rejected without touching disk', async () => {
  const inner = fakeClient();
  const client = withDevCache(inner, mkdtempSync(join(tmpdir(), 'yc-')));
  await expect(client.getSkinAnalysis('cached:../../package')).rejects.toMatchObject({ code: 'InvalidTaskId' });
  expect(inner.getSkinAnalysis).not.toHaveBeenCalled();
});

test('a forged key suffix is ignored and nothing is written outside the cache dir', async () => {
  const inner = fakeClient();
  const dir = join(mkdtempSync(join(tmpdir(), 'yc-')), 'cache');
  const client = withDevCache(inner, dir);
  await client.getSkinAnalysis('real-1~../escaped');
  expect(inner.getSkinAnalysis).toHaveBeenCalledWith('real-1');
  expect(existsSync(join(dir, '../escaped.json'))).toBe(false);
});
