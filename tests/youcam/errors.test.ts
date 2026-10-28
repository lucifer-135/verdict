import { friendlyMessage } from '@/lib/youcam/errors';

test('friendlyMessage copy', () => {
  expect(friendlyMessage('error_lighting_dark')).toBe('Too dark. Face a window or turn on a light, then retake.');
  expect(friendlyMessage('error_src_face_too_small')).toBe('Move closer so your face fills the oval.');
  expect(friendlyMessage('error_src_face_out_of_bound')).toBe('Center your face inside the oval.');
  expect(friendlyMessage('error_below_min_image_size')).toBe('Photo is too small. Use a higher-resolution photo.');
  expect(friendlyMessage('poll_timeout')).toBe('Taking longer than usual.');
  expect(friendlyMessage('whatever')).toBe('Scan failed. No units were charged.');
});

test('friendlyMessage for failures after the task exists', () => {
  expect(friendlyMessage('network_error')).toBe('The connection dropped while waiting for your result.');
  expect(friendlyMessage('save_failed')).toBe('Your scan finished but could not be saved on this device.');
  expect(friendlyMessage('storage_unavailable')).toBe(
    'This browser cannot save scans. Turn off private browsing and try again.',
  );
});

test('friendlyMessage for the daily cap', () => {
  expect(friendlyMessage('rate_limited')).toBe(
    'This demo has reached its daily scan limit for your device. Please try again tomorrow.',
  );
});

test('friendlyMessage for a photo that was already scanned', () => {
  expect(friendlyMessage('duplicate_photo')).toBe('This photo has already been scanned.');
});
