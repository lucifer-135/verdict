/** The API needs the short side of the photo to be at least this many pixels. */
const MIN_SHORT_SIDE = 480;

/**
 * Centred crop of a camera frame for capture: 3:4 portrait when the frame is big
 * enough, otherwise as close to it as possible while keeping the short side ≥ 480
 * (a 640×480 webcam gives a 480×480 square instead of an unusable 360×480).
 */
export function captureCrop(frameW: number, frameH: number): { x: number; y: number; w: number; h: number } {
  const h = frameH >= (frameW * 4) / 3 ? Math.round((frameW * 4) / 3) : frameH;
  const w = Math.min(frameW, Math.max(Math.round((h * 3) / 4), Math.min(MIN_SHORT_SIDE, frameW)));
  return { x: Math.round((frameW - w) / 2), y: Math.round((frameH - h) / 2), w, h };
}
