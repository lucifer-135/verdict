// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

/** Load public/sw.js in a sandbox and return its cacheRule(url, mode) function. */
function loadRule(): (url: string, mode: string) => string {
  const context: Record<string, unknown> = { URL, self: { addEventListener: () => {}, location: { origin: 'https://app.test' } } };
  runInNewContext(readFileSync('public/sw.js', 'utf8'), context);
  return context.cacheRule as (url: string, mode: string) => string;
}

test('API calls are never cached, so scans and units stay live', () => {
  const rule = loadRule();
  expect(rule('https://app.test/api/scan', 'cors')).toBe('network-only');
  expect(rule('https://app.test/api/asset?u=x', 'cors')).toBe('network-only');
});

test('build files, icons and sample images are cache-first; pages are network-first', () => {
  const rule = loadRule();
  expect(rule('https://app.test/_next/static/chunks/app.js', 'no-cors')).toBe('cache-first');
  expect(rule('https://app.test/sample/photos/1.jpg', 'no-cors')).toBe('cache-first');
  expect(rule('https://app.test/icons/icon-192.png', 'no-cors')).toBe('cache-first');
  expect(rule('https://app.test/trial/abc', 'navigate')).toBe('network-first');
});

test('other sites are left alone', () => {
  expect(loadRule()('https://yce-us.s3-accelerate.amazonaws.com/m.png', 'cors')).toBe('network-only');
});
