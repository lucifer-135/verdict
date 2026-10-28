import { PrepError, prepareImage } from '@/lib/image/prep';
import { putBlob, saveScan } from '@/lib/store/db';
import type { ConcernId } from '@/lib/verdict/concerns';
import type { Scan } from '@/lib/verdict/types';
import type { SkinAnalysisResult } from '@/lib/youcam/normalize';
import { ScanError, fetchWithRetry, pollTask, readJson } from './poll';

export type ScanStatus = 'preparing' | 'uploading' | 'analyzing' | 'saving';

export interface ScanOptions {
  source: 'camera' | 'import';
  takenAt?: string;
  sourceHash?: string;
  onStatus?: (s: ScanStatus) => void;
}

/** Fetch a result asset: local paths directly, remote URLs through /api/asset. Null on failure. */
export async function downloadAsset(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url.startsWith('/') ? url : `/api/asset?u=${encodeURIComponent(url)}`);
    return res.ok ? await res.blob() : null;
  } catch {
    return null;
  }
}

/** POST an image to /api/scan; returns the task id. */
export async function startAnalysis(image: Blob, actions?: readonly ConcernId[]): Promise<string> {
  const form = new FormData();
  form.append('image', image, 'scan.jpg');
  if (actions) form.append('actions', actions.join(','));
  const { taskId } = await readJson<{ taskId: string }>(
    await fetchWithRetry('/api/scan', { method: 'POST', body: form }),
  );
  return taskId;
}

export const analysisUrl = (taskId: string) => `/api/scan/${encodeURIComponent(taskId)}`;

async function prepare(file: Blob): Promise<Blob> {
  try {
    return await prepareImage(file);
  } catch (e) {
    if (e instanceof PrepError) {
      throw new ScanError(e.code === 'decode_failed' ? e.code : `error_${e.code}`);
    }
    throw e;
  }
}

async function finish(taskId: string, prepared: Blob, opts: ScanOptions): Promise<Scan> {
  opts.onStatus?.('analyzing');
  const result = await pollTask<SkinAnalysisResult>(analysisUrl(taskId));

  opts.onStatus?.('saving');
  const maskBlobIds: Scan['maskBlobIds'] = {};
  await Promise.all(
    Object.entries(result.maskUrls).map(async ([concern, url]) => {
      const mask = await downloadAsset(url);
      if (mask) maskBlobIds[concern as ConcernId] = await putBlob(mask);
    }),
  );
  const scan: Scan = {
    id: crypto.randomUUID(),
    takenAt: opts.takenAt ?? new Date().toISOString(),
    source: opts.source,
    sourceHash: opts.sourceHash ?? null,
    photoBlobId: await putBlob(prepared),
    overall: result.overall,
    skinAge: result.skinAge,
    scores: result.scores,
    maskBlobIds,
    skinType: result.skinType,
  };
  await saveScan(scan);
  return scan;
}

/** Prepare, upload, analyze and save one photo. Throws ScanError with friendly copy. */
export async function runScan(file: Blob, opts: ScanOptions): Promise<Scan> {
  opts.onStatus?.('preparing');
  const prepared = await prepare(file);
  opts.onStatus?.('uploading');
  const taskId = await startAnalysis(prepared);
  return finish(taskId, prepared, opts);
}

/** Keep polling an existing task after a poll timeout; never starts a new task. */
export async function resumeScan(taskId: string, file: Blob, opts: ScanOptions): Promise<Scan> {
  return finish(taskId, await prepare(file), opts);
}
