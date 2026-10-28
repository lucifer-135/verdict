/** Failure talking to the YouCam API (HTTP-level rejection, not an engine error). */
export class YouCamError extends Error {
  constructor(
    public code: string,
    public status: number,
    message = code,
  ) {
    super(message);
    this.name = 'YouCamError';
  }
}

// Spec §7.
const MESSAGES: Record<string, string> = {
  error_lighting_dark: 'Too dark. Face a window or turn on a light, then retake.',
  error_src_face_too_small: 'Move closer so your face fills the oval.',
  error_src_face_out_of_bound: 'Center your face inside the oval.',
  error_below_min_image_size: 'Photo is too small. Use a higher-resolution photo.',
  poll_timeout: 'Taking longer than usual.',
};

export function friendlyMessage(code: string): string {
  return MESSAGES[code] ?? 'Scan failed. No units were charged.';
}
