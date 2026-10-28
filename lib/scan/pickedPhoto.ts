import { readTakenAt, sha256Hex } from '@/lib/image/prep';
import { findScanByHash } from '@/lib/store/db';
import { ScanError } from './poll';

/**
 * Checks a photo chosen from the device (not taken with the live camera) before
 * it costs units: refuses one that was already scanned, and keeps its EXIF date
 * so an older photo lands on the right day of the timeline.
 */
export async function checkPickedPhoto(file: Blob): Promise<{ sourceHash: string; takenAt?: string }> {
  const [sourceHash, takenAt] = await Promise.all([sha256Hex(file), readTakenAt(file)]);
  if (await findScanByHash(sourceHash)) throw new ScanError('duplicate_photo');
  return { sourceHash, takenAt: takenAt ?? undefined };
}
