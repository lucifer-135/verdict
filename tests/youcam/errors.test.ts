import { friendlyMessage } from '@/lib/youcam/errors';

test('friendlyMessage copy', () => {
  expect(friendlyMessage('error_lighting_dark')).toBe('Too dark. Face a window or turn on a light, then retake.');
  expect(friendlyMessage('error_src_face_too_small')).toBe('Move closer so your face fills the oval.');
  expect(friendlyMessage('error_src_face_out_of_bound')).toBe('Center your face inside the oval.');
  expect(friendlyMessage('error_below_min_image_size')).toBe('Photo is too small. Use a higher-resolution photo.');
  expect(friendlyMessage('poll_timeout')).toBe('Taking longer than usual.');
  expect(friendlyMessage('whatever')).toBe('Scan failed. No units were charged.');
});
