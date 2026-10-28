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

function open(): Promise<IDBPDatabase<VerdictSchema>> {
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

export async function saveScan(s: Scan): Promise<void> {
  await (await open()).put('scans', s);
}

export async function getScan(id: string): Promise<Scan | undefined> {
  return (await open()).get('scans', id);
}

/** All scans, oldest first. */
export async function listScans(): Promise<Scan[]> {
  return (await open()).getAllFromIndex('scans', 'takenAt');
}

export async function findScanByHash(hash: string): Promise<Scan | undefined> {
  return (await open()).getFromIndex('scans', 'sourceHash', hash);
}

export async function saveTrial(t: Trial): Promise<void> {
  await (await open()).put('trials', t);
}

export async function getTrial(id: string): Promise<Trial | undefined> {
  return (await open()).get('trials', id);
}

export async function listTrials(): Promise<Trial[]> {
  return (await open()).getAll('trials');
}

export async function putBlob(b: Blob): Promise<string> {
  const id = crypto.randomUUID();
  await (await open()).put('blobs', { type: b.type, bytes: await b.arrayBuffer() }, id);
  return id;
}

export async function getBlob(id: string): Promise<Blob | undefined> {
  const stored = await (await open()).get('blobs', id);
  return stored ? new Blob([stored.bytes], { type: stored.type }) : undefined;
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
