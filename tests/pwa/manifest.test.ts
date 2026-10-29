// @vitest-environment node
import manifest from '@/app/manifest';

test('the web app manifest makes Verdict installable', () => {
  const m = manifest();
  expect(m).toMatchObject({
    name: 'Verdict: is your skincare working?',
    short_name: 'Verdict',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf7f2',
    theme_color: '#faf7f2',
  });
  const icons = m.icons ?? [];
  expect(icons).toContainEqual(expect.objectContaining({ src: '/icons/icon-192.png', sizes: '192x192' }));
  expect(icons).toContainEqual(expect.objectContaining({ src: '/icons/icon-512.png', sizes: '512x512' }));
  expect(icons).toContainEqual(expect.objectContaining({ src: '/icons/icon-maskable-512.png', purpose: 'maskable' }));
});
