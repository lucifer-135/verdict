import { isConcernId, type ConcernId } from '@/lib/verdict/concerns';

export type TaskState<T> =
  | { status: 'running' }
  | { status: 'success'; result: T }
  | { status: 'error'; code: string; message: string };

export interface SkinAnalysisResult {
  overall: number | null;
  skinAge: number | null;
  skinType: string | null;
  scores: Partial<Record<ConcernId, { raw: number; ui: number }>>;
  maskUrls: Partial<Record<ConcernId, string>>;
}

export interface SkinSimulationResult {
  imageUrl: string;
}

interface OutputItem {
  type: string;
  raw_score?: number;
  ui_score?: number;
  score?: number | null;
  mask_urls?: string[];
  region?: string;
  skin_type?: string;
}

/** `data` of a task GET response (see docs/youcam-api-notes.md). */
export interface TaskData {
  task_status?: 'running' | 'success' | 'error';
  error?: string | null;
  error_message?: string;
  results?: { output?: OutputItem[]; url?: string } | null;
}

export function normalizeAnalysis(output: OutputItem[]): SkinAnalysisResult {
  const result: SkinAnalysisResult = { overall: null, skinAge: null, skinType: null, scores: {}, maskUrls: {} };
  for (const o of output) {
    if (o.type === 'all') result.overall = o.score ?? null;
    else if (o.type === 'skin_age') result.skinAge = o.score ?? null;
    else if (o.type === 'skin_type') {
      if (o.region === 'whole') result.skinType = o.skin_type ?? null;
    } else if (isConcernId(o.type) && typeof o.raw_score === 'number') {
      result.scores[o.type] = { raw: o.raw_score, ui: o.ui_score ?? Math.round(o.raw_score) };
      if (o.mask_urls?.[0]) result.maskUrls[o.type] = o.mask_urls[0];
    }
  }
  return result;
}

export function toTaskState<T>(data: TaskData, pick: (results: NonNullable<TaskData['results']>) => T): TaskState<T> {
  if (data.task_status === 'success' && data.results) return { status: 'success', result: pick(data.results) };
  if (data.task_status === 'error' || data.task_status === 'success') {
    return { status: 'error', code: data.error ?? 'unknown_internal_error', message: data.error_message ?? '' };
  }
  return { status: 'running' };
}
