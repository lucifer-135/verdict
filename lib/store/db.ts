import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Scan, Trial } from '@/lib/verdict/types';

/** Blobs are stored as raw bytes + type: more portable than Blob across browsers. */
interface StoredBlob {
  type: string;
  bytes: ArrayBuffer;
}

interface VerdictSchema extends DBSchema {
  scans: { key: string; value: Scan; indexes: { takenAt: string; sourceHash: string } };
  trials: { key: string; value: Trial };
  blobs: { key: string; value: StoredBlob };
}

type Db = IDBPDatabase<VerdictSchema>;

function open(): Promise<Db> {
  return openDB<VerdictSchema>('verdict', 1, {
    upgrade(db) {
      const scans = db.createObjectStore('scans', { keyPath: 'id' });
      scans.createIndex('takenAt', 'takenAt');
      scans.createIndex('sourceHash', 'sourceHash');
      db.createObjectStore('trials', { keyPath: 'id' });
      db.createObjectStore('blobs');
    },
  });
}

/** Open, run, close. An open connection would block a future schema upgrade in another tab. */
async function withDb<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const db = await open();
  try {
    return await fn(db);
  } finally {
    db.close();
  }
}

export function saveScan(s: Scan): Promise<void> {
  return withDb(async db => void (await db.put('scans', s)));
}

export function getScan(id: string): Promise<Scan | undefined> {
  return withDb(db => db.get('scans', id));
}

/** All scans, oldest first. */
export function listScans(): Promise<Scan[]> {
  return withDb(db => db.getAllFromIndex('scans', 'takenAt'));
}

export function findScanByHash(hash: string): Promise<Scan | undefined> {
  return withDb(db => db.getFromIndex('scans', 'sourceHash', hash));
}

/** Remove a scan together with its photo and masks. */
export function deleteScan(id: string): Promise<void> {
  return withDb(async db => {
    const tx = db.transaction(['scans', 'blobs'], 'readwrite');
    const scan = await tx.objectStore('scans').get(id);
    if (scan) {
      for (const blobId of [scan.photoBlobId, ...Object.values(scan.maskBlobIds)]) {
        if (blobId) await tx.objectStore('blobs').delete(blobId);
      }
      await tx.objectStore('scans').delete(id);
    }
    await tx.done;
  });
}

export function saveTrial(t: Trial): Promise<void> {
  return withDb(async db => void (await db.put('trials', t)));
}

export function getTrial(id: string): Promise<Trial | undefined> {
  return withDb(db => db.get('trials', id));
}

export function listTrials(): Promise<Trial[]> {
  return withDb(db => db.getAll('trials'));
}

export async function putBlob(b: Blob): Promise<string> {
  const id = crypto.randomUUID();
  const bytes = await b.arrayBuffer();
  await withDb(db => db.put('blobs', { type: b.type, bytes }, id));
  return id;
}

export async function getBlob(id: string): Promise<Blob | undefined> {
  const stored = await withDb(db => db.get('blobs', id));
  return stored ? new Blob([stored.bytes], { type: stored.type }) : undefined;
}

/**
 * Remove every scan, trial and stored image. Clears the stores instead of deleting
 * the database, which would wait forever if another tab still has it open.
 */
export function clearAllData(): Promise<void> {
  return withDb(async db => {
    const tx = db.transaction(['scans', 'trials', 'blobs'], 'readwrite');
    await Promise.all([tx.objectStore('scans').clear(), tx.objectStore('trials').clear(), tx.objectStore('blobs').clear()]);
    await tx.done;
  });
}

/** False in browsers that block IndexedDB (e.g. some private modes). */
export async function isStorageAvailable(): Promise<boolean> {
  try {
    (await open()).close();
    return true;
  } catch {
    return false;
  }
}
