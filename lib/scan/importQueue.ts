import { endOfDay } from 'date-fns';
import { readTakenAt, sha256Hex } from '@/lib/image/prep';
import { findScanByHash } from '@/lib/store/db';
import { ScanError } from './poll';
import { runScan } from './runScan';

export type ImportStatus = 'needs_date' | 'ready' | 'duplicate' | 'scanning' | 'done' | 'failed';

export interface ImportItem {
  file: Blob;
  name: string;
  /** SHA-256 of the original file; duplicates are skipped before any API call. */
  hash: string;
  takenAt: string | null;
  status: ImportStatus;
  error?: string;
}

/** Read each photo's date and hash; mark photos already imported (or repeated in this batch) as duplicates. */
export async function buildQueue(files: { file: Blob; name: string }[]): Promise<ImportItem[]> {
  const seen = new Set<string>();
  const items: ImportItem[] = [];
  for (const { file, name } of files) {
    const [hash, takenAt] = await Promise.all([sha256Hex(file), readTakenAt(file)]);
    const duplicate = seen.has(hash) || (await findScanByHash(hash)) !== undefined;
    seen.add(hash);
    items.push({ file, name, hash, takenAt, status: duplicate ? 'duplicate' : takenAt ? 'ready' : 'needs_date' });
  }
  return items;
}

/**
 * Give an undated photo a date (local noon) and mark it ready. Years before 2000
 * and future dates are rejected, so a half-typed year like "0002" cannot slip in.
 */
export function withDate(item: ImportItem, yyyyMmDd: string, today = new Date()): ImportItem {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12);
  if (!(y >= 2000) || Number.isNaN(date.getTime()) || date > endOfDay(today)) {
    return { ...item, takenAt: null, status: 'needs_date', error: 'Choose a date between 2000 and today.' };
  }
  return { ...item, takenAt: date.toISOString(), status: 'ready', error: undefined };
}

/** Scan ready items one at a time (each costs units); failures don't stop the rest. */
export async function runQueue(items: ImportItem[], onUpdate: (items: ImportItem[]) => void): Promise<ImportItem[]> {
  let list = [...items];
  const set = (i: number, patch: Partial<ImportItem>) => {
    list = list.map((item, j) => (j === i ? { ...item, ...patch } : item));
    onUpdate(list);
  };
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (item.status !== 'ready') continue;
    set(i, { status: 'scanning' });
    try {
      await runScan(item.file, { source: 'import', takenAt: item.takenAt!, sourceHash: item.hash });
      set(i, { status: 'done' });
    } catch (e) {
      set(i, { status: 'failed', error: (e instanceof ScanError ? e : new ScanError('unknown')).friendly });
    }
  }
  return list;
}
