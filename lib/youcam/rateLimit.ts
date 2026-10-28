/**
 * Sliding-window counter per key. In-memory, so on a serverless host each
 * instance keeps its own count: a best-effort guard against one visitor
 * draining the API units, not an exact global quota.
 */
export function createRateLimiter(windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  return {
    /** Record one use for `key`; false (and nothing recorded) when `limit` is already reached. */
    take(key: string, limit: number): boolean {
      const since = now() - windowMs;
      const recent = (hits.get(key) ?? []).filter(t => t > since);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now());
      hits.set(key, recent);
      return true;
    },
  };
}
