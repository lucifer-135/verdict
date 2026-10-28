// @vitest-environment node
import { vi } from 'vitest';
import { GET as assetGET } from '@/app/api/asset/route';
import { POST as scanPOST } from '@/app/api/scan/route';
import { GET as scanGET } from '@/app/api/scan/[taskId]/route';
import { POST as simPOST } from '@/app/api/simulate/route';
import { GET as simGET } from '@/app/api/simulate/[taskId]/route';

beforeEach(() => vi.stubEnv('YOUCAM_MOCK', '1'));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const req = (path: string, init?: RequestInit) => new Request(`http://localhost${path}`, init);
const form = (fields: Record<string, string | Blob>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
};
const jpeg = (size = 10) => new Blob([new Uint8Array(size)], { type: 'image/jpeg' });
const params = (taskId: string) => ({ params: Promise.resolve({ taskId }) });

describe('/api/scan', () => {
  test('creates a task and polls it in mock mode', async () => {
    const res = await scanPOST(req('/api/scan', { method: 'POST', body: form({ image: jpeg() }) }));
    expect(res.status).toBe(200);
    const { taskId } = await res.json();
    const poll = await scanGET(req(`/api/scan/${taskId}`), params(taskId));
    expect((await poll.json()).status).toBe('success');
  });

  test('rejects unknown actions', async () => {
    const res = await scanPOST(req('/api/scan', { method: 'POST', body: form({ image: jpeg(), actions: 'oiliness,foo' }) }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: { code: 'invalid_actions' } });
  });

  test('rejects a missing image', async () => {
    const res = await scanPOST(req('/api/scan', { method: 'POST', body: form({ actions: 'oiliness' }) }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: { code: 'missing_image' } });
  });

  test('rejects >4MB image', async () => {
    const res = await scanPOST(req('/api/scan', { method: 'POST', body: form({ image: jpeg(4 * 1024 * 1024 + 1) }) }));
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: { code: 'image_too_large' } });
  });
});

describe('/api/simulate', () => {
  test('creates and polls a simulation in mock mode', async () => {
    const concerns = JSON.stringify([{ concern: 'oiliness', intensity: 0.4 }]);
    const res = await simPOST(req('/api/simulate', { method: 'POST', body: form({ image: jpeg(), concerns }) }));
    expect(res.status).toBe(200);
    const { taskId } = await res.json();
    expect((await (await simGET(req(`/api/simulate/${taskId}`), params(taskId))).json()).status).toBe('success');
  });

  test('rejects non-simulable concerns and bad intensities', async () => {
    for (const concerns of [
      JSON.stringify([{ concern: 'moisture', intensity: 0.4 }]),
      JSON.stringify([{ concern: 'oiliness', intensity: 1.5 }]),
      JSON.stringify([]),
      'not json',
    ]) {
      const res = await simPOST(req('/api/simulate', { method: 'POST', body: form({ image: jpeg(), concerns }) }));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: { code: 'invalid_concerns' } });
    }
  });
});

describe('/api/asset', () => {
  test('rejects non-allowlisted, http, IP and file URLs', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    for (const u of [
      'https://evil.example.com/a.png',
      'http://yce-us.s3-accelerate.amazonaws.com/a.png',
      'https://169.254.169.254/x',
      'file:///etc/passwd',
      'not a url',
    ]) {
      expect((await assetGET(req(`/api/asset?u=${encodeURIComponent(u)}`))).status).toBe(400);
    }
    expect((await assetGET(req('/api/asset'))).status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  test('streams an allowlisted asset with its content type', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(new Uint8Array([1, 2]), { headers: { 'Content-Type': 'image/jpeg' } }));
    const u = 'https://yce-us.s3-accelerate.amazonaws.com/x/mask.jpg?sig=1';
    const res = await assetGET(req(`/api/asset?u=${encodeURIComponent(u)}`));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/jpeg');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2]));
    expect(spy).toHaveBeenCalledWith(u, { redirect: 'error' });
  });

  test('upstream failure returns 502', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 403 }));
    const u = 'https://yce-us.s3-accelerate.amazonaws.com/expired.jpg';
    expect((await assetGET(req(`/api/asset?u=${encodeURIComponent(u)}`))).status).toBe(502);
  });
});

describe('daily scan cap', () => {
  test('POST /api/scan and /api/simulate return 429 once the per-IP cap is used', async () => {
    vi.stubEnv('YOUCAM_MOCK', '0');
    vi.stubEnv('SCAN_LIMIT_PER_IP_PER_DAY', '0');
    const headers = { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' };
    const scan = await scanPOST(req('/api/scan', { method: 'POST', headers, body: form({ image: jpeg() }) }));
    expect(scan.status).toBe(429);
    expect(await scan.json()).toEqual({ error: { code: 'rate_limited' } });
    const concerns = JSON.stringify([{ concern: 'oiliness', intensity: 0.4 }]);
    const sim = await simPOST(req('/api/simulate', { method: 'POST', headers, body: form({ image: jpeg(), concerns }) }));
    expect(sim.status).toBe(429);
  });

  test('mock mode is never capped', async () => {
    vi.stubEnv('SCAN_LIMIT_PER_IP_PER_DAY', '0');
    const res = await scanPOST(req('/api/scan', { method: 'POST', body: form({ image: jpeg() }) }));
    expect(res.status).toBe(200);
  });
});
