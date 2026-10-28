// @vitest-environment node
import { createRateLimiter } from '@/lib/youcam/rateLimit';

const DAY = 24 * 60 * 60 * 1000;

test('allows up to the limit per key within the window, then refuses', () => {
  let now = 0;
  const limiter = createRateLimiter(DAY, () => now);
  expect([1, 2, 3].map(() => limiter.take('a', 2))).toEqual([true, true, false]);
  expect(limiter.take('b', 2)).toBe(true);
  now = DAY + 1;
  expect(limiter.take('a', 2)).toBe(true);
});

test('a limit of 0 refuses everything', () => {
  expect(createRateLimiter(DAY).take('a', 0)).toBe(false);
});
