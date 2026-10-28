import bundled from './journey.json';
import { listTrials, putBlob, saveScan, saveTrial } from '@/lib/store/db';
import type { ConcernId } from '@/lib/verdict/concerns';
import type { ConcernScore, Scan, Trial } from '@/lib/verdict/types';

/** Recorded by scripts/record-sample.ts from real API responses on consented, dated selfies. */
export interface SampleJourney {
  trial: { productName: string; concerns: ConcernId[]; startDate: string };
  goal: { image: string; scores: Partial<Record<ConcernId, number>> } | null;
  scans: {
    takenAt: string;
    photo: string;
    overall: number | null;
    skinAge: number | null;
    skinType: string | null;
    scores: Partial<Record<ConcernId, ConcernScore>>;
    masks: Partial<Record<ConcernId, string>>;
  }[];
}

const SAMPLE_TRIAL_ID = 'sample-journey';
const BUNDLED = bundled as SampleJourney;

export function hasSampleJourney(journey: SampleJourney = BUNDLED): boolean {
  return journey.scans.length > 0;
}

async function storeAsset(path: string): Promise<string> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Sample asset missing: ${path}`);
  return putBlob(await res.blob());
}

/** Copy the sample journey into this browser once; later calls return the existing trial id. */
export async function loadSampleJourney(journey: SampleJourney = BUNDLED): Promise<string> {
  if ((await listTrials()).some(t => t.id === SAMPLE_TRIAL_ID)) return SAMPLE_TRIAL_ID;

  // Fixed ids: a retry after a failed load overwrites the earlier scans instead of duplicating them.
  // The trial is saved last, so a partial load is retried rather than treated as done.
  for (const [i, s] of journey.scans.entries()) {
    const maskBlobIds: Scan['maskBlobIds'] = {};
    for (const [concern, path] of Object.entries(s.masks) as [ConcernId, string][]) {
      maskBlobIds[concern] = await storeAsset(path);
    }
    await saveScan({
      id: `${SAMPLE_TRIAL_ID}-scan-${i + 1}`,
      takenAt: s.takenAt,
      source: 'sample',
      sourceHash: null,
      photoBlobId: await storeAsset(s.photo),
      overall: s.overall,
      skinAge: s.skinAge,
      scores: s.scores,
      maskBlobIds,
      skinType: s.skinType,
    });
  }

  const trial: Trial = {
    id: SAMPLE_TRIAL_ID,
    ...journey.trial,
    goal: journey.goal ? { imageBlobId: await storeAsset(journey.goal.image), scores: journey.goal.scores } : null,
    createdAt: new Date().toISOString(),
    isSample: true,
    archived: false,
  };
  await saveTrial(trial);
  return SAMPLE_TRIAL_ID;
}
