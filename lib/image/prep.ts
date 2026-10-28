import exifr from 'exifr';

export type PrepErrorCode = 'below_min_image_size' | 'exceed_max_image_size' | 'decode_failed';

export class PrepError extends Error {
  constructor(public code: PrepErrorCode) {
    super(code);
    this.name = 'PrepError';
  }
}

const MIN_SHORT_SIDE = 480;
const MAX_LONG_SIDE = 2560;
const MAX_BYTES = 4 * 1024 * 1024;
const JPEG_QUALITIES = [0.9, 0.8, 0.7];

/** Mean luminance (0–255) below which the camera blocks capture. */
export const BRIGHTNESS_MIN = 80;

/** Scale down so the long side is ≤ 2560 px; never upscale; short side must stay ≥ 480 px. */
export function computeTargetSize(w: number, h: number): { width: number; height: number } {
  const scale = Math.min(1, MAX_LONG_SIDE / Math.max(w, h));
  const width = Math.round(w * scale);
  const height = Math.round(h * scale);
  if (Math.min(width, height) < MIN_SHORT_SIDE) throw new PrepError('below_min_image_size');
  return { width, height };
}

/** Rec. 601 luma averaged over RGBA pixels; alpha is ignored. */
export function meanLuminance(rgba: Uint8ClampedArray): number {
  let sum = 0;
  const pixels = rgba.length / 4;
  for (let i = 0; i < rgba.length; i += 4) {
    sum += 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
  }
  return pixels ? sum / pixels : 0;
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new PrepError('decode_failed'))), 'image/jpeg', quality),
  );
}

/** Resize and re-encode a photo to the JPEG the YouCam API accepts (spec §6.2). */
export async function prepareImage(file: Blob): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new PrepError('decode_failed');
  }
  const { width, height } = computeTargetSize(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  for (const quality of JPEG_QUALITIES) {
    const jpeg = await canvasToJpeg(canvas, quality);
    if (jpeg.size <= MAX_BYTES) return jpeg;
  }
  throw new PrepError('exceed_max_image_size');
}

/** Capture date from EXIF DateTimeOriginal as ISO 8601, or null. */
export async function readTakenAt(file: Blob): Promise<string | null> {
  try {
    const exif = await exifr.parse(file, ['DateTimeOriginal']);
    const d = exif?.DateTimeOriginal;
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
  } catch {
    return null;
  }
}

export async function sha256Hex(b: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await b.arrayBuffer());
  return Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, '0')).join('');
}
