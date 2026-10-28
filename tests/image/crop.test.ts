import { captureCrop } from '@/lib/image/crop';

test('a portrait 3:4 centre crop from HD frames', () => {
  expect(captureCrop(1920, 1080)).toEqual({ x: 555, y: 0, w: 810, h: 1080 });
  expect(captureCrop(1080, 1920)).toEqual({ x: 0, y: 240, w: 1080, h: 1440 });
});

test('small 640×480 webcams get a square crop so the short side stays at 480', () => {
  expect(captureCrop(640, 480)).toEqual({ x: 80, y: 0, w: 480, h: 480 });
});
