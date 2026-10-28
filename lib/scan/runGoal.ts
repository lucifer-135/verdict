import { putBlob } from '@/lib/store/db';
import { getConcern } from '@/lib/verdict/concerns';
import type { Trial, TrialGoal } from '@/lib/verdict/types';
import type { SkinAnalysisResult, SkinSimulationResult } from '@/lib/youcam/normalize';
import { ScanError, fetchWithRetry, pollTask, readJson } from './poll';
import { analysisUrl, downloadAsset, startAnalysis } from './runScan';

/** "Realistic" goal intensity for every simulable target (spec §5.3). */
export const GOAL_INTENSITY = 0.4;

/**
 * Simulate a realistic outcome for the trial's simulable targets, then score
 * that image with Skin Analysis. The simulated image is re-uploaded because
 * YouCam can't fetch its own result URL (docs/youcam-api-notes.md).
 */
export async function runGoal(trial: Trial, baselinePhoto: Blob): Promise<TrialGoal | null> {
  const targets = trial.concerns.filter(c => getConcern(c).simulable);
  if (targets.length === 0) return null;

  const form = new FormData();
  form.append('image', baselinePhoto, 'baseline.jpg');
  form.append('concerns', JSON.stringify(targets.map(concern => ({ concern, intensity: GOAL_INTENSITY }))));
  const { taskId } = await readJson<{ taskId: string }>(
    await fetchWithRetry('/api/simulate', { method: 'POST', body: form }, 0),
  );
  const { imageUrl } = await pollTask<SkinSimulationResult>(`/api/simulate/${encodeURIComponent(taskId)}`);

  const image = await downloadAsset(imageUrl);
  if (!image) throw new ScanError('goal_image_unavailable');

  const result = await pollTask<SkinAnalysisResult>(analysisUrl(await startAnalysis(image, targets)));
  const scores: TrialGoal['scores'] = {};
  for (const c of targets) {
    const s = result.scores[c];
    if (s) scores[c] = s.raw;
  }
  return { imageBlobId: await putBlob(image), scores };
}
