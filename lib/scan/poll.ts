import { friendlyMessage } from '@/lib/youcam/errors';
import type { TaskState } from '@/lib/youcam/normalize';

/** A scan step failed; `friendly` is the copy to show, `taskId` allows resuming a timed-out poll. */
export class ScanError extends Error {
  friendly: string;

  constructor(
    public code: string,
    public taskId?: string,
  ) {
    super(code);
    this.name = 'ScanError';
    this.friendly = friendlyMessage(code);
  }
}

const RETRY_DELAYS_MS = [500, 1500];
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** fetch, retrying network errors and 5xx responses; 4xx responses are returned as-is. */
export async function fetchWithRetry(input: RequestInfo, init?: RequestInit, retries = 2): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(input, init);
      if (res.status < 500 || attempt >= retries) return res;
    } catch {
      if (attempt >= retries) throw new ScanError('network_error');
    }
    await sleep(RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]);
  }
}

/** Parse a JSON body from our API; error responses (`{ error: { code } }`) become ScanError. */
export async function readJson<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ScanError(body?.error?.code ?? `http_${res.status}`);
  return body as T;
}

/** Poll a task route until it succeeds; engine errors and timeouts become ScanError. */
export async function pollTask<T>(url: string, { intervalMs = 2000, timeoutMs = 90_000 } = {}): Promise<T> {
  const taskId = decodeURIComponent(url.slice(url.lastIndexOf('/') + 1));
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const state = await readJson<TaskState<T>>(await fetchWithRetry(url));
    if (state.status === 'success') return state.result;
    if (state.status === 'error') throw new ScanError(state.code, taskId);
    if (Date.now() + intervalMs > deadline) throw new ScanError('poll_timeout', taskId);
    await sleep(intervalMs);
  }
}
