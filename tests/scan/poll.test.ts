import { vi } from 'vitest';
import { ScanError, fetchWithRetry, pollTask } from '@/lib/scan/poll';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('pollTask returns result after running → success', async () => {
  vi.useFakeTimers();
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(json({ status: 'running' }))
    .mockResolvedValueOnce(json({ status: 'success', result: { imageUrl: 'x' } }));
  vi.stubGlobal('fetch', fetchMock);
  const p = pollTask<{ imageUrl: string }>('/api/simulate/t1');
  await vi.advanceTimersByTimeAsync(2000);
  expect(await p).toEqual({ imageUrl: 'x' });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('pollTask throws ScanError poll_timeout with taskId after 90 s', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn(async () => json({ status: 'running' })));
  const p = pollTask('/api/scan/a%2Bb');
  const assertion = expect(p).rejects.toMatchObject({
    code: 'poll_timeout',
    friendly: 'Taking longer than usual.',
    taskId: 'a+b',
  });
  await vi.advanceTimersByTimeAsync(92_000);
  await assertion;
});

test('pollTask maps error state to friendly message', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => json({ status: 'error', code: 'error_lighting_dark', message: 'dark' })));
  const p = pollTask('/api/scan/t1');
  await expect(p).rejects.toBeInstanceOf(ScanError);
  await expect(pollTask('/api/scan/t1')).rejects.toMatchObject({
    code: 'error_lighting_dark',
    friendly: 'Too dark. Face a window or turn on a light, then retake.',
  });
});

test('pollTask turns an API error response into ScanError with its code', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => json({ error: { code: 'InvalidTaskId', message: 'bad' } }, 400)));
  await expect(pollTask('/api/scan/t1')).rejects.toMatchObject({
    code: 'InvalidTaskId',
    friendly: 'Scan failed. No units were charged.',
  });
});

test('fetchWithRetry retries 503 twice then succeeds', async () => {
  vi.useFakeTimers();
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response('', { status: 503 }))
    .mockRejectedValueOnce(new TypeError('network'))
    .mockResolvedValueOnce(new Response('ok'));
  vi.stubGlobal('fetch', fetchMock);
  const p = fetchWithRetry('/api/x');
  await vi.advanceTimersByTimeAsync(2000);
  expect((await p).status).toBe(200);
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

test('fetchWithRetry does not retry 400', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 400 }));
  vi.stubGlobal('fetch', fetchMock);
  expect((await fetchWithRetry('/api/x')).status).toBe(400);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('pollTask network failure keeps the taskId so the user can keep waiting', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
  const p = pollTask('/api/scan/t7');
  const assertion = expect(p).rejects.toMatchObject({ code: 'network_error', taskId: 't7' });
  await vi.advanceTimersByTimeAsync(3000);
  await assertion;
});
