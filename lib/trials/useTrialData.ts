'use client';

import { useCallback, useEffect, useState } from 'react';
import { getTrial, listScans, listTrials } from '@/lib/store/db';
import type { Scan, Trial } from '@/lib/verdict/types';
import { scansForTrial } from './view';

export interface TrialData {
  trial: Trial;
  /** This trial's scans, oldest first. */
  scans: Scan[];
  allTrials: Trial[];
}

/** Load a trial with its scans. undefined while loading, null when not found. */
export function useTrialData(id: string): { data: TrialData | null | undefined; reload: () => Promise<void> } {
  const [data, setData] = useState<TrialData | null | undefined>(undefined);
  const reload = useCallback(async () => {
    const [trial, scans, allTrials] = await Promise.all([getTrial(id), listScans(), listTrials()]);
    setData(trial ? { trial, scans: scansForTrial(trial, scans), allTrials } : null);
  }, [id]);
  useEffect(() => {
    reload().catch(() => setData(null));
  }, [reload]);
  return { data, reload };
}
